import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type MuscleGroup, MUSCLE_GROUPS, getLocalDateString, useGymStore, getExerciseVolume, getBestSet } from '../../store/useGymStore';
import { DailyLog } from './DailyLog';
import { DateNavigator } from './DateNavigator';
import './GymTracker.css';

export const GymTracker = () => {
    const navigate = useNavigate();
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [forceLog, setForceLog] = useState(false);
    const exercises = useGymStore(s => s.exercises);

    const isToday = selectedDate === getLocalDateString();
    const isPast = selectedDate < getLocalDateString();

    // Get all exercises for the selected date
    const dayExercises = exercises.filter(e => e.date === selectedDate);

    // Group by muscle
    const groupedByMuscle = dayExercises.reduce((acc, ex) => {
        if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
        acc[ex.muscleGroup].push(ex);
        return acc;
    }, {} as Record<string, typeof dayExercises>);

    // Reset forceLog when date changes
    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        setForceLog(false);
        setSelectedMuscle(null);
    };

    // Muscle group gradient colors
    const MUSCLE_COLORS: Record<MuscleGroup, string> = {
        arms: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        shoulders: 'linear-gradient(135deg, #3498db, #2980b9)',
        legs: 'linear-gradient(135deg, #2ecc71, #27ae60)',
        back: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
        chest: 'linear-gradient(135deg, #f39c12, #e67e22)',
    };

    const MUSCLE_ICONS: Record<MuscleGroup, string> = {
        arms: '💪',
        shoulders: '🏋️',
        legs: '🦵',
        back: '🔙',
        chest: '🫁',
    };

    if (selectedMuscle) {
        return (
            <DailyLog
                muscleGroup={selectedMuscle}
                date={selectedDate}
                onDateChange={handleDateChange}
                onBack={() => setSelectedMuscle(null)}
            />
        );
    }

    // Show muscle tile grid for today, or past days when user clicks "Log a workout"
    const showMuscleTiles = isToday || !isPast || forceLog;

    return (
        <div className="gym-tracker">
            <div className="gym-header">
                <button className="gym-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="gym-header__title">
                    <Dumbbell size={24} />
                    <h2>Gym Progress Tracker</h2>
                </div>
            </div>

            <p className="gym-subtitle">
                {isToday ? "Choose a muscle group to log today's workout" : isPast && !forceLog ? 'Workout Summary' : 'Choose a muscle group to log'}
            </p>

            <DateNavigator selectedDate={selectedDate} onSelectDate={handleDateChange} />

            {/* Past date summary view */}
            {isPast && !forceLog && (
                <div className="gym-past-summary">
                    {dayExercises.length === 0 ? (
                        <div className="gym-no-workout">
                            <span className="gym-no-workout__icon">🏖️</span>
                            <p>No workout logged for this day</p>
                        </div>
                    ) : (
                        <div className="gym-summary-groups">
                            {Object.entries(groupedByMuscle).map(([muscle, exs]) => (
                                <div key={muscle} className="gym-summary-group" style={{ borderLeft: `3px solid ${MUSCLE_COLORS[muscle as MuscleGroup]?.includes('#') ? MUSCLE_COLORS[muscle as MuscleGroup].split('#')[1]?.split(',')[0]?.split(')')[0] ? `#${MUSCLE_COLORS[muscle as MuscleGroup].split('#')[1].split(',')[0].split(')')[0]}` : '#666' : '#666'}` }}>
                                    <div className="gym-summary-group__header">
                                        {MUSCLE_ICONS[muscle as MuscleGroup]} {MUSCLE_GROUPS.find(g => g.id === muscle)?.label}
                                    </div>
                                    {exs.map(ex => {
                                        const best = getBestSet(ex);
                                        return (
                                            <div key={ex.id} className="gym-summary-exercise">
                                                <span className="gym-summary-exercise__name">{ex.exerciseName}</span>
                                                <span className="gym-summary-exercise__sets">{ex.sets.length} sets</span>
                                                <span className="gym-summary-exercise__vol">Vol: {getExerciseVolume(ex).toLocaleString()} lbs</span>
                                                {best && <span className="gym-summary-exercise__best">Best: {best.weight}×{best.reps}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="gym-log-past-btn" onClick={() => setForceLog(true)}>
                        <Plus size={16} /> Log a workout for this day
                    </button>
                </div>
            )}

            {/* Muscle tile grid (today or explicit log mode) */}
            {showMuscleTiles && (
                <div className="muscle-grid">
                    <AnimatePresence>
                        {MUSCLE_GROUPS.map((group, i) => (
                            <motion.button
                                key={group.id}
                                className="muscle-card"
                                style={{ background: MUSCLE_COLORS[group.id] }}
                                onClick={() => setSelectedMuscle(group.id)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <span className="muscle-card__icon">{MUSCLE_ICONS[group.id]}</span>
                                <span className="muscle-card__label">{group.label}</span>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
