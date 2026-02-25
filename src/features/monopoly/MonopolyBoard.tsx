import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMonopolyStore, BOARD, type BoardSpace, type LuckRollResult } from '../../store/useMonopolyStore';
import { useGameStore } from '../../store/useGameStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useGachaStore } from '../../store/useGachaStore';
import { useBuffStore } from '../../store/useBuffStore';
import './MonopolyBoard.css';

// Define a walkable path layout - snake pattern (10 columns x 4 rows)
const PATH_LAYOUT = [
    // Row 0 (top): 0-9 left to right
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
    { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }, { row: 0, col: 8 }, { row: 0, col: 9 },
    // Row 1: 10-19 right to left
    { row: 1, col: 9 }, { row: 1, col: 8 }, { row: 1, col: 7 }, { row: 1, col: 6 }, { row: 1, col: 5 },
    { row: 1, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
    // Row 2: 20-29 left to right
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
    { row: 2, col: 5 }, { row: 2, col: 6 }, { row: 2, col: 7 }, { row: 2, col: 8 }, { row: 2, col: 9 },
    // Row 3 (bottom): 30-39 right to left
    { row: 3, col: 9 }, { row: 3, col: 8 }, { row: 3, col: 7 }, { row: 3, col: 6 }, { row: 3, col: 5 },
    { row: 3, col: 4 }, { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
];

// Region color map for tile borders
const REGION_COLORS: Record<string, string> = {
    early: 'rgba(100, 200, 100, 0.3)',
    mid: 'rgba(100, 150, 255, 0.3)',
    late: 'rgba(230, 100, 230, 0.3)',
};

export const MonopolyBoard = ({ onClose }: { onClose: () => void }) => {
    const { dailyTickets, currentPosition, rollDice, movePlayer, canRoll, checkLuckRoll,
        streakMultiplierActive, trainingTokens, petShards, totalLifetimeRolls } = useMonopolyStore();
    const { addSkillXp } = useGameStore();
    const { addGold, addTickets } = useCurrencyStore();
    const { ownedPets } = useGachaStore();
    const { addBuff, setDoubleXpNextHabit } = useBuffStore();
    const [isRolling, setIsRolling] = useState(false);
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [landedSpace, setLandedSpace] = useState<BoardSpace | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [luckEvent, setLuckEvent] = useState<LuckRollResult | null>(null);
    const [showRewardsInfo, setShowRewardsInfo] = useState(false);

    // RNG Display State
    const JACKPOT_TARGET = 4;
    const JACKPOT_ODDS = 250000;
    const [displayedRng, setDisplayedRng] = useState<number>(0);
    const [finalRng, setFinalRng] = useState<number | null>(null);
    const rngIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Animation state for player token
    const [animatingTo, setAnimatingTo] = useState<number | null>(null);

    // Apply tile effects when landing
    const applyTileEffects = (space: BoardSpace) => {
        // Stat boost
        if (space.reward.statBoost) {
            const sb = space.reward.statBoost;
            addBuff('stat_boost', sb.value, sb.durationHours, `${sb.stat} Surge`, sb.stat);
        }
        // Double XP
        if (space.reward.doubleXpNextHabit) {
            setDoubleXpNextHabit(true);
        }
        // Shop discount
        if (space.reward.shopDiscount) {
            const sd = space.reward.shopDiscount;
            addBuff('shop_discount', sd.value, sd.durationHours, 'Merchant Favor');
        }
        // Injury → defense bonus
        if (space.reward.injuryRest) {
            const ir = space.reward.injuryRest;
            addBuff('defense_boost', ir.defenseBonus, ir.durationHours, 'Rest Day Bonus');
        }
        // Training tokens & pet shards are auto-collected by the store's movePlayer
    };

    const handleRoll = () => {
        if (!canRoll() || isRolling) return;

        setIsRolling(true);
        setShowReward(false);
        setLuckEvent(null);
        setFinalRng(null);

        const roll = rollDice();
        setDiceResult(roll);

        // Generate actual RNG for jackpot display
        const actualRng = Math.floor(Math.random() * JACKPOT_ODDS) + 1;

        // Animate RNG display
        let animationFrame = 0;
        const maxFrames = 30;

        rngIntervalRef.current = setInterval(() => {
            animationFrame++;
            const randomDisplay = Math.floor(Math.random() * JACKPOT_ODDS) + 1;
            setDisplayedRng(randomDisplay);

            if (animationFrame >= maxFrames) {
                if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
                setDisplayedRng(actualRng);
                setFinalRng(actualRng);
            }
        }, 50);

        // Check for luck roll
        const luckRoll = checkLuckRoll();
        if (luckRoll.type !== 'none') {
            setLuckEvent(luckRoll);
            addSkillXp('Luck', luckRoll.luckXpBonus);
            if (luckRoll.unlockedPet && !ownedPets.includes(luckRoll.unlockedPet)) {
                useGachaStore.getState().ownedPets.push(luckRoll.unlockedPet);
            }
        }

        // Calculate new position for animation
        const newPosition = (currentPosition + roll) % 40;
        setAnimatingTo(newPosition);

        setTimeout(() => {
            const space = movePlayer(roll);
            setLandedSpace(space);
            setAnimatingTo(null);

            if (space.reward.gold) addGold(space.reward.gold);
            if (space.reward.gems) {
                const { addGems } = useGameStore.getState();
                addGems(space.reward.gems);
            }
            if (space.reward.tickets) addTickets(space.reward.tickets);
            if (space.reward.luckXp) addSkillXp('Luck', space.reward.luckXp);

            // Apply new tile effects
            applyTileEffects(space);

            setShowReward(true);
            setIsRolling(false);
        }, 2000);
    };

    useEffect(() => {
        return () => {
            if (rngIntervalRef.current) clearInterval(rngIntervalRef.current);
        };
    }, []);

    const hasReward = landedSpace && (
        landedSpace.reward.gold ||
        landedSpace.reward.gems ||
        landedSpace.reward.tickets ||
        landedSpace.reward.luckXp ||
        landedSpace.reward.statBoost ||
        landedSpace.reward.doubleXpNextHabit ||
        landedSpace.reward.trainingTokens ||
        landedSpace.reward.shopDiscount ||
        landedSpace.reward.petShards ||
        landedSpace.reward.mysteryEncounter ||
        landedSpace.reward.injuryRest
    );

    // Get player position for animation
    const playerPosition = animatingTo !== null ? animatingTo : currentPosition;

    return (
        <div className="modal-overlay walkable-board-overlay">
            <motion.div
                className="walkable-board-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                {/* Header */}
                <div className="walkable-board-header">
                    <div className="header-left">
                        <span className="header-icon">🎲</span>
                        <h2>Daily Fortune Path</h2>
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
                        {/* Resource indicators */}
                        <div className="resource-display">
                            <span title="Training Tokens">🎯 {trainingTokens}</span>
                            <span title="Pet Shards">🔮 {petShards}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Streak Multiplier Indicator */}
                {streakMultiplierActive && (
                    <div className="streak-banner">
                        🔥 All habits complete — <strong>Double Roll!</strong>
                    </div>
                )}

                {/* Walkable Board Grid */}
                <div className="walkable-board-container">
                    <div className="walkable-path-grid">
                        {BOARD.map((space, index) => {
                            const layout = PATH_LAYOUT[index];
                            const isCurrentSpace = index === playerPosition;
                            const isRewardSpace = space.type !== 'empty';

                            // Terrain variety for empty tiles
                            const terrainIcons = ['🌿', '🪨', '🌾', '·', '🍃', '·', '🌱', '·', '·', '·'];
                            const emptyIcon = space.type === 'empty' ? terrainIcons[index % terrainIcons.length] : space.icon;

                            return (
                                <motion.div
                                    key={space.id}
                                    className={`path-tile ${space.type} ${isCurrentSpace ? 'current' : ''} region-${space.region}`}
                                    style={{
                                        gridRow: layout.row + 1,
                                        gridColumn: layout.col + 1,
                                        borderColor: isRewardSpace ? REGION_COLORS[space.region] : undefined,
                                    }}
                                    animate={isCurrentSpace ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <div className="tile-icon">{emptyIcon}</div>
                                    {isRewardSpace && (
                                        <div className="tile-label">{space.name}</div>
                                    )}
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
                    {!isRolling && !showReward && (
                        <motion.button
                            className="roll-btn"
                            onClick={handleRoll}
                            disabled={!canRoll()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Dices size={20} />
                            Roll Dice
                        </motion.button>
                    )}

                    {isRolling && (
                        <div className="rolling-display">
                            <motion.div
                                className="dice-rolling"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                            >
                                🎲
                            </motion.div>
                            <div className="rng-display">
                                <div className="rng-header">
                                    <span className="rng-label">🎰 Jackpot Roll</span>
                                    <span className="rng-target">Need: <strong>{JACKPOT_TARGET}</strong></span>
                                </div>
                                <motion.div
                                    className={`rng-number ${finalRng === JACKPOT_TARGET ? 'jackpot' : finalRng ? 'miss' : 'spinning'}`}
                                    animate={!finalRng ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.3 }}
                                >
                                    {displayedRng.toLocaleString()}
                                </motion.div>
                                <div className="rng-odds">1 in {JACKPOT_ODDS.toLocaleString()}</div>
                            </div>
                        </div>
                    )}

                    {!canRoll() && !isRolling && !showReward && (
                        <div className="no-tickets">
                            <p>No rolls remaining!</p>
                            <p className="comeback">Come back tomorrow for 3 more rolls</p>
                        </div>
                    )}

                    {/* Rewards Info Toggle */}
                    <button
                        className="rewards-info-toggle"
                        onClick={() => setShowRewardsInfo(!showRewardsInfo)}
                    >
                        <Info size={14} />
                        <span>Rewards</span>
                        {showRewardsInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {/* Rewards Info Panel */}
                <AnimatePresence>
                    {showRewardsInfo && (
                        <motion.div
                            className="rewards-info-dropdown"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="rewards-section-label">🟢 Early Region</div>
                            <div className="rewards-row">
                                <div className="reward-info-item"><span>🪙 Copper</span><span>+1-3 Gold</span></div>
                                <div className="reward-info-item"><span>💎 Stat Surge</span><span>+1% 24h</span></div>
                                <div className="reward-info-item"><span>⚡ Double XP</span><span>Next habit</span></div>
                            </div>
                            <div className="rewards-section-label">🔵 Mid Region</div>
                            <div className="rewards-row">
                                <div className="reward-info-item"><span>🎯 Token</span><span>Pet upgrade</span></div>
                                <div className="reward-info-item"><span>💎 Gem</span><span>+1 Gem</span></div>
                                <div className="reward-info-item"><span>🏷️ Discount</span><span>15% 24h</span></div>
                                <div className="reward-info-item"><span>🔮 Shard</span><span>100 = pet</span></div>
                            </div>
                            <div className="rewards-section-label">🟣 Late Region</div>
                            <div className="rewards-row">
                                <div className="reward-info-item"><span>⚔️ Encounter</span><span>Bonus gold</span></div>
                                <div className="reward-info-item"><span>💎 Rare Gem</span><span>+2 Gems</span></div>
                                <div className="reward-info-item"><span>🩹 Injury</span><span>+5% DEF 24h</span></div>
                                <div className="reward-info-item"><span>💎 Surge+</span><span>+2% 24h</span></div>
                            </div>
                            <div className="luck-rolls-row">
                                <span>✨ 1:1k = +50 XP</span>
                                <span>🔥 1:10k = +100 XP</span>
                                <span>🌌 1:250k = 🐮✨ Ethereal Cow!</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Luck Event Popup */}
                <AnimatePresence>
                    {luckEvent && (
                        <motion.div
                            className={`luck-event-popup ${luckEvent.type}`}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                        >
                            <div className="luck-rays" />
                            {luckEvent.type === 'universe' && <div className="cosmic-bg" />}
                            <motion.div
                                className="luck-icon"
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                {luckEvent.type === 'universe' ? '🌌' : luckEvent.type === 'godly' ? '🔥' : '✨'}
                            </motion.div>
                            <h2>
                                {luckEvent.type === 'universe' ? 'UNIVERSE ALTERING!' :
                                    luckEvent.type === 'godly' ? 'GODLY LUCK!' : 'INSANE LUCK!'}
                            </h2>
                            <p className="luck-message">{luckEvent.message}</p>
                            <div className="luck-rewards">
                                <div className="luck-xp">
                                    <span>🍀 Luck XP</span>
                                    <strong>+{luckEvent.luckXpBonus}</strong>
                                </div>
                                {luckEvent.unlockedPet && (
                                    <div className="pet-unlock">
                                        <div className="pet-preview">🐮✨</div>
                                        <span>Unlocked Ethereal Cow!</span>
                                    </div>
                                )}
                            </div>
                            <button className="luck-continue-btn" onClick={() => setLuckEvent(null)}>
                                AMAZING!
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reward Popup */}
                <AnimatePresence>
                    {showReward && landedSpace && !luckEvent && (
                        <motion.div
                            className="reward-popup"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                        >
                            <div className="reward-glow" />
                            <div className="dice-result">Rolled: {diceResult}</div>
                            <h3>{landedSpace.icon} {landedSpace.name}</h3>
                            <div className="reward-list">
                                {landedSpace.reward.gold && (
                                    <div className="reward-item">
                                        <span>🪙 Gold:</span>
                                        <span className="reward-value">+{landedSpace.reward.gold}</span>
                                    </div>
                                )}
                                {landedSpace.reward.gems && (
                                    <div className="reward-item">
                                        <span>💎 Gems:</span>
                                        <span className="reward-value">+{landedSpace.reward.gems}</span>
                                    </div>
                                )}
                                {landedSpace.reward.tickets && (
                                    <div className="reward-item">
                                        <span>🎫 Tickets:</span>
                                        <span className="reward-value">+{landedSpace.reward.tickets}</span>
                                    </div>
                                )}
                                {landedSpace.reward.luckXp && (
                                    <div className="reward-item">
                                        <span>🍀 Luck XP:</span>
                                        <span className="reward-value">+{landedSpace.reward.luckXp}</span>
                                    </div>
                                )}
                                {landedSpace.reward.statBoost && (
                                    <div className="reward-item">
                                        <span>💎 {landedSpace.reward.statBoost.stat}:</span>
                                        <span className="reward-value">+{(landedSpace.reward.statBoost.value * 100).toFixed(0)}% for 24h</span>
                                    </div>
                                )}
                                {landedSpace.reward.doubleXpNextHabit && (
                                    <div className="reward-item">
                                        <span>⚡ Double XP:</span>
                                        <span className="reward-value">Next habit!</span>
                                    </div>
                                )}
                                {landedSpace.reward.trainingTokens && (
                                    <div className="reward-item">
                                        <span>🎯 Training Token:</span>
                                        <span className="reward-value">+{landedSpace.reward.trainingTokens}</span>
                                    </div>
                                )}
                                {landedSpace.reward.shopDiscount && (
                                    <div className="reward-item">
                                        <span>🏷️ Discount:</span>
                                        <span className="reward-value">{(landedSpace.reward.shopDiscount.value * 100).toFixed(0)}% off for 24h</span>
                                    </div>
                                )}
                                {landedSpace.reward.petShards && (
                                    <div className="reward-item">
                                        <span>🔮 Pet Shard:</span>
                                        <span className="reward-value">+{landedSpace.reward.petShards}</span>
                                    </div>
                                )}
                                {landedSpace.reward.mysteryEncounter && (
                                    <div className="reward-item">
                                        <span>⚔️ Mystery Encounter!</span>
                                        <span className="reward-value">Fight for gold</span>
                                    </div>
                                )}
                                {landedSpace.reward.injuryRest && (
                                    <div className="reward-item">
                                        <span>🩹 Injury → Rest Day:</span>
                                        <span className="reward-value">+{(landedSpace.reward.injuryRest.defenseBonus * 100).toFixed(0)}% DEF 24h</span>
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
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
