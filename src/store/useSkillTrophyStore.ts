import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==================== TROPHY DEFINITIONS ====================

export interface SkillTrophyTier {
    id: string;
    name: string;
    icon: string;
    description: string;
    threshold: number;      // XP, level, or count required
    statBonus: number;      // Primary stat bonus
    secondaryBonus?: number; // Optional secondary bonus
}

export type TrophyCategory = 'strength' | 'cardio' | 'housemaid' | 'sleep' | 'luck';

// Titan of Might (Strength) - ATK bonus
export const STRENGTH_TROPHIES: SkillTrophyTier[] = [
    { id: 'str_0', name: 'Empty Stand', icon: '🏋️', description: 'Begin your journey of strength.', threshold: 0, statBonus: 0 },
    { id: 'str_1', name: 'Iron Dumbbell', icon: '🏋️', description: 'A humble start.', threshold: 100, statBonus: 2 },
    { id: 'str_2', name: 'Steel Barbell', icon: '🏋️‍♂️', description: 'Growing stronger every day.', threshold: 500, statBonus: 5 },
    { id: 'str_3', name: 'Bronze Greatsword', icon: '⚔️', description: 'A warrior awakens.', threshold: 1500, statBonus: 10 },
    { id: 'str_4', name: 'Glowing Greatsword', icon: '🗡️', description: 'Power radiates from within.', threshold: 5000, statBonus: 20 },
    { id: 'str_5', name: 'Cracked Mountain Peak', icon: '🏔️', description: 'Titan of Might.', threshold: 15000, statBonus: 40 },
];

// Unstoppable Spirit (Cardio) - SPD bonus
export const CARDIO_TROPHIES: SkillTrophyTier[] = [
    { id: 'car_0', name: 'Empty Stand', icon: '👟', description: 'Take your first steps.', threshold: 0, statBonus: 0 },
    { id: 'car_1', name: 'Worn Sandals', icon: '👟', description: 'The journey begins.', threshold: 3, statBonus: 1 },
    { id: 'car_2', name: 'Winged Sandals', icon: '👡', description: 'Swift and steady.', threshold: 8, statBonus: 3 },
    { id: 'car_3', name: 'Lightning Sandals', icon: '⚡', description: 'Speed of lightning.', threshold: 15, statBonus: 5 },
    { id: 'car_4', name: 'Divine Wings', icon: '🦅', description: 'Unstoppable Spirit.', threshold: 30, statBonus: 10 },
];

// Divine Cleanser (Housemaid) - Luck/Gacha bonus
export const HOUSEMAID_TROPHIES: SkillTrophyTier[] = [
    { id: 'hm_0', name: 'Empty Stand', icon: '🧹', description: 'A clean start awaits.', threshold: 0, statBonus: 0 },
    { id: 'hm_1', name: 'Silver Broom', icon: '🧹', description: 'Dust begins to settle.', threshold: 100, statBonus: 1 },
    { id: 'hm_2', name: 'Golden Mop', icon: '🪣', description: 'Spotless dedication.', threshold: 500, statBonus: 2 },
    { id: 'hm_3', name: 'Crystal Palace Key', icon: '🔑', description: 'Master of cleanliness.', threshold: 2000, statBonus: 5 },
    { id: 'hm_4', name: 'Crystal Castle', icon: '🏰', description: 'Divine Cleanser.', threshold: 8000, statBonus: 10 },
];

// Fortress of Zen (Sleep) - DEF and HP bonus
export const SLEEP_TROPHIES: SkillTrophyTier[] = [
    { id: 'slp_0', name: 'Empty Stand', icon: '🌙', description: 'Rest awaits.', threshold: 0, statBonus: 0, secondaryBonus: 0 },
    { id: 'slp_1', name: 'Jade Crescent', icon: '🌙', description: 'Peaceful nights begin.', threshold: 1, statBonus: 2, secondaryBonus: 10 },
    { id: 'slp_2', name: 'Silver Moon', icon: '🌕', description: 'Restorative slumber.', threshold: 3, statBonus: 5, secondaryBonus: 25 },
    { id: 'slp_3', name: 'Great Oak Tree', icon: '🌳', description: 'Deep roots of rest.', threshold: 7, statBonus: 10, secondaryBonus: 50 },
    { id: 'slp_4', name: 'Zen Temple', icon: '🏯', description: 'Fortress of Zen.', threshold: 14, statBonus: 20, secondaryBonus: 100 },
];

// Fortune's Favorite (Luck) - Crit Multiplier bonus
export const LUCK_TROPHIES: SkillTrophyTier[] = [
    { id: 'lck_0', name: 'Empty Stand', icon: '🎲', description: 'Fortune awaits.', threshold: 0, statBonus: 0 },
    { id: 'lck_1', name: 'Wooden Dice', icon: '🎲', description: 'A lucky roll.', threshold: 1, statBonus: 5 },
    { id: 'lck_2', name: 'Silver Dice', icon: '🎲', description: 'Fortune smiles upon you.', threshold: 5, statBonus: 10 },
    { id: 'lck_3', name: 'Golden Dice', icon: '🎲', description: 'Blessed by luck.', threshold: 15, statBonus: 20 },
    { id: 'lck_4', name: 'Diamond Dice', icon: '💎', description: "Fortune's Favorite.", threshold: 50, statBonus: 35 },
    { id: 'lck_5', name: 'Ultra Rare Cow Trophy', icon: '🐮✨', description: '1-in-100,000 Legend.', threshold: 1, statBonus: 50 }, // Special trophy
];

// ==================== STORE ====================

interface SkillTrophyState {
    // XP/Level/Count trackers for each trophy type
    strengthXpTotal: number;
    cardioLevel: number;
    housemaidXpTotal: number;
    sleepStreakMax: number;        // Max consecutive 7-day sleep streaks completed
    rareRollCount: number;         // Number of rare monopoly rolls (1/1000+)
    hasUltraRareCow: boolean;      // 1-in-100,000 roll achieved

    // Pending trophy evolution for notification
    pendingEvolution: { category: TrophyCategory; trophy: SkillTrophyTier } | null;

    // Getters
    getCurrentTrophy: (category: TrophyCategory) => SkillTrophyTier;
    getStrengthATKBonus: () => number;
    getCardioSPDBonus: () => number;
    getHousemaidLuckBonus: () => number;
    getSleepDEFBonus: () => number;
    getSleepHPBonus: () => number;
    getLuckCritBonus: () => number;
    getAllTrophyBonuses: () => {
        atk: number;
        spd: number;
        luck: number;
        def: number;
        hp: number;
        critMultiplier: number;
    };

    // Actions
    addStrengthXp: (amount: number) => void;
    setCardioLevel: (level: number) => void;
    addHousemaidXp: (amount: number) => void;
    incrementSleepStreak: () => void;
    recordRareRoll: (rarity: number) => void;
    clearPendingEvolution: () => void;
}

export const useSkillTrophyStore = create<SkillTrophyState>()(
    persist(
        (set, get) => ({
            strengthXpTotal: 0,
            cardioLevel: 1,
            housemaidXpTotal: 0,
            sleepStreakMax: 0,
            rareRollCount: 0,
            hasUltraRareCow: false,
            pendingEvolution: null,

            getCurrentTrophy: (category) => {
                const state = get();
                let trophies: SkillTrophyTier[];
                let value: number;

                switch (category) {
                    case 'strength':
                        trophies = STRENGTH_TROPHIES;
                        value = state.strengthXpTotal;
                        break;
                    case 'cardio':
                        trophies = CARDIO_TROPHIES;
                        value = state.cardioLevel;
                        break;
                    case 'housemaid':
                        trophies = HOUSEMAID_TROPHIES;
                        value = state.housemaidXpTotal;
                        break;
                    case 'sleep':
                        trophies = SLEEP_TROPHIES;
                        value = state.sleepStreakMax;
                        break;
                    case 'luck':
                        // Special handling for Ultra Rare Cow
                        if (state.hasUltraRareCow) {
                            return LUCK_TROPHIES[LUCK_TROPHIES.length - 1]; // Ultra Rare Cow Trophy
                        }
                        trophies = LUCK_TROPHIES.slice(0, -1); // Exclude Ultra Rare Cow from normal progression
                        value = state.rareRollCount;
                        break;
                    default:
                        return STRENGTH_TROPHIES[0];
                }

                // Find highest qualifying trophy
                let current = trophies[0];
                for (const trophy of trophies) {
                    if (value >= trophy.threshold) {
                        current = trophy;
                    }
                }
                return current;
            },

            getStrengthATKBonus: () => {
                return get().getCurrentTrophy('strength').statBonus;
            },

            getCardioSPDBonus: () => {
                return get().getCurrentTrophy('cardio').statBonus;
            },

            getHousemaidLuckBonus: () => {
                return get().getCurrentTrophy('housemaid').statBonus;
            },

            getSleepDEFBonus: () => {
                return get().getCurrentTrophy('sleep').statBonus;
            },

            getSleepHPBonus: () => {
                return get().getCurrentTrophy('sleep').secondaryBonus || 0;
            },

            getLuckCritBonus: () => {
                return get().getCurrentTrophy('luck').statBonus;
            },

            getAllTrophyBonuses: () => {
                const state = get();
                return {
                    atk: state.getStrengthATKBonus(),
                    spd: state.getCardioSPDBonus(),
                    luck: state.getHousemaidLuckBonus(),
                    def: state.getSleepDEFBonus(),
                    hp: state.getSleepHPBonus(),
                    critMultiplier: state.getLuckCritBonus(),
                };
            },

            addStrengthXp: (amount) => {
                const prevTrophy = get().getCurrentTrophy('strength');
                set((state) => ({ strengthXpTotal: state.strengthXpTotal + amount }));
                const newTrophy = get().getCurrentTrophy('strength');

                if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'str_0') {
                    set({ pendingEvolution: { category: 'strength', trophy: newTrophy } });
                }
            },

            setCardioLevel: (level) => {
                const prevTrophy = get().getCurrentTrophy('cardio');
                set({ cardioLevel: level });
                const newTrophy = get().getCurrentTrophy('cardio');

                if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'car_0') {
                    set({ pendingEvolution: { category: 'cardio', trophy: newTrophy } });
                }
            },

            addHousemaidXp: (amount) => {
                const prevTrophy = get().getCurrentTrophy('housemaid');
                set((state) => ({ housemaidXpTotal: state.housemaidXpTotal + amount }));
                const newTrophy = get().getCurrentTrophy('housemaid');

                if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'hm_0') {
                    set({ pendingEvolution: { category: 'housemaid', trophy: newTrophy } });
                }
            },

            incrementSleepStreak: () => {
                const prevTrophy = get().getCurrentTrophy('sleep');
                set((state) => ({ sleepStreakMax: state.sleepStreakMax + 1 }));
                const newTrophy = get().getCurrentTrophy('sleep');

                if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'slp_0') {
                    set({ pendingEvolution: { category: 'sleep', trophy: newTrophy } });
                }
            },

            recordRareRoll: (rarity) => {
                const state = get();

                // Check for ultra rare roll (1 in 100,000)
                if (rarity >= 100000 && !state.hasUltraRareCow) {
                    set({ hasUltraRareCow: true });
                    set({ pendingEvolution: { category: 'luck', trophy: LUCK_TROPHIES[LUCK_TROPHIES.length - 1] } });
                    return;
                }

                // Count rare rolls (1 in 1000 or better)
                if (rarity >= 1000) {
                    const prevTrophy = get().getCurrentTrophy('luck');
                    set((s) => ({ rareRollCount: s.rareRollCount + 1 }));
                    const newTrophy = get().getCurrentTrophy('luck');

                    if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'lck_0') {
                        set({ pendingEvolution: { category: 'luck', trophy: newTrophy } });
                    }
                }
            },

            clearPendingEvolution: () => {
                set({ pendingEvolution: null });
            },
        }),
        {
            name: 'gl-skill-trophy-v1',
        }
    )
);
