import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import type { SkillName } from './useGameStore';

// ── Donation Shrine: Convert gold into permanent stat points ──
export interface ShrineTier {
    name: string;
    cost: number;
    statPoints: number;
}

export const SHRINE_TIERS: ShrineTier[] = [
    { name: 'Small Offering',  cost: 500,  statPoints: 1 },
    { name: 'Worthy Gift',     cost: 2000, statPoints: 2 },
    { name: 'Grand Sacrifice', cost: 5000, statPoints: 3 },
];

// ── Inflation Guard: reduce gold reward rates at high lifetime earnings ──
export const INFLATION_BRACKETS: { threshold: number; penalty: number }[] = [
    { threshold: 50000,  penalty: 0.10 },
    { threshold: 100000, penalty: 0.20 },
    { threshold: 200000, penalty: 0.30 },
];

// ── Skill Prestige ──
export const PRESTIGE_REQUIRED_LEVEL = 25;
export const PRESTIGE_COST = 5000;
export const PRESTIGE_MULTIPLIER = 0.10;

interface EconomyBalanceState {
    lifetimeGoldEarned: number;
    lifetimeGoldSpent: number;
    shrineDonations: number;
    shrineBonusStats: number;
    prestigeRanks: Partial<Record<SkillName, number>>;

    trackGoldEarned: (amount: number) => void;
    trackGoldSpent: (amount: number) => void;
    getInflationMultiplier: () => number;
    makeDonation: (tierIndex: number) => { success: boolean; statPoints: number };
    getPrestigeRank: (skill: SkillName) => number;
    getPrestigeMultiplier: (skill: SkillName) => number;
    canPrestige: (skill: SkillName, currentLevel: number) => boolean;
    prestigeSkill: (skill: SkillName) => boolean;
}

export const useEconomyBalanceStore = create<EconomyBalanceState>()(
    persist(
        (set, get) => ({
            lifetimeGoldEarned: 0,
            lifetimeGoldSpent: 0,
            shrineDonations: 0,
            shrineBonusStats: 0,
            prestigeRanks: {},

            trackGoldEarned: (amount) => {
                if (amount > 0) set(s => ({ lifetimeGoldEarned: s.lifetimeGoldEarned + amount }));
            },

            trackGoldSpent: (amount) => {
                if (amount > 0) set(s => ({ lifetimeGoldSpent: s.lifetimeGoldSpent + amount }));
            },

            getInflationMultiplier: () => {
                const { lifetimeGoldEarned } = get();
                let penalty = 0;
                for (const bracket of INFLATION_BRACKETS) {
                    if (lifetimeGoldEarned >= bracket.threshold) penalty = bracket.penalty;
                }
                return 1 - penalty;
            },

            makeDonation: (tierIndex) => {
                const tier = SHRINE_TIERS[tierIndex];
                if (!tier) return { success: false, statPoints: 0 };
                set(s => ({
                    shrineDonations: s.shrineDonations + 1,
                    shrineBonusStats: s.shrineBonusStats + tier.statPoints,
                }));
                return { success: true, statPoints: tier.statPoints };
            },

            getPrestigeRank: (skill) => get().prestigeRanks[skill] ?? 0,

            getPrestigeMultiplier: (skill) => {
                const rank = get().prestigeRanks[skill] ?? 0;
                return 1 + (rank * PRESTIGE_MULTIPLIER);
            },

            canPrestige: (_skill, currentLevel) => currentLevel >= PRESTIGE_REQUIRED_LEVEL,

            prestigeSkill: (skill) => {
                set(s => ({
                    prestigeRanks: {
                        ...s.prestigeRanks,
                        [skill]: (s.prestigeRanks[skill] ?? 0) + 1,
                    },
                }));
                return true;
            },
        }),
        { name: PERSIST_REGISTRY.economyBalance.persistKey }
    )
);
