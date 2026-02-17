import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import type { Item } from '../../data/items';
import './PurchaseSuccessOverlay.css';

interface Props {
    item: Item | null;
    isVisible: boolean;
    onComplete: () => void;
}

export const PurchaseSuccessOverlay = ({ item, isVisible, onComplete }: Props) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onComplete, 2500);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    if (!item) return null;

    const rarityColors: Record<string, string> = {
        common: '#9ca3af',
        uncommon: '#22c55e',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
    };

    const isRare = item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary';
    const glowColor = rarityColors[item.rarity || 'common'];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="success-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={onComplete}
                >
                    {/* Particles for rare+ items */}
                    {isRare && (
                        <div className="particle-container">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="particle"
                                    style={{
                                        '--particle-color': glowColor,
                                        '--particle-delay': `${i * 0.1}s`,
                                        '--particle-x': `${Math.random() * 100 - 50}vw`,
                                        '--particle-y': `${Math.random() * 100 - 50}vh`,
                                    } as React.CSSProperties}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0.5],
                                        x: `var(--particle-x)`,
                                        y: `var(--particle-y)`,
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        delay: i * 0.05,
                                        ease: 'easeOut',
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Glow ring */}
                    <motion.div
                        className="glow-ring"
                        style={{ '--glow-color': glowColor } as React.CSSProperties}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.8, 0.4] }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />

                    {/* Item reveal */}
                    <motion.div
                        className="item-reveal"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                            type: 'spring',
                            damping: 12,
                            stiffness: 200,
                            delay: 0.2,
                        }}
                    >
                        <div className="item-icon-reveal">{item.icon}</div>
                    </motion.div>

                    {/* Success text */}
                    <motion.div
                        className="success-text"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                    >
                        <h2>Item Acquired!</h2>
                        <p className="item-name-reveal">{item.name}</p>
                        <span className={`rarity-tag rarity-${item.rarity || 'common'}`}>
                            {item.rarity?.toUpperCase() || 'COMMON'}
                        </span>
                    </motion.div>

                    {/* Confetti burst for legendary */}
                    {item.rarity === 'legendary' && (
                        <div className="confetti-burst">
                            {Array.from({ length: 30 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="confetti"
                                    style={{
                                        '--confetti-color': ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][i % 5],
                                        left: '50%',
                                        top: '40%',
                                    } as React.CSSProperties}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{
                                        x: (Math.random() - 0.5) * 400,
                                        y: (Math.random() - 0.5) * 400 + 100,
                                        opacity: 0,
                                        scale: 0,
                                        rotate: Math.random() * 720 - 360,
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        delay: 0.3 + i * 0.02,
                                        ease: 'easeOut',
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Click to continue hint */}
                    <motion.p
                        className="continue-hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                    >
                        Click anywhere to continue
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
