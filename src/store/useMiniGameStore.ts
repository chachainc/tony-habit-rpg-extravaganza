import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

interface MiniGameState {
    // Brick Breaker
    breakerPlaysToday: number;
    breakerWinsToday: number;
    breakerDailyGemAwarded: boolean;
    lastBreakerDate: string | null;

    // Lifetime
    breakerHighScore: number;
    breakerTotalPlays: number;

    // Level Progression
    highestBreakerLevel: number;

    // Actions
    canPlayBreaker: () => boolean;
    recordBreakerPlay: () => void;
    recordBreakerWin: (score: number) => boolean;
    unlockNextLevel: (beatenLevel: number) => void;
}

export const useMiniGameStore = create<MiniGameState>()(
    persist(
        (set, get) => ({
            breakerPlaysToday: 0, 
            breakerWinsToday: 0,
            breakerDailyGemAwarded: false,
            lastBreakerDate: null,
            breakerHighScore: 0, 
            breakerTotalPlays: 0,
            highestBreakerLevel: 1,

            canPlayBreaker: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastBreakerDate !== today) return true;
                return s.breakerPlaysToday < 3;
            },

            recordBreakerPlay: () => {
                const s = get();
                const today = getEasternDateString();
                const plays = s.lastBreakerDate === today ? s.breakerPlaysToday : 0;
                const wins = s.lastBreakerDate === today ? s.breakerWinsToday : 0;
                const awarded = s.lastBreakerDate === today ? s.breakerDailyGemAwarded : false;
                set({
                    breakerPlaysToday: plays + 1,
                    breakerWinsToday: wins,
                    breakerDailyGemAwarded: awarded,
                    lastBreakerDate: today,
                    breakerTotalPlays: s.breakerTotalPlays + 1,
                });
            },

            recordBreakerWin: (score: number) => {
                const s = get();
                const today = getEasternDateString();
                const wins = s.lastBreakerDate === today ? s.breakerWinsToday : 0;
                const awarded = s.lastBreakerDate === today ? s.breakerDailyGemAwarded : false;
                
                const newWins = wins + 1;
                let hitStreak = false;
                let newAwarded = awarded;
                if (newWins === 3 && !awarded) {
                    hitStreak = true;
                    newAwarded = true;
                }
                
                set({
                    breakerWinsToday: newWins,
                    breakerDailyGemAwarded: newAwarded,
                    breakerHighScore: Math.max(s.breakerHighScore, score),
                    lastBreakerDate: today
                });
                
                return hitStreak;
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
            version: 3,
            migrate: (persisted: any, version: number) => {
                const state = { ...persisted };
                if (version < 2) {
                    state.highestBreakerLevel = state.highestBreakerLevel ?? 1;
                }
                if (version < 3) {
                    state.breakerWinsToday = state.breakerWinsToday ?? 0;
                    state.breakerDailyGemAwarded = state.breakerDailyGemAwarded ?? false;
                }
                return state as any;
            },
        }
    )
);
