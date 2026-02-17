import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type MuscleGroup, MUSCLE_GROUPS, getLocalDateString } from '../../store/useGymStore';
import { DailyLog } from './DailyLog';
import { DateNavigator } from './DateNavigator';
import './GymTracker.css';

export const GymTracker = () => {
    const navigate = useNavigate();
    const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());

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
                onDateChange={setSelectedDate}
                onBack={() => setSelectedMuscle(null)}
            />
        );
    }

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

            <p className="gym-subtitle">Choose a muscle group to log today's workout</p>

            <DateNavigator selectedDate={selectedDate} onSelectDate={setSelectedDate} />

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
};
