import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useChessStore } from '../../../store/useChessStore';
import { italianGame } from '../data/italianGame';
import { LessonBoard } from '../components/LessonBoard';
import { LessonPanel } from '../components/LessonPanel';
import { LessonControls } from '../components/LessonControls';
import '../components/LessonComponents.css';

interface ItalianGameLessonProps {
    onExit?: () => void;
}

export const ItalianGameLesson: React.FC<ItalianGameLessonProps> = ({ onExit }) => {
    const navigate = useNavigate();
    const chessStore = useChessStore();
    
    // 0-indexed step state (up to italianGame.length)
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [, setForceRender] = useState(0);
    
    const chessRef = useRef(new Chess());

    // Sound effect
    const playClick = useCallback(() => {
        try {
            if (navigator.vibrate) navigator.vibrate(10); // subtle haptic
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
        } catch(e) {}
    }, []);

    // Navigation logic
    const handleNext = () => {
        if (isFinished) {
            // Retry
            chessRef.current.reset();
            setCurrentStepIndex(0);
            setIsFinished(false);
            setForceRender(c => c + 1);
            return;
        }

        if (currentStepIndex < italianGame.length) {
            playClick();
            chessRef.current.move(italianGame[currentStepIndex].move);
            
            const nextStep = currentStepIndex + 1;
            setCurrentStepIndex(nextStep);
            
            if (nextStep === italianGame.length) {
                setIsFinished(true);
                chessStore.completeInteractiveLesson('italian_game');
            }
            setForceRender(c => c + 1);
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            playClick();
            if (isFinished) {
                setIsFinished(false);
            }
            chessRef.current.undo();
            setCurrentStepIndex(prev => prev - 1);
            setForceRender(c => c + 1);
        }
    };

    // Swipe logic
    const touchStartX = useRef(0);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const delta = touchStartX.current - touchEndX;
        if (delta > 50) {
            handleNext();
        } else if (delta < -50) {
            handlePrev();
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStepIndex, isFinished]);

    // Current step context
    const currentStepData = italianGame[Math.min(currentStepIndex, italianGame.length - 1)];
    const arrowData = currentStepIndex < italianGame.length && currentStepIndex > 0 && !isFinished
        ? { from: italianGame[currentStepIndex-1].from, to: italianGame[currentStepIndex-1].to, side: italianGame[currentStepIndex-1].side }
        : undefined;

    const handleExit = () => {
        if (onExit) onExit();
        else navigate('/combat');
    };

    return (
        <div 
            className="chess-system-container" 
            style={{ backgroundImage: 'none', backgroundColor: '#0f172a' }} // Clean dark background
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="chess-sys-header" style={{ marginBottom: '1rem' }}>
                <button 
                    onClick={handleExit} 
                    className="btn-back" 
                    style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer' }}
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 style={{ flex: 1, textAlign: 'center', margin: 0, paddingRight: '28px', fontSize: '1.25rem' }}>
                    The Italian Game
                </h1>
            </div>

            {!isFinished && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
                    {/* Reusing forceRender to trigger deep checks if needed, but instance itself mutates */}
                    <LessonBoard 
                        chess={chessRef.current} 
                        highlights={currentStepData?.highlights || []}
                        currentArrow={arrowData}
                    />

                    <LessonPanel 
                        move={currentStepData?.move || ''}
                        explanation={currentStepData?.explanation || ''}
                        warning={currentStepData?.warning}
                        stepKey={currentStepIndex}
                    />
                </div>
            )}

            {isFinished && (
                <div className="lesson-complete-card">
                    <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                    <h2>Lesson Complete!</h2>
                    <p>You have learned the fundamental setup of the Italian Game.</p>
                    
                    <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                        <h4 style={{ color: '#38bdf8', marginTop: 0 }}>Key Takeaways:</h4>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            <li>Fight for the center immediately with e4/e5.</li>
                            <li>Develop knights before bishops.</li>
                            <li>Bc4 eyes the vulnerable f7 square.</li>
                            <li>Prepare c3 to support a strong d4 push.</li>
                        </ul>
                    </div>

                    <button 
                        className="lesson-complete-btn"
                        onClick={handleExit}
                    >
                        Back to Chess Hub
                    </button>
                </div>
            )}

            <LessonControls 
                currentStep={currentStepIndex}
                totalSteps={italianGame.length}
                canGoPrev={currentStepIndex > 0}
                canGoNext={currentStepIndex < italianGame.length}
                onPrev={handlePrev}
                onNext={handleNext}
                isFinished={isFinished}
            />
        </div>
    );
};
