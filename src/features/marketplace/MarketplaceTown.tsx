import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { useMarketLoyaltyStore } from '../../store/useMarketLoyaltyStore';
import { useGameStore } from '../../store/useGameStore';
import { MARKETPLACE_LAYOUT, isWalkable, canInteractWithStore } from '../../data/marketplace-layout';
import { HospitalStore } from './stores/HospitalStore';
import { ArmorStore } from './stores/ArmorStore';
import { PetShop } from './stores/PetShop';
import { WeaponStore } from './stores/WeaponStore';
import { SpellStore } from './stores/SpellStore';
import { ShopModal } from '../shop/ShopModal';
import { JewelryStore } from './stores/JewelryStore';

import { SceneShell } from '../../components/scene';
import marketplaceNightBg from '../../assets/backgrounds/marketplace_night.png';
import { useHeroImage } from '../../hooks/useHeroImage';
import armorSignboard from '../../assets/signboards/armor.png';
import weaponSignboard from '../../assets/signboards/weapon.png';
import petSignboard from '../../assets/signboards/pet.png';
import furnitureSignboard from '../../assets/signboards/furniture.png';
import hospitalSignboard from '../../assets/signboards/hospital.png';
import spellSignboard from '../../assets/signboards/spell.png';
import './MarketplaceTown.css';

// Signboard images mapping for stores
const SIGNBOARD_MAP: Record<string, string> = {
    'armor-store': armorSignboard,
    'weapon-store': weaponSignboard,
    'pet-store': petSignboard,
    'furniture-store': furnitureSignboard,
    'hospital': hospitalSignboard,
    'spell-store': spellSignboard,
};

export const MarketplaceTown = () => {
    const heroImage = useHeroImage();
    const navigate = useNavigate();
    const { playerPosition, setPlayerPosition, activeStore, openStore, closeStore } = useMarketplaceStore();
    const loyalty = useMarketLoyaltyStore();
    const currency = useGameStore(s => s.currency);
    const addCurrency = useGameStore(s => s.addCurrency);
    const [nearbyStore, setNearbyStore] = useState<string | null>(null);
    const [showMerchant, setShowMerchant] = useState(false);
    const isMerchantDay = loyalty.isMerchantDay();

    // Restock merchant on mount
    useEffect(() => {
        if (isMerchantDay) loyalty.restockMerchant();
    }, []);

    // Movement keys state
    const keysPressed = useRef<Set<string>>(new Set());

    // Grid Tap-To-Move Handler
    const handleGridTap = (e: React.MouseEvent) => {
        if (activeStore) return;

        const gridContainer = e.currentTarget;
        const rect = gridContainer.getBoundingClientRect();

        // Ensure click/tap is inside the grid
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const scale = rect.width / (MARKETPLACE_LAYOUT.gridSize.width * MARKETPLACE_LAYOUT.tileSize);
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;

            const gridX = Math.floor(clientX / (MARKETPLACE_LAYOUT.tileSize * scale));
            const gridY = Math.floor(clientY / (MARKETPLACE_LAYOUT.tileSize * scale));

            const boundedX = Math.max(0, Math.min(MARKETPLACE_LAYOUT.gridSize.width - 1, gridX));
            const boundedY = Math.max(0, Math.min(MARKETPLACE_LAYOUT.gridSize.height - 1, gridY));

            if (isWalkable(boundedX, boundedY, MARKETPLACE_LAYOUT)) {
                setPlayerPosition(boundedX, boundedY);
            }
        }
    };

    // Handle keyboard movement
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                e.preventDefault();
                keysPressed.current.add(key);
            }

            // Interact key
            if (key === 'e' && nearbyStore && !activeStore) {
                openStore(nearbyStore);
            }

            // Escape to close store
            if (key === 'escape' && activeStore) {
                closeStore();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            keysPressed.current.delete(key);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [nearbyStore, activeStore, openStore, closeStore]);

    // Movement loop
    useEffect(() => {
        // Don't move if a store is open
        if (activeStore) return;

        const intervalId = setInterval(() => {
            let dx = 0;
            let dy = 0;

            // Check pressed keys
            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= 1;
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += 1;
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= 1;
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += 1;

            // Apply movement if any
            if (dx !== 0 || dy !== 0) {
                const newX = playerPosition.x + dx;
                const newY = playerPosition.y + dy;

                if (isWalkable(newX, newY, MARKETPLACE_LAYOUT)) {
                    setPlayerPosition(newX, newY);
                }
            }
        }, 150); // Move every 150ms

        return () => clearInterval(intervalId);
    }, [playerPosition, setPlayerPosition, activeStore]);

    // Check if near any store
    useEffect(() => {
        let foundStore: string | null = null;

        for (const store of MARKETPLACE_LAYOUT.stores) {
            if (canInteractWithStore(playerPosition.x, playerPosition.y, store)) {
                foundStore = store.id;
                break;
            }
        }

        setNearbyStore(foundStore);
    }, [playerPosition]);

    const handleExit = () => {
        navigate('/');
    };

    const nearbyStoreData = nearbyStore
        ? MARKETPLACE_LAYOUT.stores.find(s => s.id === nearbyStore)
        : null;

    // Lantern glow positions based on the background art
    const glowPoints = [
        { x: 18, y: 15, color: '#ff9933', intensity: 1.2 },  // Left lantern
        { x: 82, y: 12, color: '#ff9933', intensity: 1.2 },  // Right lantern
        { x: 50, y: 20, color: '#ffaa44', intensity: 0.8 },  // Background lanterns
    ];

    return (
        <>
            <SceneShell
                backgroundImage={marketplaceNightBg}
                showFog={true}
                showVignette={true}
                showEmbers={false}
                glowPoints={glowPoints}
            >
                <div className="marketplace-town marketplace-town--with-shell">

                    {/* Exit button */}
                    <button className="marketplace-exit-btn" onClick={handleExit}>
                        <X size={24} />
                        Exit Marketplace
                    </button>

                    {/* Codex button */}
                    <button
                        className="marketplace-codex-btn"
                        onClick={() => navigate('/codex')}
                    >
                        📖 Codex
                    </button>

                    {/* Mobile Store Grid — visible only on small screens via CSS */}
                    <div className="marketplace-mobile-grid">
                        <h2 className="marketplace-mobile-title">🏪 Marketplace</h2>

                        {/* Quick-Access Bar */}
                        <div className="mp-quick-access">
                            {MARKETPLACE_LAYOUT.stores.map((store) => (
                                <button
                                    key={store.id}
                                    className="mp-qa-btn"
                                    onClick={() => openStore(store.id)}
                                    style={{ '--qa-color': store.color } as React.CSSProperties}
                                >
                                    <span className="mp-qa-emoji">{store.emoji}</span>
                                    <span className="mp-qa-name">{store.name.split(' ')[0]}</span>
                                </button>
                            ))}
                            {isMerchantDay && (
                                <button className="mp-qa-btn mp-qa-merchant" onClick={() => setShowMerchant(true)}>
                                    <span className="mp-qa-emoji">🧙</span>
                                    <span className="mp-qa-name">Merchant</span>
                                </button>
                            )}
                        </div>

                        {/* Merchant NPC Card (Mon/Wed/Fri) */}
                        {isMerchantDay && (
                            <motion.div
                                className="marketplace-store-card mp-merchant-card"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowMerchant(true)}
                            >
                                <div className="store-card-image">
                                    <span className="store-card-emoji">🧙</span>
                                </div>
                                <div className="store-card-info">
                                    <h3>Wandering Merchant <span className="mp-merchant-badge">TODAY</span></h3>
                                    <p>Rare & exclusive items not found anywhere else!</p>
                                </div>
                                <div className="store-card-glow" style={{ backgroundColor: '#fbbf24' }} />
                            </motion.div>
                        )}

                        <div className="marketplace-store-cards">
                            {MARKETPLACE_LAYOUT.stores.map((store) => {
                                const signboard = SIGNBOARD_MAP[store.id];
                                const tier = loyalty.getLoyaltyTier(store.id);
                                return (
                                    <motion.div
                                        key={store.id}
                                        className="marketplace-store-card"
                                        style={{ '--glow-color': store.color } as React.CSSProperties}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => openStore(store.id)}
                                    >
                                        <div className="store-card-image">
                                            {signboard ? (
                                                <img src={signboard} alt={store.name} />
                                            ) : (
                                                <span className="store-card-emoji">{store.emoji}</span>
                                            )}
                                        </div>
                                        <div className="store-card-info">
                                            <h3>{store.name}</h3>
                                            <p>{store.description}</p>
                                            {tier.stars > 0 && (
                                                <div className="mp-loyalty-stars">
                                                    {'⭐'.repeat(tier.stars)} <span className="mp-loyalty-name">{tier.name}</span>
                                                    {tier.discountPercent > 0 && <span className="mp-loyalty-discount">-{tier.discountPercent}%</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="store-card-glow" style={{ backgroundColor: store.color }} />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop walkable grid — hidden on small screens via CSS */}
                    <div className="marketplace-desktop-view">
                        {/* Town grid (desktop only) */}
                        <div
                            className="marketplace-grid"
                            onClick={handleGridTap}
                            style={{
                                width: MARKETPLACE_LAYOUT.gridSize.width * MARKETPLACE_LAYOUT.tileSize,
                                height: MARKETPLACE_LAYOUT.gridSize.height * MARKETPLACE_LAYOUT.tileSize,
                                touchAction: 'none'
                            }}
                        >
                            {/* Ground tiles */}
                            {Array.from({ length: MARKETPLACE_LAYOUT.gridSize.height }).map((_, y) =>
                                Array.from({ length: MARKETPLACE_LAYOUT.gridSize.width }).map((_, x) => (
                                    <div
                                        key={`${x}-${y}`}
                                        className="marketplace-tile"
                                        style={{
                                            left: x * MARKETPLACE_LAYOUT.tileSize,
                                            top: y * MARKETPLACE_LAYOUT.tileSize,
                                            width: MARKETPLACE_LAYOUT.tileSize,
                                            height: MARKETPLACE_LAYOUT.tileSize,
                                        }}
                                    />
                                ))
                            )}

                            {/* Store buildings */}
                            {MARKETPLACE_LAYOUT.stores.map((store) => {
                                const isNearby = nearbyStore === store.id;
                                const signboard = SIGNBOARD_MAP[store.id];

                                return (
                                    <motion.div
                                        key={store.id}
                                        className={`marketplace-building ${isNearby ? 'marketplace-building--nearby' : ''}`}
                                        style={{
                                            left: store.position.x * MARKETPLACE_LAYOUT.tileSize,
                                            top: store.position.y * MARKETPLACE_LAYOUT.tileSize,
                                            width: MARKETPLACE_LAYOUT.tileSize * 2,
                                            height: MARKETPLACE_LAYOUT.tileSize * 2,
                                            '--glow-color': store.color,
                                        } as React.CSSProperties}
                                        onClick={(e) => {
                                            // Mobile/touch interaction and desktop click
                                            e.stopPropagation();
                                            if (isNearby) {
                                                openStore(store.id);
                                            }
                                        }}
                                        animate={isNearby ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        {signboard ? (
                                            <img
                                                src={signboard}
                                                alt={store.name}
                                                className="building-signboard"
                                            />
                                        ) : (
                                            <div className="building-emoji">{store.emoji}</div>
                                        )}
                                        <div className="building-name">{store.name}</div>
                                        {isNearby && (
                                            <div className="building-glow" style={{ backgroundColor: store.color }} />
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* Obstacles (fountain) */}
                            {MARKETPLACE_LAYOUT.obstacles.map((obs, idx) => (
                                <div
                                    key={`obs-${idx}`}
                                    className="marketplace-obstacle"
                                    style={{
                                        left: obs.x * MARKETPLACE_LAYOUT.tileSize,
                                        top: obs.y * MARKETPLACE_LAYOUT.tileSize,
                                        width: MARKETPLACE_LAYOUT.tileSize,
                                        height: MARKETPLACE_LAYOUT.tileSize,
                                    }}
                                >
                                    ⛲
                                </div>
                            ))}

                            {/* Player */}
                            <motion.div
                                className="marketplace-player"
                                style={{
                                    left: playerPosition.x * MARKETPLACE_LAYOUT.tileSize,
                                    top: playerPosition.y * MARKETPLACE_LAYOUT.tileSize,
                                    width: MARKETPLACE_LAYOUT.tileSize,
                                    height: MARKETPLACE_LAYOUT.tileSize,
                                }}
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                <img
                                    src={heroImage}
                                    alt="Player"
                                    className="player-sprite"
                                />
                            </motion.div>
                        </div>

                        {/* Interaction prompt */}
                        {nearbyStore && nearbyStoreData && !activeStore && (
                            <motion.div
                                className="interaction-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={(e) => { e.stopPropagation(); openStore(nearbyStoreData.id); }}
                                onPointerUp={(e) => { e.stopPropagation(); openStore(nearbyStoreData.id); }}
                                style={{ cursor: 'pointer', zIndex: 100 }}
                            >
                                <span className="desktop-hint">Press <kbd>E</kbd> to enter </span>
                                <span className="mobile-hint">Tap here to enter </span>
                                <strong>{nearbyStoreData.name}</strong>
                            </motion.div>
                        )}

                        {/* Controls hint */}
                        {!activeStore && (
                            <div className="controls-hint">
                                <div>Use <kbd>WASD</kbd> or <kbd>Arrow Keys</kbd> to move</div>
                            </div>
                        )}
                    </div>
                </div>
            </SceneShell>

            {/* Store Modals - Outside SceneShell so they overlay properly */}
            <AnimatePresence>
                {activeStore === 'hospital' && (
                    <HospitalStore onClose={closeStore} />
                )}
                {activeStore === 'armor-store' && (
                    <ArmorStore onClose={closeStore} />
                )}
                {activeStore === 'pet-store' && (
                    <PetShop onClose={closeStore} />
                )}
                {activeStore === 'weapon-store' && (
                    <WeaponStore onClose={closeStore} />
                )}
                {activeStore === 'furniture-store' && (
                    <ShopModal category="furniture" onClose={closeStore} />
                )}
                {activeStore === 'spell-store' && (
                    <SpellStore onClose={closeStore} />
                )}
                {activeStore === 'jewelry-store' && (
                    <JewelryStore onClose={closeStore} />
                )}

                {/* Wandering Merchant Modal */}
                {showMerchant && (
                    <motion.div
                        className="mp-merchant-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMerchant(false)}
                    >
                        <motion.div
                            className="mp-merchant-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="mp-merchant-header">
                                <h2>🧙 Wandering Merchant</h2>
                                <p>Exclusive wares — available today only!</p>
                                <button className="mp-merchant-close" onClick={() => setShowMerchant(false)}><X size={18} /></button>
                            </div>
                            <div className="mp-merchant-balance">🪙 {currency} Gold</div>
                            <div className="mp-merchant-items">
                                {loyalty.merchantStock.map(item => {
                                    const purchased = loyalty.merchantPurchased.includes(item.id);
                                    const canAfford = currency >= item.price;
                                    return (
                                        <div key={item.id} className={`mp-merchant-item rarity-${item.rarity} ${purchased ? 'mp-merchant-sold' : ''}`}>
                                            <div className="mp-mi-icon">{item.icon}</div>
                                            <div className="mp-mi-info">
                                                <div className="mp-mi-name">{item.name}</div>
                                                <div className="mp-mi-desc">{item.description}</div>
                                                <div className="mp-mi-effect">{item.effect}</div>
                                            </div>
                                            <button
                                                className="mp-mi-buy"
                                                disabled={purchased || !canAfford}
                                                onClick={() => {
                                                    if (canAfford && loyalty.purchaseMerchantItem(item.id)) {
                                                        addCurrency(-item.price);
                                                    }
                                                }}
                                            >
                                                {purchased ? '✓ Sold' : `${item.price} 🪙`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
