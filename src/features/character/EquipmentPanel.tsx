import React, { useState } from 'react';
import { useInventoryStore, ITEM_DB, type EquipmentSlot, type ItemDef, formatStatBonuses, getStatDelta } from '../../store/useInventoryStore';
import { useGachaStore, PET_DB } from '../../store/useGachaStore';
import { useHeroImage } from '../../hooks/useHeroImage';
import { Sword, Shield, Gem, Sparkles, Dog, X, BookOpen, Gem as JewelIcon } from 'lucide-react';
import './EquipmentPanel.css';

const SLOT_CONFIG: Record<EquipmentSlot, { label: string; icon: React.ReactNode; emptyText: string }> = {
    weapon:   { label: 'Weapon',    icon: <Sword size={16} />,    emptyText: 'No Weapon' },
    armor:    { label: 'Armor',     icon: <Shield size={16} />,   emptyText: 'No Armor' },
    relic:    { label: 'Relic',     icon: <Gem size={16} />,      emptyText: 'No Relic' },
    artifact: { label: 'Artifact',  icon: <Sparkles size={16} />, emptyText: 'No Artifact' },
    pet:      { label: 'Companion', icon: <Dog size={16} />,      emptyText: 'No Pet' },
    book:     { label: 'Book',      icon: <BookOpen size={16} />, emptyText: 'No Book' },
    jewelry:  { label: 'Jewelry',   icon: <JewelIcon size={16} />,emptyText: 'No Jewelry' },
};

// Ordered slot display — logical pairing
const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'armor', 'jewelry', 'relic', 'artifact', 'book', 'pet'];

interface DisplayItem {
    id: string;
    name: string;
    icon: string;
    rarity: string;
    effectText: string;
    description?: string;
    itemDef?: ItemDef | null;
}

export const EquipmentPanel = () => {
    const inventory = useInventoryStore();
    const gacha = useGachaStore();
    const heroImage = useHeroImage();
    const [activeModalSlot, setActiveModalSlot] = useState<EquipmentSlot | null>(null);

    const handleEquip = (itemId: string, slot: EquipmentSlot) => {
        inventory.equipItem(itemId, slot);
        setActiveModalSlot(null);
    };

    const handleUnequip = (slot: EquipmentSlot) => {
        inventory.unequipItem(slot);
        setActiveModalSlot(null);
    };

    const getAvailableItemsForSlot = (slot: EquipmentSlot): DisplayItem[] => {
        if (slot === 'pet') {
            return gacha.ownedPets.map(id => ({
                id,
                name: PET_DB[id]?.name || 'Unknown Pet',
                icon: PET_DB[id]?.icon || '🐾',
                rarity: PET_DB[id]?.rarity || 'common',
                effectText: `Passive: ${PET_DB[id]?.passiveBonus?.type || 'none'}`,
                description: PET_DB[id]?.description,
                itemDef: null,
            }));
        }

        // Match items in inventory to the slot's accepted ItemType
        const slotTypeMap: Partial<Record<EquipmentSlot, string>> = {
            weapon: 'weapon',
            armor: 'armor',
            relic: 'relic',
            artifact: 'artifact',
            book: 'book',
            jewelry: 'jewelry',
        };
        const requiredType = slotTypeMap[slot];

        return Object.entries(inventory.items)
            .filter(([id, quantity]) => quantity > 0 && ITEM_DB[id] && ITEM_DB[id].type === requiredType)
            .map(([id]) => {
                const item = ITEM_DB[id];
                const effectText = item.statBonuses
                    ? formatStatBonuses(item.statBonuses)
                    : (item.effect || (item.value ? `+${item.value} Base Stat` : 'No combat effect'));
                return {
                    id,
                    name: item.name,
                    icon: item.icon,
                    rarity: item.rarity,
                    effectText,
                    description: item.description,
                    itemDef: item,
                };
            });
    };

    const getEquippedDisplayItem = (slot: EquipmentSlot): DisplayItem | null => {
        const equippedId = inventory.equipped[slot];
        if (!equippedId) return null;

        if (slot === 'pet') {
            const pet = PET_DB[equippedId];
            if (!pet) return null;
            return {
                id: equippedId,
                name: pet.name,
                icon: pet.icon,
                rarity: pet.rarity,
                effectText: `Passive: ${pet.passiveBonus?.type || 'none'}`,
                description: pet.description,
                itemDef: null,
            };
        }

        const item = ITEM_DB[equippedId];
        if (!item) return null;
        const effectText = item.statBonuses
            ? formatStatBonuses(item.statBonuses)
            : (item.effect || (item.value ? `+${item.value} Base Stat` : ''));
        return {
            id: equippedId,
            name: item.name,
            icon: item.icon,
            rarity: item.rarity,
            effectText,
            description: item.description,
            itemDef: item,
        };
    };

    const renderStatDelta = (newItemDef: ItemDef | null | undefined, slot: EquipmentSlot) => {
        if (!newItemDef?.statBonuses) return null;
        const currentItemDef = inventory.getEquippedItemForSlot(slot);
        const delta = getStatDelta(newItemDef, currentItemDef);

        const parts: { label: string; delta: number }[] = [
            { label: 'ATK', delta: delta.attack ?? 0 },
            { label: 'DEF', delta: delta.defense ?? 0 },
            { label: 'HP', delta: delta.hp ?? 0 },
            { label: 'Crit', delta: delta.crit ?? 0 },
            { label: 'XP%', delta: delta.xpMultiplier ?? 0 },
            { label: 'Gold%', delta: delta.goldMultiplier ?? 0 },
            { label: 'INT', delta: delta.intelligence ?? 0 },
        ].filter(p => p.delta !== 0);

        if (parts.length === 0) return null;

        return (
            <div className="stat-delta-row">
                {parts.map(p => (
                    <span key={p.label} className={`delta-badge ${p.delta > 0 ? 'positive' : 'negative'}`}>
                        {p.delta > 0 ? '+' : ''}{p.delta} {p.label}
                    </span>
                ))}
            </div>
        );
    };

    const renderSlotCard = (slot: EquipmentSlot) => {
        const displayItem = getEquippedDisplayItem(slot);
        const config = SLOT_CONFIG[slot];

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
                            {displayItem.effectText && (
                                <div className="slot-bonus-summary">{displayItem.effectText}</div>
                            )}
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

            <div className="equipment-stage">
                <img className="player-backdrop" src={heroImage} alt="Player Backdrop" />
                <div className="equipment-grid">
                    {SLOT_ORDER.map(renderSlotCard)}
                </div>
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

                            {getAvailableItemsForSlot(activeModalSlot).map(item => {
                                const isEquipped = inventory.equipped[activeModalSlot] === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        className={`item-row rarity-${item.rarity} ${isEquipped ? 'equipped' : ''}`}
                                        onClick={() => handleEquip(item.id, activeModalSlot)}
                                    >
                                        <div className="item-icon-wrapper">{item.icon}</div>
                                        <div className="item-info">
                                            <div className="item-header-row">
                                                <span className="item-name">{item.name}</span>
                                                {isEquipped && <span className="equipped-badge">Equipped</span>}
                                            </div>
                                            <span className="item-effect">{item.effectText}</span>
                                            {!isEquipped && renderStatDelta(item.itemDef ?? null, activeModalSlot)}
                                            {item.description && <span className="item-desc">{item.description}</span>}
                                        </div>
                                    </button>
                                );
                            })}

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
