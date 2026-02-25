import { X, Moon, Zap, Calendar } from 'lucide-react';
import { useDayStore, type SleepLogEntry } from '../../store/useDayStore';
import './SleepLog.css';

interface Props {
    onClose: () => void;
}

export const SleepLog = ({ onClose }: Props) => {
    const { sleepLogs, readinessLogs } = useDayStore();

    // Merge sleep and readiness logs by date
    const history = sleepLogs.map((entry: SleepLogEntry) => {
        const readiness = readinessLogs.find(r => r.date === entry.date);
        return {
            date: entry.date,
            sleepScore: entry.score,
            readinessScore: readiness?.score ?? 0,
            xpEarned: entry.xpEarned + (readiness?.xpEarned ?? 0),
        };
    });

    return (
        <div className="sleep-log-overlay">
            <div className="sleep-log-modal">
                <div className="sleep-log-header">
                    <h2>💤 Sleep History</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="sleep-log-content">
                    {history.length === 0 ? (
                        <div className="empty-state">
                            <Moon size={48} />
                            <p>No sleep data recorded yet.</p>
                            <p className="empty-sub">Check in when you wake up to track your sleep!</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {history.map((entry: { date: string; sleepScore: number; readinessScore: number; xpEarned: number }, index: number) => (
                                <div key={`${entry.date}-${index}`} className="history-entry">
                                    <div className="entry-date">
                                        <Calendar size={16} />
                                        <span>{entry.date}</span>
                                    </div>

                                    <div className="entry-stats">
                                        <div className="entry-stat sleep">
                                            <div className="stat-label">
                                                <Moon size={14} /> Sleep
                                            </div>
                                            <div className="stat-bar-container">
                                                <div
                                                    className="stat-bar-fill"
                                                    style={{ width: `${entry.sleepScore}%`, background: '#8b5cf6' }}
                                                />
                                            </div>
                                            <span className="stat-value">{entry.sleepScore}</span>
                                        </div>

                                        <div className="entry-stat readiness">
                                            <div className="stat-label">
                                                <Zap size={14} /> Ready
                                            </div>
                                            <div className="stat-bar-container">
                                                <div
                                                    className="stat-bar-fill"
                                                    style={{ width: `${entry.readinessScore}%`, background: '#fbbf24' }}
                                                />
                                            </div>
                                            <span className="stat-value">{entry.readinessScore}</span>
                                        </div>
                                    </div>

                                    <div className="entry-xp">
                                        <span className="xp-badge">+{entry.xpEarned} XP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
