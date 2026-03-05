// ─── BOOK ARTIFACT STORE ──────────────────────────────────────────────────────
// Book artifacts are earned by completing books in the Library.
// They support fusion (2 of same type+level → next level up to Lv5).
// One book artifact can be equipped; its passive bonus applies in battle/arena.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Book Types ────────────────────────────────────────────────────────────────

export type BookType = 'fantasy' | 'history' | 'business' | 'selfhelp';

export interface BookTypeDef {
    id: BookType;
    label: string;
    icon: string;
    color: string;         // CSS hex color
    bonusStat: string;     // Human-readable stat name
    bonusDescription: string;
}

export const BOOK_TYPES: BookTypeDef[] = [
    {
        id: 'fantasy',
        label: 'Fantasy',
        icon: '📘',
        color: '#60a5fa',   // light blue
        bonusStat: 'Arena Combat XP',
        bonusDescription: '+% Arena Combat XP gain',
    },
    {
        id: 'history',
        label: 'History',
        icon: '📖',
        color: '#b45309',   // brown
        bonusStat: 'Boss Damage',
        bonusDescription: '+% Boss damage',
    },
    {
        id: 'business',
        label: 'Business',
        icon: '📓',
        color: '#94a3b8',   // silver/gray (black & white feel)
        bonusStat: 'Marketplace Rewards',
        bonusDescription: '+% Marketplace currency drops',
    },
    {
        id: 'selfhelp',
        label: 'Self-Help / Improvement',
        icon: '📒',
        color: '#fbbf24',   // yellow
        bonusStat: 'Skill XP Gain',
        bonusDescription: '+% overall Skill XP gain',
    },
];

export const BOOK_TYPE_MAP: Record<BookType, BookTypeDef> = Object.fromEntries(
    BOOK_TYPES.map(t => [t.id, t])
) as Record<BookType, BookTypeDef>;

// ── Level Bonuses ─────────────────────────────────────────────────────────────

export const BOOK_LEVEL_BONUSES: Record<number, number> = {
    1: 0.05,
    2: 1,
    3: 2,
    4: 3.5,
    5: 5,
};

export const BOOK_MAX_LEVEL = 5;

// Get the bonus percentage for a given level
export const getBookBonus = (level: number): number =>
    BOOK_LEVEL_BONUSES[Math.min(level, BOOK_MAX_LEVEL)] ?? 0.05;

// ── Book Artifact ─────────────────────────────────────────────────────────────

export interface BookArtifact {
    id: string;       // unique artifact instance id
    bookType: BookType;
    level: number;    // 1–5
    sourceTitle: string; // title of the book that spawned it
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface BookArtifactState {
    artifacts: BookArtifact[];        // all owned book artifacts
    equippedArtifactId: string | null;

    // Award a Lv1 artifact when a book is completed
    awardArtifact: (bookType: BookType, sourceTitle: string) => void;

    // Fuse two artifacts of the same type + same level → produce level+1
    fuseArtifacts: (id1: string, id2: string) => { success: boolean; reason?: string };

    // Equip / unequip
    equipArtifact: (id: string | null) => void;

    // Getters
    getEquippedArtifact: () => BookArtifact | null;
    getArtifactsByType: (type: BookType) => BookArtifact[];
    getFusablePairs: () => Array<{ type: BookType; level: number; count: number; ids: string[] }>;
}

export const useBookArtifactStore = create<BookArtifactState>()(
    persist(
        (set, get) => ({
            artifacts: [],
            equippedArtifactId: null,

            awardArtifact: (bookType, sourceTitle) => {
                const newArtifact: BookArtifact = {
                    id: `book-artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    bookType,
                    level: 1,
                    sourceTitle,
                };
                set(s => ({ artifacts: [...s.artifacts, newArtifact] }));
            },

            fuseArtifacts: (id1, id2) => {
                const { artifacts } = get();
                const a1 = artifacts.find(a => a.id === id1);
                const a2 = artifacts.find(a => a.id === id2);

                if (!a1 || !a2) return { success: false, reason: 'Artifact not found' };
                if (a1.id === a2.id) return { success: false, reason: 'Cannot fuse an artifact with itself' };
                if (a1.bookType !== a2.bookType) return { success: false, reason: 'Must fuse books of the same type' };
                if (a1.level !== a2.level) return { success: false, reason: 'Must fuse books of the same level' };
                if (a1.level >= BOOK_MAX_LEVEL) return { success: false, reason: 'Already at max level' };

                const newLevel = a1.level + 1;
                const fusedArtifact: BookArtifact = {
                    id: `book-artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    bookType: a1.bookType,
                    level: newLevel,
                    sourceTitle: `${a1.sourceTitle} + ${a2.sourceTitle}`,
                };

                // Remove consumed artifacts, add new one
                // If one of them was equipped, equip the new one
                const wasEquipped =
                    get().equippedArtifactId === id1 || get().equippedArtifactId === id2;

                set(s => ({
                    artifacts: [
                        ...s.artifacts.filter(a => a.id !== id1 && a.id !== id2),
                        fusedArtifact,
                    ],
                    equippedArtifactId: wasEquipped ? fusedArtifact.id : s.equippedArtifactId,
                }));

                return { success: true };
            },

            equipArtifact: (id) => set({ equippedArtifactId: id }),

            getEquippedArtifact: () => {
                const id = get().equippedArtifactId;
                return id ? get().artifacts.find(a => a.id === id) ?? null : null;
            },

            getArtifactsByType: (type) =>
                get().artifacts.filter(a => a.bookType === type),

            getFusablePairs: () => {
                const { artifacts } = get();
                const groups: Record<string, BookArtifact[]> = {};
                for (const a of artifacts) {
                    const key = `${a.bookType}-${a.level}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(a);
                }

                return Object.entries(groups)
                    .filter(([, arr]) => arr.length >= 2 && arr[0].level < BOOK_MAX_LEVEL)
                    .map(([, arr]) => ({
                        type: arr[0].bookType,
                        level: arr[0].level,
                        count: arr.length,
                        ids: arr.map(a => a.id),
                    }));
            },
        }),
        { name: 'gl-book-artifacts-v1' }
    )
);
