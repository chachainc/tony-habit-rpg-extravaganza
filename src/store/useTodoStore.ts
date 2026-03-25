import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import { safeUUID } from '../utils/safeUUID';

export type TimeOfDay = 'anytime' | 'morning' | 'afternoon' | 'evening';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'custom';

export interface Todo {
    id: string;
    title: string;
    note?: string;
    timeOfDay: TimeOfDay;
    dueDate: string; // 'YYYY-MM-DD'
    recurrence: Recurrence;
    recurrenceDays?: number[]; // 0=Sun..6=Sat for 'custom'
    completed: boolean;
    completedDate?: string;
    createdAt: string;
}

interface TodoState {
    todos: Todo[];

    // Actions
    addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'completed'>) => void;
    completeTodo: (id: string) => void;
    uncompleteTodo: (id: string) => void;
    deleteTodo: (id: string) => void;

    // Queries
    getTodosForDate: (date: string) => Todo[];
    getTodayTodos: () => Todo[];

    // Called once per day to generate next occurrences for recurring todos
    checkAndRecurTodos: () => void;
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
    anytime: '🕐 Anytime',
    morning: '🌅 Morning',
    afternoon: '☀️ Afternoon',
    evening: '🌙 Evening',
};

export const useTodoStore = create<TodoState>()(
    persist(
        (set, get) => ({
            todos: [],

            addTodo: (todo) => {
                const newTodo: Todo = {
                    ...todo,
                    id: safeUUID(),
                    completed: false,
                    createdAt: dayjs().format('YYYY-MM-DD'),
                };
                set(state => ({ todos: [...state.todos, newTodo] }));
            },

            completeTodo: (id) => {
                const today = dayjs().format('YYYY-MM-DD');
                set(state => ({
                    todos: state.todos.map(t =>
                        t.id === id ? { ...t, completed: true, completedDate: today } : t
                    ),
                }));
            },

            uncompleteTodo: (id) => {
                set(state => ({
                    todos: state.todos.map(t =>
                        t.id === id ? { ...t, completed: false, completedDate: undefined } : t
                    ),
                }));
            },

            deleteTodo: (id) => {
                set(state => ({ todos: state.todos.filter(t => t.id !== id) }));
            },

            getTodosForDate: (date) => {
                return get().todos.filter(t => t.dueDate === date);
            },

            getTodayTodos: () => {
                const today = dayjs().format('YYYY-MM-DD');
                return get().todos
                    .filter(t => t.dueDate === today)
                    .sort((a, b) => {
                        const order: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };
                        return order[a.timeOfDay] - order[b.timeOfDay];
                    });
            },

            checkAndRecurTodos: () => {
                const today = dayjs().format('YYYY-MM-DD');
                const { todos } = get();

                const toAdd: Todo[] = [];

                for (const todo of todos) {
                    if (todo.recurrence === 'none') continue;
                    // Already has a future/today occurrence
                    const alreadyExists = todos.some(
                        t => t.id !== todo.id &&
                            t.title === todo.title &&
                            t.dueDate >= today &&
                            t.recurrence === todo.recurrence
                    );
                    if (alreadyExists) continue;

                    // Only recur from the last completed occurrence
                    if (!todo.completed) continue;

                    let nextDate: dayjs.Dayjs | null = null;
                    const base = dayjs(todo.dueDate);

                    if (todo.recurrence === 'daily') {
                        nextDate = dayjs(today);
                    } else if (todo.recurrence === 'weekly') {
                        nextDate = base.add(7, 'day');
                        if (nextDate.isBefore(dayjs(today))) {
                            nextDate = dayjs(today);
                        }
                    } else if (todo.recurrence === 'custom' && todo.recurrenceDays?.length) {
                        // Find next matching weekday on or after today
                        const days = todo.recurrenceDays;
                        for (let i = 0; i < 7; i++) {
                            const candidate = dayjs(today).add(i, 'day');
                            if (days.includes(candidate.day())) {
                                nextDate = candidate;
                                break;
                            }
                        }
                    }

                    if (nextDate && nextDate.format('YYYY-MM-DD') !== todo.dueDate) {
                        toAdd.push({
                            ...todo,
                            id: safeUUID(),
                            dueDate: nextDate.format('YYYY-MM-DD'),
                            completed: false,
                            completedDate: undefined,
                            createdAt: today,
                        });
                    }
                }

                if (toAdd.length > 0) {
                    set(state => ({ todos: [...state.todos, ...toAdd] }));
                }
            },
        }),
        {
            name: 'gl-todos-v1',
        }
    )
);
