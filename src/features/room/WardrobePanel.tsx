import { useState, useMemo } from 'react';
import { Shirt, Sword, Sparkles, Star, X } from 'lucide-react';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../store/useEquipmentStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useTitleStore } from '../../store/useTitleStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css'; // Shared CSS for room panels

export const WardrobePanel = ({ onClose }: { onClose: () => void }) => {
    const [closetTab, setClosetTab] = useState<'outfits' | 'weapons' | 'auras' | 'titles'>('outfits');

    const { equipped, ownedCosmetics, equipItem: equipCosmetic } = useCharacterStore();
    const { equippedWeapon, equippedArmor, equippedAccessory, ownedEquipment, equipItem: equipGear } = useEquipmentStore();
    const { activeAuraId, unlockedAuras, setActiveAura } = useAuraStore();
    const { activeTitle, unlockedTitles, setActiveTitle, getUnlockedTitleDefs } = useTitleStore();

    // Group items for display
    const ownedOutfitItems = useMemo(() => ownedCosmetics.map(id => COSMETICS_DB[id]).filter(Boolean), [ownedCosmetics]);
    const ownedGearItems = useMemo(() => ownedEquipment.map(id => EQUIPMENT_DB[id]).filter(Boolean), [ownedEquipment]);
    const unlockedAuraItems = useMemo(() => AURAS.filter(a => unlockedAuras.includes(a.id)), [unlockedAuras]);
    const unlockedTitleDefs = useMemo(() => getUnlockedTitleDefs(), [unlockedTitles, getUnlockedTitleDefs]);

    return (
        <Panel variant="glass" className="room-panel wardrobe-panel">
            <div className="panel-header">
                <h2>🧥 Traveler's Closet</h2>
                <button className="panel-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <p className="panel-subtitle">Customize your appearance and gear</p>

            {/* Tabs */}
            <div className="panel-tabs">
                <button
                    className={`panel-tab ${closetTab === 'outfits' ? 'active' : ''}`}
                    onClick={() => setClosetTab('outfits')}
                >
                    <Shirt size={16} /> Outfits
                </button>
                <button
                    className={`panel-tab ${closetTab === 'weapons' ? 'active' : ''}`}
                    onClick={() => setClosetTab('weapons')}
                >
                    <Sword size={16} /> Gear
                </button>
                <button
                    className={`panel-tab ${closetTab === 'auras' ? 'active' : ''}`}
                    onClick={() => setClosetTab('auras')}
                >
                    <Sparkles size={16} /> Auras
                </button>
                <button
                    className={`panel-tab ${closetTab === 'titles' ? 'active' : ''}`}
                    onClick={() => setClosetTab('titles')}
                >
                    <Star size={16} /> Titles
                </button>
            </div>

            <div className="panel-content-scrollable">
                <div className="closet-selection-grid">
                    {closetTab === 'outfits' && ownedOutfitItems.length > 0 && ownedOutfitItems.map(item => (
                        <button
                            key={item.id}
                            className={`selection-item ${equipped[item.slot] === item.id ? 'equipped' : ''}`}
                            onClick={() => equipCosmetic(item.slot, item.id)}
                        >
                            <div className="item-color-preview" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                    {closetTab === 'outfits' && ownedOutfitItems.length === 0 && (
                        <p className="empty-msg">No extra outfits owned.</p>
                    )}

                    {closetTab === 'weapons' && ownedGearItems.length > 0 && ownedGearItems.map(item => (
                        <button
                            key={item.id}
                            className={`selection-item ${equippedWeapon === item.id || equippedArmor === item.id || equippedAccessory === item.id ? 'equipped' : ''}`}
                            onClick={() => equipGear(item.id)}
                        >
                            <span className="item-icon">{item.icon}</span>
                            <span>{item.name}</span>
                        </button>
                    ))}
                    {closetTab === 'weapons' && ownedGearItems.length === 0 && (
                        <p className="empty-msg">No gear owned.</p>
                    )}

                    {closetTab === 'auras' && unlockedAuraItems.map(item => (
                        <button
                            key={item.id}
                            className={`selection-item ${activeAuraId === item.id ? 'equipped' : ''}`}
                            onClick={() => setActiveAura(item.id)}
                        >
                            <span className="item-icon">{item.icon}</span>
                            <div className="aura-preview-dot" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                            {item.bonus && <small className="bonus-tag">+{Math.round(item.bonus.value * 100)}% {item.bonus.type}</small>}
                        </button>
                    ))}

                    {closetTab === 'titles' && (
                        <>
                            <button
                                className={`selection-item ${activeTitle === null ? 'equipped' : ''}`}
                                onClick={() => setActiveTitle(null)}
                            >
                                <span>None</span>
                            </button>
                            {unlockedTitleDefs.map(item => (
                                <button
                                    key={item.id}
                                    className={`selection-item ${activeTitle === item.id ? 'equipped' : ''}`}
                                    onClick={() => setActiveTitle(item.id)}
                                >
                                    <span className="item-icon">{item.icon}</span>
                                    <span>{item.name}</span>
                                    <small className="bonus-tag">+{Math.round(item.bonus.value * 100)}% {item.bonus.type}</small>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </Panel>
    );
};
