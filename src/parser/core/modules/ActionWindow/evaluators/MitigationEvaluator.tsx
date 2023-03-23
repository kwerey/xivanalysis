import {Plural, Trans} from '@lingui/react' // we probably do want plurals some day?
import {MitigationTarget, MitigationTargetData} from 'components/ui/DamageTakenTable'
import React from 'react'
import {SeverityTiers, TieredSuggestion} from '../../Suggestions/Suggestion'
import {EvaluatedAction} from '../EvaluatedAction'
import {HistoryEntry} from '../History'

interface TableOutput  {
	format: 'table'
	header: MitigationTarget
	rows: MitigationTargetData[]
}
interface NotesOutput {
	format: 'notes'
	// To be most accurate, this type should be RotationNotes.  However, both types have the
	// same properties and the consumer works with this type.  Making this be RotationNotes
	// requires extra discrimnate function calls in the consumer for table format data.
	header: MitigationTarget
	rows: JSX.Element[]
}
export type EvaluationOutput = TableOutput | NotesOutput

/**
 * Implements ActionWindow / BuffWindow.
 * @see ActionWindow
 */

/**
 * Once I figure out how, this will display enemy attacks which were mitigated successfully by a buff or debuff.
 */
export class MitigationEvaluator implements WindowEvaluator {

	// private expectedGcds: number
	// private globalCooldown: GlobalCooldown
	private suggestionIcon: string
	private suggestionContent: JSX.Element
	private suggestionWindowName: JSX.Element
	private severityTiers: SeverityTiers

	// constructor(opts: ExpectedGcdCountOptions) {
	// 	this.expectedGcds = opts.expectedGcds
	// 	this.globalCooldown = opts.globalCooldown
	// 	this.suggestionIcon = opts.suggestionIcon
	// 	this.suggestionContent = opts.suggestionContent
	// 	this.suggestionWindowName = opts.suggestionWindowName
	// 	this.severityTiers = opts.severityTiers
	// 	this.adjustCount = opts.adjustCount ?? (() => 0)
	// }

	public suggest(windows: Array<HistoryEntry<EvaluatedAction[]>>) {
		// Calculate attacks other than autos mitigated here instead?
		// const missedGCDs = windows.reduce((acc, window) => acc + this.calculateMissingGcdsForWindow(window), 0)
		const nonAutosMitigated = 0 // placeholder to make stuff display

		return new TieredSuggestion({
			icon: this.suggestionIcon,
			content: this.suggestionContent,
			tiers: this.severityTiers,
			value: nonAutosMitigated, // placeholder, fix it
			why: <Trans id="core.buffwindow.suggestions.missedgcd.why">The only enemy actions mitigated were auto-attacks. Look for opportunities to use {this.suggestionWindowName} to mitigate raidwide damage or tankbusters where possible.
			</Trans>, // placeholder trans id, fix it.
		})
	}

	public output(windows: Array<HistoryEntry<EvaluatedAction[]>>): EvaluationOutput  {
		return {
			format: 'table',
			header: {
				header: <Trans id="core.buffwindow.table.header.mitigated">Attacks Mitigated</Trans>,
				accessor: 'missedgcd', // not sure what this means? react thing? change?
			},
			rows: windows.map(window => {
				return {
					actual: this.countGcdsInWindow(window), // TODO: make configurable, but by default calculate that one non-auto-attack was mitigated?
					expected: 1,
				}
			}),
		}
	}

	private countGcdsInWindow(window: HistoryEntry<EvaluatedAction[]>) {
		// console.log(`the data in this window is: ${JSON.stringify(window.data)}`)
		return window.data.filter(cast=> cast.action).length
		// return window.data.filter(cast => cast.action.onGcd).length
		// return 'placeholder'
	}

}
