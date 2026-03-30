import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { PET_DATABASE } from './usePetStore';


// ── Pet Battle Type System ─────────────────────────────────────
export type PetElementType = 'Fire' | 'Water' | 'Nature' | 'Earth' | 'Air' | 'Shadow' | 'Aether';

const STRONG_AGAINST: Record<PetElementType, PetElementType[]> = {
    Fire: ['Nature'],
    Water: ['Fire', 'Earth'],
    Nature: ['Water'],
    Earth: ['Air'],
    Air: ['Water'],
    Shadow: [], // Shadow has special rules handled below
    Aether: [], // Aether has special rules handled below (mutual with Shadow)
};

export function getTypeMultiplier(atk: PetElementType, def: PetElementType): number {
    let mult = 1.0;

    // Strong/Weak Triangles
    if (STRONG_AGAINST[atk]?.includes(def)) {
        mult += 0.25; // Strong
    } else if (STRONG_AGAINST[def]?.includes(atk)) {
        mult -= 0.25; // Weak
    }

    // Shadow Modifier (+15% damage dealt, +15% damage taken)
    if (atk === 'Shadow') mult += 0.15; // Deals +15% to all
    if (def === 'Shadow') mult += 0.15; // Takes +15% from all

    return mult;
}

// ── Pet Battle Move ────────────────────────────────────────────
export interface BattleMove {
    id: string;
    name: string;
    icon: string;
    type: PetElementType;
    power: number;       // base damage
    accuracy: number;    // 0-1
    cooldown: number;    // turns
    effect?: 'heal_self' | 'buff_atk' | 'debuff_def' | 'poison';
    effectValue?: number;
    description: string;
}

// ── Enemy Creature ─────────────────────────────────────────────
export interface WildCreature {
    id: string;
    name: string;
    icon: string;
    type: PetElementType;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    moves: BattleMove[];
    goldReward: number;
    level: number;
}

// ── Wild Creature Database ─────────────────────────────────────
export const WILD_CREATURES: WildCreature[] = [
    {
        id: 'wild_slime', name: 'Green Slime', icon: '🟢', type: 'Nature', level: 1,
        maxHp: 30, attack: 6, defense: 3, speed: 4, goldReward: 5,
        moves: [
            { id: 'tackle', name: 'Tackle', icon: '💥', type: 'Earth', power: 8, accuracy: 0.95, cooldown: 0, description: 'A basic tackle' },
            { id: 'vine_whip', name: 'Vine Whip', icon: '🌿', type: 'Nature', power: 10, accuracy: 0.9, cooldown: 1, description: 'A whipping vine attack' },
        ],
    },
    {
        id: 'wild_ember', name: 'Ember Sprite', icon: '🔥', type: 'Fire', level: 2,
        maxHp: 35, attack: 9, defense: 4, speed: 7, goldReward: 8,
        moves: [
            { id: 'flame_lick', name: 'Flame Lick', icon: '🔥', type: 'Fire', power: 12, accuracy: 0.9, cooldown: 0, description: 'A quick flame lick' },
            { id: 'ember_burst', name: 'Ember Burst', icon: '💥', type: 'Fire', power: 18, accuracy: 0.8, cooldown: 2, description: 'Burst of embers' },
        ],
    },
    {
        id: 'wild_droplet', name: 'Aqua Droplet', icon: '💧', type: 'Water', level: 2,
        maxHp: 40, attack: 7, defense: 6, speed: 5, goldReward: 8,
        moves: [
            { id: 'splash', name: 'Splash', icon: '💦', type: 'Water', power: 10, accuracy: 0.95, cooldown: 0, description: 'Splashes water' },
            { id: 'water_jet', name: 'Water Jet', icon: '🌊', type: 'Water', power: 16, accuracy: 0.85, cooldown: 2, description: 'High-pressure jet' },
            { id: 'heal_mist', name: 'Heal Mist', icon: '✨', type: 'Water', power: 0, accuracy: 1, cooldown: 3, effect: 'heal_self', effectValue: 12, description: 'Heals 12 HP' },
        ],
    },
    {
        id: 'wild_shade', name: 'Shadow Wisp', icon: '👻', type: 'Shadow', level: 3,
        maxHp: 45, attack: 11, defense: 4, speed: 9, goldReward: 12,
        moves: [
            { id: 'shadow_swipe', name: 'Shadow Swipe', icon: '🌑', type: 'Shadow', power: 14, accuracy: 0.9, cooldown: 0, description: 'Swipe of darkness' },
            { id: 'dark_pulse', name: 'Dark Pulse', icon: '💜', type: 'Shadow', power: 20, accuracy: 0.8, cooldown: 2, description: 'Pulse of dark energy' },
            { id: 'weaken', name: 'Weaken', icon: '⬇️', type: 'Shadow', power: 5, accuracy: 0.9, cooldown: 2, effect: 'debuff_def', effectValue: 3, description: 'Lowers defense' },
        ],
    },
    {
        id: 'wild_sunbird', name: 'Sunbird', icon: '☀️', type: 'Air', level: 3,
        maxHp: 38, attack: 10, defense: 5, speed: 10, goldReward: 12,
        moves: [
            { id: 'light_beam', name: 'Light Beam', icon: '✨', type: 'Air', power: 14, accuracy: 0.92, cooldown: 0, description: 'Focused light beam' },
            { id: 'solar_flare', name: 'Solar Flare', icon: '☀️', type: 'Air', power: 22, accuracy: 0.75, cooldown: 3, description: 'Blinding solar explosion' },
            { id: 'radiance', name: 'Radiance', icon: '💛', type: 'Air', power: 0, accuracy: 1, cooldown: 3, effect: 'heal_self', effectValue: 15, description: 'Heals 15 HP' },
        ],
    },
];

// ── Pet → Battle Stats Helper ──────────────────────────────────
// Maps existing PET_DATABASE pets to battle stats
export interface PetBattleStats {
    id: string;
    name: string;
    icon: string;
    type: PetElementType;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    moves: BattleMove[];
}

// Map existing pet abilities to BattleMove format + assign types
export function getPetBattleStats(petId: string): PetBattleStats | null {
    const pet = PET_DATABASE[petId];
    if (!pet) return null;

    const moves: BattleMove[] = pet.abilities.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        type: pet.type,
        power: a.baseDamage || 0,
        accuracy: 0.95,
        cooldown: a.cooldown,
        description: a.description,
        effect: a.type === 'heal' ? 'heal_self' : 
                a.type === 'buff_atk' ? 'buff_atk' : 
                a.type === 'debuff_def' ? 'debuff_def' : undefined,
        effectValue: a.healBase || a.buffValue || 0
    }));

    return {
        id: pet.id,
        name: pet.name,
        icon: pet.icon,
        type: pet.type,
        maxHp: pet.hp,
        attack: pet.attack,
        defense: pet.defense,
        speed: (pet.attackSpeed || 1.0) * 10, // Scales nicely for turn logic
        moves
    };
}

// ── Instance-aware scaled stats ─────────────────────────────────
// Pure helper — does not touch store state.
// Level 1 = baseline (no change). Scaling is conservative / additive.
export function getPetBattleStatsScaled(
    petId: string,
    level: number,
    isRare: boolean,
    ascensionStars: number
): PetBattleStats | null {
    const base = getPetBattleStats(petId);
    if (!base) return null;

    const lvBonus = Math.max(0, level - 1); // 0 at Lv.1

    // +3 HP and +0.5 ATK per level above 1
    let scaledHp  = Math.floor(base.maxHp  + lvBonus * 3);
    let scaledAtk = Math.floor(base.attack + lvBonus * 0.5);
    let scaledDef = base.defense; // defense unchanged by level

    // Rare catch: +15% to all three
    if (isRare) {
        scaledHp  = Math.floor(scaledHp  * 1.15);
        scaledAtk = Math.floor(scaledAtk * 1.15);
        scaledDef = Math.floor(scaledDef * 1.15);
    }

    // Ascension stars: +10% per star (0–5)
    const ascMult = 1 + Math.min(5, ascensionStars) * 0.10;
    scaledHp  = Math.floor(scaledHp  * ascMult);
    scaledAtk = Math.floor(scaledAtk * ascMult);
    scaledDef = Math.floor(scaledDef * ascMult);

    return { ...base, maxHp: scaledHp, attack: scaledAtk, defense: scaledDef };
}

// ── Battle State ───────────────────────────────────────────────
type BattlePhase = 'idle' | 'select-pet' | 'battle' | 'victory' | 'defeat';

interface BattleState {
    // Player
    playerHp: number;
    playerMaxHp: number;
    playerAtk: number;
    playerDef: number;
    playerSpeed: number;
    playerMoves: BattleMove[];
    playerCooldowns: Record<string, number>;
    playerBuffAtk: number;

    // Enemy
    enemyHp: number;
    enemyMaxHp: number;
    enemyAtk: number;
    enemyDef: number;
    enemySpeed: number;
    enemyMoves: BattleMove[];
    enemyCooldowns: Record<string, number>;
    enemyBuffAtk: number;
    enemyDebuffDef: number;

    // Meta
    selectedPetId: string | null;
    selectedEnemy: WildCreature | null;
    battlePhase: BattlePhase;
    turn: number;
    battleLog: string[];
    playerDebuffDef: number;

    // Daily limits
    battlesToday: number;
    lastBattleDate: string | null;

    // Lifetime stats
    totalWins: number;
    totalLosses: number;

    // Actions
    startBattle: (petId: string, enemy: WildCreature, overrideStats?: PetBattleStats) => void;
    useMove: (moveId: string) => void;
    resetBattle: () => void;
    canBattleToday: () => boolean;
}

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export const usePetBattleStore = create<BattleState>()(
    persist(
        (set, get) => ({
            playerHp: 0, playerMaxHp: 0, playerAtk: 0, playerDef: 0, playerSpeed: 0,
            playerMoves: [], playerCooldowns: {}, playerBuffAtk: 0, playerDebuffDef: 0,

            enemyHp: 0, enemyMaxHp: 0, enemyAtk: 0, enemyDef: 0, enemySpeed: 0,
            enemyMoves: [], enemyCooldowns: {}, enemyBuffAtk: 0, enemyDebuffDef: 0,

            selectedPetId: null, selectedEnemy: null, battlePhase: 'idle',
            turn: 0, battleLog: [],

            battlesToday: 0, lastBattleDate: null,
            totalWins: 0, totalLosses: 0,

            canBattleToday: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastBattleDate !== today) return true;
                return s.battlesToday < 3;
            },

            startBattle: (petId, enemy, overrideStats) => {
                // Use override stats (instance-aware) when provided, else fall back to base species stats
                const pet = overrideStats ?? getPetBattleStats(petId);
                if (!pet) return;

                const today = getEasternDateString();
                const s = get();
                const battlesToday = s.lastBattleDate === today ? s.battlesToday : 0;

                set({
                    playerHp: pet.maxHp, playerMaxHp: pet.maxHp, playerAtk: pet.attack,
                    playerDef: pet.defense, playerSpeed: pet.speed, playerMoves: pet.moves,
                    playerCooldowns: {}, playerBuffAtk: 0, playerDebuffDef: 0,

                    enemyHp: enemy.maxHp, enemyMaxHp: enemy.maxHp, enemyAtk: enemy.attack,
                    enemyDef: enemy.defense, enemySpeed: enemy.speed, enemyMoves: enemy.moves,
                    enemyCooldowns: {}, enemyBuffAtk: 0, enemyDebuffDef: 0,

                    selectedPetId: petId, selectedEnemy: enemy, battlePhase: 'battle',
                    turn: 1, battleLog: [`Battle Start! ${pet.name} vs ${enemy.name}!`],
                    battlesToday: battlesToday + 1, lastBattleDate: today,
                });
            },

            useMove: (moveId) => {
                const s = get();
                if (s.battlePhase !== 'battle') return;
                const move = s.playerMoves.find(m => m.id === moveId);
                if (!move) return;

                // Check cooldown
                if ((s.playerCooldowns[moveId] || 0) > 0) return;

                const pet = getPetBattleStats(s.selectedPetId!);
                const enemy = s.selectedEnemy;
                if (!pet || !enemy) return;

                const log: string[] = [];
                let playerHp = s.playerHp;
                let enemyHp = s.enemyHp;
                let playerBuffAtk = s.playerBuffAtk;
                let enemyDebuffDef = s.enemyDebuffDef;
                let playerDebuffDef = s.playerDebuffDef;
                let enemyBuffAtk = s.enemyBuffAtk;

                // ── Player turn ──
                const playerFirst = s.playerSpeed >= s.enemySpeed;

                const resolvePlayerMove = () => {
                    if (Math.random() > move.accuracy) {
                        log.push(`${pet.name}'s ${move.name} missed!`);
                        return;
                    }

                    if (move.effect === 'heal_self') {
                        const healed = Math.min(move.effectValue || 0, s.playerMaxHp - playerHp);
                        playerHp += healed;
                        log.push(`${pet.name} used ${move.name} — healed ${healed} HP!`);
                        return;
                    }

                    if (move.effect === 'buff_atk') {
                        playerBuffAtk += move.effectValue || 0;
                        log.push(`${pet.name} used ${move.name} — ATK +${move.effectValue}!`);
                        if (move.power <= 0) return;
                    }

                    if (move.effect === 'debuff_def') {
                        enemyDebuffDef += move.effectValue || 0;
                        log.push(`${pet.name} used ${move.name} — enemy DEF -${move.effectValue}!`);
                        if (move.power <= 0) return;
                    }

                    if (move.power > 0) {
                        const typeMult = getTypeMultiplier(move.type, enemy.type as PetElementType);
                        const atkTotal = s.playerAtk + playerBuffAtk;
                        const defTotal = Math.max(1, s.enemyDef - enemyDebuffDef);
                        const rawDmg = Math.max(1, Math.floor((move.power * atkTotal / (defTotal + 5)) * typeMult));
                        enemyHp = Math.max(0, enemyHp - rawDmg);
                        const extra = typeMult > 1 ? ' Super effective!' : typeMult < 1 ? ' Not very effective...' : '';
                        log.push(`${pet.name} used ${move.name} — ${rawDmg} damage!${extra}`);
                    }
                };

                // ── Enemy turn — simple AI ──
                const resolveEnemyTurn = () => {
                    if (enemyHp <= 0) return;

                    const s2 = get();
                    const available = enemy.moves.filter(m => !((s2.enemyCooldowns[m.id] || 0) > 0));
                    if (available.length === 0) return;

                    // Simple AI: use heal if HP low, otherwise strongest available
                    let chosen: BattleMove;
                    const healMoves = available.filter(m => m.effect === 'heal_self');
                    if (healMoves.length > 0 && enemyHp < enemy.maxHp * 0.4) {
                        chosen = healMoves[0];
                    } else {
                        chosen = available.reduce((best, m) => m.power > best.power ? m : best, available[0]);
                    }

                    if (Math.random() > chosen.accuracy) {
                        log.push(`${enemy.name}'s ${chosen.name} missed!`);
                        return;
                    }

                    if (chosen.effect === 'heal_self') {
                        const healed = Math.min(chosen.effectValue || 0, enemy.maxHp - enemyHp);
                        enemyHp += healed;
                        log.push(`${enemy.name} used ${chosen.name} — healed ${healed} HP!`);
                        return;
                    }

                    if (chosen.effect === 'buff_atk') {
                        enemyBuffAtk += chosen.effectValue || 0;
                        log.push(`${enemy.name} used ${chosen.name} — ATK +${chosen.effectValue}!`);
                        if (chosen.power <= 0) return;
                    }

                    if (chosen.effect === 'debuff_def') {
                        playerDebuffDef += chosen.effectValue || 0;
                        log.push(`${enemy.name} used ${chosen.name} — your DEF -${chosen.effectValue}!`);
                        if (chosen.power <= 0) return;
                    }

                    if (chosen.power > 0) {
                        const typeMult = getTypeMultiplier(chosen.type, pet.type);
                        const atkTotal = s.enemyAtk + enemyBuffAtk;
                        const defTotal = Math.max(1, s.playerDef - playerDebuffDef);
                        const rawDmg = Math.max(1, Math.floor((chosen.power * atkTotal / (defTotal + 5)) * typeMult));
                        playerHp = Math.max(0, playerHp - rawDmg);
                        const extra = typeMult > 1 ? ' Super effective!' : typeMult < 1 ? ' Not very effective...' : '';
                        log.push(`${enemy.name} used ${chosen.name} — ${rawDmg} damage!${extra}`);
                    }

                    // Set enemy cooldown
                    if (chosen.cooldown > 0) {
                        const cds = { ...s2.enemyCooldowns, [chosen.id]: chosen.cooldown };
                        set({ enemyCooldowns: cds });
                    }
                };

                // Resolve in speed order
                if (playerFirst) { resolvePlayerMove(); resolveEnemyTurn(); }
                else { resolveEnemyTurn(); resolvePlayerMove(); }

                // Set player cooldowns & tick all down
                const newCooldowns = { ...s.playerCooldowns };
                if (move.cooldown > 0) newCooldowns[moveId] = move.cooldown;
                Object.keys(newCooldowns).forEach(k => {
                    newCooldowns[k] = Math.max(0, (newCooldowns[k] || 0) - 1);
                });

                const newEnemyCds = { ...get().enemyCooldowns };
                Object.keys(newEnemyCds).forEach(k => {
                    newEnemyCds[k] = Math.max(0, (newEnemyCds[k] || 0) - 1);
                });

                // Determine outcome
                let phase: BattlePhase = 'battle';
                if (enemyHp <= 0) { phase = 'victory'; }
                else if (playerHp <= 0) { phase = 'defeat'; }

                set({
                    playerHp, enemyHp, turn: s.turn + 1,
                    battleLog: [...s.battleLog, ...log],
                    playerCooldowns: newCooldowns,
                    enemyCooldowns: newEnemyCds,
                    playerBuffAtk, enemyDebuffDef, playerDebuffDef, enemyBuffAtk,
                    battlePhase: phase,
                    totalWins: phase === 'victory' ? s.totalWins + 1 : s.totalWins,
                    totalLosses: phase === 'defeat' ? s.totalLosses + 1 : s.totalLosses,
                });
            },

            resetBattle: () => {
                set({
                    playerHp: 0, playerMaxHp: 0, playerAtk: 0, playerDef: 0, playerSpeed: 0,
                    playerMoves: [], playerCooldowns: {}, playerBuffAtk: 0, playerDebuffDef: 0,
                    enemyHp: 0, enemyMaxHp: 0, enemyAtk: 0, enemyDef: 0, enemySpeed: 0,
                    enemyMoves: [], enemyCooldowns: {}, enemyBuffAtk: 0, enemyDebuffDef: 0,
                    selectedPetId: null, selectedEnemy: null, battlePhase: 'idle',
                    turn: 0, battleLog: [],
                });
            },
        }),
        { name: PERSIST_REGISTRY.petBattle.persistKey }
    )
);
