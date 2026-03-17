import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Coins, Tent, Swords, Gem, MessageSquare, Gamepad2,
    Skull, Flame, Sparkles, AlertTriangle, Heart, Package, Scroll, Star
} from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
    CONQUEST_MAP_NODES, CONQUEST_EVENT_TABLE, CONQUEST_NODE_PREVIEW,
    CONQUEST_ARTIFACTS, RESOURCE_TILE_REWARDS,
    getEnemiesForTier,
    type ConquestNodeData, type ResourceTileData,
} from '../../data/conquest';
import { useHeroImage } from '../../hooks/useHeroImage';
import { ConquestStoreUI } from './ConquestStore';
import { ChessGame } from './ChessGame';
import { ConquestTiles } from './ConquestTiles';
import { MysteryTile } from './MysteryTile';
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
    start:          <Tent size={24} />,
    battle:         <Swords size={24} />,
    elite:          <Swords className="elite-icon" size={28} color="#ef4444" />,
    treasure:       <Gem size={24} />,
    event:          <MessageSquare size={24} />,
    minigame:       <Gamepad2 size={24} />,
    shop:           <Coins size={24} />,
    campfire:       <Flame size={24} color="#f97316" />,
    shrine:         <Sparkles size={24} color="#fbbf24" />,
    cursed:         <AlertTriangle size={24} color="#a855f7" />,
    boss:           <Skull size={32} />,
    mystery:        <Star size={24} color="#a855f7" />,
    treasure_vault: <Package size={24} color="#eab308" />,
    artifact:       <Scroll size={24} color="#22c55e" />,
    resource:       <Crown size={24} color="#60a5fa" />,
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
    const [showMystery, setShowMystery] = useState(false);
    const [activeEvent, setActiveEvent] = useState<string | null>(null);
    const [showCampfire, setShowCampfire] = useState(false);
    const [showShrine, setShowShrine] = useState(false);
    const [showCursed, setShowCursed] = useState(false);
    const [showArtifact, setShowArtifact] = useState(false);
    const [activeArtifactIdx, setActiveArtifactIdx] = useState<number>(0);
    const [showResource, setShowResource] = useState(false);
    const [activeResourceTile, setActiveResourceTile] = useState<ResourceTileData | null>(null);
    const [resourceChosen, setResourceChosen] = useState(false);
    const [rewardModal, setRewardModal] = useState<{ gold: number; sigils: number; item?: ItemDef } | null>(null);
    const [hasBounced, setHasBounced] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<ConquestNodeData | null>(null);

    useEffect(() => {
        // initMap() is idempotent — safe to call always.
        // startRun() is no longer called on mount; it is called only when the
        // player explicitly starts a run (not locked AND no active run yet).
        if (!conquest.isDailyRunLocked() && !conquest.currentNodeId) {
            conquest.startRun();
        } else {
            conquest.initMap();
        }
    }, []);

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
        if (!reachableNodes.includes(node.id)) return;
        conquest.movePlayer(node.id);

        switch (node.type) {
            case 'battle':
            case 'elite':
            case 'boss': {
                // Pick enemy based on tier
                const pool = getEnemiesForTier(node.tier);
                const randomEnemy = pool.length > 0
                    ? pool[Math.floor(Math.random() * pool.length)].id
                    : 'ash_crawler';
                const enemyId = node.type === 'boss' ? 'the_pathkeeper' : randomEnemy;

                useBattleStore.getState().initBattle(enemyId, {
                    context: node.type === 'elite' ? 'conquest_elite' : node.type === 'boss' ? 'conquest_boss' : 'conquest',
                    conquestTier: node.tier
                });
                navigate('/conquest/battle');
                break;
            }
            case 'treasure_vault': {
                // High-difficulty combat, then big reward
                useBattleStore.getState().initBattle('crystal_warden', {
                    context: 'conquest_vault',
                    conquestTier: node.tier
                });
                conquest.completeTreasureVault();
                navigate('/conquest/battle');
                break;
            }
            case 'treasure': {
                const passives = getPassiveBonuses();
                const gold = Math.floor(Math.random() * 10) + 5 + passives.gold_bonus;
                const sigils = Math.floor(Math.random() * 2) + 1 + passives.sigil_bonus;
                conquest.grantSpireReward(gold, sigils);

                let droppedItem: ItemDef | undefined;
                if (Math.random() < 0.15) {
                    const pool = getConquestRewardPool();
                    if (pool.length > 0) {
                        droppedItem = pool[Math.floor(Math.random() * pool.length)];
                        useInventoryStore.getState().addItem(droppedItem.id, 1);
                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `New Item: ${droppedItem.icon} ${droppedItem.name}`,
                            duration: 4000
                        });
                    }
                }
                setRewardModal({ gold, sigils, item: droppedItem });
                break;
            }
            case 'mystery':
                setShowMystery(true);
                break;
            case 'resource': {
                const tile = RESOURCE_TILE_REWARDS[Math.floor(Math.random() * RESOURCE_TILE_REWARDS.length)];
                setActiveResourceTile(tile);
                setResourceChosen(false);
                setShowResource(true);
                break;
            }
            case 'artifact': {
                const idx = Math.floor(Math.random() * CONQUEST_ARTIFACTS.length);
                setActiveArtifactIdx(idx);
                setShowArtifact(true);
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
                if (node.label === 'Fae Mischief') setShowTiles(true);
                else setShowChess(true);
                break;
        }
    };

    // Apply resource tile (immediate or chosen)
    const applyResourceReward = (rewards: { type: string; amount: number }[], goldBonus?: number, healBonus?: number) => {
        const amp = conquest.rewardAmplifierActive ? 1 : 0;
        rewards.forEach(r => {
            const total = r.amount + amp;
            if (r.type === 'sigil') conquest.addSigils(total);
            else if (r.type === 'balloon') conquest.addBalloons(total);
            else if (r.type === 'shmeckle') conquest.addShmeckles(total);
        });
        if (goldBonus) currency.addGold(goldBonus);
        if (healBonus) conquest.healHP(Math.floor(conquest.runMaxHP * (healBonus / 100)));
        setResourceChosen(true);
        setTimeout(() => { setShowResource(false); setActiveResourceTile(null); }, 1500);
    };

    // Group nodes by tier
    const renderMapNodes = () => {
        const tiers: Record<number, ConquestNodeData[]> = {};
        CONQUEST_MAP_NODES.forEach(n => {
            if (!tiers[n.tier]) tiers[n.tier] = [];
            tiers[n.tier].push(n);
        });
        const sortedTiers = Object.keys(tiers).map(Number).sort((a, b) => b - a);

        return sortedTiers.map(tier => (
            <div key={`tier-${tier}`} className="map-tier-row">
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
                                disabled={!isReachable && !isCurrent && !isCompleted}
                                style={{ pointerEvents: (!isReachable && !isCurrent && !isCompleted) ? 'none' : 'auto' }}
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

                            <AnimatePresence>
                                {hoveredNode?.id === node.id && (
                                    <motion.div
                                        className="node-preview-tooltip"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                    >
                                        <div className="preview-type">{node.type.replace('_', ' ').toUpperCase()}</div>
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
                    {conquest.rewardAmplifierActive && (
                        <div className="run-buff-chip" title="Reward Amplifier: +1 to all rewards">💫</div>
                    )}
                    {conquest.treasureVaultsCompleted > 0 && (
                        <div className="run-buff-chip" title={`Vaults: ${conquest.treasureVaultsCompleted} — Boss gets stronger!`} style={{ color: '#ef4444' }}>
                            🏛️×{conquest.treasureVaultsCompleted}
                        </div>
                    )}
                    <div className="hud-stat gold"><Coins size={14} /> {currency.gold}</div>
                    <div className="hud-stat sigils"><Crown size={14} /> {conquest.sigils}</div>
                    {conquest.balloons > 0 && <div className="hud-stat" style={{ color: '#60a5fa' }}>🎈 {conquest.balloons}</div>}
                    {conquest.shmeckles > 0 && <div className="hud-stat" style={{ color: '#a78bfa' }}>🪙 {conquest.shmeckles}</div>}
                </div>
            </div>

            {/* Main Viewport Map */}
            <div className="spire-map-viewport" ref={mapContainerRef}>
                <div className="spire-map-content">
                    {renderMapNodes()}
                </div>
            </div>

            {/* Footer */}
            <div className="spire-footer">
                <div className="dice-status" style={{ textAlign: 'center', width: '100%' }}>
                    <span className="active-roll">
                        {hoveredNode && hoveredNode.type === 'boss'
                            ? '💀 FINAL BOSS — The Pathkeeper grows stronger with each vault you claimed.'
                            : hoveredNode
                            ? hoveredNode.description
                            : 'Select your next destination.'}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>
                        ⚠️ HP persists across all battles • Campfires restore HP • 1 run per day
                    </div>
                </div>
            </div>

            {/* ── MODALS ── */}

            {/* Run Complete */}
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
                            <button className="continue-btn" onClick={() => { conquest.resetRun(); navigate('/dashboard'); }}>
                                Return to Dashboard
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Daily Lock */}
            <AnimatePresence>
                {conquest.isDailyRunLocked() && conquest.runComplete === 'none' && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 100 }}>
                        <div className="run-complete-modal map-modal" style={{ borderColor: '#ef4444' }}>
                            <h2 style={{ color: '#ef4444' }}>Conquest Locked</h2>
                            <p>You have already completed your Conquest run for today. Return tomorrow for another attempt!</p>
                            <button className="continue-btn" onClick={() => navigate('/')}>Return to Dashboard</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mystery Tile */}
            <AnimatePresence>
                {showMystery && <MysteryTile onClose={() => setShowMystery(false)} />}
            </AnimatePresence>

            {/* Resource Tile */}
            <AnimatePresence>
                {showResource && activeResourceTile && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="map-modal" style={{ borderColor: '#60a5fa', maxWidth: 380 }}>
                            <h2>📦 Resource Reward</h2>
                            {!resourceChosen ? (
                                <>
                                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>{activeResourceTile.label}</p>

                                    {/* Heal/Gold choice node */}
                                    {activeResourceTile.healChoice && (
                                        <div className="event-options">
                                            <button onClick={() => applyResourceReward([], 0, activeResourceTile.healChoice)}>
                                                ❤️ Heal {activeResourceTile.healChoice}% Max HP
                                            </button>
                                            <button onClick={() => applyResourceReward([], activeResourceTile.goldChoice)}>
                                                🪙 +{activeResourceTile.goldChoice} Gold
                                            </button>
                                        </div>
                                    )}

                                    {/* Choice: pick one resource */}
                                    {activeResourceTile.isChoice && !activeResourceTile.healChoice && (
                                        <div className="event-options">
                                            {activeResourceTile.rewards.map((r, i) => (
                                                <button key={i} onClick={() => applyResourceReward([r])}>
                                                    {r.type === 'sigil' ? '🔱' : r.type === 'balloon' ? '🎈' : '🪙'} +{r.amount} {r.type.charAt(0).toUpperCase() + r.type.slice(1)}s
                                                </button>
                                            ))}
                                            {activeResourceTile.goldChoice && (
                                                <button onClick={() => applyResourceReward([], activeResourceTile.goldChoice)}>
                                                    🪙 +{activeResourceTile.goldChoice} Gold
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Instant reward: show all then confirm */}
                                    {!activeResourceTile.isChoice && (
                                        <>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                {activeResourceTile.rewards.map((r, i) => (
                                                    <span key={i} style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: '0.3rem 0.7rem', fontSize: '0.85rem', color: '#93c5fd' }}>
                                                        {r.type === 'sigil' ? '🔱' : r.type === 'balloon' ? '🎈' : '🪙'} +{r.amount}
                                                    </span>
                                                ))}
                                                {conquest.rewardAmplifierActive && (
                                                    <span style={{ color: '#a78bfa', fontSize: '0.75rem', alignSelf: 'center' }}>💫 +1 each (Amplifier)</span>
                                                )}
                                            </div>
                                            <button className="continue-btn" onClick={() => applyResourceReward(activeResourceTile.rewards)}>
                                                Collect
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p style={{ color: '#22c55e', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}>✓ Collected!</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Artifact Tile */}
            <AnimatePresence>
                {showArtifact && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="map-modal" style={{ borderColor: '#22c55e', textAlign: 'center' }}>
                            <h2>📜 Ancient Artifact</h2>
                            <div style={{ fontSize: '3rem', margin: '0.75rem 0' }}>{CONQUEST_ARTIFACTS[activeArtifactIdx].icon}</div>
                            <h3 style={{ color: '#22c55e', margin: '0 0 0.5rem' }}>{CONQUEST_ARTIFACTS[activeArtifactIdx].name}</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{CONQUEST_ARTIFACTS[activeArtifactIdx].description}</p>
                            <button className="continue-btn" onClick={() => {
                                conquest.addRunArtifact(CONQUEST_ARTIFACTS[activeArtifactIdx].id);
                                conquest.addRunBuff({
                                    id: `artifact_${Date.now()}`,
                                    type: 'wealth',
                                    label: `${CONQUEST_ARTIFACTS[activeArtifactIdx].name}: ${CONQUEST_ARTIFACTS[activeArtifactIdx].description}`,
                                    amount: 0,
                                });
                                setShowArtifact(false);
                            }}>
                                <Scroll size={14} style={{ display: 'inline', marginRight: 4 }} /> Claim Artifact
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

            {/* Campfire Modal (updated: 30% heal or +5% ATK) */}
            <AnimatePresence>
                {showCampfire && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="campfire-modal map-modal">
                            <h2>🔥 Campfire</h2>
                            <p>A warm fire flickers, offering a brief respite.</p>
                            <div className="event-options">
                                <button onClick={() => {
                                    conquest.healHP(Math.floor(conquest.runMaxHP * 0.30));
                                    setShowCampfire(false);
                                }}>
                                    <Heart size={16} /> Rest (Restore 30% HP)
                                </button>
                                <button onClick={() => {
                                    conquest.addRunBuff({ id: `buff_${Date.now()}`, type: 'strength', label: 'Focused: +5% ATK', amount: 5 });
                                    setShowCampfire(false);
                                }}>
                                    <Swords size={16} /> Focus (+5% ATK Buff)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shrine Modal (updated: random single blessing) */}
            <AnimatePresence>
                {showShrine && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="shrine-modal map-modal">
                            <h2>✨ Blessing Shrine</h2>
                            <p>You touch the cold stone and feel a blessing wash over you.</p>
                            <div className="event-options">
                                <button onClick={() => {
                                    const blessings: Array<{ type: 'strength' | 'defense'; label: string; amount: number }> = [
                                        { type: 'strength', label: 'Shrine Blessing: +10% ATK',    amount: 10 },
                                        { type: 'defense',  label: 'Shrine Blessing: +10% DEF',    amount: 10 },
                                        { type: 'defense',  label: 'Shrine Blessing: +10% Max HP', amount: 10 },
                                    ];
                                    const pick = blessings[Math.floor(Math.random() * blessings.length)];
                                    conquest.addRunBuff({ id: `shrine_${Date.now()}`, ...pick });
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
                                <button onClick={() => setShowCursed(false)}>Leave it be</button>
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
