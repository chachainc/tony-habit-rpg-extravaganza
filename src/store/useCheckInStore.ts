import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// Get current date string in Eastern Time
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

// Check if a date is yesterday
const isYesterday = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [year, month, day] = dateStr.split('-').map(Number);
    const checkDate = new Date(year, month - 1, day);

    return checkDate.getTime() === yesterday.getTime();
};

export interface CheckInReward {
    gold: number;
    xp?: number; // legacy
    habitXp?: number;
    buffType?: 'xp_boost' | 'gold_boost';
    buffValue?: number;
    buffDuration?: number; // hours
    gachaTicket?: boolean;
    rareMaterial?: string;
}

// Day 1-7 reward cycle - escalating rewards
const DAY_REWARDS: Record<number, CheckInReward> = {
    1: { gold: 50 },
    2: { gold: 75 },
    3: { gold: 100, buffType: 'xp_boost', buffValue: 0.05, buffDuration: 24 },
    4: { gold: 125 },
    5: { gold: 150, buffType: 'gold_boost', buffValue: 0.10, buffDuration: 24 },
    6: { gold: 200 },
    7: { gold: 300, gachaTicket: true },
};

const CONSOLATION_REWARD: CheckInReward = {
    gold: 25,
    // xp: 5,
};

interface CheckInState {
    streakDay: number; // 1-7 cycle
    streakCount: number; // Total consecutive days
    lastCheckInDate: string | null;
    hasCheckedInToday: boolean;

    // Actions
    checkIn: () => CheckInReward | null;
    getRewardForDay: (day: number) => CheckInReward;
    getStreakStatus: () => { canCheckIn: boolean; missedYesterday: boolean };
}

export const useCheckInStore = create<CheckInState>()(
    persist(
        (set, get) => ({
            streakDay: 0,
            streakCount: 0,
            lastCheckInDate: null,
            hasCheckedInToday: false,

            checkIn: () => {
                const state = get();
                const today = getEasternDateString();

                // Already checked in today
                if (state.lastCheckInDate === today) {
                    return null;
                }

                const { missedYesterday } = state.getStreakStatus();
                let reward: CheckInReward;
                let newStreakDay: number;
                let newStreakCount: number;

                if (missedYesterday || state.lastCheckInDate === null) {
                    // Streak broken or first time - reset to Day 1
                    // But give consolation reward if they had a streak
                    if (state.streakCount > 0 && missedYesterday) {
                        reward = CONSOLATION_REWARD;
                    } else {
                        reward = DAY_REWARDS[1];
                    }
                    newStreakDay = 1;
                    newStreakCount = 1;
                } else {
                    // Continue streak
                    newStreakDay = (state.streakDay % 7) + 1;
                    newStreakCount = state.streakCount + 1;
                    reward = DAY_REWARDS[newStreakDay];
                }

                let finalReward = { ...reward };
                if (newStreakCount > 5) finalReward.habitXp = 1;

                // Apply rewards immediately
                // Note: Dynamic imports to avoid circular dependency
                import('./useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().addCurrency(finalReward.gold);
                    if (finalReward.habitXp) { useGameStore.getState().addSkillXp('Habit', finalReward.habitXp, { capExempt: true }); }
                });

                if (finalReward.buffType && finalReward.buffValue && finalReward.buffDuration) {
                    import('./useBuffStore').then(({ useBuffStore }) => {
                        useBuffStore.getState().addBuff(
                            finalReward.buffType!,
                            finalReward.buffValue!,
                            finalReward.buffDuration!,
                            `Daily Check-In Bonus`
                        );
                    });
                }

                if (finalReward.gachaTicket) {
                    import('./useGachaStore').then(({ useGachaStore }) => {
                        useGachaStore.getState().addTickets(1);
                    });
                }

                // Sync with Calendar Store
                import('./useCalendarStore').then(({ useCalendarStore }) => {
                    const calendarStore = useCalendarStore.getState();
                    // Ensure the date is marked as checked in on the calendar
                    if (!calendarStore.hasCheckedIn(today)) {
                        calendarStore.toggleCheckIn(today);
                    }
                });

                set({
                    streakDay: newStreakDay,
                    streakCount: newStreakCount,
                    lastCheckInDate: today,
                    hasCheckedInToday: true,
                });

                // Gem milestone rewards
                if (newStreakCount === 14) {
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addGems(1);
                    });
                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({ type: 'success', message: '💎 2-Week Streak! +1 Gem reward!', duration: 5000 });
                    }).catch(() => { });
                } else if (newStreakCount === 30) {
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addGems(3);
                    });
                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({ type: 'success', message: '💎💎💎 30-Day Streak! +3 Gems!', duration: 5000 });
                    }).catch(() => { });
                }

                return finalReward;
            },

            getRewardForDay: (day: number) => {
                return DAY_REWARDS[day] || DAY_REWARDS[1];
            },

            getStreakStatus: () => {
                const state = get();
                const today = getEasternDateString();

                if (state.lastCheckInDate === today) {
                    return { canCheckIn: false, missedYesterday: false };
                }

                if (state.lastCheckInDate === null) {
                    return { canCheckIn: true, missedYesterday: false };
                }

                const missedYesterday = !isYesterday(state.lastCheckInDate) && state.lastCheckInDate !== today;

                return { canCheckIn: true, missedYesterday };
            },
        }),
        {
            name: PERSIST_REGISTRY.checkin.persistKey,
        }
    )
);
