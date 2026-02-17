import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';

// Get current date in Eastern Time
const getEasternDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

// Get week number (Sunday = start of week)
const getWeekNumber = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 604800000; // 7 days in ms
    return Math.floor(diff / oneWeek);
};

interface ConsistencyState {
    // Track which days tasks were completed this week
    daysCompletedThisWeek: string[];  // YYYY-MM-DD format
    currentWeekNumber: number;
    currentYear: number;

    // Weekly claims
    hasClaimedWeeklyBonus: boolean;
    weeklyBonusClaimWeek: number;

    // Actions
    markDayComplete: () => void;
    canClaimWeeklyBonus: () => boolean;
    claimWeeklyBonus: () => { habitBuildingXp: number } | null;
    getWeeklyProgress: () => { daysCompleted: number; target: number };
    resetWeekIfNeeded: () => void;
}

export const useConsistencyStore = create<ConsistencyState>()(
    persist(
        (set, get) => ({
            daysCompletedThisWeek: [],
            currentWeekNumber: getWeekNumber(new Date()),
            currentYear: new Date().getFullYear(),
            hasClaimedWeeklyBonus: false,
            weeklyBonusClaimWeek: -1,

            resetWeekIfNeeded: () => {
                const now = new Date();
                const currentWeek = getWeekNumber(now);
                const currentYear = now.getFullYear();
                const state = get();

                if (state.currentYear !== currentYear || state.currentWeekNumber !== currentWeek) {
                    set({
                        daysCompletedThisWeek: [],
                        currentWeekNumber: currentWeek,
                        currentYear: currentYear,
                        hasClaimedWeeklyBonus: false,
                    });
                }
            },

            markDayComplete: () => {
                get().resetWeekIfNeeded();
                const today = getEasternDateString();
                const state = get();

                // Don't add duplicate days
                if (!state.daysCompletedThisWeek.includes(today)) {
                    set({
                        daysCompletedThisWeek: [...state.daysCompletedThisWeek, today],
                    });
                }
            },

            canClaimWeeklyBonus: () => {
                get().resetWeekIfNeeded();
                const state = get();
                const currentWeek = getWeekNumber(new Date());

                // Need at least 7 days of completion for weekly bonus
                const hasEnoughDays = state.daysCompletedThisWeek.length >= 7;
                const notClaimedThisWeek = state.weeklyBonusClaimWeek !== currentWeek || !state.hasClaimedWeeklyBonus;

                return hasEnoughDays && notClaimedThisWeek;
            },

            claimWeeklyBonus: () => {
                const state = get();
                if (!state.canClaimWeeklyBonus()) {
                    return null;
                }

                const currentWeek = getWeekNumber(new Date());

                // Award 5 XP to Habit Building skill for weekly consistency
                const habitBuildingXp = 5;
                useGameStore.getState().addSkillXp('Habit Building', habitBuildingXp);

                set({
                    hasClaimedWeeklyBonus: true,
                    weeklyBonusClaimWeek: currentWeek,
                });

                return { habitBuildingXp };
            },

            getWeeklyProgress: () => {
                get().resetWeekIfNeeded();
                const state = get();
                return {
                    daysCompleted: state.daysCompletedThisWeek.length,
                    target: 7,
                };
            },
        }),
        {
            name: 'gl-consistency-v1',
        }
    )
);
