import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Activity, ArrowLeft } from 'lucide-react';
import { useWorkoutTimer } from '../../store/useWorkoutTimer';
import { useGymStore, getLocalDateString } from '../../store/useGymStore';
import { useGameStore } from '../../store/useGameStore';
import './GymTracker.css';

interface CardioLogProps {
    onClose: () => void;
}

type CardioOption = 'Walking' | 'Elliptical' | 'Insanity Workout';

const CARDIO_OPTIONS: { id: CardioOption; label: string; icon: string; bg: string }[] = [
    { id: 'Walking', label: 'Walking', icon: '🚶‍♀️', bg: 'linear-gradient(135deg, #10b981, #059669)' },
    { id: 'Elliptical', label: 'Elliptical', icon: '🏃‍♂️', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { id: 'Insanity Workout', label: 'Insanity Workout', icon: '🔥', bg: 'linear-gradient(135deg, #ef4444, #dc2626)' },
];

export const CardioWorkoutLog: React.FC<CardioLogProps> = ({ onClose }) => {
    const { startTimer, stopTimer, resetTimer, getElapsedSeconds } = useWorkoutTimer();
    const { addExercise } = useGymStore();
    const { addSkillXp } = useGameStore();

    const [selectedType, setSelectedType] = useState<CardioOption | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [confirmModal, setConfirmModal] = useState(false);

    // Initial Timer Mount & Synchronization
    useEffect(() => {
        startTimer();
        const interval = setInterval(() => {
            setElapsed(getElapsedSeconds());
        }, 1000);
        return () => clearInterval(interval);
    }, [startTimer, getElapsedSeconds]);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getXpReward = (minutes: number) => {
        if (minutes < 5) return 0;
        if (minutes < 15) return 1;
        if (minutes < 30) return 2;
        if (minutes < 45) return 3;
        return 4;
    };

    const triggerFloatText = (xp: number) => {
        window.dispatchEvent(new CustomEvent('gym-set-completed', {
            detail: { skillId: 'Cardio', xp }
        }));
    };

    const commitWorkout = () => {
        const totalSecs = getElapsedSeconds();
        const mins = Math.floor(totalSecs / 60);
        const xpEarned = getXpReward(mins);

        // Save History
        addExercise({
            exerciseName: selectedType || 'Cardio Session',
            muscleGroup: 'full_body',
            date: getLocalDateString(),
            sets: [],
            notes: `Cardio Duration: ${formatTime(totalSecs)}`,
            workoutType: 'cardio',
            durationSeconds: totalSecs
        });

        // Grant XP & Animate if viable
        if (xpEarned > 0) {
            addSkillXp('Cardio', xpEarned);
            triggerFloatText(xpEarned);
        } else {
            // Optional: generic toast for finishing without XP
            import('../../components/ui/Toast').then(({ useToastStore }) => {
                useToastStore.getState().addToast({
                     type: 'info', message: 'Cardio logged (under 5m, no XP)', duration: 3000
                });
            }).catch(() => {});
        }

        stopTimer();
        resetTimer();
        onClose();
    };

    const handleEndWorkout = () => {
        const mins = Math.floor(elapsed / 60);
        if (mins < 5) {
            setConfirmModal(true);
        } else {
            commitWorkout();
        }
    };

    return (
        <div className="gym-tracker" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '120px' }}>
            <div className="gym-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-dark)', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button className="gym-back-btn" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'white' }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={20} color="#3b82f6" /> Cardio Training
                    </h2>
                    <div style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--text-strong)' }}>
                        ⏱ {formatTime(elapsed)}
                    </div>
                </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                    Select your cardio routine. XP is awarded based on duration.
                </p>

                {CARDIO_OPTIONS.map(opt => (
                    <motion.button
                        key={opt.id}
                        onClick={() => setSelectedType(opt.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: '1.5rem',
                            borderRadius: '16px',
                            border: selectedType === opt.id ? '2px solid white' : '2px solid transparent',
                            background: selectedType === opt.id ? opt.bg : 'var(--bg-surface)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: selectedType === opt.id ? '0 10px 20px rgba(0,0,0,0.3)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>{opt.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{opt.label}</div>
                            {selectedType === opt.id && (
                                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Selected</div>
                            )}
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Bottom Safe Area Button */}
            <div style={{
                position: 'fixed',
                bottom: '1rem', // Keep slightly above bottom nav
                left: 0,
                right: 0,
                padding: '0 1rem',
                zIndex: 50,
            }}>
                <button
                    onClick={handleEndWorkout}
                    disabled={!selectedType}
                    style={{
                        width: '100%',
                        padding: '1.25rem',
                        borderRadius: '999px',
                        background: selectedType ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'var(--bg-card)',
                        color: selectedType ? 'white' : 'var(--text-muted)',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        border: 'none',
                        cursor: selectedType ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: selectedType ? '0 8px 24px rgba(2ef4444,0.4)' : 'none'
                    }}
                >
                    <Square size={20} fill={selectedType ? "white" : "currentColor"} />
                    End Workout
                </button>
            </div>

            {/* Confirmation Modal via local overlay */}
            <AnimatePresence>
                {confirmModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div 
                            initial={{ y: 50, scale: 0.9 }} 
                            animate={{ y: 0, scale: 1 }} 
                            exit={{ y: 50, scale: 0.9 }}
                            style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', width: '100%' }}
                        >
                            <h3 style={{ marginBottom: '1rem', color: '#f59e0b', fontSize: '1.5rem' }}>Are you sure?</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                                You have been exercising for less than 5 minutes. Ending now will not award any Cardio XP.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => setConfirmModal(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'var(--bg-card)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={commitWorkout}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: '#ef4444', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                    End Anyway
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
