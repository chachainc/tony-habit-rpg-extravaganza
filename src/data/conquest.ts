export type ConquestNodeType = 'start' | 'battle' | 'treasure' | 'event' | 'minigame' | 'shop' | 'boss';

export interface ConquestNodeData {
    id: string;
    type: ConquestNodeType;
    label: string;
    description: string;
    connections: string[]; // IDs of nodes this node connects forward to
    tier: number; // 0 is start, higher is further up the map
}

// Very simple, deterministic Phase 1 map (15 nodes)
export const CONQUEST_MAP_NODES: ConquestNodeData[] = [
    { id: 'start', type: 'start', label: 'Camp', description: 'Your journey begins here.', connections: ['n1', 'n2'], tier: 0 },
    // Tier 1
    { id: 'n1', type: 'battle', label: 'Scout Patrol', description: 'A weak enemy patrol.', connections: ['n3', 'n4'], tier: 1 },
    { id: 'n2', type: 'event', label: 'Strange Statue', description: 'An eerie glowing monument.', connections: ['n4', 'n5'], tier: 1 },
    // Tier 2
    { id: 'n3', type: 'battle', label: 'Goblin Ambush', description: 'Goblins block the path.', connections: ['n6'], tier: 2 },
    { id: 'n4', type: 'treasure', label: 'Hidden Cache', description: 'A small buried chest.', connections: ['n6', 'n7'], tier: 2 },
    { id: 'n5', type: 'battle', label: 'Wild Beast', description: 'A ferocious wolf.', connections: ['n7'], tier: 2 },
    // Tier 3
    { id: 'n6', type: 'minigame', label: 'Fae Mischief', description: 'They demand a game of wits.', connections: ['n8'], tier: 3 },
    { id: 'n7', type: 'shop', label: 'Wandering Merchant', description: 'Buy supplies for the road.', connections: ['n8', 'n9'], tier: 3 },
    // Tier 4
    { id: 'n8', type: 'battle', label: 'Armored Knight', description: 'A tough, heavily armored foe.', connections: ['n10', 'n11'], tier: 4 },
    { id: 'n9', type: 'event', label: 'Ruined Shrine', description: 'Pray for a blessing.', connections: ['n11'], tier: 4 },
    // Tier 5
    { id: 'n10', type: 'treasure', label: 'Golden Chest', description: 'A lavishly decorated chest.', connections: ['n12'], tier: 5 },
    { id: 'n11', type: 'battle', label: 'Dark Cultists', description: 'They are performing a ritual.', connections: ['n12', 'n13'], tier: 5 },
    // Tier 6
    { id: 'n12', type: 'shop', label: 'Oasis Camp', description: 'Rest and stock up before the end.', connections: ['boss'], tier: 6 },
    { id: 'n13', type: 'minigame', label: 'Tactician\'s Trial', description: 'Prove your strategic mind.', connections: ['boss'], tier: 6 },
    // Tier 7 (Boss)
    { id: 'boss', type: 'boss', label: 'Vampire Lord', description: 'The master of this domain.', connections: [], tier: 7 }
];

export const CONQUEST_EVENT_TABLE = {
    'Strange Statue': {
        text: 'The statue\'s eyes glow with a dim purple light. It seems to demand a sacrifice.',
        options: [
            { label: 'Offer blood (-10 HP, +5 Sigils)', effect: { type: 'hp_and_sigils', hp: -10, sigils: 5 } },
            { label: 'Ignore it', effect: { type: 'none' } }
        ]
    },
    'Ruined Shrine': {
        text: 'An old shrine to a forgotten goddess. You can feel a lingering holy presence.',
        options: [
            { label: 'Pray (+20 HP)', effect: { type: 'heal', hp: 20 } },
            { label: 'Search for coins (+20 Gold)', effect: { type: 'gold', gold: 20 } }
        ]
    }
} as const;

export const MINIGAME_REWARDS = {
    'Fae Mischief': { sigils: 5, gold: 30 },
    'Tactician\'s Trial': { sigils: 10, gold: 60 }
};

export const DICE_SYSTEM = {
    defaultMaxRolls: 5,     // Max banked rolls
    replenishRateVsHabit: 1 // Earn 1 roll per major habit completed in real life (stubbed for now)
};
