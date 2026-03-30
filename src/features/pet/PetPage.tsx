import { useState } from 'react';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useDayStore } from '../../store/useDayStore';
import { useRoomStore } from '../../store/useRoomStore';
import { Heart, Zap, Gamepad2, Utensils } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ITEM_DATABASE } from '../../data/items';
import { SharedFusionPanel } from '../fusion/SharedFusionPanel';
import './PetPage.css';

// AI-generated pet images
import etherealCowImg from '../../assets/pets/ethereal_cow.png';
import emberfoxImg from '../../assets/pets/emberfox.png';
import stormPupImg from '../../assets/pets/storm_pup.png';
import clockworkOwlImg from '../../assets/pets/clockwork_owl.png';
import bloomSpriteImg from '../../assets/pets/bloom_sprite.png';
import mossGolemImg from '../../assets/pets/moss_golem.png';
import obsidianBeetleImg from '../../assets/pets/obsidian_beetle.png';
import lanternSlimeImg from '../../assets/pets/lantern_slime.png';
import voidlingImg from '../../assets/pets/voidling.png';

const PET_IMAGES: Record<string, string> = {
    ethereal_cow: etherealCowImg,
    spirit_fox: emberfoxImg,
    cyber_dog: stormPupImg,
    pet_dog: stormPupImg,
    ancient_owl: clockworkOwlImg,
    pixel_cat: bloomSpriteImg,
    cosmic_turtle: mossGolemImg,
    pet_porcupine: obsidianBeetleImg,
    dragon_hatchling: lanternSlimeImg,
    pet_wolf: voidlingImg,
};

export const PetPage = () => {
    const { activePet, name, health, hunger, mood, energy, feed, play } = usePetStore();
    const { items, removeItem } = useInventoryStore();
    const { playerCurrentHP, playerMaxHP, heal } = useDayStore();
    const getRoomCombatBonuses = useRoomStore((s) => s.getRoomCombatBonuses);
    const roomBonuses = getRoomCombatBonuses();
    const effectiveMaxHP = playerMaxHP + roomBonuses.maxHP;

    // ── Sub-tab state ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'pets' | 'fusion'>('pets');

    // Get active pet data from database
    const petItem = ITEM_DATABASE[activePet];
    const petDef = PET_DATABASE[activePet];
    const petSprite = petItem?.icon || '🐮'; // Fallback emoji
    const petImage = PET_IMAGES[activePet]; // AI-generated image if available

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
        <div className="pet-page">
            {/* Background Layers */}
            <div className="pet-bg">
                <div className="pet-bg__image" />
                <div className="pet-bg__vignette" />
                <div className="pet-bg__fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>
                <div className="pet-bg__fireflies">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="firefly"
                            style={{
                                left: `${Math.random() * 100}%`,
                                bottom: `${Math.random() * 60}%`,
                                animationDelay: `${Math.random() * 6}s`,
                                animationDuration: `${4 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Wrapper */}
            <div className="pet-content-wrapper">

                {/* ── Sub-tab Toggle ──────────────────────────────────────── */}
                <div className="pet-sub-tabs">
                    <button
                        className={`pet-sub-tab ${activeTab === 'pets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pets')}
                    >
                        🐾 Pets
                    </button>
                    <button
                        className={`pet-sub-tab ${activeTab === 'fusion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fusion')}
                    >
                        🧬 Fusion
                    </button>
                </div>

                {/* ── FUSION VIEW ─────────────────────────────────────────── */}
                {activeTab === 'fusion' && <SharedFusionPanel mode="pet" />}

                {/* ── PETS VIEW (existing content) ────────────────────────── */}
                {activeTab === 'pets' && (
                    <>
                        <div className="page-header">
                            <h1>{petImage ? '' : petSprite} {name}</h1>
                            <p className="subtitle">Your loyal companion</p>
                        </div>

                        <div className="pet-content">
                            {/* LEFT COLUMN: Pet Profile */}
                            <div className="pet-column-profile">
                                <Card className="pet-display-card">
                                    {petImage ? (
                                        <img src={petImage} alt={name} className="pet-image-large" />
                                    ) : (
                                        <div className="pet-sprite-large">{petSprite}</div>
                                    )}
                                    <h2 className="pet-name">{name}</h2>
                                    {petItem && <p className="pet-type">{petItem.name}</p>}
                                </Card>
                            </div>

                            {/* MIDDLE COLUMN: Pet Stats */}
                            <div className="pet-column-stats">
                                <Card className="pet-stats-card">
                                    <h3>Pet Status</h3>
                                    <div className="stat-grid">
                                        <div className="stat-item">
                                            <div className="stat-header">
                                                <Heart size={18} className="icon-red" />
                                                <span>Health</span>
                                            </div>
                                            <div className="stat-bar">
                                                <div className="fill red" style={{ width: `${health}%` }}></div>
                                            </div>
                                            <span className="stat-value">{health}%</span>
                                        </div>

                                        <div className="stat-item">
                                            <div className="stat-header">
                                                <Utensils size={18} className="icon-orange" />
                                                <span>Hunger</span>
                                            </div>
                                            <div className="stat-bar">
                                                <div className="fill orange" style={{ width: `${hunger}%` }}></div>
                                            </div>
                                            <span className="stat-value">{hunger}%</span>
                                        </div>

                                        <div className="stat-item">
                                            <div className="stat-header">
                                                <Gamepad2 size={18} className="icon-blue" />
                                                <span>Mood</span>
                                            </div>
                                            <div className="stat-bar">
                                                <div className="fill blue" style={{ width: `${mood}%` }}></div>
                                            </div>
                                            <span className="stat-value">{mood}%</span>
                                        </div>

                                        <div className="stat-item">
                                            <div className="stat-header">
                                                <Zap size={18} className="icon-yellow" />
                                                <span>Energy</span>
                                            </div>
                                            <div className="stat-bar">
                                                <div className="fill yellow" style={{ width: `${energy}%` }}></div>
                                            </div>
                                            <span className="stat-value">{energy}%</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* RIGHT COLUMN: Your HP + Ability */}
                            <div className="pet-column-player">
                                <Card className="player-hp-card">
                                    <h3>Your HP</h3>
                                    <div className="hp-display">
                                        <div className="hp-bar-large">
                                            <div className="hp-fill" style={{ width: `${(playerCurrentHP / effectiveMaxHP) * 100}%` }}></div>
                                        </div>
                                        <span className="hp-text">{playerCurrentHP}/{effectiveMaxHP}</span>
                                    </div>
                                </Card>

                                {petDef?.passive && (
                                    <Card className="ability-card">
                                        <h3>Ability</h3>
                                        <div className="pet-passive">
                                            <span className="passive-label">{petDef.passive.name}</span>
                                            <p className="passive-desc">{petDef.passive.description}</p>
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* Inventory (Full Width at Bottom) */}
                            <Card className="inventory-card">
                                <h3>Items</h3>
                                <div className="inventory-grid">
                                    {usableItems.length === 0 ? (
                                        <p className="empty-text">No items. Buy some from the shops!</p>
                                    ) : (
                                        usableItems.map(([id, count]) => {
                                            const itemDef = ITEM_DB[id];
                                            return (
                                                <button
                                                    key={id}
                                                    className="inv-item-btn"
                                                    onClick={() => handleUseItem(id)}
                                                    title={itemDef.name}
                                                >
                                                    <div className="inv-icon">{itemDef.icon}</div>
                                                    <span className="inv-name">{itemDef.name}</span>
                                                    <span className="inv-count">x{count}</span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
