import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Sparkles, Sword, Shield, Heart } from 'lucide-react';
import { useGachaStore, PET_DB } from '../../store/useGachaStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../store/useEquipmentStore';
import './GachaMachine.css';

type GachaTab = 'pets' | 'equipment';
type PullPhase = 'idle' | 'shake' | 'burst' | 'reveal';

export const GachaMachine = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const { tickets, pullWithTicket, pull10Gacha, getPityInfo, setActivePet, activePet, ownedPets } = useGachaStore();
    const { pullEquipment, equipItem, ownedEquipment, equippedWeapon, equippedArmor, equippedAccessory, essence, getPityInfo: getEquipPity } = useEquipmentStore();

    const [activeTab, setActiveTab] = useState<GachaTab>('equipment');
    const [pullPhase, setPullPhase] = useState<PullPhase>('idle');
    const [result, setResult] = useState<any>(null);
    const [resultRarity, setResultRarity] = useState<string>('common');
    const [multiResults, setMultiResults] = useState<any[]>([]);
    const [isMultiPull, setIsMultiPull] = useState(false);
    const [canSkip, setCanSkip] = useState(false);

    const petPityInfo = getPityInfo();
    const equipPityInfo = getEquipPity();

    // Enhanced pull animation sequence
    const performPull = async (pullFn: () => any) => {
        setPullPhase('shake');
        setResult(null);

        // Shake phase - 1.5 seconds
        await new Promise(r => setTimeout(r, 1500));

        // Get result to determine color
        const pullResult = pullFn();
        if (pullResult) {
            setResultRarity(pullResult.item.rarity);
        }

        // Burst phase - 0.5 seconds
        setPullPhase('burst');
        await new Promise(r => setTimeout(r, 500));

        // Reveal phase
        setPullPhase('reveal');
        setResult(pullResult);
    };

    const handlePetPullWithTicket = () => {
        if (tickets <= 0) return;
        performPull(() => pullWithTicket());
    };

    const handleEquipmentPull = () => {
        if (tickets <= 0) return;
        // Deduct ticket from gacha store
        useGachaStore.getState().useTicket();
        performPull(() => pullEquipment());
    };

    const handleEquipItem = (equipmentId: string) => {
        equipItem(equipmentId);
    };

    const resetPull = () => {
        setPullPhase('idle');
        setResult(null);
        setMultiResults([]);
        setIsMultiPull(false);
        setCanSkip(false);
    };

    // Perform 10-pull with optional skip
    const perform10Pull = async () => {
        if (tickets < 10) return;

        setIsMultiPull(true);
        setCanSkip(true);
        setPullPhase('shake');
        setResult(null);
        setMultiResults([]);

        // Shake phase - 2 seconds (can be skipped)
        const shakePromise = new Promise<void>(resolve => setTimeout(resolve, 2000));
        await shakePromise;

        if (canSkip) {
            // Get results
            const pullResult = pull10Gacha();
            if (pullResult) {
                setMultiResults(pullResult.items);
                // Find highest rarity for burst effect
                const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'common'];
                const highestRarity = pullResult.items.reduce((best: string, item: any) => {
                    return rarityOrder.indexOf(item.rarity) < rarityOrder.indexOf(best) ? item.rarity : best;
                }, 'common');
                setResultRarity(highestRarity);
            }

            // Burst phase
            setPullPhase('burst');
            await new Promise(r => setTimeout(r, 500));

            // Reveal all
            setPullPhase('reveal');
            setCanSkip(false);
        }
    };

    // Skip animation handler
    const handleSkip = () => {
        if (!canSkip) return;

        // Immediately get results and go to reveal
        const pullResult = pull10Gacha();
        if (pullResult) {
            setMultiResults(pullResult.items);
            const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'common'];
            const highestRarity = pullResult.items.reduce((best: string, item: any) => {
                return rarityOrder.indexOf(item.rarity) < rarityOrder.indexOf(best) ? item.rarity : best;
            }, 'common');
            setResultRarity(highestRarity);
        }
        setPullPhase('reveal');
        setCanSkip(false);
    };

    const getRarityGlow = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return 'glow-legendary';
            case 'epic': return 'glow-epic';
            case 'rare': return 'glow-rare';
            default: return 'glow-common';
        }
    };

    return (
        <div className="modal-overlay gacha-overlay">
            <motion.div
                className="modal-content gacha-modal glassmorphism"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <button onClick={onClose} className="close-corner">×</button>
                <button
                    className="gacha-codex-btn"
                    onClick={() => { onClose(); navigate('/codex'); }}
                    title="View Collection Codex"
                >
                    📖 Codex
                </button>

                {/* Tab Switcher */}
                <div className="gacha-tabs">
                    <button
                        className={`gacha-tab ${activeTab === 'equipment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('equipment')}
                    >
                        <Sword size={18} /> Equipment
                    </button>
                    <button
                        className={`gacha-tab ${activeTab === 'pets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pets')}
                    >
                        🐾 Pets
                    </button>
                </div>

                {/* Idle State - Show Pull Options */}
                {pullPhase === 'idle' && (
                    <div className="gacha-standby">
                        <h2>{activeTab === 'equipment' ? '⚔️ Equipment Forge' : '🐾 Pet Collection'}</h2>

                        <div className="gacha-orb-container">
                            <div className="gacha-orb">🔮</div>
                        </div>

                        <p>{activeTab === 'equipment'
                            ? 'Forge powerful weapons, armor, and accessories!'
                            : 'Summon companion pets with passive bonuses!'}
                        </p>

                        {/* Drop Rates */}
                        <div className="drop-rates">
                            <span className="rate common">Common: 80%</span>
                            <span className="rate rare">Rare: 15%</span>
                            <span className="rate epic">Epic: 5%</span>
                        </div>

                        {/* Pity Counter */}
                        <div className="pity-counter">
                            <Sparkles size={16} />
                            <span>Pity: {activeTab === 'equipment' ? equipPityInfo.current : petPityInfo.current}/30</span>
                            <span className="pity-hint">
                                ({activeTab === 'equipment' ? equipPityInfo.nextGuaranteed : petPityInfo.epicGuaranteed} until guaranteed Epic+)
                            </span>
                        </div>

                        {/* Pull Buttons */}
                        <div className="pull-options">
                            <button
                                className="pull-btn ticket glassmorphism"
                                onClick={activeTab === 'equipment' ? handleEquipmentPull : handlePetPullWithTicket}
                                disabled={tickets <= 0}
                            >
                                <Ticket /> Single Pull (1 Ticket)
                            </button>
                            <button
                                className="pull-btn multi glassmorphism"
                                onClick={perform10Pull}
                                disabled={tickets < 10}
                            >
                                <Sparkles /> 10x Pull (10 Tickets)
                            </button>
                            <div className="ticket-count">
                                🎟️ {tickets} Tickets Available
                            </div>
                        </div>

                        {/* Essence Counter (Equipment Only) */}
                        {activeTab === 'equipment' && essence > 0 && (
                            <div className="essence-counter">
                                ✨ {essence} Essence (from duplicates)
                            </div>
                        )}

                        {/* Owned Items Grid */}
                        <div className="owned-items-section">
                            <h4>{activeTab === 'equipment' ? 'Your Equipment' : 'Your Pets'}</h4>

                            {activeTab === 'equipment' ? (
                                <div className="owned-items-grid">
                                    {ownedEquipment.map((eqId) => {
                                        const eq = EQUIPMENT_DB[eqId];
                                        if (!eq) return null;
                                        const isEquipped =
                                            equippedWeapon === eqId ||
                                            equippedArmor === eqId ||
                                            equippedAccessory === eqId;

                                        return (
                                            <div
                                                key={eq.id}
                                                className={`item-card glassmorphism ${eq.rarity} ${isEquipped ? 'equipped' : ''}`}
                                                onClick={() => handleEquipItem(eq.id)}
                                            >
                                                <div className={`item-glow ${getRarityGlow(eq.rarity)}`} />
                                                <div className="item-icon">{eq.icon}</div>
                                                <div className="item-name">{eq.name}</div>
                                                <div className="item-stats">
                                                    {eq.atkBonus > 0 && <span className="stat-atk">+{eq.atkBonus} ATK</span>}
                                                    {eq.defBonus > 0 && <span className="stat-def">+{eq.defBonus} DEF</span>}
                                                    {eq.hpBonus > 0 && <span className="stat-hp">+{eq.hpBonus} HP</span>}
                                                </div>
                                                {isEquipped && <div className="equipped-badge">✓ Equipped</div>}
                                            </div>
                                        );
                                    })}
                                    {ownedEquipment.length === 0 && (
                                        <p className="empty-message">No equipment yet. Start pulling!</p>
                                    )}
                                </div>
                            ) : (
                                <div className="owned-items-grid">
                                    {ownedPets.map((petId) => {
                                        const pet = PET_DB[petId];
                                        if (!pet) return null;

                                        return (
                                            <div
                                                key={pet.id}
                                                className={`item-card glassmorphism ${pet.rarity} ${activePet === pet.id ? 'equipped' : ''}`}
                                                onClick={() => setActivePet(pet.id)}
                                            >
                                                <div className={`item-glow ${getRarityGlow(pet.rarity)}`} />
                                                <div className="item-icon">{pet.icon}</div>
                                                <div className="item-name">{pet.name}</div>
                                                <div className="item-bonus">{pet.description}</div>
                                                {activePet === pet.id && <div className="equipped-badge">✓ Active</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── SHAKE / DRUMROLL PHASE ─── */}
                {pullPhase === 'shake' && (
                    <div className="summon-animation">
                        {/* Orbit particles that expand with rarity */}
                        <div className="summon-orbit-ring" style={{
                            borderColor: resultRarity === 'legendary' ? '#f59e0b' :
                                resultRarity === 'epic' ? '#a855f7' :
                                    resultRarity === 'rare' ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                            opacity: resultRarity !== 'common' ? 0.7 : 0.3,
                        }} />
                        <div className="summon-orbit-ring summon-orbit-ring--lg" style={{
                            borderColor: resultRarity === 'mythic' ? '#f43f5e' :
                                resultRarity === 'legendary' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                            opacity: ['legendary', 'mythic'].includes(resultRarity) ? 0.5 : 0.15,
                        }} />

                        {/* Floating particle dots */}
                        {['legendary', 'mythic', 'epic'].includes(resultRarity) && (
                            <div className="summon-particles">
                                {Array.from({ length: resultRarity === 'mythic' ? 12 : resultRarity === 'legendary' ? 8 : 5 }).map((_, i) => (
                                    <div key={i} className={`summon-particle summon-particle--${i % 4}`}
                                        style={{
                                            background: resultRarity === 'mythic' ? '#f43f5e' :
                                                resultRarity === 'legendary' ? '#f59e0b' : '#a855f7',
                                            animationDelay: `${i * 0.15}s`,
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <motion.div
                            className={`summon-orb shaking ${resultRarity !== 'common' ? `aura-${resultRarity}` : ''}`}
                            animate={{
                                rotate: [0, -8, 8, -8, 8, -5, 5, 0],
                                scale: [1, 1.08, 0.94, 1.08, 0.94, 1.04, 0.98, 1],
                                y: [0, -4, 4, -4, 4, 0]
                            }}
                            transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <div className="orb-glow" />
                            🔮
                        </motion.div>
                        <p className="summon-text">{isMultiPull ? '✨ Summoning 10x...' : '✨ Summoning...'}</p>
                        {canSkip && (
                            <button className="skip-btn" onClick={handleSkip}>
                                ⏭️ SKIP
                            </button>
                        )}
                    </div>
                )}

                {/* ─── BURST PHASE (rarity-scaled) ─── */}
                {pullPhase === 'burst' && (
                    <div className="summon-animation">
                        {/* Mythic: full-screen white flash */}
                        {resultRarity === 'mythic' && (
                            <motion.div
                                className="mythic-flash"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 0.5 }}
                            />
                        )}

                        <motion.div
                            className={`summon-orb bursting ${getRarityGlow(resultRarity)}`}
                            initial={{ scale: 1, opacity: 1 }}
                            animate={{
                                scale: resultRarity === 'mythic' ? [1, 3, 0] :
                                    resultRarity === 'legendary' ? [1, 2.5, 0] :
                                        resultRarity === 'epic' ? [1, 2, 0] : [1, 1.5, 0],
                                opacity: [1, 0.6, 0],
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="burst-particles" />
                            ✨
                        </motion.div>

                        {/* Expanding ring burst for epic+ */}
                        {['epic', 'legendary', 'mythic'].includes(resultRarity) && (
                            <motion.div
                                className="burst-ring"
                                style={{
                                    borderColor: resultRarity === 'mythic' ? '#f43f5e' :
                                        resultRarity === 'legendary' ? '#f59e0b' : '#a855f7',
                                }}
                                initial={{ scale: 0.5, opacity: 1 }}
                                animate={{ scale: 4, opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        )}
                    </div>
                )}

                {/* ─── REVEAL PHASE (cinematic card flip + rarity glow) ─── */}
                <AnimatePresence>
                    {pullPhase === 'reveal' && result && !isMultiPull && (
                        <motion.div
                            className="summon-result"
                            initial={{ scale: 0.6, opacity: 0, rotateY: 180 }}
                            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                            transition={{ type: 'spring', duration: 0.7, bounce: 0.35 }}
                        >
                            {/* Mythic: rainbow background beam */}
                            {result.item.rarity === 'mythic' && (
                                <div className="mythic-beam" />
                            )}
                            {result.item.rarity === 'legendary' && (
                                <div className="legendary-rays" />
                            )}

                            <div className={`result-card glassmorphism ${result.item.rarity}`}>
                                <div className={`result-glow ${getRarityGlow(result.item.rarity)}`} />
                                <div className="shimmer-effect" />

                                {/* Animated icon with zoom entrance */}
                                <motion.div
                                    className="result-icon"
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.2, duration: 0.5 }}
                                >
                                    {result.item.icon}
                                </motion.div>

                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {result.item.name}
                                </motion.h3>

                                <motion.span
                                    className={`rarity-tag ${result.item.rarity}`}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.55, type: 'spring' }}
                                >
                                    {result.item.rarity === 'mythic' ? '🌌 MYTHIC' :
                                        result.item.rarity === 'legendary' ? '⭐ LEGENDARY' :
                                            result.item.rarity.toUpperCase()}
                                </motion.span>

                                {/* Stats for Equipment */}
                                {activeTab === 'equipment' && (
                                    <div className="result-stats">
                                        {result.item.atkBonus > 0 && (
                                            <span className="stat"><Sword size={14} /> +{result.item.atkBonus} ATK</span>
                                        )}
                                        {result.item.defBonus > 0 && (
                                            <span className="stat"><Shield size={14} /> +{result.item.defBonus} DEF</span>
                                        )}
                                        {result.item.hpBonus > 0 && (
                                            <span className="stat"><Heart size={14} /> +{result.item.hpBonus} HP</span>
                                        )}
                                    </div>
                                )}

                                <p className="result-description">{result.item.description}</p>

                                {result.wasDuplicate ? (
                                    <div className="duplicate-notice">
                                        <p>✨ Duplicate! Converted to <strong>{result.essenceGained} Essence</strong></p>
                                    </div>
                                ) : (
                                    <div className="new-item-notice">
                                        <p>🎉 {activeTab === 'equipment' ? 'New Equipment!' : 'New Pet Unlocked!'}</p>
                                        {activeTab === 'equipment' && (
                                            <button
                                                className="equip-btn"
                                                onClick={() => {
                                                    handleEquipItem(result.item.id);
                                                    resetPull();
                                                }}
                                            >
                                                Equip Now
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button className="pull-again-btn" onClick={resetPull}>
                                    Pull Again
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Multi-Pull Results Grid */}
                    {pullPhase === 'reveal' && isMultiPull && multiResults.length > 0 && (
                        <motion.div
                            className="multi-results-container"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3>10x Pull Results!</h3>
                            <div className="multi-results-grid">
                                {multiResults.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        className={`multi-result-card glassmorphism ${item.rarity}`}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: index * 0.1, duration: 0.3 }}
                                    >
                                        <div className={`result-glow ${getRarityGlow(item.rarity)}`} />
                                        <div className="result-icon">{item.icon}</div>
                                        <div className="result-name">{item.name}</div>
                                        <div className={`rarity-badge ${item.rarity}`}>
                                            {item.rarity.charAt(0).toUpperCase()}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <button className="pull-again-btn" onClick={resetPull}>
                                Continue
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
