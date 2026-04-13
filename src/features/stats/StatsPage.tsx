import { useGameStore, type SkillName } from '../../store/useGameStore';
import { getMilestoneForSkill, SKILL_COMBAT_ROLES } from '../../store/useCombatFormulas';
import { BarChart2, Shield, Sword, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyPanel } from '../room/TrophyPanel';
import { DonationShrine } from '../shrine/DonationShrine';
import { useEconomyBalanceStore, PRESTIGE_REQUIRED_LEVEL, PRESTIGE_COST } from '../../store/useEconomyBalanceStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { YourAffinitiesPanel } from './YourAffinitiesPanel';
import './StatsPage.css';

const SKILL_ICONS: Record<SkillName, string> = {
    'Sleep': '😴',
    'Hygiene': '🧼',
    'Flexibility': '🤸',
    'Strength': '💪',
    'Cardio': '🏃',
    'Work': '💼',
    'Health': '❤️',
    'Social': '🤝',
    'Luck': '🍀',
    'Habit': '🔥',
    'Housemaid': '🧹',
    'Intelligence': '🧠',
};

const RANK_TIERS = [
    { icon: '🗡️', name: 'Adventurer', minLevel: 0,  maxLevel: 4  },
    { icon: '⭐', name: 'Rising',     minLevel: 5,  maxLevel: 9  },
    { icon: '🥉', name: 'Bronze',     minLevel: 10, maxLevel: 19 },
    { icon: '🥈', name: 'Silver',     minLevel: 20, maxLevel: 29 },
    { icon: '🥇', name: 'Gold',       minLevel: 30, maxLevel: 49 },
    { icon: '💎', name: 'Diamond',    minLevel: 50, maxLevel: Infinity },
];

function getRankIndex(level: number): number {
    return RANK_TIERS.findIndex((t, i) => {
        const next = RANK_TIERS[i + 1];
        return level >= t.minLevel && (next ? level < next.minLevel : true);
    });
}

export const StatsPage = () => {
    const [showTrophyPanel, setShowTrophyPanel] = useState(false);
    const [showShrine, setShowShrine] = useState(false);
    const economy = useEconomyBalanceStore();
    const { gold } = useCurrencyStore();
    const { spendGold } = useCurrencyStore();
    const {
        skills,
        globalXp,
        getGlobalLevel,
        getXpProgress,
        getAttack,
        getDefense,
        getDailyXpEarned,
    } = useGameStore();

    const globalLevel = getGlobalLevel();
    const attack = getAttack();
    const defense = getDefense();

    const rankIdx = getRankIndex(globalLevel);
    const currentRank = RANK_TIERS[rankIdx];
    const nextRank = RANK_TIERS[rankIdx + 1] ?? null;

    // Progress toward next rank (0-100)
    const rankProgress = nextRank
        ? Math.min(100, Math.round(((globalLevel - currentRank.minLevel) / (nextRank.minLevel - currentRank.minLevel)) * 100))
        : 100;

    return (
        <div className="stats-page">
            <AnimatePresence>
                {showTrophyPanel && (
                    <motion.div
                        className="room-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTrophyPanel(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            className="room-modal-container"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ position: 'relative', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}
                        >
                            <TrophyPanel onClose={() => setShowTrophyPanel(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Layers */}
            <div className="stats-bg">
                <div className="stats-bg__image" />
                <div className="stats-bg__vignette" />
                <div className="stats-bg__fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>
                <div className="stats-bg__sparkles">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="sparkle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Wrapper */}
            <div className="stats-content-wrapper">
                <div className="page-header">
                    <h1>📊 Skills</h1>
                </div>

                <div className="stats-content">

                    {/* ── Rank Progress Banner ── */}
                    <div className="rank-banner">
                        <div className="rank-tiers-row">
                            {RANK_TIERS.map((tier, i) => (
                                <div
                                    key={tier.name}
                                    className={`rank-pip ${i === rankIdx ? 'rank-pip--active' : ''} ${i < rankIdx ? 'rank-pip--past' : ''}`}
                                >
                                    {i === rankIdx && <div className="rank-pip-glitter" />}
                                    <span className="rank-pip-icon">{tier.icon}</span>
                                    <span className="rank-pip-name">{tier.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="rank-progress-row">
                            <span className="rank-progress-label">
                                Lv.{globalLevel} — {currentRank.name}
                            </span>
                            {nextRank && (
                                <span className="rank-progress-next">
                                    {nextRank.icon} {nextRank.name} at Lv.{nextRank.minLevel}
                                </span>
                            )}
                        </div>

                        <div className="rank-progress-track">
                            <div className="rank-progress-fill" style={{ width: `${rankProgress}%` }} />
                        </div>

                        <div className="rank-xp-note">
                            Global XP: {globalXp.toLocaleString()}
                        </div>
                    </div>

                    {/* Combat Stats */}
                    <div className="combat-stats-row">
                        <Card className="combat-stat-card">
                            <Sword size={20} className="icon-red" />
                            <div className="combat-stat-info">
                                <span className="combat-stat-label">Attack</span>
                                <span className="combat-stat-value">{attack}{economy.shrineBonusStats > 0 ? ` (+${economy.shrineBonusStats})` : ''}</span>
                            </div>
                        </Card>
                        <Card className="combat-stat-card">
                            <Shield size={20} className="icon-blue" />
                            <div className="combat-stat-info">
                                <span className="combat-stat-label">Defense</span>
                                <span className="combat-stat-value">{defense}{economy.shrineBonusStats > 0 ? ` (+${economy.shrineBonusStats})` : ''}</span>
                            </div>
                        </Card>
                        <div className="combat-stat-card card card--default" style={{ cursor: 'pointer' }} onClick={() => setShowShrine(true)}>
                            <Sparkles size={20} style={{ color: '#c084fc' }} />
                            <div className="combat-stat-info">
                                <span className="combat-stat-label">Shrine</span>
                                <span className="combat-stat-value" style={{ color: '#c084fc' }}>⛩️</span>
                            </div>
                        </div>
                    </div>

                    <YourAffinitiesPanel />

                    {/* Skills Grid */}
                    <div className="skills-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="section-title" style={{ margin: 0 }}>
                                <BarChart2 size={20} />
                                Skills
                            </h2>
                            <button
                                className="action-button primary"
                                onClick={() => setShowTrophyPanel(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                            >
                                <Trophy size={18} /> Trophy Hall
                            </button>
                        </div>
                        <div className="skills-grid">
                            {(Object.entries(skills) as [SkillName, typeof skills[SkillName]][]).map(([skillName, skill]) => {
                                const progress = getXpProgress(skillName);
                                const dailyUsed = getDailyXpEarned(skillName);
                                const milestoneInfo = getMilestoneForSkill(skillName, skill.level);
                                const progressPct = milestoneInfo.nextTier
                                    ? Math.floor(milestoneInfo.progressToNext * 100)
                                    : 100;

                                return (
                                    <Card key={skillName} className="skill-card compact">
                                        {/* Row 1: name + level; Row 2: XP ratio on its own line */}
                                        <div className="skill-header-compact">
                                            <div className="skill-name-group">
                                                <span className="skill-icon">{SKILL_ICONS[skillName]}</span>
                                                <h3 className="skill-name">
                                                    {skillName}
                                                    <span className="skill-level"> Lv {skill.level}</span>
                                                </h3>
                                                <span className="skill-xp-ratio">{progress.current} / {progress.required} XP</span>
                                            </div>
                                        </div>

                                        {/* XP bar — numbers shown separately in skill-xp-ratio, so suppress inline label */}
                                        <div className="skill-progress-compact">
                                            <ProgressBar current={progress.current} max={progress.required} label="" showNumbers={false} />
                                        </div>
                                        
                                        <div className="skill-combat-role-text" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                            {SKILL_COMBAT_ROLES[skillName]?.description}
                                        </div>

                                        {/* Row 3: today + total + milestone */}
                                        <div className="skill-footer-row">
                                            <span className="skill-today">+{dailyUsed} today</span>
                                            {milestoneInfo.nextTier && (
                                                <span className="skill-milestone-info">
                                                    → {milestoneInfo.nextTier.name} Lv.{milestoneInfo.nextTier.level}
                                                    {' '}
                                                    <span className="skill-milestone-pct">{progressPct}%</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Milestone bar (only when next tier exists) */}
                                        {milestoneInfo.nextTier && (
                                            <div className="milestone-bar-bg">
                                                <div className="milestone-bar-fill" style={{ width: `${progressPct}%` }} />
                                            </div>
                                        )}

                                        {/* Reward badge inline */}
                                        {milestoneInfo.nextTier?.reward && (
                                            <div className="skill-reward-tag">✨ {milestoneInfo.nextTier.reward}</div>
                                        )}

                                        {/* Prestige Section */}
                                        {(() => {
                                            const rank = economy.getPrestigeRank(skillName);
                                            const canPrestige = skill.level >= PRESTIGE_REQUIRED_LEVEL;
                                            const canAfford = gold >= PRESTIGE_COST;
                                            return (
                                                <>
                                                    {rank > 0 && (
                                                        <div className="skill-prestige-badge">
                                                            {'⭐'.repeat(rank)} Prestige {rank} (+{rank * 10}% XP)
                                                        </div>
                                                    )}
                                                    {canPrestige && (
                                                        <button
                                                            className={`skill-prestige-btn ${!canAfford ? 'skill-prestige-btn--locked' : ''}`}
                                                            disabled={!canAfford}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (canAfford && spendGold(PRESTIGE_COST)) {
                                                                    economy.prestigeSkill(skillName);
                                                                }
                                                            }}
                                                        >
                                                            <RotateCcw size={12} /> Prestige ({PRESTIGE_COST.toLocaleString()} 🪙)
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            {/* Donation Shrine Modal */}
            <AnimatePresence>
                {showShrine && <DonationShrine onClose={() => setShowShrine(false)} />}
            </AnimatePresence>
        </div>
    );
};
