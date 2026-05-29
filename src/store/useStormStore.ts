import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useCurrencyStore } from './useCurrencyStore';
import { useArenaStatsStore } from './useArenaStatsStore';
import { usePetStore } from './usePetStore';
import { getEnemyDefeatGoldReward } from '../utils/enemyRewards';
import { enableStormFort } from '../utils/featureFlags';

// ── Castle / Base Health Tuning ───────────────────────────────────────────
export const BASE_MAX_HP = 100;
export const CASTLE_X = 95;   // % x position of castle
export const CASTLE_Y = 50;   // % y position of castle
export const FORT_BOUNDARY_X = 85; // % where barricades live — the fort wall
export const WIRE_ZONE_X_MIN = 58; // forward trap lane — barbed wire goes here
export const WIRE_ZONE_X_MAX = 75; // left of barricade

// ── Lane definitions ──────────────────────────────────────────────────────
const LANE_Y = [25, 50, 75]; // 3 lanes

// ── Enemy type definitions — gold rewards ONLY ────
export type StormEnemyType = 'goblin' | 'orc' | 'skeleton' | 'bat_swarm' | 'dark_knight' | 'golem' | 'boss_slime';

export const STORM_ENEMY_DEFS: Record<StormEnemyType, {
    icon: string;
    name: string;
    hpBase: number;
    speedBase: number;
    damageBase: number;
    goldReward: number;   // gold per kill
    tier: number;         // 1=common … 5=boss
    isBoss?: boolean;
}> = {
    goblin:      { icon: '👺', name: 'Goblin',      hpBase: 20,  speedBase: 4.0, damageBase: 5,  goldReward: 1,  tier: 1 },
    bat_swarm:   { icon: '🦇', name: 'Bat Swarm',   hpBase: 15,  speedBase: 5.5, damageBase: 3,  goldReward: 1,  tier: 1 },
    skeleton:    { icon: '💀', name: 'Skeleton',    hpBase: 30,  speedBase: 3.5, damageBase: 6,  goldReward: 2,  tier: 2 },
    orc:         { icon: '👹', name: 'Orc',         hpBase: 55,  speedBase: 2.5, damageBase: 8,  goldReward: 3,  tier: 3 },
    dark_knight: { icon: '⚔️', name: 'Dark Knight', hpBase: 90,  speedBase: 2.0, damageBase: 12, goldReward: 5,  tier: 4 },
    golem:       { icon: '🪨', name: 'Golem',       hpBase: 180, speedBase: 1.2, damageBase: 18, goldReward: 8,  tier: 5 },
    boss_slime:  { icon: '👑', name: 'King Slime',  hpBase: 350, speedBase: 1.0, damageBase: 20, goldReward: 50, tier: 5, isBoss: true },
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

export interface AbilityDef {
    name: string;
    icon: string;
    cooldown: number;
    description: string;
}

export const DEFENDER_ABILITIES: Record<DefenderType, AbilityDef> = {
    cow:       { name: 'Stampede',  icon: '🐂', cooldown: 15000, description: '3× damage to all in range' },
    swordsman: { name: 'Rally',     icon: '📯', cooldown: 20000, description: '+50% damage to all defenders for 5s' },
    shield:    { name: 'Fortify',   icon: '🛡️', cooldown: 18000, description: 'Block all damage for 3s + taunt enemies' },
    archer:    { name: 'Volley',    icon: '🎯', cooldown: 12000, description: 'Fire 5 arrows at random enemies' },
    medic:     { name: 'Mass Heal', icon: '💚', cooldown: 25000, description: 'Fully heal all defenders' },
};

const RANK_THRESHOLDS = [0, 30, 70, 120];
function getRankFromXp(xp: number): number {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= RANK_THRESHOLDS[i]) return i;
    }
    return 0;
}

// ── Interfaces ────────────────────────────────────────────────────────────
export interface CombatEntity {
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    damage: number;
    speed: number;
    range: number;
    cooldown: number;
    maxCooldown: number;
}

export interface Enemy extends CombatEntity {
    goldReward: number;
    enemyType: StormEnemyType;
    lane: number;
    isElite?: boolean;
    // Pathing state
    reachedBoundary: boolean;   // true once x >= FORT_BOUNDARY_X
    targetX: number;            // diagonal target
    targetY: number;
}

export interface StormDamagePopup {
    id: string;
    x: number;
    y: number;
    value: number;
    isCrit: boolean;
    age: number;
    icon: string;   // '🪙' for gold, '💎' for gem
}

export interface Defender extends CombatEntity {
    isStatic: boolean;
    defenderType: DefenderType;
    xp: number;
    rank: number;
    abilityReady: boolean;
    abilityCooldownTimer: number;
    fortifyUntil: number;
}

export interface Obstacle {
    id: string;
    type: 'barbed_wire' | 'barricade';
    x: number;
    y: number;            // centre y% of this segment
    yStart: number;       // top of segment (for collision)
    yEnd: number;         // bottom of segment
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
    progress: number;
    damage: number;
    targetId: string;
    isHeal?: boolean;
    sourceType: DefenderType | 'barbed_wire'; // for visual identity
}

export interface StormState {
    gameState: StormGameState;
    wave: number;
    // Castle HP (fortHp renamed for clarity but kept compatible)
    fortHp: number;
    maxFortHp: number;
    castleHit: boolean;       // triggers shake animation
    enemies: Enemy[];
    defenders: Defender[];
    obstacles: Obstacle[];
    projectiles: Projectile[];
    enemiesToSpawn: Enemy[];
    spawnTimer: number;
    sessionKills: number; // For the every 3rd kill rule

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
        goldWaveBonusLevel: number;
        goldKillBonusLevel: number;
    };
    lastWaveRewards: { gold: number; gems?: number } | null;

    comboCount: number;
    comboTimer: number;
    comboPopups: { id: string; count: number; bonus: number; x: number; y: number; age: number }[];

    bestWave: number;
    bossWarningActive: boolean;
    bossWarningTimer: number;
    rallyUntil: number;
    damagePopups: StormDamagePopup[];

    // Actions
    startGame: () => void;
    resetToIdle: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    gameTick: (deltaMs: number) => void;

    buyDefender: (type: DefenderType) => boolean;
    buyObstacle: (type: 'barbed_wire' | 'barricade') => boolean;
    buyUpgrade: (upgradeKey: keyof StormState['upgrades']) => boolean;
    storeDefender: (id: string) => void;
    storeObstacle: (id: string) => void;
    storeAllDefenders: () => void;
    storeAllObstacles: () => void;
    hasBoughtFirstCow: boolean;

    moveDefender: (id: string, x: number, y: number) => void;
    activateAbility: (id: string) => void;

    startNextWave: () => void;
    endGame: (victory: boolean) => void;
}

// ── Cost / Stat tables ────────────────────────────────────────────────────
const DEFENDER_COSTS: Record<DefenderType, number> = {
    cow: 5, swordsman: 15, shield: 25, archer: 20, medic: 20
};

// Rebalanced stats: higher cost = clearly more powerful
const DEFENDER_STATS: Record<DefenderType, { hp: number; dmg: number; range: number; cd: number }> = {
    cow:       { hp: 80,  dmg: 6,  range: 12, cd: 2000 }, // cheap frontliner
    swordsman: { hp: 50,  dmg: 18, range: 5,  cd: 900  }, // melee DPS
    archer:    { hp: 35,  dmg: 14, range: 45, cd: 1400 }, // ranged DPS
    medic:     { hp: 30,  dmg: 0,  range: 30, cd: 1800 }, // healer
    shield:    { hp: 150, dmg: 3,  range: 5,  cd: 1500 }, // pure tank + taunt
};

const getPetFortStats = () => {
    const petDef = usePetStore.getState().getEquippedPetDef();
    if (petDef?.passive?.type === 'tank_storm' && typeof petDef.passive.value === 'object') {
        return {
            hpPercent: petDef.passive.value.fortHpPercent || 0,
            costDiscount: petDef.passive.value.fortCostDiscount || 0
        };
    }
    return { hpPercent: 0, costDiscount: 0 };
};

// ── Helper: recompute barricade segments when obstacles change ────────────
function recomputeBarricadeSegments(obstacles: Obstacle[]): Obstacle[] {
    const barricades = obstacles.filter(o => o.type === 'barricade');
    const others = obstacles.filter(o => o.type !== 'barricade');
    const n = barricades.length;
    if (n === 0) return obstacles;

    const segH = 100 / n;
    const updated = barricades.map((b, i) => ({
        ...b,
        x: FORT_BOUNDARY_X,
        y: i * segH + segH / 2,
        yStart: i * segH,
        yEnd: (i + 1) * segH,
    }));
    return [...others, ...updated];
}

// ── Store ─────────────────────────────────────────────────────────────────
export const useStormStore = create<StormState>()(
    persist(
        (set, get) => ({
    gameState: 'idle',
    wave: 1,
    fortHp: 100,
    maxFortHp: 100,
    castleHit: false,
    enemies: [],
    defenders: [],
    obstacles: [],
    projectiles: [],
    damagePopups: [],
    enemiesToSpawn: [],
    spawnTimer: 0,
    sessionKills: 0,
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
        goldWaveBonusLevel: 0,
        goldKillBonusLevel: 0,
    },
    lastWaveRewards: null,

    comboCount: 0,
    comboTimer: 0,
    comboPopups: [],

    bestWave: parseInt(localStorage.getItem('stf-best-wave') || '0', 10),

    bossWarningActive: false,
    bossWarningTimer: 0,
    rallyUntil: 0,

    // ── Lifecycle ─────────────────────────────────────────────────────────
    startGame: () => {
        set(state => {
            const petStats = getPetFortStats();
            const baseHp = BASE_MAX_HP + (state.upgrades.fortHealthLevel * 50);
            const maxFortHp = Math.floor(baseHp * (1 + (petStats.hpPercent / 100)));
            return {
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
                maxFortHp,
                fortHp: maxFortHp,
                castleHit: false,
            };
        });
    },

    resetToIdle: () => {
        set(state => {
            const petStats = getPetFortStats();
            const baseHp = BASE_MAX_HP + (state.upgrades.fortHealthLevel * 50);
            const maxFortHp = Math.floor(baseHp * (1 + (petStats.hpPercent / 100)));
            return {
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
                maxFortHp,
                fortHp: maxFortHp,
                castleHit: false,
            };
        });
    },

    pauseGame: () => set({ gameState: 'paused' }),
    resumeGame: () => set({ gameState: 'playing' }),

    // ── Movement ──────────────────────────────────────────────────────────
    moveDefender: (id, x, y) => {
        set(state => ({
            defenders: state.defenders.map(d =>
                d.id === id
                    ? { ...d, x: Math.max(10, Math.min(93, x)), y: Math.max(15, Math.min(85, y)) }
                    : d
            )
        }));
    },

    // ── Abilities ─────────────────────────────────────────────────────────
    activateAbility: (defId) => {
        const state = get();
        const defender = state.defenders.find(d => d.id === defId);
        if (!defender || !defender.abilityReady) return;

        const abilityDef = DEFENDER_ABILITIES[defender.defenderType];
        const now = Date.now();

        set(s => ({
            defenders: s.defenders.map(d =>
                d.id === defId
                    ? { ...d, abilityReady: false, abilityCooldownTimer: abilityDef.cooldown }
                    : d
            )
        }));

        switch (defender.defenderType) {
            case 'cow': {
                const effectiveDamage = (defender.damage + (state.upgrades.defenderDamageLevel * 5)) * 3;
                set(s => ({
                    enemies: s.enemies.map(e => {
                        const dx = e.x - defender.x;
                        const dy = (e.y - defender.y) * 0.5;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        return dist <= defender.range ? { ...e, hp: e.hp - effectiveDamage } : e;
                    })
                }));
                break;
            }
            case 'swordsman':
                set({ rallyUntil: now + 5000 });
                break;
            case 'shield':
                set(s => ({
                    defenders: s.defenders.map(d =>
                        d.id === defId ? { ...d, fortifyUntil: now + 3000 } : d
                    )
                }));
                break;
            case 'archer': {
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
                    sourceType: 'archer',
                }));
                set(s => ({ projectiles: [...s.projectiles, ...newProjs] }));
                break;
            }
            case 'medic':
                set(s => ({
                    defenders: s.defenders.map(d => ({ ...d, hp: d.maxHp }))
                }));
                break;
        }
    },

    // ── Store / recall ────────────────────────────────────────────────────
    storeAllDefenders: () => {
        const state = get();
        const newInventory = { ...state.defenderInventory };
        state.defenders.forEach(d => {
            newInventory[d.defenderType] = (newInventory[d.defenderType] ?? 0) + 1;
        });
        set({ defenders: [], defenderInventory: newInventory });
    },

    storeAllObstacles: () => {
        const state = get();
        const newInventory = { ...state.obstacleInventory };
        state.obstacles.forEach(o => {
            const key = o.type === 'barbed_wire' ? 'barbed_wire' : 'barricade';
            newInventory[key] = (newInventory[key] ?? 0) + 1;
        });
        set({ obstacles: [], obstacleInventory: newInventory });
    },

    storeDefender: (id) => {
        const state = get();
        const defender = state.defenders.find(d => d.id === id);
        if (!defender) return;
        set(s => ({
            defenders: s.defenders.filter(d => d.id !== id),
            defenderInventory: {
                ...s.defenderInventory,
                [defender.defenderType]: (s.defenderInventory[defender.defenderType] || 0) + 1
            }
        }));
    },

    storeObstacle: (id) => {
        const state = get();
        const obs = state.obstacles.find(o => o.id === id);
        if (!obs) return;
        const newObs = state.obstacles.filter(o => o.id !== id);
        set(s => ({
            obstacles: recomputeBarricadeSegments(newObs),
            obstacleInventory: { ...s.obstacleInventory, [obs.type]: (s.obstacleInventory[obs.type] || 0) + 1 }
        }));
    },

    // ── Wave launching ─────────────────────────────────────────────────────
    startNextWave: () => {
        const { wave } = get();
        const types = getStormWaveEnemies(wave);
        const hasBoss = types.includes('boss_slime');

        const newEnemies: Enemy[] = types.map((eType, i) => {
            const def = STORM_ENEMY_DEFS[eType];
            const waveScale = 1 + (wave - 1) * 0.15;
            const lane = i % 3;
            const isElite = !def.isBoss && Math.random() < 0.10;
            const eliteHp = Math.ceil(def.hpBase * waveScale) * (isElite ? 2 : 1);
            return {
                id: `enemy-${wave}-${i}`,
                type: eType,
                enemyType: eType,
                hp: eliteHp,
                maxHp: eliteHp,
                x: -5 - (Math.random() * 10),
                y: LANE_Y[lane],
                damage: Math.ceil(def.damageBase * waveScale),
                speed: def.speedBase + (Math.random() * 0.5),
                range: 2,
                cooldown: 0,
                maxCooldown: 1000,
                goldReward: def.goldReward * (isElite ? 2 : 1),
                lane,
                isElite,
                reachedBoundary: false,
                targetX: CASTLE_X,
                targetY: CASTLE_Y,
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
            castleHit: false,
        });
    },

    // ── Purchasing ────────────────────────────────────────────────────────
    buyDefender: (type) => {
        const cost = DEFENDER_COSTS[type];
        const store = useCurrencyStore.getState();
        const state = get();
        const isFree = type === 'cow' && !state.hasBoughtFirstCow;
        const owned = state.defenderInventory[type] || 0;

        if (owned > 0 || isFree || store.gold >= cost) {
            if (owned > 0) {
                set(s => ({ defenderInventory: { ...s.defenderInventory, [type]: owned - 1 } }));
            } else {
                if (!isFree) store.spendGold(cost);
                if (type === 'cow' && !state.hasBoughtFirstCow) {
                    set({ hasBoughtFirstCow: true });
                    localStorage.setItem('stf-free-cow-claimed', 'true');
                }
            }

            const s = DEFENDER_STATS[type];
            const hpBonus = state.upgrades.defenderHealthLevel * 10;
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

    buyObstacle: (type) => {
        const costs = { 'barbed_wire': 10, 'barricade': 30 };
        const cost = costs[type];
        const store = useCurrencyStore.getState();
        const state = get();
        const owned = state.obstacleInventory[type] || 0;

        if (owned > 0 || store.gold >= cost) {
            if (owned > 0) {
                set(s => ({ obstacleInventory: { ...s.obstacleInventory, [type]: owned - 1 } }));
            } else {
                store.spendGold(cost);
            }

            const durabilityBonus = state.upgrades.trapDurabilityLevel * 20;

            let newObs: Obstacle;
            if (type === 'barricade') {
                // Will be recomputed by recomputeBarricadeSegments
                newObs = {
                    id: `obs-${Date.now()}`,
                    type: 'barricade',
                    x: FORT_BOUNDARY_X,
                    y: 50,
                    yStart: 0,
                    yEnd: 100,
                    hp: 250 + durabilityBonus,
                    maxHp: 250 + durabilityBonus,
                };
            } else {
                // Barbed wire — placed in FORWARD TRAP ZONE left of the barricade wall
                // Distribute across the wire zone so multiple wires don't pile up
                const existingWireCount = state.obstacles.filter(o => o.type === 'barbed_wire').length;
                // Spread x across wire zone, cycling slightly so they don't overlap exactly
                const xPos = WIRE_ZONE_X_MIN + ((existingWireCount * 5) % (WIRE_ZONE_X_MAX - WIRE_ZONE_X_MIN));
                const wireY = LANE_Y[existingWireCount % 3];
                newObs = {
                    id: `obs-${Date.now()}`,
                    type: 'barbed_wire',
                    x: xPos,
                    y: wireY,
                    yStart: wireY - 15,
                    yEnd: wireY + 15,
                    hp: 60 + durabilityBonus,
                    maxHp: 60 + durabilityBonus,
                    slowFactor: 0.30,
                    damagePerTick: 2 + state.upgrades.wireStrengthLevel,
                };
            }

            const updatedObs = [...state.obstacles, newObs];
            set({ obstacles: recomputeBarricadeSegments(updatedObs) });
            return true;
        }
        return false;
    },

    buyUpgrade: (upgradeKey) => {
        const currentLevel = get().upgrades[upgradeKey];
        const petStats = getPetFortStats();
        let cost = 50 + (currentLevel * 50);
        cost = Math.floor(cost * (1 - (petStats.costDiscount / 100)));

        const store = useCurrencyStore.getState();
        if (store.gold >= cost) {
            store.spendGold(cost);
            set(state => {
                const newUpgrades = { ...state.upgrades, [upgradeKey]: currentLevel + 1 };
                let newMaxHp = state.maxFortHp;
                if (upgradeKey === 'fortHealthLevel') {
                    const baseHp = BASE_MAX_HP + (newUpgrades.fortHealthLevel * 50);
                    newMaxHp = Math.floor(baseHp * (1 + (petStats.hpPercent / 100)));
                }
                const hpGain = upgradeKey === 'fortHealthLevel'
                    ? Math.floor(50 * (1 + (petStats.hpPercent / 100)))
                    : 0;
                return { upgrades: newUpgrades, maxFortHp: newMaxHp, fortHp: state.fortHp + hpGain };
            });
            return true;
        }
        return false;
    },

    // ── End game ──────────────────────────────────────────────────────────
    endGame: (victory) => {
        if (!enableStormFort) return;
        set(state => {
            const petStats = getPetFortStats();
            const baseHp = BASE_MAX_HP + (state.upgrades.fortHealthLevel * 50);
            const calcMaxHp = Math.floor(baseHp * (1 + (petStats.hpPercent / 100)));
            const isBossWave = state.wave % 5 === 0;

            const newState: Partial<StormState> = {
                gameState: victory ? 'victory' : 'defeat',
                wave: victory ? state.wave + 1 : state.wave,
                maxFortHp: calcMaxHp,
                fortHp: calcMaxHp,
                projectiles: [],
                bossWarningActive: false,
                castleHit: false,
            };

            if (victory) {
                // Wave gold bonus (converted from shmeckles ×5)
                const waveGoldBonus = (state.wave * 5 + (state.upgrades.goldWaveBonusLevel * 5)) * 5;
                // Early game bonus (waves 1-3)
                const earlyBonus = state.wave <= 3 ? state.wave * 5 : 0;
                const totalWaveGold = waveGoldBonus + earlyBonus;
                const waveGold = Math.min(state.wave * 5, 50);
                const combinedGold = totalWaveGold + waveGold;
                // Boss wave gems
                const waveGems = isBossWave ? 1 : 0;

                newState.lastWaveRewards = {
                    gold: combinedGold,
                    gems: waveGems,
                };

                const arenaStats = useArenaStatsStore.getState();
                arenaStats.recordWaveSurvived();
                arenaStats.recordGold(combinedGold);
                arenaStats.updateStormBest(state.wave);

                // Grant XP, rank defenders
                newState.defenders = state.defenders.map(d => {
                    const newXp = d.xp + 10;
                    const newRank = getRankFromXp(newXp);
                    const rankDmgBonus = newRank * 0.2;
                    const rankHpBonus = newRank * 0.15;
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
                    cs.getState().addGold(combinedGold, { exact: true });
                    if (waveGems > 0) cs.getState().addGems(waveGems);
                });

                const finalWave = state.wave;
                if (finalWave > state.bestWave) {
                    newState.bestWave = finalWave;
                    localStorage.setItem('stf-best-wave', String(finalWave));
                }
            } else {
                newState.lastWaveRewards = null;
                if (state.wave > state.bestWave) {
                    newState.bestWave = state.wave;
                    localStorage.setItem('stf-best-wave', String(state.wave));
                }
            }

            return newState;
        });
    },

    // ── Main game tick ────────────────────────────────────────────────────
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
            if (bossWarningTimer <= 0) { bossWarningActive = false; bossWarningTimer = 0; }
        }

        // Combo timer
        let comboCount = state.comboCount;
        let comboTimer = state.comboTimer;
        let comboPopups = [...state.comboPopups];
        if (comboTimer > 0) {
            comboTimer -= deltaMs;
            if (comboTimer <= 0) { comboCount = 0; comboTimer = 0; }
        }
        comboPopups = comboPopups
            .map(p => ({ ...p, age: p.age + deltaMs }))
            .filter(p => p.age < 1500);

        // Spawn logic
        if (enemiesToSpawn.length > 0) {
            spawnTimer += deltaMs;
            if (spawnTimer >= 600) {
                const toSpawn = enemiesToSpawn.shift();
                if (toSpawn) enemies.push(toSpawn);
                spawnTimer = 0;
            }
        }

        // ── Obstacle Processing ──────────────────────────────────────────
        const enemySlows = new Map<string, number>();
        const enemyBarricadeBlock = new Map<string, Obstacle>();

        for (const obs of obstacles) {
            for (const e of enemies) {
                if (e.hp <= 0) continue;
                if (obs.type === 'barricade') {
                    // Barricades block enemies at the fort boundary wall
                    if (Math.abs(e.x - obs.x) < 4 && e.y >= obs.yStart && e.y <= obs.yEnd) {
                        enemyBarricadeBlock.set(e.id, obs);
                    }
                } else if (obs.type === 'barbed_wire') {
                    // Barbed wire in forward trap zone — apply slow + damage by proximity
                    if (Math.abs(e.x - obs.x) < 5 && e.y >= obs.yStart && e.y <= obs.yEnd) {
                        enemySlows.set(e.id, obs.slowFactor ?? 1);
                        e.hp -= (obs.damagePerTick || 0) * (deltaMs / 1000);
                        obs.hp -= 1.5 * (deltaMs / 1000);
                    }
                }
            }
        }

        // Rally buff
        const rallyActive = now < state.rallyUntil;

        // ── Enemy Movement & Combat ───────────────────────────────────────
        let castleHit = false;

        for (const e of enemies) {
            if (e.hp <= 0) continue;

            const blockObs = enemyBarricadeBlock.get(e.id);
            const slow = enemySlows.get(e.id) ?? 1;

            if (blockObs) {
                // Attack barricade
                e.cooldown -= deltaMs;
                if (e.cooldown <= 0) {
                    blockObs.hp -= e.damage;
                    e.cooldown = e.maxCooldown;
                }
            } else {
                // Check if reached fort boundary — switch to diagonal pathing
                if (e.x >= FORT_BOUNDARY_X && !e.reachedBoundary) {
                    e.reachedBoundary = true;
                    e.targetX = CASTLE_X;
                    e.targetY = CASTLE_Y;
                }

                if (e.reachedBoundary) {
                    // Diagonal pathing toward castle
                    const dx = e.targetX - e.x;
                    const dy = e.targetY - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 1) {
                        const step = e.speed * slow * (deltaMs / 1000);
                        e.x += (dx / dist) * step;
                        e.y += (dy / dist) * step;
                    }

                    // Attack castle
                    if (e.x >= CASTLE_X - 2) {
                        e.cooldown -= deltaMs;
                        if (e.cooldown <= 0) {
                            const damageReduction = state.upgrades.fortArmorLevel * 2;
                            const tickDamage = Math.max(0.5, e.damage * 0.1 - damageReduction * 0.05);
                            fortHp -= tickDamage * (deltaMs / 1000);
                            castleHit = true;
                            e.cooldown = e.maxCooldown;
                        }
                    }
                } else {
                    // Straight march toward boundary
                    e.x += e.speed * slow * (deltaMs / 1000);
                }
            }
        }

        // ── Defender Combat — spawn typed projectiles ────────────────────
        const newProjectiles = [...projectiles];

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
            if (d.cooldown > 0) continue;

            const rankDmgBonus = d.rank * 0.2;
            const rallyBonus = rallyActive ? 0.5 : 0;
            const effectiveDamage = (d.damage + (state.upgrades.defenderDamageLevel * 5)) * (1 + rankDmgBonus + rallyBonus);
            const isFortified = d.fortifyUntil > now;

            if (d.defenderType === 'medic') {
                // Heal lowest HP ally in range
                let lowestDef: Defender | null = null;
                let lowestPct = 1;
                for (const ally of updatedDefenders) {
                    if (ally.id === d.id || ally.hp >= ally.maxHp) continue;
                    const dx = ally.x - d.x;
                    const dy = (ally.y - d.y) * 0.5;
                    if (Math.sqrt(dx * dx + dy * dy) <= d.range) {
                        const pct = ally.hp / ally.maxHp;
                        if (pct < lowestPct) { lowestPct = pct; lowestDef = ally; }
                    }
                }
                if (lowestDef) {
                    const healAmount = 15 + (state.upgrades.defenderDamageLevel * 3);
                    newProjectiles.push({
                        id: `heal-${now}-${d.id}`,
                        fromX: d.x, fromY: d.y,
                        toX: lowestDef.x, toY: lowestDef.y,
                        progress: 0,
                        damage: healAmount,
                        targetId: lowestDef.id,
                        isHeal: true,
                        sourceType: 'medic',
                    });
                    d.cooldown = Math.max(200, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                }
            } else if (d.defenderType === 'shield' && !isFortified) {
                // Shield: taunt (handled above) + weak melee attack
                let bestTarget: Enemy | null = null;
                let bestDist = Infinity;
                for (const e of enemies) {
                    if (e.hp <= 0) continue;
                    const dx = e.x - d.x;
                    const dy = (e.y - d.y) * 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= d.range && dist < bestDist) { bestDist = dist; bestTarget = e; }
                }
                if (bestTarget) {
                    newProjectiles.push({
                        id: `proj-${now}-${d.id}`,
                        fromX: d.x, fromY: d.y,
                        toX: bestTarget.x, toY: bestTarget.y,
                        progress: 0,
                        damage: effectiveDamage,
                        targetId: bestTarget.id,
                        sourceType: 'shield',
                    });
                    d.cooldown = Math.max(300, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                }
            } else {
                // Standard attack: prefer shield-taunted enemy if shield exists
                let candidates = enemies.filter(e => e.hp > 0);

                // If any shield units present, enemies prioritize attacking them
                // (We implement it the other way: defenders should still attack nearest)
                let bestTarget: Enemy | null = null;
                let bestDist = Infinity;
                for (const e of candidates) {
                    const dx = e.x - d.x;
                    const dy = (e.y - d.y) * 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= d.range && dist < bestDist) { bestDist = dist; bestTarget = e; }
                }

                if (bestTarget) {
                    // Archer projectile is fast: handled by PROJECTILE_SPEED multiplier applied per sourceType
                    newProjectiles.push({
                        id: `proj-${now}-${d.id}`,
                        fromX: d.x, fromY: d.y,
                        toX: bestTarget.x, toY: bestTarget.y,
                        progress: 0,
                        damage: effectiveDamage,
                        targetId: bestTarget.id,
                        sourceType: d.defenderType,
                    });
                    d.cooldown = Math.max(200, d.maxCooldown - (state.upgrades.defenderSpeedLevel * 100));
                }
            }

            // Shield taunt — REAL: redirect nearby enemies' target Y toward this defender
            // This makes enemies walk toward the shield unit rather than straight to castle
            if (d.defenderType === 'shield') {
                const tauntRange = d.range * 2.5; // wider aggro radius
                for (const e of enemies) {
                    if (e.hp <= 0) continue;
                    const dx = e.x - d.x;
                    const dy = (e.y - d.y) * 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= tauntRange) {
                        // Pull enemy Y toward shield's Y over time
                        e.targetY = d.y;
                        // If enemy hasn't reached boundary yet, also nudge lane toward shield
                        if (!e.reachedBoundary) {
                            e.y = e.y + (d.y - e.y) * 0.02 * (deltaMs / 16);
                        }
                    }
                }
            }
        }

        // ── Projectile Movement (per-type speed) ─────────────────────────
        const PROJ_SPEED: Record<string, number> = {
            cow:       1.5,
            swordsman: 3.0,
            shield:    2.5,
            archer:    5.0,
            medic:     2.0,
            barbed_wire: 0,
        };

        const activeProjectiles: Projectile[] = [];
        for (const p of newProjectiles) {
            const speed = PROJ_SPEED[p.sourceType] ?? 3.0;
            p.progress += speed * (deltaMs / 1000);
            if (p.progress >= 1) {
                if (p.isHeal) {
                    const target = updatedDefenders.find(d => d.id === p.targetId);
                    if (target) target.hp = Math.min(target.maxHp, target.hp + p.damage);
                } else {
                    const target = enemies.find(e => e.id === p.targetId && e.hp > 0);
                    if (target) target.hp -= p.damage;
                }
            } else {
                activeProjectiles.push(p);
            }
        }

        // ── Kill processing — gold only, boss gives gems ──
        const arenaStats = useArenaStatsStore.getState();
        const damagePopups: StormDamagePopup[] = [];

        const filteredEnemies = enemies.filter(e => {
            if (e.hp <= 0 && e.x < CASTLE_X + 2) {
                const def = STORM_ENEMY_DEFS[e.enemyType];
                const isBoss = def?.isBoss;

                comboCount++;
                comboTimer = 1500;
                let comboBonus = 0;
                if (comboCount >= 3) {
                    comboBonus = comboCount;
                    comboPopups.push({
                        id: `combo-${now}-${e.id}`,
                        count: comboCount,
                        bonus: comboBonus,
                        x: e.x, y: e.y, age: 0,
                    });
                    arenaStats.recordCombo();
                }

                const baseGold = getEnemyDefeatGoldReward(!!isBoss || !!e.isElite);
                const goldAmount = baseGold + comboBonus;

                // Grant gold for all kills
                useCurrencyStore.getState().addGold(goldAmount, { exact: true });
                
                // Track session kills for bonus gold: every 3rd kill = +5 gold
                let earnedBonusGold = false;
                const newSessionKills = (get().sessionKills || 0) + 1;
                if (newSessionKills % 3 === 0) {
                    useCurrencyStore.getState().addGold(5, { exact: true });
                    earnedBonusGold = true;
                    damagePopups.push({
                        id: `dpop-bonus-${now}-${e.id}`,
                        x: e.x, y: e.y - 8,
                        value: 5, isCrit: false, age: 0, icon: '🪙',
                    });
                }
                set({ sessionKills: newSessionKills });

                // Boss popup indicator
                if (isBoss) {
                    damagePopups.push({
                        id: `dpop-boss-${now}`,
                        x: e.x, y: e.y - 16,
                        value: 0, isCrit: true, age: 0, icon: '👑',
                    });
                }

                // Gold popup
                damagePopups.push({
                    id: `dpop-${now}-${e.id}`,
                    x: e.x, y: e.y + (earnedBonusGold ? 8 : 0),
                    value: goldAmount, isCrit: !!e.isElite, age: 0, icon: '🪙',
                });

                arenaStats.recordKill();
                arenaStats.recordGold(goldAmount);
                if (e.isElite) arenaStats.recordEliteKill();
                if (isBoss) arenaStats.recordBossKill();
                return false;
            }
            return e.hp > 0;
        });

        const filteredObstacles = recomputeBarricadeSegments(obstacles.filter(o => o.hp > 0));

        // Fort auto-repair
        if (state.upgrades.fortRepairLevel > 0) {
            const repairRate = state.upgrades.fortRepairLevel * 2;
            fortHp = Math.min(state.maxFortHp, fortHp + repairRate * (deltaMs / 1000));
        }

        // ── Win/Loss Check ────────────────────────────────────────────────
        if (fortHp <= 0) { get().endGame(false); return; }

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
            castleHit,
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
