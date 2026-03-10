import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Coins, Dice1, Tent, Swords, Gem, MessageSquare, Gamepad2, Skull } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CONQUEST_MAP_NODES, CONQUEST_EVENT_TABLE, type ConquestNodeData } from '../../data/conquest';
import { useHeroImage } from '../../hooks/useHeroImage';
import { ConquestStoreUI } from './ConquestStore';
import { ChessGame } from './ChessGame';
import { ConquestTiles } from './ConquestTiles';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useNavigate } from 'react-router-dom';
import './Conquest.css';

// AI-generated background
import bgMap from '../../assets/backgrounds/infernal_citadel.png';

const NODE_ICONS: Record<string, React.ReactNode> = {
    start: <Tent size={24} />,
    battle: <Swords size={24} />,
    treasure: <Gem size={24} />,
    event: <MessageSquare size={24} />,
    minigame: <Gamepad2 size={24} />,
    shop: <Coins size={24} />,
    boss: <Skull size={32} />
};

export const Conquest = () => {
    const conquest = useConquestStore();
    const currency = useCurrencyStore();
    const strategy = useStrategyStore();
    const navigate = useNavigate();
    const heroImage = useHeroImage();
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const [showStore, setShowStore] = useState(false);
    const [showChess, setShowChess] = useState(false);
    const [showTiles, setShowTiles] = useState(false);
    const [activeEvent, setActiveEvent] = useState<string | null>(null);
    const [rewardModal, setRewardModal] = useState<{ gold: number, sigils: number } | null>(null);
    const [hasBounced, setHasBounced] = useState(false); // To handle initial scroll to bottom

    useEffect(() => {
        conquest.initMap();
    }, []);

    // Initial scroll to bottom where player starts
    useEffect(() => {
        if (!hasBounced && mapContainerRef.current) {
            setTimeout(() => {
                mapContainerRef.current!.scrollTop = mapContainerRef.current!.scrollHeight;
                setHasBounced(true);
            }, 100);
        }
    }, [hasBounced]);

    const reachableNodes = conquest.activeDiceRoll ? conquest.getReachableNodes() : [];

    const handleNodeClick = (node: ConquestNodeData) => {
        console.log("Clicked node:", node.id, node.label);
        console.log("Reachable nodes:", reachableNodes);

        if (!reachableNodes.includes(node.id)) {
            console.error("Early return! Node is not in reachableNodes.");
            return;
        }

        console.log("Passed reachable check. Moving player to:", node.id);
        // Move player
        conquest.movePlayer(node.id);

        console.log("Executing node effect:", node.type);
        // Execute node effect
        switch (node.type) {
            case 'battle':
            case 'boss':
                // Transition to Arena
                // We assume there's an arena integration, we'll just navigate
                navigate('/arena');
                break;
            case 'treasure':
                const gold = Math.floor(Math.random() * 50) + 20;
                const sigils = Math.floor(Math.random() * 10) + 5;
                conquest.grantSpireReward(gold, sigils);
                setRewardModal({ gold, sigils });
                break;
            case 'event':
                setActiveEvent(node.label);
                break;
            case 'shop':
                setShowStore(true);
                break;
            case 'minigame':
                // Randomly open chess or tiles based on game string or logic
                if (node.label === 'Fae Mischief') {
                    setShowTiles(true);
                } else {
                    setShowChess(true);
                }
                break;
        }
    };

    const handleRoll = () => {
        conquest.rollMapDice();
    };

    // Group nodes by tier to render them as rows (bottom to top visually means high tier at top)
    const renderMapNodes = () => {
        const tiers: Record<number, ConquestNodeData[]> = {};
        CONQUEST_MAP_NODES.forEach(n => {
            if (!tiers[n.tier]) tiers[n.tier] = [];
            tiers[n.tier].push(n);
        });

        // Sort descending so highest tier (boss) is at top of flex column
        const sortedTiers = Object.keys(tiers).map(Number).sort((a, b) => b - a);

        return sortedTiers.map(tier => (
            <div key={`tier-${tier}`} className="map-tier-row">
                {tiers[tier].map(node => {
                    const isCurrent = conquest.currentNodeId === node.id;
                    const isCompleted = conquest.completedNodes.includes(node.id) && !isCurrent;
                    const isReachable = reachableNodes.includes(node.id);

                    // Draw connections to lower tiers if they exist visually (Optional SVG overlay would be better, but CSS lines work)
                    return (
                        <div key={node.id} className="map-node-wrapper">
                            <motion.button
                                className={`map-node ${node.type} ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isReachable ? 'reachable' : ''}`}
                                whileHover={isReachable ? { scale: 1.1 } : {}}
                                whileTap={isReachable ? { scale: 0.95 } : {}}
                                onClick={() => handleNodeClick(node)}
                                disabled={(!isReachable && !isCurrent && !isCompleted) || false}
                                style={{ pointerEvents: ((!isReachable && !isCurrent && !isCompleted) ? 'none' : 'auto') }}
                            >
                                <div className="node-icon">{NODE_ICONS[node.type]}</div>
                                {isCurrent && (
                                    <motion.img
                                        src={heroImage}
                                        alt="Player"
                                        className="player-mini"
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ y: [0, -4, 0], opacity: 1 }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                )}
                            </motion.button>
                            <span className="node-label">{node.label}</span>
                        </div>
                    );
                })}
            </div>
        ));
    };

    return (
        <div className="conquest-spire-container" style={{ backgroundImage: `url(${bgMap})` }}>
            <div className="bg-overlay" />

            {/* Top HUD */}
            <div className="top-hud">
                <div className="hud-left">
                    <img src={heroImage} alt="Hero" className="hud-hero" />
                    <div className="hud-act-info">
                        <h2>Act {conquest.act}</h2>
                        <span>The Dark Road</span>
                    </div>
                </div>
                <div className="hud-resources">
                    <div className="hud-stat gold"><Coins size={14} /> {currency.gold}</div>
                    <div className="hud-stat sigils"><Crown size={14} /> {conquest.sigils}</div>
                </div>
            </div>

            {/* Main Viewport Map */}
            <div className="spire-map-viewport" ref={mapContainerRef}>
                <div className="spire-map-content">
                    {renderMapNodes()}
                </div>
            </div>

            {/* Action Footer */}
            <div className="spire-footer">
                <div className="dice-status">
                    <span>Remaining Rolls: <strong>{conquest.diceRolls}</strong></span>
                    {conquest.activeDiceRoll && (
                        <span className="active-roll">Rolled a {conquest.activeDiceRoll}! Select destination.</span>
                    )}
                </div>
                <button
                    className="roll-dice-btn"
                    onClick={handleRoll}
                    disabled={conquest.diceRolls <= 0 || conquest.activeDiceRoll !== null}
                >
                    <Dice1 size={20} /> ROLL DICE
                </button>
            </div>

            {/* Event Modal */}
            <AnimatePresence>
                {activeEvent && CONQUEST_EVENT_TABLE[activeEvent as keyof typeof CONQUEST_EVENT_TABLE] && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="event-modal map-modal">
                            <h2>{activeEvent}</h2>
                            <p>{CONQUEST_EVENT_TABLE[activeEvent as keyof typeof CONQUEST_EVENT_TABLE].text}</p>
                            <div className="event-options">
                                {CONQUEST_EVENT_TABLE[activeEvent as keyof typeof CONQUEST_EVENT_TABLE].options.map((opt, i) => (
                                    <button key={i} onClick={() => {
                                        if (opt.effect.type === 'gold') conquest.grantSpireReward(opt.effect.gold || 0, 0);
                                        if (opt.effect.type === 'hp_and_sigils') conquest.grantSpireReward(0, opt.effect.sigils || 0); // HP logic needed if implemented
                                        setActiveEvent(null);
                                    }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Treasure Reward Modal */}
            <AnimatePresence>
                {rewardModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="treasure-modal map-modal">
                            <h2>Chest Opened!</h2>
                            <div className="loot-display">
                                <span className="loot-item gold">+{rewardModal.gold} Gold</span>
                                <span className="loot-item sigils">+{rewardModal.sigils} Sigils</span>
                            </div>
                            <button className="continue-btn" onClick={() => setRewardModal(null)}>Continue</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minigames / Shops */}
            <AnimatePresence>
                {showChess && <ChessGame onComplete={() => setShowChess(false)} onClose={() => setShowChess(false)} canPlay={strategy.canPlayChessToday()} />}
            </AnimatePresence>
            <AnimatePresence>
                {showStore && <ConquestStoreUI onClose={() => setShowStore(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showTiles && <ConquestTiles onComplete={() => setShowTiles(false)} onClose={() => setShowTiles(false)} canPlay={strategy.canPlayTilesToday()} canPlayImpossible={strategy.canPlayImpossible()} />}
            </AnimatePresence>

        </div>
    );
};
