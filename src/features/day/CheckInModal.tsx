import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, Trophy } from 'lucide-react';
import { useCheckInStore } from '../../store/useCheckInStore';
import { getStreakReward } from '../../store/useCheckInStore';
import './CheckInModal.css';
import './CheckInModalTapHint.css';

export const CheckInModal = ({ onClose }: { onClose: () => void }) => {
    const { streakDay, streakCount, checkIn, getStreakStatus } = useCheckInStore();
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

    // Determine which week page to show based on total streak count
    // For a brand-new user (streakCount=0) or week 1, show week 1.
    // After claiming today, streakCount is already updated, so we peek ahead.
    const displayStreak = canCheckIn ? streakCount + 1 : streakCount;
    const currentWeek = Math.min(4, Math.ceil(Math.max(displayStreak, 1) / 7));
    const isWeek5Plus = displayStreak >= 29;

    // ── Week 1 view (days 1-7) ──────────────────────────────────────────
    const renderWeek1 = () => {
        const weekDays = [1, 2, 3, 4, 5, 6, 7];
        return (
            <>
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
                        const reward = getStreakReward(day);
                        const isCurrentDay = day === streakDay || (canCheckIn && day === streakDay);
                        const isPastDay = day < streakDay;
                        return (
                            <motion.div
                                key={day}
                                className={`day-card ${isCurrentDay ? 'current' : ''} ${isPastDay ? 'claimed' : ''} ${isCurrentDay && canCheckIn ? 'tappable' : ''}`}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                    if (isCurrentDay && canCheckIn && !showReward) handleCheckIn();
                                }}
                                style={{ cursor: isCurrentDay && canCheckIn ? 'pointer' : 'default' }}
                            >
                                <div className="day-number">Day {day}</div>
                                <div className="day-icon">
                                    {isPastDay ? '✓' : reward.gems ? '💎' : reward.dailyTickets ? '🎫' : '🎁'}
                                </div>
                                <div className="day-rewards">
                                    <span>💰 {reward.gold}</span>
                                    {reward.dailyTickets && <span>🎫 {reward.dailyTickets}</span>}
                                    {reward.gems ? <span className="gem-badge">💎 +{reward.gems}</span> : null}
                                    {reward.buffType && <span className="buff-badge">+Buff</span>}
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
            </>
        );
    };

    // ── Week 2/3/4 generic renderer (days startDay..endDay) ────────────
    const renderMultiWeek = (week: number) => {
        const startDay = (week - 1) * 7 + 1; // e.g. week 2 → day 8
        const weekDays = Array.from({ length: 7 }, (_, i) => startDay + i);
        const weekLabels: Record<number, string> = { 2: 'Week 2', 3: 'Week 3', 4: 'Week 4' };

        return (
            <>
                <div className="checkin-header">
                    <Flame size={32} className="flame-icon" />
                    <h2>{weekLabels[week]}</h2>
                </div>
                <div className="streak-display">
                    <Flame className="flame-icon" />
                    <div className="streak-info">
                        <span className="streak-count">{streakCount}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                </div>
                <div className="week-calendar">
                    {weekDays.map((day) => {
                        const reward = getStreakReward(day);
                        const isCurrentDay = canCheckIn
                            ? streakCount + 1 === day
                            : streakCount === day;
                        const isPastDay = streakCount >= day && !isCurrentDay;
                        return (
                            <motion.div
                                key={day}
                                className={`day-card ${isCurrentDay ? 'current' : ''} ${isPastDay ? 'claimed' : ''} ${isCurrentDay && canCheckIn ? 'tappable' : ''}`}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                    if (isCurrentDay && canCheckIn && !showReward) handleCheckIn();
                                }}
                                style={{ cursor: isCurrentDay && canCheckIn ? 'pointer' : 'default' }}
                            >
                                <div className="day-number">Day {day}</div>
                                <div className="day-icon">
                                    {isPastDay ? '✓' : reward.gems ? '💎' : '🎁'}
                                </div>
                                <div className="day-rewards">
                                    <span>💰 {reward.gold}</span>
                                    {reward.dailyTickets && <span>🎫 {reward.dailyTickets}</span>}
                                    {reward.gems ? <span className="gem-badge">💎 +{reward.gems}</span> : null}
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
            </>
        );
    };

    // ── Week 5+ fire mode ───────────────────────────────────────────────
    const renderFireMode = () => {
        const todayStreakDay = canCheckIn ? streakCount + 1 : streakCount;
        const reward = getStreakReward(todayStreakDay);
        return (
            <>
                <div className="checkin-header">
                    <span style={{ fontSize: '2rem' }}>🔥</span>
                    <h2>Daily Check-In</h2>
                </div>
                <div className="streak-display">
                    <Flame className="flame-icon" />
                    <div className="streak-info">
                        <span className="streak-count">{streakCount}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                </div>
                <div className="fire-mode-box">
                    <motion.div
                        className={`fire-day-card ${canCheckIn ? 'tappable current' : 'claimed'}`}
                        whileHover={canCheckIn ? { scale: 1.05 } : {}}
                        onClick={() => { if (canCheckIn && !showReward) handleCheckIn(); }}
                        style={{ cursor: canCheckIn ? 'pointer' : 'default' }}
                    >
                        <div className="fire-day-label">🔥 Day {todayStreakDay} in a row</div>
                        <div className="day-rewards" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                            <span>💰 {reward.gold}</span>
                            <span>🎫 {reward.dailyTickets}</span>
                            {reward.gems ? <span className="gem-badge">💎 +{reward.gems}</span> : null}
                        </div>
                        {canCheckIn && <div className="tap-hint">Tap to claim!</div>}
                    </motion.div>
                </div>
                {!canCheckIn && !showReward && (
                    <div className="already-claimed">
                        <Trophy size={24} />
                        <p>Already checked in today!</p>
                        <p className="next-checkin">Come back tomorrow</p>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="modal-overlay">
            <motion.div
                className="modal-content checkin-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <button onClick={onClose} className="close-corner">×</button>

                {isWeek5Plus
                    ? renderFireMode()
                    : currentWeek === 1
                        ? renderWeek1()
                        : renderMultiWeek(currentWeek)
                }

            </motion.div>

            {createPortal(
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
                                        <span className="reward-value">+{lastReward.gold ?? '?'}</span>
                                    </div>
                                    {lastReward.dailyTickets && (
                                        <div className="reward-item special">
                                            <span>🎫 Tickets:</span>
                                            <span className="reward-value">+{lastReward.dailyTickets}</span>
                                        </div>
                                    )}
                                    {lastReward.gems > 0 && (
                                        <div className="reward-item special">
                                            <span>💎 Gems:</span>
                                            <span className="reward-value">+{lastReward.gems}</span>
                                        </div>
                                    )}
                                    {lastReward.habitXp && (
                                        <div className="reward-item">
                                            <span>✨ Habit XP:</span>
                                            <span className="reward-value">+{lastReward.habitXp}</span>
                                        </div>
                                    )}
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
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
