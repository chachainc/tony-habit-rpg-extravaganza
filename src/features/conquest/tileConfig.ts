// ─── TILE CONFIG — Mahjong Board Engine ───────────────
import bloomSprite    from '../../assets/pets/bloom_sprite.png';
import clockworkOwl   from '../../assets/pets/clockwork_owl.png';
import emberfox       from '../../assets/pets/emberfox.png';
import etherealCow    from '../../assets/pets/ethereal_cow.png';
import lanternSlime   from '../../assets/pets/lantern_slime.png';
import mossGolem      from '../../assets/pets/moss_golem.png';
import obsidianBeetle from '../../assets/pets/obsidian_beetle.png';
import stormPup       from '../../assets/pets/storm_pup.png';
import voidling       from '../../assets/pets/voidling.png';

export type TileRarity      = 'common' | 'rare' | 'epic';
export type TileColorFamily = 'blue' | 'gold' | 'red' | 'green' | 'purple';
export interface TileSymbol {
    id: string; label: string; emoji?: string; imageSrc?: string;
    rarity: TileRarity; colorFamily: TileColorFamily;
}
export type Difficulty = 1 | 2 | 3 | 4;

export const TILE_IMAGES: Record<string, string> = {
    sword:    '/assets/tiles/sword.png',    shield:   '/assets/tiles/shield.png',
    potion:   '/assets/tiles/potion.png',   crown:    '/assets/tiles/crown.png',
    book:     '/assets/tiles/book.png',     gem:      '/assets/tiles/gem.png',
    key:      '/assets/tiles/key.png',      scroll:   '/assets/tiles/scroll.png',
    helmet:   '/assets/tiles/helmet.png',   coin:     '/assets/tiles/coin.png',
    relic:    '/assets/tiles/relic.png',    gauntlet: '/assets/tiles/gauntlet.png',
    ring:     '/assets/tiles/ring.png',     chest:    '/assets/tiles/chest.png',
    flame:    '/assets/tiles/flame.png',    moon:     '/assets/tiles/moon.png',
};

export const DIFFICULTY_PRESETS = {
    1: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 4, label: '🎴 Mahjong', gemReward: 1 },
    2: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 4, label: '🎴 Mahjong', gemReward: 1 },
    3: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 4, label: '🎴 Mahjong', gemReward: 1 },
    4: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 4, label: '🎴 Mahjong', gemReward: 1 },
} as const;

export const POWER_COSTS = { remove: 50, undo: 30, shuffle: 80 } as const;

export const SOLDIER_SYMBOLS: TileSymbol[] = [
    { id: 'item_sword',   label: 'Sword',   emoji: '⚔️', rarity: 'common', colorFamily: 'red'  },
    { id: 'item_shield',  label: 'Shield',  emoji: '🛡️', rarity: 'common', colorFamily: 'red'  },
    { id: 'item_scroll',  label: 'Scroll',  emoji: '📜', rarity: 'common', colorFamily: 'blue' },
    { id: 'item_potion',  label: 'Potion',  emoji: '🧪', rarity: 'common', colorFamily: 'blue' },
    { id: 'item_gem',     label: 'Gem',     emoji: '💎', rarity: 'common', colorFamily: 'gold' },
    { id: 'item_coin',    label: 'Coin',    emoji: '🪙', rarity: 'common', colorFamily: 'gold' },
    { id: 'item_ring',    label: 'Ring',    emoji: '💍', rarity: 'common', colorFamily: 'gold' },
    { id: 'item_crown',   label: 'Crown',   emoji: '👑', rarity: 'common', colorFamily: 'gold' },
    { id: 'item_key',     label: 'Key',     emoji: '🗝️', rarity: 'common', colorFamily: 'gold' },
    { id: 'item_book',    label: 'Book',    emoji: '📘', rarity: 'common', colorFamily: 'blue' },
    { id: 'item_meat',    label: 'Meat',    emoji: '🍖', rarity: 'common', colorFamily: 'red'  },
    { id: 'item_chalice', label: 'Chalice', emoji: '🍷', rarity: 'common', colorFamily: 'gold' },
];
export const PET_SYMBOLS: TileSymbol[] = [
    { id: 'pet_bloom_sprite',    label: 'Bloom',    imageSrc: bloomSprite,    rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_clockwork_owl',   label: 'Owl',      imageSrc: clockworkOwl,   rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_emberfox',        label: 'Emberfox', imageSrc: emberfox,       rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_ethereal_cow',    label: 'Cow',      imageSrc: etherealCow,    rarity: 'epic', colorFamily: 'green' },
    { id: 'pet_lantern_slime',   label: 'Slime',    imageSrc: lanternSlime,   rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_moss_golem',      label: 'Golem',    imageSrc: mossGolem,      rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_obsidian_beetle', label: 'Beetle',   imageSrc: obsidianBeetle, rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_storm_pup',       label: 'StormPup', imageSrc: stormPup,       rarity: 'rare', colorFamily: 'green' },
    { id: 'pet_voidling',        label: 'Voidling', imageSrc: voidling,       rarity: 'epic', colorFamily: 'green' },
];
export const ALL_SYMBOLS: TileSymbol[] = [...SOLDIER_SYMBOLS, ...PET_SYMBOLS];

// ─── 16 TILE TYPES × 18 copies = 288 ─────────────────
export const TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
] as const;

export const TILE_COLORS: Record<string, string> = {
    sword: '#fafaf8', shield: '#fafaf8', potion: '#fafaf8', crown: '#fafaf8',
    book: '#fafaf8', gem: '#fafaf8', key: '#fafaf8', scroll: '#fafaf8',
    helmet: '#fafaf8', coin: '#fafaf8', relic: '#fafaf8', gauntlet: '#fafaf8',
    ring: '#fafaf8', chest: '#fafaf8', flame: '#fafaf8', moon: '#fafaf8',
};

// ═══ MAHJONG TILE ENGINE ══════════════════════════════

export type TripleTileNode = {
    id: string;
    type: string;
    x: number; // column index
    y: number; // row index
    z: number; // layer (0=base, 1,2,3=upper)
};

export type DockTile = {
    id: string;
    type: string;
    x: number; y: number; z: number;
};

export type UndoEntry = {
    tile: DockTile;
    prevScore: number;
};

// ─── BLUEPRINT — 288 tiles across 4 Z-layers ──────────
// 8 cols × Z0:21rows + Z1:14rows(shrunk) + Z2:7rows + Z3:4rows
// Silhouette: wide base narrows to peaked crown (castle pyramid)
// Visual map (each row shows col 0-7 with X=tile, space=empty):
//
//  Z=0 (168): Full 8×21 rectangle — wide, solid base
//  Z=1 ( 84): 6×14 centered block — rows 3-16, cols 1-6
//  Z=2 ( 28): 4×7 inner block    — rows 7-13, cols 2-5
//  Z=3 (  8): 2×4 crown          — rows 9-12, cols 3-4
//
//  From the side:            ██              ← z=3 (peak)
//                          ██████            ← z=2
//                      ████████████          ← z=1
//                  ████████████████████      ← z=0 (base)
//

/* eslint-disable */
const blueprint: string[][] = [
    // Z = 0: 8 columns × 21 rows = 168 tiles
    Array.from({ length: 21 }, () => 'XXXXXXXX'),

    // Z = 1: cols 1-6 (6 wide) × rows 3-16 (14 rows) = 84 tiles
    [
        '        ', '        ', '        ',          // rows 0-2
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ',                      // rows 3-16 (14)
        '        ', '        ', '        ', '        ', // rows 17-20
    ],

    // Z = 2: cols 2-5 (4 wide) × rows 7-13 (7 rows) = 28 tiles
    [
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', // rows 0-6
        '  XXXX  ', '  XXXX  ', '  XXXX  ',
        '  XXXX  ', '  XXXX  ', '  XXXX  ', '  XXXX  ', // rows 7-13 (7)
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', // rows 14-20
    ],

    // Z = 3: cols 3-4 (2 wide) × rows 9-12 (4 rows) = 8 tiles
    [
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ', // rows 0-8
        '   XX   ', '   XX   ', '   XX   ', '   XX   ', // rows 9-12 (4)
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ', // rows 13-20
    ],
];
/* eslint-enable */

function parseBlueprint(bp: string[][]): [number, number, number][] {
    const coords: [number, number, number][] = [];
    bp.forEach((layer, z) => {
        layer.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                if (row[x] === 'X') coords.push([x, y, z]);
            }
        });
    });
    return coords;
}

const rawCoordinates = parseBlueprint(blueprint);

// ─── VALIDATION ───────────────────────────────────────
(function validateBoard() {
    const total = rawCoordinates.length;
    if (total !== 288) throw new Error(`[Mahjong] FATAL: Expected 288 tiles, got ${total}`);
    console.info(`[Mahjong] Blueprint: ${total} tiles, 96 match-3 sets ✓`);
})();

// ─── TILE DISTRIBUTION ────────────────────────────────
export function generateValidBoard(coords: [number, number, number][]): TripleTileNode[] {
    const total  = coords.length;          // 288
    const groups = total / 3;              // 96 triads

    // Build pool: 16 types × 18 = 288 (6 triads each)
    const pool: string[] = [];
    TILE_TYPES.forEach(t => { for (let i = 0; i < 18; i++) pool.push(t); });

    // Seeded shuffle
    let seed = 91237;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Spread triads: each type gets 1 tile in each of 3 z-level bands
    const sorted = [...coords].sort((a, b) => a[2] !== b[2] ? a[2] - b[2] : a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]);
    const third  = total / 3;
    const b1 = sorted.slice(0, third);
    const b2 = sorted.slice(third, third * 2);
    const b3 = sorted.slice(third * 2);

    const board: TripleTileNode[] = [];
    for (let i = 0; i < groups; i++) {
        const type = pool[i * 3 % pool.length] ?? TILE_TYPES[i % 16];
        const c1 = b1[i % b1.length];
        const c2 = b2[(i + 13) % b2.length];
        const c3 = b3[(i + 29) % b3.length];
        if (c1) board.push({ id: `t${c1[0]}_${c1[1]}_${c1[2]}`, type, x: c1[0], y: c1[1], z: c1[2] });
        if (c2) board.push({ id: `t${c2[0]}_${c2[1]}_${c2[2]}`, type, x: c2[0], y: c2[1], z: c2[2] });
        if (c3) board.push({ id: `t${c3[0]}_${c3[1]}_${c3[2]}`, type, x: c3[0], y: c3[1], z: c3[2] });
    }

    // Validate type counts
    const counts = new Map<string, number>();
    for (const t of board) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    for (const [type, count] of counts) {
        if (count % 3 !== 0) console.warn(`[Mahjong] Type "${type}" count ${count} not divisible by 3`);
    }
    console.info(`[Mahjong] Board generated: ${board.length} tiles ✓`);
    return board;
}

// ─── BLOCKING RULES ───────────────────────────────────
/** Blocked from above: any tile at same x,y with higher z */
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return tiles.some(b => b.x === tile.x && b.y === tile.y && b.z > tile.z);
}

/** Blocked horizontally: tiles on BOTH left and right at same y,z */
export function isLeftRightBlocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    const hasLeft  = tiles.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x - 1);
    const hasRight = tiles.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x + 1);
    return hasLeft && hasRight;
}

export function isTileLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return isDirectStackLocked(tile, tiles) || isLeftRightBlocked(tile, tiles);
}

// ─── BOARD EXPORT ─────────────────────────────────────
export const trueTripleTileMap: TripleTileNode[] = generateValidBoard(rawCoordinates);

/** z=0 positions for ghost divot grid */
export const bedrockDivots: { x: number; y: number }[] = (() => {
    const seen = new Set<string>();
    return rawCoordinates
        .filter(([,, z]) => z === 0)
        .flatMap(([x, y]) => {
            const k = `${x},${y}`;
            if (seen.has(k)) return [];
            seen.add(k);
            return [{ x, y }];
        });
})();

// ─── LEGACY COMPAT ────────────────────────────────────
export interface BoardTile {
    uid: number; symbolId: string; symbol: TileSymbol;
    layer: number; x: number; y: number; removed: boolean;
}
export function createSeededRng(seed: number) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
export function generateBoard(_d: Difficulty, _s: number): BoardTile[] { return []; }
export const isTileBlocked = () => false;
export function getSymbolForType(type: string): TileSymbol {
    const idx = parseInt(type.replace('T', ''), 10) % ALL_SYMBOLS.length;
    return ALL_SYMBOLS[Math.abs(idx) || 0];
}

// Stack engine types (kept for forward compat)
export type StackTile = { id: string; symbol: string; };
export type TileStack = { stackId: string; col: number; row: number; tiles: StackTile[]; maxDepth: number; };
export function isStackFree() { return true; }
export function generateStackBoard() { return [] as TileStack[]; }
