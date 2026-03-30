import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

interface MiniGameState {
    // Physics Launcher
    launcherPlaysToday: number;
    lastLauncherDate: string | null;

    // Brick Breaker
    breakerPlaysToday: number;
    lastBreakerDate: string | null;

    // Lifetime
    launcherHighScore: number;
    breakerHighScore: number;
    launcherTotalPlays: number;
    breakerTotalPlays: number;

    // Actions
    canPlayLauncher: () => boolean;
    canPlayBreaker: () => boolean;
    recordLauncherPlay: (score: number) => void;
    recordBreakerPlay: (score: number) => void;
}

export const useMiniGameStore = create<MiniGameState>()(
    persist(
        (set, get) => ({
            launcherPlaysToday: 0, lastLauncherDate: null,
            breakerPlaysToday: 0, lastBreakerDate: null,
            launcherHighScore: 0, breakerHighScore: 0,
            launcherTotalPlays: 0, breakerTotalPlays: 0,

            canPlayLauncher: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastLauncherDate !== today) return true;
                return s.launcherPlaysToday < 3;
            },

            canPlayBreaker: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastBreakerDate !== today) return true;
                return s.breakerPlaysToday < 3;
            },

            recordLauncherPlay: (score) => {
                const s = get();
                const today = getEasternDateString();
                const plays = s.lastLauncherDate === today ? s.launcherPlaysToday : 0;
                set({
                    launcherPlaysToday: plays + 1,
                    lastLauncherDate: today,
                    launcherHighScore: Math.max(s.launcherHighScore, score),
                    launcherTotalPlays: s.launcherTotalPlays + 1,
                });
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
        }),
        { name: PERSIST_REGISTRY.miniGames.persistKey }
    )
);
