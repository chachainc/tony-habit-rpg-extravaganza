import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type JournalCategory = 'personal' | 'movie' | 'book';

export interface JournalEntry {
    id: string; // uuid
    category: JournalCategory;
    content: string;
    timestamp: number;
}

interface JournalState {
    entries: JournalEntry[];

    // Actions
    upsertEntry: (id: string, category: JournalCategory, content: string) => void;
    deleteEmptyEntries: () => void;
    getEntriesByCategory: (category: JournalCategory) => JournalEntry[];
}

export const useJournalStore = create<JournalState>()(
    persist(
        (set, get) => ({
            entries: [],

            upsertEntry: (id, category, content) => {
                set((state) => {
                    const existingIndex = state.entries.findIndex(e => e.id === id);
                    if (existingIndex >= 0) {
                        const updated = [...state.entries];
                        updated[existingIndex] = { ...updated[existingIndex], content, timestamp: Date.now() };
                        return { entries: updated };
                    } else {
                        const newEntry: JournalEntry = { id, category, content, timestamp: Date.now() };
                        return { entries: [newEntry, ...state.entries] };
                    }
                });
            },

            deleteEmptyEntries: () => {
                set((state) => ({
                    entries: state.entries.filter(e => e.content.trim().length > 0)
                }));
            },

            getEntriesByCategory: (category) => {
                return get().entries
                    .filter(e => e.category === category)
                    .sort((a, b) => b.timestamp - a.timestamp); // latest first
            }
        }),
        {
            name: PERSIST_REGISTRY.journal.persistKey,
        }
    )
);
