import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

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
    skipped?: boolean;
}

export interface ReadinessLogEntry {
    date: string;
    score: number;
    xpEarned: number;
    skipped?: boolean;
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
    skipTracking: () => void;
    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
    getEasternTime: () => string;
}

// Score-Based XP scale (applies to both sleep and readiness)
// 100 is the "perfect night" bonus: 25 XP
const calculateSleepXP = (score: number): number => {
    if (score >= 100) return 25;
    if (score >= 96) return 5;
    if (score >= 90) return 4;
    if (score >= 86) return 3;
    if (score >= 80) return 2;
    if (score >= 70) return 1;
    return 0; // 69 or below
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

            skipTracking: () => {
                const today = getEasternDateString();
                const skipSleep: SleepLogEntry = { date: today, score: 0, xpEarned: 0, skipped: true };
                const skipReady: ReadinessLogEntry = { date: today, score: 0, xpEarned: 0, skipped: true };

                set((state) => {
                    const existingSleepIdx = state.sleepLogs.findIndex((log) => log.date === today);
                    let newSleepLogs = [...state.sleepLogs];
                    if (existingSleepIdx >= 0) {
                        newSleepLogs[existingSleepIdx] = skipSleep;
                    } else {
                        newSleepLogs = [skipSleep, ...state.sleepLogs].slice(0, 30);
                    }

                    const existingReadyIdx = state.readinessLogs.findIndex((log) => log.date === today);
                    let newReadyLogs = [...state.readinessLogs];
                    if (existingReadyIdx >= 0) {
                        newReadyLogs[existingReadyIdx] = skipReady;
                    } else {
                        newReadyLogs = [skipReady, ...state.readinessLogs].slice(0, 30);
                    }

                    return {
                        lastWakeDate: today,
                        playerCurrentHP: state.playerMaxHP,
                        sleepLogs: newSleepLogs,
                        readinessLogs: newReadyLogs,
                    };
                });
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
            name: PERSIST_REGISTRY.day.persistKey, // Version bump for new fields
        }
    )
);
