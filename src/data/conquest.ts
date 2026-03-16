export type ConquestNodeType =
    | 'start' | 'battle' | 'elite' | 'treasure' | 'event'
    | 'minigame' | 'shop' | 'campfire' | 'shrine' | 'cursed' | 'boss'
    | 'mystery' | 'treasure_vault' | 'artifact' | 'resource';

export interface ConquestNodeData {
    id: string;
    type: ConquestNodeType;
    label: string;
    description: string;
    connections: string[];
    tier: number;
}

export const CONQUEST_NODE_PREVIEW: Record<ConquestNodeType, { risk: string; reward: string }> = {
    start:          { risk: 'None',    reward: 'The journey begins' },
    battle:         { risk: 'Low',     reward: 'Gold, Sigils' },
    elite:          { risk: 'High',    reward: 'More Gold, Sigils, Item drop' },
    treasure:       { risk: 'None',    reward: 'Gold, Sigils, chance of Item' },
    event:          { risk: 'Varies',  reward: 'Unknown outcome' },
    minigame:       { risk: 'None',    reward: 'Gold, Sigils based on skill' },
    shop:           { risk: 'None',    reward: 'Buy items with Gold/Sigils' },
    campfire:       { risk: 'None',    reward: 'Heal 30% HP or +5% ATK' },
    shrine:         { risk: 'None',    reward: 'Random blessing: ATK, DEF, or MaxHP +10%' },
    cursed:         { risk: 'High',    reward: 'Great power at a price' },
    boss:           { risk: 'Extreme', reward: 'Run completion' },
    mystery:        { risk: 'Unknown', reward: 'Trap, Treasure, or Strange NPC' },
    treasure_vault: { risk: 'Very High', reward: '+3 Gems or +100 Gold (hard combat)' },
    artifact:       { risk: 'None',    reward: 'Passive run-long effect' },
    resource:       { risk: 'None',    reward: 'Sigils, Balloons, Shmeckles' },
};

// ─── MAP NODES (8 tiers, 24 nodes) ─────────────────────────────────────────
export const CONQUEST_MAP_NODES: ConquestNodeData[] = [
    { id: 'start', type: 'start', label: 'Camp', description: 'Your journey begins here.', connections: ['n1_a', 'n1_b', 'n1_c'], tier: 0 },

    // Tier 1
    { id: 'n1_a', type: 'battle',   label: 'Scout Patrol',   description: 'A weak enemy patrol.',              connections: ['n2_a'],         tier: 1 },
    { id: 'n1_b', type: 'resource', label: 'Supply Depot',   description: 'Scattered supplies on the path.',   connections: ['n2_b'],         tier: 1 },
    { id: 'n1_c', type: 'mystery',  label: 'Mystery Shrine', description: 'Something strange pulses here.',    connections: ['n2_c'],         tier: 1 },

    // Tier 2
    { id: 'n2_a', type: 'elite',        label: 'Armored Brute',  description: 'A massive armored foe.',        connections: ['n3_a', 'n3_b'], tier: 2 },
    { id: 'n2_b', type: 'treasure',     label: 'Hidden Cache',   description: 'A small buried chest.',         connections: ['n3_b'],         tier: 2 },
    { id: 'n2_c', type: 'campfire',     label: 'Safe Clearing',  description: 'A quiet place to rest.',        connections: ['n3_b', 'n3_c'], tier: 2 },

    // Tier 3
    { id: 'n3_a', type: 'battle',         label: 'Goblin Ambush',    description: 'Goblins attack from the trees.', connections: ['n4_a'],         tier: 3 },
    { id: 'n3_b', type: 'artifact',       label: 'Ancient Ruin',     description: 'A relic from a forgotten age.',  connections: ['n4_a', 'n4_b'], tier: 3 },
    { id: 'n3_c', type: 'treasure_vault', label: 'Vault of Greed',   description: 'Locked with an iron seal. High risk, high reward.', connections: ['n4_c'], tier: 3 },

    // Tier 4
    { id: 'n4_a', type: 'shop',   label: 'Wandering Merchant', description: 'Buy supplies for the road.',      connections: ['n5_a'],         tier: 4 },
    { id: 'n4_b', type: 'cursed', label: 'Dark Altar',         description: 'Ominous whispers fill the air.',  connections: ['n5_b'],         tier: 4 },
    { id: 'n4_c', type: 'event',  label: 'Ruined Hamlet',      description: 'A destroyed village.',            connections: ['n5_c'],         tier: 4 },

    // Tier 5
    { id: 'n5_a', type: 'elite',        label: 'Shadow Assassin', description: 'A deadly figure strikes from the shadows.', connections: ['n6_a', 'n6_b'], tier: 5 },
    { id: 'n5_b', type: 'resource',     label: 'Resource Cache',  description: 'Sigils, Balloons, and Shmeckles lie gathered.', connections: ['n6_b'], tier: 5 },
    { id: 'n5_c', type: 'campfire',     label: 'Abandoned Camp',  description: 'Old embers still burn here.',  connections: ['n6_b', 'n6_c'], tier: 5 },

    // Tier 6
    { id: 'n6_a', type: 'battle',  label: 'Dark Cultists',   description: 'They are performing a ritual.',            connections: ['n7_a'],         tier: 6 },
    { id: 'n6_b', type: 'shrine',  label: 'Goddess Statue',  description: 'A pristine statue, untouched by corruption.', connections: ['n7_b'],       tier: 6 },
    { id: 'n6_c', type: 'mystery', label: 'Wandering Spirit', description: 'A glowing figure beckons you.',           connections: ['n7_b'],         tier: 6 },

    // Tier 7
    { id: 'n7_a', type: 'event',   label: 'The Toll Bridge',   description: 'A troll demands payment.',         connections: ['boss'],         tier: 7 },
    { id: 'n7_b', type: 'minigame', label: "Tactician's Trial", description: 'Prove your strategic mind.',      connections: ['boss'],         tier: 7 },

    // Tier 8 (Boss)
    { id: 'boss', type: 'boss', label: 'The Pathkeeper', description: 'A massive guardian of the Conquest path. Boss becomes stronger the more Treasure Vaults you completed.', connections: [], tier: 8 },
];

// ─── CONQUEST ENEMY TYPES ───────────────────────────────────────────────────
export interface ConquestEnemyDef {
    id: string;
    name: string;
    icon: string;
    description: string;
    /** stat multiplier relative to base scaling (1.0 = normal) */
    atkMod: number;
    defMod: number;
    hpMod: number;
    special?: string;
    tiers: number[]; // which tiers this can appear in
}

export const CONQUEST_ENEMIES: ConquestEnemyDef[] = [
    {
        id: 'ash_crawler', name: 'Ash Crawler', icon: '🦂', tiers: [1, 2],
        description: 'Fast low-defense creature that attacks quickly. Early encounter enemy.',
        atkMod: 1.1, defMod: 0.7, hpMod: 0.75, special: 'Attacks twice per turn',
    },
    {
        id: 'sigil_leech', name: 'Sigil Leech', icon: '🩸', tiers: [2, 3],
        description: 'Steals one random resource when attacking. If defeated quickly, stolen resources are returned.',
        atkMod: 0.9, defMod: 0.85, hpMod: 0.9, special: 'Steals Sigils on hit',
    },
    {
        id: 'iron_husk', name: 'Iron Husk', icon: '🛡️', tiers: [1, 2, 3],
        description: 'High defense but low attack. A slow durable enemy.',
        atkMod: 0.7, defMod: 1.5, hpMod: 1.2, special: 'Very high DEF',
    },
    {
        id: 'balloon_goblin', name: 'Balloon Goblin', icon: '🎈', tiers: [3, 4],
        description: 'Fast attacker that has a chance to drop extra Balloons.',
        atkMod: 1.0, defMod: 0.8, hpMod: 0.85, special: 'Drops Balloons on defeat',
    },
    {
        id: 'gem_cultist', name: 'Gem Cultist', icon: '💎', tiers: [4, 5],
        description: 'Balanced enemy that always drops a Gem when defeated.',
        atkMod: 1.0, defMod: 1.0, hpMod: 1.0, special: 'Always drops 1 Gem',
    },
    {
        id: 'mirror_shade', name: 'Mirror Shade', icon: '🪞', tiers: [5, 6],
        description: 'Copies a percentage of the player\'s attack stat each turn.',
        atkMod: 0.5, defMod: 0.9, hpMod: 1.1, special: 'Mirrors +20% player ATK each turn',
    },
    {
        id: 'ruin_knight', name: 'Ruin Knight', icon: '⚔️', tiers: [6, 7],
        description: 'Late-run heavy enemy with high HP and increasing attack.',
        atkMod: 1.2, defMod: 1.1, hpMod: 1.4, special: 'ATK increases each round',
    },
    {
        id: 'crystal_warden', name: 'Crystal Warden', icon: '🔮', tiers: [7],
        description: 'Mini-boss enemy encountered near the end of the run.',
        atkMod: 1.3, defMod: 1.2, hpMod: 1.5,
    },
    {
        id: 'the_pathkeeper', name: 'The Pathkeeper', icon: '💀', tiers: [8],
        description: 'A massive guardian of the Conquest path. Base stats scale with the player\'s level. Additional scaling from Treasure Vaults completed.',
        atkMod: 1.6, defMod: 1.4, hpMod: 2.0,
    },
];

/** Get the right enemies for a given tier (excluding boss) */
export function getEnemiesForTier(tier: number): ConquestEnemyDef[] {
    return CONQUEST_ENEMIES.filter(e => e.tiers.includes(tier));
}

// ─── ARTIFACTS ───────────────────────────────────────────────────────────────
export interface ConquestArtifactDef {
    id: string;
    name: string;
    icon: string;
    description: string;
    /** used in store to apply effect */
    effect: 'gem_on_next_kill' | 'gold_bonus_10pct' | 'double_resource_5pct';
}

export const CONQUEST_ARTIFACTS: ConquestArtifactDef[] = [
    { id: 'art_gem_kill',       name: 'Shard of Fortune',    icon: '💎', description: '+1 Gem from your next combat victory.',          effect: 'gem_on_next_kill'    },
    { id: 'art_gold_bonus',     name: 'Merchant\'s Coin',    icon: '🪙', description: '+10% Gold from all rewards this run.',           effect: 'gold_bonus_10pct'    },
    { id: 'art_double_res',     name: 'Amplifier Sigil',     icon: '✨', description: '+5% chance to receive double resources this run.', effect: 'double_resource_5pct' },
];

// ─── RELICS (sold by Strange NPC in Mystery Tile) ────────────────────────────
export interface ConquestRelicDef {
    id: string;
    name: string;
    icon: string;
    cost: number;
    description: string;
    buffType: 'strength' | 'defense' | 'wealth';
    buffAmount: number;
    /** special flag for Reward Amplifier */
    isRewardAmplifier?: boolean;
}

export const CONQUEST_RELICS: ConquestRelicDef[] = [
    { id: 'relic_atk_1', name: 'Attack Relic I',   icon: '⚔️',  cost: 25, description: '+20% Attack for this run.',   buffType: 'strength', buffAmount: 20 },
    { id: 'relic_def_1', name: 'Defense Relic I',  icon: '🛡️',  cost: 25, description: '+20% Defense for this run.',  buffType: 'defense',  buffAmount: 20 },
    { id: 'relic_atk_2', name: 'Attack Relic II',  icon: '🗡️',  cost: 50, description: '+40% Attack for this run.',   buffType: 'strength', buffAmount: 40 },
    { id: 'relic_def_2', name: 'Defense Relic II', icon: '🔰',  cost: 50, description: '+40% Defense for this run.',  buffType: 'defense',  buffAmount: 40 },
    { id: 'relic_amplify', name: 'Reward Amplifier', icon: '💫', cost: 50, description: 'All future rewards grant +1 extra unit (Gems, Sigils, etc.).', buffType: 'wealth', buffAmount: 0, isRewardAmplifier: true },
];

// ─── RESOURCE TILE REWARDS ───────────────────────────────────────────────────
export type ResourceType = 'sigil' | 'balloon' | 'shmeckle';

export interface ResourceReward {
    type: ResourceType;
    amount: number;
}

export interface ResourceTileData {
    label: string;
    rewards: ResourceReward[];
    /** if true, player may choose ONE of the rewards */
    isChoice?: boolean;
    /** optional gold as a choice */
    goldChoice?: number;
    /** used for healing/gold nodes */
    healChoice?: number;
}

export const RESOURCE_TILE_REWARDS: ResourceTileData[] = [
    // Single resource
    { label: '+3 Sigils',    rewards: [{ type: 'sigil', amount: 3 }] },
    { label: '+3 Balloons',  rewards: [{ type: 'balloon', amount: 3 }] },
    { label: '+3 Shmeckles', rewards: [{ type: 'shmeckle', amount: 3 }] },
    // Dual resource
    { label: '+1 Sigil +1 Balloon',   rewards: [{ type: 'sigil', amount: 1 }, { type: 'balloon', amount: 1 }] },
    { label: '+1 Sigil +1 Shmeckle',  rewards: [{ type: 'sigil', amount: 1 }, { type: 'shmeckle', amount: 1 }] },
    { label: '+1 Balloon +1 Shmeckle',rewards: [{ type: 'balloon', amount: 1 }, { type: 'shmeckle', amount: 1 }] },
    // Triple (high value)
    { label: '+2 of each resource', rewards: [{ type: 'sigil', amount: 2 }, { type: 'balloon', amount: 2 }, { type: 'shmeckle', amount: 2 }] },
    { label: '+3 of each resource', rewards: [{ type: 'sigil', amount: 3 }, { type: 'balloon', amount: 3 }, { type: 'shmeckle', amount: 3 }] },
    // Choice tiles
    { label: 'Choose: +1 Sigil, +1 Balloon, or +1 Shmeckle', rewards: [{ type: 'sigil', amount: 1 }, { type: 'balloon', amount: 1 }, { type: 'shmeckle', amount: 1 }], isChoice: true },
    { label: 'Choose: +2 of one resource', rewards: [{ type: 'sigil', amount: 2 }, { type: 'balloon', amount: 2 }, { type: 'shmeckle', amount: 2 }], isChoice: true },
    // Gold option choice
    { label: 'Choose: resource or +25 Gold', rewards: [{ type: 'sigil', amount: 1 }, { type: 'balloon', amount: 1 }, { type: 'shmeckle', amount: 1 }], isChoice: true, goldChoice: 25 },
    // Heal/Gold node
    { label: 'Heal 50% or gain 25 Gold', rewards: [], isChoice: true, goldChoice: 25, healChoice: 50 },
];

// ─── EVENTS ──────────────────────────────────────────────────────────────────
export type EventEffect =
    | { type: 'hp_and_sigils'; hp: number; sigils: number }
    | { type: 'gold'; gold: number }
    | { type: 'heal'; hp: number }
    | { type: 'damage'; hp: number }
    | { type: 'none' };

interface EventOption { label: string; effect: EventEffect; }
interface EventData { text: string; options: EventOption[]; }

export const CONQUEST_EVENT_TABLE: Record<string, EventData> = {
    'Strange Tracks': {
        text: 'You find strange, glowing footprints leading away from the main path.',
        options: [
            { label: 'Follow them (-10 HP, +15 Sigils)', effect: { type: 'hp_and_sigils', hp: -10, sigils: 15 } },
            { label: 'Stay on the path',                 effect: { type: 'none' } },
        ]
    },
    'Ruined Hamlet': {
        text: 'You come across a destroyed village. Among the rubble, you spot something glittering.',
        options: [
            { label: 'Search rubble (-15 HP, +50 Gold)', effect: { type: 'hp_and_sigils', hp: -15, sigils: 0 } },
            { label: 'Move on',                          effect: { type: 'none' } },
        ]
    },
    'The Toll Bridge': {
        text: 'A massive troll blocks the bridge, holding out a large, greedy hand.',
        options: [
            { label: 'Pay the toll (-30 Gold)',       effect: { type: 'gold', gold: -30 } },
            { label: 'Fight your way across (-20 HP)', effect: { type: 'damage', hp: 20 } },
        ]
    },
    'Strange Statue': {
        text: 'The statue\'s eyes glow with a dim purple light. It seems to demand a sacrifice.',
        options: [
            { label: 'Offer blood (-10 HP, +10 Sigils)', effect: { type: 'hp_and_sigils', hp: -10, sigils: 10 } },
            { label: 'Ignore it',                        effect: { type: 'none' } },
        ]
    }
} as const;

export const MINIGAME_REWARDS = {
    'Fae Mischief':      { sigils: 5,  gold: 30 },
    "Tactician's Trial": { sigils: 10, gold: 60 },
};

export const DICE_SYSTEM = {
    defaultMaxRolls: 5,
    replenishRateVsHabit: 1,
};
