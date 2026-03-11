export type ConquestNodeType = 'start' | 'battle' | 'elite' | 'treasure' | 'event' | 'minigame' | 'shop' | 'campfire' | 'shrine' | 'cursed' | 'boss';

export interface ConquestNodeData {
    id: string;
    type: ConquestNodeType;
    label: string;
    description: string;
    connections: string[]; // IDs of nodes this node connects forward to
    tier: number; // 0 is start, higher is further up the map
}

export const CONQUEST_NODE_PREVIEW: Record<ConquestNodeType, { risk: string, reward: string }> = {
    start: { risk: 'None', reward: 'The journey begins' },
    battle: { risk: 'Low', reward: 'Gold, Sigils' },
    elite: { risk: 'High', reward: 'More Gold, Sigils, Item drop' },
    treasure: { risk: 'None', reward: 'Gold, Sigils, chance of Item' },
    event: { risk: 'Varies', reward: 'Unknown outcome' },
    minigame: { risk: 'None', reward: 'Gold, Sigils based on skill' },
    shop: { risk: 'None', reward: 'Buy items with Gold/Sigils' },
    campfire: { risk: 'None', reward: 'Heal or Buff' },
    shrine: { risk: 'None', reward: 'Receive a Blessing' },
    cursed: { risk: 'High', reward: 'Great power at a price' },
    boss: { risk: 'Extreme', reward: 'Run completion' }
};

// 24-Node Map with 3 paths (left=combat, middle=mixed, right=safe)
export const CONQUEST_MAP_NODES: ConquestNodeData[] = [
    { id: 'start', type: 'start', label: 'Camp', description: 'Your journey begins here.', connections: ['n1_a', 'n1_b', 'n1_c'], tier: 0 },
    
    // Tier 1
    { id: 'n1_a', type: 'battle', label: 'Scout Patrol', description: 'A weak enemy patrol.', connections: ['n2_a'], tier: 1 },
    { id: 'n1_b', type: 'event', label: 'Strange Tracks', description: 'Footprints lead off the path.', connections: ['n2_b'], tier: 1 },
    { id: 'n1_c', type: 'battle', label: 'Lost Guard', description: 'An undead guard wanders aimlessly.', connections: ['n2_c'], tier: 1 },
    
    // Tier 2
    { id: 'n2_a', type: 'elite', label: 'Armored Brute', description: 'A massive armored foe blocks the way.', connections: ['n3_a', 'n3_b'], tier: 2 },
    { id: 'n2_b', type: 'treasure', label: 'Hidden Cache', description: 'A small buried chest.', connections: ['n3_b'], tier: 2 },
    { id: 'n2_c', type: 'campfire', label: 'Safe Clearing', description: 'A quiet place to rest.', connections: ['n3_b', 'n3_c'], tier: 2 },
    
    // Tier 3
    { id: 'n3_a', type: 'battle', label: 'Goblin Ambush', description: 'Goblins attack from the trees.', connections: ['n4_a'], tier: 3 },
    { id: 'n3_b', type: 'shrine', label: 'Forgotten Shrine', description: 'An ancient altar hums with energy.', connections: ['n4_a', 'n4_b'], tier: 3 },
    { id: 'n3_c', type: 'battle', label: 'Wild Beast', description: 'A ferocious wolf.', connections: ['n4_c'], tier: 3 },
    
    // Tier 4
    { id: 'n4_a', type: 'shop', label: 'Wandering Merchant', description: 'Buy supplies for the road.', connections: ['n5_a'], tier: 4 },
    { id: 'n4_b', type: 'cursed', label: 'Dark Altar', description: 'Ominous whispers fill the air.', connections: ['n5_b'], tier: 4 },
    { id: 'n4_c', type: 'event', label: 'Ruined Hamlet', description: 'A destroyed village.', connections: ['n5_c'], tier: 4 },
    
    // Tier 5
    { id: 'n5_a', type: 'elite', label: 'Shadow Assassin', description: 'A deadly figure strikes from the shadows.', connections: ['n6_a', 'n6_b'], tier: 5 },
    { id: 'n5_b', type: 'treasure', label: 'Golden Chest', description: 'A lavishly decorated chest.', connections: ['n6_b'], tier: 5 },
    { id: 'n5_c', type: 'campfire', label: 'Abandoned Camp', description: 'Old embers still burn here.', connections: ['n6_b', 'n6_c'], tier: 5 },

    // Tier 6
    { id: 'n6_a', type: 'battle', label: 'Dark Cultists', description: 'They are performing a ritual.', connections: ['n7_a'], tier: 6 },
    { id: 'n6_b', type: 'shrine', label: 'Goddess Statue', description: 'A pristine statue untouched by the corruption.', connections: ['n7_b'], tier: 6 },
    { id: 'n6_c', type: 'shop', label: 'Oasis Market', description: 'Rest and stock up before the end.', connections: ['n7_b'], tier: 6 },

    // Tier 7
    { id: 'n7_a', type: 'event', label: 'The Toll Bridge', description: 'A troll demands payment.', connections: ['boss'], tier: 7 },
    { id: 'n7_b', type: 'minigame', label: 'Tactician\'s Trial', description: 'Prove your strategic mind.', connections: ['boss'], tier: 7 },

    // Tier 8 (Boss)
    { id: 'boss', type: 'boss', label: 'Vampire Lord', description: 'The master of this domain.', connections: [], tier: 8 }
];

export type EventEffect = 
    | { type: 'hp_and_sigils'; hp: number; sigils: number }
    | { type: 'gold'; gold: number }
    | { type: 'heal'; hp: number }
    | { type: 'damage'; hp: number }
    | { type: 'none' };

interface EventOption {
    label: string;
    effect: EventEffect;
}

interface EventData {
    text: string;
    options: EventOption[];
}

export const CONQUEST_EVENT_TABLE: Record<string, EventData> = {
    'Strange Tracks': {
        text: 'You find strange, glowing footprints leading away from the main path. They seem to belong to a creature made of pure energy.',
        options: [
            { label: 'Follow them (-10 HP, +15 Sigils)', effect: { type: 'hp_and_sigils', hp: -10, sigils: 15 } },
            { label: 'Stay on the path', effect: { type: 'none' } }
        ]
    },
    'Ruined Hamlet': {
        text: 'You come across a destroyed village. Among the rubble, you spot something glittering, but the structures look unstable.',
        options: [
            { label: 'Search rubble (-15 HP, +50 Gold)', effect: { type: 'hp_and_sigils', hp: -15, sigils: 0 } }, // handled locally for gold via custom if needed, or we adapt effect type. Let's use a simpler mapping in UI
            { label: 'Move on', effect: { type: 'none' } }
        ]
    },
    'The Toll Bridge': {
        text: 'A massive troll blocks the bridge, holding out a large, greedy hand.',
        options: [
            { label: 'Pay the toll (-30 Gold)', effect: { type: 'gold', gold: -30 } },
            { label: 'Fight your way across (-20 HP)', effect: { type: 'damage', hp: 20 } } // we will apply as negative in UI
        ]
    },
    'Strange Statue': {
        text: 'The statue\'s eyes glow with a dim purple light. It seems to demand a sacrifice.',
        options: [
            { label: 'Offer blood (-10 HP, +10 Sigils)', effect: { type: 'hp_and_sigils', hp: -10, sigils: 10 } },
            { label: 'Ignore it', effect: { type: 'none' } }
        ]
    }
} as const;

export const MINIGAME_REWARDS = {
    'Fae Mischief': { sigils: 5, gold: 30 },
    'Tactician\'s Trial': { sigils: 10, gold: 60 }
};

export const DICE_SYSTEM = {
    defaultMaxRolls: 5,     // Max banked rolls
    replenishRateVsHabit: 1 // Earn 1 roll per major habit completed in real life
};
