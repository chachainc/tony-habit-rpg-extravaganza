import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, TrendingUp } from 'lucide-react';
import type { SkillName } from '../../store/useGameStore';
import './LevelUpModal.css';

// Skill icons map
const SKILL_ICONS: Record<SkillName, string> = {
    'Sleep': '😴',
    'Hygiene': '🚿',
    'Flexibility': '🧘',
    'Strength': '🏋️',
    'Cardio': '🏃',
    'Clothing': '👔',
    'Housemaid': '🧹',
    'Work': '💼',
    'Health': '❤️',
    'Social': '👥',
    'Luck': '🎲',
    'Habit Building': '🔥',
    'Intelligence': '🧠',
};

// Stat gains per skill
const SKILL_STAT_GAINS: Record<SkillName, string> = {
    'Sleep': '+Defense',
    'Hygiene': '+Defense',
    'Flexibility': '+Defense',
    'Strength': '+Physical Attack',
    'Cardio': '+Speed & Defense',
    'Clothing': '+Style',
    'Housemaid': '+Max Mana',
    'Work': '+Gold Earning',
    'Health': '+Max HP',
    'Social': '+Influence',
    'Luck': '+Critical Rate',
    'Habit Building': '+Defense & Berserk',
    'Intelligence': '+Magic ATK & +10 Max MP',
};

interface LevelUpData {
    skill: SkillName;
    newLevel: number;
}

interface Props {
    levelUpData: LevelUpData;
    onClose: () => void;
}

export const LevelUpModal = ({ levelUpData, onClose }: Props) => {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

    // Generate particles on mount
    useEffect(() => {
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 0.5,
        }));
        setParticles(newParticles);

        // Auto-close after 3 seconds
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isMilestone = levelUpData.newLevel % 5 === 0;

    return (
        <motion.div
            className="level-up-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            {/* Particle Burst */}
            <div className="particle-burst">
                {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="level-particle"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{
                            scale: [0, 1.5, 0],
                            opacity: [1, 0.8, 0],
                            y: [0, -50 - Math.random() * 100],
                            x: [0, (Math.random() - 0.5) * 100],
                        }}
                        transition={{
                            duration: 1.5,
                            delay: p.delay,
                            ease: 'easeOut',
                        }}
                    />
                ))}
            </div>

            {/* Main Card */}
            <motion.div
                className={`level-up-card ${isMilestone ? 'milestone' : ''}`}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{
                    type: 'spring',
                    duration: 0.8,
                    bounce: 0.4,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glow Effect */}
                <div className="card-glow" />

                {/* Header */}
                <div className="level-up-header">
                    <Star className="star-icon" size={24} />
                    <span>LEVEL UP!</span>
                    <Star className="star-icon" size={24} />
                </div>

                {/* Skill Info */}
                <div className="skill-display">
                    <span className="skill-icon">{SKILL_ICONS[levelUpData.skill]}</span>
                    <h2 className="skill-name">{levelUpData.skill}</h2>
                </div>

                {/* Level Display */}
                <motion.div
                    className="level-display"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                >
                    <TrendingUp size={20} />
                    <span className="level-number">Level {levelUpData.newLevel}</span>
                </motion.div>

                {/* Stat Gain */}
                <motion.div
                    className="stat-gain"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Sparkles size={16} />
                    <span>{SKILL_STAT_GAINS[levelUpData.skill]}</span>
                </motion.div>

                {/* Milestone Bonus */}
                {isMilestone && (
                    <motion.div
                        className="milestone-bonus"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="milestone-label">🎉 MILESTONE BONUS!</div>
                        <div className="milestone-rewards">
                            <span>🎫 +1 Gacha Ticket</span>
                            <span>🪙 +50 Gold</span>
                        </div>
                    </motion.div>
                )}

                <p className="dismiss-hint">Click anywhere to continue</p>
            </motion.div>
        </motion.div>
    );
};
