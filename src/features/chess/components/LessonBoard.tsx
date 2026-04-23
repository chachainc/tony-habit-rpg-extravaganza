import React from 'react';
import { Chess } from 'chess.js';
import { PIECE_UNICODE } from '../../conquest/chessUtils';
import { ArrowLayer } from './ArrowLayer';
import './LessonComponents.css';

interface LessonBoardProps {
    chess: Chess;
    highlights: string[];
    currentArrow?: { from: string; to: string; side: 'white' | 'black' };
}

export const LessonBoard: React.FC<LessonBoardProps> = ({ chess, highlights, currentArrow }) => {
    // chess.board() returns an 8x8 array.
    // [0][0] is a8 (black rook starting), [7][7] is h1 (white rook starting).
    const boardArray = chess.board();

    // Map rows (0-7) to rank (8-1)
    return (
        <div className="lesson-board-container">
            <div className="lesson-board-grid">
                {boardArray.map((row, rIndex) => {
                    const rankStr = (8 - rIndex).toString();
                    return row.map((squareObj, cIndex) => {
                        const fileChar = String.fromCharCode(97 + cIndex); // 0=a, 1=b
                        const squareName = `${fileChar}${rankStr}`;
                        
                        const isDark = (rIndex + cIndex) % 2 !== 0;
                        const isHighlighted = highlights.includes(squareName);

                        let pieceChar = '';
                        let pieceColorClass = '';
                        if (squareObj) {
                            const key = squareObj.color + squareObj.type.toUpperCase();
                            pieceChar = PIECE_UNICODE[key] || '';
                            pieceColorClass = squareObj.color === 'w' ? 'chess-piece-white' : 'chess-piece-black';
                        }

                        return (
                            <div 
                                key={squareName}
                                className={`lesson-square ${isDark ? 'dark' : 'light'} ${isHighlighted ? 'highlight' : ''}`}
                            >
                                {pieceChar && <span className={pieceColorClass}>{pieceChar}</span>}
                            </div>
                        );
                    });
                })}
            </div>

            {currentArrow && (
                <ArrowLayer 
                    from={currentArrow.from} 
                    to={currentArrow.to} 
                    side={currentArrow.side} 
                />
            )}
        </div>
    );
};
