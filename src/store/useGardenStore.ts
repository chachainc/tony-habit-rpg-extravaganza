import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCurrencyStore } from './useCurrencyStore';

// ── Growth Stages ──
export type PlotStage = 'empty' | 'planted' | 'sprout' | 'growing' | 'harvestable';

// ── Seeds ──
export interface SeedDef {
    id: string;
    name: string;
    icon: string;
    growTimeMs: number;
    cost: number;
    unlockCost?: number;
    cropIcon: string;     // icon shown when harvestable
    reward: { goldReturn: number; boxes: number };
}

export const SEEDS: SeedDef[] = [
    { id: 'herb_seed',    name: 'Herb Seed',    icon: '🌿', cropIcon: '🌿', growTimeMs: 6 * 60 * 60 * 1000,  cost: 100, reward: { goldReturn: 110, boxes: 0 } },
    { id: 'flower_seed',  name: 'Flower Seed',  icon: '🌸', cropIcon: '🌺', growTimeMs: 12 * 60 * 60 * 1000, cost: 200, reward: { goldReturn: 220, boxes: 0 } },
    { id: 'crystal_seed', name: 'Crystal Seed', icon: '💎', cropIcon: '💠', growTimeMs: 24 * 60 * 60 * 1000, cost: 500, reward: { goldReturn: 525, boxes: 1 } },
    { id: 'mystic_seed',  name: 'Mystic Seed',  icon: '✨', cropIcon: '🔮', growTimeMs: 18 * 60 * 60 * 1000, cost: 400, reward: { goldReturn: 400, boxes: 2 } },
    { id: 'dragon_seed',  name: 'Dragon Seed',  icon: '🐉', cropIcon: '🐲', growTimeMs: 24 * 60 * 60 * 1000, cost: 800, reward: { goldReturn: 830, boxes: 2 } },
    
    // Premium Seeds
    { id: 'golden_herb_seed', name: 'Golden Herb Seed', icon: '✨', cropIcon: '🌾', growTimeMs: 24 * 60 * 60 * 1000, cost: 1000, unlockCost: 10000, reward: { goldReturn: 1050, boxes: 3 } },
    { id: 'royal_bloom_seed', name: 'Royal Bloom Seed', icon: '👑', cropIcon: '🏵️', growTimeMs: 24 * 60 * 60 * 1000, cost: 2000, unlockCost: 25000, reward: { goldReturn: 2100, boxes: 3 } },
    { id: 'dragonroot_seed',  name: 'Dragonroot Seed',  icon: '🔥', cropIcon: '🍠', growTimeMs: 48 * 60 * 60 * 1000, cost: 2000, unlockCost: 50000, reward: { goldReturn: 2400, boxes: 5 } },
];

export interface PlotState {
    seedId: string | null;
    plantedAt: number | null;
    wateredToday: boolean;
    lastWateredDate: string | null;
}

interface GardenState {
    plots: PlotState[];
    maxPlots: number;
    totalHarvests: number;
    unlockedSeeds: Record<string, true>;

    plantSeed: (plotIndex: number, seedId: string) => void;
    waterPlot: (plotIndex: number) => void;
    harvestPlot: (plotIndex: number) => { reward: SeedDef['reward']; watered: boolean; seed: SeedDef } | null;
    getPlotStage: (plotIndex: number) => PlotStage;
    getGrowthPercent: (plotIndex: number) => number;
    isPlotReady: (plotIndex: number) => boolean;
    isPlotThirsty: (plotIndex: number) => boolean;
    upgradePlots: () => number;

    isSeedUnlocked: (seedId: string) => boolean;
    purchaseSeedUnlock: (seedId: string) => { ok: boolean; reason?: string };
}

const getDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const [m, d, y] = eastern.split('/');
    return `${y}-${m}-${d}`;
};

const EMPTY_PLOT: PlotState = { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null };

const INITIAL_PLOTS = 12; // 4×3 grid

export const useGardenStore = create<GardenState>()(
    persist(
        (set, get) => ({
            plots: Array.from({ length: INITIAL_PLOTS }, () => ({ ...EMPTY_PLOT })),
            maxPlots: INITIAL_PLOTS,
            totalHarvests: 0,
            unlockedSeeds: {},

            plantSeed: (plotIndex, seedId) => {
                set(s => {
                    if (plotIndex >= s.maxPlots) return s;
                    const plots = [...s.plots];
                    if (plots[plotIndex]?.seedId) return s;
                    plots[plotIndex] = { seedId, plantedAt: Date.now(), wateredToday: false, lastWateredDate: null };
                    return { plots };
                });
            },

            waterPlot: (plotIndex) => {
                const today = getDateString();
                set(s => {
                    const plots = [...s.plots];
                    const plot = plots[plotIndex];
                    if (!plot?.seedId || plot.lastWateredDate === today) return s;
                    plots[plotIndex] = { ...plot, wateredToday: true, lastWateredDate: today };
                    return { plots };
                });
            },

            harvestPlot: (plotIndex) => {
                const state = get();
                const plot = state.plots[plotIndex];
                if (!plot?.seedId || !plot.plantedAt) return null;
                const seed = SEEDS.find(s => s.id === plot.seedId);
                if (!seed) return null;
                const elapsed = Date.now() - plot.plantedAt;
                if (elapsed < seed.growTimeMs) return null;

                const watered = plot.wateredToday;
                set(s => {
                    const plots = [...s.plots];
                    plots[plotIndex] = { ...EMPTY_PLOT };
                    return { plots, totalHarvests: s.totalHarvests + 1 };
                });
                return { reward: seed.reward, watered, seed };
            },

            getPlotStage: (plotIndex) => {
                const plot = get().plots[plotIndex];
                if (!plot?.seedId || !plot.plantedAt) return 'empty';
                const seed = SEEDS.find(s => s.id === plot.seedId);
                if (!seed) return 'empty';
                const elapsed = Date.now() - plot.plantedAt;
                const pct = (elapsed / seed.growTimeMs) * 100;
                if (pct >= 100) return 'harvestable';
                if (pct >= 60) return 'growing';
                if (pct >= 25) return 'sprout';
                return 'planted';
            },

            getGrowthPercent: (plotIndex) => {
                const plot = get().plots[plotIndex];
                if (!plot?.seedId || !plot.plantedAt) return 0;
                const seed = SEEDS.find(s => s.id === plot.seedId);
                if (!seed) return 0;
                const elapsed = Date.now() - plot.plantedAt;
                return Math.min(100, Math.round((elapsed / seed.growTimeMs) * 100));
            },

            isPlotReady: (plotIndex) => {
                return get().getPlotStage(plotIndex) === 'harvestable';
            },

            isPlotThirsty: (plotIndex) => {
                const plot = get().plots[plotIndex];
                if (!plot?.seedId) return false;
                const stage = get().getPlotStage(plotIndex);
                if (stage === 'empty' || stage === 'harvestable') return false;
                const today = getDateString();
                return plot.lastWateredDate !== today;
            },

            upgradePlots: () => {
                const { maxPlots } = get();
                if (maxPlots >= 20) return 0;
                const newPlot: PlotState = { ...EMPTY_PLOT };
                set(s => ({
                    maxPlots: s.maxPlots + 1,
                    plots: [...s.plots, newPlot],
                }));
                return 0;
            },

            isSeedUnlocked: (seedId: string) => {
                const seed = SEEDS.find(s => s.id === seedId);
                // If it's not a premium seed, it's inherently unlocked
                if (!seed?.unlockCost) return true;
                return !!get().unlockedSeeds[seedId];
            },

            purchaseSeedUnlock: (seedId: string) => {
                const seed = SEEDS.find(s => s.id === seedId);
                if (!seed) return { ok: false, reason: 'Seed not found' };
                if (!seed.unlockCost) return { ok: false, reason: 'Seed is not premium' };
                
                const { unlockedSeeds } = get();
                if (unlockedSeeds[seedId]) return { ok: false, reason: 'Already unlocked' };
                
                const currencyStore = useCurrencyStore.getState();
                if (currencyStore.gold < seed.unlockCost) {
                    return { ok: false, reason: 'Not enough gold' };
                }
                
                currencyStore.spendGold(seed.unlockCost);
                set(s => ({
                    unlockedSeeds: { ...s.unlockedSeeds, [seedId]: true }
                }));
                
                return { ok: true };
            },
        }),
        { 
            name: 'gl-garden-v1', 
            version: 3,
            migrate: (persistedState: any, version) => {
                const state = persistedState as any;
                if (version < 3) {
                    state.unlockedSeeds = {};
                    // Make sure plots empty array length is OK
                }
                return state;
            }
        }
    )
);
