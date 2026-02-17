import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Sunrise, Sunset, BedDouble, Sparkles, Trophy, DoorOpen, Dumbbell } from 'lucide-react';
import { usePetStore } from '../../store/usePetStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useDayStore } from '../../store/useDayStore';
import { useGameStore } from '../../store/useGameStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { ITEM_DATABASE } from '../../data/items';
import { TrophyPedestal } from './TrophyPedestal';
import { TrophyHall } from './TrophyHall';
import { SleepLog } from './SleepLog';
import { SceneShell } from '../../components/scene';
import homeCampBg from '../../assets/backgrounds/home_camp.png';
import './PlayerRoom.css';

interface Props {
    onClose: () => void;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const getTimeOfDay = (): TimeOfDay => {
    const hour = parseInt(
        new Date().toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            hour12: false
        })
    );
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'night';
};

const TIME_ICONS: Record<TimeOfDay, React.ReactNode> = {
    morning: <Sunrise size={16} />,
    afternoon: <Sun size={16} />,
    evening: <Sunset size={16} />,
    night: <Moon size={16} />,
};

const TIME_LABELS: Record<TimeOfDay, string> = {
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening',
    night: 'Good Night',
};

export const PlayerRoom = ({ onClose }: Props) => {
    const navigate = useNavigate();
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay);
    const [isResting, setIsResting] = useState(false);
    const [showTrophyHall, setShowTrophyHall] = useState(false);
    const [showSleepLog, setShowSleepLog] = useState(false);

    // Stores
    const { activePet, name: petName } = usePetStore();
    const { items } = useInventoryStore();
    const { playerCurrentHP, playerMaxHP } = useDayStore();
    const { skills, getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { currentMP, restoreMP } = useBattleStore();
    const { totalBooksRead, getIntelligenceBonus, getMaxMPBonus } = useBookTrophyStore();

    // Refresh time of day periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeOfDay(getTimeOfDay());
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Get active pet sprite
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';

    // Get owned furniture
    const ownedFurniture = Object.entries(items)
        .filter(([id]) => ITEM_DB[id]?.type === 'furniture')
        .map(([id, count]) => ({ ...ITEM_DB[id], count }));

    // Calculate rest MP restoration
    const sleepLevel = skills['Sleep'].level;
    const flexLevel = skills['Flexibility'].level;
    const restMPAmount = Math.floor(10 + ((sleepLevel + flexLevel) / 2) * 2);
    const maxMP = getMaxMP();

    // Check for Cleanliness Aura (Level 30+ Housemaid furniture)
    const hasCleanlinessAura = ownedFurniture.some(f => f.id === 'celestial_chandelier');
    const restMPWithAura = hasCleanlinessAura ? Math.floor(restMPAmount * 1.1) : restMPAmount;

    // Room Comfort calculation (each furniture adds comfort)
    const roomComfort = ownedFurniture.reduce((total, item) => total + (10 * item.count), 0);
    const comfortBonus = Math.floor(roomComfort / 100); // +1% HP/MP regen per 100 comfort

    // Room background based on Housemaid level
    const housemaidLevel = skills['Housemaid'].level;
    const getRoomTheme = () => {
        if (housemaidLevel >= 50) return 'arcane-sanctum';
        if (housemaidLevel >= 25) return 'noble-manor';
        if (housemaidLevel >= 10) return 'clean-cottage';
        return 'dusty-cellar';
    };
    const roomTheme = getRoomTheme();

    const handleRest = useCallback(() => {
        if (isResting) return;
        setIsResting(true);

        // Restore MP
        restoreMP(restMPWithAura);

        // Reset resting state after animation
        setTimeout(() => setIsResting(false), 1500);
    }, [isResting, restMPWithAura, restoreMP]);

    // Stats
    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const intBonus = getIntelligenceBonus();
    const mpBonus = getMaxMPBonus();

    // Firelight glow positions for bonfire scene
    const fireplaceGlows = [
        { x: 50, y: 55, color: '#ff6b35', intensity: 1.5 }, // Central bonfire
        { x: 48, y: 58, color: '#ff9500', intensity: 0.8 }, // Fire glow spread
    ];

    return (
        <div className={`player-room-overlay time-${timeOfDay}`} onClick={onClose}>
            <SceneShell
                backgroundImage={homeCampBg}
                showFog={true}
                showVignette={true}
                showEmbers={timeOfDay === 'night' || timeOfDay === 'evening'}
                glowPoints={fireplaceGlows}
            >
                <motion.div
                    className={`player-room room-theme-${roomTheme} room-with-scene`}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {/* Fixed Stats Header */}
                    <div className="room-stats-header">
                        <div className="room-header-left">
                            <h2>🏠 Your Room</h2>
                            <div className="time-indicator">
                                {TIME_ICONS[timeOfDay]}
                                <span>{TIME_LABELS[timeOfDay]}</span>
                            </div>
                        </div>

                        {/* Tab Toggle */}
                        <div className="room-tab-toggle">
                            <button
                                className={`tab-btn ${!showTrophyHall ? 'active' : ''}`}
                                onClick={() => setShowTrophyHall(false)}
                            >
                                🏠 Room
                            </button>
                            <button
                                className={`tab-btn ${showTrophyHall ? 'active' : ''}`}
                                onClick={() => setShowTrophyHall(true)}
                            >
                                <Trophy size={14} /> Trophies
                            </button>
                            <button
                                className="tab-btn"
                                onClick={() => setShowSleepLog(true)}
                            >
                                💤 Sleep Log
                            </button>
                            <button
                                className="tab-btn enter-room-btn"
                                onClick={() => navigate('/walkable-room')}
                            >
                                <DoorOpen size={14} /> Enter Room
                            </button>
                            <button
                                className="tab-btn tab-btn--gym"
                                onClick={() => navigate('/gym')}
                            >
                                <Dumbbell size={14} /> Gym
                            </button>
                        </div>

                        <div className="room-stats-bar">
                            <div className="stat-item stat-hp">
                                <span className="stat-label">HP</span>
                                <div className="stat-bar-mini">
                                    <div
                                        className="stat-fill hp-fill"
                                        style={{ width: `${(playerCurrentHP / playerMaxHP) * 100}%` }}
                                    />
                                </div>
                                <span className="stat-value">{playerCurrentHP}/{playerMaxHP}</span>
                            </div>

                            <div className="stat-item stat-mp">
                                <span className="stat-label">MP</span>
                                <div className="stat-bar-mini">
                                    <div
                                        className="stat-fill mp-fill"
                                        style={{ width: `${(currentMP / maxMP) * 100}%` }}
                                    />
                                </div>
                                <span className="stat-value">{currentMP}/{maxMP}</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-icon">⚔️</span>
                                <span className="stat-value">{atk}</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-icon">🛡️</span>
                                <span className="stat-value">{def}</span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-icon">✨</span>
                                <span className="stat-value">{magicAtk}</span>
                                {intBonus > 0 && <span className="bonus-indicator">+{intBonus}</span>}
                            </div>
                        </div>

                        <button className="room-close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Conditional Tab Content */}
                    {showTrophyHall ? (
                        <TrophyHall />
                    ) : (
                        <>
                            {/* Room Comfort Meter */}
                            <div className="room-comfort-meter">
                                <span className="comfort-label">🛋️ Room Comfort</span>
                                <div className="comfort-bar">
                                    <div
                                        className="comfort-fill"
                                        style={{ width: `${Math.min(100, roomComfort / 5)}%` }}
                                    />
                                </div>
                                <span className="comfort-value">{roomComfort} pts (+{comfortBonus}% regen)</span>
                            </div>

                            {/* Room View */}
                            <div className={`room-scene time-${timeOfDay}`}>
                                {/* Window with Day/Night */}
                                <div className="room-window">
                                    <div className="window-view">
                                        {timeOfDay === 'night' && (
                                            <>
                                                <div className="star" style={{ top: '20%', left: '30%' }} />
                                                <div className="star" style={{ top: '40%', left: '60%' }} />
                                                <div className="star" style={{ top: '25%', left: '80%' }} />
                                                <div className="moon-icon">🌙</div>
                                            </>
                                        )}
                                        {timeOfDay === 'evening' && <div className="sunset-glow" />}
                                        {timeOfDay === 'afternoon' && <div className="sun-icon">☀️</div>}
                                        {timeOfDay === 'morning' && <div className="sunrise-glow" />}
                                    </div>
                                </div>

                                {/* Fireplace (glows at night) */}
                                <div className={`fireplace ${timeOfDay === 'night' ? 'lit' : ''}`}>
                                    🔥
                                </div>

                                {/* Trophy Pedestal - Central Feature */}
                                <TrophyPedestal />

                                {/* Furniture Grid */}
                                <div className="room-furniture">
                                    {ownedFurniture.length === 0 ? (
                                        <p className="empty-room-msg">Your room is empty! Visit the Furniture Store.</p>
                                    ) : (
                                        ownedFurniture.slice(0, 6).map((item) => (
                                            <div key={item.id} className="placed-furniture" title={item.name}>
                                                <span className="furniture-icon">{item.icon}</span>
                                                {item.count > 1 && <span className="furniture-count">x{item.count}</span>}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Pet Display */}
                                <div className="room-pet">
                                    <motion.div
                                        className="pet-sprite"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {petSprite}
                                    </motion.div>
                                    <span className="pet-name">{petName}</span>
                                    <div className="pet-luck-boost">🍀 +Luck</div>
                                </div>

                                {/* Rest Button */}
                                <motion.button
                                    className={`rest-button ${isResting ? 'resting' : ''}`}
                                    onClick={handleRest}
                                    disabled={isResting || currentMP >= maxMP}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <BedDouble size={20} />
                                    <span>Rest</span>
                                    <span className="rest-amount">+{restMPWithAura} MP</span>
                                </motion.button>

                                {/* Resting Animation */}
                                <AnimatePresence>
                                    {isResting && (
                                        <motion.div
                                            className="rest-effect"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Sparkles size={40} />
                                            <span>Resting...</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Cleanliness Aura Indicator */}
                                {hasCleanlinessAura && (
                                    <div className="cleanliness-aura">
                                        ✨ Cleanliness Aura Active (+10% Rest Bonus)
                                    </div>
                                )}
                            </div>

                            {/* Trophy Info Panel */}
                            <div className="trophy-info-panel">
                                <div className="trophy-stat">
                                    <span className="trophy-stat-label">📚 Books Read</span>
                                    <span className="trophy-stat-value">{totalBooksRead}</span>
                                </div>
                                {intBonus > 0 && (
                                    <div className="trophy-stat">
                                        <span className="trophy-stat-label">🧠 INT Bonus</span>
                                        <span className="trophy-stat-value">+{intBonus}</span>
                                    </div>
                                )}
                                {mpBonus > 0 && (
                                    <div className="trophy-stat">
                                        <span className="trophy-stat-label">💧 Max MP Bonus</span>
                                        <span className="trophy-stat-value">+{mpBonus}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
            </SceneShell>

            {/* Sleep Log Modal */}
            {showSleepLog && (
                <SleepLog onClose={() => setShowSleepLog(false)} />
            )}
        </div>
    );
};
