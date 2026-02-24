import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';

export interface Book {
    id: string;
    title: string;
    author: string;
    startedAt: string;
    completedAt: string | null;
    isComplete: boolean;
    pagesRead?: number;
    notes?: string;
}

interface BookState {
    currentBooks: Book[];      // In-progress books
    completedBooks: Book[];    // Finished books (permanent display)

    // Actions
    addBook: (title: string, author: string, pagesRead?: number, notes?: string) => void;
    completeBook: (bookId: string) => void;
    logCompletedBook: (title: string, author: string, pagesRead?: number, notes?: string) => void;
    removeBook: (bookId: string) => void;
    getCompletedCount: () => number;
    getInProgressCount: () => number;
}

// Constants for book rewards
const BOOK_GLOBAL_XP_REWARD = 10;
const BOOK_INTELLIGENCE_XP_REWARD = 100; // Massive XP for completing books

export const useBookStore = create<BookState>()(
    persist(
        (set, get) => ({
            currentBooks: [],
            completedBooks: [],

            addBook: (title: string, author: string, pagesRead?: number, notes?: string) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    startedAt: now,
                    completedAt: null,
                    isComplete: false,
                    pagesRead,
                    notes,
                };

                set((state) => ({
                    currentBooks: [...state.currentBooks, newBook],
                }));
            },

            completeBook: (bookId: string) => {
                const { currentBooks, completedBooks } = get();
                const book = currentBooks.find(b => b.id === bookId);

                if (!book) return;

                const completedBook: Book = {
                    ...book,
                    completedAt: new Date().toISOString(),
                    isComplete: true,
                };

                // Award XP
                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                gameStore.addSkillXp('Intelligence', BOOK_INTELLIGENCE_XP_REWARD);

                // Move to completed books
                set({
                    currentBooks: currentBooks.filter(b => b.id !== bookId),
                    completedBooks: [...completedBooks, completedBook],
                });
            },

            logCompletedBook: (title: string, author: string, pagesRead?: number, notes?: string) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    startedAt: now,
                    completedAt: now,
                    isComplete: true,
                    pagesRead,
                    notes,
                };

                // Award XP
                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                gameStore.addSkillXp('Intelligence', BOOK_INTELLIGENCE_XP_REWARD);

                set((state) => ({
                    completedBooks: [...state.completedBooks, newBook],
                }));
            },

            removeBook: (bookId: string) => {
                set((state) => ({
                    currentBooks: state.currentBooks.filter(b => b.id !== bookId),
                }));
            },

            getCompletedCount: () => {
                return get().completedBooks.length;
            },

            getInProgressCount: () => {
                return get().currentBooks.length;
            },
        }),
        {
            name: 'gl-books-storage-v1',
        }
    )
);

// Export constants for UI display
export { BOOK_GLOBAL_XP_REWARD, BOOK_INTELLIGENCE_XP_REWARD };
