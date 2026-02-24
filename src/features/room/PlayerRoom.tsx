import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, BookOpen, Shirt, Store, Trophy } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { usePetStore } from '../../store/usePetStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { ITEM_DATABASE } from '../../data/items';
import { SceneShell } from '../../components/scene';
import { WardrobePanel } from './WardrobePanel';
import { BookshelfPanel } from './BookshelfPanel';
import { SleepPanel } from './SleepPanel';
import { TrophyPanel } from './TrophyPanel';
import { ShopModal } from '../shop/ShopModal';

// AI-generated assets
import homeCampBg from '../../assets/backgrounds/home_camp.png';
import trophyCaseBg from '../../assets/backgrounds/trophy_case.png';
import bookshelfBg from '../../assets/backgrounds/bookshelf_display.png';
import playerSprite from '../../assets/sprites/player.png';
import './WalkableRoom.css';
import './PlayerRoom.css'; // Use existing css alongside WalkableRoom CSS

type ActivePanel = 'wardrobe' | 'bookshelf' | 'sleep' | 'trophy' | 'store' | null;

// Room layout config
const ROOM_LAYOUT = {
    gridSize: { width: 12, height: 10 },
    tileSize: 64,
};

const isWalkable = (x: number, y: number, placedFurniture: { gridX: number; gridY: number }[]): boolean => {
    if (x < 0 || x >= ROOM_LAYOUT.gridSize.width) return false;
    if (y < 0 || y >= ROOM_LAYOUT.gridSize.height) return false;
    for (const furniture of placedFurniture) {
        if (furniture.gridX === x && furniture.gridY === y) {
            return false;
        }
    }
    return true;
};

export const PlayerRoom = ({ onClose }: { onClose: () => void }) => {
    const { playerPosition, setPlayerPosition } = useRoomStore();
    const { items } = useInventoryStore();
    const { activePet, name: petName } = usePetStore();
    const { activeTitle, getUnlockedTitleDefs } = useTitleStore();
    const { activeAuraId } = useAuraStore();

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [tooltipSeen, setTooltipSeen] = useState(false);
    const keysPressed = useRef<Set<string>>(new Set());

    const isMobile = window.innerWidth <= 768;

    // Get active aura and titles
    const activeAura = useMemo(() => AURAS.find(a => a.id === activeAuraId), [activeAuraId]);
    const activeTitleDef = useMemo(() => getUnlockedTitleDefs().find(t => t.id === activeTitle), [activeTitle, getUnlockedTitleDefs]);

    // Pet Sprite
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';

    // Parse furniture from inventory
    const ownedFurniture = useMemo(() => {
        return Object.entries(items)
            .filter(([itemId]) => ITEM_DB[itemId]?.type === 'furniture')
            .map(([itemId, count], index) => {
                const itemData = ITEM_DB[itemId];
                return {
                    ...itemData,
                    id: itemId,
                    count,
                    gridX: 2 + (index % 4) * 2,
                    gridY: 3 + Math.floor(index / 4) * 2,
                };
            });
    }, [items]);

    // Keyboard Movement
    useEffect(() => {
        if (activePanel) return; // Disable movement when panel is open

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                e.preventDefault();
                keysPressed.current.add(key);
            }
            if (key === 'escape') {
                setActivePanel(null);
            }
            if (key === 'e') {
                handleInteract();
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
    }, [activePanel]);

    // Movement Loop
    useEffect(() => {
        if (activePanel) return;

        const intervalId = setInterval(() => {
            let dx = 0;
            let dy = 0;

            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= 1;
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += 1;
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= 1;
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += 1;

            if (dx !== 0 || dy !== 0) {
                const newX = playerPosition.x + dx;
                const newY = playerPosition.y + dy;

                if (isWalkable(newX, newY, ownedFurniture)) {
                    setPlayerPosition(newX, newY);
                }
            }
        }, 150);

        return () => clearInterval(intervalId);
    }, [playerPosition, setPlayerPosition, ownedFurniture, activePanel]);

    // Setup coordinates for interactables
    const interactables = {
        trophy: { x: 10, y: 1, label: 'Trophy Hall', icon: <Trophy size={18} />, panel: 'trophy' as ActivePanel },
        bookshelf: { x: 0, y: 1, label: 'Library', icon: <BookOpen size={18} />, panel: 'bookshelf' as ActivePanel },
        wardrobe: { x: 5, y: 0, label: 'Closet', icon: <Shirt size={18} />, panel: 'wardrobe' as ActivePanel },
        bed: { x: 2, y: 0, label: 'Bed (Sleep Log)', icon: <BedDouble size={18} />, panel: 'sleep' as ActivePanel },
        store: { x: 8, y: 8, label: 'Furniture Store', icon: <Store size={18} />, panel: 'store' as ActivePanel }
    };

    // Calculate distances to find closest interactable
    const getNearbyInteractable = () => {
        for (const obj of Object.values(interactables)) {
            const dist = Math.abs(obj.x - playerPosition.x) + Math.abs(obj.y - playerPosition.y);
            if (dist <= 1.5) return obj; // Using 1.5 because some sprites are 2 tiles wide
        }
        return null;
    };

    const nearbyObj = getNearbyInteractable();

    const handleInteract = () => {
        if (nearbyObj) {
            setActivePanel(nearbyObj.panel);
            setTooltipSeen(true);
        }
    };

    // Mobile D-Pad Handlers
    const handleDpadDown = (direction: string) => keysPressed.current.add(direction);
    const handleDpadUp = (direction: string) => keysPressed.current.delete(direction);

    // Grid Tap-To-Move Handler
    const handleGridTap = (e: React.MouseEvent) => {
        if (activePanel) return;

        const gridContainer = e.currentTarget;
        const rect = gridContainer.getBoundingClientRect();

        // Ensure click/tap is inside the grid
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const scale = rect.width / (ROOM_LAYOUT.gridSize.width * ROOM_LAYOUT.tileSize);
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;

            const gridX = Math.floor(clientX / (ROOM_LAYOUT.tileSize * scale));
            const gridY = Math.floor(clientY / (ROOM_LAYOUT.tileSize * scale));

            const boundedX = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.width - 1, gridX));
            const boundedY = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.height - 1, gridY));

            if (isWalkable(boundedX, boundedY, ownedFurniture)) {
                setPlayerPosition(boundedX, boundedY);
            }
        }
    };

    return (
        <div className="player-room-container">
            {isMobile ? (
                /* ==================== MOBILE QUICK-ACCESS MENU ==================== */
                <SceneShell
                    backgroundImage={homeCampBg}
                    showFog={true}
                    showVignette={true}
                    showEmbers={true}
                >
                    <div className="room-mobile-menu">
                        <div className="room-mobile-header">
                            <button className="room-exit-btn" onClick={onClose}>
                                <X size={18} /> Back
                            </button>
                            <h2 className="room-mobile-title">🏠 Your Room</h2>
                        </div>

                        {/* Player Info */}
                        <div className="room-mobile-player-card">
                            <img src={playerSprite} alt="Player" className="mobile-player-sprite" />
                            <div className="mobile-player-info">
                                {activeTitleDef && <span className="mobile-title-tag">{activeTitleDef.name}</span>}
                                {activeAura && activeAura.id !== 'none' && (
                                    <span className="mobile-aura-tag" style={{ color: activeAura.color }}>✦ {activeAura.name}</span>
                                )}
                                {activePet && <span className="mobile-pet-tag">{petSprite} {petName}</span>}
                            </div>
                        </div>

                        {/* Feature Buttons */}
                        <div className="room-mobile-features">
                            <button className="room-feature-btn room-feature-btn--wardrobe" onClick={() => setActivePanel('wardrobe')}>
                                <Shirt size={28} />
                                <span>Closet</span>
                                <small>Titles, Auras, Clothes, Pets</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--sleep" onClick={() => setActivePanel('sleep')}>
                                <BedDouble size={28} />
                                <span>Bed</span>
                                <small>Sleep Log</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--bookshelf" onClick={() => setActivePanel('bookshelf')}>
                                <BookOpen size={28} />
                                <span>Library</span>
                                <small>Book Collection</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--trophy" onClick={() => setActivePanel('trophy')}>
                                <Trophy size={28} />
                                <span>Trophy Hall</span>
                                <small>Achievements</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--store" onClick={() => setActivePanel('store')}>
                                <Store size={28} />
                                <span>Furniture Store</span>
                                <small>Buy & Place Items</small>
                            </button>
                        </div>
                    </div>
                </SceneShell>
            ) : (
                /* ==================== DESKTOP WALKABLE ROOM ==================== */
                <SceneShell
                    backgroundImage={homeCampBg}
                    showFog={true}
                    showVignette={true}
                    showEmbers={true}
                >
                    <div className="walkable-room">
                        {/* Top Action Bar */}
                        <div className="room-top-bar">
                            <button className="room-exit-btn" onClick={onClose}>
                                <X size={20} /> Exit Room
                            </button>
                        </div>

                        {/* Floor Grid */}
                        <div
                            className="room-grid"
                            onClick={handleGridTap}
                            style={{
                                width: ROOM_LAYOUT.gridSize.width * ROOM_LAYOUT.tileSize,
                                height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize,
                                touchAction: 'none'
                            }}
                        >
                            {/* Bed */}
                            <motion.div
                                className={`room-hotspot bed-hotspot ${nearbyObj?.panel === 'sleep' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.bed.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.bed.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 1.5,
                                    height: ROOM_LAYOUT.tileSize * 2,
                                }}
                                onPointerUp={(e) => { e.stopPropagation(); setActivePanel('sleep'); }}
                            >
                                <BedDouble size={32} className="hotspot-icon" />
                                <div className="hotspot-label">Bed</div>
                            </motion.div>

                            {/* Wardrobe */}
                            <motion.div
                                className={`room-hotspot wardrobe-hotspot ${nearbyObj?.panel === 'wardrobe' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.wardrobe.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.wardrobe.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize,
                                    height: ROOM_LAYOUT.tileSize * 1.5,
                                }}
                                onPointerUp={(e) => { e.stopPropagation(); setActivePanel('wardrobe'); }}
                            >
                                <Shirt size={32} className="hotspot-icon" />
                                <div className="hotspot-label">Closet</div>
                            </motion.div>

                            {/* Bookshelf */}
                            <motion.div
                                className={`room-hotspot bookshelf-hotspot ${nearbyObj?.panel === 'bookshelf' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.bookshelf.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.bookshelf.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 2.5,
                                    height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.6,
                                }}
                                onPointerUp={(e) => { e.stopPropagation(); setActivePanel('bookshelf'); }}
                            >
                                <img src={bookshelfBg} alt="Bookshelf" className="bookshelf-image" />
                                <div className="hotspot-label overlay-label"><BookOpen size={16} /> Library</div>
                            </motion.div>

                            {/* Trophy Case */}
                            <motion.div
                                className={`room-hotspot trophy-hotspot ${nearbyObj?.panel === 'trophy' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.trophy.x * ROOM_LAYOUT.tileSize - ROOM_LAYOUT.tileSize,
                                    top: interactables.trophy.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 2.5,
                                    height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.6,
                                }}
                                onPointerUp={(e) => { e.stopPropagation(); setActivePanel('trophy'); }}
                            >
                                <img src={trophyCaseBg} alt="Trophy Case" className="trophy-case-image" />
                                <div className="hotspot-label overlay-label"><Trophy size={16} /> Trophy Hall</div>
                            </motion.div>

                            {/* Store Kiosk */}
                            <motion.div
                                className={`room-hotspot store-hotspot ${nearbyObj?.panel === 'store' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.store.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.store.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize,
                                    height: ROOM_LAYOUT.tileSize,
                                }}
                                onPointerUp={(e) => { e.stopPropagation(); setActivePanel('store'); }}
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Store size={32} className="hotspot-icon" />
                                <div className="hotspot-label">Store</div>
                            </motion.div>

                            {/* Placed Furniture */}
                            {ownedFurniture.map((furniture) => {
                                const isNearby = Math.abs(furniture.gridX - playerPosition.x) + Math.abs(furniture.gridY - playerPosition.y) <= 1;
                                return (
                                    <motion.div
                                        key={furniture.id}
                                        className={`room-furniture ${isNearby ? 'nearby' : ''}`}
                                        style={{
                                            left: furniture.gridX * ROOM_LAYOUT.tileSize,
                                            top: furniture.gridY * ROOM_LAYOUT.tileSize,
                                            width: ROOM_LAYOUT.tileSize,
                                            height: ROOM_LAYOUT.tileSize,
                                        }}
                                    >
                                        <div className="furniture-icon">{furniture.icon}</div>
                                        {furniture.count > 1 && (
                                            <span className="furniture-count">x{furniture.count}</span>
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* Pet */}
                            <motion.div
                                className="room-pet-follower"
                                style={{
                                    left: (playerPosition.x - 1) * ROOM_LAYOUT.tileSize,
                                    top: playerPosition.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize,
                                    height: ROOM_LAYOUT.tileSize,
                                }}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="pet-emoji">{petSprite}</span>
                                <span className="pet-name-tag">{petName}</span>
                            </motion.div>

                            {/* Player */}
                            <motion.div
                                className="room-player"
                                style={{
                                    left: playerPosition.x * ROOM_LAYOUT.tileSize,
                                    top: playerPosition.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize,
                                    height: ROOM_LAYOUT.tileSize,
                                }}
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                <AnimatePresence>
                                    {activeAura && activeAura.id !== 'none' && (
                                        <motion.div
                                            className="player-aura-effect"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{
                                                opacity: [0.4, 0.7, 0.4],
                                                scale: [1, 1.2, 1],
                                                background: `radial-gradient(circle, ${activeAura.color} 0%, transparent 70%)`
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </AnimatePresence>
                                <img src={playerSprite} alt="Player" className="player-sprite" />
                                {activeTitleDef && (
                                    <span className="player-title-tag">{activeTitleDef.name}</span>
                                )}
                            </motion.div>
                        </div>

                        {/* Proximity Interaction Prompt */}
                        <AnimatePresence>
                            {nearbyObj && !activePanel && (
                                <motion.div
                                    className="room-item-prompt"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                >
                                    <span className="item-icon">{nearbyObj.icon}</span>
                                    {!tooltipSeen && <span className="press-key-hint">['E']</span>}
                                    <strong>{nearbyObj.label}</strong>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </SceneShell>
            )}

            {/* Render Active Panel */}
            <AnimatePresence>
                {activePanel && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActivePanel(null)}
                    >
                        <motion.div
                            className="room-modal-container"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {activePanel === 'wardrobe' && <WardrobePanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'bookshelf' && <BookshelfPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'sleep' && <SleepPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'trophy' && <TrophyPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'store' && <ShopModal category="furniture" onClose={() => setActivePanel(null)} />}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
