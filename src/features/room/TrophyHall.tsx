import { motion } from 'framer-motion';
import {
    useSkillTrophyStore,
    STRENGTH_TROPHIES,
    CARDIO_TROPHIES,
    HOUSEMAID_TROPHIES,
    SLEEP_TROPHIES,
    LUCK_TROPHIES,
    type TrophyCategory,
    type SkillTrophyTier,
} from '../../store/useSkillTrophyStore';
import { useBookTrophyStore, TROPHY_MILESTONES } from '../../store/useBookTrophyStore';
import './TrophyHall.css';

interface TrophyDisplayProps {
    category: TrophyCategory | 'books';
    title: string;
    trophies: SkillTrophyTier[];
    currentTrophy: SkillTrophyTier;
    currentValue: number;
    valueLabel: string;
    bonusLabel: string;
    bonusValue: number;
    secondaryBonusLabel?: string;
    secondaryBonusValue?: number;
    isSpecial?: boolean;
}

const getRarityClass = (id: string) => {
    if (id.includes('_5') || id.includes('_4') || id === 'grand_library_crown') return 'legendary';
    if (id.includes('_3') || id === 'arcane_nebula_scroll' || id === 'eternal_encyclopedia') return 'epic';
    if (id.includes('_2') || id === 'golden_tome') return 'rare';
    if (id.includes('_1') || id === 'silver_quill') return 'uncommon';
    return 'common';
};

const TrophyDisplay = ({
    title,
    trophies,
    currentTrophy,
    currentValue,
    valueLabel,
    bonusLabel,
    bonusValue,
    secondaryBonusLabel,
    secondaryBonusValue,
    isSpecial,
}: TrophyDisplayProps) => {
    // Find current & next tier for progress bar
    const currentIdx = trophies.findIndex(t => t.id === currentTrophy.id);
    const nextTier = currentIdx < trophies.length - 1 ? trophies[currentIdx + 1] : null;
    const prevThreshold = currentTrophy.threshold;
    const nextThreshold = nextTier?.threshold ?? prevThreshold;
    const progressPct = nextTier
        ? Math.min(100, Math.round(((currentValue - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
        : 100;

    const rarity = getRarityClass(currentTrophy.id);

    return (
        <div className={`trophy-card ${rarity} ${isSpecial ? 'special' : ''}`}>
            <div className="trophy-header">
                <h4>{title}</h4>
                <span className="trophy-value">{valueLabel}: {currentValue}</span>
            </div>

            <motion.div
                className="trophy-icon-container"
                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, 0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
            >
                <div className="trophy-glow" />
                <span className="trophy-icon">{currentTrophy.icon}</span>
            </motion.div>

            <div className="trophy-details">
                <h5 className="trophy-name">{currentTrophy.name}</h5>
                <p className="trophy-description">{currentTrophy.description}</p>
            </div>

            {/* ── Progress to next tier ── */}
            {nextTier ? (
                <div className="trophy-progress-section">
                    <div className="trophy-progress-bar">
                        <div className="trophy-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="trophy-progress-labels">
                        <span className="trophy-progress-current">{currentValue}/{nextThreshold}</span>
                        <span className="trophy-next-hint">Next: {nextTier.icon} {nextTier.name}</span>
                    </div>
                </div>
            ) : (
                <div className="trophy-maxed-badge">✨ MAX TIER</div>
            )}

            {bonusValue > 0 && (
                <div className="trophy-bonuses">
                    <span className="bonus-item">{bonusLabel}: +{bonusValue}</span>
                    {secondaryBonusLabel && secondaryBonusValue && secondaryBonusValue > 0 && (
                        <span className="bonus-item secondary">{secondaryBonusLabel}: +{secondaryBonusValue}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export const TrophyHall = () => {
    const skillTrophyStore = useSkillTrophyStore();
    const bookTrophyStore = useBookTrophyStore();

    const skillTrophies: TrophyDisplayProps[] = [
        {
            category: 'books',
            title: '📚 Scholar\'s Wisdom',
            trophies: TROPHY_MILESTONES as unknown as SkillTrophyTier[],
            currentTrophy: bookTrophyStore.getCurrentTrophy() as unknown as SkillTrophyTier,
            currentValue: bookTrophyStore.totalBooksRead,
            valueLabel: 'Books Read',
            bonusLabel: '🧠 INT',
            bonusValue: bookTrophyStore.getIntelligenceBonus(),
            secondaryBonusLabel: '💧 Max MP',
            secondaryBonusValue: bookTrophyStore.getMaxMPBonus(),
        },
        {
            category: 'strength',
            title: '🏔️ Titan of Might',
            trophies: STRENGTH_TROPHIES,
            currentTrophy: skillTrophyStore.getCurrentTrophy('strength'),
            currentValue: skillTrophyStore.strengthXpTotal,
            valueLabel: 'Strength XP',
            bonusLabel: '⚔️ ATK',
            bonusValue: skillTrophyStore.getStrengthATKBonus(),
        },
        {
            category: 'cardio',
            title: '🦅 Unstoppable Spirit',
            trophies: CARDIO_TROPHIES,
            currentTrophy: skillTrophyStore.getCurrentTrophy('cardio'),
            currentValue: skillTrophyStore.cardioLevel,
            valueLabel: 'Cardio Level',
            bonusLabel: '💨 SPD',
            bonusValue: skillTrophyStore.getCardioSPDBonus(),
        },
        {
            category: 'housemaid',
            title: '🏰 Divine Cleanser',
            trophies: HOUSEMAID_TROPHIES,
            currentTrophy: skillTrophyStore.getCurrentTrophy('housemaid'),
            currentValue: skillTrophyStore.housemaidXpTotal,
            valueLabel: 'Housemaid XP',
            bonusLabel: '🍀 Luck',
            bonusValue: skillTrophyStore.getHousemaidLuckBonus(),
        },
        {
            category: 'sleep',
            title: '🏯 Fortress of Zen',
            trophies: SLEEP_TROPHIES,
            currentTrophy: skillTrophyStore.getCurrentTrophy('sleep'),
            currentValue: skillTrophyStore.sleepStreakMax,
            valueLabel: '7-Day Streaks',
            bonusLabel: '🛡️ DEF',
            bonusValue: skillTrophyStore.getSleepDEFBonus(),
            secondaryBonusLabel: '❤️ HP',
            secondaryBonusValue: skillTrophyStore.getSleepHPBonus(),
        },
        {
            category: 'luck',
            title: '💎 Fortune\'s Favorite',
            trophies: LUCK_TROPHIES,
            currentTrophy: skillTrophyStore.getCurrentTrophy('luck'),
            currentValue: skillTrophyStore.rareRollCount,
            valueLabel: 'Rare Rolls',
            bonusLabel: '💥 Crit%',
            bonusValue: skillTrophyStore.getLuckCritBonus(),
            isSpecial: skillTrophyStore.hasUltraRareCow,
        },
    ];

    return (
        <div className="trophy-hall">
            <div className="trophy-hall-header">
                <h2>🏆 Trophy Hall</h2>
                <p className="trophy-hall-desc">Your achievements grant permanent stat bonuses</p>
            </div>

            {/* Ultra Rare Cow */}
            {skillTrophyStore.hasUltraRareCow && (
                <motion.div
                    className="ultra-rare-cow-banner"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="cow-icon">🐮✨</span>
                    <span className="cow-title">ULTRA RARE COW UNLOCKED!</span>
                    <span className="cow-desc">1-in-100,000 Legend • +50% Crit Multiplier</span>
                </motion.div>
            )}

            <div className="trophy-grid">
                {skillTrophies.filter(t => t.currentTrophy.statBonus > 0 || (t.category === 'books' && t.currentValue > 0)).length === 0 ? (
                    <div className="trophy-hall-empty">
                        <span className="trophy-hall-empty__icon">🏆</span>
                        <p>No trophies earned yet</p>
                        <p className="trophy-hall-empty__hint">Train, read, and rest to unlock trophy bonuses!</p>
                    </div>
                ) : (
                    skillTrophies
                        .filter(t => t.currentTrophy.statBonus > 0 || (t.category === 'books' && t.currentValue > 0))
                        .map((trophy) => (
                            <TrophyDisplay key={trophy.category} {...trophy} />
                        ))
                )}
            </div>

            {/* Total Bonuses Summary */}
            <div className="total-bonuses">
                <h3>📊 Total Trophy Bonuses</h3>
                <div className="bonuses-grid">
                    <div className="bonus-stat"><span className="stat-label">⚔️ ATK</span><span className="stat-value">+{skillTrophyStore.getStrengthATKBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">🛡️ DEF</span><span className="stat-value">+{skillTrophyStore.getSleepDEFBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">💨 SPD</span><span className="stat-value">+{skillTrophyStore.getCardioSPDBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">🧠 INT</span><span className="stat-value">+{bookTrophyStore.getIntelligenceBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">❤️ HP</span><span className="stat-value">+{skillTrophyStore.getSleepHPBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">💧 MP</span><span className="stat-value">+{bookTrophyStore.getMaxMPBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">🍀 Luck</span><span className="stat-value">+{skillTrophyStore.getHousemaidLuckBonus()}</span></div>
                    <div className="bonus-stat"><span className="stat-label">💥 Crit%</span><span className="stat-value">+{skillTrophyStore.getLuckCritBonus()}</span></div>
                </div>
            </div>
        </div>
    );
};
