import { useGameStore, type SkillName } from '../../store/useGameStore';
import { useSkillTrophyStore } from '../../store/useSkillTrophyStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useDayStore } from '../../store/useDayStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
import { useNavigate } from 'react-router-dom';
import { Sword, Shield, Sparkles, Droplet, Heart, Crown, BookOpen } from 'lucide-react';
import { useHeroImage } from '../../hooks/useHeroImage';
import { EquipmentPanel } from './EquipmentPanel';
import './CharacterPage.css';

interface StatLine {
    label: string;
    value: string;
    type?: 'base' | 'bonus' | 'total' | 'penalty';
}

const DEFENSE_SKILLS: SkillName[] = ['Sleep', 'Hygiene', 'Cardio', 'Flexibility', 'Habit Building'];

export const CharacterPage = () => {
    const game = useGameStore();
    const skillTrophy = useSkillTrophyStore();
    const bookTrophy = useBookTrophyStore();
    const strategy = useStrategyStore();
    const day = useDayStore();
    const { appearance } = useProfileStore();
    const navigate = useNavigate();
    const heroImage = useHeroImage();

    // Dynamic rank icon based on global level
    const getRankIcon = () => {
        const level = game.getGlobalLevel();
        if (level >= 50) return '💎'; // Diamond
        if (level >= 30) return '🥇'; // Gold
        if (level >= 20) return '🥈'; // Silver
        if (level >= 10) return '🥉'; // Bronze
        if (level >= 5)  return '⭐'; // Rising
        return '🗡️';                  // Adventurer / no rank
    };

    const { skills, getAttack, getDefense, getMagicAttack, getMaxMP, getGlobalLevel, isDefenseSuppressed, defenseDecayAmount } = game;
    const equipBonuses = getPassiveBonuses();

    // ─── ATTACK BREAKDOWN ───────────────────────────
    const strengthLevel = skills['Strength'].level;
    const baseAtk = Math.floor(strengthLevel * 1.5) + 5;
    const equipAtk = equipBonuses.attack_bonus;
    const trophyAtk = skillTrophy.getStrengthATKBonus();
    // Assuming game.getAttack() also incorporates usePassiveEffects eventually, but we just display it here.
    const totalAtk = getAttack() + equipAtk; // Manually add here for now until we integrate combat formulas

    const atkLines: StatLine[] = [
        { label: `Strength Lv.${strengthLevel} → base ATK`, value: `${baseAtk}`, type: 'base' },
    ];
    if (equipAtk > 0) atkLines.push({ label: `Equipment → +ATK`, value: `+${equipAtk}`, type: 'bonus' });
    if (trophyAtk > 0) atkLines.push({ label: `Strength Trophies → +ATK`, value: `+${trophyAtk}`, type: 'bonus' });
    atkLines.push({ label: 'Total Attack', value: `${totalAtk}`, type: 'total' });

    // ─── DEFENSE BREAKDOWN ──────────────────────────
    const defLevels = DEFENSE_SKILLS.map(s => skills[s].level);
    const avgDefLevel = defLevels.reduce((a, b) => a + b, 0) / 5;
    let rawBaseDef = Math.floor(avgDefLevel * 1.2) + 3;
    const equipDef = equipBonuses.defense_bonus;
    const trophyDef = skillTrophy.getSleepDEFBonus();
    const totalDef = getDefense() + equipDef; // Manually add here for now
    const suppressed = isDefenseSuppressed();

    const defLines: StatLine[] = DEFENSE_SKILLS.map(s => ({
        label: `${s} Lv.${skills[s].level}`,
        value: `contributes to DEF`,
        type: 'base' as const,
    }));
    defLines.push({ label: `Avg defense skill → base DEF`, value: `${rawBaseDef}`, type: 'base' });
    if (defenseDecayAmount > 0) defLines.push({ label: `Defense decay (−${Math.round(defenseDecayAmount * 100)}%)`, value: `-${Math.floor(rawBaseDef * defenseDecayAmount)}`, type: 'penalty' });
    if (suppressed) defLines.push({ label: `Sleep/Hygiene suppression (−50%)`, value: `penalty active`, type: 'penalty' });
    if (equipDef > 0) defLines.push({ label: `Equipment → +DEF`, value: `+${equipDef}`, type: 'bonus' });
    if (trophyDef > 0) defLines.push({ label: `Sleep Trophies → +DEF`, value: `+${trophyDef}`, type: 'bonus' });
    defLines.push({ label: 'Total Defense', value: `${totalDef}`, type: 'total' });

    // ─── MAGIC ATK BREAKDOWN ────────────────────────
    const intLevel = skills['Intelligence'].level;
    const baseMagicAtk = Math.floor(5 + intLevel * 2);
    const trophyInt = bookTrophy.getIntelligenceBonus();
    const totalMagicAtk = getMagicAttack();

    const magicLines: StatLine[] = [
        { label: `Intelligence Lv.${intLevel} → base Magic ATK`, value: `${baseMagicAtk}`, type: 'base' },
    ];
    if (trophyInt > 0) magicLines.push({ label: `Book Trophies → +INT`, value: `+${trophyInt}`, type: 'bonus' });
    magicLines.push({ label: 'Total Magic ATK', value: `${totalMagicAtk}`, type: 'total' });

    // ─── MP BREAKDOWN ───────────────────────────────
    const baseMP = Math.floor(50 + intLevel * 10);
    const trophyMP = bookTrophy.getMaxMPBonus();
    const totalMP = getMaxMP();

    const mpLines: StatLine[] = [
        { label: `Intelligence Lv.${intLevel} → base MP`, value: `${baseMP}`, type: 'base' },
    ];
    if (trophyMP > 0) mpLines.push({ label: `Book Trophies → +MP`, value: `+${trophyMP}`, type: 'bonus' });
    mpLines.push({ label: 'Total Max MP', value: `${totalMP}`, type: 'total' });

    // ─── HP BREAKDOWN ───────────────────────────────
    const healthLevel = skills['Health'].level;
    const baseHP = 95 + healthLevel * 5;
    const equipHP = equipBonuses.max_hp_bonus;
    const trophyHP = skillTrophy.getSleepHPBonus();

    const hpLines: StatLine[] = [
        { label: `Health Lv.${healthLevel} → base HP`, value: `${baseHP}`, type: 'base' },
    ];
    if (equipHP > 0) hpLines.push({ label: `Equipment → +HP`, value: `+${equipHP}`, type: 'bonus' });
    if (trophyHP > 0) hpLines.push({ label: `Sleep Trophies → +HP`, value: `+${trophyHP}`, type: 'bonus' });
    hpLines.push({ label: 'Total Max HP', value: `${baseHP + equipHP + trophyHP}`, type: 'total' });

    // ─── STRATEGY / CONQUEST ────────────────────────
    const stratLines: StatLine[] = [
        { label: `Strategy Level`, value: `${strategy.strategyLevel}`, type: 'base' },
        { label: `Conquest Power Score`, value: `${strategy.strategyLevel * 10}`, type: 'total' },
        { label: `Equipment Strategy Bonus`, value: `+${equipBonuses.strategy_bonus}`, type: 'bonus' },
        { label: `Raised by: daily chess`, value: `♟️`, type: 'base' },
    ];

    // ─── SLEEP SUMMARY ──────────────────────────────
    const sleepCount = day.sleepLogs.length;
    const totalSleepXp = day.sleepLogs.reduce((sum, l) => sum + l.xpEarned, 0);

    // ─── RENDER ─────────────────────────────────────
    const renderStatSection = (title: string, icon: React.ReactNode, lines: StatLine[], color: string) => (
        <div className="char-stat-section" style={{ borderColor: color }}>
            <div className="char-stat-header" style={{ color }}>
                {icon}
                <h3>{title}</h3>
            </div>
            <div className="char-stat-lines">
                {lines.map((line, i) => (
                    <div key={i} className={`char-stat-line ${line.type || 'base'}`}>
                        <span className="char-stat-label">{line.label}</span>
                        <span className="char-stat-value">{line.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="character-page">
            <div className="char-bg">
                <div className="char-bg-gradient" />
            </div>

            <div className="char-content">
                {/* Header */}
                <div className="char-header">
                    <div className="char-avatar" title={`Level ${game.getGlobalLevel()}`}>{getRankIcon()}</div>
                    <div className="char-info">
                        <h1>Your Character</h1>
                        <p className="char-subtitle">Level {getGlobalLevel()} Adventurer</p>
                    </div>
                    <img
                        src={heroImage}
                        alt="Your Hero"
                        className="char-hero-thumb"
                        style={{ filter: `hue-rotate(${appearance?.hairHue ?? 0}deg)` }}
                    />
                    <button
                        className="char-skills-link"
                        onClick={() => navigate('/tasks')}
                        title="View Skills"
                    >
                        <BookOpen size={18} />
                        <span>Skills</span>
                    </button>
                </div>

                <p className="char-explainer">
                    Here's how your daily habits, equipment, and trophies shape your character's power.
                    Every skill you train makes you stronger!
                </p>

                {/* Sleep insight */}
                {sleepCount > 0 && (
                    <div className="char-insight-banner">
                        💤 You've logged {sleepCount} night{sleepCount > 1 ? 's' : ''} of sleep, earning {totalSleepXp} Sleep XP → your defense is stronger!
                    </div>
                )}

                {/* Stat Sections */}
                <div className="char-stats-grid">
                    {renderStatSection('Attack', <Sword size={18} />, atkLines, '#ef4444')}
                    {renderStatSection('Defense', <Shield size={18} />, defLines, '#3b82f6')}
                    {renderStatSection('Magic ATK', <Sparkles size={18} />, magicLines, '#a855f7')}
                    {renderStatSection('Max MP', <Droplet size={18} />, mpLines, '#06b6d4')}
                    {renderStatSection('Max HP', <Heart size={18} />, hpLines, '#22c55e')}
                    {renderStatSection('Strategy', <Crown size={18} />, stratLines, '#f59e0b')}
                </div>

                {/* Equipped Gear Array */}
                <EquipmentPanel />

                {/* How it works */}
                <div className="char-how-section">
                    <h3>How Your Habits Help</h3>
                    <div className="char-how-list">
                        <div className="char-how-item">💪 <strong>Strength</strong> training → increases your Attack</div>
                        <div className="char-how-item">😴 <strong>Sleep</strong> quality → increases your Defense & HP</div>
                        <div className="char-how-item">🏃 <strong>Cardio</strong> → increases Defense & movement speed</div>
                        <div className="char-how-item">🤸 <strong>Flexibility</strong> → increases Defense</div>
                        <div className="char-how-item">🧼 <strong>Hygiene</strong> → increases Defense (low = suppressed!)</div>
                        <div className="char-how-item">🔥 <strong>Habit Building</strong> → directly boosts Defense</div>
                        <div className="char-how-item">🧠 <strong>Intelligence</strong> (reading) → Magic ATK & Max MP</div>
                        <div className="char-how-item">♟️ <strong>Daily Chess</strong> → Strategy Level → Conquest power</div>
                        <div className="char-how-item">🛡️ <strong>Equipment</strong> → flat bonuses to ATK, DEF, HP</div>
                        <div className="char-how-item">🏆 <strong>Trophies</strong> → permanent stat bonuses</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
