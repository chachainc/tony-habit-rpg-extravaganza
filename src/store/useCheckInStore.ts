import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useCurrencyStore } from './useCurrencyStore';
import { useMonopolyStore } from './useMonopolyStore';

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
    dailyTickets?: number;
    gems?: number;
}

// Returns the reward for a given absolute streak count (1-indexed)
export function getStreakReward(streakCount: number): CheckInReward {
    // Week 5+ (day 29+): 200 gold (capped), 20 tickets, +5 gems every 7 days
    if (streakCount >= 29) {
        return {
            gold: 200,
            dailyTickets: 20,
            gems: streakCount % 7 === 0 ? 5 : 0,
        };
    }
    // Day 28 milestone
    if (streakCount === 28) return { gold: 300, dailyTickets: 15, gems: 5 };
    // Days 22-27
    if (streakCount >= 22) return { gold: 200, dailyTickets: 15 };
    // Day 21 milestone (3-week)
    if (streakCount === 21) return { gold: 300, dailyTickets: 20, gems: 5 };
    // Days 15-20
    if (streakCount >= 15) return { gold: 200, dailyTickets: 15 };
    // Day 14 milestone
    if (streakCount === 14) return { gold: 500, dailyTickets: 10, gems: 5 };
    // Days 8-13
    if (streakCount >= 8) return { gold: 200, dailyTickets: 10 };
    // Week 1 (days 1-7) — existing gold amounts preserved, new ticket counts
    const WEEK1: Record<number, CheckInReward> = {
        1: { gold: 50,  dailyTickets: 3 },
        2: { gold: 75,  dailyTickets: 4 },
        3: { gold: 100, dailyTickets: 5, buffType: 'xp_boost', buffValue: 0.05, buffDuration: 24 },
        4: { gold: 125, dailyTickets: 6 },
        5: { gold: 150, dailyTickets: 7, buffType: 'gold_boost', buffValue: 0.10, buffDuration: 24 },
        6: { gold: 200, dailyTickets: 8 },
        7: { gold: 300, dailyTickets: 9, gems: 5 },
    };
    return WEEK1[streakCount] ?? WEEK1[1];
}

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
                    // Streak broken or first time — reset
                    if (state.streakCount > 0 && missedYesterday) {
                        reward = CONSOLATION_REWARD;
                    } else {
                        reward = getStreakReward(1);
                    }
                    newStreakDay = 1;
                    newStreakCount = 1;
                } else {
                    // Continue streak
                    const safeStreakDay = Number.isFinite(state.streakDay) ? state.streakDay : 0;
                    newStreakDay = (safeStreakDay % 7) + 1;
                    newStreakCount = state.streakCount + 1;
                    reward = getStreakReward(newStreakCount);
                }

                let finalReward = { ...reward };
                // Safety: ensure gold is always a positive integer
                if (!finalReward.gold || finalReward.gold <= 0) finalReward.gold = 50; // fallback to Day 1 gold

                if (newStreakCount > 5) finalReward.habitXp = 1;

                // Apply rewards immediately (direct static imports for immediate availability)
                useCurrencyStore.getState().addGold(finalReward.gold, { exact: true });
                
                if (finalReward.habitXp) { 
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addSkillXp('Habit', finalReward.habitXp!, { capExempt: true }); 
                    });
                }

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

                if (finalReward.dailyTickets) {
                    useMonopolyStore.getState().addDailyTickets(finalReward.dailyTickets);
                }

                if (finalReward.gems && finalReward.gems > 0) {
                    import('./useCurrencyStore').then(({ useCurrencyStore: cs }) => {
                        cs.getState().addDiamonds(finalReward.gems!);
                    });
                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `💎 Week Milestone! +${finalReward.gems} Gems!`,
                            duration: 5000,
                        });
                    }).catch(() => {});
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

                // Gem milestone — handled above via finalReward.gems
                // (Legacy logic for day 14 and day 30 removed — now managed by getStreakReward)

                return finalReward;
            },

            getRewardForDay: (day: number) => {
                return getStreakReward(day);
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
