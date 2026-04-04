// ─── CONQUEST TILES — Mahjong Board Engine ────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    trueTripleTileMap,
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
// Close-to-square tile — dense, physical Mahjong piece feel
const TILE_W   = 44;  // px wide (2 logical units)
const TILE_H   = 40;  // px tall (ratio ~1.1 — near square)
const Y_PITCH  = 40;  // tighter rows — 2px gap reduction for denser grid
const Z_LIFT   =  5;  // increased: more visible stack depth per z-level
const TRAY_CAP =  7;
const MAX_Z    =  8;  // anchor stacks go to z=8

export const ConquestTiles = ({ onComplete, onClose }: ConquestTilesProps) => {
    const [phase,       setPhase]      = useState<'playing' | 'result'>('playing');
    const [board,       setBoard]      = useState<TripleTileNode[]>([]);
    const [dock,        setDock]       = useState<DockTile[]>([]);
    const [score,       setScore]      = useState(0);
    const [result,      setResult]     = useState<'win' | 'loss' | null>(null);
    const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
    const [hintTileIds, setHintTileIds] = useState<Set<string>>(new Set());
    const [bumpingId,   setBumpingId]  = useState<string | null>(null);

    // Power-up usage counters
    const MAX_POWER_USE = 2;
    const [usedUndo,    setUsedUndo]    = useState(0);
    const [usedShuffle, setUsedShuffle] = useState(0);
    const [usedHint,    setUsedHint]    = useState(0);

    const undoStack    = useRef<UndoEntry[]>([]);
    const initialCount = useRef(trueTripleTileMap.length);
    const currency     = useCurrencyStore();
    const addToast     = useToastStore(s => s.addToast);

    // ─── INIT ──────────────────────────────────────────
    useEffect(() => {
        setBoard([...trueTripleTileMap]);
        setDock([]); setScore(0); setResult(null);
        setClearingIds(new Set());
        setHintTileIds(new Set());
        undoStack.current = [];
        setPhase('playing');
        setUsedUndo(0); setUsedShuffle(0); setUsedHint(0);
    }, []);

    // ─── SELECT TILE ───────────────────────────────────
    const selectTile = useCallback((tile: TripleTileNode) => {
        if (phase !== 'playing' || result) return;
        if (dock.length >= TRAY_CAP || clearingIds.size > 0) return;
        if (isTileLocked(tile, board)) return;

        setHintTileIds(new Set());
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
            setTimeout(() => {
                setDock(p => p.filter(t => !toRemove.includes(t.id)));
                setClearingIds(new Set());
            }, 350);
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

    // ─── POWERS ──────────────────────────────────────────
    const buyPower = (_type: string, cost: number, usedCount: number, setUsed: (u: number) => void, action: () => void) => {
        if (usedCount >= MAX_POWER_USE) {
            addToast({ message: 'Max uses reached for this game.', type: 'warning' });
            return;
        }
        if (!currency.spendGold(cost)) {
            addToast({ message: `Need ${cost}🪙`, type: 'error' });
            return;
        }
        setUsed(usedCount + 1);
        action();
    };

    const handleUndo = useCallback(() => {
        if (clearingIds.size > 0 || undoStack.current.length === 0) return;
        buyPower('undo', POWER_COSTS.undo, usedUndo, setUsedUndo, () => {
            const entry = undoStack.current.pop();
            if (!entry) return;
            const restored: TripleTileNode = {
                id: entry.tile.id, type: entry.tile.type,
                x: entry.tile.x, y: entry.tile.y, z: entry.tile.z, coveredBy: [],
            };
            setBoard(prev => [...prev, restored]);
            setDock(prev => { const n = [...prev]; for (let i = n.length - 1; i >= 0; i--) { if (n[i].id === entry.tile.id) { n.splice(i, 1); break; } } return n; });
            setScore(entry.prevScore);
            setHintTileIds(new Set());
        });
    }, [usedUndo, clearingIds, currency]); // eslint-disable-line

    const handleShuffle = useCallback(() => {
        if (clearingIds.size > 0 || board.length === 0) return;
        buyPower('shuffle', POWER_COSTS.shuffle, usedShuffle, setUsedShuffle, () => {
            const types = board.map(b => b.type);
            for (let i = types.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [types[i], types[j]] = [types[j], types[i]];
            }
            setBoard(prev => prev.map((b, i) => ({ ...b, type: types[i] })));
            setHintTileIds(new Set());
        });
    }, [usedShuffle, board, clearingIds, currency]); // eslint-disable-line

    const handleHint = useCallback(() => {
        if (clearingIds.size > 0) return;
        buyPower('hint', POWER_COSTS.hint, usedHint, setUsedHint, () => {
            const free = board.filter(t => !isTileLocked(t, board));
            const counts = new Map<string, TripleTileNode[]>();
            for (const t of free) {
                if (!counts.has(t.type)) counts.set(t.type, []);
                counts.get(t.type)!.push(t);
            }
            for (const tiles of counts.values()) {
                if (tiles.length >= 3) {
                    setHintTileIds(new Set(tiles.slice(0, 3).map(t => t.id)));
                    return;
                }
            }
            for (const tiles of counts.values()) {
                if (tiles.length > 0) {
                    setHintTileIds(new Set([tiles[0].id]));
                    addToast({ message: 'No full triples free. Next move highlighted.', type: 'info' });
                    return;
                }
            }
        });
    }, [usedHint, board, clearingIds, currency]); // eslint-disable-line

    // ─── RESULT HANDLER ───────────────────────────────
    const handleComplete = useCallback(() => {
        const clearPct = Math.round(((initialCount.current - board.length) / initialCount.current) * 100);
        onComplete(result ?? 'loss', 3, clearPct);
    }, [result, board.length, onComplete]);

    // ─── RENDER HELPERS ───────────────────────────────
    //
    // Tile logical size: 2 units wide, 1 unit tall.
    // Each x-unit = TILE_W/2 pixels.
    // So tile at x occupies pixels [x*(TILE_W/2), x*(TILE_W/2) + TILE_W).
    //
    // Stagger: odd-z tiles are at x = even+1, so they render
    // centered between the two tiles they cover below.
    //
    //   z=0: tile at x=0 → left=0px
    //   z=0: tile at x=2 → left=60px
    //   z=1: tile at x=1 → left=30px  ← sits exactly between the two
    //
    // This produces the classic Mahjong split-coverage overlap.

    const tileLeft = (t: TripleTileNode) => t.x * (TILE_W / 2);

    // Higher z = visually higher (smaller y) — upper tiles lift slightly.
    // Each layer offset: Z_LIFT px upward per z. Lower tiles peek at bottom.
    const tileTop  = (t: TripleTileNode) => t.y * Y_PITCH - t.z * Z_LIFT;

    // Painter's z-index: higher z always renders on top.
    // Within same z: higher y (lower on screen) renders on top for perspective.
    const tileZ    = (t: TripleTileNode) => t.z * 500 + t.y * 10 + 1;

    // ─── SCALE TO FIT ─────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    let contentW = 400, contentH = 300, minX = 0, minY = 0;
    if (board.length > 0) {
        minX = Math.min(...board.map(tileLeft));
        minY = Math.min(...board.map(tileTop));
        const maxX = Math.max(...board.map(t => tileLeft(t) + TILE_W));
        const maxY = Math.max(...board.map(t => tileTop(t)  + TILE_H));
        contentW = maxX - minX;
        contentH = maxY - minY;
    }
    const PADDING    = 28;
    const containerW = contentW + PADDING * 2;
    const containerH = contentH + PADDING * 2;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                const { width, height } = e.contentRect;
                const sx = width  / containerW;
                const sy = height / containerH;
                setScale(Math.min(sx, sy, 1.1));
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [containerW, containerH]);

    // Sort: z asc (bottom first), then y, then x — painter's algorithm
    const sortedBoard = [...board].sort((a, b) =>
        a.z !== b.z ? a.z - b.z : a.y !== b.y ? a.y - b.y : a.x - b.x
    );

    const isWin    = result === 'win';
    const clearPct = Math.round(((initialCount.current - board.length) / initialCount.current) * 100);

    // ─── RENDER ─────────────────────────────────────────
    return (
        <div className="tiles-root">
            {/* ── PORTRAIT LOCK ──────────────────────────── */}
            <div className="tiles-portrait-lock">
                <div className="portrait-lock-icon">🔄</div>
                <h2>Rotate your device</h2>
                <p>Strategic sorting requires a landscape view.</p>
                <button onClick={onClose} className="tiles-result-btn" style={{ marginTop: '1rem', width: '200px' }}>Leave</button>
            </div>

            {/* ── TOP BAR ────────────────────────────────── */}
            <div className="tiles-topbar">
                <span className="tiles-topbar-label">🎴 TILE GAME</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="tiles-topbar-score" style={{ color: '#fff' }}>🪙 {currency.gold}</span>
                    <span className="tiles-topbar-score">⭐ {score}</span>
                    <button className="tiles-topbar-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* ── MAIN WRAP: Board Area + Side Panel ─────── */}
            <div className="tiles-main-wrap">

                {/* CONTENT AREA: board + dock stacked vertically */}
                <div className="tiles-content-area">

                    {/* BOARD */}
                    <div className="tiles-board-container" ref={containerRef}>
                        <div className="tiles-board-scaler" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                            <div className="tiles-board" style={{ width: contentW, height: contentH }}>

                                {sortedBoard.map(tile => {
                                    const locked    = isTileLocked(tile, board);
                                    const left      = tileLeft(tile) - minX;
                                    const top       = tileTop(tile)  - minY;
                                    const isHint    = hintTileIds.has(tile.id);
                                    const isBumping = bumpingId === tile.id;

                                    // 1. Unlocked tiles are top playable tiles: bright & sharp
                                    // 2. Locked tiles are beneath: darker & blurrier based on absolute z-level
                                    const stackBrightness = locked
                                        ? Math.max(0.40, 0.95 - ((MAX_Z - tile.z) * 0.10))
                                        : 1.15; // Playable tile indicator: slightly boosted brightness

                                    const stackBlur = locked
                                        ? Math.min(1.5, ((MAX_Z - tile.z) * 0.18))
                                        : 0; // Playable tiles are perfectly sharp

                                    return (
                                        <motion.div
                                            key={tile.id}
                                            layoutId={tile.id}
                                            className={[
                                                'tiles-board-tile',
                                                locked    ? 'locked'   : 'unlocked',
                                                isHint    ? 'hinted'   : '',
                                                isBumping ? 'bumping'  : '',
                                            ].filter(Boolean).join(' ')}
                                            style={{
                                                left, top,
                                                width: TILE_W, height: TILE_H,
                                                zIndex: tileZ(tile),
                                                filter: `brightness(${stackBrightness}) blur(${stackBlur}px)`,
                                            }}
                                            onClick={() => {
                                                if (!locked) {
                                                    selectTile(tile);
                                                } else {
                                                    // Bump feedback for blocked-tile tap
                                                    setBumpingId(tile.id);
                                                    setTimeout(() => setBumpingId(null), 220);
                                                }
                                            }}
                                            layout
                                            initial={{ scale: 0.88, opacity: 0 }}
                                            animate={{ scale: 1,    opacity: 1 }}
                                            exit={{ scale: 0.72, opacity: 0 }}
                                            whileHover={!locked ? { y: -4, scale: 1.02, zIndex: 9999 } : {}}
                                            whileTap={!locked   ? { y: -8, scale: 1.05, zIndex: 9999 } : {}}
                                            transition={{ duration: 0.14, ease: 'easeOut' }}
                                        >
                                            <div className="tiles-inner-frame">
                                                <img src={TILE_IMAGES[tile.type]} alt={tile.type} className="tiles-tile-img" />
                                            </div>
                                        </motion.div>
                                    );
                                })}

                            </div>
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
                                                    initial={{ scale: 1.1, y: -8 }}
                                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.14 } }}
                                                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                                    style={{
                                                        width: TILE_W, height: TILE_H,
                                                        position: 'absolute',
                                                        pointerEvents: 'none',
                                                        backgroundColor: TILE_COLORS[dt.type] || '#1e293b',
                                                    }}
                                                >
                                                    <div className="tiles-inner-frame">
                                                        <img src={TILE_IMAGES[dt.type]} alt={dt.type} className="tiles-tile-img" />
                                                    </div>
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

                </div>{/* end .tiles-content-area */}

                {/* SIDE PANEL — Power-ups */}
                <div className="tiles-side-panel">
                    <div className="side-power"
                        onClick={handleShuffle}
                        aria-disabled={usedShuffle >= MAX_POWER_USE || currency.gold < POWER_COSTS.shuffle}
                    >
                        <div className="side-power-icon">🔀</div>
                        <div className="side-power-name">Shuffle</div>
                        <div className="side-power-meta">{usedShuffle}/{MAX_POWER_USE} · 20g</div>
                    </div>
                    <div className="side-power"
                        onClick={handleHint}
                        aria-disabled={usedHint >= MAX_POWER_USE || currency.gold < POWER_COSTS.hint}
                    >
                        <div className="side-power-icon">💡</div>
                        <div className="side-power-name">Hint</div>
                        <div className="side-power-meta">{usedHint}/{MAX_POWER_USE} · 20g</div>
                    </div>
                    <div className="side-power"
                        onClick={handleUndo}
                        aria-disabled={usedUndo >= MAX_POWER_USE || undoStack.current.length === 0 || currency.gold < POWER_COSTS.undo}
                    >
                        <div className="side-power-icon">↩️</div>
                        <div className="side-power-name">Undo</div>
                        <div className="side-power-meta">{usedUndo}/{MAX_POWER_USE} · 20g</div>
                    </div>
                </div>

            </div>{/* end .tiles-main-wrap */}

            {/* ── RESULT OVERLAY ─────────────────────────── */}
            <AnimatePresence>
                {result && (
                    <motion.div className="tiles-result-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div className={`tiles-result-card ${isWin ? 'victory' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        >
                            <h2>{isWin ? '🏆 VICTORY!' : '💀 Defeat'}</h2>
                            <div className="tiles-result-rewards">
                                <div className="tiles-reward-row">⭐ {score} pts</div>
                                <div className="tiles-reward-row">🗺️ {clearPct}% cleared</div>
                                {isWin && <div className="tiles-reward-row highlight">🔱 Full Board Clear!</div>}
                            </div>
                            {!isWin && (
                                <div className="tiles-revive-buttons">
                                    <button className="tiles-revive-giveup" onClick={onClose}>Leave</button>
                                </div>
                            )}
                            <button className="tiles-result-btn" onClick={handleComplete}>
                                {isWin ? 'Collect Rewards' : 'Return'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
