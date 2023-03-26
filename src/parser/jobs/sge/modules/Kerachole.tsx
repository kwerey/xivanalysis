import {MessageDescriptor} from '@lingui/core'
import {t, Trans} from '@lingui/macro'
import {DataLink} from 'components/ui/DbLink'
import {ActionKey} from 'data/ACTIONS'
import {Status} from 'data/STATUSES'
import {Event, Events} from 'event'
import {filter, oneOf} from 'parser/core/filter'
import {dependency} from 'parser/core/Injectable'
import {MitigationWindow, DamageTakenEvaluator} from 'parser/core/modules/ActionWindow'
import {GlobalCooldown} from 'parser/core/modules/GlobalCooldown'
import {SEVERITY} from 'parser/core/modules/Suggestions'
import React from 'react'
import {Actor, Team, Pull} from 'report'
import {Message} from 'semantic-ui-react'
import {DISPLAY_ORDER} from './DISPLAY_ORDER'

export class Kerachole extends MitigationWindow {
	static override handle = 'Kerachole'
	static override title: MessageDescriptor = t('sge.kerachole.title')`Kerachole Uses`
	static override displayOrder = DISPLAY_ORDER.KERACHOLE

	@dependency private globalCooldown!: GlobalCooldown

	override prependMessages = <Message>
		<Trans id="sge.kerachole.prepend.content">
			This module shows how much damage the party took while Kerachole was up so that you can judge how much value you got from its damage mitigation effect. Where possible the module provides names for boss attacks. Damage values in brackets are from auto-attacks or bleed ticks. You can drill down more on FFlogs to get more information on the target and type of damage.
		</Trans>
	</Message>

	override buffStatus: Status = this.data.statuses.KERACHOLE

	override initialise() {
		super.initialise()

		const foeIds = this.parser.pull.actors
			.filter(actor => actor.team === Team.FOE)
			.map(actor => actor.id)

		const actionFilter = filter<Event>()
			.type('damage') // capture instances of damage to get total damage dealt
			.source(oneOf(foeIds))

		this.setEventFilter((event): event is Events['damage'] => {

			// Use the filter above to fetch only events by hostile actors
			if (!actionFilter(event)) { return false }

			return event

		})

		this.addEvaluator(new DamageTakenEvaluator({
			suggestionIcon: this.data.actions.KERACHOLE.icon,
			suggestionContent: <Trans id="sge.kerachole.missed.suggestion.content"><DataLink action="KERACHOLE"/> mitigates incoming damage. try to use it in anticipation of significant damage spikes.</Trans>,
			suggestionWindowName: <DataLink action="KERACHOLE" showIcon={false} />,
			severityTiers: {
				1: SEVERITY.MEDIUM,
				2: SEVERITY.MAJOR,
			},
		}))

	}

}
