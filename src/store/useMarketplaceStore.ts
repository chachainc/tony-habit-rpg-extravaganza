import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MarketplaceState {
    // Player position in marketplace (grid coordinates)
    playerPosition: { x: number; y: number };

    // Currently active/open store (null if none)
    activeStore: string | null;

    // Actions
    setPlayerPosition: (x: number, y: number) => void;
    movePlayer: (dx: number, dy: number) => void;
    openStore: (storeId: string) => void;
    closeStore: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>()(
    persist(
        (set) => ({
            playerPosition: { x: 10, y: 13 }, // Default start position
            activeStore: null,

            setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),

            movePlayer: (dx, dy) => set((state) => ({
                playerPosition: {
                    x: state.playerPosition.x + dx,
                    y: state.playerPosition.y + dy,
                },
            })),

            openStore: (storeId) => set({ activeStore: storeId }),

            closeStore: () => set({ activeStore: null }),
        }),
        {
            name: 'gl-marketplace-v1',
        }
    )
);
