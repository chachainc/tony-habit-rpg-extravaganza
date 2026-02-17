import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coins, Sparkles, Zap, Shield, Swords } from 'lucide-react';
import { useTaskStore, type DailyChestReward } from '../../store/useTaskStore';
import { useBuffStore } from '../../store/useBuffStore';
import './DailyChest.css';

export const DailyChest = () => {
    const { getDailyProgress, canClaimDailyChest, claimDailyChest } = useTaskStore();
    const { addBuff } = useBuffStore();
    const [reward, setReward] = useState<DailyChestReward | null>(null);
    const [isOpening, setIsOpening] = useState(false);

    const { completed, total, percentage } = getDailyProgress();
    const canClaim = canClaimDailyChest();

    const handleClaim = () => {
        if (!canClaim || isOpening) return;

        setIsOpening(true);

        // Delay for animation
        setTimeout(() => {
            const claimedReward = claimDailyChest();
            if (claimedReward) {
                setReward(claimedReward);
                // Apply the buff
                if (claimedReward.buffType && claimedReward.buffDuration) {
                    addBuff(
                        claimedReward.buffType,
                        0.10, // 10% boost
                        claimedReward.buffDuration
                    );
                }
            }
            setIsOpening(false);
        }, 1000);
    };

    const getBuffIcon = (buffType?: string) => {
        switch (buffType) {
            case 'xp_boost': return <Sparkles size={16} />;
            case 'attack_boost': return <Swords size={16} />;
            case 'defense_boost': return <Shield size={16} />;
            default: return <Zap size={16} />;
        }
    };

    const getBuffName = (buffType?: string) => {
        switch (buffType) {
            case 'xp_boost': return 'XP Boost';
            case 'attack_boost': return 'Attack Boost';
            case 'defense_boost': return 'Defense Boost';
            default: return 'Buff';
        }
    };

    // Don't render if no tasks today
    if (total === 0) {
        return null;
    }

    return (
        <motion.div
            className="daily-chest-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="chest-header">
                <Gift size={20} />
                <span>Daily Bonus</span>
            </div>

            {/* Progress Ring */}
            <div className="progress-section">
                <div className="progress-ring-container">
                    <svg className="progress-ring" viewBox="0 0 100 100">
                        <circle
                            className="progress-bg"
                            cx="50"
                            cy="50"
                            r="42"
                            strokeWidth="8"
                            fill="none"
                        />
                        <circle
                            className="progress-fill"
                            cx="50"
                            cy="50"
                            r="42"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${percentage * 2.64} 264`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="progress-text">
                        <span className="progress-count">{completed}/{total}</span>
                        <span className="progress-label">Tasks</span>
                    </div>
                </div>
            </div>

            {/* Chest Button / Reward Display */}
            <AnimatePresence mode="wait">
                {reward ? (
                    <motion.div
                        key="reward"
                        className="reward-display"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                    >
                        <h4>Rewards!</h4>
                        <div className="reward-items">
                            <div className="reward-item">
                                <Coins size={16} className="gold-icon" />
                                <span>+{reward.gold}</span>
                            </div>
                            <div className="reward-item">
                                <Sparkles size={16} className="xp-icon" />
                                <span>+{reward.globalXp} XP</span>
                            </div>
                            {reward.rareToken && (
                                <div className="reward-item rare">
                                    <span>🎟️ Rare Token!</span>
                                </div>
                            )}
                            <div className="reward-item buff">
                                {getBuffIcon(reward.buffType)}
                                <span>{getBuffName(reward.buffType)} (1h)</span>
                            </div>
                        </div>
                        <button
                            className="dismiss-btn"
                            onClick={() => setReward(null)}
                        >
                            Nice!
                        </button>
                    </motion.div>
                ) : (
                    <motion.button
                        key="chest"
                        className={`chest-button ${canClaim ? 'ready' : ''} ${isOpening ? 'opening' : ''}`}
                        onClick={handleClaim}
                        disabled={!canClaim || isOpening}
                        whileHover={canClaim ? { scale: 1.05 } : {}}
                        whileTap={canClaim ? { scale: 0.95 } : {}}
                    >
                        <span className="chest-icon">
                            {isOpening ? '✨' : canClaim ? '🎁' : '📦'}
                        </span>
                        <span className="chest-label">
                            {isOpening ? 'Opening...' : canClaim ? 'Claim Chest!' : 'Complete All Tasks'}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
