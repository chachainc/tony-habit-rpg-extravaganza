import React from 'react';
import { motion } from 'framer-motion';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'glass' | 'glow';
    onClick?: () => void;
    className?: string;
    hover?: boolean;
    id?: string;
}

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    onClick,
    className = '',
    hover = true,
    id,
}) => {
    const isClickable = !!onClick;

    return (
        <motion.div
            id={id}
            className={`card card--${variant} ${isClickable ? 'card--clickable' : ''} ${className}`}
            onClick={onClick}
            whileHover={hover && isClickable ? {
                y: -4,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            } : undefined}
            whileTap={isClickable ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.15 }}
        >
            {children}
        </motion.div>
    );
};
