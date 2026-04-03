import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, Shield, LogOut } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useMagicStore } from '../../store/useMagicStore';
import { useGameStore } from '../../store/useGameStore';
import { useHeroImage } from '../../hooks/useHeroImage';
import { CONQUEST_ENEMIES, CONQUEST_ELEMENT_ICONS, type ConquestElement } from '../../data/conquest';
import bgMap from '../../assets/backgrounds/infernal_citadel.png';
import './Conquest.css';

export const ConquestBattle = () => {
    const navigate = useNavigate();
    const conquest = useConquestStore();
    const battle = useBattleStore();
    const heroImage = useHeroImage();
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

    // Get active conquest enemy definition
    const conquestEnemyDef = conquest.activeConquestEnemyId
        ? CONQUEST_ENEMIES.find(e => e.id === conquest.activeConquestEnemyId) ?? null
        : null;

    // Persistent HP: override the battle player hp to be the conquest runHP
    useEffect(() => {
        if (!battle.enemy || !battle.player) return;

        // Apply Shrine Blessing if active (one-time)
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

        // Apply run buff ATK bonuses from meta/relics
        const totalAtkBonus = conquest.runBuffs
            .filter(b => b.type === 'strength')
            .reduce((sum, b) => sum + b.amount, 0);
        if (totalAtkBonus > 0 && !blessingApplied) {
            useBattleStore.setState(state => {
                if (!state.player) return state;
                return { player: { ...state.player, atk: Math.floor(state.player.atk * (1 + totalAtkBonus / 100)) } };
            });
        }

        // Override player HP with persistent Conquest runHP
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

        // Apply enemy stat modifiers from conquest enemy def
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

            // Set enemy special text
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

        // Apply vault-scaled boss multiplier to enemy stats
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
    }, []); // Run only on mount

    // Watch for battle phase changes
    useEffect(() => {
        if (battle.phase === 'victory') {
            // Track damage stats
            if (battle.player && initialPlayerHpRef.current !== null) {
                const hpLost = Math.max(0, initialPlayerHpRef.current - battle.player.hp);
                if (hpLost > 0) {
                    conquest.takeDamage(hpLost);
                    conquest.trackDamageTaken(hpLost);
                }
            }
            conquest.incrementEnemiesDefeated();

            // Handle enemy specials on defeat
            if (conquestEnemyDef?.special === 'drops_balloons') {
                const balloonDrop = 2 + Math.floor(Math.random() * 3);
                conquest.addBalloons(balloonDrop);
            }
            if (conquestEnemyDef?.special === 'drops_gem') {
                import('../../store/useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().addGems(1);
                }).catch(() => { });
            }

            setShowVictoryModal(true);
        }
        if (battle.phase === 'defeat' || battle.phase === 'escaped') {
            conquest.completeRun(false);
            setShowDefeatModal(true);
        }
    }, [battle.phase]);

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

    // Element info
    const enemyElement: ConquestElement = conquestEnemyDef?.element ?? 'neutral';
    const elementIcon = CONQUEST_ELEMENT_ICONS[enemyElement];

    if (!player || !enemy) {
        return (
            <div className="cq-battle-container" style={{ backgroundImage: `url(${bgMap})` }}>
                <div className="bg-overlay" />
                <div style={{ position: 'relative', zIndex: 10, padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No active battle. <button onClick={() => navigate('/conquest')} style={{ color: '#a78bfa' }}>Return</button>
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

    return (
        <div className="cq-battle-container">
            <div className="cq-bg-layer" style={{ backgroundImage: `url(${battleBg})` }} />
            <div className="bg-overlay" />

            {/* Header */}
            <div className="cq-battle-header">
                <button className="cq-back-btn" onClick={() => navigate('/conquest')}>
                    <ChevronLeft size={18} /> Map
                </button>
                <div className="cq-battle-title">
                    {isBossNode ? '💀 FINAL BOSS' : `Floor ${battle.conquestTier ?? 1} Battle`}
                </div>
                <div className="cq-run-hp-chip">
                    <Heart size={12} /> Run HP: {Math.floor(conquest.runHP)}/{conquest.runMaxHP}
                </div>
            </div>

            <div className="cq-battle-arena">
                {/* Enemy Section */}
                <div className="cq-combatant enemy-side">
                    <div className="cq-combatant-name">
                        {elementIcon} {enemy.name}
                        {enemySpecialText && (
                            <span className="cq-enemy-special-badge">{enemySpecialText}</span>
                        )}
                    </div>
                    <motion.div
                        className="cq-enemy-large"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {(enemy as any).image ? (
                            <img src={(enemy as any).image} alt={enemy.name} className="cq-enemy-large-img" />
                        ) : (
                            <span className="cq-enemy-emoji">{enemy.icon}</span>
                        )}
                    </motion.div>
                    {isBossNode && (
                        <div className="cq-boss-warning">
                            ⚠️ {enemy.name} — scales with vaults completed ({conquest.treasureVaultsCompleted}×)
                        </div>
                    )}
                    {isVaultNode && (
                        <div className="cq-boss-warning" style={{ color: '#eab308' }}>🏛️ Vault Guardian — High Difficulty!</div>
                    )}
                    <div className="cq-hp-bar-wrap">
                        <div className="cq-hp-bar" style={{ width: `${enemyHpPct}%`, background: '#ef4444' }} />
                        <span className="cq-hp-label">{Math.max(0, enemy.hp)} / {enemy.maxHp}</span>
                    </div>
                </div>

                {/* Player Section */}
                <div className="cq-combatant player-side">
                    <div className="cq-player-avatar">
                        <img src={heroImage} alt="Hero" className="cq-hero-img" />
                    </div>
                    <div className="cq-combatant-name" style={{ color: '#a78bfa' }}>Hero</div>
                    <div className="cq-hp-bar-wrap">
                        <div className="cq-hp-bar" style={{
                            width: `${playerHpPct}%`,
                            background: playerHpPct < 25 ? '#ef4444' : playerHpPct < 50 ? '#f59e0b' : '#22c55e'
                        }} />
                        <span className="cq-hp-label">{Math.max(0, player.hp)} / {player.maxHp}</span>
                    </div>
                    <div className="cq-energy-bar-wrap">
                        <div className="cq-energy-bar" style={{ width: `${energyPct}%` }} />
                        <span style={{ fontSize: '0.7rem', color: '#fbbf24', position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>⚡{Math.floor(energyPct)}</span>
                    </div>
                    {conquest.runBuffs.length > 0 && (
                        <div className="cq-run-buffs">
                            {conquest.runBuffs.slice(0, 4).map(b => (
                                <span key={b.id} className="cq-buff-chip" title={b.label}>
                                    {b.type === 'strength' ? '⚔️' : b.type === 'defense' ? '🛡️' : b.type === 'curse' ? '☠️' : '✨'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Combat Log */}
            <div className="cq-combat-log">
                {battle.combatLog.slice(-4).reverse().map((entry, i) => (
                    <div key={i} className={`cq-log-entry cq-log-${entry.type}`}>
                        {entry.message}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="cq-action-panel">
                {battle.phase === 'prep' ? (
                    <button className="cq-action-btn primary" onClick={() => battle.startBattle()}>
                        ⚔️ Start Battle
                    </button>
                ) : (
                    <>
                        {/* 1. Heavy Attack */}
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
                                const maxRolls = 10;
                                const interval = setInterval(() => {
                                    const stepSuccess = Math.random() > 0.5;
                                    setHeavyRollValue(stepSuccess ? bigHit : lowHit);
                                    rolls++;
                                    if (rolls >= maxRolls) {
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
                                        }, 400);
                                    }
                                }, 50);
                            }}
                        >
                            <div className="cq-btn-top">💥 Heavy</div>
                            <div className="cq-btn-mid" style={isHeavyRolling ? { color: '#fbbf24' } : {}}>
                                {isHeavyRolling && heavyRollValue !== null 
                                    ? `🎲 ${heavyRollValue}` 
                                    : `${Math.max(1, Math.ceil(Math.max(1, player.atk * battle.playerDamageModifier) * 0.5))} or ${Math.max(1, Math.floor(Math.max(1, player.atk * battle.playerDamageModifier) * 1.5))}`}
                            </div>
                            <div className="cq-btn-bot">
                                {battle.heavyAttackCooldown > 0
                                    ? <span style={{ color: '#ef4444' }}>⚠️ Cooldown</span>
                                    : <span>🎲 50/50 Roll</span>
                                }
                            </div>
                        </button>

                        {/* 2. Light Attack */}
                        <button
                            className="cq-action-btn attack light"
                            disabled={!isPlayerTurn || isExecuting || isRolling || isHeavyRolling}
                            onClick={() => {
                                setIsRolling(true);
                                const modifiedAtk = Math.max(1, Math.floor(player.atk * battle.playerDamageModifier));
                                let rolls = 0;
                                const maxRolls = 10;
                                const interval = setInterval(() => {
                                    setRollValue(Math.floor(Math.random() * modifiedAtk) + 1);
                                    rolls++;
                                    if (rolls >= maxRolls) {
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
                                        }, 400);
                                    }
                                }, 50);
                            }}
                        >
                            <div className="cq-btn-top">⚡ Light</div>
                            <div className="cq-btn-mid" style={isRolling ? { color: '#fbbf24' } : {}}>
                                {isRolling && rollValue !== null ? `🎲 ${rollValue}` : `1–${Math.max(1, Math.floor(player.atk * battle.playerDamageModifier))} Dmg`}
                            </div>
                            <div className="cq-btn-bot">Always Hits</div>
                        </button>

                        {/* 3. Defend */}
                        <button
                            className="cq-action-btn defend"
                            disabled={!isPlayerTurn || isExecuting}
                            onClick={() => {
                                if (!isPlayerTurn) return;
                                useBattleStore.setState(state => {
                                    if (!state.player) return state;
                                    return {
                                        player: { ...state.player, isDefending: true },
                                        combatLog: [...state.combatLog, { message: '🛡️ Hero braces for impact! (50% damage reduction)', type: 'buff' as const }],
                                    };
                                });
                                setTimeout(() => battle.endTurn(), 600);
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div><Shield size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Defend</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>50% damage reduction</div>
                            </div>
                        </button>

                        {/* 4. Flee (not available vs boss) */}
                        {!isBossNode && (
                            <button
                                className="cq-action-btn flee"
                                disabled={!isPlayerTurn || isExecuting}
                                onClick={handleFlee}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div><LogOut size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Flee</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Costs 15% max HP</div>
                                </div>
                            </button>
                        )}

                        {/* 5. Cast Spell */}
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
                            const canCast = spell && battle.currentMP >= spell.mpCost && !onCooldown;

                            return (
                                <button
                                    className={`cq-action-btn spells ${!spell ? 'disabled-spell' : ''}`}
                                    disabled={!isPlayerTurn || isExecuting || !spell || !canCast}
                                    style={{
                                        opacity: (!isPlayerTurn || isExecuting || !spell || !canCast) ? 0.6 : 1,
                                    }}
                                    onClick={() => {
                                        if (canCast && isPlayerTurn && spell) {
                                            battle.castSpell(spell.id);
                                        }
                                    }}
                                >
                                    <div className="cq-btn-top">✨ {spell ? spell.name : 'Spell'}</div>
                                    <div className="cq-btn-mid" style={!spell ? { fontSize: '0.85rem' } : {}}>
                                        {!spell
                                            ? 'None'
                                            : expectedDamage ? `${expectedDamage} Dmg` : 'Cast'}
                                    </div>
                                    <div className="cq-btn-bot">
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
                                Run HP Remaining: <strong style={{ color: '#22c55e' }}>{Math.floor(conquest.runHP)}</strong>
                                <br />
                                <small style={{ color: '#475569', fontSize: '0.75rem' }}>⚠️ HP does not restore between battles — visit a Campfire</small>
                                {conquestEnemyDef?.special === 'drops_balloons' && (
                                    <div style={{ color: '#22c55e', marginTop: '0.5rem' }}>🎈 Bonus: Balloons dropped!</div>
                                )}
                                {conquestEnemyDef?.special === 'drops_gem' && (
                                    <div style={{ color: '#22c55e', marginTop: '0.5rem' }}>💎 Bonus: +1 Gem!</div>
                                )}
                            </div>
                            <button className="continue-btn" onClick={() => {
                                setShowVictoryModal(false);
                                setTimeout(() => { battle.resetBattle(); }, 100);
                                navigate('/conquest');
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
                                setTimeout(() => { battle.resetBattle(); }, 100);
                                navigate('/conquest');
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
