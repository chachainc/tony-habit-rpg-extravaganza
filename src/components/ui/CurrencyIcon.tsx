import React from 'react';

interface CurrencyIconProps {
    currencyType: 'gold' | 'gems' | 'moons' | string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const CurrencyIcon: React.FC<CurrencyIconProps> = ({ currencyType, size = 16, className = '', style }) => {
    if (currencyType === 'gold') {
        return <span className={`currency-icon gold-icon ${className}`} style={{ fontSize: size, lineHeight: 1, ...style }}>🪙</span>;
    }
    if (currencyType === 'gems') {
        return <span className={`currency-icon gem-icon ${className}`} style={{ fontSize: size, lineHeight: 1, ...style }}>💎</span>;
    }
    if (currencyType === 'moons') {
        return <span className={`currency-icon moon-icon ${className}`} style={{ fontSize: size, lineHeight: 1, ...style }}>🌙</span>;
    }
    // Fallback to gold
    return <span className={`currency-icon fallback-icon ${className}`} style={{ fontSize: size, lineHeight: 1, ...style }}>🪙</span>;
};
