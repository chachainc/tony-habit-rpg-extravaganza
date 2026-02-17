import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ENEMY_DB } from './useEnemyStore';

// Golden Slime spawn settings
const GOLDEN_SLIME_SPAWN_CHANCE = 0.01; // 1% chance
const GOLDEN_SLIME_COOLDOWN_FLOORS = 5; // Prevent spawn for 5 floors after last encounter

export interface FloorModifier {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'stat' | 'environment';
    effect: {
        stat?: 'atk' | 'def' | 'spd' | 'hp' | 'mana';
        multiplier?: number;
        label?: string;
    };
}

export interface RunBuff {
    id: string;
    name: string;
    description: string;
    icon: string;
    effect: { type: 'atk' | 'def' | 'xp' | 'gold'; amount: number };
}

interface CampaignState {
    currentFloor: number;
    highestFloorCleared: number;
    lastGoldenSlimeFloor: number;

    // Tower Expansion State
    activeRunBuffs: RunBuff[];
    currentFloorModifier: FloorModifier | null;

    // Actions
    unlockNextFloor: () => void;
    setCurrentFloor: (floor: number) => void;
    getNextFloorId: () => string | null;
    getEnemyForFloor: (floor: number) => string | null;
    checkForGoldenSlime: (floor: number) => boolean;
    recordGoldenSlimeEncounter: (floor: number) => void;

    // Tower Expansion Actions
    generateFloorModifier: () => void;
    addRunBuff: (buff: RunBuff) => void;
    clearRunBuffs: () => void;
}

const MODIFIERS: FloorModifier[] = [
    { id: 'gravity_well', name: 'Gravity Well', description: 'Enemies have 20% more HP due to increased gravity.', icon: '🪐', type: 'stat', effect: { stat: 'hp', multiplier: 1.2 } },
    { id: 'static_storm', name: 'Static Storm', description: 'Electrical discharge increases everyone\'s speed by 15%.', icon: '⚡', type: 'stat', effect: { stat: 'spd', multiplier: 1.15 } },
    { id: 'void_aura', name: 'Void Aura', description: 'The void drains 10% of everyone\'s attack power.', icon: '🌑', type: 'stat', effect: { stat: 'atk', multiplier: 0.9 } },
    { id: 'chaos_zone', name: 'Chaos Zone', description: 'Instability increases critical damage by 50%.', icon: '🌀', type: 'stat', effect: { label: 'Crit Dmg +50%' } },
    { id: 'sanctuary', name: 'Sanctuary', description: 'A calming aura provides subtle healing and protection.', icon: '✨', type: 'environment', effect: { label: 'Regen +5%' } },
];

export const useCampaignStore = create<CampaignState>()(
    persist(
        (set, get) => ({
            currentFloor: 1,
            highestFloorCleared: 0,
            lastGoldenSlimeFloor: -100,
            activeRunBuffs: [],
            currentFloorModifier: null,

            unlockNextFloor: () => {
                const state = get();
                const nextFloor = state.currentFloor;

                if (nextFloor > state.highestFloorCleared) {
                    set({ highestFloorCleared: nextFloor });
                }

                // Auto-advance to next floor
                set({ currentFloor: nextFloor + 1, currentFloorModifier: null });

                // Generate a new modifier for the next floor (50% chance)
                if (Math.random() < 0.5) {
                    get().generateFloorModifier();
                }
            },

            setCurrentFloor: (floor) => set({ currentFloor: floor, currentFloorModifier: null }),

            getNextFloorId: () => {
                const state = get();
                const enemyEntry = Object.entries(ENEMY_DB).find(([_, def]) => def.floor === state.currentFloor);
                return enemyEntry ? enemyEntry[0] : null;
            },

            getEnemyForFloor: (floor) => {
                const enemyEntry = Object.entries(ENEMY_DB).find(([_, def]) => def.floor === floor);
                return enemyEntry ? enemyEntry[0] : null;
            },

            checkForGoldenSlime: (floor) => {
                const state = get();
                if (floor - state.lastGoldenSlimeFloor < GOLDEN_SLIME_COOLDOWN_FLOORS) {
                    return false;
                }
                return Math.random() < GOLDEN_SLIME_SPAWN_CHANCE;
            },

            recordGoldenSlimeEncounter: (floor) => {
                set({ lastGoldenSlimeFloor: floor });
            },

            generateFloorModifier: () => {
                const randomIndex = Math.floor(Math.random() * MODIFIERS.length);
                set({ currentFloorModifier: MODIFIERS[randomIndex] });
            },

            addRunBuff: (buff) => set((state) => ({
                activeRunBuffs: [...state.activeRunBuffs, buff]
            })),

            clearRunBuffs: () => set({ activeRunBuffs: [] }),
        }),
        {
            name: 'gl-campaign-v2', // Incremented version
        }
    )
);
