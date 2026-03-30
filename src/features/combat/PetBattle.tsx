import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { usePetBattleStore, WILD_CREATURES, getPetBattleStats, getPetBattleStatsScaled, type WildCreature, type PetElementType } from '../../store/usePetBattleStore';
import { usePetStore } from '../../store/usePetStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './PetBattle.css';

const TYPE_COLORS: Record<PetElementType, string> = {
    Earth: '#b45309', Fire: '#ef4444', Water: '#3b82f6',
    Nature: '#22c55e', Shadow: '#a855f7', Air: '#94a3b8',
    Aether: '#f59e0b',
};

export const PetBattle = ({ onClose }: { onClose: () => void }) => {
    const battle = usePetBattleStore();
    const petStore = usePetStore();
    const { ownedPets } = petStore;
    const { addGold } = useCurrencyStore();
    const [selectedEnemy, setSelectedEnemy] = useState<WildCreature | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Resolve active pet instance — used to scale stats when the player
    // selects the species that matches their active pet instance.
    const resolved = petStore.getResolvedActivePet();

    // Auto-scroll battle log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [battle.battleLog.length]);

    // Check daily reset
    const canPlay = battle.canBattleToday();

    const handleStartBattle = (petId: string) => {
        if (!selectedEnemy) return;
        // If this pet matches the active resolved instance, pass scaled stats
        const overrideStats = (resolved.source === 'instance' && resolved.petId === petId)
            ? getPetBattleStatsScaled(petId, resolved.level, resolved.isRare, resolved.ascensionStars) ?? undefined
            : undefined;
        battle.startBattle(petId, selectedEnemy, overrideStats);
    };

    const handleCollectReward = () => {
        if (battle.battlePhase === 'victory' && battle.selectedEnemy) {
            addGold(battle.selectedEnemy.goldReward);
        }
        battle.resetBattle();
    };

    // ── Phase: Select Pet & Enemy ──
    if (battle.battlePhase === 'idle') {
        return (
            <motion.div
                className="pb-overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                <div className="pb-container">
                    <div className="pb-header">
                        <h2>⚔️ Pet Battle</h2>
                        <button className="pb-close" onClick={onClose}><X size={20} /></button>
                    </div>

                    {!canPlay && (
                        <div className="pb-limit-banner">
                            <span>🚫 Daily limit reached (3/3 battles)</span>
                            <span className="pb-limit-sub">Come back tomorrow!</span>
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="pb-stats-row">
                        <span>🏆 Wins: {battle.totalWins}</span>
                        <span>💀 Losses: {battle.totalLosses}</span>
                    </div>

                    {/* Enemy selection */}
                    <div className="pb-section-title">Choose an Opponent</div>
                    <div className="pb-enemy-list">
                        {WILD_CREATURES.map(c => (
                            <button
                                key={c.id}
                                className={`pb-enemy-card ${selectedEnemy?.id === c.id ? 'selected' : ''}`}
                                onClick={() => setSelectedEnemy(c)}
                            >
                                <div className="pb-enemy-icon">{c.icon}</div>
                                <div className="pb-enemy-info">
                                    <div className="pb-enemy-name">{c.name} <span className="pb-enemy-lvl">Lv.{c.level}</span></div>
                                    <div className="pb-type-badge" style={{ background: TYPE_COLORS[c.type] }}>{c.type}</div>
                                </div>
                                <div className="pb-enemy-stats-mini">
                                    <span>❤️{c.maxHp}</span>
                                    <span>⚔️{c.attack}</span>
                                    <span>🛡️{c.defense}</span>
                                </div>
                                <div className="pb-reward-badge">+{c.goldReward}g</div>
                            </button>
                        ))}
                    </div>

                    {/* Pet selection */}
                    {selectedEnemy && canPlay && (
                        <>
                            <div className="pb-section-title">Choose Your Pet</div>
                            <div className="pb-pet-list">
                                {ownedPets.map(petId => {
                                    const stats = getPetBattleStats(petId);
                                    if (!stats) return null;
                                    // Show instance badge when this pet matches resolved active instance
                                    const isActiveInstance = resolved.source === 'instance' && resolved.petId === petId;
                                    return (
                                        <button
                                            key={petId}
                                            className="pb-pet-card"
                                            onClick={() => handleStartBattle(petId)}
                                        >
                                            <span className="pb-pet-icon">{stats.icon}</span>
                                            <div className="pb-pet-info">
                                                <div className="pb-pet-name">
                                                    {stats.name}
                                                    {isActiveInstance && (
                                                        <span style={{ marginLeft: 5, fontSize: '0.7rem', color: '#94a3b8' }}>
                                                            Lv.{resolved.level}
                                                            {resolved.isRare && <span style={{ marginLeft: 3, color: '#f59e0b' }}>✨</span>}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="pb-type-badge" style={{ background: TYPE_COLORS[stats.type] }}>{stats.type}</div>
                                            </div>
                                            <div className="pb-pet-stats-mini">
                                                <span>❤️{stats.maxHp}</span>
                                                <span>⚔️{stats.attack}</span>
                                            </div>
                                            <ChevronRight size={16} className="pb-arrow" />
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        );
    }

    // ── Phase: Active Battle ──
    const pet = getPetBattleStats(battle.selectedPetId!);
    const enemy = battle.selectedEnemy!;
    if (!pet) return null;

    return (
        <motion.div
            className="pb-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="pb-battle-container">
                {/* Turn indicator */}
                <div className="pb-turn-bar">
                    <span>Turn {battle.turn}</span>
                    <span className="pb-turn-phase">
                        {battle.battlePhase === 'battle' ? 'Choose your move!' :
                         battle.battlePhase === 'victory' ? '🎉 Victory!' :
                         battle.battlePhase === 'defeat' ? '💀 Defeated...' : ''}
                    </span>
                </div>

                {/* Battlefield */}
                <div className="pb-battlefield">
                    {/* Enemy side */}
                    <div className="pb-combatant pb-enemy-side">
                        <div className="pb-combatant-icon">{enemy.icon}</div>
                        <div className="pb-combatant-name">{enemy.name}</div>
                        <div className="pb-type-badge" style={{ background: TYPE_COLORS[enemy.type as PetElementType] }}>{enemy.type}</div>
                        <div className="pb-hp-bar">
                            <div className="pb-hp-fill" style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }} />
                            <span className="pb-hp-text">{battle.enemyHp}/{battle.enemyMaxHp}</span>
                        </div>
                    </div>

                    <div className="pb-vs">VS</div>

                    {/* Player side */}
                    <div className="pb-combatant pb-player-side">
                        <div className="pb-combatant-icon">{pet.icon}</div>
                        <div className="pb-combatant-name">
                            {pet.name}
                            {resolved.source === 'instance' && resolved.petId === battle.selectedPetId && (
                                <span style={{ marginLeft: 5, fontSize: '0.68rem', color: '#94a3b8' }}>
                                    Lv.{resolved.level}
                                    {resolved.isRare && <span style={{ marginLeft: 3, color: '#f59e0b' }}>✨</span>}
                                </span>
                            )}
                        </div>
                        <div className="pb-type-badge" style={{ background: TYPE_COLORS[pet.type] }}>{pet.type}</div>
                        <div className="pb-hp-bar">
                            <div className="pb-hp-fill player" style={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }} />
                            <span className="pb-hp-text">{battle.playerHp}/{battle.playerMaxHp}</span>
                        </div>
                    </div>
                </div>

                {/* Battle log */}
                <div className="pb-log">
                    {battle.battleLog.slice(-5).map((msg, i) => (
                        <motion.div
                            key={i}
                            className="pb-log-line"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {msg}
                        </motion.div>
                    ))}
                    <div ref={logEndRef} />
                </div>

                {/* Moves */}
                {battle.battlePhase === 'battle' && (
                    <div className="pb-moves">
                        {battle.playerMoves.map(move => {
                            const cd = battle.playerCooldowns[move.id] || 0;
                            return (
                                <button
                                    key={move.id}
                                    className={`pb-move-btn ${cd > 0 ? 'on-cooldown' : ''}`}
                                    disabled={cd > 0}
                                    onClick={() => battle.useMove(move.id)}
                                >
                                    <span className="pb-move-icon">{move.icon}</span>
                                    <div className="pb-move-info">
                                        <span className="pb-move-name">{move.name}</span>
                                        <span className="pb-move-desc">{move.description}</span>
                                    </div>
                                    <span className="pb-move-power">{move.power > 0 ? move.power : '—'}</span>
                                    {cd > 0 && <span className="pb-cooldown-badge">{cd}t</span>}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Victory / Defeat */}
                {(battle.battlePhase === 'victory' || battle.battlePhase === 'defeat') && (
                    <div className="pb-result-panel">
                        <div className={`pb-result-title ${battle.battlePhase}`}>
                            {battle.battlePhase === 'victory' ? '🎉 Victory!' : '💀 Defeated'}
                        </div>
                        {battle.battlePhase === 'victory' && (
                            <div className="pb-reward-line">🪙 +{enemy.goldReward} Gold</div>
                        )}
                        <button className="pb-result-btn" onClick={handleCollectReward}>
                            {battle.battlePhase === 'victory' ? 'Collect & Continue' : 'Return'}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
