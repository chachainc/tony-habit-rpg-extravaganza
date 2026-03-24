import type { ConquestNodeData, ConquestNodeType } from './conquest';

// ─── PROCEDURAL MAP GENERATION ────────────────────────────────────────────────
// Generates a Slay-the-Spire style branching map with 8 tiers.
// Each tier has 2-3 nodes with random types and connections.

/** Seeded RNG for deterministic map generation */
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

/** Node type distribution weights per tier range */
const TIER_WEIGHTS: Record<string, Partial<Record<ConquestNodeType, number>>> = {
    early: { battle: 40, resource: 25, mystery: 15, treasure: 10, campfire: 10 },
    mid:   { battle: 20, elite: 15, event: 15, shop: 15, campfire: 12, shrine: 8, artifact: 5, minigame: 10 },
    late:  { elite: 30, battle: 15, shrine: 10, campfire: 15, treasure_vault: 10, cursed: 10, minigame: 10 },
};

function pickNodeType(tier: number, rand: () => number): ConquestNodeType {
    let pool: Partial<Record<ConquestNodeType, number>>;
    if (tier <= 2) pool = TIER_WEIGHTS.early;
    else if (tier <= 5) pool = TIER_WEIGHTS.mid;
    else pool = TIER_WEIGHTS.late;

    const entries = Object.entries(pool) as [ConquestNodeType, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = rand() * total;
    for (const [type, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return type;
    }
    return 'battle';
}

const NODE_TYPE_LABELS: Partial<Record<ConquestNodeType, string[]>> = {
    battle:         ['Scout Patrol', 'Bandit Camp', 'Goblin Den', 'Skeleton Outpost', 'Wolf Pack', 'Orc Raiding Party'],
    elite:          ['Armored Brute', 'Shadow Assassin', 'Dark Cultists', 'Cursed Knight', 'Flame Elemental'],
    treasure:       ['Hidden Cache', 'Buried Chest', 'Glimmering Pile', 'Abandoned Wagon'],
    resource:       ['Supply Depot', 'Resource Cache', 'Abandoned Storehouse', 'Forager\'s Stash'],
    event:          ['Ruined Hamlet', 'Strange Tracks', 'Strange Statue', 'Old Well', 'Mysterious Fog'],
    shop:           ['Wandering Merchant', 'Traveling Caravan', 'Black Market'],
    campfire:       ['Safe Clearing', 'Abandoned Camp', 'Sheltered Cave', 'Warm Spring'],
    shrine:         ['Goddess Statue', 'Ancient Shrine', 'Blessed Fountain'],
    mystery:        ['Mystery Shrine', 'Wandering Spirit', 'Flickering Portal'],
    cursed:         ['Dark Altar', 'Cursed Monolith', 'Blood Pact Shrine'],
    treasure_vault: ['Vault of Greed', 'Sealed Treasury', 'Guardian\'s Chamber'],
    artifact:       ['Ancient Ruin', 'Forgotten Archive', 'Relic Alcove'],
    minigame:       ['Tactician\'s Trial', 'Fae Mischief', 'Arena Challenge'],
};

const NODE_TYPE_DESCRIPTIONS: Partial<Record<ConquestNodeType, string>> = {
    battle:         'An enemy waits ahead.',
    elite:          'A powerful foe guards this path.',
    treasure:       'A chest gleams in the distance.',
    resource:       'Scattered supplies on the path.',
    event:          'Something unusual stirs here.',
    shop:           'A merchant offers their wares.',
    campfire:       'A quiet place to rest and recover.',
    shrine:         'A divine presence offers a blessing.',
    mystery:        'Something strange pulses here.',
    cursed:         'Ominous whispers fill the air.',
    treasure_vault: 'High risk, high reward combat.',
    artifact:       'A relic from a forgotten age.',
    minigame:       'Prove your skills for rewards.',
};

export function generateConquestMap(act: number, seed: number, bossId: string): ConquestNodeData[] {
    const rand = seededRandom(seed + act * 1000);
    const nodes: ConquestNodeData[] = [];

    // Start node
    nodes.push({
        id: 'start',
        type: 'start',
        label: 'Camp',
        description: 'Your journey begins here.',
        connections: [],
        tier: 0,
    });

    // Generate tiers 1-7 with 2-3 nodes each
    for (let tier = 1; tier <= 7; tier++) {
        const nodeCount = rand() < 0.5 ? 2 : 3;
        const tierNodes: ConquestNodeData[] = [];

        for (let i = 0; i < nodeCount; i++) {
            const type = pickNodeType(tier, rand);
            const labels = NODE_TYPE_LABELS[type] ?? ['Unknown'];
            const label = labels[Math.floor(rand() * labels.length)];
            const description = NODE_TYPE_DESCRIPTIONS[type] ?? '';

            tierNodes.push({
                id: `t${tier}_n${i}`,
                type,
                label,
                description,
                connections: [],
                tier,
            });
        }
        nodes.push(...tierNodes);
    }

    // Boss node (tier 8)
    const bossLabels: Record<string, string> = {
        the_pathkeeper: 'The Pathkeeper',
        the_dreadwyrm: 'The Dreadwyrm',
        the_voidweaver: 'The Voidweaver',
    };
    nodes.push({
        id: 'boss',
        type: 'boss',
        label: bossLabels[bossId] ?? 'The Pathkeeper',
        description: 'The final guardian awaits.',
        connections: [],
        tier: 8,
    });

    // Wire connections: each node connects to 1-2 nodes in the next tier
    // Ensure every node in the next tier is reachable from at least one node in the current tier
    for (let tier = 0; tier <= 7; tier++) {
        const currentTierNodes = nodes.filter(n => n.tier === tier);
        const nextTier = tier + 1;
        const nextTierNodes = nextTier <= 7
            ? nodes.filter(n => n.tier === nextTier)
            : nodes.filter(n => n.type === 'boss');

        if (nextTierNodes.length === 0) continue;

        // First: guarantee every next-tier node has at least one incoming connection
        for (const nextNode of nextTierNodes) {
            const sourceNode = currentTierNodes[Math.floor(rand() * currentTierNodes.length)];
            if (!sourceNode.connections.includes(nextNode.id)) {
                sourceNode.connections.push(nextNode.id);
            }
        }

        // Second: give each current-tier node at least one forward connection
        for (const curNode of currentTierNodes) {
            if (curNode.connections.length === 0) {
                const target = nextTierNodes[Math.floor(rand() * nextTierNodes.length)];
                curNode.connections.push(target.id);
            }
            // Optionally add a second connection (40% chance)
            if (rand() < 0.4 && nextTierNodes.length > 1) {
                const remaining = nextTierNodes.filter(n => !curNode.connections.includes(n.id));
                if (remaining.length > 0) {
                    const extra = remaining[Math.floor(rand() * remaining.length)];
                    curNode.connections.push(extra.id);
                }
            }
        }
    }

    return nodes;
}
