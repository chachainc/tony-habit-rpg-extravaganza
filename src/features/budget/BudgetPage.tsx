import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, Gift, History, PlusCircle, Trash2, TrendingDown, Flame, Clock } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { SpendingCutscene } from '../../components/ui/SpendingCutscene';
import { useBudgetStore, BUDGET_CATEGORIES, type Transaction, type BudgetCategory } from '../../store/useBudgetStore';
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
        getDailyGiftTier,
        quickPresets,
        usePreset,
        addPreset,
        weeklyStreak,
        getStreakMultiplier,
        weekHistory,
        getSpentByCategory,
        setForceShowSetup,
    } = useBudgetStore();

    // ── Transaction form state ───────────────────────────────────────────────
    const [txAmount, setTxAmount] = useState('');
    const [txLabel, setTxLabel] = useState('');
    const [txCategory, setTxCategory] = useState<BudgetCategory>('other');
    const [saveAsQuickAdd, setSaveAsQuickAdd] = useState(false);

    // ── Cutscene state ───────────────────────────────────────────────────────
    const [showCutscene, setShowCutscene] = useState(false);
    const cutsceneFiring = useRef(false);

    const triggerCutscene = () => {
        if (cutsceneFiring.current) return;
        cutsceneFiring.current = true;
        setShowCutscene(true);
    };

    const dismissCutscene = () => {
        setShowCutscene(false);
        cutsceneFiring.current = false;
    };

    // ── No budget guard ──────────────────────────────────────────────────────
    if (!weeklyBudget) {
        return (
            <div className="budget-page-container">
                <Panel variant="glass" padding="lg" className="budget-empty-state">
                    <DollarSign size={48} className="text-muted" />
                    <h2>No Active Budget</h2>
                    <p>Your weekly budget has not been set yet.</p>
                    <button
                        className="bp-preset-btn bp-preset-add mt-4 mx-auto"
                        onClick={() => setForceShowSetup(true)}
                        style={{ marginTop: '1rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700 }}
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
    const remaining = Math.max(0, weeklyBudget - totalSpent);
    const progressPercent = Math.min(100, (totalSpent / weeklyBudget) * 100);
    const powerMultiplier = getPowerMultiplier();
    const dailyTier = getDailyGiftTier();
    const streakMul = getStreakMultiplier();
    const categorySpend = getSpentByCategory();

    const getDaysUntilReset = () => {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const daysUntilSun = (7 - now.getDay()) % 7;
        return daysUntilSun === 0 ? 7 : daysUntilSun;
    };
    const daysUntilReset = getDaysUntilReset();
    const progressClass = progressPercent >= 100 ? 'danger' : progressPercent >= 80 ? 'warning' : 'safe';

    // ── Handlers ─────────────────────────────────────────────────────────────

    /** Only trigger cutscene for actual outflows (amount > 0 = spending) */
    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (isNaN(amount) || amount <= 0 || !txLabel.trim()) return;

        // Save transaction first — always reliable
        addTransaction(amount, txLabel.trim(), txCategory);

        // Save as Quick Add if requested and no duplicate label exists
        if (saveAsQuickAdd) {
            const isDupe = quickPresets.some(p => p.label.toLowerCase() === txLabel.trim().toLowerCase());
            if (!isDupe) {
                const cat = BUDGET_CATEGORIES[txCategory];
                addPreset({ emoji: cat.emoji, label: txLabel.trim(), amount, category: txCategory });
            }
        }

        // Reset form completely
        setTxAmount('');
        setTxLabel('');
        setTxCategory('other');
        setSaveAsQuickAdd(false);

        // Trigger cutscene only for spending (positive outflow)
        triggerCutscene();
    };

    /** Quick Add preset — also triggers cutscene since presets are always spending */
    const handleUsePreset = (presetId: string) => {
        usePreset(presetId);
        triggerCutscene();
    };

    return (
        <div className="budget-page-container fade-in">

            {/* ══ 1. HEADER SUMMARY ══════════════════════════════════════════ */}
            <div className="budget-header">
                <h1 className="budget-page-title">
                    <DollarSign size={22} className="budget-title-icon" />
                    Weekly Budget
                </h1>
                <p className="budget-subtitle">Track spending to maintain combat power &amp; earn daily gifts.</p>
                <div className="bp-header-meta">
                    <div className="bp-streak-header" style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        <Clock size={13} />
                        <span>Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</span>
                    </div>
                    {weeklyStreak > 0 && (
                        <div className="bp-streak-header">
                            <Flame size={16} className="bp-streak-flame" />
                            <span>{weeklyStreak} Week Streak</span>
                            <span className="bp-streak-mul">{streakMul.toFixed(1)}x chest bonus</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ 2. PRIMARY STATUS ═════════════════════════════════════════ */}

            {/* Budget Progress */}
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

            {/* Power + Gift side by side */}
            <div className="bp-stats-row">
                <div className="bp-card bp-stat-card">
                    <div className="bp-stat-icon-wrap bp-icon-gold">
                        <Zap size={18} />
                    </div>
                    <div className="bp-stat-label">Power Bonus</div>
                    <div className="bp-stat-big bp-gold">{powerMultiplier.toFixed(2)}x</div>
                    <div className="bp-stat-sub">Applies to ATK / DEF / MATK</div>
                </div>

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

            {/* ══ 3. ACTION AREA ════════════════════════════════════════════ */}
            <div className="bp-action-zone">
                <div className="bp-action-zone-label">⚡ Actions</div>

                {/* Quick Add presets */}
                <div className="bp-presets-section">
                    <div className="bp-presets-header">
                        <span className="bp-presets-label">Quick Add</span>
                    </div>
                    <div className="bp-presets-row">
                        {quickPresets.length === 0 && (
                            <span className="bp-presets-empty">No presets yet — save one below!</span>
                        )}
                        {quickPresets.map(p => (
                            <button key={p.id} className="bp-preset-btn" onClick={() => handleUsePreset(p.id)}>
                                <span className="bp-preset-emoji">{p.emoji}</span>
                                <span className="bp-preset-name">{p.label}</span>
                                <span className="bp-preset-amount">${p.amount}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bp-action-divider" />

                {/* Custom Transaction Form */}
                <div className="bp-tx-action-section">
                    <span className="bp-presets-label" style={{ marginBottom: '0.6rem', display: 'block' }}>Add Custom Spending</span>
                    <form onSubmit={handleAddTransaction} className="add-tx-form">
                        <div className="form-row">
                            <input
                                type="text"
                                placeholder="What did you buy?"
                                value={txLabel}
                                onChange={(e) => setTxLabel(e.target.value)}
                                className="tx-input"
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

                        {/* Category selector */}
                        <div className="bp-cat-row">
                            {Object.entries(BUDGET_CATEGORIES).map(([key, cat]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`bp-cat-chip ${txCategory === key ? 'bp-cat-active' : ''}`}
                                    style={{ '--cat-color': cat.color } as React.CSSProperties}
                                    onClick={() => setTxCategory(key as BudgetCategory)}
                                >
                                    {cat.emoji} <span className="bp-cat-chip-label">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Save as Quick Add checkbox */}
                        <label className="bp-save-quick-add">
                            <input
                                type="checkbox"
                                checked={saveAsQuickAdd}
                                onChange={(e) => setSaveAsQuickAdd(e.target.checked)}
                            />
                            <span>Save as Quick Add</span>
                            <span className="bp-save-quick-add-hint">
                                {quickPresets.some(p => p.label.toLowerCase() === txLabel.trim().toLowerCase()) && txLabel.trim()
                                    ? '· already saved'
                                    : ''}
                            </span>
                        </label>

                        <GachaButton
                            variant="primary"
                            type="submit"
                            disabled={!txLabel || !txAmount}
                            className="w-full mt-2"
                        >
                            <PlusCircle size={16} /> Log Spending
                        </GachaButton>
                    </form>
                </div>
            </div>

            {/* ══ 4. REVIEW AREA ════════════════════════════════════════════ */}

            {/* Spending Breakdown */}
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

            {/* Transaction Log */}
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
                            <DollarSign size={28} className="tx-empty-icon" />
                            <p>No transactions yet.</p>
                            <p className="tx-empty-sub">Stay disciplined!</p>
                        </div>
                    ) : (
                        transactions.map((tx: Transaction) => {
                            const catInfo = BUDGET_CATEGORIES[tx.category || 'other'];
                            return (
                                <motion.div
                                    key={tx.id}
                                    className="tx-item"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className="tx-info">
                                        <span className="tx-label">
                                            <span className="tx-cat-emoji" style={{ color: catInfo.color }}>{catInfo.emoji}</span>
                                            {tx.label}
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
                            );
                        })
                    )}
                </div>
            </div>

            {/* Past Weeks */}
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

            {/* ── Spending Cutscene Overlay ── */}
            <SpendingCutscene isVisible={showCutscene} onDismiss={dismissCutscene} />
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
