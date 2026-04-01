// ── Trainer Definitions — Future Trainer Battle Mode ──────────────────────────
// Not yet surfaced in UI. Powers future trainer battle system.

export type TrainerDifficulty = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master';
export type TrainerAiStyle = 'aggressive' | 'defensive' | 'balanced' | 'staller' | 'switcher';
export type TrainerBand = 1 | 2 | 3 | 4 | 5; // Difficulty band (1=easiest, 5=hardest)

export interface TrainerDefinition {
    id: string;
    name: string;
    title: string;
    icon: string;
    band: TrainerBand;
    difficulty: TrainerDifficulty;
    aiStyle: TrainerAiStyle;
    teamPetIds: string[]; // Up to 6 owned pets
    theme: string; // Biome / flavor
    rewardGold: number;
    rewardBand: string; // "Common" | "Rare" | etc.
    unlockHint: string;
}

export const TRAINER_ROSTER: TrainerDefinition[] = [
    {
        id: 'trainer_farris',
        name: 'Farris the Farmer',
        title: 'Meadow Novice',
        icon: '👨‍🌾',
        band: 1,
        difficulty: 'novice',
        aiStyle: 'balanced',
        teamPetIds: ['pet_cow', 'pet_chicken'],
        theme: 'Sunlit Meadow',
        rewardGold: 50,
        rewardBand: 'Common',
        unlockHint: 'Always available — good first fight.',
    },
    {
        id: 'trainer_sera',
        name: 'Sera the Swift',
        title: 'Forest Runner',
        icon: '🏃‍♀️',
        band: 2,
        difficulty: 'apprentice',
        aiStyle: 'aggressive',
        teamPetIds: ['war_chicken', 'pet_rabbit', 'blood_goose'],
        theme: 'Dark Forest',
        rewardGold: 120,
        rewardBand: 'Uncommon',
        unlockHint: 'Defeat Farris first.',
    },
    {
        id: 'trainer_rex',
        name: 'Rex the Ironclad',
        title: 'Volcanic Warden',
        icon: '🛡️',
        band: 3,
        difficulty: 'journeyman',
        aiStyle: 'defensive',
        teamPetIds: ['stoneback_turtle', 'pet_rhino', 'pet_pig'],
        theme: 'Volcanic Ridge',
        rewardGold: 250,
        rewardBand: 'Rare',
        unlockHint: 'Reach catch level 10.',
    },
    {
        id: 'trainer_mira',
        name: 'Mira the Shadowed',
        title: 'Dusk Ranger',
        icon: '🌙',
        band: 4,
        difficulty: 'expert',
        aiStyle: 'switcher',
        teamPetIds: ['shadow_otter', 'blood_goose', 'pet_raven', 'pixel_cat'],
        theme: 'Dark Forest',
        rewardGold: 500,
        rewardBand: 'Epic',
        unlockHint: 'Defeat Rex and own 6 pets.',
    },
    {
        id: 'trainer_apex',
        name: 'The Herder',
        title: 'Champion of the Herd',
        icon: '👑',
        band: 5,
        difficulty: 'master',
        aiStyle: 'staller',
        teamPetIds: ['meditating_war_cow', 'highland_archer_cow', 'wizard_cow', 'stoneback_turtle', 'pet_elephant'],
        theme: 'Ethereal Plane',
        rewardGold: 1500,
        rewardBand: 'Legendary',
        unlockHint: 'Defeat all other trainers.',
    },
];

export const TRAINER_MAP: Record<string, TrainerDefinition> = Object.fromEntries(
    TRAINER_ROSTER.map(t => [t.id, t])
);
