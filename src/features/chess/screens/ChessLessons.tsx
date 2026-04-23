import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react';
import { useChessStore } from '../../../store/useChessStore';
import { ItalianGameLesson } from './ItalianGameLesson';

interface ChessLessonsProps {
    onBack?: () => void;
}

export const ChessLessons: React.FC<ChessLessonsProps> = () => {
    const [activeLesson, setActiveLesson] = useState<string | null>(null);
    const chessStore = useChessStore();

    if (activeLesson === 'italian_game') {
        // We override the ItalianGameLesson back navigation to reset the active lesson locally
        // instead of doing an absolute router navigation.
        return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: '#0f172a' }}>
                <ItalianGameLesson onExit={() => setActiveLesson(null)} />
            </div>
        );
    }

    const isItalianComplete = chessStore.interactiveLessonsMastered.includes('italian_game');

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="chess-lessons-portal"
            style={{ padding: '1rem' }}
        >
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.5rem' }}>Interactive Lessons</h2>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>Master chess concepts through guided, step-by-step interactive puzzles.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div 
                    onClick={() => setActiveLesson('italian_game')}
                    style={{ 
                        background: '#1e293b', 
                        border: `1px solid ${isItalianComplete ? '#10b981' : '#334155'}`,
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}
                    onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onPointerCancel={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: '12px', 
                            background: isItalianComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isItalianComplete ? '#10b981' : '#38bdf8'
                        }}>
                            {isItalianComplete ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div>
                            <h3 style={{ color: '#f8fafc', margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>The Italian Game</h3>
                            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Learn the classic e4 opening.</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="#64748b" />
                </div>
                
                <div style={{
                    background: '#0f172a',
                    border: '1px dashed #334155',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    color: '#64748b'
                }}>
                    More interactive layouts arriving soon
                </div>
            </div>
        </motion.div>
    );
};
