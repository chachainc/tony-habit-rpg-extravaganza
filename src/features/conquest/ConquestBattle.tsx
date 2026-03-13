import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Swords, Shield, Zap, ChevronLeft } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useGameStore } from '../../store/useGameStore';
import { usePetStore } from '../../store/usePetStore';
import { useHeroImage } from '../../hooks/useHeroImage';
import bgMap from '../../assets/backgrounds/infernal_citadel.png';
import './Conquest.css';

export const ConquestBattle = () => {
    const navigate = useNavigate();
    const battle = useBattleStore();
    const conquest = useConquestStore();
    const game = useGameStore();
    const petStore = usePetStore();
    const heroImage = useHeroImage();

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

        // Scale Enemy based on player level + conquest tier
        const playerLevel = game.getGlobalLevel() || 1;
        const conquestTier = conquest.runFloor || 1;

        // Steeper tier curve: early = 0.8x, mid = 1.0x, elite = 1.3x, boss = 2.0x
        const tierMultipliers: Record<number, number> = { 1: 0.8, 2: 1.0, 3: 1.0, 4: 1.3, 5: 2.0 };
        const tierMult = tierMultipliers[conquestTier] ?? 1.0;
        const scaleFactor = (1 + (playerLevel * 0.08)) * tierMult;

        useBattleStore.setState(state => {
            if (!state.enemy) return state;
            return {
                enemy: {
                    ...state.enemy,
                    maxHp: Math.floor(state.enemy.maxHp * scaleFactor),
                    hp: Math.floor(state.enemy.maxHp * scaleFactor),
                    atk: Math.floor(state.enemy.atk * scaleFactor),
                    def: Math.floor(state.enemy.def * scaleFactor),
                }
            };
        });
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

    const isBossNode = battle.conquestTier === 5;
    const petDef = petStore.getActivePetDef();
    const petCooldown = battle.petAbilityCooldown;

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
                    {isBossNode && (
                        <div className="cq-boss-warning">⚠️ Hardest Fight — Use Everything</div>
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
            <div className="cq-action-panel">
                {battle.phase === 'prep' ? (
                    <button className="cq-action-btn primary" onClick={() => battle.startBattle()}>
                        ⚔️ Start Battle
                    </button>
                ) : (
                    <>
                        <button
                            className="cq-action-btn attack"
                            disabled={!isPlayerTurn || isExecuting}
                            onClick={() => {
                                battle.selectAbility({ id: 'basic_strike', name: 'Strike', type: 'attack', description: '', icon: '⚔️', element: 'neutral', damageMultiplier: 1.0, cooldown: 0, energyCost: 0 });
                                battle.executePlayerAction();
                            }}
                        >
                            <Swords size={18} /> Strike
                        </button>

                        <button
                            className="cq-action-btn defend"
                            disabled={!isPlayerTurn || isExecuting}
                            onClick={() => battle.playerDefend()}
                        >
                            <Shield size={18} /> Defend
                        </button>

                        <button
                            className={`cq-action-btn ultimate ${player.energy < 100 ? 'dimmed' : ''}`}
                            disabled={!isPlayerTurn || isExecuting || player.energy < 100}
                            onClick={() => {
                                battle.selectAbility({ id: 'ultimate_slam', name: 'Heavy Slam', type: 'ultimate', description: '', icon: '💥', element: 'neutral', damageMultiplier: 2.5, cooldown: 0, energyCost: 100 });
                                battle.executePlayerAction();
                            }}
                        >
                            <Zap size={18} /> Ultimate {player.energy < 100 ? `(${Math.floor(player.energy)}%)` : ''}
                        </button>

                        {petDef && (
                            <button
                                className={`cq-action-btn pet ${petCooldown > 0 ? 'dimmed' : ''}`}
                                disabled={!isPlayerTurn || isExecuting || petCooldown > 0}
                                onClick={() => battle.usePetAbility()}
                            >
                                {petCooldown > 0 ? `🐾 Pet (${petCooldown}t)` : `🐾 ${petDef.name}`}
                            </button>
                        )}
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
                                battle.resetBattle();
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
                                battle.resetBattle();
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
