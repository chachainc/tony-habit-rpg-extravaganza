import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type BookType = 'fantasy' | 'self-improvement' | 'business';

export const BOOK_TYPES = [
    { id: 'fantasy',          label: 'Fantasy',          icon: '📘', color: '#a855f7', tomeId: 'fantasy_tome_1',    tomeName: 'Fantasy Tome I' },
    { id: 'self-improvement', label: 'Self Improvement',  icon: '📒', color: '#eab308', tomeId: 'discipline_tome_1', tomeName: 'Discipline Tome I' },
    { id: 'business',        label: 'Business',          icon: '📓', color: '#22c55e', tomeId: 'commerce_tome_1',   tomeName: 'Commerce Tome I' },
] as const;

export const BOOK_TYPE_MAP = Object.fromEntries(BOOK_TYPES.map(t => [t.id, t])) as Record<string, typeof BOOK_TYPES[number]>;

export interface Book {
    id: string;
    title: string;
    author: string;
    bookType: BookType;
    format: 'physical' | 'audiobook';
    startedAt: string;
    completedAt: string | null;
    isComplete: boolean;
    pagesRead?: number;
    notes?: string;
}

export interface BookReward {
    title: string;
    category: BookType;
    format: 'physical' | 'audiobook';
    xpRewards: { skill: string; amount: number }[];
    tomeId: string;
    tomeName: string;
}

interface BookState {
    currentBooks: Book[];
    completedBooks: Book[];
    pendingBookReward: BookReward | null;

    // Actions
    addBook: (title: string, author: string, bookType: BookType, format: 'physical' | 'audiobook', pagesRead?: number, notes?: string) => void;
    completeBook: (bookId: string) => void;
    logCompletedBook: (title: string, author: string, bookType: BookType, format: 'physical' | 'audiobook', pagesRead?: number, notes?: string) => void;
    removeBook: (bookId: string) => void;
    clearPendingBookReward: () => void;
    getCompletedCount: () => number;
    getInProgressCount: () => number;
}

const BOOK_GLOBAL_XP_REWARD = 10;
const BOOK_INTELLIGENCE_XP_REWARD = 100;

/** Returns XP rewards and tomeId for a given category + format */
function getBookRewards(bookType: BookType, format: 'physical' | 'audiobook') {
    const xpRewards: { skill: string; amount: number }[] = [];
    let tomeId = 'fantasy_tome_1';
    let tomeName = 'Fantasy Tome I';

    if (bookType === 'fantasy') {
        tomeId = 'fantasy_tome_1'; tomeName = 'Fantasy Tome I';
        if (format === 'audiobook') {
            xpRewards.push({ skill: 'Intelligence', amount: 15 });
        } else {
            xpRewards.push({ skill: 'Intelligence', amount: 25 });
            xpRewards.push({ skill: 'Habit', amount: 5 });
        }
    } else if (bookType === 'self-improvement') {
        tomeId = 'discipline_tome_1'; tomeName = 'Discipline Tome I';
        if (format === 'audiobook') {
            xpRewards.push({ skill: 'Habit', amount: 15 });
        } else {
            xpRewards.push({ skill: 'Habit', amount: 25 });
            // NOTE: no extra +5 Habit since reward IS Habit
        }
    } else if (bookType === 'business') {
        tomeId = 'commerce_tome_1'; tomeName = 'Commerce Tome I';
        if (format === 'audiobook') {
            xpRewards.push({ skill: 'Work', amount: 15 });
        } else {
            xpRewards.push({ skill: 'Work', amount: 25 });
            xpRewards.push({ skill: 'Habit', amount: 5 });
        }
    }

    return { xpRewards, tomeId, tomeName };
}

export const useBookStore = create<BookState>()(
    persist(
        (set, get) => ({
            currentBooks: [],
            completedBooks: [],
            pendingBookReward: null,

            clearPendingBookReward: () => set({ pendingBookReward: null }),

            addBook: (title, author, bookType, format, pagesRead, notes) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    bookType,
                    format,
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

                const { xpRewards, tomeId, tomeName } = getBookRewards(book.bookType, book.format);

                // Award XP — all book XP is cap-exempt
                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                for (const { skill, amount } of xpRewards) {
                    gameStore.addSkillXp(skill as any, amount, { capExempt: true });
                }

                // Award tome item
                import('./useInventoryStore').then(({ useInventoryStore }) => {
                    useInventoryStore.getState().addItem(tomeId, 1);
                }).catch(() => {});

                // Increment book trophy count
                import('./useBookTrophyStore').then(({ useBookTrophyStore }) => {
                    useBookTrophyStore.getState().incrementBooksRead();
                }).catch(() => {});

                set({
                    currentBooks: currentBooks.filter(b => b.id !== bookId),
                    completedBooks: [...completedBooks, completedBook],
                    pendingBookReward: {
                        title: book.title,
                        category: book.bookType,
                        format: book.format,
                        xpRewards,
                        tomeId,
                        tomeName,
                    },
                });
            },

            logCompletedBook: (title, author, bookType, format, pagesRead, notes) => {
                const now = new Date().toISOString();
                const newBook: Book = {
                    id: `book-${Date.now()}`,
                    title: title.trim(),
                    author: author.trim(),
                    bookType,
                    format,
                    startedAt: now,
                    completedAt: now,
                    isComplete: true,
                    pagesRead,
                    notes,
                };

                const { xpRewards, tomeId, tomeName } = getBookRewards(bookType, format);

                // Award XP — all book XP is cap-exempt
                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                for (const { skill, amount } of xpRewards) {
                    gameStore.addSkillXp(skill as any, amount, { capExempt: true });
                }

                // Award tome item
                import('./useInventoryStore').then(({ useInventoryStore }) => {
                    useInventoryStore.getState().addItem(tomeId, 1);
                }).catch(() => {});

                // Increment book trophy count
                import('./useBookTrophyStore').then(({ useBookTrophyStore }) => {
                    useBookTrophyStore.getState().incrementBooksRead();
                }).catch(() => {});

                set(state => ({
                    completedBooks: [...state.completedBooks, newBook],
                    pendingBookReward: {
                        title: title.trim(),
                        category: bookType,
                        format,
                        xpRewards,
                        tomeId,
                        tomeName,
                    },
                }));
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
            name: PERSIST_REGISTRY.books.persistKey, // bumped to v2 for bookType field
        }
    )
);

export { BOOK_GLOBAL_XP_REWARD, BOOK_INTELLIGENCE_XP_REWARD };
