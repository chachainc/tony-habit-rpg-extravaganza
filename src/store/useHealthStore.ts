import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────────────

export interface WeightEntry {
    date: string; // YYYY-MM-DD
    weight: number; // lbs
}

export interface FoodEntry {
    date: string; // YYYY-MM-DD
    tracked: boolean;
    calories?: number;
    fiber?: number; // grams
    protein?: number; // grams
    carbs?: number; // grams
    fat?: number; // grams
}

export interface WeightTrend {
    avg7d: number | null;
    avg30d: number | null;
    direction: 'up' | 'down' | 'stable' | 'unknown';
    allTimeHigh: number | null;
    allTimeLow: number | null;
    netChange7d: number | null;
    netChange30d: number | null;
}

export interface ProgressPhoto {
    id: string;
    date: string; // YYYY-MM-DD
    type: 'front' | 'side' | 'back';
    dataUrl: string; // base64
}

// ── Helpers ────────────────────────────────────────────────────

const getEasternDateString = (d: Date = new Date()): string => {
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

export const getDateLabel = (dateStr: string): string => {
    const today = getEasternDateString();
    const yesterday = getEasternDateString(new Date(Date.now() - 86400000));
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const getLast7Dates = (): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        dates.push(getEasternDateString(new Date(Date.now() - i * 86400000)));
    }
    return dates;
};

// ── Store ──────────────────────────────────────────────────────

interface HealthState {
    weightLogs: WeightEntry[];
    foodLogs: FoodEntry[];
    progressPhotos: ProgressPhoto[];

    // Weight Actions
    logWeight: (weight: number, date?: string) => void;
    getWeightForDate: (date: string) => WeightEntry | null;
    hasLoggedWeightToday: () => boolean;
    getLastWeight: () => number | null;
    getWeightHistory: (days: number) => WeightEntry[];
    getWeightTrend: () => WeightTrend;

    // Food Actions
    logFood: (data: Omit<FoodEntry, 'date'>, date?: string) => void;
    getFoodForDate: (date: string) => FoodEntry | null;
    hasLoggedFoodToday: () => boolean;
    getFoodHistory: (days: number) => FoodEntry[];

    // Photo Actions
    addProgressPhoto: (type: ProgressPhoto['type'], dataUrl: string) => void;
    getPhotosForDate: (date: string) => ProgressPhoto[];
    getAllPhotos: () => ProgressPhoto[];
    deletePhoto: (id: string) => void;
}

export const useHealthStore = create<HealthState>()(
    persist(
        (set, get) => ({
            weightLogs: [],
            foodLogs: [],
            progressPhotos: [],
            // ── Weight ────────────────────────────────────────

            logWeight: (weight: number, date?: string) => {
                const targetDate = date || getEasternDateString();
                set((state) => {
                    const existingIdx = state.weightLogs.findIndex(
                        (e) => e.date === targetDate
                    );
                    const newLogs = [...state.weightLogs];
                    if (existingIdx >= 0) {
                        newLogs[existingIdx] = { date: targetDate, weight };
                    } else {
                        newLogs.push({ date: targetDate, weight });
                        newLogs.sort((a, b) => b.date.localeCompare(a.date));
                    }
                    return { weightLogs: newLogs };
                });
            },

            getWeightForDate: (date: string) => {
                return (
                    get().weightLogs.find((e) => e.date === date) || null
                );
            },

            hasLoggedWeightToday: () => {
                const today = getEasternDateString();
                return get().weightLogs.some((e) => e.date === today);
            },

            getLastWeight: () => {
                const logs = get().weightLogs;
                if (logs.length === 0) return null;
                // Sorted descending, so first entry is latest
                return logs[0].weight;
            },

            getWeightHistory: (days: number) => {
                const cutoff = getEasternDateString(
                    new Date(Date.now() - days * 86400000)
                );
                return get()
                    .weightLogs.filter((e) => e.date >= cutoff)
                    .sort((a, b) => a.date.localeCompare(b.date));
            },

            getWeightTrend: () => {
                const logs = get().weightLogs;
                if (logs.length === 0) {
                    return {
                        avg7d: null,
                        avg30d: null,
                        direction: 'unknown' as const,
                        allTimeHigh: null,
                        allTimeLow: null,
                        netChange7d: null,
                        netChange30d: null,
                    };
                }

                const sorted = [...logs].sort((a, b) =>
                    a.date.localeCompare(b.date)
                );
                const allWeights = sorted.map((e) => e.weight);
                const allTimeHigh = Math.max(...allWeights);
                const allTimeLow = Math.min(...allWeights);

                const now7 = getEasternDateString(
                    new Date(Date.now() - 7 * 86400000)
                );
                const now30 = getEasternDateString(
                    new Date(Date.now() - 30 * 86400000)
                );

                const last7 = sorted.filter((e) => e.date >= now7);
                const last30 = sorted.filter((e) => e.date >= now30);

                const avg7d =
                    last7.length > 0
                        ? last7.reduce((s, e) => s + e.weight, 0) / last7.length
                        : null;
                const avg30d =
                    last30.length > 0
                        ? last30.reduce((s, e) => s + e.weight, 0) / last30.length
                        : null;

                const netChange7d =
                    last7.length >= 2
                        ? last7[last7.length - 1].weight - last7[0].weight
                        : null;
                const netChange30d =
                    last30.length >= 2
                        ? last30[last30.length - 1].weight - last30[0].weight
                        : null;

                let direction: 'up' | 'down' | 'stable' | 'unknown' = 'unknown';
                if (netChange7d !== null) {
                    if (netChange7d > 0.5) direction = 'up';
                    else if (netChange7d < -0.5) direction = 'down';
                    else direction = 'stable';
                }

                return {
                    avg7d: avg7d ? Math.round(avg7d * 10) / 10 : null,
                    avg30d: avg30d ? Math.round(avg30d * 10) / 10 : null,
                    direction,
                    allTimeHigh,
                    allTimeLow,
                    netChange7d:
                        netChange7d !== null
                            ? Math.round(netChange7d * 10) / 10
                            : null,
                    netChange30d:
                        netChange30d !== null
                            ? Math.round(netChange30d * 10) / 10
                            : null,
                };
            },

            // ── Food ─────────────────────────────────────────

            logFood: (data, date?: string) => {
                const targetDate = date || getEasternDateString();
                set((state) => {
                    const existingIdx = state.foodLogs.findIndex(
                        (e) => e.date === targetDate
                    );
                    const newLogs = [...state.foodLogs];
                    const entry: FoodEntry = { ...data, date: targetDate };
                    if (existingIdx >= 0) {
                        newLogs[existingIdx] = entry;
                    } else {
                        newLogs.push(entry);
                        newLogs.sort((a, b) => b.date.localeCompare(a.date));
                    }
                    return { foodLogs: newLogs };
                });
            },

            getFoodForDate: (date: string) => {
                return get().foodLogs.find((e) => e.date === date) || null;
            },

            hasLoggedFoodToday: () => {
                const today = getEasternDateString();
                return get().foodLogs.some((e) => e.date === today);
            },

            getFoodHistory: (days: number) => {
                const cutoff = getEasternDateString(
                    new Date(Date.now() - days * 86400000)
                );
                return get()
                    .foodLogs.filter((e) => e.date >= cutoff)
                    .sort((a, b) => a.date.localeCompare(b.date));
            },

            // ── Photos ────────────────────────────────────────

            addProgressPhoto: (type: ProgressPhoto['type'], dataUrl: string) => {
                const date = getEasternDateString();
                const id = `photo-${date}-${type}-${Date.now()}`;
                set((state) => ({
                    progressPhotos: [
                        { id, date, type, dataUrl },
                        ...state.progressPhotos,
                    ],
                }));
            },

            getPhotosForDate: (date: string) => {
                return get().progressPhotos.filter((p) => p.date === date);
            },

            getAllPhotos: () => {
                return [...get().progressPhotos].sort((a, b) => b.date.localeCompare(a.date));
            },

            deletePhoto: (id: string) => {
                set((state) => ({
                    progressPhotos: state.progressPhotos.filter((p) => p.id !== id),
                }));
            },
        }),
        {
            name: 'gl-health-v1',
        }
    )
);
