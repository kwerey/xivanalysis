import {Trans} from '@lingui/react'
import FoeDamage, {FoeDamageEvent} from 'components/ui/FoeDamage'
import React from 'react'
import {Button, Table} from 'semantic-ui-react'
import {formatDuration} from 'utilities'

export interface DamageTakenTableNotesMap {
	/**
	 * Identifier to Notes mapping
	 */
	[id: string]: React.ReactNode
}

export interface DamageTakenNotes {
	/**
	 * Displayed header
	 */
	header: React.ReactNode
	/**
	 * Accessor can either be a string, in which case this will resolve to the value assigned to the same key in the `targetsData` field in each entry,
	 * or a function resolving the entry to the `MitigationTargetData`.
	 */
	accessor: string | ((entry: DamageTakenTableEntry) => React.ReactNode)
}

export interface DamageTakenTableEntry {
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
	notesMap?: DamageTakenTableNotesMap
	/**
	 * Enemy action to display that occurs during this entry
	 */
	damageEvents: foeDamageEvent[]
}

interface DamageTakenTableProps {

	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes?: DamageTakenNotes[]
	/**
	 * List of table entries, consisting of a time frame and the actions mitigated, with optionally a pre calculated target data
	 */
	data: DamageTakenTableEntry[]
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

interface DamageTakenTableProps {
	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes: DamageTakenNotes[]
	/**
	 * Optional Callback to display the jump to time button.
	 * Usually this should be a pass through of the `Timeline.show` function.
	 * @param start
	 * @param end
	 * @param scrollTo
	 */
	onGoto?: (start: number, end: number, scrollTo?: boolean) => void
}

export class DamageTakenTable extends React.Component<DamageTakenTableProps> {

	static notesAccessorResolver = (entry: DamageTakenTableEntry, note: DamageTakenTableNotes): React.ReactNode => {
		if (typeof note.accessor === 'string' && entry.notesMap != null) {
			return entry.notesMap[note.accessor]
		}

		if (typeof note.accessor === 'function') {
			return note.accessor(entry)
		}

		return null
	}

	static Row = ({onGoto, notes, notesMap, start, end, damageEvents}: DamageTakenTableRowProps & DamageTakenTableEntry) =>
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
			<Table.Cell>
				<FoeDamage events={damageEvents}/>
			</Table.Cell>
			{
				notes
					.map(note => DamageTakenTable.notesAccessorResolver({start, end, notesMap, damageEvents}, note))
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
			notes,
			data,
			onGoto,
			headerTitle,
		} = this.props

		return <Table compact unstackable celled>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell collapsing>
						<strong><Trans id="core.ui.damage-taken-table.header.time">Time</Trans></strong>
					</Table.HeaderCell>
					<Table.HeaderCell>
						<strong>{(headerTitle)? headerTitle : <Trans id="core.ui.damage-taken-table.header.damage-taken">Damage Taken</Trans>}</strong>
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
						<DamageTakenTable.Row key={entry.start} onGoto={onGoto} notes={notes || []} {...entry}/>,
					)
				}
			</Table.Body>
		</Table>
	}
}
