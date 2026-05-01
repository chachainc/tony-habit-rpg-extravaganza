import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Diamond } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CONQUEST_RELICS, type ConquestRelicDef } from '../../data/conquest';
import { CurrencyIcon } from '../../components/ui/CurrencyIcon';

type Outcome = 'trap' | 'treasure' | 'npc';

const OUTCOME_DEFS: { key: Outcome; icon: string; label: string; color: string }[] = [
    { key: 'trap',     icon: '☠️', label: 'Trap',        color: '#ef4444' },
    { key: 'treasure', icon: '💎', label: 'Treasure',    color: '#fbbf24' },
    { key: 'npc',      icon: '🧙', label: 'Strange NPC', color: '#a855f7' },
];

interface MysteryTileProps {
    onClose: () => void;
}

export const MysteryTile = ({ onClose }: MysteryTileProps) => {
    const conquest = useConquestStore();
    const currency = useCurrencyStore();

    // Pre-select the actual final outcome
    const [finalOutcome] = useState<Outcome>(() => {
        const r = Math.random();
        if (r < 0.35) return 'trap';
        if (r < 0.65) return 'treasure';
        return 'npc';
    });

    const [spinPhase, setSpinPhase] = useState<'spinning' | 'revealed' | 'resolving'>('spinning');
    const [currentHighlight, setCurrentHighlight] = useState(0);
    const [resolvedOutcome, setResolvedOutcome] = useState<Outcome | null>(null);
    const [resultText, setResultText] = useState('');
    const [relicBought, setRelicBought] = useState<string | null>(null);
    const [treasureChoice, setTreasureChoice] = useState<'gold' | 'gems' | null>(null);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stepRef = useRef(0);

    useEffect(() => {
        // Roulette spin: 30 steps, interval shrinks from 80ms → 300ms
        const TOTAL_STEPS = 30;
        const outcomes: Outcome[] = ['trap', 'treasure', 'npc'];

        const runStep = () => {
            stepRef.current += 1;
            const step = stepRef.current;

            // Always highlight in sequence
            setCurrentHighlight(step % 3);

            if (step >= TOTAL_STEPS) {
                // Force final outcome to correct index
                const finalIdx = outcomes.indexOf(finalOutcome);
                setCurrentHighlight(finalIdx);
                setSpinPhase('revealed');
                setResolvedOutcome(finalOutcome);

                if (intervalRef.current) clearInterval(intervalRef.current);

                // Move to resolving after 1.2s pause
                setTimeout(() => setSpinPhase('resolving'), 1200);
                return;
            }

            // Increase interval as we slow down (last 12 steps slow a lot)
            const delay = step < 18
                ? 80      // fast phase
                : step < 25
                    ? 160 // slow-down phase
                    : 280; // final crawl

            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(runStep, delay);
        };

        intervalRef.current = setInterval(runStep, 80);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // ─── Trap Resolve ────────────────────────────────────────────────────────
    const handleTrapResolve = () => {
        // Traps deal Run HP damage — they never remove gold/sigils/resources
        const hpLost = Math.floor(Math.random() * 10) + 5; // 5-14 HP damage
        conquest.takeDamage(hpLost);
        setResultText(`Lost ${hpLost} Run HP! (No gold was taken)`);
    };

    // ─── Treasure Resolve ─────────────────────────────────────────────────────
    const handleTreasureGold = () => {
        currency.addGold(20);
        setTreasureChoice('gold');
    };
    const handleTreasureGems = () => {
        import('../../store/useGameStore').then(({ useGameStore }) => {
            useGameStore.getState().addGems(1);
        });
        setTreasureChoice('gems');
    };

    // ─── Relic Purchase ───────────────────────────────────────────────────────
    const buyRelic = (relic: ConquestRelicDef) => {
        if (currency.gold < relic.cost) return;
        currency.spendGold(relic.cost);
        conquest.addRunBuff({
            id: `relic_${relic.id}_${Date.now()}`,
            type: relic.buffType,
            label: `${relic.name}: ${relic.description}`,
            amount: relic.buffAmount,
        });
        conquest.addRunRelic(relic.id);
        if (relic.isRewardAmplifier) conquest.activateRewardAmplifier();
        setRelicBought(relic.id);
    };

    return (
        <div
            className="modal-overlay"
            style={{ zIndex: 200 }}
            onClick={e => e.target === e.currentTarget && spinPhase === 'resolving' && onClose()}
        >
            <motion.div
                className="map-modal mystery-modal"
                style={{ borderColor: '#a855f7', maxWidth: 420, width: '95vw' }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>🔮 Mystery Tile</h2>
                    {spinPhase === 'resolving' && (
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* ── Roulette Display ── */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {OUTCOME_DEFS.map((o, i) => {
                        const isHighlighted = currentHighlight === i;
                        const isFinal = spinPhase !== 'spinning' && resolvedOutcome === o.key;
                        return (
                            <motion.div
                                key={o.key}
                                animate={{
                                    scale: isHighlighted ? 1.15 : 1,
                                    boxShadow: isHighlighted || isFinal
                                        ? `0 0 20px ${o.color}88`
                                        : 'none',
                                    borderColor: isHighlighted || isFinal ? o.color : '#374151',
                                }}
                                transition={{ duration: 0.12 }}
                                style={{
                                    flex: 1,
                                    border: '2px solid',
                                    borderRadius: 12,
                                    padding: '0.75rem 0.25rem',
                                    textAlign: 'center',
                                    background: isHighlighted || isFinal ? `${o.color}22` : '#1e293b',
                                    cursor: 'default',
                                }}
                            >
                                <div style={{ fontSize: '2rem' }}>{o.icon}</div>
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: isHighlighted || isFinal ? o.color : '#64748b',
                                    fontWeight: 600,
                                    marginTop: 4,
                                }}>{o.label}</div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Status ── */}
                {spinPhase === 'spinning' && (
                    <p style={{ textAlign: 'center', color: '#a78bfa', margin: 0, fontSize: '0.85rem' }}>
                        ✨ The fates are deciding…
                    </p>
                )}

                {spinPhase === 'revealed' && resolvedOutcome && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: 'center', color: OUTCOME_DEFS.find(o => o.key === resolvedOutcome)?.color, fontWeight: 700, fontSize: '1.1rem' }}
                    >
                        {OUTCOME_DEFS.find(o => o.key === resolvedOutcome)?.icon} {OUTCOME_DEFS.find(o => o.key === resolvedOutcome)?.label}!
                    </motion.p>
                )}

                {/* ── Resolved Outcomes ── */}
                <AnimatePresence>
                    {spinPhase === 'resolving' && resolvedOutcome && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* ── TRAP ── */}
                            {resolvedOutcome === 'trap' && (
                                <div style={{ textAlign: 'center' }}>
                                    {!resultText ? (
                                        <>
                                            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>
                                                ☠️ A trap springs from the shadows!
                                            </p>
                                            <button
                                                className="continue-btn"
                                                style={{ background: '#7f1d1d' }}
                                                onClick={handleTrapResolve}
                                            >
                                                Reveal Penalty
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 700 }}>
                                                {resultText}
                                            </p>
                                            <button className="continue-btn" onClick={onClose}>Continue</button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── TREASURE ── */}
                            {resolvedOutcome === 'treasure' && (
                                <div style={{ textAlign: 'center' }}>
                                    {!treasureChoice ? (
                                        <>
                                            <p style={{ color: '#fbbf24', marginBottom: '1rem' }}>
                                                💎 You found a glittering treasure! Choose your reward:
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                                <button
                                                    className="continue-btn"
                                                    style={{ background: '#b45309', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                    onClick={handleTreasureGold}
                                                >
                                                    <CurrencyIcon currencyType="gold" size={18} /> +20 Gold
                                                </button>
                                                <button
                                                    className="continue-btn"
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                    onClick={handleTreasureGems}
                                                >
                                                    <Diamond size={18} color="#60a5fa" /> +1 Gem
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                {treasureChoice === 'gold' ? <><CurrencyIcon currencyType="gold" size={22} /> +20 Gold!</> : <><Diamond size={22} color="#60a5fa" /> +1 Gem!</>}
                                            </p>
                                            <button className="continue-btn" onClick={onClose}>Continue</button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── STRANGE NPC ── */}
                            {resolvedOutcome === 'npc' && (
                                <div>
                                    <p style={{ color: '#a855f7', marginBottom: '0.75rem', textAlign: 'center' }}>
                                        🧙 A hooded merchant emerges from the fog…
                                    </p>
                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                                        Relics last only for this run. Gold: <strong style={{ color: '#fbbf24' }}>{currency.gold}</strong>
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {CONQUEST_RELICS.map(relic => {
                                            const owned = conquest.runRelics.includes(relic.id);
                                            const canAfford = currency.gold >= relic.cost;
                                            const bought = relicBought === relic.id || owned;
                                            return (
                                                <div
                                                    key={relic.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        background: bought ? '#052e16' : '#1e293b',
                                                        border: `1px solid ${bought ? '#16a34a' : '#374151'}`,
                                                        borderRadius: 8,
                                                        padding: '0.5rem 0.75rem',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.2rem' }}>{relic.icon}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.8rem' }}>{relic.name}</div>
                                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{relic.description}</div>
                                                    </div>
                                                    {bought ? (
                                                        <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>✓ Owned</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => buyRelic(relic)}
                                                            disabled={!canAfford}
                                                            style={{
                                                                background: canAfford ? '#7c3aed' : '#374151',
                                                                color: canAfford ? '#fff' : '#64748b',
                                                                border: 'none',
                                                                borderRadius: 6,
                                                                padding: '0.3rem 0.6rem',
                                                                cursor: canAfford ? 'pointer' : 'not-allowed',
                                                                fontSize: '0.75rem',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            <CurrencyIcon currencyType="gold" size={12} style={{ display: 'inline', position: 'relative', top: '2px', marginRight: '2px' }} /> {relic.cost}g
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button className="continue-btn" onClick={onClose}>
                                        <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        Leave Merchant
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
