import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type BundleType = 'morning' | 'afternoon' | 'night';

export interface TaskReward {
    skillId: SkillName;
    xp: number;
}

export interface RecurringTask {
    id: string;
    title: string;
    bundle?: BundleType;
    type: 'daily' | 'weekly';
    completed: boolean;

    // Rewards
    rewards: TaskReward[];

    // Completion Logic
    requiresInput?: 'weight' | 'training';
    conditional?: {
        days?: number[]; // 0=Sun, 1=Mon...
    };
}

export interface WeightEntry {
    date: string;
    weight: number;
}

interface RecurringTasksState {
    dailyTasks: RecurringTask[];
    weeklyTasks: RecurringTask[];
    lastDailyReset: string | null;
    lastWeeklyReset: string | null;
    weightHistory: WeightEntry[];

    // Bundle Claims
    morningBundleClaimed: boolean;
    afternoonBundleClaimed: boolean;
    nightBundleClaimed: boolean;
    perfectDayClaimed: boolean;

    weeklyBonusClaimed: boolean;
    customRecurringTasks: RecurringTask[];
    removedTaskIds: string[];

    // Workout tracking (1 lift/day, 1 cardio/day)
    lastLiftDate: string | null;
    lastCardioDate: string | null;

    // Actions
    completeTask: (id: string, inputData?: { weight?: number, trainingSelections?: string[] }) => void;

    resetDailyTasks: () => void;
    resetWeeklyTasks: () => void;
    checkAndReset: () => void;

    getBundleStatus: (bundle: BundleType) => { completedCount: number; totalCount: number; isComplete: boolean; isClaimed: boolean };
    claimBundleReward: (bundle: BundleType) => void;
    claimPerfectDayBonus: () => void;
    isWeeklyComplete: () => boolean;
    claimWeeklyBonus: () => void;

    addCustomRecurringTask: (title: string, bundle: BundleType, rewards: TaskReward[]) => void;
    removeDailyTask: (id: string) => void;
    editDailyTask: (id: string, newTitle: string) => void;

    // Weight helpers
    getTodayWeight: () => number | null;
}

// Get current date in Eastern Time
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

// Get current Day of Week (0=Sun, etc)
const getEasternDayOfWeek = (): number => {
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return eastern.getDay();
};

// Get start of week (Sunday) in Eastern Time
const getWeekStart = (): string => {
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = eastern.getDay();
    const diff = eastern.getDate() - day;
    const sunday = new Date(eastern.setDate(diff));
    return sunday.toISOString().split('T')[0];
};

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

export const DAILY_TASKS_TEMPLATE: Omit<RecurringTask, 'completed'>[] = [
    // ══ MORNING FOUNDATION ═════════════════════════════════════════════════
    {
        id: 'weigh_self',
        title: 'Weigh Self',
        bundle: 'morning',
        type: 'daily',
        requiresInput: 'weight',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'brush_and_floss',
        title: 'Brush / Floss / Face Wash',
        bundle: 'morning',
        type: 'daily',
        rewards: [{ skillId: 'Hygiene', xp: 3 }],
    },
    {
        id: 'take_supplements',
        title: 'Take Supplements',
        bundle: 'morning',
        type: 'daily',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'water_morning',
        title: 'Drink 30oz Water',
        bundle: 'morning',
        type: 'daily',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'make_bed',
        title: 'Make your bed',
        bundle: 'morning',
        type: 'daily',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },

    // ══ AFTERNOON PERFORMANCE ══════════════════════════════════════════════
    {
        id: 'training_session',
        title: 'Training Session',
        bundle: 'afternoon',
        type: 'daily',
        requiresInput: 'training',
        rewards: [],
    },
    {
        id: 'creatine_fiber',
        title: 'Creatine + 30oz Water + Fiber',
        bundle: 'afternoon',
        type: 'daily',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'no_coffee',
        title: 'No Coffee After 12pm',
        bundle: 'afternoon',
        type: 'daily',
        rewards: [
            { skillId: 'Habit', xp: 2 }
        ],
    },
    {
        id: 'charge_devices',
        title: 'Charge Phone / Oura / Headphones',
        bundle: 'afternoon',
        type: 'daily',
        rewards: [{ skillId: 'Habit', xp: 1 }],
    },
    {
        id: 'after_work_calls',
        title: 'After-Work Calls or Appointments (if any)',
        bundle: 'afternoon',
        type: 'daily',
        rewards: [{ skillId: 'Work', xp: 2 }],
    },
    {
        id: 'tongue_exercises',
        title: 'Tongue Exercises',
        bundle: 'afternoon',
        type: 'daily',
        rewards: [
            { skillId: 'Health', xp: 2 },
            { skillId: 'Habit', xp: 1 },
            { skillId: 'Flexibility', xp: 2 }
        ],
    },

    // ══ NIGHT SHUTDOWN ═════════════════════════════════════════════════════
    {
        id: 'allergy_shots',
        title: 'Allergy Shots (if needed)',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'laundry_organize',
        title: 'Laundry / Put Away / Organize',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'water_night',
        title: 'Drink 30oz Water',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'clean_bottles',
        title: 'Clean Water Bottles',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'night_routine_hygiene',
        title: 'Brush / Floss / Face Wash',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Hygiene', xp: 2 }],
    },
    {
        id: 'reach_out_social',
        title: 'Reach out to friends and family and spread positivity',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Social', xp: 5 }],
    },
    {
        id: 'inbox_zero',
        title: 'Inbox Zero (Emails + Texts)',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Work', xp: 2 }],
    },
    {
        id: 'tidy_desk',
        title: 'Tidy Desk',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'check_finances',
        title: 'Check finances + track daily money spent',
        bundle: 'night',
        type: 'daily',
        rewards: [
            { skillId: 'Habit', xp: 1 }
        ],
    },
    {
        id: 'hip_stretches',
        title: 'Hip Stretches',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Flexibility', xp: 2 }],
    },
    {
        id: 'ate_protein_160g',
        title: 'Ate 160+ Grams of Protein',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Strength', xp: 2 }],
    },
    {
        id: 'ate_under_2200_cal',
        title: 'Ate Less Than 2200 Calories',
        bundle: 'night',
        type: 'daily',
        rewards: [
            { skillId: 'Health', xp: 1 },
            { skillId: 'Cardio', xp: 1 },
            { skillId: 'Sleep', xp: 1 }
        ],
    },
    {
        id: 'take_magnesium',
        title: 'Take Magnesium',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Sleep', xp: 1 }],
    },
    {
        id: 'read_10_min',
        title: 'Read 10 Minutes',
        bundle: 'night',
        type: 'daily',
        rewards: [{ skillId: 'Intelligence', xp: 4 }],
    },
    {
        id: 'charge_wear_oura',
        title: 'Charge Phone + Wear Oura Ring',
        bundle: 'night',
        type: 'daily',
        rewards: [
            { skillId: 'Habit', xp: 1 }
        ],
    },
    {
        id: 'clean_pillow_cpap',
        title: 'Use CPAP',
        bundle: 'night',
        type: 'daily',
        rewards: [
            { skillId: 'Sleep', xp: 3 }
        ],
    },
];

// Predefined weekly tasks
const WEEKLY_TASKS_TEMPLATE: Omit<RecurringTask, 'completed'>[] = [
    {
        id: 'weekly-bathroom',
        title: 'Deep Clean Bathroom',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 4 }],
    },
    {
        id: 'weekly-car',
        title: 'Clean Out Car',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 4 }],
    },
    {
        id: 'weekly-cpap',
        title: 'Deep Clean CPAP Machine',
        type: 'weekly',
        rewards: [{ skillId: 'Health', xp: 7 }],
    },
    {
        id: 'weekly-pills',
        title: 'Fill Pill Planner',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 1 }],
    },
];

export const useRecurringTasksStore = create<RecurringTasksState>()(
    persist(
        (set, get) => ({
            dailyTasks: [],
            weeklyTasks: [],
            lastDailyReset: null,
            lastWeeklyReset: null,
            weightHistory: [],

            morningBundleClaimed: false,
            afternoonBundleClaimed: false,
            nightBundleClaimed: false,
            perfectDayClaimed: false,
            weeklyBonusClaimed: false,
            customRecurringTasks: [],
            removedTaskIds: [],
            lastLiftDate: null,
            lastCardioDate: null,

            getTodayWeight: () => {
                const today = getEasternDateString();
                const { weightHistory } = get();
                return weightHistory.find(e => e.date === today)?.weight ?? null;
            },

            completeTask: (id, inputData) => {
                set((state) => {
                    // Try Daily
                    const dailyIndex = state.dailyTasks.findIndex(t => t.id === id);
                    if (dailyIndex !== -1) {
                        const newTasks = [...state.dailyTasks];
                        const task = newTasks[dailyIndex];
                        newTasks[dailyIndex] = { ...task, completed: true };

                        let newWeightHistory = [...state.weightHistory];
                        if (inputData?.weight) {
                            const today = getEasternDateString();
                            // Update today's entry if already exists, else push
                            const idx = newWeightHistory.findIndex(e => e.date === today);
                            if (idx !== -1) {
                                newWeightHistory[idx] = { date: today, weight: inputData.weight };
                            } else {
                                newWeightHistory.push({ date: today, weight: inputData.weight });
                            }
                        }

                        // Handle XP Awards with daily cap enforcement
                        const rewardsToGrant: TaskReward[] = [...task.rewards];

                        // Handle Training Logic (with workout block)
                        if (task.id === 'training_session' && inputData?.trainingSelections) {
                            const today = getEasternDateString();
                            const { lastLiftDate, lastCardioDate } = get();
                            const blockedMessages: string[] = [];

                            inputData.trainingSelections.forEach(sel => {
                                if (sel === 'gym') {
                                    if (lastLiftDate === today) {
                                        blockedMessages.push('Lift already logged today (1/day limit)');
                                    } else {
                                        rewardsToGrant.push({ skillId: 'Strength', xp: 3 });
                                        set({ lastLiftDate: today });
                                    }
                                }
                                if (sel === 'insanity' || sel === 'cardio') {
                                    if (lastCardioDate === today) {
                                        blockedMessages.push('Cardio already logged today (1/day limit)');
                                    } else {
                                        rewardsToGrant.push({ skillId: 'Cardio', xp: 3 });
                                        set({ lastCardioDate: today });
                                    }
                                }
                            });

                            if (blockedMessages.length > 0) {
                                import('../components/ui/Toast').then(({ useToastStore }) => {
                                    blockedMessages.forEach(msg => useToastStore.getState().addToast({ type: 'warning', message: msg }));
                                }).catch(() => {});
                            }
                        }

                        import('./useGameStore').then(({ useGameStore }) => {
                            const gameStore = useGameStore.getState();
                            rewardsToGrant.forEach(r => {
                                const result = gameStore.addSkillXp(r.skillId as import('./useGameStore').SkillName, r.xp);
                                if (result?.capHit) {
                                    // Show cap feedback
                                    import('../components/ui/Toast').then(({ useToastStore }) => {
                                        useToastStore.getState().addToast({ type: 'warning', message: `Daily XP cap reached for ${r.skillId}` });
                                    }).catch(() => {});
                                }
                                // Award book on Intelligence XP
                                if (r.skillId === 'Intelligence') {
                                    import('./useInventoryStore').then(({ useInventoryStore }) => {
                                        useInventoryStore.getState().addItem('fantasy_book_1', 1);
                                    });
                                }
                            });
                        });

                        if (id === 'read_10_min') {
                            import('./useTraitStore').then(({ useTraitStore: ts }) => {
                                ts.getState().logHabitCompletion('reading');
                            }).catch(() => {});
                        }

                        if (id === 'check_finances') {
                            import('./useBudgetStore').then(({ useBudgetStore: bs }) => {
                                const bState = bs.getState();
                                const newStreak = bState.trackingStreak + 1;
                                bs.setState({ trackingStreak: newStreak });
                                
                                if (newStreak > 0 && newStreak % 7 === 0) {
                                    // 7-day streak reward!
                                    const giftType = bState.weeklyGiftType;
                                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                                        const msg = `7-Day Finance Tracking Streak!`;
                                        if (giftType === 'shmeckles') {
                                            useCurrencyStore.getState().addShmeckles(3);
                                            import('../components/ui/Toast').then(({ useToastStore }) => {
                                                useToastStore.getState().addToast({ type: 'success', message: `${msg} +3 Shmeckles`, duration: 4000 });
                                            });
                                        } else if (giftType === 'balloons') {
                                            useCurrencyStore.getState().addBalloons(10);
                                            import('../components/ui/Toast').then(({ useToastStore }) => {
                                                useToastStore.getState().addToast({ type: 'success', message: `${msg} +10 Balloons`, duration: 4000 });
                                            });
                                        } else if (giftType === 'sigils') {
                                            import('./useConquestStore').then(({ useConquestStore }) => {
                                                useConquestStore.getState().addSigils(1);
                                                import('../components/ui/Toast').then(({ useToastStore }) => {
                                                    useToastStore.getState().addToast({ type: 'success', message: `${msg} +1 Sigil`, duration: 4000 });
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        }

                        return { dailyTasks: newTasks, weightHistory: newWeightHistory };
                    }

                    // Try Weekly
                    const weeklyIndex = state.weeklyTasks.findIndex(t => t.id === id);
                    if (weeklyIndex !== -1) {
                        const newTasks = [...state.weeklyTasks];
                        newTasks[weeklyIndex] = { ...newTasks[weeklyIndex], completed: true };

                        import('./useGameStore').then(({ useGameStore }) => {
                            newTasks[weeklyIndex].rewards.forEach(r => {
                                useGameStore.getState().addSkillXp(r.skillId, r.xp, { capExempt: true });
                                // New Onboarding rules: Award a lvl 1 book whenever gaining Intelligence XP
                                if (r.skillId === 'Intelligence') {
                                    import('./useInventoryStore').then(({ useInventoryStore }) => {
                                        useInventoryStore.getState().addItem('fantasy_book_1', 1);
                                    });
                                }
                            });
                        });

                        return { weeklyTasks: newTasks };
                    }

                    return {};
                });
            },

            resetDailyTasks: () => {
                const todayDow = getEasternDayOfWeek();
                const { customRecurringTasks, removedTaskIds } = get();

                const baseTasks = DAILY_TASKS_TEMPLATE.filter(t => !removedTaskIds.includes(t.id));

                const todaysTasks = [...baseTasks, ...customRecurringTasks]
                    .filter(t => {
                        if (!t.conditional) return true;
                        return t.conditional.days?.includes(todayDow);
                    })
                    .map(t => ({ ...t, completed: false }));

                set({
                    dailyTasks: todaysTasks,
                    lastDailyReset: getEasternDateString(),
                    morningBundleClaimed: false,
                    afternoonBundleClaimed: false,
                    nightBundleClaimed: false,
                    perfectDayClaimed: false,
                });
            },

            addCustomRecurringTask: (title, bundle, rewards) => {
                const newTask: RecurringTask = {
                    id: `custom-${safeUUID()}`,
                    title,
                    bundle,
                    type: 'daily',
                    completed: false,
                    rewards,
                };
                set(state => ({
                    customRecurringTasks: [...state.customRecurringTasks, newTask],
                    dailyTasks: [...state.dailyTasks, newTask]
                }));
            },

            removeDailyTask: (id) => {
                set(state => {
                    const isCustom = id.startsWith('custom-');
                    const newRemovedIds = isCustom ? state.removedTaskIds : [...state.removedTaskIds, id];
                    const newCustomTasks = isCustom
                        ? state.customRecurringTasks.filter(t => t.id !== id)
                        : state.customRecurringTasks;

                    return {
                        removedTaskIds: newRemovedIds,
                        customRecurringTasks: newCustomTasks,
                        dailyTasks: state.dailyTasks.filter(t => t.id !== id)
                    };
                });
            },

            editDailyTask: (id, newTitle) => {
                set(state => ({
                    dailyTasks: state.dailyTasks.map(t =>
                        t.id === id ? { ...t, title: newTitle } : t
                    ),
                    customRecurringTasks: state.customRecurringTasks.map(t =>
                        t.id === id ? { ...t, title: newTitle } : t
                    ),
                }));
            },

            resetWeeklyTasks: () => {
                set({
                    weeklyTasks: WEEKLY_TASKS_TEMPLATE.map(t => ({ ...t, completed: false })),
                    lastWeeklyReset: getWeekStart(),
                    weeklyBonusClaimed: false,
                });
            },

            checkAndReset: () => {
                const today = getEasternDateString();
                const thisWeek = getWeekStart();
                const state = get();

                if (state.lastDailyReset !== today) {
                    get().resetDailyTasks();
                }

                if (state.lastWeeklyReset !== thisWeek) {
                    get().resetWeeklyTasks();
                }

                if (state.dailyTasks.length === 0) {
                    get().resetDailyTasks();
                }
            },

            getBundleStatus: (bundle) => {
                const state = get();
                const tasks = state.dailyTasks.filter(t => t.bundle === bundle);
                const completedCount = tasks.filter(t => t.completed).length;
                const totalCount = tasks.length;

                let isClaimed = false;
                if (bundle === 'morning') isClaimed = state.morningBundleClaimed;
                if (bundle === 'afternoon') isClaimed = state.afternoonBundleClaimed;
                if (bundle === 'night') isClaimed = state.nightBundleClaimed;

                return {
                    completedCount,
                    totalCount,
                    isComplete: totalCount > 0 && completedCount === totalCount,
                    isClaimed
                };
            },

            claimBundleReward: (bundle) => {
                const state = get();
                const status = state.getBundleStatus(bundle);

                if (status.isComplete && !status.isClaimed) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(25);
                    });

                    if (bundle === 'morning') set({ morningBundleClaimed: true });
                    if (bundle === 'afternoon') set({ afternoonBundleClaimed: true });
                    if (bundle === 'night') set({ nightBundleClaimed: true });
                }
            },

            claimPerfectDayBonus: () => {
                const state = get();
                const m = state.getBundleStatus('morning');
                const a = state.getBundleStatus('afternoon');
                const n = state.getBundleStatus('night');

                if (m.isComplete && a.isComplete && n.isComplete && !state.perfectDayClaimed) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(75);
                    });
                    set({ perfectDayClaimed: true });
                }
            },

            isWeeklyComplete: () => {
                const { weeklyTasks } = get();
                return weeklyTasks.every(t => t.completed);
            },

            claimWeeklyBonus: () => {
                const state = get();
                const isComplete = state.weeklyTasks.every(t => t.completed);
                if (isComplete && !state.weeklyBonusClaimed) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        const currency = useCurrencyStore.getState();
                        currency.addGold(200);
                        currency.addShmeckles(3);
                        currency.addDiamonds(1);
                    });
                    import('./useConquestStore').then(({ useConquestStore }) => {
                        useConquestStore.getState().addSigils(3);
                    });
                    set({ weeklyBonusClaimed: true });
                }
            },
        }),
        {
            name: PERSIST_REGISTRY.recurringTasks.persistKey,
            version: 4, // Bumped: new night tasks + adjusted rewards
        }
    )
);
