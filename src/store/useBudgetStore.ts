import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type GiftCurrency = 'shmeckles' | 'balloons' | 'sigils';

export interface Transaction {
    id: string;
    amount: number;
    label: string;
    date: string;
}

interface BudgetState {
    weeklyBudget: number | null;
    weeklyGiftType: GiftCurrency | null;
    transactions: Transaction[];
    weekStartDate: string | null;
    lastLoginDate: string | null;
    lastDailyGiftDate: string | null;
    trackingStreak: number;

    // Actions
    setupWeek: (budget: number, giftType: GiftCurrency) => void;
    addTransaction: (amount: number, label: string) => void;
    removeTransaction: (id: string) => void;
    checkAndResetWeek: () => void;
    processDailyLogin: () => void;

    // Computeds
    getTotalSpent: () => number;
    getPowerMultiplier: () => number;
    getDailyGiftTier: () => { tier: number, requiredSpent: [number, number], giftAmount: number } | null;
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

            setupWeek: (budget, giftType) => {
                set({
                    weeklyBudget: budget,
                    weeklyGiftType: giftType,
                    transactions: [],
                    weekStartDate: getWeekStart(),
                    // Optionally reset streak or keep it rolling. Weekly setup resets week but not streak.
                });
            },

            addTransaction: (amount, label) => {
                const newTx: Transaction = {
                    id: safeUUID(),
                    amount,
                    label,
                    date: getEasternDateString()
                };
                set(state => ({ transactions: [newTx, ...state.transactions] }));
            },

            removeTransaction: (id) => {
                set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }));
            },

            checkAndResetWeek: () => {
                const { weekStartDate, weeklyBudget } = get();
                const currentWeek = getWeekStart();
                if (weeklyBudget !== null && weekStartDate !== currentWeek) {
                    // It's a new week. We could grant a weekly chest here if under budget.
                    const spent = get().getTotalSpent();
                    if (spent <= weeklyBudget) {
                        // Under budget! Award 10 gifts
                        const giftType = get().weeklyGiftType;
                        if (giftType) {
                            import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                                const cs = useCurrencyStore.getState();
                                const amount = spent <= (weeklyBudget / 2) ? 20 : 10;
                                if (giftType === 'shmeckles') cs.addShmeckles(amount);
                                if (giftType === 'balloons') cs.addBalloons(amount);
                                if (giftType === 'sigils') {
                                    import('./useConquestStore').then(({ useConquestStore }) => {
                                        useConquestStore.getState().addSigils(amount);
                                    });
                                }
                            });
                        }
                    }

                    // Reset for the new week
                    set({
                        weeklyBudget: null,
                        weeklyGiftType: null,
                        transactions: [],
                        weekStartDate: null,
                    });
                }
            },

            processDailyLogin: () => {
                get().checkAndResetWeek();

                const { weeklyBudget, weeklyGiftType, lastDailyGiftDate } = get();
                const today = getEasternDateString();

                if (!weeklyBudget || !weeklyGiftType) return; // No active budget setup

                if (lastDailyGiftDate === today) return; // Already claimed today

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

            getPowerMultiplier: () => {
                const { weeklyBudget } = get();
                if (!weeklyBudget) return 1.0; // No active budget = no buff, but no penalty. Alternatively could be 1.0

                const spent = get().getTotalSpent();
                let multiplier = 1.5 - (spent / weeklyBudget);
                
                // Clamp between 0.75 and 1.5
                return Math.max(0.75, Math.min(1.5, multiplier));
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
