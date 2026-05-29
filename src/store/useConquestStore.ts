import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStrategyStore } from './useStrategyStore';
import { useCurrencyStore } from './useCurrencyStore';
import { enableConquest } from '../utils/featureFlags';
import { CONQUEST_MAP_NODES, CONQUEST_ARTIFACTS, CONQUEST_BOSS_POOL, type ConquestNodeData } from '../data/conquest';
import { generateConquestMap } from '../data/conquestMapGen';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
// ─── UTILS ────────────────────────────────────────

const getEasternDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

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

}

export type RunBuffType = 
    | 'attackPercent' 
    | 'defensePercent' 
    | 'critPercent' 
    | 'maxHpFlat' 
    | 'maxHpPercent' 
    | 'healingBonusPercent' 
    | 'goldGainPercent' 
    | 'chessRewardBonus'
    // Legacy support flags:
    | 'strength' 
    | 'defense' 
    | 'wealth' 
    | 'curse';

export interface RunBuff {
    id: string;
    type: RunBuffType;
    label: string;
    amount: number;
}

export interface ConquestState {

    // Conquest Map (Phase 1)
    act: number;
    diceRolls: number;
    activeDiceRoll: number | null;
    currentNodeId: string | null;
    completedNodes: string[];
    generatedMap: ConquestNodeData[];
    mapSeed: number;

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
    grantSpireReward: (gold: number, gems?: number) => void;

    // Run State (Slay the Spire style)
    runHP: number;
    runMaxHP: number;
    runFloor: number;
    runBuffs: RunBuff[];
    runComplete: 'none' | 'victory' | 'defeat';
    lastRunDate: string | null;
    currentRunStartDate: string | null;



    // NEW — run progression tracking
    treasureVaultsCompleted: number;
    runArtifacts: string[];   // artifact IDs active this run
    runRelics: string[];      // relic IDs purchased this run
    rewardAmplifierActive: boolean;
    activeConquestEnemyId: string | null; // tracks which conquest enemy is being fought
    runBossId: string | null; // which boss was selected for this run

    // Run Stats
    runStats: {
        enemiesDefeated: number;
        nodesVisited: number;
        totalDamageDealt: number;
        totalDamageTaken: number;
        itemsFound: number;
    };

    // Meta Progression
    runsCompleted: number;
    bestFloor: number;
    metaUpgrades: {
        maxHpBonus: number;       // +10 per level
        startingAtkBonus: number; // +5% per level
        extraRunTickets: number;  // purchased ticket levels
    };
    runHistory: Array<{
        date: string;
        result: 'victory' | 'defeat';
        floor: number;
        enemiesDefeated: number;
        nodesVisited: number;
        bossName: string;
    }>;
    dailyTickets: number;

    // Run Actions
    startRun: () => void;
    isDailyRunLocked: () => boolean;
    takeDamage: (amount: number) => void;
    healHP: (amount: number) => void;
    addRunBuff: (buff: RunBuff) => void;
    completeRun: (victory: boolean) => void;
    resetRun: () => void;

    // NEW run resource actions
    completeTreasureVault: () => void;
    addRunArtifact: (id: string) => void;
    addRunRelic: (id: string) => void;
    activateRewardAmplifier: () => void;
    getVaultScaledBossMultiplier: () => number;
    setActiveConquestEnemy: (id: string | null) => void;
    trackDamageDealt: (amount: number) => void;
    trackDamageTaken: (amount: number) => void;
    incrementEnemiesDefeated: () => void;
    incrementItemsFound: () => void;

    // Artifact effects
    getArtifactEffects: () => {
        goldBonusPct: number;
        gemOnNextKill: boolean;
        doubleResourceChance: number;
    };

    // Meta-shop actions
    buyMetaMaxHp: () => boolean;
    buyMetaAtk: () => boolean;
    buyMetaTicket: () => boolean;
    useRunTicket: () => boolean;

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


            // Map State
            act: 1,
            diceRolls: 5,
            activeDiceRoll: null,
            currentNodeId: null,
            completedNodes: [],
            generatedMap: [],
            mapSeed: 0,

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
            },

            // Run State
            runHP: 100,
            runMaxHP: 100,
            runFloor: 0,
            runBuffs: [],
            runComplete: 'none',
            lastRunDate: null,
            currentRunStartDate: null,



            // NEW — run progression
            treasureVaultsCompleted: 0,
            runArtifacts: [],
            runRelics: [],
            rewardAmplifierActive: false,
            activeConquestEnemyId: null,
            runBossId: null,

            // Run Stats
            runStats: {
                enemiesDefeated: 0,
                nodesVisited: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                itemsFound: 0,
            },

            // Meta
            runsCompleted: 0,
            bestFloor: 0,
            metaUpgrades: {
                maxHpBonus: 0,
                startingAtkBonus: 0,
                extraRunTickets: 0,
            },
            runHistory: [],
            dailyTickets: 0,



            initMap: () => {
                const state = get();
                const todayISO = getEasternDateString();

                // ── Daily reset: if the run started on a prior day, force a fresh run ──
                const hasActiveRun = state.currentNodeId !== null;
                const isStaleRun = state.currentRunStartDate !== todayISO;

                if (hasActiveRun && isStaleRun) {
                    // Clear old run and start fresh
                    get().startRun();
                    return;
                }

                if (state.currentNodeId) return; // Already initialized for today

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
                const mapNodes = state.generatedMap.length > 0 ? state.generatedMap : CONQUEST_MAP_NODES;
                return findExactDistanceNodes(state.currentNodeId, 1, mapNodes);
            },
            
            isDailyRunLocked: () => {
                if (!enableConquest) return true;
                const state = get();
                if (!state.lastRunDate) return false;
                const todayISO = getEasternDateString();
                if (state.lastRunDate !== todayISO) return false;
                // If player has tickets, they can bypass the lock
                if (state.dailyTickets > 0) return false;
                return true;
            },

            movePlayer: (nodeId: string) => {
                const state = get();
                if (!state.completedNodes.includes(nodeId)) {
                    const mapNodes = state.generatedMap.length > 0 ? state.generatedMap : CONQUEST_MAP_NODES;
                    const nodeDef = mapNodes.find(n => n.id === nodeId);
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

            grantSpireReward: (gold: number, gems: number = 0) => {
                if (!enableConquest) return;
                // Apply artifact bonuses
                const effects = get().getArtifactEffects();
                const amplifier = get().rewardAmplifierActive ? 1 : 0;
                
                let finalGold = gold;
                let finalGems = gems + amplifier;

                // Gold bonus from Merchant's Coin artifact
                if (effects.goldBonusPct > 0) {
                    finalGold = Math.floor(finalGold * (1 + effects.goldBonusPct / 100));
                }

                // Double resource chance from Amplifier Charm artifact
                if (effects.doubleResourceChance > 0 && Math.random() < effects.doubleResourceChance / 100) {
                    finalGold *= 2;
                    finalGems *= 2;
                }

                if (finalGold > 0) {
                    useCurrencyStore.getState().addGold(finalGold);
                }
                if (finalGems > 0) {
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addGems(finalGems);
                    }).catch(() => { });
                }

                // Gem on next kill artifact (consumed after one use)
                if (effects.gemOnNextKill) {
                    import('./useGameStore').then(({ useGameStore }) => {
                        useGameStore.getState().addGems(1);
                    }).catch(() => { });
                    // Remove the artifact from this run
                    set(s => ({ runArtifacts: s.runArtifacts.filter(a => a !== 'art_gem_kill') }));
                }

                // 25% chance to drop a Risk card as connective progression
                if (Math.random() < 0.25) {
                    import('./useRiskStore').then(({ useRiskStore }) => {
                        const cards = ['blitz', 'iron_discipline', 'medic', 'war_banner', 'treasurer', 'recruiter', 'warlord_coin', 'tank_tactics'] as const;
                        const drop = cards[Math.floor(Math.random() * cards.length)];
                        useRiskStore.getState().gainCard(drop);
                    }).catch(() => {});
                }
            },

            // ─── RUN ACTIONS ───
            startRun: () => {
                if (!enableConquest) return;
                const state = get();
                
                // If locked, consume a ticket
                const todayISO = getEasternDateString();
                if (state.lastRunDate === todayISO && state.dailyTickets > 0) {
                    set(s => ({ dailyTickets: s.dailyTickets - 1 }));
                }

                // Apply meta upgrades
                const baseMaxHP = 100 + state.metaUpgrades.maxHpBonus;

                // Pick a random boss for this run
                const bossPool = CONQUEST_BOSS_POOL;
                const runBoss = bossPool[Math.floor(Math.random() * bossPool.length)];

                // Generate a procedural map
                const seed = Date.now();
                const map = generateConquestMap(state.act, seed, runBoss.id);

                set({
                    runHP: baseMaxHP,
                    runMaxHP: baseMaxHP,
                    runFloor: 0,
                    runBuffs: state.metaUpgrades.startingAtkBonus > 0
                        ? [{ id: 'meta_atk', type: 'strength' as const, label: `Meta ATK: +${state.metaUpgrades.startingAtkBonus * 5}%`, amount: state.metaUpgrades.startingAtkBonus * 5 }]
                        : [],
                    runComplete: 'none',
                    currentRunStartDate: todayISO,
                    currentNodeId: 'start',
                    completedNodes: ['start'],
                    activeDiceRoll: null,
                    generatedMap: map,
                    mapSeed: seed,
                    runBossId: runBoss.id,
                    treasureVaultsCompleted: 0,
                    runArtifacts: [],
                    runRelics: [],
                    rewardAmplifierActive: false,
                    activeConquestEnemyId: null,
                    runStats: {
                        enemiesDefeated: 0,
                        nodesVisited: 0,
                        totalDamageDealt: 0,
                        totalDamageTaken: 0,
                        itemsFound: 0,
                    },
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
                const today = getEasternDateString();
                
                // Get boss name for history
                const bossEnemy = CONQUEST_BOSS_POOL.find(b => b.id === state.runBossId);
                const bossName = bossEnemy?.name ?? 'Unknown';

                const historyEntry = {
                    date: today,
                    result: (victory ? 'victory' : 'defeat') as 'victory' | 'defeat',
                    floor: state.runFloor,
                    enemiesDefeated: state.runStats.enemiesDefeated,
                    nodesVisited: state.runStats.nodesVisited,
                    bossName,
                };

                set({ 
                    runComplete: victory ? 'victory' : 'defeat',
                    runsCompleted: victory ? state.runsCompleted + 1 : state.runsCompleted,
                    lastRunDate: today,
                    runHistory: [historyEntry, ...state.runHistory].slice(0, 20), // Keep last 20
                });
            },

            resetRun: () => {
                get().startRun();
            },

            // ─── ARTIFACT EFFECTS ───
            getArtifactEffects: () => {
                const artifacts = get().runArtifacts;
                let goldBonusPct = 0;
                let gemOnNextKill = false;
                let doubleResourceChance = 0;

                for (const artId of artifacts) {
                    const def = CONQUEST_ARTIFACTS.find(a => a.id === artId);
                    if (!def) continue;
                    switch (def.effect) {
                        case 'gold_bonus_10pct': goldBonusPct += 10; break;
                        case 'gem_on_next_kill': gemOnNextKill = true; break;
                        case 'double_resource_5pct': doubleResourceChance += 5; break;
                    }
                }
                return { goldBonusPct, gemOnNextKill, doubleResourceChance };
            },

            // ─── RUN TRACKING ───
            setActiveConquestEnemy: (id) => set({ activeConquestEnemyId: id }),
            trackDamageDealt: (amount) => set(s => ({ runStats: { ...s.runStats, totalDamageDealt: s.runStats.totalDamageDealt + amount } })),
            trackDamageTaken: (amount) => set(s => ({ runStats: { ...s.runStats, totalDamageTaken: s.runStats.totalDamageTaken + amount } })),
            incrementEnemiesDefeated: () => set(s => ({ runStats: { ...s.runStats, enemiesDefeated: s.runStats.enemiesDefeated + 1 } })),
            incrementItemsFound: () => set(s => ({ runStats: { ...s.runStats, itemsFound: s.runStats.itemsFound + 1 } })),

            // ─── META-SHOP ───
            buyMetaMaxHp: () => {
                const cost = (get().metaUpgrades.maxHpBonus / 10 + 1) * 50; // 50, 100, 150...
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set(s => ({ metaUpgrades: { ...s.metaUpgrades, maxHpBonus: s.metaUpgrades.maxHpBonus + 10 } }));
                return true;
            },
            buyMetaAtk: () => {
                const cost = (get().metaUpgrades.startingAtkBonus + 1) * 75; // 75, 150, 225...
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set(s => ({ metaUpgrades: { ...s.metaUpgrades, startingAtkBonus: s.metaUpgrades.startingAtkBonus + 1 } }));
                return true;
            },
            buyMetaTicket: () => {
                const cost = 100;
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set(s => ({ dailyTickets: s.dailyTickets + 1 }));
                return true;
            },
            useRunTicket: () => {
                if (get().dailyTickets <= 0) return false;
                set(s => ({ dailyTickets: s.dailyTickets - 1 }));
                return true;
            },

            recruitSoldier: (name, role) => {
                const state = get();
                if (state.soldiers.length >= state.maxTeamSize) return false;
                const cost = 30;
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;

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
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;

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
                if (!cost || !useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set({ maxTeamSize: state.maxTeamSize + 1 });
                return true;
            },

            upgradeBarracks: () => {
                const state = get();
                if (state.barracksLevel >= BARRACKS_COST.length) return false;
                const cost = BARRACKS_COST[state.barracksLevel];
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set({ barracksLevel: state.barracksLevel + 1 });
                return true;
            },

            upgradeScoutTower: () => {
                const state = get();
                if (state.scoutTowerLevel >= SCOUT_COST.length) return false;
                const cost = SCOUT_COST[state.scoutTowerLevel];
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set({ scoutTowerLevel: state.scoutTowerLevel + 1 });
                return true;
            },

            upgradeShrine: () => {
                const state = get();
                if (state.shrineLevel >= SHRINE_COST.length) return false;
                const cost = SHRINE_COST[state.shrineLevel];
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
                set({ shrineLevel: state.shrineLevel + 1 });
                return true;
            },

            upgradeDice: () => {
                const state = get();
                const upgradeIdx = state.diceCount - 2; // 0 = 2->3, 1 = 3->4
                if (upgradeIdx >= DICE_UPGRADE_COST.length) return false;
                const cost = DICE_UPGRADE_COST[upgradeIdx];
                if (!useCurrencyStore.getState().spendGold(cost * 10)) return false;
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
                // Use dynamic import() to avoid circular dependency (Vite-safe)
                try {
                    // Access useGameStore via the module cache (already loaded at this point)
                    const gameModule = (globalThis as any).__useGameStore;
                    if (!gameModule) {
                        // Trigger async load for next call
                        import('./useGameStore').then(m => { (globalThis as any).__useGameStore = m.useGameStore; });
                        return 0;
                    }
                    const game = gameModule.getState();
                    const skill = game.skills[skillName as keyof typeof game.skills];
                    if (!skill) return 0;
                    return Math.min(3, Math.floor(skill.level / 5));
                } catch { return 0; }
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
            conquestAttack: () => ({ won: false, goldEarned: 0, gemsEarned: 0, troopsLost: 0, moraleChange: 0, rolls: { attacker: 0, defender: 0, attackerDice: [], defenderDice: [] }, modifiers: { force: 0, terrain: 0, morale: 0, recon: 0 } }),
        }),
        {
            name: PERSIST_REGISTRY.conquest.persistKey,
        }
    )
);
