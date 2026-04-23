import { motion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import { useConquestStore } from '../../store/useConquestStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { SoldierCard } from './SoldierCard';


interface ConquestStoreUIProps {
    onClose: () => void;
}

export const ConquestStoreUI = ({ onClose }: ConquestStoreUIProps) => {
    const conquest = useConquestStore();
    const currency = useCurrencyStore();


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
                <div className="cq-store-section">
                        <h3><Swords size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Run Power-Up</h3>
                        <div className="cq-store-item">
                            <div className="cq-store-item-info">
                                <span className="cq-store-item-name">⚔️ Warlord's Edge</span>
                                <span className="cq-store-item-desc">+10% ATK for the duration of this run</span>
                            </div>
                            <button
                                className="cq-store-buy-btn"
                                onClick={() => {
                                    if (currency.gold >= 25) {
                                        currency.spendGold(25);
                                        conquest.addRunBuff({
                                            id: `warlord_edge_${Date.now()}`,
                                            type: 'attackPercent',
                                            label: "Warlord's Edge",
                                            amount: 10,
                                        });
                                    }
                                }}
                                disabled={currency.gold < 25}
                            >
                                💰 25 Gold
                            </button>
                        </div>
                    </div>

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
                                    disabled={conquest.sigils < [0, 100, 200, 400, 700, 1200][conquest.maxTeamSize]}
                                >
                                    🔱 {[0, 100, 200, 400, 700, 1200][conquest.maxTeamSize]} Sigils
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
                                    disabled={conquest.sigils < [150, 300, 500][conquest.barracksLevel]}
                                >
                                    🔱 {[150, 300, 500][conquest.barracksLevel]} Sigils
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
                                    disabled={conquest.sigils < [100, 250, 500][conquest.scoutTowerLevel]}
                                >
                                    🔱 {[100, 250, 500][conquest.scoutTowerLevel]} Sigils
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
                                    disabled={conquest.sigils < [100, 200, 400][conquest.shrineLevel]}
                                >
                                    🔱 {[100, 200, 400][conquest.shrineLevel]} Sigils
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Dice Upgrades */}
                    {conquest.diceCount < 5 && (() => {
                        const diceCosts = [200, 400, 800];
                        const upgradeIdx = conquest.diceCount - 2;
                        const diceUpgradeCost = diceCosts[upgradeIdx] ?? 0;
                        return (
                            <div className="cq-store-section">
                                <h3>🎲 Dice Upgrades</h3>
                                <div className="cq-store-item">
                                    <div className="cq-store-item-info">
                                        <span className="cq-store-item-name">Extra Attack Die ({conquest.diceCount}d6 → {conquest.diceCount + 1}d6)</span>
                                        <span className="cq-store-item-desc">Roll {conquest.diceCount + 1} dice instead of {conquest.diceCount} when attacking. More dice = higher rolls!</span>
                                    </div>
                                    <button
                                        className="cq-store-buy-btn"
                                        onClick={() => conquest.upgradeDice()}
                                        disabled={conquest.sigils < diceUpgradeCost}
                                    >
                                        🔱 {diceUpgradeCost} Sigils
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Soldier Upgrades */}
                    {conquest.soldiers.length > 0 && (
                        <div className="cq-store-section">
                            <h3>⬆️ Upgrade Soldiers</h3>
                            <div className="soldiers-grid">
                                {conquest.soldiers.filter(s => s.rank !== 'Warden').map(soldier => {
                                    const rankCosts: Record<string, number> = {
                                        'Recruit': 50, 'Footman': 120, 'Veteran': 250, 'Captain': 500, 'Elite Guard': 1000
                                    };
                                    const cost = rankCosts[soldier.rank] ?? 0;
                                    return (
                                        <SoldierCard
                                            key={soldier.id}
                                            soldier={soldier}
                                            isStoreView={false}
                                            onAction={() => conquest.upgradeSoldierRank(soldier.id)}
                                            actionLabel={`🔱 ${cost} Promote`}
                                            actionDisabled={conquest.sigils < cost}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
