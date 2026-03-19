import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useTowerDefenseStore } from '../../store/useTowerDefenseStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import type { PlacedTower } from '../../store/useTowerDefenseStore';
import { TD_GRID_WIDTH, TD_GRID_HEIGHT, isPath, TD_TOWERS, TD_ENEMIES, TD_MAP_MODIFIERS, TD_WAVE_MODIFIERS, TD_PATH } from '../../data/towerDefense';
import type { TowerType, TowerDef } from '../../data/towerDefense';
import { ArrowLeft, Play, RefreshCw, X } from 'lucide-react';

import './TowerDefensePage.css';

export const TowerDefensePage = () => {
    const navigate = useNavigate();
    const td = useTowerDefenseStore();
    const currStore = useCurrencyStore();
    const animationRef = useRef<number>(0);
    const gridRef = useRef<HTMLDivElement>(null);

    // UI State
    const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);

    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        towerType: TowerType | null;
        mouseX: number;
        mouseY: number;
        gridX: number;
        gridY: number;
        isValid: boolean;
    }>({ isDragging: false, towerType: null, mouseX: 0, mouseY: 0, gridX: -1, gridY: -1, isValid: false });

    useEffect(() => {
        let lastTime = performance.now();
        const loop = (time: number) => {
            if (time - lastTime >= 1000 / 60) {
                td.engineTick(Date.now());
                lastTime = time;
            }
            animationRef.current = requestAnimationFrame(loop);
        };
        animationRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!dragState.isDragging || !dragState.towerType) return;
            
            let gX = -1, gY = -1, valid = false;
            if (gridRef.current) {
                const rect = gridRef.current.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    const cellW = rect.width / TD_GRID_WIDTH;
                    const cellH = rect.height / TD_GRID_HEIGHT;
                    gX = Math.floor((e.clientX - rect.left) / cellW);
                    gY = Math.floor((e.clientY - rect.top) / cellH);
                    valid = !isPath(gX, gY) && !td.towers.some(t => t.x === gX && t.y === gY);
                }
            }

            setDragState(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY, gridX: gX, gridY: gY, isValid: valid }));
        };

        const handlePointerUp = () => {
            if (!dragState.isDragging || !dragState.towerType) return;
            
            setDragState(prev => {
                if (prev.isValid && prev.gridX >= 0 && prev.gridY >= 0) {
                    const cost = TD_TOWERS[prev.towerType!].cost;
                    const owned = td.towerInventory[prev.towerType!] ?? 0;
                    if (owned > 0 || currStore.shmeckles >= cost) {
                        td.buildTower(prev.towerType!, prev.gridX, prev.gridY);
                    }
                }
                return { ...prev, isDragging: false, towerType: null };
            });
        };

        if (dragState.isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragState.isDragging, dragState.towerType, td.towers, currStore.shmeckles]);

    const handleTileClick = (x: number, y: number) => {
        if (isPath(x, y)) return;

        const existingTower = td.towers.find(t => t.x === x && t.y === y);
        if (existingTower) {
            setSelectedTower(existingTower);
        } else {
            setSelectedTower(null);
        }
    };

    const handlePointerDownShop = (e: React.PointerEvent, type: TowerType) => {
        document.body.style.userSelect = 'none';
        
        const cost = TD_TOWERS[type].cost;
        const ownedCount = td.towerInventory[type] ?? 0;
        if (ownedCount === 0 && currStore.shmeckles < cost) return;

        setDragState({
            isDragging: true,
            towerType: type,
            mouseX: e.clientX,
            mouseY: e.clientY,
            gridX: -1,
            gridY: -1,
            isValid: false
        });
    };

    useEffect(() => {
        if (!dragState.isDragging) {
            document.body.style.userSelect = '';
        }
    }, [dragState.isDragging]);

    const handleUpgrade = () => {
        if (!selectedTower) return;
        if (td.upgradeTower(selectedTower.id)) {
            setSelectedTower(null);
        }
    };

    const handleSell = () => {
        if (!selectedTower) return;
        td.sellTower(selectedTower.id);
        setSelectedTower(null);
    };

    const renderGrid = () => {
        const cells = [];
        for (let y = 0; y < TD_GRID_HEIGHT; y++) {
            for (let x = 0; x < TD_GRID_WIDTH; x++) {
                const path = isPath(x, y);
                const isDragTarget = dragState.isDragging && dragState.gridX === x && dragState.gridY === y;
                let ghostClass = '';
                if (isDragTarget) {
                    ghostClass = dragState.isValid ? 'drag-valid' : 'drag-invalid';
                }
                
                const isBase = x === 11 && y === 7;
                const isSpawn = x === 0 && y === 2;

                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className={`td-cell ${path ? 'path' : 'buildable'} ${ghostClass}`}
                        onClick={() => handleTileClick(x, y)}
                        style={{
                            gridColumn: x + 1,
                            gridRow: y + 1
                        }}
                    >
                        {/* Fort visual at the base */}
                        {path && isBase && (
                            <div className="fort-visual">
                                <div className="fort-icon">🏰</div>
                                <div className="fort-hp-bar">
                                    <div 
                                        className="fort-hp-fill"
                                        style={{ 
                                            width: `${(td.baseHealth / td.maxBaseHealth) * 100}%`,
                                            backgroundColor: td.baseHealth > 50 ? '#22c55e' : td.baseHealth > 25 ? '#f59e0b' : '#ef4444'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        {path && isSpawn && (
                            <div className="spawn-icon">🚪</div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    };

    // Determine if a given tower type shows "FREE" or a cost
    const getTowerCostLabel = (type: TowerType): string => {
        const owned = td.towerInventory[type] ?? 0;
        if (owned > 0) return `Owned: ${owned}`;
        return `🐌 ${TD_TOWERS[type].cost}`;
    };

    return (
        <div className="td-page">

            {/* ── Compact Header ── */}
            <div className="td-header-compact">
                <button className="td-back" onClick={() => navigate('/combat')}>
                    <ArrowLeft size={18} /> Back
                </button>
                <span className="td-title-compact">
                    🏰 Tower Defense
                </span>
                <div className="td-header-chips">
                    <span className="td-chip mana">🐌 {currStore.shmeckles}</span>
                    <span className="td-chip wave">Wave {td.currentWave}</span>
                    <span className="td-chip hp">❤️ {td.baseHealth}</span>
                    {td.currentMapModifier !== 'none' && (
                        <span className="td-chip mod" title={TD_MAP_MODIFIERS[td.currentMapModifier].description}>
                            {TD_MAP_MODIFIERS[td.currentMapModifier].icon}
                        </span>
                    )}
                </div>
            </div>

            <div className="td-content">
                <div className="td-controls">
                    {td.baseHealth > 0 ? (
                        <>
                            <button
                                className="td-start-btn"
                                disabled={td.isWaveActive}
                                onClick={td.startNextWave}
                            >
                                <Play size={16} /> {td.currentWave === 0 ? "Start First Wave" : "Start Next Wave"}
                            </button>
                            {!td.isWaveActive && td.currentWaveModifier !== 'none' && (
                                <div className="wave-preview-chip">
                                    <span className="wave-icon">{TD_WAVE_MODIFIERS[td.currentWaveModifier].icon}</span>
                                    <div>
                                        <strong>Incoming: {TD_WAVE_MODIFIERS[td.currentWaveModifier].name}</strong>
                                        <p>{TD_WAVE_MODIFIERS[td.currentWaveModifier].description}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="td-game-over">
                            <h2>Game Over</h2>
                            <div>Wave Reached: {td.currentWave}</div>
                            <button className="td-reset-btn" onClick={td.resetGame}>
                                <RefreshCw size={16} /> Restart
                            </button>
                        </div>
                    )}
                </div>

                <div className="td-battlefield-wrapper">
                    <div 
                        className="td-grid-container"
                        ref={gridRef}
                        style={{
                            gridTemplateColumns: `repeat(${TD_GRID_WIDTH}, 1fr)`,
                            gridTemplateRows: `repeat(${TD_GRID_HEIGHT}, 1fr)`
                        }}
                    >
                        {/* 1. Base Grid Layer */}
                        {renderGrid()}

                        {/* 2. Towers Layer */}
                        {td.towers.map(tower => {
                            const def = TD_TOWERS[tower.type];
                            const isSelected = selectedTower?.id === tower.id;
                            return (
                                <div 
                                    key={tower.id}
                                    className={`td-entity tower ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleTileClick(tower.x, tower.y); }}
                                    style={{
                                        left: `${(tower.x / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(tower.y / TD_GRID_HEIGHT) * 100}%`,
                                        width: `${100 / TD_GRID_WIDTH}%`,
                                        height: `${100 / TD_GRID_HEIGHT}%`
                                    }}
                                >
                                    {isSelected && (
                                        <div className="td-range-indicator-grid" style={{
                                            width: `${def.range * 200}%`,
                                            height: `${def.range * 200}%`,
                                            marginLeft: `calc(50% - ${def.range * 100}%)`,
                                            marginTop: `calc(50% - ${def.range * 100}%)`
                                        }} />
                                    )}
                                    <div className="tower-icon" style={{ backgroundColor: def.color }}>
                                        {def.icon}
                                        <div className="tower-level">{tower.level}</div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 3. Enemies Layer */}
                        {td.enemies.map(enemy => {
                            const def = TD_ENEMIES[enemy.type];
                            const p1 = TD_PATH[enemy.pathIndex];
                            const p2 = TD_PATH[enemy.pathIndex + 1] || p1;
                            
                            const ex = p1.x + (p2.x - p1.x) * enemy.progress;
                            const ey = p1.y + (p2.y - p1.y) * enemy.progress;

                            // Flow Boss: larger sprite
                            const isFlowBoss = enemy.type === 'flow_boss';
                            // Necromancer: glow aura
                            const isNecro = def.healsNearby;

                            return (
                                <div
                                    key={enemy.id}
                                    className={`td-entity enemy ${Date.now() < enemy.slowedUntil ? 'slowed' : ''} ${isNecro ? 'necro-aura' : ''}`}
                                    style={{
                                        left: `${(ex / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(ey / TD_GRID_HEIGHT) * 100}%`,
                                        width: `${100 / TD_GRID_WIDTH}%`,
                                        height: `${100 / TD_GRID_HEIGHT}%`,
                                        ...(isFlowBoss ? { width: `${200 / TD_GRID_WIDTH}%`, height: `${200 / TD_GRID_HEIGHT}%`, zIndex: 15 } : {})
                                    }}
                                >
                                    <div className="enemy-sprite">{def.icon}</div>
                                    <div className="enemy-hp-bar-bg">
                                        <div 
                                            className="enemy-hp-bar-fill" 
                                            style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        {/* 4. Projectiles Layer */}
                        {td.projectiles.map(proj => {
                            const currentX = proj.fromX + (proj.toX - proj.fromX) * proj.progress;
                            const currentY = proj.fromY + (proj.toY - proj.fromY) * proj.progress;

                            return (
                                <div 
                                    key={proj.id}
                                    className="td-projectile"
                                    style={{
                                        left: `${(currentX / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(currentY / TD_GRID_HEIGHT) * 100}%`,
                                        backgroundColor: proj.color
                                    }}
                                />
                            );
                        })}

                        {/* 5. Drag Ghost Preview */}
                        {dragState.isDragging && dragState.towerType && dragState.gridX >= 0 && dragState.gridY >= 0 && (
                            <div 
                                className="td-entity tower ghost"
                                style={{
                                    left: `${(dragState.gridX / TD_GRID_WIDTH) * 100}%`,
                                    top: `${(dragState.gridY / TD_GRID_HEIGHT) * 100}%`,
                                    width: `${100 / TD_GRID_WIDTH}%`,
                                    height: `${100 / TD_GRID_HEIGHT}%`,
                                    opacity: 0.8
                                }}
                            >
                                <div className={`td-range-indicator-grid ${dragState.isValid ? 'valid' : 'invalid'}`} style={{
                                    width: `${TD_TOWERS[dragState.towerType].range * 200}%`,
                                    height: `${TD_TOWERS[dragState.towerType].range * 200}%`,
                                    marginLeft: `calc(50% - ${TD_TOWERS[dragState.towerType].range * 100}%)`,
                                    marginTop: `calc(50% - ${TD_TOWERS[dragState.towerType].range * 100}%)`
                                }} />
                                <div className="tower-icon" style={{ backgroundColor: TD_TOWERS[dragState.towerType].color }}>
                                    {TD_TOWERS[dragState.towerType].icon}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Bottom Drawer Shop */}
                <div className="td-drawer-shop">
                    <div className="td-shop-scroll">
                        {(Object.values(TD_TOWERS) as TowerDef[]).map(def => {
                            const ownedCount = td.towerInventory[def.type] ?? 0;
                            const canAfford = currStore.shmeckles >= def.cost;
                            const canDrag = ownedCount > 0 || canAfford;
                            return (
                                <div 
                                    key={def.type}
                                    className={`shop-item ${!canDrag ? 'disabled' : ''} ${ownedCount > 0 ? 'owned' : ''}`}
                                    onPointerDown={(e) => handlePointerDownShop(e, def.type)}
                                >
                                    <div className="shop-item-icon" style={{ borderColor: def.color }}>
                                        {def.icon}
                                    </div>
                                    <div className="shop-item-details">
                                        <div className="shop-item-name">{def.name}</div>
                                        <div className="shop-item-cost">{getTowerCostLabel(def.type)}</div>
                                        <div className="shop-item-desc">{def.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Absolute Drag Visualizer */}
                {dragState.isDragging && dragState.towerType && (
                    <div className="td-floating-ghost" style={{ left: dragState.mouseX, top: dragState.mouseY }}>
                        <div className="tower-icon" style={{ backgroundColor: TD_TOWERS[dragState.towerType].color, transform: 'scale(1.5)' }}>
                            {TD_TOWERS[dragState.towerType].icon}
                        </div>
                    </div>
                )}

                {/* Tower Upgrade/Sell Modal */}
                {selectedTower && (() => {
                    const def = TD_TOWERS[selectedTower.type];
                    const upgCost = Math.floor(def.cost * Math.pow(1.5, selectedTower.level));
                    const refund = Math.floor((def.cost * Math.pow(1.5, selectedTower.level - 1)) * 0.5);
                    const canUpgrade = selectedTower.level < 3 && currStore.shmeckles >= upgCost;

                    return (
                        <div className="td-shop-panel upgrade-panel">
                            <div className="panel-header">
                                <h3>{def.icon} {def.name} (Lv {selectedTower.level})</h3>
                                <button className="close-btn" onClick={() => setSelectedTower(null)}><X size={16}/></button>
                            </div>
                            <div className="tower-stats-preview">
                                <span>Damage: {Math.floor(def.damage * Math.pow(1.5, selectedTower.level - 1))} {selectedTower.level < 3 ? `→ ${Math.floor(def.damage * Math.pow(1.5, selectedTower.level))}` : ''}</span>
                                <span>Range: {def.range}</span>
                            </div>
                            <div className="panel-actions">
                                {selectedTower.level < 3 ? (
                                    <button 
                                        className="action-btn upgrade" 
                                        disabled={!canUpgrade}
                                        onClick={handleUpgrade}
                                    >
                                        Upgrade <br/>(🐌 {upgCost})
                                    </button>
                                ) : (
                                    <button className="action-btn upgrade" disabled>Max Level Reached</button>
                                )}
                                <button className="action-btn sell" onClick={handleSell}>
                                    Sell <br/>(+🐌 {refund})
                                </button>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    );
};
