import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStrategyStore } from './useStrategyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type TerritoryTrait = 'fortified' | 'resource' | 'mystic' | 'none';
export type SoldierCard = 'knight' | 'shieldbearer' | 'scout' | 'general';
export type RegionId = 'start' | 'ash' | 'iron' | 'frost' | 'demon';

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
    'start': { id: 'start', name: 'The Vanguard', bonusDescription: '+5% ATK' },
    'ash': { id: 'ash', name: 'Ashlands', bonusDescription: '+10% Gold' },
    'iron': { id: 'iron', name: 'Iron Ridge', bonusDescription: '+10% DEF' },
    'frost': { id: 'frost', name: 'Frost Passages', bonusDescription: '+10% XP' },
    'demon': { id: 'demon', name: 'Demon Citadel', bonusDescription: '+5 Max HP' }
};

const DEFAULT_MAP: Record<string, TerritoryNode> = {
    // Start Region
    't1': { id: 't1', name: 'Start Hold', defenseValue: 0, neighbors: ['t2', 't3'], owner: 'player', trait: 'none', region: 'start' },
    't2': { id: 't2', name: 'Outpost Alpha', defenseValue: 5, neighbors: ['t1', 't4'], owner: 'enemy', trait: 'resource', region: 'start' },
    // Ash Region
    't3': { id: 't3', name: 'Valley of Ash', defenseValue: 8, neighbors: ['t1', 't5'], owner: 'enemy', trait: 'none', region: 'ash' },
    't4': { id: 't4', name: 'Cinder Ruins', defenseValue: 12, neighbors: ['t2', 't6'], owner: 'enemy', trait: 'mystic', region: 'ash' },
    // Iron Region
    't5': { id: 't5', name: 'Iron Ridge', defenseValue: 15, neighbors: ['t3', 't7'], owner: 'enemy', trait: 'fortified', region: 'iron' },
    't6': { id: 't6', name: 'Rust Canyon', defenseValue: 18, neighbors: ['t4', 't7'], owner: 'enemy', trait: 'resource', region: 'iron' },
    // Frost Region
    't7': { id: 't7', name: 'Frost Pass', defenseValue: 22, neighbors: ['t5', 't6', 't8', 't9'], owner: 'enemy', trait: 'none', region: 'frost' },
    't8': { id: 't8', name: 'Glacier Peak', defenseValue: 26, neighbors: ['t7', 't10'], owner: 'enemy', trait: 'mystic', region: 'frost' },
    't9': { id: 't9', name: 'Frozen Lake', defenseValue: 24, neighbors: ['t7', 't11'], owner: 'enemy', trait: 'resource', region: 'frost' },
    // Demon Region
    't10': { id: 't10', name: 'Abyssal Gate', defenseValue: 30, neighbors: ['t8', 't12'], owner: 'enemy', trait: 'fortified', region: 'demon' },
    't11': { id: 't11', name: 'Void Shrine', defenseValue: 32, neighbors: ['t9', 't12'], owner: 'enemy', trait: 'mystic', region: 'demon' },
    't12': { id: 't12', name: 'Demon Citadel', defenseValue: 40, neighbors: ['t10', 't11'], owner: 'enemy', trait: 'fortified', region: 'demon' },
};

export const useRiskStore = create<RiskState>()(
    persist(
        (set, get) => ({
            mapNodes: {},
            playerArmySize: 0,
            inventoryCards: [],
            equippedCards: [],
            ascensionLevel: 0,

            initializeMap: () => {
                const { mapNodes } = get();
                if (Object.keys(mapNodes).length === 0) {
                    set({ mapNodes: DEFAULT_MAP });
                } else {
                    // Quick migration helper for old 6-node prototype saves
                    const oldNodes = Object.keys(mapNodes);
                    if (oldNodes.length < 12) {
                        const merged = { ...DEFAULT_MAP };
                        for (const key of oldNodes) {
                            if (merged[key]) {
                                merged[key].owner = mapNodes[key].owner;
                            }
                        }
                        set({ mapNodes: merged });
                    }
                }
            },

            resetAndAscendMap: () => {
                const { ascensionLevel } = get();
                const newLevel = ascensionLevel + 1;
                const newMap = { ...DEFAULT_MAP };
                // Scale enemy defenses based on ascension
                Object.keys(newMap).forEach(k => {
                    if (newMap[k].owner === 'enemy') {
                        newMap[k].defenseValue = Math.floor(newMap[k].defenseValue * (1 + (newLevel * 0.5)));
                    }
                });
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
                    start: [], ash: [], iron: [], frost: [], demon: []
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
