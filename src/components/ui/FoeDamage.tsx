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
	 * @param damageEvent
	 * @returns integer representing total damage taken by all targets by an instance of damage
	 */
	private getDamageTotal(damageEvent: FoeDamageEvent): number | undefined {
		let damageTotal = 0
		for (let step = 0; step < damageEvent.targets.length; step++) {
			// there is maybe a nicer way to do this with reduce()
			// console.log(`target ${step} took this much damage: ${damageEvent.targets[step].amount}`)
			damageTotal =+ damageTotal + damageEvent.targets[step].amount
			// console.log(`adding this instance of damage, new total is ${damageTotal}`)
		}
		return damageTotal
	}

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

				// console.log(`damage instance we are trying to look up: ${JSON.stringify(event)}`)

				const actionId = this.getActionId(event)

				const damageTotal = this.getDamageTotal(event)

				console.log(`actionId for this event is: ${actionId} and damageTotal is ${damageTotal}`)

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
					<b><ActionLink id={actionId} showIcon={false} /></b> ({damageTotal})
				</div>
			})}
		</div>
	}
}
