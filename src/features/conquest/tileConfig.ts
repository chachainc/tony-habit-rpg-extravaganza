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
  'potion': '/assets/tiles/potion.png',
  'crown': '/assets/tiles/crown.png',
  'book': '/assets/tiles/book.png',
  'gem': '/assets/tiles/gem.png',
  'key': '/assets/tiles/key.png',
  'scroll': '/assets/tiles/scroll.png',
  'helmet': '/assets/tiles/helmet.png',
  'coin': '/assets/tiles/coin.png',
  'relic': '/assets/tiles/relic.png',
  'gauntlet': '/assets/tiles/gauntlet.png',
  'ring': '/assets/tiles/ring.png',
  'chest': '/assets/tiles/chest.png',
  'flame': '/assets/tiles/flame.png',
  'moon': '/assets/tiles/moon.png',
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
  'sword', 'shield', 'potion', 'crown', 'book', 'gem', 'key', 'scroll',
  'helmet', 'coin', 'relic', 'gauntlet', 'ring', 'chest', 'flame', 'moon'
];

export const TILE_COLORS: Record<string, string> = {
  'sword': '#fafaf8',
  'shield': '#fafaf8',
  'potion': '#fafaf8',
  'crown': '#fafaf8',
  'book': '#fafaf8',
  'gem': '#fafaf8',
  'key': '#fafaf8',
  'scroll': '#fafaf8',
  'helmet': '#fafaf8',
  'coin': '#fafaf8',
  'relic': '#fafaf8',
  'gauntlet': '#fafaf8',
  'ring': '#fafaf8',
  'chest': '#fafaf8',
  'flame': '#fafaf8',
  'moon': '#fafaf8',
};

export function generateValidBoard(rawCoordinates: [number, number, number][]): TripleTileNode[] {
  const totalTiles = rawCoordinates.length;
  const groups = Math.floor(totalTiles / 3);

  // 1. Build a strict pool mathematically using exactly multiples of 3
  const triadTypes: string[] = [];
  const triadsPerType = Math.floor(groups / TILE_TYPES.length);
  
  TILE_TYPES.forEach(type => {
      for (let i = 0; i < triadsPerType; i++) {
          triadTypes.push(type);
      }
  });

  // Assign any remaining triads generically if Math.floor left gaps
  while (triadTypes.length < groups) {
      triadTypes.push(TILE_TYPES[triadTypes.length % TILE_TYPES.length]);
  }

  // Shuffle deterministically
  let seed = 9301;
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = triadTypes.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [triadTypes[i], triadTypes[j]] = [triadTypes[j], triadTypes[i]];
  }

  // 2. Sort all coordinates by Z-depth to safely distribute 1 triad piece across Low/Mid/Deep
  const sortedCoords = [...rawCoordinates].sort((a, b) => {
      if (a[2] !== b[2]) return a[2] - b[2];
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0] - b[0];
  });

  const finalBoard: TripleTileNode[] = [];
  const third = Math.floor(totalTiles / 3);
  
  // Divide cleanly into 3 chunks
  const b1 = sortedCoords.slice(0, third);
  const b2 = sortedCoords.slice(third, third * 2);
  const b3 = sortedCoords.slice(third * 2, totalTiles);

  // 3. Assign mathematically
  for (let i = 0; i < groups; i++) {
      const type = triadTypes[i];
      // Offset mid/deep index to decouple X/Y overlap from deterministic logic
      const c1 = b1[i % b1.length];
      const c2 = b2[(i + 17) % b2.length];
      const c3 = b3[(i + 31) % b3.length];
      
      if (c1) finalBoard.push({ id: `tile-${c1[0]}-${c1[1]}-${c1[2]}`, type, x: c1[0], y: c1[1], z: c1[2] });
      if (c2) finalBoard.push({ id: `tile-${c2[0]}-${c2[1]}-${c2[2]}`, type, x: c2[0], y: c2[1], z: c2[2] });
      if (c3) finalBoard.push({ id: `tile-${c3[0]}-${c3[1]}-${c3[2]}`, type, x: c3[0], y: c3[1], z: c3[2] });
  }

  // Safety sweep for unassigned fallback
  if (finalBoard.length < totalTiles) {
      const assigned = new Set(finalBoard.map(t => `${t.x},${t.y},${t.z}`));
      sortedCoords.forEach(c => {
         if (!assigned.has(`${c[0]},${c[1]},${c[2]}`)) {
             finalBoard.push({ id: `tile-${c[0]}-${c[1]}-${c[2]}`, type: TILE_TYPES[0], x: c[0], y: c[1], z: c[2] });
         }
      });
  }

  return finalBoard;
}

const blueprint = [
  // Z = 0 (168)
  [
    "    XXXXXXXXXXXXXXXX    ",
    "  XXXXXXXXXXXXXXXXXXXX  ",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "  XXXXXXXXXXXXXXXXXXXX  ",
    "    XXXXXXXXXXXXXXXX    ",
  ],
  // Z = 1 (84)
  [
    "                        ",
    "       XXXXXXXXXX       ",
    "     XXXXXXXXXXXXXX     ",
    "   XXXXXXXXXXXXXXXXXX   ",
    "   XXXXXXXXXXXXXXXXXX   ",
    "     XXXXXXXXXXXXXX     ",
    "       XXXXXXXXXX       ",
    "                        ",
  ],
  // Z = 2 (28)
  [
    "                        ",
    "                        ",
    "         XXXXXX         ",
    "        XXXXXXXX        ",
    "        XXXXXXXX        ",
    "         XXXXXX         ",
    "                        ",
    "                        ",
  ],
  // Z = 3 (8)
  [
    "                        ",
    "                        ",
    "                        ",
    "          XXXX          ",
    "          XXXX          ",
    "                        ",
    "                        ",
    "                        ",
  ]
];

function parseBlueprint(bp: string[][]): [number, number, number][] {
    const coords: [number, number, number][] = [];
    bp.forEach((layer, z) => {
        layer.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                if (row[x] === 'X') {
                    coords.push([x, y, z]);
                }
            }
        });
    });
    return coords;
}

const rawCoordinates: [number, number, number][] = parseBlueprint(blueprint);

// ─── MODULE-LOAD VALIDATION (fails hard on bad map) ───
(function validateBoard() {
    const total = rawCoordinates.length;
    console.debug(`[TileConfig] Pre-validation Board Coord Count: ${total}`);
    if (total !== 288) {
        throw new Error(
            `[TileConfig] FATAL: Board coord count (${total}) is not exactly 288. Found ${total}.`
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
    
    // Debug & Normalization Block
    console.debug(`[TileConfig] Pre-Validation Tile Type Counts:`);
    let needsNormalization = false;
    for (const [type, count] of counts) {
        console.debug(`  - ${type}: ${count}`);
        if (count % 3 !== 0) needsNormalization = true;
    }

    if (needsNormalization) {
        console.warn(`[TileConfig] Normalization triggered! Rebalancing tiles to multiples of 3...`);
        const strayNodes: TripleTileNode[] = [];
        for (const [type, count] of counts) {
            const remainder = count % 3;
            if (remainder > 0) {
                 let foundCount = 0;
                 for (let i = trueTripleTileMap.length - 1; i >= 0; i--) {
                     if (trueTripleTileMap[i].type === type && foundCount < remainder) {
                         strayNodes.push(trueTripleTileMap[i]);
                         foundCount++;
                     }
                 }
            }
        }
        
        const validTypes = Array.from(counts.keys());
        for (let i = 0; i < strayNodes.length; i++) {
             const typeGroup = Math.floor(i / 3) % validTypes.length;
             strayNodes[i].type = validTypes[typeGroup];
        }
        
        counts.clear();
        for (const t of trueTripleTileMap) {
            counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
        }
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

// ─── LOCKING LOGIC (true mahjong geometry) ────────────
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return tiles.some(b => b.x === tile.x && b.y === tile.y && b.z > tile.z);
}

export function isLeftRightBlocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    const hasLeft  = tiles.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x - 1);
    const hasRight = tiles.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x + 1);
    return hasLeft && hasRight;
}

export function isTileLocked(tile: TripleTileNode, tiles: TripleTileNode[]): boolean {
    return isDirectStackLocked(tile, tiles) || isLeftRightBlocked(tile, tiles);
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
