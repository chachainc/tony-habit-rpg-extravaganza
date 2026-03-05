import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useBookArtifactStore,
    BOOK_TYPES,
    BOOK_TYPE_MAP,
    getBookBonus,
    BOOK_MAX_LEVEL,
    type BookType,
} from '../../store/useBookArtifactStore';
import './BookFusionPanel.css';

export const BookFusionPanel = () => {
    const { artifacts, fuseArtifacts, equipArtifact, equippedArtifactId, getFusablePairs } =
        useBookArtifactStore();

    const [fuseFlash, setFuseFlash] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<BookType | 'all'>('all');

    const handleFuse = (type: BookType, level: number, ids: string[]) => {
        const result = fuseArtifacts(ids[0], ids[1]);
        if (result.success) {
            const key = `${type}-${level}`;
            setFuseFlash(key);
            setToastMsg(`${BOOK_TYPE_MAP[type].label} Book fused to Level ${level + 1}! 📚`);
            setTimeout(() => setFuseFlash(null), 800);
            setTimeout(() => setToastMsg(null), 3000);
        }
    };

    const fusablePairs = getFusablePairs();

    // Group all artifacts by type for display
    const filteredArtifacts = selectedType === 'all'
        ? artifacts
        : artifacts.filter(a => a.bookType === selectedType);

    // Summary counts by type
    const countByType: Record<BookType, number> = {
        fantasy: 0, history: 0, business: 0, selfhelp: 0,
    };
    artifacts.forEach(a => { countByType[a.bookType]++; });

    return (
        <div className="bfp-root">
            <div className="bfp-header">
                <h2>📚 Book Fusion Lab</h2>
                <p className="bfp-subtitle">
                    Fuse <strong>2 books of the same type &amp; level</strong> to create a stronger version.
                    <br />
                    <span className="bfp-rule">Lv1+Lv1 → Lv2 · Lv2+Lv2 → Lv3 · ... · Max: Lv5</span>
                </p>
            </div>

            {/* Type filter tabs */}
            <div className="bfp-tabs">
                <button
                    className={`bfp-tab ${selectedType === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedType('all')}
                >
                    All ({artifacts.length})
                </button>
                {BOOK_TYPES.map(t => (
                    <button
                        key={t.id}
                        className={`bfp-tab ${selectedType === t.id ? 'active' : ''}`}
                        style={selectedType === t.id ? { borderColor: t.color, color: t.color } : {}}
                        onClick={() => setSelectedType(t.id)}
                    >
                        {t.icon} {t.label} ({countByType[t.id]})
                    </button>
                ))}
            </div>

            {/* Fusable Pairs Section */}
            {fusablePairs.length > 0 && (
                <div className="bfp-section">
                    <h3 className="bfp-section-title">⚗️ Ready to Fuse</h3>
                    <div className="bfp-fuse-grid">
                        {fusablePairs.map((pair) => {
                            const typeDef = BOOK_TYPE_MAP[pair.type];
                            const key = `${pair.type}-${pair.level}`;
                            const nextBonus = getBookBonus(pair.level + 1);
                            return (
                                <motion.div
                                    key={key}
                                    className={`bfp-fuse-card ${fuseFlash === key ? 'bfp-fuse-card--flash' : ''}`}
                                    style={{ '--book-color': typeDef.color } as React.CSSProperties}
                                    layout
                                >
                                    <div className="bfp-fuse-icon">{typeDef.icon}</div>
                                    <div className="bfp-fuse-info">
                                        <span className="bfp-fuse-name">{typeDef.label} Book</span>
                                        <span className="bfp-fuse-level">Lv{pair.level} × {pair.count}</span>
                                        <span className="bfp-fuse-bonus-preview">
                                            → Lv{pair.level + 1}: +{nextBonus}% {typeDef.bonusStat}
                                        </span>
                                    </div>
                                    <motion.button
                                        className="bfp-fuse-btn"
                                        style={{ background: typeDef.color }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleFuse(pair.type, pair.level, pair.ids)}
                                    >
                                        🧬 Fuse!
                                    </motion.button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All artifacts inventory */}
            {filteredArtifacts.length === 0 ? (
                <div className="bfp-empty">
                    <span className="bfp-empty-icon">📚</span>
                    <p>
                        {artifacts.length === 0
                            ? 'Complete books in the Library to earn Book Artifacts!'
                            : 'No books of this type yet.'}
                    </p>
                </div>
            ) : (
                <div className="bfp-section">
                    <h3 className="bfp-section-title">🗃️ Your Book Artifacts</h3>
                    <div className="bfp-artifact-grid">
                        {filteredArtifacts.map((artifact) => {
                            const typeDef = BOOK_TYPE_MAP[artifact.bookType];
                            const bonus = getBookBonus(artifact.level);
                            const isEquipped = equippedArtifactId === artifact.id;
                            const isMaxLevel = artifact.level >= BOOK_MAX_LEVEL;

                            return (
                                <motion.div
                                    key={artifact.id}
                                    className={`bfp-artifact-card ${isEquipped ? 'equipped' : ''}`}
                                    style={{ '--book-color': typeDef.color } as React.CSSProperties}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    {/* Level badge */}
                                    <div
                                        className="bfp-artifact-lvbadge"
                                        style={{ background: typeDef.color }}
                                    >
                                        Lv{artifact.level}
                                    </div>

                                    {isEquipped && (
                                        <div className="bfp-equipped-tag">⚔️ Equipped</div>
                                    )}

                                    <div
                                        className="bfp-artifact-icon"
                                        style={{ color: typeDef.color }}
                                    >
                                        {typeDef.icon}
                                    </div>

                                    <div className="bfp-artifact-type">{typeDef.label} Book</div>

                                    <div className="bfp-artifact-bonus">
                                        <span style={{ color: typeDef.color }}>+{bonus}%</span>
                                        {' '}{typeDef.bonusStat}
                                    </div>

                                    {isMaxLevel && (
                                        <div className="bfp-artifact-max">✨ MAX LEVEL</div>
                                    )}

                                    <div className="bfp-artifact-source" title={artifact.sourceTitle}>
                                        "{artifact.sourceTitle.length > 22
                                            ? artifact.sourceTitle.slice(0, 22) + '…'
                                            : artifact.sourceTitle}"
                                    </div>

                                    <button
                                        className={`bfp-equip-btn ${isEquipped ? 'unequip' : ''}`}
                                        style={!isEquipped ? { borderColor: typeDef.color, color: typeDef.color } : {}}
                                        onClick={() => equipArtifact(isEquipped ? null : artifact.id)}
                                    >
                                        {isEquipped ? 'Unequip' : 'Equip'}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Book levels reference */}
            <div className="bfp-level-table">
                <h4>📈 Level Bonuses</h4>
                <div className="bfp-level-rows">
                    {[1, 2, 3, 4, 5].map(lv => (
                        <div key={lv} className="bfp-level-row">
                            <span className="bfp-level-num">Lv{lv}</span>
                            <span className="bfp-level-val">+{getBookBonus(lv)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        className="bfp-toast"
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                    >
                        {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
