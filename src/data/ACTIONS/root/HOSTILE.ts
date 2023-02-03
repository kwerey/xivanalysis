import {Attribute} from 'event'
import {ensureActions} from '../type'

// this is obviously terrible we can't do it for every boss. but checking if i add info for an action here it starts to show up in rotation table

export const HOSTILE = ensureActions({
	// -----
	// Player GCDs
	// -----
	ACTION26653: {
		id: 26653,
		name: '',
		icon: 'https://xivapi.com/i/003000/003401.png',
		onGcd: true,
		speedAttribute: Attribute.SKILL_SPEED,
	},

})
