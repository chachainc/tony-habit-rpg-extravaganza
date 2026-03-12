import { create } from 'zustand';
import { useCurrencyStore } from './useCurrencyStore';

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
    lastWaveRewards: { shmeckles: number } | null;

    // Actions
    startGame: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    gameTick: (deltaMs: number) => void;
    
    // Purchasing actions
    buyDefender: (type: 'swordsman' | 'shield' | 'archer') => boolean;
    buyObstacle: (type: 'barbed_wire' | 'barricade', xPos: number) => boolean;
    buyUpgrade: (upgradeKey: keyof StormState['upgrades']) => boolean;
    
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
        // Generate enemies based on wave number
        const newEnemies: Enemy[] = [];
        const count = 5 + wave * 2;
        
        for (let i = 0; i < count; i++) {
            newEnemies.push({
                id: `enemy-${wave}-${i}`,
                type: 'basic',
                hp: 20 + (wave * 5),
                maxHp: 20 + (wave * 5),
                x: -10, // spawn offscreen left
                damage: 5 + wave,
                speed: 3 + (Math.random()), 
                range: 2,
                cooldown: 0,
                maxCooldown: 1000,
                reward: 2 + Math.floor(wave / 2),
            });
        }

        set({
            gameState: 'playing',
            enemies: [],
            enemiesToSpawn: newEnemies,
            spawnTimer: 0
        });
    },

    buyDefender: (type) => {
        // We will implement actual costs later, placeholders for now
        const costs = { 'swordsman': 15, 'shield': 25, 'archer': 20 };
        const cost = costs[type];
        const store = useCurrencyStore.getState();
        
        if (store.shmeckles >= cost) {
            store.spendShmeckles(cost);
            // Spawn defender at the fort (x=90) holding the line
            const newDefender: Defender = {
                id: `def-${Date.now()}`,
                type,
                hp: type === 'shield' ? 100 : 40,
                maxHp: type === 'shield' ? 100 : 40,
                x: 80 - Math.random() * 20, // scatter near fort
                damage: type === 'swordsman' ? 15 : (type === 'archer' ? 10 : 5),
                speed: 0, 
                range: type === 'archer' ? 40 : 5,
                cooldown: 0,
                maxCooldown: type === 'archer' ? 1500 : 1000,
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
                wave: victory ? state.wave + 1 : state.wave
            };
            
            if (victory) {
                const waveShmeckles = state.wave * 5 + (state.upgrades.shmeckleWaveBonusLevel * 5);
                
                newState.lastWaveRewards = { shmeckles: waveShmeckles };
                
                import('./useCurrencyStore').then(({ useCurrencyStore: cs }) => {
                    cs.getState().addShmeckles(waveShmeckles);
                });
                
                const repairAmount = state.upgrades.fortRepairLevel * 10;
                if (repairAmount > 0) {
                    newState.fortHp = Math.min(state.maxFortHp, state.fortHp + repairAmount);
                }
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
                    // Deal damage to fort (reduced by armor) and die
                    const damageReduction = state.upgrades.fortArmorLevel * 2;
                    const finalDamage = Math.max(1, e.damage - damageReduction);
                    fortHp -= finalDamage;
                    e.hp = 0;
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
