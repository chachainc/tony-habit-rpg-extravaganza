import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, Map, Package, Zap, Heart } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import type { ConquestCombatResult, ConquestNode, SoldierRole } from '../../store/useConquestStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { ConquestStoreUI } from './ConquestStore';
import { ChessGame } from './ChessGame';
import { ConquestTiles } from './ConquestTiles';
import type { Difficulty } from './tileConfig';
import { SoldierCard } from './SoldierCard';
import './Conquest.css';

// AI-generated background
import sandCombatBg from '../../assets/backgrounds/infernal_citadel.png';

type ConquestView = 'map' | 'combat' | 'soldiers' | 'store' | 'chess';

const TERRAIN_ICONS: Record<string, string> = {
    plains: '🌾', swamp: '🐊', mountain: '⛰️', plague: '☠️',
    night: '🌙', market: '🏪', forest: '🌲',
};

const NODE_TYPE_ICONS: Record<string, string> = {
    normal: '⬡', resource: '💎', elite: '⚔️', boss: '👑', stronghold: '🏰',
};

const ROLE_ICONS: Record<SoldierRole, string> = {
    scout: '🔭', morale: '📯', siege: '🏗️', healer: '💊',
};

const SOLDIER_NAMES = [
    'Marcus', 'Elena', 'Theron', 'Sybil', 'Aldric', 'Renna',
    'Gareth', 'Lyra', 'Daven', 'Isolde', 'Brecht', 'Kira',
];

export const Conquest = () => {
    const [view, setView] = useState<ConquestView>('map');
    const [selectedNode, setSelectedNode] = useState<ConquestNode | null>(null);
    const [combatResult, setCombatResult] = useState<ConquestCombatResult | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [showChess, setShowChess] = useState(false);
    const [showStore, setShowStore] = useState(false);
    const [showTiles, setShowTiles] = useState(false);

    const [rollingFaces, setRollingFaces] = useState<{ attacker: number[]; defender: number[] }>({ attacker: [], defender: [] });

    const conquest = useConquestStore();
    const strategy = useStrategyStore();

    // Init regions on first mount
    useEffect(() => {
        conquest.initRegions();
    }, []);

    const region = conquest.regions[conquest.currentRegionIdx];
    const totalForce = conquest.getTotalForce();

    const handleAttack = (node: ConquestNode) => {
        setSelectedNode(node);
        setView('combat');
        setIsRolling(true);
        setCombatResult(null);

        // Start rolling animation — rapid face cycling
        const diceCount = conquest.diceCount;
        const rollInterval = setInterval(() => {
            setRollingFaces({
                attacker: Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1),
                defender: Array.from({ length: 2 }, () => Math.floor(Math.random() * 6) + 1),
            });
        }, 80);

        // Stop rolling and show result after 1.8s
        setTimeout(() => {
            clearInterval(rollInterval);
            const result = conquest.conquestAttack(node.id);
            setRollingFaces({ attacker: result.rolls.attackerDice, defender: result.rolls.defenderDice });
            setCombatResult(result);
            setIsRolling(false);
        }, 1800);
    };

    const handleChessComplete = (result: 'win' | 'draw' | 'loss', difficulty: 1 | 2 | 3) => {
        strategy.recordChessResult(result, difficulty);
        setShowChess(false);
    };

    const handleTilesComplete = (result: 'win' | 'loss', difficulty: Difficulty) => {
        strategy.recordTilesResult(result, difficulty);
    };

    // Die face display helper
    const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    // ─── MAP VIEW ───────────────────────────────
    const renderMap = () => {
        if (!region) return <div className="conquest-empty">Loading regions...</div>;

        // Find the army position (rightmost conquered node index)
        const conqueredIndices = region.nodes
            .map((n, i) => (n.conquered ? i : -1))
            .filter(i => i >= 0);
        const armyIndex = conqueredIndices.length > 0 ? Math.max(...conqueredIndices) : -1;

        return (
            <div className="conquest-map-view">
                <div className="conquest-map-header">
                    <div className="region-info">
                        <h2>📍 {region.name}</h2>
                        <div className="region-progress">
                            {region.nodes.filter(n => n.conquered).length} / {region.nodes.length} Nodes Conquered
                        </div>
                    </div>
                    <div className="conquest-stats-bar">
                        <div className="cq-stat">
                            <Crown size={14} /> <span>{conquest.sigils} Sigils</span>
                        </div>
                        <div className="cq-stat">
                            <Users size={14} /> <span>{conquest.soldiers.length}/{conquest.maxTeamSize} Soldiers</span>
                        </div>
                        <div className="cq-stat">
                            <Heart size={14} /> <span>Morale: {conquest.morale}/100</span>
                        </div>
                        <div className="cq-stat">
                            <Zap size={14} /> <span>Force: {totalForce}</span>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scrolling Path */}
                <div className="conquest-path-scroll">
                    <div className="conquest-path-track">
                        {/* SVG connecting line */}
                        <svg className="conquest-path-line" preserveAspectRatio="none">
                            <line
                                x1="0" y1="50%"
                                x2="100%" y2="50%"
                                stroke="rgba(139,92,246,0.25)"
                                strokeWidth="3"
                                strokeDasharray="8,6"
                            />
                            {/* Conquered progress line */}
                            {armyIndex >= 0 && (
                                <line
                                    x1="0" y1="50%"
                                    x2={`${((armyIndex + 1) / region.nodes.length) * 100}%`} y2="50%"
                                    stroke="rgba(34,197,94,0.6)"
                                    strokeWidth="3"
                                />
                            )}
                        </svg>

                        {region.nodes.map((node, idx) => {
                            const isAccessible = !node.conquered && (
                                node.id === conquest.currentNodeId ||
                                node.connections.some(c => {
                                    const cn = region.nodes.find(n => n.id === c);
                                    return cn?.conquered;
                                }) ||
                                (conquest.currentNodeId === null && idx === 0)
                            );
                            const isArmy = idx === armyIndex;

                            return (
                                <motion.div
                                    key={node.id}
                                    className={`conquest-path-node ${node.type} ${node.conquered ? 'conquered' : ''} ${isAccessible ? 'accessible' : ''} ${selectedNode?.id === node.id ? 'selected' : ''} ${node.isBoss ? 'boss-node' : ''}`}
                                    whileHover={isAccessible ? { scale: 1.12, y: -4 } : {}}
                                    onClick={() => isAccessible && setSelectedNode(node)}
                                >
                                    {/* Army marker */}
                                    {isArmy && (
                                        <motion.div
                                            className="army-marker"
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            ⚔️
                                        </motion.div>
                                    )}
                                    <div className="path-node-icon">{NODE_TYPE_ICONS[node.type]}</div>
                                    <div className="path-node-name">{node.name}</div>
                                    <div className="path-node-terrain">{TERRAIN_ICONS[node.terrain]}</div>
                                    {!node.conquered && (
                                        <div className="path-node-force">⚔️ {node.enemyForce}</div>
                                    )}
                                    {node.conquered && <div className="path-node-check">✅</div>}
                                    {!node.conquered && !isAccessible && <div className="path-node-lock">🔒</div>}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Node Detail */}
                <AnimatePresence>
                    {selectedNode && !selectedNode.conquered && (
                        <motion.div
                            className="node-detail-panel"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <h3>{NODE_TYPE_ICONS[selectedNode.type]} {selectedNode.name}</h3>
                            <div className="node-detail-stats">
                                <span>Terrain: {TERRAIN_ICONS[selectedNode.terrain]} {selectedNode.terrain}</span>
                                <span>Enemy Force: ⚔️ {selectedNode.enemyForce}</span>
                                <span>Your Force: 💪 {totalForce}</span>
                                <span>Reward: 🪙 {selectedNode.goldReward || 0} Gold{selectedNode.gemReward ? ` + 💎 ${selectedNode.gemReward} Gems` : ''}</span>
                                <span>Terrain Mod: {conquest.getTerrainModifier(selectedNode.terrain) >= 0 ? '+' : ''}{conquest.getTerrainModifier(selectedNode.terrain)}</span>
                                <span>Morale Mod: {conquest.getMoraleModifier() >= 0 ? '+' : ''}{conquest.getMoraleModifier()}</span>
                                <span>🎲 Dice: {conquest.diceCount}d6 vs 2d6</span>
                            </div>
                            <div className="node-detail-actions">
                                <button className="cq-attack-btn" onClick={() => handleAttack(selectedNode)}>
                                    ⚔️ ATTACK
                                </button>
                                <button className="cq-cancel-btn" onClick={() => setSelectedNode(null)}>
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // ─── COMBAT RESULT VIEW ─────────────────────
    const renderCombatResult = () => {
        const displayFaces = isRolling ? rollingFaces : (combatResult ? { attacker: combatResult.rolls.attackerDice, defender: combatResult.rolls.defenderDice } : rollingFaces);

        if (isRolling || combatResult) {
            return (
                <div className="conquest-combat-result">
                    <motion.div
                        className={`combat-result-card ${isRolling ? 'rolling-card' : combatResult?.won ? 'victory' : 'defeat'}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <h2>{isRolling ? '⚔️ ENGAGING ENEMY...' : combatResult?.won ? '⚔️ VICTORY!' : '💀 DEFEAT'}</h2>

                        {/* Animated Dice Section */}
                        <div className="dice-rolling-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem 0' }}>
                            {/* Attacker Dice */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Your Roll ({conquest.diceCount}d6)</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {(displayFaces.attacker || []).map((face, i) => (
                                        <motion.div
                                            key={i}
                                            animate={isRolling ? { rotate: [0, 360], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
                                            transition={isRolling ? { duration: 0.3, repeat: Infinity, delay: i * 0.05 } : { duration: 0.3 }}
                                            style={{
                                                fontSize: '2rem',
                                                width: 48,
                                                height: 48,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: isRolling ? 'rgba(96,165,250,0.15)' : 'rgba(96,165,250,0.25)',
                                                border: `2px solid ${isRolling ? 'rgba(96,165,250,0.3)' : 'rgba(96,165,250,0.6)'}`,
                                                borderRadius: '0.5rem',
                                            }}
                                        >
                                            {DICE_FACES[face] || '🎲'}
                                        </motion.div>
                                    ))}
                                    {!isRolling && combatResult && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.3rem', fontSize: '1.1rem', color: '#60a5fa', fontWeight: 800 }}>
                                            = {combatResult.rolls.attacker}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#94a3b8' }}>VS</div>

                            {/* Defender Dice */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Enemy Roll (2d6)</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                                    {(displayFaces.defender || []).map((face, i) => (
                                        <motion.div
                                            key={i}
                                            animate={isRolling ? { rotate: [0, -360], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
                                            transition={isRolling ? { duration: 0.3, repeat: Infinity, delay: i * 0.05 } : { duration: 0.3 }}
                                            style={{
                                                fontSize: '2rem',
                                                width: 48,
                                                height: 48,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: isRolling ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.25)',
                                                border: `2px solid ${isRolling ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.6)'}`,
                                                borderRadius: '0.5rem',
                                            }}
                                        >
                                            {DICE_FACES[face] || '🎲'}
                                        </motion.div>
                                    ))}
                                    {!isRolling && combatResult && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.3rem', fontSize: '1.1rem', color: '#f87171', fontWeight: 800 }}>
                                            = {combatResult.rolls.defender}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isRolling && <p className="rolling-text">Calculating Force & Morale...</p>}

                        {!isRolling && combatResult && (
                            <>
                                {/* Math Breakdown */}
                                <div style={{
                                    background: 'rgba(15,23,42,0.6)',
                                    border: '1px solid rgba(148,163,184,0.15)',
                                    borderRadius: '0.75rem',
                                    padding: '0.75rem',
                                    margin: '0.5rem 0',
                                    fontSize: '0.8rem',
                                    color: '#94a3b8',
                                    textAlign: 'center',
                                    lineHeight: 1.8,
                                }}>
                                    <div>
                                        <span style={{ color: '#60a5fa' }}>{combatResult.rolls.attacker}</span>
                                        {' + '}
                                        <span style={{ color: combatResult.modifiers.force >= 0 ? '#34d399' : '#f87171' }}>{combatResult.modifiers.force >= 0 ? '+' : ''}{combatResult.modifiers.force} force</span>
                                        {' + '}
                                        <span style={{ color: combatResult.modifiers.terrain >= 0 ? '#34d399' : '#f87171' }}>{combatResult.modifiers.terrain >= 0 ? '+' : ''}{combatResult.modifiers.terrain} terrain</span>
                                        {' + '}
                                        <span style={{ color: combatResult.modifiers.morale >= 0 ? '#34d399' : '#f87171' }}>{combatResult.modifiers.morale >= 0 ? '+' : ''}{combatResult.modifiers.morale} morale</span>
                                        {' + '}
                                        <span style={{ color: '#34d399' }}>+{combatResult.modifiers.recon} recon</span>
                                        {' = '}
                                        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{combatResult.rolls.attacker + combatResult.modifiers.force + combatResult.modifiers.terrain + combatResult.modifiers.morale + combatResult.modifiers.recon}</span>
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                        vs Enemy: <span style={{ color: '#f87171', fontWeight: 700 }}>{combatResult.rolls.defender}</span>
                                    </div>
                                </div>

                                <div className="result-details">
                                    {combatResult.won && combatResult.sigilsEarned > 0 && (
                                        <div className="result-row reward">🔱 +{combatResult.sigilsEarned} Sigils</div>
                                    )}
                                    {combatResult.won && combatResult.goldEarned > 0 && (
                                        <div className="result-row reward">🪙 +{combatResult.goldEarned} Gold</div>
                                    )}
                                    {combatResult.won && combatResult.gemsEarned > 0 && (
                                        <div className="result-row reward">💎 +{combatResult.gemsEarned} Gems</div>
                                    )}
                                    {combatResult.troopsLost > 0 && (
                                        <div className="result-row loss">☠️ Lost {combatResult.troopsLost} soldier(s)</div>
                                    )}
                                    <div className={`result-row ${combatResult.moraleChange >= 0 ? 'reward' : 'loss'}`}>
                                        ❤️ Morale {combatResult.moraleChange >= 0 ? '+' : ''}{combatResult.moraleChange}
                                    </div>
                                </div>

                                <button className="cq-continue-btn" onClick={() => {
                                    setCombatResult(null);
                                    setSelectedNode(null);
                                    setView('map');
                                }}>
                                    Continue
                                </button>
                            </>
                        )}
                    </motion.div>
                </div>
            );
        }

        return null;
    };

    // ─── SOLDIERS VIEW ──────────────────────────
    const renderSoldiers = () => {
        const roles: SoldierRole[] = ['scout', 'morale', 'siege', 'healer'];

        return (
            <div className="conquest-soldiers-view">
                <div className="soldiers-header">
                    <h2>🛡️ Army Roster</h2>
                    <div className="soldiers-summary">
                        {conquest.soldiers.length}/{conquest.maxTeamSize} Soldiers • Army Bonus: +{Math.round(conquest.getArmyBonus() * 100)}%
                    </div>
                </div>

                {conquest.soldiers.length < conquest.maxTeamSize && (
                    <div className="recruit-section">
                        <h3>Recruit New Soldier (30 Sigils)</h3>
                        <div className="recruit-options">
                            {roles.map(role => (
                                <button
                                    key={role}
                                    className="recruit-btn"
                                    onClick={() => {
                                        const name = SOLDIER_NAMES[Math.floor(Math.random() * SOLDIER_NAMES.length)];
                                        conquest.recruitSoldier(name, role);
                                    }}
                                    disabled={conquest.sigils < 30}
                                >
                                    {ROLE_ICONS[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="soldiers-grid">
                    {conquest.soldiers.map(soldier => (
                        <SoldierCard
                            key={soldier.id}
                            soldier={soldier}
                            onAction={() => conquest.upgradeSoldierRank(soldier.id)}
                            actionLabel={soldier.rank === 'Warden' ? 'MAX RANK' : '⬆ Upgrade'}
                            actionDisabled={soldier.rank === 'Warden'}
                        />
                    ))}
                    {conquest.soldiers.length === 0 && (
                        <div className="no-soldiers">No soldiers recruited yet. Visit the store to recruit!</div>
                    )}
                </div>
            </div>
        );
    };

    // ─── MAIN RENDER ────────────────────────────
    return (
        <div
            className="conquest-container has-bg"
            style={{ backgroundImage: `url(${sandCombatBg})` }}
        >
            <div className="conquest-bg-overlay" />

            {/* Top Navigation */}
            <div className="conquest-top-nav">
                <button className="cq-nav-btn cq-chess-btn" onClick={() => setShowChess(true)}>
                    ♟️ Chess {strategy.canPlayChessToday() && <span className="chess-dot">●</span>}
                </button>
                <button className="cq-nav-btn cq-chess-btn" onClick={() => setShowTiles(true)}>
                    🎴 Tiles {strategy.canPlayTilesToday() && <span className="chess-dot">●</span>}
                </button>
                <button className={`cq-nav-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
                    <Map size={16} /> Map
                </button>
                <button className={`cq-nav-btn ${view === 'soldiers' ? 'active' : ''}`} onClick={() => setView('soldiers')}>
                    <Users size={16} /> Army
                </button>
                <button className="cq-nav-btn" onClick={() => setShowStore(true)}>
                    <Package size={16} /> Store
                </button>
                <div className="cq-nav-sigils">
                    <Crown size={14} /> {conquest.sigils}
                </div>
            </div>

            {/* Main Content */}
            <div className="conquest-content">
                {view === 'map' && renderMap()}
                {view === 'combat' && renderCombatResult()}
                {view === 'soldiers' && renderSoldiers()}
            </div>

            {/* Chess Modal */}
            <AnimatePresence>
                {showChess && (
                    <ChessGame
                        onComplete={handleChessComplete}
                        onClose={() => setShowChess(false)}
                        canPlay={strategy.canPlayChessToday()}
                    />
                )}
            </AnimatePresence>

            {/* Store Modal */}
            <AnimatePresence>
                {showStore && (
                    <ConquestStoreUI onClose={() => setShowStore(false)} />
                )}
            </AnimatePresence>

            {/* Tiles Modal */}
            <AnimatePresence>
                {showTiles && (
                    <ConquestTiles
                        onComplete={handleTilesComplete}
                        onClose={() => setShowTiles(false)}
                        canPlay={strategy.canPlayTilesToday()}
                        canPlayImpossible={strategy.canPlayImpossible()}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
