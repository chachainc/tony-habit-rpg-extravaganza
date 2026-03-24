import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface CurrencyState {
    // Common currency - earned from tasks and battles
    gold: number;

    // Uncommon - for gacha pulls and special items
    tickets: number;

    // Rare - only from daily/weekly completion
    diamonds: number;

    // Combat minigames
    shmeckles: number;

    // Balloon - mirrors shmeckles every time shmeckles are earned
    balloons: number;

    // Skill-bound tokens - earned by leveling skills
    tokens: Record<SkillName, number>;

    // Actions
    addGold: (amount: number, options?: { exact?: boolean }) => void;
    addTickets: (amount: number) => void;
    addDiamonds: (amount: number) => void;
    addShmeckles: (amount: number) => void;
    addBalloons: (amount: number) => void;
    addToken: (skill: SkillName, amount: number) => void;

    spendGold: (amount: number) => boolean;
    spendTickets: (amount: number) => boolean;
    spendDiamonds: (amount: number) => boolean;
    spendShmeckles: (amount: number) => boolean;
    spendBalloons: (amount: number) => boolean;
    spendToken: (skill: SkillName, amount: number) => boolean;

    canAfford: (cost: CurrencyCost) => boolean;
    spendCurrency: (cost: CurrencyCost) => boolean;
}

export interface CurrencyCost {
    gold?: number;
    tickets?: number;
    diamonds?: number;
    shmeckles?: number;
    balloons?: number;
    tokens?: Partial<Record<SkillName, number>>;
}

export const useCurrencyStore = create<CurrencyState>()(
    persist(
        (set, get) => ({
            gold: 0,
            tickets: 0,
            diamonds: 0,
            shmeckles: 0,
            balloons: 0,
            tokens: {
                'Sleep': 0,
                'Hygiene': 0,
                'Flexibility': 0,
                'Strength': 0,
                'Cardio': 0,
                'Work': 0,
                'Health': 0,
                'Social': 0,
                'Luck': 0,
                'Habit': 0,
                'Housemaid': 0,
                'Intelligence': 0,
            },

            addGold: (amount, options) => {
                // Fixed/exact rewards bypass Housemaid bonus and inflation guard
                if (options?.exact || amount <= 0) {
                    set((state) => ({ gold: state.gold + amount }));
                    // Still track lifetime spending if negative
                    if (amount < 0) {
                        import('./useEconomyBalanceStore').then(({ useEconomyBalanceStore }) => {
                            useEconomyBalanceStore.getState().trackGoldSpent(Math.abs(amount));
                        }).catch(() => {});
                    }
                    return;
                }

                // Apply Housemaid Economy Bonus + Inflation Guard to gameplay-earned gold
                import('./useGameStore').then(({ useGameStore }) => {
                    const housemaidLevel = useGameStore.getState().skills['Housemaid']?.level ?? 1;
                    let multiplier = 1 + (housemaidLevel * 0.01); // 1% per level
                    
                    // Level 5 Upgrade: Cleaning Supplies (+2% gold)
                    if (housemaidLevel >= 5) {
                        multiplier += 0.02;
                    }

                    // Apply inflation guard penalty
                    import('./useEconomyBalanceStore').then(({ useEconomyBalanceStore }) => {
                        const econ = useEconomyBalanceStore.getState();
                        const inflationMult = econ.getInflationMultiplier();
                        const finalAmount = Math.max(1, Math.floor(amount * multiplier * inflationMult));
                        set((state) => ({ gold: state.gold + finalAmount }));
                        econ.trackGoldEarned(finalAmount);
                    }).catch(() => {
                        const finalAmount = Math.floor(amount * multiplier);
                        set((state) => ({ gold: state.gold + finalAmount }));
                    });
                }).catch(() => {
                    // Fallback if import fails
                    set((state) => ({ gold: state.gold + amount }));
                });
            },
            addTickets: (amount) => set((state) => ({ tickets: state.tickets + amount })),
            addDiamonds: (amount) => set((state) => ({ diamonds: state.diamonds + amount })),
            // addShmeckles: also grants same amount of Balloons (mirrored)
            addShmeckles: (amount) => set((state) => ({ shmeckles: state.shmeckles + amount, balloons: state.balloons + amount })),
            addBalloons: (amount) => set((state) => ({ balloons: state.balloons + amount })),
            addToken: (skill, amount) => set((state) => ({
                tokens: {
                    ...state.tokens,
                    [skill]: state.tokens[skill] + amount,
                },
            })),

            spendGold: (amount) => {
                const state = get();
                if (state.gold >= amount) {
                    set({ gold: state.gold - amount });
                    return true;
                }
                return false;
            },

            spendTickets: (amount) => {
                const state = get();
                if (state.tickets >= amount) {
                    set({ tickets: state.tickets - amount });
                    return true;
                }
                return false;
            },

            spendDiamonds: (amount) => {
                const state = get();
                if (state.diamonds >= amount) {
                    set({ diamonds: state.diamonds - amount });
                    return true;
                }
                return false;
            },

            spendShmeckles: (amount) => {
                const state = get();
                if (state.shmeckles >= amount) {
                    set({ shmeckles: state.shmeckles - amount });
                    return true;
                }
                return false;
            },

            spendBalloons: (amount) => {
                const state = get();
                if ((state.balloons ?? 0) >= amount) {
                    set({ balloons: (state.balloons ?? 0) - amount });
                    return true;
                }
                return false;
            },

            spendToken: (skill, amount) => {
                const state = get();
                if (state.tokens[skill] >= amount) {
                    set({
                        tokens: {
                            ...state.tokens,
                            [skill]: state.tokens[skill] - amount,
                        },
                    });
                    return true;
                }
                return false;
            },

            canAfford: (cost) => {
                const state = get();

                if (cost.gold && state.gold < cost.gold) return false;
                if (cost.tickets && state.tickets < cost.tickets) return false;
                if (cost.diamonds && state.diamonds < cost.diamonds) return false;
                if (cost.shmeckles && state.shmeckles < cost.shmeckles) return false;
                if (cost.balloons && (state.balloons ?? 0) < cost.balloons) return false;

                if (cost.tokens) {
                    for (const [skill, amount] of Object.entries(cost.tokens)) {
                        if (state.tokens[skill as SkillName] < amount) return false;
                    }
                }

                return true;
            },

            spendCurrency: (cost) => {
                if (!get().canAfford(cost)) return false;

                if (cost.gold) get().spendGold(cost.gold);
                if (cost.tickets) get().spendTickets(cost.tickets);
                if (cost.diamonds) get().spendDiamonds(cost.diamonds);
                if (cost.shmeckles) get().spendShmeckles(cost.shmeckles);
                if (cost.balloons) get().spendBalloons(cost.balloons);

                if (cost.tokens) {
                    for (const [skill, amount] of Object.entries(cost.tokens)) {
                        get().spendToken(skill as SkillName, amount);
                    }
                }

                return true;
            },
        }),
        {
            name: PERSIST_REGISTRY.currency.persistKey, // Reset for economy overhaul
        }
    )
);
