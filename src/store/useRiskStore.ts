import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStrategyStore } from './useStrategyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type TerritoryTrait = 'fortified' | 'resource' | 'mystic' | 'none';
export type SoldierCard = 'knight' | 'shieldbearer' | 'scout' | 'general';

export interface TerritoryNode {
    id: string;
    name: string;
    defenseValue: number;
    neighbors: string[];
    owner: 'player' | 'enemy';
    trait?: TerritoryTrait;
}

export interface BattleResult {
    success: boolean;
    partial: boolean;
    rolls: number[];
    crits: number;
    totalDamage: number;
    targetDefense: number;
    cardEffectsTriggered: string[];
    reward?: 'sigil' | 'card';
}

export interface RiskState {
    mapNodes: Record<string, TerritoryNode>;
    playerArmySize: number;
    inventoryCards: SoldierCard[];
    equippedCards: SoldierCard[];

    initializeMap: () => void;
    resolveBattle: (id: string) => BattleResult | null;
    equipCard: (card: SoldierCard) => void;
    unequipCard: (card: SoldierCard) => void;
    gainCard: (card: SoldierCard) => void;

    getUnlockedArmySize: () => number;
    getSoldierDiceSides: () => number;
}

const PROTOTYPE_MAP: Record<string, TerritoryNode> = {
    't1': { id: 't1', name: 'Start Hold', defenseValue: 0, neighbors: ['t2', 't3'], owner: 'player', trait: 'none' },
    't2': { id: 't2', name: 'Valley of Ash', defenseValue: 8, neighbors: ['t1', 't4'], owner: 'enemy', trait: 'resource' },
    't3': { id: 't3', name: 'Iron Ridge', defenseValue: 12, neighbors: ['t1', 't5'], owner: 'enemy', trait: 'fortified' },
    't4': { id: 't4', name: 'Sunken Ruins', defenseValue: 16, neighbors: ['t2', 't6'], owner: 'enemy', trait: 'mystic' },
    't5': { id: 't5', name: 'Frost Pass', defenseValue: 18, neighbors: ['t3', 't6'], owner: 'enemy', trait: 'none' },
    't6': { id: 't6', name: 'Demon Citadel', defenseValue: 25, neighbors: ['t4', 't5'], owner: 'enemy', trait: 'fortified' },
};

export const useRiskStore = create<RiskState>()(
    persist(
        (set, get) => ({
            mapNodes: {},
            playerArmySize: 0,
            inventoryCards: [],
            equippedCards: [],

            initializeMap: () => {
                const { mapNodes } = get();
                if (Object.keys(mapNodes).length === 0) {
                    set({ mapNodes: PROTOTYPE_MAP });
                }
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

            resolveBattle: (id: string) => {
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

                return {
                    success,
                    partial,
                    rolls,
                    crits,
                    totalDamage: baseDamage,
                    targetDefense,
                    cardEffectsTriggered: triggeredEffects,
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
            }
        }),
        {
            name: PERSIST_REGISTRY.risk.persistKey
        }
    )
);
