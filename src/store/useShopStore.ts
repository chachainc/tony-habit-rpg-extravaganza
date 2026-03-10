import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getShopItemPool } from '../data/rewardTables';
import type { ItemDef } from './useInventoryStore';
import { useInventoryStore } from './useInventoryStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface ShopItem {
    id: string; // The specific UUID of this instance in the shop to track purchase state
    itemDefId: string; // Reference to global ItemDef
    price: number;
    purchased: boolean;
}

interface ShopState {
    lastStockedDate: string | null;
    currentStock: ShopItem[];
    restockShop: (force?: boolean) => void;
    purchaseItem: (shopItemId: string) => boolean;
}

const generatePrice = (item: ItemDef) => {
    // If the item has a hardcoded price, use it.
    if (item.price && item.price > 0) return item.price;

    // Otherwise generate price heuristically based on rarity
    switch (item.rarity) {
        case 'mythic': return 25000;
        case 'legendary': return 10000;
        case 'epic': return 3500;
        case 'rare': return 1000;
        default: return 300;
    }
};

export const useShopStore = create<ShopState>()(
    persist(
        (set, get) => ({
            lastStockedDate: null,
            currentStock: [],

            restockShop: (force = false) => {
                const state = get();
                const today = new Date().toDateString();

                if (!force && state.lastStockedDate === today) return; // Already stocked today

                const pool = getShopItemPool();
                if (pool.length === 0) return;

                const newStock: ShopItem[] = [];
                const shuffled = [...pool].sort(() => 0.5 - Math.random());

                // Deal exactly 3 items
                const count = Math.min(3, shuffled.length);
                for (let i = 0; i < count; i++) {
                    const item = shuffled[i];
                    newStock.push({
                        id: crypto.randomUUID(),
                        itemDefId: item.id,
                        price: generatePrice(item),
                        purchased: false
                    });
                }

                set({
                    lastStockedDate: today,
                    currentStock: newStock
                });
            },

            purchaseItem: (shopItemId: string) => {
                const state = get();
                const shopItemIndex = state.currentStock.findIndex(si => si.id === shopItemId);
                if (shopItemIndex === -1) return false;

                const shopItem = state.currentStock[shopItemIndex];
                if (shopItem.purchased) return false;

                // State logic (Currency checking) must happen at the component before calling this! 
                // Or we can do it here if we import CurrencyStore. 
                // We'll leave it as a pure status update.

                const newStock = [...state.currentStock];
                newStock[shopItemIndex] = { ...shopItem, purchased: true };

                set({ currentStock: newStock });
                return true;
            }
        }),
        {
            name: PERSIST_REGISTRY.shop.persistKey,
        }
    )
);
