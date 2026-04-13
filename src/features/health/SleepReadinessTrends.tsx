import { useState, useMemo } from 'react';
import { useDayStore } from '../../store/useDayStore';
import { LineChart } from './components/LineChart';

type ChartRange = 7 | 30 | 90;

export const SleepReadinessTrends = () => {
    const { sleepLogs, readinessLogs } = useDayStore();
    const [range, setRange] = useState<ChartRange>(30);

    const sleepChartData = useMemo(() => {
        return [...sleepLogs]
            .filter(l => !l.skipped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-range)
            .map(l => ({ date: l.date, value: l.score }));
    }, [sleepLogs, range]);

    const readinessChartData = useMemo(() => {
        return [...readinessLogs]
            .filter(l => !l.skipped)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-range)
            .map(l => ({ date: l.date, value: l.score }));
    }, [readinessLogs, range]);

    return (
        <section className="health-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="health-section__title" style={{ margin: 0, color: 'var(--text-strong)' }}>
                    😴 Recovery Trends
                </h3>
                <div className="chart-range-btns" style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '2px', borderRadius: '8px' }}>
                    {([7, 30, 90] as ChartRange[]).map((d) => (
                        <button 
                            key={d} 
                            onClick={() => setRange(d)}
                            style={{
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: range === d ? 'var(--text-strong)' : 'transparent',
                                color: range === d ? 'var(--bg-dark)' : 'var(--text-muted)',
                                fontWeight: range === d ? 700 : 500,
                                cursor: 'pointer'
                            }}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Sleep Score</h4>
                    <LineChart data={sleepChartData} color="#818cf8" label="Sleep" />
                </div>
                
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Readiness Score</h4>
                    <LineChart data={readinessChartData} color="#facc15" label="Readiness" />
                </div>
            </div>
        </section>
    );
};
