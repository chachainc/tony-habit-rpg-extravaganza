import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore, type SkillName } from './useGameStore';
import { useConsistencyStore } from './useConsistencyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type TaskDifficulty = 'small' | 'medium' | 'hard' | 'very_hard';

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    difficulty: TaskDifficulty;
    skillId: SkillName;
    xpReward: number;
    createdAt: number;
    createdDate: string; // YYYY-MM-DD for daily filtering
}

export interface DailyChestReward {
    gold: number;
    globalXp: number;
    rareToken: boolean;
    buffType?: 'xp_boost' | 'attack_boost' | 'defense_boost';
    buffDuration?: number; // hours
}

interface TaskState {
    tasks: Task[];
    hasClaimedDailyChest: boolean;
    lastChestClaimDate: string | null;
    rareTaskTokens: number;

    // Actions
    addTask: (title: string, difficulty: TaskDifficulty, skillId: SkillName) => void;
    toggleTask: (id: string) => void;
    removeTask: (id: string) => void;

    // Daily completion bonus
    getDailyTasks: () => Task[];
    areAllDailyTasksComplete: () => boolean;
    getDailyProgress: () => { completed: number; total: number; percentage: number };
    claimDailyChest: () => DailyChestReward | null;
    canClaimDailyChest: () => boolean;
}

// ULTRA-SLOW progression: minimal XP per task for years of gameplay
// Max 5 XP per task ensures very slow progression
const DIFFICULTY_REWARDS: Record<TaskDifficulty, number> = {
    small: 1,
    medium: 3,
    hard: 5,
    very_hard: 5  // Same as hard - cap at 5
};

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

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: [],
            hasClaimedDailyChest: false,
            lastChestClaimDate: null,
            rareTaskTokens: 0,

            addTask: (title, difficulty, skillId) => {
                const newTask: Task = {
                    id: safeUUID(),
                    title,
                    completed: false,
                    difficulty,
                    skillId,
                    xpReward: DIFFICULTY_REWARDS[difficulty],
                    createdAt: Date.now(),
                    createdDate: getEasternDateString(),
                };
                set((state) => ({ tasks: [newTask, ...state.tasks] }));
            },

            toggleTask: (id) => {
                set((state) => {
                    const task = state.tasks.find((t) => t.id === id);
                    if (task && !task.completed) {
                        // Award XP to specific skill
                        useGameStore.getState().addSkillXp(task.skillId, task.xpReward);

                        // Track "Very Hard" Intelligence tasks as book completions
                        if (task.skillId === 'Intelligence' && task.difficulty === 'very_hard') {
                            import('./useBookTrophyStore').then(({ useBookTrophyStore }) => {
                                useBookTrophyStore.getState().incrementBooksRead();
                            });
                        }
                    }
                    return {
                        tasks: state.tasks.map((t) =>
                            t.id === id ? { ...t, completed: !t.completed } : t
                        ),
                    };
                });
            },

            removeTask: (id) =>
                set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

            getDailyTasks: () => {
                const today = getEasternDateString();
                return get().tasks.filter((t) => t.createdDate === today);
            },

            areAllDailyTasksComplete: () => {
                const dailyTasks = get().getDailyTasks();
                if (dailyTasks.length === 0) return false;
                return dailyTasks.every((t) => t.completed);
            },

            getDailyProgress: () => {
                const dailyTasks = get().getDailyTasks();
                const completed = dailyTasks.filter((t) => t.completed).length;
                const total = dailyTasks.length;
                const percentage = total > 0 ? (completed / total) * 100 : 0;
                return { completed, total, percentage };
            },

            canClaimDailyChest: () => {
                const state = get();
                const today = getEasternDateString();

                // Reset claim status if it's a new day
                if (state.lastChestClaimDate !== today && state.hasClaimedDailyChest) {
                    set({ hasClaimedDailyChest: false });
                }

                return state.areAllDailyTasksComplete() &&
                    (state.lastChestClaimDate !== today || !state.hasClaimedDailyChest);
            },

            claimDailyChest: () => {
                const state = get();
                if (!state.canClaimDailyChest()) {
                    return null;
                }

                const today = getEasternDateString();

                // ULTRA-SLOW: Flat 1 gold, 1 XP daily reward
                const gold = 1;
                const globalXp = 1;
                const rareToken = Math.random() < 0.10; // 10% chance

                // Determine buff type (random)
                const buffTypes: ('xp_boost' | 'attack_boost' | 'defense_boost')[] =
                    ['xp_boost', 'attack_boost', 'defense_boost'];
                const buffType = buffTypes[Math.floor(Math.random() * buffTypes.length)];

                const reward: DailyChestReward = {
                    gold,
                    globalXp,
                    rareToken,
                    buffType,
                    buffDuration: 1, // 1 hour buff
                };

                // Apply rewards
                useGameStore.getState().addCurrency(gold);
                useGameStore.getState().addGlobalXp(globalXp);

                // Apply buff dynamically to avoid circular dependency
                import('./useBuffStore').then(({ useBuffStore }) => {
                    const buffValue = buffType === 'xp_boost' ? 0.10 : 3; // 10% XP or +3 stat
                    useBuffStore.getState().addBuff(
                        buffType,
                        buffValue,
                        1, // 1 hour
                        'Daily Quest Completion'
                    );
                });

                set((s) => ({
                    hasClaimedDailyChest: true,
                    lastChestClaimDate: today,
                    rareTaskTokens: s.rareTaskTokens + (rareToken ? 1 : 0),
                }));

                // Mark this day as complete for weekly consistency tracking
                useConsistencyStore.getState().markDayComplete();

                return reward;
            },
        }),
        {
            name: PERSIST_REGISTRY.tasks.persistKey, // Bump version for consistency integration
        }
    )
);
