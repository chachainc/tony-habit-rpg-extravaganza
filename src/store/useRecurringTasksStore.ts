import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type BundleType = 'morning' | 'midday' | 'afternoon' | 'night';

export interface TaskReward {
    skillId: SkillName;
    xp: number;
}

export type TaskCategory = 'health' | 'hygiene' | 'fitness' | 'work' | 'lifestyle';

export type RecurrenceType = 'one-time' | 'daily' | 'weekly' | 'custom';

export interface RecurringTask {
    id: string;
    title: string;
    bundle?: BundleType;
    recurrenceType: RecurrenceType;
    activeDays?: number[]; // 0=Sun ... 6=Sat
    createdAt?: number;
    completed: boolean;
    category?: TaskCategory;

    // Legacy support to be deprecated
    type?: 'daily' | 'weekly';

    // Rewards (for standard tasks)
    rewards: TaskReward[];

    // Tiered options (for grouped tasks)
    tiers?: {
        id: string;
        title: string;
        rewards: TaskReward[];
    }[];
    selectedTier?: string | null;

    // Completion Logic
    requiresInput?: 'weight' | 'training';
    /** @deprecated Use activeDays instead */
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
    middayBundleClaimed: boolean;
    afternoonBundleClaimed: boolean;
    nightBundleClaimed: boolean;
    perfectDayClaimed: boolean;

    weeklyBonusClaimed: boolean;
    customRecurringTasks: RecurringTask[];
    removedTaskIds: string[];
    taskOverrides: Record<string, { bundle?: BundleType; index?: number }>;

    // Workout tracking (1 lift/day, 1 cardio/day)
    lastLiftDate: string | null;
    lastCardioDate: string | null;

    // Actions
    completeTask: (id: string, inputData?: { weight?: number, trainingSelections?: string[], tierId?: string }) => void;
    uncompleteTask: (id: string) => void; // Allow un-checking an accidentally completed task

    resetDailyTasks: () => void;
    resetWeeklyTasks: () => void;
    checkAndReset: () => void;

    getBundleStatus: (bundle: BundleType) => { completedCount: number; totalCount: number; isComplete: boolean; isClaimed: boolean };
    claimBundleReward: (bundle: BundleType) => void;
    claimPerfectDayBonus: () => void;
    isWeeklyComplete: () => boolean;
    claimWeeklyBonus: () => void;

    addCustomRecurringTask: (taskInput: {
        title: string;
        bundle: BundleType;
        rewards: TaskReward[];
        recurrenceType: RecurrenceType;
        activeDays?: number[];
    }) => void;
    removeDailyTask: (id: string) => void;
    editDailyTask: (id: string, newTitle: string) => void;
    moveDailyTask: (taskId: string, targetBundle: BundleType, toIndex: number) => void;

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

const upgradeLegacyTask = (task: RecurringTask): RecurringTask => {
    const updated = { ...task };
    if (!updated.activeDays && updated.conditional?.days) {
        updated.activeDays = updated.conditional.days;
    }
    if (!updated.recurrenceType && updated.type) {
        updated.recurrenceType = updated.type;
    }
    return updated;
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
// ORDER within each bundle matches the canonical default task order.
// The array position IS the default sort order (no taskOverrides needed for fresh state).

export const DAILY_TASKS_TEMPLATE: Omit<RecurringTask, 'completed'>[] = [
    // ══ MORNING (BEFORE WORK) ══════════════════════════════════════════════
    // Order: Brush/Floss/Face Wash → Weigh Self → Drink 30oz Water
    {
        id: 'brush_and_floss',
        title: 'Brush / Floss / Face Wash',
        bundle: 'morning',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'hygiene',
        rewards: [{ skillId: 'Hygiene', xp: 3 }],
    },
    {
        id: 'weigh_self',
        title: 'Weigh Self',
        bundle: 'morning',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        requiresInput: 'weight',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'water_morning',
        title: 'Drink 30oz Water',
        bundle: 'morning',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },

    // ══ MIDDAY (DURING WORK HOURS) ═════════════════════════════════════════
    // Order: Take Supplements → Inbox Zero → Charge Devices → Creatine+Water+Fiber
    //        → Allergy Shots → No Coffee → Complete Work
    {
        id: 'take_supplements',
        title: 'Take Supplements',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'inbox_zero',
        title: 'Inbox Zero (Emails + Texts)',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'work',
        rewards: [{ skillId: 'Work', xp: 2 }],
    },
    {
        id: 'charge_devices',
        title: 'Charge Phone / Oura / Headphones',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Habit', xp: 1 }],
    },
    {
        id: 'creatine_fiber',
        title: 'Creatine + 30oz Water + Fiber',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'allergy_shots',
        title: 'Allergy Shots (if needed)',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'no_coffee',
        title: 'No Coffee After 12pm',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Habit', xp: 1 }],
    },
    {
        id: 'complete_work',
        title: 'Complete Work',
        bundle: 'midday',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'work',
        rewards: [{ skillId: 'Work', xp: 2 }],
    },

    // ══ AFTERNOON (AFTER WORK) ═════════════════════════════════════════════
    // Order: Tidy Desk → Training Session → Audiobook → After-Work Calls
    {
        id: 'tidy_desk',
        title: 'Tidy Desk',
        bundle: 'afternoon',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'training_session',
        title: 'Training Session',
        bundle: 'afternoon',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'fitness',
        requiresInput: 'training',
        rewards: [],
    },
    {
        id: 'audiobook_30_min',
        title: 'Listen to 30 minutes of audiobook minimum today',
        bundle: 'afternoon',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Intelligence', xp: 1 }],
    },
    {
        id: 'after_work_calls',
        title: 'After-Work Calls or Appointments (if any)',
        bundle: 'afternoon',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'work',
        rewards: [{ skillId: 'Work', xp: 2 }],
    },

    // ══ NIGHT SHUTDOWN (BEFORE BED) ════════════════════════════════════════
    // Order: Walk Steps → Water → Reach Out → Hip Stretches → Clean Bottles
    //        → Make Bed → Laundry → Protein → Calories → Finances
    //        → Brush/Floss → Magnesium → Tongue Exercises → Read → Charge/Oura → CPAP
    {
        id: 'daily_steps',
        title: 'Daily Steps',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'fitness',
        rewards: [], // Rewards derived from tiers
        tiers: [
            { id: 'low', title: 'Walked 1–5,000 steps', rewards: [] },
            { id: 'mid', title: 'Walked 5,001–8,000 steps', rewards: [{ skillId: 'Cardio', xp: 1 }] },
            { id: 'high', title: 'Walked 8,000+ steps', rewards: [{ skillId: 'Cardio', xp: 2 }] }
        ]
    },
    {
        id: 'water_night',
        title: 'Drink 30oz Water',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Health', xp: 1 }],
    },
    {
        id: 'reach_out_social',
        title: 'Reach out to friends and family and spread positivity',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Social', xp: 5 }],
    },
    {
        id: 'hip_stretches',
        title: 'Hip Stretches',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'fitness',
        rewards: [{ skillId: 'Flexibility', xp: 2 }],
    },
    {
        id: 'clean_bottles',
        title: 'Clean Water Bottles',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'make_bed',
        title: 'Make your bed',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [
            { skillId: 'Housemaid', xp: 2 },
            { skillId: 'Habit', xp: 1 }
        ],
    },
    {
        id: 'laundry_organize',
        title: 'Laundry / Put Away / Organize',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Housemaid', xp: 2 }],
    },
    {
        id: 'ate_protein_160g',
        title: 'Ate 160+ Grams of Protein',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Strength', xp: 2 }],
    },
    {
        id: 'ate_under_2200_cal',
        title: 'Ate Less Than 2200 Calories',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [
            { skillId: 'Health', xp: 1 },
            { skillId: 'Cardio', xp: 1 },
            { skillId: 'Sleep', xp: 1 }
        ],
    },
    {
        id: 'check_finances',
        title: 'Check finances + track daily money spent',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'work',
        rewards: [{ skillId: 'Habit', xp: 1 }],
    },
    {
        id: 'night_routine_hygiene',
        title: 'Brush / Floss / Face Wash',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'hygiene',
        rewards: [{ skillId: 'Hygiene', xp: 2 }],
    },
    {
        id: 'take_magnesium',
        title: 'Take Magnesium',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Sleep', xp: 1 }],
    },
    {
        id: 'tongue_exercises',
        title: 'Tongue Exercises',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'fitness',
        rewards: [
            { skillId: 'Health', xp: 2 },
            { skillId: 'Habit', xp: 1 },
            { skillId: 'Flexibility', xp: 2 }
        ],
    },
    {
        id: 'read_10_min',
        title: 'Read 10 Minutes',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Intelligence', xp: 4 }],
    },
    {
        id: 'charge_wear_oura',
        title: 'Charge Phone + Wear Oura Ring',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'lifestyle',
        rewards: [{ skillId: 'Habit', xp: 1 }],
    },
    {
        id: 'clean_pillow_cpap',
        title: 'Use CPAP',
        bundle: 'night',
        recurrenceType: 'daily',
        type: 'daily',
        category: 'health',
        rewards: [{ skillId: 'Sleep', xp: 3 }],
    },
];


// Predefined weekly tasks
const WEEKLY_TASKS_TEMPLATE: Omit<RecurringTask, 'completed'>[] = [
    {
        id: 'weekly-bathroom',
        title: 'Deep Clean Bathroom',
        recurrenceType: 'weekly',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 4 }],
    },
    {
        id: 'weekly-car',
        title: 'Clean Out Car',
        recurrenceType: 'weekly',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 4 }],
    },
    {
        id: 'weekly-cpap',
        title: 'Deep Clean CPAP Machine',
        recurrenceType: 'weekly',
        type: 'weekly',
        rewards: [{ skillId: 'Health', xp: 7 }],
    },
    {
        id: 'weekly-pills',
        title: 'Fill Pill Planner',
        recurrenceType: 'weekly',
        type: 'weekly',
        rewards: [{ skillId: 'Housemaid', xp: 1 }],
    },
    {
        id: 'weekly-vacuum',
        title: 'Vacuum',
        recurrenceType: 'weekly',
        type: 'weekly',
        rewards: [
            { skillId: 'Hygiene', xp: 1 },
            { skillId: 'Housemaid', xp: 2 }
        ],
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
            middayBundleClaimed: false,
            afternoonBundleClaimed: false,
            nightBundleClaimed: false,
            perfectDayClaimed: false,
            weeklyBonusClaimed: false,
            customRecurringTasks: [],
            removedTaskIds: [],
            taskOverrides: {},
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
                        let rewardsToGrant: TaskReward[] = [];
                        if (task.tiers && inputData?.tierId) {
                            const chosenTier = task.tiers.find(t => t.id === inputData.tierId);
                            if (chosenTier) {
                                newTasks[dailyIndex] = { ...task, completed: true, selectedTier: inputData.tierId };
                                rewardsToGrant = [...chosenTier.rewards];
                            }
                        } else {
                            newTasks[dailyIndex] = { ...task, completed: true };
                            rewardsToGrant = [...task.rewards];
                        }
                        
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

                            // Training session reward: +5 board tickets, +2 shmeckles (+2 balloons auto-mirrored)
                            import('./useMonopolyStore').then(({ useMonopolyStore }) => {
                                useMonopolyStore.getState().addDailyTickets(5);
                            });
                            import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                                useCurrencyStore.getState().addShmeckles(2);
                            });
                            import('../components/ui/Toast').then(({ useToastStore }) => {
                                useToastStore.getState().addToast({
                                    type: 'success',
                                    message: '🏋️ Training Complete! +5 🎫 Tickets | +2 🐌 Shmeckles | +2 🎈 Balloons',
                                    duration: 4000,
                                });
                            }).catch(() => {});
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

            uncompleteTask: (id: string) => {
                // Only un-completes daily tasks (weekly tasks cannot be un-done easily)
                set((state) => {
                    const dailyIndex = state.dailyTasks.findIndex(t => t.id === id);
                    if (dailyIndex === -1) return {};
                    const newTasks = [...state.dailyTasks];
                    const task = newTasks[dailyIndex];
                    newTasks[dailyIndex] = { ...task, completed: false, selectedTier: null };

                    // Refund XP
                    import('./useGameStore').then(({ useGameStore }) => {
                        const gameStore = useGameStore.getState();
                        let rewardsToRevoke = task.rewards;
                        if (task.tiers && task.selectedTier) {
                            const chosenTier = task.tiers.find(t => t.id === task.selectedTier);
                            if (chosenTier) {
                                rewardsToRevoke = chosenTier.rewards;
                            }
                        }
                        rewardsToRevoke.forEach(r => {
                            gameStore.removeSkillXp(r.skillId, r.xp);
                        });
                    });

                    return { dailyTasks: newTasks };
                });
            },

            resetDailyTasks: () => {
                const todayDow = getEasternDayOfWeek();
                const { customRecurringTasks, removedTaskIds, taskOverrides } = get();

                const baseTasks = DAILY_TASKS_TEMPLATE.filter(t => !removedTaskIds.includes(t.id));

                let todaysTasks = [...baseTasks, ...customRecurringTasks]
                    .map(t => upgradeLegacyTask({ ...t, completed: (t as RecurringTask).completed ?? false }))
                    .filter(t => {
                        if (!t.activeDays) return true;
                        return t.activeDays.includes(todayDow);
                    })
                    .map(t => ({ ...t, completed: false, selectedTier: null }));

                // Apply overrides
                todaysTasks = todaysTasks.map(t => {
                    const override = taskOverrides[t.id];
                    if (override?.bundle) {
                        return { ...t, bundle: override.bundle };
                    }
                    return t;
                });

                // Apply ordering overrides per bundle
                const bundledTasks: Record<BundleType, RecurringTask[]> = {
                    morning: [],
                    midday: [],
                    afternoon: [],
                    night: []
                };
                todaysTasks.forEach(t => {
                    if (t.bundle) {
                        bundledTasks[t.bundle].push(t);
                    }
                });

                const getIndex = (id: string) => taskOverrides[id]?.index ?? 999;
                
                const finalTasks: RecurringTask[] = [];
                (['morning', 'midday', 'afternoon', 'night'] as BundleType[]).forEach(bundle => {
                    const sorted = bundledTasks[bundle].sort((a, b) => getIndex(a.id) - getIndex(b.id));
                    finalTasks.push(...sorted);
                });

                set({
                    dailyTasks: finalTasks,
                    lastDailyReset: getEasternDateString(),
                    morningBundleClaimed: false,
                    middayBundleClaimed: false,
                    afternoonBundleClaimed: false,
                    nightBundleClaimed: false,
                    perfectDayClaimed: false,
                });
            },

            addCustomRecurringTask: (taskInput) => {
                const today = getEasternDayOfWeek();
                let activeDays: number[] | undefined;

                switch (taskInput.recurrenceType) {
                    case 'daily':
                        activeDays = [0, 1, 2, 3, 4, 5, 6];
                        break;
                    case 'weekly':
                        activeDays = taskInput.activeDays || [today]; // if single day picked, should be in activeDays
                        break;
                    case 'custom':
                        activeDays = taskInput.activeDays;
                        break;
                    case 'one-time':
                        activeDays = [today];
                        break;
                }

                const newTask: RecurringTask = {
                    id: `custom-${safeUUID()}`,
                    title: taskInput.title,
                    bundle: taskInput.bundle,
                    type: 'daily',
                    recurrenceType: taskInput.recurrenceType,
                    activeDays,
                    completed: false,
                    rewards: taskInput.rewards,
                    createdAt: Date.now()
                };

                set(state => {
                    const newCustomTasks = [...state.customRecurringTasks, newTask];
                    
                    // Conditionally inject into UI today if it belongs here
                    let newDailyTasks = [...state.dailyTasks];
                    if (!activeDays || activeDays.includes(today)) {
                        newDailyTasks.push(newTask);
                    }

                    return {
                        customRecurringTasks: newCustomTasks,
                        dailyTasks: newDailyTasks
                    };
                });
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

            moveDailyTask: (taskId, targetBundle, toIndex) => {
                set(state => {
                    const taskToMove = state.dailyTasks.find(t => t.id === taskId);
                    if (!taskToMove) return {};

                    const newDailyTasks = state.dailyTasks.filter(t => t.id !== taskId);
                    const targetTasks = newDailyTasks.filter(t => t.bundle === targetBundle);
                    const otherTasks = newDailyTasks.filter(t => t.bundle !== targetBundle);

                    const updatedTask = { ...taskToMove, bundle: targetBundle };
                    targetTasks.splice(toIndex, 0, updatedTask);

                    const finalDailyTasks = [...otherTasks, ...targetTasks];

                    // Update overrides
                    const newOverrides = { ...state.taskOverrides };
                    newOverrides[taskId] = { 
                        ...newOverrides[taskId], 
                        bundle: targetBundle 
                    };

                    targetTasks.forEach((t, idx) => {
                        newOverrides[t.id] = {
                            ...newOverrides[t.id],
                            index: idx
                        };
                    });

                    return { 
                        dailyTasks: finalDailyTasks,
                        taskOverrides: newOverrides
                    };
                });
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
                if (bundle === 'midday') isClaimed = state.middayBundleClaimed;
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
                        useCurrencyStore.getState().addGold(25, { exact: true });
                    });

                    if (bundle === 'morning') set({ morningBundleClaimed: true });
                    if (bundle === 'midday') set({ middayBundleClaimed: true });
                    if (bundle === 'afternoon') set({ afternoonBundleClaimed: true });
                    if (bundle === 'night') set({ nightBundleClaimed: true });
                }
            },

            claimPerfectDayBonus: () => {
                const state = get();
                const m = state.getBundleStatus('morning');
                const md = state.getBundleStatus('midday');
                const a = state.getBundleStatus('afternoon');
                const n = state.getBundleStatus('night');

                if (m.isComplete && md.isComplete && a.isComplete && n.isComplete && !state.perfectDayClaimed) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(75, { exact: true });
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
                        currency.addGold(200, { exact: true });
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
            version: 5, // v5: canonical task layout — correct bundle assignments + exact default order per spec
            migrate: (persistedState: any, fromVersion: number) => {
                // v4 → v5: clear stale taskOverrides for built-in task IDs so the new
                // canonical order and bundle assignments take effect on next reset.
                // User-created custom tasks (id starts with 'custom-') are left intact.
                if (fromVersion < 5) {
                    const builtinIds = new Set(DAILY_TASKS_TEMPLATE.map(t => t.id));
                    const oldOverrides: Record<string, { bundle?: BundleType; index?: number }> =
                        persistedState?.taskOverrides ?? {};
                    const cleanedOverrides: Record<string, { bundle?: BundleType; index?: number }> = {};
                    for (const [id, override] of Object.entries(oldOverrides)) {
                        if (!builtinIds.has(id)) {
                            // Preserve overrides for user-created custom tasks only
                            cleanedOverrides[id] = override;
                        }
                        // Built-in task overrides discarded — canonical template order is now authoritative
                    }
                    return {
                        ...persistedState,
                        taskOverrides: cleanedOverrides,
                        // Force a re-seed on next load so the new bundle/order assignments apply
                        lastDailyReset: null,
                    };
                }
                return persistedState;
            },
        }

    )
);
