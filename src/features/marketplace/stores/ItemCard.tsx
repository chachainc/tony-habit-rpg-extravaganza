import { Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '../../../data/items';
import './ItemCard.css';

interface Props {
    item: Item;
    isUnlocked: boolean;
    isOwned: boolean;
    canAfford: boolean;
    missingRequirements: string[];
    missingCurrency: string[];
    onPurchase: () => void;
}

export const ItemCard = ({
    item,
    isUnlocked,
    isOwned,
    canAfford,
    missingRequirements,
    missingCurrency,
    onPurchase
}: Props) => {
    const canPurchase = isUnlocked && canAfford && !isOwned;

    return (
        <motion.div
            className={`item-card ${!isUnlocked ? 'item-card--locked' : ''} ${isOwned ? 'item-card--owned' : ''}`}
            whileHover={canPurchase ? { scale: 1.02 } : {}}
        >
            {/* Item Icon */}
            <div className="item-card-icon">{item.icon}</div>

            {/* Item Info */}
            <div className="item-card-info">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-description">{item.description}</p>

                {/* Stats */}
                {(item.stats?.attack || item.stats?.defense || item.stats?.bonusXp) && (
                    <div className="item-stats">
                        {item.stats.attack && <span className="stat stat--attack">⚔️ +{item.stats.attack} Attack</span>}
                        {item.stats.defense && <span className="stat stat--defense">🛡️ +{item.stats.defense} Defense</span>}
                        {item.stats.bonusXp && Object.entries(item.stats.bonusXp).map(([skill, bonus]) => (
                            <span key={skill} className="stat stat--xp">✨ +{bonus}% {skill} XP</span>
                        ))}
                    </div>
                )}

                {/* Cost */}
                <div className="item-cost">
                    {(item.cost.gold ?? 0) > 0 && <span className="cost-item">💰 {item.cost.gold}</span>}
                    {(item.cost.tickets ?? 0) > 0 && <span className="cost-item">🎫 {item.cost.tickets}</span>}
                    {(item.cost.diamonds ?? 0) > 0 && <span className="cost-item">💎 {item.cost.diamonds}</span>}
                    {item.cost.tokens && Object.entries(item.cost.tokens).map(([skill, amount]) => (
                        <span key={skill} className="cost-item">🎖️ {amount} {skill}</span>
                    ))}
                </div>
            </div>

            {/* Action Button */}
            <div className="item-card-action">
                {isOwned ? (
                    <button className="item-btn item-btn--owned" disabled>
                        <Check size={18} />
                        Owned
                    </button>
                ) : !isUnlocked ? (
                    <button className="item-btn item-btn--locked" disabled>
                        <Lock size={18} />
                        Locked
                    </button>
                ) : !canAfford ? (
                    <button className="item-btn item-btn--expensive" disabled>
                        Can't Afford
                    </button>
                ) : (
                    <button className="item-btn item-btn--purchase" onClick={onPurchase}>
                        Purchase
                    </button>
                )}
            </div>

            {/* Lock Overlay */}
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
                                <div key={i}>❌ {req}</div>
                            ))}
                        </div>
                    )}
                    {missingCurrency.length > 0 && (
                        <div className="tooltip-section">
                            <strong>Need:</strong>
                            {missingCurrency.map((curr, i) => (
                                <div key={i}>❌ {curr}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};
