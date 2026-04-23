import { useState } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Zap, Calendar, Gift, Flame, Trophy, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDayStore } from '../../store/useDayStore';
import { useGameStore } from '../../store/useGameStore';
import { useCheckInStore, type CheckInReward } from '../../store/useCheckInStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useRecurringTasksStore } from '../../store/useRecurringTasksStore';
import './WakeUpModal.css';

type Stage = 'sleep' | 'checkin' | 'weight' | 'xp_summary' | 'task_prompt';

export const WakeUpModal = ({ onComplete }: { onComplete: () => void }) => {
    const navigate = useNavigate();
    const { wakeUp, getEasternTime, skipTracking } = useDayStore();
    const { addSkillXp } = useGameStore();
    const { currentStreak, checkIn, getRewardForDay, getStreakStatus, validateStreak } = useCheckInStore();
    const { canCheckIn, missedYesterday } = getStreakStatus();
    const { logWeight, hasLoggedWeightToday, getLastWeight } = useHealthStore();
    const { completeTask } = useRecurringTasksStore();

    const [sleepScore, setSleepScore] = useState(75);
    const [readinessScore, setReadinessScore] = useState(75);
    const [sleepXpEarned, setSleepXpEarned] = useState<number | null>(null);
    const [checkInReward, setCheckInReward] = useState<CheckInReward | null>(null);
    const [showCheckInReward, setShowCheckInReward] = useState(false);

    React.useEffect(() => {
        validateStreak();
    }, [validateStreak]);

    const displayStreak = canCheckIn ? currentStreak + 1 : currentStreak;
    const [stage, setStage] = useState<Stage>('sleep');
    const [weightInput, setWeightInput] = useState('');

    const handleWakeUp = () => {
        // Fix: Force the daily task reset FIRST so that if the user logs their weight
        // below, it doesn't get wiped out right after when TasksPage mounts.
        useRecurringTasksStore.getState().checkAndReset();

        const xp = wakeUp(sleepScore, readinessScore);
        setSleepXpEarned(xp);

        // Award XP to Sleep skill
        if (xp > 0) {
            addSkillXp('Sleep', xp, { capExempt: true });
        }

        // Transition to check-in stage after brief XP display
        setTimeout(() => {
            setStage('checkin');
        }, 1200);
    };

    const handleSkipTracking = () => {
        useRecurringTasksStore.getState().checkAndReset();
        skipTracking();
        setStage('checkin');
    };

    const handleCheckIn = () => {
        const reward = checkIn();
        if (reward) {
            setCheckInReward(reward);
            setShowCheckInReward(true);
        } else {
            // Already checked in — skip to summary
            setStage('xp_summary');
        }
    };

    const handleCheckInRewardContinue = () => {
        setShowCheckInReward(false);
        // Go to weight stage if not logged today
        if (!hasLoggedWeightToday()) {
            setStage('weight');
        } else {
            setStage('xp_summary');
        }
    };

    const handleSkipCheckIn = () => {
        if (!hasLoggedWeightToday()) {
            setStage('weight');
        } else {
            setStage('xp_summary');
        }
    };

    const handleLogWeight = () => {
        const w = parseFloat(weightInput);
        if (!isNaN(w) && w > 0) {
            logWeight(w);
            completeTask('weigh_self', { weight: w });
        }
        setStage('xp_summary');
    };

    const handleGoToTasks = () => {
        onComplete();
        navigate('/tasks');
    };

    const weekDays = [1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="modal-overlay wake-overlay">
            <motion.div
                className="modal-content wake-modal"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                {/* ===== STAGE 1: SLEEP & READINESS ===== */}
                {stage === 'sleep' && sleepXpEarned === null && (
                    <>
                        <div className="wake-header">
                            <Sun size={48} className="sun-icon" />
                            <h2>Good Morning!</h2>
                            <p className="time-display">{getEasternTime()} EST</p>
                        </div>

                        <div className="sleep-input">
                            <label>How did you sleep? (Sleep Score 0-100)</label>
                            <div className="slider-row">
                                <Moon size={20} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sleepScore}
                                    onChange={(e) => setSleepScore(Number(e.target.value))}
                                />
                                <span className="score-value">{sleepScore}</span>
                            </div>
                            <div className="xp-preview">
                                {sleepScore >= 90 ? '5 XP (Excellent!)' :
                                    sleepScore >= 80 ? '3 XP (Great!)' :
                                        sleepScore >= 70 ? '2 XP (Good)' :
                                            sleepScore >= 60 ? '1 XP (Okay)' :
                                                '0 XP (Poor sleep)'}
                            </div>
                        </div>

                        <div className="sleep-input" style={{ marginTop: '1.5rem' }}>
                            <label>How ready are you for the day? (Readiness 0-100)</label>
                            <div className="slider-row">
                                <Zap size={20} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={readinessScore}
                                    onChange={(e) => setReadinessScore(Number(e.target.value))}
                                />
                                <span className="score-value">{readinessScore}</span>
                            </div>
                            <div className="xp-preview">
                                {readinessScore >= 90 ? '5 XP (Ready!)' :
                                    readinessScore >= 80 ? '3 XP (Great!)' :
                                        readinessScore >= 70 ? '2 XP (Good)' :
                                            readinessScore >= 60 ? '1 XP (Okay)' :
                                                '0 XP (Not ready)'}
                            </div>
                        </div>

                        <div className="wake-buttons-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button className="start-day-btn" onClick={handleWakeUp}>
                                <Zap size={20} /> Start My Day
                            </button>
                            <button 
                                className="skip-tracking-btn" 
                                onClick={handleSkipTracking}
                                style={{
                                    background: 'rgba(2ef, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Didn't Track Last Night
                            </button>
                        </div>
                    </>
                )}

                {/* Brief sleep XP flash before check-in */}
                {stage === 'sleep' && sleepXpEarned !== null && (
                    <motion.div
                        className="xp-result"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        <p>+{sleepXpEarned} Sleep XP!</p>
                        <p className="hp-msg">HP Restored to Full!</p>
                        <div className="xp-breakdown" style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '0.5rem' }}>
                            (Sleep + Readiness)
                        </div>
                    </motion.div>
                )}

                {/* ===== STAGE 2: DAILY CHECK-IN ===== */}
                {stage === 'checkin' && !showCheckInReward && (
                    <motion.div
                        className="wake-checkin"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="wake-checkin__header">
                            <Calendar size={28} />
                            <h3>Daily Check-In</h3>
                        </div>

                        <div className="wake-checkin__streak">
                            <Flame size={28} className="wake-checkin__flame" />
                            <div className="wake-checkin__streak-info">
                                <span className="wake-checkin__streak-count">{currentStreak}</span>
                                <span className="wake-checkin__streak-label">Day Streak</span>
                            </div>
                        </div>

                        {missedYesterday && currentStreak === 0 && (
                            <div className="wake-checkin__warning">
                                ⚠️ Streak broken! Restarting at Day 1.
                            </div>
                        )}

                        <div className="wake-checkin__calendar">
                            {weekDays.map((day) => {
                                const reward = getRewardForDay(day);
                                const isCurrentDay = canCheckIn ? displayStreak === day : false;
                                const isPastDay = currentStreak >= day;

                                return (
                                    <div
                                        key={day}
                                        className={`wake-checkin__day ${isCurrentDay ? 'current' : ''} ${isPastDay ? 'claimed' : ''} ${isCurrentDay && canCheckIn ? 'tappable' : ''}`}
                                        onClick={() => isCurrentDay && canCheckIn && handleCheckIn()}
                                    >
                                        <div className="wake-checkin__day-num">Day {day}</div>
                                        <div className="wake-checkin__day-icon">
                                            {isPastDay ? '✓' : reward.dailyTickets ? '🎫' : '🎁'}
                                        </div>
                                        <div className="wake-checkin__day-rewards">
                                            <span>💰 {reward.gold}</span>
                                            {reward.habitXp && <span>✨ +{reward.habitXp} Habit XP</span>}
                                            {reward.buffType && <span className="wake-checkin__buff">+Buff</span>}
                                            {reward.dailyTickets && <span className="wake-checkin__ticket">🎫</span>}
                                        </div>
                                        {isCurrentDay && canCheckIn && (
                                            <div className="wake-checkin__tap-hint">Tap!</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {canCheckIn ? (
                            <motion.button
                                className="wake-checkin__btn"
                                onClick={handleCheckIn}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Gift size={20} />
                                Check In Now
                            </motion.button>
                        ) : (
                            <div className="wake-checkin__claimed">
                                <Trophy size={20} />
                                <span>Already checked in today!</span>
                            </div>
                        )}

                        {!canCheckIn && (
                            <button className="wake-checkin__skip" onClick={handleSkipCheckIn}>
                                Continue →
                            </button>
                        )}
                    </motion.div>
                )}

                {/* (Reward popup moved to root level overlay) */}

                {/* ===== STAGE 3: WEIGHT LOG ===== */}
                {stage === 'weight' && (
                    <motion.div
                        className="wake-weight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="wake-weight__header">
                            <Scale size={28} />
                            <h3>Daily Weigh-In</h3>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Step on the scale — track your progress! (+1 Health XP)
                        </p>
                        {getLastWeight() && (
                            <p style={{ color: '#475569', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                Last: {getLastWeight()} lbs
                            </p>
                        )}
                        <div className="form-row" style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#94a3b8', minWidth: 60 }}>Weight</label>
                            <input
                                type="number"
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                                placeholder={getLastWeight() ? `${getLastWeight()}` : '180'}
                                step="0.1"
                                min="50"
                                max="500"
                                style={{
                                    flex: 1,
                                    background: 'rgba(15,23,42,0.6)',
                                    border: '1px solid rgba(148,163,184,0.2)',
                                    borderRadius: '0.5rem',
                                    padding: '0.6rem 0.75rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    minHeight: '44px'
                                }}
                            />
                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>lbs</span>
                        </div>
                        <motion.button
                            className={weightInput ? "wake-checkin__btn" : "wake-checkin__skip"}
                            style={!weightInput ? { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' } : undefined}
                            onClick={handleLogWeight}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Scale size={18} />
                            {weightInput ? 'Log Weight' : 'Skip'}
                        </motion.button>
                    </motion.div>
                )}

                {/* ===== STAGE 4: XP SUMMARY ===== */}
                {stage === 'xp_summary' && (
                    <motion.div
                        className="xp-result"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        <p>+{(sleepXpEarned ?? 0) + (checkInReward?.habitXp ?? 0)} Total XP!</p>
                        <p className="hp-msg">HP Restored to Full!</p>
                        <div className="xp-breakdown" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.75rem', lineHeight: 1.6 }}>
                            {sleepXpEarned != null && <div>🛏️ Sleep: +{sleepXpEarned} XP</div>}
                            {checkInReward && checkInReward.habitXp && <div>📅 Check-In: +{checkInReward.habitXp} Habit XP</div>}
                            {checkInReward?.gold && <div>💰 Gold: +{checkInReward.gold}</div>}
                        </div>
                        <button
                            className="wake-checkin__skip"
                            style={{ marginTop: '1.5rem' }}
                            onClick={handleGoToTasks}
                        >
                            Continue to Tasks →
                        </button>
                    </motion.div>
                )}
            </motion.div>

            {/* Check-in reward popup overlay */}
            {createPortal(
                <AnimatePresence>
                    {showCheckInReward && checkInReward && (
                        <div className="board-reward-overlay">
                            <motion.div
                                className="wake-checkin__reward-overlay"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <div className="wake-checkin__reward-glow" />
                        <h3>🎉 Reward Claimed!</h3>
                        <div className="wake-checkin__reward-list">
                            <div className="wake-checkin__reward-item">
                                <span>💰 Gold:</span>
                                <span className="wake-checkin__reward-value">+{checkInReward.gold ?? '?'}</span>
                            </div>
                            {checkInReward.habitXp && (
                                <div className="wake-checkin__reward-item">
                                    <span>✨ Habit XP:</span>
                                    <span className="wake-checkin__reward-value">+{checkInReward.habitXp}</span>
                                </div>
                            )}
                            {checkInReward.buffType && (
                                <div className="wake-checkin__reward-item">
                                    <span>🔥 Buff:</span>
                                    <span className="wake-checkin__reward-value">
                                        {checkInReward.buffType === 'xp_boost' && '+5% XP'}
                                        {checkInReward.buffType === 'gold_boost' && '+10% Gold'}
                                        {' for ' + checkInReward.buffDuration + 'h'}
                                    </span>
                                </div>
                            )}
                            {checkInReward.dailyTickets && (
                                <div className="wake-checkin__reward-item wake-checkin__reward-item--special">
                                    <span>🎫 Daily Tickets:</span>
                                    <span className="wake-checkin__reward-value">+{checkInReward.dailyTickets}</span>
                                </div>
                            )}
                        </div>
                                <button className="wake-checkin__skip" onClick={handleCheckInRewardContinue}>
                                    Continue →
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
