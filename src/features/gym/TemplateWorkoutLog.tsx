import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Dumbbell, History, Minus } from 'lucide-react';
import {
    type MuscleGroup,
    MUSCLE_GROUPS,
    useGymStore,
    getLocalDateString,
    getExerciseVolume,
    getBestSet,
} from '../../store/useGymStore';
import { useWorkoutTimer } from '../../store/useWorkoutTimer';
import { ExerciseEntry } from './ExerciseEntry';
import { ExerciseHistory } from './ExerciseHistory';
import { WORKOUT_TEMPLATES } from '../../data/workoutTemplates';

interface Props {
    templateId: 'day1' | 'day2' | 'day3';
    onClose: () => void;
}

export const TemplateWorkoutLog = ({ templateId, onClose }: Props) => {
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const [historyExercise, setHistoryExercise] = useState<{ name: string; muscle: MuscleGroup } | null>(null);

    // XP Animation state
    const [floats, setFloats] = useState<{ id: number; xp: number }[]>([]);
    
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ xp: number }>;
            const id = Date.now() + Math.random();
            setFloats(prev => [...prev, { id, xp: ce.detail.xp }]);
            setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1000);
        };
        window.addEventListener('gym-set-completed', handler);
        return () => window.removeEventListener('gym-set-completed', handler);
    }, []);

    const { deleteExercise, completeWorkout, exercises } = useGymStore();
    const timerStore = useWorkoutTimer();
    
    // Timer polling
    const [elapsed, setElapsed] = useState(timerStore.getElapsedSeconds());
    useEffect(() => {
        if (!timerStore.isRunning) return;
        const interval = setInterval(() => {
            setElapsed(timerStore.getElapsedSeconds());
        }, 1000);
        return () => clearInterval(interval);
    }, [timerStore.isRunning]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const template = WORKOUT_TEMPLATES[templateId];
    const today = getLocalDateString();
    
    const handleDelete = (id: string) => {
        if (confirm('Remove this exercise from session?')) {
            deleteExercise(id);
        }
    };

    // Filter exercises that belong to today and match the template's exercise names
    const templateExerciseNames = template.exercises.map(e => e.exerciseName);
    const sessionExercises = exercises.filter(
        e => e.date === today && templateExerciseNames.includes(e.exerciseName)
    );

    const handleComplete = () => {
        completeWorkout();
        onClose();
        // Optional: trigger completion toast globally
        window.dispatchEvent(new CustomEvent('toast-alert', { 
            detail: { message: `🏆 Workout Complete! ${elapsed > 0 ? formatTime(elapsed) : ''} | Great job!`, type: 'success' }
        }));
    };

    return (
        <div className="daily-log template-log" style={{ paddingBottom: '90px' }}>
            {/* Sticky Timer Header */}
            <div className="daily-log__header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', margin: '-1rem -1rem 1rem -1rem', padding: '1rem' }}>
                <button className="gym-back-btn" onClick={onClose}>
                    <ArrowLeft size={20} />
                </button>
                <div className="daily-log__title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="daily-log__muscle-icon">{template.icon}</span>
                        <h3>{template.name}</h3>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
                    <Clock size={16} />
                    <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold' }}>{formatTime(elapsed)}</span>
                </div>
            </div>

            {/* XP Floats */}
            <AnimatePresence>
                {floats.map(f => (
                    <motion.div 
                        key={f.id}
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: -40, scale: 1.1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ position: 'fixed', top: '40%', left: '50%', translateX: '-50%', pointerEvents: 'none', color: '#10b981', fontWeight: 'bold', fontSize: '1.5rem', zIndex: 100, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                    >
                        +{f.xp.toFixed(1)} Strength XP
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Exercise List */}
            <div className="exercise-list">
                {sessionExercises.length === 0 ? (
                    <div className="exercise-list__empty">
                        <p>No active exercises found.</p>
                    </div>
                ) : (
                    sessionExercises.map(ex => {
                        const volume = getExerciseVolume(ex);
                        const best = getBestSet(ex);
                        const groupInfo = MUSCLE_GROUPS.find(g => g.id === ex.muscleGroup);

                        return (
                            <motion.div
                                key={ex.id}
                                className="exercise-card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ borderLeft: `3px solid ${template.color}` }}
                            >
                                <div className="exercise-card__header">
                                    <div>
                                        <h4 className="exercise-card__name">{ex.exerciseName}</h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {groupInfo?.icon} {groupInfo?.label}
                                        </div>
                                    </div>
                                    <div className="exercise-card__actions">
                                        <button className="exercise-card__action-btn" title="History" onClick={() => setHistoryExercise({ name: ex.exerciseName, muscle: ex.muscleGroup })}>
                                            <History size={14} />
                                        </button>
                                        <button className="exercise-card__action-btn" title="Edit" onClick={() => setEditingExerciseId(ex.id)}>
                                            ✏️
                                        </button>
                                        <button className="exercise-card__action-btn exercise-card__action-btn--delete" title="Delete" onClick={() => handleDelete(ex.id)}>
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Target Notes */}
                                {ex.notes && (
                                    <div style={{ padding: '0 12px 12px', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 500 }}>
                                        {ex.notes}
                                    </div>
                                )}

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

                                <div className="exercise-card__footer">
                                    <div className="exercise-card__chips">
                                        {best && (
                                            <span className="chip chip--neutral">
                                                Top: {best.weight}lb × {best.reps}
                                            </span>
                                        )}
                                        {volume > 0 && (
                                            <span className="chip chip--neutral">
                                                Vol: {volume}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Complete Workout (Sticky Mobile Safe Area) */}
            <div style={{ position: 'fixed', bottom: '80px', left: '16px', right: '16px', zIndex: 50 }}>
                <motion.button
                    className="item-btn item-btn--purchase"
                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem', background: template.color }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleComplete}
                >
                    <Dumbbell size={20} style={{ marginRight: '8px' }} />
                    COMPLETE WORKOUT
                </motion.button>
            </div>

            {/* Edit Exercise Modal */}
            <AnimatePresence>
                {editingExerciseId && (
                    <ExerciseEntry
                        muscleGroup={sessionExercises.find(e => e.id === editingExerciseId)?.muscleGroup || 'full_body'}
                        date={today}
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
