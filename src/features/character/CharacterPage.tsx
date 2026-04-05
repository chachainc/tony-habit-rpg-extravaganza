import { useGameStore } from '../../store/useGameStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useDayStore } from '../../store/useDayStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
import { SKILL_COMBAT_ROLES, getDetailedCombatBreakdown } from '../../store/useCombatFormulas';
import { useNavigate } from 'react-router-dom';
import { Sword, Shield, Sparkles, Droplet, Heart, Crown, BookOpen } from 'lucide-react';
import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
import { EquipmentPanel } from './EquipmentPanel';
import './CharacterPage.css';

interface StatLine {
    label: string;
    value: string;
    type?: 'base' | 'bonus' | 'total' | 'penalty';
}


export const CharacterPage = () => {
    const game = useGameStore();
    const strategy = useStrategyStore();
    const day = useDayStore();
    const { appearance } = useProfileStore();
    const navigate = useNavigate();
    const heroImage = usePlayerAvatar();

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

    const { getGlobalLevel } = game;

    // ─── COMBAT STATS BREAKDOWN ─────────────────────
    // Pull the single source of truth for all complex combat stat breakdowns
    const combatStats = getDetailedCombatBreakdown();

    const mapStatLines = (breakdown: { total: number, sources: { label: string, value: number }[] }, 
        baseLabelMatch: string): StatLine[] => {
        
        const lines: StatLine[] = [];
        // First map all sources
        breakdown.sources.forEach((src, idx) => {
            // Check if this source seems like the base stat (usually idx 0)
            const isBase = idx === 0 || src.label.includes('Lv.');
            lines.push({
                label: src.label,
                value: isBase ? `${src.value}` : `+${src.value}`,
                type: isBase ? 'base' : 'bonus'
            });
        });
        
        lines.push({
            label: `Total ${baseLabelMatch}`,
            value: `${breakdown.total}`,
            type: 'total'
        });
        
        return lines;
    };

    const atkLines = mapStatLines(combatStats.atk, 'Attack');
    
    // Modify the defense mapping specifically for the plain DEF styling requested
    const defLines = mapStatLines(combatStats.def, 'Defense');
    
    const magicLines = mapStatLines(combatStats.matk, 'Magic ATK');
    const mpLines = mapStatLines(combatStats.mp, 'Max MP');
    const hpLines = mapStatLines(combatStats.hp, 'Max HP');

    // ─── STRATEGY / CONQUEST ────────────────────────
    const stratLines: StatLine[] = [
        { label: `Strategy Level`, value: `${strategy.strategyLevel ?? 1}`, type: 'base' },
        { label: `Conquest Power Score`, value: `${(strategy.strategyLevel ?? 1) * 10}`, type: 'total' },
        { label: `Equipment Strategy Bonus`, value: `+${getPassiveBonuses().strategy_bonus}`, type: 'bonus' },
        { label: `Raised by: daily chess`, value: `♟️`, type: 'base' },
    ];

    // ─── SLEEP SUMMARY ──────────────────────────────
    const sleepCount = day.sleepLogs?.filter(l => !l.skipped).length ?? 0;
    const totalSleepXp = day.sleepLogs?.filter(l => !l.skipped).reduce((sum, l) => sum + l.xpEarned, 0) ?? 0;

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
                    Your character's power comes from real-world habits! Keep in mind: daily tasks have a maximum XP cap per skill each day to prevent overworking. Weekly tasks, sleep logging, daily check-ins, and combat rewards bypass these caps entirely.
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
