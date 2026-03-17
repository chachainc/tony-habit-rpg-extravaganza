import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react';
import { useMonopolyStore, BOARD, BOARD_ODDS, type BoardSpace, type MysteryRollResult } from '../../store/useMonopolyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './MonopolyBoard.css';

// ── Path layout (unchanged) ─────────────────────────────────────
const PATH_LAYOUT = [
    { row: 10, col: 10 }, { row: 10, col: 9 }, { row: 10, col: 8 }, { row: 10, col: 7 }, { row: 10, col: 6 },
    { row: 10, col: 5 }, { row: 10, col: 4 }, { row: 10, col: 3 }, { row: 10, col: 2 }, { row: 10, col: 1 }, { row: 10, col: 0 },
    { row: 9, col: 0 }, { row: 8, col: 0 }, { row: 7, col: 0 }, { row: 6, col: 0 }, { row: 5, col: 0 },
    { row: 4, col: 0 }, { row: 3, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 0 },
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
    { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }, { row: 0, col: 8 }, { row: 0, col: 9 }, { row: 0, col: 10 },
    { row: 1, col: 10 }, { row: 2, col: 10 }, { row: 3, col: 10 }, { row: 4, col: 10 }, { row: 5, col: 10 },
    { row: 6, col: 10 }, { row: 7, col: 10 }, { row: 8, col: 10 }, { row: 9, col: 10 },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// Flow phases
type Phase = 'idle' | 'dice-spin' | 'dice-reveal' | 'moving' | 'result' | 'mystery-spin' | 'mystery-result';

// Build live odds rows from BOARD_ODDS
const ODDS_ROWS = [
    {
        label: 'Ultra Rare',
        pct: `${(BOARD_ODDS.ultra_rare * 100).toFixed(4)}%`,
        color: '#38bdf8',
        items: 'Ethereal Cow 🌌',
    },
    {
        label: 'Epic',
        pct: `${(BOARD_ODDS.epic * 100).toFixed(1)}%`,
        color: '#c084fc',
        items: 'Goat / Duck Pets • Straw Hat • "The Farmer" Title',
    },
    {
        label: 'Rare',
        pct: `${(BOARD_ODDS.rare * 100).toFixed(1)}%`,
        color: '#60a5fa',
        items: 'Cow / Sheep / Pig / Chicken Pets',
    },
    {
        label: 'Uncommon',
        pct: `${(BOARD_ODDS.uncommon * 100).toFixed(0)}%`,
        color: '#a3e635',
        items: '2–3 Sigils • 2–3 Schmeckles • 10–15 Gold',
    },
    {
        label: 'Common',
        pct: `${(BOARD_ODDS.common * 100).toFixed(2)}%`,
        color: '#94a3b8',
        items: '1–9 Gold • 1 Schmeckle • 1 Sigil',
    },
];

// Also show base tile rewards
const BASE_REWARDS = [
    { icon: '🏠', label: 'GO tile', note: '+25 Gold each lap' },
    { icon: '🪙', label: 'Small Coin (every 6th space)', note: '+3–7 Gold' },
    { icon: '🐌', label: 'Small Shmeckle (every 11th space)', note: '+1–5 Schmeckles' },
    { icon: '🎁', label: 'Mystery Crop (spaces 5/15/25/35)', note: 'Opens drop table above' },
    { icon: '🎫', label: 'Lost Ticket (space 20)', note: '+1 Roll' },
];

export const MonopolyBoard = ({ onClose }: { onClose: () => void }) => {
    const {
        dailyTickets, currentPosition, rollDice, movePlayer,
        canRoll, rollMysteryBox, streakMultiplierActive, totalLifetimeRolls
    } = useMonopolyStore();
    const { addGold, addShmeckles, addTickets } = useCurrencyStore();
    const addSigils = (n: number) => {
        try { require('../../store/useConquestStore').useConquestStore.getState().addSigils(n); } catch {}
    };

    // ── Phase state machine ─────────────────────────────────────
    const [phase, setPhase] = useState<Phase>('idle');
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [spinFace, setSpinFace] = useState<string>('🎲');
    const [landedSpace, setLandedSpace] = useState<BoardSpace | null>(null);
    const [mysteryEvent, setMysteryEvent] = useState<MysteryRollResult | null>(null);

    // Mystery box rng
    const JACKPOT_TARGET = 4;
    const JACKPOT_ODDS = 100;
    const [displayedRng, setDisplayedRng] = useState<number>(0);
    // finalRng tracks when mystery spin is done (used via setter in roll handler)
    const [_finalRng, setFinalRng] = useState<number | null>(null);
    const rngIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [animatingTo, setAnimatingTo] = useState<number | null>(null);
    const [showRewardsInfo, setShowRewardsInfo] = useState(false);

    // Prevent duplicate roll calls
    const rollingRef = useRef(false);

    const handleRoll = () => {
        if (!canRoll() || phase !== 'idle' || rollingRef.current) return;
        rollingRef.current = true;

        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);

        // Phase 1: dice spin animation
        setPhase('dice-spin');

        const roll = streakMultiplierActive ? (rollDice() + rollDice()) : rollDice();

        // Animate dice faces while we wait
        let frame = 0;
        const spinInterval = setInterval(() => {
            frame++;
            setSpinFace(DICE_FACES[Math.floor(Math.random() * 6)]);
        }, 80);

        // After 900ms show the actual result face
        setTimeout(() => {
            clearInterval(spinInterval);
            setDiceResult(roll);
            setSpinFace(DICE_FACES[Math.min(roll - 1, 5)]);
            setPhase('dice-reveal');

            // After 800ms more, start token movement
            setTimeout(() => {
                const newPosition = (currentPosition + roll) % 40;
                setAnimatingTo(newPosition);
                setPhase('moving');

                // Token movement duration
                setTimeout(() => {
                    const space = movePlayer(roll);
                    setLandedSpace(space);
                    setAnimatingTo(null);

                    // Base tile rewards
                    if (space.baseReward.gold) addGold(space.baseReward.gold);
                    if (space.baseReward.shmeckles) addShmeckles(space.baseReward.shmeckles);
                    if (space.baseReward.tickets) addTickets(space.baseReward.tickets);
                    if ((space.baseReward as any).sigils) addSigils((space.baseReward as any).sigils);

                    if (space.type === 'mystery') {
                        const mystery = rollMysteryBox();
                        setMysteryEvent(mystery);
                        setPhase('mystery-spin');

                        let animFrame = 0;
                        const maxFrames = 30;
                        const actualRng = mystery.rarity === 'ultra_rare' ? JACKPOT_TARGET : Math.floor(Math.random() * JACKPOT_ODDS) + 1;

                        rngIntervalRef.current = setInterval(() => {
                            animFrame++;
                            setDisplayedRng(Math.floor(Math.random() * JACKPOT_ODDS) + 1);

                            if (animFrame >= maxFrames) {
                                if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
                                setDisplayedRng(actualRng);
                                setFinalRng(actualRng);

                                if (mystery.reward.gold) addGold(mystery.reward.gold);
                                if (mystery.reward.shmeckles) addShmeckles(mystery.reward.shmeckles);
                                if ((mystery.reward as any).sigils) addSigils((mystery.reward as any).sigils);

                                setPhase('mystery-result');
                                rollingRef.current = false;
                            }
                        }, 50);
                    } else {
                        setPhase('result');
                        rollingRef.current = false;
                    }
                }, 1200);
            }, 800);
        }, 900);
    };

    const handleCloseResult = () => {
        setPhase('idle');
        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setDiceResult(null);
    };

    const handleRollAgain = () => {
        setPhase('idle');
        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setDiceResult(null);
        // Small tick to let state settle, then roll
        setTimeout(() => handleRoll(), 50);
    };

    useEffect(() => {
        return () => {
            if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
        };
    }, []);

    const playerPosition = animatingTo !== null ? animatingTo : currentPosition;

    const hasReward = landedSpace && (
        landedSpace.baseReward.gold ||
        landedSpace.baseReward.shmeckles ||
        landedSpace.baseReward.tickets ||
        (landedSpace.baseReward as any).sigils
    );

    return (
        <div className="modal-overlay walkable-board-overlay">
            <motion.div
                className="walkable-board-modal farm-theme-board"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                {/* Header */}
                <div className="walkable-board-header">
                    <div className="header-left">
                        <span className="header-icon">🎲</span>
                        <h2>The Daily Harvest</h2>
                    </div>
                    <div className="header-center">
                        <div className="ticket-display">
                            <span className="ticket-icon">🎫</span>
                            <span className="ticket-count">{dailyTickets}</span>
                            <span className="ticket-label">ROLLS</span>
                        </div>
                        <div className="ticket-display lifetime-rolls" title="Total Lifetime Rolls">
                            <span className="ticket-icon">📜</span>
                            <span className="ticket-count small">{totalLifetimeRolls || 0}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Board */}
                <div className="walkable-board-container farm-backdrop">
                    <div className="walkable-path-grid farm-grid">
                        {BOARD.map((space, index) => {
                            const layout = PATH_LAYOUT[index];
                            const isCurrentSpace = index === playerPosition;
                            const terrainIcons = ['🌿', '🪨', '🌾', '·', '🍃', '·', '🌱', '·', '·', '🌻'];
                            const emptyIcon = space.type === 'empty' ? terrainIcons[index % terrainIcons.length] : space.icon;

                            return (
                                <motion.div
                                    key={space.id}
                                    className={`path-tile ${space.type} ${isCurrentSpace ? 'current' : ''}`}
                                    style={{ gridRow: layout.row + 1, gridColumn: layout.col + 1 }}
                                    animate={isCurrentSpace ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <div className="tile-icon">{emptyIcon}</div>
                                    <div className="tile-label">{space.name}</div>
                                    {isCurrentSpace && (
                                        <motion.div
                                            className="player-token"
                                            layoutId="player"
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            🧙
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* ── Centered Dice Roll Overlay (on the board) ── */}
                    <AnimatePresence>
                        {(phase === 'dice-spin' || phase === 'dice-reveal') && (
                            <motion.div
                                className="dice-center-overlay"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <motion.div
                                    className={`dice-center-face ${phase === 'dice-spin' ? 'spinning' : 'revealed'}`}
                                    animate={phase === 'dice-spin'
                                        ? { rotate: [0, 15, -15, 0], scale: [1, 1.1, 0.95, 1] }
                                        : { scale: [1, 1.25, 1], rotate: 0 }
                                    }
                                    transition={phase === 'dice-spin'
                                        ? { repeat: Infinity, duration: 0.3 }
                                        : { duration: 0.4, ease: 'backOut' }
                                    }
                                >
                                    {spinFace}
                                </motion.div>
                                {phase === 'dice-reveal' && diceResult !== null && (
                                    <motion.div
                                        className="dice-number-reveal"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {diceResult}
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Mystery box RNG spinner (on the board) */}
                    <AnimatePresence>
                        {phase === 'mystery-spin' && (
                            <motion.div
                                className="dice-center-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="rng-display">
                                    <div className="rng-header">
                                        <span className="rng-label">🎁 Opening Mystery Crop...</span>
                                    </div>
                                    <motion.div className="rng-number spinning">
                                        {displayedRng.toLocaleString()}
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls row */}
                <div className="walkable-controls">
                    {phase === 'idle' && canRoll() && (
                        <motion.button
                            className="roll-btn"
                            onClick={handleRoll}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🎲 {streakMultiplierActive ? 'Double Roll!' : 'Roll Dice'}
                        </motion.button>
                    )}

                    {phase === 'idle' && !canRoll() && (
                        <div className="no-tickets">
                            <p>No rolls remaining!</p>
                            <p className="comeback">Come back tomorrow for 5 more rolls</p>
                        </div>
                    )}

                    {(phase === 'dice-spin' || phase === 'dice-reveal' || phase === 'moving') && (
                        <div className="rolling-status-pill">
                            {phase === 'moving' ? '🏃 Moving...' : '🎲 Rolling...'}
                        </div>
                    )}

                    <button className="rewards-info-toggle" onClick={() => setShowRewardsInfo(v => !v)}>
                        <Info size={14} />
                        <span>Drop Odds</span>
                        {showRewardsInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {/* Drop Odds panel */}
                <AnimatePresence>
                    {showRewardsInfo && (
                        <motion.div
                            className="rewards-info-dropdown"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="odds-section-title">🌾 Mystery Crop Drop Table</div>
                            {ODDS_ROWS.map(row => (
                                <div className="odds-row" key={row.label}>
                                    <span className="odds-rarity" style={{ color: row.color }}>{row.label}</span>
                                    <span className="odds-pct" style={{ color: row.color }}>{row.pct}</span>
                                    <span className="odds-items">{row.items}</span>
                                </div>
                            ))}
                            <div className="odds-divider" />
                            <div className="odds-section-title">🗺️ Board Tile Rewards</div>
                            {BASE_REWARDS.map(r => (
                                <div className="odds-row" key={r.label}>
                                    <span className="odds-tile-icon">{r.icon}</span>
                                    <span className="odds-tile-label">{r.label}</span>
                                    <span className="odds-items">{r.note}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Mystery Result Modal ── */}
                <AnimatePresence>
                    {phase === 'mystery-result' && mysteryEvent && (
                        <div className="board-reward-overlay">
                            <motion.div
                                className={`luck-event-popup modal-reward-card ${mysteryEvent.rarity}`}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                            >
                                <div className="luck-rays" />
                                <motion.div
                                    className="luck-icon"
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    {mysteryEvent.rarity === 'ultra_rare' ? '🌌' :
                                        mysteryEvent.rarity === 'epic' ? '✨' : '🎁'}
                                </motion.div>
                                <div className="reward-roll-badge">Rolled: {diceResult}</div>
                                <h2>
                                    {mysteryEvent.rarity === 'ultra_rare' ? 'UNIVERSE DROP!' :
                                        mysteryEvent.rarity === 'epic' ? 'EPIC DROP!' :
                                            mysteryEvent.rarity === 'rare' ? 'RARE DROP!' : 'MYSTERY RESULT'}
                                </h2>
                                <p className="luck-message">{mysteryEvent.message}</p>
                                <div className="luck-rewards">
                                    <div className="luck-xp">
                                        {mysteryEvent.reward.gold && <span>+{mysteryEvent.reward.gold} 🪙 Gold</span>}
                                        {mysteryEvent.reward.shmeckles && <span>+{mysteryEvent.reward.shmeckles} 🐌 Schmeckles</span>}
                                        {(mysteryEvent.reward as any).sigils && <span>+{(mysteryEvent.reward as any).sigils} 🔱 Sigils</span>}
                                    </div>
                                    {(mysteryEvent.reward.petId || mysteryEvent.reward.cosmeticId || mysteryEvent.reward.titleId) && (
                                        <div className="pet-unlock">
                                            <div className="pet-preview">{mysteryEvent.isDuplicate ? '🪙' : '🆕'}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="reward-action-row">
                                    {canRoll() && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    <button className="luck-continue-btn" onClick={handleCloseResult}>
                                        {canRoll() ? 'Continue' : 'Awesome!'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── Base Tile Result Modal ── */}
                <AnimatePresence>
                    {phase === 'result' && landedSpace && (
                        <div className="board-reward-overlay">
                            <motion.div
                                className="reward-card-premium"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <div className="reward-card-header">
                                    <div className="reward-dice-badge">
                                        <span className="reward-dice-face">{DICE_FACES[Math.min((diceResult ?? 1) - 1, 5)]}</span>
                                        <span className="reward-dice-num">{diceResult}</span>
                                    </div>
                                    <div>
                                        <div className="reward-card-tile-label">Landed on</div>
                                        <div className="reward-card-tile-name">{landedSpace.icon} {landedSpace.name}</div>
                                    </div>
                                </div>

                                <div className="reward-card-body">
                                    {hasReward ? (
                                        <>
                                            {landedSpace.baseReward.gold && (
                                                <div className="reward-line gold">
                                                    <span>🪙 Gold</span>
                                                    <span className="reward-val">+{landedSpace.baseReward.gold}</span>
                                                </div>
                                            )}
                                            {landedSpace.baseReward.shmeckles && (
                                                <div className="reward-line shmeckles">
                                                    <span>🐌 Schmeckles</span>
                                                    <span className="reward-val">+{landedSpace.baseReward.shmeckles}</span>
                                                </div>
                                            )}
                                            {landedSpace.baseReward.tickets && (
                                                <div className="reward-line tickets">
                                                    <span>🎫 Rolls</span>
                                                    <span className="reward-val">+{landedSpace.baseReward.tickets}</span>
                                                </div>
                                            )}
                                            {(landedSpace.baseReward as any).sigils && (
                                                <div className="reward-line sigils">
                                                    <span>🔱 Sigils</span>
                                                    <span className="reward-val">+{(landedSpace.baseReward as any).sigils}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="reward-empty">
                                            <span className="reward-empty-icon">🌾</span>
                                            <span className="reward-empty-text">Nothing here…</span>
                                            <span className="reward-empty-sub">Keep moving, something better awaits!</span>
                                        </div>
                                    )}
                                </div>

                                <div className="reward-action-row">
                                    {canRoll() && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    <button className="continue-btn" onClick={handleCloseResult}>
                                        {canRoll() ? 'Continue' : 'Done'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
