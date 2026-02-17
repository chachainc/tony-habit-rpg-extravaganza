import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Pet Ability Types ──────────────────────────────────────────
export type AbilityScalingStat = 'Strength' | 'Cardio' | 'Flexibility' | 'Sleep' | 'Hygiene' | 'Intelligence';
export type AbilityType = 'damage' | 'heal' | 'buff_atk' | 'buff_def' | 'debuff_def' | 'extra_damage' | 'reduce_damage';

export interface PetAbility {
    id: string;
    name: string;
    icon: string;
    description: string;
    cooldown: number;
    type: AbilityType;
    baseDamage?: number;
    scalingStat?: AbilityScalingStat;
    scalingFactor?: number;      // multiplied by stat level
    buffValue?: number;          // % for buffs
    buffDuration?: number;       // turns
    healBase?: number;
    healScaling?: number;
}

export interface PetPassive {
    id: string;
    name: string;
    description: string;
    icon: string;
    effect: {
        type: 'damage_per_streak' | 'xp_bonus' | 'crit_bonus' | 'dodge_bonus' | 'resistance_bonus';
        value: number;           // % per trigger
        triggerDays?: number;    // e.g. per 7-day streak
        skillBonus?: string;     // which skill gets XP bonus
    };
}

export interface PetUltimate {
    id: string;
    name: string;
    icon: string;
    description: string;
    streakRequired: number;      // days of consistent habit logging to unlock
    baseDamage: number;
    scalingStat: AbilityScalingStat;
    scalingFactor: number;
    healPercent?: number;        // % of damage dealt healed
}

export interface PetEvolution {
    evolvedPetId: string;
    evolvedName: string;
    requiredSkill: AbilityScalingStat;
    requiredLogs: number;        // cumulative logs needed
    scalingBonus: number;        // e.g. 0.25 = +25% base scaling
    newPassiveDescription: string;
}

export interface PetDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    abilities: [PetAbility, PetAbility];   // 2 active abilities
    passive: PetPassive;
    ultimate: PetUltimate;
    evolution?: PetEvolution;
    // Stat scaling for combat
    damageScaling: { stat: AbilityScalingStat; factor: number };
    speedScaling: { stat: AbilityScalingStat; factor: number };
    dodgeScaling: { stat: AbilityScalingStat; factor: number };
    critScaling: { stat: AbilityScalingStat; factor: number };
    resistScaling: { stat: AbilityScalingStat; factor: number };
    spellScaling: { stat: AbilityScalingStat; factor: number };
}

// ── Pet Database ───────────────────────────────────────────────
export const PET_DATABASE: Record<string, PetDefinition> = {
    'pet_cow': {
        id: 'pet_cow',
        name: 'Cow',
        icon: '🐮',
        description: 'Your loyal starter companion. Sturdy and dependable.',
        abilities: [
            {
                id: 'moo_shield', name: 'Moo Shield', icon: '🛡️',
                description: 'Reduces incoming damage by 30% for 2 turns.',
                cooldown: 5, type: 'reduce_damage', buffValue: 30, buffDuration: 2,
            },
            {
                id: 'headbutt', name: 'Headbutt', icon: '💥',
                description: 'Charges into enemy. Scales with Strength.',
                cooldown: 3, type: 'damage', baseDamage: 8,
                scalingStat: 'Strength', scalingFactor: 1.0,
            },
        ],
        passive: {
            id: 'sturdy_hide', name: 'Sturdy Hide', icon: '🐮',
            description: '+2% resistance per 7-day streak.',
            effect: { type: 'resistance_bonus', value: 0.02, triggerDays: 7 },
        },
        ultimate: {
            id: 'stampede', name: 'Stampede', icon: '🐮💨',
            description: 'Massive charge dealing heavy damage.',
            streakRequired: 30, baseDamage: 40,
            scalingStat: 'Strength', scalingFactor: 2.0,
        },
        evolution: {
            evolvedPetId: 'galaxy_heifer',
            evolvedName: 'Galaxy Heifer',
            requiredSkill: 'Hygiene',
            requiredLogs: 30,
            scalingBonus: 0.25,
            newPassiveDescription: '+3% resistance per 7-day streak + 5% damage reduction.',
        },
        damageScaling: { stat: 'Strength', factor: 1.0 },
        speedScaling: { stat: 'Cardio', factor: 0.8 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.2 },
        critScaling: { stat: 'Sleep', factor: 0.3 },
        resistScaling: { stat: 'Hygiene', factor: 1.0 },
        spellScaling: { stat: 'Intelligence', factor: 0.5 },
    },

    'pet_porcupine': {
        id: 'pet_porcupine',
        name: 'Porcupine',
        icon: '🦔',
        description: 'A spiky friend who returns damage to attackers.',
        abilities: [
            {
                id: 'quill_barrage', name: 'Quill Barrage', icon: '🪡',
                description: 'Fires sharp quills. Scales with Flexibility.',
                cooldown: 3, type: 'damage', baseDamage: 12,
                scalingStat: 'Flexibility', scalingFactor: 1.2,
            },
            {
                id: 'spiky_defense', name: 'Spiky Defense', icon: '🛡️',
                description: 'Reflects damage for 2 turns.',
                cooldown: 6, type: 'reduce_damage', buffValue: 25, buffDuration: 2,
            },
        ],
        passive: {
            id: 'thorn_aura', name: 'Thorn Aura', icon: '🦔',
            description: '+2% damage reflection per 7-day streak.',
            effect: { type: 'resistance_bonus', value: 0.02, triggerDays: 7 }, // Using resistance as proxy for now
        },
        ultimate: {
            id: 'needle_storm', name: 'Needle Storm', icon: '🌪️',
            description: 'Explosion of quills in all directions.',
            streakRequired: 30, baseDamage: 45,
            scalingStat: 'Flexibility', scalingFactor: 2.5,
        },
        damageScaling: { stat: 'Flexibility', factor: 1.2 },
        speedScaling: { stat: 'Cardio', factor: 0.8 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.8 },
        critScaling: { stat: 'Sleep', factor: 0.5 },
        resistScaling: { stat: 'Hygiene', factor: 1.0 },
        spellScaling: { stat: 'Intelligence', factor: 0.2 },
    },

    'pet_wolf': {
        id: 'pet_wolf',
        name: 'Wolf',
        icon: '🐺',
        description: 'A fierce and loyal battle companion.',
        abilities: [
            {
                id: 'bite', name: 'Bite', icon: '🦷',
                description: 'Strong bite attack. Scales with Strength.',
                cooldown: 2, type: 'damage', baseDamage: 15,
                scalingStat: 'Strength', scalingFactor: 1.3,
            },
            {
                id: 'howl', name: 'Howl', icon: '🌕',
                description: 'Boosts ATK by 25% for 2 turns.',
                cooldown: 5, type: 'buff_atk', buffValue: 25, buffDuration: 2,
            },
        ],
        passive: {
            id: 'predator_instinct', name: 'Predator Instinct', icon: '🐺',
            description: '+1% crit chance per 7-day streak.',
            effect: { type: 'crit_bonus', value: 0.01, triggerDays: 7 },
        },
        ultimate: {
            id: 'moonlight_hunt', name: 'Moonlight Hunt', icon: '🌕🐺',
            description: 'Vicious combo attack under the moon.',
            streakRequired: 30, baseDamage: 55,
            scalingStat: 'Strength', scalingFactor: 2.8,
        },
        damageScaling: { stat: 'Strength', factor: 1.4 },
        speedScaling: { stat: 'Cardio', factor: 1.2 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.6 },
        critScaling: { stat: 'Sleep', factor: 0.5 },
        resistScaling: { stat: 'Hygiene', factor: 0.8 },
        spellScaling: { stat: 'Intelligence', factor: 0.2 },
    },

    'ethereal_cow': {
        id: 'ethereal_cow',
        name: 'Ethereal Cow',
        icon: '🐮✨',
        description: 'Ultra-Rare Cosmic Bovine! Grants cosmic blessings.',
        abilities: [
            {
                id: 'cosmic_milk', name: 'Cosmic Milk', icon: '🥛',
                description: 'Heals 50 HP and cures debuffs.',
                cooldown: 5, type: 'heal', healBase: 50, healScaling: 1.0,
                scalingStat: 'Sleep',
            },
            {
                id: 'starfall', name: 'Starfall', icon: '🌠',
                description: 'Calls down stars. Scales with all stats.',
                cooldown: 4, type: 'damage', baseDamage: 30,
                scalingStat: 'Intelligence', scalingFactor: 2.0,
            },
        ],
        passive: {
            id: 'lucky_star', name: 'Lucky Star', icon: '✨',
            description: '+5% Luck XP per 7-day streak.',
            effect: { type: 'xp_bonus', value: 0.05, skillBonus: 'Luck' },
        },
        ultimate: {
            id: 'big_bang_moo', name: 'Big Bang Moo', icon: '🌌🐮',
            description: 'Creats a new universe of pain for enemies.',
            streakRequired: 15, baseDamage: 80,
            scalingStat: 'Intelligence', scalingFactor: 4.0,
            healPercent: 0.5,
        },
        damageScaling: { stat: 'Strength', factor: 2.0 },
        speedScaling: { stat: 'Cardio', factor: 1.5 },
        dodgeScaling: { stat: 'Flexibility', factor: 1.5 },
        critScaling: { stat: 'Sleep', factor: 1.5 },
        resistScaling: { stat: 'Hygiene', factor: 2.0 },
        spellScaling: { stat: 'Intelligence', factor: 2.0 },
    },

    'pixel_cat': {
        id: 'pixel_cat',
        name: 'Pixel Cat',
        icon: '🐱',
        description: 'A nimble feline with sharp claws.',
        abilities: [
            {
                id: 'lucky_scratch', name: 'Lucky Scratch', icon: '🐾',
                description: 'Quick slash for bonus damage. Scales with Flexibility.',
                cooldown: 3, type: 'damage', baseDamage: 10,
                scalingStat: 'Flexibility', scalingFactor: 1.2,
            },
            {
                id: 'purr_heal', name: 'Purr Heal', icon: '💖',
                description: 'Soothing purr heals 20 HP.',
                cooldown: 5, type: 'heal', healBase: 20, healScaling: 0.5,
                scalingStat: 'Sleep',
            },
        ],
        passive: {
            id: 'nine_lives', name: 'Nine Lives', icon: '🐱',
            description: '+0.5% dodge chance per 7-day streak.',
            effect: { type: 'dodge_bonus', value: 0.005, triggerDays: 7 },
        },
        ultimate: {
            id: 'shadow_pounce', name: 'Shadow Pounce', icon: '🐱‍👤',
            description: 'Vanish and strike from the shadows.',
            streakRequired: 30, baseDamage: 35,
            scalingStat: 'Flexibility', scalingFactor: 2.5,
        },
        damageScaling: { stat: 'Flexibility', factor: 1.2 },
        speedScaling: { stat: 'Cardio', factor: 1.2 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.4 },
        critScaling: { stat: 'Sleep', factor: 0.4 },
        resistScaling: { stat: 'Hygiene', factor: 0.5 },
        spellScaling: { stat: 'Intelligence', factor: 0.5 },
    },

    'pet_dog': {
        id: 'pet_dog',
        name: 'Dog',
        icon: '🐕',
        description: 'A loyal and friendly companion.',
        abilities: [
            {
                id: 'bark', name: 'Bark', icon: '🗣️',
                description: 'Boosts ATK by 10% for 2 turns.',
                cooldown: 4, type: 'buff_atk', buffValue: 10, buffDuration: 2,
            },
            {
                id: 'bite', name: 'Bite', icon: '🦷',
                description: 'Basic bite attack. Scales with Strength.',
                cooldown: 3, type: 'damage', baseDamage: 8,
                scalingStat: 'Strength', scalingFactor: 1.0,
            },
        ],
        passive: {
            id: 'loyal_heart', name: 'Loyal Heart', icon: '❤️',
            description: '+1% damage per 7-day streak.',
            effect: { type: 'damage_per_streak', value: 0.01, triggerDays: 7 },
        },
        ultimate: {
            id: 'fetch', name: 'Fetch', icon: '🎾',
            description: 'Retrieves health pack (Heals 30 HP).',
            streakRequired: 30, baseDamage: 0,
            scalingStat: 'Strength', scalingFactor: 0,
            healPercent: 1.0, // Special case
        },
        damageScaling: { stat: 'Strength', factor: 1.0 },
        speedScaling: { stat: 'Cardio', factor: 1.0 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.2 },
        critScaling: { stat: 'Sleep', factor: 0.2 },
        resistScaling: { stat: 'Hygiene', factor: 0.5 },
        spellScaling: { stat: 'Intelligence', factor: 0.2 },
    },

    'cyber_dog': {
        id: 'cyber_dog',
        name: 'Cyber Dog',
        icon: '🐕',
        description: 'A loyal hound enhanced with cybernetics. Strength-aligned.',
        abilities: [
            {
                id: 'loyal_bark', name: 'Loyal Bark', icon: '🐕',
                description: 'Boosts your ATK by 20% for 3 turns.',
                cooldown: 5, type: 'buff_atk', buffValue: 20, buffDuration: 3,
            },
            {
                id: 'cyber_bite', name: 'Cyber Bite', icon: '⚡',
                description: 'Powerful bite. Scales with Strength.',
                cooldown: 3, type: 'damage', baseDamage: 12,
                scalingStat: 'Strength', scalingFactor: 1.5,
            },
        ],
        passive: {
            id: 'pack_loyalty', name: 'Pack Loyalty', icon: '🐕',
            description: '+1% damage per 7-day streak.',
            effect: { type: 'damage_per_streak', value: 0.01, triggerDays: 7 },
        },
        ultimate: {
            id: 'omega_rush', name: 'Omega Rush', icon: '🐕💥',
            description: 'Full-power charge, deals massive damage.',
            streakRequired: 30, baseDamage: 45,
            scalingStat: 'Strength', scalingFactor: 2.5,
        },
        evolution: {
            evolvedPetId: 'dire_wolf',
            evolvedName: 'Dire Wolf',
            requiredSkill: 'Strength',
            requiredLogs: 30,
            scalingBonus: 0.25,
            newPassiveDescription: '+2% damage per 7-day streak (doubled).',
        },
        damageScaling: { stat: 'Strength', factor: 1.5 },
        speedScaling: { stat: 'Cardio', factor: 1.0 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.2 },
        critScaling: { stat: 'Sleep', factor: 0.3 },
        resistScaling: { stat: 'Hygiene', factor: 0.6 },
        spellScaling: { stat: 'Intelligence', factor: 0.3 },
    },

    'spirit_fox': {
        id: 'spirit_fox',
        name: 'Spirit Fox',
        icon: '🦊',
        description: 'An ethereal fox attuned to agility and evasion.',
        abilities: [
            {
                id: 'spirit_heal', name: 'Spirit Heal', icon: '✨',
                description: 'Heals 25 HP. Scales with Sleep.',
                cooldown: 6, type: 'heal', healBase: 25, healScaling: 0.8,
                scalingStat: 'Sleep',
            },
            {
                id: 'foxfire', name: 'Foxfire', icon: '🔥',
                description: 'Spectral flames. Scales with Intelligence.',
                cooldown: 4, type: 'damage', baseDamage: 10,
                scalingStat: 'Intelligence', scalingFactor: 1.5,
            },
        ],
        passive: {
            id: 'phantom_step', name: 'Phantom Step', icon: '🦊',
            description: '+0.5% dodge chance per 7-day streak.',
            effect: { type: 'dodge_bonus', value: 0.005, triggerDays: 7 },
        },
        ultimate: {
            id: 'spectral_barrage', name: 'Spectral Barrage', icon: '🦊💫',
            description: 'Unleash spectral copies for massive damage.',
            streakRequired: 30, baseDamage: 40,
            scalingStat: 'Flexibility', scalingFactor: 2.5,
            healPercent: 0.2,
        },
        evolution: {
            evolvedPetId: 'phantom_fox',
            evolvedName: 'Phantom Fox',
            requiredSkill: 'Flexibility',
            requiredLogs: 30,
            scalingBonus: 0.25,
            newPassiveDescription: '+1% dodge per 7-day streak + 5% speed.',
        },
        damageScaling: { stat: 'Flexibility', factor: 1.0 },
        speedScaling: { stat: 'Cardio', factor: 1.5 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.5 },
        critScaling: { stat: 'Sleep', factor: 0.4 },
        resistScaling: { stat: 'Hygiene', factor: 0.4 },
        spellScaling: { stat: 'Intelligence', factor: 1.0 },
    },

    'dragon_hatchling': {
        id: 'dragon_hatchling',
        name: 'Dragon Hatchling',
        icon: '🐉',
        description: 'A young dragon with devastating fire attacks.',
        abilities: [
            {
                id: 'flame_breath', name: 'Flame Breath', icon: '🔥',
                description: 'Blasts fire. Scales with Strength.',
                cooldown: 4, type: 'damage', baseDamage: 15,
                scalingStat: 'Strength', scalingFactor: 1.5,
            },
            {
                id: 'dragon_roar', name: 'Dragon Roar', icon: '🗣️',
                description: 'Reduces enemy DEF by 25% for 2 turns.',
                cooldown: 5, type: 'debuff_def', buffValue: 25, buffDuration: 2,
            },
        ],
        passive: {
            id: 'dragon_scales', name: 'Dragon Scales', icon: '🐉',
            description: '+1% crit chance per 7-day streak.',
            effect: { type: 'crit_bonus', value: 0.01, triggerDays: 7 },
        },
        ultimate: {
            id: 'inferno', name: 'Inferno', icon: '🐉🔥',
            description: 'Engulf everything in dragon fire.',
            streakRequired: 30, baseDamage: 55,
            scalingStat: 'Strength', scalingFactor: 3.0,
        },
        damageScaling: { stat: 'Strength', factor: 1.5 },
        speedScaling: { stat: 'Cardio', factor: 0.8 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.2 },
        critScaling: { stat: 'Sleep', factor: 0.5 },
        resistScaling: { stat: 'Hygiene', factor: 0.8 },
        spellScaling: { stat: 'Intelligence', factor: 1.0 },
    },

    'phoenix_chick': {
        id: 'phoenix_chick',
        name: 'Phoenix Chick',
        icon: '🐦‍🔥',
        description: 'A baby phoenix with regenerative powers.',
        abilities: [
            {
                id: 'rebirth_glow', name: 'Rebirth Glow', icon: '🌟',
                description: 'Heals 40 HP. Scales with Sleep.',
                cooldown: 7, type: 'heal', healBase: 40, healScaling: 1.0,
                scalingStat: 'Sleep',
            },
            {
                id: 'flame_wing', name: 'Flame Wing', icon: '🔥',
                description: 'Fiery wing slash. Scales with Cardio.',
                cooldown: 4, type: 'damage', baseDamage: 12,
                scalingStat: 'Cardio', scalingFactor: 1.2,
            },
        ],
        passive: {
            id: 'rebirth_aura', name: 'Rebirth Aura', icon: '🐦‍🔥',
            description: '+0.5% crit chance per 7-day streak.',
            effect: { type: 'crit_bonus', value: 0.005, triggerDays: 7 },
        },
        ultimate: {
            id: 'solar_rebirth', name: 'Solar Rebirth', icon: '☀️',
            description: 'Massive fire blast + heal 30% of damage dealt.',
            streakRequired: 30, baseDamage: 50,
            scalingStat: 'Sleep', scalingFactor: 2.5,
            healPercent: 0.3,
        },
        evolution: {
            evolvedPetId: 'solar_phoenix',
            evolvedName: 'Solar Phoenix',
            requiredSkill: 'Sleep',
            requiredLogs: 30,
            scalingBonus: 0.35,
            newPassiveDescription: '+1% crit per 7-day streak + 10% heal on crit.',
        },
        damageScaling: { stat: 'Cardio', factor: 1.0 },
        speedScaling: { stat: 'Cardio', factor: 1.2 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.3 },
        critScaling: { stat: 'Sleep', factor: 0.5 },
        resistScaling: { stat: 'Hygiene', factor: 0.6 },
        spellScaling: { stat: 'Intelligence', factor: 0.8 },
    },

    'ancient_owl': {
        id: 'ancient_owl',
        name: 'Ancient Owl',
        icon: '🦉',
        description: 'A wise owl channeling arcane knowledge.',
        abilities: [
            {
                id: 'arcane_bolt', name: 'Arcane Bolt', icon: '🔮',
                description: 'Arcane projectile. Scales with Intelligence.',
                cooldown: 3, type: 'damage', baseDamage: 8,
                scalingStat: 'Intelligence', scalingFactor: 2.0,
            },
            {
                id: 'insight', name: 'Insight', icon: '👁️',
                description: 'Reduces enemy DEF by 20% for 2 turns.',
                cooldown: 5, type: 'debuff_def', buffValue: 20, buffDuration: 2,
            },
        ],
        passive: {
            id: 'scholars_eye', name: "Scholar's Eye", icon: '🦉',
            description: '+5% bonus XP when reading is logged.',
            effect: { type: 'xp_bonus', value: 0.05, skillBonus: 'Intelligence' },
        },
        ultimate: {
            id: 'transcendence', name: 'Transcendence', icon: '🦉✨',
            description: 'Channel all knowledge into a devastating blast.',
            streakRequired: 30, baseDamage: 45,
            scalingStat: 'Intelligence', scalingFactor: 3.0,
        },
        evolution: {
            evolvedPetId: 'archmage_owl',
            evolvedName: 'Archmage Owl',
            requiredSkill: 'Intelligence',
            requiredLogs: 30,
            scalingBonus: 0.30,
            newPassiveDescription: '+10% Intelligence XP + spell power doubled.',
        },
        damageScaling: { stat: 'Intelligence', factor: 2.0 },
        speedScaling: { stat: 'Cardio', factor: 0.6 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.2 },
        critScaling: { stat: 'Sleep', factor: 0.3 },
        resistScaling: { stat: 'Hygiene', factor: 0.5 },
        spellScaling: { stat: 'Intelligence', factor: 2.0 },
    },

    'cosmic_turtle': {
        id: 'cosmic_turtle',
        name: 'Cosmic Turtle',
        icon: '🐢',
        description: 'An ancient chelonian with cosmic armor.',
        abilities: [
            {
                id: 'shell_guard', name: 'Shell Guard', icon: '🐢',
                description: 'Reduces incoming damage by 50% for 2 turns.',
                cooldown: 8, type: 'reduce_damage', buffValue: 50, buffDuration: 2,
            },
            {
                id: 'tidal_slam', name: 'Tidal Slam', icon: '🌊',
                description: 'Heavy slam. Scales with Hygiene.',
                cooldown: 4, type: 'damage', baseDamage: 10,
                scalingStat: 'Hygiene', scalingFactor: 1.5,
            },
        ],
        passive: {
            id: 'cosmic_shell', name: 'Cosmic Shell', icon: '🐢',
            description: '+2% resistance per 7-day streak.',
            effect: { type: 'resistance_bonus', value: 0.02, triggerDays: 7 },
        },
        ultimate: {
            id: 'world_shell', name: 'World Shell', icon: '🐢🌍',
            description: 'Become invulnerable and crush enemies.',
            streakRequired: 30, baseDamage: 50,
            scalingStat: 'Hygiene', scalingFactor: 2.5,
        },
        evolution: {
            evolvedPetId: 'fortress_tortoise',
            evolvedName: 'Fortress Tortoise',
            requiredSkill: 'Hygiene',
            requiredLogs: 30,
            scalingBonus: 0.40,
            newPassiveDescription: '+3% resistance per 7-day streak + reflect 10% damage.',
        },
        damageScaling: { stat: 'Hygiene', factor: 1.0 },
        speedScaling: { stat: 'Cardio', factor: 0.4 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.1 },
        critScaling: { stat: 'Sleep', factor: 0.2 },
        resistScaling: { stat: 'Hygiene', factor: 1.5 },
        spellScaling: { stat: 'Intelligence', factor: 0.5 },
    },

    'galaxy_heifer': {
        id: 'galaxy_heifer',
        name: 'Galaxy Heifer',
        icon: '🌌🐮',
        description: 'The evolved form of Cow. Cosmic power.',
        abilities: [
            {
                id: 'cosmic_stampede', name: 'Cosmic Stampede', icon: '🌌',
                description: 'Deals 50 cosmic damage.',
                cooldown: 6, type: 'damage', baseDamage: 25,
                scalingStat: 'Strength', scalingFactor: 2.0,
            },
            {
                id: 'stellar_shield', name: 'Stellar Shield', icon: '✨',
                description: 'Reduces damage by 40% for 2 turns.',
                cooldown: 6, type: 'reduce_damage', buffValue: 40, buffDuration: 2,
            },
        ],
        passive: {
            id: 'cosmic_hide', name: 'Cosmic Hide', icon: '🌌',
            description: '+3% resistance per 7-day streak + 5% damage reduction.',
            effect: { type: 'resistance_bonus', value: 0.03, triggerDays: 7 },
        },
        ultimate: {
            id: 'galactic_charge', name: 'Galactic Charge', icon: '🌌💥',
            description: 'Channel the cosmos into a devastating charge.',
            streakRequired: 30, baseDamage: 60,
            scalingStat: 'Strength', scalingFactor: 3.0,
            healPercent: 0.15,
        },
        damageScaling: { stat: 'Strength', factor: 1.5 },
        speedScaling: { stat: 'Cardio', factor: 1.0 },
        dodgeScaling: { stat: 'Flexibility', factor: 0.25 },
        critScaling: { stat: 'Sleep', factor: 0.4 },
        resistScaling: { stat: 'Hygiene', factor: 1.5 },
        spellScaling: { stat: 'Intelligence', factor: 0.8 },
    },
};

// ── Pet Combat Stat Calculator ─────────────────────────────────
// Call with player skill levels to get realized pet combat stats
export const getPetCombatStats = (
    petId: string,
    skillLevels: Record<string, number>,
    isEvolved: boolean
) => {
    const pet = PET_DATABASE[petId];
    if (!pet) return null;

    const evolutionBonus = isEvolved && pet.evolution ? pet.evolution.scalingBonus : 0;
    const scale = (s: { stat: string; factor: number }) => {
        const level = skillLevels[s.stat] || 1;
        return Math.floor(level * s.factor * (1 + evolutionBonus));
    };

    return {
        physicalDamage: scale(pet.damageScaling),
        speed: scale(pet.speedScaling),
        dodgeChance: Math.min(0.5, 0.02 + (skillLevels[pet.dodgeScaling.stat] || 1) * pet.dodgeScaling.factor * 0.003 * (1 + evolutionBonus)),
        critChance: Math.min(0.5, 0.03 + (skillLevels[pet.critScaling.stat] || 1) * pet.critScaling.factor * 0.004 * (1 + evolutionBonus)),
        resistance: scale(pet.resistScaling),
        spellPower: scale(pet.spellScaling),
    };
};

// ── Store ──────────────────────────────────────────────────────
interface PetState {
    activePet: string;
    name: string;
    health: number;
    hunger: number;
    mood: number;
    energy: number;
    ownedPets: string[];

    // Evolution tracking
    evolvedPets: string[];  // pet IDs that have been evolved

    // Ultimate unlock tracking
    ultimateUnlocked: Record<string, boolean>;

    // Actions
    feed: (amount: number) => void;
    play: (amount: number) => void;
    sleep: () => void;
    tick: () => void;
    setName: (name: string) => void;
    switchPet: (petId: string) => void;
    addPet: (petId: string) => void;
    evolvePet: (petId: string) => void;
    unlockUltimate: (petId: string) => void;
    isEvolved: (petId: string) => boolean;
    hasUltimate: (petId: string) => boolean;
    getActivePetDef: () => PetDefinition | null;
}

export const usePetStore = create<PetState>()(
    persist(
        (set, get) => ({
            activePet: 'pet_cow',
            name: 'Moo',
            health: 100,
            hunger: 80,
            mood: 80,
            energy: 90,
            ownedPets: ['pet_cow'],
            evolvedPets: [],
            ultimateUnlocked: {},

            feed: (amount) => set((state) => ({
                hunger: Math.min(100, state.hunger + amount),
                health: Math.min(100, state.health + 5),
            })),

            play: (amount) => set((state) => ({
                mood: Math.min(100, state.mood + amount),
                energy: Math.max(0, state.energy - 10),
            })),

            sleep: () => set(() => ({ energy: 100 })),

            tick: () => {
                set((state) => ({
                    hunger: Math.max(0, state.hunger - 2),
                    mood: Math.max(0, state.mood - 1),
                    energy: Math.max(0, state.energy - 1),
                    health: state.hunger < 10 ? Math.max(0, state.health - 5) : state.health,
                }));
            },

            setName: (name) => set({ name }),

            switchPet: (petId) => {
                const state = get();
                if (state.ownedPets.includes(petId)) {
                    set({ activePet: petId });
                }
            },

            addPet: (petId) => {
                const state = get();
                if (!state.ownedPets.includes(petId)) {
                    set({ ownedPets: [...state.ownedPets, petId] });
                }
            },

            evolvePet: (petId) => {
                const state = get();
                if (!state.evolvedPets.includes(petId)) {
                    set({ evolvedPets: [...state.evolvedPets, petId] });
                }
            },

            unlockUltimate: (petId) => {
                set((state) => ({
                    ultimateUnlocked: { ...state.ultimateUnlocked, [petId]: true },
                }));
            },

            isEvolved: (petId) => {
                return get().evolvedPets.includes(petId);
            },

            hasUltimate: (petId) => {
                return get().ultimateUnlocked[petId] || false;
            },

            getActivePetDef: () => {
                const { activePet, evolvedPets } = get();
                const pet = PET_DATABASE[activePet];
                if (!pet) return null;

                if (evolvedPets.includes(activePet) && pet.evolution) {
                    return PET_DATABASE[pet.evolution.evolvedPetId] || pet;
                }
                return pet;
            },
        }),
        {
            name: 'gl-pet-storage-v3', // v3 for stat scaling overhaul
        }
    )
);
