import { useEffect } from 'react';
import { Coins, PackageOpen } from 'lucide-react';
import { useShopStore } from '../../../store/useShopStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useInventoryStore, ITEM_DB } from '../../../store/useInventoryStore';
import { useToastStore } from '../../../components/ui/Toast';
import './DailyShop.css';

interface DailyShopProps {
    onClose: () => void;
}

export const DailyShop = ({ onClose }: DailyShopProps) => {
    const shop = useShopStore();
    const currency = useCurrencyStore();
    const addItem = useInventoryStore(state => state.addItem);
    const addToast = useToastStore(state => state.addToast);

    useEffect(() => {
        shop.restockShop();
    }, []);

    const handlePurchase = (shopItemId: string, itemDefId: string, price: number) => {
        if (currency.gold < price) {
            addToast({ type: 'error', message: "Not enough gold!" });
            return;
        }

        const success = shop.purchaseItem(shopItemId);
        if (success) {
            currency.spendGold(price);
            addItem(itemDefId, 1);

            const def = ITEM_DB[itemDefId];
            addToast({
                type: 'success',
                message: `Purchased: ${def?.icon || '📦'} ${def?.name}`,
            });
        }
    };

    return (
        <div className="store-modal-overlay">
            <div className="store-modal-content daily-shop-modal">
                <button className="store-close-btn" onClick={onClose}>×</button>

                <div className="store-header">
                    <h2><PackageOpen className="inline-icon" /> Daily Specialties</h2>
                    <p>Rare imports rotating daily. What you see is what you get.</p>
                </div>

                <div className="store-currency">
                    <span><Coins size={16} /> {currency.gold}</span>
                </div>

                <div className="daily-shop-inventory">
                    {shop.currentStock.map(si => {
                        const def = ITEM_DB[si.itemDefId];
                        if (!def) return null;

                        return (
                            <div key={si.id} className={`daily-shop-item ${si.purchased ? 'purchased' : ''}`}>
                                <div className={`item-icon-wrapper rarity-${def.rarity || 'common'}`}>
                                    <span className="item-icon">{def.icon || '📦'}</span>
                                </div>
                                <div className="item-details">
                                    <h3>{def.name}</h3>
                                    <span className="item-type">{def.type}</span>
                                    {def.effect && <span className="item-effect">{def.effect}</span>}
                                    {def.description && <p className="item-desc">{def.description}</p>}
                                </div>
                                <div className="item-actions">
                                    <button
                                        className="purchase-btn"
                                        onClick={() => handlePurchase(si.id, def.id, si.price)}
                                        disabled={si.purchased || currency.gold < si.price}
                                    >
                                        {si.purchased ? 'Sold Out' : (
                                            <><Coins size={14} /> {si.price}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {shop.currentStock.length === 0 && (
                        <div className="empty-shop">
                            <p>The merchant has nothing to sell today.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
