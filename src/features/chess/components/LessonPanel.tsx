import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import './LessonComponents.css';

interface LessonPanelProps {
    move: string;
    explanation: string;
    warning?: string;
    stepKey: number; // to trigger re-animation
}

export const LessonPanel: React.FC<LessonPanelProps> = ({ move, explanation, warning, stepKey }) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={stepKey}
                className="lesson-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
            >
                <h3 className="lesson-panel-move">{move}</h3>
                <p className="lesson-panel-text">{explanation}</p>
                {warning && (
                    <div className="lesson-panel-warning">
                        <AlertTriangle size={16} />
                        <span>{warning}</span>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
