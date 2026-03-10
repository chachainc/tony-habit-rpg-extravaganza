import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface Title {
    id: string;
    name: string;
    icon: string;
    description: string;
    requirement: string;       // Human-readable requirement text
    checkType: 'streak' | 'level' | 'cumulative_logs' | 'battles_won' | 'books_read' | 'items_owned';
    checkSkill?: string;       // For skill-specific checks
    checkValue: number;        // Threshold to unlock
    bonus: {
        type: 'atk' | 'def' | 'hp' | 'xp' | 'gold' | 'crit' | 'speed';
        value: number;         // Flat or percentage bonus (0.01 = +1%)
    };
}

// ── Title Database ─────────────────────────────────────────────
export const TITLES: Title[] = [
    // Streak-based
    {
        id: 'disciplined',
        name: 'Disciplined',
        icon: '🎯',
        description: 'All habits complete for 30 consecutive days.',
        requirement: '30-day all-habit streak',
        checkType: 'streak',
        checkValue: 30,
        bonus: { type: 'def', value: 0.02 }, // +2% DEF
    },
    {
        id: 'unyielding',
        name: 'Unyielding',
        icon: '🔥',
        description: 'All habits complete for 90 consecutive days.',
        requirement: '90-day all-habit streak',
        checkType: 'streak',
        checkValue: 90,
        bonus: { type: 'def', value: 0.05 }, // +5% DEF
    },
    {
        id: 'immortal_will',
        name: 'Immortal Will',
        icon: '♾️',
        description: 'All habits complete for 365 consecutive days.',
        requirement: '365-day all-habit streak',
        checkType: 'streak',
        checkValue: 365,
        bonus: { type: 'hp', value: 50 }, // +50 max HP
    },

    // Level-based
    {
        id: 'iron_arm',
        name: 'Iron Arm',
        icon: '💪',
        description: 'Reach Strength level 10.',
        requirement: 'Strength Lv.10',
        checkType: 'level',
        checkSkill: 'Strength',
        checkValue: 10,
        bonus: { type: 'atk', value: 0.02 }, // +2% ATK
    },
    {
        id: 'fleet_foot',
        name: 'Fleet Foot',
        icon: '👟',
        description: 'Reach Cardio level 10.',
        requirement: 'Cardio Lv.10',
        checkType: 'level',
        checkSkill: 'Cardio',
        checkValue: 10,
        bonus: { type: 'speed', value: 0.02 }, // +2% SPD
    },
    {
        id: 'bookworm',
        name: 'Bookworm',
        icon: '📚',
        description: 'Reach Intelligence level 10.',
        requirement: 'Intelligence Lv.10',
        checkType: 'level',
        checkSkill: 'Intelligence',
        checkValue: 10,
        bonus: { type: 'xp', value: 0.02 }, // +2% XP gain
    },
    {
        id: 'well_rested',
        name: 'Well-Rested',
        icon: '😴',
        description: 'Reach Sleep level 10.',
        requirement: 'Sleep Lv.10',
        checkType: 'level',
        checkSkill: 'Sleep',
        checkValue: 10,
        bonus: { type: 'crit', value: 0.01 }, // +1% crit
    },
    {
        id: 'pristine',
        name: 'Pristine',
        icon: '✨',
        description: 'Reach Hygiene level 10.',
        requirement: 'Hygiene Lv.10',
        checkType: 'level',
        checkSkill: 'Hygiene',
        checkValue: 10,
        bonus: { type: 'def', value: 0.01 }, // +1% DEF
    },

    // Cumulative log-based
    {
        id: 'centurion',
        name: 'Centurion',
        icon: '🏛️',
        description: 'Log Strength 100 times.',
        requirement: '100 Strength logs',
        checkType: 'cumulative_logs',
        checkSkill: 'Strength',
        checkValue: 100,
        bonus: { type: 'atk', value: 0.01 }, // +1% ATK
    },
    {
        id: 'marathoner',
        name: 'Marathoner',
        icon: '🏃',
        description: 'Log Cardio 100 times.',
        requirement: '100 Cardio logs',
        checkType: 'cumulative_logs',
        checkSkill: 'Cardio',
        checkValue: 100,
        bonus: { type: 'speed', value: 0.01 }, // +1% speed
    },
    {
        id: 'night_owl',
        name: 'Night Owl',
        icon: '🦉',
        description: 'Log Sleep 100 times.',
        requirement: '100 Sleep logs',
        checkType: 'cumulative_logs',
        checkSkill: 'Sleep',
        checkValue: 100,
        bonus: { type: 'hp', value: 20 }, // +20 max HP
    },

    // Battles won
    {
        id: 'warrior',
        name: 'Warrior',
        icon: '⚔️',
        description: 'Win 50 arena battles.',
        requirement: '50 battles won',
        checkType: 'battles_won',
        checkValue: 50,
        bonus: { type: 'atk', value: 0.01 }, // +1% ATK
    },
    {
        id: 'champion',
        name: 'Champion',
        icon: '🏆',
        description: 'Win 200 arena battles.',
        requirement: '200 battles won',
        checkType: 'battles_won',
        checkValue: 200,
        bonus: { type: 'crit', value: 0.02 }, // +2% crit
    },

    // Gold-based
    {
        id: 'merchant_king',
        name: 'Merchant King',
        icon: '👑',
        description: 'Earn 10,000 total gold.',
        requirement: '10,000 total gold earned',
        checkType: 'cumulative_logs',   // We'll track via gold earned counter
        checkSkill: 'Luck',             // Using Luck logs as proxy
        checkValue: 500,
        bonus: { type: 'gold', value: 0.05 }, // +5% gold
    },
];

// ── Store ──────────────────────────────────────────────────────
interface TitleState {
    unlockedTitles: string[];      // IDs of unlocked titles
    activeTitle: string | null;    // Currently displayed title
    battlesWon: number;            // For battle-related titles

    // Actions
    unlockTitle: (titleId: string) => void;
    setActiveTitle: (titleId: string | null) => void;
    checkAndUnlockTitles: (context: {
        skills: Record<string, { level: number }>;
        cumulativeLogs: Record<string, number>;
        currentStreak: number;
    }) => string[];  // Returns newly unlocked title IDs
    incrementBattlesWon: () => void;
    getTotalBonus: (bonusType: 'atk' | 'def' | 'hp' | 'xp' | 'gold' | 'crit' | 'speed') => number;
    getUnlockedTitleDefs: () => Title[];
}

export const useTitleStore = create<TitleState>()(
    persist(
        (set, get) => ({
            unlockedTitles: [],
            activeTitle: null,
            battlesWon: 0,

            unlockTitle: (titleId) => {
                const state = get();
                if (!state.unlockedTitles.includes(titleId)) {
                    set({ unlockedTitles: [...state.unlockedTitles, titleId] });
                }
            },

            setActiveTitle: (titleId) => {
                set({ activeTitle: titleId });
            },

            incrementBattlesWon: () => {
                set((s) => ({ battlesWon: s.battlesWon + 1 }));
            },

            checkAndUnlockTitles: (context) => {
                const state = get();
                const newlyUnlocked: string[] = [];

                for (const title of TITLES) {
                    if (state.unlockedTitles.includes(title.id)) continue;

                    let met = false;

                    switch (title.checkType) {
                        case 'streak':
                            met = context.currentStreak >= title.checkValue;
                            break;
                        case 'level':
                            if (title.checkSkill) {
                                const skill = context.skills[title.checkSkill];
                                met = !!skill && skill.level >= title.checkValue;
                            }
                            break;
                        case 'cumulative_logs':
                            if (title.checkSkill) {
                                const logs = context.cumulativeLogs[title.checkSkill] || 0;
                                met = logs >= title.checkValue;
                            }
                            break;
                        case 'battles_won':
                            met = state.battlesWon >= title.checkValue;
                            break;
                    }

                    if (met) {
                        newlyUnlocked.push(title.id);
                    }
                }

                if (newlyUnlocked.length > 0) {
                    set({
                        unlockedTitles: [...state.unlockedTitles, ...newlyUnlocked],
                    });
                }

                return newlyUnlocked;
            },

            getTotalBonus: (bonusType) => {
                const { unlockedTitles } = get();
                return TITLES
                    .filter((t) => unlockedTitles.includes(t.id) && t.bonus.type === bonusType)
                    .reduce((sum, t) => sum + t.bonus.value, 0);
            },

            getUnlockedTitleDefs: () => {
                const { unlockedTitles } = get();
                return TITLES.filter((t) => unlockedTitles.includes(t.id));
            },
        }),
        {
            name: PERSIST_REGISTRY.titles.persistKey,
        }
    )
);
