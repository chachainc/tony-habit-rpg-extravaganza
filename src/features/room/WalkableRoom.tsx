import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, BookOpen, Shirt, Sword, Sparkles, Star, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Scale, ExternalLink } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { usePetStore } from '../../store/usePetStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { useBookStore } from '../../store/useBookStore';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../store/useEquipmentStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useTitleStore } from '../../store/useTitleStore';
import { ITEM_DATABASE } from '../../data/items';
import { useHealthStore } from '../../store/useHealthStore';
import { SceneShell } from '../../components/scene';
import homeCampBg from '../../assets/room-bg.jpg';
import trophyCaseBg from '../../assets/backgrounds/trophy_case.png';
import bookshelfBg from '../../assets/backgrounds/bookshelf_display.png';
import { useHeroImage } from '../../hooks/useHeroImage';
import './WalkableRoom.css';

// Room layout config
const ROOM_LAYOUT = {
    gridSize: { width: 12, height: 10 },
    tileSize: 64,
};

// Check if position is walkable (not blocked by furniture)
const isWalkable = (x: number, y: number, placedFurniture: { gridX: number; gridY: number }[]): boolean => {
    // Boundary check
    if (x < 0 || x >= ROOM_LAYOUT.gridSize.width) return false;
    if (y < 0 || y >= ROOM_LAYOUT.gridSize.height) return false;

    // Check furniture collision
    for (const furniture of placedFurniture) {
        if (furniture.gridX === x && furniture.gridY === y) {
            return false;
        }
    }

    return true;
};

export const WalkableRoom = () => {
    const navigate = useNavigate();
    const heroImage = useHeroImage();
    const { playerPosition, setPlayerPosition } = useRoomStore();
    const { items } = useInventoryStore();
    const { activePet, name: petName } = usePetStore();
    const { totalBooksRead, getCurrentTrophy } = useBookTrophyStore();
    const { completedBooks } = useBookStore();

    // Character/Customization stores
    const { equipped, ownedCosmetics, equipItem: equipCosmetic } = useCharacterStore();
    const { equippedWeapon, ownedEquipment, equipItem: equipGear } = useEquipmentStore();
    const { activeAuraId, unlockedAuras, setActiveAura } = useAuraStore();
    const { activeTitle, unlockedTitles, setActiveTitle, getUnlockedTitleDefs } = useTitleStore();

    const [nearbyItem, setNearbyItem] = useState<string | null>(null);
    const [showBookshelf, setShowBookshelf] = useState(false);
    const [showTrophyCase, setShowTrophyCase] = useState(false);
    const [showCloset, setShowCloset] = useState(false);
    const [showMirror, setShowMirror] = useState(false);
    const [closetTab, setClosetTab] = useState<'outfits' | 'weapons' | 'auras' | 'titles'>('outfits');
    const [mirrorWeightInput, setMirrorWeightInput] = useState('');
    const [mirrorWeightSaved, setMirrorWeightSaved] = useState(false);

    // Health store
    const { logWeight, getLastWeight, hasLoggedWeightToday } = useHealthStore();

    // Movement keys state
    const keysPressed = useRef<Set<string>>(new Set());

    // Get pet sprite
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';

    // Get trophy tier data
    const trophyTier = getCurrentTrophy();

    // Get owned furniture and convert to grid positions
    const ownedFurniture = Object.entries(items)
        .filter(([itemId]) => ITEM_DB[itemId]?.type === 'furniture')
        .map(([itemId, count], index) => {
            const itemData = ITEM_DB[itemId];
            return {
                ...itemData,
                id: itemId,
                count,
                // Place furniture in a grid pattern
                gridX: 2 + (index % 4) * 2,
                gridY: 2 + Math.floor(index / 4) * 2,
            };
        });

    // Handle keyboard movement
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                e.preventDefault();
                keysPressed.current.add(key);
            }

            // Escape to exit
            if (key === 'escape') {
                navigate('/home');
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
    }, [navigate]);

    // Movement loop
    useEffect(() => {
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
    }, [playerPosition, setPlayerPosition, ownedFurniture]);

    // Check nearby furniture
    useEffect(() => {
        let found: string | null = null;
        for (const furniture of ownedFurniture) {
            const dist = Math.abs(furniture.gridX - playerPosition.x) + Math.abs(furniture.gridY - playerPosition.y);
            if (dist <= 1) {
                found = furniture.name;
                break;
            }
        }
        setNearbyItem(found);
    }, [playerPosition, ownedFurniture]);

    const handleExit = () => {
        navigate('/home');
    };

    // Static object positions
    const trophyPosition = { x: 10, y: 1 };
    const bookshelfPosition = { x: 0, y: 1 };
    const closetPosition = { x: 5, y: 0 }; // Top middle closet
    const mirrorPosition = { x: 8, y: 0 }; // Top right mirror

    // Proximity checks
    const nearTrophy = Math.abs(trophyPosition.x - playerPosition.x) + Math.abs(trophyPosition.y - playerPosition.y) <= 1;
    const nearBookshelf = Math.abs(bookshelfPosition.x - playerPosition.x) + Math.abs(bookshelfPosition.y - playerPosition.y) <= 1;
    const nearCloset = Math.abs(closetPosition.x - playerPosition.x) + Math.abs(closetPosition.y - playerPosition.y) <= 1;
    const nearMirror = Math.abs(mirrorPosition.x - playerPosition.x) + Math.abs(mirrorPosition.y - playerPosition.y) <= 1;

    // Touch D-pad handlers
    const handleDpadDown = (direction: string) => {
        keysPressed.current.add(direction);
    };

    const handleDpadUp = (direction: string) => {
        keysPressed.current.delete(direction);
    };

    // Contextual interact
    const handleInteract = () => {
        if (nearTrophy) setShowTrophyCase(true);
        else if (nearBookshelf) navigate('/library');
        else if (nearCloset) setShowCloset(true);
        else if (nearMirror) setShowMirror(true);
    };

    const showInteractButton = nearTrophy || nearBookshelf || nearCloset || nearMirror;
    const interactLabel = nearTrophy ? 'Trophy Hall' : nearBookshelf ? 'Library' : nearCloset ? 'Closet' : nearMirror ? 'Mirror' : '';

    // Active Aura info
    const activeAura = useMemo(() => AURAS.find(a => a.id === activeAuraId), [activeAuraId]);

    // Group items for display
    const ownedOutfitItems = useMemo(() => ownedCosmetics.map(id => COSMETICS_DB[id]).filter(Boolean), [ownedCosmetics]);
    const ownedGearItems = useMemo(() => ownedEquipment.map(id => EQUIPMENT_DB[id]).filter(Boolean), [ownedEquipment]);
    const unlockedAuraItems = useMemo(() => AURAS.filter(a => unlockedAuras.includes(a.id)), [unlockedAuras]);
    const unlockedTitleDefs = useMemo(() => getUnlockedTitleDefs(), [unlockedTitles, getUnlockedTitleDefs]);

    // Group books by year
    const booksByYear = completedBooks.reduce((acc, book) => {
        if (book.completedAt) {
            const year = new Date(book.completedAt).getFullYear();
            if (!acc[year]) acc[year] = [];
            acc[year].push(book);
        }
        return acc;
    }, {} as Record<number, typeof completedBooks>);

    return (
        <>
            <SceneShell
                backgroundImage={homeCampBg}
                showFog={true}
                showVignette={true}
                showEmbers={true}
            >
                <div className="walkable-room">
                    {/* Exit button */}
                    <button className="room-exit-btn" onClick={handleExit}>
                        <X size={24} />
                        Exit Room
                    </button>

                    {/* Room grid */}
                    <div
                        className="room-grid"
                        style={{
                            width: ROOM_LAYOUT.gridSize.width * ROOM_LAYOUT.tileSize,
                            height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize,
                        }}
                    >
                        {/* Ground tiles */}
                        {Array.from({ length: ROOM_LAYOUT.gridSize.height }).map((_, y) =>
                            Array.from({ length: ROOM_LAYOUT.gridSize.width }).map((_, x) => (
                                <div
                                    key={`${x}-${y}`}
                                    className="room-tile"
                                    style={{
                                        left: x * ROOM_LAYOUT.tileSize,
                                        top: y * ROOM_LAYOUT.tileSize,
                                        width: ROOM_LAYOUT.tileSize,
                                        height: ROOM_LAYOUT.tileSize,
                                    }}
                                />
                            ))
                        )}

                        {/* Closet - Walk up to change appearance */}
                        <motion.div
                            className={`room-closet ${nearCloset ? 'nearby' : ''}`}
                            style={{
                                left: closetPosition.x * ROOM_LAYOUT.tileSize,
                                top: 0,
                                width: ROOM_LAYOUT.tileSize,
                                height: ROOM_LAYOUT.tileSize * 1.5,
                            }}
                            animate={nearCloset ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                            onClick={() => nearCloset && setShowCloset(true)}
                        >
                            <div className="closet-icon">🧥</div>
                            <div className="closet-label">Closet</div>
                        </motion.div>

                        {/* Mirror - Health Tracker */}
                        <motion.div
                            className={`room-closet ${nearMirror ? 'nearby' : ''}`}
                            style={{
                                left: mirrorPosition.x * ROOM_LAYOUT.tileSize,
                                top: 0,
                                width: ROOM_LAYOUT.tileSize,
                                height: ROOM_LAYOUT.tileSize * 1.5,
                            }}
                            animate={nearMirror ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                            onClick={() => nearMirror && setShowMirror(true)}
                        >
                            <div className="closet-icon">🪞</div>
                            <div className="closet-label">Mirror</div>
                        </motion.div>

                        {/* Trophy Case - Using AI Image */}
                        <motion.div
                            className={`room-trophy-case ${nearTrophy ? 'nearby' : ''}`}
                            style={{
                                left: trophyPosition.x * ROOM_LAYOUT.tileSize - ROOM_LAYOUT.tileSize,
                                top: 0,
                                width: ROOM_LAYOUT.tileSize * 1.8,
                                height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.35,
                            }}
                            animate={nearTrophy ? { boxShadow: ['0 0 20px rgba(168, 85, 247, 0.3)', '0 0 40px rgba(168, 85, 247, 0.6)', '0 0 20px rgba(168, 85, 247, 0.3)'] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            onClick={() => nearTrophy && setShowTrophyCase(true)}
                        >
                            <img src={trophyCaseBg} alt="Trophy Case" className="trophy-case-image" />
                            <div className="trophy-case-overlay">
                                <div className="trophy-current">{trophyTier.icon}</div>
                                <div className="trophy-label">{trophyTier.name}</div>
                                <div className="trophy-books">{totalBooksRead} books</div>
                            </div>
                        </motion.div>

                        {/* Bookshelf - Using AI Image */}
                        <motion.div
                            className={`room-bookshelf ${nearBookshelf ? 'nearby' : ''}`}
                            style={{
                                left: 0,
                                top: 0,
                                width: ROOM_LAYOUT.tileSize * 1.8,
                                height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.35,
                            }}
                            animate={nearBookshelf ? { boxShadow: ['0 0 20px rgba(212, 165, 116, 0.3)', '0 0 40px rgba(212, 165, 116, 0.6)', '0 0 20px rgba(212, 165, 116, 0.3)'] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            onClick={() => nearBookshelf && setShowBookshelf(true)}
                        >
                            <img src={bookshelfBg} alt="Bookshelf" className="bookshelf-image" />
                            <div className="bookshelf-overlay">
                                <BookOpen size={20} />
                                <div className="bookshelf-label">My Library</div>
                                <div className="bookshelf-count">{completedBooks.length} books</div>
                            </div>
                        </motion.div>

                        {/* Furniture */}
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
                                    animate={isNearby ? { y: [0, -3, 0] } : {}}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                >
                                    <div className="furniture-icon">{furniture.icon}</div>
                                    {furniture.count > 1 && (
                                        <span className="furniture-count">x{furniture.count}</span>
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Pet following player */}
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
                            {/* Active Aura Visual */}
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

                            <img
                                src={heroImage}
                                alt="Player"
                                className="player-sprite"
                            />
                            {/* Title display above player */}
                            {activeTitle && (
                                <span className="player-title-tag">
                                    {useTitleStore.getState().getUnlockedTitleDefs().find(t => t.id === activeTitle)?.name}
                                </span>
                            )}
                        </motion.div>
                    </div>

                    {/* Item interaction prompt */}
                    <AnimatePresence>
                        {nearbyItem && (
                            <motion.div
                                className="room-item-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <span className="item-icon">🪑</span>
                                <strong>{nearbyItem}</strong>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Proximity prompts */}
                    <AnimatePresence>
                        {nearTrophy && !nearbyItem && !showTrophyCase && (
                            <motion.div
                                className="room-item-prompt trophy-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <Trophy size={18} />
                                <span>Click to view <strong>Trophy Hall</strong></span>
                            </motion.div>
                        )}
                        {nearBookshelf && !nearbyItem && !nearTrophy && !showBookshelf && (
                            <motion.div
                                className="room-item-prompt bookshelf-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <BookOpen size={18} />
                                <span>Click to view <strong>My Library</strong></span>
                            </motion.div>
                        )}
                        {nearCloset && !nearbyItem && !nearTrophy && !nearBookshelf && !showCloset && (
                            <motion.div
                                className="room-item-prompt closet-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <Shirt size={18} />
                                <span>Click to open <strong>Closet</strong></span>
                            </motion.div>
                        )}
                        {nearMirror && !nearbyItem && !nearTrophy && !nearBookshelf && !nearCloset && !showMirror && (
                            <motion.div
                                className="room-item-prompt closet-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <Scale size={18} />
                                <span>Click to open <strong>Mirror</strong></span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls hint */}
                    <div className="room-controls-hint">
                        <div>Use <kbd>WASD</kbd> or <kbd>Arrow Keys</kbd> to move</div>
                    </div>

                    {/* Mobile D-Pad */}
                    <div className="room-dpad">
                        <button
                            className="dpad-btn dpad-up"
                            onTouchStart={(e) => { e.preventDefault(); handleDpadDown('arrowup'); }}
                            onTouchEnd={() => handleDpadUp('arrowup')}
                            onMouseDown={() => handleDpadDown('arrowup')}
                            onMouseUp={() => handleDpadUp('arrowup')}
                            onMouseLeave={() => handleDpadUp('arrowup')}
                        >
                            <ArrowUp size={20} />
                        </button>
                        <div className="dpad-middle-row">
                            <button
                                className="dpad-btn dpad-left"
                                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('arrowleft'); }}
                                onTouchEnd={() => handleDpadUp('arrowleft')}
                                onMouseDown={() => handleDpadDown('arrowleft')}
                                onMouseUp={() => handleDpadUp('arrowleft')}
                                onMouseLeave={() => handleDpadUp('arrowleft')}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="dpad-center" />
                            <button
                                className="dpad-btn dpad-right"
                                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('arrowright'); }}
                                onTouchEnd={() => handleDpadUp('arrowright')}
                                onMouseDown={() => handleDpadDown('arrowright')}
                                onMouseUp={() => handleDpadUp('arrowright')}
                                onMouseLeave={() => handleDpadUp('arrowright')}
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                        <button
                            className="dpad-btn dpad-down"
                            onTouchStart={(e) => { e.preventDefault(); handleDpadDown('arrowdown'); }}
                            onTouchEnd={() => handleDpadUp('arrowdown')}
                            onMouseDown={() => handleDpadDown('arrowdown')}
                            onMouseUp={() => handleDpadUp('arrowdown')}
                            onMouseLeave={() => handleDpadUp('arrowdown')}
                        >
                            <ArrowDown size={20} />
                        </button>
                    </div>

                    {/* Mobile interact button */}
                    <AnimatePresence>
                        {showInteractButton && (
                            <motion.button
                                className="room-interact-btn"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleInteract}
                            >
                                {nearTrophy ? <Trophy size={18} /> : nearBookshelf ? <BookOpen size={18} /> : nearCloset ? <Shirt size={18} /> : <Scale size={18} />}
                                {interactLabel}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </SceneShell>

            {/* Closet Modal */}
            <AnimatePresence>
                {showCloset && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCloset(false)}
                    >
                        <motion.div
                            className="room-modal room-closet-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close-btn" onClick={() => setShowCloset(false)}>
                                <X size={20} />
                            </button>

                            <div className="modal-content">
                                <h2>🧥 Traveler's Closet</h2>
                                <p className="modal-subtitle">Customize your appearance and gear</p>

                                {/* Tabs */}
                                <div className="closet-tabs">
                                    <button
                                        className={closetTab === 'outfits' ? 'active' : ''}
                                        onClick={() => setClosetTab('outfits')}
                                    >
                                        <Shirt size={16} /> Outfits
                                    </button>
                                    <button
                                        className={closetTab === 'weapons' ? 'active' : ''}
                                        onClick={() => setClosetTab('weapons')}
                                    >
                                        <Sword size={16} /> Gear
                                    </button>
                                    <button
                                        className={closetTab === 'auras' ? 'active' : ''}
                                        onClick={() => setClosetTab('auras')}
                                    >
                                        <Sparkles size={16} /> Auras
                                    </button>
                                    <button
                                        className={closetTab === 'titles' ? 'active' : ''}
                                        onClick={() => setClosetTab('titles')}
                                    >
                                        <Star size={16} /> Titles
                                    </button>
                                </div>

                                <div className="closet-selection-grid">
                                    {closetTab === 'outfits' && ownedOutfitItems.map(item => (
                                        <button
                                            key={item.id}
                                            className={`selection-item ${equipped[item.slot] === item.id ? 'equipped' : ''}`}
                                            onClick={() => equipCosmetic(item.slot, item.id)}
                                        >
                                            <div className="item-color-preview" style={{ backgroundColor: item.color }} />
                                            <span>{item.name}</span>
                                        </button>
                                    ))}

                                    {closetTab === 'weapons' && ownedGearItems.map(item => (
                                        <button
                                            key={item.id}
                                            className={`selection-item ${equippedWeapon === item.id || useEquipmentStore.getState().equippedArmor === item.id || useEquipmentStore.getState().equippedAccessory === item.id ? 'equipped' : ''}`}
                                            onClick={() => equipGear(item.id)}
                                        >
                                            <span className="item-icon">{item.icon}</span>
                                            <span>{item.name}</span>
                                        </button>
                                    ))}

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
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trophy Case Modal */}
            <AnimatePresence>
                {showTrophyCase && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTrophyCase(false)}
                    >
                        <motion.div
                            className="room-modal room-trophy-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close-btn" onClick={() => setShowTrophyCase(false)}>
                                <X size={20} />
                            </button>
                            <img src={trophyCaseBg} alt="Trophy Case" className="modal-bg-image" />
                            <div className="modal-content">
                                <h2>🏆 Trophy Hall</h2>
                                <div className="trophy-current-tier">
                                    <span className="tier-icon">{trophyTier.icon}</span>
                                    <span className="tier-name">{trophyTier.name}</span>
                                </div>
                                <p className="tier-description">{trophyTier.description}</p>
                                <div className="trophy-stats">
                                    <div className="trophy-stat">
                                        <span className="stat-label">Books Read</span>
                                        <span className="stat-value">{totalBooksRead}</span>
                                    </div>
                                    <div className="trophy-stat">
                                        <span className="stat-label">Intelligence Bonus</span>
                                        <span className="stat-value">+{trophyTier.intelligenceBonus}</span>
                                    </div>
                                    <div className="trophy-stat">
                                        <span className="stat-label">Max MP Bonus</span>
                                        <span className="stat-value">+{trophyTier.maxMPBonus}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bookshelf Modal */}
            <AnimatePresence>
                {showBookshelf && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowBookshelf(false)}
                    >
                        <motion.div
                            className="room-modal room-bookshelf-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close-btn" onClick={() => setShowBookshelf(false)}>
                                <X size={20} />
                            </button>
                            <img src={bookshelfBg} alt="Bookshelf" className="modal-bg-image" />
                            <div className="modal-content">
                                <h2>📚 My Library</h2>
                                <p className="library-subtitle">{completedBooks.length} books completed</p>

                                <div className="books-by-year">
                                    {Object.entries(booksByYear)
                                        .sort(([a], [b]) => Number(b) - Number(a))
                                        .map(([year, books]) => (
                                            <div key={year} className="year-section">
                                                <h3 className="year-header">{year} ({books.length})</h3>
                                                <ul className="book-list">
                                                    {books.map(book => (
                                                        <li key={book.id} className="book-entry">
                                                            <span className="book-title">{book.title}</span>
                                                            <span className="book-author">by {book.author}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))
                                    }
                                    {completedBooks.length === 0 && (
                                        <div className="empty-library">
                                            <p>📖 No books completed yet!</p>
                                            <p>Visit the Library to start reading.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mirror / Health Modal */}
            <AnimatePresence>
                {showMirror && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMirror(false)}
                    >
                        <motion.div
                            className="room-modal mirror-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close-btn" onClick={() => setShowMirror(false)}>
                                <X size={20} />
                            </button>
                            <div className="modal-content">
                                <h2>🪞 Health Mirror</h2>

                                {/* Quick Weight Log */}
                                <div className="mirror-section">
                                    <h3>⚖️ Weight</h3>
                                    {hasLoggedWeightToday() ? (
                                        <div className="mirror-current">
                                            {getLastWeight()} lbs <span style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Logged today</span>
                                        </div>
                                    ) : (
                                        <div>
                                            {getLastWeight() && (
                                                <p style={{ color: '#475569', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Last: {getLastWeight()} lbs</p>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={mirrorWeightInput}
                                                    onChange={(e) => setMirrorWeightInput(e.target.value)}
                                                    placeholder={getLastWeight() ? `${getLastWeight()}` : '180'}
                                                    step="0.1"
                                                    style={{
                                                        flex: 1, background: 'rgba(15,23,42,0.6)',
                                                        border: '1px solid rgba(148,163,184,0.2)',
                                                        borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
                                                        color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', minHeight: '44px'
                                                    }}
                                                />
                                                <button
                                                    style={{
                                                        padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                                                        color: 'white', border: 'none', borderRadius: '0.5rem',
                                                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', minHeight: '44px'
                                                    }}
                                                    onClick={() => {
                                                        const w = parseFloat(mirrorWeightInput);
                                                        if (!isNaN(w) && w > 0) {
                                                            logWeight(w);
                                                            setMirrorWeightInput('');
                                                            setMirrorWeightSaved(true);
                                                            setTimeout(() => setMirrorWeightSaved(false), 2000);
                                                        }
                                                    }}
                                                >
                                                    Log
                                                </button>
                                            </div>
                                            {mirrorWeightSaved && <p style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '0.25rem' }}>✅ Saved!</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Nav to full page */}
                                <button
                                    className="mirror-nav-btn"
                                    onClick={() => {
                                        setShowMirror(false);
                                        navigate('/health');
                                    }}
                                >
                                    <ExternalLink size={16} />
                                    Open Full Health Tracker
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
