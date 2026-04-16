import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { safeUUID } from '../utils/safeUUID';

export type BuffType =
    | 'xp_boost'
    | 'attack_boost'
    | 'defense_boost'
    | 'gold_boost'
    | 'stat_boost'       // From board: +% to specific stat
    | 'shop_discount';   // From board: % off purchases

export interface Buff {
    id: string;
    type: BuffType;
    value: number;          // Multiplier: 0.05 = +5%
    expiresAt: number;      // Unix timestamp
    name: string;
    icon: string;
    stat?: string;          // For stat_boost: which stat (Strength, etc.)
    extendedByCosmic?: boolean; // True if duration was extended by Mythic passives
}

interface BuffState {
    activeBuffs: Buff[];

    // Board effects (not time-based)
    doubleXpNextHabit: boolean;

    // Actions
    addBuff: (type: BuffType, value: number, durationHours: number, name?: string, stat?: string) => void;
    removeBuff: (id: string) => void;
    getActiveMultiplier: (type: BuffType) => number;
    getStatBoostMultiplier: (stat: string) => number;
    getShopDiscount: () => number;
    cleanExpiredBuffs: () => void;
    getActiveBuffs: () => Buff[];
    setDoubleXpNextHabit: (active: boolean) => void;
    consumeDoubleXp: () => boolean;
}

const BUFF_ICONS: Record<BuffType, string> = {
    'xp_boost': '📈',
    'attack_boost': '⚔️',
    'defense_boost': '🛡️',
    'gold_boost': '💰',
    'stat_boost': '💎',
    'shop_discount': '🏷️',
};

const BUFF_NAMES: Record<BuffType, string> = {
    'xp_boost': 'XP Boost',
    'attack_boost': 'Attack Boost',
    'defense_boost': 'Defense Boost',
    'gold_boost': 'Gold Boost',
    'stat_boost': 'Stat Boost',
    'shop_discount': 'Shop Discount',
};

export const useBuffStore = create<BuffState>()(
    persist(
        (set, get) => ({
            activeBuffs: [],
            doubleXpNextHabit: false,

            addBuff: (type, value, durationHours, name, stat) => {
                const id = safeUUID();
                
                // Cosmic Tortoise Integration: Extend duration by 15% uniquely on creation
                // Note: We only extend positive buffs (all current buffs are positive), 
                // and we mark it extendedByCosmic so subsequent logic doesn't recursive loop it if you had a refresh function.
                let finalDurationHours = durationHours;
                let extended = false;
                
                // Safe check against pet store without circular imports:
                // We'll require it inline or assume it is available globally, actually we just import usePetStore at top.
                import('./usePetStore').then(({ usePetStore }) => {
                    const equippedPet = usePetStore.getState().equippedPetId;
                    if (equippedPet === 'cosmic_tortoise') {
                        finalDurationHours = durationHours * 1.15;
                        extended = true;
                    }
                    
                    const expiresAt = Date.now() + (finalDurationHours * 60 * 60 * 1000);

                    const newBuff: Buff = {
                        id,
                        type,
                        value,
                        expiresAt,
                        name: name || BUFF_NAMES[type],
                        icon: BUFF_ICONS[type],
                        stat,
                        extendedByCosmic: extended,
                    };

                    set((state) => ({
                        activeBuffs: [...state.activeBuffs, newBuff],
                    }));
                });
            },

            removeBuff: (id) => {
                set((state) => ({
                    activeBuffs: state.activeBuffs.filter((b) => b.id !== id),
                }));
            },

            getActiveMultiplier: (type) => {
                const { activeBuffs } = get();
                const now = Date.now();

                return activeBuffs
                    .filter((b) => b.type === type && b.expiresAt > now)
                    .reduce((sum, b) => sum + b.value, 0);
            },

            // Get total boost for a specific stat (e.g. 'Strength')
            getStatBoostMultiplier: (stat) => {
                const { activeBuffs } = get();
                const now = Date.now();

                return activeBuffs
                    .filter((b) => b.type === 'stat_boost' && b.stat === stat && b.expiresAt > now)
                    .reduce((sum, b) => sum + b.value, 0);
            },

            // Get combined shop discount
            getShopDiscount: () => {
                const { activeBuffs } = get();
                const now = Date.now();

                return activeBuffs
                    .filter((b) => b.type === 'shop_discount' && b.expiresAt > now)
                    .reduce((sum, b) => sum + b.value, 0);
            },

            cleanExpiredBuffs: () => {
                const now = Date.now();
                set((state) => ({
                    activeBuffs: state.activeBuffs.filter((b) => b.expiresAt > now),
                }));
            },

            getActiveBuffs: () => {
                const now = Date.now();
                return get().activeBuffs.filter((b) => b.expiresAt > now);
            },

            setDoubleXpNextHabit: (active) => {
                set({ doubleXpNextHabit: active });
            },

            consumeDoubleXp: () => {
                const state = get();
                if (state.doubleXpNextHabit) {
                    set({ doubleXpNextHabit: false });
                    return true;
                }
                return false;
            },
        }),
        {
            name: PERSIST_REGISTRY.buffs.persistKey, // v2 for board expansion
        }
    )
);
