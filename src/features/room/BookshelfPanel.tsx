import { useState } from 'react';
import { Plus, X, List, Check } from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useBookTrophyStore } from '../../store/useBookTrophyStore';
import { useGameStore } from '../../store/useGameStore';
import { BOOK_TYPES, type BookType } from '../../store/useBookArtifactStore';
import dayjs from 'dayjs';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

const BOOK_TYPE_IDS: BookType[] = BOOK_TYPES.map((type) => type.id);

const coerceBookType = (value: string): BookType =>
    BOOK_TYPE_IDS.find((type) => type === value) ?? 'fantasy';

export const BookshelfPanel = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'log'>('log');
    const { completedBooks, addBook, logCompletedBook } = useBookStore();
    const { incrementBooksRead } = useBookTrophyStore();
    const { addGlobalXp } = useGameStore();

    // Form state
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [pages, setPages] = useState('');
    const [notes, setNotes] = useState('');
    const [isCompleted, setIsCompleted] = useState(true);
    const [bookType, setBookType] = useState<BookType>('fantasy');

    const handleLogBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !author.trim()) return;

        const pagesNum = parseInt(pages) || undefined;

        if (isCompleted) {
            logCompletedBook(title, author, bookType, pagesNum, notes);
            incrementBooksRead();
            addGlobalXp(50); // Reading grants global XP
        } else {
            addBook(title, author, bookType, pagesNum, notes);
        }

        // Reset form
        setTitle('');
        setAuthor('');
        setPages('');
        setNotes('');
        setActiveTab('history');
    };

    return (
        <Panel variant="glass" className="room-panel bookshelf-panel">
            <div className="panel-header">
                <h2>📚 My Library</h2>
                <button className="panel-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <p className="panel-subtitle">{completedBooks.length} books completed</p>

            <div className="panel-tabs">
                <button
                    className={`panel-tab ${activeTab === 'log' ? 'active' : ''}`}
                    onClick={() => setActiveTab('log')}
                >
                    <Plus size={16} /> Log Read
                </button>
                <button
                    className={`panel-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <List size={16} /> History
                </button>
            </div>

            <div className="panel-content-scrollable">
                {activeTab === 'log' ? (
                    <form className="log-form" onSubmit={handleLogBook}>
                        <div className="form-group">
                            <label>Book Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. The Hobbit"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Author *</label>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="e.g. J.R.R. Tolkien"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Pages / Minutes Read</label>
                            <input
                                type="number"
                                value={pages}
                                onChange={(e) => setPages(e.target.value)}
                                placeholder="e.g. 300"
                            />
                        </div>
                        <div className="form-group">
                            <label>Book Type</label>
                            <select
                                value={bookType}
                                onChange={(e) => setBookType(coerceBookType(e.target.value))}
                            >
                                {BOOK_TYPES.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Key takeaways or thoughts..."
                                rows={3}
                            />
                        </div>
                        <div className="form-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={(e) => setIsCompleted(e.target.checked)}
                                />
                                Mark as Completed
                            </label>
                        </div>
                        <button type="submit" className="submit-btn full-width">
                            Log Book & Earn XP
                        </button>
                    </form>
                ) : (
                    <div className="book-history-list">
                        {completedBooks.length === 0 ? (
                            <div className="empty-msg">No books logged yet!</div>
                        ) : (
                            completedBooks.map((book) => (
                                <div key={book.id} className="book-history-card">
                                    <div className="book-history-header">
                                        <h4>{book.title}</h4>
                                        {book.isComplete && <Check size={16} className="text-green-400" />}
                                    </div>
                                    <span className="book-author">by {book.author}</span>
                                    <div className="book-meta">
                                        {book.completedAt && (
                                            <span className="book-date">
                                                {dayjs(book.completedAt).format('MMM Do, YYYY')}
                                            </span>
                                        )}
                                        {book.pagesRead !== undefined && book.pagesRead > 0 && (
                                            <span className="book-pages">{book.pagesRead} pages/mins</span>
                                        )}
                                    </div>
                                    {book.notes && (
                                        <p className="book-notes">"{book.notes}"</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
};
