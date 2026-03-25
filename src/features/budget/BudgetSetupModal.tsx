import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, DollarSign } from 'lucide-react';
import { useBudgetStore, type GiftCurrency } from '../../store/useBudgetStore';
import './BudgetSetupModal.css';

type RewardOption = {
    id: GiftCurrency;
    icon: string;
    label: string;
    sublabel: string;
    color: string;
    glow: string;
};

const REWARD_OPTIONS: RewardOption[] = [
    {
        id: 'shmeckles',
        icon: '🐌',
        label: 'Shmeckles',
        sublabel: 'Storm the Fort currency',
        color: '#a78bfa',
        glow: 'rgba(167, 139, 250, 0.25)',
    },
    {
        id: 'balloons',
        icon: '🎈',
        label: 'Balloons',
        sublabel: 'Conquest run resource',
        color: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.25)',
    },
    {
        id: 'sigils',
        icon: '🔱',
        label: 'Sigils',
        sublabel: 'Conquest meta currency',
        color: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.25)',
    },
];

export const BudgetSetupModal: React.FC = () => {
    const { setupWeek, weeklyBudget, forceShowSetup, dismissedPromptWeek, dismissPrompt } = useBudgetStore();
    const [budgetAmount, setBudgetAmount] = useState<string>('');
    const [rewardType, setRewardType] = useState<GiftCurrency | null>(null);

    if (weeklyBudget !== null && !forceShowSetup) return null;

    // Determine current day and week
    const now = new Date();
    const isMonday = now.getDay() === 1; // 0 = Sun, 1 = Mon
    // Get current week string (same logic as store)
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const eDay = eastern.getDay();
    const eDiff = eastern.getDate() - eDay;
    const currentWeekStart = new Date(eastern.setDate(eDiff)).toISOString().split('T')[0];

    // Only show automatically if it's Monday AND we haven't dismissed it this week
    const hasnNotDismissedThisWeek = dismissedPromptWeek !== currentWeekStart;
    const shouldShowAuto = isMonday && hasnNotDismissedThisWeek;

    if (!forceShowSetup && !shouldShowAuto) return null;

    const parsed = parseInt(budgetAmount, 10);
    const canConfirm = !isNaN(parsed) && parsed > 0 && !!rewardType;

    const handleConfirm = () => {
        if (!canConfirm) return;
        setupWeek(parsed, rewardType!);
    };

    const selected = REWARD_OPTIONS.find(o => o.id === rewardType);

    return (
        <AnimatePresence>
            <div className="modal-overlay bsm-overlay">
                <motion.div
                    initial={{ scale: 0.88, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.88, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                    className="bsm-card"
                >
                    {/* Animated background shimmer */}
                    <div className="bsm-shimmer" />

                    {/* Header */}
                    <div className="bsm-header">
                        <motion.div
                            className="bsm-target-icon"
                            animate={{ rotate: [0, 8, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                        >
                            <Target size={28} />
                        </motion.div>
                        <h2 className="bsm-title">Weekly Budget<br />Challenge</h2>
                        {!forceShowSetup && (
                            <button className="bsm-close-btn" onClick={dismissPrompt} aria-label="Dismiss prompt for this week">
                                &times;
                            </button>
                        )}
                        <p className="bsm-desc">
                            Set a spending goal for the week.<br />
                            Stay under budget → earn <strong>up to 1.5× Power</strong> in combat &amp; daily rewards.
                        </p>
                    </div>

                    {/* Budget Input */}
                    <div className="bsm-input-section">
                        <label className="bsm-label">
                            <DollarSign size={14} className="bsm-label-icon" />
                            Weekly Spending Limit
                        </label>
                        <div className="bsm-input-wrap">
                            <span className="bsm-dollar">$</span>
                            <input
                                type="number"
                                min="1"
                                placeholder="100"
                                value={budgetAmount}
                                onChange={(e) => setBudgetAmount(e.target.value)}
                                className="bsm-input"
                            />
                        </div>
                    </div>

                    {/* Reward Selection */}
                    <div className="bsm-reward-section">
                        <label className="bsm-label">
                            <Zap size={14} className="bsm-label-icon" />
                            Choose Your Weekly Reward
                        </label>
                        <div className="bsm-reward-grid">
                            {REWARD_OPTIONS.map(opt => {
                                const isSelected = rewardType === opt.id;
                                return (
                                    <motion.button
                                        key={opt.id}
                                        className={`bsm-reward-card ${isSelected ? 'bsm-selected' : ''}`}
                                        style={{
                                            '--card-color': opt.color,
                                            '--card-glow': opt.glow,
                                        } as React.CSSProperties}
                                        onClick={() => setRewardType(opt.id)}
                                        whileHover={{ scale: 1.05, y: -3 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        <motion.span
                                            className="bsm-reward-emoji"
                                            animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{ duration: 0.4 }}
                                        >
                                            {opt.icon}
                                        </motion.span>
                                        <span className="bsm-reward-label">{opt.label}</span>
                                        <span className="bsm-reward-sub">{opt.sublabel}</span>
                                        {isSelected && (
                                            <motion.div
                                                className="bsm-check"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                ✓
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* CTA */}
                    <motion.button
                        className="bsm-confirm-btn"
                        style={selected ? {
                            '--btn-color': selected.color,
                            '--btn-glow': selected.glow,
                        } as React.CSSProperties : {}}
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                        whileHover={canConfirm ? { scale: 1.03, y: -1 } : {}}
                        whileTap={canConfirm ? { scale: 0.97 } : {}}
                    >
                        <span className="bsm-btn-icon">🎯</span>
                        Begin Challenge
                        {selected && <span className="bsm-btn-badge">{selected.icon}</span>}
                    </motion.button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
