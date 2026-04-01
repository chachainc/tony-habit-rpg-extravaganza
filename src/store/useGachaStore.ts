import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../utils/safeStorage';
import { safeUUID } from '../utils/safeUUID';

console.log('[BOOT] useGachaStore module load started');
import { useFusionStore } from './useFusionStore';
import { usePetStore } from './usePetStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { PET_DATABASE } from '../data/pets';
import type { PetDefinition } from '../data/pets';

export interface GachaPull {
    id: string;
    itemId: string;
    rarity: string;
    wasDuplicate: boolean;
    timestamp: number;
}

interface GachaState {
    tickets: number;
    gachaShards: number; // Currency from duplicates
    pullHistory: GachaPull[];
    pityCounter: number; // Increments each pull, resets on epic/legendary

    // Actions
    addTickets: (count: number) => void;
    useTicket: () => boolean;
    pullGacha: () => { item: PetDefinition; wasDuplicate: boolean; shardsGained: number } | null;
    pullWithTicket: () => { item: PetDefinition; wasDuplicate: boolean; shardsGained: number } | null;
    pull10Gacha: () => { items: PetDefinition[]; totalShards: number } | null;  // 10-pull
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
    uncommon: 15,
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

                const items: PetDefinition[] = [];
                let totalShards = 0;

                for (let i = 0; i < 10; i++) {
                    const result = executePull(get(), set);
                    items.push(result.item);
                    totalShards += result.shardsGained;
                }

                return { items, totalShards };
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
            name: PERSIST_REGISTRY.gacha.persistKey,
            storage: createJSONStorage(() => safeStorage),
            onRehydrateStorage: () => () => {
                console.log('[BOOT] useGachaStore hydration finished');
            }
        }
    )
);

console.log('[BOOT] useGachaStore module load finished');

// ── Backward-compatibility re-exports ────────────────────────────────────────
// Legacy consumers import { PET_DB, PetDef } from '../store/useGachaStore'.
// Re-export from the canonical source so those imports keep working.
export { PET_DATABASE as PET_DB } from '../data/pets';
export type { PetDefinition as PetDef } from '../data/pets';

const getDailySpinPetPool = (): PetDefinition[] => {
    // Collect pets meant for the Gacha / Daily Spin
    return Object.values(PET_DATABASE).filter((pet) => {
        return pet.obtainMethod === 'gacha' || pet.obtainMethod === 'daily_spin';
    });
};

// Helper function to execute gacha pull logic
function executePull(
    state: GachaState,
    set: any
): { item: PetDefinition; wasDuplicate: boolean; shardsGained: number } {
    const rand = Math.random();
    let rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' = 'common';

    // Pity system: guaranteed legendary at 30, epic at 10
    if (state.pityCounter >= LEGENDARY_PITY_THRESHOLD - 1) {
        rarity = 'legendary';
    } else if (state.pityCounter >= EPIC_PITY_THRESHOLD - 1) {
        rarity = 'epic';
    } else {
        // Normal rates
        if (rand > 0.99) rarity = 'mythic'; // 1%
        else if (rand > 0.98) rarity = 'legendary'; // 1%
        else if (rand > 0.90) rarity = 'epic'; // 8%
        else if (rand > 0.60) rarity = 'rare'; // 30%
        // else common: 60%
    }

    // Filter pet pool by rarity
    const basePool = getDailySpinPetPool();
    const pool = basePool.filter((p) => p.rarity === rarity);

    if (pool.length === 0) {
        // Fallback to common
        const commonPool = basePool.filter((p) => p.rarity === 'common');
        rarity = 'common';
        pool.push(...commonPool);
    }

    const item = pool[Math.floor(Math.random() * pool.length)];

    // Check for duplicate in global PetStore instead of local
    const petStore = usePetStore.getState();
    const wasDuplicate = petStore.ownedPets.includes(item.id);
    const shardsGained = wasDuplicate ? DUPLICATE_SHARD_VALUES[item.rarity] : 0;

    // Award pet centrally
    petStore.addPet(item.id);

    // Record pull
    const pull: GachaPull = {
        id: safeUUID(),
        itemId: item.id,
        rarity: item.rarity,
        wasDuplicate,
        timestamp: Date.now(),
    };

    // Update state
    set((s: GachaState) => ({
        pullHistory: [pull, ...s.pullHistory].slice(0, 50), // Keep last 50
        gachaShards: s.gachaShards + shardsGained,
        pityCounter: rarity === 'epic' || rarity === 'legendary' ? 0 : s.pityCounter + 1,
    }));

    // ── Fusion tracking: every copy feeds fusion progress ──────────────────
    useFusionStore.getState().addPetCopy(item.id);

    return { item, wasDuplicate, shardsGained };
}
