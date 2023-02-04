import {MitigationTable, MitigationTableNotesMap} from 'components/ui/MitigationTable'
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
 * Tracks enemy actions that occur within a window.
 * Hacks together buffwindow + actionwindow
 * We need a new window base class to do this so we can display any action by looking it up from XIVAPI.
 * ActionWindow just refers to the ones available in-repo as data
 * (Also bc we don't have gcds and ogcds for enemies.)
 * We could mod use ActionWindow without adding a bunch of logic to display either friendly or hostile actions but that seems messy
 */
export abstract class FoeActionWindow extends Analyser {

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
	 * We might want to extend this to capture instances of damage at some point?
	 * But that seems hard and people can refer to fflogs for details
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
	protected migitationTableHeader?: JSX.Element

	/**
	 * Implementing modules MAY provide a JSX element to appear above the migitationTable
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

		const notesData = evalColumns.filter(column => column.format === 'notes').map(column => column.header)

		const foeActionData = this.history.entries
			.map((window, idx) => {
				const notesMap: MitigationTableNotesMap = {}
				evalColumns.forEach(column => {
					if (typeof column.header.accessor !== 'string') { return }
					const colName = column.header.accessor
					notesMap[colName] = column.rows[idx]
				})

				return {
					start: window.start - this.parser.pull.timestamp,
					end: (window.end ?? window.start) - this.parser.pull.timestamp,
					rotation: window.data.map(event => { return {action: event.action} }),
					notesMap,
				}
			})

		console.log(`foeActionData is: ${JSON.stringify(foeActionData)}`)

		return <>
			{this.prependMessages}
			<MitigationTable
				data={foeActionData}
				notes={notesData}
				onGoto={this.timeline.show}
				headerTitle={this.migitationTableHeader}
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
