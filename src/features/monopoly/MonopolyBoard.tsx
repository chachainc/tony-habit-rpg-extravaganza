import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, X, RefreshCw, Play, Square } from 'lucide-react';
import { useMonopolyStore, getBoard, BOARD_ODDS, OWNERSHIP_TIERS, type BoardSpace, type MysteryRollResult, type MoveResult } from '../../store/useMonopolyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useHeroImage } from '../../hooks/useHeroImage';
import './MonopolyBoard.css';

// ── 24-space path on a 7×7 grid (perimeter, clockwise from top-left) ──
// Top-left = GO (0,0). Path goes: top row L→R, right col T→B, bottom row R→L, left col B→T
const PATH_LAYOUT = [
    // Top row (0,0) → (0,6) = 7 tiles
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
    { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 },
    // Right column (1,6) → (5,6) = 5 tiles
    { row: 1, col: 6 }, { row: 2, col: 6 }, { row: 3, col: 6 }, { row: 4, col: 6 }, { row: 5, col: 6 },
    // Bottom row (6,6) → (6,0) = 7 tiles
    { row: 6, col: 6 }, { row: 6, col: 5 }, { row: 6, col: 4 }, { row: 6, col: 3 },
    { row: 6, col: 2 }, { row: 6, col: 1 }, { row: 6, col: 0 },
    // Left column (5,0) → (1,0) = 5 tiles
    { row: 5, col: 0 }, { row: 4, col: 0 }, { row: 3, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 0 },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// Flow phases
type Phase = 'idle' | 'dice-spin' | 'dice-reveal' | 'moving' | 'result' | 'go-result' | 'mystery-spin' | 'mystery-result' | 'hazard-result' | 'storm-skip';

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
    { icon: '🏠', label: 'GO tile', note: '+25 Gold (scales +1 per lap)' },
    { icon: '🪙', label: 'Gold tiles', note: '+3–7 Gold' },
    { icon: '🐌', label: 'Shmeckle tiles', note: '+1–5 Schmeckles' },
    { icon: '🎁', label: 'Mystery Crop tiles', note: 'Opens drop table above' },
    { icon: '🎫', label: 'Lost Ticket', note: '+1 Roll' },
    { icon: '💰', label: 'Tax Collector', note: 'Lose 5–15 Gold' },
    { icon: '⛈️', label: 'Storm', note: 'Skip next turn' },
    { icon: '🗡️', label: 'Thief', note: 'Lose 1–3 Shmeckles' },
];

export const MonopolyBoard = ({ onClose }: { onClose: () => void }) => {
    const {
        dailyTickets, currentPosition, rollDice, movePlayer,
        canRoll, rollMysteryBox, streakMultiplierActive,
        lapCount, boardRefreshPending, regenerateBoard, getGoReward,
        ownedTiles, skipNextTurn, buyTile, upgradeTile,
        canBuyTile, canUpgradeTile, getBuyCost, getUpgradeCost, getTileMultiplier,
    } = useMonopolyStore();
    const { addGold, addShmeckles, addTickets, gold, shmeckles, spendGold, spendShmeckles } = useCurrencyStore();
    const heroImage = useHeroImage();

    const addSigils = (n: number) => {
        try { require('../../store/useConquestStore').useConquestStore.getState().addSigils(n); } catch {}
    };

    // Derive player token from characterArchetype image
    const playerToken = heroImage
        ? <img src={heroImage} alt="Player" style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid #6366f1' }} />
        : <span>🧙</span>;

    // ── Phase state machine ─────────────────────────────────────
    const [phase, setPhase] = useState<Phase>('idle');
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [spinFace, setSpinFace] = useState<string>('🎲');
    const [landedSpace, setLandedSpace] = useState<BoardSpace | null>(null);
    const [mysteryEvent, setMysteryEvent] = useState<MysteryRollResult | null>(null);
    const [goRewardAmount, setGoRewardAmount] = useState(0);
    const [moveResultData, setMoveResultData] = useState<MoveResult | null>(null);

    // Board refresh animation key
    const [boardKey, setBoardKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-roll
    const [autoRollActive, setAutoRollActive] = useState(false);
    const autoRollRef = useRef(false);

    // Mystery box rng
    const JACKPOT_TARGET = 4;
    const JACKPOT_ODDS = 100;
    const [displayedRng, setDisplayedRng] = useState<number>(0);
    const [_finalRng, setFinalRng] = useState<number | null>(null);
    const rngIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [animatingTo, setAnimatingTo] = useState<number | null>(null);
    const [showRewardsInfo, setShowRewardsInfo] = useState(false);

    // Prevent duplicate roll calls
    const rollingRef = useRef(false);

    // Get current board (dynamic)
    const board = getBoard();

    const handleBoardRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            regenerateBoard();
            setBoardKey(k => k + 1);
            setTimeout(() => setIsRefreshing(false), 500);
        }, 300);
    }, [regenerateBoard]);

    const handleRoll = () => {
        if (!canRoll() || phase !== 'idle' || rollingRef.current) return;

        // Handle storm skip
        if (skipNextTurn) {
            setPhase('storm-skip');
            useMonopolyStore.setState({ skipNextTurn: false });
            setTimeout(() => {
                setPhase('idle');
            }, 2000);
            return;
        }

        rollingRef.current = true;

        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setGoRewardAmount(0);
        setMoveResultData(null);

        // Phase 1: dice spin animation
        setPhase('dice-spin');

        const roll = streakMultiplierActive ? (rollDice() + rollDice()) : rollDice();

        // Animate dice faces while we wait
        const spinInterval = setInterval(() => {
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
                setPhase('moving');

                // Token movement duration
                setTimeout(() => {
                    const moveResult = movePlayer(roll);
                    setLandedSpace(moveResult.landedSpace);
                    setMoveResultData(moveResult);
                    setAnimatingTo(null);

                    // Collect rent from owned tiles
                    if (moveResult.rentCollected > 0) {
                        addGold(moveResult.rentCollected, { exact: true });
                    }

                    if (moveResult.passedGo) {
                        // GO was passed — award GO gold, show GO result
                        setGoRewardAmount(moveResult.goReward);
                        addGold(moveResult.goReward, { exact: true });
                        setPhase('go-result');
                        rollingRef.current = false;
                    } else if (moveResult.hazardResult) {
                        // Hazard tile — apply penalty
                        const hr = moveResult.hazardResult;
                        if (hr.type === 'tax' && hr.penalty > 0) {
                            spendGold(hr.penalty);
                        } else if (hr.type === 'thief' && hr.penalty > 0) {
                            spendShmeckles(hr.penalty);
                        }
                        setPhase('hazard-result');
                        rollingRef.current = false;
                    } else {
                        // Normal tile landing
                        const space = moveResult.landedSpace;
                        const multiplier = getTileMultiplier(space.id);

                        if (space.baseReward.gold) addGold(Math.floor(space.baseReward.gold * multiplier));
                        if (space.baseReward.shmeckles) addShmeckles(Math.floor(space.baseReward.shmeckles * multiplier));
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
                    }
                }, 1200);
            }, 800);
        }, 900);
    };

    const handleCloseResult = useCallback(() => {
        const needsRefresh = boardRefreshPending;
        setPhase('idle');
        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setDiceResult(null);
        setGoRewardAmount(0);
        setMoveResultData(null);

        // If board refresh is pending (after GO pass), trigger it now
        if (needsRefresh) {
            handleBoardRefresh();
        }
    }, [boardRefreshPending, handleBoardRefresh]);

    const handleRollAgain = useCallback(() => {
        const needsRefresh = boardRefreshPending;
        setPhase('idle');
        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setDiceResult(null);
        setGoRewardAmount(0);
        setMoveResultData(null);

        if (needsRefresh) {
            handleBoardRefresh();
            // Wait for refresh to complete before rolling
            setTimeout(() => handleRoll(), 900);
        } else {
            setTimeout(() => handleRoll(), 50);
        }
    }, [boardRefreshPending, handleBoardRefresh]);

    // Auto-roll: when active, auto-dismiss result and roll again
    useEffect(() => {
        autoRollRef.current = autoRollActive;
    }, [autoRollActive]);

    useEffect(() => {
        if (!autoRollActive) return;
        if (phase === 'result' || phase === 'hazard-result') {
            const t = setTimeout(() => {
                if (!autoRollRef.current) return;
                if (canRoll()) {
                    handleRollAgain();
                } else {
                    setAutoRollActive(false);
                    handleCloseResult();
                }
            }, 1200);
            return () => clearTimeout(t);
        }
        if (phase === 'go-result') {
            const t = setTimeout(() => {
                if (!autoRollRef.current) return;
                if (canRoll()) {
                    handleRollAgain();
                } else {
                    setAutoRollActive(false);
                    handleCloseResult();
                }
            }, 2000);
            return () => clearTimeout(t);
        }
        if (phase === 'mystery-result') {
            const t = setTimeout(() => {
                if (!autoRollRef.current) return;
                if (canRoll()) {
                    handleRollAgain();
                } else {
                    setAutoRollActive(false);
                    handleCloseResult();
                }
            }, 2000);
            return () => clearTimeout(t);
        }
        if (phase === 'idle') {
            if (canRoll()) {
                const t = setTimeout(() => {
                    if (autoRollRef.current) handleRoll();
                }, 300);
                return () => clearTimeout(t);
            } else {
                setAutoRollActive(false);
            }
        }
    }, [autoRollActive, phase]);

    const playerPosition = animatingTo !== null ? animatingTo : currentPosition;

    const hasReward = landedSpace && (
        landedSpace.baseReward.gold ||
        landedSpace.baseReward.shmeckles ||
        landedSpace.baseReward.tickets ||
        (landedSpace.baseReward as any).sigils
    );

    const terrainIcons = ['🌿', '🪨', '🌾', '·', '🍃', '·', '🌱', '·', '·', '🌻'];

    // Get ownership visual info for a tile
    const getOwnershipInfo = (tileId: number) => {
        const owned = ownedTiles[tileId];
        if (!owned) return null;
        return OWNERSHIP_TIERS.find(t => t.level === owned.level);
    };

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
                        <div className="ticket-display lap-display" title="Completed Laps">
                            <span className="ticket-icon">🔄</span>
                            <span className="ticket-count small">{lapCount}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Board */}
                <div className="walkable-board-container farm-backdrop">
                    <motion.div
                        key={boardKey}
                        className={`walkable-path-grid farm-grid ${isRefreshing ? 'board-refreshing' : ''}`}
                        initial={boardKey > 0 ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {board.map((space, index) => {
                            const layout = PATH_LAYOUT[index];
                            if (!layout) return null;
                            const isCurrentSpace = index === playerPosition;
                            const isGoTile = space.type === 'go';
                            const isHazard = space.type === 'tax' || space.type === 'storm' || space.type === 'thief';
                            const ownerInfo = getOwnershipInfo(index);
                            const emptyIcon = space.type === 'empty' ? terrainIcons[index % terrainIcons.length] : space.icon;

                            const ownerClass = ownerInfo ? `owned-${ownerInfo.level}` : '';
                            const hazardClass = isHazard ? 'hazard' : '';

                            return (
                                <motion.div
                                    key={space.id}
                                    className={`path-tile ${space.type} ${isCurrentSpace ? 'current' : ''} ${isGoTile ? 'go-tile' : ''} ${ownerClass} ${hazardClass}`}
                                    style={{ gridRow: layout.row + 1, gridColumn: layout.col + 1 }}
                                    animate={isCurrentSpace ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <div className="tile-icon">
                                        {ownerInfo ? ownerInfo.icon : (isGoTile ? '🏠' : emptyIcon)}
                                    </div>
                                    <div className="tile-label">
                                        {ownerInfo ? ownerInfo.name : (isGoTile ? 'GO' : space.name)}
                                    </div>
                                    {isGoTile && (
                                        <div className="go-reward-label">+{getGoReward()}g</div>
                                    )}
                                    {isCurrentSpace && (
                                        <motion.div
                                            className="player-token"
                                            layoutId="player"
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            {playerToken}
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>

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

                    {/* Storm skip overlay */}
                    <AnimatePresence>
                        {phase === 'storm-skip' && (
                            <motion.div
                                className="dice-center-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="storm-skip-banner">
                                    <span className="storm-skip-icon">⛈️</span>
                                    <h3>Storm! Turn Skipped</h3>
                                    <p>The storm passes... you can roll next turn.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls row */}
                <div className="walkable-controls">
                    {phase === 'idle' && canRoll() && !autoRollActive && (
                        <motion.button
                            className="roll-btn"
                            onClick={handleRoll}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🎲 {streakMultiplierActive ? 'Double Roll!' : 'Roll Dice'}
                        </motion.button>
                    )}

                    {/* Skip turn indicator */}
                    {phase === 'idle' && skipNextTurn && (
                        <div className="storm-pending-pill">⛈️ Storm — next roll is skipped</div>
                    )}

                    {/* Auto Roll toggle */}
                    {canRoll() && (
                        <motion.button
                            className={`roll-btn${autoRollActive ? ' auto-roll-active' : ''}`}
                            style={{
                                background: autoRollActive
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                marginLeft: autoRollActive ? 0 : '0.5rem',
                            }}
                            onClick={() => {
                                if (autoRollActive) {
                                    setAutoRollActive(false);
                                } else {
                                    setAutoRollActive(true);
                                    if (phase === 'idle') setTimeout(() => handleRoll(), 100);
                                }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {autoRollActive
                                ? <><Square size={14} /> Stop Auto</>  
                                : <><Play size={14} /> Auto Roll</>}
                        </motion.button>
                    )}

                    {phase === 'idle' && !canRoll() && !skipNextTurn && (
                        <div className="no-tickets">
                            <p>No rolls remaining!</p>
                            <p className="comeback">Earn more tickets by completing training sessions</p>
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

                {/* ── GO Result Modal ── */}
                <AnimatePresence>
                    {phase === 'go-result' && (
                        <div className="board-reward-overlay">
                            <motion.div
                                className="reward-card-premium go-reward-card"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <div className="go-reward-header">
                                    <motion.div
                                        className="go-reward-icon"
                                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    >
                                        🏠
                                    </motion.div>
                                    <h2>PASSED GO!</h2>
                                    <div className="go-lap-badge">Lap {lapCount}</div>
                                </div>
                                <div className="reward-card-body">
                                    <div className="reward-line gold">
                                        <span>🪙 Gold</span>
                                        <span className="reward-val">+{goRewardAmount}</span>
                                    </div>
                                    {moveResultData && moveResultData.rentCollected > 0 && (
                                        <div className="reward-line gold" style={{ color: '#a3e635' }}>
                                            <span>🏡 Rent Collected</span>
                                            <span className="reward-val">+{moveResultData.rentCollected}</span>
                                        </div>
                                    )}
                                    <div className="go-refresh-notice">
                                        <RefreshCw size={14} />
                                        <span>Board will refresh with new tiles!</span>
                                    </div>
                                </div>
                                <div className="reward-action-row">
                                    {canRoll() && !autoRollActive && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    {autoRollActive && (
                                        <div className="rolling-status-pill">⚡ Auto Rolling...</div>
                                    )}
                                    <button className="luck-continue-btn" onClick={handleCloseResult}>
                                        {canRoll() ? 'Continue' : 'Done'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── Hazard Result Modal ── */}
                <AnimatePresence>
                    {phase === 'hazard-result' && moveResultData?.hazardResult && (
                        <div className="board-reward-overlay">
                            <motion.div
                                className="reward-card-premium hazard-reward-card"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <div className="hazard-header">
                                    <motion.div
                                        className="hazard-icon"
                                        animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        {landedSpace?.icon}
                                    </motion.div>
                                    <h2 style={{ color: '#ef4444' }}>{landedSpace?.name}!</h2>
                                </div>
                                <div className="reward-card-body">
                                    <p className="hazard-message">{moveResultData.hazardResult.message}</p>
                                    {moveResultData.hazardResult.penalty > 0 && (
                                        <div className="reward-line" style={{ color: '#ef4444' }}>
                                            <span>{moveResultData.hazardResult.type === 'thief' ? '🐌' : '🪙'} Lost</span>
                                            <span className="reward-val">-{moveResultData.hazardResult.penalty}</span>
                                        </div>
                                    )}
                                    {moveResultData.rentCollected > 0 && (
                                        <div className="reward-line gold" style={{ color: '#a3e635' }}>
                                            <span>🏡 Rent Collected</span>
                                            <span className="reward-val">+{moveResultData.rentCollected}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="reward-action-row">
                                    {canRoll() && !autoRollActive && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    {autoRollActive && (
                                        <div className="rolling-status-pill">⚡ Auto Rolling...</div>
                                    )}
                                    <button className="luck-continue-btn" onClick={handleCloseResult}>
                                        {canRoll() ? 'Continue' : 'Done'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
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
                                    {canRoll() && !autoRollActive && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    {autoRollActive && (
                                        <div className="rolling-status-pill">⚡ Auto Rolling...</div>
                                    )}
                                    <button className="luck-continue-btn" onClick={handleCloseResult}>
                                        {canRoll() ? 'Continue' : 'Awesome!'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── Base Tile Result Modal (with Buy/Upgrade buttons) ── */}
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
                                                    <span className="reward-val">+{Math.floor(landedSpace.baseReward.gold * getTileMultiplier(landedSpace.id))}</span>
                                                </div>
                                            )}
                                            {landedSpace.baseReward.shmeckles && (
                                                <div className="reward-line shmeckles">
                                                    <span>🐌 Schmeckles</span>
                                                    <span className="reward-val">+{Math.floor(landedSpace.baseReward.shmeckles * getTileMultiplier(landedSpace.id))}</span>
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
                                            {ownedTiles[landedSpace.id] && (
                                                <div className="reward-line" style={{ color: '#a3e635', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                                    <span>🏡 Owned (×{getTileMultiplier(landedSpace.id)} payout)</span>
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

                                    {/* Rent collected from passing over owned tiles */}
                                    {moveResultData && moveResultData.rentCollected > 0 && (
                                        <div className="reward-line gold" style={{ color: '#a3e635', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.4rem', marginTop: '0.3rem' }}>
                                            <span>🏡 Rent Collected</span>
                                            <span className="reward-val">+{moveResultData.rentCollected}</span>
                                        </div>
                                    )}

                                    {/* Buy tile button */}
                                    {canBuyTile(landedSpace.id) && (
                                        <button
                                            className="property-action-btn buy-btn"
                                            disabled={gold < getBuyCost(landedSpace.id)}
                                            onClick={() => {
                                                const cost = getBuyCost(landedSpace.id);
                                                if (spendGold(cost)) {
                                                    buyTile(landedSpace.id);
                                                }
                                            }}
                                        >
                                            🏡 Buy Property ({getBuyCost(landedSpace.id)} Gold)
                                        </button>
                                    )}

                                    {/* Upgrade tile button */}
                                    {canUpgradeTile(landedSpace.id) && (
                                        <button
                                            className="property-action-btn upgrade-btn"
                                            disabled={shmeckles < getUpgradeCost(landedSpace.id)}
                                            onClick={() => {
                                                const cost = getUpgradeCost(landedSpace.id);
                                                if (spendShmeckles(cost)) {
                                                    upgradeTile(landedSpace.id);
                                                }
                                            }}
                                        >
                                            ⬆️ Upgrade ({getUpgradeCost(landedSpace.id)} Shmeckles)
                                        </button>
                                    )}
                                </div>

                                <div className="reward-action-row">
                                    {canRoll() && !autoRollActive && (
                                        <button className="roll-again-btn" onClick={handleRollAgain}>
                                            <RefreshCw size={16} /> Roll Again
                                        </button>
                                    )}
                                    {autoRollActive && (
                                        <div className="rolling-status-pill">⚡ Auto Rolling...</div>
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
