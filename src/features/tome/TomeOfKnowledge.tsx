import { motion } from 'framer-motion';
import { Book, Swords, Shield, Heart, Zap, Sparkles, Lock, Eye, Star } from 'lucide-react';
import { useEnemyStore, ENEMY_DB, ELEMENT_ICONS } from '../../store/useEnemyStore';
import './TomeOfKnowledge.css';

export const TomeOfKnowledge = () => {
    const {
        encounteredEnemies,
        getDefeatCount,
        isLoreUnlocked,
        isStatsRevealed,
        getTotalBestiaryBonus
    } = useEnemyStore();

    const allEnemies = Object.values(ENEMY_DB);
    const totalBonus = getTotalBestiaryBonus();
    const masteredCount = Object.keys(ENEMY_DB).filter(id => isLoreUnlocked(id)).length;

    return (
        <div className="tome-page">
            <motion.div
                className="tome-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Book size={40} className="tome-icon" />
                <h1>Tome of Fate</h1>
                <p className="tome-subtitle">Chronicle of conquered foes and ancient wisdom</p>
                {totalBonus > 0 && (
                    <div className="bestiary-bonus">
                        <Star size={16} /> +{Math.round(totalBonus * 100)}% Total DMG Bonus ({masteredCount} mastered)
                    </div>
                )}
            </motion.div>

            {/* BESTIARY GRID */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <h2><Swords size={24} /> Bestiary</h2>
                <p className="section-desc">Defeat enemies to reveal their secrets. Master them (10 defeats) for permanent bonuses!</p>

                <div className="bestiary-grid">
                    {allEnemies.map((enemy) => {
                        const defeatCount = getDefeatCount(enemy.id);
                        const statsVisible = isStatsRevealed(enemy.id);
                        const loreVisible = isLoreUnlocked(enemy.id);
                        const encountered = encounteredEnemies.includes(enemy.id) || defeatCount > 0;
                        const isBoss = enemy.name.includes('⚔️') || enemy.floor % 10 === 0;

                        return (
                            <motion.div
                                key={enemy.id}
                                className={`bestiary-card ${loreVisible ? 'mastered' : ''} ${isBoss ? 'boss' : ''}`}
                                whileHover={{ scale: 1.02 }}
                            >
                                {/* Header */}
                                <div className="bestiary-header">
                                    <span className="enemy-icon">{encountered ? enemy.icon : '❓'}</span>
                                    <div className="enemy-info">
                                        <span className="enemy-name">
                                            {encountered ? enemy.name : '???'}
                                        </span>
                                        <span className="enemy-floor">Floor {enemy.floor}</span>
                                    </div>
                                    <span className={`element-badge ${enemy.element}`}>
                                        {ELEMENT_ICONS[enemy.element]}
                                    </span>
                                </div>

                                {/* Stats (revealed at 5 defeats) */}
                                <div className="bestiary-stats">
                                    {statsVisible ? (
                                        <>
                                            <div className="stat"><Heart size={14} /> {enemy.baseHp}</div>
                                            <div className="stat"><Swords size={14} /> {enemy.baseAtk}</div>
                                            <div className="stat"><Shield size={14} /> {enemy.baseDef}</div>
                                            <div className="stat"><Zap size={14} /> {enemy.baseSpd}</div>

                                            {/* Tower Expansion: Strategic Info */}
                                            <div className="stat weakness"><Shield size={14} /> Weak: {enemy.weaknessSkill}</div>
                                            <div className="stat affinity"><Heart size={14} /> Affin: {enemy.affinitySkill}</div>
                                        </>
                                    ) : (
                                        <div className="locked-stats">
                                            <Lock size={14} /> Defeat 5× to reveal stats
                                        </div>
                                    )}
                                </div>

                                {/* Lore (revealed at 10 defeats) */}
                                <div className="bestiary-lore">
                                    {loreVisible ? (
                                        <>
                                            <div className="lore-header-row">
                                                <Eye size={14} className="lore-icon" />
                                                <span className="personality-tag">{enemy.personalityTag}</span>
                                            </div>
                                            <p className="enemy-desc">{enemy.description}</p>
                                            <p className="behavior-hint">"{enemy.behaviorHint}"</p>
                                            <div className="mastery-bonus">
                                                <Sparkles size={12} /> +2% DMG vs this enemy
                                            </div>
                                        </>
                                    ) : (
                                        <div className="locked-lore">
                                            <Lock size={14} /> Defeat 10× to unlock lore
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                <div className="bestiary-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${Math.min(100, (defeatCount / 10) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="progress-text">{defeatCount}/10</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.section>

            {/* ARCANE CONNECTIONS - Task to Stat Relationships */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
            >
                <h2><Sparkles size={24} /> Arcane Connections</h2>
                <p className="section-desc">Your daily actions forge your battle power. Here's how tasks shape your abilities:</p>

                <div className="connections-table">
                    <div className="connection-row header">
                        <span>Task Category</span>
                        <span>Skill</span>
                        <span>Combat Effect</span>
                    </div>
                    <div className="connection-row">
                        <span>🏋️ Gym/Lifting</span>
                        <span>Strength</span>
                        <span className="stat-atk">⚔️ Physical Attack</span>
                    </div>
                    <div className="connection-row">
                        <span>📚 Reading Books</span>
                        <span>Intelligence</span>
                        <span className="stat-mp">✨ Magic ATK & Max MP</span>
                    </div>
                    <div className="connection-row">
                        <span>🏃 Running/Cardio</span>
                        <span>Cardio</span>
                        <span className="stat-spd">⚡ Speed & MP Regen</span>
                    </div>
                    <div className="connection-row">
                        <span>😴 Sleep Tasks</span>
                        <span>Sleep</span>
                        <span className="stat-def">🛡️ Defense</span>
                    </div>
                    <div className="connection-row">
                        <span>🧘 Stretching</span>
                        <span>Flexibility</span>
                        <span className="stat-def">🛡️ Defense</span>
                    </div>
                    <div className="connection-row">
                        <span>🧹 Cleaning/Maid</span>
                        <span>Housemaid</span>
                        <span className="stat-mp">💧 Max Mana Pool</span>
                    </div>
                    <div className="connection-row">
                        <span>🎲 Board Rolls</span>
                        <span>Luck</span>
                        <span className="stat-crit">💥 Critical Rate</span>
                    </div>
                    <div className="connection-row">
                        <span>🔥 Habit Streaks</span>
                        <span>Habit Building</span>
                        <span className="stat-def">🛡️ Defense & Berserk</span>
                    </div>
                </div>

                {/* Magic Power Card */}
                <div className="magic-power-card">
                    <div className="magic-power-header">
                        <span className="magic-icon">📖</span>
                        <h3>The Scholar's Path</h3>
                    </div>
                    <p>Complete books in the <strong>Library</strong> to gain Intelligence XP. Each level of Intelligence grants:</p>
                    <div className="magic-bonuses">
                        <div className="bonus-item">
                            <span>✨</span>
                            <span>+2 Magic Attack</span>
                        </div>
                        <div className="bonus-item">
                            <span>💧</span>
                            <span>+10 Max MP</span>
                        </div>
                    </div>
                    <p className="magic-tip">Visit the <strong>Arcane Emporium</strong> to purchase powerful spells!</p>
                </div>
            </motion.section>

            {/* COMBAT GUIDE */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2><Sparkles size={24} /> Combat Wisdom</h2>

                <div className="formula-card">
                    <div className="formula-title">Damage Formula</div>
                    <div className="formula">
                        <code>Damage = (ATK × Crit) - DEF</code>
                    </div>
                </div>

                <div className="mechanics-grid">
                    <div className="mechanic-card">
                        <div className="mechanic-icon">🔥</div>
                        <h3>Elements</h3>
                        <p>🔥→🌿→💧→🔥. Electric ⚡ beats Water.</p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">⚡</div>
                        <h3>Speed</h3>
                        <p>Determines turn order. Fast wins.</p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">🛡️</div>
                        <h3>Defense</h3>
                        <p>50% damage reduction when defending.</p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">💥</div>
                        <h3>Ultimate</h3>
                        <p>Fills at 100 Rage. Devastating.</p>
                    </div>
                </div>
            </motion.section>

            {/* PET SCALING & EVOLUTION */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <h2><Sparkles size={24} /> Pet Codex</h2>
                <p className="section-desc">Pets scale from your real habits. Train yourself → train your companion.</p>

                <div className="connections-table">
                    <div className="connection-row header">
                        <span>Stat</span>
                        <span>Formula</span>
                        <span>Source Skill</span>
                    </div>
                    <div className="connection-row">
                        <span>Pet Damage</span>
                        <span>base + Lv × 1.5</span>
                        <span className="stat-atk">💪 Strength</span>
                    </div>
                    <div className="connection-row">
                        <span>Pet Speed</span>
                        <span>base + Lv × 1.2</span>
                        <span className="stat-spd">🏃 Cardio</span>
                    </div>
                    <div className="connection-row">
                        <span>Pet Dodge</span>
                        <span>2% + Lv × 0.3%</span>
                        <span className="stat-def">🧘 Flexibility</span>
                    </div>
                    <div className="connection-row">
                        <span>Pet Crit</span>
                        <span>3% + Lv × 0.4%</span>
                        <span className="stat-crit">😴 Sleep</span>
                    </div>
                    <div className="connection-row">
                        <span>Spell Power</span>
                        <span>base + Lv × 2.0</span>
                        <span className="stat-mp">📚 Intelligence</span>
                    </div>
                </div>

                <div className="formula-card" style={{ marginTop: '1rem' }}>
                    <div className="formula-title">🔮 Evolution</div>
                    <div className="formula">
                        <code>30 cumulative skill logs → Evolution + new passive</code>
                    </div>
                    <div className="formula" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        Wolf → Dire Wolf (30× Strength) · Owl → Archmage Owl (30× Intelligence) · Turtle → Fortress Tortoise (30× Hygiene) · Fox → Phantom Fox (30× Flexibility) · Phoenix → Solar Phoenix (30× Sleep)
                    </div>
                </div>
            </motion.section>

            {/* FACTION REPUTATION */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2><Shield size={24} /> Factions</h2>
                <p className="section-desc">Every skill log earns +1 faction rep. Higher tiers unlock better shop items + discounts.</p>

                <div className="connections-table">
                    <div className="connection-row header">
                        <span>Faction</span>
                        <span>Skills</span>
                        <span>Tiers</span>
                    </div>
                    <div className="connection-row">
                        <span>⚔️ Iron Guild</span>
                        <span>STR / Cardio / Flex</span>
                        <span>100 / 500 / 2K / 10K</span>
                    </div>
                    <div className="connection-row">
                        <span>📚 Scholar's Archive</span>
                        <span>INT / Work / Habit</span>
                        <span>100 / 500 / 2K / 10K</span>
                    </div>
                    <div className="connection-row">
                        <span>🌿 Vitality Order</span>
                        <span>Sleep / Hyg / HP / Maid</span>
                        <span>100 / 500 / 2K / 10K</span>
                    </div>
                </div>
            </motion.section>

            {/* TITLE SYSTEM */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <h2><Star size={24} /> Titles</h2>
                <p className="section-desc">Permanent titles earned through dedication. Each grants a small passive bonus.</p>

                <div className="mechanics-grid">
                    <div className="mechanic-card">
                        <div className="mechanic-icon">🔥</div>
                        <h3>Streak Titles</h3>
                        <p>30d → Disciplined (+2% ATK). 90d → Unwavering (+3% DEF). 365d → Eternal (+5% all).</p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">📊</div>
                        <h3>Skill Titles</h3>
                        <p>Lv.10 STR → Iron Body (+2% ATK). Lv.10 INT → Scholar (+20 MaxMP). 100 logs → mastery bonus.</p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">⚔️</div>
                        <h3>Battle Titles</h3>
                        <p>50 wins → Arena Veteran (+50 HP). 200 wins → Gladiator (+3% crit).</p>
                    </div>
                </div>
            </motion.section>

            {/* ROOM BONUSES */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h2><Heart size={24} /> Room Bonuses</h2>
                <p className="section-desc">Placed furniture grants passive combat bonuses. Upgrade your room for an edge in battle.</p>

                <div className="connections-table">
                    <div className="connection-row header">
                        <span>Furniture</span>
                        <span>Bonus</span>
                    </div>
                    <div className="connection-row">
                        <span>🛏️ Beds</span>
                        <span className="stat-def">+5 to +100 Max HP</span>
                    </div>
                    <div className="connection-row">
                        <span>⚔️ Weapon Rack</span>
                        <span className="stat-atk">+3% ATK</span>
                    </div>
                    <div className="connection-row">
                        <span>📚 Bookshelf</span>
                        <span className="stat-crit">+1% Crit, +3% XP</span>
                    </div>
                    <div className="connection-row">
                        <span>📜 Desks</span>
                        <span className="stat-mp">-2% to -8% MP Cost</span>
                    </div>
                    <div className="connection-row">
                        <span>💎 Celestial Items</span>
                        <span className="stat-atk">+ATK%, +DEF%, +MaxHP</span>
                    </div>
                </div>
            </motion.section>
            {/* BOARD ODDS & FATIGUE */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
            >
                <h2><Swords size={24} /> Systems & Odds</h2>
                <div className="mechanics-grid">
                    <div className="mechanic-card">
                        <div className="mechanic-icon">🎲</div>
                        <h3>Board Regions</h3>
                        <p><strong>Early (1-13):</strong> Gold, Stat Boosts, Double XP.<br />
                            <strong>Mid (14-27):</strong> Tokens, Shards, Discounts.<br />
                            <strong>Late (28-39):</strong> Rare Shards, Mystery Events.
                        </p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">💤</div>
                        <h3>Fatigue</h3>
                        <p>Logging the same skill <strong>7 days in a row</strong> causes mental fatigue.<br />
                            XP reduced by <strong>5%</strong> until you rest (skip a day).
                        </p>
                    </div>
                    <div className="mechanic-card">
                        <div className="mechanic-icon">📅</div>
                        <h3>Daily Quests</h3>
                        <p>Each day, one random skill grants <strong>2x XP</strong>.<br />
                            Check the main menu to see today's focus!
                        </p>
                    </div>
                </div>
            </motion.section>

            {/* CONQUEST MODE */}
            <motion.section
                className="tome-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h2><Swords size={24} /> Conquest Mode</h2>
                <p className="section-desc">A separate campaign where your real-life skills shape your military conquest. No Arena stats are affected.</p>

                <div className="formula-card">
                    <div className="formula-title">Power Score (Conquest Only)</div>
                    <div className="formula">
                        <code>PowerScore = (ATK × 3) + (DEF × 2) + (HP / 10) + (SPD / 5)</code>
                    </div>
                    <div className="formula" style={{ marginTop: '0.5rem' }}>
                        <code>TotalForce = PowerScore × (1 + ArmyBonus)</code>
                    </div>
                    <div className="formula" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        ArmyBonus from soldiers, capped at +50%
                    </div>
                </div>

                <div className="connections-table" style={{ marginTop: '1rem' }}>
                    <div className="connection-row header">
                        <span>System</span>
                        <span>Rule</span>
                    </div>
                    <div className="connection-row">
                        <span>⚔️ Combat</span>
                        <span>2d6 + Modifiers (Force, Terrain, Morale, Recon). Total mod cap: ±5</span>
                    </div>
                    <div className="connection-row">
                        <span>🌍 Terrain</span>
                        <span>floor(SkillLevel / 5), cap +3. Swamp→Cardio, Mountain→Strength, etc.</span>
                    </div>
                    <div className="connection-row">
                        <span>❤️ Morale</span>
                        <span>0-100. Wins +10, losses -15. Mod: ≥80→+2, ≥60→+1, ≤40→0, ≤20→-1, else→-2</span>
                    </div>
                    <div className="connection-row">
                        <span>🔗 Supply</span>
                        <span>Path to base must be connected. Cut-off = reduced bonus, no healing</span>
                    </div>
                    <div className="connection-row">
                        <span>🛡️ Soldiers</span>
                        <span>6 ranks: Recruit → Warden (2.6× mult). Max 6 soldiers</span>
                    </div>
                    <div className="connection-row">
                        <span>♟️ Chess</span>
                        <span>Daily game → Strategy XP. Win: 50, Draw: 25, Loss: 10. Lv10→+1 Recon</span>
                    </div>
                    <div className="connection-row">
                        <span>🔱 Sigils</span>
                        <span>Conquest-only currency. Earned from nodes/bosses. Spent in Conquest Store</span>
                    </div>
                </div>
            </motion.section>
        </div>
    );
};
