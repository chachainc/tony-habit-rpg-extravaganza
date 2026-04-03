// ─── CONQUEST TILES — Stack Puzzle Engine ─────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    generateStackBoard,
    isStackFree,
    TILE_IMAGES,
    TILE_COLORS,
    POWER_COSTS,
    type TileStack,
    type DockTile,
    type UndoEntry,
    type Difficulty,
} from './tileConfig';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useToastStore } from '../../components/ui/Toast';
import './ConquestTiles.css';

// ─── PROPS ────────────────────────────────────────────
interface ConquestTilesProps {
    onComplete: (result: 'win' | 'loss', difficulty: Difficulty, clearPct: number) => void;
    onClose: () => void;
    canPlay: boolean;
    canPlayImpossible: boolean;
}

// ─── BOARD CONSTANTS ──────────────────────────────────
const TILE_W      = 44;   // tile face width px
const TILE_H      = 46;   // tile face height px
const CELL_W      = 47;   // column pitch (tile + 3px gap)
const CELL_H      = 52;   // row pitch (tile + 6px gap)
const SHADOW_LAYERS = 5;  // visible depth layers per stack
const LAYER_Y     = 8;    // px downward offset per shadow layer
const TRAY_CAPACITY = 7;

// ─── COMPONENT ────────────────────────────────────────
export const ConquestTiles = ({ onComplete, onClose, canPlay: _canPlay, canPlayImpossible: _canPlayImpossible }: ConquestTilesProps) => {
    const [phase,       setPhase]      = useState<'playing' | 'result'>('playing');
    const [stacks,      setStacks]     = useState<TileStack[]>([]);
    const [dock,        setDock]       = useState<DockTile[]>([]);
    const [score,       setScore]      = useState(0);
    const [result,      setResult]     = useState<'win' | 'loss' | null>(null);
    const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());

    const [ownedRemove,  setOwnedRemove]  = useState(1);
    const [ownedUndo,    setOwnedUndo]    = useState(1);
    const [purchaseModal, setPurchaseModal] = useState<'remove' | 'undo' | 'shuffle' | null>(null);
    const [removeBoughtToday, setRemoveBoughtToday] = useState(0);
    const [undoBoughtToday,   setUndoBoughtToday]   = useState(0);
    const DAILY_BONUS_LIMIT = 3;

    const undoStack = useRef<UndoEntry[]>([]);
    const initialCount = useRef(288);
    const currency  = useCurrencyStore();
    const addToast  = useToastStore(s => s.addToast);

    // ─── INIT ──────────────────────────────────────────
    useEffect(() => {
        setStacks(generateStackBoard());
        setDock([]);
        setScore(0);
        setResult(null);
        setClearingIds(new Set());
        undoStack.current = [];
        setPhase('playing');
    }, []);

    // ─── SELECT STACK (pop top tile) ──────────────────
    const selectStack = useCallback((stack: TileStack) => {
        if (phase !== 'playing' || result) return;
        if (dock.length >= TRAY_CAPACITY) return;
        if (clearingIds.size > 0) return;
        if (!isStackFree(stack, stacks)) return;
        if (stack.tiles.length === 0) return;

        const topTile = stack.tiles[stack.tiles.length - 1];

        // Remove top tile from its stack
        const newStacks = stacks.map(s =>
            s.stackId === stack.stackId
                ? { ...s, tiles: s.tiles.slice(0, -1) }
                : s
        );

        const dockTile: DockTile = {
            id: topTile.id,
            type: topTile.symbol,
            col: stack.col,
            row: stack.row,
        };
        const newDock = [...dock, dockTile];

        // Save undo entry
        undoStack.current.push({ tile: dockTile, stackId: stack.stackId, prevScore: score });

        // Check match-3
        const counts = new Map<string, number>();
        for (const t of newDock) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);

        let matchedType: string | null = null;
        for (const [type, count] of counts) {
            if (count >= 3) { matchedType = type; break; }
        }

        if (matchedType) {
            const toRemove: string[] = [];
            for (const t of newDock) {
                if (t.type === matchedType && toRemove.length < 3) toRemove.push(t.id);
            }
            setClearingIds(new Set(toRemove));
            setStacks(newStacks);
            setDock(newDock);
            setScore(s => s + 30);
            setTimeout(() => {
                setDock(prev => prev.filter(t => !toRemove.includes(t.id)));
                setClearingIds(new Set());
            }, 350);
            return;
        }

        setStacks(newStacks);
        setDock(newDock);
        setScore(s => s + 10);
    }, [phase, result, stacks, dock, score, clearingIds]);

    // ─── WIN / LOSS CHECK ──────────────────────────────
    useEffect(() => {
        if (phase !== 'playing' || result || clearingIds.size > 0) return;
        const totalRemaining = stacks.reduce((sum, s) => sum + s.tiles.length, 0);
        if (totalRemaining === 0 && dock.length === 0) {
            const t = setTimeout(() => { setResult('win'); setPhase('result'); }, 300);
            return () => clearTimeout(t);
        }
        if (dock.length >= TRAY_CAPACITY) {
            const t = setTimeout(() => { setResult('loss'); setPhase('result'); }, 600);
            return () => clearTimeout(t);
        }
    }, [stacks, dock, phase, result, clearingIds]);

    // ─── UNDO ──────────────────────────────────────────
    const handleUndo = useCallback(() => {
        if (ownedUndo <= 0 || clearingIds.size > 0) return;
        const entry = undoStack.current.pop();
        if (!entry) return;
        setOwnedUndo(c => c - 1);
        // Push tile back to top of its original stack
        setStacks(prev => prev.map(s =>
            s.stackId === entry.stackId
                ? { ...s, tiles: [...s.tiles, { id: entry.tile.id, symbol: entry.tile.type }] }
                : s
        ));
        setDock(prev => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].id === entry.tile.id) { next.splice(i, 1); break; }
            }
            return next;
        });
        setScore(entry.prevScore);
    }, [ownedUndo, clearingIds]);

    // ─── REMOVE POWER ──────────────────────────────────
    const handleRemove = useCallback(() => {
        if (ownedRemove <= 0 || clearingIds.size > 0) return;
        const freeStacks = stacks.filter(s => s.tiles.length > 0 && isStackFree(s, stacks));
        if (freeStacks.length === 0) return;
        const targets = freeStacks.slice(0, 3);
        const removeIds = new Set(targets.map(s => s.stackId));
        setOwnedRemove(c => c - 1);
        setStacks(prev => prev.map(s =>
            removeIds.has(s.stackId) ? { ...s, tiles: s.tiles.slice(0, -1) } : s
        ));
    }, [ownedRemove, stacks, clearingIds]);

    // ─── PURCHASE ──────────────────────────────────────
    const handlePurchase = useCallback((type: 'remove' | 'undo' | 'shuffle') => {
        const cost = POWER_COSTS[type];
        const counts = { remove: removeBoughtToday, undo: undoBoughtToday, shuffle: 0 };
        if (counts[type] >= DAILY_BONUS_LIMIT) {
            addToast({ message: `Daily limit reached (${DAILY_BONUS_LIMIT}/day)`, type: 'warning' }); return;
        }
        if (!currency.spendGold(cost)) {
            addToast({ message: `Not enough gold! Need ${cost}🪙`, type: 'error' }); return;
        }
        if (type === 'remove') { setOwnedRemove(c => c + 1); setRemoveBoughtToday(c => c + 1); }
        if (type === 'undo')   { setOwnedUndo(c => c + 1);   setUndoBoughtToday(c => c + 1);   }
        setPurchaseModal(null);
    }, [currency, removeBoughtToday, undoBoughtToday, addToast]);

    // ─── RESULT HANDLER ───────────────────────────────
    const handleComplete = useCallback(() => {
        const totalRemaining = stacks.reduce((sum, s) => sum + s.tiles.length, 0);
        const cleared = initialCount.current - totalRemaining;
        const clearPct = Math.round((cleared / initialCount.current) * 100);
        onComplete(result ?? 'loss', 3, clearPct);
    }, [result, stacks, onComplete]);

    // ─── DERIVED STATE ────────────────────────────────
    const isWin = result === 'win';
    const totalRemaining = stacks.reduce((sum, s) => sum + s.tiles.length, 0);
    const clearPct = Math.round(((initialCount.current - totalRemaining) / initialCount.current) * 100);

    return (
        <div className="tiles-root">
            {/* Top Bar */}
            <div className="tiles-topbar">
                <span className="tiles-topbar-label">🎴 Conquest</span>
                <span className="tiles-topbar-score">⭐ {score}</span>
                <button className="tiles-topbar-close" onClick={onClose}>✕</button>
            </div>

            {/* Main Layout */}
            <div className="tiles-game-main">

                {/* LEFT: Power Buttons */}
                <div className="tiles-powers">
                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" onClick={handleUndo}
                            disabled={ownedUndo <= 0 || clearingIds.size > 0} title="Undo">↩</button>
                        <span className="tiles-power-count">{ownedUndo}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('undo')}>+</button>
                    </div>
                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" onClick={handleRemove}
                            disabled={ownedRemove <= 0 || clearingIds.size > 0} title="Remove top tile from 3 free stacks">🗑</button>
                        <span className="tiles-power-count">{ownedRemove}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('remove')}>+</button>
                    </div>
                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" disabled title="Hint">💡</button>
                        <span className="tiles-power-count">–</span>
                    </div>
                </div>

                {/* CENTER + BOTTOM: Board + Dock */}
                <div className="tiles-board-and-dock">
                    {/* BOARD */}
                    <div className="tiles-board-container">
                        <div className="tiles-board"
                            style={{ width: 8 * CELL_W, height: 6 * CELL_H + SHADOW_LAYERS * LAYER_Y }}>
                            {stacks.map(stack => {
                                const free = isStackFree(stack, stacks);
                                const top  = stack.tiles.length > 0
                                    ? stack.tiles[stack.tiles.length - 1]
                                    : null;
                                const visLayers = Math.min(SHADOW_LAYERS, stack.tiles.length - 1);

                                return (
                                    <div
                                        key={stack.stackId}
                                        className="tile-stack-container"
                                        style={{
                                            left:   stack.col * CELL_W,
                                            top:    stack.row * CELL_H,
                                            width:  TILE_W,
                                            height: TILE_H,
                                        }}
                                    >
                                        {/* Shadow/Support layers — rendered bottom-up below top tile */}
                                        {Array.from({ length: visLayers }).map((_, i) => {
                                            const depth = visLayers - i; // 1 = closest to top
                                            const yOff  = depth * LAYER_Y;
                                            const taper = (depth - 1) * 1.5;
                                            const dark  = Math.max(0.45, 1 - depth * 0.12);
                                            return (
                                                <div
                                                    key={i}
                                                    className="tile-shadow-layer"
                                                    style={{
                                                        position: 'absolute',
                                                        left:   taper,
                                                        right:  taper,
                                                        top:    yOff,
                                                        height: TILE_H,
                                                        filter: `brightness(${dark})`,
                                                        zIndex: SHADOW_LAYERS - depth,
                                                        borderRadius: 6,
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Top tile (interactive) */}
                                        {top ? (
                                            <motion.div
                                                key={top.id}
                                                className={`tiles-board-tile ${free ? 'unlocked' : 'locked'}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0,
                                                    width: TILE_W,
                                                    height: TILE_H,
                                                    zIndex: SHADOW_LAYERS + 1,
                                                    backgroundColor: TILE_COLORS[top.symbol],
                                                }}
                                                onClick={() => free && selectStack(stack)}
                                                initial={{ scale: 0.85, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.7, opacity: 0 }}
                                                whileHover={free ? { y: -3, zIndex: 9999 } : {}}
                                                whileTap={free ? { scale: 0.94 } : {}}
                                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                            >
                                                <img
                                                    src={TILE_IMAGES[top.symbol]}
                                                    alt={top.symbol}
                                                    style={{ width: '78%', height: '78%', objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
                                                />
                                                {stack.tiles.length > 1 && (
                                                    <span className="stack-depth-badge">{stack.tiles.length}</span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            // Empty stack slot (ghost divot)
                                            <div className="tile-empty-slot" style={{ width: TILE_W, height: TILE_H }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* BOTTOM: Dock */}
                    <div className="tiles-dock">
                        <div className="tiles-tray-horizontal">
                            {Array.from({ length: TRAY_CAPACITY }).map((_, i) => {
                                const dockTile   = dock[i];
                                const isClearing = dockTile ? clearingIds.has(dockTile.id) : false;
                                return (
                                    <div key={i} className={`tiles-tray-slot ${dockTile ? 'filled' : 'empty'} ${isClearing ? 'clearing' : ''}`}>
                                        <AnimatePresence>
                                            {dockTile && (
                                                <motion.div
                                                    key={dockTile.id}
                                                    layoutId={dockTile.id}
                                                    className="tiles-board-tile dock-tile-override"
                                                    layout
                                                    initial={{ scale: 1.15, y: -12 }}
                                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
                                                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                                    style={{
                                                        width: TILE_W, height: TILE_H,
                                                        position: 'absolute',
                                                        margin: 0,
                                                        pointerEvents: 'none',
                                                        backgroundColor: TILE_COLORS[dockTile.type],
                                                    }}
                                                >
                                                    <img src={TILE_IMAGES[dockTile.type]} alt={dockTile.type}
                                                        style={{ width: '78%', height: '78%', objectFit: 'contain', pointerEvents: 'none' }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="tiles-tray-meta">
                            <span className="tiles-tray-count">{dock.length}/{TRAY_CAPACITY}</span>
                            <span className="tiles-tray-left" style={{ opacity: dock.length >= TRAY_CAPACITY - 2 ? 1 : 0.4 }}>
                                {TRAY_CAPACITY - dock.length === 0 ? 'FULL' : `${TRAY_CAPACITY - dock.length} left`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
                {result && (
                    <motion.div className="tiles-result-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className={`tiles-result-card ${isWin ? 'victory' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                            {isWin ? (
                                <>
                                    <h2>🏆 VICTORY!</h2>
                                    <div className="tiles-result-rewards">
                                        <div className="tiles-reward-row">⭐ Score: {score}</div>
                                        <div className="tiles-reward-row">🗺️ Cleared: {clearPct}%</div>
                                        <div className="tiles-reward-row highlight">🔱 Full Clear!</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2>💀 Defeat</h2>
                                    <div className="tiles-result-rewards">
                                        <div className="tiles-reward-row">⭐ Score: {score}</div>
                                        <div className="tiles-reward-row">🗺️ Cleared: {clearPct}%</div>
                                    </div>
                                    <div className="tiles-revive-buttons">
                                        <button className="tiles-revive-giveup" onClick={() => onClose()}>Give Up</button>
                                        <button className="tiles-revive-purchase" onClick={() => setPurchaseModal('remove')}>Purchase</button>
                                    </div>
                                </>
                            )}
                            <button className="tiles-result-btn" onClick={handleComplete}>
                                {isWin ? 'Collect Rewards' : 'Return'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Purchase Modal */}
            <AnimatePresence>
                {purchaseModal && (
                    <motion.div className="tiles-purchase-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setPurchaseModal(null)}>
                        <motion.div className="tiles-purchase-card"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}>
                            <div className="tiles-purchase-header">
                                <h3>⚙️ Purchase Power-up</h3>
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
