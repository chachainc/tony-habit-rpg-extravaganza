import { useState, useEffect } from 'react';
import { X, Droplets, Sprout } from 'lucide-react';
import { useGardenStore, SEEDS, type HarvestYield } from '../../store/useGardenStore';
import { useGameStore } from '../../store/useGameStore';
import { Panel } from '../../components/ui/Panel';
import { useToastStore } from '../../components/ui/Toast';
import './RoomPanels.css';

export const GardenPanel = ({ onClose }: { onClose: () => void }) => {
    const garden = useGardenStore();
    const { currency, addCurrency } = useGameStore();
    const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
    const [, setTick] = useState(0);

    // Tick every 30s to update growth timers
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const handlePlant = (plotIndex: number) => {
        if (!selectedSeed) return;
        const seed = SEEDS.find(s => s.id === selectedSeed);
        if (!seed || currency < seed.cost) return;
        addCurrency(-seed.cost);
        garden.plantSeed(plotIndex, selectedSeed);
        // Confirmation toast: what was planted and how long until ready
        const h = Math.floor(seed.growTimeMs / 3600000);
        const m = Math.floor((seed.growTimeMs % 3600000) / 60000);
        const timeLabel = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
        useToastStore.getState().addToast({
            type: 'success',
            message: `🌱 ${seed.name} planted in Plot ${plotIndex + 1}! Ready in ${timeLabel}.`,
            duration: 4000,
        });
    };

    const applyHarvestYield = (y: HarvestYield, bonusMult: number) => {
        const scaledValue = Math.floor(y.value * bonusMult);
        if (y.type === 'gold') {
            addCurrency(scaledValue);
            return;
        }
        if (y.type === 'xp') {
            useGameStore.getState().addGlobalXp(scaledValue);
            return;
        }
        import('../../store/useWorkshopStore').then(({ useWorkshopStore }) => {
            useWorkshopStore.getState().addMaterial(y.materialId, scaledValue);
        });
    };

    const handleHarvest = (plotIndex: number) => {
        const result = garden.harvestPlot(plotIndex);
        if (!result) return;
        const bonusMult = result.watered ? 1.25 : 1.0;
        for (const y of result.yields) {
            applyHarvestYield(y, bonusMult);
        }
    };

    const handleUpgrade = () => {
        if (garden.maxPlots >= 6) return;
        const costs = [0, 0, 0, 2000, 4000, 8000];
        const cost = costs[garden.maxPlots] ?? 0;
        if (currency < cost) return;
        addCurrency(-cost);
        garden.upgradePlots();
    };

    const formatTime = (ms: number): string => {
        if (ms <= 0) return 'Ready!';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <Panel variant="glass" className="room-panel garden-panel">
            <div className="panel-header">
                <h2>🌱 Garden</h2>
                <button className="panel-close-btn" onClick={onClose}><X size={24} /></button>
            </div>
            <p className="panel-subtitle">Plant seeds, water daily, harvest rewards</p>

            {/* Harvest ready notification */}
            {(() => {
                const readyCount = garden.plots.slice(0, garden.maxPlots).filter((_, i) => garden.isPlotReady(i)).length;
                return readyCount > 0 ? (
                    <div className="garden-harvest-banner">
                        🌾 {readyCount} plot{readyCount > 1 ? 's' : ''} ready to harvest!
                    </div>
                ) : null;
            })()}
            {/* Seed selector */}
            <div className="garden-seed-selector">
                <span className="seed-selector-label"><Sprout size={14} /> Plant:</span>
                {SEEDS.map(seed => (
                    <button
                        key={seed.id}
                        className={`seed-btn ${selectedSeed === seed.id ? 'seed-btn--selected' : ''} ${currency < seed.cost ? 'seed-btn--locked' : ''}`}
                        onClick={() => setSelectedSeed(seed.id)}
                        title={`${seed.name} — ${seed.cost}g`}
                    >
                        {seed.icon} {seed.cost}g
                    </button>
                ))}
            </div>

            {/* Plot grid */}
            <div className="garden-plots-grid">
                {garden.plots.slice(0, garden.maxPlots).map((plot, i) => {
                    const seed = plot.seedId ? SEEDS.find(s => s.id === plot.seedId) : null;
                    const growPct = garden.getGrowthPercent(i);
                    const isReady = garden.isPlotReady(i);
                    const isEmpty = !plot.seedId;
                    const remaining = seed && plot.plantedAt
                        ? Math.max(0, seed.growTimeMs - (Date.now() - plot.plantedAt))
                        : 0;

                    return (
                        <div key={i} className={`garden-plot ${isReady ? 'garden-plot--ready' : isEmpty ? 'garden-plot--empty' : 'garden-plot--growing'}`}>
                            <div className="plot-header">Plot {i + 1}</div>

                            {isEmpty ? (
                                <button
                                    className="plot-plant-btn"
                                    disabled={!selectedSeed || currency < (SEEDS.find(s => s.id === selectedSeed)?.cost ?? Infinity)}
                                    onClick={() => handlePlant(i)}
                                >
                                    {selectedSeed ? `Plant ${SEEDS.find(s => s.id === selectedSeed)?.icon}` : 'Select seed ↑'}
                                </button>
                            ) : (
                                <>
                                    <div className="plot-seed-icon">{seed?.icon}</div>
                                    <div className="plot-seed-name" style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>{seed?.name}</div>
                                    <div className="plot-growth-bar">
                                        <div className="plot-growth-fill" style={{ width: `${growPct}%` }} />
                                    </div>
                                    <div className="plot-timer">{isReady ? '🌾 Ready!' : `${Math.round(growPct)}% — ${formatTime(remaining)}`}</div>
                                    <div className="plot-actions">
                                        {!isReady && !plot.wateredToday && (
                                            <button className="plot-water-btn" onClick={() => garden.waterPlot(i)}>
                                                <Droplets size={14} /> Water (+25%)
                                            </button>
                                        )}
                                        {plot.wateredToday && !isReady && (
                                            <span className="plot-watered-badge">💧 Watered</span>
                                        )}
                                        {isReady && (
                                            <button className="plot-harvest-btn" onClick={() => handleHarvest(i)}>
                                                🌾 Harvest
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Upgrade */}
            {garden.maxPlots < 6 && (
                <button className="garden-upgrade-btn" onClick={handleUpgrade} disabled={currency < [0,0,0,2000,4000,8000][garden.maxPlots]}>
                    🔓 Unlock Plot {garden.maxPlots + 1} — {[0,0,0,2000,4000,8000][garden.maxPlots]}g
                </button>
            )}

            <div className="garden-stats">
                🌾 Total harvests: {garden.totalHarvests}
            </div>
        </Panel>
    );
};
