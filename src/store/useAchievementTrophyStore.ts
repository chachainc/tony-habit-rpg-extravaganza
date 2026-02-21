/**
 * Achievement Trophy Store
 * Manages special achievement-based trophies that the user has explicitly defined:
 * 
 * READING TROPHIES:
 * - Lifetime reading milestones: 10, 25, 50, 100 books
 * - Yearly reading goals: 25, 50, 75, 100 books in a single year
 * 
 * JACKPOT TROPHY:
 * - Ethereal Cow Jackpot: Hit the 1 in 250,000 jackpot
 * 
 * SLEEP TROPHIES:
 * - 7 days of sleep scores above 85 in a row
 * - 7 days of sleep scores above 90 in a row
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==================== TROPHY DEFINITIONS ====================

export interface AchievementTrophy {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'reading_lifetime' | 'reading_yearly' | 'jackpot' | 'sleep';
    requirement: number; // The threshold to unlock (books count, days count, or 1 for jackpot)
    unlockedAt?: string; // ISO date string when unlocked
}

// LIFETIME READING TROPHIES
export const LIFETIME_READING_TROPHIES: AchievementTrophy[] = [
    {
        id: 'reading_10_books',
        name: 'Bookworm',
        description: 'Read 10 books total',
        icon: '📚',
        category: 'reading_lifetime',
        requirement: 10,
    },
    {
        id: 'reading_25_books',
        name: 'Scholar',
        description: 'Read 25 books total',
        icon: '📖',
        category: 'reading_lifetime',
        requirement: 25,
    },
    {
        id: 'reading_50_books',
        name: 'Sage',
        description: 'Read 50 books total',
        icon: '📜',
        category: 'reading_lifetime',
        requirement: 50,
    },
    {
        id: 'reading_100_books',
        name: 'Grand Library Master',
        description: 'Read 100 books total',
        icon: '🏛️',
        category: 'reading_lifetime',
        requirement: 100,
    },
];

// YEARLY READING TROPHIES
export const YEARLY_READING_TROPHIES: AchievementTrophy[] = [
    {
        id: 'yearly_25_books',
        name: 'Dedicated Reader',
        description: 'Read 25 books in a single year',
        icon: '📗',
        category: 'reading_yearly',
        requirement: 25,
    },
    {
        id: 'yearly_50_books',
        name: 'Voracious Reader',
        description: 'Read 50 books in a single year',
        icon: '📘',
        category: 'reading_yearly',
        requirement: 50,
    },
    {
        id: 'yearly_75_books',
        name: 'Literary Champion',
        description: 'Read 75 books in a single year',
        icon: '📙',
        category: 'reading_yearly',
        requirement: 75,
    },
    {
        id: 'yearly_100_books',
        name: 'Century Club',
        description: 'Read 100 books in a single year',
        icon: '👑',
        category: 'reading_yearly',
        requirement: 100,
    },
];

// JACKPOT TROPHIES
export const JACKPOT_TROPHY: AchievementTrophy = {
    id: 'ethereal_cow_jackpot',
    name: 'Ethereal Bovine Blessing',
    description: 'Hit the 1 in 250,000 jackpot and unlocked the Ethereal Cow!',
    icon: '🐮✨',
    category: 'jackpot',
    requirement: 1, // Just need to hit it once
};

export const GOLDEN_GOLDFISH_TROPHY: AchievementTrophy = {
    id: 'golden_goldfish_jackpot',
    name: 'Fortune of the Deep',
    description: 'Hit the 1 in 25,000 luck roll and unlocked the Golden Goldfish!',
    icon: '🐠✨',
    category: 'jackpot',
    requirement: 1,
};

// SLEEP STREAK TROPHIES
export const SLEEP_TROPHIES: AchievementTrophy[] = [
    {
        id: 'sleep_streak_85',
        name: 'Great Sleeper',
        description: '7 consecutive days with sleep scores above 85',
        icon: '😴',
        category: 'sleep',
        requirement: 7, // 7 days streak of 85+ scores
    },
    {
        id: 'sleep_streak_90',
        name: 'Master of Rest',
        description: '7 consecutive days with sleep scores above 90',
        icon: '🌙',
        category: 'sleep',
        requirement: 7, // 7 days streak of 90+ scores
    },
];

// All trophies combined
export const ALL_ACHIEVEMENT_TROPHIES: AchievementTrophy[] = [
    ...LIFETIME_READING_TROPHIES,
    ...YEARLY_READING_TROPHIES,
    JACKPOT_TROPHY,
    GOLDEN_GOLDFISH_TROPHY,
    ...SLEEP_TROPHIES,
];

// ==================== STORE INTERFACE ====================

interface AchievementTrophyState {
    // Unlocked trophy IDs with unlock timestamps
    unlockedTrophies: Record<string, string>; // trophyId -> ISO date

    // Sleep tracking for streaks
    sleepScoreHistory: Array<{ date: string; score: number }>;

    // Actions
    unlockTrophy: (trophyId: string) => void;
    checkReadingProgress: (totalBooksRead: number, booksReadThisYear: number) => void;
    unlockEtherealCowTrophy: () => void;
    unlockGoldenGoldfishTrophy: () => void;
    recordSleepScore: (score: number) => void;

    // Getters
    isTrophyUnlocked: (trophyId: string) => boolean;
    getUnlockedTrophies: () => AchievementTrophy[];
    getAllTrophies: () => AchievementTrophy[];
}

// ==================== STORE ====================

export const useAchievementTrophyStore = create<AchievementTrophyState>()(
    persist(
        (set, get) => ({
            unlockedTrophies: {},
            sleepScoreHistory: [],

            unlockTrophy: (trophyId: string) => {
                const { unlockedTrophies } = get();
                if (!unlockedTrophies[trophyId]) {
                    set({
                        unlockedTrophies: {
                            ...unlockedTrophies,
                            [trophyId]: new Date().toISOString(),
                        },
                    });
                }
            },

            checkReadingProgress: (totalBooksRead: number, booksReadThisYear: number) => {
                const { unlockTrophy, isTrophyUnlocked } = get();

                // Check lifetime reading trophies
                for (const trophy of LIFETIME_READING_TROPHIES) {
                    if (totalBooksRead >= trophy.requirement && !isTrophyUnlocked(trophy.id)) {
                        unlockTrophy(trophy.id);
                    }
                }

                // Check yearly reading trophies
                for (const trophy of YEARLY_READING_TROPHIES) {
                    if (booksReadThisYear >= trophy.requirement && !isTrophyUnlocked(trophy.id)) {
                        unlockTrophy(trophy.id);
                    }
                }
            },

            unlockEtherealCowTrophy: () => {
                const { unlockTrophy, isTrophyUnlocked } = get();
                if (!isTrophyUnlocked(JACKPOT_TROPHY.id)) {
                    unlockTrophy(JACKPOT_TROPHY.id);
                }
            },

            unlockGoldenGoldfishTrophy: () => {
                const { unlockTrophy, isTrophyUnlocked } = get();
                if (!isTrophyUnlocked(GOLDEN_GOLDFISH_TROPHY.id)) {
                    unlockTrophy(GOLDEN_GOLDFISH_TROPHY.id);
                }
            },

            recordSleepScore: (score: number) => {
                const today = new Date().toISOString().split('T')[0];
                const { sleepScoreHistory, unlockTrophy, isTrophyUnlocked } = get();

                // Add today's score (or update if already exists)
                const updatedHistory = sleepScoreHistory.filter(entry => entry.date !== today);
                updatedHistory.push({ date: today, score });

                // Keep only last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const filteredHistory = updatedHistory.filter(
                    entry => new Date(entry.date) >= thirtyDaysAgo
                );

                set({ sleepScoreHistory: filteredHistory });

                // Check for 7-day streaks
                const sortedHistory = [...filteredHistory].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                // Check for 85+ streak
                if (!isTrophyUnlocked('sleep_streak_85')) {
                    let streak85 = 0;
                    for (let i = 0; i < sortedHistory.length && i < 7; i++) {
                        if (sortedHistory[i].score > 85) {
                            streak85++;
                        } else {
                            break;
                        }
                    }
                    if (streak85 >= 7) {
                        unlockTrophy('sleep_streak_85');
                    }
                }

                // Check for 90+ streak
                if (!isTrophyUnlocked('sleep_streak_90')) {
                    let streak90 = 0;
                    for (let i = 0; i < sortedHistory.length && i < 7; i++) {
                        if (sortedHistory[i].score > 90) {
                            streak90++;
                        } else {
                            break;
                        }
                    }
                    if (streak90 >= 7) {
                        unlockTrophy('sleep_streak_90');
                    }
                }
            },

            isTrophyUnlocked: (trophyId: string) => {
                return !!get().unlockedTrophies[trophyId];
            },

            getUnlockedTrophies: () => {
                const { unlockedTrophies } = get();
                return ALL_ACHIEVEMENT_TROPHIES.filter(trophy => unlockedTrophies[trophy.id])
                    .map(trophy => ({
                        ...trophy,
                        unlockedAt: unlockedTrophies[trophy.id],
                    }));
            },

            getAllTrophies: () => {
                const { unlockedTrophies } = get();
                return ALL_ACHIEVEMENT_TROPHIES.map(trophy => ({
                    ...trophy,
                    unlockedAt: unlockedTrophies[trophy.id],
                }));
            },
        }),
        {
            name: 'gl-achievement-trophies-v2',
        }
    )
);
