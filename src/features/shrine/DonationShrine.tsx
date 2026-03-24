import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useEconomyBalanceStore, SHRINE_TIERS } from '../../store/useEconomyBalanceStore';
import './DonationShrine.css';

interface Props {
    onClose: () => void;
}

export const DonationShrine = ({ onClose }: Props) => {
    const { gold } = useCurrencyStore();
    const { spendGold } = useCurrencyStore();
    const { shrineDonations, shrineBonusStats, makeDonation } = useEconomyBalanceStore();
    const { lifetimeGoldEarned, getInflationMultiplier } = useEconomyBalanceStore();
    const [lastDonation, setLastDonation] = useState<{ statPoints: number } | null>(null);

    const handleDonate = (tierIndex: number) => {
        const tier = SHRINE_TIERS[tierIndex];
        if (!tier || gold < tier.cost) return;

        if (spendGold(tier.cost)) {
            const result = makeDonation(tierIndex);
            if (result.success) {
                setLastDonation({ statPoints: result.statPoints });
                setTimeout(() => setLastDonation(null), 3000);
            }
        }
    };

    const inflationPct = Math.round((1 - getInflationMultiplier()) * 100);

    return (
        <div className="shrine-overlay" onClick={onClose}>
            <motion.div
                className="shrine-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="shrine-header">
                    <h2>⛩️ Donation Shrine</h2>
                    <p>Sacrifice gold to gain permanent power</p>
                    <button className="shrine-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="shrine-balance">🪙 {gold} Gold</div>

                {/* Donation Stats */}
                <div className="shrine-stats-row">
                    <div className="shrine-stat">
                        <span className="shrine-stat-value">{shrineDonations}</span>
                        <span className="shrine-stat-label">Donations</span>
                    </div>
                    <div className="shrine-stat">
                        <span className="shrine-stat-value">+{shrineBonusStats}</span>
                        <span className="shrine-stat-label">Bonus Stats</span>
                    </div>
                    <div className="shrine-stat">
                        <span className="shrine-stat-value">{lifetimeGoldEarned.toLocaleString()}</span>
                        <span className="shrine-stat-label">Lifetime Gold</span>
                    </div>
                </div>

                {/* Inflation Guard indicator */}
                {inflationPct > 0 && (
                    <div className="shrine-inflation">
                        📉 Economy Stabilizer Active: -{inflationPct}% gold rewards
                        <span className="shrine-inflation-hint">(Reduces at {lifetimeGoldEarned.toLocaleString()} lifetime gold)</span>
                    </div>
                )}

                {/* Donation Tiers */}
                <div className="shrine-tiers">
                    {SHRINE_TIERS.map((tier, i) => {
                        const canAfford = gold >= tier.cost;
                        return (
                            <motion.button
                                key={i}
                                className={`shrine-tier ${!canAfford ? 'shrine-tier--locked' : ''}`}
                                whileTap={canAfford ? { scale: 0.95 } : {}}
                                onClick={() => handleDonate(i)}
                                disabled={!canAfford}
                            >
                                <div className="shrine-tier-icon">
                                    {i === 0 ? '🕯️' : i === 1 ? '🔮' : '👑'}
                                </div>
                                <div className="shrine-tier-info">
                                    <div className="shrine-tier-name">{tier.name}</div>
                                    <div className="shrine-tier-reward">
                                        <Sparkles size={12} /> +{tier.statPoints} Stat{tier.statPoints > 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div className="shrine-tier-cost">
                                    {tier.cost.toLocaleString()} 🪙
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Success flash */}
                {lastDonation && (
                    <motion.div
                        className="shrine-success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        ✨ The shrine glows! +{lastDonation.statPoints} stat point{lastDonation.statPoints > 1 ? 's' : ''} gained!
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
