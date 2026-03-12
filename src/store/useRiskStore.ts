import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStrategyStore } from './useStrategyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type TerritoryTrait = 'fortified' | 'resource' | 'mystic' | 'none';
export type SoldierCard = 'knight' | 'shieldbearer' | 'scout' | 'general';
export type RegionId = 'ashlands' | 'iron_highlands' | 'verdant_plains' | 'crystal_coast' | 'frozen_north' | 'sunken_expanse';

export interface RegionDef {
    id: RegionId;
    name: string;
    bonusDescription: string;
}

export interface TerritoryNode {
    id: string;
    name: string;
    defenseValue: number;
    neighbors: string[];
    owner: 'player' | 'enemy';
    trait?: TerritoryTrait;
    region: RegionId;
    mapX?: number; // Visual X coordinate (0-100%)
    mapY?: number; // Visual Y coordinate (0-100%)
}

export interface BattleResult {
    success: boolean;
    partial: boolean;
    rolls: number[];
    crits: number;
    totalDamage: number;
    targetDefense: number;
    cardEffectsTriggered: string[];
    fortifiedEnemyNodes: string[];
    reward?: 'sigil' | 'card';
}

export interface RiskState {
    mapNodes: Record<string, TerritoryNode>;
    playerArmySize: number;
    inventoryCards: SoldierCard[];
    equippedCards: SoldierCard[];
    ascensionLevel: number;

    initializeMap: () => void;
    resetAndAscendMap: () => void;
    resolveBattle: (id: string, heroAtkBonus?: number) => BattleResult | null;
    equipCard: (card: SoldierCard) => void;
    unequipCard: (card: SoldierCard) => void;
    gainCard: (card: SoldierCard) => void;

    getUnlockedArmySize: () => number;
    getSoldierDiceSides: () => number;
    getActiveRegionBonuses: () => RegionId[];
}

export const REGIONS: Record<RegionId, RegionDef> = {
    'ashlands': { id: 'ashlands', name: 'Ashlands', bonusDescription: '+10% Gold' },
    'iron_highlands': { id: 'iron_highlands', name: 'Iron Highlands', bonusDescription: '+10% DEF' },
    'verdant_plains': { id: 'verdant_plains', name: 'Verdant Plains', bonusDescription: '+5% ATK' },
    'crystal_coast': { id: 'crystal_coast', name: 'Crystal Coast', bonusDescription: '+1 Sigil Per Win' },
    'frozen_north': { id: 'frozen_north', name: 'Frozen North', bonusDescription: '+10% XP' },
    'sunken_expanse': { id: 'sunken_expanse', name: 'Sunken Expanse', bonusDescription: '+5 Max HP' }
};

// Base definitions for map generation
const NODE_DEFS: Omit<TerritoryNode, 'owner' | 'neighbors'>[] = [
    // Verdant Plains (Starting area)
    { id: 'vp1', name: 'Start Hold', defenseValue: 0, trait: 'none', region: 'verdant_plains', mapX: 45, mapY: 80 },
    { id: 'vp2', name: 'Greenveil', defenseValue: 5, trait: 'resource', region: 'verdant_plains', mapX: 55, mapY: 75 },
    { id: 'vp3', name: 'Windswept Fields', defenseValue: 8, trait: 'none', region: 'verdant_plains', mapX: 35, mapY: 70 },
    
    // Ashlands
    { id: 'al1', name: 'Valley of Ash', defenseValue: 12, trait: 'none', region: 'ashlands', mapX: 25, mapY: 55 },
    { id: 'al2', name: 'Cinder Ruins', defenseValue: 15, trait: 'mystic', region: 'ashlands', mapX: 15, mapY: 45 },
    { id: 'al3', name: 'Black Dunes', defenseValue: 18, trait: 'fortified', region: 'ashlands', mapX: 30, mapY: 35 },

    // Iron Highlands
    { id: 'ih1', name: 'Iron Ridge', defenseValue: 16, trait: 'fortified', region: 'iron_highlands', mapX: 50, mapY: 60 },
    { id: 'ih2', name: 'Rust Canyon', defenseValue: 20, trait: 'resource', region: 'iron_highlands', mapX: 65, mapY: 50 },
    { id: 'ih3', name: 'Granite Peaks', defenseValue: 24, trait: 'none', region: 'iron_highlands', mapX: 45, mapY: 40 },

    // Crystal Coast
    { id: 'cc1', name: 'Storm Coast', defenseValue: 22, trait: 'none', region: 'crystal_coast', mapX: 75, mapY: 70 },
    { id: 'cc2', name: 'Lighthouse Watch', defenseValue: 25, trait: 'mystic', region: 'crystal_coast', mapX: 85, mapY: 55 },
    { id: 'cc3', name: 'Siren Break', defenseValue: 28, trait: 'fortified', region: 'crystal_coast', mapX: 80, mapY: 35 },

    // Frozen North
    { id: 'fn1', name: 'Frostmarch', defenseValue: 30, trait: 'none', region: 'frozen_north', mapX: 40, mapY: 20 },
    { id: 'fn2', name: 'Glacier Peak', defenseValue: 35, trait: 'mystic', region: 'frozen_north', mapX: 55, mapY: 15 },
    { id: 'fn3', name: 'Howling Pass', defenseValue: 38, trait: 'fortified', region: 'frozen_north', mapX: 25, mapY: 15 },

    // Sunken Expanse
    { id: 'se1', name: 'Sunken Delta', defenseValue: 40, trait: 'resource', region: 'sunken_expanse', mapX: 70, mapY: 20 },
    { id: 'se2', name: 'Abyssal Trench', defenseValue: 45, trait: 'fortified', region: 'sunken_expanse', mapX: 85, mapY: 15 },
];

// Fixed visual pathing configuration
const ADJACENCY_MAP: Record<string, string[]> = {
    'vp1': ['vp2', 'vp3', 'ih1'],
    'vp2': ['vp1', 'ih1', 'cc1'],
    'vp3': ['vp1', 'al1', 'ih1'],
    'al1': ['vp3', 'al2', 'al3', 'ih1'],
    'al2': ['al1', 'al3'],
    'al3': ['al1', 'al2', 'ih3', 'fn3'],
    'ih1': ['vp1', 'vp2', 'vp3', 'al1', 'ih2', 'ih3'],
    'ih2': ['ih1', 'ih3', 'cc1', 'cc2'],
    'ih3': ['ih1', 'ih2', 'al3', 'fn1'],
    'cc1': ['vp2', 'ih2', 'cc2'],
    'cc2': ['cc1', 'ih2', 'cc3'],
    'cc3': ['cc2', 'se1', 'se2'],
    'fn1': ['ih3', 'fn2', 'fn3', 'se1'],
    'fn2': ['fn1', 'fn3', 'se1'],
    'fn3': ['al3', 'fn1', 'fn2'],
    'se1': ['fn1', 'fn2', 'cc3', 'se2'],
    'se2': ['se1', 'cc3']
};

function generateScadrosharialMap(ascensionLevel: number): Record<string, TerritoryNode> {
    const mapNodes: Record<string, TerritoryNode> = {};
    
    NODE_DEFS.forEach(def => {
        let defVal = def.defenseValue;
        if (def.id !== 'vp1') { // Start hold scales up initially, but stays 0 at asc 0
             defVal = Math.floor(defVal * (1 + (ascensionLevel * 0.5)));
        }
        
        mapNodes[def.id] = {
            ...def,
            defenseValue: defVal,
            owner: def.id === 'vp1' ? 'player' : 'enemy', // Player always starts at vp1
            neighbors: ADJACENCY_MAP[def.id] || []
        };
    });

    return mapNodes;
}

export const useRiskStore = create<RiskState>()(
    persist(
        (set, get) => ({
            mapNodes: {},
            playerArmySize: 0,
            inventoryCards: [],
            equippedCards: [],
            ascensionLevel: 0,

            initializeMap: () => {
                const { mapNodes, ascensionLevel } = get();
                // If uninitialized, or using the old hardcoded DEFAULT_MAP IDs (like 't1', 't2')
                if (Object.keys(mapNodes).length === 0 || mapNodes['t1']) {
                    set({ mapNodes: generateScadrosharialMap(ascensionLevel || 0) });
                }
            },

            resetAndAscendMap: () => {
                const { ascensionLevel } = get();
                const newLevel = ascensionLevel + 1;
                const newMap = generateScadrosharialMap(newLevel);
                set({ mapNodes: newMap, ascensionLevel: newLevel });
            },

            equipCard: (card) => {
                set(state => {
                    if (state.equippedCards.length >= 3) return state;
                    if (state.equippedCards.includes(card)) return state;
                    const invCopy = [...state.inventoryCards];
                    const idx = invCopy.indexOf(card);
                    if (idx > -1) {
                        invCopy.splice(idx, 1);
                        return { inventoryCards: invCopy, equippedCards: [...state.equippedCards, card] };
                    }
                    return state;
                });
            },

            unequipCard: (card) => {
                set(state => {
                    const idx = state.equippedCards.indexOf(card);
                    if (idx > -1) {
                        const eqpCopy = [...state.equippedCards];
                        eqpCopy.splice(idx, 1);
                        return { equippedCards: eqpCopy, inventoryCards: [...state.inventoryCards, card] };
                    }
                    return state;
                });
            },

            gainCard: (card) => {
                set(state => ({ inventoryCards: [...state.inventoryCards, card] }));
            },

            resolveBattle: (id: string, heroAtkBonus: number = 0) => {
                const state = get();
                const node = state.mapNodes[id];
                if (!node || node.owner === 'player') return null;

                const diceSides = state.getSoldierDiceSides();
                const diceCount = state.getUnlockedArmySize();

                let rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1);
                const triggeredEffects: string[] = [];

                // Card: General (Reroll lowest if 1 or 2)
                if (state.equippedCards.includes('general')) {
                    const lowest = Math.min(...rolls);
                    if (lowest <= 2) {
                        const idx = rolls.indexOf(lowest);
                        rolls[idx] = Math.floor(Math.random() * diceSides) + 1;
                        triggeredEffects.push('General: Reroll lowest');
                    }
                }

                let crits = 0;
                rolls.forEach(r => { if (r === diceSides) crits++; });

                let baseDamage = rolls.reduce((a, b) => a + b, 0);

                // Crits add +1 damage
                baseDamage += crits;

                // Heroic Bonus (from player ATK)
                if (heroAtkBonus > 0) {
                    const roundedBonus = Math.floor(heroAtkBonus);
                    baseDamage += roundedBonus;
                    triggeredEffects.push(`Heroic Presence: +${roundedBonus} Dmg`);
                }

                // Card: Knight (+1 static damage)
                if (state.equippedCards.includes('knight')) {
                    baseDamage += 1;
                    triggeredEffects.push('Knight: +1 Damage');
                }

                let targetDefense = node.defenseValue;

                // Territory Trait: Fortified (+2 Defense)
                if (node.trait === 'fortified') {
                    targetDefense += 2;
                }

                // Card: Shieldbearer (-1 Defense)
                if (state.equippedCards.includes('shieldbearer')) {
                    targetDefense -= 1;
                    triggeredEffects.push('Shieldbearer: -1 Enemy Def');
                }

                const success = baseDamage >= targetDefense;
                const partial = !success && baseDamage > Math.floor(targetDefense / 2);
                let reward: BattleResult['reward'] = undefined;

                if (success) {
                    // Claim territory
                    if (node.trait === 'resource') reward = 'sigil';
                    if (node.trait === 'mystic' && Math.random() > 0.5) reward = 'card';

                    set((s) => ({
                        mapNodes: {
                            ...s.mapNodes,
                            [node.id]: { ...s.mapNodes[node.id], owner: 'player' }
                        }
                    }));
                } else if (partial) {
                    // Attrition damage to node defense
                    set((s) => ({
                        mapNodes: {
                            ...s.mapNodes,
                            [node.id]: { ...s.mapNodes[node.id], defenseValue: Math.max(1, s.mapNodes[node.id].defenseValue - 1) }
                        }
                    }));
                }

                // Enemy AI: 15% chance for unowned nodes to Fortify
                const fortifiedEnemyNodes: string[] = [];
                set((s) => {
                    const nextNodes = { ...s.mapNodes };
                    Object.keys(nextNodes).forEach(k => {
                        if (nextNodes[k].owner === 'enemy' && k !== node.id && Math.random() < 0.15) {
                            nextNodes[k] = { ...nextNodes[k], defenseValue: nextNodes[k].defenseValue + 1 };
                            fortifiedEnemyNodes.push(k);
                        }
                    });
                    return { mapNodes: nextNodes };
                });

                return {
                    success,
                    partial,
                    rolls,
                    crits,
                    totalDamage: baseDamage,
                    targetDefense,
                    cardEffectsTriggered: triggeredEffects,
                    fortifiedEnemyNodes,
                    reward
                };
            },

            getUnlockedArmySize: () => {
                const { strategyXp } = useStrategyStore.getState();
                if (strategyXp >= 80) return 4;
                if (strategyXp >= 30) return 3;
                if (strategyXp >= 15) return 2;
                return 1;
            },

            getSoldierDiceSides: () => {
                const { strategyXp } = useStrategyStore.getState();
                if (strategyXp >= 80) return 12;
                if (strategyXp >= 30) return 9;
                if (strategyXp >= 15) return 6;
                return 3;
            },

            getActiveRegionBonuses: () => {
                const { mapNodes } = get();
                const regions: Record<RegionId, string[]> = {
                    ashlands: [], iron_highlands: [], verdant_plains: [], crystal_coast: [], frozen_north: [], sunken_expanse: []
                };

                // Group nodes by region
                Object.values(mapNodes).forEach(n => regions[n.region].push(n.owner));

                const active: RegionId[] = [];
                (Object.keys(regions) as RegionId[]).forEach(rId => {
                    const owners = regions[rId];
                    if (owners.length > 0 && owners.every(o => o === 'player')) {
                        active.push(rId);
                    }
                });
                return active;
            }
        }),
        {
            name: PERSIST_REGISTRY.risk.persistKey,
            partialize: (state) => ({
                mapNodes: state.mapNodes,
                inventoryCards: state.inventoryCards,
                equippedCards: state.equippedCards,
                ascensionLevel: state.ascensionLevel || 0
            })
        }
    )
);
