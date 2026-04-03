// ─── CONQUEST TILES — Mahjong Board Engine ────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    trueTripleTileMap,
    bedrockDivots,
    isTileLocked,
    TILE_IMAGES,
    TILE_COLORS,
    POWER_COSTS,
    type TripleTileNode,
    type DockTile,
    type UndoEntry,
    type Difficulty,
} from './tileConfig';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useToastStore } from '../../components/ui/Toast';
import './ConquestTiles.css';

interface ConquestTilesProps {
    onComplete: (result: 'win' | 'loss', difficulty: Difficulty, clearPct: number) => void;
    onClose: () => void;
    canPlay: boolean;
    canPlayImpossible: boolean;
}

// ─── LAYOUT CONSTANTS ─────────────────────────────────
// Landscape Mahjong tile proportions — wider than tall
const TILE_W    = 44;   // px wide
const TILE_H    = 32;   // px tall  (W:H = 1.375 — proper mahjong ratio)
const Y_PITCH   = 15;   // row shingle offset (show ~47% of each tile row)
const Z_LIFT    = 5;    // px upward shift per z-level (higher z = raised)
const TRAY_CAP  = 7;

export const ConquestTiles = ({ onComplete, onClose }: ConquestTilesProps) => {
    const [phase,       setPhase]      = useState<'playing' | 'result'>('playing');
    const [board,       setBoard]      = useState<TripleTileNode[]>([]);
    const [dock,        setDock]       = useState<DockTile[]>([]);
    const [score,       setScore]      = useState(0);
    const [result,      setResult]     = useState<'win' | 'loss' | null>(null);
    const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());

    const [ownedRemove,  setOwnedRemove]  = useState(1);
    const [ownedUndo,    setOwnedUndo]    = useState(1);
    const [purchaseModal, setPurchaseModal] = useState<'remove' | 'undo' | 'shuffle' | null>(null);
    const [removeBoughtToday, setRemoveBoughtToday] = useState(0);
    const [undoBoughtToday,   setUndoBoughtToday]   = useState(0);
    const DAILY_LIMIT = 3;

    const undoStack     = useRef<UndoEntry[]>([]);
    const initialCount  = useRef(trueTripleTileMap.length);
    const currency      = useCurrencyStore();
    const addToast      = useToastStore(s => s.addToast);

    useEffect(() => {
        setBoard([...trueTripleTileMap]);
        setDock([]); setScore(0); setResult(null);
        setClearingIds(new Set());
        undoStack.current = [];
        setPhase('playing');
    }, []);

    // ─── SELECT TILE ───────────────────────────────────
    const selectTile = useCallback((tile: TripleTileNode) => {
        if (phase !== 'playing' || result) return;
        if (dock.length >= TRAY_CAP || clearingIds.size > 0) return;
        if (isTileLocked(tile, board)) return;

        const newBoard = board.filter(b => b.id !== tile.id);
        const dockTile: DockTile = { id: tile.id, type: tile.type, x: tile.x, y: tile.y, z: tile.z };
        const newDock  = [...dock, dockTile];
        undoStack.current.push({ tile: dockTile, prevScore: score });

        // Match-3 check
        const counts = new Map<string, number>();
        for (const t of newDock) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
        let matchedType: string | null = null;
        for (const [type, count] of counts) { if (count >= 3) { matchedType = type; break; } }

        if (matchedType) {
            const toRemove: string[] = [];
            for (const t of newDock) { if (t.type === matchedType && toRemove.length < 3) toRemove.push(t.id); }
            setClearingIds(new Set(toRemove));
            setBoard(newBoard); setDock(newDock); setScore(s => s + 30);
            setTimeout(() => { setDock(p => p.filter(t => !toRemove.includes(t.id))); setClearingIds(new Set()); }, 350);
            return;
        }
        setBoard(newBoard); setDock(newDock); setScore(s => s + 10);
    }, [phase, result, board, dock, score, clearingIds]);

    // ─── WIN / LOSS ────────────────────────────────────
    useEffect(() => {
        if (phase !== 'playing' || result || clearingIds.size > 0) return;
        if (board.length === 0 && dock.length === 0) {
            const t = setTimeout(() => { setResult('win'); setPhase('result'); }, 300);
            return () => clearTimeout(t);
        }
        if (dock.length >= TRAY_CAP) {
            const t = setTimeout(() => { setResult('loss'); setPhase('result'); }, 600);
            return () => clearTimeout(t);
        }
    }, [board, dock, phase, result, clearingIds]);

    // ─── UNDO ──────────────────────────────────────────
    const handleUndo = useCallback(() => {
        if (ownedUndo <= 0 || clearingIds.size > 0) return;
        const entry = undoStack.current.pop();
        if (!entry) return;
        setOwnedUndo(c => c - 1);
        const restored: TripleTileNode = { id: entry.tile.id, type: entry.tile.type, x: entry.tile.x, y: entry.tile.y, z: entry.tile.z };
        setBoard(prev => [...prev, restored]);
        setDock(prev => { const n = [...prev]; for (let i = n.length - 1; i >= 0; i--) { if (n[i].id === entry.tile.id) { n.splice(i, 1); break; } } return n; });
        setScore(entry.prevScore);
    }, [ownedUndo, clearingIds]);

    // ─── REMOVE POWER ──────────────────────────────────
    const handleRemove = useCallback(() => {
        if (ownedRemove <= 0 || clearingIds.size > 0) return;
        const free = board.filter(t => !isTileLocked(t, board));
        if (!free.length) return;
        const toRemove = [...free].sort((a, b) => b.z - a.z).slice(0, 3).map(t => t.id);
        setOwnedRemove(c => c - 1);
        setBoard(prev => prev.filter(t => !toRemove.includes(t.id)));
    }, [ownedRemove, board, clearingIds]);

    // ─── PURCHASE ──────────────────────────────────────
    const handlePurchase = useCallback((type: 'remove' | 'undo' | 'shuffle') => {
        const cost = POWER_COSTS[type];
        const counts = { remove: removeBoughtToday, undo: undoBoughtToday, shuffle: 0 };
        if (counts[type] >= DAILY_LIMIT) { addToast({ message: `Daily limit reached`, type: 'warning' }); return; }
        if (!currency.spendGold(cost)) { addToast({ message: `Need ${cost}🪙`, type: 'error' }); return; }
        if (type === 'remove') { setOwnedRemove(c => c + 1); setRemoveBoughtToday(c => c + 1); }
        if (type === 'undo')   { setOwnedUndo(c => c + 1);   setUndoBoughtToday(c => c + 1);   }
        setPurchaseModal(null);
    }, [currency, removeBoughtToday, undoBoughtToday, addToast]);

    // ─── RESULT HANDLER ───────────────────────────────
    const handleComplete = useCallback(() => {
        const clearPct = Math.round(((initialCount.current - board.length) / initialCount.current) * 100);
        onComplete(result ?? 'loss', 3, clearPct);
    }, [result, board.length, onComplete]);

    // ─── RENDER HELPERS ───────────────────────────────
    // Left = column index × tile width (no horizontal overlap in this grid layout)
    const tileLeft = (t: TripleTileNode) => t.x * TILE_W;
    // Top = row × shingle pitch, RAISED by z-level (higher z tiles float upward)
    const tileTop  = (t: TripleTileNode) => t.y * Y_PITCH - t.z * Z_LIFT;
    // Painter's algorithm: back rows and lower z behind front/higher z
    const tileZ    = (t: TripleTileNode) => t.z * 200 + t.y * 10 + t.x;

    // Board pixel bounds
    const PADDING = 16;
    let boardW = 400, boardH = 360, offX = 0, offY = 0;
    if (board.length > 0) {
        const minX = Math.min(...board.map(tileLeft)) - PADDING;
        const minY = Math.min(...board.map(tileTop))  - PADDING;
        const maxX = Math.max(...board.map(t => tileLeft(t) + TILE_W)) + PADDING;
        const maxY = Math.max(...board.map(t => tileTop(t)  + TILE_H)) + PADDING;
        offX = minX; offY = minY;
        boardW = maxX - minX; boardH = maxY - minY;
    }

    const sortedBoard = [...board].sort((a, b) =>
        a.z !== b.z ? a.z - b.z : a.y !== b.y ? a.y - b.y : a.x - b.x
    );

    const isWin    = result === 'win';
    const clearPct = Math.round(((initialCount.current - board.length) / initialCount.current) * 100);

    return (
        <div className="tiles-root">
            {/* TOP BAR + POWER BUTTONS (horizontal) */}
            <div className="tiles-topbar">
                <span className="tiles-topbar-label">🎴 Mahjong</span>

                {/* Power buttons in topbar */}
                <div className="tiles-powers-inline">
                    <div className="tiles-power-item">
                        <button className="tiles-power-btn" onClick={handleUndo}
                            disabled={ownedUndo <= 0 || clearingIds.size > 0} title="Undo">↩</button>
                        <span className="tiles-power-count">{ownedUndo}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('undo')}>+</button>
                    </div>
                    <div className="tiles-power-item">
                        <button className="tiles-power-btn" onClick={handleRemove}
                            disabled={ownedRemove <= 0 || clearingIds.size > 0} title="Remove 3">🗑</button>
                        <span className="tiles-power-count">{ownedRemove}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('remove')}>+</button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tiles-topbar-score">⭐ {score}</span>
                    <button className="tiles-topbar-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* BOARD */}
            <div className="tiles-board-container">
                <div className="tiles-board" style={{ width: boardW, height: boardH, position: 'relative' }}>

                    {/* Ghost divot grid */}
                    {bedrockDivots.map(d => (
                        <div key={`d${d.x}_${d.y}`} className="tiles-divot" style={{
                            left:   d.x * TILE_W           - offX,
                            top:    d.y * Y_PITCH          - offY,
                            width:  TILE_W, height: TILE_H,
                        }} />
                    ))}

                    {/* Tiles */}
                    {sortedBoard.map(tile => {
                        const locked = isTileLocked(tile, board);
                        const left   = tileLeft(tile) - offX;
                        const top    = tileTop(tile)  - offY;
                        return (
                            <motion.div
                                key={tile.id}
                                layoutId={tile.id}
                                className={`tiles-board-tile ${locked ? 'locked' : 'unlocked'}`}
                                style={{
                                    left, top,
                                    width: TILE_W, height: TILE_H,
                                    zIndex: tileZ(tile),
                                    backgroundColor: TILE_COLORS[tile.type],
                                }}
                                onClick={() => !locked && selectTile(tile)}
                                layout
                                initial={{ scale: 0.88, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.75, opacity: 0 }}
                                whileHover={!locked ? { y: -3, zIndex: 9999 } : {}}
                                whileTap={!locked   ? { scale: 0.94 } : {}}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                            >
                                <img src={TILE_IMAGES[tile.type]} alt={tile.type}
                                    className="tiles-tile-img" />
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* BOTTOM DOCK */}
            <div className="tiles-dock">
                <div className="tiles-tray-row">
                    {Array.from({ length: TRAY_CAP }).map((_, i) => {
                        const dt = dock[i];
                        const clearing = dt ? clearingIds.has(dt.id) : false;
                        return (
                            <div key={i} className={`tiles-tray-slot ${dt ? 'filled' : 'empty'} ${clearing ? 'clearing' : ''}`}>
                                <AnimatePresence>
                                    {dt && (
                                        <motion.div key={dt.id} layoutId={dt.id}
                                            className="tiles-board-tile dock-tile"
                                            layout
                                            initial={{ scale: 1.12, y: -10 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0, opacity: 0, transition: { duration: 0.14 } }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                            style={{ width: TILE_W, height: TILE_H, position: 'absolute', pointerEvents: 'none', backgroundColor: TILE_COLORS[dt.type] }}
                                        >
                                            <img src={TILE_IMAGES[dt.type]} alt={dt.type} className="tiles-tile-img" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
                <div className="tiles-dock-meta">
                    <span className="tiles-tray-count">{dock.length}/{TRAY_CAP}</span>
                    <span className="tiles-tray-left" style={{ opacity: dock.length >= TRAY_CAP - 2 ? 1 : 0.4 }}>
                        {dock.length >= TRAY_CAP ? 'FULL' : `${TRAY_CAP - dock.length} left`}
                    </span>
                    <span className="tiles-clear-pct">{clearPct}%</span>
                </div>
            </div>

            {/* RESULT */}
            <AnimatePresence>
                {result && (
                    <motion.div className="tiles-result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`tiles-result-card ${isWin ? 'victory' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                            <h2>{isWin ? '🏆 VICTORY!' : '💀 Defeat'}</h2>
                            <div className="tiles-result-rewards">
                                <div className="tiles-reward-row">⭐ {score} pts</div>
                                <div className="tiles-reward-row">🗺️ {clearPct}% cleared</div>
                                {isWin && <div className="tiles-reward-row highlight">🔱 Full Board Clear!</div>}
                            </div>
                            {!isWin && (
                                <div className="tiles-revive-buttons">
                                    <button className="tiles-revive-giveup" onClick={onClose}>Give Up</button>
                                    <button className="tiles-revive-purchase" onClick={() => setPurchaseModal('remove')}>Purchase</button>
                                </div>
                            )}
                            <button className="tiles-result-btn" onClick={handleComplete}>
                                {isWin ? 'Collect Rewards' : 'Return'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PURCHASE MODAL */}
            <AnimatePresence>
                {purchaseModal && (
                    <motion.div className="tiles-purchase-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPurchaseModal(null)}>
                        <motion.div className="tiles-purchase-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="tiles-purchase-header">
                                <h3>Purchase Power-up</h3>
                                <button className="tiles-purchase-close" onClick={() => setPurchaseModal(null)}>✕</button>
                            </div>
                            <div className="tiles-purchase-cost">🪙 {POWER_COSTS[purchaseModal]} Gold</div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button className="tiles-revive-giveup" onClick={() => setPurchaseModal(null)}>Cancel</button>
                                <button className="tiles-revive-purchase"
                                    disabled={currency.gold < POWER_COSTS[purchaseModal]}
                                    onClick={() => handlePurchase(purchaseModal)}>Buy</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
