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
    budget: { amount: number, weekId: string } | null;
    weeklyGiftType: GiftCurrency | null;
    transactions: Transaction[];
    lastLoginDate: string | null;
    lastBudgetGiftClaimDate: string | null;
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

    // New: Money Tracking Rewards
    rewardedMoneyLogCountToday: number;
    moneyTrackingGoldEarnedToday: number;
    zeroSpendClaimedToday: boolean;
    lastMoneyTrackingResetDate: string | null;

    // Credit Card Bill Day
    creditCardResetDay: number | null;

    // Actions
    setupWeek: (budget: number, giftType: GiftCurrency) => void;
    setCreditCardResetDay: (day: number | null) => void;
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
    checkMoneyTrackingReset: () => void;
    getMoneyTrackingRewardEligibility: (amount: number) => { eligible: boolean, reason?: string, rewardAmount: number };
}

// Helpers
export const getEasternDateString = (): string => {
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

export const getCurrentWeekId = (): string => {
    const now = new Date();
    // Force to UTC to avoid timezone jumping daily
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    // Week starts on Monday
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
};

export const useBudgetStore = create<BudgetState>()(
    persist(
        (set, get) => ({
            budget: null,
            weeklyGiftType: null,
            transactions: [],
            lastLoginDate: null,
            lastBudgetGiftClaimDate: null,
            trackingStreak: 0,
            quickPresets: DEFAULT_PRESETS,
            weeklyStreak: 0,
            weekHistory: [],
            forceShowSetup: false,
            dismissedPromptWeek: null,
            rewardedMoneyLogCountToday: 0,
            moneyTrackingGoldEarnedToday: 0,
            zeroSpendClaimedToday: false,
            lastMoneyTrackingResetDate: null,
            creditCardResetDay: null,

            setCreditCardResetDay: (day) => set({ creditCardResetDay: day }),

            setupWeek: (amount, giftType) => {
                set({
                    budget: { amount, weekId: getCurrentWeekId() },
                    weeklyGiftType: giftType,
                    transactions: [],
                    forceShowSetup: false,
                });
            },

            addTransaction: (amount, label, category = 'other') => {
                const { eligible, rewardAmount, reason } = get().getMoneyTrackingRewardEligibility(amount);

                if (eligible) {
                    import('./useCurrencyStore').then(m => m.useCurrencyStore.getState().addGold(rewardAmount));
                    import('../components/ui/Toast').then(m => m.useToastStore.getState().addToast({ type: 'success', message: `+${rewardAmount} Gold`, duration: 3000 }));
                    
                    set(state => ({
                        rewardedMoneyLogCountToday: amount > 0 ? state.rewardedMoneyLogCountToday + 1 : state.rewardedMoneyLogCountToday,
                        moneyTrackingGoldEarnedToday: state.moneyTrackingGoldEarnedToday + rewardAmount,
                        zeroSpendClaimedToday: amount === 0 ? true : state.zeroSpendClaimedToday,
                    }));
                } else if (reason) {
                    import('../components/ui/Toast').then(m => m.useToastStore.getState().addToast({ type: 'warning', message: reason, duration: 3000 }));
                }

                if (amount > 0) {
                    const newTx: Transaction = {
                        id: safeUUID(),
                        amount,
                        label,
                        date: getEasternDateString(),
                        category,
                    };
                    set(state => ({ transactions: [newTx, ...state.transactions] }));
                }
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
            dismissPrompt: () => set({ dismissedPromptWeek: getCurrentWeekId(), forceShowSetup: false }),

            checkAndResetWeek: () => {
                const { budget, weeklyStreak, weekHistory } = get();
                const currentWeek = getCurrentWeekId();
                if (budget !== null && budget.weekId !== currentWeek) {
                    const spent = get().getTotalSpent();
                    const underBudget = spent <= budget.amount;

                    // Record history (keep last 8 weeks)
                    const newRecord: WeekRecord = {
                        weekStart: budget.weekId,
                        budget: budget.amount,
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
                            const baseAmount = spent <= (budget.amount / 2) ? 20 : 10;
                            let amount = Math.floor(baseAmount * streakMul);

                            if (giftType === 'sigils') {
                                // Scale sigils linearly but much smaller: week 1 = 1, week 2+ = 2 to 3 max
                                // Apply hard clamp protection
                                const scaledSigils = newStreak === 1 ? 1 : Math.min(3, newStreak);
                                amount = Math.min(scaledSigils, 3);
                            }

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
                                    message: `🔥 Weekly Streak Complete! Streak x${newStreak}! Reward: +${amount} ${giftType}`,
                                    duration: 5000,
                                });
                            }).catch(() => {});
                        }
                    }

                    // Reset for the new week
                    set({
                        budget: null,
                        weeklyGiftType: null,
                        transactions: [],
                        weeklyStreak: newStreak,
                        weekHistory: newHistory,
                    });
                }
            },

            processDailyLogin: () => {
                get().checkAndResetWeek();

                const { budget, weeklyGiftType, lastBudgetGiftClaimDate } = get();
                const today = getEasternDateString();

                if (!budget || !weeklyGiftType) return;

                if (lastBudgetGiftClaimDate === today) return;

                const tierInfo = get().getDailyGiftTier();
                if (tierInfo && tierInfo.giftAmount > 0) {
                    let amount = tierInfo.giftAmount;
                    if (weeklyGiftType === 'sigils') {
                        // Hard clamp for daily sigil delivery
                        amount = Math.min(Math.floor(amount / 2) || 1, 3);
                    }

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

                set({ lastBudgetGiftClaimDate: today, lastLoginDate: today });
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
                const { budget } = get();
                if (!budget) return 1.0;

                const spent = get().getTotalSpent();
                let multiplier = 1.5 - (spent / budget.amount);
                
                return Math.max(0.75, Math.min(1.5, multiplier));
            },

            getStreakMultiplier: () => {
                return Math.min(4, 1 + get().weeklyStreak * 0.5);
            },

            checkMoneyTrackingReset: () => {
                const today = getEasternDateString();
                if (get().lastMoneyTrackingResetDate !== today) {
                    set({
                        lastMoneyTrackingResetDate: today,
                        rewardedMoneyLogCountToday: 0,
                        moneyTrackingGoldEarnedToday: 0,
                        zeroSpendClaimedToday: false,
                    });
                }
            },

            getMoneyTrackingRewardEligibility: (amount: number) => {
                get().checkMoneyTrackingReset();
                const state = get();

                if (state.zeroSpendClaimedToday) {
                    return { eligible: false, reason: 'You already claimed the $0 daily bonus.', rewardAmount: 0 };
                }

                if (state.moneyTrackingGoldEarnedToday >= 100) {
                    return { eligible: false, reason: 'Daily money tracking reward max reached.', rewardAmount: 0 };
                }

                if (amount === 0) {
                    if (state.rewardedMoneyLogCountToday > 0) {
                        return { eligible: false, reason: 'You already logged spending today, so the $0 daily bonus is unavailable.', rewardAmount: 0 };
                    }
                    return { eligible: true, rewardAmount: 100 };
                }

                if (amount > 0) {
                    if (state.rewardedMoneyLogCountToday >= 5) {
                        return { eligible: false, reason: 'Money tracking tasks maxed out for today (5/5).', rewardAmount: 0 };
                    }
                    return { eligible: true, rewardAmount: 20 };
                }

                return { eligible: false, rewardAmount: 0 };
            },

            getDailyGiftTier: () => {
                const { budget } = get();
                if (!budget) return null;

                const spent = get().getTotalSpent();
                const amt = budget.amount;
                const ratio = spent / amt;

                if (ratio <= 0.20) return { tier: 5, requiredSpent: [0, amt * 0.20], giftAmount: 5 };
                if (ratio <= 0.40) return { tier: 4, requiredSpent: [amt * 0.20, amt * 0.40], giftAmount: 4 };
                if (ratio <= 0.60) return { tier: 3, requiredSpent: [amt * 0.40, amt * 0.60], giftAmount: 3 };
                if (ratio <= 0.80) return { tier: 2, requiredSpent: [amt * 0.60, amt * 0.80], giftAmount: 2 };
                if (ratio <= 1.00) return { tier: 1, requiredSpent: [amt * 0.80, amt], giftAmount: 1 };
                
                return { tier: 0, requiredSpent: [amt, Infinity], giftAmount: 0 };
            }
        }),
        {
            name: PERSIST_REGISTRY.budget.persistKey,
        }
    )
);
