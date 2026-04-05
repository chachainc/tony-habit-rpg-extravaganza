import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, RotateCcw, ClipboardList } from 'lucide-react';
import {
    type MuscleGroup,
    MUSCLE_GROUPS,
    useGymStore,
    getDateLabel,
    getExerciseVolume,
    getBestSet,
} from '../../store/useGymStore';
import { MUSCLE_COLORS, MUSCLE_ICONS } from './GymTracker';

interface Props {
    onBack: () => void;
    onLoadWorkout: (date: string, muscle: MuscleGroup) => void;
}

export const WorkoutLog = ({ onBack, onLoadWorkout }: Props) => {
    const exercises = useGymStore(s => s.exercises);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    // Group exercises by date, sorted newest first
    const sessionsByDate = exercises.reduce((acc, ex) => {
        if (!acc[ex.date]) acc[ex.date] = [];
        acc[ex.date].push(ex);
        return acc;
    }, {} as Record<string, typeof exercises>);

    const sortedDates = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
        return (
            <div className="gym-tracker">
                <div className="gym-header">
                    <button className="gym-back-btn" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="gym-header__title">
                        <ClipboardList size={22} />
                        <h2>Workout Log</h2>
                    </div>
                </div>
                <div className="gym-load-empty">
                    <span className="gym-load-empty__icon">📋</span>
                    <p>No workouts logged yet.</p>
                    <p className="gym-load-empty__sub">Start tracking to build your history!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gym-tracker">
            <div className="gym-header">
                <button className="gym-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="gym-header__title">
                    <ClipboardList size={22} />
                    <h2>Workout Log</h2>
                </div>
            </div>
            <p className="gym-subtitle">{sortedDates.length} sessions · tap to expand</p>

            <div className="wl-list">
                {sortedDates.map((date, i) => {
                    const dayExercises = sessionsByDate[date];
                    const isExpanded = expandedDate === date;

                    // Group by muscle for the day
                    const byMuscle = dayExercises.reduce((acc, ex) => {
                        if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
                        acc[ex.muscleGroup].push(ex);
                        return acc;
                    }, {} as Record<MuscleGroup, typeof exercises>);

                    const muscles = Object.keys(byMuscle) as MuscleGroup[];
                    const totalVol = dayExercises.reduce((sum, ex) => sum + getExerciseVolume(ex), 0);
                    const dominantMuscle = muscles.sort(
                        (a, b) => (byMuscle[b]?.length ?? 0) - (byMuscle[a]?.length ?? 0)
                    )[0];

                    return (
                        <motion.div
                            key={date}
                            className="wl-day-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            {/* Row header — always visible, tappable */}
                            <button
                                className="wl-day-card__header"
                                onClick={() => setExpandedDate(isExpanded ? null : date)}
                            >
                                <div className="wl-day-card__left">
                                    <div className="wl-day-card__date-label">{getDateLabel(date)}</div>
                                    <div className="wl-day-card__date-raw">{date}</div>
                                </div>
                                <div className="wl-day-card__chips">
                                    {muscles.map(m => (
                                        <span
                                            key={m}
                                            className="wl-muscle-chip"
                                            style={{ background: MUSCLE_COLORS[m] }}
                                        >
                                            {MUSCLE_ICONS[m]}
                                        </span>
                                    ))}
                                    <span className="wl-day-card__vol">
                                        {totalVol.toLocaleString()} lb
                                    </span>
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        className="wl-day-card__body"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.22 }}
                                    >
                                        {muscles.map(muscle => (
                                            <div key={muscle} className="wl-muscle-section">
                                                <div
                                                    className="wl-muscle-section__header"
                                                    style={{ borderLeftColor: MUSCLE_COLORS[muscle].split(',')[0].split('(')[1]?.trim() || '#666' }}
                                                >
                                                    {MUSCLE_ICONS[muscle]}{' '}
                                                    {MUSCLE_GROUPS.find(g => g.id === muscle)?.label}
                                                </div>
                                                {byMuscle[muscle].map(ex => {
                                                    const best = getBestSet(ex);
                                                    return (
                                                        <div key={ex.id} className="wl-exercise-row">
                                                            <span className="wl-exercise-row__name">{ex.exerciseName}</span>
                                                            <div className="wl-exercise-row__sets">
                                                                {ex.sets.map(s => (
                                                                    <span key={s.setNumber} className="wl-set-chip">
                                                                        {s.weight}×{s.reps}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            {best && (
                                                                <span className="chip chip--neutral wl-best-chip">
                                                                    Top: {best.weight}lb × {best.reps}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}

                                        {/* Load workout button — bottom right */}
                                        <div className="wl-day-card__footer">
                                            <button
                                                className="wl-day-card__load-btn"
                                                onClick={() => onLoadWorkout(date, dominantMuscle)}
                                                title="Load this workout as today's template"
                                            >
                                                <RotateCcw size={14} />
                                                Load Workout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
