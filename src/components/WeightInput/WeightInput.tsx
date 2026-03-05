import { useState } from 'react';
import { Scale, X } from 'lucide-react';
import './WeightInput.css';


interface WeightInputProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (weight: number) => void;
    /** If passed, shows "Logged: X lb" inline and offers Edit mode */
    todayWeight?: number | null;
}

export const WeightInput = ({ isOpen, onClose, onSubmit, todayWeight }: WeightInputProps) => {
    const [weight, setWeight] = useState('');
    const [editing, setEditing] = useState(false);

    // Determine whether we're in "view logged" mode
    const hasLogged = todayWeight != null && !editing;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const weightNum = parseFloat(weight);
        if (weightNum > 0) {
            onSubmit(weightNum);
            setWeight('');
            setEditing(false);
            onClose();
        }
    };

    const handleEdit = () => {
        setWeight(todayWeight != null ? String(todayWeight) : '');
        setEditing(true);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="wi-backdrop" onClick={onClose} />

            {/* Bottom-sheet */}
            <div className="wi-sheet">
                {/* Drag handle */}
                <div className="wi-handle" />

                <div className="wi-header">
                    <Scale size={20} className="wi-scale-icon" />
                    <span className="wi-title">Weigh Self</span>
                    <button className="wi-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {hasLogged ? (
                    /* ── Already logged view ── */
                    <div className="wi-logged">
                        <p className="wi-logged__label">Today's weight</p>
                        <p className="wi-logged__value">{todayWeight} <span>lbs</span></p>
                        <button className="wi-edit-btn" onClick={handleEdit}>
                            ✏️ Edit
                        </button>
                    </div>
                ) : (
                    /* ── Input form ── */
                    <form onSubmit={handleSubmit} className="wi-form">
                        <div className="wi-input-row">
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="999"
                                placeholder="0.0"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="wi-input"
                                autoFocus
                                inputMode="decimal"
                            />
                            <span className="wi-unit">lbs</span>
                        </div>

                        <div className="wi-actions">
                            <button type="button" onClick={onClose} className="wi-btn wi-btn--cancel">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!weight || parseFloat(weight) <= 0}
                                className="wi-btn wi-btn--save"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
};
