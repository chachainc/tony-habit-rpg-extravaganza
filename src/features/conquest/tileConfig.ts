// ─── TILE CONFIG — Triple Tile Engine ─────────────────
import bloomSprite    from '../../assets/pets/bloom_sprite.png';
import clockworkOwl   from '../../assets/pets/clockwork_owl.png';
import emberfox       from '../../assets/pets/emberfox.png';
import etherealCow    from '../../assets/pets/ethereal_cow.png';
import lanternSlime   from '../../assets/pets/lantern_slime.png';
import mossGolem      from '../../assets/pets/moss_golem.png';
import obsidianBeetle from '../../assets/pets/obsidian_beetle.png';
import stormPup       from '../../assets/pets/storm_pup.png';
import voidling       from '../../assets/pets/voidling.png';

// ─── LEGACY TYPES (kept for store compatibility) ──────
export type TileRarity     = 'common' | 'rare' | 'epic';
export type TileColorFamily = 'blue' | 'gold' | 'red' | 'green' | 'purple';
export interface TileSymbol {
    id: string; label: string; emoji?: string; imageSrc?: string;
    rarity: TileRarity; colorFamily: TileColorFamily;
}
export type Difficulty = 1 | 2 | 3 | 4;

export const DIFFICULTY_PRESETS = {
    1: { name: 'Normal', totalTiles: 198, symbolCount: 66, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    2: { name: 'Normal', totalTiles: 198, symbolCount: 66, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    3: { name: 'Normal', totalTiles: 198, symbolCount: 66, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    4: { name: 'Normal', totalTiles: 198, symbolCount: 66, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
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

// ═══ TRIPLE TILE ENGINE ════════════════════════════════

// ─── CORE DATA TYPES ──────────────────────────────────
export type TripleTileNode = {
    id: string;
    type: string;
    x: number;
    y: number;
    z: number;
};

export type DockTile = {
    id: string;
    type: string;
    x: number;
    y: number;
    z: number;
};

export type UndoEntry = {
    tile: DockTile;
    prevScore: number;
};

// ─── VISUAL SYMBOL MAP ────────────────────────────────
// Maps tile "type" string (T0, T1, ...) to a display symbol
const DISPLAY_SYMBOLS = ALL_SYMBOLS;

export function getSymbolForType(type: string): TileSymbol {
    // Extract numeric index from "T0", "T1", etc.
    const idx = parseInt(type.replace('T', ''), 10) % DISPLAY_SYMBOLS.length;
    return DISPLAY_SYMBOLS[Math.abs(idx)];
}

// ─── AUTHORED BOARD MAP ───────────────────────────────
function assignTypes(coords: [number, number, number][]): TripleTileNode[] {
    const triadCount = Math.floor(coords.length / 3);

    // 1. Sort coords into Top, Mid, Deep by Exposure (Z desc, Y desc, X asc)
    const byExposure = coords.map((c, i) => ({ c, i })).sort((a, b) => {
        if (a.c[2] !== b.c[2]) return b.c[2] - a.c[2]; // Highest Z first
        if (a.c[1] !== b.c[1]) return b.c[1] - a.c[1]; // Highest Y first (shingle order)
        return a.c[0] - b.c[0];
    });

    const b3 = byExposure.slice(0, triadCount);
    const b2 = byExposure.slice(triadCount, triadCount * 2);
    const b1 = byExposure.slice(triadCount * 2, triadCount * 3);

    // 2. Sort each bucket by X to organize into Left/Center/Right
    const sortX = (a: {c: [number, number, number]}, b: {c: [number, number, number]}) => a.c[0] - b.c[0];
    b3.sort(sortX);
    b2.sort(sortX);
    b1.sort(sortX);

    // 3. Generate and shuffle triad types deterministically (stable)
    const types = Array.from({ length: triadCount }, (_, i) => `T${i}`);
    const shuffledTriads = types
        .map((v, i) => ({ v, sort: (i * 9301 + 49297) % 233280 }))
        .sort((a, b) => a.sort - b.sort)
        .map(x => x.v);

    const nodes: TripleTileNode[] = new Array(coords.length);
    const shift = Math.floor(triadCount / 3);

    // 4. Distribute each triad into Top, Mid, Deep with an X-shift to avoid column stacking
    for (let i = 0; i < triadCount; i++) {
        const type = shuffledTriads[i];
        
        // Piece 1: Top exposed, region i
        const n3 = b3[i];
        nodes[n3.i] = { id: `tile_${n3.i}`, type, x: n3.c[0], y: n3.c[1], z: n3.c[2] };

        // Piece 2: Mid exposed, region shifted
        const b2Idx = (i + shift) % triadCount;
        const n2 = b2[b2Idx];
        nodes[n2.i] = { id: `tile_${n2.i}`, type, x: n2.c[0], y: n2.c[1], z: n2.c[2] };

        // Piece 3: Deep hidden, region shifted twice
        const b1Idx = (i + shift * 2) % triadCount;
        const n1 = b1[b1Idx];
        nodes[n1.i] = { id: `tile_${n1.i}`, type, x: n1.c[0], y: n1.c[1], z: n1.c[2] };
    }

    // Fallback remainder handling (if coords miraculously isn't divisible by 3)
    for (let i = 0; i < coords.length; i++) {
        if (!nodes[i]) {
            const [x, y, z] = coords[i];
            nodes[i] = { id: `tile_${i}`, type: shuffledTriads[0], x, y, z };
        }
    }

    return nodes;
}

const coords: [number, number, number][] = [
    // --- LAYER 0 BEDROCK ---
    ...Array.from({ length: 12 }).flatMap<[number, number, number]>((_, y) => [
        [0, y, 0], [1, y, 0], [2, y, 0]
    ]),
    ...Array.from({ length: 12 }).flatMap<[number, number, number]>((_, y) => [
        [4, y, 0], [5, y, 0], [6, y, 0]
    ]),
    [3, 6, 0], [3, 7, 0], [3, 8, 0], [3, 9, 0],

    // --- LAYER 1 SHINGLE ---
    ...Array.from({ length: 10 }).flatMap<[number, number, number]>((_, y) => [
        [0, y + 1, 1], [1, y + 1, 1], [2, y + 1, 1]
    ]),
    ...Array.from({ length: 10 }).flatMap<[number, number, number]>((_, y) => [
        [4, y + 1, 1], [5, y + 1, 1], [6, y + 1, 1]
    ]),
    [3, 7, 1], [3, 8, 1],

    // --- LAYER 2 TAPER ---
    ...Array.from({ length: 8 }).flatMap<[number, number, number]>((_, y) => [
        [1, y + 2, 2], [2, y + 2, 2]
    ]),
    ...Array.from({ length: 8 }).flatMap<[number, number, number]>((_, y) => [
        [4, y + 2, 2], [5, y + 2, 2]
    ]),

    // --- ELEVATOR SHAFTS (LEFT) ---
    ...Array.from({ length: 10 }).map<[number, number, number]>((_, z) => [1, 13, z]),

    // --- ELEVATOR SHAFTS (RIGHT) ---
    ...Array.from({ length: 10 }).map<[number, number, number]>((_, z) => [5, 13, z]),

    // --- INNER STACKS ---
    [2, 11, 3], [2, 11, 4], [2, 11, 5], [2, 11, 6],
    [4, 11, 3], [4, 11, 4], [4, 11, 5], [4, 11, 6],
];

// ─── MODULE-LOAD VALIDATION (fails hard on bad map) ───
(function validateBoard() {
    const total = coords.length;
    if (total % 3 !== 0) {
        throw new Error(
            `[TileConfig] FATAL: Board coord count (${total}) is not divisible by 3. Cannot form triads.`
        );
    }
    // Post-assign validation happens lazily on first use via trueTripleTileMap
    console.info(`[TileConfig] Board: ${total} tiles → ${total / 3} triads ✓`);
})();

export const trueTripleTileMap: TripleTileNode[] = assignTypes(coords);

// ─── POST-ASSIGN VALIDATION ───────────────────────────
(function validateTypes() {
    const counts = new Map<string, number>();
    for (const t of trueTripleTileMap) {
        counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    }
    for (const [type, count] of counts) {
        if (count % 3 !== 0) {
            throw new Error(
                `[TileConfig] FATAL: Type "${type}" has count ${count}, not divisible by 3.`
            );
        }
    }
    console.info(`[TileConfig] All ${counts.size} types are valid triads ✓`);
})();

// ─── BEDROCK DIVOT COORDS (z=0 unique x,y pairs) ─────
export const bedrockDivots: { x: number; y: number }[] = (() => {
    const seen = new Set<string>();
    const divots: { x: number; y: number }[] = [];
    for (const [x, y, z] of coords) {
        if (z === 0) {
            const key = `${x},${y}`;
            if (!seen.has(key)) {
                seen.add(key);
                divots.push({ x, y });
            }
        }
    }
    return divots;
})();

// ─── LOCKING LOGIC (symbolic, no geometry) ────────────
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return tiles.some(b => b.id !== tile.id && b.x === tile.x && b.y === tile.y && b.z > tile.z);
}

export function isShingleLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return tiles.some(b => b.id !== tile.id && b.x === tile.x && b.y === tile.y + 1 && b.z >= tile.z);
}

export function isTileLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return isDirectStackLocked(tile, tiles) || isShingleLocked(tile, tiles);
}

// ─── LEGACY COMPAT (generateBoard still used by store) ─
export function createSeededRng(seed: number) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// BoardTile kept for backward compat with useConquestStore / history refs
export interface BoardTile {
    uid: number; symbolId: string; symbol: TileSymbol;
    layer: number; x: number; y: number; removed: boolean;
}

export function generateBoard(_difficulty: Difficulty, _seed: number): BoardTile[] {
    // Shim — returns empty. Not used by Triple Tile engine.
    return [];
}

export const isTileBlocked = (_tile: BoardTile, _tiles: BoardTile[]): boolean => false;
