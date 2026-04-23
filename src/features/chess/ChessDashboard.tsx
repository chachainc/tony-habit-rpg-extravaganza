import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Zap, Target, Crown, Award, Bolt, Brain, Sword } from 'lucide-react';
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
import { CHESS_HISTORY_ERAS } from '../../data/chessStyles';
import type { ChessHistoricalPlayer } from '../../data/chessStyles';
import { ChessGame } from '../conquest/ChessGame';
import { BossArenaView } from './BossArenaView';
import { ChessLessons } from './screens/ChessLessons';
import cowChessBg from '../../assets/cow_chess.jpg';
import './ChessDashboard.css';
import '../conquest/ChessGame.css';

type TabState = 'dashboard' | 'lessons' | 'interactive_lessons' | 'traps' | 'playstyles' | 'ladder' | 'codex';

export const ChessDashboard = () => {
    const navigate = useNavigate();
    const chessStore = useChessStore();
    const [activeTab, setActiveTab] = useState<TabState>('dashboard');

    useEffect(() => {
        // Ensure energy ticks when they are on the page
        const interval = setInterval(() => chessStore.tickEnergy(), 60000);
        return () => clearInterval(interval);
    }, [chessStore]);

    return (
        <div className="chess-system-container">
            <div className="chess-bg-wrapper">
                <img src={cowChessBg} alt="Magical Chess Training Hall" className="chess-bg-img" />
                <div className="chess-bg-overlay" />
            </div>
            
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

                                <div className="chess-dash-card" onClick={() => setActiveTab('interactive_lessons')}>
                                    <div className="chess-dash-card-icon"><Brain size={28} color="#10b981" /></div>
                                    <div className="chess-dash-card-info">
                                        <h2>Interactive Lessons</h2>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Guided step-by-step masterclasses.</p>
                                        <div className="chess-progress-track">
                                            <div className="chess-progress-fill" style={{ width: `${(chessStore.interactiveLessonsMastered.length > 0 ? 100 : 0)}%`, background: '#10b981' }} />
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

                    {activeTab === 'interactive_lessons' && (
                        <motion.div key="inter_lessons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <ChessLessons onBack={() => setActiveTab('dashboard')} />
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
        <div className="trap-container">
            {status === 'solved' && (
                <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="trap-flash-overlay--success">
                    <h2>TRAP EXECUTED</h2>
                    <p>+ {trap.combatEffect.replace('_', ' ').toUpperCase()} UNLOCKED</p>
                </motion.div>
            )}

            <div className="trap-top-ui">
                <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Zap size={24} /> {trap.name}
                </h2>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.3rem 0.8rem', borderRadius: 99, fontSize: '0.85rem', display: 'inline-block', fontWeight: 'bold' }}>Challenge Mode Active</div>
            </div>

            <div className={`chess-board trap-board ${status === 'failed' ? 'trap-board--failed' : ''} ${status === 'solved' ? 'trap-board--solved' : ''}`}>
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

            <div className="trap-bottom-ui">
                <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={20} color="#60a5fa" /> Find the Finisher
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                    {trap.explanation}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button onClick={onBack} style={{ flex: 1, background: 'transparent', border: '2px solid #64748b', color: '#f8fafc', padding: '0.85rem', borderRadius: 8, fontWeight: 'bold', fontSize: '1rem' }}>Retreat</button>
                </div>
            </div>
            
            {/* Nav Safety Spacer */}
            <div style={{ height: 'calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px))', width: '100%', flexShrink: 0 }} />
        </div>
    );
};

// ─── PLAYSTYLES MUSEUM VIEW ──────────────────────────────────────────────────
const PlaystylesView = () => {
    const store = useChessStore();
    const [viewData, setViewData] = useState<{ mode: 'timeline' | 'player' | 'lesson' | 'simulation' | 'arena', player: ChessHistoricalPlayer | null, challengeId?: string }>({ mode: 'timeline', player: null });

    if (viewData.mode === 'arena' && viewData.player && viewData.challengeId) {
        const challengeToLoad = viewData.player.arenaChallenges?.find(c => c.id === viewData.challengeId);
        if (challengeToLoad) {
            return <BossArenaView player={viewData.player} challenge={challengeToLoad} onExit={() => setViewData({ mode: 'player', player: viewData.player })} />;
        }
    }

    if (viewData.mode === 'player' && viewData.player) {
        return <PlaystylesPlayerDetail player={viewData.player} store={store} onBack={() => setViewData({ mode: 'timeline', player: null })} onLaunchLesson={() => setViewData({ mode: 'lesson', player: viewData.player })} onLaunchSimulation={() => setViewData({ mode: 'simulation', player: viewData.player })} onLaunchArena={(cid) => setViewData({ mode: 'arena', player: viewData.player, challengeId: cid })}/>;
    }

    if (viewData.mode === 'lesson' && viewData.player) {
        return <PlayerLessonEngine player={viewData.player} onBack={() => setViewData({ mode: 'player', player: viewData.player })} onComplete={() => { store.completeStyleLesson(viewData.player!.id); setViewData({ mode: 'player', player: viewData.player }); }} />;
    }

    if (viewData.mode === 'simulation' && viewData.player && viewData.player.simulation) {
        return <PlayerSimulationEngine player={viewData.player} onBack={() => setViewData({ mode: 'player', player: viewData.player })} />;
    }

    const { aggressiveScore, defensiveScore, positionalScore, tacticalScore } = store.behavior;
    const completedProfiles = store.completedStyleLessons.length;
    
    // Derived style profile unlock check (Only visible if they studied at least 2 players)
    let dynamicAnalysis = 'Study at least 2 masters fully to unlock your personal profile.';
    if (completedProfiles >= 2) {
        if (aggressiveScore > positionalScore && tacticalScore > defensiveScore) dynamicAnalysis = 'You strongly lean toward Morphy-esque aggression and fast tactical resolutions.';
        else if (positionalScore > aggressiveScore && defensiveScore > tacticalScore) dynamicAnalysis = 'You exhibit a solid, Steinitz-like tendency towards safe structure and defensive patience.';
        else dynamicAnalysis = 'You hold a universal balance, shifting between active breaks and quiet defense.';
    }

    return (
        <div className="playstyles-timeline-hub">
            <div className="playstyles-header">
                <h2>The Grandmaster Archive</h2>
                <p>Learn how the greatest minds envisioned the board.</p>
            </div>

            <div className="playstyles-era-list">
                {CHESS_HISTORY_ERAS.map((era) => (
                    <div key={era.id} className="era-section">
                        <div className="era-header">
                            <h3>{era.title}</h3>
                            <span className="era-years">{era.years}</span>
                        </div>
                        <p className="era-desc">{era.description}</p>

                        <div className="era-players-grid">
                            {era.players.map((player) => {
                                const isCompleted = store.completedStyleLessons.includes(player.id);
                                return (
                                    <div key={player.id} className={`player-card-mini ${isCompleted ? 'completed' : ''}`} onClick={() => setViewData({ mode: 'player', player })}>
                                        <div className="player-card-content">
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isCompleted ? '#10b981' : '#f8fafc' }}>{player.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0' }}>{player.nationality}</div>
                                            <div style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.9rem' }}>"{player.tagline}"</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="playstyles-inference-box">
                <h4>Your Predicted Profile</h4>
                <p>{dynamicAnalysis}</p>
                {completedProfiles < 2 && <div className="progress-bar-container" style={{ marginTop: '0.5rem', background: '#334155', height: 6, borderRadius: 3 }}><div style={{ background: '#a855f7', height: '100%', width: `${(completedProfiles/2)*100}%` }}/></div>}
            </div>
            
            <div style={{ height: 'calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 20px)' }} />
        </div>
    );
};

const PlaystylesPlayerDetail = ({ player, store, onBack, onLaunchLesson, onLaunchSimulation, onLaunchArena }: { player: ChessHistoricalPlayer, store: any, onBack: () => void, onLaunchLesson: () => void, onLaunchSimulation: () => void, onLaunchArena: (cid: string) => void }) => {
    return (
        <div className="player-detail-view" style={{ paddingBottom: 'calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <button onClick={onBack} className="btn-back" style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0 }}><ChevronLeft size={24}/> Back to Era</button>
            <div className="player-detail-hero">
                <h1>{player.name}</h1>
                <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{player.years}</div>
                <div style={{ fontSize: '1.1rem', color: '#cbd5e1', fontStyle: 'italic', margin: '0.5rem 0' }}>"{player.tagline}"</div>
            </div>

            <div style={{ margin: '1.5rem 0' }}>
                <h3 style={{ color: '#fcd34d', borderBottom: '1px solid #78350f', paddingBottom: '0.5rem' }}>Achievements</h3>
                <p style={{ color: '#f8fafc', lineHeight: 1.5 }}>{player.achievements}</p>
            </div>

            <div style={{ margin: '1.5rem 0' }}>
                <h3 style={{ color: '#a855f7', borderBottom: '1px solid #4c1d95', paddingBottom: '0.5rem' }}>Core Style</h3>
                <ul style={{ color: '#e2e8f0', lineHeight: 1.6, paddingLeft: '1.2rem' }}>
                    {player.playstyleCharacteristics.map((tr, i) => <li key={i}>{tr}</li>)}
                </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                <button onClick={onLaunchLesson} style={{ padding: '1rem', background: store.completedStyleLessons.includes(player.id) ? '#059669' : '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <BookOpen size={20} />
                    {store.completedStyleLessons.includes(player.id) ? 'Replay Master Lesson' : 'Study Interactive Lesson'}
                </button>
                
                {player.simulation && (
                    <button onClick={onLaunchSimulation} style={{ padding: '1rem', background: '#1e293b', border: '2px solid #475569', color: '#cbd5e1', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Target size={20} /> Try Master Simulation
                    </button>
                )}

                {player.arenaChallenges && player.arenaChallenges.map(challenge => (
                    <button key={challenge.id} onClick={() => onLaunchArena(challenge.id)} style={{ marginTop: '1rem', padding: '1.25rem', background: 'linear-gradient(135deg, #7f1d1d, #450a0a)', border: '2px solid #b91c1c', color: '#fef2f2', borderRadius: 12, fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(185, 28, 28, 0.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sword size={24} color="#fca5a5" /> Enter Boss Arena</div>
                        <div style={{ fontSize: '0.9rem', color: '#fca5a5', fontWeight: 'normal' }}>Tier {challenge.tier}: {challenge.title}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const PlayerLessonEngine = ({ player, onBack, onComplete }: { player: ChessHistoricalPlayer, onBack: () => void, onComplete: () => void }) => {
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [step, setStep] = useState(0);

    const moves = player.lesson.interactiveMoves;
    const isComplete = step >= moves.length;
    const currentMoveData = isComplete ? null : moves[step];

    useEffect(() => {
        // Build state up to current step
        let b = createInitialBoard();
        player.lesson.startStateMoves.forEach(sm => {
            b = applyMove(b, sm as any, null);
        });
        for (let i = 0; i < step; i++) {
            b = applyMove(b, moves[i] as any, null);
        }
        setBoard(b);
    }, [step, player]);

    return (
        <div className="player-lesson-wrapper">
            <div className="lesson-nav-top">
                <button onClick={onBack} style={{ background:'transparent', border:'none', color:'#cbd5e1', padding: 0 }}><ChevronLeft size={28}/></button>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{player.name} Lesson</div>
                <div style={{ width: 28 }} />
            </div>

            <div className="teaching-board-container" style={{ position: 'relative' }}>
                <div className="chess-board teaching-board">
                    {board.map((row, r) => row.map((cell, c) => {
                        const isLight = (r + c) % 2 === 0;
                        const isHighlight = currentMoveData && ((currentMoveData.fr === r && currentMoveData.fc === c) || (currentMoveData.tr === r && currentMoveData.tc === c));
                        return (
                            <div key={`${r}-${c}`} className={`chess-cell ${isLight ? 'light' : 'dark'} ${isHighlight ? 'teaching-highlight' : ''}`}>
                                {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                            </div>
                        );
                    }))}
                </div>
                
                {/* SVG Overlay for arrows */}
                {currentMoveData && (
                    <svg className="teaching-arrow-layer" viewBox="0 0 800 800" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                <polygon points="0 0, 6 3, 0 6" fill="#facc15" />
                            </marker>
                        </defs>
                        <line 
                            x1={`${(currentMoveData.fc + 0.5) * 100}`} 
                            y1={`${(currentMoveData.fr + 0.5) * 100}`} 
                            x2={`${(currentMoveData.tc + 0.5) * 100}`} 
                            y2={`${(currentMoveData.tr + 0.5) * 100}`} 
                            stroke="#facc15" 
                            strokeWidth="15" 
                            opacity="0.85"
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead)" 
                            className="teaching-animated-arrow"
                        />
                    </svg>
                )}
            </div>

            <div className="teaching-panel">
                <div className="teaching-panel-header">Move {step + 1} of {moves.length}</div>
                {isComplete ? (
                    <div>
                        <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>Lesson Complete!</h3>
                        <p style={{ color: '#e2e8f0' }}>You've witnessed {player.name}'s legendary intuition in action.</p>
                        <button onClick={onComplete} style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', marginTop: '1rem' }}>Finish Study</button>
                    </div>
                ) : (
                    <div>
                        <h3 style={{ color: '#facc15', margin: '0 0 0.5rem 0' }}>{currentMoveData?.notation}</h3>
                        <p style={{ color: '#f8fafc', fontSize: '1rem', lineHeight: 1.5, minHeight: 60 }}>{currentMoveData?.explanation}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button disabled={step === 0} onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #475569', background: '#1e293b', color: step === 0 ? '#475569' : 'white', borderRadius: 8 }}>Prev Step</button>
                            <button onClick={() => setStep(s => s + 1)} style={{ flex: 2, padding: '0.75rem', border: 'none', background: '#3b82f6', color: 'white', borderRadius: 8, fontWeight: 'bold' }}>Next Step</button>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ height: 'calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />
        </div>
    );
};

const PlayerSimulationEngine = ({ player, onBack }: { player: ChessHistoricalPlayer, onBack: () => void }) => {
    const sim = player.simulation;
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [answeredIdx, setAnsweredIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!sim) return;
        let b = createInitialBoard();
        sim.boardSetupMoves.forEach(sm => {
            b = applyMove(b, sm as any, null);
        });
        setBoard(b);
    }, [sim]);

    if (!sim) return null;

    return (
        <div className="player-lesson-wrapper">
             <div className="lesson-nav-top">
                <button onClick={onBack} style={{ background:'transparent', border:'none', color:'#cbd5e1', padding: 0 }}><ChevronLeft size={28}/></button>
                <div style={{ color: '#fca5a5', fontWeight: 'bold' }}>Master Intuition Trial</div>
                <div style={{ width: 28 }} />
            </div>

            <div className="teaching-board-container">
                <div className="chess-board teaching-board">
                    {board.map((row, r) => row.map((cell, c) => (
                        <div key={`${r}-${c}`} className={`chess-cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`}>
                            {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                        </div>
                    )))}
                </div>
            </div>

            <div className="teaching-panel">
                <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>What would {player.name} do here?</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sim.options.map((opt, idx) => {
                        const isRevealed = answeredIdx !== null;
                        const bgColor = isRevealed ? (opt.isCorrect ? '#064e3b' : (answeredIdx === idx ? '#7f1d1d' : '#1e293b')) : '#1e293b';
                        const borderColor = isRevealed ? (opt.isCorrect ? '#10b981' : (answeredIdx === idx ? '#ef4444' : '#334155')) : '#334155';
                        
                        return (
                            <button key={idx} disabled={isRevealed} onClick={() => setAnsweredIdx(idx)} style={{ background: bgColor, border: `2px solid ${borderColor}`, padding: '1rem', borderRadius: 8, color: 'white', textAlign: 'left', transition: 'all 0.2s', cursor: isRevealed ? 'default' : 'pointer' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: isRevealed ? '0.5rem' : 0 }}>Play {opt.notation}</div>
                                {isRevealed && <div style={{ fontSize: '0.9rem', color: opt.isCorrect ? '#a7f3d0' : '#fecaca', lineHeight: 1.4 }}>{opt.explanation}</div>}
                            </button>
                        );
                    })}
                </div>
                {answeredIdx !== null && (
                    <button onClick={onBack} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: 'transparent', color: 'white', border: '2px solid #64748b', borderRadius: 8, fontWeight: 'bold' }}>{sim.options[answeredIdx].isCorrect ? 'Well done. Return to Museum.' : 'Insight gained. Return to Museum.'}</button>
                )}
            </div>
            <div style={{ height: 'calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />
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
        { id: 'boss_1', titleId: 'gm_strategist', name: 'The Strategist', difficulty: 3, energy: 30, desc: 'High positional play. Avoid blunders.', reward: '+5% Defense Permanently', avatar: '/assets/strategist_boss.jpg', isImage: true },
        { id: 'boss_2', titleId: 'gm_tactician', name: 'The Tactician', difficulty: 4, energy: 40, desc: 'Tricky with traps. Plays extremely sharp lines.', reward: '+5% Crit Chance Permanently', avatar: '/assets/tactician_boss.jpg', isImage: true },
        { id: 'boss_3', titleId: 'gm_endgame', name: 'The Endgame King', difficulty: 5, energy: 50, desc: 'Flawless execution. A true Grandmaster trial.', reward: '+10% All Stats Permanently', avatar: '/assets/endgame_king_boss.jpg', isImage: true },
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
                    isBossMode={true}
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
                {bosses.map((boss, idx) => {
                    let specialClass = '';
                    let containerClass = '';
                    if (boss.id === 'boss_1') { specialClass = 'boss-card--strategist'; containerClass = 'strategist-img-container'; }
                    if (boss.id === 'boss_2') { specialClass = 'boss-card--tactician'; containerClass = 'tactician-img-container'; }
                    if (boss.id === 'boss_3') { specialClass = 'boss-card--endgame-king'; containerClass = 'endgame-img-container'; }
                    
                    const isPremiumImage = boss.isImage;

                    return (
                        <div key={boss.id} className={`boss-card ${specialClass}`} style={{ borderColor: store.ladderWins.includes(boss.id) ? '#fbbf24' : (boss.id === 'boss_3' ? '#b45309' : (boss.id === 'boss_2' ? '#ea580c' : '#334155')) }}>
                            <div className={`boss-avatar ${containerClass}`}>
                                {boss.isImage ? <img src={boss.avatar} alt="Boss" className={isPremiumImage ? 'special-boss-img' : ''} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: isPremiumImage ? 'none' : '2px solid #64748b' }} /> : boss.avatar}
                            </div>
                            <div className="boss-info" style={{ zIndex: 2 }}>
                            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>{boss.name}</h3>
                            <div className="boss-difficulty" style={{ zIndex: 2 }}>Difficulty: {['Hard', 'Severe', 'Impossible', 'Impossible', 'Impossible', 'Impossible'][idx]}</div>
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
                );
            })}
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
