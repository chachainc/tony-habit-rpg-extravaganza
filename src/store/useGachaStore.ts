import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useFusionStore } from './useFusionStore';

export interface GachaPull {
    id: string;
    itemId: string;
    rarity: string;
    wasDuplicate: boolean;
    timestamp: number;
}

export interface PetDef {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    passiveBonus: {
        type: 'xp_gain' | 'gold_gain' | 'attack' | 'defense' | 'skill_xp';
        value: number; // Multiplier: 0.05 = +5%
        skillName?: string; // For skill-specific bonuses
    };
    description: string;
}

// Pet collection for gacha rewards
export const PET_DB: Record<string, PetDef> = {
    'pixel_cat': {
        id: 'pixel_cat',
        name: 'Pixel Cat',
        icon: '🐱',
        rarity: 'common',
        passiveBonus: { type: 'xp_gain', value: 0.02 },
        description: 'A digital feline friend. +2% XP gain.',
    },
    'cyber_dog': {
        id: 'cyber_dog',
        name: 'Cyber Dog',
        icon: '🐕',
        rarity: 'common',
        passiveBonus: { type: 'gold_gain', value: 0.03 },
        description: 'Loyal companion. +3% gold from all sources.',
    },
    'spirit_fox': {
        id: 'spirit_fox',
        name: 'Spirit Fox',
        icon: '🦊',
        rarity: 'rare',
        passiveBonus: { type: 'xp_gain', value: 0.05 },
        description: 'Mystical guide. +5% XP gain.',
    },
    'dragon_hatchling': {
        id: 'dragon_hatchling',
        name: 'Dragon Hatchling',
        icon: '🐲',
        rarity: 'epic',
        passiveBonus: { type: 'attack', value: 3 },
        description: 'Young dragon. +3 Attack.',
    },
    'phoenix_chick': {
        id: 'phoenix_chick',
        name: 'Phoenix Chick',
        icon: '🐦‍🔥',
        rarity: 'epic',
        passiveBonus: { type: 'defense', value: 3 },
        description: 'Reborn from ashes. +3 Defense.',
    },
    'ancient_owl': {
        id: 'ancient_owl',
        name: 'Ancient Owl',
        icon: '🦉',
        rarity: 'legendary',
        passiveBonus: { type: 'xp_gain', value: 0.10 },
        description: 'Keeper of wisdom. +10% XP gain.',
    },
    'cosmic_turtle': {
        id: 'cosmic_turtle',
        name: 'Cosmic Turtle',
        icon: '🐢',
        rarity: 'legendary',
        passiveBonus: { type: 'skill_xp', value: 0.08, skillName: 'Sleep' },
        description: 'Time flows differently. +8% Sleep XP.',
    },
    // MYTHIC TIER - Ultra Rare (1 in 100,000 luck roll only)
    'galaxy_heifer': {
        id: 'galaxy_heifer',
        name: 'Galaxy-Eyed Heifer',
        icon: '🐄',  // Celestial cow
        rarity: 'mythic' as const,
        passiveBonus: {
            type: 'skill_xp' as const,
            value: 0.25,  // +25% XP
            skillName: 'Housemaid'  // Primary bonus to Housemaid (also affects Strength via game logic)
        },
        description: '🌌 ULTRA RARE! Stellar Grazing: +25% Housemaid & Strength XP. The cosmos favors you.',
    },
};

interface GachaState {
    tickets: number;
    gachaShards: number; // Currency from duplicates
    pullHistory: GachaPull[];
    ownedPets: string[]; // Pet IDs owned
    activePet: string | null; // Currently active pet for passive bonus
    pityCounter: number; // Increments each pull, resets on epic/legendary

    // Actions
    addTickets: (count: number) => void;
    useTicket: () => boolean;
    pullGacha: () => { item: any; wasDuplicate: boolean; shardsGained: number } | null;
    pullWithTicket: () => { item: any; wasDuplicate: boolean; shardsGained: number } | null;
    pull10Gacha: () => { items: any[]; totalShards: number } | null;  // 10-pull
    setActivePet: (petId: string | null) => void;
    getActivePetBonus: () => PetDef['passiveBonus'] | null;
    getPityInfo: () => {
        current: number;
        epicGuaranteed: number;
        legendaryGuaranteed: number;
    };
}

const EPIC_PITY_THRESHOLD = 10;      // Guaranteed epic after 10 pulls
const LEGENDARY_PITY_THRESHOLD = 30; // Guaranteed legendary after 30 pulls
const DUPLICATE_SHARD_VALUES: Record<string, number> = {
    common: 10,
    rare: 25,
    epic: 50,
    legendary: 100,
    mythic: 250,
};

export const useGachaStore = create<GachaState>()(
    persist(
        (set, get) => ({
            tickets: 0,
            gachaShards: 0,
            pullHistory: [],
            ownedPets: [],
            activePet: null,
            pityCounter: 0,

            addTickets: (count) =>
                set((state) => ({
                    tickets: state.tickets + count,
                })),

            useTicket: () => {
                const state = get();
                if (state.tickets <= 0) return false;
                set({ tickets: state.tickets - 1 });
                return true;
            },

            pullGacha: () => {
                const state = get();
                return executePull(state, set);
            },

            pullWithTicket: () => {
                const state = get();
                if (state.tickets <= 0) return null;

                set((s) => ({ tickets: s.tickets - 1 }));
                return executePull(state, set);
            },

            pull10Gacha: () => {
                const state = get();
                if (state.tickets < 10) return null;

                set((s) => ({ tickets: s.tickets - 10 }));

                const items: any[] = [];
                let totalShards = 0;

                for (let i = 0; i < 10; i++) {
                    const result = executePull(get(), set);
                    items.push(result.item);
                    totalShards += result.shardsGained;
                }

                return { items, totalShards };
            },

            setActivePet: (petId) => {
                set({ activePet: petId });
            },

            getActivePetBonus: () => {
                const { activePet } = get();
                if (!activePet || !PET_DB[activePet]) return null;
                return PET_DB[activePet].passiveBonus;
            },

            getPityInfo: () => {
                const { pityCounter } = get();
                return {
                    current: pityCounter,
                    epicGuaranteed: Math.max(0, EPIC_PITY_THRESHOLD - pityCounter),
                    legendaryGuaranteed: Math.max(0, LEGENDARY_PITY_THRESHOLD - pityCounter),
                };
            },
        }),
        {
            name: 'gl-gacha-v1',
        }
    )
);

// Helper function to execute gacha pull logic
function executePull(
    state: GachaState,
    set: any
): { item: PetDef; wasDuplicate: boolean; shardsGained: number } {
    const rand = Math.random();
    let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';

    // Pity system: guaranteed legendary at 30, epic at 10
    if (state.pityCounter >= LEGENDARY_PITY_THRESHOLD - 1) {
        rarity = 'legendary';
    } else if (state.pityCounter >= EPIC_PITY_THRESHOLD - 1) {
        rarity = 'epic';
    } else {
        // Normal rates
        if (rand > 0.98) rarity = 'legendary'; // 2%
        else if (rand > 0.90) rarity = 'epic'; // 8%
        else if (rand > 0.60) rarity = 'rare'; // 30%
        // else common: 60%
    }

    // Filter pet pool by rarity
    const pool = Object.values(PET_DB).filter((p) => p.rarity === rarity);
    if (pool.length === 0) {
        // Fallback to common
        const commonPool = Object.values(PET_DB).filter((p) => p.rarity === 'common');
        rarity = 'common';
        pool.push(...commonPool);
    }

    const item = pool[Math.floor(Math.random() * pool.length)];

    // Check for duplicate
    const wasDuplicate = state.ownedPets.includes(item.id);
    const shardsGained = wasDuplicate ? DUPLICATE_SHARD_VALUES[item.rarity] : 0;

    // Record pull
    const pull: GachaPull = {
        id: crypto.randomUUID(),
        itemId: item.id,
        rarity: item.rarity,
        wasDuplicate,
        timestamp: Date.now(),
    };

    // Update state
    set((s: GachaState) => ({
        pullHistory: [pull, ...s.pullHistory].slice(0, 50), // Keep last 50
        ownedPets: wasDuplicate ? s.ownedPets : [...s.ownedPets, item.id],
        gachaShards: s.gachaShards + shardsGained,
        pityCounter: rarity === 'epic' || rarity === 'legendary' ? 0 : s.pityCounter + 1,
    }));

    // ── Fusion tracking: every copy feeds fusion progress ──────────────────
    useFusionStore.getState().addPetCopy(item.id);

    return { item, wasDuplicate, shardsGained };
}
