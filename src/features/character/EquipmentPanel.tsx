import React, { useState } from 'react';
import { useInventoryStore, ITEM_DB, type EquipmentSlot, type ItemDef, formatStatBonuses, getStatDelta } from '../../store/useInventoryStore';
import { PET_DATABASE } from '../../data/pets';
import { usePetStore } from '../../store/usePetStore';
import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
import { Sword, Shield, Gem, Sparkles, Dog, X, BookOpen, Gem as JewelIcon, Badge, Shirt, HardHat, Grab, Footprints, Flame, Navigation } from 'lucide-react';
import './EquipmentPanel.css';

const SLOT_CONFIG: Record<EquipmentSlot, { label: string; icon: React.ReactNode; emptyText: string }> = {
    weapon:   { label: 'Weapon',    icon: <Sword size={16} />,    emptyText: 'No Weapon' },
    armor:    { label: 'Armor',     icon: <Shield size={16} />,   emptyText: 'No Armor' },
    head:     { label: 'Head',      icon: <HardHat size={16} />,  emptyText: 'No Headgear' },
    chest:    { label: 'Chest',     icon: <Shirt size={16} />,    emptyText: 'No Chest Armor' },
    hands:    { label: 'Hands',     icon: <Grab size={16} />,     emptyText: 'No Gloves' },
    legs:     { label: 'Legs',      icon: <Flame size={16} />,    emptyText: 'No Pants' },
    feet:     { label: 'Feet',      icon: <Footprints size={16} />, emptyText: 'No Boots' },
    cloak:    { label: 'Cloak',     icon: <Navigation size={16} />, emptyText: 'No Cloak' },
    relic:    { label: 'Relic',     icon: <Gem size={16} />,      emptyText: 'No Relic' },
    artifact: { label: 'Artifact',  icon: <Sparkles size={16} />, emptyText: 'No Artifact' },
    pet:      { label: 'Companion', icon: <Dog size={16} />,      emptyText: 'No Pet' },
    pet_accessory: { label: 'Pet Accessory', icon: <Badge size={16} />, emptyText: 'No Pet Accessory' },
    book:     { label: 'Book',      icon: <BookOpen size={16} />, emptyText: 'No Book' },
    jewelry:  { label: 'Jewelry',   icon: <JewelIcon size={16} />,emptyText: 'No Jewelry' },
};

// Ordered slot display — logical pairing
const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'cloak', 'armor', 'jewelry', 'relic', 'artifact', 'book', 'pet', 'pet_accessory'];

interface DisplayItem {
    id: string;
    name: string;
    icon: string;
    rarity: string;
    effectText: string;
    description?: string;
    itemDef?: ItemDef | null;
}

const isImageUrl = (s: string) => s && (s.startsWith('/') || s.startsWith('http') || s.startsWith('data:image/'));

export const EquipmentPanel = () => {
    const inventory = useInventoryStore();
    const petStore = usePetStore();
    const heroImage = usePlayerAvatar();
    const [activeModalSlot, setActiveModalSlot] = useState<EquipmentSlot | null>(null);

    const handleEquip = (itemId: string, slot: EquipmentSlot) => {
        if (slot === 'pet') {
            petStore.equipPet(itemId);
        } else {
            inventory.equipItem(itemId, slot);
        }
        setActiveModalSlot(null);
    };

    const handleUnequip = (slot: EquipmentSlot) => {
        if (slot === 'pet') {
            petStore.unequipPet();
        } else {
            inventory.unequipItem(slot);
        }
        setActiveModalSlot(null);
    };

    const getAvailableItemsForSlot = (slot: EquipmentSlot): (DisplayItem & { isLocked?: boolean })[] => {
        if (slot === 'pet') {
            const allPets = Object.keys(PET_DATABASE);
            return allPets.map(id => ({
                id,
                name: PET_DATABASE[id]?.name || 'Unknown Pet',
                icon: PET_DATABASE[id]?.image || PET_DATABASE[id]?.icon || '🐾',
                rarity: PET_DATABASE[id]?.rarity || 'common',
                effectText: `Passive: ${PET_DATABASE[id]?.passive?.name || 'none'} — ${PET_DATABASE[id]?.passive?.description || ''}`,
                description: undefined,
                itemDef: null,
                isLocked: !petStore.ownedPets.includes(id),
            })).sort((a, b) => Number(a.isLocked) - Number(b.isLocked));
        }

        // Match items in inventory to the slot's accepted ItemType
        const slotTypeMap: Partial<Record<EquipmentSlot, string>> = {
            weapon: 'weapon',
            armor: 'armor',
            relic: 'relic',
            artifact: 'artifact',
            pet_accessory: 'pet_accessory',
            book: 'book',
            jewelry: 'jewelry',
        };
        const requiredType = slotTypeMap[slot];

        // Ensure we show ALL items of this type from the DB, and track locking
        const allItemsOfType = Object.keys(ITEM_DB).filter(id => ITEM_DB[id].type === requiredType);

        return allItemsOfType.map(id => {
            const item = ITEM_DB[id];
            const quantity = inventory.items[id] || 0;
            const effectText = item.statBonuses
                ? formatStatBonuses(item.statBonuses)
                : (item.effect || (item.value ? `+${item.value} Base Stat` : 'No combat effect'));
            return {
                id,
                name: item.name,
                icon: item.image || item.icon,
                rarity: item.rarity,
                effectText,
                description: item.description,
                itemDef: item,
                isLocked: quantity <= 0,
            };
        }).sort((a, b) => Number(a.isLocked) - Number(b.isLocked)); // Unlocked first
    };

    const getEquippedDisplayItem = (slot: EquipmentSlot): DisplayItem | null => {
        const equippedId = inventory.equipped[slot];
        if (!equippedId) return null;

        if (slot === 'pet') {
            const petId = petStore.equippedPetId;
            if (!petId) return null;
            const pet = PET_DATABASE[petId];
            if (!pet) return null;
            return {
                id: petId,
                name: pet.name,
                icon: pet.image || pet.icon,
                rarity: pet.rarity,
                effectText: `Passive: ${pet.passive?.name || 'none'} — ${pet.passive?.description || ''}`,
                description: undefined,
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
            icon: item.image || item.icon,
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
                            <div className="slot-icon">
                                {isImageUrl(displayItem.icon) ? (
                                    <img src={displayItem.icon} alt={displayItem.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                ) : (
                                    displayItem.icon
                                )}
                            </div>
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
                                const isLocked = item.isLocked;
                                return (
                                    <button
                                        key={item.id}
                                        className={`item-row rarity-${item.rarity} ${isEquipped ? 'equipped' : ''} ${isLocked ? 'locked' : ''}`}
                                        onClick={() => !isLocked && handleEquip(item.id, activeModalSlot)}
                                        disabled={isLocked}
                                        style={{ opacity: isLocked ? 0.5 : 1, filter: isLocked ? 'grayscale(100%)' : 'none', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                                    >
                                        <div className="item-icon-wrapper">
                                            {isImageUrl(item.icon) ? (
                                                <img src={item.icon} alt={item.name} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                                            ) : (
                                                item.icon
                                            )}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-header-row">
                                                <span className="item-name">{item.name}</span>
                                                {isEquipped && <span className="equipped-badge">Equipped</span>}
                                                {isLocked && <span className="locked-badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: '#334155', color: '#94a3b8', borderRadius: '4px', marginLeft: 'auto' }}>🔒 Locked</span>}
                                            </div>
                                            <span className="item-effect">{item.effectText}</span>
                                            {!isEquipped && !isLocked && renderStatDelta(item.itemDef ?? null, activeModalSlot)}
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
