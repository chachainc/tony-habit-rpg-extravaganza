import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useJournalStore, JournalCategory } from '../../store/useJournalStore';
import './Journal.css';

export const JournalHistory: React.FC = () => {
    const { category } = useParams<{ category: JournalCategory }>();
    const navigate = useNavigate();
    const { getEntriesByCategory } = useJournalStore();

    const entries = useMemo(() => {
        if (!category) return [];
        return getEntriesByCategory(category);
    }, [category, getEntriesByCategory]);

    const title = category === 'movie' ? 'Movie Log History' : category === 'book' ? 'Book Ideas History' : 'Personal History';

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    };

    return (
        <motion.div 
            className="journal-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="journal-header journal-header--hub">
                <button className="journal-btn-icon" onClick={() => navigate(`/journal/${category}`)}>
                    <ArrowLeft size={24} />
                </button>
                <h1>{title}</h1>
                <div style={{ width: 24 }} />
            </div>

            <div className="journal-history-list">
                {entries.length === 0 ? (
                    <div className="journal-history-empty">
                        <p>No entries found yet.</p>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className="journal-history-card">
                            <div className="journal-history-date">{formatDate(entry.timestamp)}</div>
                            <div className="journal-history-content">
                                {entry.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
