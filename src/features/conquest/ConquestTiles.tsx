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
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useToastStore } from '../../components/ui/Toast';
import './ConquestTiles.css';

// ─── PROPS ────────────────────────────────────────
interface ConquestTilesProps {
    onComplete: (result: 'win' | 'loss', difficulty: Difficulty, clearPct: number) => void;
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
    const [initialTileCount, setInitialTileCount] = useState(0);
    const [showResultButton, setShowResultButton] = useState(false);

    // Power-up state
    const [ownedRemove, setOwnedRemove] = useState(0);
    const [ownedUndo, setOwnedUndo] = useState(0);
    const [ownedShuffle, setOwnedShuffle] = useState(0);
    const [purchaseModal, setPurchaseModal] = useState<'remove' | 'undo' | 'shuffle' | null>(null);
    // Daily use counters (reset when the game session reloads — stored per session only)
    const [removeBoughtToday, setRemoveBoughtToday] = useState(0);
    const [undoBoughtToday, setUndoBoughtToday] = useState(0);
    const [shuffleBoughtToday, setShuffleBoughtToday] = useState(0);
    const DAILY_BONUS_LIMIT = 3;

    // History for undo
    const history = useRef<{ tile: BoardTile; traySnapshot: BoardTile[] }[]>([]);

    const conquest = useConquestStore();
    const currency = useCurrencyStore();
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
        setInitialTileCount(newBoard.length);
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
        const boughtCounts = { remove: removeBoughtToday, undo: undoBoughtToday, shuffle: shuffleBoughtToday };
        if (boughtCounts[type] >= DAILY_BONUS_LIMIT) {
            addToast({ message: `Daily limit reached for this bonus (${DAILY_BONUS_LIMIT}/day)`, type: 'warning' });
            return;
        }
        if (!currency.spendGold(cost)) {
            addToast({ message: `Not enough gold! Need ${cost}🪙`, type: 'error' });
            return;
        }
        switch (type) {
            case 'remove': setOwnedRemove(c => c + 1); setRemoveBoughtToday(c => c + 1); break;
            case 'undo': setOwnedUndo(c => c + 1); setUndoBoughtToday(c => c + 1); break;
            case 'shuffle': setOwnedShuffle(c => c + 1); setShuffleBoughtToday(c => c + 1); break;
        }
        setPurchaseModal(null);
    }, [conquest, currency, removeBoughtToday, undoBoughtToday, shuffleBoughtToday, addToast]);

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

    // ─── TRAY CAPACITY (difficulty-scaled) ─────────
    const trayCapacity = difficulty >= 3 ? 6 : TRAY_CAPACITY;

    // ─── COMPUTE LAYOUT BOUNDS ────────────────────
    const activeTiles = board.filter(t => !t.removed);
    const isMobile = window.innerWidth < 600;
    const tileW = isMobile ? 36 : 48;
    const tileH = isMobile ? 46 : 60;
    const gapX = tileW;
    const gapY = tileH * 0.85;

    let boardWidth = 0;
    let boardHeight = 0;
    let offsetX = 0;
    let offsetY = 0;
    if (activeTiles.length > 0) {
        const minX = Math.min(...activeTiles.map(t => t.x));
        const minY = Math.min(...activeTiles.map(t => t.y));
        const maxX = Math.max(...activeTiles.map(t => t.x));
        const maxY = Math.max(...activeTiles.map(t => t.y));
        offsetX = minX * gapX;
        offsetY = minY * gapY;
        boardWidth = (maxX - minX + 1) * gapX + tileW;
        boardHeight = (maxY - minY + 1) * gapY + tileH;
    }

    // ─── SIGIL / GEM / XP REWARD CALC ─────────────
    const preset = DIFFICULTY_PRESETS[difficulty];
    const XP_MULTIPLIER: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };

    // Calculate clear percentage
    const tilesRemoved = board.filter(t => t.removed).length;
    const clearPct = initialTileCount > 0 ? Math.round((tilesRemoved / initialTileCount) * 100) : 0;
    const isPartialClear = result === 'loss' && clearPct >= 50;

    const getXP = () => {
        const base = XP_MULTIPLIER[difficulty] || 1;
        const comboBonus = Math.floor(maxCombo / 3);
        const fullXP = base + comboBonus;
        if (result === 'win') return fullXP;
        if (isPartialClear) return Math.max(1, Math.floor(fullXP / 2));
        return 0;
    };

    const estimatedGold = (() => {
        const fullGold = { 1: 5, 2: 15, 3: 30, 4: 50 }[difficulty] || 5;
        if (result === 'win') return fullGold;
        if (isPartialClear) return Math.max(1, Math.floor(fullGold / 2));
        return 0;
    })();

    // ─── EFFECTS ──────────────────────────────────
    useEffect(() => {
        if (phase === 'result') {
            setShowResultButton(false);
            const timer = setTimeout(() => setShowResultButton(true), 500);
            return () => clearTimeout(timer);
        }
    }, [phase]);

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

        const boughtCounts: Record<string, number> = { remove: removeBoughtToday, undo: undoBoughtToday, shuffle: shuffleBoughtToday };
        const usedToday = boughtCounts[purchaseModal] ?? 0;
        const atLimit = usedToday >= DAILY_BONUS_LIMIT;

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
                        🪙 {cost} Gold {atLimit ? (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Limit reached: {usedToday}/{DAILY_BONUS_LIMIT})</span>
                        ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.5rem' }}>({usedToday}/{DAILY_BONUS_LIMIT} used today)</span>
                        )}
                    </div>

                    <button
                        className="tiles-purchase-buy-btn"
                        disabled={currency.gold < cost || atLimit}
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
        <div className="tiles-game-area tiles-game-area--portrait">
            {/* Top row: Combo Track */}
            <div className="tiles-combo-container" style={{ height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '0.5rem' }}>
                <AnimatePresence>
                    {comboCount > 1 && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: -10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: -10 }}
                            className="tiles-combo-badge"
                        >
                            <span>⚡ Combo x{comboCount}</span>
                            <motion.div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: '100%' }} animate={{ width: '0%' }}
                                    transition={{ duration: 2.5, ease: 'linear' }}
                                    style={{ height: '100%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }}
                                    key={`timer-${comboTimer}`}
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Row */}
            <div className="tiles-game-main">
                {/* 1. Left: Power buttons */}
                <div className="tiles-powers">
                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" disabled={ownedRemove <= 0} onClick={useRemove}>
                            🧲<span className="tiles-power-badge">{ownedRemove}</span>
                        </button>
                        <div className="tiles-power-add" onClick={() => setPurchaseModal('remove')}>+</div>
                    </div>

                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" disabled={ownedUndo <= 0 || history.current.length === 0} onClick={useUndo}>
                            ↩️<span className="tiles-power-badge">{ownedUndo}</span>
                        </button>
                        <div className="tiles-power-add" onClick={() => setPurchaseModal('undo')}>+</div>
                    </div>

                    <div className="tiles-power-wrapper">
                        <button className="tiles-power-btn" disabled={ownedShuffle <= 0} onClick={useShuffle}>
                            🔀<span className="tiles-power-badge">{ownedShuffle}</span>
                        </button>
                        <div className="tiles-power-add" onClick={() => setPurchaseModal('shuffle')}>+</div>
                    </div>
                </div>

                {/* 2. Center: Board */}
                <div className="tiles-board-container">
                    <div className="tiles-board" style={{ width: boardWidth, height: boardHeight }}>
                        <AnimatePresence>
                            {board.filter(t => !t.removed).map(tile => {
                                const blocked = isTileBlocked(tile, board);
                                return (
                                    <motion.div
                                        key={tile.uid}
                                        className={`tiles-board-tile ${blocked ? 'blocked' : 'selectable'}`}
                                        data-family={tile.symbol.colorFamily}
                                        style={{
                                            left: tile.x * gapX - offsetX,
                                            top: tile.y * gapY - offsetY,
                                            zIndex: tile.layer * 10,
                                        }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0, x: 50, y: -20 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => !blocked && selectTile(tile)}
                                        whileHover={!blocked ? { scale: 1.05, y: -2, zIndex: 9999 } : {}}
                                        whileTap={!blocked ? { scale: 0.95 } : {}}
                                    >
                                        <div className="tile-inner">
                                            {tile.symbol.imageSrc ? (
                                                <img className="tile-face-img" src={tile.symbol.imageSrc} alt={tile.symbol.label} />
                                            ) : (
                                                <span className="tile-face">{tile.symbol.emoji}</span>
                                            )}
                                        </div>
                                        <span className={`tile-rarity-dot ${tile.symbol.rarity}`} />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 3. Right: Vertical Tray */}
                <div className={`tiles-tray-bar ${trayFull ? 'tray-shake tray-flash' : ''}`}>
                    <div className="tiles-tray-vertical">
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
                                        data-family={tile.symbol.colorFamily}
                                        initial={{ x: -20, opacity: 0, scale: 0.8 }}
                                        animate={{ x: 0, opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                                        layout
                                    >
                                        <div className="tile-inner">
                                            {tile.symbol.imageSrc ? (
                                                <img className="tile-face-img" src={tile.symbol.imageSrc} alt={tile.symbol.label} />
                                            ) : (
                                                <span className="tile-face">{tile.symbol.emoji}</span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }
                            return <div key={`empty-${i}`} className="tiles-tray-slot" />;
                        })}
                    </div>
                    {/* Tray Full Message */}
                    <AnimatePresence>
                        {trayFullMessage && (
                            <motion.div className="tray-full-message" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                                🚫 FULL!
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="tiles-tray-label">
                        <div className="tiles-tray-count">{tray.length}/{trayCapacity}</div>
                        <span className="tiles-tray-left" style={{ opacity: tray.length >= trayCapacity - 2 ? 1 : 0.4 }}>
                            {trayCapacity - tray.length === 0 ? 'FULL' : `${trayCapacity - tray.length} left`}
                        </span>
                    </div>
                </div>
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
                            className={`tiles-result-card ${result === 'win' ? 'victory' : isPartialClear ? 'partial' : 'defeat'}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <h2>{result === 'win' ? '🏆 VICTORY!' : isPartialClear ? '🌓 HALF CLEARED!' : '💀 DEFEAT'}</h2>
                            <div className="tiles-result-rewards">
                                {result === 'win' || isPartialClear ? (
                                    <>
                                        <div className="tiles-reward-row">📊 Points: {points}</div>
                                        <div className="tiles-reward-row">🗺️ Board Cleared: {clearPct}%</div>
                                        {result === 'win' ? (
                                            <>
                                                <div className="tiles-reward-row highlight">🔱 Full Clear — Sigils Earned!</div>
                                                <motion.div initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.2}} className="tiles-reward-row highlight">🎯 +{getXP()} Strategy XP {maxCombo >= 3 ? `(Combo Bonus!)` : ''}</motion.div>
                                                {preset.gemReward > 0 && (
                                                    <motion.div initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.3}} className="tiles-reward-row highlight">💎 +{preset.gemReward} Gems</motion.div>
                                                )}
                                                {estimatedGold > 0 && (
                                                    <motion.div initial={{scale:0, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} transition={{delay:0.4, type:'spring'}} className="tiles-reward-row highlight" style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>🪙 +{estimatedGold} Gold</motion.div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="tiles-reward-row highlight" style={{ color: '#f59e0b' }}>🌓 Partial Reward Earned!</div>
                                                <motion.div initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.2}} className="tiles-reward-row highlight" style={{ color: '#f59e0b' }}>🎯 +{getXP()} Strategy XP (50% reward)</motion.div>
                                                {estimatedGold > 0 && (
                                                    <motion.div initial={{scale:0, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} transition={{delay:0.4, type:'spring'}} className="tiles-reward-row highlight" style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>🪙 +{estimatedGold} Gold</motion.div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {points > 0 ? (
                                            <>
                                                <div className="tiles-reward-row">📊 Points: {points}</div>
                                                <div className="tiles-reward-row">🗺️ Board Cleared: {clearPct}%</div>
                                            </>
                                        ) : (
                                            <div className="tiles-reward-row">Run Abandoned —</div>
                                        )}
                                        <div className="tiles-reward-row" style={{ color: '#94a3b8' }}>Cleared less than 50% — no reward.</div>
                                    </>
                                )}
                            </div>
                            
                            <AnimatePresence>
                                {showResultButton && (
                                    <motion.button 
                                        className="tiles-play-again-btn" 
                                        onClick={() => {
                                            onComplete(result!, difficulty, result === 'win' ? 100 : clearPct);
                                        }}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {result === 'win' || isPartialClear ? 'Collect Rewards' : 'Return'}
                                    </motion.button>
                                )}
                            </AnimatePresence>
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
                    <span className="tiles-title-text">Conquest Tiles</span>
                </div>
                {phase === 'playing' && (
                    <div className="tiles-points-container">
                        <div className="tiles-points-label">Score</div>
                        <div className="tiles-points-value">{points}</div>
                    </div>
                )}
                <button className="tiles-close-btn" style={{ opacity: phase === 'result' ? 0.3 : 1, pointerEvents: phase === 'result' ? 'none' : 'auto' }} onClick={() => {
                    if (phase === 'playing') {
                        setResult('loss');
                        setPhase('result');
                    } else {
                        onClose();
                    }
                }}>✕</button>
            </div>

            {/* Content */}
            {phase === 'select' && renderDifficultySelect()}
            {(phase === 'playing' || phase === 'result') && renderGame()}
        </motion.div>
    );
};
