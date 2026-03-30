import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PET_DATABASE, type PetDefinition } from './usePetStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface WildPetEncounter extends PetDefinition {
    currentHp: number;
    maxHp: number;
}

interface PetCatchingState {
    // Inventory
    captureOrbs: number;

    // Player State
    expeditionHp: number;
    maxExpeditionHp: number;

    // Encounter State
    currentEncounter: WildPetEncounter | null;
    logs: string[];
    isCapturing: boolean;

    // Actions - Town
    buyCaptureOrb: (amount: number) => boolean;
    healPlayer: () => void;
    enterGrass: () => void;
    fleeEncounter: () => void;

    // Actions - Combat
    attack: () => void;
    throwOrb: () => Promise<boolean>;
    addLog: (msg: string) => void;
    clearLogs: () => void;
}

const getRandomPet = (): WildPetEncounter => {
    // Pool of the 4 catchable pets
    const pool = ['war_chicken', 'stoneback_turtle', 'shadow_otter', 'blood_goose'];
    const randomId = pool[Math.floor(Math.random() * pool.length)];
    const def = PET_DATABASE[randomId];
    
    // Base HP from definition with slight randomness for flavor
    const maxHp = def.hp + Math.floor(Math.random() * 10);

    return {
        ...def,
        maxHp,
        currentHp: maxHp
    };
};

export const usePetCatchingStore = create<PetCatchingState>()(
    persist(
        (set, get) => ({
            captureOrbs: 0,
            expeditionHp: 100,
            maxExpeditionHp: 100,
            currentEncounter: null,
            logs: [],
            isCapturing: false,

            buyCaptureOrb: (amount: number) => {
                // Currency validation happens in the UI component, we just increment here
                set((state) => ({ captureOrbs: state.captureOrbs + amount }));
                return true;
            },

            healPlayer: () => {
                set({ expeditionHp: get().maxExpeditionHp });
            },

            enterGrass: () => {
                const wildPet = getRandomPet();
                set({ 
                    currentEncounter: wildPet,
                    logs: [`A wild ${wildPet.name} appeared!`],
                    isCapturing: false
                });
            },

            addLog: (msg: string) => {
                set((state) => ({ logs: [...state.logs, msg] }));
            },

            clearLogs: () => set({ logs: [] }),

            fleeEncounter: () => {
                set({ currentEncounter: null, logs: [] });
            },

            attack: () => {
                const state = get();
                if (!state.currentEncounter) return;

                const playerDamage = 15 + Math.floor(Math.random() * 10);
                let newHp = state.currentEncounter.currentHp - playerDamage;
                if (newHp < 0) newHp = 0;

                const wildAttackBase = state.currentEncounter.rarity === 'rare' ? 20 : state.currentEncounter.rarity === 'uncommon' ? 15 : 10;
                const wildDamage = wildAttackBase + Math.floor(Math.random() * 5);
                const newPlayerHp = Math.max(0, state.expeditionHp - wildDamage);

                // Update state
                set((state) => ({
                    currentEncounter: state.currentEncounter ? { ...state.currentEncounter, currentHp: newHp } : null,
                    expeditionHp: newPlayerHp,
                    logs: [
                        ...state.logs,
                        `You dealt ${playerDamage} damage.`,
                        ...(newHp > 0 ? [`${state.currentEncounter!.name} hit you for ${wildDamage} damage.`] : [])
                    ]
                }));

                // Flee check if pet didn't faint
                if (newHp > 0) {
                    const turns = get().logs.length / 2; // rough estimate of turns passed
                    // Flee chance increases slightly over time
                    if (turns > 3 && Math.random() < 0.15) {
                        get().addLog(`${state.currentEncounter!.name} fled from battle!`);
                        setTimeout(() => set({ currentEncounter: null }), 1500);
                        return;
                    }
                }

                if (newPlayerHp <= 0) {
                    get().addLog(`You blacked out! Fleeing to town...`);
                    setTimeout(() => get().fleeEncounter(), 2000);
                } else if (newHp <= 0) {
                    get().addLog(`${state.currentEncounter.name} fainted! You missed your chance.`);
                    setTimeout(() => set({ currentEncounter: null }), 2000);
                }
            },

            throwOrb: async () => {
                const state = get();
                if (!state.currentEncounter || state.captureOrbs <= 0) return false;

                // Pre-update: reduce orb count and set capturing lock
                set((state) => ({ 
                    captureOrbs: state.captureOrbs - 1,
                    isCapturing: true,
                    logs: [...state.logs, `You threw a Capture Orb!`]
                }));

                const { currentHp, maxHp, rarity } = state.currentEncounter;

                // Base rates mapping
                let baseRate = 0.50; // Common
                if (rarity === 'uncommon') baseRate = 0.35;
                if (rarity === 'rare') baseRate = 0.20;

                const missingHpPct = Math.max(0, (maxHp - currentHp) / maxHp);
                let catchChance = baseRate + (missingHpPct * 0.5);
                
                // Clamp
                catchChance = Math.max(0.05, Math.min(0.95, catchChance));

                const isSuccess = Math.random() < catchChance;

                // The calling UI component handles the promise resolution and timing delays,
                // but we lock state to prevent spam.
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (isSuccess) {
                            // Let the UI trigger PetStore update
                            set((state) => ({
                                logs: [...state.logs, `Gotcha! ${state.currentEncounter!.name} was caught!`],
                                isCapturing: false
                            }));
                        } else {
                            set((state) => ({
                                logs: [...state.logs, `Oh no! The wild ${state.currentEncounter!.name} broke free!`],
                                isCapturing: false
                            }));
                        }
                        resolve(isSuccess);
                    }, 500); // 500ms delay for store logic, UI can add more async waits
                });
            }
        }),
        {
            name: PERSIST_REGISTRY.petCatching?.persistKey || 'gl-pet-catching-v1', // use fallback until registry is updated
        }
    )
);
