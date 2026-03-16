import { useGameStore } from '../../store/useGameStore';
import { useSkillTrophyStore } from '../../store/useSkillTrophyStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useDayStore } from '../../store/useDayStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
import { SKILL_COMBAT_ROLES } from '../../store/useCombatFormulas';
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

    const { skills, getAttack, getDefense, getMagicAttack, getGlobalLevel } = game;
    const equipBonuses = getPassiveBonuses();

    // ─── ATTACK BREAKDOWN ───────────────────────────
    const strengthLevel = skills['Strength']?.level ?? 1;
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
    const hygieneLevel = skills['Hygiene']?.level ?? 1;
    const mitigationPct = hygieneLevel; // 1% per level
    const equipDef = equipBonuses.defense_bonus;
    const trophyDef = skillTrophy.getSleepDEFBonus();
    const totalDef = getDefense() + equipDef; // Manually add here for now

    const defLines: StatLine[] = [
        { label: `Hygiene Lv.${hygieneLevel}`, value: `${mitigationPct}% Mitigation`, type: 'base' },
    ];
    if (equipDef > 0) defLines.push({ label: `Equipment → +DEF`, value: `+${equipDef}`, type: 'bonus' });
    if (trophyDef > 0) defLines.push({ label: `Sleep Trophies → +DEF`, value: `+${trophyDef}`, type: 'bonus' });
    defLines.push({ label: 'Total Defense', value: `${totalDef}`, type: 'total' });

    // ─── MAGIC ATK BREAKDOWN ────────────────────────
    const intLevel = skills['Intelligence']?.level ?? 1;
    const baseMagicAtk = Math.floor(5 + intLevel * 2);
    const trophyInt = bookTrophy.getIntelligenceBonus();
    const totalMagicAtk = getMagicAttack();

    const magicLines: StatLine[] = [
        { label: `Intelligence Lv.${intLevel} → base Magic ATK`, value: `${baseMagicAtk}`, type: 'base' },
    ];
    if (trophyInt > 0) magicLines.push({ label: `Book Trophies → +Magic ATK`, value: `+${trophyInt}`, type: 'bonus' });
    magicLines.push({ label: 'Total Magic ATK', value: `${totalMagicAtk}`, type: 'total' });

    // ─── MP BREAKDOWN ───────────────────────────────
    const sleepManaLevel = skills['Sleep']?.level ?? 1;
    const baseMP = Math.floor(50 + sleepManaLevel * 10);
    const trophyMP = bookTrophy.getMaxMPBonus();
    const totalMP = baseMP + trophyMP;

    const mpLines: StatLine[] = [
        { label: `Sleep Lv.${sleepManaLevel} → base MP`, value: `${baseMP}`, type: 'base' },
    ];
    if (trophyMP > 0) mpLines.push({ label: `Book Trophies → +MP`, value: `+${trophyMP}`, type: 'bonus' });
    mpLines.push({ label: 'Total Max MP', value: `${totalMP}`, type: 'total' });

    // ─── HP BREAKDOWN ───────────────────────────────
    const equipHP = equipBonuses.max_hp_bonus;
    const trophyHP = skillTrophy.getSleepHPBonus();

    const hpLines: StatLine[] = [
        { label: `Health Lv.${skills['Health']?.level ?? 1} → base HP`, value: `${Math.round((skills['Health']?.level ?? 1) * 2 + 80)}`, type: 'base' },
    ];
    if (equipHP > 0) hpLines.push({ label: `Equipment → +HP`, value: `+${equipHP}`, type: 'bonus' });
    if (trophyHP > 0) hpLines.push({ label: `Sleep Trophies → +HP`, value: `+${trophyHP}`, type: 'bonus' });
    hpLines.push({ label: 'Total Max HP', value: `${Math.round((skills['Health']?.level ?? 1) * 2 + 80) + equipHP + trophyHP}`, type: 'total' });

    // ─── STRATEGY / CONQUEST ────────────────────────
    const stratLines: StatLine[] = [
        { label: `Strategy Level`, value: `${strategy.strategyLevel ?? 1}`, type: 'base' },
        { label: `Conquest Power Score`, value: `${(strategy.strategyLevel ?? 1) * 10}`, type: 'total' },
        { label: `Equipment Strategy Bonus`, value: `+${equipBonuses.strategy_bonus}`, type: 'bonus' },
        { label: `Raised by: daily chess`, value: `♟️`, type: 'base' },
    ];

    // ─── SLEEP SUMMARY ──────────────────────────────
    const sleepCount = day.sleepLogs?.length ?? 0;
    const totalSleepXp = day.sleepLogs?.reduce((sum, l) => sum + l.xpEarned, 0) ?? 0;

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
                    Your character's power comes from real-world habits! Keep in mind: daily and weekly tasks have a maximum XP cap per skill each day to prevent overworking. Sleep logging, daily check-ins, and combat rewards bypass these caps entirely.
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
                        {Object.entries(SKILL_COMBAT_ROLES).map(([skillName, role]) => (
                            <div key={skillName} className="char-how-item">
                                {role.icon} <strong>{skillName}</strong> → {role.description}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
