import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Plus, Library, Zap } from 'lucide-react';
import { useBookStore, BOOK_TYPES, type BookType } from '../../store/useBookStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { useGameStore } from '../../store/useGameStore';
import dayjs from 'dayjs';
import './LibraryCodex.css';

// ─── Tome definitions ────────────────────────────────────────────────────────
const TOME_TREES = [
    {
        category: 'fantasy' as const,
        label: 'Fantasy',
        icon: '📘',
        glow: '#a855f7',
        tomes: [
            { id: 'fantasy_tome_1', tier: 'I',   effect: '+2 Max Mana' },
            { id: 'fantasy_tome_2', tier: 'II',  effect: '+8 Max Mana' },
            { id: 'fantasy_tome_3', tier: 'III', effect: '+25 Max Mana' },
            { id: 'fantasy_tome_4', tier: 'IV',  effect: '+70 Max Mana' },
            { id: 'fantasy_tome_5', tier: 'V',   effect: '+150 Max Mana' },
        ],
    },
    {
        category: 'self-improvement' as const,
        label: 'Discipline',
        icon: '📒',
        glow: '#eab308',
        tomes: [
            { id: 'discipline_tome_1', tier: 'I',   effect: '+1 Habit' },
            { id: 'discipline_tome_2', tier: 'II',  effect: '+3 Habit' },
            { id: 'discipline_tome_3', tier: 'III', effect: '+7 Habit' },
            { id: 'discipline_tome_4', tier: 'IV',  effect: '+15 Habit' },
            { id: 'discipline_tome_5', tier: 'V',   effect: '+30 Habit' },
        ],
    },
    {
        category: 'business' as const,
        label: 'Commerce',
        icon: '📓',
        glow: '#22c55e',
        tomes: [
            { id: 'commerce_tome_1', tier: 'I',   effect: '+2% Gold' },
            { id: 'commerce_tome_2', tier: 'II',  effect: '+5% Gold' },
            { id: 'commerce_tome_3', tier: 'III', effect: '+10% Gold' },
            { id: 'commerce_tome_4', tier: 'IV',  effect: '+18% Gold' },
            { id: 'commerce_tome_5', tier: 'V',   effect: '+30% Gold' },
        ],
    },
    {
        category: 'philosophy' as const,
        label: 'Philosophy',
        icon: '📚',
        glow: '#8b5cf6',
        tomes: [
            { id: 'philosophy_tome_1', tier: 'I',   effect: '+2 Magic Defense, +5 Max Energy' },
            { id: 'philosophy_tome_2', tier: 'II',  effect: '+4 Magic Defense, +10 Max Energy' },
            { id: 'philosophy_tome_3', tier: 'III', effect: '+6 Magic Defense, +15 Max Energy' },
            { id: 'philosophy_tome_4', tier: 'IV',  effect: '+8 Magic Defense, +20 Max Energy' },
            { id: 'philosophy_tome_5', tier: 'V',   effect: '+10 Magic Defense, +25 Max Energy' },
        ],
    },
];

type Tab = 'library' | 'codex' | 'reading' | 'completed';

const getXpPreview = (bookType: BookType, format: 'physical' | 'audiobook') => {
    if (bookType === 'fantasy') {
        return format === 'audiobook'
            ? [{ skill: 'Intelligence', xp: 15 }]
            : [{ skill: 'Intelligence', xp: 25 }, { skill: 'Habit', xp: 5 }];
    }
    if (bookType === 'self-improvement') {
        return format === 'audiobook'
            ? [{ skill: 'Habit', xp: 15 }]
            : [{ skill: 'Habit', xp: 25 }];
    }
    if (bookType === 'business') {
        return format === 'audiobook'
            ? [{ skill: 'Work', xp: 15 }]
            : [{ skill: 'Work', xp: 25 }, { skill: 'Habit', xp: 5 }];
    }
    if (bookType === 'philosophy') {
        return format === 'audiobook'
            ? [{ skill: 'Intelligence', xp: 15 }]
            : [{ skill: 'Intelligence', xp: 25 }, { skill: 'Habit', xp: 5 }];
    }
    return [];
};

export const LibraryCodex = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<Tab>('library');
    const { completedBooks, logCompletedBook, currentBooks, addBook, completeBook } = useBookStore();
    const { items, removeItem, addItem } = useInventoryStore();
    useBookTrophyStore(); // subscribed for side effects via useBookStore
    const { } = useGameStore(); // subscribed; discount used via useGameStore.getState()

    // ── Log form state ─────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [bookType, setBookType] = useState<BookType>('fantasy');
    const [format, setFormat] = useState<'physical' | 'audiobook'>('physical');
    const [isCurrentlyReading, setIsCurrentlyReading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // ── Fusion state ───────────────────────────────────────────────────────
    const [fuseFlash, setFuseFlash] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleLogBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (isCurrentlyReading) {
            addBook(title, '', bookType, format);
        } else {
            logCompletedBook(title, '', bookType, format);
        }
        setTitle('');
        setActiveTab(isCurrentlyReading ? 'reading' : 'completed');
        showToast(isCurrentlyReading ? 'Book added to reading list!' : '📚 Book logged! Tome & XP awarded!');
    };

    // ── Tome / fusion helpers ──────────────────────────────────────────────
    const handleFuse = (fromId: string, toId: string) => {
        const count = items[fromId] || 0;
        if (count < 3) return;
        removeItem(fromId, 3);
        addItem(toId, 1);
        setFuseFlash(toId);
        setTimeout(() => setFuseFlash(null), 800);
        showToast(`⚗️ Fused into ${ITEM_DB[toId]?.name}!`);
    };

    // ── Fusable pairs ──────────────────────────────────────────────────────
    const fusablePairs = Object.entries(items)
        .filter(([id, count]) => {
            const def = ITEM_DB[id];
            return def?.type === 'book' && count >= 3 && (def.fusionRequired ?? 0) > 0 && (def.level ?? 0) < 5;
        })
        .map(([id, count]) => {
            const def = ITEM_DB[id];
            const nextLevel = (def.level ?? 1) + 1;
            const category = def.category as string;
            // Determine next tome id based on category prefix
            const prefix = category === 'fantasy' ? 'fantasy_tome'
                : category === 'self-improvement' ? 'discipline_tome'
                : category === 'philosophy' ? 'philosophy_tome'
                : 'commerce_tome';
            const nextId = `${prefix}_${nextLevel}`;
            return { id, count, def, nextId, nextDef: ITEM_DB[nextId] };
        })
        .filter(p => p.nextDef);

    const xpPreview = getXpPreview(bookType, format);
    const tomePreview = BOOK_TYPES.find(t => t.id === bookType);

    const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
        { key: 'library', icon: <Plus size={15} />,     label: 'Log Book' },
        { key: 'reading', icon: <BookOpen size={15} />, label: 'Reading' },
        { key: 'completed', icon: <Library size={15} />,label: 'Completed' },
        { key: 'codex',   icon: <Zap size={15} />,      label: 'Tome Codex' },
    ];

    return (
        <div className="lc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                className="lc-modal"
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
            >
                {/* Header */}
                <div className="lc-header">
                    <div className="lc-title">
                        <span className="lc-icon">📚</span>
                        <span>Library Codex</span>
                    </div>
                    <div className="lc-header-meta">
                        <span className="lc-book-count">{completedBooks.length} books read</span>
                        <button className="lc-close" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="lc-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`lc-tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.key === 'codex' && fusablePairs.length > 0 && (
                                <span className="lc-tab-badge">{fusablePairs.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="lc-content">

                    {/* ── LOG BOOK TAB (Library) ── */}
                    {activeTab === 'library' && (
                        <div className="lc-log-tab">
                            <form className="lc-log-form" onSubmit={handleLogBook}>
                                <div className="lc-form-group">
                                    <label>Book Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. The Hobbit"
                                        required
                                    />
                                </div>

                                <div className="lc-form-row">
                                    <div className="lc-form-group">
                                        <label>Category</label>
                                        <div className="lc-category-btns">
                                            {BOOK_TYPES.map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    className={`lc-cat-btn ${bookType === t.id ? 'active' : ''}`}
                                                    style={bookType === t.id ? { borderColor: t.color, color: t.color } : {}}
                                                    onClick={() => setBookType(t.id as BookType)}
                                                >
                                                    {t.icon} {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lc-form-group">
                                        <label>Format</label>
                                        <div className="lc-format-btns">
                                            <button
                                                type="button"
                                                className={`lc-fmt-btn ${format === 'physical' ? 'active' : ''}`}
                                                onClick={() => setFormat('physical')}
                                            >
                                                📖 Physical
                                            </button>
                                            <button
                                                type="button"
                                                className={`lc-fmt-btn ${format === 'audiobook' ? 'active' : ''}`}
                                                onClick={() => setFormat('audiobook')}
                                            >
                                                🎧 Audiobook
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* XP Preview */}
                                <div className="lc-reward-preview">
                                    <p className="lc-reward-title">Rewards Preview</p>
                                    <div className="lc-reward-list">
                                        {xpPreview.map((r, i) => (
                                            <span key={i} className="lc-reward-chip">
                                                +{r.xp} {r.skill} XP
                                            </span>
                                        ))}
                                        {tomePreview && (
                                            <span className="lc-reward-chip lc-reward-chip--tome" style={{ borderColor: tomePreview.color }}>
                                                {tomePreview.icon} {tomePreview.tomeName}
                                            </span>
                                        )}
                                    </div>
                                    <p className="lc-reward-note">Book XP ignores daily caps ✨</p>
                                </div>

                                <label className="lc-check-row">
                                    <input
                                        type="checkbox"
                                        checked={isCurrentlyReading}
                                        onChange={e => setIsCurrentlyReading(e.target.checked)}
                                    />
                                    <span>Still reading (add to in-progress list)</span>
                                </label>

                                <button type="submit" className="lc-submit-btn">
                                    {isCurrentlyReading ? '+ Add to Reading List' : '📚 Log Complete & Earn Rewards'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                    {/* ── READING NOW TAB ── */}
                    {activeTab === 'reading' && (
                        <div className="lc-reading-tab">
                            {currentBooks.length > 0 ? (
                                <div className="lc-in-progress">
                                    <h4>Books In Progress</h4>
                                    {currentBooks.map(book => {
                                        const bt = BOOK_TYPES.find(t => t.id === book.bookType);
                                        return (
                                            <div key={book.id} className="lc-progress-card">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{bt?.icon}</span> 
                                                    <span style={{ fontWeight: 600 }}>{book.title}</span>
                                                </div>
                                                <button
                                                    className="lc-complete-btn"
                                                    onClick={() => completeBook(book.id)}
                                                >
                                                    ✓ Complete
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="lc-empty">
                                    <span className="lc-empty-icon">📖</span>
                                    <p>Not reading anything currently.<br />Add a book from the Log tab.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── COMPLETED BOOKS TAB ── */}
                    {activeTab === 'completed' && (
                        <div className="lc-books-tab">
                            {completedBooks.length === 0 ? (
                                <div className="lc-empty">
                                    <span className="lc-empty-icon">📚</span>
                                    <p>No books logged yet!<br />Complete your first book to start tracking.</p>
                                </div>
                            ) : (
                                <div className="lc-book-list">
                                    {[...completedBooks].reverse().map(book => {
                                        const bt = BOOK_TYPES.find(t => t.id === book.bookType);
                                        return (
                                            <div key={book.id} className="lc-book-card">
                                                <div className="lc-book-card-icon">{bt?.icon ?? '📚'}</div>
                                                <div className="lc-book-card-body">
                                                    <p className="lc-book-title">{book.title}</p>
                                                    <div className="lc-book-meta">
                                                        <span className="lc-book-tag" style={{ color: bt?.color }}>
                                                            {bt?.label}
                                                        </span>
                                                        <span className="lc-book-tag">
                                                            {book.format === 'audiobook' ? '🎧 Audiobook' : '📖 Physical'}
                                                        </span>
                                                        {book.completedAt && (
                                                            <span className="lc-book-tag lc-book-date">
                                                                {dayjs(book.completedAt).format('MMM D')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CODEX TAB (Tomes + Fusion) ── */}
                    {activeTab === 'codex' && (
                        <div className="lc-tomes-tab">
                            {/* Fusion Section */}
                            <div className="lc-fusion-section">
                                <div className="lc-fusion-header">
                                    <h4>Tome Fusion Laboratory</h4>
                                    <p>Combine <strong>3 tomes of the same type & tier</strong> to upgrade to the next tier.</p>
                                </div>
                                
                                {fusablePairs.length > 0 && (
                                    <div className="lc-fusion-list">
                                        {fusablePairs.map(pair => {
                                            const tree = TOME_TREES.find(t =>
                                                pair.def.category === t.category
                                            );
                                            const glow = tree?.glow ?? '#60a5fa';
                                            const isFlashing = fuseFlash === pair.nextId;
                                            return (
                                                <motion.div
                                                    key={pair.id}
                                                    className={`lc-fuse-card ${isFlashing ? 'flash' : ''}`}
                                                    style={{ '--glow': glow } as React.CSSProperties}
                                                    layout
                                                >
                                                    <div className="lc-fuse-slots">
                                                        {[0, 1, 2].map(i => (
                                                            <div key={i} className="lc-fuse-slot" style={{ borderColor: glow }}>
                                                                <span style={{ color: glow }}>{tree?.icon ?? '📚'}</span>
                                                                <span className="lc-fuse-slot-label">{pair.def.name?.replace(' Tome', '')}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="lc-fuse-arrow">→</div>

                                                    <div className="lc-fuse-result" style={{ borderColor: glow }}>
                                                        <span style={{ color: glow }}>{tree?.icon ?? '📚'}</span>
                                                        <span className="lc-fuse-result-name">{pair.nextDef?.name}</span>
                                                        <span className="lc-fuse-result-effect" style={{ color: glow }}>{pair.nextDef?.effect}</span>
                                                    </div>

                                                    <div className="lc-fuse-info">
                                                        <span className="lc-fuse-count">×{Math.min(pair.count, 3)} / 3</span>
                                                        <motion.button
                                                            className="lc-fuse-btn"
                                                            style={{ background: glow }}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleFuse(pair.id, pair.nextId)}
                                                        >
                                                            ⚗️ Fuse
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

                            {/* Tomes Collection */}
                            <h4 style={{ color: '#fff', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Collection Trees</h4>
                            {TOME_TREES.map(tree => (
                                <div key={tree.category} className="lc-tome-tree">
                                    <div className="lc-tome-tree-header" style={{ color: tree.glow }}>
                                        {tree.icon} <strong>{tree.label} Tomes</strong>
                                    </div>
                                    <div className="lc-tome-chain">
                                        {tree.tomes.map((tome, i) => {
                                            const owned = items[tome.id] || 0;
                                            const unlock = owned > 0;
                                            return (
                                                <div key={tome.id} className="lc-tome-chain-item">
                                                    <div
                                                        className={`lc-tome-node ${unlock ? 'unlocked' : 'locked'}`}
                                                        style={unlock ? { boxShadow: `0 0 14px ${tree.glow}55`, borderColor: tree.glow } : {}}
                                                    >
                                                        <div className="lc-tome-node-icon" style={unlock ? { color: tree.glow } : {}}>{tree.icon}</div>
                                                        <div className="lc-tome-node-tier">Tier {tome.tier}</div>
                                                        <div className="lc-tome-node-effect">{tome.effect}</div>
                                                        {owned > 0 && (
                                                            <div className="lc-tome-node-count">×{owned}</div>
                                                        )}
                                                    </div>
                                                    {i < tree.tomes.length - 1 && (
                                                        <div className="lc-tome-arrow" style={{ color: unlock ? tree.glow : '#374151' }}>→</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* Toast */}
                <AnimatePresence>
                    {toastMsg && (
                        <motion.div
                            className="lc-toast"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                        >
                            {toastMsg}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
