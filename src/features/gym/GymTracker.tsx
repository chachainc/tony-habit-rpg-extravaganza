import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell, Plus, RotateCcw, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    type MuscleGroup,
    MUSCLE_GROUPS,
    getLocalDateString,
    getDateLabel,
    useGymStore,
    getExerciseVolume,
    getBestSet,
} from '../../store/useGymStore';
import { DailyLog } from './DailyLog';
import { DateNavigator } from './DateNavigator';
import { WorkoutLog } from './WorkoutLog';
import './GymTracker.css';

type View = 'hub' | 'track' | 'track-muscle' | 'load-preview' | 'log';

// Muscle group gradient colors — shared across views
export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
    arms: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    shoulders: 'linear-gradient(135deg, #3498db, #2980b9)',
    legs: 'linear-gradient(135deg, #2ecc71, #27ae60)',
    back: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
    chest: 'linear-gradient(135deg, #f39c12, #e67e22)',
    full_body: 'linear-gradient(135deg, #e91e63, #9c27b0)',
};

export const MUSCLE_ICONS: Record<MuscleGroup, string> = {
    arms: '💪',
    shoulders: '🏋️',
    legs: '🦵',
    back: '🔙',
    chest: '🫁',
    full_body: '🏋️‍♂️',
};

export const GymTracker = () => {
    const navigate = useNavigate();
    const exercises = useGymStore(s => s.exercises);

    const [view, setView] = useState<View>('hub');
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [ghostWorkoutDate, setGhostWorkoutDate] = useState<string | undefined>(undefined);

    // ── Find most recent workout across ALL exercise data ─────────────────
    const mostRecentSession = useMemo(() => {
        if (exercises.length === 0) return null;
        // Get the latest date that has exercises
        const latestDate = exercises.reduce((best, ex) =>
            ex.date > best ? ex.date : best, ''
        );
        const sessionExercises = exercises.filter(e => e.date === latestDate);
        // Find the dominant muscle group (most exercises)
        const muscleCounts = sessionExercises.reduce((acc, ex) => {
            acc[ex.muscleGroup] = (acc[ex.muscleGroup] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const dominantMuscle = Object.entries(muscleCounts)
            .sort((a, b) => b[1] - a[1])[0][0] as MuscleGroup;

        return {
            date: latestDate,
            muscle: dominantMuscle,
            exercises: sessionExercises,
            muscleGroups: Object.keys(muscleCounts) as MuscleGroup[],
        };
    }, [exercises]);

    // ── Navigation helpers ────────────────────────────────────────────────
    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        setSelectedMuscle(null);
    };

    const handleLoadWorkoutFromLog = (date: string, muscle: MuscleGroup) => {
        setGhostWorkoutDate(date);
        setSelectedMuscle(muscle);
        setSelectedDate(getLocalDateString());
        setView('hub'); // triggers DailyLog render below
    };

    // ── If a muscle is selected → show DailyLog ───────────────────────────
    if (selectedMuscle) {
        return (
            <DailyLog
                muscleGroup={selectedMuscle}
                date={selectedDate}
                onDateChange={handleDateChange}
                onBack={() => {
                    setSelectedMuscle(null);
                    setGhostWorkoutDate(undefined);
                    setView('hub');
                }}
                ghostWorkoutDate={ghostWorkoutDate}
            />
        );
    }

    // ── WORKOUT LOG view ──────────────────────────────────────────────────
    if (view === 'log') {
        return (
            <WorkoutLog
                onBack={() => setView('hub')}
                onLoadWorkout={handleLoadWorkoutFromLog}
            />
        );
    }

    // ── LOAD PREVIEW view (most recent workout summary) ───────────────────
    if (view === 'load-preview') {
        return (
            <div className="gym-tracker">
                <div className="gym-header">
                    <button className="gym-back-btn" onClick={() => setView('hub')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="gym-header__title">
                        <RotateCcw size={22} />
                        <h2>Load Previous Workout</h2>
                    </div>
                </div>

                {!mostRecentSession ? (
                    <div className="gym-load-empty">
                        <span className="gym-load-empty__icon">🏖️</span>
                        <p>No previous workouts found.</p>
                        <p className="gym-load-empty__sub">Track your first workout to use this feature!</p>
                        <button className="gym-log-past-btn" onClick={() => setView('track')}>
                            <Plus size={16} /> Start Tracking
                        </button>
                    </div>
                ) : (
                    <div className="gym-load-preview">
                        <div className="gym-load-preview__badge">
                            <span>Last Workout</span>
                        </div>
                        <div className="gym-load-preview__date">
                            {getDateLabel(mostRecentSession.date)}{' '}
                            <span className="gym-load-preview__date-raw">({mostRecentSession.date})</span>
                        </div>

                        {/* Muscle groups trained */}
                        <div className="gym-load-preview__muscles">
                            {mostRecentSession.muscleGroups.map(m => (
                                <span
                                    key={m}
                                    className="gym-load-preview__muscle-chip"
                                    style={{ background: MUSCLE_COLORS[m] }}
                                >
                                    {MUSCLE_ICONS[m]} {MUSCLE_GROUPS.find(g => g.id === m)?.label}
                                </span>
                            ))}
                        </div>

                        {/* Exercise list preview */}
                        <div className="gym-load-preview__exercises">
                            {mostRecentSession.exercises.map(ex => {
                                const best = getBestSet(ex);
                                const vol = getExerciseVolume(ex);
                                return (
                                    <div key={ex.id} className="gym-load-preview__ex-row">
                                        <div className="gym-load-preview__ex-info">
                                            <span className="gym-load-preview__ex-name">{ex.exerciseName}</span>
                                            <span className="gym-load-preview__ex-detail">
                                                {ex.sets.length} sets · Vol: {vol.toLocaleString()} lb
                                                {best ? ` · Top: ${best.weight}×${best.reps}` : ''}
                                            </span>
                                        </div>
                                        <span className="gym-load-preview__muscle-tag">
                                            {MUSCLE_ICONS[ex.muscleGroup]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load options — per muscle group if multiple */}
                        <div className="gym-load-preview__actions">
                            {mostRecentSession.muscleGroups.length === 1 ? (
                                <motion.button
                                    className="gym-load-preview__load-btn"
                                    style={{ background: MUSCLE_COLORS[mostRecentSession.muscle] }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        setGhostWorkoutDate(mostRecentSession.date);
                                        setSelectedMuscle(mostRecentSession.muscle);
                                        setSelectedDate(getLocalDateString());
                                    }}
                                >
                                    <RotateCcw size={18} />
                                    Load as Today's Template
                                </motion.button>
                            ) : (
                                <>
                                    <p className="gym-load-preview__pick-label">
                                        Choose which muscle group to load:
                                    </p>
                                    {mostRecentSession.muscleGroups.map(m => (
                                        <motion.button
                                            key={m}
                                            className="gym-load-preview__load-btn"
                                            style={{ background: MUSCLE_COLORS[m] }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => {
                                                setGhostWorkoutDate(mostRecentSession.date);
                                                setSelectedMuscle(m);
                                                setSelectedDate(getLocalDateString());
                                            }}
                                        >
                                            {MUSCLE_ICONS[m]}{' '}
                                            Load {MUSCLE_GROUPS.find(g => g.id === m)?.label}
                                        </motion.button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── TRACK view — muscle picker ────────────────────────────────────────
    if (view === 'track') {
        const isToday = selectedDate === getLocalDateString();
        const isPast = selectedDate < getLocalDateString();
        const dayExercises = exercises.filter(e => e.date === selectedDate);
        const groupedByMuscle = dayExercises.reduce((acc, ex) => {
            if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
            acc[ex.muscleGroup].push(ex);
            return acc;
        }, {} as Record<string, typeof dayExercises>);

        return (
            <div className="gym-tracker">
                <div className="gym-header">
                    <button className="gym-back-btn" onClick={() => setView('hub')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="gym-header__title">
                        <Dumbbell size={24} />
                        <h2>Track Workout</h2>
                    </div>
                </div>
                <p className="gym-subtitle">
                    {isToday ? "Choose a muscle group to log today's workout" : 'Choose a muscle group to log'}
                </p>
                <DateNavigator selectedDate={selectedDate} onSelectDate={d => { setSelectedDate(d); }} />

                {/* Past day summary */}
                {isPast && dayExercises.length > 0 && (
                    <div className="gym-past-summary">
                        <div className="gym-summary-groups">
                            {Object.entries(groupedByMuscle).map(([muscle, exs]) => (
                                <div key={muscle} className="gym-summary-group">
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
                    </div>
                )}

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
            </div>
        );
    }

    // ── HUB view — 3 cards ────────────────────────────────────────────────
    const HUB_CARDS = [
        {
            id: 'track',
            label: 'Track Workout',
            sub: 'Log a fresh session',
            icon: <Dumbbell size={36} />,
            gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            shadow: 'rgba(99,102,241,0.4)',
            onClick: () => setView('track'),
        },
        {
            id: 'load',
            label: 'Load Previous Workout',
            sub: mostRecentSession
                ? `Last: ${getDateLabel(mostRecentSession.date)} · ${MUSCLE_ICONS[mostRecentSession.muscle]} ${MUSCLE_GROUPS.find(g => g.id === mostRecentSession.muscle)?.label}`
                : 'No workouts logged yet',
            icon: <RotateCcw size={36} />,
            gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            shadow: 'rgba(239,68,68,0.35)',
            onClick: () => setView('load-preview'),
        },
        {
            id: 'log',
            label: 'Workout Log',
            sub: exercises.length > 0
                ? `${[...new Set(exercises.map(e => e.date))].length} sessions recorded`
                : 'Your full history',
            icon: <ClipboardList size={36} />,
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            shadow: 'rgba(16,185,129,0.35)',
            onClick: () => setView('log'),
        },
    ];

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
            <p className="gym-subtitle">What would you like to do?</p>

            <div className="gym-hub-cards">
                {HUB_CARDS.map((card, i) => (
                    <motion.button
                        key={card.id}
                        className="gym-hub-card"
                        style={{ background: card.gradient, boxShadow: `0 6px 28px ${card.shadow}` }}
                        onClick={card.onClick}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.09, ease: 'easeOut' }}
                        whileHover={{ scale: 1.025, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <div className="gym-hub-card__icon">{card.icon}</div>
                        <div className="gym-hub-card__text">
                            <span className="gym-hub-card__label">{card.label}</span>
                            <span className="gym-hub-card__sub">{card.sub}</span>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
