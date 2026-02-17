import React from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

interface ProgressBarProps {
    current: number;
    max: number;
    label?: string;
    showNumbers?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'rare' | 'epic' | 'legendary';
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    current,
    max,
    label,
    showNumbers = true,
    variant = 'default',
    size = 'md',
    animated = true,
}) => {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));

    return (
        <div className={`progress-bar-container progress-bar--${size}`}>
            {label && (
                <div className="progress-bar__label">
                    <span>{label}</span>
                    {showNumbers && (
                        <span className="progress-bar__numbers">
                            {current}/{max}
                        </span>
                    )}
                </div>
            )}

            <div className={`progress-bar progress-bar--${variant}`}>
                <motion.div
                    className="progress-bar__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                        duration: animated ? 0.5 : 0,
                        ease: 'easeOut',
                    }}
                />

                {!label && showNumbers && (
                    <span className="progress-bar__text">
                        {current}/{max}
                    </span>
                )}
            </div>
        </div>
    );
};
