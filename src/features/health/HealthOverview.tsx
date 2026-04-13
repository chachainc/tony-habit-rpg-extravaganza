import { useMemo } from 'react';
import { useGymStore, getLocalDateString } from '../../store/useGymStore';
import { useDayStore, SleepLogEntry, ReadinessLogEntry } from '../../store/useDayStore';

export const HealthOverview = () => {
    const { getExerciseHistory } = useGymStore();
    const { sleepLogs, readinessLogs } = useDayStore();

    // Workouts this week (last 7 days including today)
    const workoutsThisWeek = useMemo(() => {
        const history = getExerciseHistory(7);
        // group by date to count unique sessions, or just count logic:
        // Actually, history gives all exercises. We can group properties by Date to find unique sessions.
        const sessions = new Set<string>();
        let cardioCount = 0;
        let totalCount = 0;

        history.forEach(ex => {
            sessions.add(ex.date);
            if (ex.workoutType === 'cardio') {
                cardioCount++;
            }
        });

        // Since a "workout session" might just be counted as days with at least one exercise:
        totalCount = sessions.size;

        // However, "Cardio sessions this week" might be exact rows if they did multiple separate.
        // Let's just use the raw count or just number of unique combinations.
        return { total: totalCount, cardio: cardioCount };
    }, [getExerciseHistory]);

    // Average sleep/readiness (7d)
    const averages = useMemo(() => {
        const cutoffDate = getLocalDateString(new Date(Date.now() - 7 * 86400000));
        
        const validSleep = sleepLogs.filter(l => !l.skipped && l.date >= cutoffDate);
        const avgSleep = validSleep.length > 0 
            ? Math.round(validSleep.reduce((sum, l) => sum + l.score, 0) / validSleep.length) 
            : null;

        const validReady = readinessLogs.filter(l => !l.skipped && l.date >= cutoffDate);
        const avgReady = validReady.length > 0 
            ? Math.round(validReady.reduce((sum, l) => sum + l.score, 0) / validReady.length) 
            : null;

        return { sleep: avgSleep, readiness: avgReady };
    }, [sleepLogs, readinessLogs]);

    return (
        <section className="health-section">
            <h3 className="health-section__title">Overview (7 Days)</h3>
            <div className="health-summary">
                <div className="summary-card">
                    <span className="summary-card__value">{workoutsThisWeek.total}</span>
                    <span className="summary-card__label">Workouts</span>
                </div>
                <div className="summary-card">
                    <span className="summary-card__value">{workoutsThisWeek.cardio}</span>
                    <span className="summary-card__label">Cardio</span>
                </div>
                <div className="summary-card">
                    <span className="summary-card__value">{averages.sleep ?? '—'}</span>
                    <span className="summary-card__label">Avg Sleep</span>
                </div>
                <div className="summary-card">
                    <span className="summary-card__value">{averages.readiness ?? '—'}</span>
                    <span className="summary-card__label">Avg Ready</span>
                </div>
            </div>
        </section>
    );
};
