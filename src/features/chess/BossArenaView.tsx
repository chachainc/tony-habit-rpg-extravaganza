import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useChessStore } from '../../store/useChessStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useGameStore } from '../../store/useGameStore';
import { PIECE_UNICODE, parseFen, getLegalMoves, applyMove } from '../conquest/chessUtils';
import type { Board, Move } from '../conquest/chessUtils';
import type { ChessHistoricalPlayer, StyleArenaChallenge } from '../../data/chessStyles';
import './BossArenaView.css';

interface BossArenaViewProps {
    player: ChessHistoricalPlayer;
    challenge: StyleArenaChallenge;
    onExit: () => void;
}

export const BossArenaView: React.FC<BossArenaViewProps> = ({ player, challenge, onExit }) => {
    const store = useChessStore();
    const addGold = useCurrencyStore((s) => s.addGold);
    const addSkillXp = useGameStore((s) => s.addSkillXp);

    const [turnIndex, setTurnIndex] = useState(0);
    const [board, setBoard] = useState<Board>(parseFen(challenge.turns[0].fen));
    const [meter, setMeter] = useState(50); // Hardcoded to 50 based on prompt
    
    // Interaction State
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    
    // Feedback State
    const [feedbackEvent, setFeedbackEvent] = useState<{ grade: string, text: string } | null>(null);
    const [isBossThinking, setIsBossThinking] = useState(false);
    const [battleState, setBattleState] = useState<'active' | 'victory' | 'defeat'>('active');

    const checkWinCondition = (newMeter: number, newTurnIndex: number) => {
        if (newMeter >= 100 || newTurnIndex >= challenge.turns.length) {
            setBattleState('victory');
            store.recordArenaClear(challenge.id, challenge.tier);
            addGold(challenge.rewards.gold);
            addSkillXp('Intelligence', challenge.rewards.intelligenceXp);
            return true;
        }
        if (newMeter <= 0) {
            setBattleState('defeat');
            return true;
        }
        return false;
    };

    const handleCellClick = (r: number, c: number) => {
        if (battleState !== 'active' || isBossThinking) return;

        if (selected) {
            const move = validMoves.find(m => m.tr === r && m.tc === c);
            if (move) {
                // Determine grade
                const currentTurn = challenge.turns[turnIndex];
                const evaluation = currentTurn.evaluations.find(e => 
                    e.fr === move.fr && e.fc === move.fc && e.tr === move.tr && e.tc === move.tc
                );

                // Hardcoded point logic from prompt
                const grade = evaluation ? evaluation.grade : 'blunder';
                let delta = 0;
                let fallbackText = '';
                
                if (grade === 'perfect') {
                    delta = 25;
                    fallbackText = `Perfect — ${player.name.split(' ')[0]} approves`;
                } else if (grade === 'good') {
                    delta = 12;
                    fallbackText = `Good — but you could be more aggressive`;
                } else if (grade === 'poor') {
                    delta = -8;
                    fallbackText = `Poor — this loses initiative`;
                } else {
                    delta = -20;
                    fallbackText = `Blunder — completely off-style`;
                }

                // If existing evaluation text isn't empty, inject it optionally, else use prompt's text.
                const feedbackText = fallbackText;

                // Fire visuals
                setFeedbackEvent({ grade, text: feedbackText });
                const newMeter = Math.max(0, Math.min(100, meter + delta));
                setMeter(newMeter);
                
                const newBoard = applyMove(board, move, null); // En passant not fully tracked in basic arena for now
                setBoard(newBoard);
                setSelected(null);
                setValidMoves([]);

                if (checkWinCondition(newMeter, turnIndex)) {
                    return;
                }

                if (currentTurn.bossResponseSan) {
                    setIsBossThinking(true);
                    setTimeout(() => {
                        // Advance to next turn directly, resetting board FEN to the pre-scripted next state
                        // This avoids needing a full move parser for the boss's SAN string locally!
                        const nextTurnIdx = turnIndex + 1;
                        if (nextTurnIdx < challenge.turns.length) {
                            setBoard(parseFen(challenge.turns[nextTurnIdx].fen));
                            setTurnIndex(nextTurnIdx);
                        } else {
                            checkWinCondition(newMeter, nextTurnIdx);
                        }
                        setIsBossThinking(false);
                        setFeedbackEvent(null);
                    }, 1200);
                } else {
                    // No boss response defined, move to next immediately
                    const nextTurnIdx = turnIndex + 1;
                    if (nextTurnIdx < challenge.turns.length) {
                        setBoard(parseFen(challenge.turns[nextTurnIdx].fen));
                        setTurnIndex(nextTurnIdx);
                    } else {
                        checkWinCondition(newMeter, nextTurnIdx);
                    }
                }
                return;
            }
        }

        const piece = board[r][c];
        if (piece && piece.color === 'w') {
            setSelected([r, c]);
            const moves = getLegalMoves(board, 'w', null).filter(m => m.fr === r && m.fc === c);
            setValidMoves(moves);
        } else {
            setSelected(null);
            setValidMoves([]);
        }
    };

    const targetPercent = Math.max(0, Math.min(100, meter));

    let meterColor = '#ef4444'; // red (0-25)
    let meterShadow = 'none';

    if (meter > 25 && meter <= 50) {
        meterColor = '#f97316'; // orange
    } else if (meter > 50 && meter <= 75) {
        meterColor = '#eab308'; // gold
    } else if (meter > 75) {
        meterColor = '#facc15'; // bright gold
        meterShadow = '0 0 15px rgba(250, 204, 21, 0.8)';
    }

    return (
        <motion.div className="boss-arena-realm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Minimal Header */}
            <div className="boss-arena-header">
                <button onClick={onExit} className="arena-exit-btn"><ChevronLeft size={24} /> Flee</button>
                <div className="boss-arena-identity">
                    <h2>{player.name}</h2>
                    <span>{challenge.title}</span>
                </div>
            </div>

            {/* Boss Passive Banner */}
            <div className="boss-passive-banner">
                <span className="passive-icon">⚡</span>
                {challenge.bossPassive}
            </div>

            {/* Style Meter */}
            <div className={`style-meter-container ${feedbackEvent ? `meter-${feedbackEvent.grade}` : ''}`}>
                <div className="style-meter-label">Style Resonance: {meter}/100</div>
                <div className="style-meter-bar-bg">
                    <motion.div 
                        className="style-meter-bar-fill" 
                        animate={{ width: `${targetPercent}%` }} 
                        transition={{ ease: "easeOut", duration: 0.3 }}
                        style={{ background: meterColor, boxShadow: meterShadow }}
                    />
                    <div className="style-meter-target-line" style={{ left: '100%' }} />
                </div>
            </div>

            {/* The Arena Board */}
            <div className={`arena-board-wrapper ${feedbackEvent ? `flash-${feedbackEvent.grade}` : ''}`}>
                <div className="chess-board">
                    {board.map((row, r) => row.map((cell, c) => {
                        const isLight = (r + c) % 2 === 0;
                        const isSelected = selected && selected[0] === r && selected[1] === c;
                        const isValidMove = validMoves.some(m => m.tr === r && m.tc === c);
                        const isCapture = isValidMove && board[r][c] !== null;

                        return (
                            <div
                                key={`${r}-${c}`}
                                className={`chess-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMove && !isCapture ? 'valid-move' : ''} ${isCapture ? 'valid-capture' : ''}`}
                                onClick={() => handleCellClick(r, c)}
                            >
                                {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                            </div>
                        );
                    }))}
                </div>
                
                <AnimatePresence>
                    {isBossThinking && (
                        <motion.div className="boss-thinking-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="spinner" />
                            {player.name} is responding...
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Prompt & Feedback Panel */}
            <div className="arena-event-log">
                {battleState === 'active' ? (
                    feedbackEvent ? (
                        <motion.div className={`feedback-card feedback-${feedbackEvent.grade}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <div className="feedback-grade">{feedbackEvent.grade.toUpperCase()}!</div>
                            <div className="feedback-text">{feedbackEvent.text}</div>
                        </motion.div>
                    ) : (
                        <div className="arena-prompt">
                            {challenge.turns[turnIndex].prompt}
                        </div>
                    )
                ) : (
                    <motion.div className="arena-result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        {battleState === 'victory' ? (
                            <>
                                <h2 style={{ color: '#facc15' }}>Victory</h2>
                                <p>You have proved your stylistic mastery.</p>
                                <div style={{ color: '#34d399', fontWeight: 'bold' }}>+{challenge.rewards.gold} Gold | +{challenge.rewards.intelligenceXp} XP</div>
                            </>
                        ) : (
                            <>
                                <h2 style={{ color: '#f87171' }}>Devastation</h2>
                                <p>Your style meter plummeted. The master overwhelmed you.</p>
                            </>
                        )}
                        <button onClick={onExit} style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Return to Archives</button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
