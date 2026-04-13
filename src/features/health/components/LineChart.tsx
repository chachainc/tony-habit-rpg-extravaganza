import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const formatShortDate = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    return d;
};

interface ChartDataPoint {
    date: string;
    value: number;
}

interface LineChartProps {
    data: ChartDataPoint[];
    color: string;
    label: string;
}

export const LineChart: React.FC<LineChartProps> = ({ data, color, label }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (data.length < 2) {
        return (
            <div className="chart-empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Need at least 2 entries for {label} chart
            </div>
        );
    }

    const values = data.map((e) => e.value);
    const minV = Math.min(...values) - 2;
    const maxV = Math.max(...values) + 2;
    const range = maxV - minV || 1;

    const W = 300;
    const H = 140;
    const padX = 14;
    const padYTop = 8;
    const padYBottom = 22;
    const plotW = W - padX * 2;
    const plotH = H - padYTop - padYBottom;

    const points = data.map((entry, i) => {
        const x = padX + (i / (data.length - 1)) * plotW;
        const y = padYTop + plotH - ((entry.value - minV) / range) * plotH;
        return { x, y, entry, index: i };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${padYTop + plotH} L ${points[0].x} ${padYTop + plotH} Z`;
    const gradientId = `gradient-${label.replace(/\s/g, '')}`;

    let labelStep = 1;
    if (data.length > 60) labelStep = Math.ceil(data.length / 4);
    else if (data.length > 20) labelStep = Math.ceil(data.length / 5);
    else if (data.length > 10) labelStep = Math.ceil(data.length / 5);

    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    return (
        <div className="line-chart-wrapper" onMouseLeave={() => setActiveIndex(null)} style={{ position: 'relative', width: '100%', aspectRatio: '2', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div className="chart-summary-badge" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 2 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1 }}>{avg}</span>
            </div>

            <AnimatePresence>
                {activeIndex !== null && points[activeIndex] && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="chart-tooltip"
                        style={{
                            position: 'absolute',
                            top: 12,
                            left: `${Math.max(10, Math.min(90, (points[activeIndex].x / W) * 100))}%`,
                            transform: 'translateX(-50%)',
                            background: 'rgba(15, 23, 42, 0.9)',
                            backdropFilter: 'blur(8px)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>{formatShortDate(points[activeIndex].entry.date)}</div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                            {label}: <strong>{points[activeIndex].entry.value}</strong>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <svg style={{ width: '100%', height: '100%', display: 'block' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0, 0.5, 1].map((frac) => {
                    const y = padYTop + plotH - frac * plotH;
                    const val = minV + frac * range;
                    return (
                        <g key={frac}>
                            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" />
                            <text x={padX - 2} y={y + 1.5} fill="rgba(148,163,184,0.35)" fontSize="4" fontWeight="500" textAnchor="end">{Math.round(val)}</text>
                        </g>
                    );
                })}

                {points.map((p, i) => {
                    const isLast = i === points.length - 1;
                    const isFirst = i === 0;
                    const showLabel = i % labelStep === 0 || isLast;
                    
                    if (isLast && !isFirst && i % labelStep !== 0) {
                        const distFromLastStep = i - (i - (i % labelStep));
                        if (distFromLastStep < labelStep * 0.5) return null;
                    }
                    if (!showLabel && !isFirst) return null;

                    return (
                        <text key={`x-${i}`} x={p.x} y={H - 4} fill="rgba(148,163,184,0.5)" fontSize="4.5" fontWeight="500" textAnchor="middle">
                            {formatShortDate(p.entry.date)}
                        </text>
                    );
                })}

                <path d={areaD} fill={`url(#${gradientId})`} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                
                {points.map((p, i) => {
                    const isActive = activeIndex === i;
                    const rectWidth = (plotW / (data.length - 1)) || 20;
                    const rectX = Math.max(0, p.x - rectWidth / 2);

                    return (
                        <g key={i}>
                            <circle 
                                cx={p.x} cy={p.y} 
                                r={isActive ? "2.5" : "1"} 
                                fill={isActive ? "#ffffff" : color} 
                                stroke={isActive ? color : "transparent"} 
                                strokeWidth={isActive ? "1" : "0"} 
                                style={{ transition: 'all 0.2s ease' }}
                            />
                            <rect 
                                x={rectX} y={0} width={rectWidth} height={H} 
                                fill="transparent"
                                onTouchStart={() => setActiveIndex(i)}
                                onMouseEnter={() => setActiveIndex(i)}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
