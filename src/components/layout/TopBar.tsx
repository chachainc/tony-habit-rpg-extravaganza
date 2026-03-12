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
import './TopBar.css';

export const TopBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currency, gems, globalXp, getGlobalLevel, getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { streakCount } = useCheckInStore();
    const { dailyTickets } = useMonopolyStore();
    const { player, currentMP } = useBattleStore();
    const { sigils } = useConquestStore();
    const { profileName, playerTitle, activeBannerId } = useProfileStore();
    const { shmeckles } = useCurrencyStore();

    const level = getGlobalLevel();
    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const maxMP = getMaxMP();

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
                        <span className="top-bar__player-title">{playerTitle}</span>
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
                        <span className="top-bar__value">{currency.toLocaleString()}</span>
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
                <div
                    className="top-bar__stat top-bar__stat--hp top-bar__stat--clickable"
                    title="Hit Points"
                    onClick={() => navigate('/stats')}
                >
                    <Heart size={16} />
                    <span>{Math.round(currentHP)}/{maxHP}</span>
                </div>

                {/* ATK */}
                <div
                    className="top-bar__stat top-bar__stat--atk top-bar__stat--clickable"
                    title={`Physical: ${atk} | Magic: ${magicAtk}`}
                    onClick={() => navigate('/combat')}
                >
                    <Sword size={16} />
                    <span>{atk}</span>
                </div>

                {/* DEF */}
                <div
                    className="top-bar__stat top-bar__stat--def top-bar__stat--clickable"
                    title="Defense"
                    onClick={() => navigate('/combat')}
                >
                    <Shield size={16} />
                    <span>{def}</span>
                </div>

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
                    title="Gems"
                >
                    <div className="top-bar__icon">💎</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{gems}</span>
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
