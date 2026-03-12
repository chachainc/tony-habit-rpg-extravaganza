import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPassiveBonuses } from './usePassiveEffects';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useGameStore } from './useGameStore';
import { useCurrencyStore } from './useCurrencyStore';
import type { TowerType, EnemyType, MapModifierType, WaveModifierType } from '../data/towerDefense';
import { TD_PATH, TD_TOWERS, TD_ENEMIES, getWaveComposition, rollMapModifier, rollWaveModifier } from '../data/towerDefense';

export interface PlacedTower {
    id: string;
    type: TowerType;
    towerType: TowerType; // Redundant explicit tracker for path logic
    x: number;
    y: number;
    level: number;
    upgradeLevel: number;
    upgradePath: string | null;
    specializationBranch: string | null;
    lastFired: number; // timestamp
}

export interface ActiveEnemy {
    id: string;
    type: EnemyType;
    hp: number;
    maxHp: number;
    pathIndex: number; // integer index in TD_PATH
    progress: number;  // 0.0 to 1.0 towards next path node
    speed: number;
    slowedUntil: number; // timestamp
}

export interface TowerDefenseState {
    // Core stats
    baseHealth: number;
    maxBaseHealth: number;
    currentWave: number;
    isWaveActive: boolean;

    // Entities
    towers: PlacedTower[];
    enemies: ActiveEnemy[];
    projectiles: { id: string, x: number, y: number, targetId: string, color: string }[];
    
    // Wave Management
    enemyQueue: EnemyType[];
    lastSpawnTime: number;
    currentMapModifier: MapModifierType;
    currentWaveModifier: WaveModifierType;

    // Actions
    buildTower: (type: TowerType, x: number, y: number) => boolean;
    sellTower: (id: string) => void;
    upgradeTower: (id: string) => boolean;
    
    startNextWave: () => void;
    engineTick: (timestamp: number) => void;
    takeDamage: (amount: number) => void;
    resetGame: () => void;
}

export const useTowerDefenseStore = create<TowerDefenseState>()(
    persist(
        (set, get) => ({
            baseHealth: 100,
            maxBaseHealth: 100,
            currentWave: 0,
            isWaveActive: false,

            towers: [],
            enemies: [],
            projectiles: [],
            
            enemyQueue: [],
            lastSpawnTime: 0,
            currentMapModifier: 'none',
            currentWaveModifier: 'none',

            buildTower: (type, x, y) => {
                const state = get();
                const def = TD_TOWERS[type];
                const costMod = state.currentMapModifier === 'fortified_path' ? 1.1 : 1.0;
                const finalCost = Math.floor(def.cost * costMod);

                const currStore = useCurrencyStore.getState();
                if (currStore.shmeckles < finalCost) return false;
                if (state.towers.some(t => t.x === x && t.y === y)) return false;

                currStore.spendShmeckles(finalCost);
                set({
                    towers: [...state.towers, {
                        id: `tower_${Date.now()}_${x}_${y}`,
                        type,
                        towerType: type,
                        x, y,
                        level: 1,
                        upgradeLevel: 1,
                        upgradePath: null,
                        specializationBranch: null,
                        lastFired: 0
                    }]
                });
                return true;
            },

            sellTower: (id) => {
                const state = get();
                const tower = state.towers.find(t => t.id === id);
                if (!tower) return;
                
                const def = TD_TOWERS[tower.type];
                const refundRate = state.currentMapModifier === 'drought' ? 1.0 : 0.5;
                const refund = Math.floor((def.cost * Math.pow(1.5, tower.level - 1)) * refundRate);

                useCurrencyStore.getState().addShmeckles(refund);
                set({
                    towers: state.towers.filter(t => t.id !== id)
                });
            },

            upgradeTower: (id) => {
                const state = get();
                const tower = state.towers.find(t => t.id === id);
                if (!tower || tower.level >= 3) return false;
                
                const def = TD_TOWERS[tower.type];
                const cost = Math.floor(def.cost * Math.pow(1.5, tower.level)); // 50 -> 75 -> 112
                
                const currStore = useCurrencyStore.getState();
                if (currStore.shmeckles < cost) return false;

                currStore.spendShmeckles(cost);
                set({
                    towers: state.towers.map(t => 
                        t.id === id ? { ...t, level: t.level + 1, upgradeLevel: t.upgradeLevel + 1 } : t
                    )
                });
                return true;
            },

            startNextWave: () => {
                const state = get();
                if (state.isWaveActive) return;

                const nextWave = state.currentWave + 1;
                let queue = getWaveComposition(nextWave);
                const nextWaveModifier = rollWaveModifier(nextWave);

                if (nextWaveModifier === 'horde') {
                    // +50% enemies
                    const extra = Math.floor(queue.length * 0.5);
                    const pool = [...queue];
                    for(let i=0; i<extra; i++) {
                        queue.push(pool[Math.floor(Math.random() * pool.length)]);
                    }
                }

                set({
                    currentWave: nextWave,
                    isWaveActive: true,
                    enemyQueue: queue,
                    lastSpawnTime: Date.now(),
                    currentWaveModifier: nextWaveModifier
                });
            },

            engineTick: (now) => {
                const state = get();
                if (!state.isWaveActive && state.enemies.length === 0) return;

                let { enemies, towers, enemyQueue, lastSpawnTime, baseHealth } = state;
                let newEnemies = [...enemies];
                let newTowers = [...towers];
                let newProjectiles: any[] = [];
                let damageTaken = 0;
                let shmecklesGained = 0;

                // 1. Spawning
                if (enemyQueue.length > 0 && now - lastSpawnTime > 1200) { // spawn every 1.2s
                    const typeToSpawn = enemyQueue[0];
                    const def = TD_ENEMIES[typeToSpawn];

                    let hpMod = 1.0;
                    if (state.currentMapModifier === 'fortified_path') hpMod *= 2.0;
                    if (state.currentWaveModifier === 'armored') hpMod *= 1.3;
                    if (state.currentWaveModifier === 'horde') hpMod *= 0.8;

                    let spdMod = 1.0;
                    if (state.currentMapModifier === 'leyline_surge') spdMod *= 1.1;
                    if (state.currentWaveModifier === 'armored') spdMod *= 0.9;
                    if (state.currentWaveModifier === 'swift') spdMod *= 1.3;

                    const finalHp = Math.max(1, Math.floor(def.baseHp * hpMod));
                    const finalSpeed = def.speed * spdMod;

                    newEnemies.push({
                        id: `enemy_${now}_${Math.random()}`,
                        type: typeToSpawn,
                        hp: finalHp,
                        maxHp: finalHp,
                        pathIndex: 0,
                        progress: 0,
                        speed: finalSpeed,
                        slowedUntil: 0
                    });
                    enemyQueue = enemyQueue.slice(1);
                    lastSpawnTime = now;
                }

                // 2. Enemy Movement
                const deltaSec = 1 / 60; // Approximated fixed delta

                newEnemies.forEach(enemy => {
                    if (state.currentWaveModifier === 'regenerating' && enemy.hp < enemy.maxHp) {
                        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (5 * deltaSec));
                    }

                    const isSlowed = now < enemy.slowedUntil;
                    const spd = isSlowed ? enemy.speed * 0.5 : enemy.speed;
                    enemy.progress += spd * deltaSec;

                    if (enemy.progress >= 1.0) {
                        enemy.pathIndex += 1;
                        enemy.progress = 0;
                        // Did it reach base?
                        if (enemy.pathIndex >= TD_PATH.length - 1) {
                            damageTaken += 10;
                            enemy.hp = 0; // mark for death
                        }
                    }
                });

                // Filter out base-reached
                newEnemies = newEnemies.filter(e => e.hp > 0);

                // Fetch Player Synergies
                const playerAtk = useGameStore.getState().getAttack();
                const playerMag = useGameStore.getState().getMagicAttack();

                // 3. Tower Firing
                newTowers.forEach(tower => {
                    const def = TD_TOWERS[tower.type];
                    let cdMod = state.currentMapModifier === 'leyline_surge' ? 0.8 : 1.0;
                    const cd = (def.cooldown / Math.pow(1.2, tower.level - 1)) * cdMod; // faster per level
                    
                    if (now - tower.lastFired >= cd) {
                        // Find target
                        const target = newEnemies.find(e => {
                            const p1 = TD_PATH[e.pathIndex];
                            const p2 = TD_PATH[e.pathIndex + 1] || p1;
                            const ex = p1.x + (p2.x - p1.x) * e.progress;
                            const ey = p1.y + (p2.y - p1.y) * e.progress;
                            
                            const dist = Math.sqrt(Math.pow(ex - tower.x, 2) + Math.pow(ey - tower.y, 2));
                            return dist <= def.range;
                        });

                        if (target) {
                            tower.lastFired = now;

                            // Synergy: physical towers scale with Atk, magic/frost with Mag
                            let synergyBuff = 0;
                            if (tower.type === 'archer' || tower.type === 'cannon') synergyBuff = playerAtk;
                            if (tower.type === 'mage' || tower.type === 'frost') synergyBuff = playerMag;
                            
                            const dmg = Math.floor((def.damage + synergyBuff) * Math.pow(1.5, tower.level - 1));
                            target.hp -= dmg;
                            
                            if (tower.type === 'frost') {
                                // Synergy: Magic boosts slow duration
                                target.slowedUntil = now + 2000 + (playerMag * 20);
                            }

                            if (tower.type !== 'frost') {
                                newProjectiles.push({
                                    id: `proj_${now}_${tower.id}`,
                                    x: tower.x, y: tower.y,
                                    targetId: target.id,
                                    color: def.projectileColor
                                });
                            }
                        }
                    }
                });

                // Process deaths
                const killed = newEnemies.filter(e => e.hp <= 0);
                killed.forEach(k => {
                    let rwd = TD_ENEMIES[k.type].reward;
                    if (state.currentMapModifier === 'drought') rwd = Math.max(1, Math.floor(rwd * 0.9));
                    shmecklesGained += rwd;
                });
                newEnemies = newEnemies.filter(e => e.hp > 0);
                
                if (shmecklesGained > 0) {
                    useCurrencyStore.getState().addShmeckles(shmecklesGained);
                }

                // Apply Base Damage
                let newBaseHealth = baseHealth - damageTaken;

                // Wave Check
                let isWaveActive = state.isWaveActive;
                if (isWaveActive && enemyQueue.length === 0 && newEnemies.length === 0) {
                    isWaveActive = false;
                    
                    // Wave Complete Rewards (Global)
                    const passives = getPassiveBonuses();
                    const sigils = Math.floor(state.currentWave / 2) + 1 + passives.sigil_bonus;
                    const gold = (state.currentWave * 5) + passives.gold_bonus;
                    const shmeckles = (state.currentWave * 5) + passives.gold_bonus;
                    
                    import('./useConquestStore').then(({ useConquestStore: cs }) => {
                        cs.getState().addSigils(sigils);
                    });
                    import('./useCurrencyStore').then(({ useCurrencyStore: curr }) => {
                        curr.getState().addGold(gold);
                        curr.getState().addShmeckles(shmeckles);
                    });
                }

                if (newBaseHealth <= 0) {
                    isWaveActive = false;
                    newBaseHealth = 0;
                }

                set({
                    enemies: newEnemies,
                    towers: newTowers,
                    enemyQueue,
                    lastSpawnTime,
                    baseHealth: newBaseHealth,
                    isWaveActive,
                    projectiles: newProjectiles
                });
            },

            takeDamage: (amount) => set(state => ({ baseHealth: Math.max(0, state.baseHealth - amount) })),
            
            resetGame: () => {
                set({
                    baseHealth: 100,
                    currentWave: 0,
                    isWaveActive: false,
                    towers: [],
                    enemies: [],
                    projectiles: [],
                    enemyQueue: [],
                    currentMapModifier: rollMapModifier(),
                    currentWaveModifier: 'none'
                });
            }
        }),
        {
            name: PERSIST_REGISTRY.towerDefense.persistKey,
            partialize: (state) => ({
                currentWave: state.currentWave,
                towers: state.towers,
                baseHealth: state.baseHealth
            })
        }
    )
);
