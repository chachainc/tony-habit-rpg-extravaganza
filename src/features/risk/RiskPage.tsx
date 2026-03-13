import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useRiskStore, RISK_CARDS, REGIONS, type TerritoryNode, type RegionId, type RiskBattleResult, type RiskCardId } from '../../store/useRiskStore';
import { useConquestStore } from '../../store/useConquestStore';
import { Map as MapIcon, ArrowLeft, Swords, TrendingUp, X, ShoppingCart, HelpCircle } from 'lucide-react';
import './RiskPage.css';

// Map canvas dimensions (pixels)
const CANVAS_W = 1200;
const CANVAS_H = 900;

const NODE_TYPE_STYLE: Record<string, { border: string; glow: string; icon: string }> = {
    combat:   { border: '#64748b', glow: '0 0 8px rgba(100,116,139,0.5)',   icon: '⚔️' },
    elite:    { border: '#f59e0b', glow: '0 0 14px rgba(245,158,11,0.6)',  icon: '⭐' },
    boss:     { border: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.8)',   icon: '💀' },
    shop:     { border: '#10b981', glow: '0 0 14px rgba(16,185,129,0.6)', icon: '🛒' },
    treasure: { border: '#a78bfa', glow: '0 0 14px rgba(167,139,250,0.5)', icon: '💎' },
    event:    { border: '#38bdf8', glow: '0 0 10px rgba(56,189,248,0.5)', icon: '❓' },
};

export const RiskPage = () => {
    const navigate = useNavigate();
    const risk = useRiskStore();
    const conquest = useConquestStore();

    // Pannable map state
    const viewportRef = useRef<HTMLDivElement>(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
    const isPanning = useRef(false);

    // UI state
    const [selectedNode, setSelectedNode] = useState<TerritoryNode | null>(null);
    const [battleResult, setBattleResult] = useState<RiskBattleResult | null>(null);
    const [showCardHelp, setShowCardHelp] = useState(false);
    const [justConqueredRegion, setJustConqueredRegion] = useState<RegionId | null>(null);
    const [showCardShop, setShowCardShop] = useState(false);

    useEffect(() => {
        risk.initializeMap();
        // Start panned near bottom-center (where start node is)
        if (viewportRef.current) {
            const vw = viewportRef.current.clientWidth;
            const vh = viewportRef.current.clientHeight;
            setPanOffset({ x: -(CANVAS_W * 0.45) + vw / 2, y: -(CANVAS_H * 0.80) + vh / 2 });
        }
    }, []);

    // Pointer pan handlers
    const onPointerDown = (e: React.PointerEvent) => {
        isPanning.current = false;
        panStart.current = { px: e.clientX, py: e.clientY, ox: panOffset.x, oy: panOffset.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!panStart.current) return;
        const dx = e.clientX - panStart.current.px;
        const dy = e.clientY - panStart.current.py;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isPanning.current = true;
        if (!isPanning.current) return;
        const vw = viewportRef.current?.clientWidth ?? 0;
        const vh = viewportRef.current?.clientHeight ?? 0;
        const minX = vw - CANVAS_W;
        const minY = vh - CANVAS_H;
        setPanOffset({
            x: Math.min(0, Math.max(minX, panStart.current.ox + dx)),
            y: Math.min(0, Math.max(minY, panStart.current.oy + dy)),
        });
    };

    const onPointerUp = () => { panStart.current = null; };

    const handleNodeTap = (node: TerritoryNode) => {
        if (isPanning.current) return;
        setSelectedNode(node);
        setBattleResult(null);
    };

    const handleAttack = (nodeId: string) => {
        const prev = risk.getActiveRegionBonuses();
        const result = risk.resolveRiskBattle(nodeId);
        if (!result) return;
        setBattleResult(result);

        if (result.success) {
            const next = useRiskStore.getState().getActiveRegionBonuses();
            const newRegion = next.find(r => !prev.includes(r));
            if (newRegion) {
                setJustConqueredRegion(newRegion);
                setTimeout(() => setJustConqueredRegion(null), 4000);
            }
            // Update selected node to reflect new owner
            setSelectedNode(useRiskStore.getState().mapNodes[nodeId]);
        }
    };

    const activeRegions = risk.getActiveRegionBonuses();
    const allOwned = Object.keys(risk.mapNodes).length > 0 && Object.values(risk.mapNodes).every(n => n.owner === 'player');

    const getNodeColor = (node: TerritoryNode) => {
        if (node.owner === 'player') return '#10b981';
        return NODE_TYPE_STYLE[node.nodeType]?.border ?? '#64748b';
    };

    const isAttackable = (node: TerritoryNode) =>
        node.owner === 'enemy' && node.neighbors.some(n => risk.mapNodes[n]?.owner === 'player');

    const isLocked = (node: TerritoryNode) =>
        node.owner === 'enemy' && !isAttackable(node) && node.id !== 'vp1';

    return (
        <div className="risk-page">
            {/* ── Compact Header ── */}
            <div className="risk-header-compact">
                <button className="risk-back" onClick={() => navigate('/combat')}>
                    <ArrowLeft size={18} /> Back
                </button>
                <span className="risk-title-compact"><MapIcon size={16} /> Risk Mode</span>
                <div className="risk-header-right">
                    <span className="risk-stat-chip">🔱 {conquest.sigils}</span>
                    <span className="risk-stat-chip">⚔️ {risk.playerSoldiers} soldiers</span>
                    {activeRegions.length > 0 && (
                        <span className="risk-stat-chip" style={{ color: '#10b981' }}>✨ {activeRegions.length} Region{activeRegions.length > 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>

            <div className="risk-content">
                {/* ── Army Panel ── */}
                <div className="risk-army-panel">
                    <div className="army-info">
                        <span className="army-label">⚔️ Army: <strong>{risk.getSoldierLabel(risk.playerSoldiers)}</strong> ({risk.playerSoldiers} soldier{risk.playerSoldiers !== 1 ? 's' : ''})</span>
                        {risk.playerSoldiers < 2 && (
                            <span className="army-hint">Need 2+ soldiers to advance safely</span>
                        )}
                    </div>
                    <button
                        className="hire-btn"
                        onClick={() => { if (!risk.buySoldier()) alert('Need 10 Sigils to hire a soldier'); }}
                        disabled={conquest.sigils < 10}
                    >
                        + Hire (10 🔱)
                    </button>
                </div>

                {/* ── Map ── */}
                <div
                    className="risk-map-viewport"
                    ref={viewportRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {justConqueredRegion && (
                        <div className="region-conquer-toast">
                            🌍 Region Conquered! <strong>{REGIONS[justConqueredRegion].name}</strong>
                            <br /><small>{REGIONS[justConqueredRegion].bonusDescription}</small>
                        </div>
                    )}

                    <div
                        className="risk-map-canvas"
                        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
                    >
                        {/* SVG paths between connected nodes */}
                        <svg className="map-paths-svg" width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {Object.values(risk.mapNodes).flatMap(node =>
                                node.neighbors
                                    .filter(nId => nId > node.id) // avoid drawing twice
                                    .map(nId => {
                                        const nb = risk.mapNodes[nId];
                                        if (!nb) return null;
                                        const x1 = (node.mapX ?? 50) / 100 * CANVAS_W;
                                        const y1 = (node.mapY ?? 50) / 100 * CANVAS_H;
                                        const x2 = (nb.mapX ?? 50) / 100 * CANVAS_W;
                                        const y2 = (nb.mapY ?? 50) / 100 * CANVAS_H;
                                        const bothOwned = node.owner === 'player' && nb.owner === 'player';
                                        return (
                                            <line
                                                key={`${node.id}-${nId}`}
                                                x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke={bothOwned ? 'rgba(16,185,129,0.5)' : 'rgba(100,116,139,0.25)'}
                                                strokeWidth={bothOwned ? 2 : 1}
                                                strokeDasharray={bothOwned ? 'none' : '4 4'}
                                            />
                                        );
                                    })
                            )}
                        </svg>

                        {/* Node pins */}
                        {Object.values(risk.mapNodes).map(node => {
                            const cx = (node.mapX ?? 50) / 100 * CANVAS_W;
                            const cy = (node.mapY ?? 50) / 100 * CANVAS_H;
                            const owned = node.owner === 'player';
                            const attackable = isAttackable(node);
                            const locked = isLocked(node);
                            const style = NODE_TYPE_STYLE[node.nodeType] ?? NODE_TYPE_STYLE.combat;
                            const isSelected = selectedNode?.id === node.id;

                            return (
                                <button
                                    key={node.id}
                                    className={`map-node-pin ${owned ? 'owned' : ''} ${attackable ? 'attackable' : ''} ${locked ? 'locked' : ''} ${isSelected ? 'selected' : ''} node-${node.nodeType}`}
                                    style={{
                                        left: cx,
                                        top: cy,
                                        borderColor: owned ? '#10b981' : getNodeColor(node),
                                        boxShadow: owned ? '0 0 12px rgba(16,185,129,0.6)' : (attackable ? style.glow : 'none'),
                                    }}
                                    onClick={() => handleNodeTap(node)}
                                    disabled={locked}
                                >
                                    <span className="pin-type-icon" style={{ fontSize: '1rem', fontWeight: 900 }}>
                                        {owned ? risk.playerSoldiers : node.soldierCount}
                                    </span>
                                    <span className="pin-name" style={{ marginTop: '2px' }}>{node.name}</span>
                                </button>
                            );
                        })}

                        {/* Ascend panel overlay */}
                        {allOwned && (
                            <div className="risk-ascend-panel" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
                                <h2>Total Conquest!</h2>
                                <p>Ascend to reset the map with harder enemies and gain Sigils.</p>
                                <button className="hire-btn" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
                                    onClick={() => {
                                        useConquestStore.getState().addSigils(10 + risk.ascensionLevel * 5);
                                        risk.resetAndAscendMap();
                                        setBattleResult(null);
                                        setSelectedNode(null);
                                    }}>
                                    <TrendingUp size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                                    Ascend (Gain {10 + risk.ascensionLevel * 5} 🔱)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Cards Panel ── */}
                <div className="risk-cards-panel">
                    <div className="cards-panel-header">
                        <h3>Command Cards ({risk.equippedCards.length}/3 equipped)</h3>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="card-help-btn" onClick={() => setShowCardShop(true)}>
                                <ShoppingCart size={14} /> Buy Cards
                            </button>
                            <button className="card-help-btn" onClick={() => setShowCardHelp(true)}>
                                <HelpCircle size={14} /> Help
                            </button>
                        </div>
                    </div>
                    <p className="cards-explainer">Equip up to 3 cards to gain passive battle bonuses. Cards are permanent once purchased.</p>

                    {/* Equipped slots */}
                    <div className="card-slot-row">
                        {[0, 1, 2].map(i => {
                            const id = risk.equippedCards[i] as RiskCardId | undefined;
                            const def = id ? RISK_CARDS[id] : null;
                            return (
                                <div key={i} className={`card-slot-box ${def ? 'filled' : 'empty'}`}>
                                    {def ? (
                                        <button className="card-slot-inner" onClick={() => risk.unequipCard(id!)} title="Tap to unequip">
                                            <span className="card-icon-lg">{def.icon}</span>
                                            <span className="card-slot-name">{def.name}</span>
                                            <span className="card-slot-badge">{def.category}</span>
                                        </button>
                                    ) : (
                                        <span className="card-slot-empty-label">Empty</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Owned cards — small thumbnails to equip */}
                    {risk.ownedCards.length > 0 && (
                        <div className="owned-cards-section">
                            <h4>Owned ({risk.ownedCards.length})</h4>
                            <div className="owned-card-thumbs">
                                {risk.ownedCards.map(id => {
                                    const def = RISK_CARDS[id];
                                    const isEquipped = risk.equippedCards.includes(id);
                                    const canEquip = !isEquipped && risk.equippedCards.length < 3;
                                    return (
                                        <div key={id} className={`card-thumb ${isEquipped ? 'equipped' : ''}`}>
                                            <span className="card-thumb-icon">{def.icon}</span>
                                            <span className="card-thumb-name">{def.name}</span>
                                            <button
                                                className="card-thumb-btn"
                                                onClick={() => isEquipped ? risk.unequipCard(id) : risk.equipCard(id)}
                                                disabled={!isEquipped && !canEquip}
                                            >
                                                {isEquipped ? 'Unequip' : canEquip ? 'Equip' : 'Full'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {risk.ownedCards.length === 0 && (
                        <p className="cards-empty-hint" style={{ marginTop: '0.5rem' }}>
                            No cards yet. Buy Command Cards for 100 🔱 in the shop.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Node Modal ── */}
            {selectedNode && (
                <div className="risk-node-modal" onClick={() => { setSelectedNode(null); setBattleResult(null); }}>
                    <div className="risk-node-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => { setSelectedNode(null); setBattleResult(null); }}><X size={20} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: selectedNode.owner === 'player' ? '#10b981' : NODE_TYPE_STYLE[selectedNode.nodeType]?.border }}>
                                {selectedNode.owner === 'player' ? risk.playerSoldiers : selectedNode.soldierCount}
                            </span>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', color: selectedNode.owner === 'player' ? '#10b981' : '#fff' }}>
                                    {selectedNode.name}
                                </h2>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {REGIONS[selectedNode.region]?.name} · {selectedNode.nodeType.toUpperCase()}
                                    {selectedNode.trait && selectedNode.trait !== 'none' && ` · ${selectedNode.trait}`}
                                </div>
                            </div>
                        </div>

                        {selectedNode.owner === 'enemy' && selectedNode.nodeType !== 'shop' && (
                            <div className="node-enemy-info">
                                <div className="enemy-soldiers-row">
                                    <span className="enemy-soldier-count">{selectedNode.soldierCount}</span>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{risk.getSoldierLabel(selectedNode.soldierCount)}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>enemy soldiers defending</div>
                                    </div>
                                </div>
                                <div className="dice-preview">
                                    <span>You roll: <strong>{risk.playerSoldiers}d6</strong></span>
                                    <span>They roll: <strong>{selectedNode.soldierCount}d6</strong></span>
                                </div>
                            </div>
                        )}

                        {selectedNode.nodeType === 'shop' && (
                            <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8, marginBottom: '1rem' }}>
                                <p style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>🛒 Supply Post</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {selectedNode.owner === 'player'
                                        ? 'Your garrison controls this supply route.'
                                        : 'Conquer this node to access its market bonus.'}
                                </p>
                            </div>
                        )}

                        {selectedNode.owner === 'player' && (
                            <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '0.75rem' }}>✅ Controlled by your army</div>
                        )}

                        {selectedNode.owner === 'enemy' && selectedNode.nodeType !== 'shop' && (
                            isAttackable(selectedNode) ? (
                                <button className="risk-attack-btn" onClick={() => handleAttack(selectedNode.id)}>
                                    <Swords size={20} /> 🎲 Roll Dice ({risk.playerSoldiers} vs {selectedNode.soldierCount})
                                </button>
                            ) : (
                                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
                                    Conquer an adjacent territory first.
                                </p>
                            )
                        )}

                        {selectedNode.owner === 'enemy' && selectedNode.nodeType === 'shop' && isAttackable(selectedNode) && (
                            <button className="risk-attack-btn" style={{ background: '#10b981' }} onClick={() => handleAttack(selectedNode.id)}>
                                <ShoppingCart size={18} /> Seize Supply Post
                            </button>
                        )}

                        {/* Battle Result */}
                        {battleResult && (
                            <div className={`risk-battle-result modal-result ${battleResult.success ? 'victory' : 'defeat'}`} style={{ marginTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem' }}>{battleResult.success ? '⚔️ VICTORY' : '💀 DEFEAT'}</h4>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    <span>You: {battleResult.playerRolls.join(', ')} → <strong>{battleResult.playerWins} wins</strong></span>
                                    <span>Enemy: {battleResult.enemyRolls.join(', ')} → <strong>{battleResult.enemyWins} wins</strong></span>
                                </div>
                                {battleResult.triggeredEffects.length > 0 && (
                                    <div style={{ fontSize: '0.78rem', color: '#a3e635' }}>
                                        {battleResult.triggeredEffects.map((t, i) => <div key={i}>✦ {t}</div>)}
                                    </div>
                                )}
                                {battleResult.success && battleResult.reward && (
                                    <div className="battle-reward">
                                        {battleResult.reward === 'sigil' ? '🔱 +1 Sigil from resource node' : '🃏 Mystic reward granted'}
                                    </div>
                                )}
                                {!battleResult.success && (
                                    <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.3rem' }}>⚔️ Enemy lost 1 soldier (attrition)</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Card Shop Modal ── */}
            {showCardShop && (
                <div className="risk-node-modal" onClick={() => setShowCardShop(false)}>
                    <div className="risk-node-modal-content" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowCardShop(false)}><X size={20} /></button>
                        <h3 style={{ color: '#f59e0b', marginBottom: '0.25rem' }}>🛒 Command Card Shop</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem' }}>
                            Cards cost 100 🔱 each and are <strong>permanently owned</strong> once purchased.
                        </p>
                        <div className="cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(Object.values(RISK_CARDS)).map(def => {
                                const owned = risk.ownedCards.includes(def.id);
                                const canBuy = !owned && conquest.sigils >= def.cost;
                                return (
                                    <div key={def.id} className={`card-item-rich rarity-common ${owned ? 'owned-card-row' : ''}`} style={{ borderLeftColor: owned ? '#10b981' : '#60a5fa' }}>
                                        <span className="card-icon-lg">{def.icon}</span>
                                        <div className="card-item-info">
                                            <div className="card-item-title">
                                                <span className="card-item-name">{def.name}</span>
                                                <span className="card-rarity-badge" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>{def.category}</span>
                                            </div>
                                            <p className="card-item-effect">{def.effect}</p>
                                        </div>
                                        {owned ? (
                                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>Owned ✓</span>
                                        ) : (
                                            <button
                                                className="card-equip-btn"
                                                disabled={!canBuy}
                                                onClick={() => risk.buyCard(def.id)}
                                                title={!canBuy ? `Need ${def.cost} Sigils` : `Buy for ${def.cost} Sigils`}
                                            >
                                                {def.cost} 🔱
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Card Help Modal ── */}
            {showCardHelp && (
                <div className="risk-node-modal" onClick={() => setShowCardHelp(false)}>
                    <div className="risk-node-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowCardHelp(false)}><X size={20} /></button>
                        <h3 style={{ color: '#f59e0b', marginBottom: '1rem' }}>How Cards & Army Work</h3>
                        <ul className="card-help-list">
                            <li><strong>Soldiers</strong> — each soldier is one die in battle. More soldiers = more dice.</li>
                            <li><strong>Hire soldiers</strong> for 10 Sigils each. Buy sigils by winning Chess, Tiles, Tower Defense waves, and Risk conquests.</li>
                            <li><strong>Battle</strong> — you and the enemy each roll your soldier dice. Highest vs highest wins comparisons. Most wins takes the node.</li>
                            <li><strong>Enemy scaling</strong> — Skirmish (1) → Patrol (2) → Guard (3) → Garrison (4) → Captain (5+) → Boss (10+) → Warlord (15+) → Legendary (20+).</li>
                            <li><strong>Cards</strong> cost 100 Sigils each and are permanently in your collection.</li>
                            <li><strong>Equip up to 3</strong> cards at a time. You can swap freely.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
