import React from 'react';
import './ItemSlot.css';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface ItemSlotProps {
    imageSrc?: string;
    fallbackIcon?: string;
    rarity?: ItemRarity;
    quantity?: number;
    level?: number;
    isEquipped?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
}

export const ItemSlot: React.FC<ItemSlotProps> = ({
    imageSrc,
    fallbackIcon = '📦',
    rarity = 'common',
    quantity,
    level,
    isEquipped = false,
    isSelected = false,
    onClick,
    className = ''
}) => {
    return (
        <div
            className={`gacha-item-slot rarity-${rarity} ${isSelected ? 'selected' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : 'presentation'}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Background Frame */}
            <div className="item-bg"></div>

            {/* Item Visual */}
            <div className="item-visual">
                {imageSrc ? (
                    <img src={imageSrc} alt="item" draggable={false} />
                ) : (
                    <span className="item-fallback">{fallbackIcon}</span>
                )}
            </div>

            {/* Rarity Border overlay */}
            <div className="item-border"></div>

            {/* Overlays */}
            {level !== undefined && (
                <div className="item-level">Lv.{level}</div>
            )}

            {quantity !== undefined && quantity > 1 && (
                <div className="item-quantity">x{quantity}</div>
            )}

            {isEquipped && (
                <div className="item-equipped-tag">E</div>
            )}
        </div>
    );
};
