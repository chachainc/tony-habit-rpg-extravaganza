// ─── PET FUSION STORE ─────────────────────────────────────────────────────────
// Tracks duplicate pet counts and fusion levels (1→2→3).
// Duplicate pets feed into fusion progress instead of being discarded.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Fusion Definition ─────────────────────────────────────────────────────────

export interface FusionPassive {
    name: string;
    description: string;
    bonusType: 'xp_gain' | 'gold_gain' | 'attack' | 'defense' | 'skill_xp';
    bonusValue: number;
    skillName?: string;
}

export interface FusionDef {
    petId: string;
    name: string;
    icon: string;
    lv2Threshold: number; // copies needed to reach Lv2 (default 3)
    lv3Threshold: number; // copies needed to reach Lv3 (default 5)
    lv2Bonus: { stat: string; value: number };
    lv3Passive: FusionPassive;
}

// ── Fusion catalog (one entry per fusable gacha pet) ──────────────────────────

export const FUSION_CATALOG: FusionDef[] = [
    {
        petId: 'pixel_cat',
        name: 'Pixel Cat',
        icon: '🐱',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'XP', value: 5 }, // +5% XP
        lv3Passive: {
            name: 'Lucky Paws',
            description: 'Increased rare item drop chance on monster kills. +5% gold gain.',
            bonusType: 'gold_gain',
            bonusValue: 0.05,
        },
    },
    {
        petId: 'cyber_dog',
        name: 'Cyber Dog',
        icon: '🐕',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'Gold', value: 8 }, // +8% gold
        lv3Passive: {
            name: 'Overdrive',
            description: 'Turbo charged loyalty — boosts gold gain dramatically.',
            bonusType: 'gold_gain',
            bonusValue: 0.12,
        },
    },
    {
        petId: 'spirit_fox',
        name: 'Spirit Fox',
        icon: '🦊',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'XP', value: 8 }, // +8% XP
        lv3Passive: {
            name: 'Phantom Step',
            description: 'The fox spirit phases through challenges. Increase rare drop chance and +10% overall XP.',
            bonusType: 'xp_gain',
            bonusValue: 0.10,
        },
    },
    {
        petId: 'dragon_hatchling',
        name: 'Dragon Hatchling',
        icon: '🐲',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'ATK', value: 5 }, // +5 ATK
        lv3Passive: {
            name: 'Fire Splash',
            description: 'Breathes fire on all enemies — bonus splash damage in arena battles.',
            bonusType: 'attack',
            bonusValue: 8,
        },
    },
    {
        petId: 'phoenix_chick',
        name: 'Phoenix Chick',
        icon: '🐦‍🔥',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'DEF', value: 5 }, // +5 DEF
        lv3Passive: {
            name: 'Rebirth Flame',
            description: 'Once per battle, revive with 20% HP when defeated.',
            bonusType: 'defense',
            bonusValue: 8,
        },
    },
    {
        petId: 'ancient_owl',
        name: 'Ancient Owl',
        icon: '🦉',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'XP', value: 15 }, // +15% XP
        lv3Passive: {
            name: 'Omniscience',
            description: 'The owl\'s ancient wisdom grants +20% XP from all sources.',
            bonusType: 'xp_gain',
            bonusValue: 0.20,
        },
    },
    {
        petId: 'cosmic_turtle',
        name: 'Cosmic Turtle',
        icon: '🐢',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'Sleep XP', value: 10 }, // +10% Sleep XP
        lv3Passive: {
            name: 'Timeless Shell',
            description: 'The cosmic shell absorbs damage. +20% Sleep skill XP and +15 Max HP.',
            bonusType: 'skill_xp',
            bonusValue: 0.20,
            skillName: 'Sleep',
        },
    },
    {
        petId: 'galaxy_heifer',
        name: 'Galaxy-Eyed Heifer',
        icon: '🐄',
        lv2Threshold: 3,
        lv3Threshold: 5,
        lv2Bonus: { stat: 'Housemaid XP', value: 30 }, // +30% Housemaid XP
        lv3Passive: {
            name: 'Stellar Grazing',
            description: 'Cosmic bovine transcendence — +50% Housemaid & Strength XP. Truly legendary.',
            bonusType: 'skill_xp',
            bonusValue: 0.50,
            skillName: 'Housemaid',
        },
    },
];

export const FUSION_MAP: Record<string, FusionDef> = Object.fromEntries(
    FUSION_CATALOG.map(f => [f.petId, f])
);

// ── Store ─────────────────────────────────────────────────────────────────────

export interface PetFusionProgress {
    petId: string;
    level: number;    // 1, 2, or 3
    copies: number;   // total accumulated copies (including used ones)
}

interface FusionState {
    petProgress: Record<string, PetFusionProgress>; // keyed by petId

    // Add a copy of a pet (called when duplicate is pulled)
    addPetCopy: (petId: string) => void;

    // Fuse: consume copies to level up (only when threshold met)
    fusePet: (petId: string) => boolean; // returns true if successful

    // Get copies needed and current progress for next level
    getFusionInfo: (petId: string) => {
        level: number;
        copies: number;
        nextThreshold: number | null;
        copiesNeeded: number;
        canFuse: boolean;
        isMaxLevel: boolean;
    };
}

export const useFusionStore = create<FusionState>()(
    persist(
        (set, get) => ({
            petProgress: {},

            addPetCopy: (petId) => {
                if (!FUSION_MAP[petId]) return; // Only fusable pets count

                set(state => {
                    const existing = state.petProgress[petId];
                    if (existing) {
                        return {
                            petProgress: {
                                ...state.petProgress,
                                [petId]: { ...existing, copies: existing.copies + 1 },
                            },
                        };
                    } else {
                        return {
                            petProgress: {
                                ...state.petProgress,
                                [petId]: { petId, level: 1, copies: 1 },
                            },
                        };
                    }
                });
            },

            fusePet: (petId) => {
                const info = get().getFusionInfo(petId);
                if (!info.canFuse || info.isMaxLevel) return false;

                const fusionDef = FUSION_MAP[petId];
                if (!fusionDef) return false;

                const newLevel = info.level + 1;

                set(state => ({

                    petProgress: {
                        ...state.petProgress,
                        [petId]: {
                            petId,
                            level: newLevel,
                            copies: state.petProgress[petId]?.copies ?? 0,
                        },
                    },
                }));

                return true;
            },

            getFusionInfo: (petId) => {
                const fusionDef = FUSION_MAP[petId];
                if (!fusionDef) {
                    return { level: 1, copies: 0, nextThreshold: null, copiesNeeded: 0, canFuse: false, isMaxLevel: true };
                }

                const progress = get().petProgress[petId] ?? { petId, level: 1, copies: 0 };
                const level = progress.level;
                const copies = progress.copies;
                const isMaxLevel = level >= 3;

                let nextThreshold: number | null = null;
                let copiesNeeded = 0;
                let canFuse = false;

                if (level === 1) {
                    nextThreshold = fusionDef.lv2Threshold;
                    copiesNeeded = Math.max(0, fusionDef.lv2Threshold - copies);
                    canFuse = copies >= fusionDef.lv2Threshold;
                } else if (level === 2) {
                    nextThreshold = fusionDef.lv3Threshold;
                    copiesNeeded = Math.max(0, fusionDef.lv3Threshold - copies);
                    canFuse = copies >= fusionDef.lv3Threshold;
                }

                return { level, copies, nextThreshold, copiesNeeded, canFuse, isMaxLevel };
            },
        }),
        { name: PERSIST_REGISTRY.fusion.persistKey }
    )
);
