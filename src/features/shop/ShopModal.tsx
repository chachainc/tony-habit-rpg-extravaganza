import { useState } from 'react';
import { X, Coins, Heart, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore, ITEM_DB, type ShopCategory, type ItemDef } from '../../store/useInventoryStore';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
import { useMarketLoyaltyStore } from '../../store/useMarketLoyaltyStore';
import { GachaMachine } from './GachaMachine';
import './ShopModal.css';

interface Props {
    category: ShopCategory;
    onClose: () => void;
}

const SHOP_TITLES: Record<ShopCategory, string> = {
    blacksmith: '🗡️ Blacksmith',
    armory: '🛡️ Armory',
    jeweler: '💎 Jeweler',
    first_aid: '⚕️ First Aid',
    general: '🏪 General Store',
    furniture: '🪑 Furniture Store',
    library: '📚 Library',
};

// Map shop categories to store IDs for loyalty tracking
const CATEGORY_TO_STORE: Record<ShopCategory, string> = {
    blacksmith: 'weapon-store',
    armory: 'armor-store',
    jeweler: 'jewelry-store',
    first_aid: 'hospital',
    general: 'pet-store',
    furniture: 'furniture-store',
    library: 'spell-store',
};

const SELLBACK_RATE = 0.4; // 40% of original price

export const ShopModal = ({ category, onClose }: Props) => {
    const { currency, addCurrency } = useGameStore();
    const { addItem, equipItem, items, removeItem } = useInventoryStore();
    const loyalty = useMarketLoyaltyStore();
    const [view, setView] = useState<'shop' | 'gacha' | 'sell'>('shop');

    const storeId = CATEGORY_TO_STORE[category];
    const loyaltyTier = loyalty.getLoyaltyTier(storeId);
    const loyaltyDiscount = loyaltyTier.discountPercent;

    const rawDiscount = useGameStore.getState().getWorkDiscount(); // Base skill discount
    const equipDiscount = getPassiveBonuses().gold_multiplier ?? 0; // Item discount
    const discountPercent = Math.min(50, rawDiscount + equipDiscount + loyaltyDiscount); // Hard cap at 50%
    const discountMult = 1 - (discountPercent / 100);

    // Filter items by category
    const shopItems = Object.values(ITEM_DB).filter(
        (i) => i.shopCategory === category && i.price > 0
    );

    // Items owned that can be sold (from this category)
    const ownedItems = Object.entries(items)
        .filter(([id, count]) => count > 0 && ITEM_DB[id]?.shopCategory === category && ITEM_DB[id]?.price > 0)
        .map(([id, count]) => ({ item: ITEM_DB[id], count }));

    const handleBuy = (item: ItemDef) => {
        const cost = Math.max(1, Math.floor(item.price * discountMult));
        
        if (item.type === 'furniture') {
            console.log("Furniture purchase tapped");
            console.log("Item ID:", item.id);
            console.log("Current gold:", currency);
        }

        if (currency >= cost) {
            addCurrency(-cost);
            addItem(item.id);
            loyalty.recordPurchase(storeId);
            
            if (item.type === 'furniture') {
                console.log("Success reason: Enough gold, purchase successful.");
                import('../../store/useRoomStore').then(({ useRoomStore }) => {
                    useRoomStore.getState().purchaseRoomFurniture(item.id);
                });
            }
        } else {
            if (item.type === 'furniture') {
                console.log("Fail reason: Not enough gold.");
            }
            alert("Not enough coins!");
        }
    };

    const handleBuyAndEquip = (item: ItemDef) => {
        const cost = Math.max(1, Math.floor(item.price * discountMult));
        if (currency >= cost) {
            addCurrency(-cost);
            addItem(item.id);
            loyalty.recordPurchase(storeId);
            if (item.type === 'weapon') equipItem(item.id, 'weapon');
            if (item.type === 'armor') equipItem(item.id, 'armor');
        } else {
            alert("Not enough coins!");
        }
    };

    const handleSell = (item: ItemDef) => {
        // Sell at 40% of what you'd pay (discounted price), not list price
        const discountedCost = Math.max(1, Math.floor(item.price * discountMult));
        const sellPrice = Math.max(1, Math.floor(discountedCost * SELLBACK_RATE));
        removeItem(item.id, 1);
        addCurrency(sellPrice);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-content shop-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <div className="modal-header">
                    <h2>{view === 'shop' ? SHOP_TITLES[category] : view === 'sell' ? '💰 Sell Items' : '🔮 Void Summon'}</h2>
                    <div className="header-actions">
                        <button
                            className={`tab-btn ${view === 'shop' ? 'active' : ''}`}
                            onClick={() => setView('shop')}
                        >Shop</button>
                        <button
                            className={`tab-btn ${view === 'sell' ? 'active' : ''}`}
                            onClick={() => setView('sell')}
                        ><ArrowLeftRight size={12} /> Sell</button>
                        <button
                            className={`tab-btn ${view === 'gacha' ? 'active' : ''}`}
                            onClick={() => setView('gacha')}
                        >Summon</button>
                        <button onClick={onClose}><X /></button>
                    </div>
                </div>

                {/* Loyalty info bar */}
                {loyaltyTier.stars > 0 && (
                    <div className="shop-loyalty-bar">
                        {'⭐'.repeat(loyaltyTier.stars)} {loyaltyTier.name} — {loyaltyDiscount}% loyalty discount
                    </div>
                )}

                {view === 'gacha' ? (
                    <GachaMachine onClose={() => setView('shop')} />
                ) : view === 'sell' ? (
                    <>
                        <div className="shop-balance">
                            <Coins className="text-yellow" /> {currency}
                        </div>
                        <div className="shop-grid">
                            {ownedItems.length === 0 ? (
                                <div className="shop-empty">
                                    <p>No items to sell from this store.</p>
                                </div>
                            ) : (
                                ownedItems.map(({ item, count }) => {
                                    const sellPrice = Math.max(1, Math.floor(item.price * SELLBACK_RATE));
                                    return (
                                        <div key={item.id} className={`shop-item rarity-${item.rarity}`}>
                                            <div className="item-icon">{item.icon}</div>
                                            <div className="item-details">
                                                <h3>{item.name} <span className="sell-count">×{count}</span></h3>
                                                <p className="item-effect">Sell for {sellPrice} gold</p>
                                            </div>
                                            <div className="item-actions">
                                                <button
                                                    className="buy-btn sell-btn"
                                                    onClick={() => handleSell(item)}
                                                >
                                                    +{sellPrice} <Coins size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="shop-balance">
                            <Coins className="text-yellow" /> {currency}
                        </div>

                        <div className="shop-grid">
                            {shopItems.map((item) => {
                                const wishlisted = loyalty.isWishlisted(item.id);
                                return (
                                    <div key={item.id} className={`shop-item rarity-${item.rarity}`}>
                                        <div className="item-icon">
                                            {item.icon}
                                            <button
                                                className={`wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); loyalty.toggleWishlist(item.id); }}
                                                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                            >
                                                <Heart size={12} fill={wishlisted ? '#ef4444' : 'none'} />
                                            </button>
                                        </div>
                                        <div className="item-details">
                                            <h3>{item.name}</h3>
                                            <p className="item-effect">
                                                {item.type === 'weapon' ? `ATK +${item.value} | Crit ${Math.round((item.critChance || 0) * 100)}%` :
                                                    item.type === 'armor' ? `DEF +${item.value}` :
                                                        item.type === 'potion' ? `Heal +${item.value}` :
                                                            item.type === 'furniture' ? `+${item.value} Max HP` :
                                                                `Effect: +${item.value}`}
                                            </p>
                                            {item.description && <p className="item-desc">{item.description}</p>}
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                className={`buy-btn ${currency < Math.max(1, Math.floor(item.price * discountMult)) ? 'cannot-afford' : ''}`}
                                                onClick={() => handleBuy(item)}
                                            >
                                                {discountPercent > 0 ? (
                                                    <div className="discounted-price-container">
                                                        <span className="original-price" style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.85em', marginRight: '4px' }}>
                                                            {item.price}
                                                        </span>
                                                        <span className="discounted-price" style={{ color: '#ef4444' }}>
                                                            {Math.max(1, Math.floor(item.price * discountMult))}
                                                        </span>
                                                        <Coins size={12} style={{ marginLeft: '4px' }} />
                                                        <span className="discount-tag" style={{ color: '#ef4444', fontSize: '0.8em', marginLeft: '4px' }}>
                                                            (-{discountPercent}%)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {item.price} <Coins size={12} />
                                                    </>
                                                )}
                                            </button>
                                            {(item.type === 'weapon' || item.type === 'armor') && (
                                                <button
                                                    className={`equip-btn ${currency < Math.max(1, Math.floor(item.price * discountMult)) ? 'cannot-afford' : ''}`}
                                                    onClick={() => handleBuyAndEquip(item)}
                                                >
                                                    Buy & Equip
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
