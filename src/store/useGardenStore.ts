import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Seeds ──
export interface SeedDef {
    id: string;
    name: string;
    icon: string;
    growTimeMs: number; // milliseconds
    cost: number; // gold
    yields: { type: 'gold' | 'xp' | 'material'; value: number; materialId?: string }[];
}

export const SEEDS: SeedDef[] = [
    { id: 'herb_seed',    name: 'Herb Seed',    icon: '🌿', growTimeMs: 6 * 60 * 60 * 1000,  cost: 100, yields: [{ type: 'gold', value: 50 }] },
    { id: 'flower_seed',  name: 'Flower Seed',  icon: '🌸', growTimeMs: 12 * 60 * 60 * 1000, cost: 200, yields: [{ type: 'xp', value: 15 }] },
    { id: 'crystal_seed', name: 'Crystal Seed', icon: '💎', growTimeMs: 24 * 60 * 60 * 1000, cost: 500, yields: [{ type: 'material', value: 1, materialId: 'gem_shard' }] },
    { id: 'mystic_seed',  name: 'Mystic Seed',  icon: '✨', growTimeMs: 18 * 60 * 60 * 1000, cost: 400, yields: [{ type: 'material', value: 2, materialId: 'mystic_dust' }] },
    { id: 'dragon_seed',  name: 'Dragon Seed',  icon: '🐉', growTimeMs: 24 * 60 * 60 * 1000, cost: 800, yields: [{ type: 'material', value: 1, materialId: 'dragon_scale' }] },
];

export interface PlotState {
    seedId: string | null;
    plantedAt: number | null; // timestamp
    wateredToday: boolean;
    lastWateredDate: string | null;
}

interface GardenState {
    plots: PlotState[];
    maxPlots: number;
    totalHarvests: number;

    plantSeed: (plotIndex: number, seedId: string) => void;
    waterPlot: (plotIndex: number) => void;
    harvestPlot: (plotIndex: number) => { yields: SeedDef['yields']; watered: boolean } | null;
    upgradePlots: () => number; // Returns new max, 0 if can't upgrade
    isPlotReady: (plotIndex: number) => boolean;
    getGrowthPercent: (plotIndex: number) => number;
}

const getDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const [m, d, y] = eastern.split('/');
    return `${y}-${m}-${d}`;
};

const PLOT_UPGRADE_COSTS = [0, 0, 0, 2000, 4000, 8000]; // Cost to unlock plot 4, 5, 6

export const useGardenStore = create<GardenState>()(
    persist(
        (set, get) => ({
            plots: [
                { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null },
                { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null },
                { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null },
            ],
            maxPlots: 3,
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
                    plots[plotIndex] = { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null };
                    return { plots, totalHarvests: s.totalHarvests + 1 };
                });
                return { yields: seed.yields, watered };
            },

            upgradePlots: () => {
                const { maxPlots } = get();
                if (maxPlots >= 6) return 0;
                const cost = PLOT_UPGRADE_COSTS[maxPlots] ?? 0;
                const newPlot: PlotState = { seedId: null, plantedAt: null, wateredToday: false, lastWateredDate: null };
                set(s => ({
                    maxPlots: s.maxPlots + 1,
                    plots: [...s.plots, newPlot],
                }));
                return cost;
            },

            isPlotReady: (plotIndex) => {
                const plot = get().plots[plotIndex];
                if (!plot?.seedId || !plot.plantedAt) return false;
                const seed = SEEDS.find(s => s.id === plot.seedId);
                if (!seed) return false;
                return Date.now() - plot.plantedAt >= seed.growTimeMs;
            },

            getGrowthPercent: (plotIndex) => {
                const plot = get().plots[plotIndex];
                if (!plot?.seedId || !plot.plantedAt) return 0;
                const seed = SEEDS.find(s => s.id === plot.seedId);
                if (!seed) return 0;
                const elapsed = Date.now() - plot.plantedAt;
                return Math.min(100, Math.round((elapsed / seed.growTimeMs) * 100));
            },
        }),
        { name: 'gl-garden-v1' }
    )
);
