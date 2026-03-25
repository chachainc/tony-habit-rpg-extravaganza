import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, BookOpen, Shirt, Scale, Dumbbell, Pencil, Check, DollarSign, Menu } from 'lucide-react';
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
import { WorkshopPanel } from './WorkshopPanel';
import { GardenPanel } from './GardenPanel';
import { CellarPanel } from './CellarPanel';
import { PetInteractionPanel } from './PetInteractionPanel';

// --- CAMERA CONSTANTS ---
const CANVAS_W = 2048;
const CANVAS_H = 2048;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.0;
const TAP_THRESHOLD = 8;
const TILE = 64; // Grid tile size

// AI-generated assets
import homeCampBg from '../../assets/room-bg.jpg';
import bookshelfBg from '../../assets/backgrounds/bookshelf_display.png';
import { useHeroImage } from '../../hooks/useHeroImage';
import './WalkableRoom.css';
import './PlayerRoom.css';
import './FurniturePlacementPanel.css';

type ActivePanel = 'wardrobe' | 'bookshelf' | 'sleep' | 'body' | 'furniture_edit' | 'loadout' | 'trophies' | 'workshop' | 'garden' | 'cellar' | 'pet' | null;

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

// Room layout config
const ROOM_LAYOUT = {
    gridSize: { width: 32, height: 32 },
    tileSize: TILE,
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

/* ══════ DECORATIVE WORLD ELEMENTS ══════ */
type DecoItem = { emoji: string; x: number; y: number; size: number; flicker?: boolean };
const DECO_ITEMS: DecoItem[] = [
    // ── North wall storage row ──
    { emoji: '🪵', x: 0, y: 0, size: 1.8 },
    { emoji: '🛢️', x: 1, y: 0, size: 1.5 },
    { emoji: '📦', x: 2, y: 0, size: 1.3 },
    { emoji: '🧱', x: 10, y: 0, size: 1.2 },
    { emoji: '🪴', x: 14, y: 0, size: 1.8 },
    { emoji: '🏴', x: 19, y: 0, size: 1.6 },
    { emoji: '📦', x: 29, y: 0, size: 1.4 },
    { emoji: '📦', x: 30, y: 0, size: 1.3 },
    { emoji: '🪵', x: 31, y: 0, size: 1.6 },

    // ── South wall storage row ──
    { emoji: '🪣', x: 0, y: 31, size: 1.3 },
    { emoji: '🧺', x: 1, y: 31, size: 1.4 },
    { emoji: '🪵', x: 2, y: 31, size: 1.2 },
    { emoji: '🛢️', x: 9, y: 31, size: 1.3 },
    { emoji: '🪴', x: 15, y: 31, size: 1.7 },
    { emoji: '📦', x: 22, y: 31, size: 1.4 },
    { emoji: '🧱', x: 28, y: 31, size: 1.2 },
    { emoji: '📦', x: 30, y: 31, size: 1.5 },
    { emoji: '🛢️', x: 31, y: 31, size: 1.4 },

    // ── East wall accents ──
    { emoji: '🪵', x: 31, y: 1, size: 1.4 },
    { emoji: '🧱', x: 31, y: 17, size: 1.2 },
    { emoji: '📦', x: 31, y: 28, size: 1.3 },

    // ── West wall accents ──
    { emoji: '🧱', x: 0, y: 3, size: 1.2 },
    { emoji: '📦', x: 0, y: 28, size: 1.3 },

    // ── Wall torches (left) ──
    { emoji: '🕯️', x: 0, y: 6, size: 1.6, flicker: true },
    { emoji: '🕯️', x: 0, y: 14, size: 1.6, flicker: true },
    { emoji: '🕯️', x: 0, y: 22, size: 1.6, flicker: true },

    // ── Wall torches (right) ──
    { emoji: '🕯️', x: 31, y: 6, size: 1.6, flicker: true },
    { emoji: '🕯️', x: 31, y: 14, size: 1.6, flicker: true },
    { emoji: '🕯️', x: 31, y: 22, size: 1.6, flicker: true },

    // ── Wall torches (top) ──
    { emoji: '🕯️', x: 8, y: 0, size: 1.4, flicker: true },
    { emoji: '🕯️', x: 23, y: 0, size: 1.4, flicker: true },

    // ── Wall torches (bottom) ──
    { emoji: '🕯️', x: 6, y: 31, size: 1.4, flicker: true },
    { emoji: '🕯️', x: 25, y: 31, size: 1.4, flicker: true },

    // ── Courtyard greenery (between zones) ──
    { emoji: '🌿', x: 7, y: 1, size: 1.5 },
    { emoji: '🌿', x: 22, y: 1, size: 1.4 },
    { emoji: '🪴', x: 10, y: 8, size: 1.5 },
    { emoji: '🌿', x: 20, y: 8, size: 1.3 },
    { emoji: '🪴', x: 9, y: 17, size: 1.4 },
    { emoji: '🌿', x: 21, y: 17, size: 1.3 },
    { emoji: '🌿', x: 8, y: 29, size: 1.2 },
    { emoji: '🌿', x: 23, y: 29, size: 1.3 },

    // ── Courtyard furniture (outdoor common area) ──
    { emoji: '🪑', x: 12, y: 9, size: 1.4 },
    { emoji: '🪑', x: 13, y: 9, size: 1.4 },
    { emoji: '🍽️', x: 12, y: 10, size: 1.8 },  // outdoor table
    { emoji: '🪑', x: 14, y: 10, size: 1.4 },
    { emoji: '🕯️', x: 13, y: 10, size: 1.2, flicker: true },

    // ── Well area (center-south) ──
    { emoji: '🪨', x: 14, y: 19, size: 1.5 },
    { emoji: '💧', x: 15, y: 19, size: 1.8 },
    { emoji: '🪨', x: 16, y: 19, size: 1.5 },
    { emoji: '🪣', x: 17, y: 19, size: 1.2 },

    // ── Central campfire pit ──
    { emoji: '🪨', x: 14, y: 14, size: 1.1 },
    { emoji: '🔥', x: 15, y: 15, size: 2.4, flicker: true },
    { emoji: '🪨', x: 16, y: 14, size: 1.1 },
    { emoji: '🪵', x: 14, y: 16, size: 1.3 },
    { emoji: '🪵', x: 16, y: 16, size: 1.3 },
    { emoji: '🪑', x: 13, y: 15, size: 1.3 },
    { emoji: '🪑', x: 17, y: 15, size: 1.3 },

    // ── Hay bales & farm props (near garden) ──
    { emoji: '🌾', x: 10, y: 23, size: 1.5 },
    { emoji: '🌾', x: 21, y: 23, size: 1.4 },
    { emoji: '🌾', x: 9, y: 28, size: 1.3 },
    { emoji: '🌾', x: 22, y: 28, size: 1.4 },

    // ── Scattered floor props ──
    { emoji: '🗝️', x: 16, y: 10, size: 1.0 },
    { emoji: '📜', x: 6, y: 18, size: 1.1 },
    { emoji: '🧪', x: 23, y: 18, size: 1.2 },
    { emoji: '⚗️', x: 24, y: 18, size: 1.2 },
    { emoji: '🍄', x: 13, y: 20, size: 1.3 },
    { emoji: '🪨', x: 20, y: 20, size: 1.2 },
    { emoji: '📜', x: 17, y: 22, size: 1.0 },

    // ── Bench row near workshop ──
    { emoji: '🪑', x: 11, y: 8, size: 1.3 },
    { emoji: '🪑', x: 18, y: 8, size: 1.3 },

    // ── Cooking station (east side) ──
    { emoji: '🍲', x: 27, y: 18, size: 1.8, flicker: true },
    { emoji: '🪵', x: 28, y: 18, size: 1.2 },
    { emoji: '🧅', x: 27, y: 19, size: 1.1 },
    { emoji: '🥕', x: 28, y: 19, size: 1.1 },

    // ── Notice board / signpost ──
    { emoji: '🪧', x: 15, y: 12, size: 1.8 },

    // ── Fencing along garden perimeter ──
    { emoji: '🏗️', x: 10, y: 23, size: 0.9 },
    { emoji: '🏗️', x: 20, y: 23, size: 0.9 },

    // ── Flags & banners ──
    { emoji: '🚩', x: 9, y: 2, size: 1.6 },
    { emoji: '🚩', x: 21, y: 2, size: 1.6 },
    { emoji: '🏳️', x: 9, y: 15, size: 1.4 },
    { emoji: '🏳️', x: 21, y: 15, size: 1.4 },
];

/* ══════ WORLD ZONE DEFINITIONS ══════ */
const ZONES = {
    bedroom: {
        x: 2, y: 2, w: 7, h: 5,
        panel: 'sleep' as ActivePanel,
        label: 'Bedroom',
        sublabel: 'Sleep Log',
        theme: 'zone-bedroom',
        deco: [
            { emoji: '🛏️', ox: 1, oy: 1, size: 3.5 },
            { emoji: '🕯️', ox: 5, oy: 0, size: 1.8, flicker: true },
            { emoji: '🛋️', ox: 0, oy: 3, size: 2.0 },
            { emoji: '✨', ox: 3, oy: 0, size: 1.2 },
            { emoji: '🧸', ox: 5, oy: 3, size: 1.5 },
            // Added depth
            { emoji: '🖼️', ox: 0, oy: 0, size: 1.8 },  // wall painting
            { emoji: '🕰️', ox: 6, oy: 1, size: 1.4 },  // clock
            { emoji: '🌙', ox: 4, oy: 0, size: 1.0 },   // night accent
        ],
    },
    library: {
        x: 2, y: 9, w: 8, h: 5,
        panel: 'bookshelf' as ActivePanel,
        label: 'Library',
        sublabel: 'Book Collection',
        theme: 'zone-library',
        deco: [
            // Back wall bookshelves
            { emoji: '📚', ox: 0, oy: 0, size: 2.8 },
            { emoji: '📚', ox: 2, oy: 0, size: 2.5 },
            { emoji: '📚', ox: 7, oy: 0, size: 2.4 },
            // Reading area
            { emoji: '📖', ox: 3, oy: 2, size: 2.0 },
            { emoji: '🪑', ox: 4, oy: 2, size: 1.5 },
            { emoji: '🪑', ox: 2, oy: 2, size: 1.4 },
            // Desk & lamp
            { emoji: '📝', ox: 5, oy: 3, size: 1.4 },
            { emoji: '🕯️', ox: 6, oy: 0, size: 1.6, flicker: true },
            { emoji: '🕯️', ox: 3, oy: 1, size: 1.2, flicker: true },
            // Globe & scroll accents
            { emoji: '🌍', ox: 7, oy: 3, size: 1.5 },
            { emoji: '📜', ox: 1, oy: 3, size: 1.2 },
            { emoji: '🪶', ox: 5, oy: 2, size: 1.0 },
        ],
        hasImage: true,
    },
    wardrobe: {
        x: 22, y: 2, w: 7, h: 6,
        panel: 'wardrobe' as ActivePanel,
        label: 'Wardrobe',
        sublabel: 'Titles, Auras, Pets',
        theme: 'zone-wardrobe',
        deco: [
            // Armor stands
            { emoji: '🪞', ox: 0, oy: 0, size: 2.5 },
            { emoji: '👗', ox: 3, oy: 0, size: 2.8 },
            { emoji: '⚔️', ox: 5, oy: 0, size: 2.2 },
            // Weapon rack
            { emoji: '🏹', ox: 6, oy: 2, size: 1.8 },
            { emoji: '🛡️', ox: 5, oy: 3, size: 2.0 },
            { emoji: '🗡️', ox: 6, oy: 4, size: 1.6 },
            // Accessories
            { emoji: '👑', ox: 2, oy: 4, size: 1.6 },
            { emoji: '💍', ox: 1, oy: 4, size: 1.2 },
            { emoji: '🕯️', ox: 0, oy: 4, size: 1.5, flicker: true },
            { emoji: '🕯️', ox: 6, oy: 0, size: 1.3, flicker: true },
            // Hanging banner
            { emoji: '🎪', ox: 3, oy: 2, size: 1.6 },
        ],
    },
    trophy: {
        x: 22, y: 10, w: 7, h: 5,
        panel: 'trophies' as ActivePanel,
        label: 'Trophy Hall',
        sublabel: 'Display Case',
        theme: 'zone-trophy',
        deco: [
            // Central trophy
            { emoji: '🏆', ox: 3, oy: 1, size: 3.5 },
            // Medal pedestals
            { emoji: '🥇', ox: 0, oy: 0, size: 2.0 },
            { emoji: '🥈', ox: 1, oy: 2, size: 1.6 },
            { emoji: '🥉', ox: 0, oy: 3, size: 1.5 },
            { emoji: '🏅', ox: 5, oy: 0, size: 1.8 },
            { emoji: '🎖️', ox: 6, oy: 2, size: 1.5 },
            // Sparkle accents
            { emoji: '✨', ox: 2, oy: 0, size: 1.3 },
            { emoji: '✨', ox: 4, oy: 0, size: 1.3 },
            { emoji: '✨', ox: 3, oy: 3, size: 1.0 },
            // Candles
            { emoji: '🕯️', ox: 6, oy: 3, size: 1.5, flicker: true },
            { emoji: '🕯️', ox: 0, oy: 1, size: 1.3, flicker: true },
            // Display shelf
            { emoji: '🗄️', ox: 5, oy: 3, size: 1.4 },
        ],
    },
    body: {
        x: 2, y: 22, w: 6, h: 5,
        panel: 'body' as ActivePanel,
        label: 'Body Station',
        sublabel: 'Weight & Fitness',
        theme: 'zone-body',
        deco: [
            { emoji: '⚖️', ox: 1, oy: 1, size: 2.8 },
            { emoji: '🏋️', ox: 4, oy: 1, size: 2.5 },
            { emoji: '🎯', ox: 3, oy: 3, size: 1.8 },
            { emoji: '💪', ox: 0, oy: 3, size: 1.6 },
            // Gym accents
            { emoji: '🥊', ox: 5, oy: 0, size: 1.5 },
            { emoji: '🧘', ox: 0, oy: 0, size: 1.6 },
            { emoji: '💧', ox: 5, oy: 3, size: 1.2 },
            { emoji: '🪑', ox: 2, oy: 3, size: 1.3 },
        ],
    },
    // ── Decorative-only zones (future hooks) ──
    workshop: {
        x: 11, y: 2, w: 8, h: 5,
        panel: 'workshop' as ActivePanel,
        label: 'Workshop',
        sublabel: 'Forge & Enchant',
        theme: 'zone-workshop',
        deco: [
            { emoji: '⚒️', ox: 1, oy: 1, size: 2.8 },
            { emoji: '🔨', ox: 4, oy: 0, size: 2.0 },
            { emoji: '📦', ox: 6, oy: 2, size: 1.8 },
            { emoji: '🧱', ox: 0, oy: 3, size: 1.5 },
            { emoji: '🪵', ox: 5, oy: 3, size: 1.6 },
            // Anvil & forge
            { emoji: '🔥', ox: 7, oy: 0, size: 1.5, flicker: true },
            { emoji: '⚙️', ox: 3, oy: 3, size: 1.4 },
            { emoji: '🔩', ox: 2, oy: 2, size: 1.1 },
            { emoji: '📐', ox: 6, oy: 0, size: 1.2 },
        ],
    },
    garden: {
        x: 11, y: 24, w: 9, h: 6,
        panel: 'garden' as ActivePanel,
        label: 'Garden',
        sublabel: 'Plant & Harvest',
        theme: 'zone-garden',
        deco: [
            { emoji: '🪴', ox: 1, oy: 1, size: 2.5 },
            { emoji: '🌻', ox: 3, oy: 0, size: 2.2 },
            { emoji: '🌿', ox: 5, oy: 1, size: 2.0 },
            { emoji: '🌸', ox: 0, oy: 3, size: 1.8 },
            { emoji: '🪻', ox: 7, oy: 2, size: 2.0 },
            // More garden depth
            { emoji: '🌷', ox: 2, oy: 4, size: 1.6 },
            { emoji: '🌼', ox: 6, oy: 4, size: 1.5 },
            { emoji: '🪨', ox: 7, oy: 4, size: 1.5 },
            { emoji: '🦋', ox: 4, oy: 1, size: 1.3 },
            { emoji: '🐝', ox: 8, oy: 0, size: 1.0 },
            { emoji: '💧', ox: 4, oy: 3, size: 1.8 },
            { emoji: '🌱', ox: 1, oy: 4, size: 1.3 },
            { emoji: '🧑‍🌾', ox: 5, oy: 3, size: 1.6 },
        ],
    },
    // ── Storage Cellar (bottom-right, decorative) ──
    cellar: {
        x: 22, y: 22, w: 7, h: 5,
        panel: 'cellar' as ActivePanel,
        label: 'Cellar',
        sublabel: 'Inventory Vault',
        theme: 'zone-cellar',
        deco: [
            { emoji: '🛢️', ox: 0, oy: 0, size: 2.2 },
            { emoji: '🛢️', ox: 2, oy: 0, size: 2.0 },
            { emoji: '📦', ox: 4, oy: 0, size: 2.0 },
            { emoji: '📦', ox: 5, oy: 1, size: 1.8 },
            { emoji: '🧰', ox: 0, oy: 2, size: 1.8 },
            { emoji: '🕸️', ox: 6, oy: 0, size: 1.5 },
            { emoji: '🕯️', ox: 3, oy: 3, size: 1.4, flicker: true },
            { emoji: '🗝️', ox: 5, oy: 3, size: 1.2 },
            { emoji: '🧱', ox: 1, oy: 3, size: 1.3 },
        ],
    },
};

/* ══════ PATH SEGMENTS (connecting zones) ══════ */
const PATHS = [
    // ── Horizontal main road ──
    { x: 9, y: 4, w: 2, h: 1 },    // bedroom → workshop
    { x: 19, y: 4, w: 3, h: 1 },   // workshop → wardrobe
    { x: 10, y: 11, w: 12, h: 1 }, // library → trophy (main cross corridor)
    { x: 8, y: 24, w: 3, h: 1 },   // body → garden
    { x: 20, y: 24, w: 2, h: 1 },  // garden → cellar

    // ── Vertical main road ──
    { x: 5, y: 7, w: 1, h: 2 },    // bedroom → library
    { x: 5, y: 14, w: 1, h: 8 },   // library → body
    { x: 25, y: 8, w: 1, h: 2 },   // wardrobe → trophy
    { x: 25, y: 15, w: 1, h: 7 },  // trophy → cellar
    { x: 15, y: 7, w: 1, h: 4 },   // workshop → center
    { x: 15, y: 17, w: 1, h: 7 },  // center → garden

    // ── Narrow alleys (cross-connections) ──
    { x: 9, y: 14, w: 1, h: 1 },   // library side exit
    { x: 20, y: 14, w: 1, h: 1 },  // trophy side exit
    { x: 9, y: 22, w: 1, h: 2 },   // west alley to body
    { x: 20, y: 22, w: 1, h: 2 },  // east alley to garden

    // ── Perimeter walkway ──
    { x: 2, y: 18, w: 1, h: 4 },   // west wall path
    { x: 29, y: 18, w: 1, h: 4 },  // east wall path
];

export const PlayerRoom = ({ onClose }: { onClose: () => void }) => {
    const {
        playerPosition, setPlayerPosition,
        placedRoomFurniture, placeRoomFurniture,
        getPlacedBonusSummary,
        currentRoomId, unlockedRooms, switchRoom,
    } = useRoomStore();

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
    const [editMode, setEditMode] = useState(false);
    const [placingFurnitureId, setPlacingFurnitureId] = useState<string | null>(null);
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const [showRoomFab, setShowRoomFab] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Camera State
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0, scale: 0.5 });
    const isPanning = useRef(false);

    // Multi-touch tracking
    const activePointers = useRef<Map<number, React.PointerEvent>>(new Map());
    const initialPinchDist = useRef<number | null>(null);
    const initialPinchScale = useRef<number>(1);
    const lastPanPoint = useRef<{ x: number, y: number } | null>(null);
    const touchStartOffset = useRef<{ x: number, y: number } | null>(null);

    // Get active aura and titles
    const activeAura = useMemo(() => AURAS.find(a => a.id === activeAuraId), [activeAuraId]);
    const activeTitleDef = useMemo(() => getUnlockedTitleDefs().find(t => t.id === activeTitle), [activeTitle, getUnlockedTitleDefs]);

    // Pet Sprite
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';

    // Placement click handler
    const handlePlacementClick = useCallback((e: React.MouseEvent) => {
        if (!placingFurnitureId || !containerRef.current) return;
        e.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const worldX = clientX / panOffset.scale;
        const worldY = clientY / panOffset.scale;
        const xPercent = Math.max(0, Math.min(100, (worldX / CANVAS_W) * 100));
        const yPercent = Math.max(0, Math.min(100, (worldY / CANVAS_H) * 100));

        placeRoomFurniture(placingFurnitureId, xPercent, yPercent);
        setPlacingFurnitureId(null);
    }, [placingFurnitureId, placeRoomFurniture, panOffset.scale]);

    const bonusSummary = useMemo(() => getPlacedBonusSummary(), [placedRoomFurniture]);

    // Keyboard Movement
    useEffect(() => {
        if (activePanel) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                e.preventDefault();
                keysPressed.current.add(key);
            }
            if (key === 'escape') {
                setActivePanel(null);
                setShowQuickMenu(false);
            }
            if (key === 'e') {
                handleInteract();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
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

    // Interactable proximity — checks zones
    const interactables = Object.values(ZONES).filter(z => z.panel !== null);

    const getNearbyInteractable = () => {
        for (const zone of interactables) {
            const cx = zone.x + zone.w / 2;
            const cy = zone.y + zone.h / 2;
            const dist = Math.abs(cx - playerPosition.x) + Math.abs(cy - playerPosition.y);
            if (dist <= zone.w) return zone;
        }
        return null;
    };

    const nearbyObj = getNearbyInteractable();

    const handleInteract = () => {
        if (nearbyObj && nearbyObj.panel) {
            setActivePanel(nearbyObj.panel);
            setTooltipSeen(true);
            keysPressed.current.clear();
        }
    };

    // Initialize Camera — center on player
    useEffect(() => {
        if (viewportRef.current) {
            const vw = viewportRef.current.clientWidth;
            const vh = viewportRef.current.clientHeight;
            const px = playerPosition.x * TILE;
            const py = playerPosition.y * TILE;
            const scale = 0.5;
            const x = vw / 2 - px * scale;
            const y = vh / 2 - py * scale;
            setPanOffset({ x, y, scale });
        }
    }, []);

    // ─── CAMERA LOGIC ───────────────────────────────────
    const getPointersDist = (p1: React.PointerEvent, p2: React.PointerEvent) => {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    };

    const clampOffset = (x: number, y: number, scale: number) => {
        const vw = viewportRef.current?.clientWidth ?? 0;
        const vh = viewportRef.current?.clientHeight ?? 0;
        const scaledW = CANVAS_W * scale;
        const scaledH = CANVAS_H * scale;
        const minX = Math.min(0, vw - scaledW);
        const maxX = Math.max(0, vw - scaledW);
        const minY = Math.min(0, vh - scaledH);
        const maxY = Math.max(0, vh - scaledH);
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

    // Grid Tap-To-Move
    const handleGridTap = (e: React.MouseEvent) => {
        if (isPanning.current) return;
        if (placingFurnitureId) {
            handlePlacementClick(e);
            return;
        }
        if (activePanel || editMode) return;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const absoluteX = clientX / panOffset.scale;
        const absoluteY = clientY / panOffset.scale;
        const gridX = Math.floor(absoluteX / TILE);
        const gridY = Math.floor(absoluteY / TILE);
        const boundedX = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.width - 1, gridX));
        const boundedY = Math.max(0, Math.min(ROOM_LAYOUT.gridSize.height - 1, gridY));

        if (isWalkable(boundedX, boundedY, [])) {
            setPlayerPosition(boundedX, boundedY);
        }
    };

    return (
        <div className="player-room-container">
            <SceneShell
                backgroundImage={homeCampBg}
                showFog={true}
                showVignette={true}
                showEmbers={true}
            >
                <div className="walkable-room">
                    {/* ── Top Action Bar ── */}
                    <div className="room-top-bar">
                        <button className="room-exit-btn" onClick={onClose}>
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
                            >◀</button>
                            <div className="room-nav-label">
                                <span className="room-nav-icon">{currentRoomDef?.icon}</span>
                                <span className="room-nav-name">{currentRoomDef?.name ?? 'Bedroom'}</span>
                            </div>
                            <button
                                className="room-nav-arrow"
                                disabled={!nextRoom || !unlockedRooms.includes(nextRoom.id)}
                                onClick={() => nextRoom && switchRoom(nextRoom.id)}
                                title={nextRoom ? nextRoom.unlockCondition ?? nextRoom.name : ''}
                            >▶</button>
                        </div>

                        {bonusSummary.length > 0 && !editMode && (
                            <div className="room-bonus-chip" onClick={() => setActivePanel('furniture_edit')}>
                                ✨ {bonusSummary.length} bonus{bonusSummary.length > 1 ? 'es' : ''} active
                            </div>
                        )}
                        {!editMode && (() => {
                            const comfort = useRoomStore.getState().getComfortScore();
                            return comfort.score > 0 ? (
                                <div className="room-comfort-chip" onClick={() => setActivePanel('furniture_edit')}>
                                    🏠 {comfort.tier} ({comfort.score})
                                    {comfort.xpMultiplier > 1 && <small> +{Math.round((comfort.xpMultiplier - 1) * 100)}% XP/Gold</small>}
                                </div>
                            ) : null;
                        })()}
                        <button
                            className={`room-edit-btn ${editMode ? 'active' : ''}`}
                            onClick={() => { setEditMode(v => !v); setPlacingFurnitureId(null); setActivePanel(editMode ? null : 'furniture_edit'); }}
                        >
                            {editMode ? <><Check size={16} /> Done</> : <><Pencil size={16} /> Edit Room</>}
                        </button>
                    </div>

                    {/* ── Room Panels FAB ── */}
                    <AnimatePresence>
                        {showRoomFab && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute', bottom: 70, right: 12, zIndex: 30,
                                    display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end',
                                }}
                            >
                                {([
                                    { label: '🌱 Garden', panel: 'garden' as ActivePanel },
                                    { label: '⚒️ Workshop', panel: 'workshop' as ActivePanel },
                                    { label: '🛢 Cellar', panel: 'cellar' as ActivePanel },
                                    { label: '🐾 Pet', panel: 'pet' as ActivePanel },
                                ]).map(({ label, panel }) => (
                                    <button
                                        key={panel}
                                        onClick={() => { setActivePanel(panel); setShowRoomFab(false); }}
                                        style={{
                                            background: 'rgba(15,23,42,0.95)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            borderRadius: 10,
                                            color: '#e2e8f0',
                                            padding: '0.45rem 1rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setShowRoomFab(v => !v)}
                        style={{
                            position: 'absolute', bottom: 16, right: 12, zIndex: 30,
                            width: 48, height: 48, borderRadius: '50%',
                            background: showRoomFab
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none', color: 'white',
                            fontSize: showRoomFab ? '1.5rem' : '1.8rem',
                            fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        title={showRoomFab ? 'Close' : 'Open Panels'}
                    >
                        {showRoomFab ? '✕' : '+'}
                    </button>

                    {/* ── Viewport / Camera ── */}
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
                        <div
                            ref={containerRef}
                            className={`room-grid world-grid ${placingFurnitureId ? 'placing-mode' : ''}`}
                            style={{
                                width: CANVAS_W,
                                height: CANVAS_H,
                                position: 'absolute',
                                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${panOffset.scale})`,
                                transformOrigin: '0 0',
                                willChange: 'transform'
                            }}
                        >
                            {/* Grid lines (subtle) */}
                            <div style={{ position: 'absolute', inset: 0, opacity: editMode ? 0.2 : 0.04, backgroundSize: `${TILE}px ${TILE}px`, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)' }} />

                            {/* Edit mode label */}
                            {editMode && (
                                <div className="fp-edit-mode-badge">
                                    {placingFurnitureId ? 'Tap to place furniture' : 'Drag furniture to reposition'}
                                </div>
                            )}

                            {/* ═══ STONE WALLS ═══ */}
                            <div className="world-wall world-wall--top" />
                            <div className="world-wall world-wall--bottom" />
                            <div className="world-wall world-wall--left" />
                            <div className="world-wall world-wall--right" />

                            {/* ═══ WALKABLE PATHS ═══ */}
                            {PATHS.map((p, i) => (
                                <div
                                    key={`path-${i}`}
                                    className="world-path"
                                    style={{
                                        left: p.x * TILE,
                                        top: p.y * TILE,
                                        width: p.w * TILE,
                                        height: p.h * TILE,
                                    }}
                                />
                            ))}

                            {/* ═══ WORLD ZONES ═══ */}
                            {Object.entries(ZONES).map(([key, zone]) => (
                                <div
                                    key={key}
                                    className={`world-zone ${zone.theme} ${zone.panel ? 'world-zone--interactive' : 'world-zone--decorative'}`}
                                    style={{
                                        left: zone.x * TILE,
                                        top: zone.y * TILE,
                                        width: zone.w * TILE,
                                        height: zone.h * TILE,
                                    }}
                                    onClick={(e) => {
                                        if (isPanning.current || !zone.panel) return;
                                        e.stopPropagation();
                                        setActivePanel(zone.panel);
                                    }}
                                >
                                    {/* Zone background image (library bookshelf) */}
                                    {'hasImage' in zone && zone.hasImage && (
                                        <img src={bookshelfBg} alt="" className="zone-bg-image" />
                                    )}

                                    {/* Zone decorative emoji */}
                                    {zone.deco.map((d, i) => (
                                        <span
                                            key={i}
                                            className={`zone-deco-item ${'flicker' in d && d.flicker ? 'deco-flicker' : ''}`}
                                            style={{
                                                left: d.ox * TILE,
                                                top: d.oy * TILE,
                                                fontSize: `${d.size}rem`,
                                            }}
                                        >
                                            {d.emoji}
                                        </span>
                                    ))}

                                    {/* Zone label */}
                                    <div className="zone-label-plate">
                                        <span className="zone-label-name">{zone.label}</span>
                                        <span className="zone-label-sub">{zone.sublabel}</span>
                                    </div>
                                </div>
                            ))}

                            {/* ═══ DECORATIVE CLUTTER ═══ */}
                            {DECO_ITEMS.map((item, i) => (
                                <span
                                    key={`deco-${i}`}
                                    className={`deco-world-item ${item.flicker ? 'deco-flicker' : ''}`}
                                    style={{
                                        left: item.x * TILE + TILE * 0.15,
                                        top: item.y * TILE + TILE * 0.15,
                                        fontSize: `${item.size}rem`,
                                    }}
                                >
                                    {item.emoji}
                                </span>
                            ))}

                            {/* ═══ PLACED FURNITURE ═══ */}
                            {placedRoomFurniture.map((placed) => (
                                <DraggableFurniturePiece
                                    key={placed.id}
                                    placed={placed}
                                    editMode={editMode}
                                    containerRef={containerRef}
                                />
                            ))}

                            {/* ═══ PET FOLLOWER ═══ */}
                            <motion.div
                                className="room-pet-follower"
                                animate={{
                                    left: (playerPosition.x - 1) * TILE,
                                    top: playerPosition.y * TILE
                                }}
                                transition={{ type: "tween", ease: "linear", duration: 0.35 }}
                                style={{
                                    position: 'absolute',
                                    width: TILE,
                                    height: TILE,
                                }}
                            >
                                <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <span className="pet-emoji" style={{ position: 'absolute', bottom: '10px', left: 0, width: '100%', textAlign: 'center' }}>{petSprite}</span>
                                    <span className="pet-name-tag" style={{ position: 'absolute', bottom: '-15px', width: '150%', left: '-25%', textAlign: 'center' }}>{petName}</span>
                                </motion.div>
                            </motion.div>

                            {/* ═══ PLAYER CHARACTER ═══ */}
                            <motion.div
                                className="room-player"
                                animate={{
                                    left: playerPosition.x * TILE,
                                    top: playerPosition.y * TILE
                                }}
                                transition={{ type: "tween", ease: "linear", duration: 0.25 }}
                                style={{
                                    position: 'absolute',
                                    width: TILE,
                                    height: TILE,
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

                    {/* ── Proximity Interaction Prompt ── */}
                    <AnimatePresence>
                        {nearbyObj && nearbyObj.panel && !activePanel && (
                            <motion.div
                                className="room-item-prompt"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                onClick={() => {
                                    if (nearbyObj.panel) {
                                        setActivePanel(nearbyObj.panel);
                                        setTooltipSeen(true);
                                        keysPressed.current.clear();
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <strong>{nearbyObj.label}</strong>
                                {!tooltipSeen && <span className="press-key-hint">['E']</span>}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Mobile Quick Menu FAB ── */}
                    <button
                        className="quick-menu-fab"
                        onClick={() => setShowQuickMenu(v => !v)}
                        aria-label="Quick Menu"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </SceneShell>

            {/* ═══ QUICK MENU SHEET ═══ */}
            <AnimatePresence>
                {showQuickMenu && (
                    <motion.div
                        className="quick-menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQuickMenu(false)}
                    >
                        <motion.div
                            className="quick-menu-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="quick-menu-handle" />
                            <div className="quick-menu-grid">
                                <button className="room-feature-btn room-feature-btn--wardrobe" onClick={() => { setShowQuickMenu(false); setActivePanel('wardrobe'); }}>
                                    <Shirt size={24} />
                                    <span>Closet</span>
                                    <small>Titles, Auras, Pets</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--sleep" onClick={() => { setShowQuickMenu(false); setActivePanel('sleep'); }}>
                                    <BedDouble size={24} />
                                    <span>Bed</span>
                                    <small>Sleep Log</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--bookshelf" onClick={() => { setShowQuickMenu(false); setActivePanel('bookshelf'); }}>
                                    <BookOpen size={24} />
                                    <span>Library</span>
                                    <small>Books</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--body" onClick={() => { setShowQuickMenu(false); setActivePanel('body'); }}>
                                    <Scale size={24} />
                                    <span>Body</span>
                                    <small>Weight & Fitness</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--gym" onClick={() => { setShowQuickMenu(false); navigate('/gym'); }}>
                                    <Dumbbell size={24} />
                                    <span>Gym</span>
                                    <small>Tracker</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--budget" onClick={() => { setShowQuickMenu(false); navigate('/budget'); }}>
                                    <DollarSign size={24} />
                                    <span>Budget</span>
                                    <small>Finances</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--pet" onClick={() => { setShowQuickMenu(false); setActivePanel('pet'); }}>
                                    <span style={{ fontSize: '1.5rem' }}>{petSprite || '🐾'}</span>
                                    <span>Pet</span>
                                    <small>Feed & Play</small>
                                </button>
                                <button className="room-feature-btn room-feature-btn--wardrobe" onClick={() => { setShowQuickMenu(false); setActivePanel('loadout'); }}>
                                    <span style={{ fontSize: '1.5rem' }}>⚔️</span>
                                    <span>Loadout</span>
                                    <small>Equipment</small>
                                </button>
                                <button
                                    className="room-feature-btn"
                                    style={{ borderColor: 'rgba(251,191,36,0.3)' }}
                                    onClick={() => { setShowQuickMenu(false); setActivePanel('trophies'); }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>🏆</span>
                                    <span>Trophies</span>
                                    <small>Display</small>
                                </button>
                                <button
                                    className="room-feature-btn"
                                    style={{ borderColor: 'rgba(34,197,94,0.3)' }}
                                    onClick={() => { setShowQuickMenu(false); setEditMode(true); setActivePanel('furniture_edit'); }}
                                >
                                    <Pencil size={22} />
                                    <span>Arrange</span>
                                    <small>Furniture</small>
                                </button>
                                <button className="room-feature-btn" style={{ borderColor: 'rgba(245,158,11,0.3)' }} onClick={() => { setShowQuickMenu(false); setActivePanel('workshop'); }}>
                                    <span style={{ fontSize: '1.5rem' }}>⚒️</span>
                                    <span>Workshop</span>
                                    <small>Craft & Enchant</small>
                                </button>
                                <button className="room-feature-btn" style={{ borderColor: 'rgba(34,197,94,0.3)' }} onClick={() => { setShowQuickMenu(false); setActivePanel('garden'); }}>
                                    <span style={{ fontSize: '1.5rem' }}>🌱</span>
                                    <span>Garden</span>
                                    <small>Plant & Harvest</small>
                                </button>
                                <button className="room-feature-btn" style={{ borderColor: 'rgba(139,92,246,0.3)' }} onClick={() => { setShowQuickMenu(false); setActivePanel('cellar'); }}>
                                    <span style={{ fontSize: '1.5rem' }}>📦</span>
                                    <span>Cellar</span>
                                    <small>Inventory Vault</small>
                                </button>

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ PANEL MODALS ═══ */}
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
                            {activePanel === 'workshop' && <WorkshopPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'garden' && <GardenPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'cellar' && <CellarPanel onClose={() => setActivePanel(null)} />}
                            {activePanel === 'pet' && <PetInteractionPanel onClose={() => setActivePanel(null)} />}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
