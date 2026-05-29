import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, X, RefreshCw, Play, Square, Coins } from 'lucide-react';
import { useMonopolyStore, getBoard, OWNERSHIP_TIERS, getPropertyMultiplier, getPropertyMultiplierPool, type BoardSpace, type MysteryRollResult } from '../../store/useMonopolyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
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

const GoldIcon = ({ size = 16 }: { size?: number }) => (
    <Coins size={size} color="#fbbf24" style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
);

const MYSTERY_SHUFFLE_ITEMS = [
    { type: 'gold_25',   icon: <GoldIcon size={48} />, label: '25 Gold' },
    { type: 'gold_50',   icon: <GoldIcon size={48} />, label: '50 Gold' },
    { type: 'gold_75',   icon: <GoldIcon size={48} />, label: '75 Gold' },
    { type: 'gold_100',  icon: <GoldIcon size={48} />, label: '100 Gold' },
    { type: 'gold_150',  icon: <GoldIcon size={48} />, label: '150 Gold' },
    { type: 'gold_250',  icon: <GoldIcon size={48} />, label: '250 Gold' },
    { type: 'gem_1',     icon: <span style={{fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))'}}>💎</span>, label: '1 Gem' },
    { type: 'gem_3',     icon: <span style={{fontSize: '3rem', filter: 'drop-shadow(0 0 15px rgba(192, 132, 252, 0.7))'}}>💎💎</span>, label: '3 Gems' },
    { type: 'gem_5',     icon: <span style={{fontSize: '3.5rem', filter: 'drop-shadow(0 0 25px rgba(245, 158, 11, 0.9))'}}>👑💎 Hoard</span>, label: 'Jackpot: 5 Gems' },
];

/** Map a resolved MysteryRollResult to the correct MYSTERY_SHUFFLE_ITEMS index so the
 *  carousel always lands on the icon that matches the awarded reward. */
const resolveWinningIndex = (mystery: import('../../store/useMonopolyStore').MysteryRollResult): number => {
    const reward = mystery.reward;
    if (reward.gems) {
        if (reward.gems === 5) return 8;
        if (reward.gems === 3) return 7;
        return 6;
    }
    if (reward.gold) {
        if (reward.gold === 250) return 5;
        if (reward.gold === 150) return 4;
        if (reward.gold === 100) return 3;
        if (reward.gold === 75) return 2;
        if (reward.gold === 50) return 1;
        return 0;
    }
    return 0;
};

// Flow phases
type Phase = 'idle' | 'dice-spin' | 'dice-reveal' | 'moving' | 'result' | 'go-result' | 'mystery-spin' | 'mystery-result' | 'hazard-result' | 'property-spin';

// Build live odds rows from the new Daily Spin table
const ODDS_ROWS = [
    {
        label: 'Jackpot',
        pct: '0.5%',
        color: '#fbbf24',
        items: '5 Gems 👑',
    },
    {
        label: 'Epic',
        pct: '2.5%',
        color: '#c084fc',
        items: '3 Gems 💎',
    },
    {
        label: 'Rare',
        pct: '4.0%',
        color: '#60a5fa',
        items: '1 Gem 💎',
    },
    {
        label: 'Uncommon',
        pct: '11.0%',
        color: '#a3e635',
        items: '150 or 250 Gold 💰',
    },
    {
        label: 'Common',
        pct: '82.0%',
        color: '#94a3b8',
        items: '25, 50, 75, or 100 Gold 💰',
    },
];

// Also show base tile rewards
const BASE_REWARDS = [
    { icon: '🏠', label: 'GO tile', note: '+25 Gold (scales +1 per lap)' },
    { icon: <GoldIcon size={18} />, label: 'Gold tiles', note: '+3–15 Gold' },
    { icon: '🎁', label: 'Mystery Crop tiles', note: 'Opens drop table above' },
    { icon: '🎫', label: 'Lost Ticket', note: '+1 Roll' },
];

export const MonopolyBoard = ({ onClose }: { onClose: () => void }) => {
    const {
        dailyTickets, currentPosition, rollDice, movePlayer,
        canRoll, rollMysteryBox, streakMultiplierActive,
        lapCount, boardRefreshPending, regenerateBoard, getGoReward,
        ownedTiles, buyTile, upgradeTile,
        canBuyTile, canUpgradeTile, getBuyCost, getUpgradeCost,
    } = useMonopolyStore();
    const { addGold, addTickets, gold, spendCurrency, canAfford } = useCurrencyStore();
    const heroImage = usePlayerAvatar();

    // Derive player token from classType image
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

    const [boardKey, setBoardKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [propertyMultiplierResult, setPropertyMultiplierResult] = useState<number>(1);
    const [displayedMultiplier, setDisplayedMultiplier] = useState<number>(1);

    // Auto-roll
    const [autoRollActive, setAutoRollActive] = useState(false);
    const autoRollRef = useRef(false);

    // Mystery box rng
    const [displayedRng, setDisplayedRng] = useState<number>(0);
    const [_finalRng, setFinalRng] = useState<number | null>(null);

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

        rollingRef.current = true;

        setLandedSpace(null);
        setMysteryEvent(null);
        setFinalRng(null);
        setGoRewardAmount(0);

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

                // Animate token movement tile-by-tile
                let stepCount = 0;
                let visualPosition = currentPosition;
                
                const moveInterval = setInterval(() => {
                    if (stepCount < roll) {
                        stepCount++;
                        visualPosition = (visualPosition + 1) % 24; // 24 = TOTAL_SPACES
                        setAnimatingTo(visualPosition);
                    } else {
                        // Finished visual movement
                        clearInterval(moveInterval);
                        
                        // Wait briefly for impact before showing popup
                        setTimeout(() => {
                            const moveResult = movePlayer(roll);
                            setLandedSpace(moveResult.landedSpace);
                            setAnimatingTo(null);

                            if (moveResult.passedGo) {
                                // GO was passed — award GO gold, show GO result
                                setGoRewardAmount(moveResult.goReward);
                                addGold(moveResult.goReward, { exact: true });
                                setPhase('go-result');
                                rollingRef.current = false;
                            } else {
                                // Normal tile landing
                                const space = moveResult.landedSpace;
                                const ownership = useMonopolyStore.getState().ownedTiles[space.id];

                                const processFinalRewards = (multiplier: number) => {
                                    if (space.baseReward.gold) addGold(Math.floor(space.baseReward.gold * multiplier));
                                    if (space.baseReward.tickets) addTickets(space.baseReward.tickets);

                                    if (space.type === 'mystery') {
                                        const mystery = rollMysteryBox();
                                        setMysteryEvent(mystery);
                                        setPhase('mystery-spin');

                                        // Determine which carousel slot matches the actual result
                                        // so the animation always lands on the right icon.
                                        const winningIdx = resolveWinningIndex(mystery);

                                        let animFrame = 0;
                                        const maxFrames = 30;
                                        let currentDelay = 50;
                                        
                                        const runShuffle = () => {
                                            animFrame++;
                                            
                                            if (animFrame >= maxFrames) {
                                                // Lock on the actual winning item
                                                setDisplayedRng(winningIdx);
                                                setFinalRng(winningIdx);
                                                if (mystery.reward.gold) addGold(mystery.reward.gold);
                                                if (mystery.reward.gems) {
                                                    const { addGems } = useCurrencyStore.getState();
                                                    addGems(mystery.reward.gems);
                                                }

                                                setTimeout(() => {
                                                    setPhase('mystery-result');
                                                    rollingRef.current = false;
                                                }, 400); 
                                                return;
                                            }

                                            // During animation: show random items (not the winner yet)
                                            // In the last 5 frames, start showing the winner to tease it
                                            if (animFrame >= maxFrames - 5) {
                                                setDisplayedRng(winningIdx);
                                            } else {
                                                setDisplayedRng(Math.floor(Math.random() * MYSTERY_SHUFFLE_ITEMS.length));
                                            }

                                            if (animFrame > 20) {
                                                currentDelay += 35;
                                            } else if (animFrame > 10) {
                                                currentDelay += 10;
                                            }
                                            
                                            setTimeout(runShuffle, currentDelay);
                                        };
                                        
                                        runShuffle();
                                    } else {
                                        setPhase('result');
                                        rollingRef.current = false;
                                    }
                                };

                                if (ownership) {
                                    const finalMul = getPropertyMultiplier(ownership.level);
                                    const pool = getPropertyMultiplierPool(ownership.level);
                                    setPropertyMultiplierResult(finalMul);
                                    setPhase('property-spin');
                                    
                                    let animFrame = 0;
                                    const spinInterval = setInterval(() => {
                                        animFrame++;
                                        setDisplayedMultiplier(pool[Math.floor(Math.random() * pool.length)]);
                                        if (animFrame > 15) {
                                            clearInterval(spinInterval);
                                            setDisplayedMultiplier(finalMul);
                                            setTimeout(() => {
                                                processFinalRewards(finalMul);
                                            }, 700);
                                        }
                                    }, 80);
                                } else {
                                    setPropertyMultiplierResult(1);
                                    processFinalRewards(1);
                                }
                            }
                        }, 800); // Increased pause on final tile so it feels physical
                    }
                }, 200); // 200ms per tile step
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
        landedSpace.baseReward.tickets
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
                            const ownerInfo = getOwnershipInfo(index);
                            
                            let emptyIcon: React.ReactNode = space.icon;
                            if (space.type === 'empty') emptyIcon = terrainIcons[index % terrainIcons.length];
                            if (space.type === 'gold') emptyIcon = <GoldIcon size={24} />;

                            const ownerClass = ownerInfo ? `owned-${ownerInfo.level}` : '';

                            return (
                                <motion.div
                                    key={space.id}
                                    className={`path-tile ${space.type} ${isCurrentSpace ? 'current' : ''} ${isGoTile ? 'go-tile' : ''} ${ownerClass}`}
                                    style={{ gridRow: layout.row + 1, gridColumn: layout.col + 1 }}
                                    animate={isCurrentSpace ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <div className="tile-icon">
                                        {isGoTile ? '🏠' : emptyIcon}
                                    </div>
                                    <div className="tile-label">
                                        {isGoTile ? 'GO' : space.name}
                                    </div>
                                    {ownerInfo && (
                                        <div className={`property-marker-badge level-${ownerInfo.level}`}>
                                            {ownerInfo.icon}
                                        </div>
                                    )}
                                    {isGoTile && (
                                        <div className="go-reward-label">+{getGoReward()}<GoldIcon size={12} /></div>
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
                    <AnimatePresence mode="wait">
                        {phase === 'mystery-spin' && (
                            <motion.div
                                className="dice-center-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                key="mystery-overlay"
                            >
                                <div className="rng-display" style={{ width: '220px', padding: '1rem', background: 'rgba(20,20,30,0.95)', border: '2px solid #6366f1', borderRadius: '16px' }}>
                                    <div className="rng-header" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                        <span className="rng-label" style={{ fontSize: '1rem', fontWeight: 800, color: '#a5b4fc' }}>🎁 Revealing...</span>
                                    </div>
                                    
                                    {/* Carousel Item Render */}
                                    {MYSTERY_SHUFFLE_ITEMS[displayedRng] && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {MYSTERY_SHUFFLE_ITEMS[displayedRng].icon}
                                            </div>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                                                {MYSTERY_SHUFFLE_ITEMS[displayedRng].label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Property Multiplier RNG spinner (on the board) */}
                    <AnimatePresence mode="wait">
                        {phase === 'property-spin' && (
                            <motion.div
                                className="dice-center-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                key="property-overlay"
                            >
                                <div className="rng-display" style={{ width: '220px', padding: '1rem', background: 'rgba(20,20,30,0.95)', border: '2px solid #a3e635', borderRadius: '16px' }}>
                                    <div className="rng-header" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                        <span className="rng-label" style={{ fontSize: '1rem', fontWeight: 800, color: '#bef264' }}>🏡 Owned Property</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '3rem', fontWeight: 900, color: displayedMultiplier === 3 ? '#f59e0b' : displayedMultiplier === 2 ? '#60a5fa' : '#94a3b8' }}>
                                            {displayedMultiplier}x
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#fff', opacity: 0.7 }}>
                                            Reward Multiplier
                                        </span>
                                    </div>
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

                    {/* No more storm pill — storm tiles removed */}

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

                    {phase === 'idle' && !canRoll() && (
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

                            {/* Overall pet odds callout */}
                             {(() => {
                                const board = getBoard();
                                const mysteryCropCount = board.filter(t => t.type === 'mystery').length;
                                const totalTiles = board.length;
                                return (
                                    <div className="odds-pet-callout" style={{ borderLeftColor: '#38bdf8' }}>
                                        <div className="odds-pet-line">
                                            <span>💎 Gem chance on Mystery Crop tile:</span>
                                            <span style={{ color: '#38bdf8', fontWeight: 700 }}>7.00%</span>
                                        </div>
                                        <div className="odds-pet-line">
                                            <span>🍀 Overall Gem chance per roll:</span>
                                            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{((mysteryCropCount / totalTiles) * 7.0).toFixed(2)}%</span>
                                        </div>
                                    </div>
                                );
                            })()}

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
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}><GoldIcon size={18} /> <span>Gold</span></div>
                                        <span className="reward-val">+{goRewardAmount}</span>
                                    </div>
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
                                    <div className="luck-xp" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                                        {mysteryEvent.reward.gold && (
                                            <div className="reward-line gold-glow" style={{ fontSize: '1.8rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(251, 191, 36, 0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <GoldIcon size={32} />
                                                <span>+{mysteryEvent.reward.gold} Gold</span>
                                            </div>
                                        )}
                                        {mysteryEvent.reward.gems && (
                                            <div className="reward-line gem-glow" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8', textShadow: '0 0 15px rgba(56, 189, 248, 0.7)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>💎</span>
                                                <span>+{mysteryEvent.reward.gems} {mysteryEvent.reward.gems === 1 ? 'Gem' : 'Gems'}</span>
                                            </div>
                                        )}
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
                                        <div className="reward-card-tile-name">{landedSpace.type === 'gold' ? <GoldIcon size={24} /> : landedSpace.icon} {landedSpace.name}</div>
                                    </div>
                                </div>

                                <div className="reward-card-body">
                                    {hasReward ? (
                                        <>
                                            {landedSpace.baseReward.gold && (
                                                <div className="reward-line gold">
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}><GoldIcon size={18} /> <span>Gold</span></div>
                                                    <span className="reward-val">+{Math.floor(landedSpace.baseReward.gold * propertyMultiplierResult)}</span>
                                                </div>
                                            )}
                                            {landedSpace.baseReward.tickets && (
                                                <div className="reward-line tickets">
                                                    <span>🎫 Rolls</span>
                                                    <span className="reward-val">+{landedSpace.baseReward.tickets}</span>
                                                </div>
                                            )}
                                            {ownedTiles[landedSpace.id] && propertyMultiplierResult > 1 && (
                                                <div className="reward-line" style={{ color: '#a3e635', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                                    <span>🏡 Owned ({propertyMultiplierResult}x payout!)</span>
                                                </div>
                                            )}
                                            {ownedTiles[landedSpace.id] && propertyMultiplierResult === 1 && (
                                                <div className="reward-line" style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                                    <span>🏡 Owned (Normal payout)</span>
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

                                    {/* Buy tile button */}
                                    {canBuyTile(landedSpace.id) && (
                                        <button
                                            className="property-action-btn buy-btn"
                                            disabled={gold < (getBuyCost(landedSpace.id)?.gold || 50)}
                                            onClick={() => {
                                                const cost = getBuyCost(landedSpace.id);
                                                if (spendCurrency(cost)) {
                                                    buyTile(landedSpace.id);
                                                }
                                            }}
                                        >
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                                <span>🏡 Buy Property</span>
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '12px'}}>
                                                    ({getBuyCost(landedSpace.id)?.gold} <GoldIcon size={14} />)
                                                </span>
                                            </div>
                                        </button>
                                    )}

                                    {/* Upgrade tile button */}
                                    {canUpgradeTile(landedSpace.id) && (() => {
                                        const costObj = getUpgradeCost(landedSpace.id);
                                        const afford = costObj ? canAfford(costObj) : false;
                                        return (
                                        <button
                                            className="property-action-btn upgrade-btn"
                                            disabled={!afford}
                                            onClick={() => {
                                                if (costObj && spendCurrency(costObj)) {
                                                    upgradeTile(landedSpace.id);
                                                }
                                            }}
                                        >
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                                <span>⬆️ Upgrade</span>
                                                <span style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '12px'}}>
                                                    ({costObj?.gold && <>{costObj.gold}<GoldIcon size={14} /></>}
                                                    {costObj?.gems && <> + {costObj.gems}💎</>})
                                                </span>
                                            </div>
                                        </button>
                                        );
                                    })()}
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
