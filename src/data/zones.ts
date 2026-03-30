// ── Wild Zones — Encounter tables for Pet Catch Mode ──────────────────────────
// Zone IDs reference existing pet IDs from usePetStore PET_DATABASE

import { RARE_ENCOUNTER_CHANCE } from './catchRules';

export interface ZoneEncounterEntry {
    petId: string;
    weight: number; // Relative weight (higher = more common)
    levelRange: [number, number]; // [min, max] wild pet level
}

export interface WildZone {
    id: string;
    name: string;
    icon: string;
    description: string;
    biome: string;
    minLevel: number;
    maxLevel: number;
    unlocked: boolean; // Future: unlock via progression
    encounters: ZoneEncounterEntry[];
    // Rare encounter pool — same species, isRare=true, +20% stats
    rarePool: string[]; // petIds that can appear as rare variants
    theme: string; // CSS class / color theme
}

export const WILD_ZONES: WildZone[] = [
    {
        id: 'zone_meadow',
        name: 'Sunlit Meadow',
        icon: '🌾',
        description: 'A gentle field full of beginner-friendly wild pets.',
        biome: 'Grassland',
        minLevel: 1,
        maxLevel: 8,
        unlocked: true,
        encounters: [
            { petId: 'war_chicken',       weight: 40, levelRange: [1, 8] },
            { petId: 'stoneback_turtle',  weight: 30, levelRange: [2, 8] },
            { petId: 'shadow_otter',      weight: 20, levelRange: [3, 8] },
            { petId: 'blood_goose',       weight: 10, levelRange: [4, 8] },
        ],
        rarePool: ['war_chicken', 'stoneback_turtle'],
        theme: 'zone--meadow',
    },
    {
        id: 'zone_forest',
        name: 'Dark Forest',
        icon: '🌲',
        description: 'A shadowy woodland with tougher, more elusive wild pets.',
        biome: 'Forest',
        minLevel: 5,
        maxLevel: 18,
        unlocked: true,
        encounters: [
            { petId: 'blood_goose',       weight: 35, levelRange: [5, 18] },
            { petId: 'shadow_otter',      weight: 35, levelRange: [5, 18] },
            { petId: 'war_chicken',       weight: 15, levelRange: [5, 15] },
            { petId: 'stoneback_turtle',  weight: 15, levelRange: [8, 18] },
        ],
        rarePool: ['blood_goose', 'shadow_otter'],
        theme: 'zone--forest',
    },
    {
        id: 'zone_volcanic',
        name: 'Volcanic Ridge',
        icon: '🌋',
        description: 'A scorched peak. Wild pets here are powerful — and tough to catch.',
        biome: 'Volcanic',
        minLevel: 12,
        maxLevel: 30,
        unlocked: true,
        encounters: [
            { petId: 'war_chicken',      weight: 45, levelRange: [12, 30] },
            { petId: 'blood_goose',      weight: 35, levelRange: [12, 30] },
            { petId: 'stoneback_turtle', weight: 15, levelRange: [15, 30] },
            { petId: 'shadow_otter',     weight: 5,  levelRange: [18, 30] },
        ],
        rarePool: ['war_chicken', 'blood_goose'],
        theme: 'zone--volcanic',
    },
];

export const ZONE_MAP: Record<string, WildZone> = Object.fromEntries(
    WILD_ZONES.map(z => [z.id, z])
);

// ── Weighted encounter roll ────────────────────────────────────────────────────
export function rollEncounter(zone: WildZone): { petId: string; level: number; isRare: boolean } {
    // Rare encounter check — exactly 1/4000
    const isRare = Math.random() < RARE_ENCOUNTER_CHANCE && zone.rarePool.length > 0;

    let petId: string;
    if (isRare) {
        petId = zone.rarePool[Math.floor(Math.random() * zone.rarePool.length)];
    } else {
        // Weighted random pick
        const totalWeight = zone.encounters.reduce((s, e) => s + e.weight, 0);
        let roll = Math.random() * totalWeight;
        petId = zone.encounters[zone.encounters.length - 1].petId; // fallback
        for (const entry of zone.encounters) {
            roll -= entry.weight;
            if (roll <= 0) {
                petId = entry.petId;
                break;
            }
        }
    }

    // Level within zone range (± small random)
    const level = zone.minLevel + Math.floor(Math.random() * (zone.maxLevel - zone.minLevel + 1));

    return { petId, level, isRare };
}
