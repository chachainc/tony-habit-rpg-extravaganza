import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Film, Lightbulb, ArrowLeft } from 'lucide-react';
import './Journal.css';

export const JournalHub: React.FC = () => {
    const navigate = useNavigate();

    return (
        <motion.div 
            className="journal-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
        >
            <div className="journal-header journal-header--hub">
                <button className="journal-btn-icon" onClick={() => navigate('/room')}>
                    <ArrowLeft size={24} />
                </button>
                <h1>Journal</h1>
                <div style={{ width: 24 }} /> {/* balancer */}
            </div>

            <div className="journal-hub-grid">
                <motion.button 
                    className="journal-hub-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/journal/personal')}
                >
                    <div className="journal-hub-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
                        <BookOpen size={48} />
                    </div>
                    <h2>Personal</h2>
                    <p>Thoughts & daily notes</p>
                </motion.button>

                <motion.button 
                    className="journal-hub-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/journal/movie')}
                >
                    <div className="journal-hub-icon" style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}>
                        <Film size={48} />
                    </div>
                    <h2>Movie Log</h2>
                    <p>Movies watched & reactions</p>
                </motion.button>

                <motion.button 
                    className="journal-hub-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/journal/book')}
                >
                    <div className="journal-hub-icon" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}>
                        <Lightbulb size={48} />
                    </div>
                    <h2>My Book Ideas</h2>
                    <p>Story ideas & concepts</p>
                </motion.button>
            </div>
        </motion.div>
    );
};
