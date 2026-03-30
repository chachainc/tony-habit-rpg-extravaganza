import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useRiskStore, RISK_CARDS, REGIONS, type TerritoryNode, type RegionId, type RiskBattleResult, type RiskCardId } from '../../store/useRiskStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { Map as MapIcon, ArrowLeft, Swords, TrendingUp, X, ShoppingCart, HelpCircle } from 'lucide-react';
import './RiskPage.css';

// Map canvas dimensions (pixels)
const CANVAS_W = 1200;
const CANVAS_H = 900;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

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
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);

    // Multi-touch tracking
    const activePointers = useRef<Map<number, React.PointerEvent>>(new Map());
    const initialPinchDist = useRef<number | null>(null);
    const initialPinchScale = useRef<number>(1);
    const lastPanPoint = useRef<{ x: number, y: number } | null>(null);

    // UI state
    const [selectedNode, setSelectedNode] = useState<TerritoryNode | null>(null);
    const [battleResult, setBattleResult] = useState<RiskBattleResult | null>(null);
    const [showCardHelp, setShowCardHelp] = useState(false);
    const [justConqueredRegion, setJustConqueredRegion] = useState<RegionId | null>(null);
    const [showCardShop, setShowCardShop] = useState(false);
    const [committedSoldiers, setCommittedSoldiers] = useState<number>(1);
    const [attackSourceId, setAttackSourceId] = useState<string | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [rollAnimDice, setRollAnimDice] = useState<{p: number[], e: number[]}>({ p: [], e: [] });

    useEffect(() => {
        risk.initializeMap();
        // Start panned near bottom-center (where start node is)
        if (viewportRef.current) {
            const vw = viewportRef.current.clientWidth;
            const vh = viewportRef.current.clientHeight;
            
            // Calculate an ideal initial zoom to fit the map width, capped at 1
            const idealScale = Math.min(1, Math.max(MIN_ZOOM, vw / CANVAS_W));
            
            setPanOffset({ 
                x: -(CANVAS_W * 0.45 * idealScale) + vw / 2, 
                y: -(CANVAS_H * 0.80 * idealScale) + vh / 2,
                scale: idealScale
            });
        }
    }, []);

    // Helper to calculate distance between two pointers
    const getPointersDist = (p1: React.PointerEvent, p2: React.PointerEvent) => {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    };

    // Helper to clamp pan offset based on current scale
    const clampOffset = (x: number, y: number, scale: number) => {
        const vw = viewportRef.current?.clientWidth ?? 0;
        const vh = viewportRef.current?.clientHeight ?? 0;
        
        // Map scaled dimensions
        const scaledW = CANVAS_W * scale;
        const scaledH = CANVAS_H * scale;

        // If scaled map is smaller than viewport, center it or bind it tightly.
        // Usually, we just want to ensure we can't pan the map entirely off screen.
        // A standard approach is limiting x between `vw - scaledW` and `0`.
        // If scaledW < vw, this means minX > 0, which would break the math, so we handle that case.
        const minX = Math.min(0, vw - scaledW);
        const maxX = Math.max(0, vw - scaledW); // Allow centering if smaller

        const minY = Math.min(0, vh - scaledH);
        const maxY = Math.max(0, vh - scaledH);

        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
        };
    };

    // Pointer pan handlers
    const onPointerDown = (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        activePointers.current.set(e.pointerId, e);

        if (activePointers.current.size === 1) {
            isPanning.current = false;
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        } else if (activePointers.current.size === 2) {
            isPanning.current = true;
            const pts = Array.from(activePointers.current.values());
            initialPinchDist.current = getPointersDist(pts[0], pts[1]);
            initialPinchScale.current = panOffset.scale;
            lastPanPoint.current = null; // Disable standard panning during pinch
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        
        // Update the stored pointer event
        activePointers.current.set(e.pointerId, e);

        if (activePointers.current.size === 1 && lastPanPoint.current) {
            // Single finger pan
            const dx = e.clientX - lastPanPoint.current.x;
            const dy = e.clientY - lastPanPoint.current.y;
            
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isPanning.current = true;
            if (!isPanning.current) return;

            setPanOffset(prev => {
                const newX = prev.x + dx;
                const newY = prev.y + dy;
                return { ...prev, ...clampOffset(newX, newY, prev.scale) };
            });

            lastPanPoint.current = { x: e.clientX, y: e.clientY };

        } else if (activePointers.current.size === 2 && initialPinchDist.current !== null) {
            // Two finger pinch zoom
            const pts = Array.from(activePointers.current.values());
            const currentDist = getPointersDist(pts[0], pts[1]);
            
            // Calculate new scale
            const scaleRatio = currentDist / initialPinchDist.current;
            let newScale = initialPinchScale.current * scaleRatio;
            newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

            // Determine pinch center to zoom around that point
            const centerX = (pts[0].clientX + pts[1].clientX) / 2;
            const centerY = (pts[0].clientY + pts[1].clientY) / 2;

            setPanOffset(prev => {
                if (!viewportRef.current) return prev;
                const rect = viewportRef.current.getBoundingClientRect();
                
                // Mouse position relative to the map container
                const relX = centerX - rect.left;
                const relY = centerY - rect.top;

                // How much the scale changed since last frame/prev state
                const scaleDiff = newScale / prev.scale;

                // Adjust offset so the point under the fingers stays in the same place
                const newX = relX - (relX - prev.x) * scaleDiff;
                const newY = relY - (relY - prev.y) * scaleDiff;

                return { scale: newScale, ...clampOffset(newX, newY, newScale) };
            });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => { 
        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size < 2) {
            initialPinchDist.current = null;
        }
        if (activePointers.current.size === 1) {
            // Resume panning from the remaining finger
            const remaining = Array.from(activePointers.current.values())[0];
            lastPanPoint.current = { x: remaining.clientX, y: remaining.clientY };
        } else if (activePointers.current.size === 0) {
            lastPanPoint.current = null;
        }
    };

    // Get valid source nodes for attacking a given enemy node
    const getValidSources = (targetNode: TerritoryNode) => {
        return targetNode.neighbors
            .map(nId => risk.mapNodes[nId])
            .filter(n => n && n.owner === 'player' && n.soldierCount >= 2);
    };

    const handleNodeTap = (node: TerritoryNode) => {
        if (isPanning.current) return;
        setSelectedNode(node);
        setBattleResult(null);
        setIsRolling(false);

        // If enemy & attackable, auto-pick source
        if (node.owner === 'enemy') {
            const sources = getValidSources(node);
            if (sources.length === 1) {
                setAttackSourceId(sources[0].id);
                setCommittedSoldiers(Math.max(1, sources[0].soldierCount - 1));
            } else if (sources.length > 1) {
                setAttackSourceId(sources[0].id);
                setCommittedSoldiers(Math.max(1, sources[0].soldierCount - 1));
            } else {
                setAttackSourceId(null);
                setCommittedSoldiers(1);
            }
        } else {
            setAttackSourceId(null);
            setCommittedSoldiers(1);
        }
    };

    const handleSelectSource = (sourceId: string) => {
        setAttackSourceId(sourceId);
        const sourceNode = risk.mapNodes[sourceId];
        if (sourceNode) {
            setCommittedSoldiers(Math.max(1, sourceNode.soldierCount - 1));
        }
    };

    const handleAttack = (targetNodeId: string) => {
        if (!attackSourceId) return;
        const prev = risk.getActiveRegionBonuses();
        
        // Start animation
        setIsRolling(true);
        setBattleResult(null);

        // Simulate rolling visual
        const pCount = committedSoldiers;
        const eCount = Math.max(1, selectedNode?.soldierCount || 1);
        
        let ticks = 0;
        const sourceIdForBattle = attackSourceId;
        const rollInterval = setInterval(() => {
            setRollAnimDice({
                p: Array.from({length: pCount}, () => Math.floor(Math.random() * 6) + 1),
                e: Array.from({length: eCount}, () => Math.floor(Math.random() * 6) + 1)
            });
            ticks++;
            if (ticks > 8) {
                clearInterval(rollInterval);
                setIsRolling(false);

                const result = risk.resolveRiskBattle(sourceIdForBattle, targetNodeId, committedSoldiers);
                if (!result) return;
                setBattleResult(result);

                if (result.success) {
                    const next = useRiskStore.getState().getActiveRegionBonuses();
                    const newRegion = next.find(r => !prev.includes(r));
                    if (newRegion) {
                        setJustConqueredRegion(newRegion);
                        setTimeout(() => setJustConqueredRegion(null), 4000);
                    }
                    setSelectedNode(useRiskStore.getState().mapNodes[targetNodeId]);
                } else {
                    setSelectedNode(useRiskStore.getState().mapNodes[targetNodeId]);
                }
            }
        }, 80);
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

    const allNodes = Object.values(risk.mapNodes);
    const maxRevealed = risk.getMaxRevealedTiles();
    const sortedNodes = [...allNodes].sort((a, b) => a.defenseValue - b.defenseValue);
    
    const visibleNodeIds = new Set([
        ...allNodes.filter(n => n.owner === 'player').map(n => n.id),
        ...sortedNodes.slice(0, maxRevealed).map(n => n.id)
    ]);

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
                        <span className="army-label">⚔️ Army: <strong>{risk.getSoldierLabel(risk.playerSoldiers)}</strong> ({risk.playerSoldiers} soldier{risk.playerSoldiers !== 1 ? 's' : ''} in reserve)</span>
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
                        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${panOffset.scale})` }}
                    >
                        {/* SVG paths between connected nodes */}
                        <svg className="map-paths-svg" width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {Object.values(risk.mapNodes).flatMap(node =>
                                node.neighbors
                                    .filter(nId => nId > node.id && visibleNodeIds.has(node.id) && visibleNodeIds.has(nId)) // avoid drawing twice and only if both visible
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
                        {Object.values(risk.mapNodes).filter(node => visibleNodeIds.has(node.id)).map(node => {
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
                                        {node.soldierCount}
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
                <div className="risk-node-modal" onClick={() => { setSelectedNode(null); setBattleResult(null); setAttackSourceId(null); }}>
                    <div className="risk-node-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => { setSelectedNode(null); setBattleResult(null); setAttackSourceId(null); }}><X size={20} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: selectedNode.owner === 'player' ? '#10b981' : NODE_TYPE_STYLE[selectedNode.nodeType]?.border }}>
                                {selectedNode.soldierCount}
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

                        {/* ── Enemy node attack UI ── */}
                        {selectedNode.owner === 'enemy' && selectedNode.nodeType !== 'shop' && (() => {
                            const validSources = getValidSources(selectedNode);
                            const sourceNode = attackSourceId ? risk.mapNodes[attackSourceId] : null;
                            const maxSendable = sourceNode ? sourceNode.soldierCount - 1 : 0;
                            const canAttack = isAttackable(selectedNode) && sourceNode && maxSendable > 0;

                            return (
                                <div className="node-enemy-info">
                                    <div className="enemy-soldiers-row">
                                        <span className="enemy-soldier-count">{selectedNode.soldierCount}</span>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{risk.getSoldierLabel(selectedNode.soldierCount)}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>enemy soldiers defending</div>
                                        </div>
                                    </div>

                                    {isAttackable(selectedNode) && !isRolling && !battleResult && (
                                        <>
                                            {/* Source node selector */}
                                            {validSources.length > 0 && (
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: '#e2e8f0' }}>Attack from:</label>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        {validSources.map(src => (
                                                            <button
                                                                key={src.id}
                                                                onClick={() => handleSelectSource(src.id)}
                                                                style={{
                                                                    padding: '0.4rem 0.75rem',
                                                                    borderRadius: 8,
                                                                    border: attackSourceId === src.id ? '2px solid #10b981' : '1px solid #334155',
                                                                    background: attackSourceId === src.id ? 'rgba(16,185,129,0.15)' : 'rgba(30,41,59,0.8)',
                                                                    color: attackSourceId === src.id ? '#10b981' : '#94a3b8',
                                                                    fontSize: '0.8rem',
                                                                    cursor: 'pointer',
                                                                    fontWeight: attackSourceId === src.id ? 700 : 400,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {src.name} ({src.soldierCount} ⚔️)
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {validSources.length === 0 && (
                                                <p style={{ color: '#f87171', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.75rem 0 0' }}>
                                                    No adjacent territories have enough soldiers (need 2+).
                                                </p>
                                            )}

                                            {/* Troop commitment slider */}
                                            {canAttack && (
                                                <div className="soldier-commit-section" style={{ marginTop: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                                        <span style={{ color: '#e2e8f0' }}>Soldiers to send</span>
                                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{committedSoldiers} / {maxSendable} max</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max={maxSendable}
                                                        value={Math.min(committedSoldiers, maxSendable)}
                                                        onChange={(e) => setCommittedSoldiers(parseInt(e.target.value))}
                                                        style={{ width: '100%', accentColor: '#f59e0b' }}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                                        <span>1 stays behind</span>
                                                        <span>{sourceNode!.name}: {sourceNode!.soldierCount} → {sourceNode!.soldierCount - committedSoldiers}</span>
                                                    </div>
                                                    <div className="dice-preview" style={{ marginTop: '0.5rem' }}>
                                                        <span>You deploy: <strong>{committedSoldiers}d6</strong></span>
                                                        <span>They roll: <strong>{selectedNode.soldierCount}d6</strong></span>
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: '#f87171', margin: '0.3rem 0 0', fontStyle: 'italic', textAlign: 'center' }}>
                                                        ⚠️ Sent soldiers are lost permanently on defeat!
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })()}

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

                        {/* ── Owned node info + deploy ── */}
                        {selectedNode.owner === 'player' && (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ color: '#10b981', fontWeight: 700 }}>✅ Controlled by your army</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                    Garrison: {selectedNode.soldierCount} soldier{selectedNode.soldierCount !== 1 ? 's' : ''}
                                </div>
                                {risk.playerSoldiers > 0 && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            className="hire-btn"
                                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                                            onClick={() => {
                                                risk.deploySoldiers(selectedNode.id, 1);
                                                setSelectedNode(useRiskStore.getState().mapNodes[selectedNode.id]);
                                            }}
                                        >
                                            Deploy +1 from reserve ({risk.playerSoldiers} available)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Attack / Can't attack buttons ── */}
                        {selectedNode.owner === 'enemy' && selectedNode.nodeType !== 'shop' && (() => {
                            const sourceNode = attackSourceId ? risk.mapNodes[attackSourceId] : null;
                            const maxSendable = sourceNode ? sourceNode.soldierCount - 1 : 0;
                            const canAttack = isAttackable(selectedNode) && sourceNode && maxSendable > 0;

                            return canAttack ? (
                                <button 
                                    className="risk-attack-btn" 
                                    onClick={() => handleAttack(selectedNode.id)}
                                    disabled={isRolling}
                                    style={{ opacity: isRolling ? 0.5 : 1 }}
                                >
                                    {isRolling ? 'Rolling...' : <><Swords size={20} /> 🎲 Attack! ({committedSoldiers} vs {selectedNode.soldierCount})</>}
                                </button>
                            ) : !isAttackable(selectedNode) ? (
                                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
                                    Conquer an adjacent territory first.
                                </p>
                            ) : null;
                        })()}

                        {selectedNode.owner === 'enemy' && selectedNode.nodeType === 'shop' && isAttackable(selectedNode) && (() => {
                            const validSources = getValidSources(selectedNode);
                            const sourceNode = attackSourceId ? risk.mapNodes[attackSourceId] : null;
                            const maxSendable = sourceNode ? sourceNode.soldierCount - 1 : 0;
                            const canAttack = sourceNode && maxSendable > 0;

                            return canAttack ? (
                                <button className="risk-attack-btn" style={{ background: '#10b981' }} onClick={() => handleAttack(selectedNode.id)}>
                                    <ShoppingCart size={18} /> Seize Supply Post
                                </button>
                            ) : validSources.length === 0 ? (
                                <p style={{ color: '#f87171', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.75rem 0 0' }}>
                                    No adjacent territories have enough soldiers (need 2+).
                                </p>
                            ) : null;
                        })()}

                        {/* Rolling Animation Overlay */}
                        {isRolling && (
                            <div className="risk-rolling-anim" style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <h4 style={{ margin: '0 0 0.5rem', color: '#f59e0b' }}>🎲 ROLLING...</h4>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#60a5fa' }}>{rollAnimDice.p.join('  ')}</span>
                                    <span style={{ color: '#94a3b8' }}>vs</span>
                                    <span style={{ color: '#ef4444' }}>{rollAnimDice.e.join('  ')}</span>
                                </div>
                            </div>
                        )}

                        {/* Battle Result */}
                        {!isRolling && battleResult && (
                            <div className={`risk-battle-result modal-result ${battleResult.success ? 'victory' : 'defeat'}`} style={{ marginTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem' }}>{battleResult.success ? '⚔️ VICTORY' : '💀 DEFEAT'}</h4>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    <span>You: {battleResult.playerRolls.map((r, i) => <span key={i} className="dice-result">{r}</span>)} → <strong>{battleResult.playerWins} wins</strong></span>
                                    <span>Enemy: {battleResult.enemyRolls.map((r, i) => <span key={i} className="dice-result enemy-dice">{r}</span>)} → <strong>{battleResult.enemyWins} wins</strong></span>
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
                                    <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.3rem' }}>
                                        ⚔️ {committedSoldiers} soldier{committedSoldiers !== 1 ? 's' : ''} lost in battle!
                                    </div>
                                )}
                                {battleResult.success && attackSourceId && (
                                    <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.3rem' }}>
                                        ✅ {risk.mapNodes[attackSourceId]?.name}: {risk.mapNodes[attackSourceId]?.soldierCount} remaining · {selectedNode.name}: {committedSoldiers} deployed
                                    </div>
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
                            Cards grant powerful passives and are <strong>permanently owned</strong> once purchased.
                        </p>
                        <div className="cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(Object.values(RISK_CARDS))
                                .filter(def => !['tank_tactics', 'iron_will', 'medic', 'arcane_edge'].includes(def.id))
                                .map(def => {
                                const owned = risk.ownedCards.includes(def.id);
                                let canBuy = !owned;
                                if (!owned) {
                                    if (def.currency === 'sigils') canBuy = conquest.sigils >= def.cost;
                                    if (def.currency === 'gold') canBuy = (useCurrencyStore.getState().gold ?? 0) >= def.cost;
                                    if (def.currency === 'shmeckles') canBuy = (useCurrencyStore.getState().shmeckles ?? 0) >= def.cost;
                                }
                                const cIcon = def.currency === 'sigils' ? '🔱' : def.currency === 'gold' ? '🪙' : '💰';
                                const cLabel = def.currency === 'sigils' ? 'Sigils' : def.currency === 'gold' ? 'Gold' : 'Coins';
                                
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
                                                title={!canBuy ? `Need ${def.cost} ${cLabel}` : `Buy for ${def.cost} ${cLabel}`}
                                            >
                                                {def.cost} {cIcon}
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
                            <li><strong>Cards</strong> cost varying resources depending on power, and are permanently in your collection.</li>
                            <li><strong>Equip up to 3</strong> cards at a time. You can swap freely.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
