import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import './CurrencyPopVFX.css';

interface CurrencyPop {
    id: string;
    amount: number;
    type: 'gold' | 'xp' | 'tickets' | 'gems';
}

const CURRENCY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    gold: { icon: '💰', color: '#fbbf24', label: 'Gold' },
    xp: { icon: '✨', color: '#60a5fa', label: 'XP' },
    tickets: { icon: '🎫', color: '#c084fc', label: 'Tickets' },
    gems: { icon: '💎', color: '#f472b6', label: 'Gems' },
};

export const CurrencyPopVFX = () => {
    const [pops, setPops] = useState<CurrencyPop[]>([]);

    useEffect(() => {
        // Listen for custom currency pop events
        const handler = (e: CustomEvent<{ amount: number; type: string }>) => {
            const pop: CurrencyPop = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                amount: e.detail.amount,
                type: e.detail.type as CurrencyPop['type'],
            };
            setPops((prev) => [...prev, pop]);

            // Auto-remove after animation
            setTimeout(() => {
                setPops((prev) => prev.filter((p) => p.id !== pop.id));
            }, 2000);
        };

        window.addEventListener('currency-pop' as any, handler as any);
        return () => window.removeEventListener('currency-pop' as any, handler as any);
    }, []);

    return (
        <div className="currency-pop-container">
            <AnimatePresence>
                {pops.map((pop) => {
                    const config = CURRENCY_CONFIG[pop.type] || CURRENCY_CONFIG.gold;
                    return (
                        <motion.div
                            key={pop.id}
                            className="currency-pop"
                            initial={{ opacity: 0, y: 20, scale: 0.5 }}
                            animate={{ opacity: 1, y: -40, scale: 1 }}
                            exit={{ opacity: 0, y: -80, scale: 0.8 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            style={{ color: config.color }}
                        >
                            <span className="currency-pop-icon">{config.icon}</span>
                            <span className="currency-pop-amount">+{pop.amount}</span>
                            <span className="currency-pop-label">{config.label}</span>

                            {/* Sparkle particles */}
                            {[...Array(6)].map((_, i) => (
                                <motion.span
                                    key={i}
                                    className="currency-sparkle"
                                    style={{ backgroundColor: config.color }}
                                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                    animate={{
                                        opacity: 0,
                                        scale: 0,
                                        x: (Math.random() - 0.5) * 80,
                                        y: (Math.random() - 0.5) * 60 - 20,
                                    }}
                                    transition={{ duration: 1.2, delay: 0.1 + i * 0.05 }}
                                />
                            ))}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

// Helper to trigger a currency pop from anywhere
export const triggerCurrencyPop = (amount: number, type: string) => {
    window.dispatchEvent(
        new CustomEvent('currency-pop', { detail: { amount, type } })
    );
};
