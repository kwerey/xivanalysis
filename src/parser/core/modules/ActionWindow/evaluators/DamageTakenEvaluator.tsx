import {Plural, Trans} from '@lingui/react' // we probably do want plurals some day?
import React from 'react'
import {SeverityTiers, TieredSuggestion} from '../../Suggestions/Suggestion'
import {HistoryEntry} from '../History'

// currently we aren't providing targets
interface TableOutput  {
	format: 'table'
}

// Not currently used we're just doing it inline
// Probably its better to use this so it can be overriden.
interface NotesOutput {
	format: 'notes'
	header: 'Total Damage' // do the translation stuff
	rows: JSX.Element[]
}

export type EvaluationOutput = TableOutput | NotesOutput

/**
 * Implements ActionWindow / BuffWindow.
 * @see ActionWindow
 */

/**
 * Display total damage taken during this window.
 */
export class DamageTakenEvaluator implements WindowEvaluator {

	private suggestionIcon: string
	private suggestionContent: JSX.Element
	private suggestionWindowName: JSX.Element
	private severityTiers: SeverityTiers

	constructor(opts: DamageTakenOptions) {
		this.suggestionIcon = opts.suggestionIcon
		this.suggestionContent = opts.suggestionContent
		this.suggestionWindowName = opts.suggestionWindowName
		this.severityTiers = opts.severityTiers
	}

	// this is purely informational
	public suggest() { return undefined }

	// We're not using EvaluatedAction since that relies on looking them up within XIVA and we need to use the API.
	public output(windows: HistoryEntry[]): EvaluationOutput | EvaluationOutput[] | undefined {
		return {
			format: 'notes',
			header: {
				header: <Trans id="core.damage-taken.table.header.total-damage-taken">Total Damage</Trans>,
				accessor: 'totaldamagetaken', // I don't understand how this accessor is used so prolly this doesn't work as expected
			},
			rows: windows.map(window => {
				return <div>{this.countDamageTakenInWindow(window)}</div>
			}),
		}
	 }

	/**
	 *
	 * @param event
	 * @returns integer representing total damage taken by the party by a damage event
	 */
	private getEventDamageTotal(event): number | undefined {
		let damageTotal = 0
		for (let step = 0; step < event.targets.length; step++) {
			// there is maybe a nicer way to do this with reduce()
			// console.log(`target ${step} took this much damage: ${event.targets[step].amount}`)
			damageTotal =+ damageTotal + event.targets[step].amount
			// console.log(`adding this instance of damage, new total is ${damageTotal}`)
		}
		return damageTotal
	}

	private countDamageTakenInWindow(window) {
		let rowDamageTotal = 0
		for (const event of window.data) {
			rowDamageTotal =+ rowDamageTotal + this.getEventDamageTotal(event)
		}
		// console.log(`total damage taken in this window is ${rowDamageTotal}`)
		return rowDamageTotal
	}

}
