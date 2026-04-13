import { useMemo } from 'react';
import { useGymStore, getLocalDateString } from '../../store/useGymStore';
import { LineChart } from './components/LineChart';

export const WorkoutTrends = () => {
    const { exercises } = useGymStore();

    const chartData = useMemo(() => {
        const cutoffDate = getLocalDateString(new Date(Date.now() - 29 * 86400000));
        const history30 = exercises.filter(ex => ex.date >= cutoffDate);
        // We need data points per day for the last 30 days
        const daysMap: Record<string, { cardioCount: number; strengthCount: number; cardioDuration: number }> = {};
        
        // Zero-fill 30 days
        for (let i = 29; i >= 0; i--) {
            const d = getLocalDateString(new Date(Date.now() - i * 86400000));
            daysMap[d] = { cardioCount: 0, strengthCount: 0, cardioDuration: 0 };
        }

        history30.forEach(ex => {
            if (daysMap[ex.date]) {
                if (ex.workoutType === 'cardio') {
                    daysMap[ex.date].cardioCount += 1;
                    if (ex.durationSeconds) {
                        daysMap[ex.date].cardioDuration += ex.durationSeconds;
                    }
                } else {
                    daysMap[ex.date].strengthCount += 1;
                }
            }
        });

        // Generate line chart compatible arrays
        const totalSessionsData: { date: string, value: number }[] = [];
        const cardioDurationData: { date: string, value: number }[] = [];

        Object.keys(daysMap).sort((a,b) => a.localeCompare(b)).forEach(date => {
            const day = daysMap[date];
            // Treat any multiple strength exercises on a single day as 1 strength session for charting, 
            // and any multiple cardio exercises as their respective counts.
            const hasStrength = day.strengthCount > 0 ? 1 : 0;
            totalSessionsData.push({ date, value: hasStrength + day.cardioCount });
            cardioDurationData.push({ date, value: Math.round(day.cardioDuration / 60) }); // in mins
        });

        return { totalSessionsData, cardioDurationData };
    }, [exercises]);

    return (
        <section className="health-section">
            <h3 className="health-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-strong)' }}>
                🏋️ Workout Analysis (30 Days)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Sessions (Cardio + Strength)</h4>
                    <LineChart data={chartData.totalSessionsData} color="#ef4444" label="Sessions" />
                </div>
                
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cardio Duration (Minutes)</h4>
                    <LineChart data={chartData.cardioDurationData} color="#3b82f6" label="Duration" />
                </div>
            </div>
        </section>
    );
};
