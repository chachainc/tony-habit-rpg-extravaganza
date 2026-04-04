import { motion } from 'framer-motion';
import { X, Skull, Swords, Shield, Zap, Award, Target, Crown, Flame, Coins } from 'lucide-react';
import { useArenaStatsStore } from '../../store/useArenaStatsStore';
import './WarJournal.css';

const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

export const WarJournal = ({ onClose }: { onClose: () => void }) => {
    const stats = useArenaStatsStore();

    const statCards = [
        { icon: <Skull size={20} />, label: 'Total Kills', value: formatNumber(stats.totalKills), color: '#ef4444' },
        { icon: <Swords size={20} />, label: 'Damage Dealt', value: formatNumber(stats.totalDamageDealt), color: '#f97316' },
        { icon: <Shield size={20} />, label: 'Waves Survived', value: String(stats.totalWavesSurvived), color: '#22c55e' },
        { icon: <Zap size={20} />, label: 'Elites Slain', value: String(stats.totalElitesKilled), color: '#fbbf24' },
        { icon: <Crown size={20} />, label: 'Bosses Defeated', value: String(stats.totalBossesKilled), color: '#a855f7' },
        { icon: <Flame size={20} />, label: 'Combos Landed', value: String(stats.totalCombosLanded), color: '#f472b6' },
        { icon: <Target size={20} />, label: 'Towers Built', value: String(stats.totalTowersBuilt), color: '#60a5fa' },
        { icon: <Award size={20} />, label: 'Defenders Bought', value: String(stats.totalDefendersBought), color: '#34d399' },
    ];

    const currencyStats = [
        { icon: <Coins size={16} color="#fbbf24" style={{ display: 'inline', verticalAlign: 'text-bottom' }} />, label: 'Gold Earned (Lifetime)', value: formatNumber(stats.totalGoldEarned) },
        { icon: '🐌', label: 'Shmeckles Earned (Lifetime)', value: formatNumber(stats.totalShmecklesEarned) },
    ];

    return (
        <motion.div
            className="wj-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="wj-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="wj-header">
                    <h2>📜 War Journal</h2>
                    <p>Your lifetime combat record</p>
                    <button className="wj-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Best Wave Records */}
                <div className="wj-bests">
                    <div className="wj-best-card">
                        <span className="wj-best-label">🏰 TD Best Wave</span>
                        <span className="wj-best-value">{stats.tdBestWave}</span>
                    </div>
                    <div className="wj-best-card">
                        <span className="wj-best-label">⚔️ Storm Best Wave</span>
                        <span className="wj-best-value">{stats.stormBestWave}</span>
                    </div>
                </div>

                {/* Stat Grid */}
                <div className="wj-stats-grid">
                    {statCards.map(s => (
                        <div key={s.label} className="wj-stat-card" style={{ borderColor: s.color + '40' }}>
                            <div className="wj-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                            <div className="wj-stat-info">
                                <div className="wj-stat-value" style={{ color: s.color }}>{s.value}</div>
                                <div className="wj-stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Currency Summary */}
                <div className="wj-currency">
                    {currencyStats.map(c => (
                        <div key={c.label} className="wj-currency-row">
                            <span>{c.icon} {c.label}</span>
                            <span className="wj-currency-val">{c.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
