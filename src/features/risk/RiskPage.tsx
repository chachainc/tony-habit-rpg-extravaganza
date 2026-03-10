import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRiskStore, BattleResult, SoldierCard } from '../../store/useRiskStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { Map as MapIcon, Swords, ArrowLeft, Brain, Shield, Pickaxe, Sparkles } from 'lucide-react';
import './RiskPage.css';

export const RiskPage = () => {
    const navigate = useNavigate();
    const risk = useRiskStore();
    const conquest = useConquestStore();
    const strategyStore = useStrategyStore();
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

    let nextUnlockXp = 80;
    if (strategyStore.strategyXp < 15) nextUnlockXp = 15;
    else if (strategyStore.strategyXp < 30) nextUnlockXp = 30;
    else if (strategyStore.strategyXp < 80) nextUnlockXp = 80;
    else nextUnlockXp = 0; // maxed

    useEffect(() => {
        risk.initializeMap();
    }, []);

    const handleAttack = (nodeId: string) => {
        const result = risk.resolveBattle(nodeId);
        if (result) setBattleResult(result);
    };

    const renderCardIcon = (card: SoldierCard) => {
        switch (card) {
            case 'knight': return '⚔️';
            case 'shieldbearer': return '🛡️';
            case 'scout': return '👁️';
            case 'general': return '👑';
            default: return '🃏';
        }
    };

    return (
        <div className="risk-page">
            <div className="risk-header">
                <button className="risk-back" onClick={() => navigate('/combat')}>
                    <ArrowLeft size={24} /> Back
                </button>
                <h1><MapIcon size={24} style={{ display: 'inline', verticalAlign: 'middle' }} /> Risk Mode</h1>
                <div className="risk-stats">
                    <span className="sigils-display" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Brain size={16} />
                        [DEBUG] XP: {strategyStore.strategyXp} {nextUnlockXp > 0 ? `(Next: ${nextUnlockXp})` : '(MAX)'}
                    </span>
                    <span className="sigils-display">🔱 {conquest.sigils} Sigils</span>
                    <span className="army-display">
                        Army: {risk.getUnlockedArmySize()}x(d{risk.getSoldierDiceSides()})
                    </span>
                </div>
            </div>

            <div className="risk-content">
                {/* --- Soldier Cards Panel --- */}
                <div className="risk-cards-panel">
                    <div className="cards-section">
                        <h3>Equipped Cards ({risk.equippedCards.length}/3)</h3>
                        <div className="cards-row">
                            {risk.equippedCards.map((c, i) => (
                                <button key={i} className="soldier-card equipped" onClick={() => risk.unequipCard(c)}>
                                    <span className="card-icon">{renderCardIcon(c)}</span>
                                    <span className="card-name">{c}</span>
                                </button>
                            ))}
                            {risk.equippedCards.length === 0 && <span className="empty-cards">No cards equipped</span>}
                        </div>
                    </div>
                    <div className="cards-section">
                        <h3>Inventory</h3>
                        <div className="cards-row">
                            {risk.inventoryCards.map((c, i) => (
                                <button key={i} className="soldier-card" onClick={() => risk.equipCard(c)}>
                                    <span className="card-icon">{renderCardIcon(c)}</span>
                                    <span className="card-name">{c}</span>
                                </button>
                            ))}
                            <button className="soldier-card buy-btn" onClick={() => {
                                if (conquest.sigils >= 5) {
                                    useConquestStore.setState(s => ({ sigils: s.sigils - 5 }));
                                    const pool: SoldierCard[] = ['knight', 'shieldbearer', 'scout', 'general'];
                                    risk.gainCard(pool[Math.floor(Math.random() * pool.length)]);
                                }
                            }}>
                                ➕ Buy (5 🔱)
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Battle Result Log --- */}
                {battleResult && (
                    <div className={`risk-battle-result ${battleResult.success ? 'victory' : battleResult.partial ? 'partial' : 'defeat'}`}>
                        <h3>{battleResult.success ? 'VICTORY' : battleResult.partial ? 'PARTIAL SUCCESS' : 'DEFEAT'}</h3>
                        <div className="battle-dice">
                            Rolls: {battleResult.rolls.map((r, i) => (
                                <span key={i} className={`die-roll ${r === risk.getSoldierDiceSides() ? 'crit' : ''}`}>[{r}]</span>
                            ))}
                        </div>
                        <p>Total Damage: <strong>{battleResult.totalDamage}</strong> vs Defense: <strong>{battleResult.targetDefense}</strong></p>

                        {battleResult.cardEffectsTriggered.length > 0 && (
                            <div className="battle-triggers">
                                {battleResult.cardEffectsTriggered.map((t, i) => <div key={i} className="trigger-log">{t}</div>)}
                            </div>
                        )}

                        {battleResult.success && battleResult.reward && (
                            <div className="battle-reward">
                                Found Loot: {battleResult.reward === 'sigil' ? '🔱 +1 Sigil' : '🃏 +1 Soldier Card'}
                            </div>
                        )}
                        {!battleResult.success && battleResult.partial && (
                            <div className="battle-attrition">
                                ⚔️ Node defense reduced by 1!
                            </div>
                        )}
                    </div>
                )}

                {/* --- Territory Map --- */}
                <div className="risk-map">
                    {Object.values(risk.mapNodes).map((node) => {
                        const isOwned = node.owner === 'player';
                        const isAttackable = !isOwned && node.neighbors.some(n => risk.mapNodes[n]?.owner === 'player');
                        const isLocked = !isOwned && !isAttackable;

                        let nodeClass = `risk-node ${node.owner}`;
                        if (isAttackable) nodeClass += ' attackable';
                        if (isLocked) nodeClass += ' locked';
                        if (node.trait && node.trait !== 'none') nodeClass += ` trait-${node.trait}`;

                        return (
                            <div key={node.id} className={nodeClass}>
                                <div className="node-header">
                                    <h3>{node.name}</h3>
                                    {node.trait === 'fortified' && <Shield size={16} className="trait-icon fortified" title="Fortified (+2 Def)" />}
                                    {node.trait === 'resource' && <Pickaxe size={16} className="trait-icon resource" title="Resource (Sigil drop)" />}
                                    {node.trait === 'mystic' && <Sparkles size={16} className="trait-icon mystic" title="Mystic (Card drop)" />}
                                </div>
                                <p>DEF: {node.defenseValue}</p>
                                {isAttackable && (
                                    <button className="risk-attack-btn" onClick={() => handleAttack(node.id)}>
                                        <Swords size={16} /> Attack
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
