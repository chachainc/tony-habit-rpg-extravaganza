import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFusionStore, FUSION_CATALOG, FUSION_MAP } from '../../store/useFusionStore';
import { useGachaStore } from '../../store/useGachaStore';
import './PetFusionPanel.css';


// Rarity colors by pet ID
const RARITY_COLORS: Record<string, string> = {
    pixel_cat: '#9ca3af',
    cyber_dog: '#9ca3af',
    spirit_fox: '#3b82f6',
    dragon_hatchling: '#a855f7',
    phoenix_chick: '#a855f7',
    ancient_owl: '#f59e0b',
    cosmic_turtle: '#f59e0b',
    galaxy_heifer: '#f43f5e',
};

export const PetFusionPanel = () => {
    const { fusePet, getFusionInfo } = useFusionStore();
    const { ownedPets } = useGachaStore();

    const [lastFused, setLastFused] = useState<string | null>(null);
    const [fuseFlash, setFuseFlash] = useState<string | null>(null);

    const handleFuse = (petId: string) => {
        const success = fusePet(petId);
        if (success) {
            setFuseFlash(petId);
            setLastFused(petId);
            setTimeout(() => setFuseFlash(null), 800);
        }
    };

    // Build list: show all pets in catalog, regardless of whether owned
    const entries = FUSION_CATALOG.map(def => {
        const info = getFusionInfo(def.petId);
        const owned = ownedPets.includes(def.petId);
        return { def, info, owned };
    });

    // Split into owned (top) and unowned/locked (bottom)
    const owned = entries.filter(e => e.owned);
    const locked = entries.filter(e => !e.owned);

    return (
        <div className="fusion-panel">
            <div className="fusion-header">
                <h2>🧬 Pet Fusion Lab</h2>
                <p className="fusion-subtitle">
                    Collect duplicates to power up your pets.<br />
                    <span className="fusion-rule">3 copies → Lv2 &nbsp;·&nbsp; 5 copies → Lv3 (new passive)</span>
                </p>
            </div>

            {owned.length === 0 && (
                <div className="fusion-empty">
                    <span className="fusion-empty-icon">🔮</span>
                    <p>Spin the Gacha to collect pets. Duplicates build fusion progress!</p>
                </div>
            )}

            <div className="fusion-grid">
                {owned.map(({ def, info }) => {
                    const rarityColor = RARITY_COLORS[def.petId] ?? '#6366f1';
                    const progressMax = info.nextThreshold ?? (info.level === 3 ? 5 : 5);
                    const progressVal = Math.min(info.copies, progressMax);
                    const progressPct = Math.min((progressVal / progressMax) * 100, 100);

                    return (
                        <motion.div
                            key={def.petId}
                            className={`fusion-card ${fuseFlash === def.petId ? 'fusion-card--flash' : ''}`}
                            style={{ '--rarity-color': rarityColor } as React.CSSProperties}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            layout
                        >
                            {/* Level badge */}
                            <div className="fusion-level-badge" style={{ background: rarityColor }}>
                                Lv{info.level}
                            </div>

                            {/* Icon */}
                            <div className="fusion-pet-icon">{def.icon}</div>

                            {/* Name */}
                            <h3 className="fusion-pet-name">{def.name}</h3>

                            {/* Level progress label */}
                            <div className="fusion-level-label">
                                {info.isMaxLevel ? (
                                    <span className="fusion-max">✨ MAX LEVEL</span>
                                ) : (
                                    <span>Lv{info.level} → Lv{info.level + 1}</span>
                                )}
                            </div>

                            {/* Progress bar */}
                            {!info.isMaxLevel && (
                                <>
                                    <div className="fusion-progress-bar">
                                        <motion.div
                                            className="fusion-progress-fill"
                                            style={{ background: rarityColor }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPct}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                        />
                                    </div>
                                    <div className="fusion-copies-label">
                                        {progressVal} / {progressMax} copies
                                        {info.copiesNeeded > 0 && (
                                            <span className="fusion-need"> (need {info.copiesNeeded} more)</span>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Next level bonus preview */}
                            {!info.isMaxLevel && (
                                <div className="fusion-bonus-preview">
                                    {info.level === 1 ? (
                                        <span>Lv2: +{FUSION_MAP[def.petId]?.lv2Bonus.value}% {FUSION_MAP[def.petId]?.lv2Bonus.stat}</span>
                                    ) : (
                                        <span>Lv3 Passive: {FUSION_MAP[def.petId]?.lv3Passive.name}</span>
                                    )}
                                </div>
                            )}

                            {/* Passive display when at Lv3 */}
                            {info.level === 3 && (
                                <div className="fusion-passive-unlocked">
                                    <span className="passive-tag">✨ Passive Unlocked</span>
                                    <strong>{FUSION_MAP[def.petId]?.lv3Passive.name}</strong>
                                    <p>{FUSION_MAP[def.petId]?.lv3Passive.description}</p>
                                </div>
                            )}

                            {/* Fuse button */}
                            <AnimatePresence>
                                {info.canFuse && (
                                    <motion.button
                                        className="fuse-btn"
                                        style={{ background: rarityColor }}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        onClick={() => handleFuse(def.petId)}
                                    >
                                        🧬 Fuse to Lv{info.level + 1}!
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Locked / Not Yet Owned */}
            {locked.length > 0 && (
                <div className="fusion-locked-section">
                    <h4 className="fusion-locked-title">🔒 Not Yet Discovered</h4>
                    <div className="fusion-locked-grid">
                        {locked.map(({ def }) => (
                            <div key={def.petId} className="fusion-locked-card">
                                <span className="fusion-locked-icon">{def.icon}</span>
                                <span className="fusion-locked-name">{def.name}</span>
                                <span className="fusion-locked-hint">Spin to discover</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Last fuse result toast */}
            <AnimatePresence>
                {lastFused && fuseFlash && (
                    <motion.div
                        className="fuse-toast"
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                    >
                        🎉 {FUSION_MAP[lastFused]?.name} evolved to Lv{(getFusionInfo(lastFused).level)}!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
