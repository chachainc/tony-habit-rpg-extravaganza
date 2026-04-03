// ─── CONQUEST TILES — Triple Tile Engine ──────────────────────
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

// ─── PROPS ────────────────────────────────────────────
interface ConquestTilesProps {
    onComplete: (result: 'win' | 'loss', difficulty: Difficulty, clearPct: number) => void;
    onClose: () => void;
    canPlay: boolean;
    canPlayImpossible: boolean;
}

// ─── CONSTANTS ────────────────────────────────────────
const TILE_WIDTH   = 44;
const TILE_HEIGHT  = 54;
const TRAY_CAPACITY = 7;

// ─── COMPONENT ────────────────────────────────────────
export const ConquestTiles = ({ onComplete, onClose, canPlay: _canPlay, canPlayImpossible: _canPlayImpossible }: ConquestTilesProps) => {
    const [phase,       setPhase]      = useState<'playing' | 'result'>('playing');
    const [board,       setBoard]      = useState<TripleTileNode[]>([]);
    const [dock,        setDock]       = useState<DockTile[]>([]);
    const [score,       setScore]      = useState(0);
    const [result,      setResult]     = useState<'win' | 'loss' | null>(null);
    const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
    const [reviveLeft]                 = useState(2);

    // Power-up state
    const [ownedRemove,  setOwnedRemove]  = useState(1);
    const [ownedUndo,    setOwnedUndo]    = useState(1);
    const [purchaseModal, setPurchaseModal] = useState<'remove' | 'undo' | 'shuffle' | null>(null);
    const [removeBoughtToday, setRemoveBoughtToday] = useState(0);
    const [undoBoughtToday,   setUndoBoughtToday]   = useState(0);
    const DAILY_BONUS_LIMIT = 3;

    const undoStack = useRef<UndoEntry[]>([]);
    const currency  = useCurrencyStore();
    const addToast  = useToastStore(s => s.addToast);

    const initialCount = useRef(trueTripleTileMap.length);

    // ─── INIT ──────────────────────────────────────────
    useEffect(() => {
        setBoard([...trueTripleTileMap]);
        setDock([]);
        setScore(0);
        setResult(null);
        setClearingIds(new Set());
        undoStack.current = [];
        setPhase('playing');
    }, []);

    // ─── SELECT TILE ───────────────────────────────────
    const selectTile = useCallback((tile: TripleTileNode) => {
        if (phase !== 'playing' || result) return;
        if (dock.length >= TRAY_CAPACITY) return;
        if (clearingIds.size > 0) return;
        if (isTileLocked(tile, board)) return;

        const newScore = score + 10;

        // 1. Remove from board
        const newBoard = board.filter(b => b.id !== tile.id);

        // 2. Add to dock
        const dockTile: DockTile = { id: tile.id, type: tile.type, x: tile.x, y: tile.y, z: tile.z };
        let newDock = [...dock, dockTile];

        // 3. Save undo entry
        undoStack.current.push({ tile: dockTile, prevScore: score });

        // 4. Resolve triads
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
            setBoard(newBoard);
            setDock(newDock);
            setScore(newScore);

            setTimeout(() => {
                setDock(prev => prev.filter(t => !toRemove.includes(t.id)));
                setClearingIds(new Set());
            }, 350);
            return;
        }

        setBoard(newBoard);
        setDock(newDock);
        setScore(newScore);

    }, [phase, result, board, dock, score, clearingIds]);

    // ─── WIN / LOSS CHECK ──────────────────────────────
    useEffect(() => {
        if (phase !== 'playing' || result || clearingIds.size > 0) return;

        if (board.length === 0 && dock.length === 0) {
            const t = setTimeout(() => { setResult('win'); setPhase('result'); }, 300);
            return () => clearTimeout(t);
        }

        if (dock.length >= TRAY_CAPACITY) {
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
        // Restore tile to board
        const restored: TripleTileNode = { id: entry.tile.id, type: entry.tile.type, x: entry.tile.x, y: entry.tile.y, z: entry.tile.z };
        setBoard(prev => [...prev, restored]);
        setDock(prev => {
            const next = [...prev];
            // Remove the last occurrence of this tile id
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
        const unlocked = board.filter(t => !isTileLocked(t, board));
        if (unlocked.length === 0) return;

        // Remove up to 3 from top layer
        const sorted = [...unlocked].sort((a, b) => b.z - a.z);
        const toRemove = sorted.slice(0, 3).map(t => t.id);
        setOwnedRemove(c => c - 1);
        setBoard(prev => prev.filter(t => !toRemove.includes(t.id)));
    }, [ownedRemove, board, clearingIds]);

    // ─── PURCHASE ──────────────────────────────────────
    const handlePurchase = useCallback((type: 'remove' | 'undo' | 'shuffle') => {
        const cost = POWER_COSTS[type];
        const counts = { remove: removeBoughtToday, undo: undoBoughtToday, shuffle: 0 };
        if (counts[type] >= DAILY_BONUS_LIMIT) {
            addToast({ message: `Daily limit reached (${DAILY_BONUS_LIMIT}/day)`, type: 'warning' });
            return;
        }
        if (!currency.spendGold(cost)) {
            addToast({ message: `Not enough gold! Need ${cost}🪙`, type: 'error' });
            return;
        }
        if (type === 'remove') { setOwnedRemove(c => c + 1); setRemoveBoughtToday(c => c + 1); }
        if (type === 'undo')   { setOwnedUndo(c => c + 1);   setUndoBoughtToday(c => c + 1);   }
        setPurchaseModal(null);
    }, [currency, removeBoughtToday, undoBoughtToday, addToast]);

    // ─── RESULT HANDLER ───────────────────────────────
    const handleComplete = useCallback(() => {
        const cleared = initialCount.current - board.length;
        const clearPct = Math.round((cleared / initialCount.current) * 100);
        onComplete(result ?? 'loss', 3, clearPct);
    }, [result, board.length, onComplete]);

    // ─── RENDER HELPERS ───────────────────────────────
    const tileLeft   = (t: TripleTileNode) => t.x * TILE_WIDTH;
    const tileTop    = (t: TripleTileNode) => t.y * TILE_HEIGHT;
    const tileZ      = (t: TripleTileNode) => t.z * 1000 + t.y * 10 + t.x;
    const tileMargin = (t: TripleTileNode) => `${-(t.z * 3)}px`; // Premium thin offset

    // Stable sort: z asc, y asc, id asc
    const sortedBoard = [...board].sort((a, b) =>
        a.z !== b.z ? a.z - b.z :
        a.y !== b.y ? a.y - b.y :
        a.id.localeCompare(b.id)
    );

    // Compute true board pixel bounds for centering
    const PADDING = 20;
    let boardWidth = 300, boardHeight = 400, offsetX = 0, offsetY = 0;
    if (board.length > 0) {
        const rects = board.map(t => ({
            l: tileLeft(t), t: tileTop(t),
            r: tileLeft(t) + TILE_WIDTH, b: tileTop(t) + TILE_HEIGHT
        }));
        const minL = Math.min(...rects.map(r => r.l)) - PADDING;
        const minT = Math.min(...rects.map(r => r.t)) - PADDING;
        const maxR = Math.max(...rects.map(r => r.r)) + PADDING;
        const maxB = Math.max(...rects.map(r => r.b)) + PADDING;
        offsetX = minL; offsetY = minT;
        boardWidth = maxR - minL; boardHeight = maxB - minT;
    }

    // ─── RESULT OVERLAY ───────────────────────────────
    const isWin = result === 'win';
    const cleared = initialCount.current - board.length;
    const clearPct = Math.round((cleared / initialCount.current) * 100);

    return (
        <div className="tiles-root">
            {/* Top Bar */}
            <div className="tiles-topbar">
                <span className="tiles-topbar-label">🎴 Luck Tile</span>
                <span className="tiles-topbar-score">⭐ {score}</span>
                <button className="tiles-topbar-close" onClick={onClose}>✕</button>
            </div>

            {/* Main PlayField */}
            <div className="tiles-game-main">

                {/* LEFT: Power Buttons */}
                <div className="tiles-powers">
                    <div className="tiles-power-wrapper">
                        <button
                            className="tiles-power-btn"
                            onClick={handleUndo}
                            disabled={ownedUndo <= 0 || clearingIds.size > 0}
                            title="Undo"
                        >↩</button>
                        <span className="tiles-power-count">{ownedUndo}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('undo')}>+</button>
                    </div>
                    <div className="tiles-power-wrapper">
                        <button
                            className="tiles-power-btn"
                            onClick={handleRemove}
                            disabled={ownedRemove <= 0 || clearingIds.size > 0}
                            title="Remove 3"
                        >🗑</button>
                        <span className="tiles-power-count">{ownedRemove}</span>
                        <button className="tiles-power-buy" onClick={() => setPurchaseModal('remove')}>+</button>
                    </div>
                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" disabled title="Hint">💡</button>
                        <span className="tiles-power-count">–</span>
                    </div>
                </div>

                {/* CENTER: Board */}
                {/* RIGHT: Board and Dock Block */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    {/* CENTER: Board */}
                    <div className="tiles-board-container">
                        <div className="tiles-board" style={{ width: boardWidth, height: boardHeight, position: 'relative' }}>

                            {/* Divots — bedrock ghost grid */}
                            {bedrockDivots.map(d => (
                                <div
                                    key={`divot-${d.x}-${d.y}`}
                                    className="tiles-divot"
                                    style={{
                                        left: d.x * TILE_WIDTH - offsetX,
                                        top:  d.y * TILE_HEIGHT - offsetY,
                                        width: TILE_WIDTH,
                                        height: TILE_HEIGHT,
                                    }}
                                />
                            ))}

                            {/* Active tiles */}
                            {sortedBoard.map(tile => {
                                const locked  = isTileLocked(tile, board);
                                const left    = tileLeft(tile) - offsetX;
                                const top     = tileTop(tile) - offsetY;

                                return (
                                    <motion.div
                                        key={tile.id}
                                        layoutId={tile.id}
                                        className={`tiles-board-tile ${locked ? 'locked' : 'unlocked'}`}
                                        style={{
                                            left,
                                            top,
                                            marginTop: tileMargin(tile),
                                            zIndex: tileZ(tile),
                                            width: TILE_WIDTH,
                                            height: TILE_HEIGHT,
                                            backgroundColor: TILE_COLORS[tile.type],
                                        }}
                                        onClick={() => !locked && selectTile(tile)}
                                        layout
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        whileHover={!locked ? { y: -2, zIndex: 9999 } : {}}
                                        whileTap={!locked ? { scale: 0.96, zIndex: 9999 } : {}}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <img src={TILE_IMAGES[tile.type]} alt={tile.type} style={{ width: '80%', height: '80%', objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }} />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* BOTTOM: Dock */}
                    <div className="tiles-dock">
                        <div className="tiles-tray-horizontal">
                            {Array.from({ length: TRAY_CAPACITY }).map((_, i) => {
                                const dockTile  = dock[i];
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
                                                    initial={{ scale: 1.1, translateY: -10 }}
                                                    animate={{ scale: 1, opacity: 1, translateY: 0 }}
                                                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
                                                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                                    style={{ 
                                                        width: `${TILE_WIDTH}px`, 
                                                        height: `${TILE_HEIGHT}px`, 
                                                        position: 'absolute',
                                                        margin: 0,
                                                        pointerEvents: 'none',
                                                        backgroundColor: TILE_COLORS[dockTile.type],
                                                    }}
                                                >
                                                    <img src={TILE_IMAGES[dockTile.type]} alt={dockTile.type} style={{ width: '80%', height: '80%', objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        className="tiles-result-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={`tiles-result-card ${isWin ? 'victory' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        >
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
                                    <p className="tiles-revive-text">
                                        You can use {reviveLeft} more revive times...
                                    </p>
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
                    <motion.div
                        className="tiles-purchase-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setPurchaseModal(null)}
                    >
                        <motion.div
                            className="tiles-purchase-card"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="tiles-purchase-header">
                                <h3>⚙️ Purchase Power-up</h3>
                                <button className="tiles-purchase-close" onClick={() => setPurchaseModal(null)}>✕</button>
                            </div>
                            <div className="tiles-purchase-cost">🪙 {POWER_COSTS[purchaseModal]} Gold</div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    className="tiles-revive-giveup"
                                    onClick={() => setPurchaseModal(null)}
                                >Cancel</button>
                                <button
                                    className="tiles-revive-purchase"
                                    disabled={currency.gold < POWER_COSTS[purchaseModal]}
                                    onClick={() => handlePurchase(purchaseModal)}
                                >Buy</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
