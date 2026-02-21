import React from 'react';
import './Panel.css';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'solid' | 'glass' | 'bordered';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
    variant = 'glass',
    padding = 'md',
    className = '',
    children,
    ...props
}) => {
    return (
        <div
            className={`gacha-panel variant-${variant} padding-${padding} ${className}`}
            {...props}
        >
            <div className="gacha-panel-inner">
                {children}
            </div>
        </div>
    );
};
