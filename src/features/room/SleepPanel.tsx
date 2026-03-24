import { useState, useMemo } from 'react';
import { Moon, Zap, X, History, Plus, BarChart3, Flame, Award } from 'lucide-react';
import { useDayStore, type SleepLogEntry, type ReadinessLogEntry } from '../../store/useDayStore';
import { useGameStore } from '../../store/useGameStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

const getWeeklyGrade = (avgScore: number): { grade: string; color: string; bonus: number } => {
    if (avgScore >= 90) return { grade: 'S', color: '#fbbf24', bonus: 5 };
    if (avgScore >= 80) return { grade: 'A', color: '#4ade80', bonus: 3 };
    if (avgScore >= 70) return { grade: 'B', color: '#60a5fa', bonus: 2 };
    if (avgScore >= 60) return { grade: 'C', color: '#f97316', bonus: 1 };
    return { grade: 'D', color: '#f87171', bonus: 0 };
};

export const SleepPanel = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
    const { sleepLogs, readinessLogs, logSleep, logReadiness } = useDayStore();
    const { addSkillXp, addGlobalXp } = useGameStore();
    const navigate = useNavigate();
    const [sleepScore, setSleepScore] = useState(75);
    const [durationMinutes, setDurationMinutes] = useState(480);
    const [readinessScore, setReadinessScore] = useState(75);

    // ── Streak calculation ──
    const streak = useMemo(() => {
        if (sleepLogs.length === 0) return 0;
        const sorted = [...sleepLogs]
            .filter(l => !l.skipped)
            .sort((a, b) => b.date.localeCompare(a.date));
        let count = 0;
        const today = dayjs();
        for (let i = 0; i < sorted.length; i++) {
            const expected = today.subtract(i, 'day').format('YYYY-MM-DD');
            if (sorted[i]?.date === expected) count++;
            else break;
        }
        return count;
    }, [sleepLogs]);

    // ── Weekly average ──
    const weeklyAvg = useMemo(() => {
        const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        const recent = sleepLogs.filter(l => !l.skipped && l.date >= weekAgo);
        if (recent.length === 0) return 0;
        return Math.round(recent.reduce((s, l) => s + l.score, 0) / recent.length);
    }, [sleepLogs]);

    const weekGrade = getWeeklyGrade(weeklyAvg);

    const handleLogSleep = (e: React.FormEvent) => {
        e.preventDefault();
        const xp = logSleep(sleepScore, durationMinutes);
        if (xp > 0) {
            addSkillXp('Sleep', xp, { capExempt: true });
            addGlobalXp(Math.floor(xp * 0.2));
        }
        setActiveTab('history');
    };

    const handleLogReadiness = (e: React.FormEvent) => {
        e.preventDefault();
        const xp = logReadiness(readinessScore);
        if (xp > 0) {
            addSkillXp('Sleep', xp, { capExempt: true });
            addGlobalXp(Math.floor(xp * 0.2));
        }
        setActiveTab('history');
    };

    const mergedHistory = useMemo(() => {
        const historyMap = new Map<string, { sleep?: SleepLogEntry, readiness?: ReadinessLogEntry }>();
        sleepLogs.forEach((log) => historyMap.set(log.date, { sleep: log }));
        readinessLogs.forEach((log) => {
            const existing = historyMap.get(log.date) || {};
            historyMap.set(log.date, { ...existing, readiness: log });
        });
        return Array.from(historyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [sleepLogs, readinessLogs]);

    return (
        <Panel variant="glass" className="room-panel sleep-panel">
            <div className="panel-header">
                <h2>🛏️ Rest & Readiness</h2>
                <button className="panel-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <p className="panel-subtitle">Log your recovery to earn Sleep XP</p>

            {/* ── Streak + Weekly Grade Bar ── */}
            <div className="sleep-stats-strip">
                <div className="sleep-stat-chip">
                    <Flame size={14} className="streak-icon" />
                    <span>{streak} day streak</span>
                </div>
                <div className="sleep-stat-chip">
                    <Award size={14} />
                    <span>Weekly Avg: {weeklyAvg}</span>
                </div>
                <div className="sleep-stat-chip sleep-stat-chip--grade" style={{ borderColor: weekGrade.color, color: weekGrade.color }}>
                    Grade {weekGrade.grade}
                    {weekGrade.bonus > 0 && <small> (+{weekGrade.bonus} XP)</small>}
                </div>
            </div>

            <button
                className="sleep-analysis-btn"
                onClick={() => navigate('/health?tab=analysis')}
                style={{
                    width: '100%', padding: '0.6rem', marginBottom: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(250,204,21,0.08))',
                    border: '1px solid rgba(129,140,248,0.25)', borderRadius: '0.5rem',
                    color: '#818cf8', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
            >
                <BarChart3 size={16} /> 📊 View Sleep & Readiness Analysis
            </button>

            <div className="panel-tabs">
                <button className={`panel-tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
                    <Plus size={16} /> Log
                </button>
                <button className={`panel-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    <History size={16} /> History
                </button>
            </div>

            <div className="panel-content-scrollable">
                {activeTab === 'log' ? (
                    <div className="log-forms-container">
                        <form className="log-form sleep-log-form" onSubmit={handleLogSleep}>
                            <div className="form-section-header">
                                <Moon size={20} className="text-indigo-400" />
                                <h3>Log Sleep</h3>
                            </div>
                            <div className="form-group">
                                <label>Sleep Score (0-100)</label>
                                <div className="slider-row">
                                    <input type="range" min="0" max="100" value={sleepScore} onChange={(e) => setSleepScore(Number(e.target.value))} />
                                    <span className="score-badge">{sleepScore}</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Duration (Minutes)</label>
                                <input type="number" min="0" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
                                <small className="duration-hint">({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)</small>
                            </div>
                            <button type="submit" className="submit-btn full-width bg-indigo-600 hover:bg-indigo-700">Save Sleep Log</button>
                        </form>
                        <div className="form-divider" />
                        <form className="log-form readiness-log-form" onSubmit={handleLogReadiness}>
                            <div className="form-section-header">
                                <Zap size={20} className="text-yellow-400" />
                                <h3>Log Readiness</h3>
                            </div>
                            <div className="form-group">
                                <label>Daily Readiness Score (0-100)</label>
                                <div className="slider-row">
                                    <input type="range" min="0" max="100" value={readinessScore} onChange={(e) => setReadinessScore(Number(e.target.value))} />
                                    <span className="score-badge">{readinessScore}</span>
                                </div>
                            </div>
                            <button type="submit" className="submit-btn full-width bg-yellow-600 hover:bg-yellow-700">Save Readiness Log</button>
                        </form>
                    </div>
                ) : (
                    <div className="sleep-history-list">
                        {mergedHistory.length === 0 ? (
                            <div className="empty-msg">No logs yet.</div>
                        ) : (
                            mergedHistory.map((entry) => (
                                <div key={entry.date} className="history-day-card">
                                    <div className="history-date">
                                        {dayjs(entry.date).format('MMM Do, YYYY')}
                                    </div>
                                    <div className="history-metrics">
                                        {entry.sleep?.skipped ? (
                                            <div className="metric skipped-metric" style={{ fontStyle: 'italic', color: '#94a3b8' }}>Skipped tracking</div>
                                        ) : (
                                            <>
                                                <div className="metric sleep-metric">
                                                    <Moon size={16} />
                                                    <span>Sleep: </span>
                                                    <strong>{entry.sleep?.score ?? '—'}</strong>
                                                </div>
                                                <div className="metric readiness-metric">
                                                    <Zap size={16} />
                                                    <span>Read: </span>
                                                    <strong>{entry.readiness?.score ?? '—'}</strong>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
};
