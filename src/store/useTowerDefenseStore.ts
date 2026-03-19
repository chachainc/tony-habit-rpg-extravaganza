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
    projectiles: { id: string, fromX: number, fromY: number, toX: number, toY: number, progress: number, damage: number, targetId: string, color: string }[];
    
    // Tower Inventory (owned but not placed)
    towerInventory: Partial<Record<TowerType, number>>;

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
            towerInventory: {},
            
            enemyQueue: [],
            lastSpawnTime: 0,
            currentMapModifier: 'none',
            currentWaveModifier: 'none',

            buildTower: (type, x, y) => {
                const state = get();
                const def = TD_TOWERS[type];
                const costMod = state.currentMapModifier === 'fortified_path' ? 1.1 : 1.0;
                const finalCost = Math.floor(def.cost * costMod);
                const ownedCount = state.towerInventory[type] ?? 0;

                if (state.towers.some(t => t.x === x && t.y === y)) return false;

                if (ownedCount > 0) {
                    // Place from inventory for free
                    set(s => ({
                        towers: [...s.towers, {
                            id: `tower_${Date.now()}_${x}_${y}`,
                            type, towerType: type, x, y,
                            level: 1, upgradeLevel: 1,
                            upgradePath: null, specializationBranch: null, lastFired: 0
                        }],
                        towerInventory: { ...s.towerInventory, [type]: ownedCount - 1 }
                    }));
                } else {
                    // Purchase new tower
                    const currStore = useCurrencyStore.getState();
                    if (currStore.shmeckles < finalCost) return false;
                    currStore.spendShmeckles(finalCost);
                    set(s => ({
                        towers: [...s.towers, {
                            id: `tower_${Date.now()}_${x}_${y}`,
                            type, towerType: type, x, y,
                            level: 1, upgradeLevel: 1,
                            upgradePath: null, specializationBranch: null, lastFired: 0
                        }]
                    }));
                }
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
                const currentInv = state.towerInventory[tower.type] ?? 0;
                set(s => ({
                    towers: s.towers.filter(t => t.id !== id),
                    towerInventory: { ...s.towerInventory, [tower.type]: currentInv + 1 }
                }));
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
                let newProjectiles = [...state.projectiles]; // carry over in-flight projectiles
                let damageTaken = 0;

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

                // 2b. Necromancer healing aura — heals nearby enemies 8 HP/sec
                newEnemies.forEach(necro => {
                    const necroDef = TD_ENEMIES[necro.type];
                    if (!necroDef.healsNearby || necro.hp <= 0) return;

                    const np1 = TD_PATH[necro.pathIndex];
                    const np2 = TD_PATH[necro.pathIndex + 1] || np1;
                    const nx = np1.x + (np2.x - np1.x) * necro.progress;
                    const ny = np1.y + (np2.y - np1.y) * necro.progress;

                    newEnemies.forEach(ally => {
                        if (ally.id === necro.id || ally.hp <= 0 || ally.hp >= ally.maxHp) return;
                        const ap1 = TD_PATH[ally.pathIndex];
                        const ap2 = TD_PATH[ally.pathIndex + 1] || ap1;
                        const ax = ap1.x + (ap2.x - ap1.x) * ally.progress;
                        const ay = ap1.y + (ap2.y - ap1.y) * ally.progress;
                        const dist = Math.sqrt(Math.pow(ax - nx, 2) + Math.pow(ay - ny, 2));
                        if (dist <= 2) {
                            ally.hp = Math.min(ally.maxHp, ally.hp + (8 * deltaSec));
                        }
                    });
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
                            // cow tower: flat damage, no stat synergy
                            
                            const dmg = Math.floor((def.damage + synergyBuff) * Math.pow(1.5, tower.level - 1));

                            // Frost: apply slow + damage instantly (no projectile)
                            if (tower.type === 'frost') {
                                target.hp -= dmg;
                                target.slowedUntil = now + 2000 + (playerMag * 20);
                            } else {
                                // All other towers: spawn a traveling projectile carrying the damage
                                const tp1 = TD_PATH[target.pathIndex];
                                const tp2 = TD_PATH[target.pathIndex + 1] || tp1;
                                const tx = tp1.x + (tp2.x - tp1.x) * target.progress;
                                const ty = tp1.y + (tp2.y - tp1.y) * target.progress;

                                newProjectiles.push({
                                    id: `proj_${now}_${tower.id}`,
                                    fromX: tower.x + 0.5, fromY: tower.y + 0.5,
                                    toX: tx, toY: ty,
                                    progress: 0,
                                    damage: dmg,
                                    targetId: target.id,
                                    color: def.projectileColor
                                });
                            }
                        }
                    }
                });

                // 3b. Advance projectiles and apply damage on impact
                const PROJ_SPEED = 4.0; // progress per second (~0.25s travel)
                const activeProjectiles: typeof newProjectiles = [];
                for (const p of newProjectiles) {
                    p.progress += PROJ_SPEED * deltaSec;
                    if (p.progress >= 1) {
                        // Impact — apply damage to target
                        const hitTarget = newEnemies.find(e => e.id === p.targetId && e.hp > 0);
                        if (hitTarget) {
                            hitTarget.hp -= p.damage;
                        }
                        // projectile consumed
                    } else {
                        activeProjectiles.push(p);
                    }
                }
                newProjectiles = activeProjectiles;

                // Process deaths — NO per-kill rewards in Tower Defense
                newEnemies = newEnemies.filter(e => e.hp > 0);

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
                    towerInventory: { cow: 1 }, // Free starter cow!
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
                baseHealth: state.baseHealth,
                towerInventory: state.towerInventory
            })
        }
    )
);
