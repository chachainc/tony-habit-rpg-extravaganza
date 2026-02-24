import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Scale, Utensils, TrendingUp, TrendingDown, Minus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHealthStore, getDateLabel } from '../../store/useHealthStore';
import './HealthTracker.css';

type Tab = 'weight' | 'food';
type ChartRange = 7 | 30 | 90;

// ── Simple SVG Line Chart ──────────────────────────────────────

const WeightChart = ({ days }: { days: number }) => {
    const history = useHealthStore((s) => s.getWeightHistory(days));

    if (history.length < 2) {
        return <div className="chart-empty">Need at least 2 entries to show a chart</div>;
    }

    const weights = history.map((e) => e.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;

    const W = 100;
    const H = 100;
    const padX = 8;
    const padY = 10;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    const points = history.map((entry, i) => {
        const x = padX + (i / (history.length - 1)) * plotW;
        const y = padY + plotH - ((entry.weight - minW) / range) * plotH;
        return { x, y, entry };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;

    return (
        <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padY + plotH - frac * plotH;
                const val = minW + frac * range;
                return (
                    <g key={frac}>
                        <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="0.3" />
                        <text x={padX - 1} y={y + 1} fill="#475569" fontSize="3" textAnchor="end">{Math.round(val)}</text>
                    </g>
                );
            })}
            {/* Area fill */}
            <path d={areaD} fill="url(#weightGradient)" opacity="0.3" />
            {/* Line */}
            <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#60a5fa" stroke="#0f172a" strokeWidth="0.5" />
            ))}
            <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                </linearGradient>
            </defs>
        </svg>
    );
};

// ── Macro Pie Chart ────────────────────────────────────────────

const MacroPie = ({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) => {
    const total = protein + carbs + fat;
    if (total === 0) return null;

    const r = 40;
    const cx = 50;
    const cy = 50;

    const segments = [
        { value: protein, color: '#f87171', label: 'Protein' },
        { value: carbs, color: '#60a5fa', label: 'Carbs' },
        { value: fat, color: '#fb923c', label: 'Fat' },
    ];

    let acc = 0;
    const paths = segments.map((seg) => {
        const frac = seg.value / total;
        const startAngle = acc * 2 * Math.PI - Math.PI / 2;
        acc += frac;
        const endAngle = acc * 2 * Math.PI - Math.PI / 2;
        const large = frac > 0.5 ? 1 : 0;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, frac };
    });

    return (
        <div className="macro-pie-wrapper">
            <svg width="120" height="120" viewBox="0 0 100 100">
                {paths.map((p) => (
                    <path key={p.label} d={p.d} fill={p.color} opacity="0.85" />
                ))}
            </svg>
            <div className="macro-legend">
                {paths.map((p) => (
                    <div key={p.label} className="macro-legend-item">
                        <div className="macro-legend-dot" style={{ backgroundColor: p.color }} />
                        <span>{p.label}: {p.value}g ({Math.round(p.frac * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────

export const HealthTracker = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('weight');
    const [chartRange, setChartRange] = useState<ChartRange>(30);

    // Weight form
    const [weightInput, setWeightInput] = useState('');
    const [weightSaved, setWeightSaved] = useState(false);

    // Food form
    const [foodTracked, setFoodTracked] = useState<boolean | null>(null);
    const [calories, setCalories] = useState('');
    const [fiber, setFiber] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [foodSaved, setFoodSaved] = useState(false);

    const {
        logWeight, logFood,
        getWeightTrend, getLastWeight,
        hasLoggedWeightToday, hasLoggedFoodToday,
        getWeightHistory, getFoodHistory,
    } = useHealthStore();

    const trend = useMemo(() => getWeightTrend(), [getWeightTrend]);
    const lastWeight = getLastWeight();
    const weightHistory = useMemo(() => getWeightHistory(90), [getWeightHistory]);
    const foodHistory = useMemo(() => getFoodHistory(90), [getFoodHistory]);

    // Latest food entry for pie
    const latestTracked = useMemo(() => {
        const tracked = foodHistory.filter((f) => f.tracked && f.protein && f.carbs && f.fat);
        return tracked.length > 0 ? tracked[tracked.length - 1] : null;
    }, [foodHistory]);

    const handleLogWeight = () => {
        const w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) return;
        logWeight(w);
        setWeightSaved(true);
        setWeightInput('');
        setTimeout(() => setWeightSaved(false), 2000);
    };

    const handleLogFood = () => {
        logFood({
            tracked: foodTracked === true,
            calories: calories ? parseFloat(calories) : undefined,
            fiber: fiber ? parseFloat(fiber) : undefined,
            protein: protein ? parseFloat(protein) : undefined,
            carbs: carbs ? parseFloat(carbs) : undefined,
            fat: fat ? parseFloat(fat) : undefined,
        });
        setFoodSaved(true);
        setCalories('');
        setFiber('');
        setProtein('');
        setCarbs('');
        setFat('');
        setFoodTracked(null);
        setTimeout(() => setFoodSaved(false), 2000);
    };

    const handleFoodNotTracked = () => {
        logFood({ tracked: false });
        setFoodSaved(true);
        setTimeout(() => setFoodSaved(false), 2000);
    };

    const trendIcon = trend.direction === 'up' ? <TrendingUp size={16} /> : trend.direction === 'down' ? <TrendingDown size={16} /> : <Minus size={16} />;
    const trendClass = trend.direction === 'up' ? 'trend-up' : trend.direction === 'down' ? 'trend-down' : 'trend-stable';

    return (
        <div className="health-tracker">
            <div className="health-header">
                <button className="health-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="health-header__title">
                    <Heart size={24} />
                    <h2>Health Tracker</h2>
                </div>
            </div>
            <p className="health-subtitle">Track your weight and nutrition daily</p>

            {/* Tabs */}
            <div className="health-tabs">
                <button className={`health-tab ${tab === 'weight' ? 'active' : ''}`} onClick={() => setTab('weight')}>
                    <Scale size={16} /> Weight
                </button>
                <button className={`health-tab ${tab === 'food' ? 'active' : ''}`} onClick={() => setTab('food')}>
                    <Utensils size={16} /> Food Log
                </button>
            </div>

            <AnimatePresence mode="wait">
                {tab === 'weight' && (
                    <motion.div key="weight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {/* Summary */}
                        <div className="health-summary">
                            <div className="summary-card">
                                <span className={`summary-card__value ${trendClass}`}>
                                    {lastWeight ? `${lastWeight} lbs` : '—'}
                                </span>
                                <span className="summary-card__label">Current Weight</span>
                            </div>
                            <div className="summary-card">
                                <span className={`summary-card__value ${trendClass}`}>
                                    {trendIcon} {trend.netChange7d !== null ? `${trend.netChange7d > 0 ? '+' : ''}${trend.netChange7d}` : '—'}
                                </span>
                                <span className="summary-card__label">7-Day Change</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-card__value">{trend.avg7d ?? '—'}</span>
                                <span className="summary-card__label">7-Day Avg</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-card__value">{trend.avg30d ?? '—'}</span>
                                <span className="summary-card__label">30-Day Avg</span>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="health-chart-container">
                            <div className="chart-header">
                                <h3>Weight Trend</h3>
                                <div className="chart-range-btns">
                                    {([7, 30, 90] as ChartRange[]).map((d) => (
                                        <button key={d} className={`chart-range-btn ${chartRange === d ? 'active' : ''}`} onClick={() => setChartRange(d)}>
                                            {d}d
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <WeightChart days={chartRange} />
                        </div>

                        {/* Log Form */}
                        {!hasLoggedWeightToday() && !weightSaved && (
                            <div className="health-log-form">
                                <h3>⚖️ Log Today's Weight</h3>
                                <div className="form-row">
                                    <label>Weight</label>
                                    <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder={lastWeight ? `${lastWeight}` : '180'} step="0.1" min="50" max="500" />
                                    <span className="form-unit">lbs</span>
                                </div>
                                <button className="log-submit-btn" onClick={handleLogWeight} disabled={!weightInput}>
                                    <Check size={18} /> Log Weight
                                </button>
                            </div>
                        )}
                        {weightSaved && (
                            <motion.div className="log-success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                ✅ Weight logged!
                            </motion.div>
                        )}

                        {/* History */}
                        <div className="health-history">
                            <h3>📋 History</h3>
                            {weightHistory.length === 0 ? (
                                <div className="history-empty">No weight entries yet. Start logging!</div>
                            ) : (
                                [...weightHistory].reverse().map((entry) => (
                                    <div key={entry.date} className="history-entry">
                                        <span className="history-date">{getDateLabel(entry.date)}</span>
                                        <span className="history-value">{entry.weight} lbs</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {tab === 'food' && (
                    <motion.div key="food" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        {/* Macro Pie from latest tracked entry */}
                        {latestTracked && (
                            <div className="macro-chart-container">
                                <h3>Latest Macro Breakdown</h3>
                                <MacroPie protein={latestTracked.protein!} carbs={latestTracked.carbs!} fat={latestTracked.fat!} />
                            </div>
                        )}

                        {/* Calorie trend chart */}
                        <div className="health-summary">
                            {latestTracked && (
                                <>
                                    <div className="summary-card">
                                        <span className="summary-card__value">{latestTracked.calories ?? '—'}</span>
                                        <span className="summary-card__label">Last Calories</span>
                                    </div>
                                    <div className="summary-card">
                                        <span className="summary-card__value">{latestTracked.fiber ?? '—'}g</span>
                                        <span className="summary-card__label">Last Fiber</span>
                                    </div>
                                </>
                            )}
                            <div className="summary-card">
                                <span className="summary-card__value">{foodHistory.filter((f) => f.tracked).length}</span>
                                <span className="summary-card__label">Days Tracked</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-card__value">
                                    {foodHistory.length > 0 ? `${Math.round((foodHistory.filter((f) => f.tracked).length / foodHistory.length) * 100)}%` : '—'}
                                </span>
                                <span className="summary-card__label">Compliance</span>
                            </div>
                        </div>

                        {/* Log Form */}
                        {!hasLoggedFoodToday() && !foodSaved && (
                            <div className="health-log-form">
                                <h3>🍽️ End-of-Day Food Log</h3>
                                {foodTracked === null && (
                                    <div className="food-track-question">
                                        <p>Did you track your macros today?</p>
                                        <div className="food-track-btns">
                                            <button className="food-track-btn food-track-btn--yes" onClick={() => setFoodTracked(true)}>
                                                ✅ Yes
                                            </button>
                                            <button className="food-track-btn food-track-btn--no" onClick={handleFoodNotTracked}>
                                                ❌ No
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {foodTracked === true && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className="form-row">
                                            <label>Calories</label>
                                            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="2000" min="0" max="10000" />
                                            <span className="form-unit">kcal</span>
                                        </div>
                                        <div className="form-row">
                                            <label>Protein</label>
                                            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="150" min="0" max="1000" />
                                            <span className="form-unit">g</span>
                                        </div>
                                        <div className="form-row">
                                            <label>Carbs</label>
                                            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="200" min="0" max="1000" />
                                            <span className="form-unit">g</span>
                                        </div>
                                        <div className="form-row">
                                            <label>Fat</label>
                                            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="65" min="0" max="500" />
                                            <span className="form-unit">g</span>
                                        </div>
                                        <div className="form-row">
                                            <label>Fiber</label>
                                            <input type="number" value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="30" min="0" max="200" />
                                            <span className="form-unit">g</span>
                                        </div>
                                        <button className="log-submit-btn" onClick={handleLogFood}>
                                            <Check size={18} /> Log Food
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        )}
                        {foodSaved && (
                            <motion.div className="log-success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                ✅ Food log saved!
                            </motion.div>
                        )}

                        {/* History */}
                        <div className="health-history">
                            <h3>📋 History</h3>
                            {foodHistory.length === 0 ? (
                                <div className="history-empty">No food entries yet. Start logging!</div>
                            ) : (
                                [...foodHistory].reverse().map((entry) => (
                                    <div key={entry.date} className="history-entry">
                                        <span className="history-date">{getDateLabel(entry.date)}</span>
                                        {entry.tracked ? (
                                            <div className="history-macros">
                                                {entry.calories && <span className="history-macro-tag cal">{entry.calories} kcal</span>}
                                                {entry.protein && <span className="history-macro-tag protein">P: {entry.protein}g</span>}
                                                {entry.carbs && <span className="history-macro-tag carbs">C: {entry.carbs}g</span>}
                                                {entry.fat && <span className="history-macro-tag fat">F: {entry.fat}g</span>}
                                                {entry.fiber && <span className="history-macro-tag fiber">Fib: {entry.fiber}g</span>}
                                            </div>
                                        ) : (
                                            <span className="history-not-tracked">Not tracked</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
