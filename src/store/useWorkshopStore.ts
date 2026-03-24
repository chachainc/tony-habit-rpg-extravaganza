import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Materials ──
export interface Material {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export const MATERIALS: Record<string, Material> = {
    iron_ore:     { id: 'iron_ore',     name: 'Iron Ore',      icon: '⛏️', description: 'Basic forging material' },
    mystic_dust:  { id: 'mystic_dust',  name: 'Mystic Dust',   icon: '✨', description: 'Arcane enchanting powder' },
    dragon_scale: { id: 'dragon_scale', name: 'Dragon Scale',  icon: '🐉', description: 'Rare crafting reagent' },
    gem_shard:    { id: 'gem_shard',    name: 'Gem Shard',     icon: '💎', description: 'Precious gem fragment' },
    leather_strip:{ id: 'leather_strip',name: 'Leather Strip',icon: '🪡', description: 'Tough leather for armor' },
};

// ── Crafting Recipes ──
export interface CraftingRecipe {
    id: string;
    name: string;
    inputs: { itemId: string; qty: number }[];
    materialInputs?: { materialId: string; qty: number }[];
    outputItemId: string;
    goldCost: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        id: 'craft_iron_axe',
        name: 'Forge Iron Axe',
        inputs: [{ itemId: 'rusty_sword', qty: 2 }],
        materialInputs: [{ materialId: 'iron_ore', qty: 2 }],
        outputItemId: 'iron_axe',
        goldCost: 200,
    },
    {
        id: 'craft_battle_axe',
        name: 'Forge Battle Axe',
        inputs: [{ itemId: 'iron_axe', qty: 1 }],
        materialInputs: [{ materialId: 'iron_ore', qty: 5 }, { materialId: 'dragon_scale', qty: 1 }],
        outputItemId: 'battle_axe',
        goldCost: 800,
    },
    {
        id: 'craft_iron_plate',
        name: 'Forge Iron Plate',
        inputs: [{ itemId: 'leather_vest', qty: 2 }],
        materialInputs: [{ materialId: 'iron_ore', qty: 4 }, { materialId: 'leather_strip', qty: 2 }],
        outputItemId: 'iron_plate',
        goldCost: 600,
    },
    {
        id: 'craft_mage_robe',
        name: 'Weave Mage Robe',
        inputs: [{ itemId: 'leather_vest', qty: 1 }],
        materialInputs: [{ materialId: 'mystic_dust', qty: 5 }, { materialId: 'gem_shard', qty: 2 }],
        outputItemId: 'mage_robe',
        goldCost: 1000,
    },
];

// ── Enchantments ──
export interface Enchantment {
    id: string;
    name: string;
    icon: string;
    stat: string;
    value: number;
    goldCost: number;
    materialCost: { materialId: string; qty: number }[];
}

export const ENCHANTMENTS: Enchantment[] = [
    { id: 'ench_atk_1', name: 'Sharpness I',    icon: '⚔️', stat: 'attack',  value: 3, goldCost: 500,  materialCost: [{ materialId: 'iron_ore', qty: 3 }] },
    { id: 'ench_atk_2', name: 'Sharpness II',   icon: '⚔️', stat: 'attack',  value: 6, goldCost: 1500, materialCost: [{ materialId: 'iron_ore', qty: 5 }, { materialId: 'mystic_dust', qty: 2 }] },
    { id: 'ench_def_1', name: 'Protection I',   icon: '🛡️', stat: 'defense', value: 3, goldCost: 500,  materialCost: [{ materialId: 'leather_strip', qty: 3 }] },
    { id: 'ench_def_2', name: 'Protection II',  icon: '🛡️', stat: 'defense', value: 6, goldCost: 1500, materialCost: [{ materialId: 'leather_strip', qty: 5 }, { materialId: 'mystic_dust', qty: 2 }] },
    { id: 'ench_crit',  name: 'Critical Edge',  icon: '🎯', stat: 'crit',    value: 5, goldCost: 2000, materialCost: [{ materialId: 'gem_shard', qty: 3 }, { materialId: 'mystic_dust', qty: 3 }] },
    { id: 'ench_xp',    name: 'Wisdom Glow',    icon: '📖', stat: 'xp',      value: 5, goldCost: 3000, materialCost: [{ materialId: 'mystic_dust', qty: 5 }, { materialId: 'dragon_scale', qty: 1 }] },
];

// ── Salvage yields ──
const SALVAGE_YIELDS: Record<string, { materialId: string; qty: number }[]> = {
    common:    [{ materialId: 'iron_ore', qty: 1 }],
    rare:      [{ materialId: 'iron_ore', qty: 2 }, { materialId: 'leather_strip', qty: 1 }],
    epic:      [{ materialId: 'mystic_dust', qty: 2 }, { materialId: 'gem_shard', qty: 1 }],
    legendary: [{ materialId: 'dragon_scale', qty: 1 }, { materialId: 'mystic_dust', qty: 3 }, { materialId: 'gem_shard', qty: 2 }],
};

// ── Store ──
interface WorkshopState {
    materials: Record<string, number>;
    enchantedItems: Record<string, string>; // itemId → enchantmentId

    addMaterial: (materialId: string, qty: number) => void;
    getMaterialCount: (materialId: string) => number;

    canCraft: (recipe: CraftingRecipe, ownedItems: Record<string, number>, gold: number) => boolean;
    craft: (recipe: CraftingRecipe) => boolean; // Returns true if crafted (caller handles inventory/gold)

    canEnchant: (enchantment: Enchantment, gold: number) => boolean;
    enchantItem: (itemId: string, enchantmentId: string) => void;
    getEnchantment: (itemId: string) => string | null;

    salvageItem: (rarity: string) => { materialId: string; qty: number }[];
}

export const useWorkshopStore = create<WorkshopState>()(
    persist(
        (set, get) => ({
            materials: {},
            enchantedItems: {},

            addMaterial: (materialId, qty) => {
                set(s => ({
                    materials: {
                        ...s.materials,
                        [materialId]: (s.materials[materialId] ?? 0) + qty,
                    },
                }));
            },

            getMaterialCount: (materialId) => get().materials[materialId] ?? 0,

            canCraft: (recipe, ownedItems, gold) => {
                if (gold < recipe.goldCost) return false;
                for (const input of recipe.inputs) {
                    if ((ownedItems[input.itemId] ?? 0) < input.qty) return false;
                }
                if (recipe.materialInputs) {
                    const { materials } = get();
                    for (const mat of recipe.materialInputs) {
                        if ((materials[mat.materialId] ?? 0) < mat.qty) return false;
                    }
                }
                return true;
            },

            craft: (recipe) => {
                // Consume materials (caller consumes items + gold)
                if (recipe.materialInputs) {
                    set(s => {
                        const mats = { ...s.materials };
                        for (const mat of recipe.materialInputs!) {
                            mats[mat.materialId] = (mats[mat.materialId] ?? 0) - mat.qty;
                        }
                        return { materials: mats };
                    });
                }
                return true;
            },

            canEnchant: (enchantment, gold) => {
                if (gold < enchantment.goldCost) return false;
                const { materials } = get();
                for (const mat of enchantment.materialCost) {
                    if ((materials[mat.materialId] ?? 0) < mat.qty) return false;
                }
                return true;
            },

            enchantItem: (itemId, enchantmentId) => {
                const ench = ENCHANTMENTS.find(e => e.id === enchantmentId);
                if (!ench) return;
                // Consume materials
                set(s => {
                    const mats = { ...s.materials };
                    for (const mat of ench.materialCost) {
                        mats[mat.materialId] = (mats[mat.materialId] ?? 0) - mat.qty;
                    }
                    return {
                        materials: mats,
                        enchantedItems: { ...s.enchantedItems, [itemId]: enchantmentId },
                    };
                });
            },

            getEnchantment: (itemId) => get().enchantedItems[itemId] ?? null,

            salvageItem: (rarity) => {
                const yields = SALVAGE_YIELDS[rarity] ?? SALVAGE_YIELDS.common;
                // Add materials
                set(s => {
                    const mats = { ...s.materials };
                    for (const y of yields) {
                        mats[y.materialId] = (mats[y.materialId] ?? 0) + y.qty;
                    }
                    return { materials: mats };
                });
                return yields;
            },
        }),
        { name: 'gl-workshop-v1' }
    )
);
