// ─── CONQUEST TILES — Tile Match 3 Engine + UI ────────
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    generateBoard,
    isTileBlocked,
    DIFFICULTY_PRESETS,
    POWER_COSTS,
    createSeededRng,
    checkIsSolvable,
    shuffleBoardState,
    type BoardTile,
    type Difficulty,
} from './tileConfig';
import { useConquestStore } from '../../store/useConquestStore';
import { useToastStore } from '../../components/ui/Toast';
import './ConquestTiles.css';

// ─── PROPS ────────────────────────────────────────
interface ConquestTilesProps {
    onComplete: (result: 'win' | 'loss', difficulty: Difficulty) => void;
    onClose: () => void;
    canPlay: boolean;
    canPlayImpossible: boolean;
}

// ─── TRAY CAPACITY ────────────────────────────────
const TRAY_CAPACITY = 7;

// ─── COMPONENT ────────────────────────────────────
export const ConquestTiles = ({ onComplete, onClose, canPlay, canPlayImpossible }: ConquestTilesProps) => {
    // Game state
    const [phase, setPhase] = useState<'select' | 'playing' | 'result'>('select');
    const [difficulty, setDifficulty] = useState<Difficulty>(1);
    const [board, setBoard] = useState<BoardTile[]>([]);
    const [tray, setTray] = useState<BoardTile[]>([]);
    const [points, setPoints] = useState(0);
    const [comboTimer, setComboTimer] = useState<number | null>(null);
    const [comboCount, setComboCount] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [result, setResult] = useState<'win' | 'loss' | null>(null);
    const [clearingIds, setClearingIds] = useState<Set<number>>(new Set());
    const [seed] = useState(() => Math.floor(Math.random() * 2147483647));
    const [trayFull, setTrayFull] = useState(false);
    const [trayFullMessage, setTrayFullMessage] = useState(false);

    // Power-up state
    const [ownedRemove, setOwnedRemove] = useState(0);
    const [ownedUndo, setOwnedUndo] = useState(0);
    const [ownedShuffle, setOwnedShuffle] = useState(0);
    const [purchaseModal, setPurchaseModal] = useState<'remove' | 'undo' | 'shuffle' | null>(null);

    // History for undo
    const history = useRef<{ tile: BoardTile; traySnapshot: BoardTile[] }[]>([]);

    const conquest = useConquestStore();
    const addToast = useToastStore(s => s.addToast);

    // ─── START GAME ───────────────────────────────
    const startGame = useCallback((diff: Difficulty) => {
        setDifficulty(diff);
        const newBoard = generateBoard(diff, seed);
        setBoard(newBoard);
        setTray([]);
        setPoints(0);
        setComboCount(0);
        setMaxCombo(0);
        setComboTimer(null);
        setResult(null);
        setClearingIds(new Set());
        history.current = [];
        setPhase('playing');
    }, [seed]);

    // ─── CHECK TRIPLE CLEAR ──────────────────────
    const checkAndClearTriples = useCallback((currentTray: BoardTile[]): { newTray: BoardTile[]; cleared: boolean } => {
        const counts = new Map<string, number>();
        let wildcardCount = 0;

        for (const t of currentTray) {
            if (t.symbolId === 'special_wildcard') {
                wildcardCount++;
            } else {
                counts.set(t.symbolId, (counts.get(t.symbolId) || 0) + 1);
            }
        }

        let targetSymbolId: string | null = null;

        // 1. Try to form a triple using normal symbols + wildcards
        for (const [symbolId, count] of counts) {
            if (count + wildcardCount >= 3) {
                targetSymbolId = symbolId;
                break;
            }
        }

        // 2. If no normal symbol works, maybe we have 3 wildcards?
        if (!targetSymbolId && wildcardCount >= 3) {
            targetSymbolId = 'special_wildcard';
        }

        if (targetSymbolId) {
            // Collect exactly 3 tiles to remove
            const toRemove: number[] = [];
            let normalTaken = 0;

            for (const t of currentTray) {
                if (t.symbolId === targetSymbolId && normalTaken < 3) {
                    toRemove.push(t.uid);
                    normalTaken++;
                }
            }

            let wildcardsNeeded = 3 - normalTaken;
            for (const t of currentTray) {
                if (t.symbolId === 'special_wildcard' && wildcardsNeeded > 0 && !toRemove.includes(t.uid)) {
                    toRemove.push(t.uid);
                    wildcardsNeeded--;
                }
            }

            setClearingIds(new Set(toRemove));

            // After animation, remove them
            setTimeout(() => {
                setClearingIds(new Set());
            }, 350);

            const newTray = currentTray.filter(t => !toRemove.includes(t.uid));
            return { newTray, cleared: true };
        }
        return { newTray: currentTray, cleared: false };
    }, []);

    // ─── SELECT TILE ─────────────────────────────
    const selectTile = useCallback((tile: BoardTile) => {
        if (phase !== 'playing' || result) return;
        if (tile.removed || isTileBlocked(tile, board)) return;

        // Save history
        history.current.push({ tile, traySnapshot: [...tray] });

        // Check specials that don't go to the tray
        if (tile.symbolId === 'special_bomb') {
            const boardAfterBomb = board.map(t => t.uid === tile.uid ? { ...t, removed: true } : t);
            const detonationIds = new Set<number>([tile.uid]);
            for (const t of boardAfterBomb) {
                if (!t.removed) {
                    const dx = t.x - tile.x;
                    const dy = t.y - tile.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 2.0) detonationIds.add(t.uid); // Circular explosion radius
                }
            }

            const newBoard = boardAfterBomb.map(t => detonationIds.has(t.uid) ? { ...t, removed: true } : t);
            setBoard(newBoard);
            setPoints(p => p + (detonationIds.size * 5));
            addToast({ message: `💥 Bomb detonated! Cleared ${detonationIds.size - 1} tiles!`, type: 'info' });

            if (newBoard.filter(t => !t.removed).length === 0 && tray.length === 0) {
                setResult('win');
                setPhase('result');
            }
            return;
        }

        if (tile.symbolId === 'special_shuffle') {
            const boardAfterClick = board.map(t => t.uid === tile.uid ? { ...t, removed: true } : t);
            const shuffled = shuffleBoardState(boardAfterClick);
            setBoard(shuffled);
            setPoints(p => p + 15);
            addToast({ message: '🔀 Board Shuffled!', type: 'info' });

            if (shuffled.filter(t => !t.removed).length === 0 && tray.length === 0) {
                setResult('win');
                setPhase('result');
            }
            return;
        }

        // Normal tile execution
        const newBoard = board.map(t => t.uid === tile.uid ? { ...t, removed: true } : t);
        setBoard(newBoard);

        const newTray = [...tray, tile];
        const trayCapacityLimit = difficulty >= 3 ? 6 : TRAY_CAPACITY;

        const { newTray: afterClear, cleared } = checkAndClearTriples(newTray);

        const applyAutoShuffle = (b: BoardTile[], t: BoardTile[]) => {
            if (b.filter(x => !x.removed).length > 0 && !checkIsSolvable(b, t, trayCapacityLimit)) {
                setTimeout(() => {
                    setBoard(shuffleBoardState(b));
                    addToast({ message: 'No moves detected - Auto Shuffled!', type: 'warning' });
                }, 500);
            }
        };

        if (cleared) {
            // Award points
            const now = Date.now();
            let bonus = 0;
            let currentCombo = 1;

            if (comboTimer && now - comboTimer < 2500) {
                currentCombo = comboCount + 1;
                bonus = 5 * currentCombo;
            }

            setComboCount(currentCombo);
            setMaxCombo(m => Math.max(m, currentCombo));
            setComboTimer(now);
            setPoints(p => p + 10 + bonus);

            setTimeout(() => {
                setTray(afterClear);
                const remainingBoard = newBoard.filter(t => !t.removed);
                if (remainingBoard.length === 0) {
                    let finalTray = afterClear;
                    let keepChecking = true;
                    while (keepChecking) {
                        const result2 = checkAndClearTriples(finalTray);
                        if (result2.cleared) {
                            finalTray = result2.newTray;
                            setPoints(p => p + 10);
                        } else {
                            keepChecking = false;
                        }
                    }
                    setTray(finalTray);
                    if (finalTray.length === 0 || newBoard.filter(t => !t.removed).length === 0) {
                        setResult('win');
                        setPhase('result');
                    }
                } else {
                    applyAutoShuffle(newBoard, afterClear);
                }
            }, 380);
        } else {
            setTray(newTray);
            if (newTray.length >= trayCapacityLimit) {
                setTrayFull(true);
                setTrayFullMessage(true);
                setTimeout(() => setTrayFull(false), 600);
                setTimeout(() => {
                    setTrayFullMessage(false);
                    setResult('loss');
                    setPhase('result');
                }, 800);
            } else {
                applyAutoShuffle(newBoard, newTray);
                const remainingBoard = newBoard.filter(t => !t.removed);
                if (remainingBoard.length === 0 && newTray.length === 0) {
                    setResult('win');
                    setPhase('result');
                }
            }
        }
    }, [phase, result, board, tray, comboTimer, comboCount, checkAndClearTriples, difficulty, addToast]);

    // ─── POWER: REMOVE ───────────────────────────
    const useRemove = useCallback(() => {
        if (ownedRemove <= 0 || phase !== 'playing') return;
        const selectable = board.filter(t => !t.removed && !isTileBlocked(t, board));
        const toRemove = selectable.slice(0, 3);
        if (toRemove.length === 0) return;

        setOwnedRemove(c => c - 1);
        setBoard(prev => prev.map(t =>
            toRemove.find(r => r.uid === t.uid) ? { ...t, removed: true } : t
        ));
    }, [ownedRemove, board, phase]);

    // ─── POWER: UNDO ─────────────────────────────
    const useUndo = useCallback(() => {
        if (ownedUndo <= 0 || phase !== 'playing' || history.current.length === 0) return;
        const last = history.current.pop()!;
        setOwnedUndo(c => c - 1);

        // Restore tile to board
        setBoard(prev => prev.map(t =>
            t.uid === last.tile.uid ? { ...t, removed: false } : t
        ));
        // Restore tray
        setTray(last.traySnapshot);
    }, [ownedUndo, phase]);

    // ─── POWER: SHUFFLE ──────────────────────────
    const useShuffle = useCallback(() => {
        if (ownedShuffle <= 0 || phase !== 'playing') return;
        setOwnedShuffle(c => c - 1);

        const remaining = board.filter(t => !t.removed);
        const symbols = remaining.map(t => ({ symbolId: t.symbolId, symbol: t.symbol }));

        // Shuffle symbols
        const rng = createSeededRng(Date.now());
        for (let i = symbols.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }

        let idx = 0;
        setBoard(prev => prev.map(t => {
            if (t.removed) return t;
            const sym = symbols[idx++];
            return { ...t, symbolId: sym.symbolId, symbol: sym.symbol };
        }));
    }, [ownedShuffle, board, phase]);

    // ─── PURCHASE ─────────────────────────────────
    const handlePurchase = useCallback((type: 'remove' | 'undo' | 'shuffle') => {
        const cost = POWER_COSTS[type];
        if (conquest.sigils < cost) return;
        conquest.spendSigils(cost);
        switch (type) {
            case 'remove': setOwnedRemove(c => c + 1); break;
            case 'undo': setOwnedUndo(c => c + 1); break;
            case 'shuffle': setOwnedShuffle(c => c + 1); break;
        }
        setPurchaseModal(null);
    }, [conquest]);

    // ─── COMBO EXPIRY EFFECT ──────────────────────
    useEffect(() => {
        if (!comboTimer) return;
        const interval = setInterval(() => {
            if (Date.now() - comboTimer >= 2500) {
                setComboCount(0);
                setComboTimer(null);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [comboTimer]);

    // ─── TRIGGER RESULT CALLBACK ──────────────────
    useEffect(() => {
        if (result && phase === 'result') {
            onComplete(result, difficulty);
        }
    }, [result, phase, difficulty, onComplete]);

    // ─── TRAY CAPACITY (difficulty-scaled) ─────────
    const trayCapacity = difficulty >= 3 ? 6 : TRAY_CAPACITY;

    // ─── COMPUTE LAYOUT BOUNDS ────────────────────
    const activeTiles = board.filter(t => !t.removed);
    const tileSize = window.innerWidth < 600 ? 48 : 60;
    const gap = tileSize * 0.85;

    let boardWidth = 0;
    let boardHeight = 0;
    if (activeTiles.length > 0) {
        const maxX = Math.max(...board.filter(t => !t.removed).map(t => t.x));
        const maxY = Math.max(...board.filter(t => !t.removed).map(t => t.y));
        boardWidth = (maxX + 1) * gap + tileSize;
        boardHeight = (maxY + 1) * gap + tileSize;
    }

    // ─── SIGIL / GEM / XP REWARD CALC ─────────────
    const preset = DIFFICULTY_PRESETS[difficulty];
    const XP_MULTIPLIER: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };
    const getXP = () => {
        if (result !== 'win') return 0;
        const base = XP_MULTIPLIER[difficulty] || 1;
        const comboBonus = Math.floor(maxCombo / 3);
        return base + comboBonus;
    };

    // ─── RENDER: DIFFICULTY SELECT ────────────────
    const renderDifficultySelect = () => (
        <div className="tiles-difficulty-screen">
            <div className="tiles-diff-title">🎴 Conquest Tiles</div>
            <div className="tiles-diff-subtitle">
                Match 3 identical tiles to clear them. Clear the entire board to win Sigils!
            </div>

            {!canPlay && (
                <div className="tiles-already-played">
                    ⏳ You've already played Tiles today. Come back tomorrow!
                </div>
            )}

            <div className="tiles-diff-buttons">
                {([1, 2, 3, 4] as Difficulty[]).map(d => {
                    const p = DIFFICULTY_PRESETS[d];
                    const locked = d === 4 && !canPlayImpossible;
                    return (
                        <button
                            key={d}
                            className="tiles-diff-btn"
                            disabled={!canPlay || locked}
                            onClick={() => startGame(d)}
                        >
                            <span>{p.label} — {p.totalTiles} tiles</span>
                            <span className="tiles-diff-reward">
                                {p.gemReward > 0 ? `💎 ${p.gemReward} Gems` : '🔱 Sigils'}
                                {locked && ' 🔒'}
                            </span>
                        </button>
                    );
                })}
            </div>
            {!canPlayImpossible && (
                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                    Win 3 Hard games to unlock Impossible mode
                </div>
            )}
        </div>
    );

    // ─── RENDER: PURCHASE MODAL ───────────────────
    const renderPurchaseModal = () => {
        if (!purchaseModal) return null;
        const info: Record<string, { icon: string; title: string; desc: string }> = {
            remove: { icon: '🧲', title: 'Remove Item', desc: 'Remove 3 cards and place them aside' },
            undo: { icon: '↩️', title: 'Withdraw Item', desc: 'Withdraw 1 card and put it back in its original position' },
            shuffle: { icon: '🔀', title: 'Shuffle Item', desc: 'Randomly shuffle all unused cards' },
        };
        const item = info[purchaseModal];
        const cost = POWER_COSTS[purchaseModal];
        const owned = purchaseModal === 'remove' ? ownedRemove : purchaseModal === 'undo' ? ownedUndo : ownedShuffle;

        return (
            <motion.div
                className="tiles-purchase-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPurchaseModal(null)}
            >
                <motion.div
                    className="tiles-purchase-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="tiles-purchase-header">
                        <h3>⚙️ Purchase</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span className="tiles-purchase-owned">Owned: {owned}</span>
                            <button className="tiles-purchase-close" onClick={() => setPurchaseModal(null)}>✕</button>
                        </div>
                    </div>

                    <div className="tiles-purchase-item">
                        <div className="tiles-purchase-icon">{item.icon}</div>
                        <div className="tiles-purchase-info">
                            <h4>{item.title}</h4>
                            <p>{item.desc}</p>
                        </div>
                    </div>

                    <div className="tiles-purchase-cost">
                        🔱 {cost} Sigils
                    </div>

                    <button
                        className="tiles-purchase-buy-btn"
                        disabled={conquest.sigils < cost}
                        onClick={() => handlePurchase(purchaseModal)}
                    >
                        Purchase
                    </button>
                </motion.div>
            </motion.div>
        );
    };

    // ─── RENDER: GAME BOARD ───────────────────────
    const renderGame = () => (
        <div className="tiles-game-area tiles-game-area--horizontal">
            {/* Top row: Powers + Board */}
            <div className="tiles-game-top">
                {/* Left: Power buttons */}
                <div className="tiles-powers">
                    <div style={{ position: 'relative' }}>
                        <button
                            className="tiles-power-btn"
                            disabled={ownedRemove <= 0}
                            onClick={useRemove}
                        >
                            🧲
                            <span className="tiles-power-badge">{ownedRemove}</span>
                            <span className="tiles-power-label">Remove</span>
                        </button>
                        <div
                            style={{
                                position: 'absolute', top: -4, right: -14,
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'rgba(245,158,11,0.9)', color: '#000',
                                fontSize: '0.8rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', border: '2px solid #0f2847',
                            }}
                            onClick={() => setPurchaseModal('remove')}
                        >+</div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            className="tiles-power-btn"
                            disabled={ownedUndo <= 0 || history.current.length === 0}
                            onClick={useUndo}
                        >
                            ↩️
                            <span className="tiles-power-badge">{ownedUndo}</span>
                            <span className="tiles-power-label">Undo</span>
                        </button>
                        <div
                            style={{
                                position: 'absolute', top: -4, right: -14,
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'rgba(245,158,11,0.9)', color: '#000',
                                fontSize: '0.8rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', border: '2px solid #0f2847',
                            }}
                            onClick={() => setPurchaseModal('undo')}
                        >+</div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            className="tiles-power-btn"
                            disabled={ownedShuffle <= 0}
                            onClick={useShuffle}
                        >
                            🔀
                            <span className="tiles-power-badge">{ownedShuffle}</span>
                            <span className="tiles-power-label">Shuffle</span>
                        </button>
                        <div
                            style={{
                                position: 'absolute', top: -4, right: -14,
                                width: 20, height: 20, borderRadius: '50%',
                                background: 'rgba(245,158,11,0.9)', color: '#000',
                                fontSize: '0.8rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', border: '2px solid #0f2847',
                            }}
                            onClick={() => setPurchaseModal('shuffle')}
                        >+</div>
                    </div>
                </div>

                {/* Center: Board */}
                <div className="tiles-board-container">
                    <div className="tiles-board" style={{ width: boardWidth, height: boardHeight }}>
                        <AnimatePresence>
                            {board.filter(t => !t.removed).map(tile => {
                                const blocked = isTileBlocked(tile, board);
                                return (
                                    <motion.div
                                        key={tile.uid}
                                        className={`tiles-board-tile ${blocked ? 'blocked' : 'selectable'}`}
                                        style={{
                                            left: tile.x * gap,
                                            top: tile.y * gap,
                                            zIndex: tile.layer * 10,
                                            width: tileSize,
                                            height: tileSize,
                                        }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0, y: -20 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => !blocked && selectTile(tile)}
                                        whileHover={!blocked ? { scale: 1.1, y: -3 } : {}}
                                        whileTap={!blocked ? { scale: 0.9 } : {}}
                                    >
                                        {tile.symbol.imageSrc ? (
                                            <img className="tile-face-img" src={tile.symbol.imageSrc} alt={tile.symbol.label} />
                                        ) : (
                                            <span className="tile-face">{tile.symbol.emoji}</span>
                                        )}
                                        <span className={`tile-rarity-dot ${tile.symbol.rarity}`} />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Middle: Combo Track */}
            <div style={{ height: 24, padding: '0 1rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <AnimatePresence>
                    {comboCount > 1 && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, x: -20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0.8, opacity: 0, x: -20 }}
                            style={{
                                color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem',
                                background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4,
                                border: '1px solid #f59e0b', display: 'flex', gap: 6, alignItems: 'center'
                            }}
                        >
                            <span>🔥 Combo x{comboCount}</span>
                            <motion.div
                                style={{ width: 40, height: 4, background: '#444', borderRadius: 2, overflow: 'hidden' }}
                            >
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 2.5, ease: 'linear' }}
                                    style={{ height: '100%', background: '#f59e0b' }}
                                    key={`timer-${comboTimer}`} // re-trigger animation on timer reset
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom: Horizontal Tray */}
            <div className={`tiles-tray-bar ${trayFull ? 'tray-shake tray-flash' : ''}`}>
                <div className="tiles-tray-label">
                    Tray {tray.length}/{trayCapacity}
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#ef4444', opacity: tray.length >= trayCapacity - 2 ? 1 : 0.4 }}>
                        {trayCapacity - tray.length === 0 ? '⚠ FULL' : `${trayCapacity - tray.length} left`}
                    </span>
                </div>
                <div className="tiles-tray-horizontal" style={{ width: `${trayCapacity * 60}px` }}>
                    {Array.from({ length: trayCapacity }).map((_, i) => {
                        const tile = tray[i];
                        if (tile) {
                            const isClearing = clearingIds.has(tile.uid);
                            const matchCount = tray.filter(t => t.symbolId === tile.symbolId).length;
                            const isMatching = matchCount >= 2 && !isClearing;
                            return (
                                <motion.div
                                    key={tile.uid}
                                    className={`tiles-tray-tile ${isClearing ? 'clearing' : ''} ${isMatching ? 'matching' : ''}`}
                                    initial={{ y: -30, opacity: 0, scale: 0.6 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                                    layout
                                >
                                    {tile.symbol.imageSrc ? (
                                        <img className="tile-face-img" src={tile.symbol.imageSrc} alt={tile.symbol.label} style={{ width: 36, height: 36 }} />
                                    ) : (
                                        <span className="tile-face" style={{ fontSize: '1.3rem' }}>{tile.symbol.emoji}</span>
                                    )}
                                </motion.div>
                            );
                        }
                        return (
                            <div key={`empty-${i}`} className="tiles-tray-slot" />
                        );
                    })}
                </div>
                {/* Tray Full Message */}
                <AnimatePresence>
                    {trayFullMessage && (
                        <motion.div
                            className="tray-full-message"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            🚫 TRAY FULL!
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Result overlay */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        className="tiles-result-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={`tiles-result-card ${result === 'win' ? 'victory' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <h2>{result === 'win' ? '🏆 VICTORY!' : '💀 DEFEAT'}</h2>
                            <div className="tiles-result-rewards">
                                <div className="tiles-reward-row">📊 Points: {points}</div>
                                {result === 'win' && (
                                    <>
                                        <div className="tiles-reward-row highlight">🔱 Sigils Earned!</div>
                                        <div className="tiles-reward-row highlight">🎯 +{getXP()} Strategy XP {maxCombo >= 3 ? `(Combo Bonus!)` : ''}</div>
                                        {preset.gemReward > 0 && (
                                            <div className="tiles-reward-row highlight">💎 +{preset.gemReward} Gems</div>
                                        )}
                                    </>
                                )}
                                {result === 'loss' && (
                                    <div className="tiles-reward-row">Tray filled up — zero Strategy XP!</div>
                                )}
                            </div>
                            <button className="tiles-play-again-btn" onClick={onClose}>
                                Done
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Purchase modal */}
            <AnimatePresence>
                {renderPurchaseModal()}
            </AnimatePresence>
        </div>
    );

    // ─── MAIN RENDER ──────────────────────────────
    return (
        <motion.div
            className="tiles-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="tiles-bg-blur" />

            {/* Top Bar */}
            <div className="tiles-top-bar">
                <div className="tiles-title">
                    <span className="tiles-title-icon">🎴</span>
                    Conquest Tiles
                </div>
                {phase === 'playing' && (
                    <div className="tiles-points">Points: <span>{points}</span></div>
                )}
                <button className="tiles-close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Content */}
            {phase === 'select' && renderDifficultySelect()}
            {(phase === 'playing' || phase === 'result') && renderGame()}
        </motion.div>
    );
};
