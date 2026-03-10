import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type EquipmentSlot = 'head' | 'body' | 'legs' | 'feet' | 'accessory' | 'weapon';

export interface CosmeticItem {
    id: string;
    slot: EquipmentSlot;
    name: string;
    color: string;
    unlockRequirement?: {
        skill: SkillName;
        level: number;
    };
    price: number;
}

interface CharacterState {
    position: { x: number; y: number };
    equipped: Partial<Record<EquipmentSlot, string>>; // Maps slot to cosmetic ID
    ownedCosmetics: string[]; // List of owned cosmetic IDs

    // Actions
    setPosition: (x: number, y: number) => void;
    equipItem: (slot: EquipmentSlot, cosmeticId: string) => void;
    unequipItem: (slot: EquipmentSlot) => void;
    purchaseCosmetic: (cosmeticId: string) => void;
    ownsCosmetic: (cosmeticId: string) => boolean;
}

// Cosmetics database
export const COSMETICS_DB: Record<string, CosmeticItem> = {
    // Headbands (Flexibility)
    'headband-red': {
        id: 'headband-red',
        slot: 'head',
        name: 'Red Headband',
        color: '#ef4444',
        unlockRequirement: { skill: 'Flexibility', level: 30 },
        price: 500,
    },
    'headband-blue': {
        id: 'headband-blue',
        slot: 'head',
        name: 'Blue Headband',
        color: '#3b82f6',
        unlockRequirement: { skill: 'Flexibility', level: 35 },
        price: 500,
    },
    'headband-green': {
        id: 'headband-green',
        slot: 'head',
        name: 'Green Headband',
        color: '#22c55e',
        unlockRequirement: { skill: 'Flexibility', level: 40 },
        price: 500,
    },

    // Shoes (Cardio)
    'shoes-red': {
        id: 'shoes-red',
        slot: 'feet',
        name: 'Red Sneakers',
        color: '#ef4444',
        unlockRequirement: { skill: 'Cardio', level: 5 },
        price: 200,
    },
    'shoes-blue': {
        id: 'shoes-blue',
        slot: 'feet',
        name: 'Blue Sneakers',
        color: '#3b82f6',
        unlockRequirement: { skill: 'Cardio', level: 10 },
        price: 200,
    },
    'shoes-white': {
        id: 'shoes-white',
        slot: 'feet',
        name: 'White Sneakers',
        color: '#f8fafc',
        unlockRequirement: { skill: 'Cardio', level: 15 },
        price: 200,
    },
    'shoes-black': {
        id: 'shoes-black',
        slot: 'feet',
        name: 'Black Sneakers',
        color: '#0f172a',
        unlockRequirement: { skill: 'Cardio', level: 20 },
        price: 200,
    },

    // Necklace (Cardio - high level)
    'necklace-gold': {
        id: 'necklace-gold',
        slot: 'accessory',
        name: 'Gold Necklace',
        color: '#f59e0b',
        unlockRequirement: { skill: 'Cardio', level: 40 },
        price: 800,
    },
    'necklace-silver': {
        id: 'necklace-silver',
        slot: 'accessory',
        name: 'Silver Necklace',
        color: '#cbd5e1',
        unlockRequirement: { skill: 'Cardio', level: 45 },
        price: 800,
    },

    // Shirts (Clothing)
    'shirt-red': {
        id: 'shirt-red',
        slot: 'body',
        name: 'Red Shirt',
        color: '#ef4444',
        price: 150,
    },
    'shirt-blue': {
        id: 'shirt-blue',
        slot: 'body',
        name: 'Blue Shirt',
        color: '#3b82f6',
        price: 150,
    },
    'shirt-green': {
        id: 'shirt-green',
        slot: 'body',
        name: 'Green Shirt',
        color: '#22c55e',
        price: 150,
    },
    'shirt-black': {
        id: 'shirt-black',
        slot: 'body',
        name: 'Black Shirt',
        color: '#0f172a',
        price: 150,
    },

    // Pants (Clothing)
    'pants-blue': {
        id: 'pants-blue',
        slot: 'legs',
        name: 'Blue Jeans',
        color: '#3b82f6',
        price: 180,
    },
    'pants-black': {
        id: 'pants-black',
        slot: 'legs',
        name: 'Black Pants',
        color: '#0f172a',
        price: 180,
    },
    'pants-gray': {
        id: 'pants-gray',
        slot: 'legs',
        name: 'Gray Pants',
        color: '#64748b',
        price: 180,
    },
};

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            position: { x: 400, y: 300 }, // Center of room
            equipped: {
                body: 'shirt-blue', // Default shirt
                legs: 'pants-blue', // Default pants
            },
            ownedCosmetics: ['shirt-blue', 'pants-blue'], // Start with defaults

            setPosition: (x, y) => set({ position: { x, y } }),

            equipItem: (slot, cosmeticId) => {
                const cosmetic = COSMETICS_DB[cosmeticId];
                if (!cosmetic || cosmetic.slot !== slot) return;
                if (!get().ownsCosmetic(cosmeticId)) return;

                set((state) => ({
                    equipped: { ...state.equipped, [slot]: cosmeticId },
                }));
            },

            unequipItem: (slot) => {
                set((state) => {
                    const newEquipped = { ...state.equipped };
                    delete newEquipped[slot];
                    return { equipped: newEquipped };
                });
            },

            purchaseCosmetic: (cosmeticId) => {
                const cosmetic = COSMETICS_DB[cosmeticId];
                if (!cosmetic) return;
                if (get().ownsCosmetic(cosmeticId)) return;

                // Check if can afford (would integrate with useGameStore)
                import('./useGameStore').then(({ useGameStore }) => {
                    const gameStore = useGameStore.getState();
                    if (gameStore.currency >= cosmetic.price) {
                        gameStore.addCurrency(-cosmetic.price);
                        set((state) => ({
                            ownedCosmetics: [...state.ownedCosmetics, cosmeticId],
                        }));
                    }
                });
            },

            ownsCosmetic: (cosmeticId) => {
                return get().ownedCosmetics.includes(cosmeticId);
            },
        }),
        {
            name: PERSIST_REGISTRY.character.persistKey,
        }
    )
);
