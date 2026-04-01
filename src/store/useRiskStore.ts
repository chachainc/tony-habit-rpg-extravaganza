import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useConquestStore } from './useConquestStore';
import { useCurrencyStore } from './useCurrencyStore';
import { RISK_CAMPAIGNS, ALL_REGIONS, CAMPAIGN_ORDER, type RegionId, type RiskCampaignDef } from '../data/riskMaps';

export type TerritoryTrait = 'fortified' | 'resource' | 'mystic' | 'none';
export type NodeType = 'combat' | 'elite' | 'boss' | 'shop' | 'treasure' | 'event';
export type { RegionId } from '../data/riskMaps';

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
    currency: 'sigils' | 'gold' | 'shmeckles';
}

export const RISK_CARDS: Record<RiskCardId, RiskCardDef> = {
    blitz:          { id: 'blitz',          icon: '⚡', name: 'Blitz',            effect: 'First die roll gets +1',                               category: 'Offense',  cost: 75,   currency: 'gold'   },
    iron_discipline:{ id: 'iron_discipline', icon: '🛡️', name: 'Iron Discipline',  effect: 'Tied dice comparisons count as player wins',           category: 'Defense',  cost: 2000, currency: 'gold'   },
    medic:          { id: 'medic',          icon: '💊', name: 'Medic Corps',      effect: 'Recover 1 soldier after any victory',                  category: 'Survival', cost: 100,  currency: 'sigils' },
    war_banner:     { id: 'war_banner',     icon: '🚩', name: 'War Banner',       effect: '+1 die when attacking a Captain or Boss node',         category: 'Offense',  cost: 250,  currency: 'gold'   },
    treasurer:      { id: 'treasurer',      icon: '💰', name: 'Treasurer',        effect: '+1 Shmeckle per game mode victory',                    category: 'Economy',  cost: 500,  currency: 'shmeckles' },
    recruiter:      { id: 'recruiter',      icon: '📜', name: 'Recruiter',        effect: '+1 Sigil per territory captured',                      category: 'Economy',  cost: 500,  currency: 'shmeckles' },
    warlord_sigil:  { id: 'warlord_sigil',  icon: '🏺', name: "Warlord's Sigil",  effect: '+1 Sigil per wave cleared (Tower/Storm)',              category: 'Economy',  cost: 500,  currency: 'shmeckles' },
    tank_tactics:   { id: 'tank_tactics',   icon: '🪖', name: 'Tank Tactics',     effect: 'Your army does 15% more effective damage each battle', category: 'Offense',  cost: 100,  currency: 'sigils' },
    iron_will:      { id: 'iron_will',      icon: '🛡️', name: 'Iron Will',         effect: '+10% defense in Risk battles',                         category: 'Defense',  cost: 100,  currency: 'sigils' },
    treasure_sense: { id: 'treasure_sense', icon: '🗺️', name: 'Treasure Sense',    effect: '+20% gold from treasure nodes',                        category: 'Economy',  cost: 20,   currency: 'sigils' },
    arcane_edge:    { id: 'arcane_edge',    icon: '🔮', name: 'Arcane Edge',        effect: '+15% magic damage in Risk battles',                    category: 'Offense',  cost: 100,  currency: 'sigils' },
};

export interface RegionDef {
    id: RegionId;
    name: string;
    bonusDescription: string;
}

/** Legacy REGIONS constant that maps region IDs for Map 1 — kept for backward compat */
export const REGIONS: Record<string, RegionDef> = Object.fromEntries(
    Object.entries(ALL_REGIONS).map(([k, v]) => [k, { id: v.id, name: v.name, bonusDescription: v.bonusDescription }])
) as Record<string, RegionDef>;

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
    // Multi-map state
    mapStates: Record<string, Record<string, TerritoryNode>>;
    activeMapId: string;
    ascensionLevels: Record<string, number>;

    // Global (shared across maps)
    playerSoldiers: number;
    ownedCards: RiskCardId[];
    equippedCards: RiskCardId[];

    // Legacy compat — kept for migration only
    mapNodes?: Record<string, TerritoryNode>;
    ascensionLevel?: number;

    // Computed convenience getter
    readonly currentMapNodes: Record<string, TerritoryNode>;

    initializeMap: () => void;
    switchMap: (mapId: string) => void;
    resetAndAscendMap: () => void;
    resolveRiskBattle: (sourceNodeId: string, targetNodeId: string, attackingSoldiers: number) => RiskBattleResult | null;
    deploySoldiers: (nodeId: string, count: number) => boolean;
    buySoldier: () => boolean;
    buyCard: (id: RiskCardId) => boolean;
    gainCard: (id: RiskCardId) => void;
    equipCard: (id: RiskCardId) => void;
    unequipCard: (id: RiskCardId) => void;
    getSoldierLabel: (count: number) => string;
    getActiveRegionBonuses: () => RegionId[];
    getMaxRevealedTiles: () => number;
    isMapFullyConquered: (mapId: string) => boolean;
}

function defToSoldiers(defVal: number): number {
    return Math.max(1, Math.ceil(defVal / 10));
}

function generateMapFromCampaign(campaign: RiskCampaignDef, ascensionLevel: number): Record<string, TerritoryNode> {
    const mapNodes: Record<string, TerritoryNode> = {};
    campaign.nodes.forEach(def => {
        let soldiers = defToSoldiers(def.defenseValue);
        if (def.id !== campaign.startNodeId) {
            soldiers = Math.max(1, Math.floor(soldiers * (1 + ascensionLevel * 0.5)));
        }
        mapNodes[def.id] = {
            ...def,
            soldierCount: soldiers,
            owner: def.id === campaign.startNodeId ? 'player' : 'enemy',
            neighbors: campaign.adjacency[def.id] || [],
        };
    });
    return mapNodes;
}

export const useRiskStore = create<RiskState>()(
    persist(
        (set, get) => ({
            mapStates: {},
            activeMapId: 'map1',
            ascensionLevels: {},
            playerSoldiers: 1,
            ownedCards: [],
            equippedCards: [],

            get currentMapNodes(): Record<string, TerritoryNode> {
                const state = get();
                return state.mapStates[state.activeMapId] || {};
            },

            initializeMap: () => {
                const state = get();
                let { mapStates, ascensionLevels } = state;
                let needsUpdate = false;

                // Migration: move legacy mapNodes into mapStates['map1']
                if (state.mapNodes && Object.keys(state.mapNodes).length > 0 && (!mapStates['map1'] || Object.keys(mapStates['map1']).length === 0)) {
                    mapStates = { ...mapStates, map1: state.mapNodes };
                    ascensionLevels = { ...ascensionLevels, map1: state.ascensionLevel || 0 };
                    needsUpdate = true;
                }

                // Initialize each campaign map if missing or stale
                for (const campId of CAMPAIGN_ORDER) {
                    const campaign = RISK_CAMPAIGNS[campId];
                    if (!campaign) continue;
                    const existing = mapStates[campId];
                    const nodeCount = existing ? Object.keys(existing).length : 0;
                    const expectedCount = campaign.nodes.length;

                    // Re-init if: empty, legacy format, missing type, or stale node count
                    if (nodeCount === 0 || (existing && existing['t1']) || (existing && !Object.values(existing)[0]?.nodeType) || nodeCount < expectedCount) {
                        const asc = ascensionLevels[campId] || 0;
                        mapStates = { ...mapStates, [campId]: generateMapFromCampaign(campaign, asc) };
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    set({
                        mapStates,
                        ascensionLevels,
                        // Clear legacy fields after migration
                        mapNodes: undefined,
                        ascensionLevel: undefined,
                    });
                }
            },

            switchMap: (mapId: string) => {
                if (RISK_CAMPAIGNS[mapId]) {
                    set({ activeMapId: mapId });
                }
            },

            resetAndAscendMap: () => {
                const { activeMapId, ascensionLevels, mapStates } = get();
                const campaign = RISK_CAMPAIGNS[activeMapId];
                if (!campaign) return;
                const newLevel = (ascensionLevels[activeMapId] || 0) + 1;
                set({
                    mapStates: { ...mapStates, [activeMapId]: generateMapFromCampaign(campaign, newLevel) },
                    ascensionLevels: { ...ascensionLevels, [activeMapId]: newLevel },
                });
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
                const cs = useConquestStore.getState();
                if (cs.sigils < 10) return false;
                cs.addSigils(-10);
                set(s => ({ playerSoldiers: s.playerSoldiers + 1 }));
                return true;
            },

            deploySoldiers: (nodeId: string, count: number) => {
                const state = get();
                const mapId = state.activeMapId;
                const nodes = state.mapStates[mapId];
                if (!nodes) return false;
                const node = nodes[nodeId];
                if (!node || node.owner !== 'player') return false;
                const deployable = Math.min(count, state.playerSoldiers);
                if (deployable <= 0) return false;
                set(s => ({
                    playerSoldiers: s.playerSoldiers - deployable,
                    mapStates: {
                        ...s.mapStates,
                        [mapId]: {
                            ...s.mapStates[mapId],
                            [nodeId]: { ...s.mapStates[mapId][nodeId], soldierCount: s.mapStates[mapId][nodeId].soldierCount + deployable }
                        }
                    }
                }));
                return true;
            },

            buyCard: (id: RiskCardId) => {
                const state = get();
                if (state.ownedCards.includes(id)) return false;
                const cardDef = RISK_CARDS[id];
                const cost = cardDef.cost;
                const currency = cardDef.currency;

                if (currency === 'sigils') {
                    const cs = useConquestStore.getState();
                    if (cs.sigils < cost) return false;
                    cs.addSigils(-cost);
                } else if (currency === 'gold') {
                    const curr = useCurrencyStore.getState();
                    if (!curr.spendGold(cost)) return false;
                } else if (currency === 'shmeckles') {
                    const curr = useCurrencyStore.getState();
                    if (!curr.spendShmeckles(cost)) return false;
                } else {
                    return false;
                }

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

            resolveRiskBattle: (sourceNodeId: string, targetNodeId: string, attackingSoldiers: number) => {
                const state = get();
                const mapId = state.activeMapId;
                const nodes = state.mapStates[mapId];
                if (!nodes) return null;

                const sourceNode = nodes[sourceNodeId];
                const targetNode = nodes[targetNodeId];
                if (!sourceNode || sourceNode.owner !== 'player') return null;
                if (!targetNode || targetNode.owner === 'player' || targetNode.nodeType === 'shop') return null;
                if (!sourceNode.neighbors.includes(targetNodeId)) return null;

                // Clamp: must leave at least 1 behind, can't send more than available
                const maxSendable = sourceNode.soldierCount - 1;
                const actualAttacking = Math.min(attackingSoldiers, maxSendable);
                if (actualAttacking <= 0) return null;

                // Deduct soldiers from source BEFORE battle
                set(s => ({
                    mapStates: {
                        ...s.mapStates,
                        [mapId]: {
                            ...s.mapStates[mapId],
                            [sourceNodeId]: { ...s.mapStates[mapId][sourceNodeId], soldierCount: s.mapStates[mapId][sourceNodeId].soldierCount - actualAttacking }
                        }
                    }
                }));

                const equipped = state.equippedCards;
                let playerDice = actualAttacking;
                const enemyDice = Math.max(1, targetNode.soldierCount);
                const triggeredEffects: string[] = [];

                // War Banner: +1 die vs Captain (5+) or Boss nodes
                if (equipped.includes('war_banner') && (targetNode.soldierCount >= 5 || targetNode.nodeType === 'boss')) {
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
                    // Medic Corps: recover 1 soldier back to source node on victory
                    if (equipped.includes('medic')) {
                        set(s => ({
                            mapStates: {
                                ...s.mapStates,
                                [mapId]: {
                                    ...s.mapStates[mapId],
                                    [sourceNodeId]: { ...s.mapStates[mapId][sourceNodeId], soldierCount: s.mapStates[mapId][sourceNodeId].soldierCount + 1 }
                                }
                            }
                        }));
                        triggeredEffects.push('Medic Corps: +1 soldier recovered to source');
                    }
                    if (equipped.includes('recruiter')) {
                        extraSigils += 1;
                        triggeredEffects.push('Recruiter: +1 Sigil');
                    }

                    // Capture target: set owner to player, soldiers = attacking force
                    set(s => ({
                        mapStates: {
                            ...s.mapStates,
                            [mapId]: {
                                ...s.mapStates[mapId],
                                [targetNodeId]: { ...s.mapStates[mapId][targetNodeId], owner: 'player', soldierCount: actualAttacking }
                            }
                        }
                    }));

                    if (extraSigils > 0) {
                        import('./useConquestStore').then(({ useConquestStore: cs }) => cs.getState().addSigils(extraSigils));
                    }
                } else {
                    // Defeat: attacking soldiers are lost (already deducted from source).
                    // Enemy node takes 1 attrition.
                    set(s => ({
                        mapStates: {
                            ...s.mapStates,
                            [mapId]: {
                                ...s.mapStates[mapId],
                                [targetNodeId]: { ...s.mapStates[mapId][targetNodeId], soldierCount: Math.max(1, s.mapStates[mapId][targetNodeId].soldierCount - 1) }
                            }
                        }
                    }));
                }

                // Enemy AI: 10% chance adjacent enemy nodes reinforce
                const fortifiedEnemyNodes: string[] = [];
                set(s => {
                    const currentNodes = { ...s.mapStates[mapId] };
                    targetNode.neighbors.forEach(nId => {
                        if (currentNodes[nId]?.owner === 'enemy' && Math.random() < 0.1) {
                            currentNodes[nId] = { ...currentNodes[nId], soldierCount: currentNodes[nId].soldierCount + 1 };
                            fortifiedEnemyNodes.push(nId);
                        }
                    });
                    return { mapStates: { ...s.mapStates, [mapId]: currentNodes } };
                });

                const reward: RiskBattleResult['reward'] = success
                    ? (targetNode.trait === 'resource' ? 'sigil' : targetNode.trait === 'mystic' && Math.random() > 0.5 ? 'card' : undefined)
                    : undefined;

                return { success, playerRolls, enemyRolls, playerWins, enemyWins, triggeredEffects, fortifiedEnemyNodes, reward, extraSigils };
            },

            getActiveRegionBonuses: () => {
                const { mapStates } = get();
                // Aggregate across ALL maps
                const groups: Record<string, string[]> = {};
                for (const rId of Object.keys(ALL_REGIONS)) {
                    groups[rId] = [];
                }

                for (const mapId of CAMPAIGN_ORDER) {
                    const nodes = mapStates[mapId];
                    if (!nodes) continue;
                    Object.values(nodes).forEach(n => {
                        if (groups[n.region]) {
                            groups[n.region].push(n.owner);
                        }
                    });
                }

                return (Object.keys(groups) as RegionId[]).filter(rId => {
                    const owners = groups[rId];
                    return owners.length > 0 && owners.every(o => o === 'player');
                });
            },

            getMaxRevealedTiles: () => {
                const state = get();
                const nodes = state.mapStates[state.activeMapId];
                if (!nodes) return 3;
                const allNodes = Object.values(nodes);
                const ownedCount = allNodes.filter(n => n.owner === 'player').length;
                return Math.min(allNodes.length, 3 + ownedCount * 2);
            },

            isMapFullyConquered: (mapId: string) => {
                const { mapStates } = get();
                const nodes = mapStates[mapId];
                if (!nodes || Object.keys(nodes).length === 0) return false;
                return Object.values(nodes).every(n => n.owner === 'player');
            },
        }),
        {
            name: PERSIST_REGISTRY.risk.persistKey,
            partialize: (state) => ({
                mapStates: state.mapStates,
                activeMapId: state.activeMapId,
                ascensionLevels: state.ascensionLevels,
                playerSoldiers: state.playerSoldiers,
                ownedCards: state.ownedCards,
                equippedCards: state.equippedCards,
                // Keep legacy fields for migration on next load
                mapNodes: state.mapNodes,
                ascensionLevel: state.ascensionLevel,
            }),
        }
    )
);
