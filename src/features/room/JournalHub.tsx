import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Film, Lightbulb, ArrowLeft } from 'lucide-react';
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

            <div className="journal-header journal-header--hub">
                <button className="journal-btn-icon" onClick={() => navigate('/room')}>
                    <ArrowLeft size={24} />
                </button>
                <h1>Journal</h1>
                <div style={{ width: 24 }} /> {/* balancer */}
            </div>

            <div className="journal-hub-grid">
                <motion.button 
                    className="journal-hub-card card-personal"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => navigate('/journal/personal')}
                >
                    <div className="journal-hub-icon-wrapper personal-glow">
                        <BookOpen size={48} className="journal-hub-icon" />
                    </div>
                    <h2>Personal</h2>
                    <p>Thoughts & daily notes</p>
                    <div className="journal-hub-badge personal-badge">{personalCount} {personalCount === 1 ? 'entry' : 'entries'}</div>
                </motion.button>

                <motion.button 
                    className="journal-hub-card card-movie"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => navigate('/journal/movie')}
                >
                    <div className="journal-hub-icon-wrapper movie-glow">
                        <Film size={48} className="journal-hub-icon" />
                    </div>
                    <h2>Movie Log</h2>
                    <p>Movies watched & reactions</p>
                    <div className="journal-hub-badge movie-badge">{movieCount} {movieCount === 1 ? 'log' : 'logs'}</div>
                </motion.button>

                <motion.button 
                    className="journal-hub-card card-book"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => navigate('/journal/book')}
                >
                    <div className="journal-hub-icon-wrapper book-glow">
                        <Lightbulb size={48} className="journal-hub-icon" />
                    </div>
                    <h2>My Book Ideas</h2>
                    <p>Story ideas & concepts</p>
                    <div className="journal-hub-badge book-badge">{bookCount} {bookCount === 1 ? 'idea' : 'ideas'}</div>
                </motion.button>
            </div>
        </motion.div>
    );
};
