import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Gift } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { useBudgetStore, type GiftCurrency } from '../../store/useBudgetStore';
import './BudgetSetupModal.css';

export const BudgetSetupModal: React.FC = () => {
    const { setupWeek, weeklyBudget } = useBudgetStore();
    const [budgetAmount, setBudgetAmount] = useState<string>('');
    const [rewardType, setRewardType] = useState<GiftCurrency | null>(null);

    // If a budget is already active, hide the modal entirely
    if (weeklyBudget !== null) return null;

    const handleConfirm = () => {
        const parsed = parseInt(budgetAmount, 10);
        if (isNaN(parsed) || parsed <= 0 || !rewardType) return;
        setupWeek(parsed, rewardType);
    };

    return (
        <AnimatePresence>
            <div className="modal-overlay">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="modal-content budget-setup-modal"
                >
                    <Panel variant="glass" padding="lg">
                        <div className="budget-setup-header">
                            <Target size={32} className="text-gold" />
                            <h2>Weekly Budget Challenge</h2>
                            <p className="text-muted">
                                Set a financial goal for the week. Staying under budget grants up to 1.5x Power Multiplier in combat and daily rewards.
                            </p>
                        </div>

                        <div className="budget-input-group">
                            <label>Weekly Spending Budget ($)</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                value={budgetAmount}
                                onChange={(e) => setBudgetAmount(e.target.value)}
                                className="budget-input"
                            />
                        </div>

                        <div className="reward-selection-group">
                            <label>Choose Weekly Reward Currency</label>
                            <div className="reward-options">
                                <button
                                    className={`reward-card ${rewardType === 'shmeckles' ? 'selected' : ''}`}
                                    onClick={() => setRewardType('shmeckles')}
                                >
                                    <span className="reward-icon">🍎</span>
                                    <span>Shmeckles</span>
                                </button>
                                <button
                                    className={`reward-card ${rewardType === 'balloons' ? 'selected' : ''}`}
                                    onClick={() => setRewardType('balloons')}
                                >
                                    <span className="reward-icon">🎈</span>
                                    <span>Balloons</span>
                                </button>
                                <button
                                    className={`reward-card ${rewardType === 'sigils' ? 'selected' : ''}`}
                                    onClick={() => setRewardType('sigils')}
                                >
                                    <span className="reward-icon">⚔️</span>
                                    <span>Sigils</span>
                                </button>
                            </div>
                        </div>

                        <div className="budget-setup-actions">
                            <GachaButton
                                variant="primary"
                                size="lg"
                                disabled={!budgetAmount || parseInt(budgetAmount) <= 0 || !rewardType}
                                onClick={handleConfirm}
                            >
                                <Gift size={18} /> Begin Challenge
                            </GachaButton>
                        </div>
                    </Panel>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
