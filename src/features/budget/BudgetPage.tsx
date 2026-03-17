import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Zap, Plus, Gift, History, PlusCircle, Trash2, TrendingDown } from 'lucide-react';
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

    const progressClass = progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'safe';

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

            {/* Page Header */}
            <div className="budget-header">
                <h1 className="budget-page-title">
                    <DollarSign size={22} className="budget-title-icon" />
                    Weekly Budget
                </h1>
                <p className="budget-subtitle">Track spending to maintain combat power &amp; earn daily gifts.</p>
            </div>

            {/* ── CARD 1: Budget Progress ── */}
            <div className="bp-card">
                <div className="bp-card-header">
                    <div className="bp-card-title">
                        <TrendingDown size={16} className="bp-card-icon" />
                        Budget Progress
                    </div>
                    <span className="bp-spent-label">
                        <span className="bp-spent-val">${totalSpent.toFixed(2)}</span>
                        <span className="bp-spent-sep"> / </span>
                        <span className="bp-budget-total">${weeklyBudget.toFixed(2)}</span>
                    </span>
                </div>

                {/* Progress bar */}
                <div className="bp-progress-track">
                    <motion.div
                        className={`bp-progress-fill bp-fill-${progressClass}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.1, ease: 'easeOut' }}
                    />
                </div>

                <div className="bp-progress-meta">
                    <span className="bp-meta-pct">{progressPercent.toFixed(0)}% spent</span>
                    <span className={`bp-meta-remaining ${progressClass === 'danger' ? 'bp-danger' : ''}`}>
                        ${remaining.toFixed(2)} remaining
                    </span>
                </div>
            </div>

            {/* ── CARDS 2+3: Power Bonus & Daily Gift (side by side) ── */}
            <div className="bp-stats-row">
                {/* Power Bonus */}
                <div className="bp-card bp-stat-card">
                    <div className="bp-stat-icon-wrap bp-icon-gold">
                        <Zap size={18} />
                    </div>
                    <div className="bp-stat-label">Power Bonus</div>
                    <div className="bp-stat-big bp-gold">{powerMultiplier.toFixed(2)}x</div>
                    <div className="bp-stat-sub">Applies to ATK / DEF / MATK</div>
                </div>

                {/* Daily Gift Tier */}
                <div className="bp-card bp-stat-card">
                    <div className="bp-stat-icon-wrap bp-icon-purple">
                        <Gift size={18} />
                    </div>
                    <div className="bp-stat-label">Daily Gift Tier</div>
                    <div className="bp-stat-big bp-purple">Tier {dailyTier?.tier || 0}</div>
                    <div className="bp-stat-sub">
                        {dailyTier?.giftAmount
                            ? `+${dailyTier.giftAmount} ${weeklyGiftType}/day`
                            : 'No daily gift at this tier'}
                    </div>
                </div>
            </div>

            {/* ── CARD 4: Transaction Log ── */}
            <div className="bp-card bp-tx-card">
                <div className="bp-card-header">
                    <div className="bp-card-title">
                        <History size={16} className="bp-card-icon" />
                        Transaction Log
                    </div>
                    <button
                        className={`bp-add-btn ${isAddingTx ? 'bp-add-btn-cancel' : ''}`}
                        onClick={() => setIsAddingTx(!isAddingTx)}
                    >
                        {isAddingTx ? '✕ Cancel' : <><Plus size={14} /> ADD</>}
                    </button>
                </div>

                <div className="bp-card-divider" />

                {/* Add form */}
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

                {/* List */}
                <div className="tx-list">
                    {transactions.length === 0 ? (
                        <div className="tx-empty">
                            <DollarSign size={28} className="tx-empty-icon" />
                            <p>No transactions yet.</p>
                            <p className="tx-empty-sub">Stay disciplined!</p>
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
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
