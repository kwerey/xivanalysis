import {MessageDescriptor} from '@lingui/core'
import {t, Trans} from '@lingui/macro'
import {DataLink} from 'components/ui/DbLink'
import {ActionKey} from 'data/ACTIONS'
import {Status} from 'data/STATUSES'
import {dependency} from 'parser/core/Injectable'
import {BuffWindow, ExpectedGcdCountEvaluator} from 'parser/core/modules/ActionWindow'
import {GlobalCooldown} from 'parser/core/modules/GlobalCooldown'
import {SEVERITY} from 'parser/core/modules/Suggestions'
import React from 'react'
import {DISPLAY_ORDER} from './DISPLAY_ORDER'

// THIS ISN'T ACTUALLY DOING ANYTHING USEFUL ITS JUST A PLACEHOLDER

/** Zoe only affects healing spells, so we're only going to track those */
const GCD_HEALS: ActionKey[] = [
	'PNEUMA',
	'DIAGNOSIS',
	'EUKRASIAN_DIAGNOSIS',
	'PROGNOSIS',
	'EUKRASIAN_PROGNOSIS',
]

export class Kerachole extends BuffWindow {
	static override handle = 'Kerachole'
	static override title: MessageDescriptor = t('sge.kerachole.title')`Kerachole Efficiency`
	static override displayOrder = DISPLAY_ORDER.KERACHOLE

	@dependency private globalCooldown!: GlobalCooldown

	override buffStatus: Status = this.data.statuses.KERACHOLE

	override initialise() {
		super.initialise()

		this.trackOnlyActions(GCD_HEALS.map(key => this.data.actions[key].id))

		this.addEvaluator(new ExpectedGcdCountEvaluator({
			expectedGcds: 1,
			globalCooldown: this.globalCooldown,
			suggestionIcon: this.data.actions.ZOE.icon,
			suggestionContent: <Trans id="sge.kerachole.missed.suggestion.content"><DataLink action="KERACHOLE"/> mitigates incoming damage. try to use it in anticipation of significant damage spikes.</Trans>,
			suggestionWindowName: <DataLink action="KERACHOLE" showIcon={false} />,
			severityTiers: {
				1: SEVERITY.MEDIUM,
				2: SEVERITY.MAJOR,
			},
		}))
	}
}
