import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { PET_DATABASE } from '../data/pets';
import type { PetDefinition } from '../data/pets';

export interface PetState {
    equippedPetId: string | null;
    name: string;
    health: number;
    hunger: number;
    mood: number;
    energy: number;
    ownedPets: string[];
    petQuantities: Record<string, number>;
    
    // Daily tracking for passives
    dailyPetGold: number;
    lastPetGoldDate: string | null;

    // Actions
    feed: (amount: number) => void;
    play: (amount: number) => void;
    sleep: () => void;
    tick: () => void;
    setName: (name: string) => void;
    equipPet: (petId: string) => void;
    unequipPet: () => void;
    addPet: (petId: string) => void;
    recordPetGoldBonus: (amount: number, dateStr: string) => void;
    
    // Selectors
    getEquippedPetDef: () => PetDefinition | null;
    getActivePetPassive: () => PetDefinition['passive'] | null;
}

export const usePetStore = create<PetState>()(
    persist(
        (set, get) => ({
            equippedPetId: 'pet_cow',
            name: 'Moo',
            health: 100,
            hunger: 80,
            mood: 80,
            energy: 90,
            ownedPets: ['pet_cow'],
            petQuantities: { 'pet_cow': 1 },
            dailyPetGold: 0,
            lastPetGoldDate: null,

            feed: (amount) => set((state) => ({
                hunger: Math.min(100, state.hunger + amount),
                health: Math.min(100, state.health + 5),
            })),

            play: (amount) => set((state) => ({
                mood: Math.min(100, state.mood + amount),
                energy: Math.max(0, state.energy - 10),
            })),

            sleep: () => set(() => ({ energy: 100 })),

            tick: () => {
                set((state) => ({
                    hunger: Math.max(0, state.hunger - 2),
                    mood: Math.max(0, state.mood - 1),
                    energy: Math.max(0, state.energy - 1),
                    health: state.hunger < 10 ? Math.max(0, state.health - 5) : state.health,
                }));
            },

            setName: (name) => set({ name }),

            equipPet: (petId) => {
                const state = get();
                if (state.ownedPets.includes(petId)) {
                    set({ equippedPetId: petId });
                }
            },

            unequipPet: () => {
                set({ equippedPetId: null });
            },

            addPet: (petId) => {
                const state = get();
                const currentQty = state.petQuantities?.[petId] || 0;
                set({
                    ownedPets: currentQty === 0 ? [...state.ownedPets, petId] : state.ownedPets,
                    petQuantities: { ...state.petQuantities, [petId]: currentQty + 1 }
                });
            },

            recordPetGoldBonus: (amount, dateStr) => {
                const state = get();
                if (state.lastPetGoldDate !== dateStr) {
                    set({ dailyPetGold: amount, lastPetGoldDate: dateStr });
                } else {
                    set({ dailyPetGold: state.dailyPetGold + amount });
                }
            },

            getEquippedPetDef: () => {
                const { equippedPetId } = get();
                if (!equippedPetId) return null;
                return PET_DATABASE[equippedPetId] || null;
            },

            getActivePetPassive: () => {
                const def = get().getEquippedPetDef();
                return def ? def.passive : null;
            }
        }),
        {
            name: PERSIST_REGISTRY.pets.persistKey,
            version: 1, // Bump version to trigger migration
            migrate: (persistedState: any, version: number) => {
                const state = { ...persistedState };
                if (version === 0) {
                    console.log('[usePetStore] Executing migration to passive-only pets v1...');
                    
                    // 1. Migrate ownedPetInstances to petQuantities safely
                    if (state.ownedPetInstances && Array.isArray(state.ownedPetInstances)) {
                        state.petQuantities = state.petQuantities || {};
                        state.ownedPets = state.ownedPets || [];
                        
                        state.ownedPetInstances.forEach((inst: any) => {
                            if (inst.petId) {
                                state.petQuantities[inst.petId] = (state.petQuantities[inst.petId] || 0) + 1;
                                if (!state.ownedPets.includes(inst.petId)) {
                                    state.ownedPets.push(inst.petId);
                                }
                            }
                        });
                    }
                    
                    // 2. Map old activePet field to new equippedPetId field
                    if (state.activePet && state.equippedPetId === undefined) {
                        state.equippedPetId = state.activePet;
                    }
                    
                    // 3. Discard all old combat and instance tracking fields permanently
                    delete state.activePet;
                    delete state.ownedPetInstances;
                    delete state.activePetInstanceId;
                    delete state.evolvedPets;
                    delete state.ultimateUnlocked;

                    // 4. One-time compensation for experimental feature removal
                    setTimeout(() => {
                        import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                            useCurrencyStore.getState().addTickets(1000);
                            console.log('[usePetStore] Granted 1000 tickets as compensation for pet combat removal.');
                        }).catch(console.error);
                    }, 2000);
                }
                return state;
            }
        }
    )
);

// Re-export PET_DATABASE so components can import it directly from this module
export { PET_DATABASE } from '../data/pets';
