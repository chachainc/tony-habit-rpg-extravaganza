import { useEffect, useState, useRef, useCallback } from 'react';
import { Heart, Play, Pause, Inbox, X, ShoppingCart } from 'lucide-react';
import {
    useStormStore,
    STORM_ENEMY_DEFS,
    DEFENDER_ABILITIES,
    getStormWavePreview,
    FORT_BOUNDARY_X,
    CASTLE_X,
    CASTLE_Y,
} from '../../store/useStormStore';
import type { StormEnemyType, DefenderType } from '../../store/useStormStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './StormTheFort.css';

// Full stats for purchase confirmation modal
const DEFENDER_STATS_DISPLAY: Record<DefenderType, { role: string; dmg: string; range: string; cd: string; special: string }> = {
    cow:       { role: 'Cheap frontline bruiser', dmg: '6 / hit',  range: 'Short',  cd: '2.0s', special: 'Stampede ability (3× AoE)' },
    swordsman: { role: 'High-DPS melee fighter',  dmg: '18 / hit', range: 'Melee',  cd: '0.9s', special: 'Rally: +50% team damage 5s' },
    archer:    { role: 'Long-range DPS',           dmg: '14 / hit', range: 'Long',   cd: '1.4s', special: 'Volley: fires 5 arrows' },
    medic:     { role: 'Healing support',          dmg: '—',        range: 'Medium', cd: '1.8s', special: 'Mass Heal: full ally restore' },
    shield:    { role: 'Tank & taunt',             dmg: '3 / hit',  range: 'Melee',  cd: '1.5s', special: 'Fortify: 3s full block + Taunt' },
};

// Role badge metadata
const ROLE_BADGE: Record<DefenderType, { icon: string; label: string; color: string }> = {
    cow:       { icon: '🐄', label: 'Brute',   color: '#a16207' },
    swordsman: { icon: '⚔️', label: 'DPS',     color: '#dc2626' },
    archer:    { icon: '🎯', label: 'Range',   color: '#16a34a' },
    medic:     { icon: '💚', label: 'Support', color: '#0891b2' },
    shield:    { icon: '🛡️', label: 'Tank',    color: '#6d28d9' },
};

const CARD_MINI_STATS: Record<DefenderType, { dmg: string; cd: string; rng: string }> = {
    cow:       { dmg: '6',  cd: '2.0s', rng: 'S' },
    swordsman: { dmg: '18', cd: '0.9s', rng: 'M' },
    archer:    { dmg: '14', cd: '1.4s', rng: 'XL' },
    medic:     { dmg: '—', cd: '1.8s', rng: 'M' },
    shield:    { dmg: '3',  cd: '1.5s', rng: 'S' },
};

const OBSTACLE_STATS_DISPLAY: Record<'barbed_wire' | 'barricade', {
    role: string;
    effect: string;
    hp: string;
}> = {
    barbed_wire: { role: 'Forward slow trap', effect: 'Slows 70% + bleed damage ticks', hp: '60' },
    barricade:   { role: 'Fort wall segment', effect: 'Blocks path at fort boundary',   hp: '250' },
};

interface PendingPurchase {
    category: 'defender' | 'obstacle' | 'upgrade';
    type: string;
    cost: number;
    name: string;
    icon: string;
}

export const StormTheFort = () => {
    const {
        gameState,
        wave,
        fortHp,
        maxFortHp,
        castleHit,
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

    const { shmeckles, gold } = useCurrencyStore();
    const [activeTab, setActiveTab] = useState<'deploy' | 'obstacles' | 'upgrades'>('deploy');
    const [showWavePreview, setShowWavePreview] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
    const [wasPausedForPurchase, setWasPausedForPurchase] = useState(false);
    const [selectedDefenderId, setSelectedDefenderId] = useState<string | null>(null);
    const [rangeFlashId, setRangeFlashId] = useState<string | null>(null); // briefly show range ring

    const purchaseLock = useRef(false);
    const draggingId = useRef<string | null>(null);
    const battlefieldRef = useRef<HTMLDivElement>(null);
    const storeZoneRef = useRef<HTMLDivElement>(null);
    const [draggingState, setDraggingState] = useState<string | null>(null); // for visual update

    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);

    // ── Game loop ─────────────────────────────────────────────────────────
    const animate = useCallback((time: number) => {
        if (previousTimeRef.current != undefined) {
            const deltaTime = time - previousTimeRef.current;
            gameTick(deltaTime);
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [gameTick]);

    useEffect(() => {
        if (gameState === 'playing') {
            previousTimeRef.current = undefined;
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        if (gameState === 'defeat' || gameState === 'victory') {
            resetToIdle();
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            previousTimeRef.current = undefined;
        };
    }, [gameState, animate]);

    // ── Drag handlers ─────────────────────────────────────────────────────
    const handleDefenderPointerDown = useCallback((e: React.PointerEvent, defId: string) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        draggingId.current = defId;
        setDraggingState(defId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId.current || !battlefieldRef.current) return;
        const rect = battlefieldRef.current.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        moveDefender(draggingId.current, xPct, yPct);
    }, [moveDefender]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (draggingId.current && storeZoneRef.current) {
            const rect = storeZoneRef.current.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                storeDefender(draggingId.current);
            }
        }
        draggingId.current = null;
        setDraggingState(null);
    }, [storeDefender]);

    const handleDefenderTap = useCallback((defId: string) => {
        if (draggingId.current) return;
        setSelectedDefenderId(prev => (prev === defId ? null : defId));
    }, []);

    // ── Purchase flow ─────────────────────────────────────────────────────
    const DEFENDER_COSTS: Record<DefenderType, number> = { cow: 5, swordsman: 15, shield: 25, archer: 20, medic: 20 };
    const getUpgradeCost = (key: keyof typeof upgrades) => 50 + (upgrades[key] * 50);

    const openPurchaseModal = useCallback((purchase: PendingPurchase) => {
        if (purchaseLock.current) return;
        setPendingPurchase(purchase);
        if (gameState === 'playing') {
            pauseGame();
            setWasPausedForPurchase(true);
        }
    }, [gameState, pauseGame]);

    const cancelPurchase = useCallback(() => {
        setPendingPurchase(null);
        if (wasPausedForPurchase) {
            resumeGame();
            setWasPausedForPurchase(false);
        }
    }, [wasPausedForPurchase, resumeGame]);

    const confirmPurchase = useCallback(() => {
        if (!pendingPurchase) return;
        purchaseLock.current = true;

        if (pendingPurchase.category === 'defender') {
            const didBuy = buyDefender(pendingPurchase.type as DefenderType);
            // Show range flash for 1.5s after placing
            if (didBuy) {
                setTimeout(() => {
                    const store = useStormStore.getState();
                    const newest = store.defenders[store.defenders.length - 1];
                    if (newest) {
                        setRangeFlashId(newest.id);
                        setTimeout(() => setRangeFlashId(null), 1500);
                    }
                }, 50);
            }
        } else if (pendingPurchase.category === 'obstacle') {
            buyObstacle(pendingPurchase.type as 'barbed_wire' | 'barricade');
        } else if (pendingPurchase.category === 'upgrade') {
            buyUpgrade(pendingPurchase.type as keyof typeof upgrades);
        }

        setPendingPurchase(null);
        if (wasPausedForPurchase) {
            resumeGame();
            setWasPausedForPurchase(false);
        }
        setTimeout(() => { purchaseLock.current = false; }, 300);
    }, [pendingPurchase, buyDefender, buyObstacle, buyUpgrade, wasPausedForPurchase, resumeGame, upgrades]);

    // ── Icon helpers ──────────────────────────────────────────────────────
    const getEnemyIcon = (type: string): string => STORM_ENEMY_DEFS[type as StormEnemyType]?.icon ?? '👿';
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
    const getRankStars = (rank: number): string => rank <= 0 ? '' : '⭐'.repeat(Math.min(rank, 3));

    const wavePreview = showWavePreview ? getStormWavePreview(wave) : null;
    const bossEnemy = enemies.find(e => STORM_ENEMY_DEFS[e.enemyType]?.isBoss);
    const isRallyActive = Date.now() < rallyUntil;
    const isPurchaseModalOpen = pendingPurchase !== null;

    // Projectile CSS class per source type
    const getProjClass = (sourceType: string) => {
        switch (sourceType) {
            case 'cow':       return 'storm-proj-cow';
            case 'swordsman': return 'storm-proj-sword';
            case 'shield':    return 'storm-proj-shield';
            case 'archer':    return 'storm-proj-arrow';
            case 'medic':     return 'storm-proj-heal';
            case 'barbed_wire': return 'storm-proj-barb';
            default:          return '';
        }
    };

    return (
        <div className="storm-page">
            {/* ── HUD ────────────────────────────────────────────── */}
            <div className="storm-hud">
                <div className="storm-hud-left">
                    <h2>🏰 Storm the Fort</h2>
                    <span className="storm-wave-badge">Wave {wave}</span>
                    {bestWave > 0 && <span className="storm-best-wave">🏆 Best: {bestWave}</span>}
                </div>

                <div className="storm-hud-center">
                    <div className="storm-fort-health">
                        <Heart size={14} color="#ef4444" fill="#ef4444" />
                        <div className="storm-fort-health-info">
                            <span className="storm-fort-health-label">
                                {Math.max(0, Math.ceil(fortHp))}/{maxFortHp}
                            </span>
                            <div className="storm-fort-health-bar-track">
                                <div
                                    className="storm-fort-health-bar-fill"
                                    style={{
                                        width: `${Math.max(0, (fortHp / maxFortHp) * 100)}%`,
                                        background: fortHp / maxFortHp > 0.5 ? '#22c55e'
                                            : fortHp / maxFortHp > 0.25 ? '#f59e0b' : '#ef4444',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="storm-hud-right">
                    <div className="storm-currencies">
                        <span className="storm-currency">🐌 {shmeckles}</span>
                        <span className="storm-currency">🪙 {gold}</span>
                    </div>
                    {gameState === 'playing' ? (
                        <button className="storm-btn icon" onClick={pauseGame}><Pause size={18} /></button>
                    ) : (
                        gameState === 'paused' && !isPurchaseModalOpen &&
                        <button className="storm-btn icon" onClick={resumeGame}><Play size={18} /></button>
                    )}
                </div>
            </div>

            {/* ── Boss HP bar ─────────────────────────────────── */}
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

            {/* ── Rally banner ─────────────────────────────────── */}
            {isRallyActive && (
                <div className="storm-rally-banner">📯 RALLY! +50% Damage!</div>
            )}

            {/* ── Purchase pause banner ─────────────────────────── */}
            {isPurchaseModalOpen && gameState === 'paused' && (
                <div className="storm-pause-banner">⏸ WAVE PAUSED</div>
            )}

            {/* ── Battlefield ──────────────────────────────────── */}
            <div
                className="storm-battlefield"
                ref={battlefieldRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <video
                    className="storm-bg-video"
                    autoPlay loop muted playsInline
                    src="/assets/storm-fort/Cows_fighting_goblins_202603180014.mp4"
                />
                <div className="storm-track-overlay" />

                {/* Fort boundary dashed line */}
                <div className="storm-fort-boundary-line" style={{ left: `${FORT_BOUNDARY_X}%` }} />

                {/* Castle */}
                <div
                    className={`storm-castle ${castleHit ? 'storm-castle-hit' : ''}`}
                    style={{ left: `${CASTLE_X}%`, top: `${CASTLE_Y}%` }}
                >
                    <div className="storm-castle-icon">🏰</div>
                    <div className="storm-castle-hp-bar">
                        <div className="storm-castle-hp-fill"
                            style={{ width: `${Math.max(0, (fortHp / maxFortHp) * 100)}%` }}
                        />
                    </div>
                    <div className="storm-castle-hp-label">
                        {Math.max(0, Math.ceil(fortHp))}/{maxFortHp} HP
                    </div>
                </div>

                <div className="storm-spawn-zone">Enemy Path ➡️</div>

                {/* Boss warning */}
                {bossWarningActive && (
                    <div className="storm-boss-warning">
                        <span className="storm-boss-warning-icon">⚠️</span>
                        <span className="storm-boss-warning-text">BOSS INCOMING!</span>
                    </div>
                )}

                {/* Combo popups */}
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
                        <span className="combo-bonus">+{popup.bonus} 🪙</span>
                    </div>
                ))}

                {/* Obstacles */}
                {obstacles.map(obs => {
                    if (obs.type === 'barricade') {
                        const heightPct = obs.yEnd - obs.yStart;
                        return (
                            <div
                                key={obs.id}
                                className="storm-barricade"
                                style={{
                                    left: `${obs.x}%`,
                                    top: `${obs.yStart}%`,
                                    height: `${heightPct}%`,
                                }}
                                onClick={() => storeObstacle(obs.id)}
                            >
                                <div className="storm-barricade-inner">
                                    <div className="storm-barricade-bricks" />
                                    <div className="storm-hp-bar storm-barricade-hp">
                                        <div className="storm-hp-fill" style={{ width: `${(obs.hp / obs.maxHp) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div
                            key={obs.id}
                            className="storm-barbed-wire"
                            style={{ left: `${obs.x}%`, top: `${obs.y}%` }}
                            onClick={() => storeObstacle(obs.id)}
                        >
                            <div className="storm-barbed-wire-strip" />
                            <div className="storm-hp-bar">
                                <div className="storm-hp-fill storm-wire-hp" style={{ width: `${(obs.hp / obs.maxHp) * 100}%` }} />
                            </div>
                        </div>
                    );
                })}

                {/* Defenders */}
                {defenders.map((def) => {
                    const isFirstCow = def.type === 'cow' && def.id === defenders.find(d => d.type === 'cow')?.id;
                    const showRangeRing = rangeFlashId === def.id;
                    return (
                        <div
                            key={def.id}
                            className={`storm-entity storm-defender ${draggingState === def.id ? 'dragging' : ''} ${def.fortifyUntil > Date.now() ? 'fortified' : ''}`}
                            style={{ left: `${def.x}%`, top: `${def.y}%` }}
                            onPointerDown={(e) => handleDefenderPointerDown(e, def.id)}
                            onClick={() => handleDefenderTap(def.id)}
                        >
                            {showRangeRing && (
                                <div
                                    className="storm-range-ring"
                                    style={{ width: `${def.range * 2}%`, height: `${def.range * 2}%` }}
                                />
                            )}
                            {!isFirstCow && getDefenderIcon(def.type)}
                            {def.rank > 0 && <div className="storm-rank-badge">{getRankStars(def.rank)}</div>}
                            <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(def.hp / def.maxHp) * 100}%` }} /></div>
                            {def.abilityReady && (
                                <div className="storm-ability-ready" title={DEFENDER_ABILITIES[def.defenderType]?.name}>
                                    {DEFENDER_ABILITIES[def.defenderType]?.icon}
                                </div>
                            )}
                            {!def.abilityReady && def.abilityCooldownTimer > 0 && (
                                <div className="storm-ability-cd">{Math.ceil(def.abilityCooldownTimer / 1000)}s</div>
                            )}
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

                {/* Enemies */}
                {enemies.map(en => (
                    <div
                        key={en.id}
                        className={`storm-entity storm-enemy ${en.isElite ? 'elite' : ''} ${en.reachedBoundary ? 'breached' : ''}`}
                        style={{ left: `${en.x}%`, top: `${en.y}%` }}
                    >
                        {getEnemyIcon(en.type)}
                        {en.isElite && <div className="storm-elite-badge">⚡</div>}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(en.hp / en.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Projectiles */}
                {projectiles.map(p => {
                    const currentX = p.fromX + (p.toX - p.fromX) * p.progress;
                    const currentY = p.fromY + (p.toY - p.fromY) * p.progress;
                    // Arrow: rotate toward target
                    const angle = Math.atan2(p.toY - p.fromY, p.toX - p.fromX) * (180 / Math.PI);
                    return (
                        <div
                            key={p.id}
                            className={`storm-projectile ${getProjClass(p.sourceType)} ${p.isHeal ? 'heal' : ''}`}
                            style={{
                                left: `${currentX}%`,
                                top: `${currentY}%`,
                                transform: p.sourceType === 'archer'
                                    ? `translate(-50%, -50%) rotate(${angle}deg)`
                                    : 'translate(-50%, -50%)',
                            }}
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
                        {popup.icon}{popup.value}
                    </div>
                ))}

                {/* Drag store dropzone */}
                <div
                    ref={storeZoneRef}
                    className={`storm-dropzone-store ${draggingState ? 'visible' : ''}`}
                >
                    📥 Drop here to Store
                </div>

                {/* ── Overlays ──────────────────────────────────── */}
                {gameState === 'idle' && (
                    <div className="storm-overlay">
                        <h3>Prepare Your Defenses</h3>
                        <p>Buy units and traps below, then start the wave.</p>
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
                        <p>Prepare for the next assault.</p>
                        {lastWaveRewards && (
                            <div className="storm-rewards">
                                <span>+{lastWaveRewards.shmeckles} 🐌</span>
                                <span>+{lastWaveRewards.gold} 🪙</span>
                                {lastWaveRewards.diamonds ? <span>+{lastWaveRewards.diamonds} 💎</span> : null}
                            </div>
                        )}
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

            {/* ── Shop Panel — docked ABOVE bottom nav ────────── */}
            <div className="storm-shop">
                {/* Sticky Tabs */}
                <div className="storm-shop-tabs">
                    <button className={activeTab === 'deploy' ? 'active' : ''} onClick={() => setActiveTab('deploy')}>Deploy</button>
                    <button className={activeTab === 'obstacles' ? 'active' : ''} onClick={() => setActiveTab('obstacles')}>Traps</button>
                    <button className={activeTab === 'upgrades' ? 'active' : ''} onClick={() => setActiveTab('upgrades')}>Upgrades</button>
                </div>

                {/* Scrollable Content */}
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
                                        onClick={() => openPurchaseModal({
                                            category: 'defender',
                                            type,
                                            cost,
                                            name: type.charAt(0).toUpperCase() + type.slice(1),
                                            icon: getDefenderIcon(type),
                                        })}
                                        disabled={!canAfford}
                                    >
                                        <div className="icon">{getDefenderIcon(type)}</div>
                                        <div className="info">
                                            <div className="card-header-row">
                                                <h4>{type === 'swordsman' ? 'Swords.' : type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                                                <span
                                                    className="role-badge"
                                                    style={{ background: ROLE_BADGE[type].color + '33', color: ROLE_BADGE[type].color, borderColor: ROLE_BADGE[type].color + '66' }}
                                                >
                                                    {ROLE_BADGE[type].icon} {ROLE_BADGE[type].label}
                                                </span>
                                            </div>
                                            <div className="card-mini-stats">
                                                <span>⚔️{CARD_MINI_STATS[type].dmg}</span>
                                                <span>⏱{CARD_MINI_STATS[type].cd}</span>
                                                <span>📏{CARD_MINI_STATS[type].rng}</span>
                                            </div>
                                            <span>{owned > 0 ? `Owned: ${owned}` : isFreeFirstCow ? 'FREE' : `🐌 ${cost}`}</span>
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
                                    onClick={() => { storeAllDefenders(); storeAllObstacles(); }}
                                    disabled={defenders.length === 0 && obstacles.length === 0}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                >
                                    <Inbox size={18} /> Store All
                                </button>
                            </div>

                            <div className="storm-shop-spacer" />
                        </div>
                    )}

                    {activeTab === 'obstacles' && (
                        <div className="storm-shop-grid">
                            {(['barbed_wire', 'barricade'] as const).map(type => {
                                const costs = { barbed_wire: 10, barricade: 30 };
                                const cost = costs[type];
                                const owned = obstacleInventory[type] || 0;
                                const canAfford = shmeckles >= cost || owned > 0;
                                const icon = type === 'barbed_wire' ? '〰️' : '🧱';
                                const label = type === 'barbed_wire' ? 'Barbed Wire' : 'Barricade';

                                return (
                                    <button
                                        key={type}
                                        className="storm-buy-card"
                                        onClick={() => openPurchaseModal({
                                            category: 'obstacle',
                                            type,
                                            cost,
                                            name: label,
                                            icon,
                                        })}
                                        disabled={!canAfford}
                                    >
                                        <div className="icon">{icon}</div>
                                        <div className="info">
                                            <div className="card-header-row">
                                                <h4>{label}</h4>
                                                <span className="role-badge" style={{
                                                    background: type === 'barricade' ? 'rgba(120,88,60,0.3)' : 'rgba(239,68,68,0.2)',
                                                    color: type === 'barricade' ? '#d97706' : '#ef4444',
                                                    borderColor: type === 'barricade' ? 'rgba(217,119,6,0.4)' : 'rgba(239,68,68,0.4)',
                                                }}>
                                                    {type === 'barricade' ? '🧱 Wall' : '〰️ Trap'}
                                                </span>
                                            </div>
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
                            <div className="storm-shop-spacer" />
                        </div>
                    )}

                    {activeTab === 'upgrades' && (
                        <div className="storm-shop-grid">
                            {([
                                { key: 'fortHealthLevel',       icon: '🏰', label: 'Reinforce Fort' },
                                { key: 'fortArmorLevel',        icon: '🛡️', label: 'Fort Armor' },
                                { key: 'fortRepairLevel',       icon: '🛠️', label: 'Auto-Repair' },
                                { key: 'defenderDamageLevel',   icon: '⚔️', label: 'Sharpen Weapons' },
                                { key: 'defenderHealthLevel',   icon: '👕', label: 'Toughen Armor' },
                                { key: 'defenderSpeedLevel',    icon: '💨', label: 'Swiftness' },
                                { key: 'wireStrengthLevel',     icon: '〰️', label: 'Sharper Barbs' },
                                { key: 'trapDamageLevel',       icon: '💥', label: 'Deadly Traps' },
                                { key: 'trapDurabilityLevel',   icon: '🧱', label: 'Sturdy Traps' },
                                { key: 'shmeckleWaveBonusLevel', icon: '🐌', label: 'Bounty Hunter' },
                                { key: 'shmeckleKillBonusLevel', icon: '🪙', label: 'Scavenger' },
                            ] as const).map(({ key, icon, label }) => {
                                const cost = getUpgradeCost(key);
                                const canAfford = shmeckles >= cost;
                                return (
                                    <button
                                        key={key}
                                        className="storm-buy-card"
                                        onClick={() => openPurchaseModal({
                                            category: 'upgrade',
                                            type: key,
                                            cost,
                                            name: label,
                                            icon,
                                        })}
                                        disabled={!canAfford}
                                    >
                                        <div className="icon">{icon}</div>
                                        <div className="info">
                                            <h4>{label}</h4>
                                            <span>Lv. {upgrades[key]}</span>
                                        </div>
                                        <div className="cost">🐌 {cost}</div>
                                    </button>
                                );
                            })}
                            <div className="storm-shop-spacer" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Purchase Confirmation Modal ───────────────────── */}
            {pendingPurchase && (
                <div className="storm-purchase-overlay" onClick={cancelPurchase}>
                    <div className="storm-purchase-modal" onClick={e => e.stopPropagation()}>
                        <button className="storm-modal-close" onClick={cancelPurchase}><X size={18} /></button>

                        <div className="storm-modal-header">
                            <span className="storm-modal-icon">{pendingPurchase.icon}</span>
                            <div>
                                <h3>{pendingPurchase.name}</h3>
                                <span className="storm-modal-cost">🐌 {pendingPurchase.cost}</span>
                            </div>
                        </div>

                        {pendingPurchase.category === 'defender' && (() => {
                            const s = DEFENDER_STATS_DISPLAY[pendingPurchase.type as DefenderType];
                            return (
                                <div className="storm-modal-stats">
                                    <div className="stat-row"><span>Role</span><span>{s.role}</span></div>
                                    <div className="stat-row"><span>Damage</span><span>{s.dmg}</span></div>
                                    <div className="stat-row"><span>Range</span><span>{s.range}</span></div>
                                    <div className="stat-row"><span>Attack Rate</span><span>{s.cd}</span></div>
                                    <div className="stat-row special"><span>⚡ Special</span><span>{s.special}</span></div>
                                </div>
                            );
                        })()}

                        {pendingPurchase.category === 'obstacle' && (() => {
                            const s = OBSTACLE_STATS_DISPLAY[pendingPurchase.type as 'barbed_wire' | 'barricade'];
                            return (
                                <div className="storm-modal-stats">
                                    <div className="stat-row"><span>Role</span><span>{s.role}</span></div>
                                    <div className="stat-row"><span>Effect</span><span>{s.effect}</span></div>
                                    <div className="stat-row"><span>HP</span><span>{s.hp}</span></div>
                                </div>
                            );
                        })()}

                        {pendingPurchase.category === 'upgrade' && (
                            <div className="storm-modal-stats">
                                <div className="stat-row"><span>Type</span><span>Permanent Upgrade</span></div>
                                <div className="stat-row"><span>Cost</span><span>🐌 {pendingPurchase.cost}</span></div>
                            </div>
                        )}

                        <div className="storm-modal-actions">
                            <button className="storm-btn secondary" onClick={cancelPurchase}>Cancel</button>
                            <button className="storm-btn primary" onClick={confirmPurchase}>
                                <ShoppingCart size={16} /> Place
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
