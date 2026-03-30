import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Heart, Footprints, ShieldAlert } from 'lucide-react';
import { usePetCatchingStore } from '../../store/usePetCatchingStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { usePetStore } from '../../store/usePetStore';
import './PetTown.css';

export const PetTown = ({ onClose }: { onClose: () => void }) => {
    const catchingState = usePetCatchingStore();
    const { gold, spendGold } = useCurrencyStore();
    const petStore = usePetStore();
    const [view, setView] = useState<'town' | 'shop' | 'encounter'>('town');

    // Automatically switch to encounter view if wild pet is present
    useEffect(() => {
        if (catchingState.currentEncounter && view !== 'encounter') {
            setView('encounter');
        } else if (!catchingState.currentEncounter && view === 'encounter') {
            setView('town');
        }
    }, [catchingState.currentEncounter, view]);

    const handleBuyOrb = () => {
        if (gold >= 50) {
            spendGold(50);
            catchingState.buyCaptureOrb(1);
        }
    };

    const handleCatch = async () => {
        const isSuccess = await catchingState.throwOrb();
        if (isSuccess && catchingState.currentEncounter) {
            petStore.addPet(catchingState.currentEncounter.id);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="pt-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="pt-container">
                    <div className="pt-header">
                        <h2>🐾 Pet Town</h2>
                        <button className="pt-close" onClick={onClose}><X size={20} /></button>
                    </div>

                    <div className="pt-stats-bar">
                        <div className="pt-stats-item">
                            <Heart size={16} color="#ef4444" />
                            <span>{catchingState.expeditionHp}/{catchingState.maxExpeditionHp}</span>
                        </div>
                        <div className="pt-stats-item" title="Capture Orbs">
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(to bottom, #ef4444 50%, white 50%)', border: '1px solid #333' }} />
                            <span>{catchingState.captureOrbs}</span>
                        </div>
                        <div className="pt-stats-item">
                            <span style={{color: '#fbbf24'}}>🪙</span> {gold}
                        </div>
                    </div>

                    <div className="pt-content">
                        {/* TOWN HUB */}
                        {view === 'town' && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-menu-layout">
                                <button className="pt-menu-btn" onClick={() => catchingState.enterGrass()}>
                                    <div className="icon"><Footprints size={24} color="#10b981" /></div>
                                    <div className="info">
                                        <h3>Tall Grass</h3>
                                        <p>Encounter wild pets</p>
                                    </div>
                                </button>
                                
                                <button className="pt-menu-btn" onClick={() => setView('shop')}>
                                    <div className="icon"><Store size={24} color="#3b82f6" /></div>
                                    <div className="info">
                                        <h3>Town Shop</h3>
                                        <p>Buy capture supplies</p>
                                    </div>
                                </button>

                                <button className="pt-menu-btn" onClick={() => catchingState.healPlayer()}>
                                    <div className="icon"><Heart size={24} color="#ef4444" /></div>
                                    <div className="info">
                                        <h3>Rest at Inn</h3>
                                        <p>Fully restore Expedition HP (Free)</p>
                                    </div>
                                </button>
                            </motion.div>
                        )}

                        {/* SHOP */}
                        {view === 'shop' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pt-shop-layout">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Shop</span>
                                </div>
                                
                                <button 
                                    className="pt-menu-btn" 
                                    onClick={handleBuyOrb}
                                    style={{ opacity: gold >= 50 ? 1 : 0.5 }}
                                >
                                    <div className="icon">
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(to bottom, #ef4444 50%, white 50%)', border: '1px solid #333' }} />
                                    </div>
                                    <div className="info">
                                        <h3 style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                                            <span>Capture Orb</span>
                                            <span>50g</span>
                                        </h3>
                                        <p>A basic orb used to capture wild pets.</p>
                                    </div>
                                </button>

                                <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                                    <button 
                                        className="pt-action-btn" 
                                        onClick={() => setView('town')}
                                        style={{ width: '100%', background: '#475569' }}
                                    >
                                        Back to Town
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ENCOUNTER */}
                        {view === 'encounter' && catchingState.currentEncounter && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-encounter">
                                <div className="pt-encounter-name">{catchingState.currentEncounter.name}</div>
                                <div className={`pt-encounter-rarity ${catchingState.currentEncounter.rarity}`}>
                                    {catchingState.currentEncounter.rarity}
                                </div>
                                
                                <div className={`pt-wild-icon ${catchingState.isCapturing ? 'shake' : ''}`}>
                                    {catchingState.currentEncounter.icon}
                                </div>

                                <div className="pt-hp-bar-container">
                                    <div className="pt-hp-label">
                                        <span>Wild HP</span>
                                        <span>{catchingState.currentEncounter.currentHp}/{catchingState.currentEncounter.maxHp}</span>
                                    </div>
                                    <div className="pt-hp-bar">
                                        <div 
                                            className="pt-hp-fill" 
                                            style={{ width: `${(catchingState.currentEncounter.currentHp / catchingState.currentEncounter.maxHp) * 100}%` }} 
                                        />
                                    </div>
                                </div>

                                <div className="pt-actions">
                                    <button 
                                        className="pt-action-btn attack" 
                                        onClick={() => catchingState.attack()}
                                        disabled={catchingState.isCapturing || catchingState.currentEncounter.currentHp <= 0}
                                    >
                                        <ShieldAlert size={18} /> Attack
                                    </button>
                                    <button 
                                        className="pt-action-btn catch" 
                                        onClick={handleCatch}
                                        disabled={catchingState.isCapturing || catchingState.captureOrbs <= 0 || catchingState.currentEncounter.currentHp <= 0}
                                    >
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(to bottom, #ef4444 50%, white 50%)', border: '1px solid #333' }} /> 
                                        Catch ({catchingState.captureOrbs})
                                    </button>
                                    <button 
                                        className="pt-action-btn run" 
                                        onClick={() => catchingState.fleeEncounter()}
                                        disabled={catchingState.isCapturing || catchingState.currentEncounter.currentHp <= 0}
                                    >
                                        <Footprints size={18} /> Run away
                                    </button>
                                </div>

                                <div className="pt-logs">
                                    {catchingState.logs.map((log, i) => (
                                        <div key={i} className="pt-log-line">{log}</div>
                                    ))}
                                </div>

                                {/* Caught Overlay */}
                                {catchingState.currentEncounter.currentHp > 0 && 
                                 catchingState.logs.some(l => l.includes("Gotcha!")) && (
                                    <motion.div 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="pt-caught-overlay"
                                    >
                                        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✨</div>
                                        <p>Caught {catchingState.currentEncounter.name}!</p>
                                        <button className="pt-caught-btn" onClick={() => catchingState.fleeEncounter()}>
                                            Back to Town
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
