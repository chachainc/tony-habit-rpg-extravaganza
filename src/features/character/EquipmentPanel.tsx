import React, { useState } from 'react';
import { useInventoryStore, ITEM_DB, type EquipmentSlot } from '../../store/useInventoryStore';
import { useGachaStore, PET_DB } from '../../store/useGachaStore';
import { Sword, Shield, Gem, Sparkles, Dog, X } from 'lucide-react';
import './EquipmentPanel.css';

const SLOT_CONFIG: Record<EquipmentSlot, { label: string; icon: React.ReactNode; emptyText: string }> = {
    weapon: { label: 'Weapon', icon: <Sword size={16} />, emptyText: 'No Weapon' },
    armor: { label: 'Armor', icon: <Shield size={16} />, emptyText: 'No Armor' },
    relic: { label: 'Relic', icon: <Gem size={16} />, emptyText: 'No Relic' },
    artifact: { label: 'Artifact', icon: <Sparkles size={16} />, emptyText: 'No Artifact' },
    pet: { label: 'Companion', icon: <Dog size={16} />, emptyText: 'No Pet' }
};

export const EquipmentPanel = () => {
    const inventory = useInventoryStore();
    const gacha = useGachaStore();
    const [activeModalSlot, setActiveModalSlot] = useState<EquipmentSlot | null>(null);

    const handleEquip = (itemId: string, slot: EquipmentSlot) => {
        inventory.equipItem(itemId, slot);
        setActiveModalSlot(null);
    };

    const handleUnequip = (slot: EquipmentSlot) => {
        inventory.unequipItem(slot);
        setActiveModalSlot(null);
    };

    const getAvailableItemsForSlot = (slot: EquipmentSlot) => {
        if (slot === 'pet') {
            return gacha.ownedPets.map(id => ({
                id,
                name: PET_DB[id]?.name || 'Unknown Pet',
                icon: PET_DB[id]?.icon || '🐾',
                rarity: PET_DB[id]?.rarity || 'common',
                effect: `Passive: ${PET_DB[id]?.passiveBonus?.type || 'none'}`,
                description: PET_DB[id]?.description
            }));
        }

        return Object.entries(inventory.items)
            .filter(([id, quantity]) => quantity > 0 && ITEM_DB[id] && ITEM_DB[id].type === slot)
            .map(([id]) => {
                const item = ITEM_DB[id];
                return {
                    id,
                    name: item.name,
                    icon: item.icon,
                    rarity: item.rarity,
                    effect: item.effect || (item.value ? `+${item.value} Base Stat` : 'No combat effect'),
                    description: item.description
                };
            });
    };

    const renderSlotCard = (slot: EquipmentSlot) => {
        const equippedId = inventory.equipped[slot];
        const config = SLOT_CONFIG[slot];

        let displayItem = null;
        if (equippedId) {
            if (slot === 'pet') {
                displayItem = PET_DB[equippedId];
            } else {
                displayItem = ITEM_DB[equippedId];
            }
        }

        return (
            <div
                key={slot}
                className={`equipment-slot-card ${displayItem ? `rarity-${displayItem.rarity}` : 'empty'}`}
                onClick={() => setActiveModalSlot(slot)}
            >
                <div className="slot-header">
                    {config.icon}
                    <span>{config.label}</span>
                </div>
                <div className="slot-content">
                    {displayItem ? (
                        <>
                            <div className="slot-icon">{displayItem.icon}</div>
                            <div className="slot-name">{displayItem.name}</div>
                        </>
                    ) : (
                        <div className="slot-empty-text">{config.emptyText}</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="equipment-panel">
            <h3><Shield size={18} /> Active Equipment</h3>
            <p className="equipment-desc">Equip items to gain passive bonuses across all combat modes.</p>

            <div className="equipment-grid">
                {(Object.keys(SLOT_CONFIG) as EquipmentSlot[]).map(renderSlotCard)}
            </div>

            {activeModalSlot && (
                <div className="equipment-modal-overlay" onClick={() => setActiveModalSlot(null)}>
                    <div className="equipment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Equip {SLOT_CONFIG[activeModalSlot].label}</h4>
                            <button className="close-btn" onClick={() => setActiveModalSlot(null)}><X size={18} /></button>
                        </div>

                        <div className="available-items">
                            <button
                                className="item-row unequip-row"
                                onClick={() => handleUnequip(activeModalSlot)}
                            >
                                <div className="item-icon-wrapper">❌</div>
                                <div className="item-info">
                                    <span className="item-name">Unequip Current</span>
                                </div>
                            </button>

                            {getAvailableItemsForSlot(activeModalSlot).map(item => (
                                <button
                                    key={item.id}
                                    className={`item-row rarity-${item.rarity} ${inventory.equipped[activeModalSlot] === item.id ? 'equipped' : ''}`}
                                    onClick={() => handleEquip(item.id, activeModalSlot)}
                                >
                                    <div className="item-icon-wrapper">{item.icon}</div>
                                    <div className="item-info">
                                        <div className="item-header-row">
                                            <span className="item-name">{item.name}</span>
                                            {inventory.equipped[activeModalSlot] === item.id && <span className="equipped-badge">Equipped</span>}
                                        </div>
                                        <span className="item-effect">{item.effect}</span>
                                        {item.description && <span className="item-desc">{item.description}</span>}
                                    </div>
                                </button>
                            ))}

                            {getAvailableItemsForSlot(activeModalSlot).length === 0 && (
                                <div className="no-items-msg">
                                    You don't own any {activeModalSlot}s yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
