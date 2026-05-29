import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import './Journal.css';
import cowBg from '../../assets/magical_cows_library.png';

export const ReadingLogHistory: React.FC = () => {
    const navigate = useNavigate();
    const { readingLogs } = useJournalStore();

    // Sort entries descending (latest first)
    const sortedLogs = useMemo(() => {
        return [...(readingLogs || [])].sort((a, b) => b.timestamp - a.timestamp);
    }, [readingLogs]);

    // Group logs by date
    const logsByDate = useMemo(() => {
        const groups: Record<string, typeof sortedLogs> = {};
        sortedLogs.forEach(log => {
            if (!groups[log.date]) {
                groups[log.date] = [];
            }
            groups[log.date].push(log);
        });
        return groups;
    }, [sortedLogs]);

    // Generate random offsets for embers once
    const embers = useMemo(() => {
        return [...Array(6)].map((_, i) => ({
            id: i,
            left: `${Math.random() * 90 + 5}%`,
            delay: `${Math.random() * 8}s`,
            duration: `${12 + Math.random() * 6}s`,
        }));
    }, []);

    return (
        <motion.div 
            className="journal-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="journal-bg-wrapper">
                <img src={cowBg} alt="Magical Library Background" className="journal-bg-img" />
                <div className="journal-bg-overlay" />
            </div>

            {/* Ambient Library Embers */}
            <div className="journal-embers">
                {embers.map((ember) => (
                    <div
                        key={ember.id}
                        className="journal-ember"
                        style={{
                            left: ember.left,
                            animationDelay: ember.delay,
                            animationDuration: ember.duration
                        }}
                    />
                ))}
            </div>

            <div className="journal-header">
                <button className="journal-btn-icon" onClick={() => navigate('/journal')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Reading Log</h1>
                <div style={{ width: 36 }} />
            </div>

            <div className="journal-history-list reading-log-list">
                {sortedLogs.length === 0 ? (
                    <div className="reading-log-empty">
                        <BookOpen size={48} className="reading-log-empty-icon" />
                        <p>No reading sessions logged yet.</p>
                    </div>
                ) : (
                    Object.entries(logsByDate).map(([date, logs]) => (
                        <div key={date} className="reading-log-group">
                            <div className="reading-log-date-header">{date}</div>
                            <div className="reading-log-cards">
                                {logs.map((log) => (
                                    <motion.div 
                                        key={log.id} 
                                        className="reading-log-card"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p className="reading-log-text">{log.text}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
