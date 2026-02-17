import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';

// ===================================
// FACTION REPUTATION SYSTEM
// ===================================

export type FactionId = 'iron_guild' | 'scholars_archive' | 'vitality_order';
export type FactionTier = 'Recruit' | 'Veteran' | 'Champion' | 'Legend';

export interface Faction {
    id: FactionId;
    name: string;
    icon: string;
    description: string;
    associatedSkills: SkillName[];
    affiliatedStores: string[];
    tierNames: [string, string, string, string]; // Custom tier names per faction
}

export const FACTION_DATABASE: Record<FactionId, Faction> = {
    iron_guild: {
        id: 'iron_guild',
        name: 'Iron Guild',
        icon: '⚔️',
        description: 'Warriors and athletes who forge their bodies through discipline.',
        associatedSkills: ['Strength', 'Cardio', 'Flexibility'],
        affiliatedStores: ['armor', 'weapon'],
        tierNames: ['Recruit', 'Veteran', 'Champion', 'Legend'],
    },
    scholars_archive: {
        id: 'scholars_archive',
        name: "Scholar's Archive",
        icon: '📚',
        description: 'Seekers of knowledge who sharpen the mind above all.',
        associatedSkills: ['Intelligence', 'Work', 'Habit Building'],
        affiliatedStores: ['spell', 'tome'],
        tierNames: ['Initiate', 'Adept', 'Master', 'Archmage'],
    },
    vitality_order: {
        id: 'vitality_order',
        name: 'Vitality Order',
        icon: '🌿',
        description: 'Healers and caretakers who nurture body and home.',
        associatedSkills: ['Sleep', 'Hygiene', 'Health', 'Housemaid', 'Clothing'],
        affiliatedStores: ['hospital', 'furniture', 'pet'],
        tierNames: ['Novice', 'Healer', 'Guardian', 'Sage'],
    },
};

// Reputation tier thresholds
export const REP_THRESHOLDS = [0, 100, 500, 2000, 10000] as const;
export const TIER_INDICES = [0, 1, 2, 3] as const; // 0=base, 1=tier2, 2=tier3, 3=tier4

// Which tier does a given rep amount correspond to?
export function getRepTier(rep: number): number {
    if (rep >= REP_THRESHOLDS[4]) return 3;
    if (rep >= REP_THRESHOLDS[3]) return 2;
    if (rep >= REP_THRESHOLDS[2]) return 1;
    if (rep >= REP_THRESHOLDS[1]) return 0;
    return -1; // Below first tier
}

// Map each skill to its faction
export const SKILL_TO_FACTION: Partial<Record<SkillName, FactionId>> = {
    Strength: 'iron_guild',
    Cardio: 'iron_guild',
    Flexibility: 'iron_guild',
    Intelligence: 'scholars_archive',
    Work: 'scholars_archive',
    'Habit Building': 'scholars_archive',
    Sleep: 'vitality_order',
    Hygiene: 'vitality_order',
    Health: 'vitality_order',
    Housemaid: 'vitality_order',
    Clothing: 'vitality_order',
};

interface FactionState {
    reputation: Record<FactionId, number>;

    // Actions
    addReputation: (factionId: FactionId, amount: number) => void;
    addReputationFromSkill: (skillName: SkillName, amount?: number) => void;
    getReputation: (factionId: FactionId) => number;
    getTier: (factionId: FactionId) => number;
    getTierName: (factionId: FactionId) => string;
    getNextTierProgress: (factionId: FactionId) => { current: number; needed: number; percent: number };
    getShopDiscount: (storeId: string) => number;
}

export const useFactionStore = create<FactionState>()(
    persist(
        (set, get) => ({
            reputation: {
                iron_guild: 0,
                scholars_archive: 0,
                vitality_order: 0,
            },

            addReputation: (factionId, amount) => {
                set((state) => ({
                    reputation: {
                        ...state.reputation,
                        [factionId]: state.reputation[factionId] + amount,
                    },
                }));
            },

            addReputationFromSkill: (skillName, amount = 1) => {
                const factionId = SKILL_TO_FACTION[skillName];
                if (!factionId) return;
                get().addReputation(factionId, amount);
            },

            getReputation: (factionId) => get().reputation[factionId],

            getTier: (factionId) => {
                const rep = get().reputation[factionId];
                return getRepTier(rep);
            },

            getTierName: (factionId) => {
                const tier = get().getTier(factionId);
                const faction = FACTION_DATABASE[factionId];
                if (tier < 0) return 'Unranked';
                return faction.tierNames[tier];
            },

            getNextTierProgress: (factionId) => {
                const rep = get().reputation[factionId];
                const currentTier = getRepTier(rep);

                if (currentTier >= 3) {
                    return { current: rep, needed: REP_THRESHOLDS[4], percent: 100 };
                }

                const nextThreshold = REP_THRESHOLDS[currentTier + 2] ?? REP_THRESHOLDS[4];
                const prevThreshold = currentTier >= 0 ? REP_THRESHOLDS[currentTier + 1] : 0;
                const progress = rep - prevThreshold;
                const range = nextThreshold - prevThreshold;

                return {
                    current: rep,
                    needed: nextThreshold,
                    percent: Math.min(100, Math.round((progress / range) * 100)),
                };
            },

            // Shop discount based on faction tier (1% per tier)
            getShopDiscount: (storeId) => {
                for (const [factionId, faction] of Object.entries(FACTION_DATABASE)) {
                    if (faction.affiliatedStores.includes(storeId)) {
                        const tier = get().getTier(factionId as FactionId);
                        return Math.max(0, (tier + 1)); // 1% at tier 0, 2% at tier 1, etc.
                    }
                }
                return 0;
            },
        }),
        {
            name: 'gl-factions-v1',
        }
    )
);
