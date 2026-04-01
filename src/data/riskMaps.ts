/**
 * riskMaps.ts — Static data definitions for Risk campaign maps.
 *
 * Map 1: Scadrosharial (original)
 * Map 2: The Broken Wastes (unlocks after Map 1 is fully conquered)
 */

import type { NodeType, TerritoryTrait } from '../store/useRiskStore';

// ═══════════════════════════════════════════
// REGION TYPE — extended to include Map 2 regions
// ═══════════════════════════════════════════

export type RegionId =
    | 'ashlands' | 'iron_highlands' | 'verdant_plains' | 'crystal_coast' | 'frozen_north' | 'sunken_expanse'
    | 'obsidian_peaks' | 'dead_marshes' | 'ember_wastes' | 'shadow_rift' | 'cursed_tundra' | 'void_abyss';

export interface RegionDef {
    id: RegionId;
    name: string;
    bonusDescription: string;
    mapId: string;
}

export const ALL_REGIONS: Record<RegionId, RegionDef> = {
    // Map 1 regions
    ashlands:       { id: 'ashlands',       name: 'Ashlands',         bonusDescription: '+10% Gold',       mapId: 'map1' },
    iron_highlands: { id: 'iron_highlands', name: 'Iron Highlands',   bonusDescription: '+10% DEF',        mapId: 'map1' },
    verdant_plains: { id: 'verdant_plains', name: 'Verdant Plains',   bonusDescription: '+5% ATK',         mapId: 'map1' },
    crystal_coast:  { id: 'crystal_coast',  name: 'Crystal Coast',    bonusDescription: '+1 Sigil Per Win', mapId: 'map1' },
    frozen_north:   { id: 'frozen_north',   name: 'Frozen North',     bonusDescription: '+10% XP',         mapId: 'map1' },
    sunken_expanse: { id: 'sunken_expanse', name: 'Sunken Expanse',   bonusDescription: '+5 Max HP',       mapId: 'map1' },

    // Map 2 regions
    obsidian_peaks: { id: 'obsidian_peaks', name: 'Obsidian Peaks',   bonusDescription: '+15% ATK',        mapId: 'map2' },
    dead_marshes:   { id: 'dead_marshes',   name: 'Dead Marshes',     bonusDescription: '+15% Gold',       mapId: 'map2' },
    ember_wastes:   { id: 'ember_wastes',   name: 'Ember Wastes',     bonusDescription: '+10 Max HP',      mapId: 'map2' },
    shadow_rift:    { id: 'shadow_rift',    name: 'Shadow Rift',      bonusDescription: '+20% DEF',        mapId: 'map2' },
    cursed_tundra:  { id: 'cursed_tundra',  name: 'Cursed Tundra',    bonusDescription: '+15% XP',         mapId: 'map2' },
    void_abyss:     { id: 'void_abyss',     name: 'Void Abyss',       bonusDescription: '+2 Sigils Per Win', mapId: 'map2' },
};

// ═══════════════════════════════════════════
// NODE DEFINITION TYPE (without runtime state)
// ═══════════════════════════════════════════

export interface NodeDef {
    id: string;
    name: string;
    defenseValue: number;
    nodeType: NodeType;
    trait?: TerritoryTrait;
    region: RegionId;
    mapX: number;
    mapY: number;
}

// ═══════════════════════════════════════════
// CAMPAIGN DEFINITION
// ═══════════════════════════════════════════

export interface RiskCampaignDef {
    id: string;
    name: string;
    subtitle: string;
    backgroundImage: string;
    nodes: NodeDef[];
    adjacency: Record<string, string[]>;
    startNodeId: string;
    unlockRequirement: string | null; // null = always unlocked, 'map1' = requires map1 fully conquered
}

// ═══════════════════════════════════════════
// MAP 1 — SCADROSHARIAL
// ═══════════════════════════════════════════

const MAP1_NODES: NodeDef[] = [
    // Verdant Plains — starting area
    { id: 'vp1',     name: 'Start Hold',       defenseValue: 0,   nodeType: 'combat',  trait: 'none',      region: 'verdant_plains', mapX: 45, mapY: 80 },
    { id: 'vp2',     name: 'Greenveil',         defenseValue: 8,   nodeType: 'combat',  trait: 'resource',  region: 'verdant_plains', mapX: 60, mapY: 74 },
    { id: 'vp3',     name: 'Windswept Fields',  defenseValue: 12,  nodeType: 'combat',  trait: 'none',      region: 'verdant_plains', mapX: 30, mapY: 72 },
    { id: 'vp4',     name: 'Thornhaven',        defenseValue: 10,  nodeType: 'combat',  trait: 'resource',  region: 'verdant_plains', mapX: 50, mapY: 65 },

    // Ashlands — mid-left
    { id: 'al1',     name: 'Valley of Ash',     defenseValue: 15,  nodeType: 'combat',  trait: 'none',      region: 'ashlands',       mapX: 22, mapY: 58 },
    { id: 'al2',     name: 'Cinder Ruins',      defenseValue: 20,  nodeType: 'elite',   trait: 'mystic',    region: 'ashlands',       mapX: 12, mapY: 47 },
    { id: 'al3',     name: 'Black Dunes',       defenseValue: 25,  nodeType: 'elite',   trait: 'fortified', region: 'ashlands',       mapX: 28, mapY: 37 },
    { id: 'al4',     name: 'Embervast',         defenseValue: 32,  nodeType: 'elite',   trait: 'none',      region: 'ashlands',       mapX: 8,  mapY: 32 },
    { id: 'al5',     name: 'Scorchwall',        defenseValue: 45,  nodeType: 'elite',   trait: 'fortified', region: 'ashlands',       mapX: 18, mapY: 22 },

    // Iron Highlands — center
    { id: 'ih1',     name: 'Iron Ridge',        defenseValue: 18,  nodeType: 'combat',  trait: 'fortified', region: 'iron_highlands', mapX: 50, mapY: 58 },
    { id: 'ih2',     name: 'Rust Canyon',       defenseValue: 28,  nodeType: 'elite',   trait: 'resource',  region: 'iron_highlands', mapX: 65, mapY: 48 },
    { id: 'ih3',     name: 'Granite Peaks',     defenseValue: 35,  nodeType: 'elite',   trait: 'none',      region: 'iron_highlands', mapX: 48, mapY: 40 },
    { id: 'ih4',     name: 'Irongate Watch',    defenseValue: 40,  nodeType: 'elite',   trait: 'fortified', region: 'iron_highlands', mapX: 62, mapY: 35 },
    { id: 'ih_boss', name: 'Iron Citadel',      defenseValue: 55,  nodeType: 'boss',    trait: 'fortified', region: 'iron_highlands', mapX: 55, mapY: 27 },

    // Crystal Coast — right
    { id: 'cc1',     name: 'Storm Coast',       defenseValue: 22,  nodeType: 'combat',  trait: 'none',      region: 'crystal_coast',  mapX: 78, mapY: 68 },
    { id: 'cc2',     name: 'Lighthouse Watch',  defenseValue: 30,  nodeType: 'elite',   trait: 'mystic',    region: 'crystal_coast',  mapX: 88, mapY: 55 },
    { id: 'cc3',     name: 'Siren Break',       defenseValue: 38,  nodeType: 'elite',   trait: 'fortified', region: 'crystal_coast',  mapX: 82, mapY: 42 },
    { id: 'cc4',     name: 'Tidewall Keep',     defenseValue: 50,  nodeType: 'elite',   trait: 'resource',  region: 'crystal_coast',  mapX: 92, mapY: 30 },
    { id: 'cc_boss', name: 'Abyssal Gate',      defenseValue: 72,  nodeType: 'boss',    trait: 'mystic',    region: 'crystal_coast',  mapX: 88, mapY: 18 },

    // Frozen North — upper
    { id: 'fn1',     name: 'Frostmarch',        defenseValue: 35,  nodeType: 'elite',   trait: 'none',      region: 'frozen_north',   mapX: 38, mapY: 22 },
    { id: 'fn2',     name: 'Glacier Peak',      defenseValue: 42,  nodeType: 'elite',   trait: 'mystic',    region: 'frozen_north',   mapX: 55, mapY: 15 },
    { id: 'fn3',     name: 'Howling Pass',      defenseValue: 45,  nodeType: 'elite',   trait: 'fortified', region: 'frozen_north',   mapX: 22, mapY: 17 },
    { id: 'fn4',     name: 'Rimspire',          defenseValue: 58,  nodeType: 'elite',   trait: 'none',      region: 'frozen_north',   mapX: 10, mapY: 10 },
    { id: 'fn_boss', name: 'Frost Throne',      defenseValue: 85,  nodeType: 'boss',    trait: 'fortified', region: 'frozen_north',   mapX: 32, mapY: 8  },

    // Sunken Expanse — far upper-right, hardest zone
    { id: 'se1',     name: 'Sunken Delta',      defenseValue: 52,  nodeType: 'elite',   trait: 'resource',  region: 'sunken_expanse', mapX: 72, mapY: 22 },
    { id: 'se2',     name: 'Abyssal Trench',    defenseValue: 62,  nodeType: 'elite',   trait: 'fortified', region: 'sunken_expanse', mapX: 82, mapY: 10 },
    { id: 'se3',     name: 'Drowned Vault',     defenseValue: 75,  nodeType: 'elite',   trait: 'mystic',    region: 'sunken_expanse', mapX: 65, mapY: 8  },
    { id: 'se4',     name: 'Maelstrom Reef',    defenseValue: 90,  nodeType: 'elite',   trait: 'fortified', region: 'sunken_expanse', mapX: 78, mapY: 4  },
    { id: 'se_boss', name: 'Void Sovereign',    defenseValue: 120, nodeType: 'boss',    trait: 'mystic',    region: 'sunken_expanse', mapX: 90, mapY: 6  },
];

const MAP1_ADJACENCY: Record<string, string[]> = {
    // Verdant Plains hub
    vp1:     ['vp2', 'vp3', 'vp4', 'ih1'],
    vp2:     ['vp1', 'vp4', 'ih1', 'cc1'],
    vp3:     ['vp1', 'vp4', 'al1', 'ih1'],
    vp4:     ['vp1', 'vp2', 'vp3', 'ih1', 'ih2'],

    // Ashlands chain
    al1:     ['vp3', 'al2', 'al3', 'ih1'],
    al2:     ['al1', 'al3', 'al4'],
    al3:     ['al1', 'al2', 'al4', 'ih3', 'fn3'],
    al4:     ['al2', 'al3', 'al5'],
    al5:     ['al4', 'fn3', 'fn4'],

    // Iron Highlands chain
    ih1:     ['vp1', 'vp2', 'vp3', 'vp4', 'al1', 'ih2', 'ih3'],
    ih2:     ['vp4', 'ih1', 'ih3', 'ih4', 'cc1', 'cc2'],
    ih3:     ['ih1', 'ih2', 'ih4', 'al3', 'fn1', 'ih_boss'],
    ih4:     ['ih2', 'ih3', 'ih_boss', 'cc3', 'fn2'],
    ih_boss: ['ih3', 'ih4', 'fn1', 'fn2'],

    // Crystal Coast chain
    cc1:     ['vp2', 'ih2', 'cc2'],
    cc2:     ['cc1', 'ih2', 'cc3'],
    cc3:     ['cc2', 'ih4', 'cc4', 'se1'],
    cc4:     ['cc3', 'cc_boss', 'se2'],
    cc_boss: ['cc4', 'se2', 'se_boss'],

    // Frozen North chain
    fn1:     ['ih3', 'fn2', 'fn3', 'se1', 'fn_boss', 'ih_boss'],
    fn2:     ['fn1', 'fn3', 'ih4', 'ih_boss', 'se1', 'se3', 'fn_boss'],
    fn3:     ['al3', 'al5', 'fn1', 'fn2', 'fn4'],
    fn4:     ['al5', 'fn3', 'fn_boss'],
    fn_boss: ['fn1', 'fn2', 'fn4', 'se3'],

    // Sunken Expanse (farthest)
    se1:     ['fn1', 'fn2', 'cc3', 'se2', 'se3', 'se_boss'],
    se2:     ['se1', 'cc4', 'cc_boss', 'se4', 'se_boss'],
    se3:     ['fn2', 'fn_boss', 'se1', 'se4'],
    se4:     ['se2', 'se3', 'se_boss'],
    se_boss: ['se1', 'se2', 'se4', 'cc_boss'],
};

// ═══════════════════════════════════════════
// MAP 2 — THE BROKEN WASTES
// ═══════════════════════════════════════════

const MAP2_NODES: NodeDef[] = [
    // Ember Wastes — starting area (south)
    { id: 'ew1',     name: 'Ashen Outpost',     defenseValue: 0,   nodeType: 'combat',  trait: 'none',      region: 'ember_wastes',   mapX: 50, mapY: 82 },
    { id: 'ew2',     name: 'Smouldering Ruins',  defenseValue: 45,  nodeType: 'combat',  trait: 'resource',  region: 'ember_wastes',   mapX: 65, mapY: 76 },
    { id: 'ew3',     name: 'Cinder Flats',       defenseValue: 55,  nodeType: 'combat',  trait: 'none',      region: 'ember_wastes',   mapX: 35, mapY: 74 },
    { id: 'ew4',     name: 'Molten Crossing',    defenseValue: 60,  nodeType: 'elite',   trait: 'resource',  region: 'ember_wastes',   mapX: 52, mapY: 66 },

    // Dead Marshes — mid-left
    { id: 'dm1',     name: 'Rotfen Bog',         defenseValue: 70,  nodeType: 'combat',  trait: 'none',      region: 'dead_marshes',   mapX: 20, mapY: 60 },
    { id: 'dm2',     name: 'Blightwater',        defenseValue: 85,  nodeType: 'elite',   trait: 'mystic',    region: 'dead_marshes',   mapX: 10, mapY: 48 },
    { id: 'dm3',     name: 'Plague Hollow',       defenseValue: 100, nodeType: 'elite',   trait: 'fortified', region: 'dead_marshes',   mapX: 25, mapY: 38 },
    { id: 'dm4',     name: 'Wretched Mire',       defenseValue: 120, nodeType: 'elite',   trait: 'none',      region: 'dead_marshes',   mapX: 8,  mapY: 30 },
    { id: 'dm_boss', name: 'Plague Lord\'s Lair', defenseValue: 160, nodeType: 'boss',    trait: 'mystic',    region: 'dead_marshes',   mapX: 18, mapY: 20 },

    // Obsidian Peaks — center
    { id: 'op1',     name: 'Blackstone Pass',     defenseValue: 75,  nodeType: 'combat',  trait: 'fortified', region: 'obsidian_peaks', mapX: 52, mapY: 56 },
    { id: 'op2',     name: 'Magma Forge',         defenseValue: 95,  nodeType: 'elite',   trait: 'resource',  region: 'obsidian_peaks', mapX: 68, mapY: 46 },
    { id: 'op3',     name: 'Shattered Summit',    defenseValue: 110, nodeType: 'elite',   trait: 'none',      region: 'obsidian_peaks', mapX: 48, mapY: 40 },
    { id: 'op4',     name: 'Volcano\'s Edge',     defenseValue: 130, nodeType: 'elite',   trait: 'fortified', region: 'obsidian_peaks', mapX: 62, mapY: 34 },
    { id: 'op_boss', name: 'Obsidian Throne',     defenseValue: 180, nodeType: 'boss',    trait: 'fortified', region: 'obsidian_peaks', mapX: 55, mapY: 26 },

    // Shadow Rift — right
    { id: 'sr1',     name: 'Twilight Gorge',      defenseValue: 80,  nodeType: 'combat',  trait: 'none',      region: 'shadow_rift',    mapX: 80, mapY: 66 },
    { id: 'sr2',     name: 'Wraith Bridge',       defenseValue: 105, nodeType: 'elite',   trait: 'mystic',    region: 'shadow_rift',    mapX: 90, mapY: 54 },
    { id: 'sr3',     name: 'Nightfall Spire',     defenseValue: 125, nodeType: 'elite',   trait: 'fortified', region: 'shadow_rift',    mapX: 84, mapY: 42 },
    { id: 'sr4',     name: 'Phantom Gate',         defenseValue: 150, nodeType: 'elite',   trait: 'resource',  region: 'shadow_rift',    mapX: 92, mapY: 30 },
    { id: 'sr_boss', name: 'Shadow Tyrant',       defenseValue: 200, nodeType: 'boss',    trait: 'mystic',    region: 'shadow_rift',    mapX: 88, mapY: 18 },

    // Cursed Tundra — upper left
    { id: 'ct1',     name: 'Frozen Blight',       defenseValue: 115, nodeType: 'elite',   trait: 'none',      region: 'cursed_tundra',  mapX: 35, mapY: 22 },
    { id: 'ct2',     name: 'Bonechill Ridge',     defenseValue: 135, nodeType: 'elite',   trait: 'mystic',    region: 'cursed_tundra',  mapX: 50, mapY: 15 },
    { id: 'ct3',     name: 'Deathwind Pass',      defenseValue: 145, nodeType: 'elite',   trait: 'fortified', region: 'cursed_tundra',  mapX: 20, mapY: 16 },
    { id: 'ct4',     name: 'Blackfrost Citadel',  defenseValue: 170, nodeType: 'elite',   trait: 'none',      region: 'cursed_tundra',  mapX: 10, mapY: 8  },
    { id: 'ct_boss', name: 'Undying Glacier',     defenseValue: 220, nodeType: 'boss',    trait: 'fortified', region: 'cursed_tundra',  mapX: 30, mapY: 6  },

    // Void Abyss — far upper-right, hardest zone
    { id: 'va1',     name: 'Rift Maw',            defenseValue: 155, nodeType: 'elite',   trait: 'resource',  region: 'void_abyss',     mapX: 72, mapY: 20 },
    { id: 'va2',     name: 'Nullstone Trench',    defenseValue: 185, nodeType: 'elite',   trait: 'fortified', region: 'void_abyss',     mapX: 82, mapY: 10 },
    { id: 'va3',     name: 'Entropy Well',        defenseValue: 210, nodeType: 'elite',   trait: 'mystic',    region: 'void_abyss',     mapX: 65, mapY: 8  },
    { id: 'va4',     name: 'Apocalypse Reef',     defenseValue: 240, nodeType: 'elite',   trait: 'fortified', region: 'void_abyss',     mapX: 78, mapY: 4  },
    { id: 'va_boss', name: 'World Ender',         defenseValue: 300, nodeType: 'boss',    trait: 'mystic',    region: 'void_abyss',     mapX: 90, mapY: 6  },
];

const MAP2_ADJACENCY: Record<string, string[]> = {
    // Ember Wastes hub
    ew1:     ['ew2', 'ew3', 'ew4', 'op1'],
    ew2:     ['ew1', 'ew4', 'op1', 'sr1'],
    ew3:     ['ew1', 'ew4', 'dm1', 'op1'],
    ew4:     ['ew1', 'ew2', 'ew3', 'op1', 'op2'],

    // Dead Marshes chain
    dm1:     ['ew3', 'dm2', 'dm3', 'op1'],
    dm2:     ['dm1', 'dm3', 'dm4'],
    dm3:     ['dm1', 'dm2', 'dm4', 'op3', 'ct3'],
    dm4:     ['dm2', 'dm3', 'dm_boss'],
    dm_boss: ['dm4', 'ct3', 'ct4'],

    // Obsidian Peaks chain
    op1:     ['ew1', 'ew2', 'ew3', 'ew4', 'dm1', 'op2', 'op3'],
    op2:     ['ew4', 'op1', 'op3', 'op4', 'sr1', 'sr2'],
    op3:     ['op1', 'op2', 'op4', 'dm3', 'ct1', 'op_boss'],
    op4:     ['op2', 'op3', 'op_boss', 'sr3', 'ct2'],
    op_boss: ['op3', 'op4', 'ct1', 'ct2'],

    // Shadow Rift chain
    sr1:     ['ew2', 'op2', 'sr2'],
    sr2:     ['sr1', 'op2', 'sr3'],
    sr3:     ['sr2', 'op4', 'sr4', 'va1'],
    sr4:     ['sr3', 'sr_boss', 'va2'],
    sr_boss: ['sr4', 'va2', 'va_boss'],

    // Cursed Tundra chain
    ct1:     ['op3', 'ct2', 'ct3', 'va1', 'ct_boss', 'op_boss'],
    ct2:     ['ct1', 'ct3', 'op4', 'op_boss', 'va1', 'va3', 'ct_boss'],
    ct3:     ['dm3', 'dm_boss', 'ct1', 'ct2', 'ct4'],
    ct4:     ['dm_boss', 'ct3', 'ct_boss'],
    ct_boss: ['ct1', 'ct2', 'ct4', 'va3'],

    // Void Abyss (farthest)
    va1:     ['ct1', 'ct2', 'sr3', 'va2', 'va3', 'va_boss'],
    va2:     ['va1', 'sr4', 'sr_boss', 'va4', 'va_boss'],
    va3:     ['ct2', 'ct_boss', 'va1', 'va4'],
    va4:     ['va2', 'va3', 'va_boss'],
    va_boss: ['va1', 'va2', 'va4', 'sr_boss'],
};

// ═══════════════════════════════════════════
// CAMPAIGN DEFINITIONS
// ═══════════════════════════════════════════

export const RISK_CAMPAIGNS: Record<string, RiskCampaignDef> = {
    map1: {
        id: 'map1',
        name: 'Scadrosharial',
        subtitle: 'The First Frontier',
        backgroundImage: '/assets/risk/scadrosharial_map.png',
        nodes: MAP1_NODES,
        adjacency: MAP1_ADJACENCY,
        startNodeId: 'vp1',
        unlockRequirement: null,
    },
    map2: {
        id: 'map2',
        name: 'The Broken Wastes',
        subtitle: 'Beyond the Rift',
        backgroundImage: '/assets/risk/broken_wastes_map.png',
        nodes: MAP2_NODES,
        adjacency: MAP2_ADJACENCY,
        startNodeId: 'ew1',
        unlockRequirement: 'map1',
    },
};

export const CAMPAIGN_ORDER = ['map1', 'map2'];
