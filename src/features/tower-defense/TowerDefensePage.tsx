import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useTowerDefenseStore } from '../../store/useTowerDefenseStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import type { PlacedTower } from '../../store/useTowerDefenseStore';
import { TD_GRID_WIDTH, TD_GRID_HEIGHT, isPath, TD_TOWERS, TD_ENEMIES, TD_MAP_MODIFIERS, TD_WAVE_MODIFIERS, TD_SPECIALIZATIONS, TD_PATH } from '../../data/towerDefense';
import type { TowerType, TowerDef } from '../../data/towerDefense';
import { ArrowLeft, Play, RefreshCw, X, Zap, FastForward, Trophy, Skull, Swords } from 'lucide-react';

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
                    if (owned > 0 || (currStore.balloons ?? 0) >= cost) {
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
    }, [dragState.isDragging, dragState.towerType, td.towers, currStore.balloons]);

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
        if (ownedCount === 0 && (currStore.balloons ?? 0) < cost) return;

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

    const handleSpecialize = (branch: string) => {
        if (!selectedTower) return;
        if (td.specializeTower(selectedTower.id, branch)) {
            setSelectedTower(null);
        }
    };

    const cycleSpeed = () => {
        const next = td.gameSpeed === 1 ? 2 : td.gameSpeed === 2 ? 3 : 1;
        td.setGameSpeed(next as 1 | 2 | 3);
    };

    // Find boss enemies for boss HP bar
    const bossEnemy = td.enemies.find(e => TD_ENEMIES[e.type]?.isBoss);

    // Wave progress
    const totalEnemies = td.totalWaveEnemies;
    const remainingEnemies = td.enemies.length + td.enemyQueue.length;
    const progressPct = totalEnemies > 0 ? ((totalEnemies - remainingEnemies) / totalEnemies) * 100 : 0;

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
        return `🎈 ${TD_TOWERS[type].cost}`;
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
                    <span className="td-chip mana">🎈 {currStore.balloons ?? 0}</span>
                    <span className="td-chip wave">Wave {td.currentWave}</span>
                    <span className="td-chip hp">❤️ {td.baseHealth}</span>
                    {/* Speed toggle */}
                    <button className={`td-chip td-speed-btn speed-${td.gameSpeed}x`} onClick={cycleSpeed}>
                        <FastForward size={12} /> {td.gameSpeed}x
                    </button>
                    {td.currentMapModifier !== 'none' && (
                        <span className="td-chip mod" title={TD_MAP_MODIFIERS[td.currentMapModifier].description}>
                            {TD_MAP_MODIFIERS[td.currentMapModifier].icon}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Wave Progress Bar ── */}
            {td.isWaveActive && totalEnemies > 0 && (
                <div className="td-wave-progress">
                    <div className="td-wave-progress-bar" style={{ width: `${progressPct}%` }} />
                    <span className="td-wave-progress-label">
                        {totalEnemies - remainingEnemies}/{totalEnemies} defeated
                    </span>
                </div>
            )}

            {/* ── Boss Health Bar ── */}
            {bossEnemy && (
                <div className="td-boss-bar">
                    <div className="td-boss-bar-info">
                        <span className="td-boss-icon">{TD_ENEMIES[bossEnemy.type].image ? <img src={TD_ENEMIES[bossEnemy.type].image} alt="boss" style={{height: '100%', objectFit: 'contain', pointerEvents: 'none'}} /> : TD_ENEMIES[bossEnemy.type].icon}</span>
                        <span className="td-boss-name">{TD_ENEMIES[bossEnemy.type].name}</span>
                    </div>
                    <div className="td-boss-bar-track">
                        <div 
                            className="td-boss-bar-fill"
                            style={{ width: `${Math.max(0, (bossEnemy.hp / bossEnemy.maxHp) * 100)}%` }}
                        />
                    </div>
                    <span className="td-boss-hp">{Math.ceil(bossEnemy.hp)} / {bossEnemy.maxHp}</span>
                </div>
            )}

            <div className="td-content">
                <div className="td-controls">
                    {td.baseHealth > 0 && !td.showStats ? (
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
                    ) : td.baseHealth <= 0 && !td.showStats ? (
                        <div className="td-game-over">
                            <h2>Game Over</h2>
                            <div>Wave Reached: {td.currentWave}</div>
                            <button className="td-reset-btn" onClick={td.resetGame}>
                                <RefreshCw size={16} /> Restart
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className={`td-battlefield-wrapper ${td.screenShake ? 'screen-shake' : ''}`}>
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
                            const specBranch = tower.specializationBranch;
                            const specDef = specBranch && TD_SPECIALIZATIONS[tower.type]
                                ? TD_SPECIALIZATIONS[tower.type]![specBranch]
                                : null;
                            return (
                                <div 
                                    key={tower.id}
                                    className={`td-entity tower ${isSelected ? 'selected' : ''} ${specDef ? 'specialized' : ''}`}
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
                                            width: `${def.range * (specDef?.rangeMod ?? 1) * 200}%`,
                                            height: `${def.range * (specDef?.rangeMod ?? 1) * 200}%`,
                                            marginLeft: `calc(50% - ${def.range * (specDef?.rangeMod ?? 1) * 100}%)`,
                                            marginTop: `calc(50% - ${def.range * (specDef?.rangeMod ?? 1) * 100}%)`
                                        }} />
                                    )}
                                    <div className="tower-icon" style={{ backgroundColor: def.color }}>
                                        {specDef ? specDef.icon : def.icon}
                                        <div className="tower-level">{tower.level}</div>
                                    </div>
                                    {specDef && (
                                        <div className="tower-spec-badge">{specDef.name.substring(0, 3)}</div>
                                    )}
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
                            // Burning
                            const isBurning = enemy.dotDps && enemy.dotUntil && Date.now() < enemy.dotUntil;

                            return (
                                <div
                                    key={enemy.id}
                                    className={`td-entity enemy ${Date.now() < enemy.slowedUntil ? 'slowed' : ''} ${isNecro ? 'necro-aura' : ''} ${isBurning ? 'burning' : ''} ${enemy.isElite ? 'elite' : ''}`}
                                    style={{
                                        left: `${(ex / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(ey / TD_GRID_HEIGHT) * 100}%`,
                                        width: `${100 / TD_GRID_WIDTH}%`,
                                        height: `${100 / TD_GRID_HEIGHT}%`,
                                        ...(isFlowBoss ? { width: `${200 / TD_GRID_WIDTH}%`, height: `${200 / TD_GRID_HEIGHT}%`, zIndex: 15 } : {})
                                    }}
                                >
                                    <div className="enemy-sprite">{def.image ? <img src={def.image} alt={def.name} style={{width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none'}} /> : def.icon}</div>
                                    {enemy.isElite && <div className="elite-badge">⚡</div>}
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
                                    className={`td-projectile ${proj.splashRadius ? 'splash' : ''}`}
                                    style={{
                                        left: `${(currentX / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(currentY / TD_GRID_HEIGHT) * 100}%`,
                                        backgroundColor: proj.color
                                    }}
                                />
                            );
                        })}

                        {/* 5. Damage Popups Layer */}
                        {td.damagePopups.map(popup => (
                            <div
                                key={popup.id}
                                className={`td-damage-popup ${popup.isCrit ? 'crit' : ''}`}
                                style={{
                                    left: `${(popup.x / TD_GRID_WIDTH) * 100}%`,
                                    top: `${(popup.y / TD_GRID_HEIGHT) * 100}%`,
                                    opacity: Math.max(0, 1 - popup.age / 1200),
                                    transform: `translate(-50%, ${-popup.age * 0.04}px)`,
                                }}
                            >
                                +{popup.value}🎈
                            </div>
                        ))}

                        {/* 5. Drag Ghost Preview with range */}
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
                            const canAfford = (currStore.balloons ?? 0) >= def.cost;
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

                {/* Tower Upgrade/Sell/Specialize Modal */}
                {selectedTower && (() => {
                    const def = TD_TOWERS[selectedTower.type];
                    const upgCost = Math.floor(def.cost * Math.pow(1.5, selectedTower.level));
                    const refund = Math.floor((def.cost * Math.pow(1.5, selectedTower.level - 1)) * 0.5);
                    const canUpgrade = selectedTower.level < 3 && (currStore.balloons ?? 0) >= upgCost;
                    const specs = TD_SPECIALIZATIONS[selectedTower.type];
                    const canSpecialize = selectedTower.level >= 2 && !selectedTower.specializationBranch && specs;
                    const currentSpec = selectedTower.specializationBranch && specs
                        ? specs[selectedTower.specializationBranch]
                        : null;

                    return (
                        <div className="td-shop-panel upgrade-panel">
                            <div className="panel-header">
                                <h3>{currentSpec ? currentSpec.icon : def.icon} {currentSpec ? currentSpec.name : def.name} (Lv {selectedTower.level})</h3>
                                <button className="close-btn" onClick={() => setSelectedTower(null)}><X size={16}/></button>
                            </div>
                            <div className="tower-stats-preview">
                                <span>Damage: {Math.floor(def.damage * Math.pow(1.5, selectedTower.level - 1) * (currentSpec?.dmgMod ?? 1))} {selectedTower.level < 3 ? `→ ${Math.floor(def.damage * Math.pow(1.5, selectedTower.level) * (currentSpec?.dmgMod ?? 1))}` : ''}</span>
                                <span>Range: {(def.range * (currentSpec?.rangeMod ?? 1)).toFixed(1)}</span>
                                {currentSpec && <span className="spec-badge-inline">⭐ {currentSpec.name}</span>}
                            </div>

                            {/* Specialization branches */}
                            {canSpecialize && (
                                <div className="td-spec-branches">
                                    <div className="td-spec-title">Choose Specialization:</div>
                                    <div className="td-spec-row">
                                        {Object.entries(specs!).map(([branch, spec]) => (
                                            <button
                                                key={branch}
                                                className="td-spec-btn"
                                                onClick={() => handleSpecialize(branch)}
                                            >
                                                <span className="td-spec-icon">{spec.icon}</span>
                                                <span className="td-spec-name">{spec.name}</span>
                                                <span className="td-spec-desc">{spec.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="panel-actions">
                                {selectedTower.level < 3 ? (
                                    <button 
                                        className="action-btn upgrade" 
                                        disabled={!canUpgrade}
                                        onClick={handleUpgrade}
                                    >
                                        Upgrade <br/>(🎈 {upgCost})
                                    </button>
                                ) : (
                                    <button className="action-btn upgrade" disabled>Max Level Reached</button>
                                )}
                                <button className="action-btn sell" onClick={handleSell}>
                                    Sell <br/>(+🎈 {refund})
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* ── Victory / Defeat Stats Modal ── */}
                {td.showStats && (
                    <div className="td-stats-overlay">
                        <div className={`td-stats-modal ${td.baseHealth <= 0 ? 'defeat' : 'victory'}`}>
                            <div className="td-stats-header">
                                {td.baseHealth <= 0 ? (
                                    <>
                                        <Skull size={32} />
                                        <h2>Fort Destroyed!</h2>
                                    </>
                                ) : (
                                    <>
                                        <Trophy size={32} />
                                        <h2>Wave {td.currentWave} Complete!</h2>
                                    </>
                                )}
                            </div>
                            <div className="td-stats-grid">
                                <div className="td-stat-item">
                                    <span className="td-stat-icon"><Swords size={18} /></span>
                                    <span className="td-stat-val">{td.waveStats.kills}</span>
                                    <span className="td-stat-label">Kills</span>
                                </div>
                                <div className="td-stat-item">
                                    <span className="td-stat-icon"><Zap size={18} /></span>
                                    <span className="td-stat-val">{Math.floor(td.waveStats.damageDealt)}</span>
                                    <span className="td-stat-label">Damage</span>
                                </div>
                                <div className="td-stat-item">
                                    <span className="td-stat-icon">🏰</span>
                                    <span className="td-stat-val">{td.waveStats.towersPlaced}</span>
                                    <span className="td-stat-label">Towers</span>
                                </div>
                                <div className="td-stat-item">
                                    <span className="td-stat-icon">🪙</span>
                                    <span className="td-stat-val">+{td.waveStats.goldEarned}</span>
                                    <span className="td-stat-label">Gold</span>
                                </div>
                                <div className="td-stat-item">
                                    <span className="td-stat-icon">🎈</span>
                                    <span className="td-stat-val">+{td.waveStats.shmecklesEarned}</span>
                                    <span className="td-stat-label">Balloons</span>
                                </div>
                                <div className="td-stat-item">
                                    <span className="td-stat-icon">🌊</span>
                                    <span className="td-stat-val">{td.currentWave}</span>
                                    <span className="td-stat-label">Wave</span>
                                </div>
                            </div>
                            <div className="td-stats-actions">
                                {td.baseHealth > 0 ? (
                                    <button className="td-stats-btn primary" onClick={td.dismissStats}>
                                        <Play size={16} /> Continue
                                    </button>
                                ) : (
                                    <button className="td-stats-btn danger" onClick={() => { td.dismissStats(); td.resetGame(); }}>
                                        <RefreshCw size={16} /> Restart
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
