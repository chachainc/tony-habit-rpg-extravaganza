import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useCurrencyStore } from './useCurrencyStore';
import { useArenaStatsStore } from './useArenaStatsStore';

// ── Castle / Base Health Tuning ───────────────────────────────────────────
export const BASE_MAX_HP = 100;              // starting max HP (upgrades add to this)
export const BASE_DAMAGE_PER_ENEMY_PER_TICK = 5;  // HP lost per enemy at base per second

// ── Lane definitions ──────────────────────────────────────────────────────
const LANE_Y = [30, 50, 70]; // 3 lanes at 30%, 50%, 70%

// ── Enemy type definitions for Storm ──────────────────────────────────────
export type StormEnemyType = 'goblin' | 'orc' | 'skeleton' | 'bat_swarm' | 'dark_knight' | 'golem' | 'boss_slime';

export const STORM_ENEMY_DEFS: Record<StormEnemyType, { icon: string; name: string; hpBase: number; speedBase: number; damageBase: number; reward: number; isBoss?: boolean }> = {
    goblin:       { icon: '👺', name: 'Goblin',      hpBase: 20,  speedBase: 4.0, damageBase: 5,  reward: 2 },
    skeleton:     { icon: '💀', name: 'Skeleton',    hpBase: 30,  speedBase: 3.5, damageBase: 6,  reward: 3 },
    bat_swarm:    { icon: '🦇', name: 'Bat Swarm',   hpBase: 15,  speedBase: 5.0, damageBase: 3,  reward: 2 },
    orc:          { icon: '👹', name: 'Orc',         hpBase: 50,  speedBase: 2.5, damageBase: 8,  reward: 5 },
    dark_knight:  { icon: '⚔️', name: 'Dark Knight', hpBase: 80,  speedBase: 2.0, damageBase: 12, reward: 8 },
    golem:        { icon: '🪨', name: 'Golem',       hpBase: 150, speedBase: 1.5, damageBase: 15, reward: 12 },
    boss_slime:   { icon: '👑', name: 'King Slime',  hpBase: 300, speedBase: 1.0, damageBase: 20, reward: 25, isBoss: true },
};

function getStormWaveEnemies(wave: number): StormEnemyType[] {
    const enemies: StormEnemyType[] = [];
    if (wave <= 1) {
        for (let i = 0; i < 8; i++) enemies.push('goblin');
    } else if (wave === 2) {
        for (let i = 0; i < 10; i++) enemies.push('goblin');
        for (let i = 0; i < 3; i++) enemies.push('skeleton');
    } else if (wave === 3) {
        for (let i = 0; i < 8; i++) enemies.push('goblin');
        for (let i = 0; i < 4; i++) enemies.push('skeleton');
        for (let i = 0; i < 3; i++) enemies.push('bat_swarm');
        for (let i = 0; i < 2; i++) enemies.push('orc');
    } else if (wave === 4) {
        for (let i = 0; i < 6; i++) enemies.push('skeleton');
        for (let i = 0; i < 4; i++) enemies.push('orc');
        for (let i = 0; i < 4; i++) enemies.push('bat_swarm');
        for (let i = 0; i < 2; i++) enemies.push('dark_knight');
    } else if (wave % 5 === 0) {
        enemies.push('boss_slime');
        for (let i = 0; i < wave; i++) enemies.push('orc');
        for (let i = 0; i < Math.floor(wave / 3); i++) enemies.push('dark_knight');
    } else {
        const count = 10 + wave * 2;
        for (let i = 0; i < count; i++) {
            const r = Math.random();
            if (r < 0.20) enemies.push('goblin');
            else if (r < 0.35) enemies.push('skeleton');
            else if (r < 0.45) enemies.push('bat_swarm');
            else if (r < 0.65) enemies.push('orc');
            else if (r < 0.80) enemies.push('dark_knight');
            else enemies.push('golem');
        }
    }
    return enemies;
}

// ── Wave Preview helper ──
export function getStormWavePreview(wave: number): Record<string, number> {
    const enemies = getStormWaveEnemies(wave);
    const counts: Record<string, number> = {};
    for (const e of enemies) {
        counts[e] = (counts[e] || 0) + 1;
    }
    return counts;
}

export type StormGameState = 'idle' | 'playing' | 'paused' | 'victory' | 'defeat';

export type DefenderType = 'cow' | 'swordsman' | 'shield' | 'archer' | 'medic';

// ── Ability definitions ──
export interface AbilityDef {
    name: string;
    icon: string;
    cooldown: number; // ms
    description: string;
}

export const DEFENDER_ABILITIES: Record<DefenderType, AbilityDef> = {
    cow:       { name: 'Stampede',  icon: '🐂', cooldown: 15000, description: '3x damage to all in range' },
    swordsman: { name: 'Rally',     icon: '📯', cooldown: 20000, description: '+50% damage to all defenders for 5s' },
    shield:    { name: 'Fortify',   icon: '🛡️', cooldown: 18000, description: 'Block all damage for 3s' },
    archer:    { name: 'Volley',    icon: '🎯', cooldown: 12000, description: 'Fire 5 shots at random enemies' },
    medic:     { name: 'Mass Heal', icon: '💚', cooldown: 25000, description: 'Fully heal all defenders' },
};

// ── Veterancy XP thresholds ──
const RANK_THRESHOLDS = [0, 30, 70, 120];
function getRankFromXp(xp: number): number {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= RANK_THRESHOLDS[i]) return i;
    }
    return 0;
}

// Basic entity bounds for the side-view lane
export interface CombatEntity {
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    x: number; // 0 (left) to 100 (right/fort)
    y: number; // vertical position as % (30, 50, 70 for lanes)
    damage: number;
    speed: number;
    range: number;
    cooldown: number; // attack cooldown
    maxCooldown: number;
}

export interface Enemy extends CombatEntity {
    reward: number; // Shmeckles dropped
    enemyType: StormEnemyType;
    lane: number; // 0, 1, or 2
    isElite?: boolean; // 2x HP, 2x reward, red glow
}

export interface StormDamagePopup {
    id: string;
    x: number;
    y: number;
    value: number;
    isCrit: boolean;
    age: number;
}

export interface Defender extends CombatEntity {
    isStatic: boolean;
    defenderType: DefenderType;
    xp: number;
    rank: number;
    abilityReady: boolean;
    abilityCooldownTimer: number; // ms until next ability
    fortifyUntil: number; // timestamp — shield fortify active until
}

export interface Obstacle {
    id: string;
    type: 'barbed_wire' | 'barricade';
    x: number;
    hp: number;
    maxHp: number;
    slowFactor?: number;
    damagePerTick?: number;
}

export interface Projectile {
    id: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    progress: number; // 0 to 1
    damage: number;
    targetId: string;
    isHeal?: boolean; // medic heal projectile
}

// Legacy SavedFormation interface removed

export interface StormState {
    gameState: StormGameState;
    wave: number;
    fortHp: number;
    maxFortHp: number;
    enemies: Enemy[];
    defenders: Defender[];
    obstacles: Obstacle[];
    projectiles: Projectile[];
    enemiesToSpawn: Enemy[];
    spawnTimer: number;

    defenderInventory: Record<DefenderType, number>;
    obstacleInventory: Record<string, number>;

    upgrades: {
        fortHealthLevel: number;
        fortArmorLevel: number;
        fortRepairLevel: number;
        defenderDamageLevel: number;
        defenderHealthLevel: number;
        defenderSpeedLevel: number;
        wireStrengthLevel: number;
        trapDamageLevel: number;
        trapDurabilityLevel: number;
        shmeckleWaveBonusLevel: number;
        shmeckleKillBonusLevel: number;
    };
    lastWaveRewards: { shmeckles: number; gold: number } | null;

    // Combo system
    comboCount: number;
    comboTimer: number; // ms remaining on combo window
    comboPopups: { id: string; count: number; bonus: number; x: number; y: number; age: number }[];

    // High score
    bestWave: number;

    // Boss warning
    bossWarningActive: boolean;
    bossWarningTimer: number;

    // Rally buff (global damage boost)
    rallyUntil: number;

    // Damage popups
    damagePopups: StormDamagePopup[];

    // Actions
    startGame: () => void;
    resetToIdle: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    gameTick: (deltaMs: number) => void;
    
    // Purchasing
    buyDefender: (type: DefenderType) => boolean;
    buyObstacle: (type: 'barbed_wire' | 'barricade', xPos: number) => boolean;
    buyUpgrade: (upgradeKey: keyof StormState['upgrades']) => boolean;
    storeDefender: (id: string) => void;
    storeObstacle: (id: string) => void;
    storeAllDefenders: () => void;
    storeAllObstacles: () => void;
    hasBoughtFirstCow: boolean;
    
    // Movement
    moveDefender: (id: string, x: number, y: number) => void;
    activateAbility: (id: string) => void;

    // Wave Generation
    startNextWave: () => void;
    endGame: (victory: boolean) => void;
}

const DEFENDER_COSTS: Record<DefenderType, number> = { cow: 5, swordsman: 15, shield: 25, archer: 20, medic: 20 };

const DEFENDER_STATS: Record<DefenderType, { hp: number; dmg: number; range: number; cd: number }> = {
    cow:       { hp: 60, dmg: 8,  range: 20, cd: 2000 },
    swordsman: { hp: 40, dmg: 15, range: 5,  cd: 1000 },
    shield:    { hp: 100, dmg: 5, range: 5,  cd: 1000 },
    archer:    { hp: 40, dmg: 10, range: 40, cd: 1500 },
    medic:     { hp: 35, dmg: 0,  range: 25, cd: 2000 },
};

export const useStormStore = create<StormState>()(
    persist(
        (set, get) => ({
    gameState: 'idle',
    wave: 1,
    fortHp: 100,
    maxFortHp: 100,
    enemies: [],
    defenders: [],
    obstacles: [],
    projectiles: [],
    damagePopups: [],
    enemiesToSpawn: [],
    spawnTimer: 0,
    defenderInventory: { cow: 0, swordsman: 0, shield: 0, archer: 0, medic: 0 },
    obstacleInventory: { barbed_wire: 0, barricade: 0 },
    hasBoughtFirstCow: localStorage.getItem('stf-free-cow-claimed') === 'true',
    
    upgrades: {
        fortHealthLevel: 0,
        fortArmorLevel: 0,
        fortRepairLevel: 0,
        defenderDamageLevel: 0,
        defenderHealthLevel: 0,
        defenderSpeedLevel: 0,
        wireStrengthLevel: 0,
        trapDamageLevel: 0,
        trapDurabilityLevel: 0,
        shmeckleWaveBonusLevel: 0,
        shmeckleKillBonusLevel: 0,
    },
    lastWaveRewards: null,

    comboCount: 0,
    comboTimer: 0,
    comboPopups: [],

    bestWave: parseInt(localStorage.getItem('stf-best-wave') || '0', 10),

    bossWarningActive: false,
    bossWarningTimer: 0,

    rallyUntil: 0,

    startGame: () => {
        set({ 
            gameState: 'idle',  // idle, not playing — prevents instant false victory on empty battlefield
            enemies: [],
            projectiles: [],
            comboCount: 0,
            comboTimer: 0,
            comboPopups: [],
            bossWarningActive: false,
            rallyUntil: 0,
            lastWaveRewards: null,
            enemiesToSpawn: [],
        });
    },

    resetToIdle: () => {
        set({
            gameState: 'idle',
            enemies: [],
            projectiles: [],
            comboCount: 0,
            comboTimer: 0,
            comboPopups: [],
            bossWarningActive: false,
            rallyUntil: 0,
            lastWaveRewards: null,
            enemiesToSpawn: [],
        });
    },

    pauseGame: () => set({ gameState: 'paused' }),
    resumeGame: () => set({ gameState: 'playing' }),

    moveDefender: (id, x, y) => {
        set(state => ({
            defenders: state.defenders.map(d =>
                d.id === id
                    ? { ...d, x: Math.max(10, Math.min(95, x)), y: Math.max(15, Math.min(85, y)) }
                    : d
            )
        }));
    },

    activateAbility: (defId) => {
        const state = get();
        const defender = state.defenders.find(d => d.id === defId);
        if (!defender || !defender.abilityReady) return;

        const abilityDef = DEFENDER_ABILITIES[defender.defenderType];
        const now = Date.now();

        // Mark ability as used
        set(s => ({
            defenders: s.defenders.map(d =>
                d.id === defId
                    ? { ...d, abilityReady: false, abilityCooldownTimer: abilityDef.cooldown }
                    : d
            )
        }));

        switch (defender.defenderType) {
            case 'cow': {
                // Stampede: 3x damage to all enemies in range
                const effectiveDamage = (defender.damage + (state.upgrades.defenderDamageLevel * 5)) * 3;
                set(s => ({
                    enemies: s.enemies.map(e => {
                        const dx = e.x - defender.x;
                        const dy = (e.y - defender.y) * 0.5;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= defender.range) {
                            return { ...e, hp: e.hp - effectiveDamage };
                        }
                        return e;
                    })
                }));
                break;
            }
            case 'swordsman': {
                // Rally: +50% damage to all defenders for 5s
                set({ rallyUntil: now + 5000 });
                break;
            }
            case 'shield': {
                // Fortify: block all damage for 3s
                set(s => ({
                    defenders: s.defenders.map(d =>
                        d.id === defId ? { ...d, fortifyUntil: now + 3000 } : d
                    )
                }));
                break;
            }
            case 'archer': {
                // Volley: fire 5 projectiles at random enemies
                const targets = [...state.enemies].sort(() => Math.random() - 0.5).slice(0, 5);
                const effectiveDmg = defender.damage + (state.upgrades.defenderDamageLevel * 5);
                const newProjs: Projectile[] = targets.map((t, i) => ({
                    id: `volley-${now}-${i}`,
                    fromX: defender.x,
                    fromY: defender.y,
                    toX: t.x,
                    toY: t.y,
                    progress: 0,
                    damage: effectiveDmg,
                    targetId: t.id,
                }));
                set(s => ({ projectiles: [...s.projectiles, ...newProjs] }));
                break;
            }
            case 'medic': {
                // Mass Heal: fully heal all defenders
                set(s => ({
                    defenders: s.defenders.map(d => ({ ...d, hp: d.maxHp }))
                }));
                break;
            }
        }
    },
    storeAllDefenders: () => {
        const state = get();
        const newInventory = { ...state.defenderInventory };
        
        state.defenders.forEach(d => {
            newInventory[d.defenderType] = (newInventory[d.defenderType] ?? 0) + 1;
        });
        
        set({
            defenders: [],
            defenderInventory: newInventory
        });
    },

    storeAllObstacles: () => {
        const state = get();
        const newInventory = { ...state.obstacleInventory };
        
        state.obstacles.forEach(o => {
            const key = o.type === 'barbed_wire' ? 'barbed_wire' : 'barricade';
            newInventory[key] = (newInventory[key] ?? 0) + 1;
        });
        
        set({
            obstacles: [],
            obstacleInventory: newInventory
        });
    },

    startNextWave: () => {
        const { wave } = get();
        const types = getStormWaveEnemies(wave);

        // Check for boss and trigger warning
        const hasBoss = types.includes('boss_slime');

        const newEnemies: Enemy[] = types.map((eType, i) => {
            const def = STORM_ENEMY_DEFS[eType];
            const waveScale = 1 + (wave - 1) * 0.15;
            const lane = i % 3; // distribute across 3 lanes
            const isElite = !def.isBoss && Math.random() < 0.10;
            const eliteHp = Math.ceil(def.hpBase * waveScale) * (isElite ? 2 : 1);
            return {
                id: `enemy-${wave}-${i}`,
                type: eType,
                enemyType: eType,
                hp: eliteHp,
                maxHp: eliteHp,
                x: -5 - (Math.random() * 10), // spawn offscreen left, staggered
                y: LANE_Y[lane],
                damage: Math.ceil(def.damageBase * waveScale),
                speed: def.speedBase + (Math.random() * 0.5),
                range: 2,
                cooldown: 0,
                maxCooldown: 1000,
                reward: (def.reward + Math.floor(wave / 3)) * (isElite ? 2 : 1),
                lane,
                isElite,
            };
        });

        set({
            gameState: 'playing',
            enemies: [],
            projectiles: [],
            enemiesToSpawn: newEnemies,
            spawnTimer: 0,
            comboCount: 0,
            comboTimer: 0,
            bossWarningActive: hasBoss,
            bossWarningTimer: hasBoss ? 2000 : 0,
        });
    },

    storeDefender: (id) => {
        const state = get();
        const defender = state.defenders.find(d => d.id === id);
        if (!defender) return;
        set(s => ({
            defenders: s.defenders.filter(d => d.id !== id),
            defenderInventory: { ...s.defenderInventory, [defender.defenderType]: (s.defenderInventory[defender.defenderType] || 0) + 1 }
        }));
    },

    storeObstacle: (id) => {
        const state = get();
        const obs = state.obstacles.find(o => o.id === id);
        if (!obs) return;
        set(s => ({
            obstacles: s.obstacles.filter(o => o.id !== id),
            obstacleInventory: { ...s.obstacleInventory, [obs.type]: (s.obstacleInventory[obs.type] || 0) + 1 }
        }));
    },

    buyDefender: (type) => {
        const cost = DEFENDER_COSTS[type];
        const store = useCurrencyStore.getState();
        const state = get();

        const isFree = type === 'cow' && !state.hasBoughtFirstCow;
        const owned = state.defenderInventory[type] || 0;
        
        if (owned > 0 || isFree || store.shmeckles >= cost) {
            if (owned > 0) {
                // Consume inventory instead of shmeckles
                set(s => ({ defenderInventory: { ...s.defenderInventory, [type]: owned - 1 } }));
            } else {
                if (!isFree) store.spendShmeckles(cost);
                if (type === 'cow' && !state.hasBoughtFirstCow) {
                    set({ hasBoughtFirstCow: true });
                    localStorage.setItem('stf-free-cow-claimed', 'true');
                }
            }

            const s = DEFENDER_STATS[type];
            const hpBonus = state.upgrades.defenderHealthLevel * 10;

            // Place defenders spread across right side with varied y positions
            const existingCount = state.defenders.length;
            const yPos = LANE_Y[existingCount % 3];

            const newDefender: Defender = {
                id: `def-${Date.now()}`,
                type,
                defenderType: type,
                hp: s.hp + hpBonus,
                maxHp: s.hp + hpBonus,
                x: 75 - (existingCount * 5 % 20),
                y: yPos,
                damage: s.dmg,
                speed: 0,
                range: s.range,
                cooldown: 0,
                maxCooldown: s.cd,
                isStatic: true,
                xp: 0,
                rank: 0,
                abilityReady: true,
                abilityCooldownTimer: 0,
                fortifyUntil: 0,
            };
            set(state => ({ defenders: [...state.defenders, newDefender] }));
            return true;
        }
        return false;
    },

    buyObstacle: (type, xPos) => {
        const costs = { 'barbed_wire': 10, 'barricade': 30 };
        const cost = costs[type];
        const store = useCurrencyStore.getState();
        const state = get();

        const owned = state.obstacleInventory[type] || 0;

        if (owned > 0 || store.shmeckles >= cost) {
            if (owned > 0) {
                set(s => ({ obstacleInventory: { ...s.obstacleInventory, [type]: owned - 1 } }));
            } else {
                store.spendShmeckles(cost);
            }
            const newObstacle: Obstacle = {
                id: `obs-${Date.now()}`,
                type,
                hp: type === 'barricade' ? 200 : 50,
                maxHp: type === 'barricade' ? 200 : 50,
                x: xPos,
                slowFactor: type === 'barbed_wire' ? 0.3 : undefined,
                damagePerTick: type === 'barbed_wire' ? 2 : 0
            };
            set(state => ({ obstacles: [...state.obstacles, newObstacle] }));
            return true;
        }
        return false;
    },

    buyUpgrade: (upgradeKey) => {
        const currentLevel = get().upgrades[upgradeKey];
        const cost = 50 + (currentLevel * 50);
        const store = useCurrencyStore.getState();

        if (store.shmeckles >= cost) {
            store.spendShmeckles(cost);
            set(state => {
                const newUpgrades = { ...state.upgrades, [upgradeKey]: currentLevel + 1 };
                
                let newMaxHp = state.maxFortHp;
                if (upgradeKey === 'fortHealthLevel') {
                    newMaxHp = 100 + (newUpgrades.fortHealthLevel * 50);
                }

                return { 
                    upgrades: newUpgrades,
                    maxFortHp: newMaxHp,
                    fortHp: upgradeKey === 'fortHealthLevel' ? state.fortHp + 50 : state.fortHp
                };
            });
            return true;
        }
        return false;
    },

    endGame: (victory) => {
        set(state => {
            const newState: Partial<StormState> = {
                gameState: victory ? 'victory' : 'defeat',
                wave: victory ? state.wave + 1 : state.wave,
                fortHp: state.maxFortHp,
                projectiles: [],
                bossWarningActive: false,
            };
            
            if (victory) {
                const waveShmeckles = state.wave * 5 + (state.upgrades.shmeckleWaveBonusLevel * 5);
                const waveGold = Math.min(state.wave * 5, 50);

                newState.lastWaveRewards = { shmeckles: waveShmeckles, gold: waveGold };

                // Arena stats
                const arenaStats = useArenaStatsStore.getState();
                arenaStats.recordWaveSurvived();
                arenaStats.recordGold(waveGold);
                arenaStats.recordShmeckles(waveShmeckles);
                arenaStats.updateStormBest(state.wave);

                // Grant XP to surviving defenders
                newState.defenders = state.defenders.map(d => {
                    const newXp = d.xp + 10;
                    const newRank = getRankFromXp(newXp);
                    const rankDmgBonus = newRank * 0.2; // +20% per rank
                    const rankHpBonus = newRank * 0.15; // +15% per rank
                    const baseStat = DEFENDER_STATS[d.defenderType];
                    return {
                        ...d,
                        xp: newXp,
                        rank: newRank,
                        damage: Math.floor(baseStat.dmg * (1 + rankDmgBonus)),
                        maxHp: Math.floor((baseStat.hp + (state.upgrades.defenderHealthLevel * 10)) * (1 + rankHpBonus)),
                        hp: Math.min(d.hp + 20, Math.floor((baseStat.hp + (state.upgrades.defenderHealthLevel * 10)) * (1 + rankHpBonus))),
                    };
                });

                import('./useCurrencyStore').then(({ useCurrencyStore: cs }) => {
                    cs.getState().addShmeckles(waveShmeckles);
                    cs.getState().addGold(waveGold);
                });

                // Update best wave
                const finalWave = state.wave;
                if (finalWave > state.bestWave) {
                    newState.bestWave = finalWave;
                    localStorage.setItem('stf-best-wave', String(finalWave));
                }
            } else {
                newState.lastWaveRewards = null;
                // Update best wave on defeat too
                if (state.wave > state.bestWave) {
                    newState.bestWave = state.wave;
                    localStorage.setItem('stf-best-wave', String(state.wave));
                }
            }
            
            return newState;
        });
    },

    gameTick: (deltaMs) => {
        const state = get();
        if (state.gameState !== 'playing') return;

        let { fortHp, enemies, defenders, obstacles, projectiles, enemiesToSpawn, spawnTimer } = state;
        const now = Date.now();

        // Boss warning countdown
        let bossWarningActive = state.bossWarningActive;
        let bossWarningTimer = state.bossWarningTimer;
        if (bossWarningActive) {
            bossWarningTimer -= deltaMs;
            if (bossWarningTimer <= 0) {
                bossWarningActive = false;
                bossWarningTimer = 0;
            }
        }

        // Combo timer
        let comboCount = state.comboCount;
        let comboTimer = state.comboTimer;
        let comboPopups = [...state.comboPopups];

        if (comboTimer > 0) {
            comboTimer -= deltaMs;
            if (comboTimer <= 0) {
                comboCount = 0;
                comboTimer = 0;
            }
        }

        // Age out combo popups
        comboPopups = comboPopups
            .map(p => ({ ...p, age: p.age + deltaMs }))
            .filter(p => p.age < 1500);

        // 1. Spawning — one enemy per second
        if (enemiesToSpawn.length > 0) {
            spawnTimer += deltaMs;
            if (spawnTimer >= 600) { // slightly faster spawn rate
                const toSpawn = enemiesToSpawn.shift();
                if (toSpawn) enemies.push(toSpawn);
                spawnTimer = 0;
            }
        }

        // 2. Obstacle Processing
        const enemySlows = new Map<string, number>();
        const enemyObstacleBlock = new Map<string, Obstacle>();

        for (const obs of obstacles) {
            for (const e of enemies) {
                if (Math.abs(e.x - obs.x) < 5) {
                    if (obs.type === 'barbed_wire') {
                        enemySlows.set(e.id, obs.slowFactor || 1);
                        e.hp -= (obs.damagePerTick || 0) * (deltaMs/1000);
                        obs.hp -= 2 * (deltaMs/1000);
                    } else if (obs.type === 'barricade') {
                        enemyObstacleBlock.set(e.id, obs);
                    }
                }
            }
        }

        // Rally buff check
        const rallyActive = now < state.rallyUntil;

        // 3. Enemy Movement & Combat
        for (const e of enemies) {
            if (e.hp <= 0) continue;

            const blockObs = enemyObstacleBlock.get(e.id);
            const slow = enemySlows.get(e.id) || 1;

            if (blockObs) {
                e.cooldown -= deltaMs;
                if (e.cooldown <= 0) {
                    blockObs.hp -= e.damage;
                    e.cooldown = e.maxCooldown;
                }
            } else {
                e.x += e.speed * slow * (deltaMs / 1000);

                if (e.x >= 100) {
                    e.x = 100;
                    const damageReduction = state.upgrades.fortArmorLevel * 2;
                    const tickDamage = Math.max(0.5, BASE_DAMAGE_PER_ENEMY_PER_TICK - damageReduction);
                    fortHp -= tickDamage * (deltaMs / 1000);
                }
            }
        }

        // 4. Defender Combat — spawn projectiles
        const newProjectiles = [...projectiles];

        // Ability cooldown ticking
        const updatedDefenders = defenders.map(d => {
            const updated = { ...d };
            if (!updated.abilityReady && updated.abilityCooldownTimer > 0) {
                updated.abilityCooldownTimer -= deltaMs;
                if (updated.abilityCooldownTimer <= 0) {
                    updated.abilityReady = true;
                    updated.abilityCooldownTimer = 0;
                }
            }
            return updated;
        });

        for (const d of updatedDefenders) {
            d.cooldown -= deltaMs;
            if (d.cooldown <= 0) {
                const rankDmgBonus = d.rank * 0.2;
                const rallyBonus = rallyActive ? 0.5 : 0;
                const effectiveDamage = (d.damage + (state.upgrades.defenderDamageLevel * 5)) * (1 + rankDmgBonus + rallyBonus);

                if (d.defenderType === 'medic') {
                    // Medic: heal lowest-HP friendly in range
                    let lowestDef: Defender | null = null;
                    let lowestPct = 1;
                    for (const ally of updatedDefenders) {
                        if (ally.id === d.id || ally.hp >= ally.maxHp) continue;
                        const dx = ally.x - d.x;
                        const dy = (ally.y - d.y) * 0.5;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= d.range) {
                            const pct = ally.hp / ally.maxHp;
                            if (pct < lowestPct) {
                                lowestPct = pct;
                                lowestDef = ally;
                            }
                        }
                    }
                    if (lowestDef) {
                        const healAmount = 15 + (state.upgrades.defenderDamageLevel * 3);
                        newProjectiles.push({
                            id: `heal-${now}-${d.id}`,
                            fromX: d.x,
                            fromY: d.y,
                            toX: lowestDef.x,
                            toY: lowestDef.y,
                            progress: 0,
                            damage: healAmount,
                            targetId: lowestDef.id,
                            isHeal: true,
                        });
                        d.cooldown = Math.max(200, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                    }
                } else {
                    // Find closest target in range (use distance formula with x and y)
                    let bestTarget: Enemy | null = null;
                    let bestDist = Infinity;
                    for (const e of enemies) {
                        if (e.hp <= 0) continue;
                        const dx = e.x - d.x;
                        const dy = (e.y - d.y) * 0.5; // y is scaled down since y% is tighter
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= d.range && dist < bestDist) {
                            bestDist = dist;
                            bestTarget = e;
                        }
                    }
                    
                    if (bestTarget) {
                        newProjectiles.push({
                            id: `proj-${now}-${d.id}`,
                            fromX: d.x,
                            fromY: d.y,
                            toX: bestTarget.x,
                            toY: bestTarget.y,
                            progress: 0,
                            damage: effectiveDamage,
                            targetId: bestTarget.id,
                        });
                        d.cooldown = Math.max(200, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                    }
                }
            }
        }

        // 5. Update projectiles
        const PROJECTILE_SPEED = 3.0; // progress per second (takes ~0.33s to cross)
        const activeProjectiles: Projectile[] = [];
        for (const p of newProjectiles) {
            p.progress += PROJECTILE_SPEED * (deltaMs / 1000);
            if (p.progress >= 1) {
                if (p.isHeal) {
                    // Heal projectile — heal the defender
                    const target = updatedDefenders.find(d => d.id === p.targetId);
                    if (target) {
                        target.hp = Math.min(target.maxHp, target.hp + p.damage);
                    }
                } else {
                    // Hit — apply damage to target
                    const target = enemies.find(e => e.id === p.targetId && e.hp > 0);
                    if (target) {
                        // Fortify check — if target is attacking a fortified defender, skip (enemies don't receive this)
                        target.hp -= p.damage;
                    }
                }
            } else {
                activeProjectiles.push(p);
            }
        }

        // 6. Cleanup Dead Entities & Grant Rewards + Combos
        const arenaStats = useArenaStatsStore.getState();
        const damagePopups: StormDamagePopup[] = [];
        const filteredEnemies = enemies.filter(e => {
            if (e.hp <= 0 && e.x < 100) {
                const bonus = Math.floor(e.reward * (state.upgrades.shmeckleKillBonusLevel * 0.2));
                
                // Combo system
                comboCount++;
                comboTimer = 1500; // 1.5s combo window
                let comboBonus = 0;
                if (comboCount >= 3) {
                    comboBonus = comboCount * 2;
                    comboPopups.push({
                        id: `combo-${now}-${e.id}`,
                        count: comboCount,
                        bonus: comboBonus,
                        x: e.x,
                        y: e.y,
                        age: 0,
                    });
                    arenaStats.recordCombo();
                }

                const totalReward = e.reward + bonus + comboBonus;
                useCurrencyStore.getState().addShmeckles(totalReward);

                // Damage popup
                damagePopups.push({ id: `dpop-${now}-${e.id}`, x: e.x, y: e.y, value: totalReward, isCrit: !!e.isElite, age: 0 });

                // Arena stats
                arenaStats.recordKill();
                arenaStats.recordShmeckles(totalReward);
                if (e.isElite) arenaStats.recordEliteKill();
                if (STORM_ENEMY_DEFS[e.enemyType]?.isBoss) arenaStats.recordBossKill();
                return false;
            }
            return e.hp > 0;
        });

        const filteredObstacles = obstacles.filter(o => o.hp > 0);

        // Fort auto-repair
        if (state.upgrades.fortRepairLevel > 0) {
            const repairRate = state.upgrades.fortRepairLevel * 2; // HP per second
            fortHp = Math.min(state.maxFortHp, fortHp + repairRate * (deltaMs / 1000));
        }

        // 7. Win/Loss Condition
        if (fortHp <= 0) {
            get().endGame(false);
            return;
        }

        if (filteredEnemies.length === 0 && enemiesToSpawn.length === 0 && state.gameState === 'playing') {
            get().endGame(true);
            return;
        }

        set({
            fortHp,
            enemies: filteredEnemies,
            defenders: updatedDefenders,
            obstacles: filteredObstacles,
            projectiles: activeProjectiles,
            enemiesToSpawn,
            spawnTimer,
            comboCount,
            comboTimer,
            comboPopups,
            damagePopups: [
                ...(state.damagePopups || []).map(p => ({ ...p, age: p.age + deltaMs })).filter(p => p.age < 1200),
                ...damagePopups,
            ],
            bossWarningActive,
            bossWarningTimer,
        });
    }

}),
        {
            name: PERSIST_REGISTRY.storm.persistKey,
            partialize: (state) => ({
                wave: state.wave,
                fortHp: state.fortHp,
                maxFortHp: state.maxFortHp,
                defenders: state.defenders,
                obstacles: state.obstacles,
                defenderInventory: state.defenderInventory,
                obstacleInventory: state.obstacleInventory,
                bestWave: state.bestWave,
                hasBoughtFirstCow: state.hasBoughtFirstCow,
                upgrades: state.upgrades
            })
        }
    )
);
