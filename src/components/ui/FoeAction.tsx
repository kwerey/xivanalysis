import cn from 'classnames'
import {ActionLink, ItemLink} from 'components/ui/DbLink'
import {getDataBy} from 'data'
import ACTIONS, {ITEM_ID_OFFSET} from 'data/ACTIONS'
import {Cause} from 'event'
import React, {Component} from 'react'
import overlayStyle from './Procs/ProcOverlay.module.css'
import styles from './Rotation.module.css'

/* Foe? Enemy? I'm using foe because we have FRIEND and FOE in the report */
// copying the 'rotation' module fully
// I think we'll need this to display autos and format stuff right when its not either on or off gcd.

export interface FoeActionEvent {
	cause?: Cause,
	action?: number
	isProc?: boolean
}
interface FoeActionProps {
	events: FoeActionEvent[]
}

export default class FoeAction extends Component<FoeActionProps> {
	getActionId(event: FoeActionEvent): number | undefined {
		if (event.action != null) {
			return event.action
		}
		if (event.cause != null && event.cause.type === 'action') {
			return event.cause.action
		}
		return undefined
	}

	override render() {
		const {events} = this.props

		return <div className={styles.container}>
			{events.map((event, index) => {
				const actionId = this.getActionId(event)

				const action = getDataBy(ACTIONS, 'id', actionId) as TODO

				// Don't bother showing the icon for autos
				// if (!action || action.autoAttack) {
				// 	return
				// }

				// Stuff like the duty action doesn't have an icon mapping yet.
				// TODO: Sort this out if it's a problem
				if (!action.icon) {
					console.error(event, 'event ability has no icon')
					return false
				}

				const linkClassName = [
					styles.link,
					// Not relevant, but maybe we'd wanna display boss autos above using the same style as oGCDs?
					// {[styles.ogcd]: !action.onGcd},
					// event.isProc ? overlayStyle.procOverlay : '',
				]

				const iconSize = styles.gcdSize // just use the gcd styling for now.
				// const iconSize = action.onGcd ? styles.gcdSize : styles.ogcdSize

				// can probably comment the next two lines out?
				const isItem = action.id >= ITEM_ID_OFFSET

				const Link = isItem ? ItemLink : ActionLink

				return <div
					key={index}
					className={cn(...linkClassName)}
				>
					<Link
						showName={false}
						iconSize={iconSize}
						{...action}
					/>
				</div>
			})}
		</div>
	}
}
