import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStrategyStore } from './useStrategyStore';
import { CONQUEST_MAP_NODES, type ConquestNodeData } from '../data/conquest';
import { PERSIST_REGISTRY } from '../data/persistRegistry';


// ─── TYPES ────────────────────────────────────────

export type SoldierRank = 'Recruit' | 'Footman' | 'Veteran' | 'Captain' | 'Elite Guard' | 'Warden';
export type SoldierRole = 'scout' | 'morale' | 'siege' | 'healer';
export type TerrainType = 'plains' | 'swamp' | 'mountain' | 'plague' | 'night' | 'market' | 'forest';

export interface Soldier {
    id: string;
    name: string;
    rank: SoldierRank;
    level: number;
    atk: number;
    def: number;
    role: SoldierRole;
}

export interface MemoryLog {
    highestRegionCleared: number;
    fastestConquest: number | null;   // turns
    leastTroopLoss: number | null;
    mostSigilsInRun: number;
}

export type RunBuffType = 'strength' | 'defense' | 'wealth' | 'curse';

export interface RunBuff {
    id: string;
    type: RunBuffType;
    label: string;
    amount: number;
}

export interface ConquestState {
    // Currency
    sigils: number;
    addSigils: (amount: number) => void;
    spendSigils: (amount: number) => boolean;

    // Conquest Map (Phase 1)
    act: number;
    diceRolls: number; // Available to spend
    activeDiceRoll: number | null; // The current face value rolled (1-6) waiting for a map choice
    currentNodeId: string | null;
    completedNodes: string[];

    // Soldiers (Kept for Shop compatibility)
    soldiers: Soldier[];
    maxTeamSize: number;
    barracksLevel: number;
    scoutTowerLevel: number;
    shrineLevel: number;

    // Combat Dice (Old combat mechanic)
    diceCount: number;  // Number of d6 rolled (default 2, upgradeable)
    morale: number;       // 0-100

    // Map Actions
    initMap: () => void;
    rollMapDice: () => number | null;
    getReachableNodes: () => string[];
    movePlayer: (nodeId: string) => void;
    grantSpireReward: (gold: number, sigils: number, gems?: number) => void;

    // Run State (Slay the Spire style)
    runHP: number;
    runMaxHP: number;
    runFloor: number;
    runBuffs: RunBuff[];
    runComplete: 'none' | 'victory' | 'defeat';
    lastRunDate: string | null;

    // NEW — run resources
    balloons: number;
    shmeckles: number;

    // NEW — run progression tracking
    treasureVaultsCompleted: number;
    runArtifacts: string[];   // artifact IDs active this run
    runRelics: string[];      // relic IDs purchased this run
    rewardAmplifierActive: boolean;

    // Meta Progression
    runsCompleted: number;
    bestFloor: number;

    // Run Actions
    startRun: () => void;
    isDailyRunLocked: () => boolean;
    takeDamage: (amount: number) => void;
    healHP: (amount: number) => void;
    addRunBuff: (buff: RunBuff) => void;
    completeRun: (victory: boolean) => void;
    resetRun: () => void;

    // NEW run resource actions
    addBalloons: (n: number) => void;
    addShmeckles: (n: number) => void;
    completeTreasureVault: () => void;
    addRunArtifact: (id: string) => void;
    addRunRelic: (id: string) => void;
    activateRewardAmplifier: () => void;
    getVaultScaledBossMultiplier: () => number;

    // Memory Log
    memoryLog: MemoryLog;

    // Soldier/Upgrade Actions
    recruitSoldier: (name: string, role: SoldierRole) => boolean;
    upgradeSoldierRank: (soldierId: string) => boolean;
    upgradeMaxTeamSize: () => boolean;
    upgradeBarracks: () => boolean;
    upgradeScoutTower: () => boolean;
    upgradeShrine: () => boolean;
    upgradeDice: () => boolean;
    adjustMorale: (amount: number) => void;

    // Legacy compatibility actions
    initRegions: () => void;
    conquestAttack: () => ConquestCombatResult;



    // Getters
    getPowerScore: () => number;
    getArmyBonus: () => number;
    getTotalForce: () => number;
    getTerrainModifier: (terrain: TerrainType) => number;
    getMoraleModifier: () => number;
    isSupplyConnected: (nodeId: string) => boolean;
}

// Legacy Combat results struct
export interface ConquestCombatResult {
    won: boolean;
    sigilsEarned: number;
    goldEarned: number;
    gemsEarned: number;
    troopsLost: number;
    moraleChange: number;
    rolls: { attacker: number; defender: number; attackerDice: number[]; defenderDice: number[] };
    modifiers: { force: number; terrain: number; morale: number; recon: number };
}

// ─── CONSTANTS ────────────────────────────────────

export const RANK_MULTIPLIERS: Record<SoldierRank, number> = {
    'Recruit': 1.0,
    'Footman': 1.2,
    'Veteran': 1.5,
    'Captain': 1.8,
    'Elite Guard': 2.2,
    'Warden': 2.6,
};

const RANK_ORDER: SoldierRank[] = ['Recruit', 'Footman', 'Veteran', 'Captain', 'Elite Guard', 'Warden'];

const RANK_UPGRADE_COST: Record<SoldierRank, number> = {
    'Recruit': 50,      // cost to upgrade TO Footman
    'Footman': 120,
    'Veteran': 250,
    'Captain': 500,
    'Elite Guard': 1000,
    'Warden': 0,        // max rank
};

const TEAM_SIZE_COSTS = [0, 100, 200, 400, 700, 1200]; // cost to unlock slot 2,3,4,5,6
const BARRACKS_COST = [150, 300, 500];
const SCOUT_COST = [100, 250, 500];
const SHRINE_COST = [100, 200, 400];
const DICE_UPGRADE_COST = [200, 400, 800]; // cost to go from 2->3, 3->4 dice

const TERRAIN_SKILL_MAP: Record<TerrainType, string> = {
    swamp: 'Cardio',
    mountain: 'Strength',
    plague: 'Hygiene',
    night: 'Sleep',
    market: 'Social',
    plains: '',
    forest: '',
};

// ─── REGION GENERATION (Removed for Phase 1) ──────────────────────────

// ─── DICE ROLLS ─────────────────────────────────

// ─── BFS PATHFINDING ──────────────────────────────

function findExactDistanceNodes(startId: string | null, distance: number, allNodes: ConquestNodeData[]): string[] {
    if (!startId || distance <= 0) return [];

    // Check if the boss is less than 'distance' away to cap movement
    let currentLevel = [startId];
    let steps = 0;

    while (steps < distance && currentLevel.length > 0) {
        let nextLevel: string[] = [];
        for (const nodeId of currentLevel) {
            const node = allNodes.find(n => n.id === nodeId);
            if (node) {
                // If a connection leads to the boss, the boss is the terminus even if steps < distance
                for (const conn of node.connections) {
                    if (!nextLevel.includes(conn)) {
                        nextLevel.push(conn);
                    }
                }
            }
        }

        // If we hit a dead end (or boss node which has no connections), we can't go further
        if (nextLevel.length === 0) {
            return currentLevel; // Cap at the furthest reachable points (likely the boss)
        }

        currentLevel = nextLevel;
        steps++;

        // If any node in the next level is the boss, we can stop evaluating those branches and cap them there.
        if (currentLevel.includes('boss')) {
            return ['boss'];
        }
    }

    return currentLevel;
}

// ─── STORE ──────────────────────────────────────

export const useConquestStore = create<ConquestState>()(
    persist(
        (set, get) => ({
            sigils: 0,

            // Map State
            act: 1,
            diceRolls: 5,
            activeDiceRoll: null,
            currentNodeId: null,
            completedNodes: [],

            soldiers: [],
            maxTeamSize: 1,
            barracksLevel: 0,
            scoutTowerLevel: 0,
            shrineLevel: 0,
            diceCount: 2,
            morale: 50,
            memoryLog: {
                highestRegionCleared: 0,
                fastestConquest: null,
                leastTroopLoss: null,
                mostSigilsInRun: 0,
            },

            // Run State
            runHP: 100,
            runMaxHP: 100,
            runFloor: 0,
            runBuffs: [],
            runComplete: 'none',
            lastRunDate: null,

            // NEW — run resources
            balloons: 0,
            shmeckles: 0,

            // NEW — run progression
            treasureVaultsCompleted: 0,
            runArtifacts: [],
            runRelics: [],
            rewardAmplifierActive: false,

            // Meta
            runsCompleted: 0,
            bestFloor: 0,

            addSigils: (amount) => set(s => ({ sigils: s.sigils + amount })),

            spendSigils: (amount) => {
                const { sigils } = get();
                if (sigils < amount) return false;
                set({ sigils: sigils - amount });
                return true;
            },

            initMap: () => {
                const state = get();
                if (state.currentNodeId) return; // Already initialized
                set({
                    currentNodeId: 'start',
                    completedNodes: ['start'],
                    activeDiceRoll: null,
                    diceRolls: 0,
                    runFloor: 0,
                    runComplete: 'none'
                });
            },

            rollMapDice: () => null,

            getReachableNodes: () => {
                const state = get();
                return findExactDistanceNodes(state.currentNodeId, 1, CONQUEST_MAP_NODES);
            },
            
            isDailyRunLocked: () => {
                const state = get();
                if (!state.lastRunDate) return false;

                // Compare using the same ISO YYYY-MM-DD format that completeRun() writes
                const todayISO = new Date().toISOString().split('T')[0];
                return state.lastRunDate === todayISO;
            },

            movePlayer: (nodeId: string) => {
                const state = get();
                if (!state.completedNodes.includes(nodeId)) {
                    // Find node to get its tier
                    const nodeDef = CONQUEST_MAP_NODES.find(n => n.id === nodeId);
                    const newFloor = nodeDef ? nodeDef.tier : state.runFloor;
                    const newBestFloor = Math.max(state.bestFloor, newFloor);

                    set({
                        currentNodeId: nodeId,
                        completedNodes: [...state.completedNodes, nodeId],
                        activeDiceRoll: null,
                        runFloor: newFloor,
                        bestFloor: newBestFloor
                    });
                }
            },

            grantSpireReward: (gold: number, sigils: number, gems: number = 0) => {
                // Apply strict reward caps
                const cappedGold = Math.min(gold, 25);
                const cappedSigils = Math.min(sigils, 3);
                // Also capping gems just in case they are generated somewhere and misused
                const cappedGems = Math.min(gems, 3);

                if (cappedGold > 0) {
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        useCurrencyStore.getState().addGold(cappedGold);
                    }).catch(() => { });
                }
                if (cappedGems > 0) {
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addGems(cappedGems);
                    }).catch(() => { });
                }
                if (cappedSigils > 0) {
                    get().addSigils(cappedSigils);
                }

                // 25% chance to drop a Risk card as connective progression
                if (Math.random() < 0.25) {
                    import('./useRiskStore').then(({ useRiskStore }) => {
                        const cards = ['blitz', 'iron_discipline', 'medic', 'war_banner', 'treasurer', 'recruiter', 'warlord_sigil', 'tank_tactics'] as const;
                        const drop = cards[Math.floor(Math.random() * cards.length)];
                        useRiskStore.getState().gainCard(drop);
                    }).catch(() => {});
                }
            },

            // ─── RUN ACTIONS ───
            startRun: () => {
                // NOTE: We do NOT stamp lastRunDate here — the date is only committed
                // after the run ends (victory or defeat) in completeRun().
                // This means visiting Conquest on a fresh profile is always unlocked.
                set({
                    runHP: get().runMaxHP,
                    runFloor: 0,
                    runBuffs: [],
                    runComplete: 'none',
                    currentNodeId: 'start',
                    completedNodes: ['start'],
                    activeDiceRoll: null,
                    // Reset new run fields
                    balloons: 0,
                    shmeckles: 0,
                    treasureVaultsCompleted: 0,
                    runArtifacts: [],
                    runRelics: [],
                    rewardAmplifierActive: false,
                });
            },

            takeDamage: (amount: number) => {
                if (amount <= 0) return;
                const state = get();
                const newHP = Math.max(0, state.runHP - amount);
                set({ 
                    runHP: newHP,
                    runComplete: newHP <= 0 ? 'defeat' : state.runComplete
                });
            },

            healHP: (amount: number) => {
                if (amount <= 0) return;
                const state = get();
                // Ensure healing doesn't exceed 50% max HP of the player's runMaxHP from nodes
                // Note: param "amount" may be used elsewhere. For Conquest campfires we cap to Math.min(amount, max/2)
                const actualAmount = Math.min(amount, Math.floor(state.runMaxHP * 0.5));
                set({ runHP: Math.min(state.runMaxHP, state.runHP + actualAmount) });
            },

            addRunBuff: (buff: RunBuff) => {
                const state = get();
                set({ runBuffs: [...state.runBuffs, buff] });
            },

            // ─── NEW RUN ACTIONS ───
            addBalloons: (n: number) => set(s => ({ balloons: s.balloons + n })),
            addShmeckles: (n: number) => set(s => ({ shmeckles: s.shmeckles + n })),

            completeTreasureVault: () => set(s => ({ treasureVaultsCompleted: s.treasureVaultsCompleted + 1 })),

            addRunArtifact: (id: string) => set(s => ({ runArtifacts: [...s.runArtifacts, id] })),

            addRunRelic: (id: string) => set(s => ({ runRelics: [...s.runRelics, id] })),

            activateRewardAmplifier: () => set({ rewardAmplifierActive: true }),

            getVaultScaledBossMultiplier: () => {
                const vaults = get().treasureVaultsCompleted;
                return 1 + vaults * 0.10; // +10% ATK & HP per vault
            },

            completeRun: (victory: boolean) => {
                const state = get();
                // Always stamp today's date on run completion (both victory AND defeat)
                // so the daily lock fires correctly after any run ends.
                const today = new Date().toISOString().split('T')[0];
                set({ 
                    runComplete: victory ? 'victory' : 'defeat',
                    runsCompleted: victory ? state.runsCompleted + 1 : state.runsCompleted,
                    lastRunDate: today,
                });
            },

            resetRun: () => {
                get().startRun();
            },

            recruitSoldier: (name, role) => {
                const state = get();
                if (state.soldiers.length >= state.maxTeamSize) return false;
                const cost = 30;
                if (!get().spendSigils(cost)) return false;

                const newSoldier: Soldier = {
                    id: `soldier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name,
                    rank: 'Recruit',
                    level: 1,
                    atk: 1,
                    def: 1,
                    role,
                };
                set({ soldiers: [...state.soldiers, newSoldier] });
                return true;
            },

            upgradeSoldierRank: (soldierId) => {
                const state = get();
                const soldier = state.soldiers.find(s => s.id === soldierId);
                if (!soldier) return false;

                const rankIdx = RANK_ORDER.indexOf(soldier.rank);
                if (rankIdx >= RANK_ORDER.length - 1) return false; // Already max rank

                const cost = RANK_UPGRADE_COST[soldier.rank];
                if (!get().spendSigils(cost)) return false;

                const newRank = RANK_ORDER[rankIdx + 1];
                const mult = RANK_MULTIPLIERS[newRank];

                const newSoldiers = state.soldiers.map(s =>
                    s.id === soldierId
                        ? { ...s, rank: newRank, level: s.level + 1, atk: Math.floor((s.level + 1) * mult), def: Math.floor((s.level + 1) * mult) }
                        : s
                );
                set({ soldiers: newSoldiers });
                return true;
            },

            upgradeMaxTeamSize: () => {
                const state = get();
                if (state.maxTeamSize >= 6) return false;
                const cost = TEAM_SIZE_COSTS[state.maxTeamSize]; // cost for next slot
                if (!cost || !get().spendSigils(cost)) return false;
                set({ maxTeamSize: state.maxTeamSize + 1 });
                return true;
            },

            upgradeBarracks: () => {
                const state = get();
                if (state.barracksLevel >= BARRACKS_COST.length) return false;
                const cost = BARRACKS_COST[state.barracksLevel];
                if (!get().spendSigils(cost)) return false;
                set({ barracksLevel: state.barracksLevel + 1 });
                return true;
            },

            upgradeScoutTower: () => {
                const state = get();
                if (state.scoutTowerLevel >= SCOUT_COST.length) return false;
                const cost = SCOUT_COST[state.scoutTowerLevel];
                if (!get().spendSigils(cost)) return false;
                set({ scoutTowerLevel: state.scoutTowerLevel + 1 });
                return true;
            },

            upgradeShrine: () => {
                const state = get();
                if (state.shrineLevel >= SHRINE_COST.length) return false;
                const cost = SHRINE_COST[state.shrineLevel];
                if (!get().spendSigils(cost)) return false;
                set({ shrineLevel: state.shrineLevel + 1 });
                return true;
            },

            upgradeDice: () => {
                const state = get();
                const upgradeIdx = state.diceCount - 2; // 0 = 2->3, 1 = 3->4
                if (upgradeIdx >= DICE_UPGRADE_COST.length) return false;
                const cost = DICE_UPGRADE_COST[upgradeIdx];
                if (!get().spendSigils(cost)) return false;
                set({ diceCount: state.diceCount + 1 });
                return true;
            },

            adjustMorale: (amount) => set(s => ({
                morale: Math.min(100, Math.max(0, s.morale + amount)),
            })),

            // ─── GETTERS ────────────────────────────────

            getPowerScore: () => {
                const { strategyLevel } = useStrategyStore.getState();
                return strategyLevel * 10;
            },

            getArmyBonus: () => {
                const { soldiers } = get();
                if (soldiers.length === 0) return 0;
                let bonus = 0;
                for (const s of soldiers) {
                    bonus += (s.atk + s.def) * 0.01;
                }
                return Math.min(0.5, bonus); // Hard cap at +50%
            },

            getTotalForce: () => {
                const power = get().getPowerScore();
                const army = get().getArmyBonus();
                return Math.floor(power * (1 + army));
            },

            getTerrainModifier: (terrain) => {
                const skillName = TERRAIN_SKILL_MAP[terrain];
                if (!skillName) return 0;
                // Lazy import to avoid circular dependency (useGameStore was removed from top-level import)
                const { useGameStore } = require('./useGameStore');
                const game = useGameStore.getState();
                const skill = game.skills[skillName as keyof typeof game.skills];
                if (!skill) return 0;
                return Math.min(3, Math.floor(skill.level / 5));
            },

            getMoraleModifier: () => {
                const { morale } = get();
                if (morale >= 80) return 2;
                if (morale >= 60) return 1;
                if (morale >= 40) return 0;
                if (morale >= 20) return -1;
                return -2;
            },

            // Stubs for removed old features to prevent UI compile crashes
            isSupplyConnected: () => true,
            initRegions: () => { },
            conquestAttack: () => ({ won: false, sigilsEarned: 0, goldEarned: 0, gemsEarned: 0, troopsLost: 0, moraleChange: 0, rolls: { attacker: 0, defender: 0, attackerDice: [], defenderDice: [] }, modifiers: { force: 0, terrain: 0, morale: 0, recon: 0 } }),
        }),
        {
            name: PERSIST_REGISTRY.conquest.persistKey,
        }
    )
);
