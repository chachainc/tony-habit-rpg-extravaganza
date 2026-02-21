import React from 'react';
import './Badge.css';

interface BadgeProps {
    label: string;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    variant?: 'outline' | 'filled';
    className?: string;
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    label,
    rarity = 'common',
    variant = 'filled',
    className = '',
    icon
}) => {
    return (
        <div className={`gacha-badge rarity-${rarity} variant-${variant} ${className}`}>
            {icon && <span className="badge-icon">{icon}</span>}
            <span className="badge-label">{label}</span>
        </div>
    );
};
