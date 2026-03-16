import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { SkillName } from '../../store/useGameStore';
import { useGameStore } from '../../store/useGameStore';
import './LevelUpModal.css';

// Skill icons map — unchanged
const SKILL_ICONS: Record<SkillName, string> = {
    'Sleep': '😴', 'Hygiene': '🚿', 'Flexibility': '🧘', 'Strength': '🏋️',
    'Cardio': '🏃', 'Work': '💼',
    'Health': '❤️', 'Social': '👥', 'Luck': '🎲', 'Habit': '🔥',
    'Intelligence': '🧠',
};

// Stat gains per skill — unchanged
const SKILL_STAT_GAINS: Record<SkillName, string[]> = {
    'Sleep':       ['Defend +1', 'HP Regen'],
    'Hygiene':     ['Defense +1'],
    'Flexibility': ['Defense +1', 'Speed'],
    'Strength':    ['Attack +1'],
    'Cardio':      ['Speed +1', 'Defense +1'],
    'Work':        ['Gold Earn +1'],
    'Health':      ['Max HP +5'],
    'Social':      ['Influence +1'],
    'Luck':        ['Crit Rate +1%'],
    'Habit':       ['Defense +1', 'Consistency'],
    'Intelligence':['Magic ATK +2', 'Max MP +10'],
};

interface LevelUpData {
    skill: SkillName;
    newLevel: number;
    milestone?: any;
}

interface Props {
    levelUpData: LevelUpData;
    onClose: () => void;
}

type Phase =
    | 'fade-to-black'      // 200ms fade
    | 'playing'            // video + stat overlay visible
    | 'fade-overlay-out'   // stat panel fades out
    | 'fade-to-game';      // return to game

export const LevelUpModal = ({ levelUpData, onClose }: Props) => {
    const [phase, setPhase] = useState<Phase>('fade-to-black');
    const [showStats, setShowStats] = useState(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const game = useGameStore();
    const atk  = game.getAttack();
    const def  = game.getDefense();
    const matk = game.getMagicAttack();
    const hp   = game.getMaxMP();
    const globalLv = game.getGlobalLevel();
    const statGains = SKILL_STAT_GAINS[levelUpData.skill] ?? [];
    const isMilestone = levelUpData.newLevel % 5 === 0;

    // Phase driver
    useEffect(() => {
        // Step 1 → fade black done after 200ms → start playing
        const t1 = setTimeout(() => {
            setPhase('playing');
        }, 250);

        return () => clearTimeout(t1);
    }, []);

    // Once phase=playing, show stat overlay after 700ms
    useEffect(() => {
        if (phase !== 'playing') return;
        const t = setTimeout(() => setShowStats(true), 700);
        return () => clearTimeout(t);
    }, [phase]);

    const handleVideoEnd = () => {
        setShowStats(false);
        setTimeout(() => {
            setPhase('fade-to-game');
            setTimeout(onClose, 400);
        }, 300);
    };

    const handleVideoError = () => {
        setVideoFailed(true);
        // Fallback: stay on stat panel, auto-close after 3.5s
        setShowStats(true);
        const t = setTimeout(() => {
            setShowStats(false);
            setTimeout(onClose, 400);
        }, 3500);
        return () => clearTimeout(t);
    };

    // Also auto-dismiss if video never fires 'ended' (mobile hang safety)
    useEffect(() => {
        if (phase !== 'playing') return;
        const safetyTimer = setTimeout(() => handleVideoEnd(), 12000);
        return () => clearTimeout(safetyTimer);
    }, [phase]);

    const blackOpacity =
        phase === 'fade-to-black' ? 1 :
        phase === 'playing'       ? 0 :
        phase === 'fade-overlay-out' ? 0 :
        1; // fade-to-game is fading back to black briefly before onClose

    const screenOpacity =
        phase === 'fade-to-game' ? 0 : 1;

    return (
        <motion.div
            className="lup-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: screenOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Dark overlay (fullscreen black during fade-to-black) */}
            <motion.div
                className="lup-black"
                initial={{ opacity: 0 }}
                animate={{ opacity: blackOpacity }}
                transition={{ duration: 0.25 }}
            />

            {/* Video layer */}
            {phase !== 'fade-to-black' && !videoFailed && (
                <video
                    ref={videoRef}
                    className="lup-video"
                    src="/levelup.mp4"
                    autoPlay
                    playsInline
                    muted={false}
                    onEnded={handleVideoEnd}
                    onError={handleVideoError}
                />
            )}

            {/* Fallback glow (if video fails or during stat-only mode) */}
            {(videoFailed) && (
                <div className="lup-fallback-glow" />
            )}

            {/* Stat Overlay — top-right corner */}
            <AnimatePresence>
                {showStats && (
                    <motion.div
                        className="lup-stat-panel"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="lup-stat-title">
                            <Sparkles size={16} />
                            LEVEL UP!
                        </div>

                        <div className="lup-skill-row">
                            <span className="lup-skill-icon">{SKILL_ICONS[levelUpData.skill]}</span>
                            <span className="lup-skill-name">{levelUpData.skill}</span>
                            <span className="lup-skill-level">Lv.{levelUpData.newLevel}</span>
                        </div>

                        <div className="lup-gains">
                            {statGains.map((g, i) => (
                                <div key={i} className="lup-gain-row">
                                    <span className="lup-plus">+</span>
                                    <span>{g}</span>
                                </div>
                            ))}
                        </div>

                        <div className="lup-totals">
                            <div className="lup-total-row"><span>⚔️ ATK</span><span>{atk}</span></div>
                            <div className="lup-total-row"><span>🛡️ DEF</span><span>{def}</span></div>
                            <div className="lup-total-row"><span>✨ MATK</span><span>{matk}</span></div>
                            <div className="lup-total-row"><span>🌊 MP</span><span>{hp}</span></div>
                            <div className="lup-total-row"><span>🌟 Lv</span><span>{globalLv}</span></div>
                        </div>

                        {isMilestone && (
                            <div className="lup-milestone">
                                🎉 Milestone!
                                <div className="lup-milestone-rewards">+1 Ticket · +50 Gold</div>
                            </div>
                        )}

                        <div className="lup-tap-hint" onClick={onClose}>Tap to skip</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
