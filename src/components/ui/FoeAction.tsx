import cn from 'classnames'
import {ActionLink, ItemLink} from 'components/ui/DbLink'
import {getDataBy} from 'data'
import ACTIONS, {ITEM_ID_OFFSET} from 'data/ACTIONS'
import {Cause} from 'event'
import React, {Component} from 'react'
import overlayStyle from './Procs/ProcOverlay.module.css'
import styles from './Rotation.module.css'

/* Foe? Enemy? I'm using foe because we have FRIEND and FOE in the report */

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

				console.log(`foeaction we are trying to look up: ${event}`)

				const actionId = this.getActionId(event)

				console.log(`actionId for this event is: ${actionId}`)

				const linkClassName = [
					styles.link,
					// Can we display boss autos above using the same style as oGCDs?
					// {[styles.ogcd]: !action.onGcd},
					// event.isProc ? overlayStyle.procOverlay : '',
				]

				const iconSize = styles.gcdSize // just use the gcd styling for now.
				// const iconSize = action.onGcd ? styles.gcdSize : styles.ogcdSize

				return <div
					key={index}
					className={cn(...linkClassName)}
				>
					<ActionLink id={event.action} showIcon={false} />
				</div>
			})}
		</div>
	}
}
