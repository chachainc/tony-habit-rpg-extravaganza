import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Check, Trash2, Sparkles, Brain, Zap
} from 'lucide-react';

import { useBookStore, BOOK_GLOBAL_XP_REWARD, BOOK_TYPES, BOOK_TYPE_MAP, type BookType } from '../../store/useBookStore';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { Card } from '../../components/ui';
import { SharedFusionPanel } from '../fusion/SharedFusionPanel';
import './Library.css';

type LibraryTab = 'reading' | 'fusion';

export const Library = () => {
    const { currentBooks, completedBooks, addBook, completeBook, removeBook } = useBookStore();
    const { skills, getXpProgress } = useGameStore();
    const { items } = useInventoryStore();

    const [activeTab, setActiveTab] = useState<LibraryTab>('reading');
    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [newBookType, setNewBookType] = useState<BookType>('fantasy');
    const [newBookFormat, setNewBookFormat] = useState<'physical' | 'audiobook'>('physical');
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebratedBook, setCelebratedBook] = useState('');
    const [celebratedBookType, setCelebratedBookType] = useState<BookType>('fantasy');
    const [celebratedBookFormat, setCelebratedBookFormat] = useState<'physical' | 'audiobook'>('physical');

    const intelligenceProgress = getXpProgress('Intelligence');

    // Check if player owns any books for notification badge
    const hasBooks = Object.keys(items).some(id => ITEM_DB[id]?.type === 'book' && items[id] > 0);

    const handleAddBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        addBook(newTitle, newAuthor || 'Unknown Author', newBookType, newBookFormat);
        setNewTitle('');
        setNewAuthor('');
    };

    const handleCompleteBook = (bookId: string, bookTitle: string, bookType: BookType, format: 'physical' | 'audiobook') => {
        setCelebratedBook(bookTitle);
        setCelebratedBookType(bookType);
        setCelebratedBookFormat(format);
        setShowCelebration(true);
        completeBook(bookId);
        setTimeout(() => setShowCelebration(false), 4000);
    };

    return (
        <div className="library-page">
            {/* Background */}
            <div className="library-bg">
                <div className="library-bg__image" />
                <div className="library-bg__vignette" />
                <div className="library-bg__fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>
                <div className="library-bg__dust">
                    {Array.from({ length: 25 }).map((_, i) => (
                        <div
                            key={i}
                            className="dust-mote"
                            style={{
                                left: `${Math.random() * 100}%`,
                                bottom: `${Math.random() * 80}%`,
                                animationDelay: `${Math.random() * 8}s`,
                                animationDuration: `${6 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Celebration Modal */}
            <AnimatePresence>
                {showCelebration && (
                    <motion.div
                        className="celebration-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="celebration-card glassmorphism"
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={{ scale: 1, rotateY: 0 }}
                            transition={{ type: 'spring', duration: 0.8 }}
                        >
                            <div className="celebration-sparkles">✨📚✨</div>
                            <h2>Book Completed!</h2>
                            <p className="celebrated-title">"{celebratedBook}"</p>

                            {/* Book Artifact reward */}
                            <div
                                className="celebration-artifact-reward"
                                style={{ borderColor: BOOK_TYPE_MAP[celebratedBookType].color }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>
                                    {BOOK_TYPE_MAP[celebratedBookType].icon}
                                </span>
                                <div>
                                    <div style={{ fontWeight: 800, color: BOOK_TYPE_MAP[celebratedBookType].color }}>
                                        {BOOK_TYPE_MAP[celebratedBookType].label} Tome Lv1 Earned!
                                    </div>
                                    <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                                        Check your Codex to fuse and collect.
                                    </div>
                                </div>
                            </div>

                            <div className="celebration-rewards">
                                <div className="reward-item">
                                    <Sparkles size={20} />
                                    <span>+{BOOK_GLOBAL_XP_REWARD} Global XP</span>
                                </div>
                                <div className="reward-item reward-intelligence">
                                    <Brain size={20} />
                                    <span>+{celebratedBookFormat === 'audiobook' ? 25 : 50} Intelligence XP</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="library-content">
                {/* Header */}
                <motion.div
                    className="library-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="library-title">
                        <BookOpen size={32} />
                        <h1>📚 The Grand Library</h1>
                    </div>
                    <p className="library-subtitle">Reading fuels your magical power</p>

                    <p className="library-subtitle">Reading fuels your magical power</p>

                    {/* Intelligence Stat */}
                    <div className="intelligence-stat">
                        <div className="intelligence-header">
                            <span className="intelligence-icon">🧠</span>
                            <span className="intelligence-label">Intelligence</span>
                            <span className="intelligence-level">Lv. {skills['Intelligence'].level}</span>
                        </div>
                        <div className="intelligence-bar">
                            <motion.div
                                className="intelligence-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${intelligenceProgress.percentage}%` }}
                            />
                        </div>
                        <div className="intelligence-xp">
                            {intelligenceProgress.current} / {intelligenceProgress.required} XP
                        </div>
                    </div>
                </motion.div>

                {/* Tab Toggle */}
                <div className="lib-tabs">
                    <button
                        className={`lib-tab ${activeTab === 'reading' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reading')}
                    >
                        <BookOpen size={15} /> Library
                    </button>
                    <button
                        className={`lib-tab ${activeTab === 'fusion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fusion')}
                    >
                        <Zap size={15} /> Book Codex
                        {hasBooks && (
                            <span className="lib-tab-badge">!</span>
                        )}
                    </button>
                </div>

                {/* ── READING TAB ── */}
                {activeTab === 'reading' && (
                    <>
                        {/* Add New Book */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card variant="elevated" className="add-book-card">
                                <h2>📖 Start a New Book</h2>
                                <form onSubmit={handleAddBook} className="add-book-form">
                                    <input
                                        type="text"
                                        placeholder="Book Title"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="book-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Author (optional)"
                                        value={newAuthor}
                                        onChange={e => setNewAuthor(e.target.value)}
                                        className="book-input"
                                    />

                                    {/* Book Format Selector */}
                                    <div className="lib-type-selector" style={{ marginBottom: '1rem' }}>
                                        <button
                                            type="button"
                                            className={`lib-type-btn ${newBookFormat === 'physical' ? 'active' : ''}`}
                                            onClick={() => setNewBookFormat('physical')}
                                        >
                                            📚 Physical
                                        </button>
                                        <button
                                            type="button"
                                            className={`lib-type-btn ${newBookFormat === 'audiobook' ? 'active' : ''}`}
                                            onClick={() => setNewBookFormat('audiobook')}
                                        >
                                            🎧 Audiobook
                                        </button>
                                    </div>

                                    {/* Book Type Selector */}
                                    <div className="lib-type-selector">
                                        {BOOK_TYPES.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                className={`lib-type-btn ${newBookType === t.id ? 'active' : ''}`}
                                                style={newBookType === t.id
                                                    ? { borderColor: t.color, color: t.color, background: `${t.color}18` }
                                                    : {}}
                                                onClick={() => setNewBookType(t.id)}
                                            >
                                                {t.icon}
                                                <span>{t.label.split(' /')[0]}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div
                                        className="lib-type-preview"
                                        style={{ color: BOOK_TYPE_MAP[newBookType].color }}
                                    >
                                        📗 Completing this book will unlock a{' '}
                                        <strong>{BOOK_TYPE_MAP[newBookType].label} Tome Lv1</strong>{' '}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!newTitle.trim()}
                                        className="btn btn--primary"
                                    >
                                        <Plus size={18} />
                                        Start Reading
                                    </button>
                                </form>
                            </Card>
                        </motion.div>

                        {/* Currently Reading */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card variant="elevated" className="current-books">
                                <h2>📕 Currently Reading</h2>
                                {currentBooks.length === 0 ? (
                                    <p className="empty-message">No books in progress. Start reading something!</p>
                                ) : (
                                    <div className="books-list">
                                        {currentBooks.map(book => {
                                            const typeDef = BOOK_TYPE_MAP[book.bookType];
                                            return (
                                                <div key={book.id} className="book-item in-progress">
                                                    <div
                                                        className="book-cover"
                                                        style={{ color: typeDef?.color }}
                                                    >
                                                        {typeDef?.icon ?? '📙'}
                                                    </div>
                                                    <div className="book-info">
                                                        <h3 className="book-title">{book.title}</h3>
                                                        <p className="book-author">by {book.author}</p>
                                                        <div className="book-meta-row">
                                                            <span
                                                                className="book-type-badge"
                                                                style={{
                                                                    background: `${typeDef?.color ?? '#666'}22`,
                                                                    color: typeDef?.color ?? '#aaa',
                                                                    border: `1px solid ${typeDef?.color ?? '#666'}44`
                                                                }}
                                                            >
                                                                {typeDef?.label ?? book.bookType}
                                                            </span>
                                                            <span
                                                                className="book-type-badge"
                                                                style={{
                                                                    background: `#3332`,
                                                                    color: `#ccc`,
                                                                    border: `1px solid #555`
                                                                }}
                                                            >
                                                                {book.format === 'audiobook' ? '🎧 Audiobook' : '📚 Physical'}
                                                            </span>
                                                            <span className="book-started">
                                                                Started: {new Date(book.startedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="book-actions">
                                                        <button
                                                            className="complete-btn"
                                                            onClick={() => handleCompleteBook(book.id, book.title, book.bookType, book.format || 'physical')}
                                                        >
                                                            <Check size={18} />
                                                            Complete
                                                        </button>
                                                        <button className="remove-btn" onClick={() => removeBook(book.id)}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </motion.div>

                        {/* Completed Books Shelf */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card variant="elevated" className="completed-shelf">
                                <h2>📚 Completed Books ({completedBooks.length})</h2>
                                <p className="shelf-subtitle">Your permanent collection of knowledge</p>
                                {completedBooks.length === 0 ? (
                                    <p className="empty-message">Complete your first book to add it to your shelf!</p>
                                ) : (
                                    <div className="books-list">
                                        {completedBooks.map((book, index) => {
                                            const typeDef = BOOK_TYPE_MAP[book.bookType];
                                            return (
                                                <motion.div
                                                    key={book.id}
                                                    className="book-item completed-book-item"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.04 }}
                                                >
                                                    <div
                                                        className="book-cover"
                                                        style={{ color: typeDef?.color, fontSize: '1.6rem' }}
                                                    >
                                                        {typeDef?.icon ?? '📗'}
                                                    </div>
                                                    <div className="book-info">
                                                        <h3 className="book-title">{book.title}</h3>
                                                        <p className="book-author">by {book.author}</p>
                                                        <div className="book-meta-row">
                                                            <span
                                                                className="book-type-badge"
                                                                style={{
                                                                    background: `${typeDef?.color ?? '#666'}22`,
                                                                    color: typeDef?.color ?? '#aaa',
                                                                    border: `1px solid ${typeDef?.color ?? '#666'}44`
                                                                }}
                                                            >
                                                                {typeDef?.label ?? book.bookType}
                                                            </span>
                                                            <span
                                                                className="book-type-badge"
                                                                style={{
                                                                    background: `#3332`,
                                                                    color: `#ccc`,
                                                                    border: `1px solid #555`
                                                                }}
                                                            >
                                                                {book.format === 'audiobook' ? '🎧 Audiobook' : '📚 Physical'}
                                                            </span>
                                                            <span className="book-started">
                                                                Completed: {book.completedAt ? new Date(book.completedAt).toLocaleDateString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="book-reward-tag"
                                                            style={{ color: typeDef?.color }}
                                                        >
                                                            🏆 Reward: {typeDef?.label ?? 'Book'} Book Lv1
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </motion.div>

                        {/* Info Card */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card variant="glass" className="info-card">
                                <h3>📖 Books & Intelligence</h3>
                                <ul className="info-list">
                                    <li><strong>Complete a Book:</strong> Experience points added to Intelligence</li>
                                    <li><strong>Earn items:</strong> You gain a Level 1 Tome after a book is completed</li>
                                    <li><strong>Fuse Tomes:</strong> 3 copies of a Level N book fuse into a Level N+1 in your Book Codex</li>
                                    <li><strong>Business Category 📓:</strong> Completing Business books additionally yields Strategy XP</li>
                                </ul>
                            </Card>
                        </motion.div>
                    </>
                )}

                {/* ── FUSION TAB ── */}
                {activeTab === 'fusion' && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <Card variant="elevated">
                            <SharedFusionPanel mode="book" />
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
