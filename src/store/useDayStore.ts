import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Get current date string in Eastern Time
const getEasternDateString = (): string => {
    const now = new Date();
    // Format in Eastern Time
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

export interface SleepEntry {
    date: string;
    sleepScore: number;
    readinessScore: number;
    xpEarned: number;
}

interface DayState {
    lastWakeDate: string | null; // YYYY-MM-DD or null if never woken
    playerMaxHP: number;
    playerCurrentHP: number;
    sleepScoreToday: number | null;
    readinessScoreToday: number | null;
    sleepHistory: SleepEntry[];

    isNewDay: () => boolean;
    wakeUp: (sleepScore: number, readinessScore: number) => number; // Returns total XP earned
    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
    getSleepHistory: () => SleepEntry[];
    getEasternTime: () => string;
}

// ULTRA-SLOW: Very small XP for sleep quality
const calculateSleepXP = (score: number): number => {
    if (score >= 90) return 5;  // Excellent
    if (score >= 80) return 3;  // Great
    if (score >= 70) return 2;  // Good
    if (score >= 60) return 1;  // Okay
    return 0;
};

export const useDayStore = create<DayState>()(
    persist(
        (set, get) => ({
            lastWakeDate: null,
            playerMaxHP: 100,
            playerCurrentHP: 100,
            sleepScoreToday: null,
            readinessScoreToday: null,
            sleepHistory: [],

            isNewDay: () => {
                const today = getEasternDateString();
                const last = get().lastWakeDate;
                return !last || today > last;
            },

            wakeUp: (sleepScore, readinessScore) => {
                const today = getEasternDateString();
                const sleepXp = calculateSleepXP(sleepScore);
                const readinessXp = calculateSleepXP(readinessScore); // Same scale as sleep

                const newEntry: SleepEntry = {
                    date: today,
                    sleepScore,
                    readinessScore,
                    xpEarned: sleepXp + readinessXp
                };

                set((state) => ({
                    lastWakeDate: today,
                    playerCurrentHP: get().playerMaxHP, // Full heal on wake
                    sleepScoreToday: sleepScore,
                    readinessScoreToday: readinessScore,
                    sleepHistory: [newEntry, ...state.sleepHistory].slice(0, 30), // Keep last 30 days
                }));

                return sleepXp + readinessXp;
            },

            takeDamage: (amount) => {
                set((state) => ({
                    playerCurrentHP: Math.max(0, state.playerCurrentHP - amount),
                }));
            },

            heal: (amount) => {
                set((state) => ({
                    playerCurrentHP: Math.min(state.playerMaxHP, state.playerCurrentHP + amount),
                }));
            },

            getSleepHistory: () => {
                return get().sleepHistory;
            },

            getEasternTime: () => {
                return new Date().toLocaleString('en-US', {
                    timeZone: 'America/New_York',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            },
        }),
        {
            name: 'gl-day-v2', // Version bump for new fields
        }
    )
);
