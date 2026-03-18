import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, BookOpen, Shirt, Scale, Dumbbell, Pencil, Check, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore, ROOM_CATALOG } from '../../store/useRoomStore';
import { usePetStore } from '../../store/usePetStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useHealthStore } from '../../store/useHealthStore';
import { ITEM_DATABASE } from '../../data/items';
import { SceneShell } from '../../components/scene';
import { WardrobePanel } from './WardrobePanel';
import { LibraryCodex } from '../library/LibraryCodex';
import { SleepPanel } from './SleepPanel';
import { TrophyHall } from './TrophyHall';
import { FurniturePlacementPanel, DraggableFurniturePiece } from './FurniturePlacementPanel';
import { LoadoutPanel } from '../character/LoadoutPanel';
// --- NEW CAMERA CONSTANTS ---
const CANVAS_W = 2048;
const CANVAS_H = 2048;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;
// We define a pixel threshold where a touch becomes a drag
const TAP_THRESHOLD = 8;


// AI-generated assets
import homeCampBg from '../../assets/room-bg.jpg';
import bookshelfBg from '../../assets/backgrounds/bookshelf_display.png';
import { useHeroImage } from '../../hooks/useHeroImage';
import './WalkableRoom.css';
import './PlayerRoom.css';
import './FurniturePlacementPanel.css';

type ActivePanel = 'wardrobe' | 'bookshelf' | 'sleep' | 'body' | 'furniture_edit' | 'loadout' | 'trophies' | null;

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
    gridSize: { width: 32, height: 32 },
    tileSize: 64, // 32 * 64 = 2048x2048
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
        currentRoomId, unlockedRooms, switchRoom,
    } = useRoomStore();

    // Determine adjacent rooms for navigator
    const allRooms = ROOM_CATALOG;
    const currentRoomIdx = allRooms.findIndex(r => r.id === currentRoomId);
    const prevRoom = currentRoomIdx > 0 ? allRooms[currentRoomIdx - 1] : null;
    const nextRoom = currentRoomIdx < allRooms.length - 1 ? allRooms[currentRoomIdx + 1] : null;
    const currentRoomDef = allRooms[currentRoomIdx];
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
    const viewportRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Camera State
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);
    
    // Multi-touch tracking
    const activePointers = useRef<Map<number, React.PointerEvent>>(new Map());
    const initialPinchDist = useRef<number | null>(null);
    const initialPinchScale = useRef<number>(1);
    const lastPanPoint = useRef<{ x: number, y: number } | null>(null);
    const touchStartOffset = useRef<{ x: number, y: number } | null>(null);

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
        if (!placingFurnitureId || !containerRef.current) return;
        e.stopPropagation();
        
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate world coordinates through the current scale transform
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const worldX = clientX / panOffset.scale;
        const worldY = clientY / panOffset.scale;
        
        // Convert to percentage (0-100) based on CANVAS_W / CANVAS_H
        const xPercent = Math.max(0, Math.min(100, (worldX / CANVAS_W) * 100));
        const yPercent = Math.max(0, Math.min(100, (worldY / CANVAS_H) * 100));
        
        placeRoomFurniture(placingFurnitureId, xPercent, yPercent);
        setPlacingFurnitureId(null);
    }, [placingFurnitureId, placeRoomFurniture, panOffset.scale]);

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

    // Setup coordinates for interactables (World space — all at 2x tile sizes)
    const interactables = {
        bed: { x: 2, y: 2, label: 'Bed (Sleep Log)', icon: <BedDouble size={18} />, panel: 'sleep' as ActivePanel },
        bookshelf: { x: 2, y: 9, label: 'Library', icon: <BookOpen size={18} />, panel: 'bookshelf' as ActivePanel },
        wardrobe: { x: 27, y: 2, label: 'Closet', icon: <Shirt size={18} />, panel: 'wardrobe' as ActivePanel },
        trophyCase: { x: 27, y: 9, label: 'Trophy Case', icon: <span>🏆</span>, panel: 'trophies' as ActivePanel },
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
            keysPressed.current.clear(); // Reset walking
        }
    };

    // Initialize Camera Position
    useEffect(() => {
        // Only run once when opening desktop view or toggling forceWalkable
        if (!isMobile || forceWalkable) {
            if (viewportRef.current) {
                // Start at a wider zoom so all corners+hotspots are visible
                setPanOffset({ x: 20, y: 20, scale: 0.65 });
            }
        }
    }, [isMobile, forceWalkable]);

    // ─── CAMERA LOGIC (Ported from RiskPage) ───────────────────────────────────
    const getPointersDist = (p1: React.PointerEvent, p2: React.PointerEvent) => {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    };

    const clampOffset = (x: number, y: number, scale: number) => {
        const vw = viewportRef.current?.clientWidth ?? 0;
        const vh = viewportRef.current?.clientHeight ?? 0;
        
        const scaledW = CANVAS_W * scale;
        const scaledH = CANVAS_H * scale;

        const minX = Math.min(0, vw - scaledW);
        const maxX = Math.max(0, vw - scaledW); // allow centering if smaller
        const minY = Math.min(0, vh - scaledH);
        const maxY = Math.max(0, vh - scaledH);

        // Pad the clamps slightly so the bounding box feels softer
        return {
            x: Math.max(minX - 50, Math.min(maxX + 50, x)),
            y: Math.max(minY - 50, Math.min(maxY + 50, y))
        };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        activePointers.current.set(e.pointerId, e);

        if (activePointers.current.size === 1) {
            isPanning.current = false;
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
            touchStartOffset.current = { x: e.clientX, y: e.clientY };
        } else if (activePointers.current.size === 2) {
            isPanning.current = true;
            const pts = Array.from(activePointers.current.values());
            initialPinchDist.current = getPointersDist(pts[0], pts[1]);
            initialPinchScale.current = panOffset.scale;
            lastPanPoint.current = null;
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        activePointers.current.set(e.pointerId, e);

        if (activePointers.current.size === 1 && lastPanPoint.current) {
            const dx = e.clientX - lastPanPoint.current.x;
            const dy = e.clientY - lastPanPoint.current.y;
            
            // Check threshold indicating a drag, not just a tap
            if (!isPanning.current && touchStartOffset.current) {
                const totalDist = Math.hypot(e.clientX - touchStartOffset.current.x, e.clientY - touchStartOffset.current.y);
                if (totalDist > TAP_THRESHOLD) {
                    isPanning.current = true;
                }
            }

            if (!isPanning.current) return;

            setPanOffset(prev => {
                const newX = prev.x + dx;
                const newY = prev.y + dy;
                return { ...prev, ...clampOffset(newX, newY, prev.scale) };
            });

            lastPanPoint.current = { x: e.clientX, y: e.clientY };

        } else if (activePointers.current.size === 2 && initialPinchDist.current !== null) {
            const pts = Array.from(activePointers.current.values());
            const currentDist = getPointersDist(pts[0], pts[1]);
            
            const scaleRatio = currentDist / initialPinchDist.current;
            let newScale = initialPinchScale.current * scaleRatio;
            newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

            const centerX = (pts[0].clientX + pts[1].clientX) / 2;
            const centerY = (pts[0].clientY + pts[1].clientY) / 2;

            setPanOffset(prev => {
                if (!viewportRef.current) return prev;
                const rect = viewportRef.current.getBoundingClientRect();
                
                const relX = centerX - rect.left;
                const relY = centerY - rect.top;

                const scaleDiff = newScale / prev.scale;

                const newX = relX - (relX - prev.x) * scaleDiff;
                const newY = relY - (relY - prev.y) * scaleDiff;

                return { scale: newScale, ...clampOffset(newX, newY, newScale) };
            });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => { 
        activePointers.current.delete(e.pointerId);
        
        if (activePointers.current.size < 2) {
            initialPinchDist.current = null;
        }
        
        if (activePointers.current.size === 1) {
            const remaining = Array.from(activePointers.current.values())[0];
            lastPanPoint.current = { x: remaining.clientX, y: remaining.clientY };
        } else if (activePointers.current.size === 0) {
            lastPanPoint.current = null;
        }
    };

    // Grid Tap-To-Move (or placement) Handler
    // Note: Called dynamically by React synthetic onClick
    const handleGridTap = (e: React.MouseEvent) => {
        if (isPanning.current) return;
        
        if (placingFurnitureId) {
            handlePlacementClick(e);
            return;
        }

        if (activePanel || editMode) return;
        if (!containerRef.current) return;

        const containerNode = containerRef.current;
        const rect = containerNode.getBoundingClientRect();
        
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Divide out the current scale transform to get to absolute canvas pixels
        const absoluteX = clientX / panOffset.scale;
        const absoluteY = clientY / panOffset.scale;

        // Divide by tileSize to get logical grid cell
        const gridX = Math.floor(absoluteX / ROOM_LAYOUT.tileSize);
        const gridY = Math.floor(absoluteY / ROOM_LAYOUT.tileSize);

        const boundedX = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.width - 1, gridX));
        const boundedY = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.height - 1, gridY));

        const walkable = isWalkable(boundedX, boundedY, []);
        console.log(`[PlayerRoom] GridTap -> clientX:${clientX}, clientY:${clientY} | gridX:${gridX}, gridY:${gridY} | walkable:${walkable}`);

        if (walkable) {
            setPlayerPosition(boundedX, boundedY);
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
                            <button className="room-feature-btn room-feature-btn--budget" onClick={() => navigate('/budget')}>
                                <DollarSign size={28} />
                                <span>Budget</span>
                                <small>Manage Finances</small>
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
                            <button className="room-exit-btn" onClick={() => { setForceWalkable(false); onClose(); }}>
                                <X size={20} /> Exit
                            </button>
                            <button className="room-exit-btn" onClick={() => navigate('/budget')}>
                                <DollarSign size={20} /> Budget
                            </button>

                            {/* Room Navigator */}
                            <div className="room-navigator">
                                <button
                                    className="room-nav-arrow"
                                    disabled={!prevRoom || !unlockedRooms.includes(prevRoom.id)}
                                    onClick={() => prevRoom && switchRoom(prevRoom.id)}
                                    title={prevRoom ? prevRoom.name : ''}
                                >
                                    ◀
                                </button>
                                <div className="room-nav-label">
                                    <span className="room-nav-icon">{currentRoomDef?.icon}</span>
                                    <span className="room-nav-name">{currentRoomDef?.name ?? 'Bedroom'}</span>
                                </div>
                                <button
                                    className="room-nav-arrow"
                                    disabled={!nextRoom || !unlockedRooms.includes(nextRoom.id)}
                                    onClick={() => nextRoom && switchRoom(nextRoom.id)}
                                    title={nextRoom ? nextRoom.unlockCondition ?? nextRoom.name : ''}
                                >
                                    ▶
                                </button>
                            </div>

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

                        {/* Viewport frames the canvas mapping dragging to pan state */}
                        <div 
                            className="walkable-room-viewport"
                            ref={viewportRef}
                            style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', touchAction: 'none' }}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onClick={handleGridTap}
                        >
                            {/* The massive Floor Grid wrapper */}
                            <div
                                ref={containerRef}
                                className={`room-grid ${placingFurnitureId ? 'placing-mode' : ''}`}
                                style={{
                                    width: CANVAS_W,
                                    height: CANVAS_H,
                                    position: 'absolute',
                                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${panOffset.scale})`,
                                    transformOrigin: '0 0',
                                    willChange: 'transform'
                                }}
                            >
                                {/* Grid visual lines (optional polish) */}
                                <div style={{ position: 'absolute', inset: 0, opacity: editMode ? 0.2 : 0.05, backgroundSize: `${ROOM_LAYOUT.tileSize}px ${ROOM_LAYOUT.tileSize}px`, backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />
                            {/* Edit mode label */}
                            {editMode && (
                                <div className="fp-edit-mode-badge">
                                    {placingFurnitureId ? 'Tap to place furniture' : 'Drag furniture to reposition'}
                                </div>
                            )}
                            {/* Bed — 2×2 tiles */}
                            <motion.div
                                className={`room-hotspot bed-hotspot ${nearbyObj?.panel === 'sleep' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.bed.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.bed.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 2,
                                    height: ROOM_LAYOUT.tileSize * 2,
                                }}
                                onClick={(e) => { 
                                    if (isPanning.current) return;
                                    e.stopPropagation(); 
                                    setActivePanel('sleep'); 
                                }}
                            >
                                <BedDouble size={32} className="hotspot-icon" />
                                <div className="hotspot-label">Bed</div>
                            </motion.div>

                            {/* Library — 4×2 tiles */}
                            <motion.div
                                className={`room-hotspot bookshelf-hotspot ${nearbyObj?.panel === 'bookshelf' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.bookshelf.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.bookshelf.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 4,
                                    height: ROOM_LAYOUT.tileSize * 2,
                                }}
                                onClick={(e) => { 
                                    if (isPanning.current) return;
                                    e.stopPropagation(); 
                                    setActivePanel('bookshelf'); 
                                }}
                            >
                                <img src={bookshelfBg} alt="Bookshelf" className="bookshelf-image" />
                                <div className="hotspot-label overlay-label"><BookOpen size={16} /> Library</div>
                            </motion.div>

                            {/* Closet — 1.5×2.5 tiles */}
                            <motion.div
                                className={`room-hotspot wardrobe-hotspot ${nearbyObj?.panel === 'wardrobe' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.wardrobe.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.wardrobe.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 1.5,
                                    height: ROOM_LAYOUT.tileSize * 2.5,
                                }}
                                onClick={(e) => { 
                                    if (isPanning.current) return;
                                    e.stopPropagation(); 
                                    setActivePanel('wardrobe'); 
                                }}
                            >
                                <Shirt size={32} className="hotspot-icon" />
                                <div className="hotspot-label">Closet</div>
                            </motion.div>

                            {/* Trophy Case — 2×2 tiles */}
                            <motion.div
                                className={`room-hotspot trophy-case-hotspot ${nearbyObj?.panel === 'trophies' ? 'nearby' : ''}`}
                                style={{
                                    left: interactables.trophyCase.x * ROOM_LAYOUT.tileSize,
                                    top: interactables.trophyCase.y * ROOM_LAYOUT.tileSize,
                                    width: ROOM_LAYOUT.tileSize * 2,
                                    height: ROOM_LAYOUT.tileSize * 2,
                                }}
                                onClick={(e) => { 
                                    if (isPanning.current) return;
                                    e.stopPropagation(); 
                                    setActivePanel('trophies'); 
                                }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>🏆</span>
                                <div className="hotspot-label">Trophies</div>
                            </motion.div>

                            {/* Placed Furniture from placement store */}
                            {placedRoomFurniture.map((placed) => (
                                <DraggableFurniturePiece
                                    key={placed.id}
                                    placed={placed}
                                    editMode={editMode}
                                    containerRef={containerRef}
                                />
                            ))}

                            {/* Pet */}
                            <motion.div
                                className="room-pet-follower"
                                animate={{
                                    left: (playerPosition.x - 1) * ROOM_LAYOUT.tileSize,
                                    top: playerPosition.y * ROOM_LAYOUT.tileSize
                                }}
                                transition={{ type: "tween", ease: "linear", duration: 0.35 }}
                                style={{
                                    position: 'absolute',
                                    width: ROOM_LAYOUT.tileSize,
                                    height: ROOM_LAYOUT.tileSize,
                                }}
                            >
                                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <span className="pet-emoji" style={{ position: 'absolute', bottom: '10px', left: 0, width: '100%', textAlign: 'center' }}>{petSprite}</span>
                                    <span className="pet-name-tag" style={{ position: 'absolute', bottom: '-15px', width: '150%', left: '-25%', textAlign: 'center' }}>{petName}</span>
                                </motion.div>
                            </motion.div>

                                {/* Player */}
                                <motion.div
                                    className="room-player"
                                    animate={{ 
                                        left: playerPosition.x * ROOM_LAYOUT.tileSize, 
                                        top: playerPosition.y * ROOM_LAYOUT.tileSize 
                                    }}
                                    transition={{ type: "tween", ease: "linear", duration: 0.25 }}
                                    style={{
                                        position: 'absolute',
                                        width: ROOM_LAYOUT.tileSize,
                                        height: ROOM_LAYOUT.tileSize,
                                    }}
                                >
                                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ position: 'relative', width: '100%', height: '100%' }}>
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
                                </motion.div>
                            </div>
                        </div>

                        {/* Proximity Interaction Prompt */}
                        <AnimatePresence>
                            {nearbyObj && !activePanel && (
                                <motion.div
                                    className="room-item-prompt"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    onClick={() => {
                                        setActivePanel(nearbyObj.panel);
                                        setTooltipSeen(true);
                                        keysPressed.current.clear();
                                    }}
                                    style={{ cursor: 'pointer' }}
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
                            {activePanel === 'bookshelf' && <LibraryCodex onClose={() => setActivePanel(null)} />}
                            {activePanel === 'sleep' && <SleepPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'body' && <BodyPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'loadout' && <LoadoutPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'trophies' && (
                                <div style={{ background: 'var(--gacha-bg-panel)', borderRadius: '1rem', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                        <button className="room-close-btn" onClick={() => setActivePanel(null)}><X size={18} /></button>
                                    </div>
                                    <TrophyHall />
                                </div>
                            )}
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
