import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Get current date string in Eastern Time
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

export interface SleepLogEntry {
    date: string;
    score: number;
    durationMinutes?: number;
    xpEarned: number;
}

export interface ReadinessLogEntry {
    date: string;
    score: number;
    xpEarned: number;
}

interface DayState {
    lastWakeDate: string | null; // YYYY-MM-DD or null if never woken
    playerMaxHP: number;
    playerCurrentHP: number;
    sleepLogs: SleepLogEntry[];
    readinessLogs: ReadinessLogEntry[];

    isNewDay: () => boolean;
    logSleep: (score: number, durationMinutes?: number) => number; // Returns total XP earned
    logReadiness: (score: number) => number; // Returns total XP earned
    wakeUp: (sleepScore: number, readinessScore: number) => number; // Legacy compatibility
    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
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
            sleepLogs: [],
            readinessLogs: [],

            isNewDay: () => {
                const today = getEasternDateString();
                const last = get().lastWakeDate;
                return !last || today > last;
            },

            logSleep: (score: number, durationMinutes?: number) => {
                const today = getEasternDateString();
                const xpEarned = calculateSleepXP(score);

                const newEntry: SleepLogEntry = {
                    date: today,
                    score,
                    durationMinutes,
                    xpEarned
                };

                set((state) => {
                    const existingIndex = state.sleepLogs.findIndex((log) => log.date === today);
                    let newLogs = [...state.sleepLogs];

                    if (existingIndex >= 0) {
                        newLogs[existingIndex] = newEntry; // Update existing
                    } else {
                        newLogs = [newEntry, ...state.sleepLogs].slice(0, 30); // Prepend and slice
                    }

                    return {
                        lastWakeDate: today,
                        playerCurrentHP: state.playerMaxHP, // Full heal on sleep log? Or maybe separate this. Legacy behavior heals on wakeUp.
                        sleepLogs: newLogs,
                    };
                });

                return xpEarned;
            },

            logReadiness: (score: number) => {
                const today = getEasternDateString();
                const xpEarned = calculateSleepXP(score);

                const newEntry: ReadinessLogEntry = {
                    date: today,
                    score,
                    xpEarned
                };

                set((state) => {
                    const existingIndex = state.readinessLogs.findIndex((log) => log.date === today);
                    let newLogs = [...state.readinessLogs];

                    if (existingIndex >= 0) {
                        newLogs[existingIndex] = newEntry; // Update existing
                    } else {
                        newLogs = [newEntry, ...state.readinessLogs].slice(0, 30); // Prepend and slice
                    }

                    return {
                        readinessLogs: newLogs,
                    };
                });

                return xpEarned;
            },

            // Legacy support
            wakeUp: (sleepScore, readinessScore) => {
                const sleepXp = get().logSleep(sleepScore);
                const readinessXp = get().logReadiness(readinessScore);
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
            name: 'gl-day-v3', // Version bump for new fields
        }
    )
);
