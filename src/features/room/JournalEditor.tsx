import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { History, X } from 'lucide-react';
import { useJournalStore, JournalCategory } from '../../store/useJournalStore';
import { safeUUID } from '../../utils/safeUUID';
import './Journal.css';

export const JournalEditor: React.FC = () => {
    const { category } = useParams<{ category: JournalCategory }>();
    const navigate = useNavigate();
    const { upsertEntry, deleteEmptyEntries } = useJournalStore();
    
    // We instantiate exactly one session UUID when this component mounts per visit.
    const sessionIdRef = useRef<string>(safeUUID());
    const [content, setContent] = useState('');

    const title = category === 'movie' ? 'Movie Log' : category === 'book' ? 'My Book Ideas' : 'Personal Journal';

    // Cleanup empty entries strictly upon exit
    const handleExit = () => {
        deleteEmptyEntries();
        navigate('/journal');
    };

    const handleHistory = () => {
        deleteEmptyEntries();
        navigate(`/journal/${category}/history`);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        // Autosave instantly
        if (category) {
            upsertEntry(sessionIdRef.current, category, val);
        }
    };

    const todayDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date());

    return (
        <motion.div 
            className="journal-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="journal-header">
                <div className="journal-header-left">
                    <h1>{title}</h1>
                    <span className="journal-date">{todayDate}</span>
                </div>
                <div className="journal-header-actions">
                    <button className="journal-btn-text" onClick={handleHistory}>
                        <History size={18} />
                        <span>History</span>
                    </button>
                    <button className="journal-btn-icon" onClick={handleExit}>
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="journal-editor-workspace">
                <textarea 
                    className="journal-textarea"
                    placeholder="Start typing..."
                    autoFocus
                    value={content}
                    onChange={handleChange}
                />
            </div>
        </motion.div>
    );
};
