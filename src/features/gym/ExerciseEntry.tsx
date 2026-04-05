import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Save, Search } from 'lucide-react';
import {
    type MuscleGroup,
    type ExerciseSet,
    useGymStore,
} from '../../store/useGymStore';

interface Props {
    muscleGroup: MuscleGroup;
    date: string;
    editExerciseId?: string;
    ghostWorkoutDate?: string;
    onClose: () => void;
}

const DEFAULT_SETS: ExerciseSet[] = [
    { setNumber: 1, weight: 0, reps: 0 },
    { setNumber: 2, weight: 0, reps: 0 },
    { setNumber: 3, weight: 0, reps: 0 },
];

export const ExerciseEntry = ({ muscleGroup, date, editExerciseId, ghostWorkoutDate, onClose }: Props) => {
    const { addExercise, updateExercise, getAutocompleteSuggestions, getLastSession, getByDateAndMuscle, exercises } = useGymStore();

    // If editing, load existing data
    const existingExercise = editExerciseId
        ? exercises.find(e => e.id === editExerciseId)
        : null;

    const [exerciseName, setExerciseName] = useState(existingExercise?.exerciseName || '');
    const [sets, setSets] = useState<ExerciseSet[]>(existingExercise?.sets || DEFAULT_SETS);
    const [notes, setNotes] = useState(existingExercise?.notes || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = useMemo(
        () => getAutocompleteSuggestions(muscleGroup),
        [muscleGroup, getAutocompleteSuggestions]
    );

    const filteredSuggestions = useMemo(
        () =>
            exerciseName.length > 0
                ? suggestions.filter(s =>
                    s.toLowerCase().includes(exerciseName.toLowerCase()) &&
                    s.toLowerCase() !== exerciseName.toLowerCase()
                )
                : suggestions,
        [exerciseName, suggestions]
    );

    // Ghost data — use specific ghostWorkoutDate if provided, otherwise last session
    const ghostSession = useMemo(() => {
        if (!exerciseName) return null;
        if (ghostWorkoutDate) {
            // Pull from a specific historical date for that muscle group
            const dateExercises = getByDateAndMuscle(ghostWorkoutDate, muscleGroup);
            return dateExercises.find(
                e => e.exerciseName.toLowerCase() === exerciseName.toLowerCase()
            ) || null;
        }
        return getLastSession(exerciseName, muscleGroup, date);
    }, [exerciseName, muscleGroup, date, ghostWorkoutDate, getLastSession, getByDateAndMuscle]);

    const getGhostSet = (setNum: number) => {
        if (!ghostSession) return null;
        return ghostSession.sets.find(s => s.setNumber === setNum)
            || ghostSession.sets[setNum - 1] // fallback by index
            || null;
    };

    // Focus name input on mount
    useEffect(() => {
        if (!editExerciseId) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [editExerciseId]);

    const updateSet = (index: number, field: keyof ExerciseSet, value: number) => {
        setSets(prev =>
            prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
        );
    };

    const addSet = () => {
        setSets(prev => [
            ...prev,
            { setNumber: prev.length + 1, weight: 0, reps: 0 },
        ]);
    };

    const removeSet = (index: number) => {
        if (sets.length <= 1) return;
        setSets(prev =>
            prev
                .filter((_, i) => i !== index)
                .map((s, i) => ({ ...s, setNumber: i + 1 }))
        );
    };

    const handleSave = () => {
        if (!exerciseName.trim()) return;

        const cleanedSets = sets.filter(s => s.weight > 0 || s.reps > 0);
        if (cleanedSets.length === 0) return;

        if (editExerciseId) {
            updateExercise(editExerciseId, {
                exerciseName: exerciseName.trim(),
                sets: cleanedSets,
                notes: notes.trim() || undefined,
            });
        } else {
            addExercise({
                exerciseName: exerciseName.trim(),
                muscleGroup,
                date,
                sets: cleanedSets,
                notes: notes.trim() || undefined,
            });
        }
        onClose();
    };

    const selectSuggestion = (name: string) => {
        setExerciseName(name);
        setShowSuggestions(false);
    };

    return (
        <motion.div
            className="exercise-entry-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="exercise-entry"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="exercise-entry__header">
                    <h3>{editExerciseId ? 'Edit Exercise' : 'Add Exercise'}</h3>
                    <button className="exercise-entry__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Exercise Name */}
                <div className="exercise-entry__name-section">
                    <label>Exercise Name</label>
                    <div className="exercise-entry__name-input-wrap">
                        <Search size={16} className="exercise-entry__search-icon" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="e.g. Barbell Curl"
                            value={exerciseName}
                            onChange={e => {
                                setExerciseName(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="exercise-entry__name-input"
                        />
                    </div>

                    {/* Autocomplete dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="exercise-entry__suggestions">
                            {filteredSuggestions.slice(0, 6).map(name => (
                                <button
                                    key={name}
                                    className="exercise-entry__suggestion"
                                    onMouseDown={() => selectSuggestion(name)}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Ghost: last performed date */}
                    {ghostSession && (
                        <div className="ghost-hint">
                            Last performed: {ghostSession.date}
                        </div>
                    )}
                </div>

                {/* Sets Table */}
                <div className="exercise-entry__sets">
                    <div className="sets-table__header">
                        <span className="sets-col sets-col--num">Set</span>
                        <span className="sets-col sets-col--weight">Weight (lb)</span>
                        <span className="sets-col sets-col--reps">Reps</span>
                        <span className="sets-col sets-col--rpe">RPE</span>
                        <span className="sets-col sets-col--action"></span>
                    </div>

                    {sets.map((s, i) => {
                        const ghost = getGhostSet(s.setNumber);
                        return (
                            <div key={i} className="sets-table__row">
                                <span className="sets-col sets-col--num">{s.setNumber}</span>
                                <div className="sets-col sets-col--weight">
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={s.weight || ''}
                                        placeholder={ghost ? String(ghost.weight) : '0'}
                                        onChange={e => updateSet(i, 'weight', Number(e.target.value))}
                                        className="set-input"
                                    />
                                    {ghost && (
                                        <span className="ghost-text">Last: {ghost.weight} lb</span>
                                    )}
                                </div>
                                <div className="sets-col sets-col--reps">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={s.reps || ''}
                                        placeholder={ghost ? String(ghost.reps) : '0'}
                                        onChange={e => updateSet(i, 'reps', Number(e.target.value))}
                                        className="set-input"
                                    />
                                    {ghost && (
                                        <span className="ghost-text">Last: {ghost.reps}</span>
                                    )}
                                </div>
                                <div className="sets-col sets-col--rpe">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        max="10"
                                        value={s.rpe || ''}
                                        placeholder="—"
                                        onChange={e => updateSet(i, 'rpe', Number(e.target.value))}
                                        className="set-input set-input--small"
                                    />
                                </div>
                                <div className="sets-col sets-col--action">
                                    <button
                                        className="set-remove-btn"
                                        onClick={() => removeSet(i)}
                                        disabled={sets.length <= 1}
                                    >
                                        <Minus size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <button className="add-set-btn" onClick={addSet}>
                        <Plus size={14} /> Add Set
                    </button>
                </div>

                {/* Notes */}
                <div className="exercise-entry__notes">
                    <label>Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="How did it feel?"
                        rows={2}
                    />
                </div>

                {/* Save */}
                <motion.button
                    className="exercise-entry__save"
                    onClick={handleSave}
                    disabled={!exerciseName.trim()}
                    whileTap={{ scale: 0.97 }}
                >
                    <Save size={18} />
                    {editExerciseId ? 'Update Exercise' : 'Save Exercise'}
                </motion.button>
            </motion.div>
        </motion.div>
    );
};
