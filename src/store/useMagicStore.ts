import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';
import { useCurrencyStore } from './useCurrencyStore';
import { useBookTrophyStore } from './useBookTrophyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// Spell definitions
export interface Spell {
    id: string;
    name: string;
    icon: string;
    description: string;
    goldCost: number;
    mpCost: number;
    flexibilityTier: number; // 1-5: requires Flexibility skill at that tier (getMaxSpellTier)
    intelligenceRequired?: number; // Min Intelligence level to purchase
    booksRequired?: number; // Special unlock from book trophies
    effect: {
        type: 'heal' | 'damage' | 'shield';
        value: number; // % for heal, multiplier for damage, turns for shield
        element?: 'fire' | 'ice' | 'lightning' | 'cosmic' | 'neutral';
    };
}

export const SPELL_DB: Record<string, Spell> = {
    'lesser_heal': {
        id: 'lesser_heal',
        name: 'Lesser Heal',
        icon: '💚',
        description: 'Restore 15% of max HP',
        goldCost: 1500,
        mpCost: 20,
        flexibilityTier: 1,
        intelligenceRequired: 1,
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
