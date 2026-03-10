import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

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
    // New items
    fireplace: { defPercent: 2, maxHP: 15 },
    pet_bed: { maxHP: 8, xpBonusPercent: 1 },
    guitar: { spdPercent: 1, xpBonusPercent: 2 },
};

// ─── PURCHASABLE ROOM-FURNITURE CATALOG ──────────────────────────────────────
// Items shown in the Room's Furniture tab that can be placed/removed.
export interface RoomFurnitureDef {
    id: string;
    name: string;
    icon: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    goldCost: number;
    requirementLabel?: string;
    bonusLabel: string;
}

export const ROOM_FURNITURE_CATALOG: RoomFurnitureDef[] = [
    {
        id: 'fireplace',
        name: 'Fireplace',
        icon: '🔥',
        description: 'A warm hearth that calms the spirit and bolsters defense.',
        rarity: 'uncommon',
        goldCost: 8000,
        bonusLabel: '+2% DEF, +15 Max HP',
    },
    {
        id: 'pet_bed',
        name: 'Pet Bed',
        icon: '🛏️',
        description: 'A cozy cushioned bed for your companion. Keeps them happy and rested.',
        rarity: 'common',
        goldCost: 2000,
        bonusLabel: '+8 Max HP, +1% XP gain',
    },
    {
        id: 'guitar',
        name: 'Guitar',
        icon: '🎸',
        description: 'A decorative guitar. Music lifts the spirit and quickens reflexes.',
        rarity: 'uncommon',
        goldCost: 5000,
        bonusLabel: '+1% SPD, +2% XP gain',
    },
    {
        id: 'basic_bed',
        name: 'Basic Bed',
        icon: '🛏️',
        description: 'A simple bed for rest and recovery.',
        rarity: 'common',
        goldCost: 1500,
        bonusLabel: '+5 Max HP',
    },
    {
        id: 'arcane_bookshelf',
        name: 'Arcane Bookshelf',
        icon: '📚',
        description: 'Ancient knowledge stored in its pages. Boosts crit and XP.',
        rarity: 'legendary',
        goldCost: 80000,
        requirementLabel: 'Housemaid Lv.25 required',
        bonusLabel: '+1% Crit, +3% XP',
    },
    {
        id: 'writing_desk',
        name: 'Writing Desk',
        icon: '🪑',
        description: 'A scholar\'s desk. Reduces MP spell costs.',
        rarity: 'rare',
        goldCost: 12000,
        bonusLabel: '-2% MP cost',
    },
    {
        id: 'grandfather_clock',
        name: 'Grandfather Clock',
        icon: '🕰️',
        description: 'Time moves differently around this ancient timepiece.',
        rarity: 'rare',
        goldCost: 18000,
        bonusLabel: '+2% SPD',
    },
    {
        id: 'magic_hearth',
        name: 'Magic Hearth',
        icon: '✨',
        description: 'A magical hearth that warms not just the body but the soul.',
        rarity: 'epic',
        goldCost: 45000,
        bonusLabel: '+2% DEF, +15 Max HP',
    },
    {
        id: 'celestial_chandelier',
        name: 'Celestial Chandelier',
        icon: '💎',
        description: 'Radiates a Cleanliness Aura. Top-tier room centerpiece.',
        rarity: 'legendary',
        goldCost: 150000,
        requirementLabel: 'Housemaid Lv.30 required',
        bonusLabel: '+50 Max HP, +2% DEF, +2% ATK',
    },
];

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
    // New: track owned furniture catalog items separately
    ownedRoomFurniture: string[];  // IDs of purchased catalog items
    placedRoomFurniture: { id: string; furnitureId: string; gridX: number; gridY: number }[];
    roomDimensions: { width: number; height: number };
    playerPosition: { x: number; y: number };

    // Actions
    placeFurniture: (type: string, x: number, y: number) => void;
    removeFurniture: (id: string) => void;
    moveFurniture: (id: string, x: number, y: number) => void;
    setPlayerPosition: (x: number, y: number) => void;
    purchaseRoomFurniture: (furnitureId: string) => boolean;
    ownsRoomFurniture: (furnitureId: string) => boolean;
    placeRoomFurniture: (furnitureId: string, gridX: number, gridY: number) => void;
    unplaceRoomFurniture: (placedId: string) => void;

    // Getters
    getRoomCombatBonuses: () => AggregatedRoomBonuses;
}

export const useRoomStore = create<RoomState>()(
    persist(
        (set, get) => ({
            furnitureItems: [],
            ownedRoomFurniture: [],
            placedRoomFurniture: [],
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

            purchaseRoomFurniture: (furnitureId) => {
                const { furnitureItems, ownedRoomFurniture } = get();
                const exists = furnitureItems.some((item) => item.id === furnitureId);
                const alreadyOwned = ownedRoomFurniture.includes(furnitureId);
                if (!exists || alreadyOwned) {
                    return false;
                }

                set((state) => ({
                    ownedRoomFurniture: [...state.ownedRoomFurniture, furnitureId],
                }));
                return true;
            },

            ownsRoomFurniture: (furnitureId) => get().ownedRoomFurniture.includes(furnitureId),

            placeRoomFurniture: (furnitureId, gridX, gridY) => {
                const { ownedRoomFurniture, placedRoomFurniture } = get();
                if (!ownedRoomFurniture.includes(furnitureId)) {
                    return;
                }

                const existingPlacement = placedRoomFurniture.find(
                    (placedFurniture) => placedFurniture.furnitureId === furnitureId
                );

                if (existingPlacement) {
                    set((state) => ({
                        placedRoomFurniture: state.placedRoomFurniture.map((placedFurniture) =>
                            placedFurniture.furnitureId === furnitureId
                                ? { ...placedFurniture, gridX, gridY }
                                : placedFurniture
                        ),
                    }));
                    return;
                }

                const placedFurnitureId = `placed-${furnitureId}-${Date.now()}`;
                set((state) => ({
                    placedRoomFurniture: [
                        ...state.placedRoomFurniture,
                        { id: placedFurnitureId, furnitureId, gridX, gridY },
                    ],
                }));
            },

            unplaceRoomFurniture: (placedId) => {
                set((state) => ({
                    placedRoomFurniture: state.placedRoomFurniture.filter(
                        (placedFurniture) => placedFurniture.id !== placedId
                    ),
                }));
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
            name: PERSIST_REGISTRY.room.persistKey,
        }
    )
);
