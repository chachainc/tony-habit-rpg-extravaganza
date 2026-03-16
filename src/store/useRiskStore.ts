import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type TerritoryTrait = 'fortified' | 'resource' | 'mystic' | 'none';
export type RegionId = 'ashlands' | 'iron_highlands' | 'verdant_plains' | 'crystal_coast' | 'frozen_north' | 'sunken_expanse';
export type NodeType = 'combat' | 'elite' | 'boss' | 'shop' | 'treasure' | 'event';

export type RiskCardId =
    | 'blitz' | 'iron_discipline' | 'medic' | 'war_banner'
    | 'treasurer' | 'recruiter' | 'warlord_sigil' | 'tank_tactics'
    | 'iron_will' | 'treasure_sense' | 'arcane_edge';

export interface RiskCardDef {
    id: RiskCardId;
    icon: string;
    name: string;
    effect: string;
    category: string;
    cost: number;
}

export const RISK_CARDS: Record<RiskCardId, RiskCardDef> = {
    blitz:          { id: 'blitz',          icon: '⚡', name: 'Blitz',           effect: 'First die roll gets +1',                               category: 'Offense',  cost: 100 },
    iron_discipline:{ id: 'iron_discipline', icon: '🛡️', name: 'Iron Discipline',  effect: 'Tied dice comparisons count as player wins',           category: 'Defense',  cost: 100 },
    medic:          { id: 'medic',          icon: '💊', name: 'Medic Corps',      effect: 'Recover 1 soldier after any victory',                  category: 'Survival', cost: 100 },
    war_banner:     { id: 'war_banner',     icon: '🚩', name: 'War Banner',       effect: '+1 die when attacking a Captain or Boss node',         category: 'Offense',  cost: 100 },
    treasurer:      { id: 'treasurer',      icon: '💰', name: 'Treasurer',        effect: '+1 Schmeckle per game mode victory',                   category: 'Economy',  cost: 100 },
    recruiter:      { id: 'recruiter',      icon: '📜', name: 'Recruiter',        effect: '+1 Sigil per territory captured',                      category: 'Economy',  cost: 100 },
    warlord_sigil:  { id: 'warlord_sigil',  icon: '🏺', name: "Warlord's Sigil",  effect: '+1 Sigil per wave cleared (Tower/Storm)',              category: 'Economy',  cost: 100 },
    tank_tactics:   { id: 'tank_tactics',   icon: '🪖', name: 'Tank Tactics',     effect: 'Your army does 15% more effective damage each battle', category: 'Offense',  cost: 100 },
    iron_will:      { id: 'iron_will',      icon: '🛡️', name: 'Iron Will',         effect: '+10% defense in Risk battles',                          category: 'Defense',  cost: 100 },
    treasure_sense: { id: 'treasure_sense', icon: '🗺️', name: 'Treasure Sense',    effect: '+20% gold from treasure nodes',                         category: 'Economy',  cost: 100 },
    arcane_edge:    { id: 'arcane_edge',    icon: '🔮', name: 'Arcane Edge',        effect: '+15% magic damage in Risk battles',                     category: 'Offense',  cost: 100 },
};

export interface RegionDef {
    id: RegionId;
    name: string;
    bonusDescription: string;
}

export interface TerritoryNode {
    id: string;
    name: string;
    defenseValue: number;
    soldierCount: number;
    nodeType: NodeType;
    neighbors: string[];
    owner: 'player' | 'enemy';
    trait?: TerritoryTrait;
    region: RegionId;
    mapX?: number;
    mapY?: number;
}

export interface RiskBattleResult {
    success: boolean;
    playerRolls: number[];
    enemyRolls: number[];
    playerWins: number;
    enemyWins: number;
    triggeredEffects: string[];
    fortifiedEnemyNodes: string[];
    reward?: 'sigil' | 'card';
    extraSigils?: number;
}

export interface RiskState {
    mapNodes: Record<string, TerritoryNode>;
    playerSoldiers: number;
    ownedCards: RiskCardId[];
    equippedCards: RiskCardId[];
    ascensionLevel: number;

    initializeMap: () => void;
    resetAndAscendMap: () => void;
    resolveRiskBattle: (nodeId: string, committedSoldiers: number) => RiskBattleResult | null;
    buySoldier: () => boolean;
    buyCard: (id: RiskCardId) => boolean;
    gainCard: (id: RiskCardId) => void;
    equipCard: (id: RiskCardId) => void;
    unequipCard: (id: RiskCardId) => void;
    getSoldierLabel: (count: number) => string;
    getActiveRegionBonuses: () => RegionId[];
    getMaxRevealedTiles: () => number;
}

export const REGIONS: Record<RegionId, RegionDef> = {
    ashlands:       { id: 'ashlands',       name: 'Ashlands',      bonusDescription: '+10% Gold' },
    iron_highlands: { id: 'iron_highlands',  name: 'Iron Highlands', bonusDescription: '+10% DEF' },
    verdant_plains: { id: 'verdant_plains',  name: 'Verdant Plains', bonusDescription: '+5% ATK' },
    crystal_coast:  { id: 'crystal_coast',   name: 'Crystal Coast',  bonusDescription: '+1 Sigil Per Win' },
    frozen_north:   { id: 'frozen_north',    name: 'Frozen North',   bonusDescription: '+10% XP' },
    sunken_expanse: { id: 'sunken_expanse',  name: 'Sunken Expanse', bonusDescription: '+5 Max HP' },
};

function defToSoldiers(defVal: number): number {
    return Math.max(1, Math.ceil(defVal / 10));
}

const NODE_DEFS: Omit<TerritoryNode, 'owner' | 'neighbors' | 'soldierCount'>[] = [
    // Verdant Plains — starting area
    { id: 'vp1',     name: 'Start Hold',       defenseValue: 0,   nodeType: 'combat',  trait: 'none',      region: 'verdant_plains', mapX: 45, mapY: 80 },
    { id: 'vp2',     name: 'Greenveil',         defenseValue: 8,   nodeType: 'combat',  trait: 'resource',  region: 'verdant_plains', mapX: 60, mapY: 74 },
    { id: 'vp3',     name: 'Windswept Fields',  defenseValue: 12,  nodeType: 'combat',  trait: 'none',      region: 'verdant_plains', mapX: 30, mapY: 72 },

    // Ashlands — mid-left
    { id: 'al1',     name: 'Valley of Ash',     defenseValue: 15,  nodeType: 'combat',  trait: 'none',      region: 'ashlands',       mapX: 22, mapY: 58 },
    { id: 'al2',     name: 'Cinder Ruins',      defenseValue: 20,  nodeType: 'elite',   trait: 'mystic',    region: 'ashlands',       mapX: 12, mapY: 47 },
    { id: 'al3',     name: 'Black Dunes',        defenseValue: 25,  nodeType: 'elite',   trait: 'fortified', region: 'ashlands',       mapX: 28, mapY: 37 },

    // Iron Highlands — center
    { id: 'ih1',     name: 'Iron Ridge',         defenseValue: 18,  nodeType: 'combat',  trait: 'fortified', region: 'iron_highlands', mapX: 50, mapY: 58 },
    { id: 'ih2',     name: 'Rust Canyon',        defenseValue: 28,  nodeType: 'elite',   trait: 'resource',  region: 'iron_highlands', mapX: 65, mapY: 48 },
    { id: 'ih3',     name: 'Granite Peaks',      defenseValue: 35,  nodeType: 'elite',   trait: 'none',      region: 'iron_highlands', mapX: 48, mapY: 40 },
    { id: 'ih_boss', name: 'Iron Citadel',       defenseValue: 50,  nodeType: 'boss',    trait: 'fortified', region: 'iron_highlands', mapX: 55, mapY: 32 },

    // Crystal Coast — right
    { id: 'cc1',     name: 'Storm Coast',        defenseValue: 22,  nodeType: 'combat',  trait: 'none',      region: 'crystal_coast',  mapX: 78, mapY: 68 },
    { id: 'cc2',     name: 'Lighthouse Watch',   defenseValue: 30,  nodeType: 'elite',   trait: 'mystic',    region: 'crystal_coast',  mapX: 88, mapY: 55 },
    { id: 'cc3',     name: 'Siren Break',        defenseValue: 38,  nodeType: 'elite',   trait: 'fortified', region: 'crystal_coast',  mapX: 82, mapY: 38 },

    // Frozen North — upper
    { id: 'fn1',     name: 'Frostmarch',         defenseValue: 35,  nodeType: 'elite',   trait: 'none',      region: 'frozen_north',   mapX: 38, mapY: 22 },
    { id: 'fn2',     name: 'Glacier Peak',       defenseValue: 42,  nodeType: 'elite',   trait: 'mystic',    region: 'frozen_north',   mapX: 55, mapY: 15 },
    { id: 'fn3',     name: 'Howling Pass',       defenseValue: 45,  nodeType: 'elite',   trait: 'fortified', region: 'frozen_north',   mapX: 22, mapY: 17 },
    { id: 'fn_boss', name: 'Frost Throne',       defenseValue: 80,  nodeType: 'boss',    trait: 'fortified', region: 'frozen_north',   mapX: 40, mapY: 8  },

    // Sunken Expanse — top-right, hardest
    { id: 'se1',     name: 'Sunken Delta',       defenseValue: 48,  nodeType: 'elite',   trait: 'resource',  region: 'sunken_expanse', mapX: 72, mapY: 22 },
    { id: 'se2',     name: 'Abyssal Trench',     defenseValue: 55,  nodeType: 'elite',   trait: 'fortified', region: 'sunken_expanse', mapX: 88, mapY: 18 },
    { id: 'se_boss', name: 'Void Sovereign',     defenseValue: 100, nodeType: 'boss',    trait: 'mystic',    region: 'sunken_expanse', mapX: 80, mapY: 8  },
];

const ADJACENCY_MAP: Record<string, string[]> = {
    vp1:     ['vp2', 'vp3', 'ih1'],
    vp2:     ['vp1', 'ih1', 'cc1'],
    vp3:     ['vp1', 'al1', 'ih1'],
    al1:     ['vp3', 'al2', 'al3', 'ih1'],
    al2:     ['al1', 'al3'],
    al3:     ['al1', 'al2', 'ih3', 'fn3'],
    ih1:     ['vp1', 'vp2', 'vp3', 'al1', 'ih2', 'ih3'],
    ih2:     ['ih1', 'ih3', 'cc1', 'cc2'],
    ih3:     ['ih1', 'ih2', 'al3', 'fn1', 'ih_boss'],
    ih_boss: ['ih3', 'fn1'],
    cc1:     ['vp2', 'ih2', 'cc2'],
    cc2:     ['cc1', 'ih2', 'cc3'],
    cc3:     ['cc2', 'se1', 'se2'],
    fn1:     ['ih3', 'fn2', 'fn3', 'se1', 'fn_boss'],
    fn2:     ['fn1', 'fn3', 'se1', 'fn_boss'],
    fn3:     ['al3', 'fn1', 'fn2'],
    fn_boss: ['fn1', 'fn2'],
    se1:     ['fn1', 'fn2', 'cc3', 'se2', 'se_boss'],
    se2:     ['se1', 'cc3', 'se_boss'],
    se_boss: ['se1', 'se2'],
};

function generateMap(ascensionLevel: number): Record<string, TerritoryNode> {
    const mapNodes: Record<string, TerritoryNode> = {};
    NODE_DEFS.forEach(def => {
        let soldiers = defToSoldiers(def.defenseValue);
        if (def.id !== 'vp1') {
            soldiers = Math.max(1, Math.floor(soldiers * (1 + ascensionLevel * 0.5)));
        }
        mapNodes[def.id] = {
            ...def,
            soldierCount: soldiers,
            owner: def.id === 'vp1' ? 'player' : 'enemy',
            neighbors: ADJACENCY_MAP[def.id] || [],
        };
    });
    return mapNodes;
}

export const useRiskStore = create<RiskState>()(
    persist(
        (set, get) => ({
            mapNodes: {},
            playerSoldiers: 1,
            ownedCards: [],
            equippedCards: [],
            ascensionLevel: 0,

            initializeMap: () => {
                const { mapNodes, ascensionLevel } = get();
                if (Object.keys(mapNodes).length === 0 || mapNodes['t1'] || !Object.values(mapNodes)[0]?.nodeType) {
                    set({ mapNodes: generateMap(ascensionLevel || 0) });
                }
            },

            resetAndAscendMap: () => {
                const { ascensionLevel } = get();
                const newLevel = ascensionLevel + 1;
                set({ mapNodes: generateMap(newLevel), ascensionLevel: newLevel });
            },

            getSoldierLabel: (count: number) => {
                if (count <= 0)  return 'Empty';
                if (count === 1) return 'Skirmish';
                if (count === 2) return 'Patrol';
                if (count === 3) return 'Guard Squad';
                if (count === 4) return 'Garrison';
                if (count < 10) return 'Captain';
                if (count < 15) return 'Boss';
                if (count < 20) return 'Warlord';
                return 'Legendary';
            },

            buySoldier: () => {
                const cs = (require('./useConquestStore') as any).useConquestStore.getState();
                if (cs.sigils < 10) return false;
                cs.addSigils(-10);
                set(s => ({ playerSoldiers: s.playerSoldiers + 1 }));
                return true;
            },

            buyCard: (id: RiskCardId) => {
                const state = get();
                if (state.ownedCards.includes(id)) return false;
                const cs = (require('./useConquestStore') as any).useConquestStore.getState();
                const cost = RISK_CARDS[id].cost;
                if (cs.sigils < cost) return false;
                cs.addSigils(-cost);
                set(s => ({ ownedCards: [...s.ownedCards, id] }));
                return true;
            },

            gainCard: (id: RiskCardId) => {
                set(state => (state.ownedCards.includes(id) ? state : { ownedCards: [...state.ownedCards, id] }));
            },

            equipCard: (id: RiskCardId) => {
                set(state => {
                    if (state.equippedCards.length >= 3) return state;
                    if (state.equippedCards.includes(id)) return state;
                    if (!state.ownedCards.includes(id)) return state;
                    return { equippedCards: [...state.equippedCards, id] };
                });
            },

            unequipCard: (id: RiskCardId) => {
                set(state => ({ equippedCards: state.equippedCards.filter(c => c !== id) }));
            },

            resolveRiskBattle: (nodeId: string, committedSoldiers: number) => {
                const state = get();
                const node = state.mapNodes[nodeId];
                if (!node || node.owner === 'player' || node.nodeType === 'shop') return null;

                const equipped = state.equippedCards;
                let playerDice = Math.min(state.playerSoldiers, committedSoldiers);
                const enemyDice = Math.max(1, node.soldierCount);
                const triggeredEffects: string[] = [];

                // War Banner: +1 die vs Captain (5+) or Boss nodes
                if (equipped.includes('war_banner') && (node.soldierCount >= 5 || node.nodeType === 'boss')) {
                    playerDice += 1;
                    triggeredEffects.push('War Banner: +1 die vs elite');
                }

                let playerRolls = Array.from({ length: Math.max(1, playerDice) }, () => Math.floor(Math.random() * 6) + 1);
                const enemyRolls = Array.from({ length: enemyDice }, () => Math.floor(Math.random() * 6) + 1);

                // Blitz: first player die gets +1
                if (equipped.includes('blitz') && playerRolls.length > 0) {
                    playerRolls[0] = Math.min(6, playerRolls[0] + 1);
                    triggeredEffects.push('Blitz: first die +1');
                }

                const playerSorted = [...playerRolls].sort((a, b) => b - a);
                const enemySorted  = [...enemyRolls].sort((a, b) => b - a);
                const comparisons  = Math.min(playerSorted.length, enemySorted.length);

                let playerWins = 0, enemyWins = 0;
                for (let i = 0; i < comparisons; i++) {
                    if (playerSorted[i] > enemySorted[i]) {
                        playerWins++;
                    } else if (enemySorted[i] > playerSorted[i]) {
                        enemyWins++;
                    } else {
                        if (equipped.includes('iron_discipline')) {
                            playerWins++;
                            triggeredEffects.push('Iron Discipline: tie → player wins');
                        } else {
                            enemyWins++;
                        }
                    }
                }
                playerWins += Math.max(0, playerSorted.length - comparisons);

                if (equipped.includes('tank_tactics') && playerWins >= enemyWins) {
                    playerWins += 1;
                    triggeredEffects.push('Tank Tactics: +1 effective win');
                }

                const success = playerWins > enemyWins;
                let extraSigils = 0;

                if (success) {
                    if (equipped.includes('medic')) {
                        set(s => ({ playerSoldiers: s.playerSoldiers + 1 }));
                        triggeredEffects.push('Medic Corps: +1 soldier');
                    }
                    if (equipped.includes('recruiter')) {
                        extraSigils += 1;
                        triggeredEffects.push('Recruiter: +1 Sigil');
                    }

                    set(s => ({ mapNodes: { ...s.mapNodes, [nodeId]: { ...s.mapNodes[nodeId], owner: 'player' } } }));

                    if (extraSigils > 0) {
                        import('./useConquestStore').then(({ useConquestStore: cs }) => cs.getState().addSigils(extraSigils));
                    }
                } else {
                    // Defeat: lose committed soldiers
                    set(s => ({
                        playerSoldiers: Math.max(0, s.playerSoldiers - committedSoldiers),
                        mapNodes: {
                            ...s.mapNodes,
                            [nodeId]: { ...s.mapNodes[nodeId], soldierCount: Math.max(1, s.mapNodes[nodeId].soldierCount - 1) }
                        }
                    }));
                }

                // Enemy AI: 10% chance adjacent enemy nodes reinforce
                const fortifiedEnemyNodes: string[] = [];
                set(s => {
                    const next = { ...s.mapNodes };
                    node.neighbors.forEach(nId => {
                        if (next[nId]?.owner === 'enemy' && Math.random() < 0.1) {
                            next[nId] = { ...next[nId], soldierCount: next[nId].soldierCount + 1 };
                            fortifiedEnemyNodes.push(nId);
                        }
                    });
                    return { mapNodes: next };
                });

                const reward: RiskBattleResult['reward'] = success
                    ? (node.trait === 'resource' ? 'sigil' : node.trait === 'mystic' && Math.random() > 0.5 ? 'card' : undefined)
                    : undefined;

                return { success, playerRolls, enemyRolls, playerWins, enemyWins, triggeredEffects, fortifiedEnemyNodes, reward, extraSigils };
            },

            getActiveRegionBonuses: () => {
                const { mapNodes } = get();
                const groups: Record<RegionId, string[]> = {
                    ashlands: [], iron_highlands: [], verdant_plains: [], crystal_coast: [], frozen_north: [], sunken_expanse: []
                };
                Object.values(mapNodes).forEach(n => groups[n.region].push(n.owner));
                return (Object.keys(groups) as RegionId[]).filter(rId => {
                    const owners = groups[rId];
                    return owners.length > 0 && owners.every(o => o === 'player');
                });
            },

            getMaxRevealedTiles: () => {
                const { mapNodes } = get();
                const allNodes = Object.values(mapNodes);
                const ownedCount = allNodes.filter(n => n.owner === 'player').length;
                return Math.min(allNodes.length, 3 + ownedCount * 2);
            },
        }),
        {
            name: PERSIST_REGISTRY.risk.persistKey,
            partialize: (state) => ({
                mapNodes: state.mapNodes,
                playerSoldiers: state.playerSoldiers,
                ownedCards: state.ownedCards,
                equippedCards: state.equippedCards,
                ascensionLevel: state.ascensionLevel || 0,
            }),
        }
    )
);
