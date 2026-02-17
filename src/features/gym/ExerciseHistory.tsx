import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import {
    type MuscleGroup,
    useGymStore,
    getDateLabel,
    getExerciseVolume,
    getBestSet,
} from '../../store/useGymStore';

interface Props {
    exerciseName: string;
    muscleGroup: MuscleGroup;
    onClose: () => void;
}

export const ExerciseHistory = ({ exerciseName, muscleGroup, onClose }: Props) => {
    const { getExerciseHistory } = useGymStore();
    const history = getExerciseHistory(exerciseName, muscleGroup);

    return (
        <motion.div
            className="exercise-history-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="exercise-history"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="exercise-history__header">
                    <h3>{exerciseName}</h3>
                    <button className="exercise-history__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <p className="exercise-history__subtitle">
                    {history.length} session{history.length !== 1 ? 's' : ''} logged
                </p>

                {history.length === 0 ? (
                    <div className="exercise-history__empty">
                        No history for this exercise yet.
                    </div>
                ) : (
                    <div className="exercise-history__list">
                        {history.map((ex, i) => {
                            const volume = getExerciseVolume(ex);
                            const best = getBestSet(ex);
                            const prevSession = history[i + 1]; // next in reverse order = earlier
                            const prevVolume = prevSession ? getExerciseVolume(prevSession) : null;
                            const volumeDiff = prevVolume != null ? volume - prevVolume : null;

                            return (
                                <div key={ex.id} className="exercise-history__item">
                                    <div className="exercise-history__date">
                                        <Calendar size={14} />
                                        <span>{getDateLabel(ex.date)}</span>
                                        <span className="exercise-history__date-raw">{ex.date}</span>
                                    </div>
                                    <div className="exercise-history__details">
                                        <span className="exercise-history__sets-count">
                                            {ex.sets.length} sets
                                        </span>
                                        {best && (
                                            <span className="exercise-history__best">
                                                Top: {best.weight}lb × {best.reps}
                                            </span>
                                        )}
                                        <span className="exercise-history__volume">
                                            Vol: {volume.toLocaleString()}
                                        </span>
                                        {volumeDiff != null && volumeDiff !== 0 && (
                                            <span className={`exercise-history__diff ${volumeDiff > 0 ? 'up' : 'down'}`}>
                                                {volumeDiff > 0 ? '+' : ''}{volumeDiff}
                                            </span>
                                        )}
                                    </div>
                                    <div className="exercise-history__set-detail">
                                        {ex.sets.map(s => (
                                            <span key={s.setNumber} className="exercise-history__set-pill">
                                                {s.weight}×{s.reps}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
