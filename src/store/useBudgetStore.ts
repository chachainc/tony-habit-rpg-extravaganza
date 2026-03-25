import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type GiftCurrency = 'shmeckles' | 'balloons' | 'sigils';

// ── Spending Categories ──
export type BudgetCategory = 'food' | 'fun' | 'bills' | 'shopping' | 'coffee' | 'transport' | 'health' | 'other';

export const BUDGET_CATEGORIES: Record<BudgetCategory, { emoji: string; label: string; color: string }> = {
    food:      { emoji: '🍕', label: 'Food',      color: '#f97316' },
    coffee:    { emoji: '☕', label: 'Coffee',    color: '#92400e' },
    fun:       { emoji: '🎮', label: 'Fun',       color: '#a855f7' },
    bills:     { emoji: '🏠', label: 'Bills',     color: '#3b82f6' },
    shopping:  { emoji: '🛒', label: 'Shopping',  color: '#22c55e' },
    transport: { emoji: '🚗', label: 'Transport', color: '#64748b' },
    health:    { emoji: '💊', label: 'Health',     color: '#ef4444' },
    other:     { emoji: '📦', label: 'Other',     color: '#6b7280' },
};

// ── Quick Presets ──
export interface QuickPreset {
    id: string;
    emoji: string;
    label: string;
    amount: number;
    category: BudgetCategory;
}

export const DEFAULT_PRESETS: QuickPreset[] = [
    { id: 'p-coffee', emoji: '☕', label: 'Coffee', amount: 5, category: 'coffee' },
    { id: 'p-lunch',  emoji: '🍕', label: 'Lunch',  amount: 12, category: 'food' },
    { id: 'p-gas',    emoji: '⛽', label: 'Gas',    amount: 40, category: 'transport' },
];

// ── Week History ──
export interface WeekRecord {
    weekStart: string;
    budget: number;
    spent: number;
    underBudget: boolean;
    streakAtTime: number;
}

export interface Transaction {
    id: string;
    amount: number;
    label: string;
    date: string;
    category: BudgetCategory;
}

interface BudgetState {
    weeklyBudget: number | null;
    weeklyGiftType: GiftCurrency | null;
    transactions: Transaction[];
    weekStartDate: string | null;
    lastLoginDate: string | null;
    lastDailyGiftDate: string | null;
    trackingStreak: number;

    // New: Quick presets
    quickPresets: QuickPreset[];

    // New: Weekly streak
    weeklyStreak: number;

    // New: Budget history
    weekHistory: WeekRecord[];

    // Modal Control
    forceShowSetup: boolean;
    dismissedPromptWeek: string | null;

    // Actions
    setupWeek: (budget: number, giftType: GiftCurrency) => void;
    addTransaction: (amount: number, label: string, category?: BudgetCategory) => void;
    removeTransaction: (id: string) => void;
    checkAndResetWeek: () => void;
    processDailyLogin: () => void;
    addPreset: (preset: Omit<QuickPreset, 'id'>) => void;
    removePreset: (id: string) => void;
    usePreset: (presetId: string) => void;
    setForceShowSetup: (show: boolean) => void;
    dismissPrompt: () => void;

    // Computeds
    getTotalSpent: () => number;
    getSpentByCategory: () => Record<BudgetCategory, number>;
    getPowerMultiplier: () => number;
    getDailyGiftTier: () => { tier: number, requiredSpent: [number, number], giftAmount: number } | null;
    getStreakMultiplier: () => number;
}

// Helpers
const getEasternDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

const getWeekStart = (): string => {
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = eastern.getDay();
    const diff = eastern.getDate() - day; // 0 = Sunday
    const sunday = new Date(eastern.setDate(diff));
    return sunday.toISOString().split('T')[0];
};

export const useBudgetStore = create<BudgetState>()(
    persist(
        (set, get) => ({
            weeklyBudget: null,
            weeklyGiftType: null,
            transactions: [],
            weekStartDate: null,
            lastLoginDate: null,
            lastDailyGiftDate: null,
            trackingStreak: 0,
            quickPresets: DEFAULT_PRESETS,
            weeklyStreak: 0,
            weekHistory: [],
            forceShowSetup: false,
            dismissedPromptWeek: null,

            setupWeek: (budget, giftType) => {
                set({
                    weeklyBudget: budget,
                    weeklyGiftType: giftType,
                    transactions: [],
                    weekStartDate: getWeekStart(),
                    forceShowSetup: false,
                });
            },

            addTransaction: (amount, label, category = 'other') => {
                const newTx: Transaction = {
                    id: safeUUID(),
                    amount,
                    label,
                    date: getEasternDateString(),
                    category,
                };
                set(state => ({ transactions: [newTx, ...state.transactions] }));
            },

            removeTransaction: (id) => {
                set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }));
            },

            addPreset: (preset) => {
                const newPreset: QuickPreset = { ...preset, id: safeUUID() };
                set(state => ({ quickPresets: [...state.quickPresets, newPreset] }));
            },

            removePreset: (id) => {
                set(state => ({ quickPresets: state.quickPresets.filter(p => p.id !== id) }));
            },

            usePreset: (presetId) => {
                const state = get();
                const preset = state.quickPresets.find(p => p.id === presetId);
                if (preset) {
                    state.addTransaction(preset.amount, preset.label, preset.category);
                }
            },

            setForceShowSetup: (show) => set({ forceShowSetup: show }),
            dismissPrompt: () => set({ dismissedPromptWeek: getWeekStart(), forceShowSetup: false }),

            checkAndResetWeek: () => {
                const { weekStartDate, weeklyBudget, weeklyStreak, weekHistory } = get();
                const currentWeek = getWeekStart();
                if (weeklyBudget !== null && weekStartDate !== currentWeek) {
                    const spent = get().getTotalSpent();
                    const underBudget = spent <= weeklyBudget;

                    // Record history (keep last 8 weeks)
                    const newRecord: WeekRecord = {
                        weekStart: weekStartDate || currentWeek,
                        budget: weeklyBudget,
                        spent,
                        underBudget,
                        streakAtTime: weeklyStreak,
                    };
                    const newHistory = [newRecord, ...weekHistory].slice(0, 8);

                    // Update streak
                    const newStreak = underBudget ? weeklyStreak + 1 : 0;

                    if (underBudget) {
                        const giftType = get().weeklyGiftType;
                        if (giftType) {
                            // Streak multiplier: 1 + streak * 0.5 (capped at 4x)
                            const streakMul = Math.min(4, 1 + newStreak * 0.5);
                            const baseAmount = spent <= (weeklyBudget / 2) ? 20 : 10;
                            const amount = Math.floor(baseAmount * streakMul);

                            import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                                const cs = useCurrencyStore.getState();
                                if (giftType === 'shmeckles') cs.addShmeckles(amount);
                                if (giftType === 'balloons') cs.addBalloons(amount);
                                if (giftType === 'sigils') {
                                    import('./useConquestStore').then(({ useConquestStore }) => {
                                        useConquestStore.getState().addSigils(amount);
                                    });
                                }
                            });

                            import('../components/ui/Toast').then(({ useToastStore }) => {
                                useToastStore.getState().addToast({
                                    type: 'success',
                                    message: `🔥 Week Complete! Streak x${newStreak}! +${amount} ${giftType}!`,
                                    duration: 5000,
                                });
                            }).catch(() => {});
                        }
                    }

                    // Reset for the new week
                    set({
                        weeklyBudget: null,
                        weeklyGiftType: null,
                        transactions: [],
                        weekStartDate: null,
                        weeklyStreak: newStreak,
                        weekHistory: newHistory,
                    });
                }
            },

            processDailyLogin: () => {
                get().checkAndResetWeek();

                const { weeklyBudget, weeklyGiftType, lastDailyGiftDate } = get();
                const today = getEasternDateString();

                if (!weeklyBudget || !weeklyGiftType) return;

                if (lastDailyGiftDate === today) return;

                const tierInfo = get().getDailyGiftTier();
                if (tierInfo && tierInfo.giftAmount > 0) {
                    const amount = tierInfo.giftAmount;
                    if (weeklyGiftType === 'shmeckles') {
                        import('./useCurrencyStore').then(m => m.useCurrencyStore.getState().addShmeckles(amount));
                    } else if (weeklyGiftType === 'balloons') {
                        import('./useCurrencyStore').then(m => m.useCurrencyStore.getState().addBalloons(amount));
                    } else if (weeklyGiftType === 'sigils') {
                        import('./useConquestStore').then(m => m.useConquestStore.getState().addSigils(amount));
                    }

                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `Budget Reward: +${amount} ${weeklyGiftType} for staying disciplined!`,
                            duration: 4000
                        });
                    });
                }

                set({ lastDailyGiftDate: today, lastLoginDate: today });
            },

            getTotalSpent: () => {
                return get().transactions.reduce((sum, tx) => sum + tx.amount, 0);
            },

            getSpentByCategory: () => {
                const result: Record<BudgetCategory, number> = {
                    food: 0, coffee: 0, fun: 0, bills: 0,
                    shopping: 0, transport: 0, health: 0, other: 0,
                };
                for (const tx of get().transactions) {
                    const cat = tx.category || 'other';
                    result[cat] = (result[cat] || 0) + tx.amount;
                }
                return result;
            },

            getPowerMultiplier: () => {
                const { weeklyBudget } = get();
                if (!weeklyBudget) return 1.0;

                const spent = get().getTotalSpent();
                let multiplier = 1.5 - (spent / weeklyBudget);
                
                return Math.max(0.75, Math.min(1.5, multiplier));
            },

            getStreakMultiplier: () => {
                return Math.min(4, 1 + get().weeklyStreak * 0.5);
            },

            getDailyGiftTier: () => {
                const { weeklyBudget } = get();
                if (!weeklyBudget) return null;

                const spent = get().getTotalSpent();
                const ratio = spent / weeklyBudget;

                if (ratio <= 0.20) return { tier: 5, requiredSpent: [0, weeklyBudget * 0.20], giftAmount: 5 };
                if (ratio <= 0.40) return { tier: 4, requiredSpent: [weeklyBudget * 0.20, weeklyBudget * 0.40], giftAmount: 4 };
                if (ratio <= 0.60) return { tier: 3, requiredSpent: [weeklyBudget * 0.40, weeklyBudget * 0.60], giftAmount: 3 };
                if (ratio <= 0.80) return { tier: 2, requiredSpent: [weeklyBudget * 0.60, weeklyBudget * 0.80], giftAmount: 2 };
                if (ratio <= 1.00) return { tier: 1, requiredSpent: [weeklyBudget * 0.80, weeklyBudget], giftAmount: 1 };
                
                return { tier: 0, requiredSpent: [weeklyBudget, Infinity], giftAmount: 0 };
            }
        }),
        {
            name: PERSIST_REGISTRY.budget.persistKey,
        }
    )
);
