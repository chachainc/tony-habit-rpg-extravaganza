import { useEffect, useState, useRef } from 'react';
import { Heart, Play, Pause } from 'lucide-react';
import { useStormStore, STORM_ENEMY_DEFS } from '../../store/useStormStore';
import type { StormEnemyType } from '../../store/useStormStore';
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
        upgrades,
        lastWaveRewards,
        hasBoughtFirstCow,
        startGame,
        pauseGame,
        resumeGame,
        gameTick,
        buyDefender,
        buyObstacle,
        buyUpgrade,
        startNextWave,
    } = useStormStore();

    const { shmeckles } = useCurrencyStore();
    const [activeTab, setActiveTab] = useState<'deploy' | 'obstacles' | 'upgrades'>('deploy');

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
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            previousTimeRef.current = undefined;
        };
    }, [gameState]);


    // Cost configuration
    const DEFENDER_COSTS = { cow: 5, swordsman: 15, shield: 25, archer: 20 };

    const getUpgradeCost = (key: keyof typeof upgrades) => 50 + (upgrades[key] * 50);

    const handleBuyDefender = (type: 'cow' | 'swordsman' | 'shield' | 'archer') => {
        buyDefender(type);
    };

    const handleBuyObstacle = (type: 'barbed_wire' | 'barricade') => {
        const xPos = 60 + Math.random() * 20;
        buyObstacle(type, xPos);
    };

    const handleBuyUpgrade = (key: keyof typeof upgrades) => {
        buyUpgrade(key);
    };

    // Get enemy icon from type
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
            default: return '⚔️';
        }
    };

    return (
        <div className="storm-page">
            {/* Header / HUD */}
            <div className="storm-hud">
                <div className="storm-hud-left">
                    <h2>🏰 Storm the Fort</h2>
                    <span className="storm-wave-badge">Wave {wave}</span>
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

            {/* Main Battlefield — background set via CSS */}
            <div className="storm-battlefield">
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

                {/* Render Obstacles */}
                {obstacles.map(obs => (
                    <div
                        key={obs.id}
                        className={`storm-entity storm-obstacle storm-obs-${obs.type}`}
                        style={{ left: `${obs.x}%` }}
                    >
                        {obs.type === 'barbed_wire' ? '〰️' : '🧱'}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(obs.hp / obs.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Render Defenders — now with cow art */}
                {defenders.map(def => (
                    <div
                        key={def.id}
                        className={`storm-entity storm-defender`}
                        style={{ left: `${def.x}%` }}
                    >
                        {getDefenderIcon(def.type)}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(def.hp / def.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Render Enemies — now with varied type icons */}
                {enemies.map(en => (
                    <div
                        key={en.id}
                        className={`storm-entity storm-enemy`}
                        style={{ left: `${en.x}%` }}
                    >
                        {getEnemyIcon(en.type)}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(en.hp / en.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Overlays */}
                {gameState === 'idle' && (
                    <div className="storm-overlay">
                        <h3>Prepare Your Defenses</h3>
                        <p>Buy units and traps using Shmeckles before the wave starts.</p>
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
                        <button className="storm-btn primary" onClick={() => startNextWave()}>Next Wave</button>
                    </div>
                )}
                {gameState === 'defeat' && (
                    <div className="storm-overlay danger">
                        <h3>Fort Destroyed!</h3>
                        <p>You survived until Wave {wave}. Start over!</p>
                        <button className="storm-btn danger" onClick={() => startGame()}>Restart</button>
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
                            {/* Cow Defender — first one free! */}
                            <button className="storm-buy-card" onClick={() => handleBuyDefender('cow')} disabled={hasBoughtFirstCow && shmeckles < DEFENDER_COSTS.cow}>
                                <div className="icon">🐄</div>
                                <div className="info">
                                    <h4>Cow Defender</h4>
                                    <span>Slow but loyal</span>
                                </div>
                                {!hasBoughtFirstCow ? (
                                    <div className="free-tag">FREE</div>
                                ) : (
                                    <div className="cost">🐌 {DEFENDER_COSTS.cow}</div>
                                )}
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyDefender('swordsman')} disabled={shmeckles < DEFENDER_COSTS.swordsman}>
                                <div className="icon">⚔️</div>
                                <div className="info">
                                    <h4>Swordsman</h4>
                                    <span>Balanced melee</span>
                                </div>
                                <div className="cost">🐌 {DEFENDER_COSTS.swordsman}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyDefender('shield')} disabled={shmeckles < DEFENDER_COSTS.shield}>
                                <div className="icon">🛡️</div>
                                <div className="info">
                                    <h4>Shield</h4>
                                    <span>High health</span>
                                </div>
                                <div className="cost">🐌 {DEFENDER_COSTS.shield}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyDefender('archer')} disabled={shmeckles < DEFENDER_COSTS.archer}>
                                <div className="icon">🏹</div>
                                <div className="info">
                                    <h4>Archer</h4>
                                    <span>Long range</span>
                                </div>
                                <div className="cost">🐌 {DEFENDER_COSTS.archer}</div>
                            </button>
                        </div>
                    )}

                    {activeTab === 'obstacles' && (
                        <div className="storm-shop-grid">
                            <button className="storm-buy-card" onClick={() => handleBuyObstacle('barbed_wire')} disabled={shmeckles < 10}>
                                <div className="icon">〰️</div>
                                <div className="info">
                                    <h4>Barbed Wire</h4>
                                    <span>Slows & damages</span>
                                </div>
                                <div className="cost">🐌 10</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyObstacle('barricade')} disabled={shmeckles < 30}>
                                <div className="icon">🧱</div>
                                <div className="info">
                                    <h4>Barricade</h4>
                                    <span>Blocks enemies</span>
                                </div>
                                <div className="cost">🐌 30</div>
                            </button>
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
