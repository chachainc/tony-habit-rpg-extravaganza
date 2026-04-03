// ─── TILE CONFIG — Stack Puzzle Engine ────────────────
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
  'sword':    '/assets/tiles/sword.png',
  'shield':   '/assets/tiles/shield.png',
  'potion':   '/assets/tiles/potion.png',
  'crown':    '/assets/tiles/crown.png',
  'book':     '/assets/tiles/book.png',
  'gem':      '/assets/tiles/gem.png',
  'key':      '/assets/tiles/key.png',
  'scroll':   '/assets/tiles/scroll.png',
  'helmet':   '/assets/tiles/helmet.png',
  'coin':     '/assets/tiles/coin.png',
  'relic':    '/assets/tiles/relic.png',
  'gauntlet': '/assets/tiles/gauntlet.png',
  'ring':     '/assets/tiles/ring.png',
  'chest':    '/assets/tiles/chest.png',
  'flame':    '/assets/tiles/flame.png',
  'moon':     '/assets/tiles/moon.png',
};

export const DIFFICULTY_PRESETS = {
    1: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    2: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    3: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
    4: { name: 'Normal', totalTiles: 288, symbolCount: 96, layers: 10, label: '🎴 Conquest Tiles', gemReward: 1 },
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

// ─── 16 TILE TYPES (16 × 18 = 288 total) ─────────────
export const TILE_TYPES = [
  'sword', 'shield', 'potion', 'crown', 'book', 'gem', 'key', 'scroll',
  'helmet', 'coin', 'relic', 'gauntlet', 'ring', 'chest', 'flame', 'moon'
] as const;

export const TILE_COLORS: Record<string, string> = {
  'sword': '#fafaf8', 'shield': '#fafaf8', 'potion': '#fafaf8', 'crown': '#fafaf8',
  'book': '#fafaf8', 'gem': '#fafaf8', 'key': '#fafaf8', 'scroll': '#fafaf8',
  'helmet': '#fafaf8', 'coin': '#fafaf8', 'relic': '#fafaf8', 'gauntlet': '#fafaf8',
  'ring': '#fafaf8', 'chest': '#fafaf8', 'flame': '#fafaf8', 'moon': '#fafaf8',
};

// ═══ STACK PUZZLE ENGINE ══════════════════════════════

// ─── CORE DATA TYPES ──────────────────────────────────
export type StackTile = {
  id: string;
  symbol: string;
};

export type TileStack = {
  stackId: string;
  col: number;
  row: number;
  tiles: StackTile[]; // [0] = bottom, [last] = top
  maxDepth: number;
};

export type DockTile = {
  id: string;
  type: string;
  col: number;
  row: number;
};

export type UndoEntry = {
  tile: DockTile;
  stackId: string;
  prevScore: number;
};

// ─── CASTLE SILHOUETTE LAYOUT (44 stacks = 288 tiles) ─
// Depths verified: Row sums = 40+48+56+56+48+40 = 288
const STACK_LAYOUT: { col: number; row: number; depth: number }[] = [
  // Row 0 — castle battlements (cols 1-6)
  {col:1,row:0,depth:6}, {col:2,row:0,depth:7}, {col:3,row:0,depth:7},
  {col:4,row:0,depth:7}, {col:5,row:0,depth:7}, {col:6,row:0,depth:6},
  // Row 1 — upper walls (cols 0-7)
  {col:0,row:1,depth:5}, {col:1,row:1,depth:6}, {col:2,row:1,depth:6},
  {col:3,row:1,depth:7}, {col:4,row:1,depth:7}, {col:5,row:1,depth:6},
  {col:6,row:1,depth:6}, {col:7,row:1,depth:5},
  // Row 2 — mid walls (cols 0-7)
  {col:0,row:2,depth:6}, {col:1,row:2,depth:7}, {col:2,row:2,depth:7},
  {col:3,row:2,depth:8}, {col:4,row:2,depth:8}, {col:5,row:2,depth:7},
  {col:6,row:2,depth:7}, {col:7,row:2,depth:6},
  // Row 3 — mid walls (cols 0-7)
  {col:0,row:3,depth:6}, {col:1,row:3,depth:7}, {col:2,row:3,depth:7},
  {col:3,row:3,depth:8}, {col:4,row:3,depth:8}, {col:5,row:3,depth:7},
  {col:6,row:3,depth:7}, {col:7,row:3,depth:6},
  // Row 4 — lower walls (cols 0-7)
  {col:0,row:4,depth:5}, {col:1,row:4,depth:6}, {col:2,row:4,depth:6},
  {col:3,row:4,depth:7}, {col:4,row:4,depth:7}, {col:5,row:4,depth:6},
  {col:6,row:4,depth:6}, {col:7,row:4,depth:5},
  // Row 5 — castle base (cols 1-6)
  {col:1,row:5,depth:6}, {col:2,row:5,depth:7}, {col:3,row:5,depth:7},
  {col:4,row:5,depth:7}, {col:5,row:5,depth:7}, {col:6,row:5,depth:6},
];

// ─── SEEDED RNG ───────────────────────────────────────
function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── BOARD GENERATOR ──────────────────────────────────
export function generateStackBoard(seed = 42137): TileStack[] {
  const rng = makeRng(seed);

  // 1. Build pool: 16 types × 18 = 288
  const pool: string[] = [];
  TILE_TYPES.forEach(type => { for (let i = 0; i < 18; i++) pool.push(type); });
  const shuffled = shuffle(pool, rng);

  // 2. Assign pool sequentially to stacks (bottom first)
  let poolIdx = 0;
  const stacks: TileStack[] = STACK_LAYOUT.map(pos => {
    const tiles: StackTile[] = [];
    for (let d = 0; d < pos.depth; d++) {
      tiles.push({ id: `${pos.col}-${pos.row}-${d}`, symbol: shuffled[poolIdx++] });
    }
    return { stackId: `s${pos.col}x${pos.row}`, col: pos.col, row: pos.row, tiles, maxDepth: pos.depth };
  });

  // 3. Guarantee 2 complete match-3 sets in free columns (col 0 and col 7)
  guaranteeEarlyMatches(stacks);

  // 4. Validate
  const total = stacks.reduce((sum, s) => sum + s.tiles.length, 0);
  if (total !== 288) throw new Error(`[StackBoard] FATAL: Expected 288 tiles, got ${total}`);
  console.info(`[StackBoard] Initialized: 288 tiles across ${stacks.length} stacks, 96 match-3 sets ✓`);

  return stacks;
}

function guaranteeEarlyMatches(stacks: TileStack[]): void {
  // Free stacks at start are col 0 (rows 1-4) and col 7 (rows 1-4) = 8 stacks
  const col0 = stacks.filter(s => s.col === 0 && s.tiles.length > 0).sort((a, b) => a.row - b.row);
  const col7 = stacks.filter(s => s.col === 7 && s.tiles.length > 0).sort((a, b) => a.row - b.row);

  // Check existing top-tile symbols
  const topSymbolCounts = new Map<string, number>();
  [...col0, ...col7].forEach(s => {
    const top = s.tiles[s.tiles.length - 1];
    if (top) topSymbolCounts.set(top.symbol, (topSymbolCounts.get(top.symbol) ?? 0) + 1);
  });
  const completeSets = [...topSymbolCounts.values()].filter(c => c >= 3).length;
  if (completeSets >= 2) return; // already satisfied

  // Force: swap symbols into top tiles of free stacks to guarantee 2 triads
  // Use sword for col-0 top 3, shield for col-7 top 3  — swap with interior tiles to preserve counts
  const forceSymbols: [string, TileStack[]][] = [
    ['sword',  col0.slice(0, 3)],
    ['shield', col7.slice(0, 3)],
  ];

  for (const [sym, targets] of forceSymbols) {
    for (const targetStack of targets) {
      const topIdx = targetStack.tiles.length - 1;
      if (targetStack.tiles[topIdx].symbol === sym) continue;

      // Find this sym elsewhere to swap with
      let swapped = false;
      outer: for (const s of stacks) {
        for (let i = 0; i < s.tiles.length; i++) {
          const skipTop = (s.stackId === targetStack.stackId && i === topIdx);
          if (!skipTop && s.tiles[i].symbol === sym) {
            // swap symbols only (preserve IDs)
            const tmp = s.tiles[i].symbol;
            s.tiles[i].symbol = targetStack.tiles[topIdx].symbol;
            targetStack.tiles[topIdx].symbol = tmp;
            swapped = true;
            break outer;
          }
        }
      }
      if (!swapped) console.warn(`[StackBoard] Could not find swap source for ${sym}`);
    }
  }
}

// ─── FREE STACK LOGIC ─────────────────────────────────
export function isStackFree(stack: TileStack, allStacks: TileStack[]): boolean {
  if (stack.tiles.length === 0) return false;
  const left  = allStacks.find(s => s.col === stack.col - 1 && s.row === stack.row);
  const right = allStacks.find(s => s.col === stack.col + 1 && s.row === stack.row);
  const leftBlocks  = left  ? left.tiles.length  > 0 : false;
  const rightBlocks = right ? right.tiles.length > 0 : false;
  return !(leftBlocks && rightBlocks);
}

// ─── LEGACY COMPAT ────────────────────────────────────
export type TripleTileNode = {
  id: string; type: string; x: number; y: number; z: number;
};

export interface BoardTile {
  uid: number; symbolId: string; symbol: TileSymbol;
  layer: number; x: number; y: number; removed: boolean;
}

export function createSeededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function generateBoard(_difficulty: Difficulty, _seed: number): BoardTile[] { return []; }
export const isTileBlocked = (_tile: BoardTile, _tiles: BoardTile[]): boolean => false;
export function getSymbolForType(type: string): TileSymbol {
  const idx = parseInt(type.replace('T', ''), 10) % ALL_SYMBOLS.length;
  return ALL_SYMBOLS[Math.abs(idx)];
}

// Kept for legacy imports that haven't migrated yet
export const trueTripleTileMap: TripleTileNode[] = [];
export const bedrockDivots: { x: number; y: number }[] = [];
export function isTileLocked(_tile: TripleTileNode, _tiles: TripleTileNode[]): boolean { return false; }
export function isDirectStackLocked(_tile: TripleTileNode, _tiles: TripleTileNode[]): boolean { return false; }
export function isLeftRightBlocked(_tile: TripleTileNode, _tiles: TripleTileNode[]): boolean { return false; }
export function generateValidBoard(_coords: [number,number,number][]): TripleTileNode[] { return []; }
