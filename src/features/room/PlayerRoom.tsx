import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, BookOpen, Shirt, Store, Trophy, Scale, Dumbbell, Pencil, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../../store/useRoomStore';
import { usePetStore } from '../../store/usePetStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useHealthStore } from '../../store/useHealthStore';
import { ITEM_DATABASE } from '../../data/items';
import { SceneShell } from '../../components/scene';
import { WardrobePanel } from './WardrobePanel';
import { BookshelfPanel } from './BookshelfPanel';
import { SleepPanel } from './SleepPanel';
import { TrophyPanel } from './TrophyPanel';
import { ShopModal } from '../shop/ShopModal';
import { FurniturePlacementPanel, DraggableFurniturePiece } from './FurniturePlacementPanel';
import { LoadoutPanel } from '../character/LoadoutPanel';

// AI-generated assets
import homeCampBg from '../../assets/room-bg.jpg';
import trophyCaseBg from '../../assets/backgrounds/trophy_case.png';
import bookshelfBg from '../../assets/backgrounds/bookshelf_display.png';
import { useHeroImage } from '../../hooks/useHeroImage';
import './WalkableRoom.css';
import './PlayerRoom.css';
import './FurniturePlacementPanel.css';

type ActivePanel = 'wardrobe' | 'bookshelf' | 'sleep' | 'trophy' | 'store' | 'body' | 'furniture_edit' | 'loadout' | null;

/* ── Inline Body Panel (calorie + weight) ── */
const BodyPanel = ({ onClose }: { onClose: () => void }) => {
    const { logWeight, getLastWeight, hasLoggedWeightToday } = useHealthStore();
    const [weightVal, setWeightVal] = useState(getLastWeight()?.toString() ?? '');
    const [calorieVal, setCalorieVal] = useState('');
    const [saved, setSaved] = useState(false);
    const navigate = useNavigate();

    const handleSave = () => {
        if (weightVal) logWeight(parseFloat(weightVal));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="body-panel">
            <div className="body-panel__header">
                <h3>⚖️ Body Tracker</h3>
                <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="body-panel__inputs">
                <div className="body-input-group">
                    <label>Weight (lbs)</label>
                    <input
                        type="number"
                        value={weightVal}
                        onChange={(e) => setWeightVal(e.target.value)}
                        placeholder="180"
                        min="0"
                        max="1000"
                    />
                    {hasLoggedWeightToday() && <span className="body-input-hint">✅ Logged today</span>}
                </div>
                <div className="body-input-group">
                    <label>Calories (kcal)</label>
                    <input
                        type="number"
                        value={calorieVal}
                        onChange={(e) => setCalorieVal(e.target.value)}
                        placeholder="2000"
                        min="0"
                        max="10000"
                    />
                </div>
            </div>
            <button className="body-panel__save-btn" onClick={handleSave}>
                {saved ? '✅ Saved!' : '💾 Save'}
            </button>
            <button className="body-panel__gym-link" onClick={() => { onClose(); navigate('/gym'); }}>
                <Dumbbell size={18} /> Open Full Gym Tracker →
            </button>
            <button className="body-panel__gym-link" onClick={() => { onClose(); navigate('/health'); }}>
                <Scale size={18} /> Open Health Tracker →
            </button>
        </div>
    );
};

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
    const {
        playerPosition, setPlayerPosition,
        placedRoomFurniture, placeRoomFurniture,
        getPlacedBonusSummary,
    } = useRoomStore();
    const { activePet, name: petName } = usePetStore();
    const { activeTitle, getUnlockedTitleDefs } = useTitleStore();
    const { activeAuraId } = useAuraStore();
    const navigate = useNavigate();
    const heroImage = useHeroImage();

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [tooltipSeen, setTooltipSeen] = useState(false);
    const keysPressed = useRef<Set<string>>(new Set());
    const [forceWalkable, setForceWalkable] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [placingFurnitureId, setPlacingFurnitureId] = useState<string | null>(null);
    const roomGridRef = useRef<HTMLDivElement>(null);

    // Reactive mobile detection
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        setIsMobile(mq.matches); // Sync on mount
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Get active aura and titles
    const activeAura = useMemo(() => AURAS.find(a => a.id === activeAuraId), [activeAuraId]);
    const activeTitleDef = useMemo(() => getUnlockedTitleDefs().find(t => t.id === activeTitle), [activeTitle, getUnlockedTitleDefs]);

    // Pet Sprite
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';

    // Placement click handler: when user has selected an item to place
    const handlePlacementClick = useCallback((e: React.MouseEvent) => {
        if (!placingFurnitureId || !roomGridRef.current) return;
        e.stopPropagation();
        const rect = roomGridRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100));
        placeRoomFurniture(placingFurnitureId, x, y);
        setPlacingFurnitureId(null);
    }, [placingFurnitureId, placeRoomFurniture]);

    const bonusSummary = useMemo(() => getPlacedBonusSummary(), [placedRoomFurniture]);

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

                if (isWalkable(newX, newY, [])) {
                    setPlayerPosition(newX, newY);
                }
            }
        }, 150);

        return () => clearInterval(intervalId);
    }, [playerPosition, setPlayerPosition, activePanel]);

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

    // Grid Tap-To-Move (or placement) Handler
    const handleGridTap = (e: React.MouseEvent) => {
        // If placing furniture, delegate to placement handler
        if (placingFurnitureId) {
            handlePlacementClick(e);
            return;
        }

        if (activePanel || editMode) return;

        const gridContainer = e.currentTarget;
        const rect = gridContainer.getBoundingClientRect();

        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const scale = rect.width / (ROOM_LAYOUT.gridSize.width * ROOM_LAYOUT.tileSize);
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;

            const gridX = Math.floor(clientX / (ROOM_LAYOUT.tileSize * scale));
            const gridY = Math.floor(clientY / (ROOM_LAYOUT.tileSize * scale));

            const boundedX = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.width - 1, gridX));
            const boundedY = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.height - 1, gridY));

            if (isWalkable(boundedX, boundedY, [])) {
                setPlayerPosition(boundedX, boundedY);
            }
        }
    };

    return (
        <div className="player-room-container">
            {isMobile && !forceWalkable ? (
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
                        <div className="room-mobile-player-card" onClick={() => setActivePanel('loadout')} style={{ cursor: 'pointer' }}>
                            <img src={heroImage} alt="Player" className="mobile-player-sprite" />
                            <div className="mobile-player-info">
                                {activeTitleDef && <span className="mobile-title-tag">{activeTitleDef.name}</span>}
                                {activeAura && activeAura.id !== 'none' && (
                                    <span className="mobile-aura-tag" style={{ color: activeAura.color }}>✦ {activeAura.name}</span>
                                )}
                                {activePet && <span className="mobile-pet-tag">{petSprite} {petName}</span>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, marginTop: '0.3rem', textAlign: 'center', letterSpacing: '0.5px' }}>⚔️ Equipment Loadout</div>
                        </div>

                        {/* Feature Buttons - 2x grid layout */}
                        <div className="room-mobile-features room-mobile-features--grid">
                            <button className="room-feature-btn room-feature-btn--wardrobe" onClick={() => setActivePanel('wardrobe')}>
                                <Shirt size={28} />
                                <span>Closet</span>
                                <small>Titles, Auras, Pets</small>
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
                            <button className="room-feature-btn room-feature-btn--body" onClick={() => setActivePanel('body')}>
                                <Scale size={28} />
                                <span>Body</span>
                                <small>Weight & Calories</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--gym" onClick={() => navigate('/gym')}>
                                <Dumbbell size={28} />
                                <span>Gym</span>
                                <small>Workout Tracker</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--store" onClick={() => setActivePanel('store')}>
                                <Store size={28} />
                                <span>Buy Furniture</span>
                                <small>Furniture Store</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--walkable" onClick={() => setActivePanel('furniture_edit')} style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
                                <Pencil size={22} />
                                <span>Arrange</span>
                                <small>Place & Move Items{bonusSummary.length > 0 ? ` · ${bonusSummary.length} bonus` : ''}</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--pet" onClick={() => navigate('/pet')}>
                                <span style={{ fontSize: '1.8rem' }}>{petSprite || '🐾'}</span>
                                <span>Pet</span>
                                <small>Care & Bond</small>
                            </button>
                            <button className="room-feature-btn room-feature-btn--walkable" onClick={() => setForceWalkable(true)} style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
                                <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                                <span>2D Room</span>
                                <small>Walk Around</small>
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
                            {/* Room bonus chip */}
                            {bonusSummary.length > 0 && !editMode && (
                                <div className="room-bonus-chip" onClick={() => setActivePanel('furniture_edit')}>
                                    ✨ {bonusSummary.length} bonus{bonusSummary.length > 1 ? 'es' : ''} active
                                </div>
                            )}
                            {/* Edit Mode toggle */}
                            <button
                                className={`room-edit-btn ${editMode ? 'active' : ''}`}
                                onClick={() => { setEditMode(v => !v); setPlacingFurnitureId(null); setActivePanel(editMode ? null : 'furniture_edit'); }}
                            >
                                {editMode ? <><Check size={16} /> Done</> : <><Pencil size={16} /> Edit Room</>}
                            </button>
                        </div>

                        {/* Floor Grid */}
                        <div
                            ref={roomGridRef}
                            className={`room-grid ${placingFurnitureId ? 'placing-mode' : ''}`}
                            onClick={handleGridTap}
                            style={{
                                width: ROOM_LAYOUT.gridSize.width * ROOM_LAYOUT.tileSize,
                                height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize,
                                touchAction: 'none',
                                position: 'relative',
                            }}
                        >
                            {/* Edit mode label */}
                            {editMode && (
                                <div className="fp-edit-mode-badge">
                                    {placingFurnitureId ? 'Tap to place furniture' : 'Drag furniture to reposition'}
                                </div>
                            )}
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
                                    width: ROOM_LAYOUT.tileSize * 1.8,
                                    height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.35,
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
                                    width: ROOM_LAYOUT.tileSize * 1.8,
                                    height: ROOM_LAYOUT.gridSize.height * ROOM_LAYOUT.tileSize * 0.35,
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

                            {/* Placed Furniture from placement store */}
                            {placedRoomFurniture.map((placed) => (
                                <DraggableFurniturePiece
                                    key={placed.id}
                                    placed={placed}
                                    editMode={editMode}
                                    containerRef={roomGridRef}
                                />
                            ))}

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
                                <img src={heroImage} alt="Player" className="player-sprite" />
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
                            {activePanel === 'body' && <BodyPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'loadout' && <LoadoutPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'furniture_edit' && (
                                <FurniturePlacementPanel
                                    onClose={() => { setActivePanel(null); }}
                                    onEnterPlacementMode={(id) => { setPlacingFurnitureId(id); setActivePanel(null); }}
                                    placingFurnitureId={placingFurnitureId}
                                />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
