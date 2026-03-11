import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface Equipment {
    id: string;
    name: string;
    icon: string;
    rarity: EquipmentRarity;
    slot: EquipmentSlot;
    atkBonus: number;
    defBonus: number;
    hpBonus: number;
    description: string;
}

// Equipment Database
export const EQUIPMENT_DB: Record<string, Equipment> = {
    // COMMON WEAPONS (80% drop rate pool)
    'wooden_sword': {
        id: 'wooden_sword', name: 'Wooden Sword', icon: '🗡️',
        rarity: 'common', slot: 'weapon',
        atkBonus: 2, defBonus: 0, hpBonus: 0,
        description: 'A simple training sword.'
    },
    'iron_dagger': {
        id: 'iron_dagger', name: 'Iron Dagger', icon: '🔪',
        rarity: 'common', slot: 'weapon',
        atkBonus: 3, defBonus: 0, hpBonus: 0,
        description: 'Quick and light.'
    },
    'leather_armor': {
        id: 'leather_armor', name: 'Leather Armor', icon: '🦺',
        rarity: 'common', slot: 'armor',
        atkBonus: 0, defBonus: 2, hpBonus: 5,
        description: 'Basic protection.'
    },
    'cloth_robe': {
        id: 'cloth_robe', name: 'Cloth Robe', icon: '👘',
        rarity: 'common', slot: 'armor',
        atkBonus: 0, defBonus: 1, hpBonus: 10,
        description: 'Comfortable and light.'
    },
    'lucky_coin': {
        id: 'lucky_coin', name: 'Lucky Coin', icon: '🪙',
        rarity: 'common', slot: 'accessory',
        atkBonus: 1, defBonus: 1, hpBonus: 0,
        description: 'A bit of extra luck.'
    },

    // RARE EQUIPMENT (15% drop rate pool)
    'steel_sword': {
        id: 'steel_sword', name: 'Steel Sword', icon: '⚔️',
        rarity: 'rare', slot: 'weapon',
        atkBonus: 5, defBonus: 0, hpBonus: 0,
        description: 'A reliable blade.'
    },
    'battle_axe': {
        id: 'battle_axe', name: 'Battle Axe', icon: '🪓',
        rarity: 'rare', slot: 'weapon',
        atkBonus: 7, defBonus: -1, hpBonus: 0,
        description: 'Heavy but powerful.'
    },
    'chainmail': {
        id: 'chainmail', name: 'Chainmail', icon: '🔗',
        rarity: 'rare', slot: 'armor',
        atkBonus: 0, defBonus: 5, hpBonus: 10,
        description: 'Interlocking rings of steel.'
    },
    'health_amulet': {
        id: 'health_amulet', name: 'Health Amulet', icon: '📿',
        rarity: 'rare', slot: 'accessory',
        atkBonus: 0, defBonus: 2, hpBonus: 20,
        description: 'Pulses with vitality.'
    },
    'power_ring': {
        id: 'power_ring', name: 'Power Ring', icon: '💍',
        rarity: 'rare', slot: 'accessory',
        atkBonus: 4, defBonus: 0, hpBonus: 0,
        description: 'Enhances your strength.'
    },

    // EPIC EQUIPMENT (5% drop rate pool)
    'dragon_blade': {
        id: 'dragon_blade', name: 'Dragon Blade', icon: '🐉',
        rarity: 'epic', slot: 'weapon',
        atkBonus: 12, defBonus: 0, hpBonus: 0,
        description: 'Forged in dragonfire.'
    },
    'crystal_staff': {
        id: 'crystal_staff', name: 'Crystal Staff', icon: '🔮',
        rarity: 'epic', slot: 'weapon',
        atkBonus: 10, defBonus: 3, hpBonus: 0,
        description: 'Channels arcane power.'
    },
    'plate_armor': {
        id: 'plate_armor', name: 'Plate Armor', icon: '🛡️',
        rarity: 'epic', slot: 'armor',
        atkBonus: 0, defBonus: 10, hpBonus: 25,
        description: 'Heavy and impenetrable.'
    },
    'phoenix_feather': {
        id: 'phoenix_feather', name: 'Phoenix Feather', icon: '🪶',
        rarity: 'epic', slot: 'accessory',
        atkBonus: 5, defBonus: 5, hpBonus: 15,
        description: 'Burns with inner fire.'
    },

    // LEGENDARY EQUIPMENT (guaranteed at pity)
    'excalibur': {
        id: 'excalibur', name: 'Excalibur', icon: '✨',
        rarity: 'legendary', slot: 'weapon',
        atkBonus: 20, defBonus: 5, hpBonus: 0,
        description: 'The legendary holy sword.'
    },
    'aegis_shield': {
        id: 'aegis_shield', name: 'Aegis Shield', icon: '🏛️',
        rarity: 'legendary', slot: 'armor',
        atkBonus: 0, defBonus: 20, hpBonus: 50,
        description: 'Divine protection.'
    },
    'infinity_gem': {
        id: 'infinity_gem', name: 'Infinity Gem', icon: '💎',
        rarity: 'legendary', slot: 'accessory',
        atkBonus: 10, defBonus: 10, hpBonus: 30,
        description: 'Power beyond measure.'
    },
};

// Pools by rarity
const COMMON_POOL = Object.values(EQUIPMENT_DB).filter(e => e.rarity === 'common').map(e => e.id);
const RARE_POOL = Object.values(EQUIPMENT_DB).filter(e => e.rarity === 'rare').map(e => e.id);
const EPIC_POOL = Object.values(EQUIPMENT_DB).filter(e => e.rarity === 'epic').map(e => e.id);
const LEGENDARY_POOL = Object.values(EQUIPMENT_DB).filter(e => e.rarity === 'legendary').map(e => e.id);

interface EquipmentState {
    // Inventory
    ownedEquipment: string[];  // Equipment IDs
    equippedWeapon: string | null;
    equippedArmor: string | null;
    equippedAccessory: string | null;
    equipmentLevels: Record<string, number>;

    // Gacha
    equipmentPity: number;  // Counter for pity system
    essence: number;  // From duplicates

    // Actions
    pullEquipment: () => { item: Equipment; wasDuplicate: boolean; essenceGained: number } | null;
    equipItem: (equipmentId: string) => void;
    unequipSlot: (slot: EquipmentSlot) => void;
    upgradeEquipment: (equipmentId: string) => boolean;

    // Getters
    upgradeEquipment: (equipmentId: string) => {
                const state = get();
                if (!state.ownedEquipment.includes(equipmentId)) return false;
                const currentLevel = state.equipmentLevels[equipmentId] || 0;
                set({
                    equipmentLevels: {
                        ...state.equipmentLevels,
                        [equipmentId]: currentLevel + 1
                    }
                });
                return true;
            },

            getEquipmentBonuses: () => { atk: number; def: number; hp: number };
    getPityInfo: () => { current: number; nextGuaranteed: number };
}

export const useEquipmentStore = create<EquipmentState>()(
    persist(
        (set, get) => ({
            ownedEquipment: [],
            equippedWeapon: null,
            equippedArmor: null,
            equippedAccessory: null,
            equipmentLevels: {},
            equipmentPity: 0,
            essence: 0,

            pullEquipment: () => {
                const state = get();
                let pity = state.equipmentPity + 1;
                let rarity: EquipmentRarity;

                // Pity system: guaranteed Epic+ at 30 pulls
                if (pity >= 30) {
                    // 50/50 Epic or Legendary
                    rarity = Math.random() < 0.5 ? 'epic' : 'legendary';
                    pity = 0;
                } else {
                    // Normal rates: 80% Common, 15% Rare, 5% Epic
                    const roll = Math.random();
                    if (roll < 0.80) {
                        rarity = 'common';
                    } else if (roll < 0.95) {
                        rarity = 'rare';
                    } else {
                        rarity = 'epic';
                        pity = 0; // Reset pity on Epic pull
                    }
                }

                // Select from pool
                let pool: string[];
                switch (rarity) {
                    case 'legendary': pool = LEGENDARY_POOL; break;
                    case 'epic': pool = EPIC_POOL; break;
                    case 'rare': pool = RARE_POOL; break;
                    default: pool = COMMON_POOL;
                }

                const itemId = pool[Math.floor(Math.random() * pool.length)];
                const item = EQUIPMENT_DB[itemId];

                // Check for duplicate
                const wasDuplicate = state.ownedEquipment.includes(itemId);
                let essenceGained = 0;

                if (wasDuplicate) {
                    // Convert to essence based on rarity
                    switch (rarity) {
                        case 'legendary': essenceGained = 50; break;
                        case 'epic': essenceGained = 20; break;
                        case 'rare': essenceGained = 10; break;
                        default: essenceGained = 5;
                    }

                    set({
                        equipmentPity: pity,
                        essence: state.essence + essenceGained,
                    });
                } else {
                    set({
                        ownedEquipment: [...state.ownedEquipment, itemId],
                        equipmentPity: pity,
                    });
                }

                return { item, wasDuplicate, essenceGained };
            },

            equipItem: (equipmentId: string) => {
                const item = EQUIPMENT_DB[equipmentId];
                if (!item) return;

                const state = get();
                if (!state.ownedEquipment.includes(equipmentId)) return;

                switch (item.slot) {
                    case 'weapon':
                        set({ equippedWeapon: equipmentId });
                        break;
                    case 'armor':
                        set({ equippedArmor: equipmentId });
                        break;
                    case 'accessory':
                        set({ equippedAccessory: equipmentId });
                        break;
                }
            },

            unequipSlot: (slot: EquipmentSlot) => {
                switch (slot) {
                    case 'weapon':
                        set({ equippedWeapon: null });
                        break;
                    case 'armor':
                        set({ equippedArmor: null });
                        break;
                    case 'accessory':
                        set({ equippedAccessory: null });
                        break;
                }
            },

            getEquipmentBonuses: () => {
                const state = get();
                let atk = 0, def = 0, hp = 0;

                const equipped = [
                    state.equippedWeapon,
                    state.equippedArmor,
                    state.equippedAccessory,
                ].filter(Boolean) as string[];

                for (const id of equipped) {
                    const item = EQUIPMENT_DB[id];
                    const level = state.equipmentLevels[id] || 0;
                    if (item) {
                        const levelMult = 1 + (level * 0.10);
                        atk += Math.floor(item.atkBonus * levelMult);
                        def += Math.floor(item.defBonus * levelMult);
                        hp += Math.floor(item.hpBonus * levelMult);
                    }
                }

                return { atk, def, hp };
            },

            getPityInfo: () => {
                const state = get();
                return {
                    current: state.equipmentPity,
                    nextGuaranteed: 30 - state.equipmentPity,
                };
            },
        }),
        {
            name: PERSIST_REGISTRY.equipment.persistKey,
        }
    )
);
