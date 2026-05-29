import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Film, Lightbulb, BookMarked, ArrowLeft } from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import './Journal.css';
import cowBg from '../../assets/magical_cows_library.png';

export const JournalHub: React.FC = () => {
    const navigate = useNavigate();
    const store = useJournalStore();
    
    // Get entry counts natively
    const personalCount = store.getEntriesByCategory('personal').length;
    const movieCount = store.getEntriesByCategory('movie').length;
    const bookCount = store.getEntriesByCategory('book').length;
    const readingLogCount = (store.readingLogs || []).length;

    // Generate random offsets for embers once
    const embers = useMemo(() => {
        return [...Array(8)].map((_, i) => ({
            id: i,
            left: `${Math.random() * 90 + 5}%`,
            delay: `${Math.random() * 8}s`,
            duration: `${10 + Math.random() * 8}s`,
        }));
    }, []);

    return (
        <motion.div 
            className="journal-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
        >
            <div className="journal-bg-wrapper">
                <img src={cowBg} alt="Magical Library Background" className="journal-bg-img" />
                <div className="journal-bg-overlay" />
            </div>

            {/* Magical Floating Library Embers */}
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
                <button className="journal-btn-icon" onClick={() => navigate('/room')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Journal</h1>
                <div style={{ width: 36 }} /> {/* balancer */}
            </div>

            <div className="journal-hub-grid">
                <motion.button 
                    className="journal-hub-card card-personal"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/journal/personal')}
                >
                    <div className="journal-hub-icon-wrapper personal-glow">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h2>Personal</h2>
                        <p>Thoughts & notes</p>
                    </div>
                    <div className="journal-hub-badge personal-badge">
                        {personalCount} {personalCount === 1 ? 'entry' : 'entries'}
                    </div>
                </motion.button>

                <motion.button 
                    className="journal-hub-card card-movie"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/journal/movie')}
                >
                    <div className="journal-hub-icon-wrapper movie-glow">
                        <Film size={28} />
                    </div>
                    <div>
                        <h2>Movie Log</h2>
                        <p>Watched & reviews</p>
                    </div>
                    <div className="journal-hub-badge movie-badge">
                        {movieCount} {movieCount === 1 ? 'log' : 'logs'}
                    </div>
                </motion.button>

                <motion.button 
                    className="journal-hub-card card-reading"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/journal/reading-log')}
                >
                    <div className="journal-hub-icon-wrapper reading-glow">
                        <BookMarked size={28} />
                    </div>
                    <div>
                        <h2>Reading Log</h2>
                        <p>Daily reading records</p>
                    </div>
                    <div className="journal-hub-badge reading-badge">
                        {readingLogCount} {readingLogCount === 1 ? 'entry' : 'entries'}
                    </div>
                </motion.button>

                <motion.button 
                    className="journal-hub-card card-book"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/journal/book')}
                >
                    <div className="journal-hub-icon-wrapper book-glow">
                        <Lightbulb size={28} />
                    </div>
                    <div>
                        <h2>My Book Ideas</h2>
                        <p>Story ideas & concepts</p>
                    </div>
                    <div className="journal-hub-badge book-badge">
                        {bookCount} {bookCount === 1 ? 'idea' : 'ideas'}
                    </div>
                </motion.button>
            </div>
        </motion.div>
    );
};
