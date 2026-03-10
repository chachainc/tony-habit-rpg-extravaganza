import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Types ──────────────────────────────────────────────────────
export type MuscleGroup = 'arms' | 'shoulders' | 'legs' | 'back' | 'chest';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string; icon: string }[] = [
    { id: 'arms', label: 'Arms', icon: '💪' },
    { id: 'shoulders', label: 'Shoulders', icon: '🏋️' },
    { id: 'legs', label: 'Legs', icon: '🦵' },
    { id: 'back', label: 'Back', icon: '🔙' },
    { id: 'chest', label: 'Chest', icon: '🫁' },
];

export interface ExerciseSet {
    setNumber: number;
    weight: number;
    reps: number;
    rpe?: number;
}

export interface Exercise {
    id: string;
    exerciseName: string;
    muscleGroup: MuscleGroup;
    date: string; // YYYY-MM-DD
    sets: ExerciseSet[];
    notes?: string;
}

// ── Helpers ────────────────────────────────────────────────────
const generateId = (): string =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const getLocalDateString = (d: Date = new Date()): string => {
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

export const getDateLabel = (dateStr: string): string => {
    const today = getLocalDateString();
    const yesterday = getLocalDateString(
        new Date(Date.now() - 86400000)
    );
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const getLast7Dates = (): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        dates.push(getLocalDateString(new Date(Date.now() - i * 86400000)));
    }
    return dates;
};

export const getSetVolume = (s: ExerciseSet): number => s.weight * s.reps;

export const getExerciseVolume = (ex: Exercise): number =>
    ex.sets.reduce((sum, s) => sum + getSetVolume(s), 0);

export const getBestSet = (ex: Exercise): ExerciseSet | null => {
    if (ex.sets.length === 0) return null;
    return ex.sets.reduce((best, s) =>
        s.weight * s.reps > best.weight * best.reps ? s : best
    );
};

// ── Store ──────────────────────────────────────────────────────
interface GymState {
    exercises: Exercise[];

    // CRUD
    addExercise: (ex: Omit<Exercise, 'id'>) => string;
    updateExercise: (id: string, updates: Partial<Omit<Exercise, 'id'>>) => void;
    deleteExercise: (id: string) => void;
    updateSets: (exerciseId: string, sets: ExerciseSet[]) => void;

    // Queries
    getByDateAndMuscle: (date: string, muscle: MuscleGroup) => Exercise[];
    getLastSession: (exerciseName: string, muscle: MuscleGroup, beforeDate?: string) => Exercise | null;
    getExerciseHistory: (exerciseName: string, muscle: MuscleGroup) => Exercise[];
    getAutocompleteSuggestions: (muscle: MuscleGroup) => string[];
    getAllExerciseNames: () => string[];
}

export const useGymStore = create<GymState>()(
    persist(
        (set, get) => ({
            exercises: [],

            addExercise: (ex) => {
                const id = generateId();
                const newExercise: Exercise = { ...ex, id };

                // Check for duplicate exercise name on same day+muscle
                const existing = get().exercises.find(
                    e => e.exerciseName.toLowerCase() === ex.exerciseName.toLowerCase()
                        && e.muscleGroup === ex.muscleGroup
                        && e.date === ex.date
                );

                if (existing) {
                    // Merge sets into existing exercise
                    const mergedSets = [
                        ...existing.sets,
                        ...ex.sets.map((s, i) => ({
                            ...s,
                            setNumber: existing.sets.length + i + 1,
                        })),
                    ];
                    set(state => ({
                        exercises: state.exercises.map(e =>
                            e.id === existing.id
                                ? { ...e, sets: mergedSets, notes: ex.notes || e.notes }
                                : e
                        ),
                    }));
                    return existing.id;
                }

                set(state => ({
                    exercises: [...state.exercises, newExercise],
                }));
                return id;
            },

            updateExercise: (id, updates) => {
                set(state => ({
                    exercises: state.exercises.map(e =>
                        e.id === id ? { ...e, ...updates } : e
                    ),
                }));
            },

            deleteExercise: (id) => {
                set(state => ({
                    exercises: state.exercises.filter(e => e.id !== id),
                }));
            },

            updateSets: (exerciseId, sets) => {
                set(state => ({
                    exercises: state.exercises.map(e =>
                        e.id === exerciseId ? { ...e, sets } : e
                    ),
                }));
            },

            getByDateAndMuscle: (date, muscle) => {
                return get().exercises
                    .filter(e => e.date === date && e.muscleGroup === muscle)
                    .sort((a, b) => a.id.localeCompare(b.id));
            },

            getLastSession: (exerciseName, muscle, beforeDate) => {
                const ref = beforeDate || getLocalDateString();
                const matches = get().exercises
                    .filter(
                        e =>
                            e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
                            && e.muscleGroup === muscle
                            && e.date < ref
                    )
                    .sort((a, b) => b.date.localeCompare(a.date));
                return matches[0] || null;
            },

            getExerciseHistory: (exerciseName, muscle) => {
                return get().exercises
                    .filter(
                        e =>
                            e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
                            && e.muscleGroup === muscle
                    )
                    .sort((a, b) => b.date.localeCompare(a.date));
            },

            getAutocompleteSuggestions: (muscle) => {
                const names = new Set<string>();
                get().exercises.forEach(e => {
                    if (e.muscleGroup === muscle) {
                        names.add(e.exerciseName);
                    }
                });
                return Array.from(names).sort();
            },

            getAllExerciseNames: () => {
                const names = new Set<string>();
                get().exercises.forEach(e => names.add(e.exerciseName));
                return Array.from(names).sort();
            },
        }),
        {
            name: PERSIST_REGISTRY.gym.persistKey,
        }
    )
);
