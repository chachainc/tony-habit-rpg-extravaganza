import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ChessGame.css';

// ─── TYPES ────────────────────────────────────

type Color = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];

interface ChessGameProps {
    onComplete: (result: 'win' | 'draw' | 'loss', difficulty: 1 | 2 | 3) => void;
    onClose: () => void;
    canPlay: boolean;
}

// ─── CONSTANTS ────────────────────────────────

const PIECE_UNICODE: Record<string, string> = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟',
};

const PIECE_VALUES: Record<PieceType, number> = {
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900,
};

// ─── BOARD SETUP ──────────────────────────────

function createInitialBoard(): Board {
    const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRow: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let c = 0; c < 8; c++) {
        board[0][c] = { type: backRow[c], color: 'b' };
        board[1][c] = { type: 'P', color: 'b' };
        board[6][c] = { type: 'P', color: 'w' };
        board[7][c] = { type: backRow[c], color: 'w' };
    }
    return board;
}

function cloneBoard(board: Board): Board {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

// ─── MOVE VALIDATION ──────────────────────────

function inBounds(r: number, c: number): boolean {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board: Board, color: Color): [number, number] {
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (board[r][c]?.type === 'K' && board[r][c]?.color === color)
                return [r, c];
    return [-1, -1];
}

function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
    // Check all opponent pieces for attacks on this square
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (!piece || piece.color !== byColor) continue;
            if (canPieceAttack(board, sr, sc, r, c)) return true;
        }
    }
    return false;
}

function canPieceAttack(board: Board, fr: number, fc: number, tr: number, tc: number): boolean {
    const piece = board[fr][fc];
    if (!piece) return false;
    const dr = tr - fr, dc = tc - fc;
    const adr = Math.abs(dr), adc = Math.abs(dc);

    switch (piece.type) {
        case 'P': {
            const dir = piece.color === 'w' ? -1 : 1;
            return dr === dir && adc === 1;
        }
        case 'N':
            return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
        case 'B':
            if (adr !== adc || adr === 0) return false;
            return isPathClear(board, fr, fc, tr, tc);
        case 'R':
            if (dr !== 0 && dc !== 0) return false;
            return isPathClear(board, fr, fc, tr, tc);
        case 'Q':
            if (dr !== 0 && dc !== 0 && adr !== adc) return false;
            return isPathClear(board, fr, fc, tr, tc);
        case 'K':
            return adr <= 1 && adc <= 1 && (adr + adc > 0);
    }
}

function isPathClear(board: Board, fr: number, fc: number, tr: number, tc: number): boolean {
    const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
    let r = fr + dr, c = fc + dc;
    while (r !== tr || c !== tc) {
        if (board[r][c]) return false;
        r += dr; c += dc;
    }
    return true;
}

function isInCheck(board: Board, color: Color): boolean {
    const [kr, kc] = findKing(board, color);
    if (kr === -1) return false;
    const opp = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kr, kc, opp);
}

interface Move { fr: number; fc: number; tr: number; tc: number; promotion?: PieceType; }

function getRawMoves(board: Board, color: Color, enPassant: [number, number] | null): Move[] {
    const moves: Move[] = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece || piece.color !== color) continue;
            const pMoves = getPieceMoves(board, r, c, enPassant);
            moves.push(...pMoves);
        }
    }
    return moves;
}

function getPieceMoves(board: Board, r: number, c: number, enPassant: [number, number] | null): Move[] {
    const piece = board[r][c];
    if (!piece) return [];
    const moves: Move[] = [];
    const color = piece.color;

    const addMove = (tr: number, tc: number) => {
        if (!inBounds(tr, tc)) return;
        const target = board[tr][tc];
        if (target && target.color === color) return;
        // Pawn promotion
        if (piece.type === 'P' && (tr === 0 || tr === 7)) {
            for (const promo of ['Q', 'R', 'B', 'N'] as PieceType[]) {
                moves.push({ fr: r, fc: c, tr, tc, promotion: promo });
            }
        } else {
            moves.push({ fr: r, fc: c, tr, tc });
        }
    };

    switch (piece.type) {
        case 'P': {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            // Forward
            if (inBounds(r + dir, c) && !board[r + dir][c]) {
                addMove(r + dir, c);
                // Double from start
                if (r === startRow && !board[r + dir * 2][c]) {
                    addMove(r + dir * 2, c);
                }
            }
            // Captures
            for (const dc of [-1, 1]) {
                if (inBounds(r + dir, c + dc)) {
                    const target = board[r + dir][c + dc];
                    if (target && target.color !== color) addMove(r + dir, c + dc);
                    // En passant
                    if (enPassant && enPassant[0] === r + dir && enPassant[1] === c + dc) {
                        addMove(r + dir, c + dc);
                    }
                }
            }
            break;
        }
        case 'N':
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                addMove(r + dr, c + dc);
            }
            break;
        case 'B':
            for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                for (let i = 1; i < 8; i++) {
                    const nr = r + dr * i, nc = c + dc * i;
                    if (!inBounds(nr, nc)) break;
                    addMove(nr, nc);
                    if (board[nr][nc]) break;
                }
            }
            break;
        case 'R':
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                for (let i = 1; i < 8; i++) {
                    const nr = r + dr * i, nc = c + dc * i;
                    if (!inBounds(nr, nc)) break;
                    addMove(nr, nc);
                    if (board[nr][nc]) break;
                }
            }
            break;
        case 'Q':
            for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                for (let i = 1; i < 8; i++) {
                    const nr = r + dr * i, nc = c + dc * i;
                    if (!inBounds(nr, nc)) break;
                    addMove(nr, nc);
                    if (board[nr][nc]) break;
                }
            }
            break;
        case 'K':
            for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
                addMove(r + dr, c + dc);
            }
            break;
    }

    return moves;
}

function getLegalMoves(board: Board, color: Color, enPassant: [number, number] | null): Move[] {
    const raw = getRawMoves(board, color, enPassant);
    return raw.filter(m => {
        const nb = applyMove(board, m, enPassant);
        return !isInCheck(nb, color);
    });
}

function applyMove(board: Board, move: Move, enPassant: [number, number] | null): Board {
    const nb = cloneBoard(board);
    const piece = nb[move.fr][move.fc];
    if (!piece) return nb;

    nb[move.tr][move.tc] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
    nb[move.fr][move.fc] = null;

    // En passant capture
    if (piece.type === 'P' && enPassant && move.tr === enPassant[0] && move.tc === enPassant[1]) {
        const captureRow = piece.color === 'w' ? move.tr + 1 : move.tr - 1;
        nb[captureRow][move.tc] = null;
    }

    return nb;
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

function aiMoveRandom(legalMoves: Move[]): Move {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
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

function aiMoveMinimax(board: Board, legalMoves: Move[], enPassant: [number, number] | null): Move {
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];
    for (const move of legalMoves) {
        const nb = applyMove(board, move, enPassant);
        const score = minimax(nb, 2, false, -Infinity, Infinity, null);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

// ─── COMPONENT ────────────────────────────────

export const ChessGame = ({ onComplete, onClose, canPlay }: ChessGameProps) => {
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
            switch (difficulty) {
                case 1: aiMove = aiMoveRandom(legal); break;
                case 2: aiMove = aiMoveGreedy(board, legal, enPassant); break;
                case 3: aiMove = aiMoveMinimax(board, legal, enPassant); break;
                default: aiMove = aiMoveRandom(legal);
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
                            onClick={() => onComplete(gameOver === 'resigned' ? 'loss' : gameOver, difficulty)}
                        >
                            Claim {getXP(gameOver)} Strategy XP
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
