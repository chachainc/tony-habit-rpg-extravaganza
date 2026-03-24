import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Loyalty Tiers ──
export interface LoyaltyTier {
    tier: number;
    name: string;
    requiredPurchases: number;
    discountPercent: number;
    stars: number;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
    { tier: 0, name: 'Newcomer',  requiredPurchases: 0,  discountPercent: 0,  stars: 0 },
    { tier: 1, name: 'Regular',   requiredPurchases: 3,  discountPercent: 5,  stars: 1 },
    { tier: 2, name: 'Valued',    requiredPurchases: 5,  discountPercent: 10, stars: 2 },
    { tier: 3, name: 'VIP',       requiredPurchases: 10, discountPercent: 15, stars: 3 },
];

// ── Merchant NPC ──
export interface MerchantItem {
    id: string;
    name: string;
    icon: string;
    description: string;
    price: number;
    rarity: 'rare' | 'epic' | 'legendary';
    effect: string;
}

// Rotating pool of exclusive merchant items
const MERCHANT_POOL: MerchantItem[] = [
    { id: 'merchant_elixir',    name: 'Elixir of Fortune', icon: '🧪', description: 'Doubles gold from next 3 battles', price: 2500, rarity: 'epic', effect: '+100% gold (3 battles)' },
    { id: 'merchant_charm',     name: 'Lucky Charm',       icon: '🍀', description: 'Increases crit chance for 1 day',  price: 1800, rarity: 'rare', effect: '+15% crit (24h)' },
    { id: 'merchant_crystal',   name: 'Star Crystal',      icon: '💎', description: 'Grants 200 XP to a random skill', price: 1500, rarity: 'rare', effect: '+200 skill XP' },
    { id: 'merchant_tome',      name: 'Ancient Scroll',    icon: '📜', description: 'Grants 200 XP to a random skill', price: 2000, rarity: 'epic', effect: '+200 skill XP' },
    { id: 'merchant_pendant',   name: 'Phoenix Pendant',   icon: '🔥', description: 'Revive once in arena combat',     price: 5000, rarity: 'legendary', effect: 'Auto-revive (1x)' },
    { id: 'merchant_compass',   name: 'Merchant Compass',  icon: '🧭', description: 'Reveals hidden shop deals',       price: 1500, rarity: 'rare', effect: 'Unlock secret items' },
];

interface MarketLoyaltyState {
    // Per-store purchase counts
    storePurchases: Record<string, number>;

    // Wishlist
    wishlist: string[];

    // Merchant NPC
    lastMerchantStockDate: string | null;
    merchantStock: MerchantItem[];
    merchantPurchased: string[]; // item IDs purchased today

    // Actions
    recordPurchase: (storeId: string) => void;
    getLoyaltyTier: (storeId: string) => LoyaltyTier;
    getDiscount: (storeId: string) => number;
    toggleWishlist: (itemId: string) => void;
    isWishlisted: (itemId: string) => boolean;
    restockMerchant: () => void;
    purchaseMerchantItem: (itemId: string) => boolean;
    isMerchantDay: () => boolean;
}

const getTodayString = (): string => {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
};

// Merchant appears Mon/Wed/Fri
const checkMerchantDay = (): boolean => {
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = eastern.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    return day === 1 || day === 3 || day === 5;
};

// Seed-based selection from merchant pool (3 items per day)
const selectMerchantStock = (): MerchantItem[] => {
    const today = getTodayString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
    
    const shuffled = [...MERCHANT_POOL].sort((a, b) => {
        const ha = (seed * 31 + a.id.charCodeAt(0)) % 100;
        const hb = (seed * 31 + b.id.charCodeAt(0)) % 100;
        return ha - hb;
    });
    
    return shuffled.slice(0, 3);
};

export const useMarketLoyaltyStore = create<MarketLoyaltyState>()(
    persist(
        (set, get) => ({
            storePurchases: {},
            wishlist: [],
            lastMerchantStockDate: null,
            merchantStock: [],
            merchantPurchased: [],

            recordPurchase: (storeId) => {
                set(state => ({
                    storePurchases: {
                        ...state.storePurchases,
                        [storeId]: (state.storePurchases[storeId] || 0) + 1,
                    },
                }));
            },

            getLoyaltyTier: (storeId) => {
                const count = get().storePurchases[storeId] || 0;
                // Find highest qualifying tier
                let best = LOYALTY_TIERS[0];
                for (const tier of LOYALTY_TIERS) {
                    if (count >= tier.requiredPurchases) best = tier;
                }
                return best;
            },

            getDiscount: (storeId) => {
                return get().getLoyaltyTier(storeId).discountPercent;
            },

            toggleWishlist: (itemId) => {
                set(state => {
                    const idx = state.wishlist.indexOf(itemId);
                    if (idx >= 0) {
                        return { wishlist: state.wishlist.filter(id => id !== itemId) };
                    }
                    return { wishlist: [...state.wishlist, itemId] };
                });
            },

            isWishlisted: (itemId) => {
                return get().wishlist.includes(itemId);
            },

            restockMerchant: () => {
                const today = getTodayString();
                if (get().lastMerchantStockDate === today) return;
                
                set({
                    merchantStock: selectMerchantStock(),
                    lastMerchantStockDate: today,
                    merchantPurchased: [],
                });
            },

            purchaseMerchantItem: (itemId) => {
                const { merchantStock, merchantPurchased } = get();
                const item = merchantStock.find(i => i.id === itemId);
                if (!item) return false;
                if (merchantPurchased.includes(itemId)) return false;

                // Currency check happens in the component
                set(state => ({
                    merchantPurchased: [...state.merchantPurchased, itemId],
                }));
                return true;
            },

            isMerchantDay: () => checkMerchantDay(),
        }),
        {
            name: PERSIST_REGISTRY.marketLoyalty.persistKey,
        }
    )
);
