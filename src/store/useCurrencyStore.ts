import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface CurrencyState {
    // Common currency - earned from tasks and battles
    gold: number;

    // Uncommon - for gacha pulls and special items
    tickets: number;

    // Rare/Premium - only from daily/weekly completion
    gems: number;

    // Skill-bound tokens - earned by leveling skills
    tokens: Record<SkillName, number>;

    // Actions
    addGold: (amount: number, options?: { exact?: boolean }) => void;
    addTickets: (amount: number) => void;
    addGems: (amount: number) => void;
    addToken: (skill: SkillName, amount: number) => void;

    spendGold: (amount: number) => boolean;
    spendTickets: (amount: number) => boolean;
    spendGems: (amount: number) => boolean;
    spendToken: (skill: SkillName, amount: number) => boolean;

    canAfford: (cost: CurrencyCost) => boolean;
    spendCurrency: (cost: CurrencyCost) => boolean;
}

export interface CurrencyCost {
    gold?: number;
    tickets?: number;
    gems?: number;
    tokens?: Partial<Record<SkillName, number>>;
}

export const useCurrencyStore = create<CurrencyState>()(
    persist(
        (set, get) => ({
            gold: 0,
            tickets: 0,
            gems: 0,
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
                const processGoldAddition = (finalGold: number) => {
                    Promise.all([
                        import('./usePetStore'),
                        import('./useBudgetStore')
                    ]).then(([{ usePetStore }, { useBudgetStore }]) => {
                        let totalAmount = finalGold;
                        if (amount > 0) {
                            const petStore = usePetStore.getState();
                            const petDef = petStore.getEquippedPetDef();
                            
                            if (petDef?.passive?.type === 'gold_percent' && typeof petDef.passive.value === 'number') {
                                const goldBonusPercent = petDef.passive.value / 100;
                                totalAmount += Math.floor(amount * goldBonusPercent);
                            }
                            
                            // Apply gamble chance to double gold if pet has it
                            if (petDef?.passive?.type === 'gold_double_chance' && typeof petDef.passive.value === 'number') {
                                if (Math.random() * 100 < petDef.passive.value) {
                                    totalAmount *= 2;
                                }
                            }

                            // Jackpot Mult
                            if (petDef?.passive?.type === 'jackpot_multiplier' && typeof petDef.passive.value === 'object') {
                                const chance = petDef.passive.value.rewardMultiplierChance || 12;
                                if (Math.random() * 100 < chance) {
                                    totalAmount *= (petDef.passive.value.rewardMultiplier || 3);
                                    import('../components/ui/Toast').then(({ useToastStore }) => {
                                        useToastStore.getState().addToast({ message: '🎰 JACKPOT! Gold MULTIPLIED!', type: 'success' });
                                    });
                                }
                            }
                            if (petDef?.passive?.type === 'treasure_hoof' && typeof petDef.passive.value === 'object') {
                                const goldBonusPercent = (petDef.passive.value.goldPct || 0) / 100;
                                totalAmount += Math.floor(amount * goldBonusPercent) + (petDef.passive.value.flatGold || 0);
                            }

                            // Weekly Budget Gold Bonus (+20%)
                            const bState = useBudgetStore.getState();
                            const spent = bState.getTotalSpent();
                            const limit = bState.budget?.amount ?? 0;
                            if (bState.weeklyGiftType === 'gold_bonus' && spent <= limit && limit > 0) {
                                totalAmount += Math.floor(amount * 0.20);
                            }
                        }

                        // Apply the gold
                        set((state) => ({ gold: state.gold + totalAmount }));

                        // Handle tracking
                        if (amount < 0) {
                            import('./useEconomyBalanceStore').then(({ useEconomyBalanceStore }) => {
                                useEconomyBalanceStore.getState().trackGoldSpent(Math.abs(amount));
                            }).catch(() => {});
                        } else if (amount > 0 && !options?.exact) {
                            import('./useEconomyBalanceStore').then(({ useEconomyBalanceStore }) => {
                                useEconomyBalanceStore.getState().trackGoldEarned(totalAmount);
                            }).catch(() => {});
                        }
                    }).catch(() => {
                        // Fallback if import fails
                        set((state) => ({ gold: state.gold + finalGold }));
                    });
                };

                // Fixed/exact rewards bypass Housemaid bonus and inflation guard
                if (options?.exact || amount <= 0) {
                    processGoldAddition(amount);
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
                        processGoldAddition(finalAmount);
                    }).catch(() => {
                        const finalAmount = Math.floor(amount * multiplier);
                        processGoldAddition(finalAmount);
                    });
                }).catch(() => {
                    processGoldAddition(amount);
                });
            },
            addTickets: (amount) => set((state) => ({ tickets: state.tickets + amount })),
            addGems: (amount) => set((state) => ({ gems: state.gems + amount })),
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

            spendGems: (amount) => {
                const state = get();
                if (state.gems >= amount) {
                    set({ gems: state.gems - amount });
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
                if (cost.gems && state.gems < cost.gems) return false;

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
                if (cost.gems) get().spendGems(cost.gems);

                if (cost.tokens) {
                    for (const [skill, amount] of Object.entries(cost.tokens)) {
                        get().spendToken(skill as SkillName, amount);
                    }
                }

                return true;
            },
        }),
        {
            name: PERSIST_REGISTRY.currency.persistKey,
            version: 3,
            migrate: (persistedState: any, fromVersion: number) => {
                if (fromVersion < 3) {
                    // Migration: convert removed currencies to gold, rename diamonds → gems
                    const oldShmeckles = persistedState.shmeckles ?? 0;
                    const oldBalloons = persistedState.balloons ?? 0;
                    const oldDiamonds = persistedState.diamonds ?? 0;
                    const oldGems = persistedState.gems ?? 0;
                    return {
                        ...persistedState,
                        gold: (persistedState.gold ?? 0) + (oldShmeckles * 5) + (oldBalloons * 5),
                        gems: oldGems + oldDiamonds,
                        // Remove old fields
                        shmeckles: undefined,
                        balloons: undefined,
                        diamonds: undefined,
                    };
                }
                return persistedState;
            },
        }
    )
);
