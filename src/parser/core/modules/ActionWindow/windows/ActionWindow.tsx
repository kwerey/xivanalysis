import {RotationTable, RotationTableNotesMap, RotationTableTargetData} from 'components/ui/RotationTable'
import {Event, Events} from 'event'
import {dependency} from 'parser/core/Injectable'
import {Timeline} from 'parser/core/modules/Timeline'
import React from 'react'
import {ensureArray, isDefined} from 'utilities'
import {Analyser} from '../../../Analyser'
import {EventFilterPredicate, EventHook} from '../../../Dispatcher'
import {filter, noneOf, oneOf} from '../../../filter'
import {Data} from '../../Data'
import Suggestions from '../../Suggestions'
import {EvaluatedAction} from '../EvaluatedAction'
import {EvaluationOutput, WindowEvaluator} from '../evaluators/WindowEvaluator'
import {History, HistoryEntry} from '../History'

/**
 * Tracks actions that occur within a window.
 * By default, all actions cast during a window will be included.
 */
export abstract class ActionWindow extends Analyser {

	@dependency protected data!: Data
	@dependency private suggestions!: Suggestions
	@dependency private timeline!: Timeline

	/**
	 * The captured windows.
	 */
	protected history = new History<Array<Events['action']>>(() => [])
	/**
	 * The event filter used to capture events while a window is open.
	 * The default filter will capture all actions.
	 */
	private eventFilter: EventFilterPredicate<Events['action']> = filter<Event>().source(this.parser.actor.id).type('action')
	/**
	 * The event hook for actions being captured.
	 */
	private eventHook?: EventHook<Events['action']>
	/**
	 * The evaluators used to generate suggestions and output for the windows.
	 */
	private evaluators: WindowEvaluator[] = []

	/**
	 * Implementing modules MAY provide a value to override the "Rotation" title in the header of the rotation section
	 * If implementing, you MUST provide a JSX.Element <Trans> or <Fragment> tag (Trans tag preferred)
	 */
	protected rotationTableHeader?: JSX.Element

	/**
	 * Implementing modules MAY provide a JSX element to appear above the RotationTable
	 * If prepending multiple nodes, you MUST provide a JSX.Element <Fragment> tag
	 */
	protected prependMessages?: JSX.Element

	/**
	 * Adds an evaluator to be run on the windows.
	 * @param evaluator An evaluator to be run on the windows
	 */
	protected addEvaluator(evaluator: WindowEvaluator) {
		this.evaluators.push(evaluator)
	}

	/**
	 * Starts a new window if one is not already open.
	 * @param timestamp The timestamp at which the new window starts.
	 */
	protected onWindowStart(timestamp: number) {
		// The event hook may already be set if multiple onWindowStart calls happen
		// before a call to onWindowEnd
		if (this.eventHook == null) {
			this.eventHook = this.addEventHook(this.eventFilter, this.onWindowAction)
		}
		this.history.getCurrentOrOpenNew(timestamp)
	}
	/**
	 * Ends an existing window if one is open.
	 * @param timestamp The timestamp at which the window ends.
	 */
	protected onWindowEnd(timestamp: number) {
		// The event hook may already be cleared if multiple onWindowEnd calls happen
		// before a call to onWindowStart
		if (this.eventHook != null) {
			this.removeEventHook(this.eventHook)
			this.eventHook = undefined
		}
		this.history.closeCurrent(timestamp)
	}
	/**
	 * Adds an action to the current window if one is open.
	 * If no window is open, the event is ignored.
	 * @param event The event to be added to the window.
	 */
	protected onWindowAction(event: Events['action']) {
		this.history.doIfOpen(current => current.push(event))
	}

	/**
	 * Adjusts the event filter to ignore certain actions.
	 * Call this method if all casts of certain actions should be ignored
	 * in a window.
	 * If actions are only ignored in some conditions, this method is
	 * not suitable, and you will need to register your own hook via setEventFilter.
	 * @param actionsToIgnore The ids of the actions to ignore.
	 */
	protected ignoreActions(actionsToIgnore: number[]) {
		this.eventFilter = filter<Event>()
			.source(this.parser.actor.id)
			.action(noneOf(actionsToIgnore))
			.type('action')
	}
	/**
	 * Adjusts the event filter to only track certain actions.
	 * Call this method if only some actions should be tracked in a window.
	 * If other actions should be tracked in some conditions, this method is
	 * not suitable, and you will need to register your own hook via
	 * setEventFilter.
	 * @param actionsToTrack The ids of the actions to track.
	 */
	protected trackOnlyActions(actionsToTrack: number[]) {
		this.eventFilter = filter<Event>()
			.source(this.parser.actor.id)
			.action(oneOf(actionsToTrack))
			.type('action')
	}

	/**
	 * Sets a custom event filter for the actions to capture during
	 * a window.
	 * @param filter The filter for actions to capture during a window
	 */
	protected setEventFilter(filter: EventFilterPredicate<Events['action']>) {
		this.eventFilter = filter
	}

	override initialise() {
		this.addEventHook('complete', this.onComplete)
	}

	private onComplete() {
		this.onWindowEnd(this.parser.pull.timestamp + this.parser.pull.duration)

		const actionHistory = this.mapHistoryActions()
		this.evaluators
			.forEach(ev => {
				const suggestion = ev.suggest(actionHistory)
				if (suggestion != null) {
					this.suggestions.add(suggestion)
				}
			})
	}

	override output() {
		if (this.history.entries.length === 0) { return undefined }

		const actionHistory = this.mapHistoryActions()
		const evalColumns: EvaluationOutput[] = []
		for (const ev of this.evaluators) {
			const maybeColumns = ev.output(actionHistory)
			if (maybeColumns == null) { continue }
			for (const column of ensureArray(maybeColumns)) {
				evalColumns.push(column)
			}
		}

		const rotationTargets = evalColumns.filter(column => column.format === 'table').map(column => column.header)
		const notesData = evalColumns.filter(column => column.format === 'notes').map(column => column.header)

		const rotationData = this.history.entries
			.map((window, idx) => {
				const targetsData: RotationTableTargetData = {}
				const notesMap: RotationTableNotesMap = {}
				evalColumns.forEach(column => {
					if (typeof column.header.accessor !== 'string') { return }
					const colName = column.header.accessor
					if (column.format === 'table') {
						targetsData[colName] = column.rows[idx]
					} else {
						notesMap[colName] = column.rows[idx]
					}
				})
				// can delete this soon but will leave it so its quick to check if display layer works
				// console.log('window action data is:')
				// console.log(JSON.stringify(window.data))
				// console.log(window.data.map(event => { return {action: event.action} }))

				// 	registerEventFormatter('action', ({event, pull}) => <>
				// 	{getActorName(event.source, pull.actors)}
				// 	&nbsp;uses <ActionLink id={event.action}/>
				// 	&nbsp;on {getActorName(event.target, pull.actors)}
				// </>)

				return {
					start: window.start - this.parser.pull.timestamp,
					end: (window.end ?? window.start) - this.parser.pull.timestamp,
					targetsData,
					rotation: window.data.map(event => { return {action: event.action} }),
					notesMap,
				}
			})

		console.log(`rotationData is: ${JSON.stringify(rotationData)}`)

		//		console.log('valid rotationData would look like: "data={[{\'start\': 20944, \'end\': 22102, \'targetsData\': {\'missedgcd\': {\'actual\': 1, \'expected\': 1}}, \'rotation\': [{\'action\': 25837}], \'notesMap\': {}}, {\'start\': 141505, \'end\': 143281, \'targetsData\': {\'missedgcd\': {\'actual\': 1, \'expected\': 1}}, \'rotation\': [{\'action\': 25837}], \'notesMap\': {}}, {\'start\': 290095, \'end\': 291776, \'targetsData\': {\'missedgcd\': {\'actual\': 1, \'expected\': 1}}, \'rotation\': [{\'action\': 25837}], \'notesMap\': {}}, {\'start\': 357644, \'end\': 358309, \'targetsData\': {\'missedgcd\': {\'actual\': 1, \'expected\': 1}}, \'rotation\': [{\'action\': 173}], \'notesMap\': {}}, {\'start\': 425372, \'end\': 426056, \'targetsData\': {\'missedgcd\': {\'actual\': 1, \'expected\': 1}}, \'rotation\': [{\'action\': 25837}], \'notesMap\': {}}]}"')

		return <>
			{this.prependMessages}
			<RotationTable
				targets={rotationTargets}
				data={rotationData}
				//[{'start': 20944, 'end': 22102, 'targetsData': {'missedgcd': {'actual': 1, 'expected': 1}}, 'rotation': [{'action': 25837}], 'notesMap': {}}, {'start': 141505, 'end': 143281, 'targetsData': {'missedgcd': {'actual': 1, 'expected': 1}}, 'rotation': [{'action': 25837}], 'notesMap': {}}, {'start': 290095, 'end': 291776, 'targetsData': {'missedgcd': {'actual': 1, 'expected': 1}}, 'rotation': [{'action': 25837}], 'notesMap': {}}, {'start': 357644, 'end': 358309, 'targetsData': {'missedgcd': {'actual': 1, 'expected': 1}}, 'rotation': [{'action': 173}], 'notesMap': {}}, {'start': 425372, 'end': 426056, 'targetsData': {'missedgcd': {'actual': 1, 'expected': 1}}, 'rotation': [{'action': 25837}], 'notesMap': {}}]
				// my existing data structure seems OK if i put an action we have a lookup for into it - slipstream, '25837'. so what's missing here is action-> display UI stuff.
				// data={[{'start': 14836, 'end': 29803, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 25837}, {'action': 25837}, {'action': 27978}, {'action': 26674}, {'action': 27978}], 'notesMap': {}}, {'start': 74363, 'end': 89321, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26651}, {'action': 26650}, {'action': 26652}, {'action': 26653}], 'notesMap': {}}, {'start': 122029, 'end': 137005, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 27978}, {'action': 27978}, {'action': 26678}, {'action': 26663}, {'action': 27978}], 'notesMap': {}}, {'start': 155715, 'end': 170686, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 27978}, {'action': 26664}, {'action': 26665}, {'action': 26665}, {'action': 27978}, {'action': 27978}, {'action': 27978}], 'notesMap': {}}, {'start': 210918, 'end': 225945, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26675}, {'action': 27978}, {'action': 27978}, {'action': 27978}, {'action': 26678}], 'notesMap': {}}, {'start': 260758, 'end': 275731, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26661}, {'action': 26660}, {'action': 26661}, {'action': 26660}, {'action': 26662}, {'action': 26660}, {'action': 26669}, {'action': 26678}, {'action': 27978}, {'action': 27978}], 'notesMap': {}}, {'start': 295248, 'end': 310222, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26678}, {'action': 28098}], 'notesMap': {}}, {'start': 338740, 'end': 353714, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26648}, {'action': 26646}, {'action': 27978}, {'action': 27978}], 'notesMap': {}}, {'start': 389378, 'end': 404344, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 27978}, {'action': 27978}, {'action': 26668}], 'notesMap': {}}, {'start': 427293, 'end': 442269, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26680}, {'action': 26680}, {'action': 26680}, {'action': 26680}, {'action': 26680}, {'action': 26680}, {'action': 26680}, {'action': 26651}, {'action': 26650}, {'action': 26652}], 'notesMap': {}}, {'start': 461072, 'end': 476037, 'targetsData': {'missedgcd': {'actual': 0, 'expected': 1}}, 'rotation': [{'action': 26675}, {'action': 27978}, {'action': 27978}, {'action': 27978}, {'action': 27978}, {'action': 26678}], 'notesMap': {}}]}
				notes={notesData}
				onGoto={this.timeline.show}
				headerTitle={this.rotationTableHeader}
			/></>
	}

	private mapHistoryActions(): Array<HistoryEntry<EvaluatedAction[]>> {
		return this.history.entries
			.map(entry => ({
				start: entry.start,
				end: entry.end,
				data: entry.data
					.map(ev => {
						const action = this.data.getAction(ev.action)
						if (action == null) { return undefined }
						return {...ev, action}
					})
					.filter(isDefined),
			}))
	}
}
