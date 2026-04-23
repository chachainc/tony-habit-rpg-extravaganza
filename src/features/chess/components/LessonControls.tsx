import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './LessonComponents.css';

interface LessonControlsProps {
    currentStep: number;
    totalSteps: number;
    canGoPrev: boolean;
    canGoNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    isFinished: boolean;
}

export const LessonControls: React.FC<LessonControlsProps> = ({
    currentStep,
    totalSteps,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    isFinished
}) => {
    // We treat 'currentStep' as a 1-indexed value.
    const progressPercent = Math.min(100, Math.max(0, ((currentStep) / totalSteps) * 100));

    return (
        <div className="lesson-controls">
            <div className="lesson-controls-progress-bar">
                <div 
                    className="lesson-controls-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            
            <div className="lesson-controls-buttons">
                <button 
                    className="lesson-btn"
                    onClick={onPrev}
                    disabled={!canGoPrev}
                >
                    <ArrowLeft size={20} /> Prev
                </button>
                
                <div className="lesson-step-indicator">
                    {isFinished ? "Complete" : `Step ${Math.min(currentStep + 1, totalSteps)} / ${totalSteps}`}
                </div>

                <button 
                    className={`lesson-btn ${canGoNext ? 'primary' : ''}`}
                    onClick={onNext}
                    disabled={!canGoNext && !isFinished}
                >
                    {isFinished ? "Retry" : "Next"} {!isFinished && <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    );
};
