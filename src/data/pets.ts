export interface PetPassive {
    name: string;
    description: string;
    effectType: 'bonus_gold' | 'extra_currency_chance' | 'shop_reroll' | 'daily_bonus' | 'refund_chance';
    value: number;
    capPerDay?: number;
}

export type PetRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface PetDefinition {
    id: string;
    name: string;
    icon: string;
    rarity: PetRarity;
    obtainMethod: string;
    passive: PetPassive;
}

export const PET_DATABASE: Record<string, PetDefinition> = {
    'pet_cow': {
        id: 'pet_cow', name: 'Cow', icon: '🐮',
        rarity: 'common', obtainMethod: 'shop_purchase',
        passive: {"name":"Gold Finder","description":"+1 gold per reward (max 10/day)","effectType":"bonus_gold","value":1,"capPerDay":10}
    },\n    'ethereal_cow': {
        id: 'ethereal_cow', name: 'Ethereal Cow', icon: '🌌',
        rarity: 'legendary', obtainMethod: 'jackpot',
        passive: {"name":"Cosmic Blessing","description":"+10 gold per reward (max 25/day), 5% chance to refund shop purchases.","effectType":"bonus_gold","value":10,"capPerDay":25}
    },\n    'wizard_cow': {
        id: 'wizard_cow', name: 'Wizard Cow', icon: '🧙🐮',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: {"name":"Arcane Foraging","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'highland_archer_cow': {
        id: 'highland_archer_cow', name: 'Highland Archer Cow', icon: '🏹🐮',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: {"name":"Swift Draw","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'meditating_war_cow': {
        id: 'meditating_war_cow', name: 'Meditating War Cow', icon: '🧘🐮',
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: {"name":"Zen Mind","description":"+6 gold per reward (max 20/day)","effectType":"bonus_gold","value":6,"capPerDay":20}
    },\n    'cow_king': {
        id: 'cow_king', name: 'Cow King', icon: '👑🐮',
        rarity: 'legendary', obtainMethod: 'other',
        passive: {"name":"Loyal Companion","description":"+10 gold per reward (max 25/day)","effectType":"bonus_gold","value":10,"capPerDay":25}
    },\n    'pet_chicken': {
        id: 'pet_chicken', name: 'Chicken', icon: '🐔',
        rarity: 'common', obtainMethod: 'board_drop',
        passive: {"name":"Quick Beak","description":"+1 gold per reward (max 10/day)","effectType":"bonus_gold","value":1,"capPerDay":10}
    },\n    'pet_goose': {
        id: 'pet_goose', name: 'Goose', icon: '🪿',
        rarity: 'rare', obtainMethod: 'board_drop',
        passive: {"name":"Evasive Wing","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'pet_pig': {
        id: 'pet_pig', name: 'Pig', icon: '🐷',
        rarity: 'common', obtainMethod: 'board_drop',
        passive: {"name":"Truffle Snout","description":"+1 gold per reward (max 10/day)","effectType":"bonus_gold","value":1,"capPerDay":10}
    },\n    'pet_sheep': {
        id: 'pet_sheep', name: 'Sheep', icon: '🐑',
        rarity: 'common', obtainMethod: 'board_drop',
        passive: {"name":"Cozy Fleece","description":"+1 gold per reward (max 10/day)","effectType":"bonus_gold","value":1,"capPerDay":10}
    },\n    'pet_dog': {
        id: 'pet_dog', name: 'Dog', icon: '🐕',
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: {"name":"Loyal Companion","description":"+2 gold per reward (max 12/day)","effectType":"bonus_gold","value":2,"capPerDay":12}
    },\n    'pixel_cat': {
        id: 'pixel_cat', name: 'Cat', icon: '🐱',
        rarity: 'rare', obtainMethod: 'daily_spin',
        passive: {"name":"Night Eye","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'pet_rabbit': {
        id: 'pet_rabbit', name: 'Rabbit', icon: '🐇',
        rarity: 'uncommon', obtainMethod: 'board_drop',
        passive: {"name":"Agile Hop","description":"+2 gold per reward (max 12/day)","effectType":"bonus_gold","value":2,"capPerDay":12}
    },\n    'war_chicken': {
        id: 'war_chicken', name: 'War Chicken', icon: '🐔🗡️',
        rarity: 'uncommon', obtainMethod: 'catch',
        passive: {"name":"Burning Rage","description":"+2 gold per reward (max 12/day)","effectType":"bonus_gold","value":2,"capPerDay":12}
    },\n    'stoneback_turtle': {
        id: 'stoneback_turtle', name: 'Stoneback Turtle', icon: '🐢🪨',
        rarity: 'rare', obtainMethod: 'catch',
        passive: {"name":"Stone Shell","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'shadow_otter': {
        id: 'shadow_otter', name: 'Shadow Otter', icon: '🦦🌑',
        rarity: 'rare', obtainMethod: 'catch',
        passive: {"name":"Deep Diver","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'blood_goose': {
        id: 'blood_goose', name: 'Blood Goose', icon: '🪿🩸',
        rarity: 'rare', obtainMethod: 'catch',
        passive: {"name":"Bloodlust","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'pet_porcupine': {
        id: 'pet_porcupine', name: 'Porcupine', icon: '🦔',
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: {"name":"Spiky Defense","description":"+2 gold per reward (max 12/day)","effectType":"bonus_gold","value":2,"capPerDay":12}
    },\n    'pet_platypus': {
        id: 'pet_platypus', name: 'Platypus', icon: '🦆',
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: {"name":"Treasure Hunter","description":"+2 gold per reward (max 12/day)","effectType":"bonus_gold","value":2,"capPerDay":12}
    },\n    'pet_giraffe': {
        id: 'pet_giraffe', name: 'Giraffe', icon: '🦒',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: {"name":"High Vantage","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'pet_raven': {
        id: 'pet_raven', name: 'Raven', icon: '🐦‍⬛',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: {"name":"Dark Flight","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'pet_rhino': {
        id: 'pet_rhino', name: 'Rhino', icon: '🦏',
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: {"name":"Thick Skin","description":"+6 gold per reward (max 20/day)","effectType":"bonus_gold","value":6,"capPerDay":20}
    },\n    'pet_elephant': {
        id: 'pet_elephant', name: 'Elephant', icon: '🐘',
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: {"name":"Golden Ivory","description":"+6 gold per reward (max 20/day)","effectType":"bonus_gold","value":6,"capPerDay":20}
    },\n    'cyber_dog': {
        id: 'cyber_dog', name: 'Cyber Dog', icon: '🐾',
        rarity: 'common', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+1 gold per reward (max 10/day)","effectType":"bonus_gold","value":1,"capPerDay":10}
    },\n    'spirit_fox': {
        id: 'spirit_fox', name: 'Spirit Fox', icon: '🐾',
        rarity: 'rare', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    },\n    'dragon_hatchling': {
        id: 'dragon_hatchling', name: 'Dragon Hatchling', icon: '🐾',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+6 gold per reward (max 20/day)","effectType":"bonus_gold","value":6,"capPerDay":20}
    },\n    'phoenix_chick': {
        id: 'phoenix_chick', name: 'Phoenix Chick', icon: '🐾',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+6 gold per reward (max 20/day)","effectType":"bonus_gold","value":6,"capPerDay":20}
    },\n    'ancient_owl': {
        id: 'ancient_owl', name: 'Ancient Owl', icon: '🦉',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+10 gold per reward (max 25/day)","effectType":"bonus_gold","value":10,"capPerDay":25}
    },\n    'cosmic_turtle': {
        id: 'cosmic_turtle', name: 'Cosmic Turtle', icon: '🐾',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+10 gold per reward (max 25/day)","effectType":"bonus_gold","value":10,"capPerDay":25}
    },\n    'galaxy_heifer': {
        id: 'galaxy_heifer', name: 'Galaxy-Eyed Heifer', icon: '🐾',
        rarity: 'mythic', obtainMethod: 'gacha',
        passive: {"name":"Gacha Passive","description":"+15 gold per reward (max 30/day)","effectType":"bonus_gold","value":15,"capPerDay":30}
    },\n    'golden_goldfish': {
        id: 'golden_goldfish', name: 'Golden Goldfish', icon: '🐾',
        rarity: 'legendary', obtainMethod: 'luck_roll',
        passive: {"name":"Golden Blessing","description":"+10 gold per reward (max 25/day)","effectType":"bonus_gold","value":10,"capPerDay":25}
    },\n    'pet_wolf': {
        id: 'pet_wolf', name: 'Wolf', icon: '🐾',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: {"name":"Wolf Spirit","description":"+4 gold per reward (max 15/day)","effectType":"bonus_gold","value":4,"capPerDay":15}
    }
};
