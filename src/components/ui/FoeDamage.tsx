import cn from 'classnames'
import {ActionLink} from 'components/ui/DbLink'
import {getDataBy} from 'data'
import ACTIONS, {ITEM_ID_OFFSET} from 'data/ACTIONS'
import {Cause} from 'event'
import React, {Component} from 'react'
import overlayStyle from './Procs/ProcOverlay.module.css'
import styles from './Rotation.module.css'

/* Foe? Enemy? I'm using foe because we have FRIEND and FOE in the report */

export interface FoeDamageEvent {
	cause?: Cause,
	action?: number
	isProc?: boolean
}
interface FoeDamageProps {
	events: FoeDamageEvent[]
}

export default class FoeDamage extends Component<FoeDamageProps> {

	/**
	 *
	 * @param FoeDamageEvent
	 * @returns integer representing total damage taken by the party by a damage event
	 */
	private getEventDamageTotal(event: FoeDamageEvent): number | undefined {
		let damageTotal = 0
		for (let step = 0; step < event.targets.length; step++) {
			// there is maybe a nicer way to do this with reduce()
			// console.log(`target ${step} took this much damage: ${damageEvent.targets[step].amount}`)
			damageTotal =+ event.targets[step].amount
			// console.log(`adding this instance of damage, new total is ${damageTotal}`)
		}
		return damageTotal
	}

	/**
	 *
	 * @param FoeDamageEvent
	 * @returns action id according to event.source.action, note that not all event id will be found in XIVApi.
	 **/
	private getActionId(event: FoeDamageEvent): number | undefined {
		// console.log(`trying to get action id, the event in question is ${JSON.stringify(event)}`)
		if (event.action != null) {
			return event.action
		}
		if (event.cause != null && event.cause.type === 'action') {
			// console.log(`trying to get action id, the event cause is ${event.cause.action}`)
			return event.cause.action
		}
		return undefined
	}

	override render() {

		const {events} = this.props

		return <div className={styles.container}>
			{events.map((event, index) => {
				const actionId = this.getActionId(event)

				const damageTotal = this.getEventDamageTotal(event)

				const linkClassName = [
					styles.link,
					// Can we display boss autos above using the same style as oGCDs?
					// {[styles.ogcd]: !action.onGcd},
					// event.isProc ? overlayStyle.procOverlay : '',
				]

				const iconSize = styles.gcdSize // just use the gcd styling for now.
				// const iconSize = action.onGcd ? styles.gcdSize : styles.ogcdSize

				// some actionids stay as 'loading' indefinitely
				// eg 500000 which looks like its proto-carbuncles auto attack
				// can we filter them out or hide the 'loading' text?
				return <div
					key={index}
					className={cn(...linkClassName)}
				>
					<b><ActionLink id={actionId} showIcon={false} /></b> ({damageTotal}) &nbsp;
				</div>
			})}
		</div>
	}
}
