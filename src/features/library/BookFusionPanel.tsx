import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { BOOK_TYPES, BOOK_TYPE_MAP, type BookType } from '../../store/useBookStore';
import './BookFusionPanel.css';

export const BookFusionPanel = () => {
    const { items, removeItem, addItem } = useInventoryStore();
    const [fuseFlash, setFuseFlash] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<BookType | 'all'>('all');

    // Find all owned books
    const ownedBooks = Object.entries(items).filter(([id, count]) => {
        const def = ITEM_DB[id];
        return def?.type === 'book' && count > 0;
    }).map(([id, count]) => {
        return { id, count, def: ITEM_DB[id] };
    });

    const filteredBooks = selectedType === 'all'
        ? ownedBooks
        : ownedBooks.filter(b => b.def.category === selectedType);

    // Summary counts by type
    const countByType = {
        fantasy: 0, history: 0, business: 0, 'self-improvement': 0, philosophy: 0,
    } as Record<BookType, number>;
    ownedBooks.forEach(b => { countByType[b.def.category as BookType] += b.count; });

    // Fusable pairs
    const fusablePairs = ownedBooks.filter(b => b.count >= 3 && b.def.level! < 3).map(b => {
        const nextId = `${b.def.category}_book_${b.def.level! + 1}`;
        const nextDef = ITEM_DB[nextId];
        return { ...b, nextDef };
    });

    const handleFuse = (id: string, nextId: string, type: string, level: number) => {
        const currentCount = useInventoryStore.getState().items[id] || 0;
        if (currentCount >= 3) {
            removeItem(id, 3);
            addItem(nextId, 1);

            const key = `${type}-${level}`;
            setFuseFlash(key);
            setToastMsg(`Fusion Complete — ${ITEM_DB[nextId]?.name || 'Tome'} created.`);
            setTimeout(() => setFuseFlash(null), 800);
            setTimeout(() => setToastMsg(null), 3000);
        }
    };

    return (
        <div className="bfp-root">
            <div className="bfp-header">
                <h2>📚 Book Fusion Lab</h2>
                <p className="bfp-subtitle">
                    Fuse <strong>3 books of the same type &amp; level</strong> to create a stronger version.
                    <br />
                    <span className="bfp-rule">3×Lv1 → Lv2 · 3×Lv2 → Lv3</span>
                </p>
            </div>

            {/* Type filter tabs */}
            <div className="bfp-tabs">
                <button
                    className={`bfp-tab ${selectedType === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedType('all')}
                >
                    All Types
                </button>
                {BOOK_TYPES.map(t => (
                    <button
                        key={t.id}
                        className={`bfp-tab ${selectedType === t.id ? 'active' : ''}`}
                        style={selectedType === t.id ? { borderColor: t.color, color: t.color } : {}}
                        onClick={() => setSelectedType(t.id as BookType)}
                    >
                        {t.icon} {t.label} ({countByType[t.id as BookType]})
                    </button>
                ))}
            </div>

            {/* Fusable Pairs Section */}
            {fusablePairs.length > 0 && (
                <div className="bfp-section">
                    <h3 className="bfp-section-title">⚗️ Ready to Fuse</h3>
                    <div className="bfp-fuse-grid">
                        {fusablePairs.map((pair) => {
                            const typeDef = BOOK_TYPE_MAP[pair.def.category!];
                            const key = `${pair.def.category}-${pair.def.level}`;
                            return (
                                <motion.div
                                    key={key}
                                    className={`bfp-fuse-card ${fuseFlash === key ? 'bfp-fuse-card--flash' : ''}`}
                                    style={{ '--book-color': typeDef.color } as React.CSSProperties}
                                    layout
                                >
                                    <div className="bfp-fuse-icon">{typeDef.icon}</div>
                                    <div className="bfp-fuse-info">
                                        <span className="bfp-fuse-name">{typeDef.label} Tome</span>
                                        <span className="bfp-fuse-level">Lv{pair.def.level} × {pair.count} / 3</span>
                                        <span className="bfp-fuse-bonus-preview">
                                            → Lv{pair.def.level! + 1}: {pair.nextDef.effect}
                                        </span>
                                    </div>
                                    <motion.button
                                        className="bfp-fuse-btn"
                                        style={{ background: typeDef.color }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => handleFuse(pair.id, pair.nextDef.id, pair.def.category!, pair.def.level!)}
                                    >
                                        🧬 Fuse!
                                    </motion.button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All books inventory */}
            {filteredBooks.length === 0 ? (
                <div className="bfp-empty">
                    <span className="bfp-empty-icon">📚</span>
                    <p>
                        {ownedBooks.length === 0
                            ? 'Complete books in the Library to earn Book Items!'
                            : 'No books of this type yet.'}
                    </p>
                </div>
            ) : (
                <div className="bfp-section">
                    <h3 className="bfp-section-title">🗃️ Your Books</h3>
                    <div className="bfp-artifact-grid">
                        {filteredBooks.map((book) => {
                            const typeDef = BOOK_TYPE_MAP[book.def.category!];
                            const isMaxLevel = book.def.level! >= 3;

                            return (
                                <motion.div
                                    key={book.id}
                                    className={`bfp-artifact-card`}
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
                                        Lv{book.def.level}
                                    </div>

                                    <div
                                        className="bfp-artifact-icon"
                                        style={{ color: typeDef.color }}
                                    >
                                        {typeDef.icon}
                                    </div>

                                    <div className="bfp-artifact-type">{book.def.name}</div>

                                    <div className="bfp-artifact-bonus">
                                        <span style={{ color: typeDef.color }}>{book.def.effect}</span>
                                    </div>

                                    <div className="bfp-artifact-source" style={{ marginTop: '10px', fontSize: '14px' }}>
                                        Owned: {book.count}
                                    </div>

                                    {isMaxLevel && (
                                        <div className="bfp-artifact-max" style={{ marginTop: '10px' }}>✨ MAX LEVEL</div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Book levels reference */}
            <div className="bfp-level-table">
                <h4>📈 Inventory Collection System</h4>
                <div className="bfp-level-rows" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#9ca3af', marginTop: '10px' }}>
                    <div><strong>1. Read:</strong> Get Lv 1 books and Intelligence XP</div>
                    <div><strong>2. Collect:</strong> Check inventory for your collection process</div>
                    <div><strong>3. Fuse:</strong> Combine 3 identical copies into the next level</div>
                    <div><strong>Business:</strong> Additionally awards Strategy XP</div>
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
