import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../utils/safeStorage';

console.log('[BOOT] useInventoryStore module load started');
import { ITEM_DATABASE } from '../data/items';
import { useCurrencyStore } from './useCurrencyStore';
import type { SkillName } from './useGameStore';

export type ItemType = 'food' | 'toy' | 'potion' | 'weapon' | 'armor' | 'pet_gear' | 'ticket' | 'furniture' | 'book' | 'relic' | 'artifact' | 'jewelry' | 'pet_accessory';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ShopCategory = 'blacksmith' | 'armory' | 'first_aid' | 'general' | 'furniture' | 'library' | 'jeweler';

/** Structured stat bonuses — used instead of (or alongside) the legacy `effect` string */
export interface ItemStatBonuses {
    attack?: number;
    defense?: number;
    hp?: number;
    crit?: number;           // Flat crit chance bonus in percentage points (e.g. 5 = +5%)
    xpMultiplier?: number;   // Percentage bonus to XP gains (e.g. 10 = +10%)
    goldMultiplier?: number; // Percentage bonus to gold gains
    goldDiscount?: number;   // Percentage discount in shops (from Commerce tomes)
    intelligence?: number;   // Intelligence skill bonus
    strategy?: number;       // Strategy XP bonus
    maxMana?: number;        // Max mana/MP bonus (from Fantasy tomes)
    habitBonus?: number;     // Flat Habit skill bonus (from Discipline tomes)
}

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
    flavorText?: string;    // Lore text for display

    // Book specific fields
    category?: 'fantasy' | 'business' | 'self-improvement' | 'history' | 'philosophy';
    level?: number;
    fusionRequired?: number;
    effect?: string;
    source?: string;

    // Structured stat bonuses (used alongside or instead of effect string)
    statBonuses?: ItemStatBonuses;
}

import { mergeExternalItems } from '../data/contentLoader';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export const ITEM_DB: Record<string, ItemDef> = mergeExternalItems({
    // ========== WEAPONS (Blacksmith) ==========
    'rusty_sword': { id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 5, critChance: 0.05, price: 500, icon: '🗡️', description: 'A basic blade. Better than fists.', statBonuses: { attack: 5, crit: 5 } },
    'iron_axe': { id: 'iron_axe', name: 'Iron Axe', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 8, critChance: 0.10, price: 800, icon: '🪓', description: 'Heavy and brutal.', statBonuses: { attack: 8, crit: 10 } },
    'battle_axe': { id: 'battle_axe', name: 'Battle Axe', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 15, critChance: 0.15, price: 2000, icon: '⚔️', description: 'Two-handed devastation.', requiredEnemy: 'stress_phantom', statBonuses: { attack: 15, crit: 15 } },
    'spear': { id: 'spear', name: 'Spear', type: 'weapon', rarity: 'common', shopCategory: 'blacksmith', value: 10, critChance: 0.08, price: 1200, icon: '🔱', description: 'Reach advantage.', statBonuses: { attack: 10, crit: 8 } },
    'mace': { id: 'mace', name: 'Mace', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 12, critChance: 0.20, price: 1500, icon: '🔨', description: 'Crushing blows.', statBonuses: { attack: 12, crit: 20 } },
    'whip': { id: 'whip', name: 'Whip', type: 'weapon', rarity: 'rare', shopCategory: 'blacksmith', value: 6, critChance: 0.25, price: 900, icon: '〰️', description: 'High crit, low base damage.', statBonuses: { attack: 6, crit: 25 } },
    'ban_hammer': { id: 'ban_hammer', name: 'The Ban Hammer', type: 'weapon', rarity: 'legendary', shopCategory: 'blacksmith', value: 30, critChance: 0.30, price: 10000, icon: '🔨', description: 'Legendary admin power.', requiredEnemy: 'procrastination_specter', statBonuses: { attack: 30, crit: 30 } },

    // ========== ARMOR (Armory) ==========
    'leather_vest': { id: 'leather_vest', name: 'Leather Vest', type: 'armor', rarity: 'common', shopCategory: 'armory', value: 3, price: 400, icon: '🧥', description: 'Basic protection.', statBonuses: { defense: 3, hp: 10 } },
    'iron_plate': { id: 'iron_plate', name: 'Iron Plate', type: 'armor', rarity: 'rare', shopCategory: 'armory', value: 10, price: 1800, icon: '🛡️', description: 'Solid defense.', requiredEnemy: 'stress_phantom', statBonuses: { defense: 10, hp: 25 } },
    'mage_robe': { id: 'mage_robe', name: 'Mage Robe', type: 'armor', rarity: 'epic', shopCategory: 'armory', value: 5, price: 2500, icon: '👘', description: 'Light but mystical.', requiredEnemy: 'insomnia_echo', statBonuses: { defense: 5, xpMultiplier: 10, intelligence: 5 } },
    'knight_helm': { id: 'knight_helm', name: 'Knight Helm', type: 'armor', rarity: 'rare', shopCategory: 'armory', value: 6, price: 1200, icon: '⛑️', description: 'Protects your head.', statBonuses: { defense: 6, hp: 15 } },

    // ========== PET GEAR (Armory) ==========
    'pet_collar': { id: 'pet_collar', name: 'Spiked Collar', type: 'pet_gear', rarity: 'common', shopCategory: 'armory', value: 2, price: 300, icon: '📿', description: 'Your pet looks fierce.', requiredEnemy: 'sedentary_colossus' },
    'pet_vest': { id: 'pet_vest', name: 'Pet Battle Vest', type: 'pet_gear', rarity: 'rare', shopCategory: 'armory', value: 5, price: 800, icon: '🦺', description: 'Protection for your companion.', requiredEnemy: 'sedentary_colossus' },

    // ========== JEWELRY (Jeweler) ==========
    'iron_ring': {
        id: 'iron_ring', name: 'Iron Ring', type: 'jewelry', rarity: 'common', shopCategory: 'jeweler',
        value: 3, price: 350, icon: '💍', description: 'A simple iron band.',
        flavorText: 'Soldiers wear these for luck.',
        statBonuses: { attack: 3 },
    },
    'silver_band': {
        id: 'silver_band', name: 'Silver Band', type: 'jewelry', rarity: 'rare', shopCategory: 'jeweler',
        value: 5, price: 1200, icon: '🪙', description: 'Finely crafted silver.',
        flavorText: 'Popular among adventurers.',
        statBonuses: { attack: 5, defense: 3 },
    },
    'gold_chain': {
        id: 'gold_chain', name: 'Gold Chain', type: 'jewelry', rarity: 'rare', shopCategory: 'jeweler',
        value: 0, price: 1500, icon: '⛓️', description: 'Heavy links of pure gold.',
        flavorText: 'Wealth and power combined.',
        statBonuses: { goldMultiplier: 8 },
    },
    'emerald_pendant': {
        id: 'emerald_pendant', name: 'Emerald Pendant', type: 'jewelry', rarity: 'epic', shopCategory: 'jeweler',
        value: 0, price: 4000, icon: '💚', description: 'A pendant set with a polished emerald.',
        flavorText: 'Grants wisdom to its wearer.',
        statBonuses: { defense: 10, xpMultiplier: 10, intelligence: 3 },
    },
    'ruby_signet': {
        id: 'ruby_signet', name: 'Ruby Signet Ring', type: 'jewelry', rarity: 'legendary', shopCategory: 'jeweler',
        value: 0, price: 12000, icon: '❤️‍🔥', description: 'An ancient signet ring blazing with crimson fire.',
        flavorText: 'Said to have belonged to a warrior king.',
        statBonuses: { attack: 15, defense: 10, crit: 10 },
    },

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
    'basic_bed': { id: 'basic_bed', name: 'Basic Bed', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 2, price: 500, icon: '🛏️', description: 'A place to rest.', requiredEnemy: 'fatigue_wraith' },
    'fancy_bed': { id: 'fancy_bed', name: 'Fancy Bed', type: 'furniture', rarity: 'rare', shopCategory: 'furniture', value: 3, price: 1500, icon: '🛏️', description: 'Sleep in style.', requiredEnemy: 'insomnia_echo' },
    'desk': { id: 'desk', name: 'Work Desk', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 400, icon: '🪑', description: 'For productivity.', requiredEnemy: 'chaos_of_clutter' },
    'lamp': { id: 'lamp', name: 'Cozy Lamp', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 200, icon: '🪔', description: 'Warm lighting.', requiredEnemy: 'fatigue_wraith' },
    'rug': { id: 'rug', name: 'Plush Rug', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 300, icon: '🟫', description: 'Soft on paws.', requiredEnemy: 'fatigue_wraith' },
    'poster': { id: 'poster', name: 'Cool Poster', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 150, icon: '🖼️', description: 'Decorate your walls.', requiredEnemy: 'chaos_of_clutter' },
    'plant': { id: 'plant', name: 'Potted Plant', type: 'furniture', rarity: 'common', shopCategory: 'furniture', value: 1, price: 250, icon: '🪴', description: 'Brings life to the room.', requiredEnemy: 'chaos_of_clutter' },
    'bookshelf': { id: 'bookshelf', name: 'Bookshelf', type: 'furniture', rarity: 'rare', shopCategory: 'furniture', value: 2, price: 800, icon: '📚', description: 'Store your knowledge.', requiredEnemy: 'procrastination_specter' },

    // ========== BOOKS / TOMES (Library) — equippable for persistent passive ==========
    // --- Fantasy Tomes (Max Mana, Purple) ---
    'fantasy_tome_1': { id: 'fantasy_tome_1', name: 'Fantasy Tome I',   type: 'book', category: 'fantasy', level: 1, fusionRequired: 3, effect: '+2 Max Mana',  rarity: 'common',    shopCategory: 'library', value: 0, price: 0, icon: '📘', statBonuses: { maxMana: 2 } },
    'fantasy_tome_2': { id: 'fantasy_tome_2', name: 'Fantasy Tome II',  type: 'book', category: 'fantasy', level: 2, fusionRequired: 3, effect: '+8 Max Mana',  rarity: 'rare',      shopCategory: 'library', value: 0, price: 0, icon: '📘', statBonuses: { maxMana: 8 } },
    'fantasy_tome_3': { id: 'fantasy_tome_3', name: 'Fantasy Tome III', type: 'book', category: 'fantasy', level: 3, fusionRequired: 3, effect: '+25 Max Mana', rarity: 'epic',      shopCategory: 'library', value: 0, price: 0, icon: '📘', statBonuses: { maxMana: 25 } },
    'fantasy_tome_4': { id: 'fantasy_tome_4', name: 'Fantasy Tome IV',  type: 'book', category: 'fantasy', level: 4, fusionRequired: 3, effect: '+70 Max Mana', rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📘', statBonuses: { maxMana: 70 } },
    'fantasy_tome_5': { id: 'fantasy_tome_5', name: 'Fantasy Tome V',   type: 'book', category: 'fantasy', level: 5, fusionRequired: 0, effect: '+150 Max Mana',rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📘', statBonuses: { maxMana: 150 } },

    // --- Discipline Tomes (Habit Building, Gold) ---
    'discipline_tome_1': { id: 'discipline_tome_1', name: 'Discipline Tome I',   type: 'book', category: 'self-improvement', level: 1, fusionRequired: 3, effect: '+1 Habit',  rarity: 'common',    shopCategory: 'library', value: 0, price: 0, icon: '📒', statBonuses: { habitBonus: 1 } },
    'discipline_tome_2': { id: 'discipline_tome_2', name: 'Discipline Tome II',  type: 'book', category: 'self-improvement', level: 2, fusionRequired: 3, effect: '+3 Habit',  rarity: 'rare',      shopCategory: 'library', value: 0, price: 0, icon: '📒', statBonuses: { habitBonus: 3 } },
    'discipline_tome_3': { id: 'discipline_tome_3', name: 'Discipline Tome III', type: 'book', category: 'self-improvement', level: 3, fusionRequired: 3, effect: '+7 Habit',  rarity: 'epic',      shopCategory: 'library', value: 0, price: 0, icon: '📒', statBonuses: { habitBonus: 7 } },
    'discipline_tome_4': { id: 'discipline_tome_4', name: 'Discipline Tome IV',  type: 'book', category: 'self-improvement', level: 4, fusionRequired: 3, effect: '+15 Habit', rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📒', statBonuses: { habitBonus: 15 } },
    'discipline_tome_5': { id: 'discipline_tome_5', name: 'Discipline Tome V',   type: 'book', category: 'self-improvement', level: 5, fusionRequired: 0, effect: '+30 Habit', rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📒', statBonuses: { habitBonus: 30 } },

    // --- Commerce Tomes (Gold Rewards %, Green) ---
    'commerce_tome_1': { id: 'commerce_tome_1', name: 'Commerce Tome I',   type: 'book', category: 'business', level: 1, fusionRequired: 3, effect: '+2% Gold',  rarity: 'common',    shopCategory: 'library', value: 0, price: 0, icon: '📓', statBonuses: { goldMultiplier: 2 } },
    'commerce_tome_2': { id: 'commerce_tome_2', name: 'Commerce Tome II',  type: 'book', category: 'business', level: 2, fusionRequired: 3, effect: '+5% Gold',  rarity: 'rare',      shopCategory: 'library', value: 0, price: 0, icon: '📓', statBonuses: { goldMultiplier: 5 } },
    'commerce_tome_3': { id: 'commerce_tome_3', name: 'Commerce Tome III', type: 'book', category: 'business', level: 3, fusionRequired: 3, effect: '+10% Gold', rarity: 'epic',      shopCategory: 'library', value: 0, price: 0, icon: '📓', statBonuses: { goldMultiplier: 10 } },
    'commerce_tome_4': { id: 'commerce_tome_4', name: 'Commerce Tome IV',  type: 'book', category: 'business', level: 4, fusionRequired: 3, effect: '+18% Gold', rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📓', statBonuses: { goldMultiplier: 18 } },
    'commerce_tome_5': { id: 'commerce_tome_5', name: 'Commerce Tome V',   type: 'book', category: 'business', level: 5, fusionRequired: 0, effect: '+30% Gold', rarity: 'legendary', shopCategory: 'library', value: 0, price: 0, icon: '📓', statBonuses: { goldMultiplier: 30 } },
});

export const getItemById = (id: string | null | undefined): (ItemDef | any) => {
    if (!id) return null;
    return ITEM_DATABASE[id] ?? ITEM_DB[id] ?? null;
};

export type EquipmentSlot = 'weapon' | 'armor' | 'relic' | 'artifact' | 'pet' | 'pet_accessory' | 'book' | 'jewelry';

/** Returns a summary string of the stat bonuses for display */
export function formatStatBonuses(bonuses: ItemStatBonuses | undefined): string {
    if (!bonuses) return '';
    const parts: string[] = [];
    if (bonuses.attack) parts.push(`+${bonuses.attack} ATK`);
    if (bonuses.defense) parts.push(`+${bonuses.defense} DEF`);
    if (bonuses.hp) parts.push(`+${bonuses.hp} HP`);
    if (bonuses.crit) parts.push(`+${bonuses.crit}% Crit`);
    if (bonuses.xpMultiplier) parts.push(`+${bonuses.xpMultiplier}% XP`);
    if (bonuses.goldMultiplier) parts.push(`+${bonuses.goldMultiplier}% Gold`);
    if (bonuses.intelligence) parts.push(`+${bonuses.intelligence} INT`);
    if (bonuses.strategy) parts.push(`+${bonuses.strategy} STR XP`);
    return parts.join(' · ');
}

/** Returns the stat delta between two items (newItem - currentItem) */
export function getStatDelta(newItem: ItemDef | null, currentItem: ItemDef | null): ItemStatBonuses {
    const nB = newItem?.statBonuses ?? {};
    const cB = currentItem?.statBonuses ?? {};
    return {
        attack: (nB.attack ?? 0) - (cB.attack ?? 0),
        defense: (nB.defense ?? 0) - (cB.defense ?? 0),
        hp: (nB.hp ?? 0) - (cB.hp ?? 0),
        crit: (nB.crit ?? 0) - (cB.crit ?? 0),
        xpMultiplier: (nB.xpMultiplier ?? 0) - (cB.xpMultiplier ?? 0),
        goldMultiplier: (nB.goldMultiplier ?? 0) - (cB.goldMultiplier ?? 0),
        intelligence: (nB.intelligence ?? 0) - (cB.intelligence ?? 0),
        strategy: (nB.strategy ?? 0) - (cB.strategy ?? 0),
    };
}

interface InventoryState {
    items: { [itemId: string]: number };
    equipped: Record<EquipmentSlot, string | null>;

    // Marketplace items (from ITEM_DATABASE)
    marketplaceOwned: string[];

    discoveredItems: string[];

    // Cellar stash (locked items can't be sold)
    stashedItems: string[];

    addItem: (itemId: string, amount?: number) => void;
    removeItem: (itemId: string, amount?: number) => void;
    equipItem: (itemId: string, slot: EquipmentSlot) => void;
    unequipItem: (slot: EquipmentSlot) => void;
    fuseTomes: (itemId: string) => boolean;
    getStatBonus: (stat: 'attack' | 'defense') => number;
    getEquippedWeapon: () => ItemDef | null;
    getEquippedItemForSlot: (slot: EquipmentSlot) => ItemDef | null;

    // Marketplace functions
    purchaseMarketplaceItem: (itemId: string) => boolean;
    ownsMarketplaceItem: (itemId: string) => boolean;
    getMarketplaceXpBonuses: () => Partial<Record<SkillName, number>>;

    // Cellar stash
    toggleStash: (itemId: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set, get) => ({
            items: {},
            equipped: {
                weapon: null,
                armor: null,
                relic: null,
                artifact: null,
                pet: null,
                pet_accessory: null,
                book: null,
                jewelry: null,
            },

            // Marketplace state
            marketplaceOwned: ['pet_cow', 'wooden_stick'],

            discoveredItems: [],
            stashedItems: [],

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
                    const item = getItemById(itemId);
                    if (!item) return;
                    // Type → slot validation
                    if (slot === 'weapon' && item.type !== 'weapon') return;
                    if (slot === 'armor' && item.type !== 'armor') return;
                    if (slot === 'relic' && item.type !== 'relic') return;
                    if (slot === 'artifact' && item.type !== 'artifact') return;
                    if (slot === 'book' && item.type !== 'book') return;
                    if (slot === 'jewelry' && item.type !== 'jewelry') return;
                    if (slot === 'pet_accessory' && (item.type !== 'pet_accessory' && item.type !== 'pet_gear')) return;
                }

                set((state) => ({
                    equipped: { ...state.equipped, [slot]: itemId }
                }));
            },

            unequipItem: (slot) =>
                set((state) => ({
                    equipped: { ...state.equipped, [slot]: null }
                })),

            fuseTomes: (itemId) => {
                const state = get();
                const itemDef = ITEM_DB[itemId];
                
                // Verify this is a fuseable book
                if (!itemDef || itemDef.type !== 'book' || !itemDef.category || !itemDef.level || !itemDef.fusionRequired) {
                    return false;
                }

                // Verify player has enough copies
                const count = state.items[itemId] || 0;
                if (count < itemDef.fusionRequired) {
                    return false;
                }

                // Find the next level tome in the same category
                const nextLevel = itemDef.level + 1;
                const nextTome = Object.values(ITEM_DB).find(
                    i => i.type === 'book' && i.category === itemDef.category && i.level === nextLevel
                );

                if (!nextTome) {
                    return false; // Already max level
                }

                // Execute fusion
                state.removeItem(itemId, itemDef.fusionRequired);
                state.addItem(nextTome.id, 1);
                
                return true;
            },

            getStatBonus: (stat) => {
                const { equipped } = get();
                let bonus = 0;

                Object.values(equipped).forEach(itemId => {
                    if (itemId) {
                        const item = getItemById(itemId);
                        if (item) {
                            if (stat === 'attack') {
                                bonus += item.statBonuses?.attack ?? item.stats?.attack ?? (item.type === 'weapon' ? item.value : 0);
                            }
                            if (stat === 'defense') {
                                bonus += item.statBonuses?.defense ?? item.stats?.defense ?? (item.type === 'armor' ? item.value : 0);
                            }
                        }
                    }
                });
                return bonus;
            },

            getEquippedWeapon: () => {
                const { equipped } = get();
                const weaponId = equipped.weapon;
                if (weaponId) {
                    return getItemById(weaponId);
                }
                return null;
            },

            getEquippedItemForSlot: (slot) => {
                const { equipped } = get();
                const itemId = equipped[slot];
                if (!itemId) return null;
                return getItemById(itemId);
            },

            // ========== MARKETPLACE FUNCTIONS ==========

            purchaseMarketplaceItem: (itemId: string) => {
                const item = ITEM_DATABASE[itemId];
                if (!item) return false;

                if (item.type !== 'consumable' && get().marketplaceOwned.includes(itemId)) {
                    return false;
                }

                const currencyStore = useCurrencyStore.getState();
                if (!currencyStore.spendCurrency(item.cost)) {
                    return false;
                }

                set((state) => ({
                    marketplaceOwned: [...state.marketplaceOwned, itemId],
                }));
                get().addItem(itemId, 1);

                // Auto-equip if slot is empty, or unconditionally to help user notice newly bought gear.
                if (item.type === 'armor') {
                    get().equipItem(itemId, 'armor');
                } else if (item.type === 'weapon') {
                    get().equipItem(itemId, 'weapon');
                } else if (item.type === 'jewelry') {
                    if (!get().equipped.jewelry) get().equipItem(itemId, 'jewelry');
                } else if (item.type === 'pet_accessory') {
                    if (!get().equipped.pet_accessory) get().equipItem(itemId, 'pet_accessory');
                }

                return true;
            },

            ownsMarketplaceItem: (itemId: string) => {
                return get().marketplaceOwned.includes(itemId);
            },

            getMarketplaceXpBonuses: () => {
                const bonuses: Partial<Record<SkillName, number>> = {};
                const state = get();

                for (const itemId of state.marketplaceOwned) {
                    const item = ITEM_DATABASE[itemId];
                    if (item?.type === 'furniture' && item?.stats?.bonusXp) {
                        for (const [skill, bonus] of Object.entries(item.stats.bonusXp)) {
                            if (typeof bonus === 'number') {
                                bonuses[skill as SkillName] = (bonuses[skill as SkillName] || 0) + bonus;
                            }
                        }
                    }
                }

                const armor = state.equipped.armor ? getItemById(state.equipped.armor) : null;
                if (armor?.stats?.bonusXp) {
                    for (const [skill, bonus] of Object.entries(armor.stats.bonusXp)) {
                        if (typeof bonus === 'number') {
                            bonuses[skill as SkillName] = (bonuses[skill as SkillName] || 0) + bonus;
                        }
                    }
                }

                return bonuses;
            },

            toggleStash: (itemId) => {
                set(s => ({
                    stashedItems: s.stashedItems.includes(itemId)
                        ? s.stashedItems.filter(id => id !== itemId)
                        : [...s.stashedItems, itemId],
                }));
            },
        }),
        {
            name: PERSIST_REGISTRY.inventory.persistKey,
            storage: createJSONStorage(() => safeStorage),
            // Forward-compat migration: merge new slots into any existing saves
            merge: (persisted: unknown, current) => {
                const p = persisted as Partial<InventoryState>;
                return {
                    ...current,
                    ...p,
                    equipped: {
                        weapon: null,
                        armor: null,
                        relic: null,
                        artifact: null,
                        pet: null,
                        pet_accessory: null,
                        book: null,
                        jewelry: null,
                        ...(p.equipped ?? {}),
                    },
                };
            },
            onRehydrateStorage: () => () => {
                console.log('[BOOT] useInventoryStore hydration finished');
            }
        }
    )
);

console.log('[BOOT] useInventoryStore module load finished');
