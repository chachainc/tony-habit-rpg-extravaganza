import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useTowerDefenseStore } from '../../store/useTowerDefenseStore';
import type { PlacedTower } from '../../store/useTowerDefenseStore';
import { TD_GRID_WIDTH, TD_GRID_HEIGHT, isPath, TD_TOWERS, TD_ENEMIES, TD_MAP_MODIFIERS, TD_WAVE_MODIFIERS, TD_PATH } from '../../data/towerDefense';
import type { TowerType, TowerDef } from '../../data/towerDefense';
import { Castle, ArrowLeft, Play, RefreshCw, X } from 'lucide-react';
import './TowerDefensePage.css';

export const TowerDefensePage = () => {
    const navigate = useNavigate();
    const td = useTowerDefenseStore();
    const animationRef = useRef<number>(0);

    // UI State
    const [selectedTile, setSelectedTile] = useState<{ x: number, y: number } | null>(null);
    const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);

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

    const handleTileClick = (x: number, y: number) => {
        if (isPath(x, y)) return;

        const existingTower = td.towers.find(t => t.x === x && t.y === y);
        if (existingTower) {
            setSelectedTower(existingTower);
            setSelectedTile(null);
        } else {
            setSelectedTile({ x, y });
            setSelectedTower(null);
        }
    };

    const handleBuild = (type: TowerType) => {
        if (!selectedTile) return;
        if (td.buildTower(type, selectedTile.x, selectedTile.y)) {
            setSelectedTile(null);
        }
    };

    const handleUpgrade = () => {
        if (!selectedTower) return;
        if (td.upgradeTower(selectedTower.id)) {
            setSelectedTower(null); // Close modal on success
        }
    };

    const handleSell = () => {
        if (!selectedTower) return;
        td.sellTower(selectedTower.id);
        setSelectedTower(null);
    };

    // Calculate grid cell size relative to container (using standard % approach in CSS)
    const renderGrid = () => {
        const cells = [];
        for (let y = 0; y < TD_GRID_HEIGHT; y++) {
            for (let x = 0; x < TD_GRID_WIDTH; x++) {
                const path = isPath(x, y);
                const isSelected = selectedTile?.x === x && selectedTile?.y === y;
                
                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className={`td-cell ${path ? 'path' : 'buildable'} ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleTileClick(x, y)}
                        style={{
                            gridColumn: x + 1,
                            gridRow: y + 1
                        }}
                    >
                        {path && x === 11 && y === 7 && (
                            <div className="base-icon">
                                <Castle size={32} color={td.baseHealth > 0 ? "var(--accent-primary)" : "var(--danger-color)"} />
                            </div>
                        )}
                        {path && x === 0 && y === 2 && (
                            <div className="spawn-icon">🚪</div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    };

    return (
        <div className="td-page">
            <div className="td-header">
                <div className="td-header-left">
                    <button className="td-back" onClick={() => navigate('/combat')}>
                        <ArrowLeft size={24} /> Back
                    </button>
                    <h1><Castle size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> Tower Defense</h1>
                </div>
                <div className="td-stats">
                    <span className="mana-display">🔮 {td.mana} Mana</span>
                    <span className="wave-display">Wave: {td.currentWave}</span>
                    <span className="health-display">❤️ Base HP: {td.baseHealth}/{td.maxBaseHealth}</span>
                    {td.currentMapModifier !== 'none' && (
                        <span className="map-mod-display" title={TD_MAP_MODIFIERS[td.currentMapModifier].description}>
                            {TD_MAP_MODIFIERS[td.currentMapModifier].icon} {TD_MAP_MODIFIERS[td.currentMapModifier].name}
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
                            return (
                                <div 
                                    key={tower.id}
                                    className="td-entity tower"
                                    onClick={(e) => { e.stopPropagation(); handleTileClick(tower.x, tower.y); }}
                                    style={{
                                        left: `${(tower.x / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(tower.y / TD_GRID_HEIGHT) * 100}%`,
                                        width: `${100 / TD_GRID_WIDTH}%`,
                                        height: `${100 / TD_GRID_HEIGHT}%`
                                    }}
                                >
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

                            return (
                                <div
                                    key={enemy.id}
                                    className={`td-entity enemy ${Date.now() < enemy.slowedUntil ? 'slowed' : ''}`}
                                    style={{
                                        left: `${(ex / TD_GRID_WIDTH) * 100}%`,
                                        top: `${(ey / TD_GRID_HEIGHT) * 100}%`,
                                        width: `${100 / TD_GRID_WIDTH}%`,
                                        height: `${100 / TD_GRID_HEIGHT}%`
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
                            const target = td.enemies.find(e => e.id === proj.targetId);
                            if (!target) return null; // Very short lived anyway

                            const p1 = TD_PATH[target.pathIndex];
                            const p2 = TD_PATH[target.pathIndex + 1] || p1;
                            const tx = p1.x + (p2.x - p1.x) * target.progress;
                            const ty = p1.y + (p2.y - p1.y) * target.progress;

                            // Draw a simple line using transform
                            const dx = tx - proj.x;
                            const dy = ty - proj.y;
                            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                            const dist = Math.sqrt(dx*dx + dy*dy);

                            return (
                                <div 
                                    key={proj.id}
                                    className="td-projectile"
                                    style={{
                                        left: `${(proj.x / TD_GRID_WIDTH) * 100 + (50 / TD_GRID_WIDTH)}%`,
                                        top: `${(proj.y / TD_GRID_HEIGHT) * 100 + (50 / TD_GRID_HEIGHT)}%`,
                                        width: `${(dist / TD_GRID_WIDTH) * 100}%`,
                                        transform: `rotate(${angle}deg)`,
                                        backgroundColor: proj.color
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Modals Float over everything */}
                {selectedTile && (
                    <div className="td-shop-panel">
                        <div className="panel-header">
                            <h3>Build Tower</h3>
                            <button className="close-btn" onClick={() => setSelectedTile(null)}><X size={16}/></button>
                        </div>
                        <div className="tower-options">
                            {(Object.values(TD_TOWERS) as TowerDef[]).map(def => (
                                <button 
                                    key={def.type}
                                    className="tower-build-btn"
                                    onClick={() => handleBuild(def.type)}
                                    disabled={td.mana < def.cost}
                                    style={{ borderColor: def.color }}
                                >
                                    <div className="tower-icon-preview">{def.icon}</div>
                                    <div className="tower-info">
                                        <h4>{def.name} <span className="cost">({def.cost} 🔮)</span></h4>
                                        <p>{def.description}</p>
                                        <div className="stats">Dmg: {def.damage} | Rng: {def.range}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTower && (() => {
                    const def = TD_TOWERS[selectedTower.type];
                    const upgCost = Math.floor(def.cost * Math.pow(1.5, selectedTower.level));
                    const refund = Math.floor((def.cost * Math.pow(1.5, selectedTower.level - 1)) * 0.5);
                    const canUpgrade = selectedTower.level < 3 && td.mana >= upgCost;

                    return (
                        <div className="td-shop-panel">
                            <div className="panel-header">
                                <h3>{def.icon} {def.name} Tower (Lv {selectedTower.level})</h3>
                                <button className="close-btn" onClick={() => setSelectedTower(null)}><X size={16}/></button>
                            </div>
                            <div className="panel-actions">
                                {selectedTower.level < 3 ? (
                                    <button 
                                        className="action-btn upgrade" 
                                        disabled={!canUpgrade}
                                        onClick={handleUpgrade}
                                    >
                                        Upgrade (Cost: {upgCost} 🔮)
                                    </button>
                                ) : (
                                    <button className="action-btn upgrade" disabled>Max Level Reached</button>
                                )}
                                <button className="action-btn sell" onClick={handleSell}>
                                    Sell (Refund: {refund} 🔮)
                                </button>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    );
};
