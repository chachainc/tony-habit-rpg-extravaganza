import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type BookType = 'fantasy' | 'business' | 'self-improvement' | 'history' | 'philosophy';

export const BOOK_TYPES = [
    { id: 'fantasy', label: 'Fantasy', icon: '📘', color: '#60a5fa', bonusStat: 'Intelligence' },
    { id: 'business', label: 'Business', icon: '📓', color: '#9ca3af', bonusStat: 'Intelligence & Strategy' },
    { id: 'self-improvement', label: 'Self-Improvement', icon: '📒', color: '#fcd34d', bonusStat: 'Intelligence' },
    { id: 'history', label: 'History', icon: '📖', color: '#b45309', bonusStat: 'Intelligence' },
    { id: 'philosophy', label: 'Philosophy', icon: '📚', color: '#a78bfa', bonusStat: 'Intelligence' }
] as const;

export const BOOK_TYPE_MAP = Object.fromEntries(BOOK_TYPES.map(t => [t.id, t])) as Record<string, typeof BOOK_TYPES[number]>;

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
                let intXp = BOOK_INTELLIGENCE_XP_REWARD;
                if (book.pagesRead) {
                    if (book.pagesRead < 100) intXp = 50;
                    else if (book.pagesRead > 300) intXp = 200;
                }

                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                gameStore.addSkillXp('Intelligence', intXp);

                if (book.bookType === 'business') {
                    import('./useStrategyStore').then(({ useStrategyStore }) => {
                        useStrategyStore.getState().addStrategyXp(5);
                    }).catch(() => { });
                }

                // Award book item
                import('./useInventoryStore').then(({ useInventoryStore, ITEM_DB }) => {
                    const itemId = `${book.bookType}_book_1`;
                    const inventoryStore = useInventoryStore.getState();
                    inventoryStore.addItem(itemId, 1);

                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        const itemDef = ITEM_DB[itemId];
                        const name = itemDef ? itemDef.name : 'Unknown Tome';

                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `New Item Earned: ${name}`,
                            duration: 4000
                        });

                        setTimeout(() => {
                            const updatedInventory = useInventoryStore.getState();
                            const currentCount = updatedInventory.items[itemId] || 0;
                            if (currentCount >= 3) {
                                const nextDef = ITEM_DB[`${book.bookType}_book_2`];
                                if (nextDef) {
                                    useToastStore.getState().addToast({
                                        type: 'info',
                                        message: `You now have enough copies to fuse into ${nextDef.name}.`,
                                        duration: 5000
                                    });
                                }
                            }
                        }, 500);
                    }).catch(() => { });
                }).catch(() => { });

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

                let intXp = BOOK_INTELLIGENCE_XP_REWARD;
                if (pagesRead) {
                    if (pagesRead < 100) intXp = 50;
                    else if (pagesRead > 300) intXp = 200;
                }

                const gameStore = useGameStore.getState();
                gameStore.addGlobalXp(BOOK_GLOBAL_XP_REWARD);
                gameStore.addSkillXp('Intelligence', intXp);

                if (bookType === 'business') {
                    import('./useStrategyStore').then(({ useStrategyStore }) => {
                        useStrategyStore.getState().addStrategyXp(5);
                    }).catch(() => { });
                }

                // Award book item
                import('./useInventoryStore').then(({ useInventoryStore, ITEM_DB }) => {
                    const itemId = `${bookType}_book_1`;
                    const inventoryStore = useInventoryStore.getState();
                    inventoryStore.addItem(itemId, 1);

                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        const itemDef = ITEM_DB[itemId];
                        const name = itemDef ? itemDef.name : 'Unknown Tome';

                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `New Item Earned: ${name}`,
                            duration: 4000
                        });

                        setTimeout(() => {
                            const updatedInventory = useInventoryStore.getState();
                            const currentCount = updatedInventory.items[itemId] || 0;
                            if (currentCount >= 3) {
                                const nextDef = ITEM_DB[`${bookType}_book_2`];
                                if (nextDef) {
                                    useToastStore.getState().addToast({
                                        type: 'info',
                                        message: `You now have enough copies to fuse into ${nextDef.name}.`,
                                        duration: 5000
                                    });
                                }
                            }
                        }, 500);
                    }).catch(() => { });
                }).catch(() => { });

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
            name: PERSIST_REGISTRY.books.persistKey, // bumped to v2 for bookType field
        }
    )
);

export { BOOK_GLOBAL_XP_REWARD, BOOK_INTELLIGENCE_XP_REWARD };
