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
    },
    // New Skill-Level Auras
    {
        id: 'awakening_spark',
        name: 'Awakening Spark',
        icon: '💫',
        color: 'rgba(56, 182, 255, 0.4)',
        description: 'A faint blue glow of potential.',
        unlockCondition: 'Total Skill Level 25',
        bonus: { type: 'xp', value: 0.01 },
    },
    {
        id: 'rising_force',
        name: 'Rising Force',
        icon: '🌪️',
        color: 'rgba(34, 197, 94, 0.5)',
        description: 'Green energy swirling with purpose.',
        unlockCondition: 'Total Skill Level 50',
        bonus: { type: 'atk', value: 0.02 },
    },
    {
        id: 'tempest_soul',
        name: 'Tempest Soul',
        icon: '🌩️',
        color: 'rgba(147, 51, 234, 0.6)',
        description: 'A purple storm of focused intent.',
        unlockCondition: 'Total Skill Level 100',
        bonus: { type: 'crit', value: 0.03 },
    },
    {
        id: 'transcendent',
        name: 'Transcendent',
        icon: '⚡',
        color: 'rgba(250, 204, 21, 0.8)',
        description: 'Golden lightning of pure mastery.',
        unlockCondition: 'Total Skill Level 200',
        bonus: { type: 'atk', value: 0.05 },
    },
    // Ultra-rare aura: Daily Spin exclusive (1:10,000 chance)
    {
        id: 'lucky_radiance',
        name: 'Lucky Radiance',
        icon: '🌈',
        color: 'rgba(255, 200, 100, 0.9)',
        description: 'A shimmering rainbow born of pure fortune. Incredibly rare — only obtainable from the Daily Spin.',
        unlockCondition: '1:10,000 Daily Spin (Ultra-Rare!)',
        bonus: { type: 'xp', value: 0.02 },
    },
    // MYTHIC ultra-rare spin aura (1:50,000)
    {
        id: 'cosmic_aura',
        name: 'Cosmic Aura',
        icon: '🌌',
        color: 'rgba(244, 63, 94, 0.85)',
        description: 'A shimmering cosmic glow of pure destiny. The rarest aura in existence.',
        unlockCondition: '1:50,000 Daily Spin (Mythic!)',
        bonus: { type: 'xp', value: 0.05 },
    },
    // Secret aura — spend 777 tickets
    {
        id: 'secret_green',
        name: 'Secret Green Aura',
        icon: '💚',
        color: 'rgba(34, 197, 94, 0.75)',
        description: 'A mysterious green energy unlocked by spending exactly 777 spin tickets.',
        unlockCondition: 'Spend 777 spin tickets (Secret!)',
        bonus: { type: 'gold', value: 0.03 },
    },
    // Exclusive aura — 30-day streak
    {
        id: 'exclusive_glow',
        name: 'Exclusive Glow',
        icon: '✨',
        color: 'rgba(251, 191, 36, 0.85)',
        description: 'A warm golden radiance earned by the most dedicated players.',
        unlockCondition: '30-day consecutive login streak',
        bonus: { type: 'xp', value: 0.03 },
    },
];

interface AuraState {
    unlockedAuras: string[];
    activeAuraId: string;

    // Actions
    unlockAura: (auraId: string) => void;
    setActiveAura: (auraId: string) => void;
    checkAndUnlockAuras: (highestFloor: number) => string[];
    checkSkillLevelAuras: (totalSkillLevel: number) => string[];
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

            checkSkillLevelAuras: (totalSkillLevel) => {
                const newlyUnlocked: string[] = [];

                if (totalSkillLevel >= 25 && !get().unlockedAuras.includes('awakening_spark')) newlyUnlocked.push('awakening_spark');
                if (totalSkillLevel >= 50 && !get().unlockedAuras.includes('rising_force')) newlyUnlocked.push('rising_force');
                if (totalSkillLevel >= 100 && !get().unlockedAuras.includes('tempest_soul')) newlyUnlocked.push('tempest_soul');
                if (totalSkillLevel >= 200 && !get().unlockedAuras.includes('transcendent')) newlyUnlocked.push('transcendent');

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
