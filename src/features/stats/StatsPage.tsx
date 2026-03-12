import { useGameStore, type SkillName } from '../../store/useGameStore';
import { getMilestoneForSkill } from '../../store/useCombatFormulas';
import { BarChart2, TrendingUp, Shield, Sword } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import './StatsPage.css';

const SKILL_ICONS: Record<SkillName, string> = {
    'Sleep': '😴',
    'Hygiene': '🧼',
    'Flexibility': '🤸',
    'Strength': '💪',
    'Cardio': '🏃',
    'Clothing': '👔',
    'Housemaid': '🧹',
    'Work': '💼',
    'Health': '❤️',
    'Social': '🤝',
    'Luck': '🍀',
    'Habit Building': '🔥',
    'Intelligence': '🧠',
};

export const StatsPage = () => {
    const {
        skills,
        globalXp,
        getGlobalLevel,
        getXpProgress,
        getAttack,
        getDefense,
        getDailyXpEarned,
        getXpForLevel
    } = useGameStore();

    const globalLevel = getGlobalLevel();
    const attack = getAttack();
    const defense = getDefense();

    // Calculate global level progress
    const nextLevelXp = getXpForLevel(globalLevel + 1);
    const currentLevelXp = getXpForLevel(globalLevel);
    const globalXpForLevel = globalXp - currentLevelXp;
    const globalXpNeeded = nextLevelXp - currentLevelXp;
    const globalProgress = Math.floor((globalXpForLevel / globalXpNeeded) * 100);

    return (
        <div className="stats-page">
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
                    <h1>📊 Your Stats</h1>
                    <p className="subtitle">Track your progression and mastery</p>
                </div>

                <div className="stats-content">
                    {/* Global Level */}
                    <Card className="global-level-card">
                        <div className="global-level-header">
                            <TrendingUp size={32} className="icon-primary" />
                            <div>
                                <h2>Global Level</h2>
                                <p className="level-number">{globalLevel}</p>
                            </div>
                        </div>
                        <ProgressBar
                            current={globalProgress}
                            max={100}
                            label={`${globalProgress}% to level ${globalLevel + 1}`}
                            variant="success"
                        />
                        <p className="xp-text">Total XP: {globalXp.toLocaleString()}</p>
                    </Card>

                    {/* Combat Stats */}
                    <div className="combat-stats-row">
                        <Card className="combat-stat-card">
                            <Sword size={24} className="icon-red" />
                            <div className="combat-stat-info">
                                <span className="combat-stat-label">Attack</span>
                                <span className="combat-stat-value">{attack}</span>
                            </div>
                        </Card>
                        <Card className="combat-stat-card">
                            <Shield size={24} className="icon-blue" />
                            <div className="combat-stat-info">
                                <span className="combat-stat-label">Defense</span>
                                <span className="combat-stat-value">{defense}</span>
                            </div>
                        </Card>
                    </div>

                    {/* Skills Grid */}
                    <div className="skills-section">
                        <h2 className="section-title">
                            <BarChart2 size={24} />
                            Skills
                        </h2>
                        <div className="skills-grid">
                            {(Object.entries(skills) as [SkillName, typeof skills[SkillName]][]).map(([skillName, skill]) => {
                                const progress = getXpProgress(skillName);
                                const dailyUsed = getDailyXpEarned(skillName);

                                return (
                                    <Card key={skillName} className="skill-card compact">
                                        <div className="skill-header-compact">
                                            <div className="skill-name-group">
                                                <span className="skill-icon">{SKILL_ICONS[skillName]}</span>
                                                <h3 className="skill-name">{skillName} <span className="skill-level">Lv {skill.level}</span></h3>
                                            </div>
                                            <span className="skill-xp-ratio">{progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP</span>
                                        </div>

                                        <div className="skill-stats-compact">
                                            <span>Today: +{dailyUsed.toLocaleString()}</span>
                                            <span>Total XP: {skill.totalXp.toLocaleString()}</span>
                                        </div>

                                        <div className="skill-progress-compact">
                                            <ProgressBar
                                                current={progress.current}
                                                max={progress.required}
                                                label=""
                                            />
                                        </div>

                                        {(() => {
                                            const milestoneInfo = getMilestoneForSkill(skillName, skill.level);
                                            if (!milestoneInfo.nextTier) return null;

                                            // progressToNext is a 0..1 ratio
                                            const progressPct = Math.floor(milestoneInfo.progressToNext * 100);

                                            return (
                                                <div className="milestone-tracker compact">
                                                    <div className="milestone-label-row">
                                                        <span className="milestone-name">Next: {milestoneInfo.nextTier.name} (Lv.{milestoneInfo.nextTier.level})</span>
                                                    </div>
                                                    <div className="milestone-bar-bg">
                                                        <div className="milestone-bar-fill" style={{ width: `${progressPct}%` }} />
                                                    </div>
                                                    {milestoneInfo.nextTier.reward && (
                                                        <div className="milestone-reward-preview">
                                                            ✨ {milestoneInfo.nextTier.reward}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
