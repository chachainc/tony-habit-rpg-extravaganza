import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRiskStore, type BattleResult, type SoldierCard, REGIONS, type TerritoryNode, type RegionId } from '../../store/useRiskStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { getDetailedCombatBreakdown } from '../../store/useCombatFormulas';
import { Map as MapIcon, Swords, ArrowLeft, Brain, Shield, Pickaxe, Sparkles, TrendingUp, X } from 'lucide-react';
import './RiskPage.css';

export const RiskPage = () => {
    const navigate = useNavigate();
    const risk = useRiskStore();
    const conquest = useConquestStore();
    const strategyStore = useStrategyStore();
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
    const [selectedNode, setSelectedNode] = useState<TerritoryNode | null>(null);
    const [justConqueredRegion, setJustConqueredRegion] = useState<RegionId | null>(null);

    let nextUnlockXp = 80;
    if (strategyStore.strategyXp < 15) nextUnlockXp = 15;
    else if (strategyStore.strategyXp < 30) nextUnlockXp = 30;
    else if (strategyStore.strategyXp < 80) nextUnlockXp = 80;
    else nextUnlockXp = 0; // maxed

    useEffect(() => {
        risk.initializeMap();
    }, []);

    const combatStats = getDetailedCombatBreakdown();
    const heroAtkBonus = Math.floor(combatStats.atk.total / 10);
    const activeRegions = risk.getActiveRegionBonuses();

    const handleAttack = (nodeId: string) => {
        const oldActiveRegions = [...activeRegions];
        const result = risk.resolveBattle(nodeId, heroAtkBonus);
        
        if (result) {
            setBattleResult(result);
            if (result.success) {
                // Update selected node visually to show as player owned in modal
                setSelectedNode(risk.mapNodes[nodeId]);
                
                // Check if a new region was just conquered
                const newActiveRegions = useRiskStore.getState().getActiveRegionBonuses();
                const newRegionsFound = newActiveRegions.filter(r => !oldActiveRegions.includes(r));
                if (newRegionsFound.length > 0) {
                    setJustConqueredRegion(newRegionsFound[0]);
                    setTimeout(() => setJustConqueredRegion(null), 4000);
                }
            }
        }
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
                    <span className="sigils-display" style={{ color: '#ef4444' }}>
                        Hero Bonus: +{heroAtkBonus} Base Damage
                    </span>
                    <span className="sigils-display" style={{ color: '#a855f7' }}>
                        Ascension: {risk.ascensionLevel}
                    </span>
                    {activeRegions.length > 0 && (
                        <span className="sigils-display" style={{ color: '#10b981', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {activeRegions.map(rId => (
                                <span key={rId} title={REGIONS[rId].bonusDescription}>✨ {REGIONS[rId].name}</span>
                            ))}
                        </span>
                    )}
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
                        {battleResult.fortifiedEnemyNodes && battleResult.fortifiedEnemyNodes.length > 0 && (
                            <div className="battle-attrition" style={{ color: '#a855f7', marginTop: '0.5rem' }}>
                                ⚠️ AI Fortified: {battleResult.fortifiedEnemyNodes.map(id => risk.mapNodes[id]?.name).join(', ')} (+1 DEF)
                            </div>
                        )}
                    </div>
                )}

                {/* --- Territory Map --- */}
                <div className="risk-map-container" style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
                     {/* Custom Region Conquered Toast */}
                    {justConqueredRegion && (
                        <div className="region-conquer-toast">
                            <h3>🌍 Region Conquered!</h3>
                            <p>{REGIONS[justConqueredRegion].name} secured.</p>
                            <span>Bonus unlocked: {REGIONS[justConqueredRegion].bonusDescription}</span>
                        </div>
                    )}

                    {(() => {
                        const nodes = Object.values(risk.mapNodes);
                        const allOwned = nodes.length > 0 && nodes.every(n => n.owner === 'player');
                        
                        if (allOwned) {
                            return (
                                <div className="risk-ascend-panel" style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.8)', borderRadius: '12px', zIndex: 10, position: 'relative' }}>
                                    <h2>Map Total Conquest!</h2>
                                    <p>The realms fall under your banner. Ascending resets the map and empowers enemy defenses, but provides higher progression capabilities.</p>
                                    <button 
                                        className="soldier-card buy-btn" 
                                        style={{ margin: '1rem auto', padding: '1rem 2rem', fontSize: '1.2rem' }}
                                        onClick={() => {
                                            useConquestStore.getState().addSigils(10 + (risk.ascensionLevel * 5));
                                            risk.resetAndAscendMap();
                                            setBattleResult(null);
                                            setSelectedNode(null);
                                        }}>
                                        <TrendingUp size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> 
                                        Ascend (Gain {10 + (risk.ascensionLevel * 5)} Sigils)
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div className="scadrosharial-map-wrapper">
                                {/* The actual background map texture goes here */}
                                <div className="scadrosharial-backdrop"></div>
                                
                                {/* Plot all pins as absolutely positioned overlays over the map wrapper */}
                                {nodes.map((node) => {
                                    const isOwned = node.owner === 'player';
                                    const isAttackable = !isOwned && node.neighbors.some(n => risk.mapNodes[n]?.owner === 'player');
                                    // vp1 is always attackable (Start Hold) if unowned realistically, 
                                    // but we made player always own vp1 on init. This backup keeps logic safe if ascension resets
                                    const isLocked = !isOwned && !isAttackable && node.id !== 'vp1'; 

                                    let pinClass = `map-pin ${node.owner}`;
                                    if (isAttackable) pinClass += ' attackable';
                                    if (isLocked) pinClass += ' locked';
                                    if (selectedNode?.id === node.id) pinClass += ' selected';

                                    return (
                                        <button 
                                            key={node.id} 
                                            className={pinClass} 
                                            style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                                            onClick={() => {
                                                setSelectedNode(node);
                                                setBattleResult(null);
                                            }}
                                            title={node.name}
                                        >
                                            <div className="pin-blip"></div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* --- Selected Node Focus Modal --- */}
            {selectedNode && (
                <div className="risk-node-modal">
                    <div className="risk-node-modal-content">
                        <button className="close-btn" onClick={() => setSelectedNode(null)}><X size={20} /></button>
                        
                        <div className="node-header" style={{ marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', color: selectedNode.owner === 'player' ? 'var(--accent-primary)' : 'white' }}>{selectedNode.name}</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {selectedNode.trait === 'fortified' && <span title="Fortified (+2 Def)"><Shield size={20} style={{ color: '#ef4444' }} /></span>}
                                {selectedNode.trait === 'resource' && <span title="Resource (Sigil drop)"><Pickaxe size={20} style={{ color: '#f59e0b' }} /></span>}
                                {selectedNode.trait === 'mystic' && <span title="Mystic (Card drop)"><Sparkles size={20} style={{ color: '#3b82f6' }} /></span>}
                            </div>
                        </div>
                        
                        <div className="node-details">
                            <p><strong>Region:</strong> {REGIONS[selectedNode.region].name}</p>
                            <p><strong>Owner:</strong> <span style={{ textTransform: 'uppercase', color: selectedNode.owner === 'player' ? 'var(--accent-primary)' : 'var(--danger-color)' }}>{selectedNode.owner}</span></p>
                            <p><strong>Defense Value:</strong> {selectedNode.defenseValue} {selectedNode.trait === 'fortified' ? '(+2 from Fortified Trait)' : ''}</p>
                        </div>

                        {selectedNode.owner !== 'player' && (
                            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                                {selectedNode.neighbors.some(n => risk.mapNodes[n]?.owner === 'player') ? (
                                    <button className="risk-attack-btn" onClick={() => handleAttack(selectedNode.id)}>
                                        <Swords size={20} /> Launch Attack
                                    </button>
                                ) : (
                                    <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>You must conquer an adjacent territory to attack this node.</p>
                                )}
                            </div>
                        )}
                        
                        {/* Selected Node Battle Logs */}
                        {battleResult && (
                            <div className={`risk-battle-result modal-result ${battleResult.success ? 'victory' : battleResult.partial ? 'partial' : 'defeat'}`} style={{ marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <h4>{battleResult.success ? 'VICTORY' : battleResult.partial ? 'PARTIAL SUCCESS' : 'DEFEAT'}</h4>
                                <div className="battle-dice" style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '4px 0' }}>
                                    Rolls: {battleResult.rolls.map((r, i) => (
                                        <span key={i} style={{ color: r === risk.getSoldierDiceSides() ? 'var(--accent-gold)' : 'white' }}>[{r}]</span>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.9rem' }}>DMG: <strong>{battleResult.totalDamage}</strong> vs DEF: <strong>{battleResult.targetDefense}</strong></p>

                                {battleResult.cardEffectsTriggered.length > 0 && (
                                    <div className="battle-triggers" style={{ fontSize: '0.8rem', color: '#ccc', margin: '8px 0' }}>
                                        {battleResult.cardEffectsTriggered.map((t, i) => <div key={i}>{t}</div>)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
