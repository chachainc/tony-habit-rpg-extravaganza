import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, Map, Package, Zap, Heart, Star } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import type { ConquestCombatResult, ConquestNode, SoldierRole } from '../../store/useConquestStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { ConquestStoreUI } from './ConquestStore';
import { ChessGame } from './ChessGame';
import './Conquest.css';

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
    const [showChess, setShowChess] = useState(false);
    const [showStore, setShowStore] = useState(false);

    const conquest = useConquestStore();
    const strategy = useStrategyStore();

    // Init regions on first mount
    useEffect(() => {
        conquest.initRegions();
    }, []);

    const region = conquest.regions[conquest.currentRegionIdx];
    const totalForce = conquest.getTotalForce();

    const handleAttack = (node: ConquestNode) => {
        const result = conquest.conquestAttack(node.id);
        setCombatResult(result);
        setSelectedNode(node);
        setView('combat');
    };

    const handleChessComplete = (result: 'win' | 'draw' | 'loss') => {
        strategy.recordChessResult(result);
        setShowChess(false);
    };

    // ─── MAP VIEW ───────────────────────────────
    const renderMap = () => {
        if (!region) return <div className="conquest-empty">Loading regions...</div>;

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

                <div className="conquest-node-grid">
                    {region.nodes.map((node) => {
                        const isAccessible = !node.conquered && (
                            node.id === conquest.currentNodeId ||
                            node.connections.some(c => {
                                const cn = region.nodes.find(n => n.id === c);
                                return cn?.conquered;
                            }) ||
                            (conquest.currentNodeId === null && region.nodes.indexOf(node) === 0)
                        );

                        return (
                            <motion.div
                                key={node.id}
                                className={`conquest-node ${node.type} ${node.conquered ? 'conquered' : ''} ${isAccessible ? 'accessible' : ''} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                                whileHover={isAccessible ? { scale: 1.05 } : {}}
                                onClick={() => isAccessible && setSelectedNode(node)}
                            >
                                <div className="node-type-icon">{NODE_TYPE_ICONS[node.type]}</div>
                                <div className="node-name">{node.name}</div>
                                <div className="node-terrain">{TERRAIN_ICONS[node.terrain]} {node.terrain}</div>
                                {!node.conquered && (
                                    <div className="node-force">⚔️ {node.enemyForce}</div>
                                )}
                                {node.conquered && <div className="node-conquered-badge">✅</div>}
                                {!node.conquered && !isAccessible && <div className="node-locked">🔒</div>}
                            </motion.div>
                        );
                    })}
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
                                <span>Reward: 🔱 {selectedNode.sigils} Sigils</span>
                                <span>Terrain Mod: {conquest.getTerrainModifier(selectedNode.terrain) >= 0 ? '+' : ''}{conquest.getTerrainModifier(selectedNode.terrain)}</span>
                                <span>Morale Mod: {conquest.getMoraleModifier() >= 0 ? '+' : ''}{conquest.getMoraleModifier()}</span>
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
        if (!combatResult) return null;

        return (
            <div className="conquest-combat-result">
                <motion.div
                    className={`combat-result-card ${combatResult.won ? 'victory' : 'defeat'}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <h2>{combatResult.won ? '⚔️ VICTORY!' : '💀 DEFEAT'}</h2>

                    <div className="dice-display">
                        <div className="dice-section">
                            <span className="dice-label">Your Roll</span>
                            <span className="dice-value">{combatResult.rolls.attacker}</span>
                        </div>
                        <span className="dice-vs">VS</span>
                        <div className="dice-section">
                            <span className="dice-label">Enemy Roll</span>
                            <span className="dice-value">{combatResult.rolls.defender}</span>
                        </div>
                    </div>

                    <div className="modifier-display">
                        <div className="mod-item">
                            <span>Force</span>
                            <span className={combatResult.modifiers.force >= 0 ? 'positive' : 'negative'}>
                                {combatResult.modifiers.force >= 0 ? '+' : ''}{combatResult.modifiers.force}
                            </span>
                        </div>
                        <div className="mod-item">
                            <span>Terrain</span>
                            <span className={combatResult.modifiers.terrain >= 0 ? 'positive' : 'negative'}>
                                {combatResult.modifiers.terrain >= 0 ? '+' : ''}{combatResult.modifiers.terrain}
                            </span>
                        </div>
                        <div className="mod-item">
                            <span>Morale</span>
                            <span className={combatResult.modifiers.morale >= 0 ? 'positive' : 'negative'}>
                                {combatResult.modifiers.morale >= 0 ? '+' : ''}{combatResult.modifiers.morale}
                            </span>
                        </div>
                        <div className="mod-item">
                            <span>Recon</span>
                            <span className="positive">+{combatResult.modifiers.recon}</span>
                        </div>
                    </div>

                    <div className="result-details">
                        {combatResult.won && (
                            <div className="result-row reward">🔱 +{combatResult.sigilsEarned} Sigils</div>
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
                </motion.div>
            </div>
        );
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
                        <div key={soldier.id} className={`soldier-card rank-${soldier.rank.toLowerCase().replace(' ', '-')}`}>
                            <div className="soldier-rank-badge">{soldier.rank}</div>
                            <div className="soldier-name">{ROLE_ICONS[soldier.role]} {soldier.name}</div>
                            <div className="soldier-stats">
                                <span>ATK: {soldier.atk}</span>
                                <span>DEF: {soldier.def}</span>
                                <span>Lv {soldier.level}</span>
                            </div>
                            <div className="soldier-role">{soldier.role}</div>
                            <button
                                className="upgrade-rank-btn"
                                onClick={() => conquest.upgradeSoldierRank(soldier.id)}
                                disabled={soldier.rank === 'Warden'}
                            >
                                {soldier.rank === 'Warden' ? 'MAX RANK' : '⬆ Upgrade'}
                            </button>
                        </div>
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
        <div className="conquest-container">
            {/* Top Navigation */}
            <div className="conquest-top-nav">
                <button className={`cq-nav-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
                    <Map size={16} /> Map
                </button>
                <button className={`cq-nav-btn ${view === 'soldiers' ? 'active' : ''}`} onClick={() => setView('soldiers')}>
                    <Users size={16} /> Army
                </button>
                <button className="cq-nav-btn" onClick={() => setShowChess(true)}>
                    <Star size={16} /> Chess {strategy.canPlayChessToday() && <span className="chess-dot">●</span>}
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
        </div>
    );
};
