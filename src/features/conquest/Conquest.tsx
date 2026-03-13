import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Coins, Tent, Swords, Gem, MessageSquare, Gamepad2, Skull, Flame, Sparkles, AlertTriangle, Heart } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CONQUEST_MAP_NODES, CONQUEST_EVENT_TABLE, CONQUEST_NODE_PREVIEW, type ConquestNodeData } from '../../data/conquest';
import { useHeroImage } from '../../hooks/useHeroImage';
import { ConquestStoreUI } from './ConquestStore';
import { ChessGame } from './ChessGame';
import { ConquestTiles } from './ConquestTiles';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useNavigate } from 'react-router-dom';
import { useBattleStore } from '../../store/useBattleStore';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
import { useInventoryStore, type ItemDef } from '../../store/useInventoryStore';
import { useToastStore } from '../../components/ui/Toast';
import { getConquestRewardPool } from '../../data/rewardTables';
import './Conquest.css';

// AI-generated background
import bgMap from '../../assets/backgrounds/infernal_citadel.png';

const NODE_ICONS: Record<string, React.ReactNode> = {
    start: <Tent size={24} />,
    battle: <Swords size={24} />,
    elite: <Swords className="elite-icon" size={28} color="#ef4444" />,
    treasure: <Gem size={24} />,
    event: <MessageSquare size={24} />,
    minigame: <Gamepad2 size={24} />,
    shop: <Coins size={24} />,
    campfire: <Flame size={24} color="#f97316" />,
    shrine: <Sparkles size={24} color="#fbbf24" />,
    cursed: <AlertTriangle size={24} color="#a855f7" />,
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
    const [showCampfire, setShowCampfire] = useState(false);
    const [showShrine, setShowShrine] = useState(false);
    const [showCursed, setShowCursed] = useState(false);
    const [rewardModal, setRewardModal] = useState<{ gold: number, sigils: number, item?: ItemDef } | null>(null);
    const [hasBounced, setHasBounced] = useState(false); // To handle initial scroll to bottom
    const [hoveredNode, setHoveredNode] = useState<ConquestNodeData | null>(null);

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

    const reachableNodes = conquest.getReachableNodes();

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
            case 'elite':
            case 'boss': {
                const enemies = ['fatigue_wraith', 'chaos_of_clutter', 'sedentary_colossus', 'insomnia_echo', 'stress_phantom'];
                let randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                
                if (node.type === 'boss') randomEnemy = 'shadow_titan';
                useBattleStore.getState().initBattle(randomEnemy, {
                    context: node.type === 'elite' ? 'conquest_elite' : 'conquest',
                    conquestTier: node.tier
                });

                // Set up local navigation to Conquest Battle (which we will build)
                navigate('/conquest/battle');
                break;
            }
            case 'treasure': {
                const passives = getPassiveBonuses();
                const gold = Math.floor(Math.random() * 10) + 5 + passives.gold_bonus;
                const sigils = Math.floor(Math.random() * 2) + 1 + passives.sigil_bonus;
                conquest.grantSpireReward(gold, sigils);

                // 15% chance for a low-rarity dynamic drop
                let droppedItem: ItemDef | undefined;
                if (Math.random() < 0.15) {
                    const pool = getConquestRewardPool();
                    if (pool.length > 0) {
                        droppedItem = pool[Math.floor(Math.random() * pool.length)];
                        useInventoryStore.getState().addItem(droppedItem.id, 1);

                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `New Item Obtained: ${droppedItem.icon} ${droppedItem.name} `,
                            duration: 4000
                        });
                    }
                }

                setRewardModal({ gold, sigils, item: droppedItem });
                break;
            }
            case 'event':
                setActiveEvent(node.label);
                break;
            case 'shop':
                setShowStore(true);
                break;
            case 'campfire':
                setShowCampfire(true);
                break;
            case 'shrine':
                setShowShrine(true);
                break;
            case 'cursed':
                setShowCursed(true);
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
            <div key={`tier - ${tier} `} className="map-tier-row">
                {tiers[tier].map(node => {
                    const isCurrent = conquest.currentNodeId === node.id;
                    const isCompleted = conquest.completedNodes.includes(node.id) && !isCurrent;
                    const isReachable = reachableNodes.includes(node.id);

                    return (
                        <div key={node.id} className="map-node-wrapper">
                            <motion.button
                                className={`map-node ${node.type} ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isReachable ? 'reachable' : ''}`}
                                whileHover={isReachable ? { scale: 1.1 } : {}}
                                whileTap={isReachable ? { scale: 0.95 } : {}}
                                onClick={() => handleNodeClick(node)}
                                onMouseEnter={() => setHoveredNode(node)}
                                onMouseLeave={() => setHoveredNode(null)}
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
                            
                            {/* Hover Tooltip */}
                            <AnimatePresence>
                                {hoveredNode?.id === node.id && (
                                    <motion.div 
                                        className="node-preview-tooltip"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <div className="preview-type">{node.type.toUpperCase()}</div>
                                        <div className="preview-risk">Risk: {CONQUEST_NODE_PREVIEW[node.type].risk}</div>
                                        <div className="preview-reward">{CONQUEST_NODE_PREVIEW[node.type].reward}</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
                        <h2>Act {conquest.act} <span className="floor-badge">Floor {conquest.runFloor}</span></h2>
                        <div className="hud-hp-bar">
                            <div className="hp-fill" style={{ width: `${(conquest.runHP / Math.max(1, conquest.runMaxHP)) * 100}%`, background: conquest.runHP < 30 ? '#ef4444' : '#22c55e' }} />
                            <div className="hp-text"><Heart size={10}/> {Math.floor(conquest.runHP)} / {conquest.runMaxHP}</div>
                        </div>
                    </div>
                </div>
                <div className="hud-resources">
                    {conquest.runBuffs.map(b => (
                        <div key={b.id} className="run-buff-chip" title={b.label}>
                            {b.type === 'strength' ? '⚔️' : b.type === 'defense' ? '🛡️' : b.type === 'curse' ? '☠️' : '✨'}
                        </div>
                    ))}
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
                <div className="dice-status" style={{ textAlign: 'center', width: '100%' }}>
                    <span className="active-roll">
                        {hoveredNode ? hoveredNode.description : 'Select your next destination.'}
                    </span>
                </div>
            </div>

            {/* Run Complete Overlay */}
            <AnimatePresence>
                {conquest.runComplete !== 'none' && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="run-complete-modal map-modal">
                            <h2>{conquest.runComplete === 'victory' ? 'VICTORY Achieved!' : 'Run Failed'}</h2>
                            <p>You {conquest.runComplete === 'victory' ? 'conquered the map' : 'fell in battle'} on Floor {conquest.runFloor}.</p>
                            <div className="run-stats">
                                <div>Sigils Earned: {conquest.memoryLog.mostSigilsInRun}</div>
                                <div>Best Floor: {conquest.bestFloor}</div>
                                <div>Runs Completed: {conquest.runsCompleted}</div>
                            </div>
                            <button className="continue-btn" onClick={() => {
                                conquest.resetRun();
                                navigate('/dashboard');
                            }}>
                                Return to Dashboard
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Daily Lock Overlay */}
            <AnimatePresence>
                {conquest.isDailyRunLocked() && conquest.runComplete === 'none' && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 100 }}>
                        <div className="run-complete-modal map-modal" style={{ borderColor: '#ef4444' }}>
                            <h2 style={{ color: '#ef4444' }}>Conquest Locked</h2>
                            <p>You have already completed your Conquest run for today. Return tomorrow for another attempt!</p>
                            <button className="continue-btn" onClick={() => navigate('/dashboard')}>
                                Return to Dashboard
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Event Modal */}
            <AnimatePresence>
                {activeEvent && CONQUEST_EVENT_TABLE[activeEvent] && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="event-modal map-modal">
                            <h2>{activeEvent}</h2>
                            <p>{CONQUEST_EVENT_TABLE[activeEvent].text}</p>
                            <div className="event-options">
                                {CONQUEST_EVENT_TABLE[activeEvent].options.map((opt, i) => (
                                    <button key={i} onClick={() => {
                                        if (opt.effect.type === 'gold') conquest.grantSpireReward(opt.effect.gold || 0, 0);
                                        if (opt.effect.type === 'hp_and_sigils') {
                                            conquest.grantSpireReward(0, opt.effect.sigils || 0);
                                            if (opt.effect.hp < 0) conquest.takeDamage(-opt.effect.hp);
                                            else conquest.healHP(opt.effect.hp);
                                        }
                                        if (opt.effect.type === 'heal') conquest.healHP(opt.effect.hp);
                                        if (opt.effect.type === 'damage') conquest.takeDamage(opt.effect.hp);
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

            {/* Campfire Modal */}
            <AnimatePresence>
                {showCampfire && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="campfire-modal map-modal">
                            <h2>Campfire</h2>
                            <p>A warm fire flickers, offering a brief respite.</p>
                            <div className="event-options">
                                <button onClick={() => { conquest.healHP(conquest.runMaxHP / 2); setShowCampfire(false); }}>
                                    <Heart size={16} /> Rest (Restore up to 50% HP)
                                </button>
                                <button onClick={() => { 
                                    conquest.addRunBuff({ id: `buff_${Date.now()}`, type: 'strength', label: 'Sharpened: +10% ATK', amount: 10 });
                                    setShowCampfire(false); 
                                }}>
                                    <Swords size={16} /> Sharpen (+10% ATK Buff)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shrine Modal */}
            <AnimatePresence>
                {showShrine && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="shrine-modal map-modal">
                            <h2>Sacred Shrine</h2>
                            <p>You touch the cold stone and feel a blessing wash over you.</p>
                            <div className="event-options">
                                <button onClick={() => { 
                                    // Modified to grant 15% player power
                                    conquest.addRunBuff({ id: `buff_${Date.now()}`, type: 'strength', label: 'Shrine Blessing: +15% Power', amount: 15 });
                                    conquest.addRunBuff({ id: `buff_${Date.now()}_def`, type: 'defense', label: 'Shrine Blessing: +15% Block', amount: 15 });
                                    setShowShrine(false); 
                                }}>
                                    Accept Blessing
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cursed Modal */}
            <AnimatePresence>
                {showCursed && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="cursed-modal map-modal" style={{ borderColor: '#a855f7' }}>
                            <h2 style={{ color: '#a855f7' }}>Dark Altar</h2>
                            <p>Great power awaits... if you are willing to pay the price.</p>
                            <div className="event-options">
                                <button onClick={() => { 
                                    conquest.takeDamage(20);
                                    conquest.grantSpireReward(100, 20);
                                    setShowCursed(false); 
                                }}>
                                    Sacrifice Blood (-20 HP, +100 Gold, +20 Sigils)
                                </button>
                                <button onClick={() => setShowCursed(false)}>
                                    Leave it be
                                </button>
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
                                {rewardModal.item && (
                                    <span className={`loot-item item-drop rarity-${rewardModal.item.rarity}`}>
                                        Found: {rewardModal.item.icon} {rewardModal.item.name}
                                    </span>
                                )}
                            </div>
                            <button className="continue-btn" onClick={() => setRewardModal(null)}>Continue</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minigames / Shops */}
            <AnimatePresence>
                {showChess && <ChessGame
                onComplete={(result, diff) => {
                    if (result === 'win') {
                        // Chess gold: Easy=5, Medium=15, Hard=30
                        const chessGold = diff === 3 ? 30 : diff === 2 ? 15 : 5;
                        currency.addGold(chessGold);
                    }
                    setShowChess(false);
                }}
                onClose={() => setShowChess(false)}
                canPlay={strategy.canPlayChessToday()}
            />}
            </AnimatePresence>
            <AnimatePresence>
                {showStore && <ConquestStoreUI onClose={() => setShowStore(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showTiles && <ConquestTiles
                onComplete={(result, diff) => {
                    if (result === 'win') {
                        // Tiles gold: D1=5, D2=15, D3=30, D4(Impossible)=50
                        const tilesGold: Record<number, number> = { 1: 5, 2: 15, 3: 30, 4: 50 };
                        currency.addGold(tilesGold[diff] ?? 5);
                    }
                    setShowTiles(false);
                }}
                onClose={() => setShowTiles(false)}
                canPlay={strategy.canPlayTilesToday()}
                canPlayImpossible={strategy.canPlayImpossible()}
            />}
            </AnimatePresence>

        </div>
    );
};
