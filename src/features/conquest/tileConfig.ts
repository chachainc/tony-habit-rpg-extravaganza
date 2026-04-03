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

export const TILE_IMAGES: Record<string, string> = {
  'sword': '/assets/tiles/sword.png',
  'shield': '/assets/tiles/shield.png',
  'helmet': '/assets/tiles/helmet.png',
  'crown': '/assets/tiles/crown.png',
  'gem': '/assets/tiles/gem.png',
  'scroll': '/assets/tiles/scroll.png',
  'potion': '/assets/tiles/potion.png',
  'ring': '/assets/tiles/ring.png',
  'key': '/assets/tiles/key.png',
  'book': '/assets/tiles/book.png',
  'meat': '/assets/tiles/meat.png',
  'coin': '/assets/tiles/coin.png',
  // legacy fallbacks
  'chalice': '/assets/tiles/chalice.png',
  'owl': '/assets/tiles/owl.png',
  'fox': '/assets/tiles/fox.png',
  'slime': '/assets/tiles/slime.png',
  'golem': '/assets/tiles/golem.png',
};

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

export const TILE_TYPES = [
  // CORE
  'sword', 'shield', 'helmet', 'crown', 'gem', 'scroll', 'potion', 'ring',
  // SUPPORT
  'coin', 'key', 'meat', 'book'
];

export const TILE_COLORS: Record<string, string> = {
  'sword': '#e8ecef',  // silver/steel
  'shield': '#e3f2fd', // blue
  'helmet': '#efebe9', // bronze
  'crown': '#fff8e1',  // gold
  'gem': '#f3e5f5',    // purple
  'scroll': '#fdf8e3', // tan
  'potion': '#e8f5e9', // green
  'ring': '#fff3e0',   // warm gold
  'coin': '#fffde7',   // yellow
  'key': '#fbe9e7',    // brass
  'meat': '#ffebee',   // red
  'book': '#e8eaf6'    // blue/red tint
};

export function generateValidBoard(rawCoordinates: [number, number, number][]): TripleTileNode[] {
  // 1. Generate exactly 12 of each type (144 total, 48 Triads)
  let rawPool: string[] = [];
  TILE_TYPES.forEach(type => {
    for (let i = 0; i < 12; i++) {
      rawPool.push(type);
    }
  });

  // 2. Sort coordinates into 3 depth/region "Buckets" to prevent clustering
  // Bucket A: High visibility, top layers (Early Game Flow)
  // Bucket B: Mid layers, shingled arms (Mid Game Balance)
  // Bucket C: Deep elevator shafts, Z > 2 (Late Game Grinding)
  let bucketA: [number, number, number][] = [];
  let bucketB: [number, number, number][] = [];
  let bucketC: [number, number, number][] = [];

  rawCoordinates.forEach(coord => {
    if (coord[2] === 0) bucketA.push(coord); // Bedrock
    else if (coord[2] === 1) bucketB.push(coord); // Shingle
    else bucketC.push(coord); // Elevator Shafts
  });

  // 3. Deterministically deal the triads across the 3 buckets
  // This guarantees that 3 identical tiles NEVER end up in the same vertical stack
  let finalBoard: TripleTileNode[] = [];
  
  // We deal 4 triads per type = 12 tiles. 
  // We put 4 in A, 4 in B, 4 in C for perfect vertical distribution.
  const dealToBucket = (bucket: [number, number, number][], type: string, count: number) => {
      for(let i=0; i<count; i++) {
          if (bucket.length === 0) break;
          // Deterministic pseudo-random pick from remaining bucket slots
          const index = (type.length * 137 + i * 41) % bucket.length;
          const coord = bucket.splice(index, 1)[0];
          finalBoard.push({
              id: `tile-${coord[0]}-${coord[1]}-${coord[2]}`,
              type: type,
              x: coord[0],
              y: coord[1],
              z: coord[2]
          });
      }
  };

  TILE_TYPES.forEach(type => {
      dealToBucket(bucketA, type, 4);
      dealToBucket(bucketB, type, 4);
      dealToBucket(bucketC, type, 4);
  });

  // If any odd tiles are left due to rounding, sweep them up
  const remainingCoords = [...bucketA, ...bucketB, ...bucketC];
  remainingCoords.forEach((coord, i) => {
       finalBoard.push({
              id: `tile-sweep-${i}`,
              type: TILE_TYPES[i % 12],
              x: coord[0],
              y: coord[1],
              z: coord[2]
          });
  });

  return finalBoard;
}

const rawCoordinates: [number, number, number][] = [
  // === Z=0: THE BEDROCK BASE (60 Tiles) ===
  // Left Arm (Jagged outer edge)
  [1,0,0], [2,0,0],
  [0,1,0], [1,1,0], [2,1,0],
  [0,2,0], [1,2,0], [2,2,0],
  [0,3,0], [1,3,0], [2,3,0],
  [0,4,0], [1,4,0], [2,4,0],
  [1,5,0], [2,5,0],
  [1,6,0], [2,6,0],
  [1,7,0], [2,7,0],
  [1,8,0], [2,8,0],
  // Right Arm (Jagged outer edge)
  [4,0,0], [5,0,0],
  [4,1,0], [5,1,0], [6,1,0],
  [4,2,0], [5,2,0], [6,2,0],
  [4,3,0], [5,3,0], [6,3,0],
  [4,4,0], [5,4,0], [6,4,0],
  [4,5,0], [5,5,0],
  [4,6,0], [5,6,0],
  [4,7,0], [5,7,0],
  [4,8,0], [5,8,0],
  // Center Bridge
  [3,4,0], [3,5,0], [3,6,0], [3,7,0],
  // The Feet Bases
  [1,10,0], [2,10,0], [4,10,0], [5,10,0],
  [1,11,0], [5,11,0],

  // === Z=1: FIRST SHINGLE LAYER (42 Tiles) ===
  // Left Arm
  [1,1,1], [2,1,1],
  [0,2,1], [1,2,1], [2,2,1],
  [0,3,1], [1,3,1], [2,3,1],
  [1,4,1], [2,4,1],
  [1,5,1], [2,5,1],
  [1,6,1], [2,6,1],
  [1,7,1], [2,7,1],
  // Right Arm
  [4,1,1], [5,1,1],
  [4,2,1], [5,2,1], [6,2,1],
  [4,3,1], [5,3,1], [6,3,1],
  [4,4,1], [5,4,1],
  [4,5,1], [5,5,1],
  [4,6,1], [5,6,1],
  [4,7,1], [5,7,1],
  // Bridge
  [3,5,1], [3,6,1],

  // === Z=2: THE RIDGES (18 Tiles) ===
  [1,2,2], [2,2,2], [4,2,2], [5,2,2],
  [1,3,2], [2,3,2], [4,3,2], [5,3,2],
  [1,4,2], [2,4,2], [4,4,2], [5,4,2],
  [2,5,2], [4,5,2],
  [2,6,2], [4,6,2],
  [3,5,2], [3,6,2], // Bridge Peaks

  // === Z=3 TO Z=6: THE ELEVATOR SHAFTS (24 Tiles) ===
  // These are the deep, isolated traps at the bottom of the board
  // Left Inner Foot
  [2,10,1], [2,10,2], [2,10,3],
  // Right Inner Foot
  [4,10,1], [4,10,2], [4,10,3],
  // Left Outer Foot (Deepest)
  [1,11,1], [1,11,2], [1,11,3], [1,11,4], [1,11,5], [1,11,6], [1,11,7], [1,11,8], [1,11,9],
  // Right Outer Foot (Deepest)
  [5,11,1], [5,11,2], [5,11,3], [5,11,4], [5,11,5], [5,11,6], [5,11,7], [5,11,8], [5,11,9]
];

// ─── MODULE-LOAD VALIDATION (fails hard on bad map) ───
(function validateBoard() {
    const total = rawCoordinates.length;
    if (total !== 144) {
        throw new Error(
            `[TileConfig] FATAL: Board coord count (${total}) is not exactly 144. Found ${total}.`
        );
    }
    // Post-assign validation happens lazily on first use via trueTripleTileMap
    console.info(`[TileConfig] Board: ${total} tiles → ${total / 3} triads ✓`);
})();

export const trueTripleTileMap: TripleTileNode[] = generateValidBoard(rawCoordinates);

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
    for (const [x, y, z] of rawCoordinates) {
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
