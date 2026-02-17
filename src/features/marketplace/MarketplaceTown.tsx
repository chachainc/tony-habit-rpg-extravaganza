import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { MARKETPLACE_LAYOUT, isWalkable, canInteractWithStore } from '../../data/marketplace-layout';
import { HospitalStore } from './stores/HospitalStore';
import { ArmorStore } from './stores/ArmorStore';
import { PetShop } from './stores/PetShop';
import { WeaponStore } from './stores/WeaponStore';
import { FurnitureStore } from './stores/FurnitureStore';
import { SpellStore } from './stores/SpellStore';
import { SceneShell } from '../../components/scene';
import marketplaceNightBg from '../../assets/backgrounds/marketplace_night.png';
import playerSprite from '../../assets/sprites/player.png';
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
    const navigate = useNavigate();
    const { playerPosition, setPlayerPosition, activeStore, openStore, closeStore } = useMarketplaceStore();
    const [nearbyStore, setNearbyStore] = useState<string | null>(null);

    // Movement keys state
    const keysPressed = useRef<Set<string>>(new Set());

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

                    {/* Town grid */}
                    <div
                        className="marketplace-grid"
                        style={{
                            width: MARKETPLACE_LAYOUT.gridSize.width * MARKETPLACE_LAYOUT.tileSize,
                            height: MARKETPLACE_LAYOUT.gridSize.height * MARKETPLACE_LAYOUT.tileSize,
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
                                    onClick={() => isNearby && openStore(store.id)}
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
                                src={playerSprite}
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
                        >
                            Press <kbd>E</kbd> to enter <strong>{nearbyStoreData.name}</strong>
                        </motion.div>
                    )}

                    {/* Controls hint */}
                    {!activeStore && (
                        <div className="controls-hint">
                            <div>Use <kbd>WASD</kbd> or <kbd>Arrow Keys</kbd> to move</div>
                        </div>
                    )}
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
                    <FurnitureStore onClose={closeStore} />
                )}
                {activeStore === 'spell-store' && (
                    <SpellStore onClose={closeStore} />
                )}
            </AnimatePresence>
        </>
    );
};
