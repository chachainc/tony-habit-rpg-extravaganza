export type Color = 'w' | 'b';
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Piece = { type: PieceType; color: Color } | null;
export type Board = Piece[][];

export const PIECE_UNICODE: Record<string, string> = {
    'wK': '♚\uFE0E', 'wQ': '♛\uFE0E', 'wR': '♜\uFE0E', 'wB': '♝\uFE0E', 'wN': '♞\uFE0E', 'wP': '♟\uFE0E',
    'bK': '♚\uFE0E', 'bQ': '♛\uFE0E', 'bR': '♜\uFE0E', 'bB': '♝\uFE0E', 'bN': '♞\uFE0E', 'bP': '♟\uFE0E',
};

export const PIECE_VALUES: Record<PieceType, number> = {
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900,
};

export function createInitialBoard(): Board {
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

export function parseFen(fen: string): Board {
    const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    const [placement] = fen.split(' ');
    const rows = placement.split('/');
    
    for (let r = 0; r < 8; r++) {
        let c = 0;
        for (const char of rows[r]) {
            if (/\d/.test(char)) {
                c += parseInt(char, 10);
            } else {
                const color: Color = char === char.toUpperCase() ? 'w' : 'b';
                const type = char.toUpperCase() as PieceType;
                board[r][c] = { type, color };
                c++;
            }
        }
    }
    return board;
}

export function cloneBoard(board: Board): Board {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function inBounds(r: number, c: number): boolean {
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

export function isInCheck(board: Board, color: Color): boolean {
    const [kr, kc] = findKing(board, color);
    if (kr === -1) return false;
    const opp = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kr, kc, opp);
}

export interface Move { fr: number; fc: number; tr: number; tc: number; promotion?: PieceType; }

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
            if (inBounds(r + dir, c) && !board[r + dir][c]) {
                addMove(r + dir, c);
                if (r === startRow && !board[r + dir * 2][c]) {
                    addMove(r + dir * 2, c);
                }
            }
            for (const dc of [-1, 1]) {
                if (inBounds(r + dir, c + dc)) {
                    const target = board[r + dir][c + dc];
                    if (target && target.color !== color) addMove(r + dir, c + dc);
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

export function getLegalMoves(board: Board, color: Color, enPassant: [number, number] | null): Move[] {
    const raw = getRawMoves(board, color, enPassant);
    return raw.filter(m => {
        const nb = applyMove(board, m, enPassant);
        return !isInCheck(nb, color);
    });
}

export function applyMove(board: Board, move: Move, enPassant: [number, number] | null): Board {
    const nb = cloneBoard(board);
    const piece = nb[move.fr][move.fc];
    if (!piece) return nb;

    nb[move.tr][move.tc] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
    nb[move.fr][move.fc] = null;

    if (piece.type === 'P' && enPassant && move.tr === enPassant[0] && move.tc === enPassant[1]) {
        const captureRow = piece.color === 'w' ? move.tr + 1 : move.tr - 1;
        nb[captureRow][move.tc] = null;
    }

    return nb;
}
