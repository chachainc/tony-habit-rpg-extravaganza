import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Zap, Plus, Gift, History, PlusCircle, Trash2 } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { useBudgetStore, type Transaction } from '../../store/useBudgetStore';
import './BudgetPage.css';

export const BudgetPage: React.FC = () => {
    const { 
        weeklyBudget, 
        weeklyGiftType, 
        transactions, 
        addTransaction, 
        removeTransaction,
        getTotalSpent, 
        getPowerMultiplier, 
        getDailyGiftTier 
    } = useBudgetStore();

    const [isAddingTx, setIsAddingTx] = useState(false);
    const [txAmount, setTxAmount] = useState('');
    const [txLabel, setTxLabel] = useState('');

    if (!weeklyBudget) {
        return (
            <div className="budget-page-container">
                <Panel variant="glass" padding="lg" className="budget-empty-state">
                    <DollarSign size={48} className="text-muted" />
                    <h2>No Active Budget</h2>
                    <p>Your weekly budget has not been set yet.</p>
                </Panel>
            </div>
        );
    }

    const totalSpent = getTotalSpent();
    const remaining = Math.max(0, weeklyBudget - totalSpent);
    const progressPercent = Math.min(100, (totalSpent / weeklyBudget) * 100);
    const powerMultiplier = getPowerMultiplier();
    const dailyTier = getDailyGiftTier();

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (isNaN(amount) || amount <= 0 || !txLabel.trim()) return;

        addTransaction(amount, txLabel.trim());
        setTxAmount('');
        setTxLabel('');
        setIsAddingTx(false);
    };

    return (
        <div className="budget-page-container fade-in">
            <div className="budget-header">
                <h1 className="text-gold">Weekly Budget</h1>
                <p>Track spending to maintain your combat power and earn daily gifts.</p>
            </div>

            <div className="budget-grid">
                {/* Left Column: Progress & Multipliers */}
                <div className="budget-col">
                    <Panel variant="glass" padding="md" className="budget-card progress-card">
                        <div className="card-header">
                            <h3>Budget Progress</h3>
                            <span className="text-gold">${totalSpent.toFixed(2)} / ${weeklyBudget.toFixed(2)}</span>
                        </div>
                        
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <motion.div 
                                    className={`progress-bar-fill ${progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'safe'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span>$0</span>
                                <span className={remaining === 0 ? 'text-danger' : 'text-muted'}>
                                    ${remaining.toFixed(2)} Remaining
                                </span>
                            </div>
                        </div>
                    </Panel>

                    <Panel variant="glass" padding="md" className="budget-card">
                        <div className="stats-grid">
                            <div className="stat-box">
                                <Zap size={24} className="text-gold stat-icon" />
                                <h4>Power Bonus</h4>
                                <div className="stat-value text-gold">{powerMultiplier.toFixed(2)}x</div>
                                <div className="stat-sub">Applies to ATK/DEF/MATK</div>
                            </div>

                            <div className="stat-box">
                                <Gift size={24} className="text-purple stat-icon" />
                                <h4>Daily Gift Tier</h4>
                                <div className="stat-value text-purple">Tier {dailyTier?.tier || 0}</div>
                                <div className="stat-sub">
                                    {dailyTier?.giftAmount 
                                        ? `+${dailyTier.giftAmount} ${weeklyGiftType}/day` 
                                        : 'No daily gift at this tier'}
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Right Column: Transactions */}
                <div className="budget-col">
                    <Panel variant="glass" padding="md" className="budget-card transaction-card">
                        <div className="card-header">
                            <div className="header-with-icon">
                                <History size={20} className="text-muted" />
                                <h3>Transaction Log</h3>
                            </div>
                            <GachaButton 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setIsAddingTx(!isAddingTx)}
                            >
                                {isAddingTx ? 'Cancel' : <><Plus size={16} /> Add</>}
                            </GachaButton>
                        </div>

                        <AnimatePresence>
                            {isAddingTx && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="add-tx-form"
                                >
                                    <form onSubmit={handleAddTransaction}>
                                        <div className="form-row">
                                            <input
                                                type="text"
                                                placeholder="What did you buy?"
                                                value={txLabel}
                                                onChange={(e) => setTxLabel(e.target.value)}
                                                className="tx-input"
                                                autoFocus
                                            />
                                            <div className="tx-amount-wrapper">
                                                <span className="currency-symbol">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder="0.00"
                                                    value={txAmount}
                                                    onChange={(e) => setTxAmount(e.target.value)}
                                                    className="tx-input amount-input"
                                                />
                                            </div>
                                        </div>
                                        <GachaButton 
                                            variant="primary" 
                                            type="submit" 
                                            disabled={!txLabel || !txAmount}
                                            className="w-full mt-2"
                                        >
                                            <PlusCircle size={16} /> Save Transaction
                                        </GachaButton>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="tx-list">
                            {transactions.length === 0 ? (
                                <div className="tx-empty">
                                    <p>No transactions yet.</p>
                                    <p className="text-muted text-sm">Stay disciplined!</p>
                                </div>
                            ) : (
                                transactions.map((tx: Transaction) => (
                                    <motion.div 
                                        key={tx.id} 
                                        className="tx-item"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <div className="tx-info">
                                            <span className="tx-label">{tx.label}</span>
                                            <span className="tx-date">{tx.date}</span>
                                        </div>
                                        <div className="tx-right">
                                            <span className="tx-value">-${tx.amount.toFixed(2)}</span>
                                            <button 
                                                className="tx-delete-btn"
                                                onClick={() => removeTransaction(tx.id)}
                                                title="Remove Transaction"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};
