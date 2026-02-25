import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Coins, TrendingUp, Clock, Heart, Droplet, Sword, Shield, Sparkles, Home, Store, BookOpen, Calendar } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useCheckInStore } from '../../store/useCheckInStore';
import { useMonopolyStore } from '../../store/useMonopolyStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import './TopBar.css';

export const TopBar = () => {
    const navigate = useNavigate();
    const { currency, gems, globalXp, getGlobalLevel, getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { streakCount } = useCheckInStore();
    const { dailyTickets } = useMonopolyStore();
    const { player, currentMP } = useBattleStore();
    const { sigils } = useConquestStore();

    const level = getGlobalLevel();
    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const maxMP = getMaxMP();

    // Get current HP from battle or assume full
    const currentHP = player?.hp ?? 100;
    const maxHP = player?.maxHp ?? 100;

    // Calculate time until daily reset (midnight Eastern)
    const getTimeUntilReset = () => {
        const now = new Date();
        const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const tomorrow = new Date(eastern);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const diff = tomorrow.getTime() - eastern.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    };

    return (
        <motion.div
            className="top-bar"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Left Section: Level, XP & Gold */}
            <div className="top-bar__section">
                <div
                    className="top-bar__item top-bar__item--level top-bar__item--clickable"
                    onClick={() => navigate('/stats')}
                    title="View Stats"
                >
                    <div className="top-bar__icon">⭐</div>
                    <div className="top-bar__content">
                        <span className="top-bar__label">Lv</span>
                        <span className="top-bar__value">{level}</span>
                    </div>
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
                    className="top-bar__item top-bar__item--clickable"
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

            {/* Center Section: Combat Stats */}
            <div className="top-bar__section top-bar__section--stats">
                {/* HP */}
                <div
                    className="top-bar__stat top-bar__stat--hp top-bar__stat--clickable"
                    title="Hit Points - Click for Home"
                    onClick={() => navigate('/home')}
                >
                    <Heart size={16} />
                    <span>{Math.round(currentHP)}/{maxHP}</span>
                </div>

                {/* MP */}
                <div
                    className="top-bar__stat top-bar__stat--mp top-bar__stat--clickable"
                    title="Mana Points - Click for Home"
                    onClick={() => navigate('/home')}
                >
                    <Droplet size={16} />
                    <span>{currentMP}/{maxMP}</span>
                </div>

                {/* ATK */}
                <div
                    className="top-bar__stat top-bar__stat--atk top-bar__stat--clickable"
                    title={`Physical: ${atk} | Magic: ${magicAtk} - Click for Arena`}
                    onClick={() => navigate('/arena')}
                >
                    <Sword size={16} />
                    <span>{atk}</span>
                </div>

                {/* DEF */}
                <div
                    className="top-bar__stat top-bar__stat--def top-bar__stat--clickable"
                    title="Defense - Click for Arena"
                    onClick={() => navigate('/arena')}
                >
                    <Shield size={16} />
                    <span>{def}</span>
                </div>

                {/* Magic ATK */}
                <div
                    className="top-bar__stat top-bar__stat--magic top-bar__stat--clickable"
                    title={`Magic Attack: ${magicAtk} - Click for Tome`}
                    onClick={() => navigate('/tome')}
                >
                    <Sparkles size={16} />
                    <span>{magicAtk}</span>
                </div>
            </div>

            {/* Right Section: Currency & Timer */}
            <div className="top-bar__section">
                <div
                    className="top-bar__item top-bar__item--clickable"
                    onClick={() => navigate('/monopoly')}
                    title="Play Monopoly"
                >
                    <div className="top-bar__icon">🎫</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{dailyTickets}</span>
                    </div>
                </div>

                <div
                    className="top-bar__item top-bar__item--clickable"
                    onClick={() => navigate('/checkin')}
                    title="Daily Check-In"
                >
                    <div className="top-bar__icon">🔥</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{streakCount}</span>
                    </div>
                </div>

                <div
                    className="top-bar__item top-bar__item--clickable"
                    onClick={() => navigate('/conquest')}
                    title="Conquest Sigils"
                >
                    <div className="top-bar__icon">🔱</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{sigils}</span>
                    </div>
                </div>

                <div
                    className="top-bar__item top-bar__item--clickable"
                    onClick={() => navigate('/marketplace')}
                    title="Gems"
                >
                    <div className="top-bar__icon">💎</div>
                    <div className="top-bar__content">
                        <span className="top-bar__value">{gems}</span>
                    </div>
                </div>

                <div className="top-bar__item top-bar__item--timer">
                    <div className="top-bar__icon">
                        <Clock size={16} />
                    </div>
                    <div className="top-bar__content">
                        <span className="top-bar__value top-bar__value--timer">{getTimeUntilReset()}</span>
                    </div>
                </div>

                {/* Quick Nav Buttons */}
                <div className="top-bar__nav-buttons">
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--home"
                        onClick={() => navigate('/home')}
                        title="Home"
                    >
                        <Home size={16} />
                    </button>
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--arena"
                        onClick={() => navigate('/arena')}
                        title="Arena"
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
                    <button
                        className="top-bar__nav-btn top-bar__nav-btn--calendar"
                        onClick={() => navigate('/calendar')}
                        title="Calendar"
                    >
                        <Calendar size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
