import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ArenaStats {
    // Lifetime totals
    totalKills: number;
    totalDamageDealt: number;
    totalTowersBuilt: number;
    totalDefendersBought: number;
    totalWavesSurvived: number;
    totalCombosLanded: number;
    totalElitesKilled: number;
    totalBossesKilled: number;
    totalGoldEarned: number;


    // Per-mode best
    tdBestWave: number;
    stormBestWave: number;

    // Actions
    recordKill: (count?: number) => void;
    recordDamage: (amount: number) => void;
    recordTowerBuilt: (count?: number) => void;
    recordDefenderBought: (count?: number) => void;
    recordWaveSurvived: () => void;
    recordCombo: () => void;
    recordEliteKill: () => void;
    recordBossKill: () => void;
    recordGold: (amount: number) => void;

    updateTdBest: (wave: number) => void;
    updateStormBest: (wave: number) => void;
}

export const useArenaStatsStore = create<ArenaStats>()(
    persist(
        (set) => ({
            totalKills: 0,
            totalDamageDealt: 0,
            totalTowersBuilt: 0,
            totalDefendersBought: 0,
            totalWavesSurvived: 0,
            totalCombosLanded: 0,
            totalElitesKilled: 0,
            totalBossesKilled: 0,
            totalGoldEarned: 0,

            tdBestWave: 0,
            stormBestWave: 0,

            recordKill: (count = 1) => set(s => ({ totalKills: s.totalKills + count })),
            recordDamage: (amount) => set(s => ({ totalDamageDealt: s.totalDamageDealt + amount })),
            recordTowerBuilt: (count = 1) => set(s => ({ totalTowersBuilt: s.totalTowersBuilt + count })),
            recordDefenderBought: (count = 1) => set(s => ({ totalDefendersBought: s.totalDefendersBought + count })),
            recordWaveSurvived: () => set(s => ({ totalWavesSurvived: s.totalWavesSurvived + 1 })),
            recordCombo: () => set(s => ({ totalCombosLanded: s.totalCombosLanded + 1 })),
            recordEliteKill: () => set(s => ({ totalElitesKilled: s.totalElitesKilled + 1 })),
            recordBossKill: () => set(s => ({ totalBossesKilled: s.totalBossesKilled + 1 })),
            recordGold: (amount) => set(s => ({ totalGoldEarned: s.totalGoldEarned + amount })),

            updateTdBest: (wave) => set(s => ({ tdBestWave: Math.max(s.tdBestWave, wave) })),
            updateStormBest: (wave) => set(s => ({ stormBestWave: Math.max(s.stormBestWave, wave) })),
        }),
        {
            name: 'gl-arena-stats-v1',
        }
    )
);
