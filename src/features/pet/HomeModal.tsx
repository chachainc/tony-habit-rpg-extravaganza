import { X, Heart, Zap, Gamepad2, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePetStore } from '../../store/usePetStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useDayStore } from '../../store/useDayStore';
import { useRoomStore } from '../../store/useRoomStore';
import { ITEM_DATABASE } from '../../data/items';
import './HomeModal.css';

interface Props { onClose: () => void }

export const HomeModal = ({ onClose }: Props) => {
    const { equippedPetId, name, health, hunger, mood, energy, feed, play } = usePetStore();
    const { items, removeItem } = useInventoryStore();
    const { playerCurrentHP, playerMaxHP, heal } = useDayStore();
    const roomBonuses = useRoomStore((s) => s.getRoomCombatBonuses());
    const effectiveMaxHP = playerMaxHP + roomBonuses.maxHP;

    // Get active pet data from database
    const petData = ITEM_DATABASE[equippedPetId];
    const petSprite = petData?.icon || '🐮'; // Fallback to cow

    // Get owned furniture
    const ownedFurniture = Object.entries(items)
        .filter(([id]) => ITEM_DB[id]?.type === 'furniture')
        .map(([id, count]) => ({ ...ITEM_DB[id], count }));

    // Get usable items (food/toys/potions)
    const usableItems = Object.entries(items)
        .filter(([id]) => {
            const item = ITEM_DB[id];
            return item && (item.type === 'food' || item.type === 'toy' || item.type === 'potion');
        });

    const handleUseItem = (itemId: string) => {
        const itemDef = ITEM_DB[itemId];
        if (!itemDef) return;

        if (itemDef.type === 'food') {
            feed(itemDef.value);
        } else if (itemDef.type === 'toy') {
            play(itemDef.value);
        } else if (itemDef.type === 'potion') {
            heal(itemDef.value);
        }
        removeItem(itemId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-content home-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="modal-header">
                    <h2>🏠 {name}'s Room</h2>
                    <button onClick={onClose}><X /></button>
                </div>

                {/* ROOM VIEW */}
                <div className="room-container">
                    {/* Room Background */}
                    <div className="room-floor">
                        {/* Furniture Display */}
                        <div className="furniture-grid">
                            {ownedFurniture.length === 0 ? (
                                <p className="empty-room-msg">Your room is empty! Visit the Furniture Store.</p>
                            ) : (
                                ownedFurniture.map((item) => (
                                    <div key={item.id} className="placed-furniture" title={item.name}>
                                        <span className="furniture-icon">{item.icon}</span>
                                        {item.count > 1 && <span className="furniture-count">x{item.count}</span>}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pet in the room */}
                        <div className="room-pet">
                            <div className="pet-sprite">{petSprite}</div>
                            <span className="pet-name">{name}</span>
                        </div>
                    </div>
                </div>

                {/* STATS PANEL */}
                <div className="stats-panel">
                    <div className="player-hp">
                        <span>Your HP</span>
                        <div className="hp-bar-mini">
                            <div className="hp-fill" style={{ width: `${(playerCurrentHP / effectiveMaxHP) * 100}%` }}></div>
                            <span>{playerCurrentHP}/{effectiveMaxHP}</span>
                        </div>
                    </div>

                    <div className="pet-stats">
                        <div className="stat-row">
                            <Heart size={14} className="icon-red" />
                            <div className="stat-bar"><div className="fill red" style={{ width: `${health}%` }}></div></div>
                        </div>
                        <div className="stat-row">
                            <Utensils size={14} className="icon-orange" />
                            <div className="stat-bar"><div className="fill orange" style={{ width: `${hunger}%` }}></div></div>
                        </div>
                        <div className="stat-row">
                            <Gamepad2 size={14} className="icon-blue" />
                            <div className="stat-bar"><div className="fill blue" style={{ width: `${mood}%` }}></div></div>
                        </div>
                        <div className="stat-row">
                            <Zap size={14} className="icon-yellow" />
                            <div className="stat-bar"><div className="fill yellow" style={{ width: `${energy}%` }}></div></div>
                        </div>
                    </div>
                </div>

                {/* INVENTORY / ITEMS */}
                <div className="inventory-section">
                    <h3>Items</h3>
                    <div className="inventory-grid">
                        {usableItems.length === 0 ? (
                            <p className="empty-text">No items. Buy some from the shops!</p>
                        ) : (
                            usableItems.map(([id, count]) => {
                                const itemDef = ITEM_DB[id];
                                return (
                                    <button key={id} className="inv-item-btn" onClick={() => handleUseItem(id)} title={itemDef.name}>
                                        <div className="inv-icon">{itemDef.icon}</div>
                                        <span className="inv-count">x{count}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
