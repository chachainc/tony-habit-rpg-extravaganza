import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import './TrophyEvolvedModal.css';

export const TrophyEvolvedModal = () => {
    const { pendingTrophyEvolution, clearPendingEvolution } = useBookTrophyStore();

    // Auto-dismiss after 4 seconds
    useEffect(() => {
        if (pendingTrophyEvolution) {
            const timer = setTimeout(() => {
                clearPendingEvolution();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [pendingTrophyEvolution, clearPendingEvolution]);

    const handleClick = () => {
        clearPendingEvolution();
    };

    return (
        <AnimatePresence>
            {pendingTrophyEvolution && (
                <motion.div
                    className="trophy-evolved-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClick}
                >
                    {/* Particle Effect */}
                    <div className="trophy-particles">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="particle"
                                initial={{
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                    scale: 0
                                }}
                                animate={{
                                    x: (Math.random() - 0.5) * 400,
                                    y: (Math.random() - 0.5) * 400,
                                    opacity: 0,
                                    scale: Math.random() * 2 + 1
                                }}
                                transition={{
                                    duration: 2,
                                    delay: Math.random() * 0.5,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </div>

                    {/* Trophy Card */}
                    <motion.div
                        className="trophy-evolved-card"
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="trophy-evolved-header">
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.3 }}
                            >
                                🏆
                            </motion.span>
                            <h2>Trophy Evolved!</h2>
                        </div>

                        <motion.div
                            className="trophy-evolved-icon"
                            initial={{ rotateY: 180, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            <div className="trophy-glow-effect" />
                            <span>{pendingTrophyEvolution.icon}</span>
                        </motion.div>

                        <motion.h3
                            className="trophy-evolved-name"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            {pendingTrophyEvolution.name}
                        </motion.h3>

                        <motion.p
                            className="trophy-evolved-description"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                        >
                            {pendingTrophyEvolution.description}
                        </motion.p>

                        {/* Bonuses */}
                        <motion.div
                            className="trophy-evolved-bonuses"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1 }}
                        >
                            <div className="bonus-row">
                                <span className="bonus-icon">🧠</span>
                                <span className="bonus-text">+{pendingTrophyEvolution.intelligenceBonus} Intelligence</span>
                            </div>
                            {pendingTrophyEvolution.maxMPBonus > 0 && (
                                <div className="bonus-row">
                                    <span className="bonus-icon">💧</span>
                                    <span className="bonus-text">+{pendingTrophyEvolution.maxMPBonus} Max MP</span>
                                </div>
                            )}
                            {pendingTrophyEvolution.special === 'astral_fire' && (
                                <div className="bonus-row special">
                                    <span className="bonus-icon">🔥</span>
                                    <span className="bonus-text">Astral Fire Spell Unlocked!</span>
                                </div>
                            )}
                            {pendingTrophyEvolution.special === 'magic_xp_2x' && (
                                <div className="bonus-row special">
                                    <span className="bonus-icon">✨</span>
                                    <span className="bonus-text">2x Magic XP Gain!</span>
                                </div>
                            )}
                        </motion.div>

                        <motion.p
                            className="trophy-evolved-dismiss"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ delay: 2 }}
                        >
                            Click anywhere to continue
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
