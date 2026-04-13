import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';
import { useCurrencyStore } from './useCurrencyStore';
import { useBookTrophyStore } from './useBookTrophyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import type { AffinityType } from './useAffinitySystem';

import frostboltImg from '../assets/magic/ice/frostbolt.jpg';
import glacialPrisonImg from '../assets/magic/ice/glacial_prison.jpg';
import absoluteZeroImg from '../assets/magic/ice/absolute_zero.jpg';

// Spell definitions
export interface Spell {
    id: string;
    name: string;
    icon: string;
    image?: string; // New image support for spells
    description: string;
    goldCost: number;
    mpCost: number;
    flexibilityTier: number; // 1-5: requires Flexibility skill at that tier (getMaxSpellTier)
    intelligenceRequired?: number; // Min Intelligence level to purchase
    booksRequired?: number; // Special unlock from book trophies
    /** Which store section this spell belongs to */
    tier?: 'novice' | 'apprentice' | 'adept' | 'master' | 'old';
    /** Flat base damage (used by new-tier spells). Damage = baseDamage * (1 + Intelligence * 0.03) */
    baseDamage?: number;
    /** Turns this spell is on cooldown after being cast (0 = no cooldown) */
    cooldownTurns?: number;
    effect: {
        type: 'heal' | 'damage' | 'shield' | 'buff';
        value: number; // % for heal, multiplier for damage (old spells), baseDamage for new spells, turns for shield
        element?: 'fire' | 'ice' | 'lightning' | 'cosmic' | 'neutral';
        dot?: { damage: number; turns: number };
    };
    affinity?: AffinityType;
}

export const SPELL_DB: Record<string, Spell> = {
    // ══════════════════════════════════════════════
    // NOVICE SPELLS
    // ══════════════════════════════════════════════
    'spark': {
        id: 'spark',
        name: 'Spark',
        icon: '✨',
        description: 'A quick burst of arcane energy.',
        goldCost: 150,
        mpCost: 3,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 3,
        cooldownTurns: 0,
        effect: { type: 'damage', value: 3, element: 'neutral' },
    },
    'stone_flick': {
        id: 'stone_flick',
        name: 'Stone Flick',
        icon: '🪨',
        description: 'Hurl a sharp stone at the enemy.',
        goldCost: 250,
        mpCost: 4,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 5,
        cooldownTurns: 0,
        effect: { type: 'damage', value: 5, element: 'neutral' },
    },
    'poison_needle': {
        id: 'poison_needle',
        name: 'Poison Needle',
        icon: '🧪',
        description: 'Deals 4 damage and applies poison (2 damage for 2 turns)',
        goldCost: 350,
        mpCost: 4,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 4,
        cooldownTurns: 1,
        effect: { type: 'damage', value: 4, element: 'neutral', dot: { damage: 2, turns: 2 } },
    },
    'coin_toss': {
        id: 'coin_toss',
        name: 'Coin Toss',
        icon: '🪙',
        description: 'Flick a coin. Low damage, but a small chance to grant bonus gold post-battle.',
        goldCost: 200,
        mpCost: 3,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 2,
        cooldownTurns: 1,
        effect: { type: 'damage', value: 2, element: 'neutral' },
        affinity: 'economy'
    },
    'lucky_charm': {
        id: 'lucky_charm',
        name: 'Lucky Charm',
        icon: '🍀',
        description: 'A temporary blessing increasing crit and jackpot chances slightly.',
        goldCost: 300,
        mpCost: 5,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 0,
        cooldownTurns: 2,
        effect: { type: 'buff', value: 3, element: 'neutral' },
        affinity: 'luck'
    },
    'ember_spark': {
        id: 'ember_spark',
        name: 'Ember Spark',
        icon: '🔥',
        description: 'A tiny ember that sparks small flames and applies a light burn.',
        goldCost: 400,
        mpCost: 5,
        flexibilityTier: 1,
        tier: 'novice',
        baseDamage: 6,
        cooldownTurns: 0,
        effect: { type: 'damage', value: 6, element: 'fire', dot: { damage: 2, turns: 2 } },
        affinity: 'fire'
    },


    // ══════════════════════════════════════════════
    // APPRENTICE SPELLS
    // ══════════════════════════════════════════════
    'firebolt': {
        id: 'firebolt',
        name: 'Firebolt',
        icon: '🔥',
        description: 'A bolt of roaring flame that applies a medium burn. Spreads burn on kill if Fire Synergy is active.',
        goldCost: 600,
        mpCost: 6,
        flexibilityTier: 1,
        intelligenceRequired: 3,
        tier: 'apprentice',
        baseDamage: 10,
        cooldownTurns: 2,
        effect: { type: 'damage', value: 10, element: 'fire', dot: { damage: 4, turns: 2 } },
        affinity: 'fire'
    },
    'ice_shard': {
        id: 'ice_shard',
        name: 'Ice Shard',
        icon: '❄️',
        description: 'A shard of freezing ice.',
        goldCost: 750,
        mpCost: 6,
        flexibilityTier: 1,
        intelligenceRequired: 3,
        tier: 'apprentice',
        baseDamage: 8,
        cooldownTurns: 2,
        effect: { type: 'damage', value: 8, element: 'ice' },
        affinity: 'ice'
    },
    'shadow_dart': {
        id: 'shadow_dart',
        name: 'Shadow Dart',
        icon: '🌑',
        description: 'A dart from the shadows.',
        goldCost: 900,
        mpCost: 7,
        flexibilityTier: 1,
        intelligenceRequired: 4,
        tier: 'apprentice',
        baseDamage: 9,
        cooldownTurns: 2,
        effect: { type: 'damage', value: 9, element: 'neutral' },
        affinity: 'shadow'
    },
    'firebolt': {
        id: 'firebolt',
        name: 'Firebolt',
        icon: '☄️',
        description: 'A bolt of concentrated fire magic.',
        goldCost: 1500,
        mpCost: 8,
        flexibilityTier: 1,
        intelligenceRequired: 4,
        tier: 'apprentice',
        baseDamage: 14,
        cooldownTurns: 1,
        effect: { type: 'damage', value: 14, element: 'fire' },
        affinity: 'fire'
    },
    'soul_drain': {
        id: 'soul_drain',
        name: 'Soul Drain',
        icon: '👻',
        description: 'Steals life from the enemy. Bonus heal when under 30% HP.',
        goldCost: 1200,
        mpCost: 8,
        flexibilityTier: 1,
        intelligenceRequired: 5,
        tier: 'apprentice',
        baseDamage: 8,
        cooldownTurns: 3,
        effect: { type: 'heal', value: 8, element: 'neutral' },
        affinity: 'shadow'
    },

    // ══════════════════════════════════════════════
    // ADEPT SPELLS
    // ══════════════════════════════════════════════
    'lightning_strike': {
        id: 'lightning_strike',
        name: 'Lightning Strike',
        icon: '⚡',
        description: 'Call down a bolt from the sky.',
        goldCost: 1500,
        mpCost: 10,
        flexibilityTier: 2,
        intelligenceRequired: 6,
        tier: 'adept',
        baseDamage: 20,
        cooldownTurns: 3,
        effect: { type: 'damage', value: 20, element: 'lightning' },
    },
    'soul_burn': {
        id: 'soul_burn',
        name: 'Soul Burn',
        icon: '💀',
        description: 'Scorches the enemy from within.',
        goldCost: 2200,
        mpCost: 10,
        flexibilityTier: 2,
        intelligenceRequired: 7,
        tier: 'adept',
        baseDamage: 16,
        cooldownTurns: 3,
        effect: { type: 'damage', value: 16, element: 'neutral' },
    },
    'inferno_surge': {
        id: 'inferno_surge',
        name: 'Inferno Surge',
        icon: '🌋',
        description: 'A surge of explosive volcanic energy that applies a devastating burn.',
        goldCost: 3500,
        mpCost: 15,
        flexibilityTier: 3,
        intelligenceRequired: 8,
        tier: 'adept',
        baseDamage: 28,
        cooldownTurns: 3,
        effect: { type: 'damage', value: 28, element: 'fire', dot: { damage: 8, turns: 2 } },
        affinity: 'fire'
    },
    'arcane_spear': {
        id: 'arcane_spear',
        name: 'Arcane Spear',
        icon: '🔮',
        description: 'A piercing lance of pure arcane energy.',
        goldCost: 3000,
        mpCost: 14,
        flexibilityTier: 3,
        intelligenceRequired: 9,
        tier: 'adept',
        baseDamage: 25,
        cooldownTurns: 3,
        effect: { type: 'damage', value: 25, element: 'neutral' },
    },

    // ══════════════════════════════════════════════
    // MASTER SPELLS
    // ══════════════════════════════════════════════
    'meteor_fragment': {
        id: 'meteor_fragment',
        name: 'Meteor Fragment',
        icon: '☄️',
        description: 'Drop a shard of a celestial body.',
        goldCost: 5000,
        mpCost: 20,
        flexibilityTier: 3,
        intelligenceRequired: 12,
        tier: 'master',
        baseDamage: 40,
        cooldownTurns: 5,
        effect: { type: 'damage', value: 40, element: 'fire' },
    },
    'void_lance': {
        id: 'void_lance',
        name: 'Void Lance',
        icon: '🕳️',
        description: 'Pierce reality itself.',
        goldCost: 7000,
        mpCost: 22,
        flexibilityTier: 4,
        intelligenceRequired: 15,
        tier: 'master',
        baseDamage: 50,
        cooldownTurns: 5,
        effect: { type: 'damage', value: 50, element: 'neutral' },
    },
    'storm_collapse': {
        id: 'storm_collapse',
        name: 'Storm Collapse',
        icon: '🌩️',
        description: 'Collapse the storm on a single target.',
        goldCost: 9000,
        mpCost: 30,
        flexibilityTier: 4,
        intelligenceRequired: 18,
        tier: 'master',
        baseDamage: 65,
        cooldownTurns: 6,
        effect: { type: 'damage', value: 65, element: 'lightning' },
    },
    'frostbolt': {
        id: 'frostbolt',
        name: 'Frostbolt',
        icon: '❄️',
        image: frostboltImg,
        description: 'Deal light damage and apply Chill (2 turns).',
        goldCost: 800,
        mpCost: 5,
        flexibilityTier: 1,
        intelligenceRequired: 3,
        tier: 'apprentice',
        baseDamage: 12,
        cooldownTurns: 1,
        effect: { type: 'damage', value: 12, element: 'ice' },
        affinity: 'ice'
    },
    'glacial_prison': {
        id: 'glacial_prison',
        name: 'Glacial Prison',
        icon: '🧊',
        image: glacialPrisonImg,
        description: 'Deal moderate damage and Freeze target for 1 turn. Freezes for 2 turns if already Chilled.',
        goldCost: 2500,
        mpCost: 15,
        flexibilityTier: 2,
        intelligenceRequired: 7,
        tier: 'adept',
        baseDamage: 22,
        cooldownTurns: 3,
        effect: { type: 'damage', value: 22, element: 'ice' },
        affinity: 'ice'
    },
    'absolute_zero': {
        id: 'absolute_zero',
        name: 'Absolute Zero',
        icon: '🥶',
        image: absoluteZeroImg,
        description: 'Freeze ALL enemies for 1 turn and deal 15% max HP damage. Triggers shatter logic.',
        goldCost: 10000,
        mpCost: 40,
        flexibilityTier: 5,
        intelligenceRequired: 15,
        tier: 'master',
        baseDamage: 10,
        cooldownTurns: 6,
        effect: { type: 'damage', value: 10, element: 'ice' },
        affinity: 'ice'
    },

    // ══════════════════════════════════════════════
    // OLD SPELLS (legacy — fully backward compatible)
    // ══════════════════════════════════════════════
    'lesser_heal': {
        id: 'lesser_heal',
        name: 'Lesser Heal',
        icon: '💚',
        description: 'Restore 15% of max HP',
        goldCost: 1500,
        mpCost: 20,
        flexibilityTier: 1,
        intelligenceRequired: 1,
        tier: 'old',
        effect: { type: 'heal', value: 15 }
    },
    'fireball': {
        id: 'fireball',
        name: 'Fireball',
        icon: '🔥',
        description: 'Deal 2.0x Magic Attack damage',
        goldCost: 3500,
        mpCost: 30,
        flexibilityTier: 2,
        intelligenceRequired: 5,
        tier: 'old',
        effect: { type: 'damage', value: 2.0, element: 'fire' }
    },
    'mana_shield': {
        id: 'mana_shield',
        name: 'Mana Shield',
        icon: '🛡️✨',
        description: 'Absorb damage with MP for 2 turns (2 MP = 1 HP)',
        goldCost: 5000,
        mpCost: 50,
        flexibilityTier: 2,
        intelligenceRequired: 8,
        tier: 'old',
        effect: { type: 'shield', value: 2 }
    },
    'frost_bolt': {
        id: 'frost_bolt',
        name: 'Frost Bolt',
        icon: '❄️',
        description: 'Deal 1.5x Magic Attack damage + slow enemy',
        goldCost: 2500,
        mpCost: 25,
        flexibilityTier: 1,
        intelligenceRequired: 3,
        tier: 'old',
        effect: { type: 'damage', value: 1.5, element: 'ice' }
    },
    'thunder_strike': {
        id: 'thunder_strike',
        name: 'Thunder Strike',
        icon: '⚡',
        description: 'Deal 2.5x Magic Attack damage',
        goldCost: 7500,
        mpCost: 40,
        flexibilityTier: 4,
        intelligenceRequired: 10,
        tier: 'old',
        effect: { type: 'damage', value: 2.5, element: 'lightning' }
    },
    'greater_heal': {
        id: 'greater_heal',
        name: 'Greater Heal',
        icon: '💖',
        description: 'Restore 35% of max HP',
        goldCost: 6500,
        mpCost: 45,
        flexibilityTier: 3,
        intelligenceRequired: 7,
        tier: 'old',
        effect: { type: 'heal', value: 35 }
    },
    'astral_fire': {
        id: 'astral_fire',
        name: 'Astral Fire',
        icon: '🌌🔥',
        description: 'Unleash cosmic flames for 3.5x Magic Attack damage',
        goldCost: 25000,
        mpCost: 60,
        flexibilityTier: 5,
        booksRequired: 50,
        tier: 'old',
        effect: { type: 'damage', value: 3.5, element: 'cosmic' }
    },
    'ice_wall': {
        id: 'ice_wall',
        name: 'Ice Wall',
        icon: '🧊',
        description: 'Erect a wall of ice that absorbs damage for 3 turns',
        goldCost: 4000,
        mpCost: 35,
        flexibilityTier: 3,
        intelligenceRequired: 6,
        tier: 'old',
        effect: { type: 'shield', value: 3, element: 'ice' }
    },
    'chain_lightning': {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        icon: '⚡⚡',
        description: 'Lightning arcs for 2.0x Magic Attack damage',
        goldCost: 8000,
        mpCost: 45,
        flexibilityTier: 4,
        intelligenceRequired: 12,
        tier: 'old',
        effect: { type: 'damage', value: 2.0, element: 'lightning' }
    },
    'healing_surge': {
        id: 'healing_surge',
        name: 'Healing Surge',
        icon: '💗',
        description: 'A powerful surge of life that restores 50% of max HP',
        goldCost: 12000,
        mpCost: 55,
        flexibilityTier: 5,
        intelligenceRequired: 14,
        tier: 'old',
        effect: { type: 'heal', value: 50 }
    },
    'inferno': {
        id: 'inferno',
        name: 'Inferno',
        icon: '🌋',
        description: 'Engulf the battlefield in flames for 3.0x Magic Attack damage',
        goldCost: 15000,
        mpCost: 50,
        flexibilityTier: 4,
        intelligenceRequired: 16,
        tier: 'old',
        effect: { type: 'damage', value: 3.0, element: 'fire' }
    },
    'arcane_missile': {
        id: 'arcane_missile',
        name: 'Arcane Missile',
        icon: '💫',
        description: 'Pure arcane energy strikes for 1.8x Magic Attack damage',
        goldCost: 2200,
        mpCost: 22,
        flexibilityTier: 1,
        intelligenceRequired: 4,
        tier: 'old',
        effect: { type: 'damage', value: 1.8, element: 'neutral' }
    },
    'cosmic_nova': {
        id: 'cosmic_nova',
        name: 'Cosmic Nova',
        icon: '🌠',
        description: 'Channel the power of the cosmos for 5.0x Magic Attack damage',
        goldCost: 50000,
        mpCost: 80,
        flexibilityTier: 5,
        booksRequired: 100,
        tier: 'old',
        effect: { type: 'damage', value: 5.0, element: 'cosmic' }
    },
    'void_blast': {
        id: 'void_blast',
        name: 'Void Blast',
        icon: '🕳️',
        description: 'Tear a hole in reality for 2.2x Magic Attack damage',
        goldCost: 5500,
        mpCost: 35,
        flexibilityTier: 3,
        intelligenceRequired: 6,
        tier: 'old',
        effect: { type: 'damage', value: 2.2, element: 'neutral' }
    },
    'rejuvenation': {
        id: 'rejuvenation',
        name: 'Rejuvenation',
        icon: '🌿',
        description: 'Nature restores 25% of max HP over time',
        goldCost: 4500,
        mpCost: 30,
        flexibilityTier: 3,
        intelligenceRequired: 5,
        tier: 'old',
        effect: { type: 'heal', value: 25 }
    },
    'blizzard': {
        id: 'blizzard',
        name: 'Blizzard',
        icon: '🌨️',
        description: 'A raging blizzard for 2.8x Magic Attack damage',
        goldCost: 11000,
        mpCost: 50,
        flexibilityTier: 4,
        intelligenceRequired: 11,
        tier: 'old',
        effect: { type: 'damage', value: 2.8, element: 'ice' }
    },
    'divine_light': {
        id: 'divine_light',
        name: 'Divine Light',
        icon: '🌟',
        description: 'Radiant light restores 70% of max HP',
        goldCost: 35000,
        mpCost: 70,
        flexibilityTier: 5,
        intelligenceRequired: 18,
        tier: 'old',
        effect: { type: 'heal', value: 70 }
    },
    'temporal_rift': {
        id: 'temporal_rift',
        name: 'Temporal Rift',
        icon: '⏳✨',
        description: 'Bend time itself for 4.0x Magic Attack damage',
        goldCost: 40000,
        mpCost: 65,
        flexibilityTier: 5,
        booksRequired: 75,
        tier: 'old',
        effect: { type: 'damage', value: 4.0, element: 'cosmic' }
    },
};

interface MagicState {
    ownedSpells: string[];  // Spell IDs

    // Actions
    buySpell: (spellId: string) => boolean;
    hasSpell: (spellId: string) => boolean;
    getOwnedSpells: () => Spell[];
    canAffordSpell: (spellId: string) => boolean;
    isSpellUnlocked: (spellId: string) => boolean; // Check if spell requirements are met
    getSpellLockReason: (spellId: string) => string | null; // Get reason why spell is locked
    
    equippedSpell: string | null;
    equipSpell: (spellId: string | null) => void;
}

export const useMagicStore = create<MagicState>()(
    persist(
        (set, get) => ({
            ownedSpells: [],

            buySpell: (spellId: string) => {
                const spell = SPELL_DB[spellId];
                if (!spell) return false;

                const { ownedSpells, isSpellUnlocked } = get();
                if (ownedSpells.includes(spellId)) return false; // Already owned
                if (!isSpellUnlocked(spellId)) return false; // Requirements not met

                const currencyStore = useCurrencyStore.getState();
                if (currencyStore.gold < spell.goldCost) return false; // Can't afford

                // Deduct gold and add spell
                currencyStore.spendGold(spell.goldCost);
                set({ ownedSpells: [...ownedSpells, spellId] });
                return true;
            },

            hasSpell: (spellId: string) => {
                return get().ownedSpells.includes(spellId);
            },

            getOwnedSpells: () => {
                return get().ownedSpells.map(id => SPELL_DB[id]).filter(Boolean);
            },

            canAffordSpell: (spellId: string) => {
                const spell = SPELL_DB[spellId];
                if (!spell) return false;
                return useCurrencyStore.getState().gold >= spell.goldCost;
            },

            isSpellUnlocked: (spellId: string) => {
                const spell = SPELL_DB[spellId];
                if (!spell) return false;

                const gameStore = useGameStore.getState();
                const intelligenceLevel = gameStore.skills['Intelligence']?.level || 1;

                // Check Intelligence requirement
                if (spell.intelligenceRequired && intelligenceLevel < spell.intelligenceRequired) {
                    return false;
                }

                // Check books requirement (from trophy store)
                if (spell.booksRequired) {
                    const booksRead = useBookTrophyStore.getState().totalBooksRead;
                    if (booksRead < spell.booksRequired) {
                        return false;
                    }
                }

                // Check Flexibility tier requirement
                if (spell.flexibilityTier) {
                    const maxTier = gameStore.getMaxSpellTier();
                    if (spell.flexibilityTier > maxTier) {
                        return false;
                    }
                }

                return true;
            },

            getSpellLockReason: (spellId: string) => {
                const spell = SPELL_DB[spellId];
                if (!spell) return null;

                const gameStore = useGameStore.getState();
                const intelligenceLevel = gameStore.skills['Intelligence']?.level || 1;
                const bookTrophyCount = useBookTrophyStore.getState().totalBooksRead;

                if (spell.intelligenceRequired && intelligenceLevel < spell.intelligenceRequired) {
                    return `Requires Intelligence Lv. ${spell.intelligenceRequired}`;
                }

                if (spell.flexibilityTier && gameStore.skills['Flexibility'].level < spell.flexibilityTier * 5) {
                    return `Requires Flexibility Lv. ${spell.flexibilityTier * 5}`;
                }

                if (spell.booksRequired && bookTrophyCount < spell.booksRequired) {
                    return `Requires ${spell.booksRequired} Books Read`;
                }

                return null;
            },

            equippedSpell: null,
            equipSpell: (spellId: string | null) => {
                set({ equippedSpell: spellId });
            }
        }),
        {
            name: PERSIST_REGISTRY.magic.persistKey,
        }
    )
);
