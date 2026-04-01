import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

interface MiniGameState {
    // Brick Breaker
    breakerPlaysToday: number;
    lastBreakerDate: string | null;

    // Lifetime
    breakerHighScore: number;
    breakerTotalPlays: number;

    // Level Progression
    highestBreakerLevel: number;

    // Actions
    canPlayBreaker: () => boolean;
    recordBreakerPlay: (score: number) => void;
    unlockNextLevel: (beatenLevel: number) => void;
}

export const useMiniGameStore = create<MiniGameState>()(
    persist(
        (set, get) => ({
            breakerPlaysToday: 0, lastBreakerDate: null,
            breakerHighScore: 0, breakerTotalPlays: 0,
            highestBreakerLevel: 1,

            canPlayBreaker: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastBreakerDate !== today) return true;
                return s.breakerPlaysToday < 3;
            },

            recordBreakerPlay: (score) => {
                const s = get();
                const today = getEasternDateString();
                const plays = s.lastBreakerDate === today ? s.breakerPlaysToday : 0;
                set({
                    breakerPlaysToday: plays + 1,
                    lastBreakerDate: today,
                    breakerHighScore: Math.max(s.breakerHighScore, score),
                    breakerTotalPlays: s.breakerTotalPlays + 1,
                });
            },

            unlockNextLevel: (beatenLevel) => {
                const s = get();
                // Only advance if they beat the frontier level — never reduce it
                if (beatenLevel >= s.highestBreakerLevel) {
                    set({ highestBreakerLevel: beatenLevel + 1 });
                }
            },
        }),
        {
            name: PERSIST_REGISTRY.miniGames.persistKey,
            version: 2,
            migrate: (persisted: any, version: number) => {
                const state = { ...persisted };
                if (version < 2) {
                    state.highestBreakerLevel = state.highestBreakerLevel ?? 1;
                }
                return state as any;
            },
        }
    )
);
