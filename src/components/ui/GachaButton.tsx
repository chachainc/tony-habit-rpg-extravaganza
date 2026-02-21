import React from 'react';
import './GachaButton.css';

interface GachaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    children: React.ReactNode;
}

export const GachaButton: React.FC<GachaButtonProps> = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    children,
    ...props
}) => {
    return (
        <button
            className={`gacha-btn variant-${variant} size-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            <span className="gacha-btn-inner">{children}</span>
        </button>
    );
};
