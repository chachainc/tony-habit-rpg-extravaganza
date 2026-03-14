import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

interface Task {
    id: string;
    text: string;
    completed: boolean;
    skillId?: string; // Optional skill XP reward
    difficulty?: 'easy' | 'medium' | 'hard';
}

interface CalendarState {
    checkIns: Record<string, boolean>; // 'YYYY-MM-DD': true
    tasks: Record<string, Task[]>; // 'YYYY-MM-DD': Task[]
    streak: number;
    lastCheckInDate: string | null;

    // Actions
    toggleCheckIn: (date: string) => void;
    addTask: (date: string, task: Task) => void;
    toggleTask: (date: string, taskId: string) => void;
    deleteTask: (date: string, taskId: string) => void;
    getStreak: () => number;
    hasCheckedIn: (date: string) => boolean;
    getTasksForDate: (date: string) => Task[];

    // Monthly Bonus Logic
    checkMonthlyBonus: () => void; // Triggered on check-in
    monthlyBonusesClaimed: Record<string, boolean>; // 'YYYY-MM': true

    // New Helper Methods
    checkIn: () => boolean;
    canCheckIn: () => boolean;
    getMonthProgress: (year: number, month: number) => { checkedDays: number; totalDays: number };
    canClaimMonthReward: (year: number, month: number) => boolean;
    claimMonthReward: (year: number, month: number) => boolean;
}

export const useCalendarStore = create<CalendarState>()(
    persist(
        (set, get) => ({
            checkIns: {},
            tasks: {},
            streak: 0,
            lastCheckInDate: null,
            monthlyBonusesClaimed: {},

            getStreak: () => {
                // Return current streak based on actual check-ins
                // This logic needs to be robust: consecutive days backward from today/yesterday
                const { checkIns } = get();
                const today = dayjs().format('YYYY-MM-DD');
                const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

                // If checked in today, count starts from today.
                // If not today but yesterday, count starts from yesterday.
                // Else 0.

                let current = checkIns[today] ? today : (checkIns[yesterday] ? yesterday : null);
                if (!current) return 0;

                let count = 0;
                while (checkIns[current]) {
                    count++;
                    current = dayjs(current).subtract(1, 'day').format('YYYY-MM-DD');
                }
                return count;
            },

            hasCheckedIn: (date) => !!get().checkIns[date],

            toggleCheckIn: (date) => {
                set((state) => {
                    const newCheckIns = { ...state.checkIns };
                    if (newCheckIns[date]) {
                        delete newCheckIns[date];
                    } else {
                        newCheckIns[date] = true;
                    }

                    // Recalculate streak immediately or rely on getter? 
                    // Let's rely on getter or update a stored streak value if performance needed.
                    // For now, let's keep it simple.

                    return { checkIns: newCheckIns };
                });
                get().checkMonthlyBonus();
            },

            addTask: (date, task) => set((state) => ({
                tasks: {
                    ...state.tasks,
                    [date]: [...(state.tasks[date] || []), task]
                }
            })),

            toggleTask: (date, taskId) => set((state) => ({
                tasks: {
                    ...state.tasks,
                    [date]: (state.tasks[date] || []).map(t =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                    )
                }
            })),

            deleteTask: (date, taskId) => set((state) => ({
                tasks: {
                    ...state.tasks,
                    [date]: (state.tasks[date] || []).filter(t => t.id !== taskId)
                }
            })),

            getTasksForDate: (date) => get().tasks[date] || [],

            checkMonthlyBonus: () => {
                const { checkIns, monthlyBonusesClaimed } = get();
                const today = dayjs();
                const currentMonthPrefix = today.format('YYYY-MM'); // "2026-02"

                // If already claimed for this month, exit
                if (monthlyBonusesClaimed[currentMonthPrefix]) return;

                const daysInMonth = today.daysInMonth();

                // Check if all days 1..daysInMonth are present
                let allChecked = true;
                for (let i = 1; i <= daysInMonth; i++) {
                    const dayStr = `${currentMonthPrefix}-${String(i).padStart(2, '0')}`;
                    if (!checkIns[dayStr]) {
                        allChecked = false;
                        break;
                    }
                }

                if (allChecked) {
                    // Award Bonus!
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(100);
                    });

                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addSkillXp('Habit', 25);
                    });

                    // Mark as claimed
                    set((state) => ({
                        monthlyBonusesClaimed: {
                            ...state.monthlyBonusesClaimed,
                            [currentMonthPrefix]: true
                        }
                    }));

                    console.log(`Monthly Bonus Awarded for ${currentMonthPrefix}!`);
                }
            },

            // New helpers for CalendarModal
            checkIn: () => {
                const today = dayjs().format('YYYY-MM-DD');
                if (get().checkIns[today]) return false; // Already checked in

                get().toggleCheckIn(today);
                return true;
            },

            canCheckIn: () => {
                const today = dayjs().format('YYYY-MM-DD');
                return !get().checkIns[today];
            },

            getMonthProgress: (year, month) => {
                const { checkIns } = get();
                const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
                let checkedCount = 0;

                for (let i = 1; i <= daysInMonth; i++) {
                    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    if (checkIns[dateKey]) checkedCount++;
                }

                return { checkedDays: checkedCount, totalDays: daysInMonth };
            },

            canClaimMonthReward: (year, month) => {
                const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
                if (get().monthlyBonusesClaimed[monthPrefix]) return false;

                const { checkedDays, totalDays } = get().getMonthProgress(year, month);
                return checkedDays >= totalDays;
            },

            claimMonthReward: (year, month) => {
                const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
                if (get().monthlyBonusesClaimed[monthPrefix]) return false;

                if (!get().canClaimMonthReward(year, month)) return false;

                // Award Logic (simplified duplication of checkMonthlyBonus)
                import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                    useCurrencyStore.getState().addGold(500);
                    useCurrencyStore.getState().addDiamonds(5);
                });

                set((state) => ({
                    monthlyBonusesClaimed: {
                        ...state.monthlyBonusesClaimed,
                        [monthPrefix]: true
                    }
                }));

                return true;
            }
        }),
        {
            name: PERSIST_REGISTRY.calendar.persistKey,
        }
    )
);
