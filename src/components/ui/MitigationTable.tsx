import {Trans} from '@lingui/react'
import FoeAction, {FoeActionEvent} from 'components/ui/FoeAction'
import React from 'react'
import {Button, Table} from 'semantic-ui-react'
import {isDefined, formatDuration} from 'utilities'

// RENAME ALL THE STUFF IN HERE PROPERLY LIKE A SENSIBLE PERSON WOULD

export interface MitigationTarget {
	/**
	 * Displayed header
	 */
	header: React.ReactNode
	/**
	 * Accessor can either be a string, in which case this will resolve to the value assigned to the same key in the `targetsData` field in each entry,
	 * or a function resolving the entry to the `MitigationTargetData`.
	 */
	accessor: string | ((entry: MitigationTableEntry) => MitigationTargetData)
}

export interface MitigationNotes {
	/**
	 * Displayed header
	 */
	header: React.ReactNode
	/**
	 * Accessor can either be a string, in which case this will resolve to the value assigned to the same key in the `targetsData` field in each entry,
	 * or a function resolving the entry to the `MitigationTargetData`.
	 */
	accessor: string | ((entry: MitigationTableEntry) => React.ReactNode)
}

/**
 * Determines how a rotation target gets highlighted (negative = red, positive = green)
 */
export enum MitigationTargetOutcome { NEGATIVE, NEUTRAL, POSITIVE }

export interface MitigationTargetData {
	/**
	 * Expected target number
	 */
	expected?: number
	/**
	 * Recorded number
	 */
	actual: number
	/**
	 * Optional function to override the default positive/negative highlighting
	 */
	targetComparator?: (actual: number, expected?: number) => MitigationTargetOutcome
}

export interface MitigationTableTargetData {
	/**
	 * Identifier to Target Data mapping
	 */
	[id: string]: MitigationTargetData
}

export interface MitigationTableNotesMap {
	/**
	 * Identifier to Notes mapping
	 */
	[id: string]: React.ReactNode
}

export interface MitigationTableEntry {
	/**
	 * Start point relative to fight start
	 */
	start: number
	/**
	 * End point relative to fight start
	 */
	end: number
	/**
	 * Map of pre calculated target data
	 */
	targetsData?: MitigationTableTargetData
	/**
	 * Map of pre calculated target data
	 */
	notesMap?: MitigationTableNotesMap
	/**
	 * Enemy action to display that occurs during this entry
	 */
	foeaction: FoeActionEvent[]
}

interface MitigationTableProps {
	/**
	 * List of Targets to display, consisting of the displayed header and the accessor to resolve the actual and expected values
	 */
	targets?: MitigationTarget[]
	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes?: MitigationNotes[]
	/**
	 * List of table entries, consisting of a time frame and the actions mitigated, with optionally a pre calculated target data
	 */
	data: MitigationTableEntry[]
	/**
	 * Optional Callback to display the jump to time button.
	 * Usually this should be a pass through of the `Timeline.show` function.
	 * @param start
	 * @param end
	 * @param scrollTo
	 */
	onGoto?: (start: number, end: number, scrollTo?: boolean) => void
	/**
	 * Optional property to provide a JSX.Element (translation tag) for the header value.
	 * Defaults to "Attacks Mitigated"
	 */
	headerTitle?: JSX.Element
}

interface MitigationTableRowProps {
	/**
	 * List of Targets to display, consisting of the displayed header and the accessor to resolve the actual and expected values
	 */
	targets: MitigationTarget[]
	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes: MitigationNotes[]
	/**
	 * Optional Callback to display the jump to time button.
	 * Usually this should be a pass through of the `Timeline.show` function.
	 * @param start
	 * @param end
	 * @param scrollTo
	 */
	onGoto?: (start: number, end: number, scrollTo?: boolean) => void
}

export class MitigationTable extends React.Component<MitigationTableProps> {
	static defaultTargetComparator(actual: number, expected?: number): MitigationTargetOutcome {
		if (!isDefined(expected)) {
			return MitigationTargetOutcome.NEUTRAL
		}

		if (actual >= expected) {
			return MitigationTargetOutcome.POSITIVE
		}

		return MitigationTargetOutcome.NEGATIVE
	}

	static targetAccessorResolver = (entry: MitigationTableEntry, target: MitigationTarget): MitigationTargetData => {
		if (typeof target.accessor === 'string' && entry.targetsData != null) {
			return entry.targetsData[target.accessor]
		}

		if (typeof target.accessor === 'function') {
			return target.accessor(entry)
		}

		return {
			actual: 0,
			expected: 0,
		}
	}

	static notesAccessorResolver = (entry: MitigationTableEntry, note: MitigationNotes): React.ReactNode => {
		if (typeof note.accessor === 'string' && entry.notesMap != null) {
			return entry.notesMap[note.accessor]
		}

		if (typeof note.accessor === 'function') {
			return note.accessor(entry)
		}

		return null
	}

	static TargetCell = ({actual, expected, targetComparator}: MitigationTargetData) => {
		if (targetComparator === undefined) {
			targetComparator = MitigationTable.defaultTargetComparator
		}
		const targetOutcome = targetComparator(actual, expected)

		return <Table.Cell
			textAlign="center"
			positive={targetOutcome === MitigationTargetOutcome.POSITIVE}
			negative={targetOutcome === MitigationTargetOutcome.NEGATIVE}
		>
			{actual}/{expected === undefined ? '-' : expected}
		</Table.Cell>
	}

	static Row = ({onGoto, targets, notes, notesMap, start, end, targetsData, foeaction}: MitigationTableRowProps & MitigationTableEntry) =>
		<Table.Row>
			<Table.Cell textAlign="center">
				<span style={{marginRight: 5}}>{formatDuration(start, {secondPrecision: 0})}</span>
				{typeof onGoto === 'function' && <Button
					circular
					compact
					size="mini"
					icon="time"
					onClick={() => onGoto(start, end)}
				/>}
			</Table.Cell>
			{
				targets
					.map(target => MitigationTable.targetAccessorResolver({start, end, targetsData, foeaction}, target))
					.map((targetEntry, i) => <MitigationTable.TargetCell key={`target_${i}`} {...targetEntry}/>)
			}
			<Table.Cell>
				<FoeAction events={foeaction}/>
			</Table.Cell>
			{
				notes
					.map(note => MitigationTable.notesAccessorResolver({start, end, targetsData, notesMap, foeaction}, note))
					.map((noteEntry, i) =>
						<Table.Cell
							key={`notes_${i}`}
							textAlign="center"
						>
							{noteEntry}
						</Table.Cell>,
					)
			}
		</Table.Row>

	override render(): React.ReactNode {
		const {
			targets,
			notes,
			data,
			onGoto,
			headerTitle,
		} = this.props

		return <Table compact unstackable celled>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell collapsing>
						<strong><Trans id="core.ui.rotation-table.header.time">Time</Trans></strong>
					</Table.HeaderCell>
					{
						(targets || []).map((target, i) =>
							<Table.HeaderCell key={`target_header_${i}`} textAlign="center" collapsing>
								<strong>{target.header}</strong>
							</Table.HeaderCell>,
						)
					}
					<Table.HeaderCell>
						<strong>{(headerTitle)? headerTitle : <Trans id="core.ui.rotation-table.header.rotation">Attacks Mitigated</Trans>}</strong>
					</Table.HeaderCell>
					{
						(notes || []).map((note, i) =>
							<Table.HeaderCell key={`note_header_${i}`} textAlign="center" collapsing>
								<strong>{note.header}</strong>
							</Table.HeaderCell>,
						)
					}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{
					data.map((entry) =>
						<MitigationTable.Row key={entry.start} onGoto={onGoto} targets={targets || []} notes={notes || []} {...entry}/>,
					)
				}
			</Table.Body>
		</Table>
	}
}
