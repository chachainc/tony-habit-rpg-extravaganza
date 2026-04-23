import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ChessGame.css';

import {
    PIECE_UNICODE, PIECE_VALUES, createInitialBoard, isInCheck, getLegalMoves, applyMove
} from './chessUtils';
import type { Color, Board, Move } from './chessUtils';

export interface ChessGameProps {
    onComplete: (result: 'win' | 'draw' | 'loss', difficulty: 1 | 2 | 3) => void;
    onClose: () => void;
    canPlay: boolean;
    isBossMode?: boolean;
}

// ─── AI ───────────────────────────────────────

function evaluateBoard(board: Board): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const val = PIECE_VALUES[piece.type];
            score += piece.color === 'b' ? val : -val;
        }
    }
    return score;
}



function aiMoveGreedy(board: Board, legalMoves: Move[], enPassant: [number, number] | null): Move {
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];
    for (const move of legalMoves) {
        const nb = applyMove(board, move, enPassant);
        const score = evaluateBoard(nb);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

function minimax(board: Board, depth: number, isMaximizing: boolean, alpha: number, beta: number, enPassant: [number, number] | null): number {
    if (depth === 0) return evaluateBoard(board);

    const color: Color = isMaximizing ? 'b' : 'w';
    const moves = getLegalMoves(board, color, enPassant);
    if (moves.length === 0) {
        return isInCheck(board, color) ? (isMaximizing ? -9999 : 9999) : 0;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nb = applyMove(board, move, enPassant);
            const eval_ = minimax(nb, depth - 1, false, alpha, beta, null);
            maxEval = Math.max(maxEval, eval_);
            alpha = Math.max(alpha, eval_);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nb = applyMove(board, move, enPassant);
            const eval_ = minimax(nb, depth - 1, true, alpha, beta, null);
            minEval = Math.min(minEval, eval_);
            beta = Math.min(beta, eval_);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function aiMoveMinimax(board: Board, legalMoves: Move[], enPassant: [number, number] | null, depth: number): Move {
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];
    for (const move of legalMoves) {
        const nb = applyMove(board, move, enPassant);
        const score = minimax(nb, depth - 1, false, -Infinity, Infinity, null);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

// ─── COMPONENT ────────────────────────────────

export const ChessGame = ({ onComplete, onClose, canPlay, isBossMode }: ChessGameProps) => {
    const [board, setBoard] = useState<Board>(createInitialBoard);
    const [turn, setTurn] = useState<Color>('w');
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [gameOver, setGameOver] = useState<'win' | 'draw' | 'loss' | 'resigned' | null>(null);
    const [enPassant, setEnPassant] = useState<[number, number] | null>(null);
    const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
    const [status, setStatus] = useState('Your turn (White)');
    const [lastAIMove, setLastAIMove] = useState<{ fr: number; fc: number; tr: number; tc: number } | null>(null);

    const XP_MULTIPLIER: Record<number, number> = { 1: 1, 2: 2, 3: 3 };
    const getXP = (result: 'win' | 'draw' | 'loss' | 'resigned') => {
        if (result === 'loss' || result === 'resigned') return 0;
        return XP_MULTIPLIER[difficulty] || 1;
    };

    const checkGameState = useCallback((newBoard: Board, nextTurn: Color, ep: [number, number] | null) => {
        const legal = getLegalMoves(newBoard, nextTurn, ep);
        if (legal.length === 0) {
            if (isInCheck(newBoard, nextTurn)) {
                // Checkmate
                setGameOver(nextTurn === 'b' ? 'win' : 'loss');
                setStatus(nextTurn === 'b' ? '♔ Checkmate! You win!' : '♚ Checkmate! You lose.');
            } else {
                setGameOver('draw');
                setStatus('Stalemate — Draw');
            }
            return true;
        }
        if (isInCheck(newBoard, nextTurn)) {
            setStatus(nextTurn === 'w' ? 'Check! Your turn.' : 'Check! AI thinking...');
        }
        return false;
    }, []);

    // AI move
    useEffect(() => {
        if (turn !== 'b' || gameOver) return;
        setStatus('AI thinking...');

        const timer = setTimeout(() => {
            const legal = getLegalMoves(board, 'b', enPassant);
            if (legal.length === 0) return;

            let aiMove: Move;
            const effectiveDifficulty = isBossMode ? 3 : difficulty; // Force max logic for bosses

            switch (effectiveDifficulty) {
                // Easy: greedy (best immediate capture/position) — no more random blunders
                case 1: aiMove = aiMoveGreedy(board, legal, enPassant); break;
                // Medium: minimax 2-ply — looks 2 moves ahead
                case 2: aiMove = aiMoveMinimax(board, legal, enPassant, 2); break;
                // Hard/Impossible: minimax 3-ply — looks 3 moves ahead
                case 3: aiMove = aiMoveMinimax(board, legal, enPassant, 3); break;
                default: aiMove = aiMoveGreedy(board, legal, enPassant);
            }

            const newBoard = applyMove(board, aiMove, enPassant);

            // Check for en passant state
            let newEp: [number, number] | null = null;
            const piece = board[aiMove.fr][aiMove.fc];
            if (piece?.type === 'P' && Math.abs(aiMove.tr - aiMove.fr) === 2) {
                newEp = [(aiMove.fr + aiMove.tr) / 2, aiMove.fc];
            }

            setBoard(newBoard);
            setEnPassant(newEp);
            setLastAIMove({ fr: aiMove.fr, fc: aiMove.fc, tr: aiMove.tr, tc: aiMove.tc });
            setTurn('w');
            setSelected(null);
            setValidMoves([]);

            if (!checkGameState(newBoard, 'w', newEp)) {
                setStatus('Your turn (White)');
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [turn, board, gameOver, difficulty, enPassant, checkGameState]);

    const handleCellClick = (r: number, c: number) => {
        if (turn !== 'w' || gameOver) return;

        // If a piece is selected, try to move
        if (selected) {
            const move = validMoves.find(m => m.tr === r && m.tc === c);
            if (move) {
                const newBoard = applyMove(board, move, enPassant);

                // En passant tracking
                let newEp: [number, number] | null = null;
                const piece = board[move.fr][move.fc];
                if (piece?.type === 'P' && Math.abs(move.tr - move.fr) === 2) {
                    newEp = [(move.fr + move.tr) / 2, move.fc];
                }

                setBoard(newBoard);
                setEnPassant(newEp);
                setTurn('b');
                setSelected(null);
                setValidMoves([]);
                checkGameState(newBoard, 'b', newEp);
                return;
            }
        }

        // Select a piece
        const piece = board[r][c];
        if (piece && piece.color === 'w') {
            setSelected([r, c]);
            const moves = getLegalMoves(board, 'w', enPassant).filter(m => m.fr === r && m.fc === c);
            setValidMoves(moves);
        } else {
            setSelected(null);
            setValidMoves([]);
        }
    };

    const resign = () => {
        setGameOver('resigned');
        setStatus('You surrendered.');
    };

    if (!canPlay) {
        return (
            <motion.div
                className="chess-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="chess-modal"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="chess-header">
                        <h2>♟️ Daily Chess</h2>
                        <button className="chess-close-btn" onClick={onClose}>×</button>
                    </div>
                    <div className="chess-unavailable">
                        You've already played your daily chess game today.<br />Come back tomorrow for more Strategy XP!
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="chess-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="chess-modal"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="chess-header">
                    <h2>♟️ Daily Chess</h2>
                    <button className="chess-close-btn" onClick={onClose}>×</button>
                </div>

                {/* Difficulty selector */}
                {!gameOver && (
                    isBossMode ? (
                        <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px', textShadow: '0 0 10px rgba(239,68,68,0.5)', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                            BOSS DIFFICULTY: IMPOSSIBLE
                        </div>
                    ) : (
                        <div className="chess-difficulty-select">
                            {[1, 2, 3].map(d => (
                                <button
                                    key={d}
                                    className={`difficulty-btn ${difficulty === d ? 'active-difficulty' : ''}`}
                                    onClick={() => setDifficulty(d as 1 | 2 | 3)}
                                >
                                    {d === 1 ? 'Easy' : d === 2 ? 'Medium' : 'Hard'}
                                </button>
                            ))}
                        </div>
                    )
                )}

                <div className="chess-status">{status}</div>

                <div className="chess-board">
                    {board.map((row, r) =>
                        row.map((cell, c) => {
                            const isLight = (r + c) % 2 === 0;
                            const isSelected = selected && selected[0] === r && selected[1] === c;
                            const isValidMove = validMoves.some(m => m.tr === r && m.tc === c);
                            const isCapture = isValidMove && board[r][c] !== null;
                            const isLastMoveFrom = lastAIMove && lastAIMove.fr === r && lastAIMove.fc === c;
                            const isLastMoveTo = lastAIMove && lastAIMove.tr === r && lastAIMove.tc === c;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`chess-cell ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMove && !isCapture ? 'valid-move' : ''} ${isCapture ? 'valid-capture' : ''} ${isLastMoveFrom ? 'last-move-from' : ''} ${isLastMoveTo ? 'last-move-to' : ''}`}
                                    onClick={() => handleCellClick(r, c)}
                                >
                                    {cell && <span className={cell.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}>{PIECE_UNICODE[`${cell.color}${cell.type}`]}</span>}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="chess-actions">
                    {!gameOver ? (
                        <button className="chess-action-btn chess-resign-btn" onClick={resign}>
                            Surrender
                        </button>
                    ) : (
                        <button
                            className="chess-action-btn chess-complete-btn"
                            onClick={() => onComplete(gameOver === 'resigned' ? 'loss' : gameOver, isBossMode ? 3 : difficulty)}
                        >
                            Claim {getXP(gameOver)} Strategy XP
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
