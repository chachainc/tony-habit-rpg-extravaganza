import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gem, Check, Crown } from 'lucide-react';
import { StoreLayout } from './StoreLayout';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useInventoryStore } from '../../../store/useInventoryStore';
import { ITEM_DATABASE, type Item } from '../../../data/items';

const RARITY_COLORS: Record<string, string> = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
};

interface Props {
    onClose: () => void;
}

export const JewelryStore = ({ onClose }: Props) => {
    const { diamonds, spendDiamonds } = useCurrencyStore();
    const invStore = useInventoryStore();
    const [filter, setFilter] = useState<'all' | 'hero' | 'pet'>('all');

    const JEWELRY_ITEMS = Object.values(ITEM_DATABASE).filter(i => i.type === 'jewelry' || i.type === 'pet_accessory');

    const filteredItems = filter === 'all'
        ? JEWELRY_ITEMS
        : JEWELRY_ITEMS.filter(item => filter === 'hero' ? item.type === 'jewelry' : item.type === 'pet_accessory');

    const handleBuy = (item: Item) => {
        const cost = item.cost.diamonds || 0;
        if (diamonds < cost || invStore.ownsMarketplaceItem(item.id)) return;
        spendDiamonds(cost);
        invStore.purchaseMarketplaceItem(item.id);
    };

    return (
        <StoreLayout
            storeName="Jeweler's Workshop"
            storeIcon="💎"
            storeColor="#e879f9"
            onClose={onClose}
            glowPoints={[
                { x: 30, y: 25, color: '#e879f9', intensity: 1.4 },
                { x: 70, y: 30, color: '#38bdf8', intensity: 1.0 },
                { x: 50, y: 60, color: '#f59e0b', intensity: 0.8 },
            ]}
        >
            {/* Gem Balance */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                background: 'rgba(232,121,249,0.08)',
                border: '1px solid rgba(232,121,249,0.2)',
                borderRadius: '0.75rem',
                marginBottom: '1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Gem size={18} style={{ color: '#e879f9' }} />
                    Your Gems
                </div>
                <span style={{ color: '#e879f9', fontWeight: 700, fontSize: '1.1rem' }}>💎 {diamonds}</span>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.25rem',
                marginBottom: '1rem',
                background: 'rgba(15,23,42,0.5)',
                borderRadius: '0.5rem',
                padding: '0.2rem',
            }}>
                {(['all', 'hero', 'pet'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            borderRadius: '0.4rem',
                            background: filter === f ? 'rgba(232,121,249,0.15)' : 'transparent',
                            color: filter === f ? '#e2e8f0' : '#64748b',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {f === 'all' ? '🏪 All' : f === 'hero' ? '⚔️ Hero' : '🐾 Pet'}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.75rem',
            }}>
                {filteredItems.map(item => {
                    const owned = invStore.ownsMarketplaceItem(item.id);
                    const cost = item.cost.diamonds || 0;
                    const canAfford = diamonds >= cost;
                    const rarityColor = RARITY_COLORS[item.rarity || 'common'];

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={!owned ? { scale: 1.02, y: -4 } : {}}
                            style={{
                                background: 'rgba(15,23,42,0.7)',
                                border: `1px solid ${owned ? 'rgba(52,211,153,0.3)' : `${rarityColor}33`}`,
                                borderLeft: `3px solid ${rarityColor}`,
                                borderRadius: '0.75rem',
                                padding: '0.85rem',
                                opacity: !canAfford && !owned ? 0.5 : 1,
                                cursor: !owned && canAfford ? 'pointer' : 'default',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{
                                    fontSize: '1.8rem',
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `${rarityColor}15`,
                                    borderRadius: '0.5rem',
                                    flexShrink: 0,
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 700 }}>
                                            {item.name}
                                        </h3>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '0.25rem',
                                            background: `${rarityColor}20`,
                                            color: rarityColor,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                        }}>
                                            {item.rarity}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0.2rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {item.description}
                                    </p>
                                    {/* Stat bonuses */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                        {item.stats?.attack && (
                                            <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>+{item.stats.attack} ATK</span>
                                        )}
                                        {item.stats?.defense && (
                                            <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>+{item.stats.defense} DEF</span>
                                        )}
                                        {item.stats?.hp && (
                                            <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>+{item.stats.hp} HP</span>
                                        )}
                                        {item.type === 'pet_accessory' && (
                                            <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 600 }}>🐾 Pet Cosmetic</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                                {owned ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        color: '#34d399',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                    }}>
                                        <Check size={16} /> Owned
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={!canAfford}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            padding: '0.4rem 0.8rem',
                                            background: canAfford ? 'linear-gradient(135deg, #e879f9, #a855f7)' : 'rgba(30,41,59,0.6)',
                                            color: canAfford ? 'white' : '#475569',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            cursor: canAfford ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        💎 {cost}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Info Section */}
            <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(148,163,184,0.08)',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                color: '#94a3b8',
                lineHeight: 1.6,
            }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    <Crown size={14} style={{ marginBottom: -2 }} /> About Jewelry
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    <li><strong>Hero jewelry</strong> gives permanent stat bonuses (ATK, DEF, HP)</li>
                    <li><strong>Pet jewelry</strong> adds cosmetic flair to your companion</li>
                    <li>Gems are earned through daily check-ins and special achievements</li>
                    <li>Higher rarity items provide stronger bonuses</li>
                </ul>
            </div>
        </StoreLayout>
    );
};
