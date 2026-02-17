import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from './useGameStore';


// ─── TYPES ────────────────────────────────────────

export type SoldierRank = 'Recruit' | 'Footman' | 'Veteran' | 'Captain' | 'Elite Guard' | 'Warden';
export type SoldierRole = 'scout' | 'morale' | 'siege' | 'healer';
export type NodeType = 'normal' | 'resource' | 'elite' | 'boss' | 'stronghold';
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

export interface ConquestNode {
    id: string;
    regionId: string;
    type: NodeType;
    terrain: TerrainType;
    name: string;
    enemyForce: number;
    connections: string[];     // IDs of connected nodes
    conquered: boolean;
    isBoss: boolean;
    sigils: number;            // Reward
}

export interface ConquestRegion {
    id: string;
    name: string;
    nodes: ConquestNode[];
    cleared: boolean;
    bossNodeId: string;
}

export interface MemoryLog {
    highestRegionCleared: number;
    fastestConquest: number | null;   // turns
    leastTroopLoss: number | null;
    mostSigilsInRun: number;
}

export interface ConquestState {
    // Currency
    sigils: number;

    // Map
    regions: ConquestRegion[];
    currentRegionIdx: number;
    currentNodeId: string | null;
    baseNodeId: string | null;

    // Soldiers
    soldiers: Soldier[];
    maxTeamSize: number;
    barracksLevel: number;
    scoutTowerLevel: number;
    shrineLevel: number;

    // Morale
    morale: number;       // 0-100

    // Memory Log
    memoryLog: MemoryLog;

    // Actions
    addSigils: (amount: number) => void;
    spendSigils: (amount: number) => boolean;
    initRegions: () => void;
    conquestAttack: (nodeId: string) => ConquestCombatResult;
    recruitSoldier: (name: string, role: SoldierRole) => boolean;
    upgradeSoldierRank: (soldierId: string) => boolean;
    upgradeMaxTeamSize: () => boolean;
    upgradeBarracks: () => boolean;
    upgradeScoutTower: () => boolean;
    upgradeShrine: () => boolean;
    adjustMorale: (amount: number) => void;

    // Getters
    getPowerScore: () => number;
    getArmyBonus: () => number;
    getTotalForce: () => number;
    getTerrainModifier: (terrain: TerrainType) => number;
    getMoraleModifier: () => number;
    isSupplyConnected: (nodeId: string) => boolean;
}

export interface ConquestCombatResult {
    won: boolean;
    sigilsEarned: number;
    troopsLost: number;
    moraleChange: number;
    rolls: { attacker: number; defender: number };
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

const TERRAIN_SKILL_MAP: Record<TerrainType, string> = {
    swamp: 'Cardio',
    mountain: 'Strength',
    plague: 'Hygiene',
    night: 'Sleep',
    market: 'Social',
    plains: '',
    forest: '',
};

// ─── REGION GENERATION ──────────────────────────

function generateRegions(): ConquestRegion[] {
    const regionDefs = [
        { name: 'The Verdant Outskirts', terrain: ['plains', 'forest', 'swamp'] as TerrainType[], nodes: 12, enemyBase: 50 },
        { name: 'Ironclad Highlands', terrain: ['mountain', 'plains', 'forest'] as TerrainType[], nodes: 15, enemyBase: 120 },
        { name: 'The Blighted Marsh', terrain: ['swamp', 'plague', 'night'] as TerrainType[], nodes: 18, enemyBase: 250 },
        { name: 'Shadow Expanse', terrain: ['night', 'plains', 'mountain'] as TerrainType[], nodes: 20, enemyBase: 500 },
        { name: 'The Merchant Coast', terrain: ['market', 'plains', 'forest'] as TerrainType[], nodes: 22, enemyBase: 900 },
        { name: 'Plague Wastes', terrain: ['plague', 'swamp', 'mountain'] as TerrainType[], nodes: 25, enemyBase: 1500 },
        { name: 'Dreadfire Summit', terrain: ['mountain', 'night', 'plague'] as TerrainType[], nodes: 28, enemyBase: 2500 },
    ];

    const regions: ConquestRegion[] = [];
    for (let ri = 0; ri < regionDefs.length; ri++) {
        const def = regionDefs[ri];
        const nodes: ConquestNode[] = [];
        const bossNodeId = `r${ri}_boss`;

        for (let ni = 0; ni < def.nodes; ni++) {
            const isBoss = ni === def.nodes - 1;
            const isStronghold = ni > 0 && ni % 5 === 0 && !isBoss;
            const isElite = !isBoss && !isStronghold && ni > 0 && ni % 4 === 0;
            const isResource = !isBoss && !isStronghold && !isElite && ni % 3 === 0 && ni > 0;

            let type: NodeType = 'normal';
            if (isBoss) type = 'boss';
            else if (isStronghold) type = 'stronghold';
            else if (isElite) type = 'elite';
            else if (isResource) type = 'resource';

            const id = isBoss ? bossNodeId : `r${ri}_n${ni}`;
            const terrain = def.terrain[ni % def.terrain.length];
            const forceMult = isBoss ? 3 : isElite ? 1.8 : isStronghold ? 1.5 : isResource ? 0.7 : 1;
            const enemyForce = Math.floor(def.enemyBase * (1 + ni * 0.15) * forceMult);
            const sigils = isBoss ? 100 + ri * 50 : isElite ? 30 + ri * 10 : isResource ? 15 + ri * 5 : 8 + ri * 3;

            // Build linear connections
            const connections: string[] = [];
            if (ni > 0) connections.push(ni === def.nodes - 1 ? `r${ri}_n${ni - 1}` : `r${ri}_n${ni - 1}`);
            if (ni < def.nodes - 1) connections.push(ni === def.nodes - 2 ? bossNodeId : `r${ri}_n${ni + 1}`);

            const nodeNames = [
                'Forward Camp', 'Watchtower', 'Abandoned Village', 'Crossroads', 'Old Bridge',
                'Ruined Temple', 'Supply Depot', 'Scout Post', 'Fortress Gate', 'Hidden Passage',
                'Guard Tower', 'River Crossing', 'Ravine Camp', 'Dark Hollow', 'Summit Outpost',
                'The Blight', 'War Camp', 'Iron Gate', 'Siege Point', 'Overlook',
                'Collapsed Tunnel', 'Market Square', 'Harbor Post', 'Cliff Edge', 'Bone Pit',
                'Pyre Fields', 'Ash Canyon', 'Storm Pass',
            ];

            nodes.push({
                id,
                regionId: `region_${ri}`,
                type,
                terrain,
                name: isBoss ? `${def.name} - Boss` : nodeNames[ni % nodeNames.length],
                enemyForce,
                connections,
                conquered: false,
                isBoss,
                sigils,
            });
        }

        regions.push({
            id: `region_${ri}`,
            name: def.name,
            nodes,
            cleared: false,
            bossNodeId,
        });
    }

    return regions;
}

// ─── DICE ROLLS ─────────────────────────────────

function roll2d6(): number {
    return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

// ─── HELPERS ──────────────────────────────────────

function checkSupplyConnection(
    startNodeId: string,
    baseNodeId: string,
    nodes: ConquestNode[]
): boolean {
    if (!baseNodeId) return false;

    // BFS from nodeId to baseNodeId through conquered nodes
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;

        if (current === baseNodeId) return true;
        if (visited.has(current)) continue;
        visited.add(current);

        const currentNode = nodes.find((n: ConquestNode) => n.id === current);
        if (!currentNode) continue;

        for (const connectedId of currentNode.connections) {
            const neighbor = nodes.find((n: ConquestNode) => n.id === connectedId);
            // Can move through conquered nodes OR if it is the base itself
            if (neighbor && (neighbor.conquered || neighbor.id === baseNodeId)) {
                queue.push(connectedId);
            }
        }
    }
    return false;
}

// ─── STORE ──────────────────────────────────────

export const useConquestStore = create<ConquestState>()(
    persist(
        (set, get) => ({
            sigils: 0,
            regions: [],
            currentRegionIdx: 0,
            currentNodeId: null,
            baseNodeId: null,
            soldiers: [],
            maxTeamSize: 1,
            barracksLevel: 0,
            scoutTowerLevel: 0,
            shrineLevel: 0,
            morale: 50,
            memoryLog: {
                highestRegionCleared: 0,
                fastestConquest: null,
                leastTroopLoss: null,
                mostSigilsInRun: 0,
            },

            addSigils: (amount) => set(s => ({ sigils: s.sigils + amount })),

            spendSigils: (amount) => {
                const { sigils } = get();
                if (sigils < amount) return false;
                set({ sigils: sigils - amount });
                return true;
            },

            initRegions: () => {
                const state = get();
                if (state.regions.length > 0) return; // Already initialized
                const regions = generateRegions();
                set({
                    regions,
                    currentRegionIdx: 0,
                    currentNodeId: regions[0]?.nodes[0]?.id || null,
                    baseNodeId: regions[0]?.nodes[0]?.id || null,
                });
            },

            conquestAttack: (nodeId) => {
                const state = get();
                const region = state.regions[state.currentRegionIdx];
                if (!region) return { won: false, sigilsEarned: 0, troopsLost: 0, moraleChange: 0, rolls: { attacker: 0, defender: 0 }, modifiers: { force: 0, terrain: 0, morale: 0, recon: 0 } };

                const node = region.nodes.find(n => n.id === nodeId);
                if (!node || node.conquered) return { won: false, sigilsEarned: 0, troopsLost: 0, moraleChange: 0, rolls: { attacker: 0, defender: 0 }, modifiers: { force: 0, terrain: 0, morale: 0, recon: 0 } };

                // Calculate forces
                const totalForce = get().getTotalForce();
                const enemyForce = node.enemyForce;

                // Roll dice
                const attackerRoll = roll2d6();
                const defenderRoll = roll2d6();

                // Force modifier
                const forceMod = Math.min(3, Math.max(-3, Math.floor((totalForce / enemyForce - 1) * 4)));

                // Terrain modifier
                const terrainMod = get().getTerrainModifier(node.terrain);

                // Morale modifier
                const moraleMod = get().getMoraleModifier();

                // Recon modifier (from scout tower)
                const reconMod = Math.min(2, state.scoutTowerLevel);

                // Total modifier capped
                const totalMod = Math.min(5, Math.max(-5, forceMod + terrainMod + moraleMod + reconMod));

                const attackerTotal = attackerRoll + totalMod;
                const defenderTotal = defenderRoll;

                const won = attackerTotal > defenderTotal;

                // Troop losses
                let troopsLost = 0;
                if (won) {
                    // Win still causes attrition
                    troopsLost = Math.max(0, Math.floor(state.soldiers.length * 0.1 * Math.random()));
                } else {
                    troopsLost = Math.max(1, Math.floor(state.soldiers.length * 0.3 * Math.random()));
                }

                // Morale change
                const moraleChange = won ? Math.min(100, 10 + Math.floor(Math.random() * 5)) : -Math.min(100, 15 + Math.floor(Math.random() * 10));

                // Apply results
                const newMorale = Math.min(100, Math.max(0, state.morale + moraleChange));
                const sigilsEarned = won ? node.sigils : 0;

                // Remove lost soldiers (random)
                let newSoldiers = [...state.soldiers];
                for (let i = 0; i < troopsLost && newSoldiers.length > 0; i++) {
                    const idx = Math.floor(Math.random() * newSoldiers.length);
                    newSoldiers.splice(idx, 1);
                }

                if (won) {
                    // Mark node conquered
                    const newRegions = state.regions.map((r, ri) => {
                        if (ri !== state.currentRegionIdx) return r;
                        const newNodes = r.nodes.map(n =>
                            n.id === nodeId ? { ...n, conquered: true } : n
                        );
                        const allConquered = newNodes.every(n => n.conquered);
                        return { ...r, nodes: newNodes, cleared: allConquered };
                    });

                    // Update memory log
                    const newMemory = { ...state.memoryLog };
                    if (newRegions[state.currentRegionIdx]?.cleared) {
                        newMemory.highestRegionCleared = Math.max(newMemory.highestRegionCleared, state.currentRegionIdx + 1);
                    }
                    newMemory.mostSigilsInRun = Math.max(newMemory.mostSigilsInRun, state.sigils + sigilsEarned);

                    set({
                        sigils: state.sigils + sigilsEarned,
                        morale: newMorale,
                        soldiers: newSoldiers,
                        regions: newRegions,
                        currentNodeId: nodeId,
                        memoryLog: newMemory,
                    });
                } else {
                    set({
                        morale: newMorale,
                        soldiers: newSoldiers,
                    });
                }

                return {
                    won,
                    sigilsEarned,
                    troopsLost,
                    moraleChange,
                    rolls: { attacker: attackerRoll, defender: defenderRoll },
                    modifiers: { force: forceMod, terrain: terrainMod, morale: moraleMod, recon: reconMod },
                };
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

            adjustMorale: (amount) => set(s => ({
                morale: Math.min(100, Math.max(0, s.morale + amount)),
            })),

            // ─── GETTERS ────────────────────────────────

            getPowerScore: () => {
                const game = useGameStore.getState();

                const baseAtk = game.getAttack();
                const baseDef = game.getDefense();
                const hp = 95 + (game.skills['Health']?.level || 1) * 5;
                const spd = 50 + (game.skills['Cardio']?.level || 1) * 2;
                return (baseAtk * 3) + (baseDef * 2) + (hp / 10) + (spd / 5);
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

            isSupplyConnected: (nodeId: string) => {
                const state = get();
                const region = state.regions[state.currentRegionIdx];
                if (!region || !state.baseNodeId) return false;
                return checkSupplyConnection(nodeId, state.baseNodeId, region.nodes);
            },
        }),
        {
            name: 'gl-conquest-storage-v1',
        }
    )
);
