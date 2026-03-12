import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

interface BoardCollectionState {
    ownedPets: string[];
    ownedBanners: string[];
    ownedTitles: string[];
    ownedCosmetics: string[];
    
    unlockPet: (id: string) => void;
    unlockBanner: (id: string) => void;
    unlockTitle: (id: string) => void;
    unlockCosmetic: (id: string) => void;
}

export const useBoardCollectionStore = create<BoardCollectionState>()(
    persist(
        (set) => ({
            ownedPets: [],
            ownedBanners: [],
            ownedTitles: [],
            ownedCosmetics: [],

            unlockPet: (id) => set(s => ({ 
                ownedPets: s.ownedPets.includes(id) ? s.ownedPets : [...s.ownedPets, id] 
            })),
            unlockBanner: (id) => set(s => ({ 
                ownedBanners: s.ownedBanners.includes(id) ? s.ownedBanners : [...s.ownedBanners, id] 
            })),
            unlockTitle: (id) => set(s => ({ 
                ownedTitles: s.ownedTitles.includes(id) ? s.ownedTitles : [...s.ownedTitles, id] 
            })),
            unlockCosmetic: (id) => set(s => ({ 
                ownedCosmetics: s.ownedCosmetics.includes(id) ? s.ownedCosmetics : [...s.ownedCosmetics, id] 
            }))
        }),
        {
            name: PERSIST_REGISTRY.boardCollection.persistKey,
        }
    )
);
