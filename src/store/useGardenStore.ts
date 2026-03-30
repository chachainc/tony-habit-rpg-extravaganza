import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Growth Stages ──
export type PlotStage = 'empty' | 'planted' | 'sprout' | 'growing' | 'harvestable';

// ── Seeds ──
export interface SeedDef {
    id: string;
    name: string;
    icon: string;
    growTimeMs: number;
    cost: number;
    cropIcon: string;     // icon shown when harvestable
    yields: { type: 'gold' | 'material'; value: number; materialId?: string }[];
}

export const SEEDS: SeedDef[] = [
    { id: 'herb_seed',    name: 'Herb Seed',    icon: '🌿', cropIcon: '🌿', growTimeMs: 6 * 60 * 60 * 1000,  cost: 100, yields: [{ type: 'gold', value: 50 }] },
    { id: 'flower_seed',  name: 'Flower Seed',  icon: '🌸', cropIcon: '🌺', growTimeMs: 12 * 60 * 60 * 1000, cost: 200, yields: [{ type: 'gold', value: 80 }] },
    { id: 'crystal_seed', name: 'Crystal Seed', icon: '💎', cropIcon: '💠', growTimeMs: 24 * 60 * 60 * 1000, cost: 500, yields: [{ type: 'material', value: 1, materialId: 'gem_shard' }] },
    { id: 'mystic_seed',  name: 'Mystic Seed',  icon: '✨', cropIcon: '🔮', growTimeMs: 18 * 60 * 60 * 1000, cost: 400, yields: [{ type: 'material', value: 2, materialId: 'mystic_dust' }] },
    { id: 'dragon_seed',  name: 'Dragon Seed',  icon: '🐉', cropIcon: '🐲', growTimeMs: 24 * 60 * 60 * 1000, cost: 800, yields: [{ type: 'material', value: 1, materialId: 'dragon_scale' }] },
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

    plantSeed: (plotIndex: number, seedId: string) => void;
    waterPlot: (plotIndex: number) => void;
    harvestPlot: (plotIndex: number) => { yields: SeedDef['yields']; watered: boolean; seed: SeedDef } | null;
    getPlotStage: (plotIndex: number) => PlotStage;
    getGrowthPercent: (plotIndex: number) => number;
    isPlotReady: (plotIndex: number) => boolean;
    isPlotThirsty: (plotIndex: number) => boolean;
    upgradePlots: () => number;
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
                return { yields: seed.yields, watered, seed };
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
        }),
        { name: 'gl-garden-v1', version: 2 }
    )
);
