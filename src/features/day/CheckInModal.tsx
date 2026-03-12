import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, Trophy } from 'lucide-react';
import { useCheckInStore } from '../../store/useCheckInStore';
import './CheckInModal.css';
import './CheckInModalTapHint.css';

export const CheckInModal = ({ onClose }: { onClose: () => void }) => {
    const { streakDay, streakCount, checkIn, getRewardForDay, getStreakStatus } = useCheckInStore();
    const { canCheckIn, missedYesterday } = getStreakStatus();
    const [showReward, setShowReward] = useState(false);
    const [lastReward, setLastReward] = useState<any>(null);

    const handleCheckIn = () => {
        const reward = checkIn();
        if (reward) {
            setLastReward(reward);
            setShowReward(true);
        }
    };

    const weekDays = [1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="modal-overlay">
            <motion.div
                className="modal-content checkin-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <button onClick={onClose} className="close-corner">×</button>

                <div className="checkin-header">
                    <Calendar size={32} />
                    <h2>Daily Check-In</h2>
                </div>

                <div className="streak-display">
                    <Flame className="flame-icon" />
                    <div className="streak-info">
                        <span className="streak-count">{streakCount}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                </div>

                {missedYesterday && streakCount > 0 && (
                    <div className="streak-warning">
                        <p>⚠️ Streak broken! You'll receive a consolation reward.</p>
                    </div>
                )}

                <div className="week-calendar">
                    {weekDays.map((day) => {
                        const reward = getRewardForDay(day);
                        const isCurrentDay = day === streakDay;
                        const isPastDay = day < streakDay;

                        return (
                            <motion.div
                                key={day}
                                className={`day-card ${isCurrentDay ? 'current' : ''} ${isPastDay ? 'claimed' : ''} ${isCurrentDay && canCheckIn ? 'tappable' : ''}`}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                    if (isCurrentDay && canCheckIn && !showReward) {
                                        handleCheckIn();
                                    }
                                }}
                                style={{ cursor: isCurrentDay && canCheckIn ? 'pointer' : 'default' }}
                            >
                                <div className="day-number">Day {day}</div>
                                <div className="day-icon">
                                    {isPastDay ? '✓' : reward.gachaTicket ? '🎫' : '🎁'}
                                </div>
                                <div className="day-rewards">
                                    <span>💰 {reward.gold}</span>
                                    <span>✨ {reward.xp} XP</span>
                                    {reward.buffType && <span className="buff-badge">+Buff</span>}
                                    {reward.gachaTicket && <span className="ticket-badge">🎫 Ticket</span>}
                                </div>
                                {isCurrentDay && canCheckIn && (
                                    <div className="tap-hint">Tap to claim!</div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>


                {!canCheckIn && !showReward && (
                    <div className="already-claimed">
                        <Trophy size={24} />
                        <p>Already checked in today!</p>
                        <p className="next-checkin">Come back tomorrow</p>
                    </div>
                )}

            </motion.div>

            <AnimatePresence>
                {showReward && lastReward && (
                    <div className="board-reward-overlay">
                        <motion.div
                            className="reward-popup modal-reward-card"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                        >
                            <div className="reward-glow" />
                            <h3>🎉 Reward Claimed!</h3>
                            <div className="reward-list">
                                <div className="reward-item">
                                    <span>💰 Gold:</span>
                                    <span className="reward-value">+{lastReward.gold}</span>
                                </div>
                                <div className="reward-item">
                                    <span>✨ XP:</span>
                                    <span className="reward-value">+{lastReward.xp}</span>
                                </div>
                                {lastReward.buffType && (
                                    <div className="reward-item">
                                        <span>🔥 Buff:</span>
                                        <span className="reward-value">
                                            {lastReward.buffType === 'xp_boost' && '+5% XP'}
                                            {lastReward.buffType === 'gold_boost' && '+10% Gold'}
                                            {' for ' + lastReward.buffDuration + 'h'}
                                        </span>
                                    </div>
                                )}
                                {lastReward.gachaTicket && (
                                    <div className="reward-item special">
                                        <span>🎫 Gacha Ticket:</span>
                                        <span className="reward-value">+1</span>
                                    </div>
                                )}
                            </div>
                            <button
                                className="continue-btn"
                                onClick={() => {
                                    setShowReward(false);
                                    onClose();
                                }}
                            >
                                Continue
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
