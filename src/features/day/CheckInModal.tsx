import { useState } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, Trophy, Coins } from 'lucide-react';
import { useCheckInStore } from '../../store/useCheckInStore';
import { getStreakReward } from '../../store/useCheckInStore';
import './CheckInModal.css';
import './CheckInModalTapHint.css';

const GoldIcon = ({ size = 16 }: { size?: number }) => (
    <Coins size={size} color="#fbbf24" style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
);

export const CheckInModal = ({ onClose }: { onClose: () => void }) => {
    const { currentStreak, longestStreak, checkIn, getStreakStatus, validateStreak } = useCheckInStore();
    const { canCheckIn, missedYesterday } = getStreakStatus();
    const [showReward, setShowReward] = useState(false);
    const [lastReward, setLastReward] = useState<any>(null);

    React.useEffect(() => {
        validateStreak();
    }, [validateStreak]);

    const handleCheckIn = () => {
        const reward = checkIn();
        if (reward) {
            setLastReward(reward);
            setShowReward(true);
        }
    };

    // Determine which week page to show based on total streak count
    // For a brand-new user (currentStreak=0) or week 1, show week 1.
    // After claiming today, currentStreak is already updated, so we peek ahead.
    const displayStreak = canCheckIn ? currentStreak + 1 : currentStreak;
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
                        <span className="streak-count">{currentStreak}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                    {longestStreak > 0 && (
                        <div className="best-streak-info" style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <span className="streak-count" style={{ fontSize: '1.2rem', color: '#ffb347', fontWeight: 'bold' }}>{longestStreak}</span>
                            <span className="streak-label" style={{ fontSize: '0.8rem', color: '#8c9bb4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Streak</span>
                        </div>
                    )}
                </div>
                {missedYesterday && currentStreak === 0 && (
                    <div className="streak-warning">
                        <p>⚠️ Streak broken! Restarting at Day 1.</p>
                    </div>
                )}
                <div className="week-calendar">
                    {weekDays.map((day) => {
                        const reward = getStreakReward(day);
                        const isCurrentDay = canCheckIn ? displayStreak === day : false;
                        const isPastDay = currentStreak >= day;
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
                        <span className="streak-count">{currentStreak}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                    {longestStreak > 0 && (
                        <div className="best-streak-info" style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <span className="streak-count" style={{ fontSize: '1.2rem', color: '#ffb347', fontWeight: 'bold' }}>{longestStreak}</span>
                            <span className="streak-label" style={{ fontSize: '0.8rem', color: '#8c9bb4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Streak</span>
                        </div>
                    )}
                </div>
                <div className="week-calendar">
                    {weekDays.map((day) => {
                        const reward = getStreakReward(day);
                        const isCurrentDay = canCheckIn ? displayStreak === day : false;
                        const isPastDay = currentStreak >= day;
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
        const todayStreakDay = displayStreak;
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
                        <span className="streak-count">{currentStreak}</span>
                        <span className="streak-label">Day Streak</span>
                    </div>
                    {longestStreak > 0 && (
                        <div className="best-streak-info" style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <span className="streak-count" style={{ fontSize: '1.2rem', color: '#ffb347', fontWeight: 'bold' }}>{longestStreak}</span>
                            <span className="streak-label" style={{ fontSize: '0.8rem', color: '#8c9bb4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Streak</span>
                        </div>
                    )}
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
                                    <div className="reward-item" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600 }}><GoldIcon size={24} /> Gold:</span>
                                        <span className="reward-value" style={{ fontSize: '1.5rem', color: '#fbbf24', fontWeight: 'bold', textShadow: '0 0 10px rgba(251,191,36,0.3)' }}>+{lastReward.gold ?? '?'}</span>
                                    </div>
                                    {lastReward.gems > 0 && (
                                        <div className="reward-item special" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600 }}>💎 Gems:</span>
                                            <span className="reward-value" style={{ fontSize: '1.5rem', color: '#38bdf8', fontWeight: 'bold', textShadow: '0 0 10px rgba(56,189,248,0.3)' }}>+{lastReward.gems}</span>
                                        </div>
                                    )}
                                    {lastReward.habitXp && (
                                        <div className="reward-item" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', marginTop: '8px', opacity: 0.8 }}>
                                            <span>✨ Habit XP:</span>
                                            <span className="reward-value">+{lastReward.habitXp}</span>
                                        </div>
                                    )}
                                    {lastReward.buffType && (
                                        <div className="reward-item" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', marginTop: '8px', opacity: 0.8 }}>
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
