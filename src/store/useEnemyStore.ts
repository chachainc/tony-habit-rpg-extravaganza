import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// Element system with rock-paper-scissors advantages
export type Element = 'fire' | 'water' | 'nature' | 'electric' | 'neutral';

export const ELEMENT_ICONS: Record<Element, string> = {
    fire: '🔥',
    water: '💧',
    nature: '🌿',
    electric: '⚡',
    neutral: '✨',
};

// Element advantage multipliers
export const getElementMultiplier = (attacker: Element, defender: Element): number => {
    const advantages: Record<Element, Element> = {
        fire: 'nature',
        water: 'fire',
        nature: 'water',
        electric: 'water',
        neutral: 'neutral', // No advantage
    };
    const disadvantages: Record<Element, Element> = {
        fire: 'water',
        water: 'electric',
        nature: 'fire',
        electric: 'nature',
        neutral: 'neutral', // No disadvantage
    };

    if (advantages[attacker] === defender) return 1.5; // Super effective
    if (disadvantages[attacker] === defender) return 0.5; // Not effective
    return 1.0; // Neutral
};

// Ability types
export type AbilityType = 'attack' | 'skill' | 'ultimate';

export interface Ability {
    id: string;
    name: string;
    type: AbilityType;
    description: string;
    icon: string;
    element: Element;
    isMagic?: boolean; // True if this ability uses MATK vs MDEF logic
    customDamageConfig?: { type: 'heavy' | 'light'; rollValue?: number; }; // Force specific damage values bypassing normal mitigation
    damageMultiplier: number; // Base ATK multiplier
    cooldown: number; // Turns before usable again (0 for attack)
    energyCost: number; // For ultimates (0-100 energy required)
    effects?: {
        heal?: number; // % of max HP
        buff?: { stat: 'atk' | 'def' | 'spd'; amount: number; turns: number };
        debuff?: { stat: 'atk' | 'def' | 'spd'; amount: number; turns: number };
        dot?: { damage: number; turns: number }; // Damage over time
    };
}

export type EnemyRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EnemyDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    image?: string; // Optional boss image path
    element: Element;
    rarity: EnemyRarity;
    floor: number; // Campaign floor (1-50)

    // Combat Stats
    baseHp: number;
    baseAtk: number;
    baseDef: number;
    baseSpd: number;
    critRate: number; // 0.0 - 1.0
    critDmg: number; // 1.5 = 150% crit damage

    // Rewards
    goldReward: number;
    xpReward: number;

    // Requirements to fight
    requiredAtk: number;
    requiredDef: number;
    requiredSkill?: { skill: SkillName; level: number };

    abilities: Ability[];

    // Psychological Profile (Tower Expansion)
    behaviorHint: string;
    personalityTag: string;
    weaknessSkill: SkillName;
    affinitySkill: SkillName;
    thresholdLevel: number;
    openingLine: string;
    isBoss: boolean;

    // What defeating this enemy unlocks
    unlocks: string[];
}

// Default abilities that all combatants have
export const DEFAULT_ABILITIES: Record<string, Ability> = {
    basic_attack: {
        id: 'basic_attack',
        name: 'Basic Attack',
        type: 'attack',
        description: 'A simple attack.',
        icon: '⚔️',
        element: 'neutral',
        damageMultiplier: 1.0,
        cooldown: 0,
        energyCost: 0,
    },
};

// Abstract, symbolic enemies with gacha-style stats
export const ENEMY_DB: Record<string, EnemyDef> = {
    'fatigue_wraith': {
        id: 'fatigue_wraith',
        name: 'Fatigue Wraith',
        description: 'A shadowy manifestation of exhaustion. Drains energy with its haunting presence.',
        icon: '👻',
        element: 'neutral',
        rarity: 'common',
        floor: 1,
        baseHp: 120,
        baseAtk: 25,
        baseDef: 10,
        baseSpd: 60,
        critRate: 0.05,
        critDmg: 1.5,
        goldReward: 15,
        xpReward: 20,
        requiredAtk: 5,
        requiredDef: 3,
        abilities: [
            {
                id: 'drain_touch',
                name: 'Drain Touch',
                type: 'skill',
                description: 'Saps vitality from the target.',
                icon: '🫴',
                element: 'neutral',
                damageMultiplier: 1.2,
                cooldown: 3,
                energyCost: 0,
            },
            {
                id: 'nightmare_wave',
                name: 'Nightmare Wave',
                type: 'ultimate',
                description: 'Unleashes accumulated exhaustion.',
                icon: '💤',
                element: 'neutral',
                damageMultiplier: 2.0,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'spd', amount: 15, turns: 2 } },
            },
        ],
        behaviorHint: 'Focuses on draining your energy. Vulnerable to those who prioritize rest.',
        personalityTag: 'The Exhausted',
        weaknessSkill: 'Sleep',
        affinitySkill: 'Sleep',
        thresholdLevel: 5,
        openingLine: 'The weight of your exhaustion will consume you...',
        isBoss: false,
        unlocks: ['basic_bed', 'lamp', 'rug'],
    },
    'sedentary_colossus': {
        id: 'sedentary_colossus',
        name: 'Sedentary Colossus',
        description: 'A massive stone giant that forms when movement is neglected. Slow but devastating.',
        icon: '🗿',
        element: 'nature',
        rarity: 'rare',
        floor: 3,
        baseHp: 300,
        baseAtk: 35,
        baseDef: 40,
        baseSpd: 30,
        critRate: 0.10,
        critDmg: 1.75,
        goldReward: 25,
        xpReward: 40,
        requiredAtk: 10,
        requiredDef: 8,
        requiredSkill: { skill: 'Cardio', level: 5 },
        abilities: [
            {
                id: 'stone_slam',
                name: 'Stone Slam',
                type: 'skill',
                description: 'Crashes down with tremendous force.',
                icon: '🪨',
                element: 'nature',
                damageMultiplier: 1.5,
                cooldown: 2,
                energyCost: 0,
            },
            {
                id: 'earthquake',
                name: 'Earthquake',
                type: 'ultimate',
                description: 'Shakes the very foundations.',
                icon: '🌋',
                element: 'nature',
                damageMultiplier: 2.5,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 20, turns: 2 } },
            },
        ],
        behaviorHint: 'A massive stone giant that forms when movement is neglected. Slow but devastating.',
        personalityTag: 'The Unmoving',
        weaknessSkill: 'Cardio',
        affinitySkill: 'Strength',
        thresholdLevel: 8,
        openingLine: 'Stagnation is your doom. Become movement itself, or be crushed.',
        isBoss: false,
        unlocks: ['pet_collar', 'pet_vest'],
    },
    'insomnia_echo': {
        id: 'insomnia_echo',
        name: 'Insomnia Echo',
        description: 'A restless spirit that haunts those with disrupted sleep. Its whispers cut deep.',
        icon: '🌙',
        element: 'electric',
        rarity: 'rare',
        floor: 4,
        baseHp: 200,
        baseAtk: 45,
        baseDef: 20,
        baseSpd: 80,
        critRate: 0.15,
        critDmg: 2.0,
        goldReward: 35,
        xpReward: 50,
        requiredAtk: 15,
        requiredDef: 12,
        requiredSkill: { skill: 'Sleep', level: 10 },
        abilities: [
            {
                id: 'static_whisper',
                name: 'Static Whisper',
                type: 'skill',
                description: 'Piercing psychic static.',
                icon: '📡',
                element: 'electric',
                damageMultiplier: 1.3,
                cooldown: 2,
                energyCost: 0,
                effects: { dot: { damage: 10, turns: 2 } },
            },
            {
                id: 'sleepless_surge',
                name: 'Sleepless Surge',
                type: 'ultimate',
                description: 'Channels accumulated restlessness.',
                icon: '⚡',
                element: 'electric',
                damageMultiplier: 2.8,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Fast and restless. Its static can disrupt your focus.',
        personalityTag: 'The Sleepless',
        weaknessSkill: 'Sleep',
        affinitySkill: 'Work',
        thresholdLevel: 12,
        openingLine: 'The night is long, and sleep is far...',
        isBoss: false,
        unlocks: ['fancy_bed', 'mage_robe'],
    },
    'stress_phantom': {
        id: 'stress_phantom',
        name: 'Stress Phantom',
        description: 'An invisible force that weighs on the mind. Burns bright with anxiety.',
        icon: '😰',
        element: 'fire',
        rarity: 'epic',
        floor: 5,
        baseHp: 280,
        baseAtk: 50,
        baseDef: 25,
        baseSpd: 65,
        critRate: 0.12,
        critDmg: 1.8,
        goldReward: 50,
        xpReward: 70,
        requiredAtk: 20,
        requiredDef: 15,
        abilities: [
            {
                id: 'anxiety_flare',
                name: 'Anxiety Flare',
                type: 'skill',
                description: 'Ignites inner worries.',
                icon: '🔥',
                element: 'fire',
                damageMultiplier: 1.4,
                cooldown: 3,
                energyCost: 0,
                effects: { debuff: { stat: 'atk', amount: 10, turns: 2 } },
            },
            {
                id: 'burnout_explosion',
                name: 'Burnout Explosion',
                type: 'ultimate',
                description: 'Complete mental overload.',
                icon: '💥',
                element: 'fire',
                damageMultiplier: 3.0,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'High fire damage and anxiety flares. Stay calm to resist.',
        personalityTag: 'The Anxious',
        weaknessSkill: 'Health',
        affinitySkill: 'Intelligence',
        thresholdLevel: 15,
        openingLine: 'Your worries burn like a thousand suns...',
        isBoss: false,
        unlocks: ['battle_axe', 'iron_plate'],
    },
    'procrastination_specter': {
        id: 'procrastination_specter',
        name: 'Procrastination Specter',
        description: 'A time-bending entity that steals hours. Flows like water between moments.',
        icon: '⏰',
        element: 'water',
        rarity: 'legendary',
        floor: 6,
        baseHp: 350,
        baseAtk: 55,
        baseDef: 35,
        baseSpd: 50,
        critRate: 0.08,
        critDmg: 1.6,
        goldReward: 75,
        xpReward: 100,
        requiredAtk: 25,
        requiredDef: 20,
        requiredSkill: { skill: 'Work', level: 15 },
        abilities: [
            {
                id: 'time_slip',
                name: 'Time Slip',
                type: 'skill',
                description: 'Steals precious moments.',
                icon: '⏳',
                element: 'water',
                damageMultiplier: 1.2,
                cooldown: 2,
                energyCost: 0,
                effects: { buff: { stat: 'spd', amount: 20, turns: 2 } },
            },
            {
                id: 'deadline_doom',
                name: 'Deadline Doom',
                type: 'ultimate',
                description: 'Time runs out.',
                icon: '💀',
                element: 'water',
                damageMultiplier: 3.5,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Slows you down to steal your time. Focus is key.',
        personalityTag: 'The Delayer',
        weaknessSkill: 'Work',
        affinitySkill: 'Social',
        thresholdLevel: 18,
        openingLine: "I'll deal with you... eventually.",
        isBoss: false,
        unlocks: ['ban_hammer', 'bookshelf'],
    },
    'chaos_of_clutter': {
        id: 'chaos_of_clutter',
        name: 'Chaos of Clutter',
        description: 'A swirling vortex of disorganization. Thrives in messy spaces.',
        icon: '🌪️',
        element: 'nature',
        rarity: 'common',
        floor: 2,
        baseHp: 180,
        baseAtk: 30,
        baseDef: 15,
        baseSpd: 70,
        critRate: 0.20,
        critDmg: 1.5,
        goldReward: 20,
        xpReward: 30,
        requiredAtk: 8,
        requiredDef: 5,
        requiredSkill: { skill: 'Sleep', level: 5 },
        abilities: [
            {
                id: 'scatter_strike',
                name: 'Scatter Strike',
                type: 'skill',
                description: 'Debris flies everywhere.',
                icon: '📦',
                element: 'nature',
                damageMultiplier: 1.1,
                cooldown: 2,
                energyCost: 0,
            },
            {
                id: 'tornado_tantrum',
                name: 'Tornado Tantrum',
                type: 'ultimate',
                description: 'Pure organized chaos.',
                icon: '🌀',
                element: 'nature',
                damageMultiplier: 2.2,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 15, turns: 3 } },
            },
        ],
        behaviorHint: 'Thrives on disorganization. Messy habits feed its power.',
        personalityTag: 'The Disorganized',
        weaknessSkill: 'Sleep',
        affinitySkill: 'Luck',
        thresholdLevel: 6,
        openingLine: 'Where did I put that? Oh, right - under your BURIAL MOUND!',
        isBoss: false,
        unlocks: ['desk', 'plant', 'poster'],
    },
    // ========================================
    // CONQUEST ENEMIES (Baseline Templates)
    // These ensure initBattle does not natively abort.
    // ConquestBattle.tsx intercepts and multiplies these stats.
    // ========================================
    'ash_crawler': {
        id: 'ash_crawler', name: 'Ash Crawler', icon: '🦂', element: 'fire',
        description: 'Fast low-defense creature.', rarity: 'common', floor: 1,
        baseHp: 100, baseAtk: 20, baseDef: 10, baseSpd: 70, critRate: 0.1, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Fast and attacks twice in its logic.', personalityTag: 'The Quick', weaknessSkill: 'Cardio', affinitySkill: 'Sleep', thresholdLevel: 5, openingLine: 'SCREEECH!', isBoss: false, unlocks: [],
    },
    'sigil_leech': {
        id: 'sigil_leech', name: 'Sigil Leech', icon: '🩸', element: 'shadow',
        description: 'Steals resources.', rarity: 'rare', floor: 2,
        baseHp: 100, baseAtk: 20, baseDef: 20, baseSpd: 50, critRate: 0.05, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Steals sigils.', personalityTag: 'The Thief', weaknessSkill: 'Strength', affinitySkill: 'Flexibility', thresholdLevel: 5, openingLine: 'Give me your power...', isBoss: false, unlocks: [],
    },
    'iron_husk': {
        id: 'iron_husk', name: 'Iron Husk', icon: '🛡️', element: 'neutral',
        description: 'High defense.', rarity: 'epic', floor: 3,
        baseHp: 120, baseAtk: 15, baseDef: 40, baseSpd: 30, critRate: 0.05, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Very fortified.', personalityTag: 'The Husk', weaknessSkill: 'Intelligence', affinitySkill: 'Hygiene', thresholdLevel: 5, openingLine: '...', isBoss: false, unlocks: [],
    },
    'balloon_goblin': {
        id: 'balloon_goblin', name: 'Balloon Goblin', icon: '🎈', element: 'nature',
        description: 'Drops extra balloons.', rarity: 'common', floor: 4,
        baseHp: 90, baseAtk: 20, baseDef: 10, baseSpd: 60, critRate: 0.05, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Drops balloons.', personalityTag: 'The Hoarder', weaknessSkill: 'Habit', affinitySkill: 'Social', thresholdLevel: 5, openingLine: 'Mine!', isBoss: false, unlocks: [],
    },
    'gem_cultist': {
        id: 'gem_cultist', name: 'Gem Cultist', icon: '💎', element: 'ice',
        description: 'Drops gem.', rarity: 'rare', floor: 5,
        baseHp: 100, baseAtk: 20, baseDef: 10, baseSpd: 50, critRate: 0.05, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Drops gem.', personalityTag: 'The Cultist', weaknessSkill: 'Sleep', affinitySkill: 'Work', thresholdLevel: 5, openingLine: 'We worship the crystal.', isBoss: false, unlocks: [],
    },
    'mirror_shade': {
        id: 'mirror_shade', name: 'Mirror Shade', icon: '🪞', element: 'shadow',
        description: 'Copies Atk.', rarity: 'epic', floor: 6,
        baseHp: 120, baseAtk: 10, baseDef: 10, baseSpd: 60, critRate: 0.05, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Mirrors player.', personalityTag: 'The Reflection', weaknessSkill: 'Intelligence', affinitySkill: 'Strength', thresholdLevel: 5, openingLine: 'I am you...', isBoss: false, unlocks: [],
    },
    'ruin_knight': {
        id: 'ruin_knight', name: 'Ruin Knight', icon: '⚔️', element: 'fire',
        description: 'Atk increases.', rarity: 'legendary', floor: 7,
        baseHp: 150, baseAtk: 25, baseDef: 20, baseSpd: 40, critRate: 0.1, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Atk increases.', personalityTag: 'The Ruined', weaknessSkill: 'Health', affinitySkill: 'Luck', thresholdLevel: 5, openingLine: 'Fall before me.', isBoss: false, unlocks: [],
    },
    'crystal_warden': {
        id: 'crystal_warden', name: 'Crystal Warden', icon: '🔮', element: 'ice',
        description: 'Mini-boss vault guardian.', rarity: 'legendary', floor: 8,
        baseHp: 200, baseAtk: 30, baseDef: 30, baseSpd: 50, critRate: 0.1, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Tough vault guard.', personalityTag: 'The Warden', weaknessSkill: 'Cardio', affinitySkill: 'Strength', thresholdLevel: 5, openingLine: 'The vault is sealed.', isBoss: true, unlocks: [],
    },
    'the_pathkeeper': {
        id: 'the_pathkeeper', name: 'The Pathkeeper', icon: '💀', element: 'shadow',
        description: 'Final boss.', rarity: 'legendary', floor: 9,
        baseHp: 300, baseAtk: 40, baseDef: 40, baseSpd: 50, critRate: 0.1, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Final boss.', personalityTag: 'The Guardian', weaknessSkill: 'Social', affinitySkill: 'Habit', thresholdLevel: 5, openingLine: 'NO ONE ESCAPES THE PATH!', isBoss: true, unlocks: [],
    },
    'the_dreadwyrm': {
        id: 'the_dreadwyrm', name: 'The Dreadwyrm', icon: '🐉', element: 'fire',
        description: 'Dragon boss.', rarity: 'legendary', floor: 10,
        baseHp: 350, baseAtk: 50, baseDef: 35, baseSpd: 45, critRate: 0.15, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Dragon.', personalityTag: 'The Wyrm', weaknessSkill: 'Sleep', affinitySkill: 'Luck', thresholdLevel: 5, openingLine: 'BURN!', isBoss: true, unlocks: [],
    },
    'the_voidweaver': {
        id: 'the_voidweaver', name: 'The Voidweaver', icon: '🕸️', element: 'ice',
        description: 'Void boss.', rarity: 'legendary', floor: 10,
        baseHp: 280, baseAtk: 45, baseDef: 50, baseSpd: 60, critRate: 0.1, critDmg: 1.5,
        requiredAtk: 5, requiredDef: 3, goldReward: 20, xpReward: 20, abilities: [DEFAULT_ABILITIES.basic_attack],
        behaviorHint: 'Void.', personalityTag: 'The Weaver', weaknessSkill: 'Intelligence', affinitySkill: 'Cardio', thresholdLevel: 5, openingLine: 'Return to nothing.', isBoss: true, unlocks: [],
    },
    // ========================================
    // NEW D&D/DIABLO-INSPIRED ENEMIES
    // ========================================
    'hellish_imp': {
        id: 'hellish_imp',
        name: 'Hellish Imp',
        description: 'A fiery little demon that feeds on procrastination. Quick and vicious.',
        icon: '👹',
        element: 'fire',
        rarity: 'rare',
        floor: 7,
        baseHp: 220,
        baseAtk: 48,
        baseDef: 18,
        baseSpd: 90,
        critRate: 0.15,
        critDmg: 1.8,
        goldReward: 40,
        xpReward: 55,
        requiredAtk: 18,
        requiredDef: 12,
        abilities: [
            {
                id: 'hellfire_scratch',
                name: 'Hellfire Scratch',
                type: 'skill',
                description: 'Burning claws rake across.',
                icon: '🔥',
                element: 'fire',
                damageMultiplier: 1.3,
                cooldown: 2,
                energyCost: 0,
                effects: { dot: { damage: 8, turns: 2 } },
            },
            {
                id: 'infernal_burst',
                name: 'Infernal Burst',
                type: 'ultimate',
                description: 'Explodes in hellish fury.',
                icon: '💥',
                element: 'fire',
                damageMultiplier: 2.5,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Quick and vicious. Feeds on procrastination.',
        personalityTag: 'The Nuisance',
        weaknessSkill: 'Work',
        affinitySkill: 'Flexibility',
        thresholdLevel: 10,
        openingLine: 'Burn baby burn! Your productivity is about to crash!',
        isBoss: false,
        unlocks: ['fire_ring', 'demon_mask'],
    },
    'void_stalker': {
        id: 'void_stalker',
        name: 'Void Stalker',
        description: 'A shadowy predator from the spaces between. Drains life force.',
        icon: '🕷️',
        element: 'electric',
        rarity: 'epic',
        floor: 8,
        baseHp: 280,
        baseAtk: 52,
        baseDef: 22,
        baseSpd: 85,
        critRate: 0.18,
        critDmg: 2.0,
        goldReward: 55,
        xpReward: 75,
        requiredAtk: 22,
        requiredDef: 15,
        abilities: [
            {
                id: 'void_lash',
                name: 'Void Lash',
                type: 'skill',
                description: 'Tendrils of darkness strike.',
                icon: '🌑',
                element: 'electric',
                damageMultiplier: 1.4,
                cooldown: 2,
                energyCost: 0,
                effects: { heal: 15 },
            },
            {
                id: 'null_zone',
                name: 'Null Zone',
                type: 'ultimate',
                description: 'Reality tears apart.',
                icon: '⚫',
                element: 'electric',
                damageMultiplier: 2.8,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'atk', amount: 20, turns: 2 } },
            },
        ],
        behaviorHint: 'A shadowy predator from the spaces between. Drains life force.',
        personalityTag: 'The Stalker',
        weaknessSkill: 'Hygiene',
        affinitySkill: 'Intelligence',
        thresholdLevel: 12,
        openingLine: "The void has eyes... and it's hungry.",
        isBoss: false,
        unlocks: ['shadow_cloak', 'void_amulet'],
    },
    'bone_golem': {
        id: 'bone_golem',
        name: 'Bone Golem',
        description: 'A towering construct of ancient bones. Incredibly tough.',
        icon: '💀',
        element: 'nature',
        rarity: 'epic',
        floor: 9,
        baseHp: 400,
        baseAtk: 45,
        baseDef: 45,
        baseSpd: 40,
        critRate: 0.08,
        critDmg: 1.6,
        goldReward: 65,
        xpReward: 85,
        requiredAtk: 25,
        requiredDef: 18,
        abilities: [
            {
                id: 'bone_crush',
                name: 'Bone Crush',
                type: 'skill',
                description: 'Massive skeletal fists pound down.',
                icon: '🦴',
                element: 'nature',
                damageMultiplier: 1.6,
                cooldown: 3,
                energyCost: 0,
            },
            {
                id: 'skeletal_storm',
                name: 'Skeletal Storm',
                type: 'ultimate',
                description: 'Bones fly in all directions.',
                icon: '💀',
                element: 'nature',
                damageMultiplier: 2.5,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 25, turns: 2 } },
            },
        ],
        behaviorHint: 'Incredibly tough skeletal construct. Avoid brute force.',
        personalityTag: 'The Construct',
        weaknessSkill: 'Strength',
        affinitySkill: 'Cardio',
        thresholdLevel: 15,
        openingLine: 'RATTLE. CRUSH. REPEAT.',
        isBoss: false,
        unlocks: ['bone_staff', 'skull_helm'],
    },
    // ========================================
    // FLOORS 11-19: MID-TIER ENEMIES
    // ========================================
    'gluttony_maw': {
        id: 'gluttony_maw',
        name: 'Gluttony Maw',
        description: 'A grotesque, ever-hungry maw that consumes discipline. Heals itself as it devours.',
        icon: '🫦',
        element: 'fire',
        rarity: 'rare',
        floor: 11,
        baseHp: 500,
        baseAtk: 55,
        baseDef: 30,
        baseSpd: 45,
        critRate: 0.10,
        critDmg: 1.7,
        goldReward: 80,
        xpReward: 130,
        requiredAtk: 32,
        requiredDef: 24,
        abilities: [
            {
                id: 'devour',
                name: 'Devour',
                type: 'skill',
                description: 'Bites and absorbs life force.',
                icon: '🍖',
                element: 'fire',
                damageMultiplier: 1.4,
                cooldown: 2,
                energyCost: 0,
                effects: { heal: 25 },
            },
            {
                id: 'gorge_burst',
                name: 'Gorge Burst',
                type: 'ultimate',
                description: 'Overgorges and explodes with stolen energy.',
                icon: '💥',
                element: 'fire',
                damageMultiplier: 3.0,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 20, turns: 2 } },
            },
        ],
        behaviorHint: 'Consumes discipline to heal itself. Focus on high burst damage.',
        personalityTag: 'The Ravenous',
        weaknessSkill: 'Health',
        affinitySkill: 'Hygiene',
        thresholdLevel: 14,
        openingLine: "I'll eat your habits and your hope!",
        isBoss: false,
        unlocks: ['glutton_ring', 'feast_plate'],
    },
    'apathy_shade': {
        id: 'apathy_shade',
        name: 'Apathy Shade',
        description: 'A colorless wraith that drains motivation. The longer the fight, the weaker you become.',
        icon: '🌫️',
        element: 'water',
        rarity: 'epic',
        floor: 13,
        baseHp: 450,
        baseAtk: 60,
        baseDef: 35,
        baseSpd: 55,
        critRate: 0.12,
        critDmg: 1.8,
        goldReward: 90,
        xpReward: 160,
        requiredAtk: 36,
        requiredDef: 26,
        requiredSkill: { skill: 'Work', level: 18 },
        abilities: [
            {
                id: 'drain_will',
                name: 'Drain Will',
                type: 'skill',
                description: 'Saps the will to fight.',
                icon: '💤',
                element: 'water',
                damageMultiplier: 1.2,
                cooldown: 2,
                energyCost: 0,
                effects: { debuff: { stat: 'atk', amount: 15, turns: 3 } },
            },
            {
                id: 'hollow_tide',
                name: 'Hollow Tide',
                type: 'ultimate',
                description: 'A wave of nothingness crashes over you.',
                icon: '🌊',
                element: 'water',
                damageMultiplier: 3.2,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Drains motivation. The longer the fight, the weaker you become.',
        personalityTag: 'The Indifferent',
        weaknessSkill: 'Intelligence',
        affinitySkill: 'Social',
        thresholdLevel: 18,
        openingLine: 'Why bother? Nothing matters in the end.',
        isBoss: false,
        unlocks: ['motivation_charm', 'apathy_ward'],
    },
    'doubt_crawler': {
        id: 'doubt_crawler',
        name: 'Doubt Crawler',
        description: 'A skittering insectoid that whispers self-doubt. Attacks from unexpected angles.',
        icon: '🦂',
        element: 'electric',
        rarity: 'epic',
        floor: 15,
        baseHp: 520,
        baseAtk: 65,
        baseDef: 28,
        baseSpd: 95,
        critRate: 0.20,
        critDmg: 2.0,
        goldReward: 100,
        xpReward: 190,
        requiredAtk: 40,
        requiredDef: 28,
        abilities: [
            {
                id: 'whisper_sting',
                name: 'Whisper Sting',
                type: 'skill',
                description: 'Strikes with venomous doubt.',
                icon: '🗡️',
                element: 'electric',
                damageMultiplier: 1.5,
                cooldown: 2,
                energyCost: 0,
                effects: { dot: { damage: 15, turns: 3 } },
            },
            {
                id: 'swarm_of_insecurities',
                name: 'Swarm of Insecurities',
                type: 'ultimate',
                description: 'Unleashes a swarm of crawling doubts.',
                icon: '🐛',
                element: 'electric',
                damageMultiplier: 3.5,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'spd', amount: 25, turns: 2 } },
            },
        ],
        behaviorHint: 'Attacks from unexpected angles with whispers of doubt. High crit rate.',
        personalityTag: 'The Skeptic',
        weaknessSkill: 'Habit',
        affinitySkill: 'Luck',
        thresholdLevel: 16,
        openingLine: "Are you sure you can win this? I'm not.",
        isBoss: false,
        unlocks: ['confidence_amulet', 'crawler_fang'],
    },
    'vanity_mirror': {
        id: 'vanity_mirror',
        name: 'Vanity Mirror',
        description: 'A sentient mirror that reflects your worst self. Copies your own power against you.',
        icon: '🪞',
        element: 'neutral',
        rarity: 'legendary',
        floor: 17,
        baseHp: 600,
        baseAtk: 70,
        baseDef: 40,
        baseSpd: 60,
        critRate: 0.15,
        critDmg: 1.9,
        goldReward: 110,
        xpReward: 230,
        requiredAtk: 45,
        requiredDef: 32,
        requiredSkill: { skill: 'Flexibility', level: 15 },
        abilities: [
            {
                id: 'reflection_strike',
                name: 'Reflection Strike',
                type: 'skill',
                description: 'Turns your own strength against you.',
                icon: '✨',
                element: 'neutral',
                damageMultiplier: 1.6,
                cooldown: 3,
                energyCost: 0,
                effects: { buff: { stat: 'atk', amount: 20, turns: 2 } },
            },
            {
                id: 'shatter_ego',
                name: 'Shatter Ego',
                type: 'ultimate',
                description: 'The mirror shatters, releasing devastating shards.',
                icon: '💎',
                element: 'neutral',
                damageMultiplier: 3.8,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 30, turns: 3 } },
            },
        ],
        behaviorHint: 'Copies your power. Reflects your worst self. Use your weaknesses against it.',
        personalityTag: 'The Vain',
        weaknessSkill: 'Flexibility',
        affinitySkill: 'Luck',
        thresholdLevel: 20,
        openingLine: "Mirror, mirror, on the wall... who's the fattest of them all?",
        isBoss: false,
        unlocks: ['mirror_shield', 'ego_blade'],
    },
    // ========================================
    // FLOORS 21-29: HIGH-TIER ENEMIES
    // ========================================
    'rage_berserker': {
        id: 'rage_berserker',
        name: 'Rage Berserker',
        description: 'A hulking figure consumed by uncontrollable fury. Gets stronger as it takes damage.',
        icon: '🤬',
        element: 'fire',
        rarity: 'epic',
        floor: 21,
        baseHp: 800,
        baseAtk: 85,
        baseDef: 30,
        baseSpd: 70,
        critRate: 0.22,
        critDmg: 2.2,
        goldReward: 130,
        xpReward: 330,
        requiredAtk: 55,
        requiredDef: 38,
        requiredSkill: { skill: 'Strength', level: 22 },
        abilities: [
            {
                id: 'berserker_charge',
                name: 'Berserker Charge',
                type: 'skill',
                description: 'Charges with reckless fury.',
                icon: '💢',
                element: 'fire',
                damageMultiplier: 1.8,
                cooldown: 2,
                energyCost: 0,
                effects: { buff: { stat: 'atk', amount: 25, turns: 3 } },
            },
            {
                id: 'wrath_unleashed',
                name: 'Wrath Unleashed',
                type: 'ultimate',
                description: 'Pure, unrestrained fury.',
                icon: '🔥',
                element: 'fire',
                damageMultiplier: 4.5,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Hulking figure consumed by fury. Gets stronger as it takes damage.',
        personalityTag: 'The Furious',
        weaknessSkill: 'Intelligence',
        affinitySkill: 'Strength',
        thresholdLevel: 22,
        openingLine: 'RAAAAAAGGGGEE!!!!',
        isBoss: false,
        unlocks: ['berserker_gauntlet', 'fury_helm'],
    },
    'sloth_leviathan': {
        id: 'sloth_leviathan',
        name: 'Sloth Leviathan',
        description: 'An ancient, massive sea creature that embodies ultimate laziness. Absorbs enormous damage.',
        icon: '🐋',
        element: 'water',
        rarity: 'legendary',
        floor: 25,
        baseHp: 1200,
        baseAtk: 75,
        baseDef: 60,
        baseSpd: 20,
        critRate: 0.06,
        critDmg: 1.5,
        goldReward: 150,
        xpReward: 450,
        requiredAtk: 62,
        requiredDef: 42,
        requiredSkill: { skill: 'Cardio', level: 20 },
        abilities: [
            {
                id: 'tidal_crush',
                name: 'Tidal Crush',
                type: 'skill',
                description: 'A massive wave of pressure.',
                icon: '🌊',
                element: 'water',
                damageMultiplier: 2.0,
                cooldown: 3,
                energyCost: 0,
                effects: { debuff: { stat: 'spd', amount: 30, turns: 2 } },
            },
            {
                id: 'abyssal_maw',
                name: 'Abyssal Maw',
                type: 'ultimate',
                description: 'Opens wide, swallowing everything.',
                icon: '🕳️',
                element: 'water',
                damageMultiplier: 4.0,
                cooldown: 0,
                energyCost: 100,
                effects: { heal: 30 },
            },
        ],
        behaviorHint: 'Embodiment of ultimate laziness. Absorbs enormous damage.',
        personalityTag: 'The Unbothered',
        weaknessSkill: 'Cardio',
        affinitySkill: 'Sleep',
        thresholdLevel: 20,
        openingLine: '*Yawns* Is it over yet?',
        isBoss: false,
        unlocks: ['leviathan_scale', 'abyssal_trident'],
    },
    // ========================================
    // FLOOR 31+: ENDGAME ENEMIES
    // ========================================
    'despair_lich': {
        id: 'despair_lich',
        name: 'Despair Lich',
        description: 'An ancient undead sorcerer who feeds on broken hopes. Casts devastating curse magic.',
        icon: '☠️',
        element: 'electric',
        rarity: 'legendary',
        floor: 31,
        baseHp: 1100,
        baseAtk: 110,
        baseDef: 45,
        baseSpd: 75,
        critRate: 0.18,
        critDmg: 2.3,
        goldReward: 180,
        xpReward: 500,
        requiredAtk: 75,
        requiredDef: 48,
        requiredSkill: { skill: 'Intelligence', level: 20 },
        abilities: [
            {
                id: 'curse_bolt',
                name: 'Curse Bolt',
                type: 'skill',
                description: 'A bolt of necrotic energy.',
                icon: '💀',
                element: 'electric',
                damageMultiplier: 1.7,
                cooldown: 2,
                energyCost: 0,
                effects: { dot: { damage: 20, turns: 3 } },
            },
            {
                id: 'doom_harvest',
                name: 'Doom Harvest',
                type: 'ultimate',
                description: 'Reaps all remaining hope.',
                icon: '⚡',
                element: 'electric',
                damageMultiplier: 5.0,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'atk', amount: 35, turns: 3 } },
            },
        ],
        behaviorHint: 'Ancient undead sorcerer that casts devastating necrotic curses.',
        personalityTag: 'The Hopeless',
        weaknessSkill: 'Social',
        affinitySkill: 'Intelligence',
        thresholdLevel: 25,
        openingLine: 'All hope ends here. Welcome to its grave.',
        isBoss: false,
        unlocks: ['lich_crown', 'necrotic_staff', 'despair_cloak'],
    },
    // ========================================
    // FLOOR 10 BOSS - SHADOW TITAN
    // ========================================
    'shadow_titan': {
        id: 'shadow_titan',
        name: '⚔️ SHADOW TITAN',
        description: 'A colossal nightmare forged from pure darkness. FLOOR 10 BOSS!',
        icon: '👤',
        image: '/assets/bosses/shadow_titan.png',
        element: 'neutral',
        rarity: 'legendary',
        floor: 10,
        baseHp: 800,
        baseAtk: 70,
        baseDef: 40,
        baseSpd: 55,
        critRate: 0.12,
        critDmg: 2.0,
        goldReward: 150,  // 3x normal legendary rewards
        xpReward: 300,    // 3x normal legendary rewards
        requiredAtk: 30,
        requiredDef: 22,
        requiredSkill: { skill: 'Strength', level: 10 },
        abilities: [
            {
                id: 'titan_slam',
                name: 'Titan Slam',
                type: 'skill',
                description: 'The ground shakes with each blow.',
                icon: '🌋',
                element: 'neutral',
                damageMultiplier: 1.8,
                cooldown: 2,
                energyCost: 0,
                effects: { debuff: { stat: 'spd', amount: 20, turns: 2 } },
            },
            {
                id: 'shadow_nova',
                name: 'Shadow Nova',
                type: 'ultimate',
                description: 'Darkness explodes outward.',
                icon: '🌑',
                element: 'neutral',
                damageMultiplier: 3.5,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'def', amount: 30, turns: 2 } },
            },
        ],
        behaviorHint: 'The ultimate test of your journey. No clear weakness exists.',
        personalityTag: 'Dread Lord',
        weaknessSkill: 'Strength',
        affinitySkill: 'Intelligence',
        thresholdLevel: 15,
        openingLine: 'BEHOLD THE END OF YOUR PROGRESS!',
        isBoss: true,
        unlocks: ['titan_blade', 'shadow_plate', 'boss_trophy_1'],
    },
    // ========================================
    // FLOOR 20 BOSS - GENERAL INERTIA
    // ========================================
    'general_inertia': {
        id: 'general_inertia',
        name: '⚔️ GENERAL INERTIA',
        description: 'A massive, rusted iron golem that represents the difficulty of starting a new routine. He is slow but hits like a truck. "Inertia is the only constant..."',
        icon: '🗿',
        image: '/assets/bosses/general_inertia.png',
        element: 'nature',
        rarity: 'legendary',
        floor: 20,
        baseHp: 1500,
        baseAtk: 95,
        baseDef: 65,
        baseSpd: 25,
        critRate: 0.08,
        critDmg: 2.5,
        goldReward: 200,
        xpReward: 600,
        requiredAtk: 50,
        requiredDef: 35,
        requiredSkill: { skill: 'Strength', level: 20 },
        abilities: [
            {
                id: 'weight_of_procrastination',
                name: 'Weight of Procrastination',
                type: 'skill',
                description: 'Every turn you delay, he grows stronger.',
                icon: '⏳',
                element: 'nature',
                damageMultiplier: 2.0,
                cooldown: 2,
                energyCost: 0,
                effects: { buff: { stat: 'atk', amount: 15, turns: 3 } },
            },
            {
                id: 'crushing_routine',
                name: 'Crushing Routine',
                type: 'ultimate',
                description: 'The weight of inaction becomes unbearable.',
                icon: '💀',
                element: 'nature',
                damageMultiplier: 4.0,
                cooldown: 0,
                energyCost: 100,
                effects: { debuff: { stat: 'spd', amount: 40, turns: 3 } },
            },
        ],
        behaviorHint: 'Represents the difficulty of starting a new routine. Hits like a truck.',
        personalityTag: 'The Immovable',
        weaknessSkill: 'Habit',
        affinitySkill: 'Strength',
        thresholdLevel: 20,
        openingLine: 'Inertia is the only constant. You shall not pass.',
        isBoss: true,
        unlocks: ['inertia_armor', 'willpower_ring', 'boss_trophy_2'],
    },
    // ========================================
    // FLOOR 30 BOSS - FLICKER OF BURNOUT
    // ========================================
    'flicker_of_burnout': {
        id: 'flicker_of_burnout',
        name: '⚔️ FLICKER OF BURNOUT',
        description: 'A chaotic fire elemental that represents pushing too hard without rest. Burns bright but consumes all. "Rest is not weakness..."',
        icon: '🔥',
        image: '/assets/bosses/flicker_burnout.png',
        element: 'fire',
        rarity: 'legendary',
        floor: 30,
        baseHp: 2000,
        baseAtk: 120,
        baseDef: 40,
        baseSpd: 100,
        critRate: 0.25,
        critDmg: 2.2,
        goldReward: 250,
        xpReward: 900,
        requiredAtk: 70,
        requiredDef: 45,
        requiredSkill: { skill: 'Sleep', level: 25 },
        abilities: [
            {
                id: 'overheat',
                name: 'Overheat',
                type: 'skill',
                description: 'Absorbs energy from aggressive attacks.',
                icon: '🌡️',
                element: 'fire',
                damageMultiplier: 1.5,
                cooldown: 1,
                energyCost: 0,
                effects: { dot: { damage: 25, turns: 3 } },
            },
            {
                id: 'supernova_collapse',
                name: 'Supernova Collapse',
                type: 'ultimate',
                description: 'Complete combustion of everything.',
                icon: '💥',
                element: 'fire',
                damageMultiplier: 5.0,
                cooldown: 0,
                energyCost: 100,
            },
        ],
        behaviorHint: 'Represents pushing too hard without rest. Burns bright but consumes all.',
        personalityTag: 'The Burned',
        weaknessSkill: 'Sleep',
        affinitySkill: 'Flexibility',
        thresholdLevel: 25,
        openingLine: 'Rest is for the weak! Burn with me!',
        isBoss: true,
        unlocks: ['phoenix_feather', 'burnout_shield', 'boss_trophy_3'],
    },
    // ========================================
    // RARE ENCOUNTER - GOLDEN SLIME
    // ========================================
    'golden_slime': {
        id: 'golden_slime',
        name: '✨ Golden Slime',
        description: 'A rare treasure slime! High defense but low HP. Catch it before it escapes! Drops massive gold.',
        icon: '🟡',
        element: 'neutral',
        rarity: 'legendary',
        floor: 0,  // Special encounter, spawns randomly
        baseHp: 100,
        baseAtk: 10,
        baseDef: 80,
        baseSpd: 120,
        critRate: 0,
        critDmg: 1.0,
        goldReward: 250,  // Massive gold drop
        xpReward: 50,
        requiredAtk: 0,
        requiredDef: 0,
        abilities: [
            {
                id: 'flee',
                name: 'Flee',
                type: 'skill',
                description: 'Attempts to escape the battle.',
                icon: '💨',
                element: 'neutral',
                damageMultiplier: 0,
                cooldown: 0,
                energyCost: 0,
            },
        ],
        behaviorHint: 'High defense but low HP. Catch it before it escapes!',
        personalityTag: 'The Treasure',
        weaknessSkill: 'Luck',
        affinitySkill: 'Flexibility',
        thresholdLevel: 1,
        openingLine: '*Jingle jingle*',
        isBoss: false,
        unlocks: ['golden_crown'],
    },
    // ========================================
    // CONQUEST ENEMIES
    // ========================================
    'ash_crawler': { id: 'ash_crawler', name: 'Ash Crawler', description: 'Fast low-defense creature.', icon: '🦂', element: 'fire', rarity: 'common', floor: 1, baseHp: 80, baseAtk: 15, baseDef: 5, baseSpd: 70, critRate: 0.05, critDmg: 1.5, goldReward: 10, xpReward: 10, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'sigil_leech': { id: 'sigil_leech', name: 'Sigil Leech', description: 'Steals one random resource.', icon: '🩸', element: 'water', rarity: 'common', floor: 1, baseHp: 90, baseAtk: 12, baseDef: 8, baseSpd: 60, critRate: 0.05, critDmg: 1.5, goldReward: 10, xpReward: 10, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'iron_husk': { id: 'iron_husk', name: 'Iron Husk', description: 'High defense but low attack.', icon: '🛡️', element: 'neutral', rarity: 'common', floor: 1, baseHp: 120, baseAtk: 10, baseDef: 20, baseSpd: 30, critRate: 0.05, critDmg: 1.5, goldReward: 10, xpReward: 10, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'balloon_goblin': { id: 'balloon_goblin', name: 'Balloon Goblin', description: 'Fast attacker.', icon: '🎈', element: 'nature', rarity: 'rare', floor: 1, baseHp: 85, baseAtk: 18, baseDef: 6, baseSpd: 80, critRate: 0.1, critDmg: 1.5, goldReward: 15, xpReward: 15, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'gem_cultist': { id: 'gem_cultist', name: 'Gem Cultist', description: 'Balanced enemy.', icon: '💎', element: 'electric', rarity: 'rare', floor: 1, baseHp: 100, baseAtk: 15, baseDef: 10, baseSpd: 50, critRate: 0.05, critDmg: 1.5, goldReward: 20, xpReward: 20, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'mirror_shade': { id: 'mirror_shade', name: 'Mirror Shade', description: 'Copies player ATK.', icon: '🪞', element: 'neutral', rarity: 'epic', floor: 1, baseHp: 110, baseAtk: 20, baseDef: 10, baseSpd: 60, critRate: 0.1, critDmg: 1.5, goldReward: 25, xpReward: 25, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'ruin_knight': { id: 'ruin_knight', name: 'Ruin Knight', description: 'Late-run heavy enemy.', icon: '⚔️', element: 'fire', rarity: 'epic', floor: 1, baseHp: 150, baseAtk: 22, baseDef: 15, baseSpd: 40, critRate: 0.05, critDmg: 1.5, goldReward: 30, xpReward: 30, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: '', isBoss: false, unlocks: [] },
    'crystal_warden': { id: 'crystal_warden', name: 'Crystal Warden', description: 'Mini-boss enemy.', icon: '🔮', element: 'electric', rarity: 'legendary', floor: 1, baseHp: 200, baseAtk: 25, baseDef: 20, baseSpd: 55, critRate: 0.15, critDmg: 1.8, goldReward: 50, xpReward: 50, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: 'You shall not pass.', isBoss: true, unlocks: [] },
    'the_pathkeeper': { id: 'the_pathkeeper', name: 'The Pathkeeper', description: 'A massive guardian of the Conquest path.', icon: '💀', element: 'neutral', rarity: 'legendary', floor: 1, baseHp: 300, baseAtk: 30, baseDef: 25, baseSpd: 50, critRate: 0.1, critDmg: 2.0, goldReward: 100, xpReward: 100, requiredAtk: 0, requiredDef: 0, abilities: [], behaviorHint: '', personalityTag: '', weaknessSkill: 'Health', affinitySkill: 'Health', thresholdLevel: 1, openingLine: 'Your journey ends here.', isBoss: true, unlocks: [] },
};

interface EnemyState {
    defeatedEnemies: string[];
    defeatCounts: Record<string, number>;  // Track how many times each enemy defeated
    loreUnlocked: Record<string, boolean>; // True when defeated 10+ times
    encounteredEnemies: string[];          // All enemies ever fought

    markDefeated: (enemyId: string) => void;
    hasDefeated: (enemyId: string) => boolean;
    canFight: (enemyId: string, playerAtk: number, playerDef: number, skills: Record<SkillName, { level: number }>) => {
        canFight: boolean;
        missingRequirements: string[]
    };
    getUnlockedItems: () => string[];
    markEncountered: (enemyId: string) => void;
    getDefeatCount: (enemyId: string) => number;
    isLoreUnlocked: (enemyId: string) => boolean;
    isStatsRevealed: (enemyId: string) => boolean;  // True at 5+ defeats
    getBestiaryBonus: (enemyId: string) => number;  // +2% per mastered entry
    getTotalBestiaryBonus: () => number;
}

export const useEnemyStore = create<EnemyState>()(
    persist(
        (set, get) => ({
            defeatedEnemies: [],
            defeatCounts: {},
            loreUnlocked: {},
            encounteredEnemies: [],

            markDefeated: (enemyId) => {
                set((state) => {
                    const newCounts = { ...state.defeatCounts };
                    newCounts[enemyId] = (newCounts[enemyId] || 0) + 1;

                    const newLoreUnlocked = { ...state.loreUnlocked };
                    if (newCounts[enemyId] >= 10) {
                        newLoreUnlocked[enemyId] = true;
                    }

                    return {
                        defeatedEnemies: state.defeatedEnemies.includes(enemyId)
                            ? state.defeatedEnemies
                            : [...state.defeatedEnemies, enemyId],
                        defeatCounts: newCounts,
                        loreUnlocked: newLoreUnlocked,
                    };
                });
            },

            hasDefeated: (enemyId) => {
                return get().defeatedEnemies.includes(enemyId);
            },

            markEncountered: (enemyId) => {
                set((state) => ({
                    encounteredEnemies: state.encounteredEnemies.includes(enemyId)
                        ? state.encounteredEnemies
                        : [...state.encounteredEnemies, enemyId],
                }));
            },

            getDefeatCount: (enemyId) => {
                return get().defeatCounts[enemyId] || 0;
            },

            isLoreUnlocked: (enemyId) => {
                return get().defeatCounts[enemyId] >= 10;
            },

            isStatsRevealed: (enemyId) => {
                return get().defeatCounts[enemyId] >= 5;
            },

            getBestiaryBonus: (enemyId) => {
                // +2% damage bonus if lore is unlocked
                return get().isLoreUnlocked(enemyId) ? 0.02 : 0;
            },

            getTotalBestiaryBonus: () => {
                const { loreUnlocked } = get();
                return Object.values(loreUnlocked).filter(Boolean).length * 0.02;
            },

            canFight: (enemyId, playerAtk, playerDef, skills) => {
                const enemy = ENEMY_DB[enemyId];
                if (!enemy) {
                    return { canFight: false, missingRequirements: ['Enemy not found'] };
                }

                const missing: string[] = [];

                if (playerAtk < enemy.requiredAtk) {
                    missing.push(`ATK ${enemy.requiredAtk} (have ${playerAtk})`);
                }

                if (playerDef < enemy.requiredDef) {
                    missing.push(`DEF ${enemy.requiredDef} (have ${playerDef})`);
                }

                if (enemy.requiredSkill) {
                    const skill = skills[enemy.requiredSkill.skill];
                    if (!skill || skill.level < enemy.requiredSkill.level) {
                        missing.push(`${enemy.requiredSkill.skill} Lv ${enemy.requiredSkill.level}`);
                    }
                }

                return {
                    canFight: missing.length === 0,
                    missingRequirements: missing,
                };
            },

            getUnlockedItems: () => {
                const { defeatedEnemies } = get();
                const unlocked: string[] = [];

                defeatedEnemies.forEach((enemyId) => {
                    const enemy = ENEMY_DB[enemyId];
                    if (enemy) {
                        unlocked.push(...enemy.unlocks);
                    }
                });

                return [...new Set(unlocked)];
            },
        }),
        {
            name: PERSIST_REGISTRY.enemies.persistKey, // Bump version for bestiary tracking
        }
    )
);

