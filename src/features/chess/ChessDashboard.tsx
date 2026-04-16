import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Zap, Target, Crown, Award, Bolt } from 'lucide-react';
import { useChessStore } from '../../store/useChessStore';
import { CHESS_OPENINGS } from '../../data/chessOpenings';
import type { ChessOpening } from '../../data/chessOpenings';
import { CHESS_TRAPS } from '../../data/chessTraps';
import type { ChessTrap } from '../../data/chessTraps';
import { PIECE_UNICODE, createInitialBoard, applyMove } from '../conquest/chessUtils';
import type { Board } from '../conquest/chessUtils';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useGameStore } from '../../store/useGameStore';
import { useTitleStore } from '../../store/useTitleStore';
import { ChessGame } from '../conquest/ChessGame';
import './ChessDashboard.css';
import '../conquest/ChessGame.css'; // Reuse board rendering styles

type TabState = 'dashboard' | 'lessons' | 'traps' | 'playstyles' | 'ladder' | 'codex';

export const ChessDashboard = () => {
    const navigate = useNavigate();
    const chessStore = useChessStore();
    const [activeTab, setActiveTab] = useState<TabState>('dashboard');

    useEffect(() => {
        // Ensure energy ticks when they are on the page
        const interval = setInterval(() => chessStore.tickEnergy(), 60000);
        return () => clearInterval(interval);
    }, [chessStore]);

    const getBackgroundClass = () => {
        if (activeTab === 'lessons') return 'chess-bg-lesson';
        if (activeTab === 'traps') return 'chess-bg-puzzle';
        if (activeTab === 'ladder') return 'chess-bg-ladder';
        return 'chess-bg-dashboard';
    };

    return (
        <div className="chess-system-container">
            <div className={getBackgroundClass()} />
            
            <div className="chess-system-content">
                <div className="chess-sys-header">
                    <button onClick={() => activeTab === 'dashboard' ? navigate('/combat') : setActiveTab('dashboard')} className="btn-back" style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer' }}>
                        <ChevronLeft size={28} />
                    </button>
                    <h1>Chess Training</h1>
                    <div className="chess-energy-badge">
                        <Bolt size={18} color="#facc15" />
                        {chessStore.energy} / {chessStore.maxEnergy}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div key="dash" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <div className="chess-dash-grid">
                                <div className="chess-dash-card" onClick={() => setActiveTab('lessons')}>
                                    <div className="chess-dash-card-icon"><BookOpen size={28} color="#60a5fa" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Learn Openings</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Master beginner and intermediate lines.</p>
                                        <div className="chess-progress-track">
                                            <div className="chess-progress-fill" style={{ width: `${(chessStore.openingsMastered.length / CHESS_OPENINGS.length) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="chess-dash-card" onClick={() => setActiveTab('traps')}>
                                    <div className="chess-dash-card-icon"><Zap size={28} color="#f87171" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Solve Traps</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Recognize blunders and execute finishers.</p>
                                        <div className="chess-progress-track">
                                            <div className="chess-progress-fill" style={{ width: `${(chessStore.trapsMastered.length / CHESS_TRAPS.length) * 100}%`, background: '#f87171' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="chess-dash-card" onClick={() => setActiveTab('playstyles')}>
                                    <div className="chess-dash-card-icon"><Target size={28} color="#a855f7" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Playstyles</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Current Identity: <strong style={{ color: '#d8b4fe' }}>{chessStore.getPlaystyle()}</strong></p>
                                    </div>
                                </div>

                                <div className="chess-dash-card" onClick={() => setActiveTab('ladder')}>
                                    <div className="chess-dash-card-icon"><Crown size={28} color="#fbbf24" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Rank Ladder</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Defeat Grandmaster Bosses.</p>
                                    </div>
                                </div>

                                <div className="chess-dash-card" onClick={() => setActiveTab('codex')}>
                                    <div className="chess-dash-card-icon"><Award size={28} color="#10b981" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Codex</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>View combat buffs from mastered content.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'lessons' && <motion.div key="lessons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LessonsView /></motion.div>}
                    {activeTab === 'traps' && <motion.div key="traps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TrapsView /></motion.div>}
                    {activeTab === 'playstyles' && <motion.div key="playstyles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PlaystylesView /></motion.div>}
                    {activeTab === 'ladder' && <motion.div key="ladder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LadderView /></motion.div>}
                    {activeTab === 'codex' && <motion.div key="codex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodexView /></motion.div>}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── LESSONS VIEW ────────────────────────────────────────────────────────────
const LessonsView = () => {
    const [activeLesson, setActiveLesson] = useState<ChessOpening | null>(null);
    const store = useChessStore();
    const gameStore = useGameStore();

    if (activeLesson) {
        return <LessonEngine opening={activeLesson} onBack={() => setActiveLesson(null)} onComplete={(stats) => {
            store.masterOpening(activeLesson.id, stats);
            gameStore.addSkillXp('Intelligence', 5);
            gameStore.addGlobalXp(5);
            setActiveLesson(null);
        }} />;
    }

    return (
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.5rem', borderRadius: 16 }}>
            <h2 style={{ color: 'white', marginTop: 0 }}>Beginner Openings</h2>
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '2rem' }}>
                {CHESS_OPENINGS.filter(o => o.difficulty === 'beginner').map(op => (
                    <div key={op.id} onClick={() => setActiveLesson(op)} style={{ background: store.openingsMastered.includes(op.id) ? 'rgba(16, 185, 129, 0.2)' : '#1e293b', padding: '1rem', borderRadius: 8, cursor: 'pointer', border: store.openingsMastered.includes(op.id) ? '1px solid #10b981' : '1px solid #334155' }}>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{op.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{op.idea}</div>
                    </div>
                ))}
            </div>
            <h2 style={{ color: 'white' }}>Intermediate Lines</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {CHESS_OPENINGS.filter(o => o.difficulty === 'intermediate').map(op => (
                    <div key={op.id} onClick={() => setActiveLesson(op)} style={{ background: store.openingsMastered.includes(op.id) ? 'rgba(16, 185, 129, 0.2)' : '#1e293b', padding: '1rem', borderRadius: 8, cursor: 'pointer', border: store.openingsMastered.includes(op.id) ? '1px solid #10b981' : '1px solid #334155' }}>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{op.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{op.idea}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Extracted Engine for Lessons
const LessonEngine = ({ opening, onBack, onComplete }: { opening: ChessOpening, onBack: () => void, onComplete: (style: any) => void }) => {
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [step, setStep] = useState(0);
    const [selected, setSelected] = useState<[number, number] | null>(null);

    const isComplete = step >= opening.moves.length;
    const currentMove = opening.moves[step];

    useEffect(() => {
        if (isComplete) return;
        const isOpponentTurn = (opening.side === 'white' && step % 2 !== 0) || (opening.side === 'black' && step % 2 === 0);
        if (isOpponentTurn) {
            const t = setTimeout(() => {
                setBoard(applyMove(board, currentMove, null));
                setStep(s => s + 1);
            }, 800);
            return () => clearTimeout(t);
        }
    }, [step, board, opening, isComplete]);

    const handleCellClick = (r: number, c: number) => {
        if (isComplete) return;
        const playerColor = opening.side === 'white' ? 'w' : 'b';
        const isOpponentTurn = (opening.side === 'white' && step % 2 !== 0) || (opening.side === 'black' && step % 2 === 0);
        if (isOpponentTurn) return;

        if (selected) {
            if (r === currentMove.tr && c === currentMove.tc && selected[0] === currentMove.fr && selected[1] === currentMove.fc) {
                setBoard(applyMove(board, currentMove, null));
                setSelected(null);
                setStep(s => s + 1);
            } else {
                setSelected(null);
            }
        } else {
            const piece = board[r][c];
            if (piece && piece.color === playerColor) setSelected([r, c]);
        }
    };

    return (
        <div className="lesson-container">
            <div className="lesson-top-ui">
                <h2 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>{opening.name}</h2>
                <div style={{ height: 4, background: '#334155', borderRadius: 2 }}>
                    <div style={{ width: `${Math.min(100, (step / opening.moves.length) * 100)}%`, height: '100%', background: '#60a5fa', transition: 'width 0.3s' }} />
                </div>
            </div>

            <div className="chess-board">
                {board.map((row, r) => row.map((cell, c) => {
                    const isLight = (r + c) % 2 === 0;
                    const isSelected = selected && selected[0] === r && selected[1] === c;
                    return (
                        <div key={`${r}-${c}`} className={`chess-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`} onClick={() => handleCellClick(r, c)}>
                            {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                        </div>
                    );
                }))}
            </div>

            <div className="lesson-bottom-ui">
                {isComplete ? (
                    <div>
                        <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>Mastered!</h3>
                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>{opening.remember}</p>
                        <button onClick={() => onComplete(opening.difficulty === 'beginner' ? { positionalScore: 1 } : { positionalScore: 2 })} style={{ width: '100%', padding: '1rem', background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none', fontWeight: 'bold' }}>Complete Lesson</button>
                    </div>
                ) : (
                    <div>
                        <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>{((opening.side === 'white' && step % 2 !== 0) || (opening.side === 'black' && step % 2 === 0)) ? 'Opponent is thinking...' : `Play ${currentMove.notation}`}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{step === 0 ? opening.idea : 'Match the exact pattern to proceed.'}</p>
                        <button onClick={onBack} style={{ marginTop: '1rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '0.5rem 1rem', borderRadius: 8 }}>Abandon Lesson</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── TRAPS VIEW ──────────────────────────────────────────────────────────────
const TrapsView = () => {
    const [activeTrap, setActiveTrap] = useState<ChessTrap | null>(null);
    const store = useChessStore();
    const gameStore = useGameStore();
    const currency = useCurrencyStore();

    if (activeTrap) {
        return <TrapEngine trap={activeTrap} onBack={() => setActiveTrap(null)} onSolve={() => {
            store.masterTrap(activeTrap.id);
            currency.addShmeckles(3);
            gameStore.addSkillXp('Intelligence', 15);
            gameStore.addGlobalXp(10);
            setActiveTrap(null);
        }} />;
    }

    return (
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.5rem', borderRadius: 16 }}>
            <h2 style={{ color: 'white', marginTop: 0 }}>Lethal Finishers</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Solve these positions to unlock permanent burst combat buffs.</p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {CHESS_TRAPS.map(trap => (
                    <div key={trap.id} onClick={() => setActiveTrap(trap)} style={{ background: store.trapsMastered.includes(trap.id) ? 'rgba(248, 113, 113, 0.2)' : '#1e293b', padding: '1rem', borderRadius: 8, cursor: 'pointer', border: store.trapsMastered.includes(trap.id) ? '1px solid #ef4444' : '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ color: 'white', fontWeight: 'bold' }}>{trap.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>Buff: {trap.combatEffect.replace('_', ' ')}</div>
                        </div>
                        <div style={{ color: '#ef4444' }}>⚡ 10 Energy</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrapEngine = ({ trap, onBack, onSolve }: { trap: ChessTrap, onBack: () => void, onSolve: () => void }) => {
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');

    useEffect(() => {
        // Fast-forward setup
        let nb = createInitialBoard();
        trap.setupMoves.forEach(m => {
            nb = applyMove(nb, m as any, null);
        });
        setBoard(nb);
    }, [trap]);

    const handleCellClick = (r: number, c: number) => {
        if (status !== 'playing') return;
        if (selected) {
            if (r === trap.criticalMove.tr && c === trap.criticalMove.tc && selected[0] === trap.criticalMove.fr && selected[1] === trap.criticalMove.fc) {
                setBoard(applyMove(board, trap.criticalMove as any, null));
                setSelected(null);
                setStatus('solved');
                setTimeout(onSolve, 2500); // Wait so they can see the effect
            } else {
                setStatus('failed');
                setSelected(null);
                setTimeout(() => setStatus('playing'), 1000);
            }
        } else {
            const piece = board[r][c];
            if (piece) setSelected([r, c]);
        }
    };

    return (
        <div className="lesson-container" style={{ position: 'relative' }}>
            {status === 'solved' && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="trap-flash-overlay">
                    <h2>TRAP TRIGGERED</h2>
                    <p>+ {trap.combatEffect.replace('_', ' ').toUpperCase()} UNLOCKED</p>
                </motion.div>
            )}

            <div className="lesson-top-ui">
                <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>{trap.name}</h2>
                <span style={{ background: '#7f1d1d', color: '#fecaca', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.8rem' }}>Challenge Mode</span>
            </div>

            <div className="chess-board" style={{ boxShadow: status === 'failed' ? '0 0 30px rgba(239, 68, 68, 0.6)' : 'none', transition: 'box-shadow 0.3s' }}>
                {board.map((row, r) => row.map((cell, c) => {
                    const isLight = (r + c) % 2 === 0;
                    const isSelected = selected && selected[0] === r && selected[1] === c;
                    return (
                        <div key={`${r}-${c}`} className={`chess-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`} onClick={() => handleCellClick(r, c)}>
                            {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                        </div>
                    );
                }))}
            </div>

            <div className="lesson-bottom-ui">
                <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Find the Finisher</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{trap.explanation}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button onClick={onBack} style={{ flex: 1, background: '#334155', color: 'white', border: 'none', padding: '0.75rem', borderRadius: 8 }}>Retreat</button>
                </div>
            </div>
        </div>
    );
};

// ─── PLAYSTYLES VIEW ─────────────────────────────────────────────────────────
const PlaystylesView = () => {
    const store = useChessStore();
    const style = store.getPlaystyle();
    const affinity = store.getChessAffinity();

    const descriptions: Record<string, string> = {
        'Magnus': 'Consistent, calm, positional. You slowly suffocate your opponents and prefer solid structures.',
        'Kasparov': 'Aggressive, dynamic, punishing. You sacrifice safety to crush the enemy immediately.',
        'Hikaru': 'Fast, tactical, tricky. You rely on quick patterns, traps, and tactical vision.',
        'Karpov': 'Purely defensive. You create an unbreakable fortress and let the enemy destroy themselves.',
        'Unknown': 'Learn more openings and solve traps to develop your Grandmaster identity.'
    };

    return (
        <div className="playstyle-hub">
            <h2 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Combat Integration Hub</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0' }}>Your chess habits dictate your passive combat synergy.</p>

            <div className="playstyle-identity">
                <div className="playstyle-avatar">
                    {style === 'Kasparov' ? '🔥' : style === 'Hikaru' ? '⚡' : style === 'Karpov' ? '❄️' : '🧠'}
                </div>
                <div className="playstyle-stats">
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>{style}</h3>
                    <p style={{ color: '#60a5fa', fontWeight: 'bold' }}>{affinity ? `Generating ${affinity.toUpperCase()} Affinity Synergy` : 'No Affinity Generated yet'}</p>
                    <p style={{ fontSize: '0.85rem' }}>{descriptions[style]}</p>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h4 style={{ color: 'white', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Under The Hood</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '0.5rem' }}><span>Aggression Score</span> <span>{store.behavior.aggressiveScore}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '0.5rem' }}><span>Positional Score</span> <span>{store.behavior.positionalScore}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '0.5rem' }}><span>Defense Score</span> <span>{store.behavior.defensiveScore}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '0.5rem' }}><span>Tactical Traps</span> <span>{store.behavior.trapUsageCount}</span></div>
            </div>
        </div>
    );
};

// ─── LADDER VIEW ─────────────────────────────────────────────────────────────
const LadderView = () => {
    const store = useChessStore();
    const currencyStore = useCurrencyStore();
    const gameStore = useGameStore();
    const titleStore = useTitleStore();

    // 'list' -> 'intro' -> 'match' -> 'victory'
    const [ladderState, setLadderState] = useState<'list' | 'intro' | 'match' | 'victory'>('list');
    const [activeBoss, setActiveBoss] = useState<string | null>(null);

    const bosses = [
        { id: 'boss_1', titleId: 'gm_strategist', name: 'The Strategist', difficulty: 3, energy: 30, desc: 'High positional play. Avoid blunders.', reward: '+5% Defense Permanently', avatar: '🧠' },
        { id: 'boss_2', titleId: 'gm_tactician', name: 'The Tactician', difficulty: 4, energy: 40, desc: 'Tricky with traps. Plays extremely sharp lines.', reward: '+5% Crit Chance Permanently', avatar: '⚡' },
        { id: 'boss_3', titleId: 'gm_endgame', name: 'The Endgame King', difficulty: 5, energy: 50, desc: 'Flawless execution. A true Grandmaster trial.', reward: '+10% All Stats Permanently', avatar: '👑' },
        { id: 'boss_4', titleId: 'gm_reaper', name: 'The Reaper', difficulty: 5, energy: 60, desc: 'Calm, calculated, and extremely difficult to outplay.', reward: '+5% Defense Permanently', avatar: '/assets/reaper_boss.jpg', isImage: true },
        { id: 'boss_5', titleId: 'gm_demon', name: 'The Demon', difficulty: 5, energy: 60, desc: 'Chaotic, fast, aggressive, and incredibly dangerous.', reward: '+5% Crit Chance Permanently', avatar: '/assets/demon_boss.jpg', isImage: true },
        { id: 'boss_6', titleId: 'gm_skeleton_king', name: 'The Skeleton King', difficulty: 5, energy: 70, desc: 'Patient early game, nearly unbeatable late game.', reward: '+10% Scaling Bonus Permanently', avatar: '/assets/skeleton_king_boss.jpg', isImage: true },
    ];

    const currentBossDef = bosses.find(b => b.id === activeBoss);

    if (ladderState === 'intro' && currentBossDef) {
        const isFiery = currentBossDef.id === 'boss_5';
        const isNecro = currentBossDef.id === 'boss_6';
        let bgStyle = 'rgba(0,0,0,0.95)';
        let shadowStyle = '0 0 30px rgba(251, 191, 36, 0.5)';
        let borderStyle = '4px solid #ef4444';
        
        if (isFiery) {
            bgStyle = 'radial-gradient(circle, rgba(127, 29, 29, 0.95) 0%, rgba(0,0,0,0.95) 100%)';
            shadowStyle = '0 0 50px rgba(239, 68, 68, 0.8)';
            borderStyle = '4px solid #f97316';
        } else if (isNecro) {
            bgStyle = 'radial-gradient(circle, rgba(6, 78, 59, 0.95) 0%, rgba(0,0,0,0.95) 100%)';
            shadowStyle = '0 0 50px rgba(16, 185, 129, 0.6)';
            borderStyle = '4px solid #10b981';
        }

        return (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: bgStyle, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ color: isNecro ? '#10b981' : '#ef4444', fontStyle: 'italic', fontSize: '1.5rem', margin: 0, textShadow: isFiery || isNecro ? `0 0 20px ${isNecro ? '#10b981' : '#ef4444'}` : 'none' }}>GRANDMASTER CHALLENGE</h2>
                <div style={{ margin: '2rem 0', textShadow: shadowStyle }}>
                    {currentBossDef.isImage ? <img src={currentBossDef.avatar} alt="Boss" style={{ width: 120, height: 120, borderRadius: '50%', border: borderStyle, boxShadow: isFiery || isNecro ? shadowStyle : 'none' }} /> : <span style={{ fontSize: '6rem' }}>{currentBossDef.avatar}</span>}
                </div>
                <h1 style={{ color: 'white', fontSize: '3rem', margin: '0 0 1rem 0' }}>{currentBossDef.name}</h1>
                <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>Reward: {currentBossDef.reward}</p>
                <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                    <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '1rem 3rem', borderRadius: 8, fontSize: '1.2rem', fontWeight: 'bold' }} onClick={() => setLadderState('match')}>FIGHT</button>
                    <button style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '1rem 2rem', borderRadius: 8 }} onClick={() => { setActiveBoss(null); setLadderState('list'); }}>Retreat</button>
                </div>
            </motion.div>
        );
    }

    if (ladderState === 'victory' && currentBossDef) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(wrap,rgba(16, 185, 129, 0.9), rgba(6, 78, 59, 1))', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <motion.h1 initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }} style={{ color: '#fbbf24', fontSize: '4rem', margin: 0, textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>VICTORY</motion.h1>
                <p style={{ color: 'white', fontSize: '1.5rem', marginTop: '1rem' }}>You defeated {currentBossDef.name}!</p>
                
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '2rem', borderRadius: 16, marginTop: '2rem', textAlign: 'center', border: '2px solid #fbbf24' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#fbbf24' }}>REWARDS UNLOCKED</h3>
                    <div style={{ color: 'white', fontSize: '1.2rem', margin: '0.5rem 0' }}>{currentBossDef.reward}</div>
                    <div style={{ color: '#fcd34d', fontSize: '1.2rem', margin: '0.5rem 0' }}>+ 500 Gold</div>
                    <div style={{ color: '#60a5fa', fontSize: '1.2rem', margin: '0.5rem 0' }}>+ 100 Intelligence XP</div>
                </div>

                <button style={{ marginTop: '3rem', background: '#fbbf24', color: '#78350f', border: 'none', padding: '1rem 3rem', borderRadius: 8, fontSize: '1.2rem', fontWeight: 'bold' }} onClick={() => { setActiveBoss(null); setLadderState('list'); }}>Accept</button>
            </motion.div>
        );
    }

    if (ladderState === 'match' && currentBossDef) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: '#0f172a' }}>
                {/* Reusing ChessGame component for full match logic */}
                <ChessGame 
                    canPlay={true} 
                    onClose={() => { setActiveBoss(null); setLadderState('list'); }} 
                    onComplete={(res) => {
                        if (res === 'win') {
                            store.recordLadderWin(currentBossDef.id);
                            titleStore.unlockTitle(currentBossDef.titleId);
                            currencyStore.addGold(500);
                            gameStore.addSkillXp('Intelligence', 100);
                            setLadderState('victory');
                        } else {
                            gameStore.addSkillXp('Intelligence', 10);
                            setActiveBoss(null);
                            setLadderState('list');
                        }
                    }} 
                />
            </div>
        );
    }

    return (
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.5rem', borderRadius: 16 }}>
            <h2 style={{ color: 'white', marginTop: 0, textAlign: 'center' }}>Grandmaster Ladder</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {bosses.map((boss, idx) => (
                    <div key={boss.id} className="boss-card" style={{ borderColor: store.ladderWins.includes(boss.id) ? '#fbbf24' : '#334155' }}>
                        <div className="boss-avatar">
                            {boss.isImage ? <img src={boss.avatar} alt="Boss" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #64748b' }} /> : boss.avatar}
                        </div>
                        <div>
                            <h3>{boss.name}</h3>
                            <div className="boss-difficulty">Difficulty: {['Hard', 'Severe', 'Impossible'][idx]}</div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{boss.desc}</p>
                            <p style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 'bold', margin: '0.25rem 0' }}>Reward: {boss.reward}</p>
                        </div>
                        <button 
                            disabled={store.energy < boss.energy}
                            onClick={() => {
                                if (store.consumeEnergy(boss.energy)) {
                                    setActiveBoss(boss.id);
                                    setLadderState('intro');
                                }
                            }}
                            style={{ background: store.energy >= boss.energy ? '#fbbf24' : '#475569', color: store.energy >= boss.energy ? '#78350f' : '#94a3b8', border: 'none', padding: '0.75rem 2rem', borderRadius: '99px', fontWeight: 'bold' }}>
                            Challenge (⚡ {boss.energy})
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── CODEX VIEW ──────────────────────────────────────────────────────────────
const CodexView = () => {
    const store = useChessStore();
    return (
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.5rem', borderRadius: 16, color: 'white' }}>
            <h2 style={{ marginTop: 0 }}>Combat Buffs Active</h2>
            <p style={{ color: '#94a3b8' }}>Every mastered opening grants a permanent passive stat injection.</p>

            <ul style={{ paddingLeft: '1.5rem', color: '#60a5fa' }}>
                {store.openingsMastered.map(id => {
                    const op = CHESS_OPENINGS.find(o => o.id === id);
                    if (!op || !op.combatBuff) return null;
                    return (
                        <li key={id} style={{ marginBottom: '0.5rem' }}>
                            <strong>{op.name}:</strong> {JSON.stringify(op.combatBuff).replace(/["{}]/g, '').replace(/:/g, ' +')}
                        </li>
                    );
                })}
                {store.openingsMastered.length === 0 && <li style={{ color: '#94a3b8' }}>No buffs unlocked yet. Learn openings!</li>}
            </ul>

            <h2 style={{ marginTop: '2rem' }}>Finisher Traps Mastered</h2>
            <ul style={{ paddingLeft: '1.5rem', color: '#fca5a5' }}>
                {store.trapsMastered.map(id => {
                    const tr = CHESS_TRAPS.find(t => t.id === id);
                    if (!tr) return null;
                    return <li key={id}><strong>{tr.name}</strong> - {tr.combatEffect}</li>;
                })}
                 {store.trapsMastered.length === 0 && <li style={{ color: '#94a3b8' }}>No traps learned yet.</li>}
            </ul>
        </div>
    );
};
