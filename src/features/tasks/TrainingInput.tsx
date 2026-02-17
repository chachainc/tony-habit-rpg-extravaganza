import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import './TrainingInput.css';

interface TrainingInputProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (selections: string[]) => void;
}

const TRAINING_OPTIONS = [
    { id: 'gym', label: 'Gym - Lift Weights', xp: '+3 Strength XP' },
    { id: 'insanity', label: 'Insanity', xp: '+3 Cardio XP' },
    { id: 'cardio', label: '20-40 Min Cardio', xp: '+3 Cardio XP' },
];

export const TrainingInput = ({ isOpen, onClose, onSubmit }: TrainingInputProps) => {
    const [selections, setSelections] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        setSelections(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = () => {
        if (selections.length > 0) {
            onSubmit(selections);
            setSelections([]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="training-modal-overlay">
            <Card className="training-modal">
                <div className="training-header">
                    <Dumbbell size={32} className="training-icon" />
                    <h2>Log Training Session</h2>
                    <p>Select all that apply for today:</p>
                </div>

                <div className="training-options">
                    {TRAINING_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            className={`training-option ${selections.includes(option.id) ? 'selected' : ''}`}
                            onClick={() => toggleSelection(option.id)}
                        >
                            <div className="option-checkbox">
                                {selections.includes(option.id) && '✓'}
                            </div>
                            <div className="option-info">
                                <span className="option-label">{option.label}</span>
                                <span className="option-xp">{option.xp}</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="training-actions">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={selections.length === 0}
                        className="btn-submit"
                    >
                        Log Session
                    </button>
                </div>
            </Card>
        </div>
    );
};
