import React from 'react';
import './LessonComponents.css';

interface ArrowLayerProps {
    from: string;
    to: string;
    side: 'white' | 'black'; // Whose turn it was to color the arrow
}

export const ArrowLayer: React.FC<ArrowLayerProps> = ({ from, to, side }) => {
    if (!from || !to) return null;

    const getCoords = (square: string) => {
        const file = square.charCodeAt(0) - 97; // a -> 0
        const rank = 8 - parseInt(square[1]);     // 8 -> 0
        return {
            x: (file + 0.5) * 12.5,
            y: (rank + 0.5) * 12.5
        };
    };

    const start = getCoords(from);
    const end = getCoords(to);

    const color = side === 'white' ? '#22d3ee' : '#fb923c'; // cyan vs orange

    // Calculate arrowhead points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    // Slight pullback so arrow head doesn't completely cover the piece
    const pullback = 2; // percentage
    const adjEndX = end.x - Math.cos(angle) * pullback;
    const adjEndY = end.y - Math.sin(angle) * pullback;

    return (
        <svg className="lesson-arrow-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <marker id={`arrowhead-${side}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill={color} />
                </marker>
            </defs>
            <line
                className="arrow-path"
                x1={`${start.x}%`}
                y1={`${start.y}%`}
                x2={`${adjEndX}%`}
                y2={`${adjEndY}%`}
                stroke={color}
                strokeWidth="2"
                markerEnd={`url(#arrowhead-${side})`}
            />
        </svg>
    );
};
