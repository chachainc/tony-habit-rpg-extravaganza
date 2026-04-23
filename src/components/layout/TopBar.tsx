import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Coins, TrendingUp, Heart, Sword, Shield, Sparkles, Home, Store, BookOpen } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useCheckInStore } from '../../store/useCheckInStore';
import { useMonopolyStore } from '../../store/useMonopolyStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useActiveBuffs } from '../../hooks/useActiveBuffs';
import { useState, useEffect } from 'react';
import './TopBar.css';

// Stat display helper component
const StatItem = ({ 
    icon, 
    baseValue, 
    buffPct, 
    sources, 
    label, 
    tooltipTitle, 
    className, 
    onClick, 
    showBaseOutofMax = false, 
    maxValue = 0 
}: {
    icon: React.ReactNode, baseValue: number, buffPct: number, sources: string[],
    label: string, tooltipTitle: string, className: string, onClick: () => void,
    showBaseOutofMax?: boolean, maxValue?: number
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [recentBuff, setRecentBuff] = useState(false);

    // Watch for buff increases to trigger animation
    useEffect(() => {
        if (buffPct > 0) {
            setRecentBuff(true);
            const t = setTimeout(() => setRecentBuff(false), 2000);
            return () => clearTimeout(t);
        }
    }, [buffPct]);

    // Format display
    const finalDisplay = showBaseOutofMax ? `${Math.round(baseValue)}/${maxValue}` : baseValue;
    const isBuffed = buffPct > 0;

    return (
        <div 
            className={`top-bar__stat ${className} ${recentBuff ? 'pulse' : ''} ${isBuffed ? 'top-bar__stat--buffed' : ''}`}
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={() => setShowTooltip(true)}
            onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
        >
            {icon}
            <span>{finalDisplay} {isBuffed ? `(+${buffPct}%)` : ''}</span>

            {recentBuff && <motion.div initial={{ y: 0, opacity: 1 }} animate={{ y: -20, opacity: 0 }} transition={{ duration: 1.5 }} className="stat-buff-added">+{buffPct}% {label}</motion.div>}

            {showTooltip && (
                <div className="top-bar__tooltip">
                    <div className="top-bar__tooltip-title">{tooltipTitle}</div>
                    <div>Base: {showBaseOutofMax ? `${Math.round(baseValue)}/${maxValue}` : baseValue}</div>
                    {isBuffed && (
                        <>
                            <div>Buff bonus: +{buffPct}%</div>
                            <div className="top-bar__tooltip-source">Sources: {sources.join(', ')}</div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export const TopBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { globalXp, getGlobalLevel, getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { gold, diamonds } = useCurrencyStore();
    const { streakCount } = useCheckInStore();
    const { dailyTickets } = useMonopolyStore();
    const { player, currentMP } = useBattleStore();
    const { sigils } = useConquestStore();
    const { profileName, playerTitle, activeBannerId } = useProfileStore();
    const { shmeckles } = useCurrencyStore();
    const { activeTitle, getUnlockedTitleDefs } = useTitleStore();

    const titleDefs = getUnlockedTitleDefs();
    const activeTitleDef = titleDefs.find(t => t.id === activeTitle);
    const displayTitle = activeTitleDef ? activeTitleDef.name : playerTitle;

    const level = getGlobalLevel();
    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const maxMP = getMaxMP();
    
    const activeBuffs = useActiveBuffs();

    // Get current HP from battle or assume full
    const currentHP = player?.hp ?? 100;
    const maxHP = player?.maxHp ?? 100;

    // Context detection for right section
    const isCombatRoute = ['/combat', '/arena', '/conquest', '/tower-defense', '/risk', '/storm'].some(p => location.pathname.startsWith(p));
    const isMonopolyRoute = location.pathname === '/monopoly';

    // Banner emoji map
    const BANNER_EMOJIS: Record<string, string> = {
        crimson_dawn: '🔴',
        void_walker: '🌑',
        celestial_guard: '⭐',
        iron_sentinel: '⚙️',
        storm_herald: '⚡',
    };
    const bannerEmoji = activeBannerId ? (BANNER_EMOJIS[activeBannerId] ?? '🏳️') : null;


    return (
        <motion.div
            className={`top-bar ${isMonopolyRoute ? 'top-bar--monopoly' : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Left Section: Player Identity + Gold */}
            <div className="top-bar__section">
                <div
                    className="top-bar__item top-bar__item--identity top-bar__item--clickable"
                    onClick={() => navigate('/stats')}
                    title="View Stats"
                >
                    <div className="top-bar__identity-block">
                        <span className="top-bar__player-name">
                            {bannerEmoji && <span className="top-bar__banner-emoji">{bannerEmoji}</span>}
                            {profileName}
                        </span>
                        <span className="top-bar__player-title" style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {displayTitle}
                        </span>
                    </div>
                    <div className="top-bar__level-badge">Lv{level}</div>
                </div>

                <div
                    className="top-bar__item top-bar__item--gold top-bar__item--clickable"
                    onClick={() => navigate('/marketplace')}
                    title="Go to Marketplace"
                >
                    <div className="top-bar__icon">
                        <Coins size={18} />
                    </div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{gold.toLocaleString()}</span>
                    </div>
                </div>

                <div
                    className="top-bar__item top-bar__item--clickable top-bar__hide-mobile"
                    onClick={() => navigate('/stats')}
                    title="View Stats"
                >
                    <div className="top-bar__icon">
                        <TrendingUp size={18} />
                    </div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{globalXp.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Center Section: Combat Stats - always visible */}
            <div className="top-bar__section top-bar__section--stats">
                {/* HP */}
                <StatItem
                    icon={<Heart size={16} />}
                    baseValue={currentHP}
                    maxValue={maxHP}
                    showBaseOutofMax={true}
                    buffPct={activeBuffs.healthPct}
                    sources={activeBuffs.sources.health}
                    label="HP"
                    tooltipTitle="Hit Points"
                    className="top-bar__stat--hp top-bar__stat--clickable"
                    onClick={() => navigate('/stats')}
                />

                {/* ATK */}
                <StatItem
                    icon={<Sword size={16} />}
                    baseValue={atk}
                    buffPct={activeBuffs.attackPct}
                    sources={activeBuffs.sources.attack}
                    label="ATK"
                    tooltipTitle={`Physical: ${atk} | Magic: ${magicAtk}`}
                    className="top-bar__stat--atk top-bar__stat--clickable"
                    onClick={() => navigate('/combat')}
                />

                {/* DEF */}
                <StatItem
                    icon={<Shield size={16} />}
                    baseValue={def}
                    buffPct={activeBuffs.defensePct}
                    sources={activeBuffs.sources.defense}
                    label="DEF"
                    tooltipTitle="Defense"
                    className="top-bar__stat--def top-bar__stat--clickable"
                    onClick={() => navigate('/combat')}
                />

                {/* Magic ATK - desktop only */}
                <div
                    className="top-bar__stat top-bar__stat--magic top-bar__stat--clickable top-bar__hide-mobile"
                    title={`Magic Attack: ${magicAtk}`}
                    onClick={() => navigate('/tome')}
                >
                    <Sparkles size={16} />
                    <span>{magicAtk}</span>
                </div>
            </div>

            {/* Right Section: Context-aware stats + gems */}
            <div className="top-bar__section">
                {isCombatRoute && (
                    <>
                        <div
                            className="top-bar__stat top-bar__stat--sigil top-bar__stat--clickable"
                            onClick={() => navigate('/conquest')}
                            title="Sigils"
                        >
                            <span>🔱 {sigils}</span>
                        </div>
                        <div
                            className="top-bar__stat top-bar__stat--shmeckles top-bar__stat--clickable"
                            onClick={() => navigate('/storm')}
                            title="Shmeckles"
                        >
                            <span>🐌 {shmeckles}</span>
                        </div>
                        <div
                            className="top-bar__stat top-bar__stat--mp"
                            title="Mana"
                        >
                            <span>🔮 {currentMP}/{maxMP}</span>
                        </div>
                    </>
                )}

                {isMonopolyRoute && (
                    <div
                        className="top-bar__item top-bar__item--clickable"
                        title="Daily Rolls Remaining"
                    >
                        <div className="top-bar__icon">🎫</div>
                        <div className="top-bar__content">
                            <span className="top-bar__value">{dailyTickets} rolls</span>
                        </div>
                    </div>
                )}

                {!isCombatRoute && !isMonopolyRoute && (
                    <div
                        className="top-bar__item top-bar__item--clickable top-bar__hide-mobile"
                        onClick={() => navigate('/checkin')}
                        title="Daily Check-In"
                    >
                        <div className="top-bar__icon">🔥</div>
                        <div className="top-bar__content">
                            <span className="top-bar__value">{streakCount}</span>
                        </div>
                    </div>
                )}

                <div
                    className="top-bar__item top-bar__item--clickable top-bar__item--gems"
                    onClick={() => navigate('/marketplace')}
                    title="Diamonds"
                >
                    <div className="top-bar__icon">💎</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{diamonds}</span>
                    </div>
                </div>

                {/* Quick Nav Buttons - desktop only */}
                <div className="top-bar__nav-buttons top-bar__hide-mobile">
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--home"
                        onClick={() => navigate('/room')}
                        title="Room"
                    >
                        <Home size={16} />
                    </button>
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--arena"
                        onClick={() => navigate('/combat')}
                        title="Combat"
                    >
                        <Sword size={16} />
                    </button>
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--marketplace"
                        onClick={() => navigate('/marketplace')}
                        title="Marketplace"
                    >
                        <Store size={16} />
                    </button>
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--tome"
                        onClick={() => navigate('/tome')}
                        title="Tome of Fate"
                    >
                        <BookOpen size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
