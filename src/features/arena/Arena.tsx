import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Swords, Shield, Zap, X, Sparkles, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useEnemyStore, ENEMY_DB, ELEMENT_ICONS } from '../../store/useEnemyStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useMagicStore } from '../../store/useMagicStore';
import { ITEM_DATABASE } from '../../data/items';
import { ArenaBattlefieldLayout } from './ArenaBattlefieldLayout';
import { getDetailedCombatBreakdown, type StatBreakdown } from '../../store/useCombatFormulas';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import './Arena.css';

const USE_BATTLEFIELD_LAYOUT = true;

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
import playerSpriteImg from '../../assets/sprites/player.png';

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

// Tower Expansion: Environmental Debris
const ENVIRONMENT_DEBRIS = [
    { icon: '🪨', top: '15%', left: '10%', size: '1.5rem', rot: '15deg' },
    { icon: '🦴', top: '25%', left: '85%', size: '1.2rem', rot: '-20deg' },
    { icon: '📦', top: '75%', left: '15%', size: '1.8rem', rot: '10deg' },
    { icon: '🏺', top: '65%', left: '80%', size: '1.4rem', rot: '-5deg' },
    { icon: '🕸️', top: '5%', left: '75%', size: '2rem', rot: '0deg' },
    { icon: '⛓️', top: '40%', left: '5%', size: '2.5rem', rot: '45deg' },
];

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
    const { activePet, name: petName } = usePetStore();
    const petItem = ITEM_DATABASE[activePet];

    const {
        phase,
        player,
        enemy,
        turnNumber,
        combatLog,
        lastDamage,
        initBattle,
        executePlayerAction,
        selectAbility,
        playerDefend,
        resetBattle,
        isGoldenSlime,
        goldenSlimeTurnsRemaining,
        petAbilityCooldown,
        usePetAbility,
        castSpell,
        currentMP,
        maxMP: battleMaxMP,
        equippedSpells,
        startBattle,
        bossPhase,
    } = useBattleStore();

    // Get pet ability info
    const petDef = PET_DATABASE[activePet];
    const petAbility = petDef ? { ...petDef.abilities[0], effect: { type: petDef.abilities[0].type, value: petDef.abilities[0].buffValue || petDef.abilities[0].baseDamage || 0, duration: petDef.abilities[0].buffDuration } } : null;

    // Magic/Spells
    const { ownedSpells, getOwnedSpells } = useMagicStore();
    const [showSpellMenu, setShowSpellMenu] = useState(false);

    // Log Collapse State
    const [isLogCollapsed, setIsLogCollapsed] = useState(false);
    const [lastReadLogLength, setLastReadLogLength] = useState(0);

    // Update unread count
    useEffect(() => {
        if (!isLogCollapsed) {
            setLastReadLogLength(combatLog.length);
        }
    }, [combatLog.length, isLogCollapsed]);

    const unreadLogCount = combatLog.length - lastReadLogLength;

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
                addGold(enemyDef.goldReward);
                addGlobalXp(enemyDef.xpReward);

                // Unlock next floor if this was the current floor
                if (currentFloor <= highestFloorCleared + 1) { // Logic check
                    unlockNextFloor();
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

    const renderHealthBar = (current: number, max: number, type: 'player' | 'enemy') => (
        <div className="health-bar-container">
            <div
                className={`health-fill ${type}`}
                style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
            />
            <span className="health-text">{Math.round(current)}/{Math.round(max)}</span>
        </div>
    );

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

                return (
                    <div
                        key={enemyDef.id}
                        className={`floor-node ${isUnlocked ? 'unlocked' : ''} ${isCleared ? 'cleared' : ''} ${isBoss ? 'boss' : ''}`}
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
                                            <div className="stat-grid">
                                                <div className="intel-row">
                                                    <span className="intel-label">HP</span>
                                                    <span className="intel-status">{enemy.maxHp}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">ATK</span>
                                                    <span className="intel-status">{enemy.atk}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">DEF</span>
                                                    <span className="intel-status">{enemy.def}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">SPD</span>
                                                    <span className="intel-status">{enemy.spd}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">Element</span>
                                                    <span className="intel-status">✨ {enemyDef.element}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Panel>

                                    {/* RIGHT: Player Card */}
                                    <Panel variant="glass" padding="md" className="prep-hero-panel">
                                        <div className="prep-panel-header">YOUR LOADOUT</div>
                                        <div className="profile-header">
                                            <span className="personality-tag">Your Loadout</span>
                                            <div className="prep-portrait">
                                                <img src={playerSpriteImg} alt="Player" className="prep-portrait-img" />
                                            </div>
                                        </div>
                                        <div className="profile-content">
                                            <div className="stat-grid">
                                                <div className="intel-row">
                                                    <span className="intel-label">HP</span>
                                                    <span className="intel-status">{player.maxHp}/{player.maxHp}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">ATK</span>
                                                    <span className="intel-status">{player.atk}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">DEF</span>
                                                    <span className="intel-status">{player.def}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">SPD</span>
                                                    <span className="intel-status">{player.spd}</span>
                                                </div>
                                                <div className="intel-row">
                                                    <span className="intel-label">Element</span>
                                                    <span className="intel-status">✨ neutral</span>
                                                </div>
                                            </div>

                                            {/* Power Details Panel */}
                                            <div className="power-details-toggle">
                                                <button
                                                    className={`power-details-btn ${showPowerDetails ? 'active' : ''}`}
                                                    onClick={() => setShowPowerDetails(!showPowerDetails)}
                                                >
                                                    📊 {showPowerDetails ? 'HIDE' : 'SHOW'} POWER BREAKDOWN
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
                                                        {renderStat('✨ MATK', breakdown.matk)}
                                                        {renderStat('❤️ HP', breakdown.hp)}
                                                        {renderStat('💨 SPD', breakdown.spd)}
                                                        {renderStat('🎯 CRIT', breakdown.critChance, '%')}
                                                        {renderStat('💎 MP', breakdown.mp)}
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
                                    >
                                        Run Away
                                    </GachaButton>
                                    <GachaButton
                                        onClick={startBattle}
                                        variant="primary"
                                        size="md"
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
                        {/* Interactive Squad Battlefield Layout */}
                        {USE_BATTLEFIELD_LAYOUT ? (
                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                <ArenaBattlefieldLayout />
                            </div>
                        ) : (
                            <div className={`battle-stage ${currentFloor >= 15 ? 'high-floor' : ''}`}>
                                <div
                                    className="battle-background"
                                    style={{
                                        backgroundImage: `url(${getBackgroundForFloor(currentFloor)})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                />

                                {/* Tower Expansion: Environmental Debris Layer */}
                                <div className="environmental-debris">
                                    {ENVIRONMENT_DEBRIS.map((item, i) => (
                                        <div
                                            key={i}
                                            className="debris-item"
                                            style={{
                                                top: item.top,
                                                left: item.left,
                                                fontSize: item.size,
                                                transform: `rotate(${item.rot})`
                                            }}
                                        >
                                            {item.icon}
                                        </div>
                                    ))}
                                </div>

                                {player && enemy && (
                                    <>
                                        {/* Opening Dialogue Overlay */}
                                        <AnimatePresence>
                                            {turnNumber === 1 && phase !== 'prep' && (
                                                <motion.div
                                                    className="opening-dialogue-overlay"
                                                    initial={{ opacity: 1 }}
                                                    animate={{ opacity: 0 }}
                                                    transition={{ duration: 1, delay: 2 }}
                                                >
                                                    <motion.div
                                                        className="dialogue-box"
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 1.2, opacity: 0 }}
                                                    >
                                                        <div className="dialogue-icon">{enemy.icon}</div>
                                                        <p className="dialogue-text">"{ENEMY_DB[enemy.id].openingLine}"</p>
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* HUD */}
                                        <div className="battle-hud">
                                            {/* Timeline / Turn Indicator */}
                                            <div className="timeline">
                                                {/* Golden Slime Warning */}
                                                {isGoldenSlime && (
                                                    <div className="golden-slime-warning" style={{
                                                        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                                        color: '#000',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        marginBottom: '0.5rem',
                                                        animation: 'pulse 1s infinite'
                                                    }}>
                                                        ⚠️ ESCAPES IN {goldenSlimeTurnsRemaining} TURN{goldenSlimeTurnsRemaining > 1 ? 'S' : ''}!
                                                    </div>
                                                )}
                                                {/* Simple turn text for now */}
                                                <div className="turn-text" style={{ color: 'white', fontWeight: 'bold' }}>
                                                    Turn {turnNumber} • {phase === 'select_action' ? "YOUR TURN" : `${enemy.name}'s TURN`}
                                                </div>
                                            </div>

                                            {/* Player Status */}
                                            <div className="combatant-status player">
                                                <div className="status-name">
                                                    {player.name}
                                                    {player.isBerserk && <span className="berserk-badge">🔥 BERSERK</span>}
                                                </div>
                                                {renderHealthBar(player.hp, player.maxHp, 'player')}
                                                {/* Mana Bar */}
                                                <div className="mana-bar" style={{ marginTop: '0.25rem', height: '6px', background: '#1e3a5f', width: '100%', borderRadius: '3px' }}>
                                                    <div style={{ height: '100%', width: `${(player.mana / player.maxMana) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px' }} />
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#60a5fa', marginTop: '0.1rem' }}>
                                                    {player.mana}/{player.maxMana} MP
                                                </div>
                                                {/* Rage Bar */}
                                                <div className="rage-bar" style={{ marginTop: '0.25rem', height: '4px', background: '#333', width: '100%' }}>
                                                    <div style={{ height: '100%', width: `${player.energy}%`, background: player.energy >= 100 ? '#fbbf24' : '#f59e0b' }} />
                                                </div>
                                            </div>

                                            {/* Enemy Status */}
                                            <div className="combatant-status enemy">
                                                <div className="status-name">{enemy.name}</div>
                                                {renderHealthBar(enemy.hp, enemy.maxHp, 'enemy')}
                                            </div>
                                        </div>

                                        {/* Sprites with Tower Expansion Platforms */}
                                        <div className="battle-stage-platforms">
                                            {/* Player Platform */}
                                            <div className="player-platform">
                                                <div className="platform-ellipse" />
                                                <div className="combatant-sprite player">
                                                    <AnimatePresence>
                                                        {(() => {
                                                            const activeAuraId = useAuraStore.getState().activeAuraId;
                                                            const activeAura = AURAS.find(a => a.id === activeAuraId);
                                                            if (activeAura && activeAura.id !== 'none') {
                                                                return (
                                                                    <motion.div
                                                                        className="battle-aura-effect"
                                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                                        animate={{
                                                                            opacity: [0.3, 0.6, 0.3],
                                                                            scale: [1, 1.3, 1],
                                                                            background: `radial-gradient(circle, ${activeAura.color} 0%, transparent 70%)`
                                                                        }}
                                                                        transition={{ duration: 2, repeat: Infinity }}
                                                                    />
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </AnimatePresence>

                                                    <motion.img
                                                        src={playerSpriteImg}
                                                        alt="Player"
                                                        animate={lastDamage?.target === 'player' ? { x: [0, -10, 10, -10, 0] } : {}}
                                                    />

                                                    {petItem && (
                                                        <div className="battle-pet">
                                                            <span className="pet-icon">{petItem.icon}</span>
                                                            <div className="pet-name-bubble">{petName}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Enemy Platform */}
                                            <div className={`enemy-platform ${bossPhase === 2 ? 'boss-enraged' : ''}`}>
                                                <div className="platform-ellipse" />
                                                <div className="combatant-sprite enemy">
                                                    <motion.div
                                                        className="enemy-sprite-wrap"
                                                        animate={lastDamage?.target === enemy.id ? { x: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
                                                    >
                                                        {ENEMY_IMAGES[enemy.id] ? (
                                                            <img
                                                                src={ENEMY_IMAGES[enemy.id]}
                                                                alt={enemy.name}
                                                                style={bossPhase === 2 ? { filter: 'sepia(1) saturate(5) hue-rotate(-50deg)' } : {}}
                                                            />
                                                        ) : (
                                                            <div className="enemy-icon-fallback">{enemy.icon}</div>
                                                        )}
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Floating Combat Text */}
                                        <AnimatePresence>
                                            {lastDamage && (
                                                <motion.div
                                                    key={turnNumber}
                                                    className={`floating-text damage ${lastDamage.isCrit ? 'crit' : ''}`}
                                                    style={{
                                                        top: '40%',
                                                        left: lastDamage.target === 'player' ? '25%' : '75%'
                                                    }}
                                                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                                    animate={{ y: -100, opacity: 0, scale: 1.5 }}
                                                    transition={{ duration: 0.8 }}
                                                >
                                                    {lastDamage.amount}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>
                        )}

                        {/* COMMAND DECK (Bottom 40%) */}
                        <div className="command-deck">
                            {/* Battle Log Panel */}
                            {/* Battle Log Panel */}
                            <div className={`battle-log ${isLogCollapsed ? 'collapsed' : ''}`}>
                                <div
                                    className="battle-log-header"
                                    onClick={() => setIsLogCollapsed(!isLogCollapsed)}
                                >
                                    <span>Combat Log</span>
                                    <div className="log-controls">
                                        {isLogCollapsed && unreadLogCount > 0 && (
                                            <span className="unread-dot" />
                                        )}
                                        {isLogCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </div>
                                {!isLogCollapsed && (
                                    <div className="battle-log-content">
                                        {combatLog.slice(-15).map((log, i) => (
                                            <div key={i} className={`log-entry log-${log.type}`}>
                                                {log.message}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

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
