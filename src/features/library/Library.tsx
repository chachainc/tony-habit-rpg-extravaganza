import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Check, Trash2, Sparkles, Brain } from 'lucide-react';
import { useBookStore, BOOK_GLOBAL_XP_REWARD, BOOK_INTELLIGENCE_XP_REWARD } from '../../store/useBookStore';
import { useGameStore } from '../../store/useGameStore';
import { Card } from '../../components/ui';
import './Library.css';

export const Library = () => {
    const { currentBooks, completedBooks, addBook, completeBook, removeBook } = useBookStore();
    const { skills, getXpProgress } = useGameStore();

    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebratedBook, setCelebratedBook] = useState<string>('');

    const intelligenceProgress = getXpProgress('Intelligence');

    const handleAddBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        addBook(newTitle, newAuthor || 'Unknown Author');
        setNewTitle('');
        setNewAuthor('');
    };

    const handleCompleteBook = (bookId: string, bookTitle: string) => {
        setCelebratedBook(bookTitle);
        setShowCelebration(true);
        completeBook(bookId);

        setTimeout(() => {
            setShowCelebration(false);
        }, 3000);
    };

    return (
        <div className="library-page">
            {/* Background Layers */}
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
                            <div className="celebration-rewards">
                                <div className="reward-item">
                                    <Sparkles size={20} />
                                    <span>+{BOOK_GLOBAL_XP_REWARD} Global XP</span>
                                </div>
                                <div className="reward-item reward-intelligence">
                                    <Brain size={20} />
                                    <span>+{BOOK_INTELLIGENCE_XP_REWARD} Intelligence XP</span>
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

                {/* Add New Book */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card variant="elevated" className="add-book-card">
                        <h2>📖 Start a New Book</h2>
                        <p className="difficulty-badge">
                            <span className="very-hard">VERY HARD</span> Long-term project
                        </p>
                        <form onSubmit={handleAddBook} className="add-book-form">
                            <input
                                type="text"
                                placeholder="Book Title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="book-input"
                            />
                            <input
                                type="text"
                                placeholder="Author (optional)"
                                value={newAuthor}
                                onChange={(e) => setNewAuthor(e.target.value)}
                                className="book-input"
                            />
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
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card variant="elevated" className="current-books">
                        <h2>📕 Currently Reading</h2>
                        {currentBooks.length === 0 ? (
                            <p className="empty-message">
                                No books in progress. Start reading something!
                            </p>
                        ) : (
                            <div className="books-list">
                                {currentBooks.map((book) => (
                                    <div key={book.id} className="book-item in-progress">
                                        <div className="book-cover">📙</div>
                                        <div className="book-info">
                                            <h3 className="book-title">{book.title}</h3>
                                            <p className="book-author">by {book.author}</p>
                                            <p className="book-started">
                                                Started: {new Date(book.startedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="book-actions">
                                            <button
                                                className="complete-btn"
                                                onClick={() => handleCompleteBook(book.id, book.title)}
                                            >
                                                <Check size={18} />
                                                Complete
                                            </button>
                                            <button
                                                className="remove-btn"
                                                onClick={() => removeBook(book.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Completed Books Shelf */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card variant="elevated" className="completed-shelf">
                        <h2>📚 Completed Books ({completedBooks.length})</h2>
                        <p className="shelf-subtitle">Your permanent collection of knowledge</p>

                        {completedBooks.length === 0 ? (
                            <p className="empty-message">
                                Complete your first book to add it to your shelf!
                            </p>
                        ) : (
                            <div className="bookshelf">
                                {completedBooks.map((book, index) => (
                                    <motion.div
                                        key={book.id}
                                        className="shelf-book"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        title={`${book.title} by ${book.author}\nCompleted: ${book.completedAt ? new Date(book.completedAt).toLocaleDateString() : 'N/A'}`}
                                    >
                                        <div className="shelf-book__spine" />
                                        <div className="shelf-book__cover">📗</div>
                                        <div className="shelf-book__title">{book.title}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card variant="glass" className="info-card">
                        <h3>📖 How Books Work</h3>
                        <ul className="info-list">
                            <li><strong>Start a Book:</strong> Add any book you're reading</li>
                            <li><strong>No Daily Reset:</strong> Books are long-term projects</li>
                            <li><strong>Complete:</strong> Mark finished to earn rewards</li>
                            <li><strong>Rewards:</strong> +{BOOK_GLOBAL_XP_REWARD} Global XP, +{BOOK_INTELLIGENCE_XP_REWARD} Intelligence XP</li>
                            <li><strong>Magic Power:</strong> Intelligence increases Max MP and Magic Attack</li>
                        </ul>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};
