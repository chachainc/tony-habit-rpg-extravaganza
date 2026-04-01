import React, { useState } from 'react';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useConquestStore } from '../../store/useConquestStore';
import { Heart, Zap, Gamepad2, Utensils, Gift, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ITEM_DATABASE } from '../../data/items';
import { SharedFusionPanel } from '../fusion/SharedFusionPanel';
import './PetPage.css';

const showFloatingFeedback = (text: string, type: 'xp' | 'gold' = 'xp') => {
    const el = document.createElement('div');
    el.className = `floating-feedback floating-feedback--${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
};

const FEED_COST = 10;
const PLAY_COOLDOWN_HOURS = 12;

const DAILY_ITEMS = [
    { name: 'Bone Fragment', icon: '🦴', chance: 0.4 },
    { name: 'Shiny Pebble', icon: '💎', chance: 0.2 },
    { name: 'Feather', icon: '🪶', chance: 0.25 },
    { name: 'Lucky Clover', icon: '🍀', chance: 0.1 },
    { name: 'Gold Nugget', icon: '🪙', chance: 0.05 },
];

const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
import petBearImg from '../../assets/pets/pet_bear.jpg';

const PET_IMAGES: Record<string, string> = {
    // Marketplace/shop pets — use their dedicated image assets for the Pet page display
    ethereal_cow: etherealCowImg,
    // Battle-system companion pets — map to their sprite art
    spirit_fox: emberfoxImg,
    cyber_dog: stormPupImg,
    ancient_owl: clockworkOwlImg,
    pixel_cat: bloomSpriteImg,
    cosmic_turtle: mossGolemImg,
    pet_porcupine: obsidianBeetleImg, // battle sprite (shop pet uses items.ts image)
    dragon_hatchling: lanternSlimeImg,
    pet_wolf: voidlingImg,
    pet_bear: petBearImg,
};

export const PetPage = () => {
    const { equippedPetId, name, health, hunger, mood, energy, feed, play } = usePetStore();
    const { items, removeItem } = useInventoryStore();
    const gold = useCurrencyStore(s => s.gold);

    const [lastFed, setLastFed] = useState<string | null>(null);
    const [lastPlayedTs, setLastPlayedTs] = useState<number | null>(null);
    const [droppedItem, setDroppedItem] = useState<{ name: string; icon: string } | null>(null);
    const [feedAnim, setFeedAnim] = useState(false);
    const [playAnim, setPlayAnim] = useState(false);

    // ── Sub-tab state ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'pets' | 'fusion'>('pets');

    // Get active pet data from database
    const petItem = equippedPetId ? ITEM_DATABASE[equippedPetId] : null;
    const petDef = equippedPetId ? PET_DATABASE[equippedPetId] : null;
    const petSprite = petItem?.icon || '🐮'; // Fallback emoji
    const petImage = equippedPetId ? PET_IMAGES[equippedPetId] : undefined; // AI-generated image if available

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
        }
        removeItem(itemId);
    };

    const today = getTodayStr();
    const canFeed = gold >= FEED_COST && lastFed !== today;
    const hoursSincePlay = lastPlayedTs ? (Date.now() - lastPlayedTs) / 3600000 : PLAY_COOLDOWN_HOURS;
    const canPlay = hoursSincePlay >= PLAY_COOLDOWN_HOURS;

    const handleFeed = React.useCallback(() => {
        if (gold < FEED_COST || lastFed === getTodayStr()) return;
        useCurrencyStore.getState().spendGold(FEED_COST);

        // Give 1 random rare resource instead of gold
        const roll = Math.random();
        let rewardLabel = '';
        if (roll < 0.33) {
            useConquestStore.getState().addSigils(1);
            rewardLabel = '🔱 +1 Sigil!';
        } else if (roll < 0.66) {
            useCurrencyStore.getState().addBalloons(1);
            rewardLabel = '🎈 +1 Balloon!';
        } else {
            useCurrencyStore.getState().addShmeckles(1);
            rewardLabel = '🐌 +1 Shmeckle!';
        }

        setLastFed(getTodayStr());
        setFeedAnim(true);
        showFloatingFeedback(rewardLabel, 'gold');
        setTimeout(() => setFeedAnim(false), 1000);
    }, [gold, lastFed]);

    const handlePlay = React.useCallback(() => {
        if (lastPlayedTs && (Date.now() - lastPlayedTs) / 3600000 < PLAY_COOLDOWN_HOURS) return;
        const reward = 5 + Math.floor(Math.random() * 15);
        useCurrencyStore.getState().addGold(reward, { exact: true });
        
        setLastPlayedTs(Date.now());
        setPlayAnim(true);
        showFloatingFeedback(`+${reward}g`, 'gold');

        const roll = Math.random();
        let cum = 0;
        for (const item of DAILY_ITEMS) {
            cum += item.chance;
            if (roll < cum) { setDroppedItem(item); break; }
        }
        setTimeout(() => { setPlayAnim(false); setDroppedItem(null); }, 3000);
    }, [lastPlayedTs]);

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
                                <Card className={`pet-display-card ${feedAnim ? 'pet-anim-feed' : ''} ${playAnim ? 'pet-anim-play' : ''}`}>
                                    {petImage ? (
                                        <img src={petImage} alt={name} className="pet-image-large" />
                                    ) : (
                                        <div className="pet-sprite-large">{petSprite}</div>
                                    )}
                                    <h2 className="pet-name">{name}</h2>
                                    {petItem && <p className="pet-type">{petItem.name}</p>}
                                </Card>

                                <div className="pet-direct-actions">
                                    <button
                                        className={`pet-action-btn pet-action-btn--feed ${!canFeed ? 'disabled' : ''}`}
                                        onClick={handleFeed}
                                        disabled={!canFeed}
                                    >
                                        <Heart size={20} />
                                        <span>Feed</span>
                                        <small>{FEED_COST}g • Nice job! 🐾</small>
                                        {lastFed === today && <span className="pet-action-done">✅ Fed today</span>}
                                    </button>

                                    <button
                                        className={`pet-action-btn pet-action-btn--play ${!canPlay ? 'disabled' : ''}`}
                                        onClick={handlePlay}
                                        disabled={!canPlay}
                                    >
                                        <Sparkles size={20} />
                                        <span>Play</span>
                                        <small>5-20g + item</small>
                                        {!canPlay && <span className="pet-action-cooldown">⏳ {Math.ceil(PLAY_COOLDOWN_HOURS - hoursSincePlay)}h left</span>}
                                    </button>
                                </div>
                                {droppedItem && (
                                    <div className="pet-item-drop" style={{ marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <Gift size={16} color="#fbbf24" />
                                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>Found: {droppedItem.icon} {droppedItem.name}!</span>
                                    </div>
                                )}
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

                            {/* RIGHT COLUMN: Ability Summary */}
                            <div className="pet-column-player">
                                {petDef?.passive && (
                                    <Card className="ability-card">
                                        <h3>Passive Ability</h3>
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
