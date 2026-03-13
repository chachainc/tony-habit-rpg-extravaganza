import { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore, ITEM_DB, type ShopCategory, type ItemDef } from '../../store/useInventoryStore';
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

export const ShopModal = ({ category, onClose }: Props) => {
    const { currency, addCurrency } = useGameStore();
    const { addItem, equipItem } = useInventoryStore();
    const [view, setView] = useState<'shop' | 'gacha'>('shop');

    // Filter items by category
    const shopItems = Object.values(ITEM_DB).filter(
        (i) => i.shopCategory === category && i.price > 0
    );

    const handleBuy = (item: ItemDef) => {
        if (currency >= item.price) {
            addCurrency(-item.price);
            addItem(item.id);
        } else {
            alert("Not enough coins!");
        }
    };

    const handleBuyAndEquip = (item: ItemDef) => {
        if (currency >= item.price) {
            addCurrency(-item.price);
            addItem(item.id);
            // Auto-equip based on type
            if (item.type === 'weapon') equipItem(item.id, 'weapon');
            if (item.type === 'armor') equipItem(item.id, 'armor');
        } else {
            alert("Not enough coins!");
        }
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
                    <h2>{view === 'shop' ? SHOP_TITLES[category] : '🔮 Void Summon'}</h2>
                    <div className="header-actions">
                        <button
                            className={`tab-btn ${view === 'shop' ? 'active' : ''}`}
                            onClick={() => setView('shop')}
                        >Shop</button>
                        <button
                            className={`tab-btn ${view === 'gacha' ? 'active' : ''}`}
                            onClick={() => setView('gacha')}
                        >Summon</button>
                        <button onClick={onClose}><X /></button>
                    </div>
                </div>

                {view === 'gacha' ? (
                    <GachaMachine onClose={() => setView('shop')} />
                ) : (
                    <>
                        <div className="shop-balance">
                            <Coins className="text-yellow" /> {currency}
                        </div>

                        <div className="shop-grid">
                            {shopItems.map((item) => (
                                <div key={item.id} className={`shop-item rarity-${item.rarity}`}>
                                    <div className="item-icon">{item.icon}</div>
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
                                            className="buy-btn"
                                            onClick={() => handleBuy(item)}
                                            disabled={currency < item.price}
                                        >
                                            {item.price} <Coins size={12} />
                                        </button>
                                        {(item.type === 'weapon' || item.type === 'armor') && (
                                            <button
                                                className="equip-btn"
                                                onClick={() => handleBuyAndEquip(item)}
                                                disabled={currency < item.price}
                                            >
                                                Buy & Equip
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
