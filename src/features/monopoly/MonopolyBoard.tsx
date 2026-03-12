import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMonopolyStore, BOARD, type BoardSpace, type MysteryRollResult } from '../../store/useMonopolyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './MonopolyBoard.css';

// Define a walkable path layout - Full 11x11 Perimeter Square (40 spaces)
// Start at bottom right (10, 10), go left, up, right, down.
const PATH_LAYOUT = [
    // Bottom edge (right to left): (10,10) to (10,0) - 11 spaces
    { row: 10, col: 10 }, { row: 10, col: 9 }, { row: 10, col: 8 }, { row: 10, col: 7 }, { row: 10, col: 6 },
    { row: 10, col: 5 }, { row: 10, col: 4 }, { row: 10, col: 3 }, { row: 10, col: 2 }, { row: 10, col: 1 }, { row: 10, col: 0 },
    // Left edge (bottom to top): (9,0) to (1,0) - 9 spaces
    { row: 9, col: 0 }, { row: 8, col: 0 }, { row: 7, col: 0 }, { row: 6, col: 0 }, { row: 5, col: 0 },
    { row: 4, col: 0 }, { row: 3, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 0 },
    // Top edge (left to right): (0,0) to (0,10) - 11 spaces
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
    { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }, { row: 0, col: 8 }, { row: 0, col: 9 }, { row: 0, col: 10 },
    // Right edge (top to bottom): (1,10) to (9,10) - 9 spaces
    { row: 1, col: 10 }, { row: 2, col: 10 }, { row: 3, col: 10 }, { row: 4, col: 10 }, { row: 5, col: 10 },
    { row: 6, col: 10 }, { row: 7, col: 10 }, { row: 8, col: 10 }, { row: 9, col: 10 },
];

export const MonopolyBoard = ({ onClose }: { onClose: () => void }) => {
    const { dailyTickets, currentPosition, rollDice, movePlayer, canRoll, rollMysteryBox,
        streakMultiplierActive, totalLifetimeRolls } = useMonopolyStore();
    const { addGold, addShmeckles, addTickets } = useCurrencyStore();
    // Sigil addition — imported lazily to avoid circular dep issues
    const addSigils = (n: number) => {
        try { require('../../store/useConquestStore').useConquestStore.getState().addSigils(n); } catch {}
    };
    
    const [isRolling, setIsRolling] = useState(false);
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [landedSpace, setLandedSpace] = useState<BoardSpace | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [mysteryEvent, setMysteryEvent] = useState<MysteryRollResult | null>(null);
    const [showRewardsInfo, setShowRewardsInfo] = useState(false);

    // RNG Display State
    const JACKPOT_TARGET = 4;
    const JACKPOT_ODDS = 100; // Simulated 1% for presentation (Ultra Rare)
    const [displayedRng, setDisplayedRng] = useState<number>(0);
    const [finalRng, setFinalRng] = useState<number | null>(null);
    const rngIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Animation state for player token
    const [animatingTo, setAnimatingTo] = useState<number | null>(null);

    const handleRoll = () => {
        if (!canRoll() || isRolling) return;

        setIsRolling(true);
        setShowReward(false);
        setMysteryEvent(null);
        setFinalRng(null);

        const roll = streakMultiplierActive ? (rollDice() + rollDice()) : rollDice();
        setDiceResult(roll);

        // Calculate new position for animation
        const newPosition = (currentPosition + roll) % 40;
        setAnimatingTo(newPosition);

        setTimeout(() => {
            const space = movePlayer(roll);
            setLandedSpace(space);
            setAnimatingTo(null);

            // Base Tile Rewards
            if (space.baseReward.gold) addGold(space.baseReward.gold);
            if (space.baseReward.shmeckles) addShmeckles(space.baseReward.shmeckles);
            if (space.baseReward.tickets) addTickets(space.baseReward.tickets);
            if ((space.baseReward as any).sigils && addSigils) addSigils((space.baseReward as any).sigils);

            // Handle Mystery Box Tile
            if (space.type === 'mystery') {
                const mystery = rollMysteryBox();
                setMysteryEvent(mystery);

                // Start RNG visual for mystery
                let animationFrame = 0;
                const maxFrames = 30;
                const actualRng = mystery.rarity === 'ultra_rare' ? JACKPOT_TARGET : Math.floor(Math.random() * JACKPOT_ODDS) + 1;

                rngIntervalRef.current = setInterval(() => {
                    animationFrame++;
                    const randomDisplay = Math.floor(Math.random() * JACKPOT_ODDS) + 1;
                    setDisplayedRng(randomDisplay);

                    if (animationFrame >= maxFrames) {
                        if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
                        setDisplayedRng(actualRng);
                        setFinalRng(actualRng);
                        
                        // Apply Mystery Rewards After Spin finishes
                        if (mystery.reward.gold) addGold(mystery.reward.gold);
                        if (mystery.reward.shmeckles) addShmeckles(mystery.reward.shmeckles);
                        if ((mystery.reward as any).sigils && addSigils) addSigils((mystery.reward as any).sigils);
                        // Pets/Cosmetics handled inside the store

                        setIsRolling(false);
                    }
                }, 50);

            } else {
                setShowReward(true);
                setIsRolling(false);
            }
        }, 1500); // Token move animation
    };

    useEffect(() => {
        return () => {
            if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
        };
    }, []);

    const hasReward = landedSpace && (
        landedSpace.baseReward.gold ||
        landedSpace.baseReward.shmeckles ||
        landedSpace.baseReward.tickets
    );

    // Get player position for animation
    const playerPosition = animatingTo !== null ? animatingTo : currentPosition;

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
                            <span className="ticket-label">rolls</span>
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

                {/* Walkable Board Grid */}
                <div className="walkable-board-container farm-backdrop">
                    <div className="walkable-path-grid farm-grid">
                        {BOARD.map((space, index) => {
                            const layout = PATH_LAYOUT[index];
                            const isCurrentSpace = index === playerPosition;

                            // Decorate empty tiles
                            const terrainIcons = ['🌿', '🪨', '🌾', '·', '🍃', '·', '🌱', '·', '·', '🌻'];
                            const emptyIcon = space.type === 'empty' ? terrainIcons[index % terrainIcons.length] : space.icon;

                            return (
                                <motion.div
                                    key={space.id}
                                    className={`path-tile ${space.type} ${isCurrentSpace ? 'current' : ''}`}
                                    style={{
                                        gridRow: layout.row + 1,
                                        gridColumn: layout.col + 1,
                                    }}
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
                </div>

                {/* Controls */}
                <div className="walkable-controls">
                    {!isRolling && !showReward && !mysteryEvent && (
                        <motion.button
                            className="roll-btn"
                            onClick={handleRoll}
                            disabled={!canRoll()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Dices size={20} />
                            {streakMultiplierActive ? "Double Roll!" : "Roll Dice"}
                        </motion.button>
                    )}

                    {isRolling && mysteryEvent && (
                        <div className="rolling-display">
                            <div className="rng-display">
                                <div className="rng-header">
                                    <span className="rng-label">🎁 Opening Mystery Crop...</span>
                                </div>
                                <motion.div
                                    className={`rng-number ${finalRng === JACKPOT_TARGET ? 'jackpot' : finalRng ? 'miss' : 'spinning'}`}
                                >
                                    {displayedRng.toLocaleString()}
                                </motion.div>
                            </div>
                        </div>
                    )}
                    {isRolling && !mysteryEvent && (
                        <div className="rolling-display">
                            <motion.div
                                className="dice-rolling"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                            >
                                🎲
                            </motion.div>
                        </div>
                    )}

                    {!canRoll() && !isRolling && !showReward && !mysteryEvent && (
                        <div className="no-tickets">
                            <p>No rolls remaining!</p>
                            <p className="comeback">Come back tomorrow for 5 more rolls</p>
                        </div>
                    )}

                    {/* Rewards Info Toggle */}
                    <button
                        className="rewards-info-toggle"
                        onClick={() => setShowRewardsInfo(!showRewardsInfo)}
                    >
                        <Info size={14} />
                        <span>Drop Odds</span>
                        {showRewardsInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {/* Rewards Drop Table Panel */}
                <AnimatePresence>
                    {showRewardsInfo && (
                        <motion.div
                            className="rewards-info-dropdown"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="rewards-section-label">🌾 Theme: The Daily Harvest</div>
                            <div className="rewards-row">
                                <div className="reward-info-item"><span>Ultra Rare (0.001%) – Ethereal Cow Pet</span></div>
                            </div>
                            <div className="rewards-row">
                                <div className="reward-info-item" style={{color:'#c084fc'}}><span>Epic (0.5%) – Straw Hat / Tiles</span></div>
                                <div className="reward-info-item" style={{color:'#60a5fa'}}><span>Rare (1%) – Farm Pets (Cow, Pig, Sheep)</span></div>
                            </div>
                            <div className="rewards-row">
                                <div className="reward-info-item" style={{color:'#a3e635'}}><span>Uncommon (8%) – 2–3 Sigils / 2–3 Schmeckles / 10–15 Gold</span></div>
                                <div className="reward-info-item"><span>Common (90.499%) – 1–9 Gold / 1 Schmeckle / 1 Sigil</span></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mystery Event Popup — centered overlay inside modal */}
            <AnimatePresence>
                {mysteryEvent && finalRng && (
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
                                {mysteryEvent.rarity === 'ultra_rare' ? '🌌' : mysteryEvent.rarity === 'epic' ? '✨' : '🎁'}
                            </motion.div>
                            <h2>
                                {mysteryEvent.rarity === 'ultra_rare' ? 'UNIVERSE DROP!' :
                                    mysteryEvent.rarity === 'epic' ? 'EPIC DROP!' :
                                        mysteryEvent.rarity === 'rare' ? 'RARE DROP!' : 'MYSTERY RESULT'}
                            </h2>
                            <p className="luck-message">{mysteryEvent.message}</p>
                            <div className="luck-rewards">
                                <div className="luck-xp">
                                    {mysteryEvent.reward.gold && <span>+{mysteryEvent.reward.gold} Gold</span>}
                                    {mysteryEvent.reward.shmeckles && <span>+{mysteryEvent.reward.shmeckles} Schmeckles</span>}
                                    {(mysteryEvent.reward as any).sigils && <span>+{(mysteryEvent.reward as any).sigils} 🔱 Sigils</span>}
                                </div>
                                {(mysteryEvent.reward.petId || mysteryEvent.reward.cosmeticId || mysteryEvent.reward.titleId) && (
                                    <div className="pet-unlock">
                                        <div className="pet-preview">{mysteryEvent.isDuplicate ? '🪙' : '🆕'}</div>
                                    </div>
                                )}
                            </div>
                            <button className="luck-continue-btn" onClick={() => {
                                setMysteryEvent(null);
                                setFinalRng(null);
                            }}>
                                Awesome!
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Base Reward Popup — centered overlay inside modal */}
            <AnimatePresence>
                {showReward && landedSpace && !mysteryEvent && (
                    <div className="board-reward-overlay">
                        <motion.div
                            className="reward-popup modal-reward-card"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                        >
                            <div className="reward-glow" />
                            <div className="dice-result">Rolled: {diceResult}</div>
                            <h3>{landedSpace.icon} {landedSpace.name}</h3>
                            <div className="reward-list">
                                {landedSpace.baseReward.gold && (
                                    <div className="reward-item">
                                        <span>🪙 Gold:</span>
                                        <span className="reward-value">+{landedSpace.baseReward.gold}</span>
                                    </div>
                                )}
                                {landedSpace.baseReward.shmeckles && (
                                    <div className="reward-item">
                                        <span>🐌 Schmeckles:</span>
                                        <span className="reward-value">+{landedSpace.baseReward.shmeckles}</span>
                                    </div>
                                )}
                                {landedSpace.baseReward.tickets && (
                                    <div className="reward-item">
                                        <span>🎫 Tickets:</span>
                                        <span className="reward-value">+{landedSpace.baseReward.tickets}</span>
                                    </div>
                                )}
                                {!hasReward && (
                                    <div className="reward-item empty">
                                        <span>Nothing here...</span>
                                    </div>
                                )}
                            </div>
                            <button className="continue-btn" onClick={() => setShowReward(false)}>
                                Continue
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    </div>
    );
};

