import { Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Item } from '../../../data/items';
import { useGameStore } from '../../../store/useGameStore';
import { getPassiveBonuses } from '../../../store/usePassiveEffects';
import { PET_DATABASE } from '../../../data/pets';
import './ItemCard.css';

interface Props {
    item: Item;
    isUnlocked: boolean;
    isOwned: boolean;
    canAfford: boolean;
    missingRequirements: string[];
    missingCurrency: string[];
    onPurchase: () => void;
    evolveNode?: React.ReactNode;
}

export const ItemCard = ({
    item,
    isUnlocked,
    isOwned,
    canAfford,
    missingRequirements,
    missingCurrency,
    onPurchase,
    evolveNode,
}: Props) => {
    // Work / Gold discount
    const rawDiscount = useGameStore.getState().getWorkDiscount();
    const equipDiscount = getPassiveBonuses().gold_multiplier ?? 0;
    const discountPercent = Math.min(50, rawDiscount + equipDiscount);
    const discountMult = 1 - (discountPercent / 100);

    const discountedGoldCost = item.cost.gold ? Math.max(1, Math.floor(item.cost.gold * discountMult)) : undefined;
    
    // We strictly use discountedGoldCost for "canAfford" calculations related to gold if that logic was passed down,
    // but right now `canAfford` is computed in the parent store. 
    // Wait, we need to display it correctly here.

    const canPurchase = isUnlocked && canAfford && !isOwned;
    const [imageError, setImageError] = useState(false);

    const resolvedImage = item.type === 'pet' && PET_DATABASE[item.id]?.image ? PET_DATABASE[item.id].image : item.image;

    return (
        <motion.div
            className={`item-card ${!isUnlocked ? 'item-card--locked' : ''} ${isOwned ? 'item-card--owned' : ''}`}
            whileHover={canPurchase ? { scale: 1.02 } : {}}
        >
            {/* Item Icon */}
            <div className="item-card-icon">
                {resolvedImage && !imageError ? (
                    <img 
                        src={resolvedImage} 
                        alt={item.name}
                        className={`item-card-image${item.type === 'pet' ? ' pet-img' : ''}`}
                        onError={() => {
                            console.error(`Failed to load image for ${item.name}: ${resolvedImage}`);
                            setImageError(true);
                        }}
                    />
                ) : (
                    item.icon || '📦'
                )}
            </div>

            {/* Item Info */}
            <div className="item-card-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="item-name">{item.name}</h3>
                    {(item.affinity || item.type === 'armor' || item.type === 'weapon') && (() => {
                        const AFFINITY_ICONS: Record<string, { icon: string, color: string, label: string }> = {
                            fire: { icon: '🔥', color: '#ef4444', label: 'Fire' },
                            ice: { icon: '❄️', color: '#3b82f6', label: 'Ice' },
                            shadow: { icon: '🌑', color: '#8b5cf6', label: 'Shadow' },
                            economy: { icon: '💰', color: '#10b981', label: 'Economy' },
                            luck: { icon: '🍀', color: '#fbbf24', label: 'Luck' },
                            neutral: { icon: '🛡️', color: '#94a3b8', label: 'Neutral' },
                        };
                        const config = AFFINITY_ICONS[item.affinity || 'neutral'];
                        return config ? (
                            <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', color: config.color, padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                {config.icon} {config.label}
                            </span>
                        ) : null;
                    })()}
                </div>
                <p className="item-description">{item.description}</p>

                {/* Stats */}
                {(item.stats?.attack || item.stats?.defense || item.stats?.magicAttack || item.stats?.magicDefense || item.stats?.maxMana || item.stats?.bonusXp) && (
                    <div className="item-stats">
                        {item.stats.attack && <span className="stat stat--attack">⚔️ +{item.stats.attack} Attack</span>}
                        {item.stats.defense && <span className="stat stat--defense">🛡️ +{item.stats.defense} Defense</span>}
                        {item.stats.magicAttack && <span className="stat stat--attack">🔮 +{item.stats.magicAttack} M.Attack</span>}
                        {item.stats.magicDefense && <span className="stat stat--defense">✨ +{item.stats.magicDefense} M.Defense</span>}
                        {item.stats.maxMana && <span className="stat stat--xp">💧 +{item.stats.maxMana} Max MP</span>}
                        {item.stats.bonusXp && Object.entries(item.stats.bonusXp).map(([skill, bonus]) => (
                            <span key={skill} className="stat stat--xp">✨ +{bonus}% {skill} XP</span>
                        ))}
                    </div>
                )}

                {/* Pet Passives */}
                {item.type === 'pet' && PET_DATABASE[item.id]?.passive && (
                    <div className="item-passive" style={{ marginTop: '8px', color: '#8b5cf6', fontSize: '0.85em', textAlign: 'center' }}>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>{PET_DATABASE[item.id].passive.name}</strong>
                        ✨ {PET_DATABASE[item.id].passive.description}
                    </div>
                )}

            </div>

            {/* Action Button (Now acts as the price display too) */}
            <div className="item-card-action">
                {isOwned ? (
                    evolveNode ? evolveNode : (
                        <button className="item-btn item-btn--owned" disabled>
                            <Check size={18} />
                            Owned
                        </button>
                    )
                ) : !isUnlocked ? (
                    <button className="item-btn item-btn--locked" disabled>
                        <Lock size={18} />
                        Locked
                    </button>
                ) : (
                    <button 
                        className={`item-cost-button item-btn ${canAfford ? 'item-btn--purchase' : 'item-btn--expensive'}`} 
                        disabled={!canAfford}
                        onClick={onPurchase}
                        style={{ padding: '0.4rem 0.6rem', width: '100%', justifyContent: 'center' }}
                    >
                        <div className="item-cost" style={{ marginTop: 0, justifyContent: 'center' }}>
                            {item.cost.gold !== undefined && item.cost.gold > 0 && (
                                discountPercent > 0 ? (
                                    <span className="cost-item">
                                        <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.85em', marginRight: '4px' }}>
                                            {item.cost.gold}
                                        </span>
                                        <span style={{ color: canAfford ? '#ef4444' : 'inherit' }}>{discountedGoldCost}</span>
                                        <span style={{ color: canAfford ? '#ef4444' : 'inherit', fontSize: '0.8em', marginLeft: '4px' }}>(-{discountPercent}%)</span> 💰
                                    </span>
                                ) : (
                                    <span className="cost-item">💰 {item.cost.gold}</span>
                                )
                            )}
                            {(item.cost.tickets ?? 0) > 0 && <span className="cost-item">🎫 {item.cost.tickets}</span>}
                            {(item.cost.gems ?? 0) > 0 && <span className="cost-item">💎 {item.cost.gems}</span>}
                            {item.cost.tokens && Object.entries(item.cost.tokens).map(([skill, amount]) => (
                                <span key={skill} className="cost-item">🎖️ {amount} {skill}</span>
                            ))}
                        </div>
                    </button>
                )}
            </div>

            {/* Lock Overlay — only for truly progression-locked items */}
            {!isUnlocked && (
                <div className="item-card-overlay">
                    <Lock size={48} />
                </div>
            )}

            {/* Tooltip */}
            {(!isUnlocked || !canAfford) && (
                <div className="item-tooltip">
                    {missingRequirements.length > 0 && (
                        <div className="tooltip-section">
                            <strong>Requirements:</strong>
                            {missingRequirements.map((req, i) => (
                                <div key={i}>🔒 {req}</div>
                            ))}
                        </div>
                    )}
                    {missingCurrency.length > 0 && (
                        <div className="tooltip-section">
                            <strong>Missing:</strong>
                            {missingCurrency.map((curr, i) => (
                                <div key={i}>
                                    {curr.includes('Gold') ? '💰' : curr.includes('Gem') ? '💎' : '🎖️'} {curr}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};
