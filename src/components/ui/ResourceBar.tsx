import React from 'react';
import './ResourceBar.css';

interface ResourceItem {
    id: string;
    icon: React.ReactNode;
    value: number | string;
    label?: string;
}

interface ResourceBarProps {
    resources: ResourceItem[];
    className?: string;
    variant?: 'glass' | 'solid';
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
    resources,
    className = '',
    variant = 'glass'
}) => {
    return (
        <div className={`gacha-resource-bar variant-${variant} ${className}`}>
            {resources.map((res) => (
                <div key={res.id} className="resource-pill" title={res.label}>
                    <div className="resource-icon">{res.icon}</div>
                    <div className="resource-value">{res.value}</div>
                    <button className="resource-add-btn" aria-label={`Add more ${res.label || res.id}`}>
                        +
                    </button>
                </div>
            ))}
        </div>
    );
};
