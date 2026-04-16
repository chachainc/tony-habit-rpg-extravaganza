import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFocusStore, TARGET_FOCUS_SECONDS, TARGET_ADVANCED_FOCUS_SECONDS, TARGET_MYTHIC_FOCUS_SECONDS } from '../../store/useFocusStore';
import { usePetStore } from '../../store/usePetStore';
import { useToast } from '../../components/ui/Toast';
import './FocusRoom.css';

const ZEN_DIALOGUE = [
    "You rush. Why?",
    "Sit longer.",
    "Nothing grows in a hurry."
];

const EVOLVED_DIALOGUE = [
    "You stayed. That matters.",
    "Most leave before this point.",
    "You’re beginning to understand."
];

const MYTHIC_DIALOGUE = [
    "Time is no longer your enemy.",
    "You are becoming still.",
    "Few reach this state."
];

export const FocusRoom: React.FC = () => {
    const navigate = useNavigate();
    const store = useFocusStore();
    const { equippedPetId } = usePetStore();
    const addToast = useToast(state => state.addToast);

    // Determine current Phase
    let tier: 'basic' | 'advanced' | 'mythic' = 'basic';
    if (store.hasUnlockedAdvancedTortoise) tier = 'mythic';
    else if (store.hasUnlockedFirstTortoise) tier = 'advanced';

    const [isActive, setIsActive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [wakeLock, setWakeLock] = useState<any | null>(null);
    const [dialogue, setDialogue] = useState<string | null>(null);

    const startTimestampRef = useRef<number | null>(null);
    const frameRef = useRef<number>();
    const lastProgressRef = useRef<number>(-1);
    const lastDialogueIndexRef = useRef<number>(-1);

    // ── Dialogue Engine ──
    const triggerDialogue = (pool: string[]) => {
        let index = Math.floor(Math.random() * pool.length);
        if (index === lastDialogueIndexRef.current && pool.length > 1) {
            index = (index + 1) % pool.length;
        }
        lastDialogueIndexRef.current = index;
        setDialogue(pool[index]);
        setTimeout(() => setDialogue(null), 8000);
    };

    const getPool = () => {
        if (tier === 'mythic') return MYTHIC_DIALOGUE;
        if (tier === 'advanced') return EVOLVED_DIALOGUE;
        return ZEN_DIALOGUE;
    };

    // ── Timer Loop ──
    const loop = () => {
        if (startTimestampRef.current) {
            const now = Date.now();
            const diffSeconds = Math.floor((now - startTimestampRef.current) / 1000);
            setElapsed(diffSeconds);

            // Check milestone triggers dynamically during active session
            const currentAccumulated = getAccumulated() + diffSeconds;
            const target = getTarget();
            const pct = (currentAccumulated / target) * 100;
            let currentStage = 0;
            if (pct >= 100) currentStage = 4;
            else if (pct >= 80) currentStage = 3;
            else if (pct >= 60) currentStage = 2; // Not strictly visual but dialogue hook
            else if (pct >= 40) currentStage = 2;
            else if (pct >= 20) currentStage = 1;

            if (lastProgressRef.current !== -1 && currentStage > lastProgressRef.current) {
                triggerDialogue(getPool());
            }
            lastProgressRef.current = currentStage;
        }
        frameRef.current = requestAnimationFrame(loop);
    };

    useEffect(() => {
        if (isActive) {
            frameRef.current = requestAnimationFrame(loop);
        } else if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isActive]);

    // ── WakeLock auto-management ──
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                const lock = await navigator.wakeLock.request('screen');
                setWakeLock(lock);
            }
        } catch (err) {
            console.warn('Wake Lock error:', err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLock) {
            await wakeLock.release();
            setWakeLock(null);
        }
    };

    // ── Visibility Auto-Exit ──
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isActive) {
                const finalElapsed = elapsed;
                
                setIsActive(false);
                startTimestampRef.current = null;
                releaseWakeLock();

                if (finalElapsed > 0) {
                    store.addFocusTime(finalElapsed, tier);
                    addToast(`Focus Interrupted! +${formatTime(finalElapsed)} added (No bonuses across exits).`, 'warning');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isActive, elapsed, store, addToast, wakeLock, tier]);

    // ── Smart Bonus System Math ──
    const calculateBonus = (elapsedSec: number, currentTier: 'basic' | 'advanced' | 'mythic') => {
        const fullHours = Math.floor(elapsedSec / 3600);
        if (fullHours < 1) return 0;

        if (currentTier === 'basic') {
            return fullHours * 300;
        } else {
            // Enhanced/Mythic: Stacked +5m per hour block
            let stackedBonus = 0;
            for (let i = 1; i <= fullHours; i++) {
                stackedBonus += (i * 300);
            }
            return stackedBonus;
        }
    };

    // ── Start / Stop Logic ──
    const handleStart = () => {
        setIsActive(true);
        startTimestampRef.current = Date.now();
        setElapsed(0);
        requestWakeLock();
        triggerDialogue(getPool());
    };

    const handleStop = () => {
        if (!isActive) return;
        setIsActive(false);
        startTimestampRef.current = null;
        releaseWakeLock();

        const bonusSeconds = calculateBonus(elapsed, tier);
        const totalAdded = elapsed + bonusSeconds;

        if (elapsed > 0) {
            store.addFocusTime(totalAdded, tier);
            if (bonusSeconds > 0) {
                addToast(`Focus Complete! +${formatTime(elapsed)} + ${formatTime(bonusSeconds)} Bonus!`, 'success');
            } else {
                addToast(`Focus Complete! +${formatTime(elapsed)} added.`, 'info');
            }
            triggerDialogue(getPool());
        }
    };

    // ── Formatters ──
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatRemaining = (secondsLeft: number) => {
        const h = Math.floor(secondsLeft / 3600);
        const m = Math.floor((secondsLeft % 3600) / 60);
        return `${h}h ${m}m remaining`;
    };

    // ── Visual Progression Math ──
    const getAccumulated = () => {
        if (tier === 'mythic') return store.totalMythicFocusTimeAccumulated;
        if (tier === 'advanced') return store.totalAdvancedFocusTimeAccumulated;
        return store.totalFocusTimeAccumulated;
    };
    
    const getTarget = () => {
        if (tier === 'mythic') return TARGET_MYTHIC_FOCUS_SECONDS;
        if (tier === 'advanced') return TARGET_ADVANCED_FOCUS_SECONDS;
        return TARGET_FOCUS_SECONDS;
    };

    const progressPercent = Math.min(100, (getAccumulated() / getTarget()) * 100);
    const remainingSeconds = Math.max(0, getTarget() - getAccumulated());
    
    let progressStage = 0;
    if (progressPercent >= 100) progressStage = 4;
    else if (progressPercent >= 80) progressStage = 3;
    else if (progressPercent >= 40) progressStage = 2;
    else if (progressPercent >= 20) progressStage = 1;
    else progressStage = 0;

    const pendingBonus = calculateBonus(elapsed, tier);
    
    // UI toggles
    let roomTitle = "Focus Room";
    let roomSubtitle = "Accumulate focus time to free the Zen Tortoise.";
    let tortoiseImg = "/assets/focus_tortoise.jpg";
    let trapClass = "focus-room__trap";
    let titleColor = "#10b981";
    let activeBubbleStyle = "focus-room__dialogue-bubble--zen";
    
    if (tier === 'advanced') {
        roomTitle = "Evolved Focus Room";
        roomSubtitle = "Commit vast amounts of focus to awake the ancient server.";
        tortoiseImg = "/assets/focus_tortoise_evolved.jpg";
        trapClass = "focus-room__trap--advanced";
        titleColor = "#38bdf8";
        activeBubbleStyle = "focus-room__dialogue-bubble--evolved";
    } else if (tier === 'mythic') {
        roomTitle = "Cosmic Focus Space";
        roomSubtitle = "Walk the stars. Unlock the absolute limit of the tortoise.";
        tortoiseImg = "/assets/focus_tortoise_cosmic.jpg";
        trapClass = "focus-room__trap--mythic";
        titleColor = "#a855f7";
        activeBubbleStyle = "focus-room__dialogue-bubble--mythic";
    }
    
    const fullyMaxed = tier === 'mythic' && store.hasUnlockedMythicTortoise;

    // Display Passives Active
    let activeBenefitString = "";
    if (equippedPetId === 'zen_tortoise') {
        activeBenefitString = "Slow Breath: +5% Heal & Energy Regen";
    } else if (equippedPetId === 'master_tortoise') {
        const dmgScale = Math.min(15, Math.floor(Math.floor(store.lastFocusDuration / 60) / 10));
        activeBenefitString = `Patience Engine: +${dmgScale}% Damage, +10% Magic Def`;
    } else if (equippedPetId === 'cosmic_tortoise') {
        activeBenefitString = "Stillness of Time: +15% Buff/Debuff Duration, Surge every 60s";
    }

    return (
        <motion.div className="focus-room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="focus-room__header">
                <h1 style={{ color: titleColor }}>{roomTitle}</h1>
                <p>{roomSubtitle}</p>
            </div>

            <div className={`focus-room__visual ${tier !== 'basic' ? 'focus-room__visual--' + tier : ''}`}>
                <img 
                    src={tortoiseImg} 
                    alt="Tortoise" 
                    className={`focus-room__tortoise-img ${tier !== 'basic' ? 'focus-room__tortoise-img--' + tier : ''}`}
                    data-progress={progressStage}
                />
                {!fullyMaxed && progressStage < 4 && (
                    <div className={trapClass} data-progress={progressStage} />
                )}

                <AnimatePresence>
                    {dialogue && (
                        <motion.div 
                            className={`focus-room__dialogue-bubble ${activeBubbleStyle}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            {dialogue}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="focus-room__timer-display" style={{ textShadow: `0 4px 20px ${titleColor}` }}>
                {formatTime(elapsed)}
            </div>

            <div className="focus-room__bonus" style={{ color: titleColor }}>
                {pendingBonus > 0 ? `+${formatTime(pendingBonus)} Stacked Flow Bonus Active` : ' '}
            </div>

            {activeBenefitString && (
                <div className="focus-room__passive-tracker" style={{ color: titleColor }}>
                    {activeBenefitString}
                </div>
            )}

            <div className="focus-room__controls">
                {!isActive ? (
                    <>
                        <button className="focus-room__button focus-room__button--back" onClick={() => navigate('/town')}>Back to Town</button>
                        {!fullyMaxed && (
                            <button className="focus-room__button focus-room__button--start" onClick={handleStart} style={{ background: titleColor }}>
                                Start Focus
                            </button>
                        )}
                    </>
                ) : (
                    <button className="focus-room__button focus-room__button--stop" onClick={handleStop}>Stop & Save</button>
                )}
            </div>

            <div className="focus-room__progress-container">
                <div className="focus-room__progress-bar-wrap">
                    <div className="focus-room__progress-fill" style={{ width: `${progressPercent}%`, background: titleColor }} />
                </div>
                <div className="focus-room__progress-text">
                    <span>{progressPercent.toFixed(2)}% {tier === 'basic' ? 'Freed' : (tier === 'advanced' ? 'Awakened' : 'Ascended')}</span>
                    <span>{formatRemaining(remainingSeconds)}</span>
                </div>
            </div>
            
            {progressStage === 4 && !isActive && tier === 'basic' && (
                <div style={{ marginTop: '2rem', color: titleColor, fontWeight: 'bold' }}>
                    🎉 The Tortoise is free and has joined your Pet collection! 🎉
                </div>
            )}
            {progressStage === 4 && !isActive && tier === 'advanced' && (
                <div style={{ marginTop: '2rem', color: titleColor, fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                    🌌 The Evolved Tortoise Server is fully Awakened! 🌌
                </div>
            )}
            {progressStage === 4 && !isActive && tier === 'mythic' && (
                <div style={{ marginTop: '2rem', color: titleColor, fontWeight: 'bold', animation: 'cosmic-pulse 4s infinite alternate' }}>
                    ✨ The Cosmic Tortoise floats freely through the infinite void. ✨
                </div>
            )}
        </motion.div>
    );
};
