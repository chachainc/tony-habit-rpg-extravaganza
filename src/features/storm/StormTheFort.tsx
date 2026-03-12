import { useEffect, useState, useRef } from 'react';
import { Heart, Play, Pause } from 'lucide-react';
import { useStormStore } from '../../store/useStormStore';
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
    const DEFENDER_COSTS = { swordsman: 15, shield: 25, archer: 20 };
    const OBSTACLE_COSTS = { barbed_wire: 10, barricade: 30 };

    const getUpgradeCost = (key: keyof typeof upgrades) => 50 + (upgrades[key] * 50);

    const handleBuyDefender = (type: 'swordsman' | 'shield' | 'archer') => {
        buyDefender(type);
    };

    const handleBuyObstacle = (type: 'barbed_wire' | 'barricade') => {
        // Place dynamically near the fort initially for simplicity
        const xPos = 60 + Math.random() * 20;
        buyObstacle(type, xPos);
    };

    const handleBuyUpgrade = (key: keyof typeof upgrades) => {
        buyUpgrade(key);
    };

    return (
        <div className="storm-page">
            {/* Header / HUD */}
            <div className="storm-hud">
                <div className="storm-hud-left">
                    <h2>Castle Defense</h2>
                    <span className="storm-wave-badge">Wave {wave}</span>
                </div>

                <div className="storm-hud-center">
                    <div className="storm-fort-health">
                        <Heart size={16} color="#ef4444" fill="#ef4444" />
                        <span>{Math.max(0, Math.floor(fortHp))} / {maxFortHp}</span>
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

            {/* Main Battlefield */}
            <div className="storm-battlefield">
                <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="storm-bg-video"
                >
                    <source src="/bg/magic-storm.mp4" type="video/mp4" />
                </video>
                <div className="storm-spawn-zone">Enemy Path ➡️</div>
                <div className="storm-fort-zone">
                    <div className="storm-fort-structure">
                        🏰 The Fort
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

                {/* Render Defenders */}
                {defenders.map(def => (
                    <div
                        key={def.id}
                        className={`storm-entity storm-defender`}
                        style={{ left: `${def.x}%` }}
                    >
                        {def.type === 'swordsman' ? '⚔️' : def.type === 'shield' ? '🛡️' : '🏹'}
                        <div className="storm-hp-bar"><div className="storm-hp-fill" style={{ width: `${(def.hp / def.maxHp) * 100}%` }} /></div>
                    </div>
                ))}

                {/* Render Enemies */}
                {enemies.map(en => (
                    <div
                        key={en.id}
                        className={`storm-entity storm-enemy`}
                        style={{ left: `${en.x}%` }}
                    >
                        👿
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
                            <button className="storm-buy-card" onClick={() => handleBuyObstacle('barbed_wire')} disabled={shmeckles < OBSTACLE_COSTS.barbed_wire}>
                                <div className="icon">〰️</div>
                                <div className="info">
                                    <h4>Barbed Wire</h4>
                                    <span>Slows & damages</span>
                                </div>
                                <div className="cost">🐌 {OBSTACLE_COSTS.barbed_wire}</div>
                            </button>
                            <button className="storm-buy-card" onClick={() => handleBuyObstacle('barricade')} disabled={shmeckles < OBSTACLE_COSTS.barricade}>
                                <div className="icon">🧱</div>
                                <div className="info">
                                    <h4>Barricade</h4>
                                    <span>Blocks enemies</span>
                                </div>
                                <div className="cost">🐌 {OBSTACLE_COSTS.barricade}</div>
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
