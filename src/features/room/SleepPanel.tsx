import { useMemo } from 'react';
import { Moon, Zap, X, Flame, Award, BarChart3, Calendar, FileText } from 'lucide-react';
import { useDayStore, type SleepLogEntry, type ReadinessLogEntry } from '../../store/useDayStore';
import { useJournalStore } from '../../store/useJournalStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Panel } from '../../components/ui/Panel';
import { LineChart } from '../health/components/LineChart';
import './RoomPanels.css';

const getWeeklyGrade = (avgScore: number): { grade: string; color: string; bonus: number } => {
    if (avgScore >= 90) return { grade: 'S', color: '#fbbf24', bonus: 5 };
    if (avgScore >= 80) return { grade: 'A', color: '#4ade80', bonus: 3 };
    if (avgScore >= 70) return { grade: 'B', color: '#60a5fa', bonus: 2 };
    if (avgScore >= 60) return { grade: 'C', color: '#f97316', bonus: 1 };
    return { grade: 'D', color: '#f87171', bonus: 0 };
};

export const SleepPanel = ({ onClose }: { onClose: () => void }) => {
    const { sleepLogs, readinessLogs } = useDayStore();
    const journalEntries = useJournalStore((s) => s.entries);
    const navigate = useNavigate();

    // ── Streak calculation ──
    const streak = useMemo(() => {
        if (sleepLogs.length === 0) return 0;
        const sorted = [...sleepLogs]
            .filter((l) => !l.skipped)
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

    const dreamshadeStreak = useMemo(() => {
        if (sleepLogs.length === 0) return 0;
        const sorted = [...sleepLogs]
            .filter((l) => !l.skipped)
            .sort((a, b) => b.date.localeCompare(a.date));
        let count = 0;
        const today = dayjs();
        for (let i = 0; i < sorted.length; i++) {
            const expected = today.subtract(i, 'day').format('YYYY-MM-DD');
            if (sorted[i]?.date === expected && sorted[i].score >= 80) count++;
            else break;
        }
        return count;
    }, [sleepLogs]);

    // ── Weekly average ──
    const weeklyAvgSleep = useMemo(() => {
        const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        const recent = sleepLogs.filter((l) => !l.skipped && l.date >= weekAgo);
        if (recent.length === 0) return 0;
        return Math.round(recent.reduce((sum, log) => sum + log.score, 0) / recent.length);
    }, [sleepLogs]);

    const weeklyAvgReadiness = useMemo(() => {
        const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        const recent = readinessLogs.filter((l) => !l.skipped && l.date >= weekAgo);
        if (recent.length === 0) return 0;
        return Math.round(recent.reduce((sum, log) => sum + log.score, 0) / recent.length);
    }, [readinessLogs]);

    const weekGrade = getWeeklyGrade(weeklyAvgSleep);

    // ── 30-Day Averages ──
    const monthlyAvgSleep = useMemo(() => {
        const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
        const recent = sleepLogs.filter((l) => !l.skipped && l.date >= monthAgo);
        if (recent.length === 0) return 0;
        return Math.round(recent.reduce((sum, log) => sum + log.score, 0) / recent.length);
    }, [sleepLogs]);

    const monthlyAvgReadiness = useMemo(() => {
        const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
        const recent = readinessLogs.filter((l) => !l.skipped && l.date >= monthAgo);
        if (recent.length === 0) return 0;
        return Math.round(recent.reduce((sum, log) => sum + log.score, 0) / recent.length);
    }, [readinessLogs]);

    const has30DayData = useMemo(() => {
        return sleepLogs.filter((l) => !l.skipped).length >= 10;
    }, [sleepLogs]);

    // ── Chart data points (last 7 logs) ──
    const sleepChartData = useMemo(() => {
        return [...sleepLogs]
            .filter((l) => !l.skipped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-7)
            .map((l) => ({ date: l.date, value: l.score }));
    }, [sleepLogs]);

    const readinessChartData = useMemo(() => {
        return [...readinessLogs]
            .filter((l) => !l.skipped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-7)
            .map((l) => ({ date: l.date, value: l.score }));
    }, [readinessLogs]);

    // ── History entries grouped by date ──
    const mergedHistory = useMemo(() => {
        const historyMap = new Map<string, { sleep?: SleepLogEntry; readiness?: ReadinessLogEntry; note?: string }>();
        sleepLogs.forEach((log) => historyMap.set(log.date, { sleep: log }));
        readinessLogs.forEach((log) => {
            const existing = historyMap.get(log.date) || {};
            historyMap.set(log.date, { ...existing, readiness: log });
        });

        // Resolve personal/morning notes from journal entries for corresponding dates
        journalEntries.forEach((entry) => {
            const dateStr = dayjs(entry.timestamp).format('YYYY-MM-DD');
            const existing = historyMap.get(dateStr);
            if (existing) {
                existing.note = entry.content;
            }
        });

        return Array.from(historyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [sleepLogs, readinessLogs, journalEntries]);

    return (
        <Panel variant="glass" className="room-panel sleep-panel">
            <div className="panel-header">
                <div>
                    <h2>🛏️ Rest & Readiness</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        Track your sleep and recovery trends
                    </p>
                </div>
                <button className="panel-close-btn" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
                    <X size={24} />
                </button>
            </div>

            <div className="panel-content-scrollable" style={{ marginTop: '1rem' }}>
                {/* ── Top Summary Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Streak</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Flame size={16} color="#ef4444" />
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{streak} Days</span>
                        </div>
                        {dreamshadeStreak > 0 && dreamshadeStreak < 20 && (
                            <span style={{ fontSize: '0.65rem', color: '#a78bfa' }}>Dreamshade: {dreamshadeStreak}/20</span>
                        )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Grade</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={16} color={weekGrade.color} />
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: weekGrade.color }}>Grade {weekGrade.grade}</span>
                        </div>
                        {weekGrade.bonus > 0 && (
                            <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>+{weekGrade.bonus} XP Bonus Active</span>
                        )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Sleep Score</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Moon size={16} color="#818cf8" />
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{weeklyAvgSleep}</span>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Readiness</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={16} color="#facc15" />
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{weeklyAvgReadiness}</span>
                        </div>
                    </div>
                </div>

                {/* ── Sleep & Readiness Analysis Hub Button ── */}
                <button
                    className="sleep-analysis-btn"
                    onClick={() => navigate('/health?tab=analysis')}
                    style={{
                        width: '100%', padding: '0.6rem', marginBottom: '1.25rem',
                        background: 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(250,204,21,0.08))',
                        border: '1px solid rgba(129,140,248,0.25)', borderRadius: '0.5rem',
                        color: '#818cf8', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}
                >
                    <BarChart3 size={16} /> 📊 Open Detailed Recovery Analysis
                </button>

                {/* ── Trends Graphs ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Moon size={14} color="#818cf8" /> Sleep Score Trend (Last 7 Logs)
                        </h4>
                        <div style={{ width: '100%', maxHeight: '150px' }}>
                            <LineChart data={sleepChartData} color="#818cf8" label="Sleep" />
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={14} color="#facc15" /> Readiness Score Trend (Last 7 Logs)
                        </h4>
                        <div style={{ width: '100%', maxHeight: '150px' }}>
                            <LineChart data={readinessChartData} color="#facc15" label="Readiness" />
                        </div>
                    </div>
                </div>

                {/* ── Comparison Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: has30DayData ? 'repeat(2, 1fr)' : '1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>7-Day Average</h5>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                            <div>💤 Sleep: <strong>{weeklyAvgSleep}</strong></div>
                            <div>⚡ Ready: <strong>{weeklyAvgReadiness}</strong></div>
                        </div>
                    </div>

                    {has30DayData && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>30-Day Trend</h5>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>💤 Sleep: <strong>{monthlyAvgSleep}</strong></div>
                                <div>⚡ Ready: <strong>{monthlyAvgReadiness}</strong></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── History List ── */}
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> History List
                    </h4>

                    <div className="sleep-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {mergedHistory.length === 0 ? (
                            <div className="empty-msg" style={{ padding: '2rem 0', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                No recovery logs available yet. Complete your morning check-in to see logs here.
                            </div>
                        ) : (
                            mergedHistory.map((entry) => (
                                <div key={entry.date} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                            {dayjs(entry.date).format('MMM Do, YYYY')}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                            {entry.sleep?.skipped ? 'Skipped' : `+${(entry.sleep?.xpEarned ?? 0) + (entry.readiness?.xpEarned ?? 0)} XP`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem' }}>
                                        {entry.sleep?.skipped ? (
                                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>No tracking logged for today</span>
                                        ) : (
                                            <>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>
                                                    <Moon size={14} /> Sleep: <strong>{entry.sleep?.score ?? '—'}</strong>
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#facc15' }}>
                                                    <Zap size={14} /> Readiness: <strong>{entry.readiness?.score ?? '—'}</strong>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {entry.note && (
                                        <div style={{ marginTop: '2px', background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid rgba(129,140,248,0.5)', padding: '0.4rem 0.6rem', borderRadius: '0 4px 4px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                            <FileText size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#818cf8' }} />
                                            <span>{entry.note}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
};
