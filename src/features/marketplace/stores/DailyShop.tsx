import { useEffect, useState } from 'react';
import { Coins, PackageOpen, Hammer, Gem } from 'lucide-react';
import { useShopStore } from '../../../store/useShopStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useInventoryStore, ITEM_DB } from '../../../store/useInventoryStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../../store/useEquipmentStore';
import { useRoomStore, ROOM_FURNITURE_CATALOG } from '../../../store/useRoomStore';
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
    
    const { ownedEquipment, equipmentLevels, upgradeEquipment } = useEquipmentStore();
    const { ownedRoomFurniture, purchaseRoomFurniture } = useRoomStore();
    
    const [tab, setTab] = useState<'shop' | 'forge' | 'decor'>('shop');

    useEffect(() => {
        shop.restockShop();
    }, []);

    const handlePurchase = (shopItemId: string, itemDefId: string, price: number) => {
        // Daily Deals currently use Gold 
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

    const getUpgradeCost = (level: number) => {
        return Math.floor(Math.pow(level + 1, 2) * 500);
    };

    const handleReforge = (eqId: string) => {
        const level = equipmentLevels[eqId] || 0;
        const cost = getUpgradeCost(level);
        
        if (currency.gold < cost) {
            addToast({ type: 'error', message: "Not enough gold to reforge!" });
            return;
        }
        
        currency.spendGold(cost);
        const success = upgradeEquipment(eqId);
        if (success) {
            const item = EQUIPMENT_DB[eqId];
            addToast({
                type: 'success',
                message: `${item.icon} ${item.name} upgraded to +${level + 1}!`,
            });
        }
    };

    return (
        <div className="store-modal-overlay">
            <div className="store-modal-content daily-shop-modal">
                <button className="store-close-btn" onClick={onClose}>×</button>

                <div className="store-header">
                    <h2><PackageOpen className="inline-icon" /> Daily Specialties & Forge</h2>
                    <p>Rare imports rotating daily, or reforge your equipment.</p>
                </div>

                <div className="store-tabs" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                    <button 
                        onClick={() => setTab('shop')}
                        style={{ background: tab === 'shop' ? '#3b82f6' : 'transparent', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Daily Deals
                    </button>
                    <button 
                        onClick={() => setTab('forge')}
                        style={{ background: tab === 'forge' ? '#f59e0b' : 'transparent', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <Hammer size={16} className="inline-icon"/> The Forge
                    </button>
                    <button 
                        onClick={() => setTab('decor')}
                        style={{ background: tab === 'decor' ? '#10b981' : 'transparent', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <Gem size={16} className="inline-icon"/> Room Decor
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center', background: '#0f172a', padding: '0.25rem 0.75rem', borderRadius: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                            <Coins size={16} /> {currency.gold}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f472b6' }}>
                            <Gem size={16} /> {currency.diamonds}
                        </span>
                    </div>
                </div>

                {tab === 'shop' && (
                    <div className="daily-shop-inventory" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                )}

                {tab === 'forge' && (
                    <div className="forge-inventory" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
                        {ownedEquipment.length === 0 ? (
                            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8' }}>You don't own any equipment to reforge yet.</p>
                        ) : (
                            ownedEquipment.map(id => {
                                const item = EQUIPMENT_DB[id];
                                if (!item) return null;
                                const level = equipmentLevels[id] || 0;
                                const cost = getUpgradeCost(level);
                                const levelMult = 1 + (level * 0.10);

                                return (
                                    <div key={id} style={{ display: 'flex', flexDirection: 'column', background: '#1e293b', border: `1px solid ${level > 0 ? '#fbbf24' : '#334155'}`, borderRadius: '8px', padding: '1rem', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                                <strong style={{ color: level > 0 ? '#fbbf24' : '#fff' }}>{item.name} {level > 0 ? `+${level}` : ''}</strong>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: '#0f172a', borderRadius: '12px', color: '#cbd5e1' }}>{item.slot}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                            ATK: {Math.floor(item.atkBonus * levelMult)} | DEF: {Math.floor(item.defBonus * levelMult)} | HP: {Math.floor(item.hpBonus * levelMult)}
                                        </div>
                                        <button 
                                            onClick={() => handleReforge(id)}
                                            style={{ marginTop: 'auto', background: currency.gold >= cost ? '#f59e0b' : '#334155', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: currency.gold >= cost ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                                            disabled={currency.gold < cost}
                                        >
                                            <Hammer size={14} /> Reforge (<Coins size={12}/> {cost})
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
                
                {tab === 'decor' && (
                    <div className="daily-shop-inventory" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {ROOM_FURNITURE_CATALOG.filter(d => d.gemCost).map(def => {
                            const isOwned = ownedRoomFurniture.includes(def.id);
                            
                            return (
                                <div key={def.id} className={`daily-shop-item ${isOwned ? 'purchased' : ''}`}>
                                    <div className={`item-icon-wrapper rarity-${def.rarity || 'common'}`}>
                                        <span className="item-icon">{def.icon}</span>
                                    </div>
                                    <div className="item-details">
                                        <h3>{def.name}</h3>
                                        <span className="item-type">Room Furniture</span>
                                        <span className="item-effect">{def.bonusLabel}</span>
                                        {def.description && <p className="item-desc">{def.description}</p>}
                                    </div>
                                    <div className="item-actions">
                                        <button
                                            className="purchase-btn"
                                            onClick={() => {
                                                if (currency.diamonds < def.gemCost!) {
                                                    addToast({ type: 'error', message: "Not enough diamonds!" });
                                                    return;
                                                }
                                                const success = purchaseRoomFurniture(def.id);
                                                if (success) {
                                                    currency.spendDiamonds(def.gemCost!);
                                                    addToast({ type: 'success', message: `Purchased: ${def.icon} ${def.name}` });
                                                }
                                            }}
                                            disabled={isOwned || currency.diamonds < def.gemCost!}
                                            style={(!isOwned && currency.diamonds >= def.gemCost!) ? { background: '#f472b6', color: '#831843' } : {}}
                                        >
                                            {isOwned ? 'Owned' : (
                                                <><Gem size={14} /> {def.gemCost}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
