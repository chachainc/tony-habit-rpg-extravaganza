import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { enableTilesGame, enableConquest } from '../utils/featureFlags';

// ─── TYPES ────────────────────────────────────

export interface StrategyState {
    // Strategy Skill
    strategyLevel: number;
    strategyXp: number;
    strategyTotalXp: number;

    // Chess
    lastChessDate: string | null;
    chessPlayed: boolean;
    chessDifficulty: 1 | 2 | 3;

    // Tiles
    lastTilesDate: string | null;
    tilesPlayed: boolean;
    tilesRunsToday?: number; // Added for 3-run limit
    tilesHardWins: number;

    // Actions
    recordChessResult: (result: 'win' | 'draw' | 'loss', difficulty?: 1 | 2 | 3) => void;
    canPlayChessToday: () => boolean;
    getStrategyXpForLevel: (level: number) => number;
    addStrategyXp: (amount: number) => void;

    // Tiles actions
    recordTilesResult: (result: 'win' | 'loss', difficulty: 1 | 2 | 3 | 4) => void;
    canPlayTilesToday: () => boolean;
    canPlayImpossible: () => boolean;

    // Conquest bonuses (hard capped)
    getReconBonus: () => number;
    getMoralCapBonus: () => number;
}

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export const useStrategyStore = create<StrategyState>()(
    persist(
        (set, get) => ({
            strategyLevel: 1,
            strategyXp: 0,
            strategyTotalXp: 0,
            lastChessDate: null,
            chessPlayed: false,
            chessDifficulty: 1,

            lastTilesDate: null,
            tilesPlayed: false,
            tilesRunsToday: 0,
            tilesHardWins: 0,

            getStrategyXpForLevel: (level: number) => level * level * 30,

            addStrategyXp: (amount: number) => {
                const state = get();
                let newXp = state.strategyXp + amount;
                let newLevel = state.strategyLevel;
                let threshold = get().getStrategyXpForLevel(newLevel);

                while (newXp >= threshold && newLevel < 50) {
                    newXp -= threshold;
                    newLevel++;
                    threshold = get().getStrategyXpForLevel(newLevel);
                }

                set({
                    strategyXp: newXp,
                    strategyLevel: newLevel,
                    strategyTotalXp: state.strategyTotalXp + amount,
                });
            },

            recordChessResult: (result, difficulty = 1) => {
                const today = getEasternDateString();
                const state = get();
                if (state.lastChessDate === today && state.chessPlayed) return;

                const XP_MULT: Record<number, number> = { 1: 1, 2: 1.5, 3: 2.5 };
                let baseXp = 0;
                let baseGoldBonus = 0;
                switch (result) {
                    case 'win': baseXp = 50; baseGoldBonus = 150; break;
                    case 'draw': baseXp = 25; baseGoldBonus = 80; break;
                    case 'loss': baseXp = 10; baseGoldBonus = 30; break;
                }
                const mult = XP_MULT[difficulty] ?? 1;
                const xpGain = Math.round(baseXp * mult);
                const goldReward = Math.round(baseGoldBonus * mult);

                let newXp = state.strategyXp + xpGain;
                let newLevel = state.strategyLevel;
                let threshold = get().getStrategyXpForLevel(newLevel);

                while (newXp >= threshold && newLevel < 50) {
                    newXp -= threshold;
                    newLevel++;
                    threshold = get().getStrategyXpForLevel(newLevel);
                }

                set({
                    strategyXp: newXp,
                    strategyLevel: newLevel,
                    strategyTotalXp: state.strategyTotalXp + xpGain,
                    lastChessDate: today,
                    chessPlayed: true,
                });

                // Grant gold from chess
                if (goldReward > 0) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(goldReward, { exact: true });
                    }).catch(() => { });
                }
            },

            canPlayChessToday: () => {
                const state = get();
                const today = getEasternDateString();
                return state.lastChessDate !== today || !state.chessPlayed;
            },

            // ─── TILES ────────────────────────────────
            recordTilesResult: (result, difficulty) => {
                if (!enableTilesGame) return;
                const today = getEasternDateString();
                const state = get();
                const runsToday = state.lastTilesDate === today ? (state.tilesRunsToday || 0) : 0;
                if (runsToday >= 3) return; // 3 runs per day limit

                // Same gold rates as chess
                const XP_MULT: Record<number, number> = { 1: 1, 2: 1.5, 3: 2.5, 4: 3 };
                let baseXp = 0;
                let baseGoldBonus = 0;
                switch (result) {
                    case 'win': baseXp = 50; baseGoldBonus = 150; break;
                    case 'loss': baseXp = 10; baseGoldBonus = 30; break;
                }
                const mult = XP_MULT[difficulty] ?? 1;
                const xpGain = Math.round(baseXp * mult);
                const goldReward = Math.round(baseGoldBonus * mult);

                let newXp = state.strategyXp + xpGain;
                let newLevel = state.strategyLevel;
                let threshold = get().getStrategyXpForLevel(newLevel);

                while (newXp >= threshold && newLevel < 50) {
                    newXp -= threshold;
                    newLevel++;
                    threshold = get().getStrategyXpForLevel(newLevel);
                }

                const newHardWins = (result === 'win' && difficulty >= 3)
                    ? state.tilesHardWins + 1
                    : state.tilesHardWins;

                set({
                    strategyXp: newXp,
                    strategyLevel: newLevel,
                    strategyTotalXp: state.strategyTotalXp + xpGain,
                    lastTilesDate: today,
                    tilesPlayed: true,
                    tilesRunsToday: runsToday + 1,
                    tilesHardWins: newHardWins,
                });

                // Grant gold
                if (goldReward > 0) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                         useCurrencyStore.getState().addGold(goldReward, { exact: true });
                    }).catch(() => { });
                }
            },

            canPlayTilesToday: () => {
                if (!enableTilesGame) return false;
                const state = get();
                const today = getEasternDateString();
                const runsToday = state.lastTilesDate === today ? (state.tilesRunsToday || 0) : 0;
                return runsToday < 3;
            },

            canPlayImpossible: () => {
                if (!enableTilesGame) return false;
                return get().tilesHardWins >= 3;
            },

            getReconBonus: () => {
                if (!enableConquest) return 0;
                const { strategyLevel } = get();
                if (strategyLevel >= 20) return 2;
                if (strategyLevel >= 10) return 1;
                return 0;
            },

            getMoralCapBonus: () => {
                if (!enableConquest) return 0;
                const { strategyLevel } = get();
                if (strategyLevel >= 15) return 1;
                return 0;
            },
        }),
        {
            name: PERSIST_REGISTRY.strategy.persistKey,
        }
    )
);
