import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Swords, Shield, Zap, X, Sparkles, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useEnemyStore, ENEMY_DB, ELEMENT_ICONS } from '../../store/useEnemyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useMagicStore } from '../../store/useMagicStore';
import { ArenaBattlefieldLayout } from './ArenaBattlefieldLayout';
import { getDetailedCombatBreakdown, type StatBreakdown } from '../../store/useCombatFormulas';
import { WeaponEquipWidget } from './WeaponEquipWidget';
import { useXpWeaponStore } from '../../store/useXpWeaponStore';
import { Panel } from '../../components/ui/Panel';

import { GachaButton } from '../../components/ui/GachaButton';
import './Arena.css';


// Background images - imported directly for Vite bundling
import forestRuinsBg from '../../assets/backgrounds/forest_ruins.png';
import volcanicCavernBg from '../../assets/backgrounds/volcanic_cavern.png';
import shadowRealmBg from '../../assets/backgrounds/shadow_realm.png';
import crystalCatacombsBg from '../../assets/backgrounds/crystal_catacombs.png';
import infernalCitadelBg from '../../assets/backgrounds/infernal_citadel.png';

// Enemy images - imported directly for Vite bundling
import fatigueWraithImg from '../../assets/enemies/fatigue_wraith.png';
import chaosOfClutterImg from '../../assets/enemies/chaos_of_clutter.png';
import sedentaryColossusImg from '../../assets/enemies/sedentary_colossus.png';
import insomniaEchoImg from '../../assets/enemies/insomnia_echo.png';
import stressPhantomImg from '../../assets/enemies/stress_phantom.png';
import procrastinationSpecterImg from '../../assets/enemies/procrastination_specter.png';
import hellishImpImg from '../../assets/enemies/hellish_imp.png';
import voidStalkerImg from '../../assets/enemies/void_stalker.png';
import boneGolemImg from '../../assets/enemies/bone_golem.svg';
import gluttonyMawImg from '../../assets/enemies/gluttony_maw.svg';
import apathyShadeImg from '../../assets/enemies/apathy_shade.svg';
import doubtCrawlerImg from '../../assets/enemies/doubt_crawler.svg';
import vanityMirrorImg from '../../assets/enemies/vanity_mirror.svg';
import rageBerserkerImg from '../../assets/enemies/rage_berserker.svg';
import slothLeviathanImg from '../../assets/enemies/sloth_leviathan.svg';
import despairLichImg from '../../assets/enemies/despair_lich.svg';

// Boss images
import shadowTitanImg from '../../assets/bosses/shadow_titan.png';
import generalInertiaImg from '../../assets/bosses/general_inertia.png';
import flickerBurnoutImg from '../../assets/bosses/flicker_burnout.png';

// Player sprite
import { useHeroImage } from '../../hooks/useHeroImage';

// Map floor ranges to background images
const getBackgroundForFloor = (floor: number): string => {
    if (floor <= 4) return forestRuinsBg;
    if (floor <= 9) return volcanicCavernBg;
    if (floor === 10) return shadowRealmBg;
    if (floor <= 19) return crystalCatacombsBg;
    return infernalCitadelBg;
};

// Map enemy IDs to their images
const ENEMY_IMAGES: Record<string, string> = {
    'fatigue_wraith': fatigueWraithImg,
    'chaos_of_clutter': chaosOfClutterImg,
    'sedentary_colossus': sedentaryColossusImg,
    'insomnia_echo': insomniaEchoImg,
    'stress_phantom': stressPhantomImg,
    'procrastination_specter': procrastinationSpecterImg,
    'hellish_imp': hellishImpImg,
    'void_stalker': voidStalkerImg,
    'bone_golem': boneGolemImg,
    'gluttony_maw': gluttonyMawImg,
    'apathy_shade': apathyShadeImg,
    'doubt_crawler': doubtCrawlerImg,
    'vanity_mirror': vanityMirrorImg,
    'rage_berserker': rageBerserkerImg,
    'sloth_leviathan': slothLeviathanImg,
    'despair_lich': despairLichImg,
    // Bosses
    'shadow_titan': shadowTitanImg,
    'general_inertia': generalInertiaImg,
    'flicker_of_burnout': flickerBurnoutImg,
};

/**
 * Calculates a win probability percentage based on combatant stats.
 * Weighted primarily on ATK vs DEF and HP pools.
 */
const calculateWinChance = (player: any, enemy: any): number => {
    if (!player || !enemy) return 0;

    // Estimate total damage cycles
    const playerDmgPerTurn = Math.max(5, player.atk - (enemy.def * 0.5));
    const enemyDmgPerTurn = Math.max(5, enemy.atk - (player.def * 0.5));

    const turnsToKillEnemy = enemy.maxHp / playerDmgPerTurn;
    const turnsToKillPlayer = player.maxHp / enemyDmgPerTurn;

    // Win chance is inverse ratio of turns to kill
    // If turnsToKillEnemy is smaller, player wins faster
    let chance = (turnsToKillPlayer / (turnsToKillEnemy + turnsToKillPlayer)) * 100;

    // Add speed weight
    const spdDiff = player.spd - enemy.spd;
    chance += spdDiff * 0.1;

    // Add level/floor scaling offset to keep it within realistic bounds
    return Math.min(99.9, Math.max(0.1, Math.round(chance)));
};

const getWinChanceColor = (chance: number): string => {
    if (chance < 30) return '#ef4444'; // Red
    if (chance < 50) return '#f97316'; // Orange
    if (chance < 70) return '#fbbf24'; // Yellow
    return '#22c55e'; // Green
};

export const Arena = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const heroImage = useHeroImage();
    const { addGlobalXp } = useGameStore();
    const { addGold } = useCurrencyStore();
    const { markDefeated } = useEnemyStore();
    const {
        currentFloor,
        highestFloorCleared,
        unlockNextFloor,
        getEnemyForFloor,
        checkForGoldenSlime,
        recordGoldenSlimeEncounter
    } = useCampaignStore();

    // Pet companion
    const { activePet } = usePetStore();

    const {
        phase,
        player,
        enemy,
        combatLog,
        lastDamage,
        initBattle,
        executePlayerAction,
        selectAbility,
        playerDefend,
        resetBattle,
        petAbilityCooldown,
        usePetAbility,
        castSpell,
        currentMP,
        maxMP: battleMaxMP,
        equippedSpells,
        startBattle,
    } = useBattleStore();

    // Get pet ability info
    const petDef = PET_DATABASE[activePet];
    const petAbility = petDef ? { ...petDef.abilities[0], effect: { type: petDef.abilities[0].type, value: petDef.abilities[0].buffValue || petDef.abilities[0].baseDamage || 0, duration: petDef.abilities[0].buffDuration } } : null;

    // Magic/Spells
    const { ownedSpells, getOwnedSpells } = useMagicStore();
    const [showSpellMenu, setShowSpellMenu] = useState(false);



    const [view, setView] = useState<'map' | 'battle'>('map');
    const [autoAttack, setAutoAttack] = useState(false);
    const [showPowerDetails, setShowPowerDetails] = useState(false);

    // Auto-attack timer ref - MUST use ref so cleanup works properly
    const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-Attack Timer: ONLY runs when autoAttack is explicitly true
    // Uses interval instead of setTimeout, with proper gating and cleanup
    useEffect(() => {
        // HARD GATE: If auto is off, clear any existing timer and exit immediately
        if (!autoAttack) {
            if (autoTimerRef.current) {
                clearInterval(autoTimerRef.current);
                autoTimerRef.current = null;
            }
            return;
        }

        // Start the auto-attack interval ONLY when autoAttack is true
        autoTimerRef.current = setInterval(() => {
            // Additional safety gates - check conditions inside the interval
            // These use the latest values via closure over the component scope
            const currentPhase = useBattleStore.getState().phase;
            const currentPlayer = useBattleStore.getState().player;

            // Only attack if it's player's turn to select action
            if (currentPhase !== 'select_action' || !currentPlayer) {
                return;
            }

            if (currentPlayer.energy >= 100) {
                // Use Ultimate when rage is full
                const ult = currentPlayer.abilities.find(a => a.type === 'ultimate');
                if (ult) {
                    selectAbility(ult);
                    setTimeout(executePlayerAction, 100);
                }
            } else {
                // Use Basic Strike
                const strike = currentPlayer.abilities.find(a => a.id === 'basic_strike');
                if (strike) {
                    selectAbility(strike);
                    setTimeout(executePlayerAction, 100);
                }
            }
        }, 1500);

        // Cleanup on unmount or when autoAttack toggles off
        return () => {
            if (autoTimerRef.current) {
                clearInterval(autoTimerRef.current);
                autoTimerRef.current = null;
            }
        };
    }, [autoAttack, selectAbility, executePlayerAction]);

    // Handle starting a battle for a specific floor
    const handleStartBattle = (floor: number) => {
        // Check for Golden Slime rare encounter (1% chance)
        const goldenSlimeSpawn = checkForGoldenSlime(floor);

        if (goldenSlimeSpawn) {
            recordGoldenSlimeEncounter(floor);
            resetBattle();
            initBattle('golden_slime');
            setView('battle');
            setAutoAttack(false);
            return;
        }

        const enemyId = getEnemyForFloor(floor);
        if (enemyId) {
            resetBattle();
            initBattle(enemyId);
            setView('battle');
            setAutoAttack(false); // Reset auto-attack when starting new battle
        }
    };

    // Handle Victory

    const handleVictory = () => {
        if (enemy) {
            const enemyDef = ENEMY_DB[enemy.id];
            if (enemyDef) {
                markDefeated(enemy.id);
                const scaling = enemy.scalingFactor || 1.0;
                addGold(Math.round(enemyDef.goldReward * scaling));
                addGlobalXp(Math.round(enemyDef.xpReward * scaling));

                // Unlock next floor if this was the current floor
                if (currentFloor <= highestFloorCleared + 1) { // Logic check
                    unlockNextFloor();
                }

                // Gem rewards for boss floors (every 10th floor)
                // 3rd boss+ (floor 30+) awards increasingly more gems
                if (enemyDef.floor > 0 && enemyDef.floor % 10 === 0) {
                    const bossNumber = enemyDef.floor / 10; // 1 = floor 10, 2 = floor 20, etc.
                    const gemReward = bossNumber <= 2 ? 1 : bossNumber - 1; // 1,1,2,3,4...
                    import('../../store/useGameStore').then(({ useGameStore: gs }) => {
                        gs.getState().addGems(gemReward);
                    });
                    import('../../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({
                            type: 'success',
                            message: `💎 Boss Floor ${enemyDef.floor} Cleared! +${gemReward} Gem${gemReward > 1 ? 's' : ''}!`,
                            duration: 5000,
                        });
                    }).catch(() => { });
                }
            }
        }
        setView('map');
        resetBattle();
    };

    // Handle Defeat
    const handleDefeat = () => {
        setView('map');
        resetBattle();
    };

    // --- RENDER HELPERS ---

    // --- CAMPAIGN MAP ---
    if (view === 'map') {
        // Build sorted list of all enemies by floor
        const allEnemies = Object.values(ENEMY_DB)
            .filter(e => e.floor > 0) // Exclude special encounters (Golden Slime etc.)
            .sort((a, b) => a.floor - b.floor);
        const maxDisplayFloor = Math.min(50, highestFloorCleared + 5);

        const rarityColors: Record<string, string> = {
            common: '#9ca3af',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b',
        };

        const floors = allEnemies
            .filter(e => e.floor <= maxDisplayFloor)
            .map((enemyDef) => {
                const i = enemyDef.floor;
                const isUnlocked = i <= highestFloorCleared + 1;
                const isCleared = i <= highestFloorCleared;
                const isBoss = enemyDef.floor % 10 === 0;
                const isActive = isUnlocked && !isCleared;

                return (
                    <div
                        key={enemyDef.id}
                        className={`floor-node ${isUnlocked ? 'unlocked' : ''} ${isCleared ? 'cleared' : ''} ${isBoss ? 'boss' : ''} ${isActive ? 'active' : ''}`}
                    >
                        {/* Floor Number Badge */}
                        <div className="floor-number" style={isBoss ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', fontSize: '0.85rem' } : {}}>
                            {i}F
                        </div>

                        {/* Enemy Info Block */}
                        <div className="floor-content">
                            <div className="floor-enemy-header">
                                <span className="floor-enemy-name">
                                    {enemyDef.icon} {enemyDef.name}
                                </span>
                                <span className="floor-rarity" style={{ color: rarityColors[enemyDef.rarity] }}>
                                    {enemyDef.rarity.toUpperCase()}
                                </span>
                            </div>

                            {/* Stats Row */}
                            <div className="floor-stats">
                                <span title="HP">❤️ {enemyDef.baseHp}</span>
                                <span title="ATK">⚔️ {enemyDef.baseAtk}</span>
                                <span title="DEF">🛡️ {enemyDef.baseDef}</span>
                                <span title="SPD">💨 {enemyDef.baseSpd}</span>
                                <span title="Element">{ELEMENT_ICONS[enemyDef.element]}</span>
                            </div>

                            {/* Requirements Row */}
                            <div className="floor-reqs">
                                <span className="floor-req">⚔️ {enemyDef.requiredAtk} ATK</span>
                                <span className="floor-req">🛡️ {enemyDef.requiredDef} DEF</span>
                                {enemyDef.requiredSkill && (
                                    <span className="floor-req skill-req">
                                        📖 {enemyDef.requiredSkill.skill} Lv.{enemyDef.requiredSkill.level}
                                    </span>
                                )}
                            </div>

                            {/* Rewards Row */}
                            <div className="floor-rewards">
                                <span>🪙 {enemyDef.goldReward}</span>
                                <span>⭐ {enemyDef.xpReward} XP</span>
                            </div>
                        </div>

                        {/* Action */}
                        {isUnlocked && !isCleared && (
                            <button className="start-battle-btn" onClick={() => handleStartBattle(i)}>
                                ⚔️ BATTLE
                            </button>
                        )}
                        {isCleared && <div className="cleared-badge">✅</div>}
                        {!isUnlocked && <div className="locked-badge">🔒</div>}
                    </div>
                );
            });

        return (
            <div className="modal-overlay arena-overlay">
                <div className="arena-modal arena-modal--map">
                    {/* Background Layer */}
                    <div
                        className="arena-map-background"
                        style={{ backgroundImage: `url(${shadowRealmBg})` }}
                    />
                    <div className="arena-map-vignette" />

                    <div className="campaign-map-container">
                        <div className="campaign-header">
                            <h2>⚔️ The Tower of Discipline ⚔️</h2>
                            <p className="campaign-subtitle">Ascend through the floors and conquer your demons</p>
                            <div className="campaign-header-buttons">
                                <button
                                    className="tome-btn"
                                    onClick={() => navigate('/tome')}
                                    title="Tome of Fate - Bestiary"
                                >
                                    <BookOpen size={18} />
                                    Bestiary
                                </button>
                                <button onClick={onClose} className="close-btn">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="floor-path">
                            {floors}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- BATTLE VIEW ---
    // --- BATTLE VIEW ---
    if (view === 'battle') {
        if (phase === 'prep' && enemy && player) {
            const enemyDef = ENEMY_DB[enemy.id];
            const winChance = calculateWinChance(player, enemy);
            const winColor = getWinChanceColor(winChance);
            const { activePet: activePetId } = usePetStore.getState();
            const activePet = activePetId ? PET_DATABASE[activePetId] : null;

            // Get owned spells for display
            const allOwnedSpells = getOwnedSpells();

            return (
                <div className="modal-overlay arena-overlay">
                    <div className="arena-modal arena-modal--prep">
                        <div className="battle-prep-container">
                            <div className="prep-bg-layer" style={{ backgroundImage: `url(${getBackgroundForFloor(currentFloor)})` }} />
                            <div className="prep-bg-overlay" />
                            <div className="prep-header">
                                <h2>⚔️ BATTLE PREPARATION ⚔️</h2>
                                <p>Equip your spells and prepare for combat.</p>
                                <div className="win-chance-text" style={{ color: winColor }}>
                                    WIN CHANCE: {winChance}%
                                </div>
                            </div>

                            <div className="prep-scrollable">
                                <div className="prep-layout">
                                    {/* LEFT: Enemy Card */}
                                    <Panel variant="glass" padding="md" className="prep-enemy-panel">
                                        <div className="prep-panel-header">TARGET INTEL</div>
                                        <div className="profile-header">
                                            <span className="personality-tag">Target: {enemyDef.name}</span>
                                            <div className="prep-portrait">
                                                {ENEMY_IMAGES[enemy.id] ? (
                                                    <img src={ENEMY_IMAGES[enemy.id]} alt={enemyDef.name} className="prep-portrait-img" />
                                                ) : (
                                                    <div className="enemy-icon-large">{enemyDef.icon}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="profile-content">
                                            <div className="stat-grid horizontal">
                                                <div className="stat-pill"><span className="stat-icon">❤️</span> {enemy.maxHp}</div>
                                                <div className="stat-pill"><span className="stat-icon">⚔️</span> {enemy.atk}</div>
                                                <div className="stat-pill"><span className="stat-icon">🛡️</span> {enemy.def}</div>
                                                <div className="stat-pill"><span className="stat-icon">💨</span> {enemy.spd}</div>
                                                <div className="stat-pill"><span className="stat-icon">✨</span> {enemyDef.element}</div>
                                            </div>
                                        </div>
                                    </Panel>

                                    {/* RIGHT: Player Card */}
                                    <Panel variant="glass" padding="md" className="prep-hero-panel">
                                        <div className="prep-panel-header">YOUR LOADOUT</div>
                                        <div className="profile-header">
                                            <div className="prep-portrait">
                                                <img src={heroImage} alt="Player" className="prep-portrait-img" />
                                            </div>
                                        </div>
                                        <div className="profile-content">
                                            <div className="stat-grid horizontal">
                                                <div className="stat-pill"><span className="stat-icon">❤️</span> {player.maxHp}</div>
                                                <div className="stat-pill"><span className="stat-icon">⚔️</span> {player.atk}</div>
                                                <div className="stat-pill"><span className="stat-icon">🛡️</span> {player.def}</div>
                                                <div className="stat-pill"><span className="stat-icon">💨</span> {player.spd}</div>
                                                <div className="stat-pill"><span className="stat-icon">🔮</span> neutral</div>
                                            </div>

                                            {/* Power Details Panel */}
                                            <div className="power-details-toggle">
                                                <button
                                                    className={`power-details-btn ${showPowerDetails ? 'active' : ''}`}
                                                    onClick={() => setShowPowerDetails(!showPowerDetails)}
                                                >
                                                    📊 {showPowerDetails ? 'HIDE DETAILS' : 'POWER BREAKDOWN'}
                                                    {showPowerDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>

                                            {showPowerDetails && (() => {
                                                const breakdown = getDetailedCombatBreakdown();
                                                const renderStat = (label: string, stat: StatBreakdown, unit: string = '') => (
                                                    <div className="breakdown-stat" key={label}>
                                                        <div className="breakdown-stat-header">
                                                            <span className="breakdown-stat-name">{label}</span>
                                                            <span className="breakdown-stat-total">{stat.total}{unit}</span>
                                                        </div>
                                                        <div className="breakdown-sources">
                                                            {stat.sources.map((s, i) => (
                                                                <span key={i} className={`breakdown-source ${s.value < 0 ? 'negative' : ''}`}>
                                                                    {s.label}: {s.value > 0 ? '+' : ''}{s.value}{unit}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                                return (
                                                    <div className="power-details-panel">
                                                        {renderStat('⚔️ ATK', breakdown.atk)}
                                                        {renderStat('🛡️ DEF', breakdown.def)}
                                                        {renderStat('❤️ HP', breakdown.hp)}
                                                        {renderStat('💎 MP', breakdown.mp)}
                                                        {renderStat('💨 SPD', breakdown.spd)}
                                                        {breakdown.synergy.active && (
                                                            <div className="synergy-banner">
                                                                🔗 {breakdown.synergy.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Active Pet */}
                                            <div className="active-pet-section">
                                                <div className="prep-section-label">ACTIVE PET</div>
                                                {activePet ? (
                                                    <div className="pet-prep-card">
                                                        <span className="pet-prep-icon">{activePet.icon}</span>
                                                        <div className="pet-prep-info">
                                                            <span className="pet-prep-name">{activePet.name}</span>
                                                            {activePet.abilities && activePet.abilities[0] && (
                                                                <span className="pet-prep-ability">{activePet.abilities[0].name}: {activePet.abilities[0].description}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="no-buffs">None</div>
                                                )}
                                            </div>

                                            {/* Equipped XP Weapon */}
                                            <div className="active-pet-section">
                                                <div className="prep-section-label">EQUIPPED WEAPON</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                                                    <WeaponEquipWidget size="md" />
                                                    {!useXpWeaponStore.getState().equippedWeaponId && (
                                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                                                            No XP weapon equipped
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Owned Spells */}

                                            {allOwnedSpells.length > 0 && (
                                                <div className="prep-spells-section">
                                                    <div className="prep-section-label">OWNED SPELLS</div>
                                                    <div className="prep-spells-list">
                                                        {allOwnedSpells.map(spell => (
                                                            <div key={spell.id} className="prep-spell-item">
                                                                <span className="prep-spell-icon">{spell.icon}</span>
                                                                <span className="prep-spell-name">{spell.name}</span>
                                                                <span className="prep-spell-cost">{spell.mpCost} MP</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Panel>
                                </div>

                                <div className="prep-buttons">
                                    <GachaButton
                                        onClick={() => setView('map')}
                                        variant="secondary"
                                        size="md"
                                        className="prep-flee"
                                    >
                                        🏃 Run Away
                                    </GachaButton>
                                    <GachaButton
                                        onClick={startBattle}
                                        variant="primary"
                                        size="md"
                                        className="prep-begin"
                                    >
                                        ⚔️ BEGIN BATTLE
                                    </GachaButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="modal-overlay arena-overlay">
                <div className={`arena-modal ${lastDamage?.target === 'player' ? 'shake' : ''}`}>
                    <div className="battle-layout">
                        {/* TOP & BATTLEFIELD (60%) */}
                        <div className="battlefield-container">
                            <ArenaBattlefieldLayout />
                        </div>
                        {/* COMBAT LOG (15%) */}
                        <div className="combat-log-container">
                            <div className="combat-log-panel">
                                {combatLog.slice(-10).map((log, i) => (
                                    <div key={i} className={`log-entry log-${log.type}`}>
                                        {log.type === 'damage' && <span className="log-icon">⚔️</span>}
                                        {log.type === 'heal' && <span className="log-icon">💚</span>}
                                        {log.type === 'buff' && <span className="log-icon">⬆️</span>}
                                        {log.message}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTION BAR (25%) */}
                        <div className="action-bar-container">


                            {player && (
                                <div className="action-buttons">
                                    {/* Auto-Attack Toggle */}
                                    <GachaButton
                                        className={`auto ${autoAttack ? 'active' : ''}`}
                                        onClick={() => setAutoAttack(!autoAttack)}
                                        variant={autoAttack ? "primary" : "secondary"}
                                        size="sm"
                                    >
                                        <div className="btn-icon">⚡</div>
                                        <div className="btn-label">AUTO</div>
                                        <div className="auto-status">{autoAttack ? 'ON' : 'OFF'}</div>
                                    </GachaButton>

                                    {/* 1. Basic Strike */}
                                    <button
                                        className="command-btn attack"
                                        disabled={phase !== 'select_action' || autoAttack}
                                        onClick={() => {
                                            if (phase === 'select_action') {
                                                const strike = player.abilities.find(a => a.id === 'basic_strike');
                                                if (strike) {
                                                    selectAbility(strike);
                                                    setTimeout(executePlayerAction, 100);
                                                }
                                            }
                                        }}
                                    >
                                        <div className="btn-icon"><Swords /></div>
                                        <div className="btn-label">Strike</div>
                                    </button>

                                    {/* 2. Defensive Stance */}
                                    <button
                                        className="command-btn defend"
                                        disabled={phase !== 'select_action' || autoAttack}
                                        onClick={() => {
                                            if (phase === 'select_action') playerDefend();
                                        }}
                                    >
                                        <div className="btn-icon"><Shield /></div>
                                        <div className="btn-label">Defend</div>
                                    </button>

                                    {/* 3. Spells */}
                                    {ownedSpells.length > 0 && (
                                        <div className="spell-button-container">
                                            <button
                                                className={`command-btn spells ${showSpellMenu ? 'active' : ''}`}
                                                disabled={phase !== 'select_action' || autoAttack}
                                                onClick={() => setShowSpellMenu(!showSpellMenu)}
                                            >
                                                <div className="btn-icon"><Sparkles /></div>
                                                <div className="btn-label">Spells</div>
                                                <div className="mp-display">{Math.round(currentMP)}/{Math.round(battleMaxMP)} MP</div>
                                            </button>

                                            {/* Spell Menu */}
                                            <AnimatePresence>
                                                {showSpellMenu && (
                                                    <motion.div
                                                        className="spell-menu"
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <div className="spell-menu-header">
                                                            <span>✨ Spells</span>
                                                            <button className="spell-menu-close" onClick={() => setShowSpellMenu(false)}>
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="spell-menu-list">
                                                            {getOwnedSpells()
                                                                .filter(spell => equippedSpells.includes(spell.id)) // Only show equipped spells
                                                                .map((spell) => {
                                                                    const canCast = currentMP >= spell.mpCost;
                                                                    return (
                                                                        <button
                                                                            key={spell.id}
                                                                            className={`spell-menu-item ${!canCast ? 'insufficient-mp' : ''}`}
                                                                            disabled={!canCast || phase !== 'select_action'}
                                                                            onClick={() => {
                                                                                if (canCast && phase === 'select_action') {
                                                                                    castSpell(spell.id);
                                                                                    setShowSpellMenu(false);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <span className="spell-icon">{spell.icon}</span>
                                                                            <span className="spell-name">{spell.name}</span>
                                                                            <span className="spell-mp-cost">{spell.mpCost} MP</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {/* 4. Ultimate */}
                                    <button
                                        className="command-btn ultimate"
                                        disabled={phase !== 'select_action' || player.energy < 100 || autoAttack}
                                        onClick={() => {
                                            if (phase === 'select_action' && player.energy >= 100) {
                                                const ult = player.abilities.find(a => a.type === 'ultimate');
                                                if (ult) {
                                                    selectAbility(ult);
                                                    setTimeout(executePlayerAction, 100);
                                                }
                                            }
                                        }}
                                    >
                                        <div className="btn-icon"><Zap /></div>
                                        <div className="btn-label">ULTIMATE</div>
                                        <div className="rage-cost">{Math.round(player.energy)}/100 RAGE</div>
                                    </button>

                                    {/* 4. Pet Ability */}
                                    {petAbility && (
                                        <button
                                            className={`command-btn pet-ability ${petAbilityCooldown === 0 ? 'ready' : ''}`}
                                            disabled={phase !== 'select_action' || petAbilityCooldown > 0 || autoAttack}
                                            onClick={() => {
                                                if (phase === 'select_action' && petAbilityCooldown === 0) {
                                                    usePetAbility();
                                                }
                                            }}
                                            title={petAbility.description}
                                        >
                                            <div className="btn-icon">{petAbility.icon}</div>
                                            <div className="btn-label">{petAbility.name}</div>
                                            {petAbilityCooldown > 0 && (
                                                <div className="cooldown-indicator">{petAbilityCooldown} turns</div>
                                            )}
                                            {petAbilityCooldown === 0 && (
                                                <div className="ready-indicator">READY!</div>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Victory/Defeat Overlay */}
                        <AnimatePresence>
                            {phase === 'victory' && (
                                <motion.div className="battle-result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="battle-result-card">
                                        <div className="victory-title">VICTORY</div>
                                        <div className="result-rewards">
                                            <div className="reward-row">
                                                <span>Gold</span>
                                                <span>+{ENEMY_DB[enemy!.id].goldReward}</span>
                                            </div>
                                            <div className="reward-row">
                                                <span>XP</span>
                                                <span>+{ENEMY_DB[enemy!.id].xpReward}</span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const breakdown = getDetailedCombatBreakdown();
                                            return (
                                                <div className="battle-report">
                                                    <div className="report-header">📊 BATTLE REPORT</div>
                                                    <div className="report-section">
                                                        <div className="report-section-title">⚔️ Offense Power ({breakdown.atk.total})</div>
                                                        <div className="report-sources">
                                                            {breakdown.atk.sources.map((s, i) => (
                                                                <span key={i} className="report-source">{s.label}: {s.value > 0 ? '+' : ''}{s.value}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="report-section">
                                                        <div className="report-section-title">🛡️ Defense Power ({breakdown.def.total})</div>
                                                        <div className="report-sources">
                                                            {breakdown.def.sources.map((s, i) => (
                                                                <span key={i} className="report-source">{s.label}: {s.value > 0 ? '+' : ''}{s.value}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <button className="continue-btn" onClick={handleVictory}>CONTINUE</button>
                                    </div>
                                </motion.div>
                            )}
                            {phase === 'defeat' && (
                                <motion.div className="battle-result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="battle-result-card">
                                        <div className="defeat-title">DEFEAT</div>
                                        <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>The tower rejects you.</p>
                                        {(() => {
                                            const breakdown = getDetailedCombatBreakdown();
                                            return (
                                                <div className="battle-report">
                                                    <div className="report-header">📊 BATTLE REPORT</div>
                                                    <div className="report-section">
                                                        <div className="report-section-title">⚔️ Offense Power ({breakdown.atk.total})</div>
                                                        <div className="report-sources">
                                                            {breakdown.atk.sources.map((s, i) => (
                                                                <span key={i} className="report-source">{s.label}: {s.value > 0 ? '+' : ''}{s.value}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="report-section">
                                                        <div className="report-section-title">🛡️ Defense Power ({breakdown.def.total})</div>
                                                        <div className="report-sources">
                                                            {breakdown.def.sources.map((s, i) => (
                                                                <span key={i} className="report-source">{s.label}: {s.value > 0 ? '+' : ''}{s.value}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <button className="continue-btn" style={{ background: '#ef4444' }} onClick={handleDefeat}>RETURN</button>
                                    </div>
                                </motion.div>
                            )}
                            {phase === 'escaped' && (
                                <motion.div className="battle-result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div className="battle-result-card golden-escaped">
                                        <div className="escaped-title">💨 ESCAPED!</div>
                                        <p style={{ marginBottom: '1rem', color: '#fbbf24', fontSize: '1.2rem' }}>✨ The Golden Slime got away!</p>
                                        <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>Better luck next time...</p>
                                        <button className="continue-btn" style={{ background: '#f59e0b' }} onClick={handleDefeat}>RETURN</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
