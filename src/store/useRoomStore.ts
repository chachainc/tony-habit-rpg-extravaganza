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
export interface RoomFurnitureDef {
    id: string;
    name: string;
    icon: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    goldCost: number;
    gemCost?: number;
    requirementLabel?: string;
    bonusLabel: string;
    /** Display size as % of room width/height. Default: 10x10 */
    sizeW?: number;
    sizeH?: number;
}

export const ROOM_FURNITURE_CATALOG: RoomFurnitureDef[] = [
    {
        id: 'fireplace', name: 'Fireplace', icon: '🔥',
        description: 'A warm hearth that calms the spirit and bolsters defense.',
        rarity: 'uncommon', goldCost: 8000, bonusLabel: '+2% DEF, +15 Max HP',
        sizeW: 14, sizeH: 14,
    },
    {
        id: 'pet_bed', name: 'Pet Bed', icon: '🛏️',
        description: 'A cozy cushioned bed for your companion.',
        rarity: 'common', goldCost: 2000, bonusLabel: '+8 Max HP, +1% XP gain',
        sizeW: 12, sizeH: 10,
    },
    {
        id: 'guitar', name: 'Guitar', icon: '🎸',
        description: 'Music lifts the spirit and quickens reflexes.',
        rarity: 'uncommon', goldCost: 5000, bonusLabel: '+1% SPD, +2% XP gain',
        sizeW: 10, sizeH: 12,
    },
    {
        id: 'basic_bed', name: 'Basic Bed', icon: '🛏️',
        description: 'A simple bed for rest and recovery.',
        rarity: 'common', goldCost: 1500, bonusLabel: '+5 Max HP',
        sizeW: 16, sizeH: 12,
    },
    {
        id: 'arcane_bookshelf', name: 'Arcane Bookshelf', icon: '📚',
        description: 'Ancient knowledge. Boosts crit and XP.',
        rarity: 'legendary', goldCost: 80000, gemCost: 75, requirementLabel: 'Housemaid Lv.25 required',
        bonusLabel: '+1% Crit, +3% XP', sizeW: 18, sizeH: 14,
    },
    {
        id: 'writing_desk', name: 'Writing Desk', icon: '🪑',
        description: "A scholar's desk. Reduces MP spell costs.",
        rarity: 'rare', goldCost: 12000, bonusLabel: '-2% MP cost',
        sizeW: 14, sizeH: 12,
    },
    {
        id: 'grandfather_clock', name: 'Grandfather Clock', icon: '🕰️',
        description: 'Time moves differently around this ancient timepiece.',
        rarity: 'rare', goldCost: 18000, bonusLabel: '+2% SPD',
        sizeW: 10, sizeH: 18,
    },
    {
        id: 'magic_hearth', name: 'Magic Hearth', icon: '✨',
        description: 'A magical hearth that warms not just the body but the soul.',
        rarity: 'epic', goldCost: 45000, gemCost: 40, bonusLabel: '+2% DEF, +15 Max HP',
        sizeW: 16, sizeH: 14,
    },
    {
        id: 'celestial_chandelier', name: 'Celestial Chandelier', icon: '💎',
        description: 'Radiates a Cleanliness Aura. Top-tier room centerpiece.',
        rarity: 'legendary', goldCost: 150000, gemCost: 150, requirementLabel: 'Housemaid Lv.30 required',
        bonusLabel: '+50 Max HP, +2% DEF, +2% ATK', sizeW: 20, sizeH: 16,
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

/** A furniture piece placed inside the room */
export interface PlacedFurniture {
    id: string;          // Unique placement instance ID
    furnitureId: string; // References ROOM_FURNITURE_CATALOG entry
    x: number;           // % of room width  (0–100)
    y: number;           // % of room height (0–100)
}

interface RoomState {
    // Legacy canvas-based furniture (kept for backward compat, not used for bonuses)
    furnitureItems: FurnitureItem[];

    // Catalog-based placement system
    ownedRoomFurniture: string[];      // IDs of purchased catalog items
    placedRoomFurniture: PlacedFurniture[];

    roomDimensions: { width: number; height: number };
    playerPosition: { x: number; y: number };

    // Legacy actions (kept for compat)
    placeFurniture: (type: string, x: number, y: number) => void;
    removeFurniture: (id: string) => void;
    moveFurniture: (id: string, x: number, y: number) => void;
    setPlayerPosition: (x: number, y: number) => void;

    // Catalog actions
    purchaseRoomFurniture: (furnitureId: string) => boolean;
    ownsRoomFurniture: (furnitureId: string) => boolean;
    isPlaced: (furnitureId: string) => boolean;

    // Placement actions
    placeRoomFurniture: (furnitureId: string, x: number, y: number) => void;
    movePlacedFurniture: (placedId: string, x: number, y: number) => void;
    unplaceRoomFurniture: (placedId: string) => void;
    unplaceByFurnitureId: (furnitureId: string) => void;

    // Getters
    getRoomCombatBonuses: () => AggregatedRoomBonuses;
    getPlacedBonusSummary: () => { label: string; value: string }[];
}

export const useRoomStore = create<RoomState>()(
    persist(
        (set, get) => ({
            furnitureItems: [],
            ownedRoomFurniture: [],
            placedRoomFurniture: [],
            roomDimensions: { width: 800, height: 600 },
            playerPosition: { x: 5, y: 5 },

            // Legacy actions — unchanged
            placeFurniture: (type, x, y) => {
                const newItem: FurnitureItem = {
                    id: `furniture-${Date.now()}`,
                    type, x, y,
                    width: 64,
                    height: 64,
                };
                set((state) => ({ furnitureItems: [...state.furnitureItems, newItem] }));
            },

            removeFurniture: (id) =>
                set((state) => ({
                    furnitureItems: state.furnitureItems.filter((item) => item.id !== id),
                })),

            moveFurniture: (id, x, y) =>
                set((state) => ({
                    furnitureItems: state.furnitureItems.map((item) =>
                        item.id === id ? { ...item, x, y } : item
                    ),
                })),

            setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),

            // Catalog purchase
            purchaseRoomFurniture: (furnitureId) => {
                const already = get().ownedRoomFurniture.includes(furnitureId);
                if (already) return false;
                set((state) => ({
                    ownedRoomFurniture: [...state.ownedRoomFurniture, furnitureId],
                }));
                return true;
            },

            ownsRoomFurniture: (furnitureId) =>
                get().ownedRoomFurniture.includes(furnitureId),

            isPlaced: (furnitureId) =>
                get().placedRoomFurniture.some((p) => p.furnitureId === furnitureId),

            // Placement — drop at % coords
            placeRoomFurniture: (furnitureId, x, y) => {
                const state = get();
                if (!state.ownedRoomFurniture.includes(furnitureId)) return;

                // If already placed, just move it
                const existing = state.placedRoomFurniture.find(
                    (p) => p.furnitureId === furnitureId
                );
                if (existing) {
                    set((s) => ({
                        placedRoomFurniture: s.placedRoomFurniture.map((p) =>
                            p.furnitureId === furnitureId ? { ...p, x, y } : p
                        ),
                    }));
                    return;
                }

                const newPlaced: PlacedFurniture = {
                    id: `placed-${furnitureId}-${Date.now()}`,
                    furnitureId,
                    x,
                    y,
                };
                set((s) => ({
                    placedRoomFurniture: [...s.placedRoomFurniture, newPlaced],
                }));
            },

            movePlacedFurniture: (placedId, x, y) =>
                set((s) => ({
                    placedRoomFurniture: s.placedRoomFurniture.map((p) =>
                        p.id === placedId ? { ...p, x, y } : p
                    ),
                })),

            unplaceRoomFurniture: (placedId) =>
                set((s) => ({
                    placedRoomFurniture: s.placedRoomFurniture.filter((p) => p.id !== placedId),
                })),

            unplaceByFurnitureId: (furnitureId) =>
                set((s) => ({
                    placedRoomFurniture: s.placedRoomFurniture.filter(
                        (p) => p.furnitureId !== furnitureId
                    ),
                })),

            // ─── BONUSES: aggregate from PLACED furniture only ───────────────────
            getRoomCombatBonuses: () => {
                const placed = get().placedRoomFurniture;
                const totals: AggregatedRoomBonuses = {
                    atkPercent: 0, defPercent: 0, spdPercent: 0,
                    critPercent: 0, maxHP: 0, mpCostReduction: 0, xpBonusPercent: 0,
                };

                for (const entry of placed) {
                    const bonus = FURNITURE_COMBAT_BONUSES[entry.furnitureId];
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

            // Human-readable bonus lines for the UI
            getPlacedBonusSummary: () => {
                const b = get().getRoomCombatBonuses();
                const lines: { label: string; value: string }[] = [];
                if (b.atkPercent) lines.push({ label: '⚔️ ATK', value: `+${b.atkPercent}%` });
                if (b.defPercent) lines.push({ label: '🛡️ DEF', value: `+${b.defPercent}%` });
                if (b.spdPercent) lines.push({ label: '💨 SPD', value: `+${b.spdPercent}%` });
                if (b.critPercent) lines.push({ label: '🎯 Crit', value: `+${b.critPercent}%` });
                if (b.maxHP) lines.push({ label: '❤️ Max HP', value: `+${b.maxHP}` });
                if (b.mpCostReduction) lines.push({ label: '🔮 MP Cost', value: `-${b.mpCostReduction}%` });
                if (b.xpBonusPercent) lines.push({ label: '✨ XP Gain', value: `+${b.xpBonusPercent}%` });
                return lines;
            },
        }),
        {
            name: PERSIST_REGISTRY.room.persistKey,
            // Forward-compatible merge: preserve existing placements
            merge: (persisted: unknown, current) => {
                const p = persisted as Partial<RoomState>;
                return {
                    ...current,
                    ...p,
                    // Ensure new PlacedFurniture shape (old saves had gridX/gridY without x/y)
                    placedRoomFurniture: ((p.placedRoomFurniture ?? []) as PlacedFurniture[]).map(
                        (entry) => ({
                            id: entry.id,
                            furnitureId: entry.furnitureId,
                            x: (entry as PlacedFurniture & { gridX?: number }).x
                                ?? ((entry as PlacedFurniture & { gridX?: number }).gridX
                                    ? ((entry as PlacedFurniture & { gridX?: number }).gridX! / 12) * 100
                                    : 20),
                            y: (entry as PlacedFurniture & { gridY?: number }).y
                                ?? ((entry as PlacedFurniture & { gridY?: number }).gridY
                                    ? ((entry as PlacedFurniture & { gridY?: number }).gridY! / 10) * 100
                                    : 20),
                        })
                    ),
                };
            },
        }
    )
);
