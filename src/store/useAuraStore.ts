import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Aura {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    unlockCondition: string;
    bonus?: {
        type: 'atk' | 'def' | 'hp' | 'xp' | 'gold' | 'crit' | 'speed';
        value: number;
    };
}

export const AURAS: Aura[] = [
    {
        id: 'none',
        name: 'No Aura',
        icon: '⚪',
        color: 'transparent',
        description: 'Standard appearance.',
        unlockCondition: 'Default',
    },
    {
        id: 'novice_glow',
        name: 'Novice Glow',
        icon: '✨',
        color: 'rgba(255, 255, 255, 0.4)',
        description: 'A faint, hopeful shimmer.',
        unlockCondition: 'Reach Floor 2',
    },
    {
        id: 'iron_will',
        name: 'Iron Will',
        icon: '🛡️',
        color: 'rgba(148, 163, 184, 0.5)',
        description: 'Hardened resolve that pulses with strength.',
        unlockCondition: 'Reach Floor 10',
        bonus: { type: 'def', value: 0.02 },
    },
    {
        id: 'dragon_fire',
        name: 'Dragon Fire',
        icon: '🔥',
        color: 'rgba(239, 68, 68, 0.6)',
        description: 'Roaring flames that intimidate foes.',
        unlockCondition: 'Defeat Floor 20 Boss',
        bonus: { type: 'atk', value: 0.03 },
    },
    {
        id: 'void_essence',
        name: 'Void Essence',
        icon: '🌌',
        color: 'rgba(168, 85, 247, 0.6)',
        description: 'Dark energy that bends reality.',
        unlockCondition: 'Defeat Floor 30',
        bonus: { type: 'crit', value: 0.02 },
    },
    {
        id: 'celestial_light',
        name: 'Celestial Light',
        icon: '🌟',
        color: 'rgba(251, 191, 36, 0.7)',
        description: 'Eternal radiance of a master.',
        unlockCondition: 'Reach Floor 50',
        bonus: { type: 'xp', value: 0.05 },
    }
];

interface AuraState {
    unlockedAuras: string[];
    activeAuraId: string;

    // Actions
    unlockAura: (auraId: string) => void;
    setActiveAura: (auraId: string) => void;
    checkAndUnlockAuras: (highestFloor: number) => string[];
    getActiveAura: () => Aura | undefined;
}

export const useAuraStore = create<AuraState>()(
    persist(
        (set, get) => ({
            unlockedAuras: ['none', 'novice_glow'],
            activeAuraId: 'none',

            unlockAura: (auraId) => {
                if (!get().unlockedAuras.includes(auraId)) {
                    set({ unlockedAuras: [...get().unlockedAuras, auraId] });
                }
            },

            setActiveAura: (auraId) => set({ activeAuraId: auraId }),

            checkAndUnlockAuras: (highestFloor) => {
                const newlyUnlocked: string[] = [];

                if (highestFloor >= 10 && !get().unlockedAuras.includes('iron_will')) newlyUnlocked.push('iron_will');
                if (highestFloor >= 20 && !get().unlockedAuras.includes('dragon_fire')) newlyUnlocked.push('dragon_fire');
                if (highestFloor >= 30 && !get().unlockedAuras.includes('void_essence')) newlyUnlocked.push('void_essence');
                if (highestFloor >= 50 && !get().unlockedAuras.includes('celestial_light')) newlyUnlocked.push('celestial_light');

                if (newlyUnlocked.length > 0) {
                    set({ unlockedAuras: [...get().unlockedAuras, ...newlyUnlocked] });
                }
                return newlyUnlocked;
            },

            getActiveAura: () => AURAS.find(a => a.id === get().activeAuraId),
        }),
        {
            name: 'gl-auras-v1',
        }
    )
);
