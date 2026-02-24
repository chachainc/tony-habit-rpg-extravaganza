import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import type { SoldierRole } from '../../store/useConquestStore';
import { SoldierCard } from './SoldierCard';

const SOLDIER_NAMES = [
    'Marcus', 'Elena', 'Theron', 'Sybil', 'Aldric', 'Renna',
    'Gareth', 'Lyra', 'Daven', 'Isolde', 'Brecht', 'Kira',
];

interface ConquestStoreUIProps {
    onClose: () => void;
}

export const ConquestStoreUI = ({ onClose }: ConquestStoreUIProps) => {
    const conquest = useConquestStore();

    const roles: SoldierRole[] = ['scout', 'morale', 'siege', 'healer'];

    return (
        <motion.div
            className="conquest-store-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="conquest-store-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="cq-store-header">
                    <h2><Crown size={20} /> Conquest Store</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{conquest.sigils} Sigils</span>
                        <button className="cq-store-close" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="cq-store-body">
                    {/* Recruit Soldiers */}
                    {conquest.soldiers.length < conquest.maxTeamSize && (
                        <div className="cq-store-section">
                            <h3>🗡️ Recruit Soldier (30 Sigils)</h3>
                            <div className="soldiers-grid">
                                {roles.map(role => (
                                    <SoldierCard
                                        key={role}
                                        name={`New ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                                        role={role}
                                        cost={30}
                                        isStoreView={true}
                                        onAction={() => {
                                            const name = SOLDIER_NAMES[Math.floor(Math.random() * SOLDIER_NAMES.length)];
                                            conquest.recruitSoldier(name, role);
                                        }}
                                        actionDisabled={conquest.sigils < 30}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Team Size */}
                    {conquest.maxTeamSize < 6 && (
                        <div className="cq-store-section">
                            <h3>📐 Increase Team Size</h3>
                            <div className="cq-store-item">
                                <div className="cq-store-item-info">
                                    <span className="cq-store-item-name">Expand Roster to {conquest.maxTeamSize + 1}</span>
                                    <span className="cq-store-item-desc">Allow one more soldier in your army</span>
                                </div>
                                <button
                                    className="cq-store-buy-btn"
                                    onClick={() => conquest.upgradeMaxTeamSize()}
                                    disabled={!conquest.upgradeMaxTeamSize}
                                >
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Buildings */}
                    <div className="cq-store-section">
                        <h3>🏗️ Buildings</h3>

                        {conquest.barracksLevel < 3 && (
                            <div className="cq-store-item">
                                <div className="cq-store-item-info">
                                    <span className="cq-store-item-name">🏠 Barracks Lv.{conquest.barracksLevel + 1}</span>
                                    <span className="cq-store-item-desc">Improves soldier training speed</span>
                                </div>
                                <button
                                    className="cq-store-buy-btn"
                                    onClick={() => conquest.upgradeBarracks()}
                                >
                                    Upgrade
                                </button>
                            </div>
                        )}

                        {conquest.scoutTowerLevel < 3 && (
                            <div className="cq-store-item">
                                <div className="cq-store-item-info">
                                    <span className="cq-store-item-name">🔭 Scout Tower Lv.{conquest.scoutTowerLevel + 1}</span>
                                    <span className="cq-store-item-desc">+1 Recon Modifier per level</span>
                                </div>
                                <button
                                    className="cq-store-buy-btn"
                                    onClick={() => conquest.upgradeScoutTower()}
                                >
                                    Upgrade
                                </button>
                            </div>
                        )}

                        {conquest.shrineLevel < 3 && (
                            <div className="cq-store-item">
                                <div className="cq-store-item-info">
                                    <span className="cq-store-item-name">⛩️ Shrine Lv.{conquest.shrineLevel + 1}</span>
                                    <span className="cq-store-item-desc">Improves morale recovery</span>
                                </div>
                                <button
                                    className="cq-store-buy-btn"
                                    onClick={() => conquest.upgradeShrine()}
                                >
                                    Upgrade
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Soldier Upgrades */}
                    {conquest.soldiers.length > 0 && (
                        <div className="cq-store-section">
                            <h3>⬆️ Upgrade Soldiers</h3>
                            <div className="soldiers-grid">
                                {conquest.soldiers.filter(s => s.rank !== 'Warden').map(soldier => (
                                    <SoldierCard
                                        key={soldier.id}
                                        soldier={soldier}
                                        isStoreView={false}
                                        onAction={() => conquest.upgradeSoldierRank(soldier.id)}
                                        actionLabel="Promote"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
