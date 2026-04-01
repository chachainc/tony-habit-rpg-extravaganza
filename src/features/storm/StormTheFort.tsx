import { useEffect, useState, useRef, useCallback } from 'react';
import { Heart, Play, Pause, Inbox } from 'lucide-react';
import { useStormStore, STORM_ENEMY_DEFS, DEFENDER_ABILITIES, getStormWavePreview } from '../../store/useStormStore';
import type { StormEnemyType, DefenderType } from '../../store/useStormStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './StormTheFort.css';

export const StormTheFort = () => {
    const {
        gameState,
        wave,
        fortHp,
        maxFortHp,
        enemies,
        defenders,
        obstacles,
        projectiles,
        upgrades,
        lastWaveRewards,
        hasBoughtFirstCow,
        bestWave,
        comboPopups,
        damagePopups,
        bossWarningActive,
        rallyUntil,
        pauseGame,
        resumeGame,
        gameTick,
        buyDefender,
        buyObstacle,
        buyUpgrade,
        moveDefender,
        activateAbility,
        startNextWave,
        defenderInventory,
        obstacleInventory,
        storeDefender,
        storeObstacle,
        storeAllDefenders,
        storeAllObstacles,
        resetToIdle,
    } = useStormStore();

    const { shmeckles } = useCurrencyStore();
    const [activeTab, setActiveTab] = useState<'deploy' | 'obstacles' | 'upgrades'>('deploy');
    const [showWavePreview, setShowWavePreview] = useState(false);

    // Drag state for moving defenders
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [selectedDefenderId, setSelectedDefenderId] = useState<string | null>(null);
    const battlefieldRef = useRef<HTMLDivElement>(null);
    const storeZoneRef = useRef<HTMLDivElement>(null);

    // Game loop
    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);

    const animate = (time: number) => {
        if (previousTimeRef.current != undefined) {
            const deltaTime = time - previousTimeRef.current;
            gameTick(deltaTime);
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(animate);
        }
        
        if (gameState === 'defeat' || gameState === 'victory') {
            resetToIdle();
        }
        
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            previousTimeRef.current = undefined;
        };
    }, [gameState]);

    // --- Drag-to-move handlers ---
    const handleDefenderPointerDown = useCallback((e: React.PointerEvent, defId: string) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingId(defId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId || !battlefieldRef.current) return;
        const rect = battlefieldRef.current.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        moveDefender(draggingId, xPct, yPct);
    }, [draggingId, moveDefender]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (draggingId && storeZoneRef.current) {
            const rect = storeZoneRef.current.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                 storeDefender(draggingId);
            }
        }
        setDraggingId(null);
    }, [draggingId, storeDefender]);

    // Ability tap handler (only when not dragging)
    const handleDefenderTap = useCallback((defId: string) => {
        if (draggingId) return;
        setSelectedDefenderId(prev => (prev === defId ? null : defId));
    }, [draggingId]);

    // Cost configuration
    const DEFENDER_COSTS: Record<DefenderType, number> = { cow: 5, swordsman: 15, shield: 25, archer: 20, medic: 20 };

    const getUpgradeCost = (key: keyof typeof upgrades) => 50 + (upgrades[key] * 50);

    const handleBuyDefender = (type: DefenderType) => {
        buyDefender(type);
    };

    const handleBuyObstacle = (type: 'barbed_wire' | 'barricade') => {
        const xPos = 60 + Math.random() * 20;
        buyObstacle(type, xPos);
    };

    const handleBuyUpgrade = (key: keyof typeof upgrades) => {
        buyUpgrade(key);
    };

    // Get enemy icon from type (emoji-only)
    const getEnemyIcon = (type: string): string => {
        const def = STORM_ENEMY_DEFS[type as StormEnemyType];
        return def?.icon ?? '👿';
    };

    // Get defender icon
    const getDefenderIcon = (type: string): string => {
        switch (type) {
            case 'cow': return '🐄';
            case 'swordsman': return '⚔️';
            case 'shield': return '🛡️';
            case 'archer': return '🏹';
            case 'medic': return '🩺';
            default: return '⚔️';
        }
    };

    // Rank stars
    const getRankStars = (rank: number): string => {
        if (rank <= 0) return '';
        return '⭐'.repeat(Math.min(rank, 3));
    };

    // Wave preview data
    const wavePreview = showWavePreview ? getStormWavePreview(wave) : null;

    // Boss enemy in current wave
    const bossEnemy = enemies.find(e => STORM_ENEMY_DEFS[e.enemyType]?.isBoss);

    // Rally active check
    const isRallyActive = Date.now() < rallyUntil;

    return (
        <div className="storm-page">
            {/* Header / HUD */}
            <div className="storm-hud">
                <div className="storm-hud-left">
                    <h2>🏰 Storm the Fort</h2>
                    <span className="storm-wave-badge">Wave {wave}</span>
                    {bestWave > 0 && (
                        <span className="storm-best-wave">🏆 Best: {bestWave}</span>
                    )}
                </div>

                <div className="storm-hud-center">
                <div className="storm-fort-health">
                        <Heart size={14} color="#ef4444" fill="#ef4444" />
                        <div className="storm-fort-health-info">
                            <span className="storm-fort-health-label">
                                {Math.max(0, Math.ceil(fortHp))} / {maxFortHp}
                            </span>
                            <div className="storm-fort-health-bar-track">
                                <div
                                    className="storm-fort-health-bar-fill"
                                    style={{
                                        width: `${Math.max(0, (fortHp / maxFortHp) * 100)}%`,
                                        background: fortHp / maxFortHp > 0.5
                                            ? '#22c55e'
                                            : fortHp / maxFortHp > 0.25
                                                ? '#f59e0b'
                                                : '#ef4444',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="storm-hud-right">
                    <div className="storm-shmeckles">
                        🐌 {shmeckles}
                    </div>
                    {gameState === 'playing' ? (
                        <button className="storm-btn icon" onClick={pauseGame}><Pause size={18} /></button>
                    ) : (
                        gameState === 'paused' && <button className="storm-btn icon" onClick={resumeGame}><Play size={18} /></button>
                    )}
                </div>
            </div>

            {/* ── Boss Health Bar ── */}
            {bossEnemy && (
                <div className="storm-boss-bar">
                    <span className="storm-boss-icon">{getEnemyIcon(bossEnemy.type)}</span>
                    <span className="storm-boss-name">{STORM_ENEMY_DEFS[bossEnemy.enemyType]?.name}</span>
                    <div className="storm-boss-bar-track">
                        <div className="storm-boss-bar-fill" style={{ width: `${Math.max(0, (bossEnemy.hp / bossEnemy.maxHp) * 100)}%` }} />
                    </div>
                    <span className="storm-boss-hp">{Math.ceil(bossEnemy.hp)}/{bossEnemy.maxHp}</span>
                </div>
            )}

            {/* Rally Active Indicator */}
            {isRallyActive && (
                <div className="storm-rally-banner">📯 RALLY! +50% Damage!</div>
            )}

            {/* Main Battlefield */}
            <div
                className="storm-battlefield"
                ref={battlefieldRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Background video */}
                <video
                    className="storm-bg-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="/assets/storm-fort/Cows_fighting_goblins_202603180014.mp4"
                />
                {/* Track/path overlay image */}
                <div className="storm-track-overlay" />
                {/* Castle ambient bg on right */}
                <div className="storm-castle-bg" />

                <div className="storm-spawn-zone">Enemy Path ➡️</div>
                <div className="storm-fort-zone">
                    <div className="storm-fort-structure">
                        <div className="storm-fort-icon">🏰</div>
                        <div className="storm-fort-label">Fort</div>
                    </div>
                </div>

                {/* Boss Warning Banner */}
                {bossWarningActive && (
                    <div className="storm-boss-warning">
                        <span className="storm-boss-warning-icon">⚠️</span>
                        <span className="storm-boss-warning-text">BOSS INCOMING!</span>
                    </div>
                )}

                {/* Kill Combo Popups */}
                {comboPopups.map(popup => (
                    <div
                        key={popup.id}
                        className="storm-combo-popup"
                        style={{
                            left: `${popup.x}%`,
                            top: `${popup.y}%`,
                            opacity: Math.max(0, 1 - popup.age / 1500),
                            transform: `translateY(${-popup.age * 0.03}px)`,
                        }}
                    >
                        <span className="combo-count">x{popup.count} COMBO!</span>
                        <span className="combo-bonus">+{popup.bonus}🐌</span>
                    </div>
                ))}

                {/* Render Obstacles */}
                {obstacles.map(obs => (
                    <div
                        key={obs.id}
                        className={`storm-entity storm-obstacle storm-obs-${obs.type}`}
                        style={{ left: `${obs.x}%` }}
                        onClick={() => storeObstacle(obs.id)}
                    >
                        {obs.type === 'barbed_wire' ? '〰️' : '🧱'}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(obs.hp / obs.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Render Defenders — draggable + ability tap */}
                {defenders.map((def) => {
                    // Hide the very first cow's visual emoji, because the background video already serves as the visual for the "free starter cow" fighting goblins.
                    const isFirstCow = def.type === 'cow' && def.id === defenders.find(d => d.type === 'cow')?.id;

                    return (
                    <div
                        key={def.id}
                        className={`storm-entity storm-defender ${draggingId === def.id ? 'dragging' : ''} ${def.fortifyUntil > Date.now() ? 'fortified' : ''}`}
                        style={{ left: `${def.x}%`, top: `${def.y}%` }}
                        onPointerDown={(e) => handleDefenderPointerDown(e, def.id)}
                        onClick={() => handleDefenderTap(def.id)}
                    >
                        {!isFirstCow && getDefenderIcon(def.type)}
                        {def.rank > 0 && (
                            <div className="storm-rank-badge">{getRankStars(def.rank)}</div>
                        )}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(def.hp / def.maxHp) * 100}%` }} /></div>
                        {/* Ability indicator */}
                        {def.abilityReady && (
                            <div className="storm-ability-ready" title={DEFENDER_ABILITIES[def.defenderType]?.name}>
                                {DEFENDER_ABILITIES[def.defenderType]?.icon}
                            </div>
                        )}
                        {!def.abilityReady && def.abilityCooldownTimer > 0 && (
                            <div className="storm-ability-cd">
                                {Math.ceil(def.abilityCooldownTimer / 1000)}s
                            </div>
                        )}
                        {/* Selected Menu */}
                        {selectedDefenderId === def.id && (
                            <div className="storm-selected-menu">
                                <button
                                    onClick={(e) => { e.stopPropagation(); activateAbility(def.id); setSelectedDefenderId(null); }}
                                    disabled={!def.abilityReady}
                                >
                                    Use Ability
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); storeDefender(def.id); setSelectedDefenderId(null); }}>
                                    Store
                                </button>
                            </div>
                        )}
                    </div>
                    );
                })}

                {/* Render Enemies — multi-lane y positions */}
                {enemies.map(en => (
                    <div
                        key={en.id}
                        className={`storm-entity storm-enemy ${en.isElite ? 'elite' : ''} ${en.x >= 100 ? 'attacking-fort' : ''}`}
                        style={{ left: `${en.x}%`, top: `${en.y}%` }}
                    >
                        {getEnemyIcon(en.type)}
                        {en.isElite && <div className="storm-elite-badge">⚡</div>}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(en.hp / en.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Render Projectiles */}
                {projectiles.map(p => {
                    const currentX = p.fromX + (p.toX - p.fromX) * p.progress;
                    const currentY = p.fromY + (p.toY - p.fromY) * p.progress;
                    return (
                        <div
                            key={p.id}
                            className={`storm-projectile ${p.isHeal ? 'heal' : ''}`}
                            style={{ left: `${currentX}%`, top: `${currentY}%` }}
                        />
                    );
                })}

                {/* Damage Popups */}
                {damagePopups.map(popup => (
                    <div
                        key={popup.id}
                        className={`storm-damage-popup ${popup.isCrit ? 'crit' : ''}`}
                        style={{
                            left: `${popup.x}%`,
                            top: `${popup.y}%`,
                            opacity: Math.max(0, 1 - popup.age / 1200),
                            transform: `translate(-50%, ${-popup.age * 0.03}px)`,
                        }}
                    >
                        +{popup.value}🐌
                    </div>
                ))}

                {/* Dropzone for Drag-to-Store */}
                <div 
                    ref={storeZoneRef} 
                    className={`storm-dropzone-store ${draggingId ? 'visible' : ''}`}
                >
                    📥 Drop here to Store
                </div>

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="storm-overlay">
                        <h3>Prepare Your Defenses</h3>
                        <p>Buy units and traps using Shmeckles before the wave starts.</p>
                        {/* Wave Preview Toggle */}
                        <button className="storm-btn secondary" onClick={() => setShowWavePreview(v => !v)}>
                            {showWavePreview ? 'Hide Preview' : '👁️ Preview Wave'}
                        </button>
                        {showWavePreview && wavePreview && (
                            <div className="storm-wave-preview">
                                <h4>Wave {wave} Composition:</h4>
                                <div className="storm-wave-preview-grid">
                                    {Object.entries(wavePreview).map(([type, count]) => (
                                        <div key={type} className="storm-wave-preview-item">
                                            <span className="preview-icon">{STORM_ENEMY_DEFS[type as StormEnemyType]?.icon}</span>
                                            <span className="preview-name">{STORM_ENEMY_DEFS[type as StormEnemyType]?.name}</span>
                                            <span className="preview-count">×{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button className="storm-btn primary" onClick={() => startNextWave()}>Start Wave {wave}</button>
                    </div>
                )}
                {gameState === 'victory' && (
                    <div className="storm-overlay success">
                        <h3>Wave Cleared!</h3>
                        <p>Survive the next assault.</p>
                        {lastWaveRewards && (
                            <div className="storm-rewards">
                                <span>+{lastWaveRewards.shmeckles} 🐌</span>
                                <span>+{lastWaveRewards.gold} 🪙</span>
                            </div>
                        )}
                        {/* Show defender XP gains */}
                        {defenders.some(d => d.rank > 0) && (
                            <div className="storm-vet-summary">
                                {defenders.filter(d => d.rank > 0).map(d => (
                                    <span key={d.id} className="storm-vet-chip">
                                        {getDefenderIcon(d.type)} {getRankStars(d.rank)} Rank {d.rank}
                                    </span>
                                ))}
                            </div>
                        )}
                        <button className="storm-btn primary" onClick={() => startNextWave()}>Next Wave</button>
                    </div>
                )}
                {gameState === 'defeat' && (
                    <div className="storm-overlay danger">
                        <h3>Fort Destroyed!</h3>
                        <p>You survived until Wave {wave}. {wave > bestWave ? '🏆 New Record!' : `Best: Wave ${bestWave}`}</p>
                        <button className="storm-btn danger" onClick={() => window.history.back()}>Exit</button>
                    </div>
                )}
            </div>


            {/* Shop Interface */}
            <div className="storm-shop">
                <div className="storm-shop-tabs">
                    <button className={activeTab === 'deploy' ? 'active' : ''} onClick={() => setActiveTab('deploy')}>Deploy</button>
                    <button className={activeTab === 'obstacles' ? 'active' : ''} onClick={() => setActiveTab('obstacles')}>Traps</button>
                    <button className={activeTab === 'upgrades' ? 'active' : ''} onClick={() => setActiveTab('upgrades')}>Upgrades</button>
                </div>

                <div className="storm-shop-content">
                    {activeTab === 'deploy' && (
                        <div className="storm-shop-grid">
                            {(['cow', 'swordsman', 'shield', 'archer', 'medic'] as DefenderType[]).map(type => {
                                const cost = DEFENDER_COSTS[type];
                                const owned = defenderInventory[type] || 0;
                                const isFreeFirstCow = type === 'cow' && !hasBoughtFirstCow;
                                const canAfford = shmeckles >= cost || isFreeFirstCow || owned > 0;
                                
                                return (
                                    <button 
                                        key={type}
                                        className="storm-buy-card" 
                                        onClick={() => handleBuyDefender(type)} 
                                        disabled={!canAfford}
                                    >
                                        <div className="icon">{getDefenderIcon(type)}</div>
                                        <div className="info">
                                            <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                                            <span>{owned > 0 ? `Owned: ${owned}` : (isFreeFirstCow ? 'FREE' : `🐌 ${cost}`)}</span>
                                        </div>
                                        {owned > 0 ? (
                                            <div className="cost owned">Place</div>
                                        ) : isFreeFirstCow ? (
                                            <div className="free-tag">FREE</div>
                                        ) : (
                                            <div className="cost">Buy</div>
                                        )}
                                    </button>
                                );
                            })}

                            <div className="storm-formation-btns">
                                <button 
                                    className="storm-btn primary auto-compact" 
                                    onClick={() => {
                                        storeAllDefenders();
                                        storeAllObstacles();
                                    }} 
                                    disabled={defenders.length === 0 && obstacles.length === 0}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <Inbox size={18} /> Store All
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'obstacles' && (
                        <div className="storm-shop-grid">
                            {(['barbed_wire', 'barricade'] as const).map(type => {
                                const costs = { barbed_wire: 10, barricade: 30 };
                                const cost = costs[type];
                                const owned = obstacleInventory[type] || 0;
                                const canAfford = shmeckles >= cost || owned > 0;

                                return (
                                    <button 
                                        key={type}
                                        className="storm-buy-card" 
                                        onClick={() => handleBuyObstacle(type)} 
                                        disabled={!canAfford}
                                    >
                                        <div className="icon">{type === 'barbed_wire' ? '〰️' : '🧱'}</div>
                                        <div className="info">
                                            <h4>{type === 'barbed_wire' ? 'Barbed Wire' : 'Barricade'}</h4>
                                            <span>{owned > 0 ? `Owned: ${owned}` : `🐌 ${cost}`}</span>
                                        </div>
                                        {owned > 0 ? (
                                            <div className="cost owned">Place</div>
                                        ) : (
                                            <div className="cost">Buy</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'upgrades' && (
                        <div className="storm-shop-grid">
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('fortHealthLevel')} disabled={shmeckles < getUpgradeCost('fortHealthLevel')}>
                                <div className="icon">🏰</div>
                                <div className="info">
                                    <h4>Reinforce Fort</h4>
                                    <span>Lv. {upgrades.fortHealthLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('fortHealthLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('fortArmorLevel')} disabled={shmeckles < getUpgradeCost('fortArmorLevel')}>
                                <div className="icon">🛡️</div>
                                <div className="info">
                                    <h4>Fort Armor</h4>
                                    <span>Lv. {upgrades.fortArmorLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('fortArmorLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('fortRepairLevel')} disabled={shmeckles < getUpgradeCost('fortRepairLevel')}>
                                <div className="icon">🛠️</div>
                                <div className="info">
                                    <h4>Auto-Repair</h4>
                                    <span>Lv. {upgrades.fortRepairLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('fortRepairLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('defenderDamageLevel')} disabled={shmeckles < getUpgradeCost('defenderDamageLevel')}>
                                <div className="icon">⚔️</div>
                                <div className="info">
                                    <h4>Sharpen Weapons</h4>
                                    <span>Lv. {upgrades.defenderDamageLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('defenderDamageLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('defenderHealthLevel')} disabled={shmeckles < getUpgradeCost('defenderHealthLevel')}>
                                <div className="icon">👕</div>
                                <div className="info">
                                    <h4>Toughen Armor</h4>
                                    <span>Lv. {upgrades.defenderHealthLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('defenderHealthLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('defenderSpeedLevel')} disabled={shmeckles < getUpgradeCost('defenderSpeedLevel')}>
                                <div className="icon">💨</div>
                                <div className="info">
                                    <h4>Swiftness</h4>
                                    <span>Lv. {upgrades.defenderSpeedLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('defenderSpeedLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('wireStrengthLevel')} disabled={shmeckles < getUpgradeCost('wireStrengthLevel')}>
                                <div className="icon">〰️</div>
                                <div className="info">
                                    <h4>Sharper Barbs</h4>
                                    <span>Lv. {upgrades.wireStrengthLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('wireStrengthLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('trapDamageLevel')} disabled={shmeckles < getUpgradeCost('trapDamageLevel')}>
                                <div className="icon">💥</div>
                                <div className="info">
                                    <h4>Deadly Traps</h4>
                                    <span>Lv. {upgrades.trapDamageLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('trapDamageLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('trapDurabilityLevel')} disabled={shmeckles < getUpgradeCost('trapDurabilityLevel')}>
                                <div className="icon">🧱</div>
                                <div className="info">
                                    <h4>Sturdy Traps</h4>
                                    <span>Lv. {upgrades.trapDurabilityLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('trapDurabilityLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('shmeckleWaveBonusLevel')} disabled={shmeckles < getUpgradeCost('shmeckleWaveBonusLevel')}>
                                <div className="icon">🐌</div>
                                <div className="info">
                                    <h4>Bounty Hunter</h4>
                                    <span>Lv. {upgrades.shmeckleWaveBonusLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('shmeckleWaveBonusLevel')}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyUpgrade('shmeckleKillBonusLevel')} disabled={shmeckles < getUpgradeCost('shmeckleKillBonusLevel')}>
                                <div className="icon">🪙</div>
                                <div className="info">
                                    <h4>Scavenger</h4>
                                    <span>Lv. {upgrades.shmeckleKillBonusLevel}</span>
                                </div>
                                <div className="cost">🐌 {getUpgradeCost('shmeckleKillBonusLevel')}</div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
