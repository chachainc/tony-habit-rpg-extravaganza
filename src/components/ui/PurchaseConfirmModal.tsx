import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
import type { Item } from '../../data/items';
import { PET_DATABASE } from '../../data/pets';
import './PurchaseConfirmModal.css';

interface Props {
    item: Item;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const PurchaseConfirmModal = ({ item, isOpen, onConfirm, onCancel }: Props) => {
    if (!isOpen) return null;

    const rarityColors: Record<string, string> = {
        common: '#9ca3af',
        uncommon: '#22c55e',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#f59e0b',
    };

    const borderColor = rarityColors[item.rarity || 'common'];
    const resolvedImage = item.type === 'pet' && PET_DATABASE[item.id]?.image ? PET_DATABASE[item.id].image : item.image;
    const isImage = resolvedImage && (resolvedImage.startsWith('/') || resolvedImage.startsWith('http') || resolvedImage.startsWith('data:image/'));

    return (
        <AnimatePresence>
            <motion.div
                className="purchase-confirm-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
            >
                <motion.div
                    className="purchase-confirm-modal"
                    style={{ '--rarity-color': borderColor } as React.CSSProperties}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button className="modal-close-btn" onClick={onCancel}>
                        <X size={20} />
                    </button>

                    {/* Item Preview */}
                    <div className="item-preview">
                        <div className="item-icon-large">
                            {isImage ? (
                                <img src={resolvedImage} alt={item.name} className="item-preview-image" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', margin: '0 auto' }} />
                            ) : (
                                item.icon
                            )}
                        </div>
                        <h2 className="item-name-large">{item.name}</h2>
                        <span className={`rarity-badge rarity-${item.rarity || 'common'}`}>
                            {item.rarity?.toUpperCase() || 'COMMON'}
                        </span>
                    </div>

                    {/* Description */}
                    <p className="item-description-text">{item.description}</p>

                    {/* Stats Preview */}
                    {(item.stats?.attack || item.stats?.defense || item.stats?.bonusXp) && (
                        <div className="stats-preview">
                            <h4>Stats</h4>
                            <div className="stats-list">
                                {item.stats.attack && (
                                    <span className="stat-item stat-attack">⚔️ +{item.stats.attack} Attack</span>
                                )}
                                {item.stats.defense && (
                                    <span className="stat-item stat-defense">🛡️ +{item.stats.defense} Defense</span>
                                )}
                                {item.stats.bonusXp && Object.entries(item.stats.bonusXp).map(([skill, bonus]) => (
                                    <span key={skill} className="stat-item stat-xp">✨ +{bonus}% {skill} XP</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cost Breakdown */}
                    <div className="cost-breakdown">
                        <h4>Total Cost</h4>
                        <div className="cost-items">
                            {(item.cost.gold ?? 0) > 0 && (
                                <span className="cost-badge cost-gold">💰 {item.cost.gold} Gold</span>
                            )}
                            {(item.cost.tickets ?? 0) > 0 && (
                                <span className="cost-badge cost-tickets">🎫 {item.cost.tickets} Tickets</span>
                            )}
                            {(item.cost.gems ?? 0) > 0 && (
                                <span className="cost-badge cost-gems">💎 {item.cost.gems} Gems</span>
                            )}
                            {item.cost.tokens && Object.entries(item.cost.tokens).map(([skill, amount]) => (
                                <span key={skill} className="cost-badge cost-tokens">🎖️ {amount} {skill} Tokens</span>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={onCancel}>
                            <X size={18} />
                            Cancel
                        </button>
                        <button className="btn-confirm" onClick={onConfirm}>
                            <Check size={18} />
                            Confirm Purchase
                        </button>
                    </div>

                    {/* Warning */}
                    <div className="purchase-warning">
                        <AlertCircle size={14} />
                        <span>This action cannot be undone</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
