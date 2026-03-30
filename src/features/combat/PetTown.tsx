import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Footprints, Sword, Sparkles } from 'lucide-react';
import { usePetCatchingStore } from '../../store/usePetCatchingStore';
import { usePetStore } from '../../store/usePetStore';
import { useConquestStore } from '../../store/useConquestStore';
import { WILD_ZONES } from '../../data/zones';
import { calculateCatchChance } from '../../data/catchRules';
import type { CatchRarity } from '../../data/catchRules';
import './PetTown.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ELEMENT_COLORS: Record<string, string> = {
    Fire:    '#ef4444',
    Water:   '#3b82f6',
    Nature:  '#22c55e',
    Earth:   '#b45309',
    Air:     '#94a3b8',
    Shadow:  '#a855f7',
    Aether:  '#f59e0b',
};

const RARITY_LABELS: Record<string, string> = {
    common:   'Common',
    uncommon: 'Uncommon',
    rare:     'Rare',
};

function rarityToCatchRarity(rarity: string, isRare: boolean): CatchRarity {
    if (isRare) return 'rareEncounter';
    if (rarity === 'rare')     return 'rare';
    if (rarity === 'uncommon') return 'uncommon';
    return 'common';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PetTown = ({ onClose }: { onClose: () => void }) => {
    const catching  = usePetCatchingStore();
    const petStore  = usePetStore();
    const conquest  = useConquestStore();
    const logRef    = useRef<HTMLDivElement>(null);

    const [view, setView] = useState<'zones' | 'encounter' | 'result'>('zones');
    const [resultMsg, setResultMsg]   = useState('');
    const [resultType, setResultType] = useState<'success' | 'fail'>('success');

    // conquest.sigils is the live sigil count — no sync needed

    // Switch views automatically when encounter starts/ends
    useEffect(() => {
        if (catching.currentEncounter && view === 'zones') setView('encounter');
        if (!catching.currentEncounter && view === 'encounter') setView('zones');
    }, [catching.currentEncounter]);

    // Auto-scroll logs
    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, [catching.logs]);

    // ── Active player pet (instance-aware) ──
    const resolved     = petStore.getResolvedActivePet();
    const playerPetDef = resolved.petDef;

    // ── Catch chance display ──
    const enc = catching.currentEncounter;
    const catchChance = enc
        ? calculateCatchChance(
            rarityToCatchRarity(enc.rarity, enc.isRare),
            enc.currentHp,
            enc.maxHp,
            enc.hasStatus,
            enc.isRare
          )
        : 0;
    const catchPct = (catchChance * 100).toFixed(0);

    // ── Handlers ──
    const handleSearch = (zoneId: string) => {
        catching.setZone(zoneId);
        catching.startEncounter(zoneId);
    };

    const handleAttack = () => {
        if (catching.isCapturing || !enc || enc.currentHp <= 0) return;
        catching.performAttack();
    };

    const handleCapture = async () => {
        if (catching.isCapturing || !enc || enc.currentHp <= 0) return;
        // Guard in UI: sigil check is also enforced inside attemptCapture
        if (conquest.sigils <= 0) {
            catching.addLog('No Capture Sigils! Earn some from the Monopoly board or daily tasks.');
            return;
        }

        // attemptCapture reads conquest.sigils and calls addSigils(-1) internally
        const capturedPet = catching.currentEncounter;
        const success = await catching.attemptCapture();

        if (success && capturedPet) {
            petStore.addCaughtPetInstance({
                petId:        capturedPet.id,
                level:        capturedPet.level,
                isRare:       capturedPet.isRare,
                obtainMethod: 'caught',
            });
            const rareTag = capturedPet.isRare ? ' ✨ Rare' : '';
            setResultMsg(`✅ ${capturedPet.name}${rareTag} (Lv.${capturedPet.level}) added to your collection!`);
            setResultType('success');
            setTimeout(() => {
                catching.endEncounter();
                setView('result');
            }, 1200);
        } else if (!success && !catching.currentEncounter) {
            // Pet fled after failed capture — show fail result
            setResultMsg(`${capturedPet?.name ?? 'The wild pet'} fled into the wild...`);
            setResultType('fail');
            setView('result');
        }
    };

    const handleFlee = () => {
        catching.flee();
        setView('zones');
    };

    const handleCloseResult = () => {
        setView('zones');
        setResultMsg('');
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className="pt-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="pt-container">

                    {/* ── Header ── */}
                    <div className="pt-header">
                        <h2>🏕️ Pet Catch Mode</h2>
                        <div className="pt-header-right">
                            <span className="pt-sigil-badge" title="Capture Sigils">
                                🔱 {conquest.sigils}
                            </span>
                            <button className="pt-close" onClick={onClose} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* ── Stats Bar ── */}
                    <div className="pt-stats-bar">
                        <div className="pt-stats-item">
                            <Heart size={14} color="#ef4444" />
                            <span>{catching.expeditionHp}/{catching.maxExpeditionHp}</span>
                        </div>
                        {playerPetDef && (
                            <div className="pt-stats-item">
                                <span style={{ fontSize: '1rem' }}>{playerPetDef.icon}</span>
                                <span>{playerPetDef.name}</span>
                            </div>
                        )}
                        <div className="pt-stats-item">
                            <Footprints size={14} color="#10b981" />
                            <span>Sigils: {conquest.sigils}</span>
                        </div>
                    </div>

                    {/* ── Content ── */}
                    <div className="pt-content">

                        {/* ════ ZONE SELECTION VIEW ════ */}
                        {view === 'zones' && (
                            <motion.div
                                className="pt-zones-view"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <p className="pt-zone-hint">Choose a zone to explore:</p>

                                {WILD_ZONES.map(zone => (
                                    <button
                                        key={zone.id}
                                        className={`pt-zone-card ${zone.theme}`}
                                        onClick={() => handleSearch(zone.id)}
                                    >
                                        <div className="pt-zone-icon">{zone.icon}</div>
                                        <div className="pt-zone-info">
                                            <div className="pt-zone-name">{zone.name}</div>
                                            <div className="pt-zone-desc">{zone.description}</div>
                                            <div className="pt-zone-level">Lv.{zone.minLevel}–{zone.maxLevel}</div>
                                        </div>
                                        <div className="pt-zone-arrow">→</div>
                                    </button>
                                ))}

                                {/* Heal button */}
                                <button
                                    className="pt-heal-btn"
                                    onClick={() => catching.healPlayer()}
                                >
                                    <Heart size={16} color="#ef4444" />
                                    Rest (Free — restore HP)
                                </button>

                                {/* Sigil tip if 0 */}
                                {conquest.sigils === 0 && (
                                    <div className="pt-no-sigil-tip">
                                        ⚠️ No Capture Sigils! Earn them from the Monopoly board or daily tasks.
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ════ ENCOUNTER VIEW ════ */}
                        {view === 'encounter' && enc && (
                            <motion.div
                                className="pt-encounter"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                {/* Wild Pet Info */}
                                <div className="pt-wild-header">
                                    <div className="pt-wild-name-row">
                                        <span className="pt-wild-name">{enc.name}</span>
                                        {enc.isRare && (
                                            <span className="pt-rare-badge">✨ RARE</span>
                                        )}
                                    </div>
                                    <div className="pt-wild-sub-row">
                                        <span
                                            className="pt-element-badge"
                                            style={{ background: ELEMENT_COLORS[enc.type] || '#64748b' }}
                                        >
                                            {enc.type}
                                        </span>
                                        <span className={`pt-rarity-badge rarity-${enc.rarity}`}>
                                            {RARITY_LABELS[enc.rarity] ?? enc.rarity}
                                        </span>
                                        <span className="pt-level-badge">Lv.{enc.level}</span>
                                    </div>
                                </div>

                                {/* Wild Pet Sprite */}
                                <div className={`pt-wild-icon ${catching.isCapturing ? 'shake' : ''} ${enc.isRare ? 'rare-glow' : ''}`}>
                                    {enc.icon}
                                </div>

                                {/* Wild HP Bar */}
                                <div className="pt-hp-bar-container">
                                    <div className="pt-hp-label">
                                        <span>Wild HP</span>
                                        <span>{enc.currentHp}/{enc.maxHp}</span>
                                    </div>
                                    <div className="pt-hp-bar">
                                        <div
                                            className="pt-hp-fill"
                                            style={{ width: `${Math.max(0, (enc.currentHp / enc.maxHp) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Catch Chance Display */}
                                <div className="pt-catch-info">
                                    <span className="pt-catch-label">Catch chance:</span>
                                    <span
                                        className="pt-catch-pct"
                                        style={{
                                            color: catchChance >= 0.5 ? '#22c55e'
                                                 : catchChance >= 0.25 ? '#f59e0b'
                                                 : '#ef4444'
                                        }}
                                    >
                                        {catchPct}%
                                    </span>
                                    {enc.currentHp <= 0 && (
                                        <span className="pt-fainted-label">Fainted — cannot catch!</span>
                                    )}
                                </div>

                                {/* Player Pet Section */}
                                {playerPetDef && (
                                    <div className="pt-player-pet">
                                        <div className="pt-player-pet-icon">{playerPetDef.icon}</div>
                                        <div className="pt-player-pet-info">
                                            <span className="pt-player-pet-name">
                                                {playerPetDef.name}
                                                {resolved.source === 'instance' && (
                                                    <>
                                                        <span style={{ marginLeft: 5, fontSize: '0.7rem', color: '#94a3b8' }}>Lv.{resolved.level}</span>
                                                        {resolved.isRare && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: '#f59e0b' }}>✨</span>}
                                                    </>
                                                )}
                                            </span>
                                            <div className="pt-player-hp-bar">
                                                <div className="pt-hp-bar" style={{ height: 6 }}>
                                                    <div
                                                        className="pt-hp-fill player"
                                                        style={{ width: `${(catching.expeditionHp / catching.maxExpeditionHp) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <span className="pt-player-hp-text">
                                            {catching.expeditionHp}/{catching.maxExpeditionHp}
                                        </span>
                                    </div>
                                )}

                                {/* ── Action Buttons ── */}
                                <div className="pt-actions">
                                    <button
                                        className="pt-action-btn attack"
                                        onClick={handleAttack}
                                        disabled={catching.isCapturing || enc.currentHp <= 0}
                                    >
                                        <Sword size={18} />
                                        <span>Attack</span>
                                    </button>

                                    <button
                                        className="pt-action-btn skill disabled-skill"
                                        disabled
                                        title="Skills coming soon!"
                                    >
                                        <Sparkles size={18} />
                                        <span>Skill</span>
                                        <span className="pt-soon-badge">Soon</span>
                                    </button>

                                    <button
                                        className="pt-action-btn capture"
                                        onClick={handleCapture}
                                        disabled={catching.isCapturing || enc.currentHp <= 0 || conquest.sigils <= 0}
                                    >
                                        <span className="pt-orb-icon">⭐</span>
                                        <span>Capture</span>
                                        <span className="pt-sigil-count">({conquest.sigils})</span>
                                    </button>

                                    <button
                                        className="pt-action-btn flee"
                                        onClick={handleFlee}
                                        disabled={catching.isCapturing}
                                    >
                                        <Footprints size={18} />
                                        <span>Flee</span>
                                    </button>
                                </div>

                                {/* Battle Log */}
                                <div className="pt-logs" ref={logRef}>
                                    {catching.logs.slice(-8).map((log, i) => (
                                        <div key={i} className="pt-log-line">{log}</div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ════ RESULT VIEW ════ */}
                        {view === 'result' && (
                            <motion.div
                                className={`pt-result-view ${resultType}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="pt-result-icon">
                                    {resultType === 'success' ? '🎉' : '💨'}
                                </div>
                                <div className="pt-result-msg">{resultMsg}</div>
                                <button
                                    className="pt-result-btn"
                                    onClick={handleCloseResult}
                                >
                                    Back to Zones
                                </button>
                            </motion.div>
                        )}

                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
