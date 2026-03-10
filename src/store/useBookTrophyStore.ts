import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// Trophy milestone definitions
export interface Trophy {
    id: string;
    name: string;
    icon: string;
    description: string;
    booksRequired: number;
    intelligenceBonus: number;
    maxMPBonus: number;
    special?: 'astral_fire' | 'magic_xp_2x';
}

export const TROPHY_MILESTONES: Trophy[] = [
    {
        id: 'none',
        name: 'Empty Pedestal',
        icon: '📜',
        description: 'Complete your first book to earn a trophy.',
        booksRequired: 0,
        intelligenceBonus: 0,
        maxMPBonus: 0,
    },
    {
        id: 'novice_bookmark',
        name: 'Novice Bookmark',
        icon: '📖',
        description: 'A humble start on the path of knowledge.',
        booksRequired: 1,
        intelligenceBonus: 1,
        maxMPBonus: 0,
    },
    {
        id: 'silver_quill',
        name: 'Silver Quill',
        icon: '🪶',
        description: 'The ink of dedication marks your pages.',
        booksRequired: 5,
        intelligenceBonus: 3,
        maxMPBonus: 0,
    },
    {
        id: 'golden_tome',
        name: 'Golden Tome',
        icon: '📕',
        description: 'A master of the written word emerges.',
        booksRequired: 10,
        intelligenceBonus: 7,
        maxMPBonus: 5,
    },
    {
        id: 'eternal_encyclopedia',
        name: 'Eternal Encyclopedia',
        icon: '📚',
        description: 'Knowledge that defies time itself.',
        booksRequired: 25,
        intelligenceBonus: 15,
        maxMPBonus: 10,
    },
    {
        id: 'arcane_nebula_scroll',
        name: 'Arcane Nebula Scroll',
        icon: '🌌',
        description: 'The secrets of the universe are yours to command.',
        booksRequired: 50,
        intelligenceBonus: 30,
        maxMPBonus: 15,
        special: 'astral_fire',
    },
    {
        id: 'grand_library_crown',
        name: 'Grand Library Crown',
        icon: '👑',
        description: 'Sovereign of Wisdom. Your magic grows twice as fast.',
        booksRequired: 100,
        intelligenceBonus: 100,
        maxMPBonus: 30,
        special: 'magic_xp_2x',
    },
    {
        id: 'divine_scholars_halo',
        name: "Divine Scholar's Halo",
        icon: '🌟',
        description: 'Transcendent knowledge beyond mortal comprehension.',
        booksRequired: 150,
        intelligenceBonus: 110, // Base 100 + 10 for 150
        maxMPBonus: 50,
    },
];

interface BookTrophyState {
    totalBooksRead: number;
    lastTrophyNotified: string | null; // Trophy ID of last notification
    pendingTrophyEvolution: Trophy | null;

    // Getters
    getCurrentTrophy: () => Trophy;
    getIntelligenceBonus: () => number;
    getMaxMPBonus: () => number;
    hasMagicXPMultiplier: () => boolean;
    hasAstralFireSpell: () => boolean;

    // Actions
    incrementBooksRead: () => void;
    clearPendingEvolution: () => void;
}

export const useBookTrophyStore = create<BookTrophyState>()(
    persist(
        (set, get) => ({
            totalBooksRead: 0,
            lastTrophyNotified: null,
            pendingTrophyEvolution: null,

            getCurrentTrophy: () => {
                const books = get().totalBooksRead;
                // Find highest trophy the player qualifies for
                let current = TROPHY_MILESTONES[0];
                for (const trophy of TROPHY_MILESTONES) {
                    if (books >= trophy.booksRequired) {
                        current = trophy;
                    }
                }
                return current;
            },

            getIntelligenceBonus: () => {
                const books = get().totalBooksRead;
                const trophy = get().getCurrentTrophy();

                // For Divine Scholar's Halo (150+), add +10 for every 50 books beyond 150
                if (books >= 150) {
                    const bonusFrom150 = Math.floor((books - 150) / 50) * 10;
                    return 110 + bonusFrom150;
                }

                return trophy.intelligenceBonus;
            },

            getMaxMPBonus: () => {
                return get().getCurrentTrophy().maxMPBonus;
            },

            hasMagicXPMultiplier: () => {
                return get().totalBooksRead >= 100;
            },

            hasAstralFireSpell: () => {
                return get().totalBooksRead >= 50;
            },

            incrementBooksRead: () => {
                const prevTrophy = get().getCurrentTrophy();

                set((state) => ({
                    totalBooksRead: state.totalBooksRead + 1,
                }));

                const newTrophy = get().getCurrentTrophy();

                // Check if trophy evolved
                if (newTrophy.id !== prevTrophy.id && newTrophy.id !== 'none') {
                    set({
                        pendingTrophyEvolution: newTrophy,
                        lastTrophyNotified: newTrophy.id,
                    });
                }
            },

            clearPendingEvolution: () => {
                set({ pendingTrophyEvolution: null });
            },
        }),
        {
            name: PERSIST_REGISTRY.bookTrophies.persistKey,
        }
    )
);
