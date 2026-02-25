import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

    // Actions
    recordChessResult: (result: 'win' | 'draw' | 'loss', difficulty?: 1 | 2 | 3) => void;
    canPlayChessToday: () => boolean;
    getStrategyXpForLevel: (level: number) => number;

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

            getStrategyXpForLevel: (level: number) => level * level * 30,

            recordChessResult: (result, difficulty = 1) => {
                const today = getEasternDateString();
                const state = get();
                if (state.lastChessDate === today && state.chessPlayed) return;

                const XP_MULT: Record<number, number> = { 1: 1, 2: 1.5, 3: 2.5 };
                let baseXp = 0;
                switch (result) {
                    case 'win': baseXp = 50; break;
                    case 'draw': baseXp = 25; break;
                    case 'loss': baseXp = 10; break;
                }
                const xpGain = Math.round(baseXp * (XP_MULT[difficulty] ?? 1));

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
            },

            canPlayChessToday: () => {
                const state = get();
                const today = getEasternDateString();
                return state.lastChessDate !== today || !state.chessPlayed;
            },

            getReconBonus: () => {
                const { strategyLevel } = get();
                if (strategyLevel >= 20) return 2;
                if (strategyLevel >= 10) return 1;
                return 0;
            },

            getMoralCapBonus: () => {
                const { strategyLevel } = get();
                if (strategyLevel >= 15) return 1;
                return 0;
            },
        }),
        {
            name: 'gl-strategy-storage-v1',
        }
    )
);
