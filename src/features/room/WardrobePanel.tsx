import { useState, useMemo } from 'react';
import { Shirt, Sword, Sparkles, Star, X, Heart } from 'lucide-react';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useEquipmentStore, EQUIPMENT_DB, type EquipmentRarity } from '../../store/useEquipmentStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useTitleStore } from '../../store/useTitleStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

const RARITY_COLORS: Record<EquipmentRarity, string> = {
    common: 'rgba(148,163,184,0.35)',
    rare: 'rgba(96,165,250,0.4)',
    epic: 'rgba(167,139,250,0.4)',
    legendary: 'rgba(251,191,36,0.4)',
};

const RARITY_GLOW: Record<EquipmentRarity, string> = {
    common: 'none',
    rare: '0 0 8px rgba(96,165,250,0.3)',
    epic: '0 0 12px rgba(167,139,250,0.35)',
    legendary: '0 0 16px rgba(251,191,36,0.4)',
};

export const WardrobePanel = ({ onClose }: { onClose: () => void }) => {
    const [closetTab, setClosetTab] = useState<'outfits' | 'weapons' | 'auras' | 'titles'>('outfits');
    const [favorites, setFavorites] = useState<string[]>([]);

    const { equipped, ownedCosmetics, equipItem: equipCosmetic } = useCharacterStore();
    const { equippedWeapon, equippedArmor, equippedAccessory, ownedEquipment, equipItem: equipGear, getEquipmentBonuses } = useEquipmentStore();
    const { activeAuraId, unlockedAuras, setActiveAura } = useAuraStore();
    const { activeTitle, unlockedTitles, setActiveTitle, getUnlockedTitleDefs } = useTitleStore();

    const ownedOutfitItems = useMemo(() => ownedCosmetics.map(id => COSMETICS_DB[id]).filter(Boolean), [ownedCosmetics]);
    const ownedGearItems = useMemo(() => {
        const items = ownedEquipment.map(id => EQUIPMENT_DB[id]).filter(Boolean);
        // Sort: favorites first, then by rarity (legendary > epic > rare > common)
        const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
        return items.sort((a, b) => {
            const aFav = favorites.includes(a.id) ? -1 : 0;
            const bFav = favorites.includes(b.id) ? -1 : 0;
            if (aFav !== bFav) return aFav - bFav;
            return (rarityOrder[a.rarity] ?? 4) - (rarityOrder[b.rarity] ?? 4);
        });
    }, [ownedEquipment, favorites]);

    const unlockedAuraItems = useMemo(() => AURAS.filter(a => unlockedAuras.includes(a.id)), [unlockedAuras]);
    const unlockedTitleDefs = useMemo(() => getUnlockedTitleDefs(), [unlockedTitles, getUnlockedTitleDefs]);

    const bonuses = getEquipmentBonuses();
    const toggleFav = (id: string) =>
        setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

    // Check set bonus: all 3 slots filled = +5% XP
    const hasFullSet = equippedWeapon && equippedArmor && equippedAccessory;

    return (
        <Panel variant="glass" className="room-panel wardrobe-panel">
            <div className="panel-header">
                <h2>🧥 Traveler's Closet</h2>
                <button className="panel-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <p className="panel-subtitle">Customize your appearance and gear</p>

            {/* Stats preview bar */}
            <div className="wardrobe-stats-bar">
                <span className="wardrobe-stat">⚔️ ATK +{bonuses.atk}</span>
                <span className="wardrobe-stat">🛡️ DEF +{bonuses.def}</span>
                <span className="wardrobe-stat">❤️ HP +{bonuses.hp}</span>
                {hasFullSet && <span className="wardrobe-stat wardrobe-stat--set">🔮 Full Set +5% XP</span>}
            </div>

            <div className="panel-tabs">
                <button className={`panel-tab ${closetTab === 'outfits' ? 'active' : ''}`} onClick={() => setClosetTab('outfits')}>
                    <Shirt size={16} /> Outfits
                </button>
                <button className={`panel-tab ${closetTab === 'weapons' ? 'active' : ''}`} onClick={() => setClosetTab('weapons')}>
                    <Sword size={16} /> Gear
                </button>
                <button className={`panel-tab ${closetTab === 'auras' ? 'active' : ''}`} onClick={() => setClosetTab('auras')}>
                    <Sparkles size={16} /> Auras
                </button>
                <button className={`panel-tab ${closetTab === 'titles' ? 'active' : ''}`} onClick={() => setClosetTab('titles')}>
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

                    {closetTab === 'weapons' && ownedGearItems.length > 0 && ownedGearItems.map(item => {
                        const isEquipped = equippedWeapon === item.id || equippedArmor === item.id || equippedAccessory === item.id;
                        const isFav = favorites.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                className={`selection-item ${isEquipped ? 'equipped' : ''}`}
                                style={{
                                    borderColor: RARITY_COLORS[item.rarity],
                                    boxShadow: RARITY_GLOW[item.rarity],
                                }}
                                onClick={() => equipGear(item.id)}
                            >
                                <button
                                    className={`wardrobe-fav-btn ${isFav ? 'wardrobe-fav-btn--active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleFav(item.id); }}
                                >
                                    <Heart size={12} fill={isFav ? '#f87171' : 'none'} />
                                </button>
                                <span className="item-icon">{item.icon}</span>
                                <span>{item.name}</span>
                                <small className={`rarity-label rarity-${item.rarity}`}>{item.rarity}</small>
                                <small className="gear-stats-preview">
                                    {item.atkBonus > 0 && `⚔️${item.atkBonus} `}
                                    {item.defBonus > 0 && `🛡️${item.defBonus} `}
                                    {item.hpBonus > 0 && `❤️${item.hpBonus}`}
                                </small>
                            </button>
                        );
                    })}
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
