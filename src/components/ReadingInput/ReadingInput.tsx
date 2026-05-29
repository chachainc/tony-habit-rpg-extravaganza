import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import './ReadingInput.css';

interface ReadingInputProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
}

export const ReadingInput = ({ isOpen, onClose, onSubmit }: ReadingInputProps) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text.trim());
            setText('');
            onClose();
        }
    };

    const handleSkip = () => {
        setText('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="ri-backdrop" onClick={onClose} />

            {/* Bottom-sheet */}
            <div className="ri-sheet">
                {/* Drag handle */}
                <div className="ri-handle" />

                <div className="ri-header">
                    <BookOpen size={20} className="ri-book-icon" />
                    <span className="ri-title">What did you read today?</span>
                    <button className="ri-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="ri-form">
                    <div className="ri-input-row">
                        <textarea
                            placeholder="e.g. Read Chapter 3 of The Hobbit..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="ri-textarea"
                            autoFocus
                            rows={3}
                        />
                    </div>

                    <div className="ri-actions">
                        <button type="button" onClick={handleSkip} className="ri-btn ri-btn--skip">
                            Skip
                        </button>
                        <button
                            type="submit"
                            disabled={!text.trim()}
                            className="ri-btn ri-btn--save"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
