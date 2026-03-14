import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Swords, ChevronLeft, Sparkles } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useMagicStore } from '../../store/useMagicStore';
import { useGameStore } from '../../store/useGameStore';
import { useHeroImage } from '../../hooks/useHeroImage';
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
    const initialPlayerHpRef = useRef<number | null>(null);

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
            // Calculate HP lost during this battle and apply it to Conquest run HP
            if (battle.player && initialPlayerHpRef.current !== null) {
                const hpLost = Math.max(0, initialPlayerHpRef.current - battle.player.hp);
                if (hpLost > 0) conquest.takeDamage(hpLost);
            }
            setShowVictoryModal(true);
        }
        if (battle.phase === 'defeat' || battle.phase === 'escaped') {
            // Defeat: end the run with today's date locked
            conquest.completeRun(false);
            setShowDefeatModal(true);
        }
    }, [battle.phase]);
    const isBossNode = battle.conquestContext === 'conquest_boss';
    const isVaultNode = battle.conquestContext === 'conquest_vault';

    const player = battle.player;
    const enemy = battle.enemy;

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

    const playerHpPct = Math.max(0, (player.hp / Math.max(1, player.maxHp)) * 100);
    const enemyHpPct = Math.max(0, (enemy.hp / Math.max(1, enemy.maxHp)) * 100);
    const energyPct = player.energy;
    const isPlayerTurn = battle.phase === 'select_action';
    const isExecuting = battle.phase === 'executing' || battle.phase === 'enemy_turn';

    return (
        <div className="cq-battle-container" style={{ backgroundImage: `url(${bgMap})` }}>
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
                    <div className="cq-combatant-name">{enemy.name}</div>
                    <div className="cq-enemy-icon">{enemy.icon}</div>
                    {/* Boss / Vault indicators */}
                    {isBossNode && (
                        <div className="cq-boss-warning">
                            ⚠️ The Pathkeeper — scales with vaults completed ({conquest.treasureVaultsCompleted}×)
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
                    {/* Energy bar */}
                    <div className="cq-energy-bar-wrap">
                        <div className="cq-energy-bar" style={{ width: `${energyPct}%` }} />
                        <span style={{ fontSize: '0.7rem', color: '#fbbf24', position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}>⚡{Math.floor(energyPct)}</span>
                    </div>
                    {/* Run buffs */}
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
            <div className="cq-action-panel" style={{ paddingBottom: '100px' }}>
                {battle.phase === 'prep' ? (
                    <button className="cq-action-btn primary" onClick={() => battle.startBattle()}>
                        ⚔️ Start Battle
                    </button>
                ) : (
                    <>
                        {/* 1. Attack */}
                        <button
                            className="cq-action-btn attack"
                            disabled={!isPlayerTurn || isExecuting}
                            onClick={() => {
                                battle.selectAbility({ id: 'basic_strike', name: 'Strike', type: 'attack', description: '', icon: '⚔️', element: 'neutral', damageMultiplier: 1.0, cooldown: 0, energyCost: 0 });
                                battle.executePlayerAction();
                            }}
                        >
                            <Swords size={18} /> Attack ({Math.round(player.atk * battle.playerDamageModifier)} dmg)
                        </button>

                        {/* 2. Cast Spell */}
                        {(() => {
                            const equippedSpellId = battle.equippedSpells[0];
                            const spell = equippedSpellId ? getOwnedSpells().find(s => s.id === equippedSpellId) : null;
                            const expectedDamage = spell && spell.effect.type === 'damage' 
                                ? Math.round(spell.effect.value * getMagicAttack() * battle.playerDamageModifier)
                                : null;
                            
                            const canCast = spell && battle.currentMP >= spell.mpCost;

                            return (
                                <button
                                    className={`cq-action-btn spells ${!spell ? 'disabled-spell' : ''}`}
                                    disabled={!isPlayerTurn || isExecuting || !spell || !canCast}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: !spell ? '#334155' : 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(126, 34, 206, 0.4) 100%)',
                                        borderColor: !spell ? '#475569' : '#a855f7',
                                        color: !spell ? '#94a3b8' : '#e9d5ff',
                                        opacity: (!isPlayerTurn || isExecuting || !spell || !canCast) ? 0.6 : 1,
                                    }}
                                    onClick={() => {
                                        if (canCast && isPlayerTurn && spell) {
                                            battle.castSpell(spell.id);
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={18} /> 
                                        {!spell 
                                            ? 'No Spell Equipped' 
                                            : `Cast ${spell.name} ${expectedDamage ? `(${expectedDamage} dmg)` : ''}`}
                                    </div>
                                    {spell && (
                                        <div style={{ fontSize: '0.8rem', color: canCast ? '#d8b4fe' : '#ef4444' }}>
                                            {spell.mpCost} MP
                                        </div>
                                    )}
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
                            </div>
                            <button className="continue-btn" onClick={() => {
                                setShowVictoryModal(false);
                                setTimeout(() => {
                                    battle.resetBattle();
                                }, 100);
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
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '0.75rem', marginBottom: '1.5rem' }}>
                                ☠️ Daily run consumed. A new run opens tomorrow.
                            </div>
                            <button className="continue-btn" style={{ background: '#7f1d1d' }} onClick={() => {
                                setTimeout(() => {
                                    battle.resetBattle();
                                }, 100);
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
