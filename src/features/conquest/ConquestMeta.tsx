import { motion } from 'framer-motion';
import { Heart, Swords, Ticket, TrendingUp, X } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { CurrencyIcon } from '../../components/ui/CurrencyIcon';
import './Conquest.css';

interface ConquestMetaProps {
    onClose: () => void;
}

export const ConquestMeta = ({ onClose }: ConquestMetaProps) => {
    const conquest = useConquestStore();
    const { metaUpgrades, dailyTickets, runHistory } = conquest;
    const gold = useCurrencyStore(s => s.gold);

    // Cost formulas (match store logic)
    const hpCost = (metaUpgrades.maxHpBonus / 10 + 1) * 500;
    const atkCost = (metaUpgrades.startingAtkBonus + 1) * 750;
    const ticketCost = 1000;

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 200 }}
        >
            <div className="map-modal" style={{ borderColor: '#a78bfa', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ color: '#a78bfa', margin: 0 }}>🏛️ Meta Forge</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', padding: '0.25rem'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Gold Balance */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.5rem', marginBottom: '1rem', background: 'rgba(251,191,36,0.1)',
                    borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)',
                }}>
                    <CurrencyIcon currencyType="gold" size={16} />
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem' }}>{gold}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Gold Available</span>
                </div>

                {/* Upgrades */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {/* Max HP */}
                    <div className="meta-upgrade-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart size={20} color="#22c55e" />
                            <div>
                                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>Max HP Bonus</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Current: +{metaUpgrades.maxHpBonus} HP • Next: +10 HP
                                </div>
                            </div>
                        </div>
                        <button
                            className="meta-buy-btn"
                            disabled={gold < hpCost}
                            onClick={() => { if (useCurrencyStore.getState().spendGold(hpCost)) conquest.buyMetaMaxHp(); }}
                        >
                            🪙 {hpCost}
                        </button>
                    </div>

                    {/* Starting ATK */}
                    <div className="meta-upgrade-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Swords size={20} color="#ef4444" />
                            <div>
                                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>Starting ATK</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Current: +{metaUpgrades.startingAtkBonus * 5}% • Next: +5%
                                </div>
                            </div>
                        </div>
                        <button
                            className="meta-buy-btn"
                            disabled={gold < atkCost}
                            onClick={() => { if (useCurrencyStore.getState().spendGold(atkCost)) conquest.buyMetaAtk(); }}
                        >
                            🪙 {atkCost}
                        </button>
                    </div>

                    {/* Run Ticket */}
                    <div className="meta-upgrade-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ticket size={20} color="#fbbf24" />
                            <div>
                                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>Run Ticket</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Owned: {dailyTickets} • Bypass daily lock
                                </div>
                            </div>
                        </div>
                        <button
                            className="meta-buy-btn"
                            disabled={gold < ticketCost}
                            onClick={() => { if (useCurrencyStore.getState().spendGold(ticketCost)) conquest.buyMetaTicket(); }}
                        >
                            🪙 {ticketCost}
                        </button>
                    </div>
                </div>

                {/* Run History */}
                {runHistory.length > 0 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            <TrendingUp size={16} color="#94a3b8" />
                            <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Run History
                            </span>
                        </div>
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.4rem',
                            maxHeight: '160px', overflowY: 'auto',
                            background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.5rem',
                        }}>
                            {runHistory.slice(0, 10).map((run, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.35rem 0.5rem', borderRadius: 6,
                                    background: run.result === 'victory' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${run.result === 'victory' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                    fontSize: '0.78rem',
                                }}>
                                    <span style={{ color: run.result === 'victory' ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                                        {run.result === 'victory' ? '✅' : '💀'} Floor {run.floor}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                        ⚔️{run.enemiesDefeated} 🗺️{run.nodesVisited}
                                    </span>
                                    <span style={{ color: '#475569', fontSize: '0.65rem' }}>{run.date}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <button
                    className="continue-btn"
                    onClick={onClose}
                    style={{ marginTop: '1rem' }}
                >
                    Close
                </button>
            </div>
        </motion.div>
    );
};
