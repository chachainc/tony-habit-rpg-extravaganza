import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Coins } from 'lucide-react';
import { useGardenStore, SEEDS } from '../../store/useGardenStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useToastStore } from '../../components/ui/Toast';
import { SeedShopModal } from '../marketplace/stores/SeedShopModal';
import { Lock } from 'lucide-react';
import './GardenPanel.css';

type Tool = 'plant' | 'water' | 'harvest';

interface FloatingText {
    id: number;
    text: React.ReactNode;
    x: number;
    y: number;
    type: 'gold' | 'xp' | 'material' | 'reward_box';
}

// ── Seed Selector Modal ──
const SeedModal = ({
    open, onClose, onSelect, gold, isSeedUnlocked, onOpenShop
}: { open: boolean; onClose: () => void; onSelect: (seedId: string) => void; gold: number, isSeedUnlocked: (id: string) => boolean, onOpenShop: (id: string) => void }) => {
    if (!open) return null;
    return (
        <motion.div
            className="garden-seed-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="garden-seed-modal"
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={e => e.stopPropagation()}
            >
                <h3>🌱 Choose a Seed</h3>
                <div className="seed-modal-grid">
                    {SEEDS.map(seed => {
                        const unlocked = isSeedUnlocked(seed.id);
                        const canAfford = gold >= seed.cost;
                        const hrs = Math.floor(seed.growTimeMs / 3600000);
                        
                        const disabled = !unlocked || !canAfford;
                        const isPremium = seed.unlockCost && seed.unlockCost > 0;

                        return (
                            <button
                                key={seed.id}
                                className={`seed-modal-card ${!unlocked ? 'locked' : ''} ${!canAfford && unlocked ? 'disabled' : ''} ${unlocked && isPremium ? 'premium-unlocked' : ''}`}
                                disabled={disabled && unlocked} // Can still click if locked to open shop
                                onClick={() => { 
                                    if (!unlocked) {
                                        onOpenShop(seed.id);
                                    } else {
                                        onSelect(seed.id); 
                                        onClose(); 
                                    }
                                }}
                            >
                                <span className="seed-modal-icon">{seed.icon}</span>
                                <div className="seed-modal-info">
                                    <span className="seed-modal-name">
                                        {seed.name} {!unlocked && <Lock size={12} className="card-lock-icon" />}
                                    </span>
                                    <span className="seed-modal-details">
                                        <span style={{color: '#b8860b', fontWeight: 'bold'}}>{seed.cost} Gold</span> • {hrs}h • Returns{' '}
                                        <span style={{color: '#b8860b', fontWeight: 'bold'}}>{seed.reward.goldReturn} Gold</span>
                                        {seed.reward.boxes > 0 && <span> • +{seed.reward.boxes} Box{seed.reward.boxes > 1 ? 'es' : ''}</span>}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button className="seed-modal-close" onClick={onClose}>Cancel</button>
            </motion.div>
        </motion.div>
    );
};

// ── Info Modal ──
const InfoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    if (!open) return null;
    return (
        <motion.div
            className="garden-seed-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="garden-info-modal"
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={e => e.stopPropagation()}
            >
                <h3>🌻 How It Works</h3>
                <div className="info-steps">
                    <div className="info-step"><span className="info-step-num">1</span> Select <b>Plant</b> tool, then tap an empty plot to sow a seed.</div>
                    <div className="info-step"><span className="info-step-num">2</span> Crops grow through stages: Planted → Sprout → Growing → Harvestable.</div>
                    <div className="info-step"><span className="info-step-num">3</span> Use the <b>Water</b> tool on growing crops daily for a +25% yield bonus!</div>
                    <div className="info-step"><span className="info-step-num">4</span> When crops glow gold, switch to <b>Harvest</b> to collect rewards.</div>
                </div>
                <button className="seed-modal-close" onClick={onClose}>Got it!</button>
            </motion.div>
        </motion.div>
    );
};

// ── Stage Visual Config ──

export const GardenPanel = ({ onClose }: { onClose: () => void }) => {
    const garden = useGardenStore();
    const isSeedUnlocked = useGardenStore(s => s.isSeedUnlocked);
    const currencyStore = useCurrencyStore();
    const gold = currencyStore.gold;
    const { addToast } = useToastStore();
    
    // Seed Shop State
    const [showSeedShop, setShowSeedShop] = useState(false);
    const [shopFocusId, setShopFocusId] = useState<string | undefined>(undefined);

    const [tool, setTool] = useState<Tool>('plant');
    const [seedModal, setSeedModal] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [pendingSeedPlotIdx, setPendingSeedPlotIdx] = useState<number | null>(null);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [popPlots, setPopPlots] = useState<Set<number>>(new Set());
    const [waterPlots, setWaterPlots] = useState<Set<number>>(new Set());
    const [harvestPlots, setHarvestPlots] = useState<Set<number>>(new Set());

    const isProcessingRef = useRef(false);

    const [, setTick] = useState(0);

    // Tick every 15s to update growth stages
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 15000);
        return () => clearInterval(id);
    }, []);


    const addFloat = useCallback((text: React.ReactNode, type: FloatingText['type'], plotIdx: number) => {
        const plotEl = document.querySelector(`.garden-plot-cell[data-idx="${plotIdx}"]`);
        const rect = plotEl?.getBoundingClientRect();
        const id = Date.now() + Math.random();
        setFloatingTexts(prev => [...prev, {
            id, text, type,
            x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            y: rect ? rect.top : window.innerHeight / 2,
        }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1600);
    }, []);

    const handlePlotTap = useCallback((plotIdx: number) => {
        const stage = garden.getPlotStage(plotIdx);

        if (tool === 'plant') {
            if (stage !== 'empty') {
                addToast({ message: 'This plot already has a crop!', type: 'warning' });
                return;
            }
            setPendingSeedPlotIdx(plotIdx);
            setSeedModal(true);
        } else if (tool === 'water') {
            if (stage === 'empty') {
                addToast({ message: 'Nothing to water here!', type: 'warning' });
                return;
            }
            if (stage === 'harvestable') {
                addToast({ message: 'This crop is already ripe!', type: 'info' });
                return;
            }
            if (!garden.isPlotThirsty(plotIdx)) {
                addToast({ message: '💧 Already watered today!', type: 'info' });
                return;
            }
            garden.waterPlot(plotIdx);
            setWaterPlots(prev => new Set(prev).add(plotIdx));
            setTimeout(() => setWaterPlots(prev => { const s = new Set(prev); s.delete(plotIdx); return s; }), 800);
            addToast({ message: '💧 Watered! +25% harvest bonus', type: 'success' });
        } else if (tool === 'harvest') {
            if (stage !== 'harvestable') {
                addToast({ message: stage === 'empty' ? 'Nothing to harvest!' : 'Not ready yet!', type: 'warning' });
                return;
            }
            const result = garden.harvestPlot(plotIdx);
            if (!result) return;
            setHarvestPlots(prev => new Set(prev).add(plotIdx));
            setTimeout(() => setHarvestPlots(prev => { const s = new Set(prev); s.delete(plotIdx); return s; }), 1200);

            const bonusMult = result.watered ? 1.25 : 1.0;
            
            // Handle Gold Return
            const goldAmt = Math.floor(result.reward.goldReturn * bonusMult);
            useCurrencyStore.getState().addGold(goldAmt);
            addFloat(<span>+{goldAmt} <Coins size={12} color="#fbbf24" style={{verticalAlign: 'text-bottom'}}/></span>, 'gold', plotIdx);
            
            // Handle Boxes
            const boxes = Math.floor(result.reward.boxes * bonusMult);
            for (let i = 0; i < boxes; i++) {
                        setTimeout(() => {
                            const roll = Math.random();
                            let rewardAmount = 1;
                            let emoji = '';
                            if (roll < 0.30) {
                                rewardAmount = Math.random() < 0.5 ? 1 : 2;
                                emoji = '🐌'; // Shmeckles
                                useCurrencyStore.getState().addShmeckles(rewardAmount);
                            } else if (roll < 0.60) {
                                rewardAmount = Math.random() < 0.5 ? 1 : 2;
                                emoji = '🎈'; // Balloons
                                useCurrencyStore.getState().addBalloons(rewardAmount);
                            } else if (roll < 0.90) {
                                rewardAmount = Math.random() < 0.5 ? 1 : 2;
                                emoji = '🔱'; // Sigils
                                import('../../store/useConquestStore').then(({ useConquestStore }) => {
                                    useConquestStore.getState().addSigils(rewardAmount);
                                });
                            } else {
                                rewardAmount = 1;
                                emoji = '💎'; // Gem
                                useCurrencyStore.getState().addDiamonds(rewardAmount);
                            }
                            addFloat(`+${rewardAmount} ${emoji}`, 'reward_box', plotIdx);
                        }, i * 300);
                    }
            
            addToast({ message: `🌾 Harvested ${result.seed.name}!${result.watered ? ' (Watered bonus!)' : ''}`, type: 'success', duration: 3000 });
        }
    }, [tool, garden, addFloat, currencyStore, addToast]);

    const handleSeedSelect = useCallback((seedId: string) => {
        if (pendingSeedPlotIdx === null || isProcessingRef.current) return;
        isProcessingRef.current = true;

        const seed = SEEDS.find(s => s.id === seedId);
        if (!seed || gold < seed.cost) {
            addToast({ message: `Not enough gold! Need ${seed?.cost} Gold`, type: 'error' });
            setTimeout(() => { isProcessingRef.current = false; }, 300);
            return;
        }

        const plotIdx = pendingSeedPlotIdx;
        setPendingSeedPlotIdx(null);

        currencyStore.spendGold(seed.cost);
        garden.plantSeed(plotIdx, seedId);
        setPopPlots(prev => new Set(prev).add(plotIdx));
        setTimeout(() => setPopPlots(prev => { const s = new Set(prev); s.delete(plotIdx); return s; }), 600);
        const h = Math.floor(seed.growTimeMs / 3600000);
        addToast({ message: `🌱 Bought & planted ${seed.name} (-${seed.cost} Gold). Ready in ~${h}h.`, type: 'success', duration: 3500 });
        
        setTimeout(() => { isProcessingRef.current = false; }, 300);
    }, [pendingSeedPlotIdx, gold, currencyStore, garden, addToast]);

    const readyCount = garden.plots.slice(0, garden.maxPlots).filter((_, i) => garden.isPlotReady(i)).length;

    return (
        <div className="garden-fullscreen">
            {/* Background */}
            <div className="garden-bg" />

            {/* Top bar */}
            <div className="garden-topbar">
                <span className="garden-topbar-title">Meadow Mist Farm</span>
                <button className="garden-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {/* Resource + info strip */}
            <div className="garden-hud">
                <div className="garden-hud-pill">
                    <span className="garden-hud-gold"><Coins size={14} color="#fbbf24" style={{marginRight: '4px', verticalAlign: 'text-bottom'}}/> {gold}</span>
                    <span className="garden-hud-name">MEADOW MIST FARM</span>
                    <button className="garden-info-btn" onClick={() => setInfoModal(true)}><Info size={16} /></button>
                </div>
            </div>

            {/* Harvest banner */}
            <AnimatePresence>
                {readyCount > 0 && (
                    <motion.div
                        className="garden-harvest-banner"
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    >
                        🌾 {readyCount} crop{readyCount > 1 ? 's' : ''} ready to harvest!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid */}
            <div className="garden-grid-container">
                <div className="garden-grid">
                    {garden.plots.slice(0, garden.maxPlots).map((plot, idx) => {
                        const stage = garden.getPlotStage(idx);
                        const seed = plot.seedId ? SEEDS.find(s => s.id === plot.seedId) : null;
                        const growPct = garden.getGrowthPercent(idx);
                        const thirsty = garden.isPlotThirsty(idx);
                        const isPop = popPlots.has(idx);
                        const isWater = waterPlots.has(idx);
                        const isHarvest = harvestPlots.has(idx);


                        return (
                            <motion.div
                                key={idx}
                                data-idx={idx}
                                className={`garden-plot-cell stage-${stage} ${isPop ? 'pop-anim' : ''} ${isWater ? 'water-anim' : ''} ${isHarvest ? 'harvest-anim' : ''}`}
                                onClick={() => handlePlotTap(idx)}
                                whileHover={{ y: -3, scale: 1.03 }}
                                whileTap={{ scale: 0.95, y: 1 }}
                            >
                                {/* Soil texture lines */}
                                {stage === 'empty' && (
                                    <div className="plot-soil-lines">
                                        <div className="soil-dot" /><div className="soil-dot" />
                                        <div className="soil-dot" /><div className="soil-dot" />
                                    </div>
                                )}

                                {/* Planted: tilled soil + seed mound */}
                                {stage === 'planted' && (
                                    <div className="plot-planted-vis">
                                        <div className="seed-mound" />
                                        <span className="seed-peek">{seed?.icon}</span>
                                    </div>
                                )}

                                {/* Sprout */}
                                {stage === 'sprout' && (
                                    <div className="plot-sprout-vis">
                                        <span className="sprout-icon">🌱</span>
                                    </div>
                                )}

                                {/* Growing */}
                                {stage === 'growing' && (
                                    <div className="plot-growing-vis">
                                        <span className="growing-icon">{seed?.icon || '🌿'}</span>
                                        <div className="growing-leaves" />
                                    </div>
                                )}

                                {/* Harvestable */}
                                {stage === 'harvestable' && seed && (
                                    <div className="plot-harvest-vis">
                                        <span className="harvest-crop-icon">{seed.cropIcon}</span>
                                        <div className="harvest-glow" />
                                        <div className="harvest-sparkles">
                                            <span className="sparkle s1">✦</span>
                                            <span className="sparkle s2">✦</span>
                                            <span className="sparkle s3">✧</span>
                                        </div>
                                        <motion.div
                                            className="harvest-ready-badge"
                                            initial={{ scale: 0 }} animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            Ready!
                                        </motion.div>
                                    </div>
                                )}

                                {/* Thirsty indicator */}
                                {thirsty && stage !== 'empty' && stage !== 'harvestable' && (
                                    <div className="plot-thirsty">
                                        <span className="thirsty-drop">💧</span>
                                    </div>
                                )}

                                {/* Growth bar (when not empty/harvestable) */}
                                {stage !== 'empty' && stage !== 'harvestable' && (
                                    <div className="plot-growth-track">
                                        <div className="plot-growth-fill" style={{ width: `${growPct}%` }} />
                                    </div>
                                )}

                                {/* Water splash effect */}
                                {isWater && (
                                    <div className="water-splash">
                                        <span>💧</span><span>💧</span><span>💧</span>
                                    </div>
                                )}

                                {/* Harvest burst effect */}
                                {isHarvest && <div className="harvest-burst" />}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Tool bar */}
            <div className="garden-toolbar">
                <button
                    className={`garden-tool-btn ${tool === 'plant' ? 'active' : ''}`}
                    onClick={() => setTool('plant')}
                >
                    <span className="tool-icon">📦</span>
                    <span className="tool-label">PLANT</span>
                </button>
                <button
                    className={`garden-tool-btn ${tool === 'water' ? 'active' : ''}`}
                    onClick={() => setTool('water')}
                >
                    <span className="tool-icon">💧</span>
                    <span className="tool-label">WATER</span>
                </button>
                <button
                    className={`garden-tool-btn ${tool === 'harvest' ? 'active' : ''}`}
                    onClick={() => setTool('harvest')}
                >
                    <span className="tool-icon">✋</span>
                    <span className="tool-label">HARVEST</span>
                </button>
            </div>

            {/* Stats */}
            <div className="garden-stats-bar">
                🌾 Total Harvests: {garden.totalHarvests}
            </div>

            {/* Floating reward text */}
            <AnimatePresence>
                {floatingTexts.map(ft => (
                    <motion.div
                        key={ft.id}
                        className={`garden-float-text garden-float--${ft.type}`}
                        style={{ left: ft.x, top: ft.y }}
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -60, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.4 }}
                    >
                        {ft.text}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                <SeedModal
                    open={seedModal}
                    onClose={() => { setSeedModal(false); setPendingSeedPlotIdx(null); }}
                    onSelect={handleSeedSelect}
                    gold={gold}
                    isSeedUnlocked={isSeedUnlocked}
                    onOpenShop={(id) => {
                        setSeedModal(false);
                        setShopFocusId(id);
                        setShowSeedShop(true);
                    }}
                />
                
                {showSeedShop && (
                    <SeedShopModal 
                        onClose={() => setShowSeedShop(false)} 
                        focusedSeedId={shopFocusId}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                <InfoModal open={infoModal} onClose={() => setInfoModal(false)} />
            </AnimatePresence>
        </div>
    );
};
