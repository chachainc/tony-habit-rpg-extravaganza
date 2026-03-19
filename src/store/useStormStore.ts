import { create } from 'zustand';
import { useCurrencyStore } from './useCurrencyStore';

// ── Castle / Base Health Tuning ───────────────────────────────────────────
export const BASE_MAX_HP = 100;              // starting max HP (upgrades add to this)
export const BASE_DAMAGE_PER_ENEMY_PER_TICK = 5;  // HP lost per enemy at base per second

// ── Enemy type definitions for Storm ──────────────────────────────────────
export type StormEnemyType = 'goblin' | 'orc' | 'skeleton' | 'bat_swarm' | 'dark_knight' | 'golem' | 'boss_slime';

export const STORM_ENEMY_DEFS: Record<StormEnemyType, { icon: string; name: string; hpBase: number; speedBase: number; damageBase: number; reward: number }> = {
    goblin:       { icon: '👺', name: 'Goblin',      hpBase: 20,  speedBase: 4.0, damageBase: 5,  reward: 2 },
    skeleton:     { icon: '💀', name: 'Skeleton',    hpBase: 30,  speedBase: 3.5, damageBase: 6,  reward: 3 },
    bat_swarm:    { icon: '🦇', name: 'Bat Swarm',   hpBase: 15,  speedBase: 5.0, damageBase: 3,  reward: 2 },
    orc:          { icon: '👹', name: 'Orc',         hpBase: 50,  speedBase: 2.5, damageBase: 8,  reward: 5 },
    dark_knight:  { icon: '⚔️', name: 'Dark Knight', hpBase: 80,  speedBase: 2.0, damageBase: 12, reward: 8 },
    golem:        { icon: '🪨', name: 'Golem',       hpBase: 150, speedBase: 1.5, damageBase: 15, reward: 12 },
    boss_slime:   { icon: '👑', name: 'King Slime',  hpBase: 300, speedBase: 1.0, damageBase: 20, reward: 25 },
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

export type StormGameState = 'idle' | 'playing' | 'paused' | 'victory' | 'defeat';

// Basic entity bounds for the side-view lane
export interface CombatEntity {
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    x: number; // 0 (left) to 100 (right/fort)
    damage: number;
    speed: number;
    range: number;
    cooldown: number; // attack cooldown
    maxCooldown: number;
}

export interface Enemy extends CombatEntity {
    reward: number; // Shmeckles dropped
    enemyType: StormEnemyType;
}

export interface Defender extends CombatEntity {
    // Defenders might spawn at the fort (100) and move left, or hold position
    isStatic: boolean; 
}

export interface Obstacle {
    id: string;
    type: 'barbed_wire' | 'barricade';
    x: number;
    hp: number;
    maxHp: number;
    slowFactor?: number;   // e.g. 0.5 means half speed
    damagePerTick?: number;
}

export interface StormState {
    gameState: StormGameState;
    wave: number;
    fortHp: number;
    maxFortHp: number;
    enemies: Enemy[];
    defenders: Defender[];
    obstacles: Obstacle[];
    enemiesToSpawn: Enemy[];
    spawnTimer: number;

    // Upgrades matching the user request
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

    // Actions
    startGame: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    gameTick: (deltaMs: number) => void;
    
    // Purchasing
    buyDefender: (type: 'cow' | 'swordsman' | 'shield' | 'archer') => boolean;
    buyObstacle: (type: 'barbed_wire' | 'barricade', xPos: number) => boolean;
    buyUpgrade: (upgradeKey: keyof StormState['upgrades']) => boolean;
    hasBoughtFirstCow: boolean;
    
    // Wave Generation
    startNextWave: () => void;
    endGame: (victory: boolean) => void;
}

export const useStormStore = create<StormState>()((set, get) => ({
    gameState: 'idle',
    wave: 1,
    fortHp: 100,
    maxFortHp: 100,
    enemies: [],
    defenders: [],
    obstacles: [],
    enemiesToSpawn: [],
    spawnTimer: 0,
    hasBoughtFirstCow: false,
    
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

    startGame: () => set({ 
        gameState: 'playing', 
        wave: 1, 
        fortHp: get().maxFortHp,
        enemies: [],
        defenders: [],
        obstacles: [],
    }),

    pauseGame: () => set({ gameState: 'paused' }),
    resumeGame: () => set({ gameState: 'playing' }),

    startNextWave: () => {
        const { wave } = get();
        // Generate enemies based on wave number using varied types
        const types = getStormWaveEnemies(wave);
        const newEnemies: Enemy[] = types.map((eType, i) => {
            const def = STORM_ENEMY_DEFS[eType];
            const waveScale = 1 + (wave - 1) * 0.15;
            return {
                id: `enemy-${wave}-${i}`,
                type: eType,
                enemyType: eType,
                hp: Math.ceil(def.hpBase * waveScale),
                maxHp: Math.ceil(def.hpBase * waveScale),
                x: -10, // spawn offscreen left
                damage: Math.ceil(def.damageBase * waveScale),
                speed: def.speedBase + (Math.random() * 0.5),
                range: 2,
                cooldown: 0,
                maxCooldown: 1000,
                reward: def.reward + Math.floor(wave / 3),
            };
        });

        set({
            gameState: 'playing',
            enemies: [],
            enemiesToSpawn: newEnemies,
            spawnTimer: 0
        });
    },

    buyDefender: (type) => {
       // Cost configuration — cow is 5 shmeckles (first one free via store)
    const DEFENDER_COSTS = { cow: 5, swordsman: 15, shield: 25, archer: 20 };
        const cost = DEFENDER_COSTS[type];
        const store = useCurrencyStore.getState();
        const state = get();

        // First cow is FREE
        const isFree = type === 'cow' && !state.hasBoughtFirstCow;
        
        if (isFree || store.shmeckles >= cost) {
            if (!isFree) store.spendShmeckles(cost);
            if (type === 'cow' && !state.hasBoughtFirstCow) {
                set({ hasBoughtFirstCow: true });
            }

            const stats: Record<string, { hp: number; dmg: number; range: number; cd: number }> = {
                cow:       { hp: 60, dmg: 8,  range: 20, cd: 2000 },
                swordsman: { hp: 40, dmg: 15, range: 5,  cd: 1000 },
                shield:    { hp: 100, dmg: 5, range: 5,  cd: 1000 },
                archer:    { hp: 40, dmg: 10, range: 40, cd: 1500 },
            };
            const s = stats[type];

            const newDefender: Defender = {
                id: `def-${Date.now()}`,
                type,
                hp: s.hp,
                maxHp: s.hp,
                x: 80 - Math.random() * 20,
                damage: s.dmg,
                speed: 0,
                range: s.range,
                cooldown: 0,
                maxCooldown: s.cd,
                isStatic: true
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

        if (store.shmeckles >= cost) {
            store.spendShmeckles(cost);
            const newObstacle: Obstacle = {
                id: `obs-${Date.now()}`,
                type,
                hp: type === 'barricade' ? 200 : 50,
                maxHp: type === 'barricade' ? 200 : 50,
                x: xPos,
                slowFactor: type === 'barbed_wire' ? 0.3 : undefined, // 70% slow!
                damagePerTick: type === 'barbed_wire' ? 2 : 0
            };
            set(state => ({ obstacles: [...state.obstacles, newObstacle] }));
            return true;
        }
        return false;
    },

    buyUpgrade: (upgradeKey) => {
        // Simple scaled cost
        const currentLevel = get().upgrades[upgradeKey];
        const cost = 50 + (currentLevel * 50);
        const store = useCurrencyStore.getState();

        if (store.shmeckles >= cost) {
            store.spendShmeckles(cost);
            set(state => {
                const newUpgrades = { ...state.upgrades, [upgradeKey]: currentLevel + 1 };
                
                // If they bought Fort Health, immediately apply it
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
                // Always reset fort HP to full at end of wave (win or loss)
                fortHp: state.maxFortHp,
            };
            
            if (victory) {
                const waveShmeckles = state.wave * 5 + (state.upgrades.shmeckleWaveBonusLevel * 5);
                // Gold reward: wave * 5, capped at 50
                const waveGold = Math.min(state.wave * 5, 50);

                newState.lastWaveRewards = { shmeckles: waveShmeckles, gold: waveGold };

                import('./useCurrencyStore').then(({ useCurrencyStore: cs }) => {
                    cs.getState().addShmeckles(waveShmeckles);
                    cs.getState().addGold(waveGold);
                });
            } else {
                newState.lastWaveRewards = null;
            }
            
            return newState;
        });
    },

    gameTick: (deltaMs) => {
        const state = get();
        if (state.gameState !== 'playing') return;

        let { fortHp, enemies, defenders, obstacles, enemiesToSpawn, spawnTimer } = state;

        // 1. Spawning
        if (enemiesToSpawn.length > 0) {
            spawnTimer += deltaMs;
            if (spawnTimer >= 1000) { // spawn 1 per second
                const toSpawn = enemiesToSpawn.shift();
                if (toSpawn) enemies.push(toSpawn);
                spawnTimer = 0;
            }
        }

        // 2. Obstacle Processing
        // We will keep a map of slows per enemy
        const enemySlows = new Map<string, number>();
        const enemyObstacleBlock = new Map<string, Obstacle>();

        for (const obs of obstacles) {
            for (const e of enemies) {
                // If enemy is touching obstacle
                if (Math.abs(e.x - obs.x) < 5) {
                    if (obs.type === 'barbed_wire') {
                        enemySlows.set(e.id, obs.slowFactor || 1);
                        e.hp -= (obs.damagePerTick || 0) * (deltaMs/1000);
                        obs.hp -= 2 * (deltaMs/1000); // Wire takes damage from being walked on
                    } else if (obs.type === 'barricade') {
                        // Block enemy from moving
                        enemyObstacleBlock.set(e.id, obs);
                    }
                }
            }
        }

        // 3. Enemy Movement & Combat
        for (const e of enemies) {
            if (e.hp <= 0) continue;

            const blockObs = enemyObstacleBlock.get(e.id);
            const slow = enemySlows.get(e.id) || 1;

            if (blockObs) {
                // Attack barricade instead of moving
                e.cooldown -= deltaMs;
                if (e.cooldown <= 0) {
                    blockObs.hp -= e.damage;
                    e.cooldown = e.maxCooldown;
                }
            } else {
                // Move towards fort (x = 100)
                // Default speed is units per second
                e.x += e.speed * slow * (deltaMs / 1000);

                if (e.x >= 100) {
                    // Enemy has reached the base — clamp position and deal steady tick damage
                    e.x = 100;
                    const damageReduction = state.upgrades.fortArmorLevel * 2;
                    const tickDamage = Math.max(0.5, BASE_DAMAGE_PER_ENEMY_PER_TICK - damageReduction);
                    fortHp -= tickDamage * (deltaMs / 1000);
                    // Enemy drains health while touching the fort; it dies after dealing ~its own damage worth
                    e.hp -= tickDamage * (deltaMs / 1000);
                }
            }
        }

        // 4. Defender Combat
        // (Simplified: defenders auto-acquire closest target)
        for (const d of defenders) {
            d.cooldown -= deltaMs;
            if (d.cooldown <= 0) {
                // Find target in range
                // Calculate range with upgrade (simplified, assume default range if no specific upgrade exists now, we'll just use a small base boost instead of a dedicated range level)
                const effectiveRange = d.range;
                const effectiveDamage = d.damage + (state.upgrades.defenderDamageLevel * 5);
                
                const target = enemies.find(e => e.hp > 0 && Math.abs(e.x - d.x) <= effectiveRange);
                if (target) {
                    target.hp -= effectiveDamage;
                    d.cooldown = Math.max(200, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                }
            }
        }

        // 5. Cleanup Dead Entities & Grant Rewards
        const filteredEnemies = enemies.filter(e => {
            if (e.hp <= 0 && e.x < 100) { // died in combat, not crashing into fort
                const bonus = Math.floor(e.reward * (state.upgrades.shmeckleKillBonusLevel * 0.2));
                useCurrencyStore.getState().addShmeckles(e.reward + bonus);
                return false;
            }
            return e.hp > 0;
        });

        const filteredObstacles = obstacles.filter(o => o.hp > 0);

        // 6. Win/Loss Condition
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
            obstacles: filteredObstacles,
            enemiesToSpawn,
            spawnTimer
        });
    }

}));
