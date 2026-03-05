import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';
import { type BookType } from './useBookArtifactStore';

export type { BookType };

export interface Book {
    id: string;
    title: string;
    author: string;
    bookType: BookType;        // ← NEW: required category
    startedAt: string;
    completedAt: string | null;
    isComplete: boolean;
    pagesRead?: number;
    notes?: string;
}

interface BookState {
    currentBooks: Book[];
    completedBooks: Book[];

    // Actions
    addBook: (title: string, author: string, bookType: BookType, pagesRead?: number, notes?: string) => void;
    completeBook: (bookId: string) => void;
    logCompletedBook: (title: string, author: string, bookType: BookType, pagesRead?: number, notes?: string) => void;
    removeBook: (bookId: string) => void;
    getCompletedCount: () => number;
    getInProgressCount: () => number;
}

const BOOK_GLOBAL_XP_REWARD = 10;
const BOOK_INTELLIGENCE_XP_REWARD = 100;

export const useBookStore = create<BookState>()(
    persist(
        (set, get) => ({
            currentBooks: [],
            completedBooks: [],

            addBook: (title, author, bookType, pagesRead, notes) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    bookType,
                    startedAt: now,
                    completedAt: null,
                    isComplete: false,
                    pagesRead,
                    notes,
                };
                set(state => ({ currentBooks: [...state.currentBooks, newBook] }));
            },

            completeBook: (bookId) => {
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

                // Award book artifact (lazy import to avoid circular dep)
                import('./useBookArtifactStore').then(({ useBookArtifactStore }) => {
                    useBookArtifactStore.getState().awardArtifact(book.bookType, book.title);
                });

                set({
                    currentBooks: currentBooks.filter(b => b.id !== bookId),
                    completedBooks: [...completedBooks, completedBook],
                });
            },

            logCompletedBook: (title, author, bookType, pagesRead, notes) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    bookType,
                    startedAt: now,
                    completedAt: now,
                    isComplete: true,
                    pagesRead,
                    notes,
                };

                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                gameStore.addSkillXp('Intelligence', BOOK_INTELLIGENCE_XP_REWARD);

                // Award artifact
                import('./useBookArtifactStore').then(({ useBookArtifactStore }) => {
                    useBookArtifactStore.getState().awardArtifact(bookType, title);
                });

                set(state => ({ completedBooks: [...state.completedBooks, newBook] }));
            },

            removeBook: (bookId) => {
                set(state => ({
                    currentBooks: state.currentBooks.filter(b => b.id !== bookId),
                }));
            },

            getCompletedCount: () => get().completedBooks.length,
            getInProgressCount: () => get().currentBooks.length,
        }),
        {
            name: 'gl-books-storage-v2', // bumped to v2 for bookType field
        }
    )
);

export { BOOK_GLOBAL_XP_REWARD, BOOK_INTELLIGENCE_XP_REWARD };
