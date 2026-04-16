import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { usePetStore } from './usePetStore';
import { useToast } from '../components/ui/Toast';

export interface FocusState {
    totalFocusTimeAccumulated: number;
    hasUnlockedFirstTortoise: boolean;
    hasUnlockedSecondTortoiseBase: boolean;
    
    // Phase 2 Tracker
    totalAdvancedFocusTimeAccumulated: number;
    hasUnlockedAdvancedTortoise: boolean;

    // Phase 3 Tracker
    totalMythicFocusTimeAccumulated: number;
    hasUnlockedMythicTortoise: boolean;

    // Global Statistics
    lastFocusDuration: number;
    longestSession: number;

    addFocusTime: (seconds: number, mode: 'basic' | 'advanced' | 'mythic') => void;
    checkUnlocks: () => void;
}

export const TARGET_FOCUS_SECONDS = 172800; // 48 hours
export const TARGET_ADVANCED_FOCUS_SECONDS = 604800; // 168 hours (7 days)
export const TARGET_MYTHIC_FOCUS_SECONDS = 1209600; // 336 hours (14 days)

export const useFocusStore = create<FocusState>()(
    persist(
        (set, get) => ({
            totalFocusTimeAccumulated: 0,
            hasUnlockedFirstTortoise: false,
            hasUnlockedSecondTortoiseBase: false,

            totalAdvancedFocusTimeAccumulated: 0,
            hasUnlockedAdvancedTortoise: false,

            totalMythicFocusTimeAccumulated: 0,
            hasUnlockedMythicTortoise: false,

            lastFocusDuration: 0,
            longestSession: 0,

            addFocusTime: (seconds: number, mode: 'basic' | 'advanced' | 'mythic') => {
                set((state) => {
                    const updates: Partial<FocusState> = {
                        lastFocusDuration: seconds,
                        longestSession: Math.max(state.longestSession, seconds)
                    };

                    if (mode === 'mythic') {
                        updates.totalMythicFocusTimeAccumulated = state.totalMythicFocusTimeAccumulated + seconds;
                    } else if (mode === 'advanced') {
                        updates.totalAdvancedFocusTimeAccumulated = state.totalAdvancedFocusTimeAccumulated + seconds;
                    } else {
                        updates.totalFocusTimeAccumulated = state.totalFocusTimeAccumulated + seconds;
                    }

                    return updates;
                });
                get().checkUnlocks();
            },

            checkUnlocks: () => {
                const state = get();
                if (!state.hasUnlockedFirstTortoise && state.totalFocusTimeAccumulated >= TARGET_FOCUS_SECONDS) {
                    set({ 
                        hasUnlockedFirstTortoise: true, 
                        totalFocusTimeAccumulated: TARGET_FOCUS_SECONDS, // Cap it exactly for the first milestone to keep UI clean
                        hasUnlockedSecondTortoiseBase: true 
                    });
                    const toast = useToast.getState().addToast;
                    toast('You have freed the Zen Tortoise! A new presence has appeared...', 'success');
                    usePetStore.getState().addPet('zen_tortoise');
                }

                if (state.hasUnlockedSecondTortoiseBase && !state.hasUnlockedAdvancedTortoise && state.totalAdvancedFocusTimeAccumulated >= TARGET_ADVANCED_FOCUS_SECONDS) {
                    set({
                        hasUnlockedAdvancedTortoise: true,
                        totalAdvancedFocusTimeAccumulated: TARGET_ADVANCED_FOCUS_SECONDS
                    });
                    const toast = useToast.getState().addToast;
                    toast('You have awakened the Evolved Tortoise Server! Its true form shifts...', 'success');
                    usePetStore.getState().addPet('master_tortoise');
                }

                if (state.hasUnlockedAdvancedTortoise && !state.hasUnlockedMythicTortoise && state.totalMythicFocusTimeAccumulated >= TARGET_MYTHIC_FOCUS_SECONDS) {
                    set({
                        hasUnlockedMythicTortoise: true,
                        totalMythicFocusTimeAccumulated: TARGET_MYTHIC_FOCUS_SECONDS
                    });
                    const toast = useToast.getState().addToast;
                    toast('🌌 The Cosmic Tortoise has revealed itself entirely...', 'success');
                    usePetStore.getState().addPet('cosmic_tortoise');
                }
            }
        }),
        {
            name: PERSIST_REGISTRY.focus.persistKey,
        }
    )
);
