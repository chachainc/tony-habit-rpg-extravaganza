import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPassiveBonuses } from './usePassiveEffects';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useGameStore } from './useGameStore';
import { useCurrencyStore } from './useCurrencyStore';
import { useArenaStatsStore } from './useArenaStatsStore';
import type { TowerType, EnemyType, MapModifierType, WaveModifierType } from '../data/towerDefense';
import { TD_PATH, TD_TOWERS, TD_ENEMIES, TD_SPECIALIZATIONS, getWaveComposition, rollMapModifier, rollWaveModifier } from '../data/towerDefense';

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
    dotDps?: number;     // burn damage per second
    dotUntil?: number;   // burn expires at timestamp
    isElite?: boolean;   // elite variant: 2x hp, 2x reward, red glow
}

export interface DamagePopup {
    id: string;
    x: number;  // grid x
    y: number;  // grid y
    value: number;
    isCrit: boolean;
    isHeal: boolean;
    age: number; // ms since spawn
    text?: string;
    color?: string;
}

export interface WaveStats {
    kills: number;
    damageDealt: number;
    towersPlaced: number;
    goldEarned: number;
    shmecklesEarned: number;
}

export interface TowerDefenseState {
    // Core stats
    baseHealth: number;
    maxBaseHealth: number;
    currentWave: number;
    isWaveActive: boolean;
    gameSpeed: 1 | 2 | 3;

    // Entities
    towers: PlacedTower[];
    enemies: ActiveEnemy[];
    projectiles: { id: string, fromX: number, fromY: number, toX: number, toY: number, progress: number, damage: number, targetId: string, color: string, splashRadius?: number, dotDps?: number, chainBounces?: number }[];
    damagePopups: DamagePopup[];
    
    // Tower Inventory (owned but not placed)
    towerInventory: Partial<Record<TowerType, number>>;

    // Wave Management
    enemyQueue: EnemyType[];
    lastSpawnTime: number;
    currentMapModifier: MapModifierType;
    currentWaveModifier: WaveModifierType;
    totalWaveEnemies: number; // for progress bar

    // Stats tracking
    waveStats: WaveStats;
    showStats: boolean; // show stats modal
    screenShake: boolean; // triggered on boss death

    // Actions
    buildTower: (type: TowerType, x: number, y: number) => boolean;
    storeTower: (id: string) => void;
    storeAllTowers: () => void;
    upgradeTower: (id: string) => boolean;
    specializeTower: (id: string, branch: string) => boolean;
    setGameSpeed: (speed: 1 | 2 | 3) => void;
    dismissStats: () => void;
    
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
            gameSpeed: 1 as 1 | 2 | 3,

            towers: [],
            enemies: [],
            projectiles: [],
            damagePopups: [],
            towerInventory: {},
            
            enemyQueue: [],
            lastSpawnTime: 0,
            currentMapModifier: 'none' as MapModifierType,
            currentWaveModifier: 'none' as WaveModifierType,
            totalWaveEnemies: 0,

            waveStats: { kills: 0, damageDealt: 0, towersPlaced: 0, goldEarned: 0, shmecklesEarned: 0 },
            showStats: false,
            screenShake: false,

            setGameSpeed: (speed) => set({ gameSpeed: speed }),
            dismissStats: () => set({ showStats: false }),

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
                        towerInventory: { ...s.towerInventory, [type]: ownedCount - 1 },
                        waveStats: { ...s.waveStats, towersPlaced: s.waveStats.towersPlaced + 1 }
                    }));
                } else {
                    // Purchase new tower
                    const currStore = useCurrencyStore.getState();
                    if ((currStore.balloons ?? 0) < finalCost) return false;
                    currStore.spendBalloons(finalCost);
                    set(s => ({
                        towers: [...s.towers, {
                            id: `tower_${Date.now()}_${x}_${y}`,
                            type, towerType: type, x, y,
                            level: 1, upgradeLevel: 1,
                            upgradePath: null, specializationBranch: null, lastFired: 0
                        }],
                        waveStats: { ...s.waveStats, towersPlaced: s.waveStats.towersPlaced + 1 }
                    }));
                }
                return true;
            },

            storeTower: (id) => {
                const state = get();
                const tower = state.towers.find(t => t.id === id);
                if (!tower) return;
                
                const currentInv = state.towerInventory[tower.type] ?? 0;
                set(s => ({
                    towers: s.towers.filter(t => t.id !== id),
                    towerInventory: { ...s.towerInventory, [tower.type]: currentInv + 1 }
                }));
            },

            storeAllTowers: () => {
                const state = get();
                const newInventory = { ...state.towerInventory };
                
                state.towers.forEach(t => {
                    newInventory[t.type] = (newInventory[t.type] ?? 0) + 1;
                });
                
                set({
                    towers: [],
                    towerInventory: newInventory
                });
            },

            upgradeTower: (id) => {
                const state = get();
                const tower = state.towers.find(t => t.id === id);
                if (!tower || tower.level >= 3) return false;
                
                const def = TD_TOWERS[tower.type];
                const cost = Math.floor(def.cost * Math.pow(1.5, tower.level)); // 50 -> 75 -> 112
                
                const currStore = useCurrencyStore.getState();
                if ((currStore.balloons ?? 0) < cost) return false;

                currStore.spendBalloons(cost);
                set({
                    towers: state.towers.map(t => 
                        t.id === id ? { ...t, level: t.level + 1, upgradeLevel: t.upgradeLevel + 1 } : t
                    )
                });
                return true;
            },

            specializeTower: (id, branch) => {
                const state = get();
                const tower = state.towers.find(t => t.id === id);
                if (!tower || tower.level < 2 || tower.specializationBranch) return false;

                const specs = TD_SPECIALIZATIONS[tower.type];
                if (!specs || !specs[branch]) return false;

                set({
                    towers: state.towers.map(t =>
                        t.id === id ? { ...t, specializationBranch: branch } : t
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
                    currentWaveModifier: nextWaveModifier,
                    totalWaveEnemies: queue.length,
                    waveStats: { kills: 0, damageDealt: 0, towersPlaced: state.waveStats.towersPlaced, goldEarned: 0, shmecklesEarned: 0 },
                    showStats: false,
                });
            },

            engineTick: (now) => {
                const state = get();
                if (!state.isWaveActive && state.enemies.length === 0) return;

                const speedMul = state.gameSpeed;

                let { enemies, towers, enemyQueue, lastSpawnTime, baseHealth } = state;
                let newEnemies = [...enemies];
                let newTowers = [...towers];
                let newProjectiles = [...state.projectiles];
                const newDamagePopups: DamagePopup[] = [];
                let damageTaken = 0;
                let killsThisTick = 0;
                let damageThisTick = 0;
                let goldThisTick = 0;
                let shmecklesThisTick = 0;

                // 1. Spawning (speed-scaled interval)
                const spawnInterval = Math.max(400, 1200 / speedMul);
                if (enemyQueue.length > 0 && now - lastSpawnTime > spawnInterval) {
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

                    // 10% chance to spawn as Elite (2x HP, 2x reward)
                    const isElite = !def.isBoss && Math.random() < 0.10;
                    const eliteHp = isElite ? finalHp * 2 : finalHp;

                    newEnemies.push({
                        id: `enemy_${now}_${Math.random()}`,
                        type: typeToSpawn,
                        hp: eliteHp,
                        maxHp: eliteHp,
                        pathIndex: 0,
                        progress: 0,
                        speed: finalSpeed,
                        slowedUntil: 0,
                        isElite,
                    });
                    enemyQueue = enemyQueue.slice(1);
                    lastSpawnTime = now;
                }

                // 2. Enemy Movement (speed-scaled)
                const deltaSec = (1 / 60) * speedMul;

                newEnemies.forEach(enemy => {
                    if (state.currentWaveModifier === 'regenerating' && enemy.hp < enemy.maxHp) {
                        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (5 * deltaSec));
                    }

                    // Apply DoT burn damage
                    if (enemy.dotDps && enemy.dotUntil && now < enemy.dotUntil) {
                        const dotDmg = enemy.dotDps * deltaSec;
                        enemy.hp -= dotDmg;
                        damageThisTick += dotDmg;
                    }

                    const isSlowed = now < enemy.slowedUntil;
                    const spd = isSlowed ? enemy.speed * 0.5 : enemy.speed;
                    enemy.progress += spd * deltaSec;

                    if (enemy.progress >= 1.0) {
                        enemy.pathIndex += 1;
                        enemy.progress = 0;
                        // Did it reach base?
                        if (enemy.pathIndex >= TD_PATH.length - 1) {
                            damageTaken += 9999; // immediate fail
                            enemy.hp = 0; // mark for death
                            
                            const ep = TD_PATH[TD_PATH.length - 1];
                            newDamagePopups.push({ id: `escape-${now}-${enemy.id}`, x: ep.x, y: ep.y, value: 0, isCrit: false, isHeal: false, age: 0, text: "ESCAPED!", color: '#ef4444' });
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
                    const spec = tower.specializationBranch && TD_SPECIALIZATIONS[tower.type]
                        ? TD_SPECIALIZATIONS[tower.type]![tower.specializationBranch]
                        : null;

                    const cdMulMap = state.currentMapModifier === 'leyline_surge' ? 0.8 : 1.0;
                    const cdMulSpec = spec?.cdMod ?? 1;
                    const cd = (def.cooldown / Math.pow(1.2, tower.level - 1)) * cdMulMap * cdMulSpec;
                    
                    const rangeMul = spec?.rangeMod ?? 1;
                    const effectiveRange = def.range * rangeMul;

                    if (now - tower.lastFired >= cd) {
                        // Find target
                        const target = newEnemies.find(e => {
                            const p1 = TD_PATH[e.pathIndex];
                            const p2 = TD_PATH[e.pathIndex + 1] || p1;
                            const ex = p1.x + (p2.x - p1.x) * e.progress;
                            const ey = p1.y + (p2.y - p1.y) * e.progress;
                            const dist = Math.sqrt(Math.pow(ex - tower.x, 2) + Math.pow(ey - tower.y, 2));
                            return dist <= effectiveRange;
                        });

                        if (target) {
                            tower.lastFired = now;

                            // Synergy: physical towers scale with Atk, magic/frost with Mag
                            let synergyBuff = 0;
                            if (tower.type === 'archer' || tower.type === 'cannon') synergyBuff = playerAtk;
                            if (tower.type === 'mage' || tower.type === 'frost') synergyBuff = playerMag;
                            
                            const dmgMul = spec?.dmgMod ?? 1;
                            const dmg = Math.floor((def.damage + synergyBuff) * Math.pow(1.5, tower.level - 1) * dmgMul);

                            // Compute splash radius
                            const baseSplash = def.splashRadius ?? 0;
                            const splashMul = spec?.splashMod ?? 1;
                            const splash = baseSplash * splashMul;

                            // Frost: apply slow + damage instantly (no projectile)
                            if (tower.type === 'frost') {
                                const slowDuration = (2000 + (playerMag * 20)) * (spec?.slowMod ?? 1);
                                
                                if (spec?.aoeSlow) {
                                    // Blizzard: AoE slow all in range
                                    newEnemies.forEach(e => {
                                        const p1 = TD_PATH[e.pathIndex];
                                        const p2 = TD_PATH[e.pathIndex + 1] || p1;
                                        const ex = p1.x + (p2.x - p1.x) * e.progress;
                                        const ey = p1.y + (p2.y - p1.y) * e.progress;
                                        const dist = Math.sqrt(Math.pow(ex - tower.x, 2) + Math.pow(ey - tower.y, 2));
                                        if (dist <= effectiveRange) {
                                            e.slowedUntil = now + slowDuration;
                                        }
                                    });
                                } else {
                                    target.hp -= dmg;
                                    damageThisTick += dmg;
                                    target.slowedUntil = now + slowDuration;
                                }
                            } else {
                                // All other towers: spawn a traveling projectile
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
                                    color: def.projectileColor,
                                    splashRadius: splash > 0 ? splash : undefined,
                                    dotDps: spec?.dotDps,
                                    chainBounces: spec?.chainBounces,
                                });

                                // Multishot: fire at extra targets
                                if (spec?.extraTargets) {
                                    const otherTargets = newEnemies.filter(e => {
                                        if (e.id === target.id) return false;
                                        const p1 = TD_PATH[e.pathIndex];
                                        const p2 = TD_PATH[e.pathIndex + 1] || p1;
                                        const ex = p1.x + (p2.x - p1.x) * e.progress;
                                        const ey = p1.y + (p2.y - p1.y) * e.progress;
                                        const dist = Math.sqrt(Math.pow(ex - tower.x, 2) + Math.pow(ey - tower.y, 2));
                                        return dist <= effectiveRange;
                                    }).slice(0, spec.extraTargets);

                                    for (const extra of otherTargets) {
                                        const ep1 = TD_PATH[extra.pathIndex];
                                        const ep2 = TD_PATH[extra.pathIndex + 1] || ep1;
                                        const ex = ep1.x + (ep2.x - ep1.x) * extra.progress;
                                        const ey = ep1.y + (ep2.y - ep1.y) * extra.progress;
                                        newProjectiles.push({
                                            id: `proj_${now}_${tower.id}_extra_${extra.id}`,
                                            fromX: tower.x + 0.5, fromY: tower.y + 0.5,
                                            toX: ex, toY: ey,
                                            progress: 0,
                                            damage: dmg,
                                            targetId: extra.id,
                                            color: def.projectileColor,
                                        });
                                    }
                                }
                            }
                        }
                    }
                });

                // 3b. Advance projectiles and apply damage on impact
                const PROJ_SPEED = 4.0 * speedMul;
                const activeProjectiles: typeof newProjectiles = [];
                for (const p of newProjectiles) {
                    p.progress += PROJ_SPEED * (1 / 60);
                    if (p.progress >= 1) {
                        // Impact — apply damage to target
                        const hitTarget = newEnemies.find(e => e.id === p.targetId && e.hp > 0);
                        if (hitTarget) {
                            // 10% critical hit chance: 2x damage
                            const isCrit = Math.random() < 0.10;
                            const finalDmg = isCrit ? p.damage * 2 : p.damage;
                            hitTarget.hp -= finalDmg;
                            damageThisTick += finalDmg;

                            // Show damage popup on hit
                            const hp1 = TD_PATH[hitTarget.pathIndex];
                            const hp2 = TD_PATH[hitTarget.pathIndex + 1] || hp1;
                            const hpx = hp1.x + (hp2.x - hp1.x) * hitTarget.progress;
                            const hpy = hp1.y + (hp2.y - hp1.y) * hitTarget.progress;
                            if (isCrit) {
                                newDamagePopups.push({ id: `crit-${now}-${hitTarget.id}`, x: hpx, y: hpy, value: finalDmg, isCrit: true, isHeal: false, age: 0 });
                            }

                            // Apply DoT
                            if (p.dotDps) {
                                hitTarget.dotDps = p.dotDps;
                                hitTarget.dotUntil = now + 3000;
                            }

                            // Chain lightning
                            if (p.chainBounces && p.chainBounces > 0) {
                                const tp1 = TD_PATH[hitTarget.pathIndex];
                                const tp2 = TD_PATH[hitTarget.pathIndex + 1] || tp1;
                                const hx = tp1.x + (tp2.x - tp1.x) * hitTarget.progress;
                                const hy = tp1.y + (tp2.y - tp1.y) * hitTarget.progress;

                                const nearby = newEnemies
                                    .filter(e => e.id !== hitTarget.id && e.hp > 0)
                                    .filter(e => {
                                        const ep1 = TD_PATH[e.pathIndex];
                                        const ep2 = TD_PATH[e.pathIndex + 1] || ep1;
                                        const ex = ep1.x + (ep2.x - ep1.x) * e.progress;
                                        const ey = ep1.y + (ep2.y - ep1.y) * e.progress;
                                        return Math.sqrt(Math.pow(ex - hx, 2) + Math.pow(ey - hy, 2)) <= 2;
                                    })
                                    .slice(0, p.chainBounces);

                                for (const bounceTarget of nearby) {
                                    const chainDmg = Math.floor(p.damage * 0.6);
                                    bounceTarget.hp -= chainDmg;
                                    damageThisTick += chainDmg;
                                }
                            }
                        }

                        // Splash damage
                        if (p.splashRadius && p.splashRadius > 0) {
                            const splashTargets = newEnemies.filter(e => {
                                if (e.id === p.targetId) return false;
                                const ep1 = TD_PATH[e.pathIndex];
                                const ep2 = TD_PATH[e.pathIndex + 1] || ep1;
                                const ex = ep1.x + (ep2.x - ep1.x) * e.progress;
                                const ey = ep1.y + (ep2.y - ep1.y) * e.progress;
                                const dist = Math.sqrt(Math.pow(ex - p.toX, 2) + Math.pow(ey - p.toY, 2));
                                return dist <= p.splashRadius!;
                            });
                            const splashDmg = Math.floor(p.damage * 0.5);
                            for (const st of splashTargets) {
                                st.hp -= splashDmg;
                                damageThisTick += splashDmg;
                            }
                        }
                        // projectile consumed
                    } else {
                        activeProjectiles.push(p);
                    }
                }
                newProjectiles = activeProjectiles;

                // Process deaths — per-kill rewards!
                const arenaStats = useArenaStatsStore.getState();
                newEnemies = newEnemies.filter(e => {
                    if (e.hp <= 0 && e.pathIndex < TD_PATH.length - 1) {
                        // Per-kill reward
                        const enemyDef = TD_ENEMIES[e.type];
                        const rewardMul = e.isElite ? 2 : 1;
                        const killGold = 10 * rewardMul;
                        
                        useCurrencyStore.getState().addGold(killGold, { exact: true });
                        goldThisTick += killGold;
                        killsThisTick++;

                        // Damage popup on death location
                        const dp1 = TD_PATH[e.pathIndex];
                        const dp2 = TD_PATH[e.pathIndex + 1] || dp1;
                        const dx = dp1.x + (dp2.x - dp1.x) * e.progress;
                        const dy = dp1.y + (dp2.y - dp1.y) * e.progress;
                        newDamagePopups.push({ id: `kill-${now}-${e.id}`, x: dx, y: dy, value: killGold, isCrit: false, isHeal: false, age: 0, text: `+${killGold} 🪙`, color: '#facc15' });

                        // Arena stats
                        arenaStats.recordKill();
                        if (e.isElite) arenaStats.recordEliteKill();
                        if (enemyDef.isBoss) {
                            arenaStats.recordBossKill();
                            // Screen shake on boss death
                            set({ screenShake: true });
                            setTimeout(() => set({ screenShake: false }), 400);
                        }
                        arenaStats.recordGold(killGold);
                        return false;
                    }
                    return e.hp > 0;
                });

                // Apply Base Damage
                let newBaseHealth = baseHealth - damageTaken;

                // Wave Check
                let isWaveActive = state.isWaveActive;
                let showStats = state.showStats;
                if (isWaveActive && enemyQueue.length === 0 && newEnemies.length === 0) {
                    isWaveActive = false;
                    showStats = true;
                    arenaStats.recordWaveSurvived();
                    arenaStats.updateTdBest(state.currentWave);
                    
                    // Wave Complete Rewards (Global)
                    const passives = getPassiveBonuses();
                    const sigils = Math.floor(state.currentWave / 2) + 1 + passives.sigil_bonus;
                    const gold = (state.currentWave * 5) + passives.gold_bonus;
                    const shmeckles = (state.currentWave * 5) + passives.gold_bonus;

                    goldThisTick += gold;
                    shmecklesThisTick += shmeckles;
                    
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
                    showStats = true;
                    arenaStats.updateTdBest(state.currentWave);
                }

                // Age and cleanup damage popups
                const existingPopups = state.damagePopups
                    .map(p => ({ ...p, age: p.age + 16 * speedMul }))
                    .filter(p => p.age < 1200);

                set({
                    enemies: newEnemies,
                    towers: newTowers,
                    enemyQueue,
                    lastSpawnTime,
                    baseHealth: newBaseHealth,
                    isWaveActive,
                    projectiles: newProjectiles,
                    damagePopups: [...existingPopups, ...newDamagePopups],
                    showStats,
                    waveStats: {
                        kills: state.waveStats.kills + killsThisTick,
                        damageDealt: state.waveStats.damageDealt + damageThisTick,
                        towersPlaced: state.waveStats.towersPlaced,
                        goldEarned: state.waveStats.goldEarned + goldThisTick,
                        shmecklesEarned: state.waveStats.shmecklesEarned + shmecklesThisTick,
                    }
                });
            },

            takeDamage: (amount) => set(state => ({ baseHealth: Math.max(0, state.baseHealth - amount) })),
            
            resetGame: () => {
                set({
                    baseHealth: get().maxBaseHealth || 100,
                    currentWave: Math.max(0, get().currentWave - 1),
                    isWaveActive: false,
                    enemies: [],
                    projectiles: [],
                    damagePopups: [],
                    enemyQueue: [],
                    currentMapModifier: rollMapModifier(),
                    currentWaveModifier: 'none',
                    totalWaveEnemies: 0,
                    waveStats: { kills: 0, damageDealt: 0, towersPlaced: 0, goldEarned: 0, shmecklesEarned: 0 },
                    showStats: false,
                    gameSpeed: 1,
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
