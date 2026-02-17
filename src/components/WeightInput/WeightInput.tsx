import { useState } from 'react';

import { Scale } from 'lucide-react';
import { Modal } from '../../components/ui';
import './WeightInput.css';

interface WeightInputProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (weight: number) => void;
}

export const WeightInput = ({ isOpen, onClose, onSubmit }: WeightInputProps) => {
    const [weight, setWeight] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const weightNum = parseFloat(weight);
        if (weightNum > 0) {
            onSubmit(weightNum);
            setWeight('');
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Your Weight" size="sm">
            <form onSubmit={handleSubmit} className="weight-input-form">
                <div className="weight-icon-container">
                    <Scale size={48} />
                </div>

                <div className="input-group">
                    <input
                        type="number"
                        step="0.1"
                        placeholder="Enter weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="weight-input"
                        autoFocus
                    />
                    <span className="weight-unit">lbs</span>
                </div>

                <div className="button-group">
                    <button type="button" onClick={onClose} className="btn btn--secondary btn--md">
                        Cancel
                    </button>
                    <button type="submit" disabled={!weight} className="btn btn--primary btn--md">
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    );
};
