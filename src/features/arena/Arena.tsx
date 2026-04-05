import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useBattleStore } from '../../store/useBattleStore';
import { useEnemyStore, ENEMY_DB, ELEMENT_ICONS } from '../../store/useEnemyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useMagicStore } from '../../store/useMagicStore';
import { ArenaBattlefieldLayout } from './ArenaBattlefieldLayout';
import { getDetailedCombatBreakdown, getSkillSynergyBonus, type StatBreakdown } from '../../store/useCombatFormulas';
import { getPassiveBonuses } from '../../store/usePassiveEffects';
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
 * Lightweight battle simulation to estimate win probability.
 * Runs N fast in-memory fights using the same core mechanics as the real battle system.
 * Accounts for: attack rolls, defense mitigation, enemy healing/drain, DOT, cooldowns.
 * Does NOT mutate any Zustand state.
 */
const SIM_COUNT = 150;
const SIM_MAX_TURNS = 80; // Safety cap to avoid infinite loops with high-sustain enemies

type SimCombatant = {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    energy: number;
    cooldowns: Record<string, number>;
    dotTurns: number;
    dotDamage: number;
};

/** Apply mitigation formula matching useBattleStore.applyDamage */
const simMitigate = (rawDmg: number, def: number): number => {
    return Math.max(1, Math.round(rawDmg * (100 / (100 + def)) * (0.95 + Math.random() * 0.1)));
};

/** Run a single simulated battle. Returns true if player wins. */
const runOneSim = (pIn: SimCombatant, eIn: SimCombatant, enemyDef: any): boolean => {
    const p = { ...pIn, cooldowns: {}, dotTurns: 0, dotDamage: 0 };
    const e = { ...eIn, cooldowns: {} as Record<string, number>, dotTurns: 0, dotDamage: 0 };

    // Precompute the enemy's heal-on-attack abilities
    const allAbilities: any[] = [
        { id: 'basic_attack', damageMultiplier: 1.0, cooldown: 0, effects: undefined, energyCost: 0 },
        ...(enemyDef.abilities || []),
    ];

    for (let turn = 0; turn < SIM_MAX_TURNS; turn++) {
        // ── PLAYER TURN (light attack: random roll 1..ATK) ──
        {
            const atkRoll = Math.floor(Math.random() * Math.max(1, p.atk)) + 1;
            const dmg = simMitigate(atkRoll, e.def);
            e.hp -= dmg;
            if (e.hp <= 0) return true;
            // Player gains energy on attack
            p.energy = Math.min(100, p.energy + 20);
        }

        // ── ENEMY TURN ──
        {
            // Tick down enemy cooldowns
            for (const id in e.cooldowns) {
                if (e.cooldowns[id] > 0) e.cooldowns[id]--;
            }

            // Choose ability: skill off-cooldown first, else basic
            let chosen = allAbilities[0];
            // Check ultimate
            const ult = allAbilities.find((a: any) => a.type === 'ultimate' && e.energy >= (a.energyCost || 100));
            if (ult) {
                chosen = ult;
                e.energy = 0;
            } else {
                const availSkill = allAbilities.find(
                    (a: any) => a.type === 'skill' && (!e.cooldowns[a.id] || e.cooldowns[a.id] <= 0)
                );
                if (availSkill) chosen = availSkill;
            }

            // Apply cooldown
            if (chosen.cooldown > 0) e.cooldowns[chosen.id] = chosen.cooldown;
            // Gain energy
            if (chosen.type !== 'ultimate') e.energy = Math.min(100, e.energy + 15);

            // Compute damage
            const rawDmg = e.atk * (chosen.damageMultiplier ?? 1.0);
            const finalDmg = simMitigate(rawDmg, p.def);
            p.hp -= finalDmg;

            // Apply DOT to player
            if (chosen.effects?.dot) {
                p.dotTurns = chosen.effects.dot.turns;
                p.dotDamage = chosen.effects.dot.damage;
            }

            // Enemy heals itself (heal is % of maxHp)
            if (chosen.effects?.heal) {
                const healAmt = Math.round(e.maxHp * chosen.effects.heal / 100);
                e.hp = Math.min(e.maxHp, e.hp + healAmt);
            }

            if (p.hp <= 0) return false;
        }

        // ── DOT tick on player ──
        if (p.dotTurns > 0) {
            p.hp -= p.dotDamage;
            p.dotTurns--;
            if (p.hp <= 0) return false;
        }
    }
    // If we hit the turn cap, treat as draw → loss (sustain enemy survived)
    return false;
};

interface WinEstimate {
    winRate: number;      // 0–100
    label: string;        // 'Dangerous' | 'Unfavorable' | 'Close Fight' | 'Favored' | 'Very Favored'
    sustainWarning: boolean;
}

const estimateWinChance = (player: any, enemy: any, enemyDef: any): WinEstimate => {
    if (!player || !enemy || !enemyDef) return { winRate: 0, label: 'Dangerous', sustainWarning: false };

    const pSim: SimCombatant = {
        hp: player.maxHp, maxHp: player.maxHp,
        atk: player.atk, def: player.def,
        energy: 0, cooldowns: {}, dotTurns: 0, dotDamage: 0,
    };
    const eSim: SimCombatant = {
        hp: enemy.maxHp, maxHp: enemy.maxHp,
        atk: enemy.atk, def: enemy.def,
        energy: 0, cooldowns: {}, dotTurns: 0, dotDamage: 0,
    };

    let wins = 0;
    for (let i = 0; i < SIM_COUNT; i++) {
        if (runOneSim(pSim, eSim, enemyDef)) wins++;
    }

    const winRate = Math.round((wins / SIM_COUNT) * 100);

    let label: string;
    if (winRate < 20) label = 'Dangerous';
    else if (winRate < 40) label = 'Unfavorable';
    else if (winRate < 60) label = 'Close Fight';
    else if (winRate < 80) label = 'Favored';
    else label = 'Very Favored';

    // Detect sustain enemies (any ability with heal)
    const sustainWarning = (enemyDef.abilities || []).some((a: any) => a.effects?.heal);

    return { winRate, label, sustainWarning };
};

const getWinChanceColor = (winRate: number): string => {
    if (winRate < 20) return '#ef4444'; // Red
    if (winRate < 40) return '#f97316'; // Orange
    if (winRate < 60) return '#fbbf24'; // Yellow
    return '#22c55e'; // Green
};


export const Arena = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const heroImage = useHeroImage();
    const { getMagicAttack } = useGameStore();
    const { addGold } = useCurrencyStore();
    const { markDefeated } = useEnemyStore();
    const {
        currentFloor,
        highestFloorCleared,
        currentStreak,
        clearedEnemyIds,
        markEnemyCleared,
        unlockNextFloor,
        checkForGoldenSlime,
        recordGoldenSlimeEncounter,
        incrementStreak,
        resetStreak,
    } = useCampaignStore();

    // Pet companion (for ArenaBattlefieldLayout only)

    const {
        phase,
        player,
        enemy,
        combatLog,
        lastDamage,
        initBattle,
        executePlayerAction,
        selectAbility,
        castSpell,
        currentMP,
        resetBattle,
        startBattle,
    } = useBattleStore();

    const { getOwnedSpells, equippedSpell, equipSpell } = useMagicStore();

    const [view, setView] = useState<'map' | 'battle'>(location.state?.startBattle ? 'battle' : 'map');
    const [autoAttack, setAutoAttack] = useState(false);
    const [showPowerDetails, setShowPowerDetails] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [rollValue, setRollValue] = useState<number | null>(null);

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

    // Handle starting a battle by enemy ID (sequential progression)
    const handleStartBattle = (enemyId: string, floorNum: number) => {
        // Check for Golden Slime rare encounter (1% chance)
        const goldenSlimeSpawn = checkForGoldenSlime(floorNum);

        if (goldenSlimeSpawn) {
            recordGoldenSlimeEncounter(floorNum);
            resetBattle();
            initBattle('golden_slime');
            setView('battle');
            setAutoAttack(false);
            return;
        }

        resetBattle();
        initBattle(enemyId);
        setView('battle');
        setAutoAttack(false);
    };

    // Handle Victory
    const handleVictory = () => {
        const battleState = useBattleStore.getState();
        const isConquest = battleState.context === 'conquest';
        const passives = getPassiveBonuses();

        if (enemy) {
            const enemyDef = ENEMY_DB[enemy.id];
            if (enemyDef) {
                markDefeated(enemy.id);
                const scaling = enemy.scalingFactor || 1.0;

                if (isConquest) {
                    // Conquest specific rewards
                    const sigils = Math.floor(Math.random() * 3) + passives.sigil_bonus; // 0-2
                    if (sigils > 0) {
                        import('../../store/useConquestStore').then(({ useConquestStore: cs }) => {
                            cs.getState().addSigils(sigils);
                        });
                        import('../../components/ui/Toast').then(({ useToastStore }) => {
                            useToastStore.getState().addToast({
                                type: 'success',
                                message: `Conquest Victory! Found ${sigils} Sigil${sigils > 1 ? 's' : ''}!`,
                                duration: 5000,
                            });
                        }).catch(() => { });
                    }
                    if (player) {
                        import('../../store/useConquestStore').then(({ useConquestStore: cs }) => {
                            const maxStateHp = player.maxHp;
                            const currentHp = player.hp;
                            const damageTaken = maxStateHp - currentHp;
                            cs.getState().takeDamage(damageTaken);
                        }).catch(() => {});
                    }
                } else {
                    // Arena Rewards with Streak Multiplier
                    incrementStreak();
                    const streakCount = useCampaignStore.getState().currentStreak;
                    const streakMultiplier = 1.0 + (Math.min(streakCount, 10) * 0.05);

                    const totalGold = Math.floor((Math.round(enemyDef.goldReward * scaling) + passives.gold_bonus) * streakMultiplier);
                    const totalXp = Math.floor(Math.round(enemyDef.xpReward * scaling) * streakMultiplier);

                    addGold(totalGold);
                    useGameStore.getState().addGlobalXp(totalXp);

                    // Mark this specific enemy as cleared (sequential progression)
                    markEnemyCleared(enemy.id);

                    // Also advance the floor counter for backward-compat
                    if (currentFloor <= highestFloorCleared + 1) {
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

                    // Arena victory sigil (0-1) - reduced base chance
                    const sigilRoll = Math.random();
                    const sigils = (sigilRoll < 0.25 ? 1 : 0) + passives.sigil_bonus;
                    if (sigils > 0) {
                        import('../../store/useConquestStore').then(({ useConquestStore: cs }) => {
                            cs.getState().addSigils(sigils);
                        });
                    }

                    // Native Equipment drop chance (20%)
                    if (Math.random() < 0.20) {
                        import('../../store/useEquipmentStore').then(({ useEquipmentStore: es }) => {
                            const result = es.getState().pullEquipment();
                            if (result) {
                                import('../../components/ui/Toast').then(({ useToastStore }) => {
                                    useToastStore.getState().addToast({
                                        type: 'success',
                                        message: `Loot: ${result.item.name}! ${result.wasDuplicate ? `(Converted to ${result.essenceGained} essence)` : ''}`,
                                        duration: 5000,
                                    });
                                }).catch(() => { });
                            }
                        }).catch(() => { });
                    }
                }
            }
        }

        if (isConquest) {
            setTimeout(() => {
                resetBattle();
            }, 100);
            navigate('/conquest');
        } else {
            setTimeout(() => {
                resetBattle();
            }, 100);
            setView('map');
        }
    };

    // Handle Defeat
    const handleDefeat = () => {
        const isConquest = useBattleStore.getState().context === 'conquest' || useBattleStore.getState().context === 'conquest_elite';
        if (isConquest) {
            import('../../store/useConquestStore').then(({ useConquestStore: cs }) => {
                const storeState = cs.getState();
                storeState.takeDamage(storeState.runMaxHP); // Kill the run
            }).catch(() => {});
            navigate('/conquest');
        } else {
            resetStreak(); // Break streak on defeat
            setView('map');
        }
        resetBattle();
    };

    // --- RENDER HELPERS ---

    // --- CAMPAIGN MAP ---
    if (view === 'map') {
        // Build sorted list of all enemies by floor (then by ENEMY_DB insertion order for ties)
        const allEnemies = Object.values(ENEMY_DB)
            .filter(e => e.floor > 0)
            .sort((a, b) => a.floor - b.floor);

        // Assign a strict sequential display index (1F, 2F, 3F...) regardless of duplicate floor values
        // First uncleared enemy in the sequence is the ACTIVE one; everything after is LOCKED.
        const firstUnclearedIdx = allEnemies.findIndex(e => !clearedEnemyIds.includes(e.id));

        const maxDisplayIdx = firstUnclearedIdx === -1
            ? allEnemies.length   // all cleared — show everything
            : Math.min(allEnemies.length, firstUnclearedIdx + 6); // show a few ahead

        const rarityColors: Record<string, string> = {
            common: '#9ca3af',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b',
        };

        const floors = allEnemies
            .slice(0, maxDisplayIdx)
            .map((enemyDef, idx) => {
                const displayFloor = idx + 1;  // 1-based sequential floor number
                const isCleared = clearedEnemyIds.includes(enemyDef.id);
                const isActive = idx === firstUnclearedIdx;
                const isLocked = !isCleared && !isActive;
                const isBoss = enemyDef.isBoss || (enemyDef.floor % 10 === 0 && enemyDef.rarity === 'legendary');

                return (
                    <div
                        key={enemyDef.id}
                        className={`floor-node ${!isLocked ? 'unlocked' : ''} ${isCleared ? 'cleared' : ''} ${isBoss ? 'boss' : ''} ${isActive ? 'active' : ''}`}
                    >
                        {/* Floor Number Badge */}
                        <div className="floor-number" style={isBoss ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', fontSize: '0.85rem' } : {}}>
                            {displayFloor}F
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

                            {/* Stats Row — hide for locked floors */}
                            {!isLocked && (
                                <div className="floor-stats">
                                    <span title="HP">❤️ {enemyDef.baseHp}</span>
                                    <span title="ATK">⚔️ {enemyDef.baseAtk}</span>
                                    <span title="DEF">🛡️ {enemyDef.baseDef}</span>
                                    <span title="SPD">💨 {enemyDef.baseSpd}</span>
                                    <span title="Element">{ELEMENT_ICONS[enemyDef.element]}</span>
                                </div>
                            )}

                            {/* Requirements Row */}
                            {!isLocked && (
                                <div className="floor-reqs">
                                    <span className="floor-req">⚔️ {enemyDef.requiredAtk} ATK</span>
                                    <span className="floor-req">🛡️ {enemyDef.requiredDef} DEF</span>
                                    {enemyDef.requiredSkill && (
                                        <span className="floor-req skill-req">
                                            📖 {enemyDef.requiredSkill.skill} Lv.{enemyDef.requiredSkill.level}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Rewards Row */}
                            {!isLocked && (
                                <div className="floor-rewards">
                                    <span>🪙 {enemyDef.goldReward}</span>
                                    <span>⭐ {enemyDef.xpReward} XP</span>
                                </div>
                            )}
                        </div>

                        {/* Action */}
                        {isActive && (
                            <button className="start-battle-btn" onClick={() => handleStartBattle(enemyDef.id, enemyDef.floor)}>
                                ⚔️ BATTLE
                            </button>
                        )}
                        {isCleared && (
                            <div className="cleared-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <span>✅ CLEARED</span>
                                <button
                                    className="start-battle-btn"
                                    style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', opacity: 0.7 }}
                                    onClick={() => handleStartBattle(enemyDef.id, enemyDef.floor)}
                                >
                                    🔁 REPLAY
                                </button>
                            </div>
                        )}
                        {isLocked && <div className="locked-badge">🔒 LOCKED</div>}
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
                            {currentStreak > 0 && (
                                <div className="streak-indicator" style={{ color: '#f59e0b', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    🔥 Win Streak: {currentStreak} (+{Math.min(currentStreak * 5, 50)}% Rewards)
                                </div>
                            )}
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
            const estimate = estimateWinChance(player, enemy, enemyDef);
            const winColor = getWinChanceColor(estimate.winRate);
            const { equippedPetId: activePetId } = usePetStore.getState();
            const equippedPet = activePetId ? PET_DATABASE[activePetId] : null;



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
                                    {estimate.label.toUpperCase()} — ~{estimate.winRate}% WIN CHANCE
                                </div>
                                {estimate.sustainWarning && (
                                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.25rem', opacity: 0.85 }}>
                                        ⚠️ Enemy has healing/sustain — longer fights are riskier.
                                    </div>
                                )}
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
                                            {useBattleStore.getState().context === 'conquest' && (
                                                <div className="synergy-banner" style={{ marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.2)' }}>
                                                    [DEBUG] Conquest Enemy Power: {useBattleStore.getState().conquestEnemyPower}
                                                </div>
                                            )}
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
                                                    📊 {showPowerDetails ? 'HIDE BREAKDOWN' : 'VIEW POWER BREAKDOWN'}
                                                    {showPowerDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>

                                            {showPowerDetails && (() => {
                                                const breakdown = getDetailedCombatBreakdown();
                                                const synergy = getSkillSynergyBonus();
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
                                                        {synergy.active && (
                                                            <div className="synergy-banner">
                                                                🔗 {synergy.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Active Pet */}
                                            <div className="active-pet-section">
                                                <div className="prep-section-label">ACTIVE PET</div>
                                                {equippedPet ? (
                                                    <div className="pet-prep-card">
                                                        <span className="pet-prep-icon">{equippedPet.icon}</span>
                                                        <div className="pet-prep-info">
                                                            <span className="pet-prep-name">{equippedPet.name}</span>
                                                            
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

                                            {/* Spell Equip — Dropdown to pick equipped spell */}
                                            <div className="active-pet-section">
                                                <div className="prep-section-label">EQUIPPED SPELL</div>
                                                {(() => {
                                                    const ownedSpells = getOwnedSpells();
                                                    if (ownedSpells.length === 0) {
                                                        return <div className="no-buffs">No spells owned — visit the Arcane Emporium</div>;
                                                    }
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <select
                                                                value={equippedSpell ?? ''}
                                                                onChange={e => equipSpell(e.target.value || null)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.4rem 0.6rem',
                                                                    background: 'rgba(30,20,60,0.8)',
                                                                    border: '1px solid rgba(139,92,246,0.4)',
                                                                    borderRadius: '8px',
                                                                    color: '#e9d5ff',
                                                                    fontSize: '0.875rem',
                                                                }}
                                                            >
                                                                <option value="">— No Spell Equipped —</option>
                                                                {ownedSpells.map(s => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.icon} {s.name} ({s.mpCost} MP{(s.cooldownTurns ?? 0) > 0 ? `, CD: ${s.cooldownTurns}t` : ''})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {equippedSpell && (() => {
                                                                const sp = ownedSpells.find(s => s.id === equippedSpell);
                                                                if (!sp) return null;
                                                                return (
                                                                    <div style={{ fontSize: '0.75rem', color: '#a78bfa', padding: '0.4rem' }}>
                                                                        {sp.icon} {sp.name} — {sp.mpCost} MP
                                                                        {sp.baseDamage !== undefined && sp.tier !== 'old' ? ` · ${sp.baseDamage} base dmg` : ''}
                                                                        {(sp.cooldownTurns ?? 0) > 0 ? ` · Cooldown: ${sp.cooldownTurns}t` : ''}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
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

                                    {/* 1. Heavy Attack */}
                                    <button
                                        className="command-btn attack heavy"
                                        disabled={phase !== 'select_action' || autoAttack || isRolling || useBattleStore.getState().heavyAttackCooldown > 0}
                                        onClick={() => {
                                            if (phase === 'select_action' && useBattleStore.getState().heavyAttackCooldown === 0) {
                                                const modifiedAtk = Math.max(1, player.atk * useBattleStore.getState().playerDamageModifier);
                                                const lowHit = Math.max(1, Math.ceil(modifiedAtk * 0.5));
                                                const bigHit = Math.max(1, Math.floor(modifiedAtk * 1.5));
                                                
                                                const isSuccess = Math.random() > 0.5;
                                                const finalDamage = isSuccess ? bigHit : lowHit;
                                                
                                                // Buffer cooldown to 2 so it correctly blocks exactly 1 full player turn after this one finishes
                                                useBattleStore.setState({ heavyAttackCooldown: 2 });
                                                selectAbility({ 
                                                    id: 'heavy_strike', 
                                                    name: 'Heavy Strike', 
                                                    type: 'attack', 
                                                    description: '', 
                                                    icon: '💥', 
                                                    element: 'neutral', 
                                                    damageMultiplier: 1.0, 
                                                    cooldown: 0, 
                                                    energyCost: 0,
                                                    customDamageConfig: { type: 'heavy', rollValue: finalDamage }
                                                });
                                                setTimeout(executePlayerAction, 100);
                                            }
                                        }}
                                    >
                                        <div className="btn-top">💥 Heavy</div>
                                        <div className="btn-mid">Hi-Dmg</div>
                                        <div className="btn-bot">
                                            {useBattleStore.getState().heavyAttackCooldown > 0
                                                ? <span style={{ color: '#ef4444' }}>⚠️ Cooldown</span>
                                                : <span>⚠️ 50% Hit</span>
                                            }
                                        </div>
                                    </button>

                                    <button
                                        className="command-btn attack light"
                                        disabled={phase !== 'select_action' || autoAttack || isRolling}
                                        onClick={() => {
                                            if (phase === 'select_action') {
                                                setIsRolling(true);
                                                const modifiedAtk = Math.max(1, Math.floor(player.atk * useBattleStore.getState().playerDamageModifier));
                                                
                                                let rolls = 0;
                                                const maxRolls = 10;
                                                const interval = setInterval(() => {
                                                    setRollValue(Math.floor(Math.random() * modifiedAtk) + 1);
                                                    rolls++;
                                                    if (rolls >= maxRolls) {
                                                        clearInterval(interval);
                                                        const finalRoll = Math.floor(Math.random() * modifiedAtk) + 1;
                                                        setRollValue(finalRoll);
                                                        setTimeout(() => {
                                                            selectAbility({ 
                                                                id: 'light_strike', 
                                                                name: 'Light Strike', 
                                                                type: 'attack', 
                                                                description: '', 
                                                                icon: '⚡', 
                                                                element: 'neutral', 
                                                                damageMultiplier: 1.0, 
                                                                cooldown: 0, 
                                                                energyCost: 0,
                                                                customDamageConfig: { type: 'light', rollValue: finalRoll }
                                                            });
                                                            executePlayerAction();
                                                            setIsRolling(false);
                                                            setRollValue(null);
                                                        }, 400);
                                                    }
                                                }, 50);
                                            }
                                        }}
                                    >
                                        <div className="btn-top">⚡ Light</div>
                                        <div className="btn-mid" style={isRolling ? { color: '#fbbf24' } : {}}>
                                            {isRolling && rollValue !== null ? `🎲 ${rollValue}` : `1–${Math.max(1, Math.floor(player.atk * useBattleStore.getState().playerDamageModifier))}`}
                                        </div>
                                        <div className="btn-bot">Always Hits</div>
                                    </button>

                                    {/* 2. Cast Spell */}
                                    {(() => {
                                        const equippedSpellId = useBattleStore.getState().equippedSpells[0];
                                        const spell = equippedSpellId ? getOwnedSpells().find(s => s.id === equippedSpellId) : null;
                                        const spellCooldownTurns = useBattleStore.getState().spellCooldownTurns;
                                        const expectedDamage = spell && spell.effect.type === 'damage' 
                                            ? (spell.baseDamage !== undefined && spell.tier !== 'old'
                                                ? Math.round(spell.baseDamage * (1 + (useGameStore.getState().skills['Intelligence']?.level ?? 1) * 0.03) * useBattleStore.getState().playerDamageModifier)
                                                : Math.round(spell.effect.value * getMagicAttack() * useBattleStore.getState().playerDamageModifier))
                                            : null;
                                        
                                        const onCooldown = spellCooldownTurns > 0;
                                        const canCast = spell && currentMP >= spell.mpCost && !onCooldown;

                                        return (
                                            <button
                                                className={`command-btn spells ${!spell ? 'disabled-spell' : ''}`}
                                                disabled={phase !== 'select_action' || autoAttack || !spell || !canCast}
                                                onClick={() => {
                                                    if (canCast && phase === 'select_action' && spell) {
                                                        castSpell(spell.id);
                                                    }
                                                }}
                                            >
                                                <div className="btn-top">✨ {spell ? spell.name : 'Spell'}</div>
                                                <div className="btn-mid" style={!spell ? { fontSize: '0.85rem' } : {}}>
                                                    {!spell
                                                        ? 'None'
                                                        : expectedDamage ? `${expectedDamage} Dmg` : 'Cast'}
                                                </div>
                                                <div className="btn-bot">
                                                    {spell && onCooldown ? (
                                                        <span style={{ color: '#ef4444' }}>⚠️ {spellCooldownTurns}t CD</span>
                                                    ) : spell && !canCast ? (
                                                        <span style={{ color: '#ef4444' }}>{spell.mpCost} MP</span>
                                                    ) : spell ? (
                                                        <span>{spell.mpCost} MP</span>
                                                    ) : (
                                                        'Not Equipped'
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })()}
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
                                                <span>
                                                    +{Math.floor((ENEMY_DB[enemy!.id].goldReward + getPassiveBonuses().gold_bonus) * (1.0 + Math.min(useCampaignStore.getState().currentStreak, 10) * 0.05))}
                                                </span>
                                            </div>
                                            <div className="reward-row">
                                                <span>XP</span>
                                                <span>
                                                    +{Math.floor(ENEMY_DB[enemy!.id].xpReward * (1.0 + Math.min(useCampaignStore.getState().currentStreak, 10) * 0.05))}
                                                </span>
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
