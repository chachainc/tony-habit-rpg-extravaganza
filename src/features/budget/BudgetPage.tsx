import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, History, PlusCircle, Trash2, TrendingDown, Flame, Clock } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { useBudgetStore, BUDGET_CATEGORIES, type Transaction, type BudgetCategory } from '../../store/useBudgetStore';
import { useToastStore } from '../../components/ui/Toast';
import budgetBg from '../../assets/budget_bg.jpg';
import './BudgetPage.css';

export const BudgetPage: React.FC = () => {
    const {
        budget,
        transactions,
        addTransaction,
        removeTransaction,
        getTotalSpent,
        weeklyStreak,
        weekHistory,
        getSpentByCategory,
        setForceShowSetup,
        processDailyLogin,
        creditCardResetDay,
        setCreditCardResetDay,
        weeklyGiftType,
    } = useBudgetStore();

    const { addToast } = useToastStore();

    useEffect(() => {
        // Trigger claim check safely once page is loaded
        processDailyLogin();
    }, [processDailyLogin]);

    const [activeTab, setActiveTab] = useState<'budget' | 'history'>('budget');
    // ── Transaction form state ───────────────────────────────────────────────
    const [txAmount, setTxAmount] = useState('');

    // ── No budget guard ──────────────────────────────────────────────────────
    if (!budget) {
        return (
            <div className="budget-page-container">
                <Panel variant="glass" padding="lg" className="budget-empty-state">
                    <DollarSign size={48} className="text-muted" />
                    <h2>No Active Budget</h2>
                    <p>Your weekly budget has not been set yet.</p>
                    <button
                        className="bp-set-budget-btn"
                        onClick={() => setForceShowSetup(true)}
                    >
                        <PlusCircle size={18} />
                        Set Budget Now
                    </button>
                </Panel>

                {weekHistory.length > 0 && (
                    <div className="bp-card bp-history-card">
                        <div className="bp-card-header">
                            <div className="bp-card-title">
                                <History size={16} className="bp-card-icon" />
                                Past Weeks
                            </div>
                            {weeklyStreak > 0 && (
                                <div className="bp-streak-badge">
                                    <Flame size={14} /> {weeklyStreak} week streak
                                </div>
                            )}
                        </div>
                        <HistoryChart history={weekHistory} />
                    </div>
                )}
            </div>
        );
    }

    const totalSpent = getTotalSpent();
    const remaining = Math.max(0, budget.amount - totalSpent);
    const progressPercent = Math.min(100, (totalSpent / budget.amount) * 100);
    const categorySpend = getSpentByCategory();
    const progressClass = progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'safe';

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const amount = parseFloat(txAmount);

        // Validate with user-visible feedback
        if (isNaN(amount) || amount <= 0) {
            addToast({ message: 'Please enter a valid amount greater than 0', type: 'error', duration: 2500 });
            return;
        }

        // Save transaction with default simple values
        addTransaction(amount, 'Expense', 'other');

        // Success toast
        addToast({ message: `✅ Logged: $${amount.toFixed(2)}`, type: 'success', duration: 3000 });

        // Reset form
        setTxAmount('');
    };

    const isFormValid = !isNaN(parseFloat(txAmount)) && parseFloat(txAmount) > 0;

    return (
        <div className="budget-tab-wrapper">
            <div className="budget-bg-layer" style={{ backgroundImage: `url(${budgetBg})` }} />
            <div className="budget-bg-overlay" />
            
            <div className="budget-page-container fade-in" style={{ position: 'relative', zIndex: 1 }}>

            <div className="bp-tabs">
                <button
                    className={`bp-tab ${activeTab === 'budget' ? 'active' : ''}`}
                    onClick={() => setActiveTab('budget')}
                >
                    Budget
                </button>
                <button
                    className={`bp-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Money History
                </button>
            </div>

            {/* MAIN BUDGET VIEW */}
            {activeTab === 'budget' && (
                <>
                    {/* ══ 1. HEADER ══════════════════════════════════════════ */}
                    <div className="budget-header" style={{ marginBottom: '1rem' }}>
                        <h1 className="budget-page-title">
                            <DollarSign size={22} className="budget-title-icon" />
                            Weekly Budget
                        </h1>
                    </div>

                    {/* ══ WEEKLY PROGRESS SUMMARY ═══════════════════════════ */}
                    <div className="bp-card bp-progress-card-main" style={{ marginBottom: '1.25rem' }}>
                        <div className="bp-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="bp-card-title">
                                <TrendingDown size={16} className="bp-card-icon" />
                                Spending Progress
                            </div>
                            {weeklyStreak > 0 && (
                                <div className="bp-streak-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    <Flame size={12} fill="currentColor" /> {weeklyStreak} Week Streak
                                </div>
                            )}
                        </div>

                        <div className="bp-progress-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', margin: '1rem 0' }}>
                            <div className="bp-stat-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Spent</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>${totalSpent.toFixed(2)}</div>
                            </div>
                            <div className="bp-stat-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: remaining === 0 && totalSpent > budget.amount ? '#ef4444' : '#10b981', marginTop: '2px' }}>${remaining.toFixed(2)}</div>
                            </div>
                            <div className="bp-stat-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Limit</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#94a3b8', marginTop: '2px' }}>${budget.amount.toFixed(2)}</div>
                            </div>
                            <div className="bp-stat-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Reward Active</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {weeklyGiftType?.replace('_', ' ')}
                                </div>
                            </div>
                        </div>

                        <div className="bp-progress-track" style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', margin: '0.75rem 0 0.5rem 0' }}>
                            <motion.div
                                className={`bp-progress-fill bp-fill-${progressClass}`}
                                style={{ height: '100%', borderRadius: '99px' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.1, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="bp-progress-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>{progressPercent.toFixed(0)}% used</span>
                            {totalSpent > budget.amount ? (
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>Over limit by ${(totalSpent - budget.amount).toFixed(2)}!</span>
                            ) : (
                                <span style={{ color: '#10b981', fontWeight: 700 }}>On track</span>
                            )}
                        </div>
                    </div>

                    {/* ══ CREDIT CARD RESET DAY ═══════════════════════════ */}
                    <div className="bp-card bp-reset-card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} className="bp-card-icon" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Credit Card Bill Reset Day</span>
                        </div>
                        <input 
                            type="number" 
                            min="1" max="31" 
                            value={creditCardResetDay || ''} 
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= 31) {
                                    setCreditCardResetDay(val);
                                } else if (e.target.value === '') {
                                    setCreditCardResetDay(null);
                                }
                            }}
                            placeholder="1-31"
                            className="tx-input"
                            style={{ width: '60px', padding: '0.25rem 0.5rem', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* ══ LOG SPENDING FORM ══════════════════════════════ */}
                    <div className="bp-card bp-form-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', textAlign: 'center', color: '#f1f5f9' }}>
                            Money Spent
                        </div>
                        <form onSubmit={handleAddTransaction} className="add-tx-form-inner" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div className="tx-amount-wrapper" style={{ width: '100%', position: 'relative' }}>
                                <span className="currency-symbol" style={{ position: 'absolute', fontSize: '1.2rem', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="___"
                                    value={txAmount}
                                    onChange={(e) => setTxAmount(e.target.value)}
                                    className="tx-input amount-input"
                                    style={{ width: '100%', fontSize: '1.2rem', padding: '0.85rem 1rem 0.85rem 2.5rem', textAlign: 'center', boxSizing: 'border-box' }}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                className={`bp-log-btn ${isFormValid ? 'bp-log-btn--active' : 'bp-log-btn--disabled'}`}
                                disabled={!isFormValid}
                                style={{ padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700, width: '100%', borderRadius: '8px', cursor: isFormValid ? 'pointer' : 'not-allowed', marginTop: '0.25rem', background: isFormValid ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)', color: isFormValid ? '#fff' : 'rgba(255,255,255,0.3)', border: 'none' }}
                            >
                                Log Spending
                            </button>
                        </form>
                    </div>

                    {/* ══ TRANSACTION LOG ════════════════════════════════ */}
                    <div className="bp-card bp-tx-card">
                        <div className="bp-card-header">
                            <div className="bp-card-title">
                                <History size={16} className="bp-card-icon" />
                                Transaction Log
                            </div>
                        </div>
                        <div className="bp-card-divider" />
                        <div className="tx-list">
                            {transactions.length === 0 ? (
                                <div className="tx-empty">
                                    <p>No transactions yet.</p>
                                </div>
                            ) : (
                                transactions.map((tx: Transaction) => (
                                    <motion.div
                                        key={tx.id}
                                        className="tx-item"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <div className="tx-info" style={{ justifyContent: 'center' }}>
                                            <span className="tx-label" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                                                ${tx.amount.toFixed(2)}
                                            </span>
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
                </>
            )}

            {/* MONEY HISTORY VIEW */}
            {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* ══ HEADER (For History Tab) ══ */}
                    <div className="budget-header" style={{ marginBottom: '0.5rem' }}>
                        <h1 className="budget-page-title">
                            <History size={22} className="budget-title-icon" />
                            Money History
                        </h1>
                        <p className="budget-subtitle">Analytics and past budgets</p>
                    </div>

                    {/* ══ BUDGET PROGRESS ════════════════════════════════ */}
                    <div className="bp-card">
                        <div className="bp-card-header">
                            <div className="bp-card-title">
                                <TrendingDown size={16} className="bp-card-icon" />
                                Budget Progress
                            </div>
                            <span className="bp-spent-label">
                                <span className="bp-spent-val">${totalSpent.toFixed(2)}</span>
                                <span className="bp-spent-sep"> / </span>
                                <span className="bp-budget-total">${budget.amount.toFixed(2)}</span>
                            </span>
                        </div>
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

                    {/* ══ SPENDING BREAKDOWN ═══════════ */}
                    {totalSpent > 0 && (
                        <div className="bp-card bp-cat-card">
                            <div className="bp-card-header">
                                <div className="bp-card-title">📊 Spending Breakdown</div>
                            </div>
                            <div className="bp-cat-bars">
                                {Object.entries(categorySpend)
                                    .filter(([, amt]) => amt > 0)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([cat, amt]) => {
                                        const info = BUDGET_CATEGORIES[cat as BudgetCategory];
                                        const pct = (amt / totalSpent) * 100;
                                        return (
                                            <div key={cat} className="bp-cat-bar-row">
                                                <span className="bp-cat-bar-label">{info.emoji} {info.label}</span>
                                                <div className="bp-cat-bar-track">
                                                    <motion.div
                                                        className="bp-cat-bar-fill"
                                                        style={{ backgroundColor: info.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.8 }}
                                                    />
                                                </div>
                                                <span className="bp-cat-bar-amt">${amt.toFixed(0)}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* ══ PAST WEEKS ═══════════════════════════ */}
                    {weekHistory.length > 0 && (
                        <div className="bp-card bp-history-card">
                            <div className="bp-card-header">
                                <div className="bp-card-title">
                                    <History size={16} className="bp-card-icon" />
                                    Past Weeks
                                </div>
                            </div>
                            <HistoryChart history={weekHistory} />
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};

// ── History Chart Component ──
const HistoryChart: React.FC<{ history: Array<{ weekStart: string; budget: number; spent: number; underBudget: boolean; streakAtTime: number }> }> = ({ history }) => {
    const maxBudget = Math.max(...history.map(w => Math.max(w.budget, w.spent)), 1);

    return (
        <div className="bp-history-chart">
            {history.map((w, i) => {
                const budgetPct = (w.budget / maxBudget) * 100;
                const spentPct = (w.spent / maxBudget) * 100;
                return (
                    <div key={i} className="bp-history-week">
                        <div className="bp-history-bars">
                            <div className="bp-history-bar bp-history-budget" style={{ height: `${budgetPct}%` }} />
                            <div
                                className={`bp-history-bar bp-history-spent ${w.underBudget ? 'bp-history-good' : 'bp-history-bad'}`}
                                style={{ height: `${spentPct}%` }}
                            />
                        </div>
                        <span className="bp-history-label">
                            {w.underBudget ? '✅' : '❌'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
