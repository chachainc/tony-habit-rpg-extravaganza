import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Dumbbell, Scale, BedDouble, BookOpen, Shirt } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePetStore } from '../../store/usePetStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useHealthStore } from '../../store/useHealthStore';
import { ITEM_DATABASE } from '../../data/items';
import { SceneShell } from '../../components/scene';
import { WardrobePanel } from './WardrobePanel';
import { LibraryCodex } from '../library/LibraryCodex';
import { SleepPanel } from './SleepPanel';
import { LoadoutPanel } from '../character/LoadoutPanel';
import { FurniturePlacementPanel, DraggableFurniturePiece } from './FurniturePlacementPanel';
import { useRoomStore } from '../../store/useRoomStore';

import homeCampBg from '../../assets/room-bg.jpg';
import { useHeroImage } from '../../hooks/useHeroImage';
import './PlayerRoom.css';

type ActivePanel = 'wardrobe' | 'bookshelf' | 'sleep' | 'body' | 'loadout' | 'furniture_edit' | null;

/* ── Inline Body Panel (calorie + weight + water tracker) ── */
const WATER_GLASSES = 8;
const BodyPanel = ({ onClose }: { onClose: () => void }) => {
    const { logWeight, getLastWeight, hasLoggedWeightToday } = useHealthStore();
    const [weightVal, setWeightVal] = useState(getLastWeight()?.toString() ?? '');
    const [calorieVal, setCalorieVal] = useState('');
    const [saved, setSaved] = useState(false);
    const [waterCount, setWaterCount] = useState(0);
    const [heightIn, setHeightIn] = useState(70); // 5'10" default
    const navigate = useNavigate();

    const handleSave = () => {
        if (weightVal) logWeight(parseFloat(weightVal));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const bmi = weightVal && heightIn > 0
        ? ((parseFloat(weightVal) / (heightIn * heightIn)) * 703).toFixed(1)
        : null;
    const bmiCategory = bmi
        ? parseFloat(bmi) < 18.5 ? 'Underweight'
        : parseFloat(bmi) < 25 ? 'Normal'
        : parseFloat(bmi) < 30 ? 'Overweight'
        : 'Obese'
        : '';

    return (
        <div className="body-panel">
            <div className="body-panel__header">
                <h3>⚖️ Body Tracker</h3>
                <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
            </div>

            {/* Water tracker */}
            <div className="body-water-tracker">
                <label>💧 Water ({waterCount}/{WATER_GLASSES} glasses)</label>
                <div className="body-water-glasses">
                    {Array.from({ length: WATER_GLASSES }).map((_, i) => (
                        <button
                            key={i}
                            className={`water-glass ${i < waterCount ? 'water-glass--filled' : ''}`}
                            onClick={() => setWaterCount(i < waterCount ? i : i + 1)}
                        >
                            {i < waterCount ? '💧' : '🥛'}
                        </button>
                    ))}
                </div>
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
                    <label>Height (inches)</label>
                    <input
                        type="number"
                        value={heightIn}
                        onChange={(e) => setHeightIn(Number(e.target.value))}
                        min="36"
                        max="96"
                    />
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

            {/* BMI display */}
            {bmi && (
                <div className="body-bmi-display">
                    <span>BMI: <strong>{bmi}</strong></span>
                    <span className={`bmi-category bmi-${bmiCategory.toLowerCase()}`}>{bmiCategory}</span>
                </div>
            )}

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

type Hotspot = {
    id: string;
    label: string;
    icon: React.ReactNode | string;
    top: number; // Percentage
    left: number; // Percentage
    action: { type: 'panel', panel: ActivePanel } | { type: 'route', path: string };
};

const HOTSPOTS: Hotspot[] = [
    {
        id: 'library',
        label: 'Library',
        icon: <BookOpen size={24} />,
        top: 25,
        left: 20,
        action: { type: 'route', path: '/library' },
    },
    {
        id: 'wardrobe',
        label: 'Closet',
        icon: <Shirt size={24} />,
        top: 25,
        left: 80,
        action: { type: 'panel', panel: 'loadout' },
    },
    {
        id: 'bed',
        label: 'Bed',
        icon: <BedDouble size={24} />,
        top: 65,
        left: 25,
        action: { type: 'panel', panel: 'sleep' },
    },
    {
        id: 'pet_bed',
        label: 'Pet Bed',
        icon: '🧺',
        top: 75,
        left: 40,
        action: { type: 'route', path: '/pet' },
    },
    {
        id: 'dumbbell',
        label: 'Gym',
        icon: <Dumbbell size={24} />,
        top: 75,
        left: 65,
        action: { type: 'panel', panel: 'body' },
    },
    {
        id: 'scale',
        label: 'Health',
        icon: '⚖️',
        top: 75,
        left: 85,
        action: { type: 'route', path: '/health' },
    }
];

export const PlayerRoom = ({ onClose: _onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();

    const { equippedPetId, name: petName } = usePetStore();
    const { activeTitle, getUnlockedTitleDefs } = useTitleStore();
    const { activeAuraId } = useAuraStore();
    const { placedRoomFurniture } = useRoomStore();
    const heroImage = useHeroImage();

    const { editMode, setEditMode } = useRoomStore();
    const [activePanel, setActivePanel] = useState<ActivePanel>(editMode ? 'furniture_edit' : null);

    const [playerPos, setPlayerPos] = useState({ top: 50, left: 50 }); // Center of room naturally
    const [isMoving, setIsMoving] = useState(false);
    
    const location = useLocation();

    useEffect(() => {
        if (location.state?.autoEdit) {
            setEditMode(true);
            setActivePanel('furniture_edit');
        }
    }, [location.state]);

    // Get active aura and titles
    const activeAura = useMemo(() => AURAS.find(a => a.id === activeAuraId), [activeAuraId]);
    const activeTitleDef = useMemo(() => getUnlockedTitleDefs().find(t => t.id === activeTitle), [activeTitle, getUnlockedTitleDefs]);

    // Pet Sprite
    const petData = equippedPetId ? ITEM_DATABASE[equippedPetId] : null;
    const petSprite = petData?.icon || '🐮';

    const handleHotspotTap = (hotspot: Hotspot) => {
        if (isMoving) return;
        
        setIsMoving(true);
        // Move towards hotspot slightly offset to stand "next" to it
        setPlayerPos({ 
            top: hotspot.top + 5, 
            left: hotspot.left 
        });

        // Panel opens after brief delay
        setTimeout(() => {
            setIsMoving(false);
            if (hotspot.action.type === 'route') {
                navigate(hotspot.action.path);
            } else {
                setActivePanel(hotspot.action.panel);
            }
        }, 400); // 400ms movement time
    };

    return (
        <div className="player-room-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <SceneShell
                backgroundImage={homeCampBg}
                showFog={true}
                showVignette={true}
                showEmbers={true}
            >
                <div className="room-visual-hub" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                    {/* Top Action Bar */}
                    <div className="room-top-bar" style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}>
                        <button className="room-exit-btn" onClick={() => navigate('/room')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.85)', padding: '8px 16px', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <ArrowLeft size={18} /> Room Menu
                        </button>
                    </div>

                    {/* Edit Room Button */}
                    <button 
                        className={`room-edit-btn ${editMode ? 'active' : ''}`}
                        style={{ position: 'absolute', top: 16, right: 16, zIndex: 50, background: 'rgba(15, 23, 42, 0.85)', padding: '8px 16px', borderRadius: '12px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => { 
                            setEditMode(v => !v); 
                            setActivePanel(editMode ? null : 'furniture_edit'); 
                        }}
                    >
                        {editMode ? 'Done Editing' : '✏️ Edit Room'}
                    </button>

                    {/* Draggable Furniture Area */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: editMode ? 'auto' : 'none', zIndex: 15 }}>
                        {placedRoomFurniture.map((p) => (
                            <DraggableFurniturePiece
                                key={p.id}
                                placed={p}
                                editMode={editMode}
                            />
                        ))}
                    </div>

                    {/* Room Hotspots */}
                    {HOTSPOTS.map((hotspot) => (
                        <div
                            key={hotspot.id}
                            style={{
                                position: 'absolute',
                                top: `${hotspot.top}%`,
                                left: `${hotspot.left}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <motion.div
                                onClick={(e) => { e.stopPropagation(); handleHotspotTap(hotspot); }}
                                whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)',
                                    padding: '1.5rem',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{
                                        fontSize: '2rem',
                                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
                                        color: '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {hotspot.icon}
                                </motion.div>
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: '#fbbf24',
                                    fontWeight: 700,
                                    textShadow: '0 2px 4px rgba(0,0,0,1)',
                                    marginTop: '6px',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    background: 'rgba(0,0,0,0.6)',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}>
                                    {hotspot.label}
                                </span>
                            </motion.div>
                        </div>
                    ))}

                    {/* Character Sprite & Pet */}
                    <motion.div
                        className="room-player-container"
                        animate={{
                            top: `${playerPos.top}%`,
                            left: `${playerPos.left}%`,
                            x: '-50%',
                            y: '-100%' // anchor to bottom feet
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{
                            position: 'absolute',
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}
                    >
                         {/* Idle breathing animation container */}
                        <motion.div 
                            animate={{ y: [0, -2, 0] }} 
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} 
                            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
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
                                        style={{
                                            position: 'absolute',
                                            width: '120px',
                                            height: '120px',
                                            bottom: '-20px',
                                            borderRadius: '50%',
                                            zIndex: -1
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                            
                            {/* Pet follows slightly strictly behind/left */}
                            <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{
                                    position: 'absolute',
                                    left: '-50px',
                                    bottom: '10px',
                                    fontSize: '1.8rem',
                                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}
                            >
                                {petSprite}
                                <span style={{ fontSize: '0.55rem', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', marginTop: '4px', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {petName}
                                </span>
                            </motion.div>

                            <img src={heroImage} alt="Player" style={{ height: '110px', objectFit: 'contain', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.6))' }} />
                            
                            {activeTitleDef && (
                                <span style={{ 
                                    background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: '6px', 
                                    fontSize: '0.6rem', color: '#cbd5e1', fontWeight: 600, marginTop: '6px',
                                    border: '1px solid rgba(255,255,255,0.15)' 
                                }}>
                                    {activeTitleDef.name}
                                </span>
                            )}
                        </motion.div>
                    </motion.div>
                </div>
            </SceneShell>

            {/* Panel Modals */}
            <AnimatePresence>
                {activePanel && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActivePanel(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(15, 23, 42, 0.85)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        <motion.div
                            className="room-modal-container"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: '600px',
                                maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            {activePanel === 'wardrobe' && <WardrobePanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'bookshelf' && <LibraryCodex onClose={() => setActivePanel(null)} />}
                            {activePanel === 'sleep' && <SleepPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'body' && <BodyPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'loadout' && <LoadoutPanel onClose={() => setActivePanel(null)} />}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activePanel === 'furniture_edit' && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 100,
                            height: 'auto',
                            maxHeight: '40vh'
                        }}
                    >
                        <FurniturePlacementPanel
                            onClose={() => { setActivePanel(null); setEditMode(false); }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
