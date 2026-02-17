import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FurnitureItem {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// ===================================
// FURNITURE → COMBAT BONUS MAPPING
// ===================================
export interface FurnitureCombatBonus {
    atkPercent?: number;
    defPercent?: number;
    spdPercent?: number;
    critPercent?: number;
    maxHP?: number;
    mpCostReduction?: number; // percentage
    xpBonusPercent?: number;
}

// Map furniture item IDs to their passive combat bonuses
export const FURNITURE_COMBAT_BONUSES: Record<string, FurnitureCombatBonus> = {
    // Bookshelves → Intelligence / crit
    arcane_bookshelf: { critPercent: 1, xpBonusPercent: 3 },
    // Beds → HP regen / survivability
    basic_bed: { maxHP: 5 },
    comfy_bed: { maxHP: 10 },
    premium_bed: { maxHP: 20 },
    ornate_bed: { maxHP: 30 },
    royal_canopy: { maxHP: 50 },
    // Weapon racks → ATK
    heavy_weapon_rack: { atkPercent: 3 },
    // Desks → spell cost
    writing_desk: { mpCostReduction: 2 },
    archmage_desk: { mpCostReduction: 8, critPercent: 2 },
    // Prestige / decorative → DEF / SPD
    grandfather_clock: { spdPercent: 2 },
    magic_hearth: { defPercent: 2, maxHP: 15 },
    enchanted_mirror: { critPercent: 1, spdPercent: 1 },
    enchanted_mirror_prestige: { critPercent: 3 },
    celestial_chandelier: { maxHP: 50, defPercent: 2, atkPercent: 2 },
    gilded_bathtub: { maxHP: 100, defPercent: 3 },
    // Basic items → small boosts
    basic_rug: { defPercent: 1 },
    wooden_chair: { spdPercent: 1 },
    ornate_lamp: { critPercent: 0.5 },
    luxury_shower: { defPercent: 1, maxHP: 10 },
};

export interface AggregatedRoomBonuses {
    atkPercent: number;
    defPercent: number;
    spdPercent: number;
    critPercent: number;
    maxHP: number;
    mpCostReduction: number;
    xpBonusPercent: number;
}

interface RoomState {
    furnitureItems: FurnitureItem[];
    roomDimensions: { width: number; height: number };
    playerPosition: { x: number; y: number };

    // Actions
    placeFurniture: (type: string, x: number, y: number) => void;
    removeFurniture: (id: string) => void;
    moveFurniture: (id: string, x: number, y: number) => void;
    setPlayerPosition: (x: number, y: number) => void;

    // Getters
    getRoomCombatBonuses: () => AggregatedRoomBonuses;
}

export const useRoomStore = create<RoomState>()(
    persist(
        (set, get) => ({
            furnitureItems: [],
            roomDimensions: { width: 800, height: 600 },
            playerPosition: { x: 5, y: 5 },

            placeFurniture: (type, x, y) => {
                const newItem: FurnitureItem = {
                    id: `furniture-${Date.now()}`,
                    type,
                    x,
                    y,
                    width: 64, // Default size, will vary by type
                    height: 64,
                };

                set((state) => ({
                    furnitureItems: [...state.furnitureItems, newItem],
                }));
            },

            removeFurniture: (id) => {
                set((state) => ({
                    furnitureItems: state.furnitureItems.filter((item) => item.id !== id),
                }));
            },

            moveFurniture: (id, x, y) => {
                set((state) => ({
                    furnitureItems: state.furnitureItems.map((item) =>
                        item.id === id ? { ...item, x, y } : item
                    ),
                }));
            },

            setPlayerPosition: (x, y) => {
                set({ playerPosition: { x, y } });
            },

            // Aggregate all placed furniture combat bonuses
            getRoomCombatBonuses: () => {
                const items = get().furnitureItems;
                const totals: AggregatedRoomBonuses = {
                    atkPercent: 0,
                    defPercent: 0,
                    spdPercent: 0,
                    critPercent: 0,
                    maxHP: 0,
                    mpCostReduction: 0,
                    xpBonusPercent: 0,
                };

                for (const item of items) {
                    const bonus = FURNITURE_COMBAT_BONUSES[item.type];
                    if (!bonus) continue;
                    totals.atkPercent += bonus.atkPercent ?? 0;
                    totals.defPercent += bonus.defPercent ?? 0;
                    totals.spdPercent += bonus.spdPercent ?? 0;
                    totals.critPercent += bonus.critPercent ?? 0;
                    totals.maxHP += bonus.maxHP ?? 0;
                    totals.mpCostReduction += bonus.mpCostReduction ?? 0;
                    totals.xpBonusPercent += bonus.xpBonusPercent ?? 0;
                }

                return totals;
            },
        }),
        {
            name: 'gl-room-v1',
        }
    )
);
