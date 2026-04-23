import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, Shield, LogOut, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useMagicStore } from '../../store/useMagicStore';
import { useGameStore } from '../../store/useGameStore';
import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
import { useProfileStore } from '../../store/useProfileStore';
import { CONQUEST_ENEMIES, CONQUEST_ELEMENT_ICONS, type ConquestElement } from '../../data/conquest';
import bgMap from '../../assets/backgrounds/infernal_citadel.png';
import { useInventoryStore } from '../../store/useInventoryStore';
import './Conquest.css';

export const ConquestBattle = () => {
    const navigate = useNavigate();
    const conquest = useConquestStore();
    const battle = useBattleStore();
    const heroImage = usePlayerAvatar();
    const classType = useProfileStore(s => s.classType);
    const getMagicAttack = useGameStore(s => s.getMagicAttack);
    const getOwnedSpells = useMagicStore(s => s.getOwnedSpells);

    const [blessingApplied, setBlessingApplied] = useState(false);
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [showDefeatModal, setShowDefeatModal] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [rollValue, setRollValue] = useState<number | null>(null);
    const [isHeavyRolling, setIsHeavyRolling] = useState(false);
    const [heavyRollValue, setHeavyRollValue] = useState<number | null>(null);
    const initialPlayerHpRef = useRef<number | null>(null);
    const [enemySpecialText, setEnemySpecialText] = useState<string | null>(null);

    const [showInfoPanel, setShowInfoPanel] = useState(false);

    const conquestEnemyDef = conquest.activeConquestEnemyId
        ? CONQUEST_ENEMIES.find(e => e.id === conquest.activeConquestEnemyId) ?? null
        : null;

    useEffect(() => {
        if (!battle.enemy || !battle.player) return;

        const hasBlessing = conquest.runBuffs.some(b => b.label.includes('Shrine Blessing: +15% Power'));
        const hasDefBlessing = conquest.runBuffs.some(b => b.label.includes('Shrine Blessing: +15% Block'));
        if (!blessingApplied && (hasBlessing || hasDefBlessing) && battle.player) {
            if (hasBlessing) {
                useBattleStore.setState(state => {
                    if (!state.player) return state;
                    return { player: { ...state.player, atk: Math.floor(state.player.atk * 1.15) } };
                });
            }
            if (hasDefBlessing) {
                useBattleStore.setState(state => {
                    if (!state.player) return state;
                    return { player: { ...state.player, def: Math.floor(state.player.def * 1.15) } };
                });
            }
            setBlessingApplied(true);
        }

        const totalAtkBonus = conquest.runBuffs
            .filter(b => b.type === 'strength')
            .reduce((sum, b) => sum + b.amount, 0);
        if (totalAtkBonus > 0 && !blessingApplied) {
            useBattleStore.setState(state => {
                if (!state.player) return state;
                return { player: { ...state.player, atk: Math.floor(state.player.atk * (1 + totalAtkBonus / 100)) } };
            });
        }

        const conquestHP = conquest.runHP;
        useBattleStore.setState(state => {
            if (!state.player) return state;
            return {
                player: {
                    ...state.player,
                    hp: conquestHP,
                    maxHp: Math.max(state.player.maxHp, conquestHP),
                }
            };
        });
        initialPlayerHpRef.current = conquestHP;

        if (conquestEnemyDef) {
            useBattleStore.setState(state => {
                if (!state.enemy) return state;
                return {
                    enemy: {
                        ...state.enemy,
                        atk: Math.floor(state.enemy.atk * conquestEnemyDef.atkMod),
                        def: Math.floor(state.enemy.def * conquestEnemyDef.defMod),
                        maxHp: Math.floor(state.enemy.maxHp * conquestEnemyDef.hpMod),
                        hp: Math.floor(state.enemy.hp * conquestEnemyDef.hpMod),
                    }
                };
            });

            if (conquestEnemyDef.special) {
                const specialLabels: Record<string, string> = {
                    attacks_twice: '⚡ Attacks Twice',
                    steals_sigils: '🩸 Steals Sigils',
                    very_high_def: '🛡️ Fortified',
                    drops_balloons: '🎈 Drops Balloons',
                    drops_gem: '💎 Drops Gem',
                    mirrors_atk: '🪞 Mirrors ATK',
                    atk_increases: '📈 ATK Grows',
                };
                setEnemySpecialText(specialLabels[conquestEnemyDef.special] ?? conquestEnemyDef.special);
            }
        }

        if (battle.conquestContext === 'conquest_boss') {
            const mult = conquest.getVaultScaledBossMultiplier();
            if (mult > 1) {
                useBattleStore.setState(state => {
                    if (!state.enemy) return state;
                    return {
                        enemy: {
                            ...state.enemy,
                            atk: Math.floor(state.enemy.atk * mult),
                            maxHp: Math.floor(state.enemy.maxHp * mult),
                            hp: Math.floor(state.enemy.hp * mult),
                        }
                    };
                });
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Guard: auto-redirect if no active battle state
    useEffect(() => {
        if (!battle.player || !battle.enemy) {
            navigate('/conquest', { replace: true });
        }
    }, [battle.player, battle.enemy, navigate]);

    // Watch for battle phase changes
    useEffect(() => {
        if (battle.phase === 'victory') {
            if (battle.player && initialPlayerHpRef.current !== null) {
                const hpLost = Math.max(0, initialPlayerHpRef.current - battle.player.hp);
                if (hpLost > 0) {
                    conquest.takeDamage(hpLost);
                    conquest.trackDamageTaken(hpLost);
                }
            }
            conquest.incrementEnemiesDefeated();

            if (conquestEnemyDef?.special === 'drops_balloons') {
                const balloonDrop = 2 + Math.floor(Math.random() * 3);
                conquest.addBalloons(balloonDrop);
            }
            if (conquestEnemyDef?.special === 'drops_gem') {
                import('../../store/useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().addGems(1);
                }).catch(() => { });
            }

            // Weapon Progression & Economy Logging
            import('../../store/useInventoryStore').then(({ useInventoryStore }) => {
                 const invState = useInventoryStore.getState();
                 import('../../store/useXpWeaponStore').then(({ useXpWeaponStore }) => {
                     const xpWeaponId = useXpWeaponStore.getState().equippedWeaponId;
                     const weaponId = xpWeaponId || invState.equipped.weapon;
                     if (weaponId) {
                          import('../../store/useWeaponProgressionStore').then(({ useWeaponProgressionStore }) => {
                               useWeaponProgressionStore.getState().incrementMetric(weaponId, 'enemiesKilled', 1);
                               
                               if (weaponId === 'golden_ledger') {
                                    import('../../store/useCurrencyStore').then(({ useCurrencyStore }) => useCurrencyStore.getState().addGold(10));
                               } else if (weaponId === 'sovereign_ledger') {
                                    import('../../store/useCurrencyStore').then(({ useCurrencyStore }) => useCurrencyStore.getState().addGold(20));
                                    const kills = useWeaponProgressionStore.getState().getMetric('sovereign_ledger', 'enemiesKilled') || 0;
                                    if (kills > 0 && kills % 5 === 0) {
                                         import('../../store/useCurrencyStore').then(({ useCurrencyStore }) => useCurrencyStore.getState().addGold(100));
                                         import('../../components/ui/Toast').then(({ useToastStore }) => {
                                               useToastStore.getState().addToast({
                                                     type: 'success',
                                                     message: '👑 Sovereign Ledger Payday! +100 Gold!',
                                                     duration: 5000,
                                               });
                                         });
                                    }
                               }
                          });
                     }
                 });
            });

            setShowVictoryModal(true);
        }
        if (battle.phase === 'defeat' || battle.phase === 'escaped') {
            conquest.completeRun(false);
            setShowDefeatModal(true);
        }
    }, [battle.phase]); // eslint-disable-line react-hooks/exhaustive-deps


    const handleFlee = () => {
        const fleeCost = Math.floor(conquest.runMaxHP * 0.15);
        conquest.takeDamage(fleeCost);

        if (conquest.runHP - fleeCost <= 0) {
            conquest.completeRun(false);
            setShowDefeatModal(true);
        } else {
            battle.resetBattle();
            navigate('/conquest');
        }
    };

    const isBossNode = battle.conquestContext === 'conquest_boss';
    const isVaultNode = battle.conquestContext === 'conquest_vault';

    const player = battle.player;
    const enemy = battle.enemy;

    const enemyElement: ConquestElement = conquestEnemyDef?.element ?? 'neutral';
    const elementIcon = CONQUEST_ELEMENT_ICONS[enemyElement];

    if (!player || !enemy) {
        return (
            <div className="conquest-container safe-area-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 20 }}>
                <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: 12, textAlign: 'center', border: '1px solid #334155', maxWidth: 400 }}>
                    <Shield size={48} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Combat Error</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        The combat encounter failed to serialize properly.
                    </p>
                    <button 
                        onClick={() => navigate('/conquest', { replace: true })} 
                        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: 8, fontWeight: 600, width: '100%' }}
                    >
                        Return to Map
                    </button>
                </div>
            </div>
        );
    }

    const battleBg = (enemy as any).image || bgMap;
    const playerHpPct = Math.max(0, (player.hp / Math.max(1, player.maxHp)) * 100);
    const enemyHpPct = Math.max(0, (enemy.hp / Math.max(1, enemy.maxHp)) * 100);
    const energyPct = player.energy;
    const isPlayerTurn = battle.phase === 'select_action';
    const isExecuting = battle.phase === 'executing' || battle.phase === 'enemy_turn';
    const hasFrostHelm = useInventoryStore.getState().equipped.head === 'frostbound_helm';

    return (
        <div className="cq-battle-container">
            <div className="cq-bg-layer" style={{ backgroundImage: `url(${battleBg})` }} />
            <div className="bg-overlay" />

            {/* ── DEV DEBUG BANNER ───────────────────────────────────── */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', fontSize: '0.75rem', padding: '4px 8px', fontFamily: 'monospace', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', pointerEvents: 'none' }}>
                <span>Node: {conquestEnemyDef?.name || enemy.name}</span>
                <span>Type: Combat</span>
                <span>Comp: ConquestBattle.tsx</span>
                <span>ID: {enemy.id}</span>
            </div>

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="cq-battle-header">
                <button className="cq-back-btn" onClick={() => navigate('/conquest')}>
                    <ChevronLeft size={18} /> Map
                </button>
                <div className="cq-battle-title">
                    {isBossNode ? '💀 FINAL BOSS' : `Floor ${battle.conquestTier ?? 1} Battle`}
                </div>
                <div className="cq-run-hp-chip">
                    <Heart size={12} /> Run {Math.floor(conquest.runHP)}/{conquest.runMaxHP}
                </div>
            </div>

            {/* ── Compact Arena: side-by-side combatants ────────────── */}
            <div className="cq-arena-compact">
                {/* Enemy side */}
                <div className="cq-side enemy-side">
                    <div className="cq-side-portrait">
                        {(enemy as any).image ? (
                            <img src={(enemy as any).image} alt={enemy.name} className={`cq-portrait-img enemy ${enemy.frozenTurns > 0 ? 'frozen-encasement' : (enemy.chilledTurns > 0 ? 'chilled-aura' : '')}`} />
                        ) : (
                            <span className={`cq-portrait-emoji ${enemy.frozenTurns > 0 ? 'frozen-encasement' : (enemy.chilledTurns > 0 ? 'chilled-aura' : '')}`}>{enemy.icon}</span>
                        )}
                        {enemy.frozenTurns > 0 && (
                            <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '2.5rem', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🧊</div>
                        )}
                        {enemy.chilledTurns > 0 && enemy.frozenTurns <= 0 && (
                            <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '2rem', zIndex: 10, animation: 'floatUpSlow 2s ease-in-out infinite alternate', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>❄️</div>
                        )}
                    </div>
                    <div className="cq-side-name">
                        {elementIcon} {enemy.name}
                        {enemySpecialText && <span className="cq-enemy-special-badge">{enemySpecialText}</span>}
                        {(isBossNode || isVaultNode) && (
                            <span className="cq-boss-tag">{isBossNode ? '💀 BOSS' : '🏛️ VAULT'}</span>
                        )}
                    </div>
                    <div className="cq-hp-bar-wrap">
                        <div className="cq-hp-bar" style={{ width: `${enemyHpPct}%`, background: '#ef4444' }} />
                        <span className="cq-hp-label">{Math.max(0, enemy.hp)}/{enemy.maxHp}</span>
                    </div>
                </div>

                {/* VS divider */}
                <div className="cq-vs-divider">VS</div>

                {/* Player side */}
                <div className="cq-side player-side">
                    <div className="cq-side-portrait">
                        <img src={heroImage} alt="Hero" className={`cq-portrait-img player ${player.frozenTurns > 0 ? 'frozen-encasement' : (player.chilledTurns > 0 ? 'chilled-aura' : '')} ${hasFrostHelm ? 'frostbound-aura' : ''}`} />
                        {player.frozenTurns > 0 && (
                            <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', left: '-15px', fontSize: '2.5rem', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🧊</div>
                        )}
                        {player.chilledTurns > 0 && player.frozenTurns <= 0 && (
                            <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', left: '-15px', fontSize: '2rem', zIndex: 10, animation: 'floatUpSlow 2s ease-in-out infinite alternate', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>❄️</div>
                        )}
                        {conquest.runBuffs.length > 0 && (
                            <div className="cq-buff-row">
                                {conquest.runBuffs.slice(0, 3).map(b => (
                                    <span key={b.id} className="cq-buff-chip" title={b.label}>
                                        {b.type === 'strength' ? '⚔️' : b.type === 'defense' ? '🛡️' : b.type === 'curse' ? '☠️' : '✨'}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="cq-side-name" style={{ color: '#a78bfa' }}>Hero</div>
                    <div className="cq-hp-bar-wrap">
                        <div className="cq-hp-bar" style={{
                            width: `${playerHpPct}%`,
                            background: playerHpPct < 25 ? '#ef4444' : playerHpPct < 50 ? '#f59e0b' : '#22c55e'
                        }} />
                        <span className="cq-hp-label">{Math.max(0, player.hp)}/{player.maxHp}</span>
                    </div>
                    {/* Energy bar */}
                    <div className="cq-energy-bar-wrap">
                        <div className="cq-energy-bar" style={{ width: `${energyPct}%` }} />
                        <span className="cq-energy-label">
                            <Zap size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            {Math.floor(energyPct)}/100
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Compact combat log (2 lines max) ─────────────────── */}
            <div className="cq-combat-log-mini">
                {battle.combatLog.slice(-2).reverse().map((entry, i) => (
                    <div key={i} className={`cq-log-entry cq-log-${entry.type}`}>{entry.message}</div>
                ))}
                <div className="cq-info-summary" style={{ justifyContent: 'center', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}>
                    <span className="cq-info-summary-text" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        Class: <strong style={{ color: '#a78bfa' }}>{classType || 'Warrior'}</strong>
                    </span>
                </div>

                <button className="cq-action-btn primary cq-start-btn" onClick={() => battle.startBattle()}>
                    ⚔️ Start Battle
                </button>
            </div>


            {/* ── Action Panel ──────────────────────────────────────── */}
            <div className="cq-action-panel">
                {battle.phase === 'prep' ? (
                    /* ── Prep state: collapsible info + start button ── */
                    <div className="cq-prep-section">
                        <button className="cq-action-btn primary cq-start-btn" onClick={() => battle.startBattle()}>
                            ⚔️ Start Battle
                        </button>
                    </div>
                ) : (
                    /* ── Battle state ── */
                    <>
                        <AnimatePresence>
                            {(isRolling || isHeavyRolling) && (
                                <motion.div
                                    className="cq-dice-overlay"
                                    initial={{ scale: 0.5, opacity: 0, y: 50, rotate: -15 }}
                                    animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                                    exit={{ scale: 1.2, opacity: 0, y: -20 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    style={{
                                        position: 'absolute',
                                        top: '40%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 60,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        background: 'rgba(0,0,0,0.85)',
                                        padding: '1.5rem 2.5rem',
                                        border: isHeavyRolling ? '3px solid #ef4444' : '3px solid #3b82f6',
                                        borderRadius: '24px',
                                        boxShadow: isHeavyRolling ? '0 10px 40px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(59, 130, 246, 0.4)',
                                        backdropFilter: 'blur(10px)',
                                        color: '#fff',
                                        fontSize: '3rem',
                                        fontWeight: 900,
                                        textShadow: '0 4px 10px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    <motion.span 
                                        animate={{ rotate: [0, -10, 10, -10, 10, 0] }} 
                                        transition={{ duration: 0.3, repeat: Infinity }} 
                                        style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', display: 'inline-block' }}
                                    >
                                        🎲
                                    </motion.span>
                                    <span style={{ minWidth: '3ch', textAlign: 'center', color: '#fbbf24' }}>
                                        {isHeavyRolling ? heavyRollValue : rollValue}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 2-column action grid */}
                        <div className="cq-action-grid">
                            {/* Heavy Attack */}
                            <button
                                className="cq-action-btn attack heavy"
                                disabled={!isPlayerTurn || isExecuting || isRolling || isHeavyRolling || battle.heavyAttackCooldown > 0}
                                onClick={() => {
                                    if (battle.heavyAttackCooldown > 0) return;
                                    setIsHeavyRolling(true);
                                    const modifiedAtk = Math.max(1, player.atk * battle.playerDamageModifier);
                                    const lowHit = Math.max(1, Math.ceil(modifiedAtk * 0.5));
                                    const bigHit = Math.max(1, Math.floor(modifiedAtk * 1.5));
                                    let rolls = 0;
                                    const interval = setInterval(() => {
                                        const stepSuccess = Math.random() > 0.5;
                                        setHeavyRollValue(stepSuccess ? bigHit : lowHit);
                                        rolls++;
                                        if (rolls >= 10) {
                                            clearInterval(interval);
                                            const isSuccess = Math.random() > 0.5;
                                            const finalDamage = isSuccess ? bigHit : lowHit;
                                            setHeavyRollValue(finalDamage);
                                            setTimeout(() => {
                                                useBattleStore.setState(state => ({
                                                    combatLog: [...state.combatLog, { message: `🎲 Heavy Roll: ${finalDamage}!`, type: 'info' as const }],
                                                    heavyAttackCooldown: 2
                                                }));
                                                conquest.trackDamageDealt(finalDamage);
                                                battle.selectAbility({
                                                    id: 'heavy_strike', name: 'Heavy Strike', type: 'attack',
                                                    description: '', icon: '💥', element: 'neutral',
                                                    damageMultiplier: 1.0, cooldown: 0, energyCost: 0,
                                                    customDamageConfig: { type: 'heavy', rollValue: finalDamage }
                                                });
                                                battle.executePlayerAction();
                                                setIsHeavyRolling(false);
                                                setHeavyRollValue(null);
                                            }, 800);
                                        }
                                    }, 50);
                                }}
                            >
                                <div className="cq-btn-top">💥 Heavy</div>
                                <div className="cq-btn-mid">
                                    {`${Math.max(1, Math.ceil(Math.max(1, player.atk * battle.playerDamageModifier) * 0.5))}-${Math.max(1, Math.floor(Math.max(1, player.atk * battle.playerDamageModifier) * 1.5))}`}
                                </div>
                                <div className="cq-btn-bot">
                                    {battle.heavyAttackCooldown > 0
                                        ? <span style={{ color: '#ef4444' }}>⚠️ Cooldown</span>
                                        : <span>🎲 50/50</span>
                                    }
                                </div>
                            </button>

                            {/* Light Attack */}
                            <button
                                className="cq-action-btn attack light"
                                disabled={!isPlayerTurn || isExecuting || isRolling || isHeavyRolling}
                                onClick={() => {
                                    setIsRolling(true);
                                    const modifiedAtk = Math.max(1, Math.floor(player.atk * battle.playerDamageModifier));
                                    let rolls = 0;
                                    const interval = setInterval(() => {
                                        setRollValue(Math.floor(Math.random() * modifiedAtk) + 1);
                                        rolls++;
                                        if (rolls >= 10) {
                                            clearInterval(interval);
                                            const finalRoll = Math.floor(Math.random() * modifiedAtk) + 1;
                                            setRollValue(finalRoll);
                                            conquest.trackDamageDealt(finalRoll);
                                            setTimeout(() => {
                                                useBattleStore.setState(state => ({
                                                    combatLog: [...state.combatLog, { message: `🎲 Rolled ${finalRoll}!`, type: 'info' as const }]
                                                }));
                                                battle.selectAbility({
                                                    id: 'light_strike', name: 'Light Strike', type: 'attack',
                                                    description: '', icon: '⚡', element: 'neutral',
                                                    damageMultiplier: 1.0, cooldown: 0, energyCost: 0,
                                                    customDamageConfig: { type: 'light', rollValue: finalRoll }
                                                });
                                                battle.executePlayerAction();
                                                setIsRolling(false);
                                                setRollValue(null);
                                            }, 800);
                                        }
                                    }, 50);
                                }}
                            >
                                <div className="cq-btn-top">⚡ Light</div>
                                <div className="cq-btn-mid">
                                    {`1–${Math.max(1, Math.floor(player.atk * battle.playerDamageModifier))}`}
                                </div>
                                <div className="cq-btn-bot">Always Hits</div>
                            </button>

                            {/* Defend */}
                            <button
                                className="cq-action-btn defend"
                                disabled={!isPlayerTurn || isExecuting}
                                onClick={() => {
                                    if (!isPlayerTurn) return;
                                    useBattleStore.setState(state => {
                                        if (!state.player) return state;
                                        return {
                                            player: { ...state.player, isDefending: true },
                                            combatLog: [...state.combatLog, { message: '🛡️ Hero braces! (50% reduction)', type: 'buff' as const }],
                                        };
                                    });
                                    setTimeout(() => battle.endTurn(), 600);
                                }}
                            >
                                <div className="cq-btn-top"><Shield size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Defend</div>
                                <div className="cq-btn-bot">50% reduction</div>
                            </button>

                            {/* Spell */}
                            {(() => {
                                const equippedSpellId = battle.equippedSpells[0];
                                const spell = equippedSpellId ? getOwnedSpells().find(s => s.id === equippedSpellId) : null;
                                const spellCooldownTurns = battle.spellCooldownTurns;
                                const onCooldown = spellCooldownTurns > 0;
                                const expectedDamage = spell && spell.effect.type === 'damage'
                                    ? (spell.baseDamage !== undefined && spell.tier !== 'old'
                                        ? Math.round(spell.baseDamage * (1 + (useGameStore.getState().skills['Intelligence']?.level ?? 1) * 0.03) * battle.playerDamageModifier)
                                        : Math.round(spell.effect.value * getMagicAttack() * battle.playerDamageModifier))
                                    : null;
                                const hasEnergy = spell?.energyCost ? battle.player?.energy >= spell.energyCost : true;
                                const canCast = spell && battle.currentMP >= spell.mpCost && hasEnergy && !onCooldown;

                                return (
                                    <button
                                        className={`cq-action-btn spells ${!spell ? 'disabled-spell' : ''}`}
                                        disabled={!isPlayerTurn || isExecuting || !spell || !canCast}
                                        style={{ opacity: (!isPlayerTurn || isExecuting || !spell || !canCast) ? 0.6 : 1 }}
                                        onClick={() => { if (canCast && isPlayerTurn && spell) battle.castSpell(spell.id); }}
                                    >
                                        <div className="cq-btn-top">✨ {spell ? spell.name : 'Spell'}</div>
                                        <div className="cq-btn-mid" style={!spell ? { fontSize: '0.78rem' } : {}}>
                                            {!spell ? 'None' : expectedDamage ? `${expectedDamage} Dmg` : 'Cast'}
                                        </div>
                                        <div className="cq-btn-bot">
                                            {spell && onCooldown ? (
                                                <span style={{ color: '#ef4444' }}>⚠️ {spellCooldownTurns}t</span>
                                            ) : spell && !canCast ? (
                                                <span style={{ color: '#ef4444' }}>{spell.mpCost} MP {spell.energyCost ? `+ ${spell.energyCost} NRG` : ''}</span>
                                            ) : spell ? (
                                                <span>{spell.mpCost} MP {spell.energyCost ? `+ ${spell.energyCost} NRG` : ''}</span>
                                            ) : 'Not Equipped'}
                                        </div>
                                    </button>
                                );
                            })()}

                            {/* Flee (not vs boss) */}
                            {!isBossNode && (
                                <button
                                    className="cq-action-btn flee"
                                    disabled={!isPlayerTurn || isExecuting}
                                    onClick={handleFlee}
                                >
                                    <div className="cq-btn-top"><LogOut size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Flee</div>
                                    <div className="cq-btn-bot">Costs 15% HP</div>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {isExecuting && (
                <div className="cq-turn-indicator">
                    {battle.phase === 'enemy_turn' ? `${enemy.name}'s Turn...` : 'Executing...'}
                </div>
            )}

            {/* Victory Modal */}
            <AnimatePresence>
                {showVictoryModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="map-modal" style={{ borderColor: '#22c55e' }}>
                            <h2 style={{ color: '#22c55e' }}>⚔️ Victory!</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                                You defeated <strong style={{ color: '#f1f5f9' }}>{enemy.name}</strong>!
                            </p>
                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                                <Heart size={14} style={{ display: 'inline', marginRight: 4 }} />
                                Run HP: <strong style={{ color: '#22c55e' }}>{Math.floor(conquest.runHP)}</strong>
                                <br />
                                <small style={{ color: '#475569', fontSize: '0.75rem' }}>⚠️ HP persists — visit a Campfire to restore</small>
                                {conquestEnemyDef?.special === 'drops_balloons' && (
                                    <div style={{ color: '#22c55e', marginTop: '0.5rem' }}>🎈 Bonus: Balloons dropped!</div>
                                )}
                                {conquestEnemyDef?.special === 'drops_gem' && (
                                    <div style={{ color: '#22c55e', marginTop: '0.5rem' }}>💎 Bonus: +1 Gem!</div>
                                )}
                            </div>
                            <button className="continue-btn" onClick={() => {
                                setShowVictoryModal(false);
                                battle.resetBattle();
                                navigate('/conquest', { replace: true });
                            }}>
                                Continue Run
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Defeat Modal */}
            <AnimatePresence>
                {showDefeatModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="map-modal" style={{ borderColor: '#ef4444' }}>
                            <h2 style={{ color: '#ef4444' }}>💀 Run Ended</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                                You fell to <strong style={{ color: '#f1f5f9' }}>{enemy.name}</strong> on Floor {conquest.runFloor}.
                            </p>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(100,100,120,0.15)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>
                                <div>⚔️ Enemies Defeated: {conquest.runStats.enemiesDefeated}</div>
                                <div>🗺️ Nodes Visited: {conquest.runStats.nodesVisited}</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '0.75rem', marginBottom: '1.5rem' }}>
                                ☠️ Daily run consumed. A new run opens tomorrow.
                            </div>
                            <button className="continue-btn" style={{ background: '#7f1d1d' }} onClick={() => {
                                setShowDefeatModal(false);
                                battle.resetBattle();
                                navigate('/conquest', { replace: true });
                            }}>
                                Return to Map
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
