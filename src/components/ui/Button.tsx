import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    onClick?: () => void;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    onClick,
    disabled = false,
    fullWidth = false,
    className = '',
}) => {
    return (
        <motion.button
            className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.15 }}
        >
            {icon && iconPosition === 'left' && <span className="btn__icon btn__icon--left">{icon}</span>}
            <span className="btn__text">{children}</span>
            {icon && iconPosition === 'right' && <span className="btn__icon btn__icon--right">{icon}</span>}
        </motion.button>
    );
};
