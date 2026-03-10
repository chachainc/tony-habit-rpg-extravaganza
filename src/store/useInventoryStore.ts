import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ITEM_DATABASE } from '../data/items';
import { useCurrencyStore } from './useCurrencyStore';
import type { SkillName } from './useGameStore';

export type ItemType = 'food' | 'toy' | 'potion' | 'weapon' | 'armor' | 'pet_gear' | 'ticket' | 'furniture' | 'book' | 'relic' | 'artifact';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ShopCategory = 'blacksmith' | 'armory' | 'first_aid' | 'general' | 'furniture' | 'library';

export interface ItemDef {
    id: string;
    name: string;
    type: ItemType;
    rarity: Rarity;
    shopCategory: ShopCategory;
    value: number; // ATK for weapons, DEF for armor, heal for potions
    critChance?: number; // For weapons: 0.05 = 5%
    price: number;
    icon: string;
    description?: string;
    requiredEnemy?: string; // Enemy ID that must be defeated to unlock

    // Book specific fields
    category?: 'fantasy' | 'business' | 'self-improvement' | 'history' | 'philosophy';
    level?: number;
    fusionRequired?: number;
    effect?: string;
    source?: string;
}

import { mergeExternalItems } from '../data/contentLoader';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export const ITEM_DB: Record<string, ItemDef> = mergeExternalItems({
    // ========== WEAPONS (Blacksmith) ==========
    'rusty_sword': { id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 5, critChance: 0.05, price: 500, icon: '🗡️', description: 'A basic blade. Better than fists.' },
    'iron_axe': { id: 'iron_axe', name: 'Iron Axe', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 8, critChance: 0.10, price: 800, icon: '🪓', description: 'Heavy and brutal.' },
    'battle_axe': { id: 'battle_axe', name: 'Battle Axe', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 15, critChance: 0.15, price: 2000, icon: '⚔️', description: 'Two-handed devastation.', requiredEnemy: 'stress_phantom' },
    'spear': { id: 'spear', name: 'Spear', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 10, critChance: 0.08, price: 1200, icon: '🔱', description: 'Reach advantage.' },
    'mace': { id: 'mace', name: 'Mace', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 12, critChance: 0.20, price: 1500, icon: '🔨', description: 'Crushing blows.' },
    'whip': { id: 'whip', name: 'Whip', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 6, critChance: 0.25, price: 900, icon: '〰️', description: 'High crit, low base damage.' },
    'ban_hammer': { id: 'ban_hammer', name: 'The Ban Hammer', type: 'weapon', rarity: 'legendary', shopCategory: 'blacksmith', value: 30, critChance: 0.30, price: 10000, icon: '🔨', description: 'Legendary admin power.', requiredEnemy: 'procrastination_specter' },

    // ========== ARMOR (Armory) ==========
    'leather_vest': { id: 'leather_vest', name: 'Leather Vest', type: 'armor', rarity: 'common', shopCategory: 'armory', value: 3, price: 400, icon: '🧥', description: 'Basic protection.' },
    'iron_plate': { id: 'iron_plate', name: 'Iron Plate', type: 'armor', rarity: 'rare', shopCategory: 'armory', value: 10, price: 1800, icon: '🛡️', description: 'Solid defense.', requiredEnemy: 'stress_phantom' },
    'mage_robe': { id: 'mage_robe', name: 'Mage Robe', type: 'armor', rarity: 'epic', shopCategory: 'armory', value: 5, price: 2500, icon: '👘', description: 'Light but mystical.', requiredEnemy: 'insomnia_echo' },
    'knight_helm': { id: 'knight_helm', name: 'Knight Helm', type: 'armor', rarity: 'rare', shopCategory: 'armory', value: 6, price: 1200, icon: '⛑️', description: 'Protects your head.' },

    // ========== PET GEAR (Armory) ==========
    'pet_collar': { id: 'pet_collar', name: 'Spiked Collar', type: 'pet_gear', rarity: 'common', shopCategory: 'armory', value: 2, price: 300, icon: '📿', description: 'Your pet looks fierce.', requiredEnemy: 'sedentary_colossus' },
    'pet_vest': { id: 'pet_vest', name: 'Pet Battle Vest', type: 'pet_gear', rarity: 'rare', shopCategory: 'armory', value: 5, price: 800, icon: '🦺', description: 'Protection for your companion.', requiredEnemy: 'sedentary_colossus' },

    // ========== CONSUMABLES (First Aid) ==========
    'health_potion': { id: 'health_potion', name: 'Health Potion', type: 'potion', rarity: 'common', shopCategory: 'first_aid', value: 30, price: 150, icon: '🧪', description: 'Restores 30 HP.' },
    'mega_potion': { id: 'mega_potion', name: 'Mega Potion', type: 'potion', rarity: 'rare', shopCategory: 'first_aid', value: 75, price: 400, icon: '⚗️', description: 'Restores 75 HP.' },
    'antidote': { id: 'antidote', name: 'Antidote', type: 'potion', rarity: 'common', shopCategory: 'first_aid', value: 0, price: 100, icon: '💊', description: 'Cures poison.' },
    'energy_drink': { id: 'energy_drink', name: 'Energy Drink', type: 'potion', rarity: 'common', shopCategory: 'first_aid', value: 50, price: 200, icon: '🥤', description: 'Restores energy.' },

    // ========== PET FOOD (General/Home) ==========
    'apple': { id: 'apple', name: 'Magic Apple', type: 'food', rarity: 'common', shopCategory: 'general', value: 20, price: 50, icon: '🍎' },
    'sushi': { id: 'sushi', name: 'Pixel Sushi', type: 'food', rarity: 'rare', shopCategory: 'general', value: 40, price: 120, icon: '🍣' },
    'ball': { id: 'ball', name: 'Bouncy Ball', type: 'toy', rarity: 'common', shopCategory: 'general', value: 15, price: 80, icon: '🥎' },

    // ========== GACHA ==========
    'gacha_ticket': { id: 'gacha_ticket', name: 'Summon Ticket', type: 'ticket', rarity: 'rare', shopCategory: 'general', value: 0, price: 1000, icon: '🎫' },

    // ========== FURNITURE (Furniture Store) ==========
    'basic_bed': { id: 'basic_bed', name: 'Basic Bed', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 500, icon: '🛏️', description: 'A place to rest.', requiredEnemy: 'fatigue_wraith' },
    'fancy_bed': { id: 'fancy_bed', name: 'Fancy Bed', type: 'furniture', rarity: 'rare', shopCategory: 'furniture', value: 3, price: 1500, icon: '🛏️', description: 'Sleep in style.', requiredEnemy: 'insomnia_echo' },
    'desk': { id: 'desk', name: 'Work Desk', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 400, icon: '🪑', description: 'For productivity.', requiredEnemy: 'chaos_of_clutter' },
    'lamp': { id: 'lamp', name: 'Cozy Lamp', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 200, icon: '🪔', description: 'Warm lighting.', requiredEnemy: 'fatigue_wraith' },
    'rug': { id: 'rug', name: 'Plush Rug', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 300, icon: '🟫', description: 'Soft on paws.', requiredEnemy: 'fatigue_wraith' },
    'poster': { id: 'poster', name: 'Cool Poster', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 150, icon: '🖼️', description: 'Decorate your walls.', requiredEnemy: 'chaos_of_clutter' },
    'plant': { id: 'plant', name: 'Potted Plant', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 250, icon: '🪴', description: 'Brings life to the room.', requiredEnemy: 'chaos_of_clutter' },
    'bookshelf': { id: 'bookshelf', name: 'Bookshelf', type: 'furniture', rarity: 'rare', shopCategory: 'furniture', value: 2, price: 800, icon: '📚', description: 'Store your knowledge.', requiredEnemy: 'procrastination_specter' },

    // ========== BOOKS (Library) ==========
    'fantasy_book_1': { id: 'fantasy_book_1', name: 'Fantasy Tome I', type: 'book', category: 'fantasy', level: 1, fusionRequired: 3, effect: '+2 Intelligence', rarity: 'common', shopCategory: 'library', value: 0, price: 0, icon: '📘' },
    'fantasy_book_2': { id: 'fantasy_book_2', name: 'Fantasy Tome II', type: 'book', category: 'fantasy', level: 2, fusionRequired: 3, effect: '+5 Intelligence', rarity: 'rare', shopCategory: 'library', value: 0, price: 0, icon: '📘' },
    'fantasy_book_3': { id: 'fantasy_book_3', name: 'Fantasy Tome III', type: 'book', category: 'fantasy', level: 3, fusionRequired: 0, effect: '+10 Intelligence', rarity: 'epic', shopCategory: 'library', value: 0, price: 0, icon: '📘' },

    'business_book_1': { id: 'business_book_1', name: 'Business Tome I', type: 'book', category: 'business', level: 1, fusionRequired: 3, effect: '+2 Intelligence, +5 Strategy XP', rarity: 'common', shopCategory: 'library', value: 0, price: 0, icon: '📓' },
    'business_book_2': { id: 'business_book_2', name: 'Business Tome II', type: 'book', category: 'business', level: 2, fusionRequired: 3, effect: '+5 Intelligence, +10 Strategy XP', rarity: 'rare', shopCategory: 'library', value: 0, price: 0, icon: '📓' },
    'business_book_3': { id: 'business_book_3', name: 'Business Tome III', type: 'book', category: 'business', level: 3, fusionRequired: 0, effect: '+10 Intelligence, +25 Strategy XP', rarity: 'epic', shopCategory: 'library', value: 0, price: 0, icon: '📓' },

    'self-improvement_book_1': { id: 'self-improvement_book_1', name: 'Self-Improvement Tome I', type: 'book', category: 'self-improvement', level: 1, fusionRequired: 3, effect: '+2 Intelligence', rarity: 'common', shopCategory: 'library', value: 0, price: 0, icon: '📒' },
    'self-improvement_book_2': { id: 'self-improvement_book_2', name: 'Self-Improvement Tome II', type: 'book', category: 'self-improvement', level: 2, fusionRequired: 3, effect: '+5 Intelligence', rarity: 'rare', shopCategory: 'library', value: 0, price: 0, icon: '📒' },
    'self-improvement_book_3': { id: 'self-improvement_book_3', name: 'Self-Improvement Tome III', type: 'book', category: 'self-improvement', level: 3, fusionRequired: 0, effect: '+10 Intelligence', rarity: 'epic', shopCategory: 'library', value: 0, price: 0, icon: '📒' },

    'history_book_1': { id: 'history_book_1', name: 'History Tome I', type: 'book', category: 'history', level: 1, fusionRequired: 3, effect: '+2 Intelligence', rarity: 'common', shopCategory: 'library', value: 0, price: 0, icon: '📖' },
    'history_book_2': { id: 'history_book_2', name: 'History Tome II', type: 'book', category: 'history', level: 2, fusionRequired: 3, effect: '+5 Intelligence', rarity: 'rare', shopCategory: 'library', value: 0, price: 0, icon: '📖' },
    'history_book_3': { id: 'history_book_3', name: 'History Tome III', type: 'book', category: 'history', level: 3, fusionRequired: 0, effect: '+10 Intelligence', rarity: 'epic', shopCategory: 'library', value: 0, price: 0, icon: '📖' },

    'philosophy_book_1': { id: 'philosophy_book_1', name: 'Philosophy Tome I', type: 'book', category: 'philosophy', level: 1, fusionRequired: 3, effect: '+2 Intelligence', rarity: 'common', shopCategory: 'library', value: 0, price: 0, icon: '📚' },
    'philosophy_book_2': { id: 'philosophy_book_2', name: 'Philosophy Tome II', type: 'book', category: 'philosophy', level: 2, fusionRequired: 3, effect: '+5 Intelligence', rarity: 'rare', shopCategory: 'library', value: 0, price: 0, icon: '📚' },
    'philosophy_book_3': { id: 'philosophy_book_3', name: 'Philosophy Tome III', type: 'book', category: 'philosophy', level: 3, fusionRequired: 0, effect: '+10 Intelligence', rarity: 'epic', shopCategory: 'library', value: 0, price: 0, icon: '📚' },
});

export type EquipmentSlot = 'weapon' | 'armor' | 'relic' | 'artifact' | 'pet';

interface InventoryState {
    items: { [itemId: string]: number };
    equipped: Record<EquipmentSlot, string | null>;

    // Marketplace items (from ITEM_DATABASE)
    marketplaceOwned: string[];
    marketplaceEquippedArmor: string | null;
    marketplaceEquippedWeapon: string | null;

    discoveredItems: string[];

    addItem: (itemId: string, amount?: number) => void;
    removeItem: (itemId: string, amount?: number) => void;
    equipItem: (itemId: string, slot: EquipmentSlot) => void;
    unequipItem: (slot: EquipmentSlot) => void;
    getStatBonus: (stat: 'attack' | 'defense') => number;
    getEquippedWeapon: () => ItemDef | null;

    // Marketplace functions
    purchaseMarketplaceItem: (itemId: string) => boolean;
    ownsMarketplaceItem: (itemId: string) => boolean;
    equipMarketplaceArmor: (itemId: string | null) => void;
    equipMarketplaceWeapon: (itemId: string | null) => void;
    getMarketplaceAttackBonus: () => number;
    getMarketplaceDefenseBonus: () => number;
    getMarketplaceXpBonuses: () => Partial<Record<SkillName, number>>;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set, get) => ({
            items: {},
            equipped: { weapon: null, armor: null, relic: null, artifact: null, pet: null },

            // Marketplace state
            marketplaceOwned: ['pet_cow', 'wooden_stick'],
            marketplaceEquippedArmor: null,
            marketplaceEquippedWeapon: 'wooden_stick',

            discoveredItems: [],

            addItem: (itemId, amount = 1) =>
                set((state) => ({
                    items: {
                        ...state.items,
                        [itemId]: (state.items[itemId] || 0) + amount,
                    },
                    discoveredItems: state.discoveredItems?.includes(itemId)
                        ? state.discoveredItems
                        : [...(state.discoveredItems || []), itemId],
                })),

            removeItem: (itemId, amount = 1) =>
                set((state) => {
                    const newCount = (state.items[itemId] || 0) - amount;
                    const newItems = { ...state.items };
                    if (newCount <= 0) delete newItems[itemId];
                    else newItems[itemId] = newCount;
                    return { items: newItems };
                }),

            equipItem: (itemId, slot) => {
                if (slot !== 'pet') {
                    const item = ITEM_DB[itemId];
                    if (!item) return; // Must exist
                    // Validate types
                    if (slot === 'weapon' && item.type !== 'weapon') return;
                    if (slot === 'armor' && item.type !== 'armor') return;
                    if (slot === 'relic' && item.type !== 'relic') return;
                    if (slot === 'artifact' && item.type !== 'artifact') return;
                }

                set((state) => ({
                    equipped: { ...state.equipped, [slot]: itemId }
                }));
            },

            unequipItem: (slot) =>
                set((state) => ({
                    equipped: { ...state.equipped, [slot]: null }
                })),

            getStatBonus: (stat) => {
                const { equipped } = get();
                let bonus = 0;

                Object.values(equipped).forEach(itemId => {
                    if (itemId && ITEM_DB[itemId]) {
                        const item = ITEM_DB[itemId];
                        if (stat === 'attack' && item.type === 'weapon') bonus += item.value;
                        if (stat === 'defense' && item.type === 'armor') bonus += item.value;
                    }
                });
                return bonus;
            },

            getEquippedWeapon: () => {
                const { equipped } = get();
                const weaponId = equipped.weapon;
                if (weaponId && ITEM_DB[weaponId]) {
                    return ITEM_DB[weaponId];
                }
                return null;
            },

            // ========== MARKETPLACE FUNCTIONS ==========

            purchaseMarketplaceItem: (itemId: string) => {
                const item = ITEM_DATABASE[itemId];
                if (!item) return false;

                // Check if already owned (except consumables)
                if (item.type !== 'consumable' && get().marketplaceOwned.includes(itemId)) {
                    return false;
                }

                // Spend currency
                const currencyStore = useCurrencyStore.getState();
                if (!currencyStore.spendCurrency(item.cost)) {
                    return false;
                }

                // Add to owned items
                set((state) => ({
                    marketplaceOwned: [...state.marketplaceOwned, itemId],
                }));

                // Auto-equip if better than current
                if (item.type === 'armor') {
                    const currentArmor = get().marketplaceEquippedArmor;
                    const currentDef = currentArmor
                        ? ITEM_DATABASE[currentArmor]?.stats?.defense || 0
                        : 0;
                    const newDef = item.stats?.defense || 0;
                    if (newDef > currentDef) {
                        set({ marketplaceEquippedArmor: itemId });
                    }
                } else if (item.type === 'weapon') {
                    const currentWeapon = get().marketplaceEquippedWeapon;
                    const currentAtk = currentWeapon
                        ? ITEM_DATABASE[currentWeapon]?.stats?.attack || 0
                        : 0;
                    const newAtk = item.stats?.attack || 0;
                    if (newAtk > currentAtk) {
                        set({ marketplaceEquippedWeapon: itemId });
                    }
                }

                return true;
            },

            ownsMarketplaceItem: (itemId: string) => {
                return get().marketplaceOwned.includes(itemId);
            },

            equipMarketplaceArmor: (itemId: string | null) => {
                if (itemId === null || get().marketplaceOwned.includes(itemId)) {
                    set({ marketplaceEquippedArmor: itemId });
                }
            },

            equipMarketplaceWeapon: (itemId: string | null) => {
                if (itemId === null || get().marketplaceOwned.includes(itemId)) {
                    set({ marketplaceEquippedWeapon: itemId });
                }
            },

            getMarketplaceAttackBonus: () => {
                const weaponId = get().marketplaceEquippedWeapon;
                if (!weaponId) return 0;
                return ITEM_DATABASE[weaponId]?.stats?.attack || 0;
            },

            getMarketplaceDefenseBonus: () => {
                const armorId = get().marketplaceEquippedArmor;
                if (!armorId) return 0;
                return ITEM_DATABASE[armorId]?.stats?.defense || 0;
            },

            getMarketplaceXpBonuses: () => {
                const bonuses: Partial<Record<SkillName, number>> = {};
                const state = get();

                // Aggregate XP bonuses from all owned furniture
                for (const itemId of state.marketplaceOwned) {
                    const item = ITEM_DATABASE[itemId];
                    if (item?.type === 'furniture' && item?.stats?.bonusXp) {
                        for (const [skill, bonus] of Object.entries(item.stats.bonusXp)) {
                            bonuses[skill as SkillName] = (bonuses[skill as SkillName] || 0) + bonus;
                        }
                    }
                }

                // Add bonuses from equipped armor
                const armor = state.marketplaceEquippedArmor ? ITEM_DATABASE[state.marketplaceEquippedArmor] : null;
                if (armor?.stats?.bonusXp) {
                    for (const [skill, bonus] of Object.entries(armor.stats.bonusXp)) {
                        bonuses[skill as SkillName] = (bonuses[skill as SkillName] || 0) + bonus;
                    }
                }

                return bonuses;
            },
        }),
        {
            name: PERSIST_REGISTRY.inventory.persistKey, // Reset for economy overhaul
        }
    )
);
