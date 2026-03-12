import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Types ──────────────────────────────────────────────────────

export type TraitCategory = 'gym' | 'reading' | 'routine' | 'sleep';
export type TraitTreeName = 'Body' | 'Mind' | 'Discipline' | 'Rest';

export interface TraitDef {
    id: string;
    category: TraitCategory;
    tree: TraitTreeName;
    name: string;
    description: string;
    icon: string;
    streakRequired: number;
}

export const TRAITS: TraitDef[] = [
    // Gym
    { id: 'iron_discipline', category: 'gym', tree: 'Body', name: 'Iron Discipline', description: 'Attack permanently increased.', icon: '⚔️', streakRequired: 7 },
    { id: 'warriors_body', category: 'gym', tree: 'Body', name: 'Warrior\'s Body', description: 'Increase maximum HP in combat modes.', icon: '❤️', streakRequired: 30 },
    { id: 'titan_conditioning', category: 'gym', tree: 'Body', name: 'Titan Conditioning', description: 'Small damage reduction in Arena and Storm the Fort.', icon: '🛡️', streakRequired: 90 },
    
    // Reading
    { id: 'scholars_mind', category: 'reading', tree: 'Mind', name: 'Scholar\'s Mind', description: 'Small XP gain bonus.', icon: '🧠', streakRequired: 7 },
    { id: 'arcane_literacy', category: 'reading', tree: 'Mind', name: 'Arcane Literacy', description: 'Books provide slightly stronger bonuses.', icon: '📖', streakRequired: 30 },
    { id: 'grand_archivist', category: 'reading', tree: 'Mind', name: 'Grand Archivist', description: 'Small chance to obtain rare books when reading.', icon: '📚', streakRequired: 90 },

    // Routine
    { id: 'steady_hands', category: 'routine', tree: 'Discipline', name: 'Steady Hands', description: 'Small Defense bonus.', icon: '⚖️', streakRequired: 7 },
    { id: 'unbreakable_routine', category: 'routine', tree: 'Discipline', name: 'Unbreakable Routine', description: 'Small chance to prevent streak loss (not implemented yet).', icon: '⛓️', streakRequired: 30 },
    { id: 'master_of_order', category: 'routine', tree: 'Discipline', name: 'Master of Order', description: 'Small bonus to all core stats.', icon: '👑', streakRequired: 90 },

    // Sleep
    { id: 'rested_mind', category: 'sleep', tree: 'Rest', name: 'Rested Mind', description: 'Small Combat XP bonus.', icon: '💤', streakRequired: 7 },
    { id: 'dreamwalker', category: 'sleep', tree: 'Rest', name: 'Dreamwalker', description: 'Slightly better Daily Board rewards.', icon: '🌙', streakRequired: 30 },
    { id: 'astral_sleeper', category: 'sleep', tree: 'Rest', name: 'Astral Sleeper', description: 'Increased chance of rare Daily Board pets.', icon: '✨', streakRequired: 90 },
];

export interface StreakData {
    currentStreak: number;
    bestStreak: number;
    lastDateLogged: string | null;
}

interface TraitState {
    streaks: Record<TraitCategory, StreakData>;
    unlockedTraits: string[];

    // Internal Actions
    logHabitCompletion: (category: TraitCategory) => void;
    checkAndApplyTraitUnlocks: (category: TraitCategory) => void;
    hasTrait: (traitId: string) => boolean;
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

const getYesterdayString = (): string => {
    const d = new Date(Date.now() - 86400000);
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

const DEFAULT_STREAK: StreakData = {
    currentStreak: 0,
    bestStreak: 0,
    lastDateLogged: null
};

export const useTraitStore = create<TraitState>()(
    persist(
        (set, get) => ({
            streaks: {
                gym: { ...DEFAULT_STREAK },
                reading: { ...DEFAULT_STREAK },
                routine: { ...DEFAULT_STREAK },
                sleep: { ...DEFAULT_STREAK }
            },
            unlockedTraits: [],

            hasTrait: (traitId: string) => {
                return get().unlockedTraits.includes(traitId);
            },

            logHabitCompletion: (category: TraitCategory) => {
                const today = getEasternDateString();
                const yesterday = getYesterdayString();
                const state = get();
                const streakData = state.streaks[category];

                if (streakData.lastDateLogged === today) {
                    // Already logged today
                    return;
                }

                let newCurrentStreak = 1;
                
                // If they logged yesterday, they maintain the string
                if (streakData.lastDateLogged === yesterday) {
                    newCurrentStreak = streakData.currentStreak + 1;
                } else if (streakData.lastDateLogged !== null && state.hasTrait('unbreakable_routine')) {
                    // Very simple unbreakable routine implementation: 10% chance to not break
                    // We only apply this if they missed yesterday (or earlier)
                    const missedDay = Math.random() < 0.10;
                    if (missedDay) {
                        import('../components/ui/Toast').then(({ useToastStore }) => {
                            useToastStore.getState().addToast({
                                type: 'info',
                                message: `Unbreakable Routine saved your ${category} streak!`,
                                duration: 3000
                            });
                        });
                        newCurrentStreak = streakData.currentStreak + 1;
                    }
                }

                const newBestStreak = Math.max(streakData.bestStreak, newCurrentStreak);

                set((s) => ({
                    streaks: {
                        ...s.streaks,
                        [category]: {
                            currentStreak: newCurrentStreak,
                            bestStreak: newBestStreak,
                            lastDateLogged: today
                        }
                    }
                }));

                get().checkAndApplyTraitUnlocks(category);
            },

            checkAndApplyTraitUnlocks: (category: TraitCategory) => {
                const state = get();
                const currentStreak = state.streaks[category].currentStreak;
                
                // Find traits for this category that the user hasn't unlocked yet
                const potentialTraits = TRAITS.filter(t => 
                    t.category === category && 
                    !state.unlockedTraits.includes(t.id) &&
                    currentStreak >= t.streakRequired
                );

                if (potentialTraits.length > 0) {
                    const newUnlockedIds = potentialTraits.map(t => t.id);
                    
                    set((s) => ({
                        unlockedTraits: [...s.unlockedTraits, ...newUnlockedIds]
                    }));

                    // Show Toast for each unlock
                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        potentialTraits.forEach(trait => {
                            useToastStore.getState().addToast({
                                type: 'success',
                                message: `Trait Unlocked: ${trait.name}\n${trait.description}`,
                                duration: 5000
                            });
                        });
                    });
                }
            }
        }),
        {
            name: PERSIST_REGISTRY.traits?.persistKey || 'gamified-life-traits-v1', // Provide fallback just in case registry isn't updated
        }
    )
);
