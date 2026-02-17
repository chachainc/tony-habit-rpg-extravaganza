import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Clock, TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import {
    type MuscleGroup,
    MUSCLE_GROUPS,
    useGymStore,
    getLocalDateString,
    getDateLabel,
    getExerciseVolume,
    getBestSet,
} from '../../store/useGymStore';
import { ExerciseEntry } from './ExerciseEntry';
import { DateNavigator } from './DateNavigator';
import { ExerciseHistory } from './ExerciseHistory';

interface Props {
    muscleGroup: MuscleGroup;
    date: string;
    onDateChange: (date: string) => void;
    onBack: () => void;
}

export const DailyLog = ({ muscleGroup, date, onDateChange, onBack }: Props) => {
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const [showYesterday, setShowYesterday] = useState(false);
    const [historyExercise, setHistoryExercise] = useState<{ name: string; muscle: MuscleGroup } | null>(null);

    const { getByDateAndMuscle, getLastSession, deleteExercise } = useGymStore();

    const groupInfo = MUSCLE_GROUPS.find(g => g.id === muscleGroup)!;
    const todayExercises = getByDateAndMuscle(date, muscleGroup);

    // Yesterday's exercises for summary
    const yesterdayDate = getLocalDateString(new Date(Date.now() - 86400000));
    const yesterdayExercises = getByDateAndMuscle(yesterdayDate, muscleGroup);

    const handleDelete = (id: string) => {
        if (confirm('Delete this exercise?')) {
            deleteExercise(id);
        }
    };

    return (
        <div className="daily-log">
            {/* Header */}
            <div className="daily-log__header">
                <button className="gym-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="daily-log__title">
                    <span className="daily-log__muscle-icon">{groupInfo.icon}</span>
                    <h3>{groupInfo.label}</h3>
                </div>
            </div>

            {/* Date Navigator */}
            <DateNavigator selectedDate={date} onSelectDate={onDateChange} />

            {/* Yesterday Summary (collapsible) - Only show if viewing today */}
            {yesterdayExercises.length > 0 && date === getLocalDateString() && (
                <div className="yesterday-summary">
                    <button
                        className="yesterday-summary__toggle"
                        onClick={() => setShowYesterday(!showYesterday)}
                    >
                        <Clock size={14} />
                        <span>Yesterday's {groupInfo.label} ({yesterdayExercises.length} exercise{yesterdayExercises.length > 1 ? 's' : ''})</span>
                        {showYesterday ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <AnimatePresence>
                        {showYesterday && (
                            <motion.div
                                className="yesterday-summary__content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                            >
                                {yesterdayExercises.map(ex => {
                                    const best = getBestSet(ex);
                                    return (
                                        <div key={ex.id} className="yesterday-summary__exercise">
                                            <span className="yesterday-summary__name">{ex.exerciseName}</span>
                                            <span className="yesterday-summary__detail">
                                                {ex.sets.length} sets
                                                {best && ` · ${best.weight}lb × ${best.reps}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Exercise List */}
            <div className="exercise-list">
                {todayExercises.length === 0 ? (
                    <div className="exercise-list__empty">
                        <p>No exercises logged for {getDateLabel(date).toLowerCase()}.</p>
                        <p className="exercise-list__empty-hint">Tap "+ Add Exercise" to start logging!</p>
                    </div>
                ) : (
                    todayExercises.map(ex => {
                        const volume = getExerciseVolume(ex);
                        const best = getBestSet(ex);
                        const lastSession = getLastSession(ex.exerciseName, muscleGroup, date);
                        const lastVolume = lastSession ? getExerciseVolume(lastSession) : null;
                        const volumeDiff = lastVolume != null ? volume - lastVolume : null;
                        const lastBest = lastSession ? getBestSet(lastSession) : null;

                        return (
                            <motion.div
                                key={ex.id}
                                className="exercise-card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="exercise-card__header">
                                    <h4 className="exercise-card__name">{ex.exerciseName}</h4>
                                    <div className="exercise-card__actions">
                                        <button
                                            className="exercise-card__action-btn"
                                            title="History"
                                            onClick={() => setHistoryExercise({ name: ex.exerciseName, muscle: muscleGroup })}
                                        >
                                            <History size={14} />
                                        </button>
                                        <button
                                            className="exercise-card__action-btn"
                                            title="Edit"
                                            onClick={() => setEditingExerciseId(ex.id)}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="exercise-card__action-btn exercise-card__action-btn--delete"
                                            title="Delete"
                                            onClick={() => handleDelete(ex.id)}
                                        >
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Sets summary */}
                                <div className="exercise-card__sets">
                                    {ex.sets.map(s => (
                                        <div key={s.setNumber} className="exercise-card__set-row">
                                            <span className="set-num">Set {s.setNumber}</span>
                                            <span className="set-detail">{s.weight} lb × {s.reps}</span>
                                            {s.rpe && <span className="set-rpe">RPE {s.rpe}</span>}
                                        </div>
                                    ))}
                                </div>

                                {/* Progression chips */}
                                <div className="exercise-card__footer">
                                    {lastSession && (
                                        <span className="exercise-card__last-date">
                                            Last: {getDateLabel(lastSession.date)}
                                        </span>
                                    )}
                                    <div className="exercise-card__chips">
                                        {best && (
                                            <span className="chip chip--neutral">
                                                Top: {best.weight}lb × {best.reps}
                                            </span>
                                        )}
                                        {volumeDiff != null && volumeDiff !== 0 && (
                                            <span className={`chip ${volumeDiff > 0 ? 'chip--up' : 'chip--down'}`}>
                                                {volumeDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {volumeDiff > 0 ? '+' : ''}{volumeDiff} vol
                                            </span>
                                        )}
                                        {lastBest && best && (
                                            (() => {
                                                const diff = (best.weight * best.reps) - (lastBest.weight * lastBest.reps);
                                                if (diff === 0) return null;
                                                return (
                                                    <span className={`chip ${diff > 0 ? 'chip--up' : 'chip--down'}`}>
                                                        {diff > 0 ? '↑' : '↓'} Best set
                                                    </span>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Add Exercise Button */}
            <motion.button
                className="add-exercise-btn"
                onClick={() => setShowAddExercise(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
            >
                <Plus size={20} />
                Add Exercise
            </motion.button>

            {/* Add Exercise Modal */}
            <AnimatePresence>
                {showAddExercise && (
                    <ExerciseEntry
                        muscleGroup={muscleGroup}
                        date={date}
                        onClose={() => setShowAddExercise(false)}
                    />
                )}
            </AnimatePresence>

            {/* Edit Exercise Modal */}
            <AnimatePresence>
                {editingExerciseId && (
                    <ExerciseEntry
                        muscleGroup={muscleGroup}
                        date={date}
                        editExerciseId={editingExerciseId}
                        onClose={() => setEditingExerciseId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Exercise History Modal */}
            <AnimatePresence>
                {historyExercise && (
                    <ExerciseHistory
                        exerciseName={historyExercise.name}
                        muscleGroup={historyExercise.muscle}
                        onClose={() => setHistoryExercise(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
