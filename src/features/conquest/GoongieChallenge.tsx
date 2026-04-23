import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    parseFen, getLegalMoves, applyMove, isInCheck
} from './chessUtils';
import type { Board, Move } from './chessUtils';
import { PIECE_UNICODE } from './chessUtils';
import type { GoongiePuzzle } from '../../data/goongiePuzzles';
import './GoongieChallenge.css';

interface GoongieChallengeProps {
    puzzle: GoongiePuzzle | null;
    onComplete: (success: boolean) => void;
    onClose: () => void;
}

// Convert UCI string "e1e8" → Move coords or "f7g8" (promotion handled as queen)
function uciToMove(uci: string, board: Board): Move | null {
    if (!uci || uci.length < 4) return null;
    const fc = uci.charCodeAt(0) - 97; // a=0..h=7
    const fr = 8 - parseInt(uci[1], 10); // rank 1→row 7, rank 8→row 0
    const tc = uci.charCodeAt(2) - 97;
    const tr = 8 - parseInt(uci[3], 10);
    const piece = board[fr]?.[fc];
    if (!piece) return null;
    // Promotion: pawn reaching last rank (row 0 for white, row 7 for black)
    const isPromo = piece.type === 'P' && (tr === 0 || tr === 7);
    return { fr, fc, tr, tc, promotion: isPromo ? 'Q' : undefined };
}

// Moves are equal if from/to match (ignore promotion specifics — always promote to Q in puzzles)
function movesEqual(a: Move, b: Move): boolean {
    return a.fr === b.fr && a.fc === b.fc && a.tr === b.tr && a.tc === b.tc;
}

const DIFFICULTY_LABEL: Record<number, string> = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Tactician',
    4: 'Expert',
    5: 'Grand Master',
};

const DIFFICULTY_COLOR: Record<number, string> = {
    1: '#22c55e',
    2: '#84cc16',
    3: '#fbbf24',
    4: '#f97316',
    5: '#ef4444',
};

const THEME_ICON: Record<string, string> = {
    mate_in_1: '♟️',
    mate_in_2: '♟️♟️',
    fork: '⚔️',
    pin: '📌',
    skewer: '🗡️',
    discovered_attack: '💥',
    promotion: '👑',
    sacrifice: '🔥',
    escape_check: '🛡️',
    back_rank: '🏰',
};

export const GoongieChallenge = ({ puzzle, onComplete, onClose }: GoongieChallengeProps) => {
    // ── State ───────────────────────────────────────────────────────────
    const initialBoard = useRef<Board | null>(null);
    const [board, setBoard] = useState<Board>(() => {
        if (!puzzle) return [];
        const b = parseFen(puzzle.fen);
        initialBoard.current = b;
        return b;
    });
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [enPassant, setEnPassant] = useState<[number, number] | null>(null);
    const [moveIndex, setMoveIndex] = useState(0);  // Which solution move we're on
    const [status, setStatus] = useState<'playing' | 'wrong' | 'success'>('playing');
    const [flashWrong, setFlashWrong] = useState(false);
    const [lastMove, setLastMove] = useState<{ fr: number; fc: number; tr: number; tc: number } | null>(null);
    const [opponentThinking, setOpponentThinking] = useState(false);

    const puzzle_ref = useRef(puzzle);

    // Reset when puzzle changes
    useEffect(() => {
        if (!puzzle) return;
        puzzle_ref.current = puzzle;
        const b = parseFen(puzzle.fen);
        initialBoard.current = b;
        setBoard(b);
        setSelected(null);
        setValidMoves([]);
        setEnPassant(null);
        setMoveIndex(0);
        setStatus('playing');
        setFlashWrong(false);
        setLastMove(null);
        setOpponentThinking(false);
    }, [puzzle?.id]);

    const playerSide = puzzle?.playerSide ?? 'w';

    // ── Opponent auto-reply ─────────────────────────────────────────────
    // After the player makes their correct move, apply the opponent's response (if any)
    const applyOpponentReply = useCallback((
        boardAfterPlayer: Board,
        newMoveIndex: number,
        ep: [number, number] | null,
    ) => {
        const puzz = puzzle_ref.current;
        if (!puzz) return;
        const sol = puzz.solution;

        // Check if next expected move is the opponent's (alternating sides)
        // Player alternates with opponent in the solution sequence.
        // playerSide makes moves at even indices (0, 2, 4...) if solution starts with player.
        if (newMoveIndex >= sol.length) return; // puzzle is done — handled elsewhere

        setOpponentThinking(true);
        setTimeout(() => {
            const currentBoard = boardAfterPlayer;
            const opponentUci = sol[newMoveIndex];
            const opponentMove = uciToMove(opponentUci, currentBoard);
            if (!opponentMove) {
                setOpponentThinking(false);
                return;
            }
            const newBoard = applyMove(currentBoard, opponentMove, ep);

            // EP tracking for opponent
            let newEp: [number, number] | null = null;
            const piece = currentBoard[opponentMove.fr][opponentMove.fc];
            if (piece?.type === 'P' && Math.abs(opponentMove.tr - opponentMove.fr) === 2) {
                newEp = [(opponentMove.fr + opponentMove.tr) / 2, opponentMove.fc];
            }

            setBoard(newBoard);
            setEnPassant(newEp);
            setLastMove({ fr: opponentMove.fr, fc: opponentMove.fc, tr: opponentMove.tr, tc: opponentMove.tc });
            setMoveIndex(newMoveIndex + 1);
            setOpponentThinking(false);
        }, 600);
    }, []);

    // ── Square click handler ────────────────────────────────────────────
    const handleSquareClick = useCallback((r: number, c: number) => {
        if (status !== 'playing' || opponentThinking || !puzzle) return;

        const piece = board[r]?.[c];

        // If a piece is already selected, try to move it
        if (selected) {
            const [sr, sc] = selected;
            const move = validMoves.find(m => m.tr === r && m.tc === c);

            if (move) {
                // Validate against solution
                const expectedUci = puzzle.solution[moveIndex];
                const expectedMove = expectedUci ? uciToMove(expectedUci, board) : null;

                const isCorrect = expectedMove && movesEqual(move, expectedMove);

                if (isCorrect) {
                    // Apply the player's move
                    const newBoard = applyMove(board, move, enPassant);

                    let newEp: [number, number] | null = null;
                    const movingPiece = board[move.fr][move.fc];
                    if (movingPiece?.type === 'P' && Math.abs(move.tr - move.fr) === 2) {
                        newEp = [(move.fr + move.tr) / 2, move.fc];
                    }

                    setBoard(newBoard);
                    setEnPassant(newEp);
                    setSelected(null);
                    setValidMoves([]);
                    setLastMove({ fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc });

                    const nextMoveIndex = moveIndex + 1;

                    // Check if puzzle is solved
                    if (nextMoveIndex >= puzzle.solution.length) {
                        setStatus('success');
                        setMoveIndex(nextMoveIndex);
                        return;
                    }

                    // Opponent's turn next — determine if next move in solution is opponent's
                    // Player moves at even solution indices (0, 2, ...) if puzzle.solution[0] is player
                    // So opponent moves at odd indices: 1, 3, 5...
                    const nextIsOpponent = true; // After any player move, opponent replies
                    if (nextIsOpponent) {
                        setMoveIndex(nextMoveIndex);
                        applyOpponentReply(newBoard, nextMoveIndex, newEp);
                    } else {
                        setMoveIndex(nextMoveIndex);
                    }
                } else {
                    // Wrong move
                    setFlashWrong(true);
                    setSelected(null);
                    setValidMoves([]);
                    setTimeout(() => {
                        setFlashWrong(false);
                        setStatus('wrong');
                    }, 600);
                }
                return;
            }

            // Clicking same piece deselects
            if (sr === r && sc === c) {
                setSelected(null);
                setValidMoves([]);
                return;
            }
        }

        // Select a piece belonging to the player
        if (piece && piece.color === playerSide) {
            const moves = getLegalMoves(board, playerSide, enPassant).filter(
                m => m.fr === r && m.fc === c
            );
            setSelected([r, c]);
            setValidMoves(moves);
        } else {
            setSelected(null);
            setValidMoves([]);
        }
    }, [status, opponentThinking, puzzle, board, selected, validMoves, enPassant, moveIndex, playerSide, applyOpponentReply]);

    const handleRetry = () => {
        if (!puzzle) return;
        const b = initialBoard.current ?? parseFen(puzzle.fen);
        setBoard(b);
        setSelected(null);
        setValidMoves([]);
        setEnPassant(null);
        setMoveIndex(0);
        setStatus('playing');
        setFlashWrong(false);
        setLastMove(null);
        setOpponentThinking(false);
    };

    // ── Fallback for null puzzle ────────────────────────────────────────
    if (!puzzle) {
        return (
            <div className="goongie-overlay">
                <div className="goongie-modal" role="dialog" aria-label="Goongie Challenge">
                    <div className="goongie-fallback">
                        <div className="goongie-fallback-icon">⚠️</div>
                        <h3>Puzzle Failed to Load</h3>
                        <p>The tactical puzzle could not be initialized.</p>
                        <button className="goongie-btn goongie-btn-secondary" onClick={onClose}>
                            Return to Map
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const diffColor = DIFFICULTY_COLOR[puzzle.difficulty];
    const diffLabel = DIFFICULTY_LABEL[puzzle.difficulty];
    const themeIcon = THEME_ICON[puzzle.theme] ?? '♟️';
    const totalPlayerMoves = Math.ceil(puzzle.solution.length / 2);

    return (
        <motion.div
            className="goongie-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Goongie Challenge"
        >
            <div className={`goongie-modal ${flashWrong ? 'flash-wrong' : ''}`}>

                {/* Header */}
                <div className="goongie-header">
                    <div className="goongie-title-block">
                        <span className="goongie-theme-icon">{themeIcon}</span>
                        <div>
                            <div className="goongie-title">{puzzle.title}</div>
                            <div className="goongie-diff" style={{ color: diffColor }}>
                                ★ {diffLabel}
                            </div>
                        </div>
                    </div>
                    <button className="goongie-close-btn" onClick={onClose} aria-label="Close">×</button>
                </div>

                {/* Objective */}
                <div className="goongie-objective">
                    {puzzle.objective}
                </div>

                {/* Status banner */}
                <AnimatePresence mode="wait">
                    {status === 'playing' && (
                        <motion.div
                            key="playing"
                            className="goongie-status-bar playing"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {opponentThinking
                                ? '⏳ Opponent thinking...'
                                : `♟️ Your turn — ${puzzle.playerSide === 'w' ? 'White' : 'Black'} to move`}
                        </motion.div>
                    )}
                    {status === 'wrong' && (
                        <motion.div
                            key="wrong"
                            className="goongie-status-bar wrong"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            ✗ Wrong move!
                            {puzzle.hint && <span className="goongie-hint"> Hint: {puzzle.hint}</span>}
                        </motion.div>
                    )}
                    {status === 'success' && (
                        <motion.div
                            key="success"
                            className="goongie-status-bar success"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            ✓ Brilliant! Puzzle Solved!
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Board */}
                <div className="goongie-board-wrap">
                    <div className={`goongie-board${puzzle.playerSide === 'b' ? ' flipped' : ''}`}>
                        {board.map((row, r) =>
                            row.map((cell, c) => {
                                const isLight = (r + c) % 2 === 0;
                                const isSelected = selected?.[0] === r && selected?.[1] === c;
                                const isValidTarget = validMoves.some(m => m.tr === r && m.tc === c);
                                const isCapture = isValidTarget && !!cell;
                                const isLastFrom = lastMove?.fr === r && lastMove?.fc === c;
                                const isLastTo = lastMove?.tr === r && lastMove?.tc === c;
                                const isInCheckSq = cell?.type === 'K' && isInCheck(board, cell.color);

                                const classes = [
                                    'goongie-square',
                                    isLight ? 'light' : 'dark',
                                    isSelected ? 'selected' : '',
                                    isValidTarget && !isCapture ? 'valid-move' : '',
                                    isCapture ? 'valid-capture' : '',
                                    isLastFrom ? 'last-from' : '',
                                    isLastTo ? 'last-to' : '',
                                    isInCheckSq ? 'in-check' : '',
                                ].filter(Boolean).join(' ');

                                const pieceKey = cell ? `${cell.color}${cell.type}` : '';
                                const pieceChar = pieceKey ? PIECE_UNICODE[pieceKey] ?? '' : '';

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        className={classes}
                                        onClick={() => handleSquareClick(r, c)}
                                    >
                                        {/* Board coordinate labels */}
                                        {c === 0 && (
                                            <span className={`goongie-rank-label ${isLight ? 'dark-text' : 'light-text'}`}>
                                                {8 - r}
                                            </span>
                                        )}
                                        {r === 7 && (
                                            <span className={`goongie-file-label ${isLight ? 'dark-text' : 'light-text'}`}>
                                                {String.fromCharCode(97 + c)}
                                            </span>
                                        )}

                                        {isValidTarget && !isCapture && (
                                            <div className="goongie-move-dot" />
                                        )}
                                        {isCapture && (
                                            <div className="goongie-capture-ring" />
                                        )}
                                        {pieceChar && (
                                            <span className={`goongie-piece ${cell!.color === 'w' ? 'white-piece' : 'black-piece'}`}>
                                                {pieceChar}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Progress indicator */}
                {status === 'playing' && puzzle.solution.length > 1 && (
                    <div className="goongie-progress">
                        {Array.from({ length: totalPlayerMoves }).map((_, i) => {
                            const playerMovesDone = Math.floor(moveIndex / 2);
                            return (
                                <div
                                    key={i}
                                    className={`goongie-progress-dot ${i < playerMovesDone ? 'done' : i === playerMovesDone ? 'current' : ''}`}
                                />
                            );
                        })}
                        <span className="goongie-progress-label">
                            Move {Math.floor(moveIndex / 2) + 1} of {totalPlayerMoves}
                        </span>
                    </div>
                )}

                {/* Action buttons */}
                <div className="goongie-actions">
                    {status === 'playing' && (
                        <button className="goongie-btn goongie-btn-secondary" onClick={onClose}>
                            Flee
                        </button>
                    )}
                    {status === 'wrong' && (
                        <>
                            <button className="goongie-btn goongie-btn-primary" onClick={handleRetry}>
                                🔄 Retry
                            </button>
                            <button className="goongie-btn goongie-btn-danger" onClick={() => onComplete(false)}>
                                Accept Defeat
                            </button>
                        </>
                    )}
                    {status === 'success' && (
                        <div className="goongie-reward-block">
                            <div className="goongie-reward-row">
                                <span className="goongie-reward-item">🪙 +{puzzle.reward.gold} Gold</span>
                                {puzzle.reward.sigils && puzzle.reward.sigils > 0 && (
                                    <span className="goongie-reward-item">💠 +{puzzle.reward.sigils} Sigils</span>
                                )}
                            </div>
                            <button
                                className="goongie-btn goongie-btn-success"
                                onClick={() => onComplete(true)}
                            >
                                Claim Rewards
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
