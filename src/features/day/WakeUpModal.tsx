import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Zap, ListTodo, ArrowRight, Calendar, Gift, Flame, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDayStore } from '../../store/useDayStore';
import { useGameStore } from '../../store/useGameStore';
import { useCheckInStore, type CheckInReward } from '../../store/useCheckInStore';
import './WakeUpModal.css';

type Stage = 'sleep' | 'checkin' | 'xp_summary' | 'task_prompt';

export const WakeUpModal = ({ onComplete }: { onComplete: () => void }) => {
    const navigate = useNavigate();
    const { wakeUp, getEasternTime } = useDayStore();
    const { addSkillXp, addGlobalXp } = useGameStore();
    const { streakDay, streakCount, checkIn, getRewardForDay, getStreakStatus } = useCheckInStore();
    const { canCheckIn, missedYesterday } = getStreakStatus();

    const [sleepScore, setSleepScore] = useState(75);
    const [readinessScore, setReadinessScore] = useState(75);
    const [sleepXpEarned, setSleepXpEarned] = useState<number | null>(null);
    const [checkInReward, setCheckInReward] = useState<CheckInReward | null>(null);
    const [showCheckInReward, setShowCheckInReward] = useState(false);
    const [stage, setStage] = useState<Stage>('sleep');

    const handleWakeUp = () => {
        const xp = wakeUp(sleepScore, readinessScore);
        setSleepXpEarned(xp);

        // Award XP to Sleep skill
        if (xp > 0) {
            addSkillXp('Sleep', xp);
            // Also add 20% to global XP for overall level
            addGlobalXp(Math.floor(xp * 0.2));
        }

        // Transition to check-in stage after brief XP display
        setTimeout(() => {
            setStage('checkin');
        }, 1200);
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
        setStage('xp_summary');
    };

    const handleSkipCheckIn = () => {
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

                        <button className="start-day-btn" onClick={handleWakeUp}>
                            <Zap size={20} /> Start My Day
                        </button>
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
                                <span className="wake-checkin__streak-count">{streakCount}</span>
                                <span className="wake-checkin__streak-label">Day Streak</span>
                            </div>
                        </div>

                        {missedYesterday && streakCount > 0 && (
                            <div className="wake-checkin__warning">
                                ⚠️ Streak broken! You'll receive a consolation reward.
                            </div>
                        )}

                        <div className="wake-checkin__calendar">
                            {weekDays.map((day) => {
                                const reward = getRewardForDay(day);
                                const isCurrentDay = day === streakDay;
                                const isPastDay = day < streakDay;

                                return (
                                    <div
                                        key={day}
                                        className={`wake-checkin__day ${isCurrentDay ? 'current' : ''} ${isPastDay ? 'claimed' : ''}`}
                                    >
                                        <div className="wake-checkin__day-num">Day {day}</div>
                                        <div className="wake-checkin__day-icon">
                                            {isPastDay ? '✓' : reward.gachaTicket ? '🎫' : '🎁'}
                                        </div>
                                        <div className="wake-checkin__day-rewards">
                                            <span>💰 {reward.gold}</span>
                                            <span>✨ {reward.xp} XP</span>
                                            {reward.buffType && <span className="wake-checkin__buff">+Buff</span>}
                                            {reward.gachaTicket && <span className="wake-checkin__ticket">🎫</span>}
                                        </div>
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

                {/* Check-in reward popup overlay */}
                <AnimatePresence>
                    {showCheckInReward && checkInReward && (
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
                                    <span className="wake-checkin__reward-value">+{checkInReward.gold}</span>
                                </div>
                                <div className="wake-checkin__reward-item">
                                    <span>✨ XP:</span>
                                    <span className="wake-checkin__reward-value">+{checkInReward.xp}</span>
                                </div>
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
                                {checkInReward.gachaTicket && (
                                    <div className="wake-checkin__reward-item wake-checkin__reward-item--special">
                                        <span>🎫 Gacha Ticket:</span>
                                        <span className="wake-checkin__reward-value">+1</span>
                                    </div>
                                )}
                            </div>
                            <button className="wake-checkin__reward-continue" onClick={handleCheckInRewardContinue}>
                                Continue
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== STAGE 3: XP SUMMARY ===== */}
                {stage === 'xp_summary' && (
                    <motion.div
                        className="xp-result"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        <p>+{(sleepXpEarned ?? 0) + (checkInReward?.xp ?? 0)} Total XP!</p>
                        <p className="hp-msg">HP Restored to Full!</p>
                        <div className="xp-breakdown" style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.75rem', lineHeight: 1.6 }}>
                            {sleepXpEarned != null && <div>🛏️ Sleep: +{sleepXpEarned} XP</div>}
                            {checkInReward && <div>📅 Check-In: +{checkInReward.xp} XP</div>}
                            {checkInReward?.gold && <div>💰 Gold: +{checkInReward.gold}</div>}
                        </div>
                        <button
                            className="wake-checkin__skip"
                            style={{ marginTop: '1.5rem' }}
                            onClick={() => setStage('task_prompt')}
                        >
                            Continue →
                        </button>
                    </motion.div>
                )}

                {/* ===== STAGE 4: TASK BOARD PROMPT ===== */}
                {stage === 'task_prompt' && (
                    <motion.div
                        className="task-prompt"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="task-prompt__icon">
                            <ListTodo size={40} />
                        </div>
                        <h3 className="task-prompt__title">Ready to conquer the day?</h3>
                        <p className="task-prompt__subtitle">Check your daily quests and start earning XP!</p>

                        <button className="task-prompt__go-btn" onClick={handleGoToTasks}>
                            <ListTodo size={20} />
                            Check Daily Tasks
                            <ArrowRight size={18} />
                        </button>

                        <button className="task-prompt__skip-btn" onClick={onComplete}>
                            Skip for now
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
