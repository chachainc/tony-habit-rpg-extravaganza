// ─── TILE CONFIG — Pyramid Mahjong Board ─────────────
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
    1: { name: 'Normal', totalTiles: 132, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    2: { name: 'Normal', totalTiles: 132, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    3: { name: 'Normal', totalTiles: 132, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    4: { name: 'Normal', totalTiles: 132, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
} as const;

export const POWER_COSTS = { remove: 30, undo: 20, shuffle: 20, hint: 20 } as const;

export const TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
] as const;

export const TILE_COLORS: Record<string, string> = {
    sword: '#1e293b', shield: '#1e293b', potion: '#1e293b', crown: '#1e293b',
    book: '#1e293b', gem: '#1e293b', key: '#1e293b', scroll: '#1e293b',
    helmet: '#1e293b', coin: '#1e293b', relic: '#1e293b', gauntlet: '#1e293b',
    ring: '#1e293b', chest: '#1e293b', flame: '#1e293b', moon: '#1e293b',
};

export type TripleTileNode = {
    id: string;
    type: string;
    x: number;
    y: number;
    z: number;
    coveredBy: string[];
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

// ─────────────────────────────────────────────────────
//  PYRAMID MAHJONG BOARD — 132 tiles (44 triplets)
//
//  Layout philosophy:
//  • Center-heavy pyramid: 5 z-layers, widest at bottom
//  • z=0 base: wide rectangle of buried tiles (many covered)
//  • z=1..4: progressively narrower and centered
//  • z=4: small peaked top (5-9 tiles)
//
//  isTileLocked checks BOTH:
//    1. Top-covering: any coveredBy tile still on board
//    2. Left/right: tile at (x-2, same y, same z) OR (x+2, same y, same z)
//       still on board → blocked on that side (must have at least one side free)
//
//  Match distribution (controlled exposure):
//  • z=4 top  : 3 triplets (sword×3, gem×3, key×3)       — always 3 free matches peak
//  • z=3      : 4 triplets — mostly buried by z=4
//  • z=2      : 8 triplets — mostly buried by z=3
//  • z=1      : 14 triplets — mostly buried by z=2
//  • z=0 base : 15 triplets — all buried by z=1+
//
//  Tile types per layer spread so no type appears 3x on surface until
//  top is consumed — forces layer-by-layer unlocking decisions.
//
//  Grid: x is col (each tile = 2 x-units wide), y is row.
//  Tile at (x,y) occupies x-columns [x, x+1].
//  A tile at (x+1, y, z+1) sits half-overlapping = classic stagger.
//  CoveredBy: all z-1 tiles that overlap this tile's footprint.
// ─────────────────────────────────────────────────────

// Helper: build id
function tid(n: number) { return `t${String(n).padStart(4, '0')}`; }

// ─── LAYER 4 (PEAK) — 9 tiles = 3 triplets, always free ─
// Small 3×3 grid at center. Nothing covers them (z=4 = top).
// x: 8,10,12  y: 3,4,5  z:4
// Every tile at z=4 has coveredBy=[] and no left/right neighbors at same z.
// 3 types × 3 = sword, gem, key
const z4: TripleTileNode[] = [
    // Row y=3: sword, gem, key
    { id: tid(400), x: 8,  y: 3, z: 4, type: 'sword', coveredBy: [] },
    { id: tid(401), x: 10, y: 3, z: 4, type: 'gem',   coveredBy: [] },
    { id: tid(402), x: 12, y: 3, z: 4, type: 'key',   coveredBy: [] },
    // Row y=4: sword, gem, key
    { id: tid(403), x: 8,  y: 4, z: 4, type: 'sword', coveredBy: [] },
    { id: tid(404), x: 10, y: 4, z: 4, type: 'gem',   coveredBy: [] },
    { id: tid(405), x: 12, y: 4, z: 4, type: 'key',   coveredBy: [] },
    // Row y=5: sword, gem, key
    { id: tid(406), x: 8,  y: 5, z: 4, type: 'sword', coveredBy: [] },
    { id: tid(407), x: 10, y: 5, z: 4, type: 'gem',   coveredBy: [] },
    { id: tid(408), x: 12, y: 5, z: 4, type: 'key',   coveredBy: [] },
];

// ─── LAYER 3 — 15 tiles = 5 triplets ─────────────────────
// Wider: x: 7..13  y: 2..6  z:3
// Tiles directly under z=4 are covered. Edge tiles may be free initially
// but left/right neighbors at same z block them.
// Types: shield, crown, scroll, coin, relic
const z3: TripleTileNode[] = [
    // y=2 (top of z3): partially free (no z4 above, but left/right blocked by neighbors)
    { id: tid(300), x: 7,  y: 2, z: 3, type: 'shield', coveredBy: [] },
    { id: tid(301), x: 9,  y: 2, z: 3, type: 'crown',  coveredBy: [] },
    { id: tid(302), x: 11, y: 2, z: 3, type: 'shield', coveredBy: [] },
    { id: tid(303), x: 13, y: 2, z: 3, type: 'crown',  coveredBy: [] },
    // y=3: covered by z4 t400,401,402
    { id: tid(304), x: 7,  y: 3, z: 3, type: 'scroll', coveredBy: [tid(400)] },
    { id: tid(305), x: 9,  y: 3, z: 3, type: 'crown',  coveredBy: [tid(400), tid(401)] },
    { id: tid(306), x: 11, y: 3, z: 3, type: 'scroll', coveredBy: [tid(401), tid(402)] },
    { id: tid(307), x: 13, y: 3, z: 3, type: 'coin',   coveredBy: [tid(402)] },
    // y=4: covered by z4
    { id: tid(308), x: 7,  y: 4, z: 3, type: 'relic',  coveredBy: [tid(403)] },
    { id: tid(309), x: 9,  y: 4, z: 3, type: 'scroll', coveredBy: [tid(403), tid(404)] },
    { id: tid(310), x: 11, y: 4, z: 3, type: 'relic',  coveredBy: [tid(404), tid(405)] },
    { id: tid(311), x: 13, y: 4, z: 3, type: 'coin',   coveredBy: [tid(405)] },
    // y=5: covered by z4
    { id: tid(312), x: 7,  y: 5, z: 3, type: 'shield', coveredBy: [tid(406)] },
    { id: tid(313), x: 9,  y: 5, z: 3, type: 'coin',   coveredBy: [tid(406), tid(407)] },
    { id: tid(314), x: 11, y: 5, z: 3, type: 'relic',  coveredBy: [tid(407), tid(408)] },
    { id: tid(315), x: 13, y: 5, z: 3, type: 'coin',   coveredBy: [tid(408)] },
    // y=6 (bottom of z3): free from above
    { id: tid(316), x: 7,  y: 6, z: 3, type: 'scroll', coveredBy: [] },
    { id: tid(317), x: 9,  y: 6, z: 3, type: 'relic',  coveredBy: [] },
    { id: tid(318), x: 11, y: 6, z: 3, type: 'shield', coveredBy: [] },
    { id: tid(319), x: 13, y: 6, z: 3, type: 'scroll', coveredBy: [] },
];

// ─── LAYER 2 — 24 tiles = 8 triplets ─────────────────────
// x: 6..14  y: 1..7  z:2
// Types: helmet, potion, ring, flame, book, gauntlet, chest, moon
const z2: TripleTileNode[] = [
    // y=1 (top of z2, no z3 above unless overlap)
    { id: tid(200), x: 6,  y: 1, z: 2, type: 'helmet',  coveredBy: [] },
    { id: tid(201), x: 8,  y: 1, z: 2, type: 'potion',  coveredBy: [tid(300)] },
    { id: tid(202), x: 10, y: 1, z: 2, type: 'helmet',  coveredBy: [tid(301), tid(302)] },
    { id: tid(203), x: 12, y: 1, z: 2, type: 'potion',  coveredBy: [tid(302), tid(303)] },
    { id: tid(204), x: 14, y: 1, z: 2, type: 'helmet',  coveredBy: [tid(303)] },
    // y=2
    { id: tid(205), x: 6,  y: 2, z: 2, type: 'ring',    coveredBy: [tid(300)] },
    { id: tid(206), x: 8,  y: 2, z: 2, type: 'flame',   coveredBy: [tid(300), tid(301), tid(304), tid(305)] },
    { id: tid(207), x: 10, y: 2, z: 2, type: 'ring',    coveredBy: [tid(301), tid(302), tid(305), tid(306)] },
    { id: tid(208), x: 12, y: 2, z: 2, type: 'flame',   coveredBy: [tid(302), tid(303), tid(306), tid(307)] },
    { id: tid(209), x: 14, y: 2, z: 2, type: 'ring',    coveredBy: [tid(303), tid(307)] },
    // y=3 middle rows
    { id: tid(210), x: 6,  y: 3, z: 2, type: 'book',    coveredBy: [tid(304)] },
    { id: tid(211), x: 14, y: 3, z: 2, type: 'book',    coveredBy: [tid(307)] },
    // y=4
    { id: tid(212), x: 6,  y: 4, z: 2, type: 'gauntlet',coveredBy: [tid(308)] },
    { id: tid(213), x: 14, y: 4, z: 2, type: 'gauntlet',coveredBy: [tid(311)] },
    // y=5
    { id: tid(214), x: 6,  y: 5, z: 2, type: 'chest',   coveredBy: [tid(312)] },
    { id: tid(215), x: 14, y: 5, z: 2, type: 'chest',   coveredBy: [tid(315)] },
    // y=6
    { id: tid(216), x: 6,  y: 6, z: 2, type: 'moon',    coveredBy: [tid(316)] },
    { id: tid(217), x: 8,  y: 6, z: 2, type: 'book',    coveredBy: [tid(316), tid(317)] },
    { id: tid(218), x: 10, y: 6, z: 2, type: 'gauntlet',coveredBy: [tid(317), tid(318)] },
    { id: tid(219), x: 12, y: 6, z: 2, type: 'moon',    coveredBy: [tid(318), tid(319)] },
    { id: tid(220), x: 14, y: 6, z: 2, type: 'chest',   coveredBy: [tid(319)] },
    // y=7 (bottom of z2)
    { id: tid(221), x: 6,  y: 7, z: 2, type: 'moon',    coveredBy: [] },
    { id: tid(222), x: 10, y: 7, z: 2, type: 'potion',  coveredBy: [] },
    { id: tid(223), x: 14, y: 7, z: 2, type: 'flame',   coveredBy: [] },
];

// ─── LAYER 1 — 30 tiles = 10 triplets ────────────────────
// x: 4..16  y: 0..8  z:1
// Types: sword(r), shield(r), potion(r), gem(r), key(r), scroll(r), helmet(r), coin(r), relic(r), crown(r)
// Note: we re-introduce some types here that are also in z=4 (sword/gem/key)
// but they're buried — player must unlock them.
const z1: TripleTileNode[] = [
    // Row y=0
    { id: tid(100), x: 4,  y: 0, z: 1, type: 'sword',   coveredBy: [tid(200)] },
    { id: tid(101), x: 6,  y: 0, z: 1, type: 'gem',     coveredBy: [tid(200), tid(201)] },
    { id: tid(102), x: 8,  y: 0, z: 1, type: 'sword',   coveredBy: [tid(201), tid(202)] },
    { id: tid(103), x: 10, y: 0, z: 1, type: 'gem',     coveredBy: [tid(202), tid(203)] },
    { id: tid(104), x: 12, y: 0, z: 1, type: 'sword',   coveredBy: [tid(203), tid(204)] },
    { id: tid(105), x: 14, y: 0, z: 1, type: 'gem',     coveredBy: [tid(204)] },
    { id: tid(106), x: 16, y: 0, z: 1, type: 'key',     coveredBy: [] },
    // Row y=1
    { id: tid(107), x: 4,  y: 1, z: 1, type: 'shield',  coveredBy: [tid(200), tid(205)] },
    { id: tid(108), x: 16, y: 1, z: 1, type: 'shield',  coveredBy: [tid(204)] },
    // Row y=2
    { id: tid(109), x: 4,  y: 2, z: 1, type: 'key',     coveredBy: [tid(205)] },
    { id: tid(110), x: 16, y: 2, z: 1, type: 'scroll',  coveredBy: [tid(209)] },
    // Row y=3
    { id: tid(111), x: 4,  y: 3, z: 1, type: 'scroll',  coveredBy: [tid(205), tid(210)] },
    { id: tid(112), x: 16, y: 3, z: 1, type: 'key',     coveredBy: [tid(209), tid(211)] },
    // Row y=4
    { id: tid(113), x: 4,  y: 4, z: 1, type: 'helmet',  coveredBy: [tid(210), tid(212)] },
    { id: tid(114), x: 16, y: 4, z: 1, type: 'helmet',  coveredBy: [tid(211), tid(213)] },
    // Row y=5
    { id: tid(115), x: 4,  y: 5, z: 1, type: 'coin',    coveredBy: [tid(212), tid(214)] },
    { id: tid(116), x: 16, y: 5, z: 1, type: 'coin',    coveredBy: [tid(213), tid(215)] },
    // Row y=6
    { id: tid(117), x: 4,  y: 6, z: 1, type: 'relic',   coveredBy: [tid(214), tid(216)] },
    { id: tid(118), x: 16, y: 6, z: 1, type: 'relic',   coveredBy: [tid(215), tid(220)] },
    // Row y=7
    { id: tid(119), x: 4,  y: 7, z: 1, type: 'crown',   coveredBy: [tid(216), tid(221)] },
    { id: tid(120), x: 6,  y: 7, z: 1, type: 'scroll',  coveredBy: [tid(221)] },
    { id: tid(121), x: 8,  y: 7, z: 1, type: 'coin',    coveredBy: [tid(221), tid(222)] },
    { id: tid(122), x: 10, y: 7, z: 1, type: 'relic',   coveredBy: [tid(222)] },
    { id: tid(123), x: 12, y: 7, z: 1, type: 'crown',   coveredBy: [tid(222), tid(223)] },
    { id: tid(124), x: 14, y: 7, z: 1, type: 'helmet',  coveredBy: [tid(223)] },
    { id: tid(125), x: 16, y: 7, z: 1, type: 'crown',   coveredBy: [tid(220), tid(223)] },
    // Row y=8 bottom edge
    { id: tid(126), x: 4,  y: 8, z: 1, type: 'shield',  coveredBy: [] },
    { id: tid(127), x: 8,  y: 8, z: 1, type: 'helmet',  coveredBy: [tid(119), tid(121)] },
    { id: tid(128), x: 12, y: 8, z: 1, type: 'coin',    coveredBy: [tid(123), tid(124)] },
    { id: tid(129), x: 16, y: 8, z: 1, type: 'shield',  coveredBy: [] },
];

// ─── LAYER 0 (BASE) — 54 tiles = 18 triplets ─────────────
// Widest layer, all partially or fully buried.
// x: 2..18  y: 0..9  z:0
// Types: all 16, spread so that matching types are on different sides
// or buried — no type has 3 free simultaneously until layers above clear.
const z0: TripleTileNode[] = [
    // ── top rows (y=0..1) — covered by z1 row y=0
    { id: tid(0),   x: 2,  y: 0, z: 0, type: 'flame',   coveredBy: [tid(100)] },
    { id: tid(1),   x: 4,  y: 0, z: 0, type: 'gauntlet',coveredBy: [tid(100), tid(101)] },
    { id: tid(2),   x: 6,  y: 0, z: 0, type: 'chest',   coveredBy: [tid(101), tid(102)] },
    { id: tid(3),   x: 8,  y: 0, z: 0, type: 'moon',    coveredBy: [tid(102), tid(103)] },
    { id: tid(4),   x: 10, y: 0, z: 0, type: 'ring',    coveredBy: [tid(103), tid(104)] },
    { id: tid(5),   x: 12, y: 0, z: 0, type: 'book',    coveredBy: [tid(104), tid(105)] },
    { id: tid(6),   x: 14, y: 0, z: 0, type: 'potion',  coveredBy: [tid(105), tid(106)] },
    { id: tid(7),   x: 16, y: 0, z: 0, type: 'flame',   coveredBy: [tid(106)] },
    { id: tid(8),   x: 18, y: 0, z: 0, type: 'gauntlet',coveredBy: [] },
    // y=1
    { id: tid(9),   x: 2,  y: 1, z: 0, type: 'chest',   coveredBy: [tid(100), tid(107)] },
    { id: tid(10),  x: 4,  y: 1, z: 0, type: 'moon',    coveredBy: [tid(107)] },
    { id: tid(11),  x: 14, y: 1, z: 0, type: 'ring',    coveredBy: [tid(108)] },
    { id: tid(12),  x: 16, y: 1, z: 0, type: 'book',    coveredBy: [tid(108)] },
    { id: tid(13),  x: 18, y: 1, z: 0, type: 'potion',  coveredBy: [] },
    // y=2
    { id: tid(14),  x: 2,  y: 2, z: 0, type: 'ring',    coveredBy: [tid(109)] },
    { id: tid(15),  x: 4,  y: 2, z: 0, type: 'flame',   coveredBy: [tid(109)] },
    { id: tid(16),  x: 14, y: 2, z: 0, type: 'gauntlet',coveredBy: [tid(110)] },
    { id: tid(17),  x: 16, y: 2, z: 0, type: 'chest',   coveredBy: [tid(110)] },
    { id: tid(18),  x: 18, y: 2, z: 0, type: 'moon',    coveredBy: [] },
    // y=3
    { id: tid(19),  x: 2,  y: 3, z: 0, type: 'book',    coveredBy: [tid(111)] },
    { id: tid(20),  x: 4,  y: 3, z: 0, type: 'ring',    coveredBy: [tid(111)] },
    { id: tid(21),  x: 14, y: 3, z: 0, type: 'flame',   coveredBy: [tid(112)] },
    { id: tid(22),  x: 16, y: 3, z: 0, type: 'gauntlet',coveredBy: [tid(112)] },
    { id: tid(23),  x: 18, y: 3, z: 0, type: 'book',    coveredBy: [] },
    // y=4
    { id: tid(24),  x: 2,  y: 4, z: 0, type: 'potion',  coveredBy: [tid(113)] },
    { id: tid(25),  x: 4,  y: 4, z: 0, type: 'chest',   coveredBy: [tid(113)] },
    { id: tid(26),  x: 14, y: 4, z: 0, type: 'moon',    coveredBy: [tid(114)] },
    { id: tid(27),  x: 16, y: 4, z: 0, type: 'potion',  coveredBy: [tid(114)] },
    { id: tid(28),  x: 18, y: 4, z: 0, type: 'ring',    coveredBy: [] },
    // y=5
    { id: tid(29),  x: 2,  y: 5, z: 0, type: 'flame',   coveredBy: [tid(115)] },
    { id: tid(30),  x: 4,  y: 5, z: 0, type: 'gauntlet',coveredBy: [tid(115)] },
    { id: tid(31),  x: 14, y: 5, z: 0, type: 'book',    coveredBy: [tid(116)] },
    { id: tid(32),  x: 16, y: 5, z: 0, type: 'flame',   coveredBy: [tid(116)] },
    { id: tid(33),  x: 18, y: 5, z: 0, type: 'chest',   coveredBy: [] },
    // y=6
    { id: tid(34),  x: 2,  y: 6, z: 0, type: 'moon',    coveredBy: [tid(117)] },
    { id: tid(35),  x: 4,  y: 6, z: 0, type: 'ring',    coveredBy: [tid(117)] },
    { id: tid(36),  x: 14, y: 6, z: 0, type: 'potion',  coveredBy: [tid(118)] },
    { id: tid(37),  x: 16, y: 6, z: 0, type: 'gauntlet',coveredBy: [tid(118)] },
    { id: tid(38),  x: 18, y: 6, z: 0, type: 'moon',    coveredBy: [] },
    // y=7
    { id: tid(39),  x: 2,  y: 7, z: 0, type: 'book',    coveredBy: [tid(119)] },
    { id: tid(40),  x: 4,  y: 7, z: 0, type: 'chest',   coveredBy: [tid(119), tid(120)] },
    { id: tid(41),  x: 6,  y: 7, z: 0, type: 'flame',   coveredBy: [tid(120), tid(121)] },
    { id: tid(42),  x: 8,  y: 7, z: 0, type: 'gauntlet',coveredBy: [tid(121), tid(122)] },
    { id: tid(43),  x: 10, y: 7, z: 0, type: 'book',    coveredBy: [tid(122), tid(123)] },
    { id: tid(44),  x: 12, y: 7, z: 0, type: 'chest',   coveredBy: [tid(123), tid(124)] },
    { id: tid(45),  x: 14, y: 7, z: 0, type: 'potion',  coveredBy: [tid(124), tid(125)] },
    { id: tid(46),  x: 16, y: 7, z: 0, type: 'ring',    coveredBy: [tid(125)] },
    { id: tid(47),  x: 18, y: 7, z: 0, type: 'flame',   coveredBy: [] },
    { id: tid(48),  x: 2,  y: 8, z: 0, type: 'gauntlet',coveredBy: [tid(126)] },
    { id: tid(49),  x: 18, y: 8, z: 0, type: 'ring',    coveredBy: [tid(129)] },
    { id: tid(50),  x: 6,  y: 9, z: 0, type: 'moon',    coveredBy: [tid(127)] },
    { id: tid(51),  x: 14, y: 9, z: 0, type: 'book',    coveredBy: [tid(128)] },
];

export const trueTripleTileMap: TripleTileNode[] = [
    ...z0,
    ...z1,
    ...z2,
    ...z3,
    ...z4,
];

// ─────────────────────────────────────────────────────────
//  isTileLocked — DUAL RULE:
//
//  A tile is LOCKED (not selectable) if ANY of:
//    1. TOP-COVERED: any ID in tile.coveredBy still exists on the board.
//    2. SIDE-BLOCKED: tile has both a left neighbor (x-2, same y/z) AND
//       a right neighbor (x+2, same y/z) still on the board.
//       i.e. BOTH sides must be occupied → blocked.
//       If at least one side is free → selectable (even if top free).
//
//  This matches classic Mahjong rules exactly:
//    ✅ Fully exposed AND at least one side clear = selectable
//    ❌ Covered from above = locked
//    ❌ Flanked on both sides = locked
// ─────────────────────────────────────────────────────────
export function isTileLocked(tile: TripleTileNode, board: TripleTileNode[]): boolean {
    const boardIds = new Set(board.map(b => b.id));

    // Rule 1: top-covered
    if (tile.coveredBy.some(id => boardIds.has(id))) return true;

    // Rule 2: both sides blocked at same layer
    // A "left neighbor" is a tile at x = tile.x - 2, same y and z.
    // A "right neighbor" is a tile at x = tile.x + 2, same y and z.
    const hasLeft  = board.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x - 2 && b.id !== tile.id);
    const hasRight = board.some(b => b.z === tile.z && b.y === tile.y && b.x === tile.x + 2 && b.id !== tile.id);

    if (hasLeft && hasRight) return true; // fully flanked

    return false;
}

export const bedrockDivots: { x: number; y: number }[] = [];

// LEGACY STUBS
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]) { return isTileLocked(tile, tiles); }
export function isLeftRightBlocked() { return false; }
export function generateBoard() { return []; }
export function generateStackBoard() { return []; }
type Accessibility = 'easy' | 'medium' | 'deep';

interface BoardCell extends TripleTileNode {
    bucket: Accessibility;
    wave: number;
}

interface TileGroup {
    type: string;
    count: 3 | 6;
}

function classifyBoardCells(layout: TripleTileNode[]): BoardCell[] {
    let cells: BoardCell[] = layout.map(t => ({ ...t, bucket: 'deep', wave: -1 }));
    let remainingIds = new Set(cells.map(c => c.id));
    
    let wave = 0;
    while (remainingIds.size > 0) {
        const remainingCells = cells.filter(c => remainingIds.has(c.id));
        const freeInWave = remainingCells.filter(c => !isTileLocked(c, remainingCells));
        
        if (freeInWave.length === 0) {
            // Deadlock fallback -> dump rest in last wave
            for (let id of remainingIds) {
                const c = cells.find(x => x.id === id)!;
                c.wave = wave;
            }
            break;
        }

        for (let c of freeInWave) {
            const cell = cells.find(x => x.id === c.id)!;
            cell.wave = wave;
            remainingIds.delete(c.id);
        }
        wave++;
    }

    cells.sort((a, b) => a.wave - b.wave);
    
    const easyCount = Math.floor(cells.length * 0.35);
    const mediumCount = Math.floor(cells.length * 0.40);
    
    for (let i = 0; i < cells.length; i++) {
        if (i < easyCount) cells[i].bucket = 'easy';
        else if (i < easyCount + mediumCount) cells[i].bucket = 'medium';
        else cells[i].bucket = 'deep';
    }

    return cells;
}

function generateTileGroups(totalTiles: number, types: readonly string[]): TileGroup[] {
    if (totalTiles % 3 !== 0) throw new Error("totalTiles must be divisible by 3");
    
    const groupsNeeded = totalTiles / 3;
    let shuffledTypes = [...types].sort(() => Math.random() - 0.5);
    const usedTypeCount = Math.min(shuffledTypes.length, groupsNeeded);
    const usedTypes = shuffledTypes.slice(0, usedTypeCount);

    const groupsPerType: Record<string, number> = {};
    for (const type of usedTypes) groupsPerType[type] = 1;

    let remainingGroups = groupsNeeded - usedTypes.length;
    let expandable = [...usedTypes].sort(() => Math.random() - 0.5);
    
    let guard = 0;
    while (remainingGroups > 0 && guard < 10000) {
        const type = expandable[guard % expandable.length];
        if (groupsPerType[type] < 2) {
            groupsPerType[type] += 1;
            remainingGroups--;
        }
        guard++;
    }

    return Object.entries(groupsPerType).map(([type, groups]) => ({
        type,
        count: (groups * 3) as 3 | 6
    }));
}

function placeGroupsAcrossBuckets(groups: TileGroup[], classifiedCells: BoardCell[]): TripleTileNode[] {
    let easySlots = classifiedCells.filter(c => c.bucket === 'easy').sort(() => Math.random() - 0.5);
    let mediumSlots = classifiedCells.filter(c => c.bucket === 'medium').sort(() => Math.random() - 0.5);
    let deepSlots = classifiedCells.filter(c => c.bucket === 'deep').sort(() => Math.random() - 0.5);

    const pickSlot = (preferred: Accessibility[]) => {
        for (let pref of preferred) {
            if (pref === 'easy' && easySlots.length > 0) return easySlots.pop()!;
            if (pref === 'medium' && mediumSlots.length > 0) return mediumSlots.pop()!;
            if (pref === 'deep' && deepSlots.length > 0) return deepSlots.pop()!;
        }
        if (easySlots.length > 0) return easySlots.pop()!;
        if (mediumSlots.length > 0) return mediumSlots.pop()!;
        if (deepSlots.length > 0) return deepSlots.pop()!;
        throw new Error("No slots left");
    };

    let result: TripleTileNode[] = [];
    let shuffledGroups = [...groups].sort(() => Math.random() - 0.5);

    for (let group of shuffledGroups) {
        const slots: BoardCell[] = [];
        if (group.count === 3) {
            const p1 = Math.random() > 0.5 ? 'easy' : 'medium';
            slots.push(pickSlot([p1, 'medium', 'easy']));
            
            // intentionally spread the rest, avoid all deep
            const remainingPref = Math.random() > 0.5 ? ['medium', 'deep'] : ['deep', 'medium'];
            slots.push(pickSlot(remainingPref as Accessibility[]));
            slots.push(pickSlot(['deep', 'medium', 'easy']));
        } else if (group.count === 6) {
            slots.push(pickSlot(['easy']));
            slots.push(pickSlot(['easy']));
            slots.push(pickSlot(['medium']));
            slots.push(pickSlot(['medium']));
            slots.push(pickSlot(['deep']));
            slots.push(pickSlot(['deep']));
        }
        
        for (const s of slots) {
            result.push({ ...s, type: group.type });
        }
    }
    return result;
}

function validateAndScoreBoard(board: TripleTileNode[]): { valid: boolean, score: number, issues: string[] } {
    let issues: string[] = [];
    let score = 100;
    let isValid = true;
    
    if (board.length % 3 !== 0) {
        issues.push("Length not divisible by 3");
        return { valid: false, score: -1000, issues };
    }

    const typeToTiles = new Map<string, TripleTileNode[]>();
    for (const t of board) {
        if (!typeToTiles.has(t.type)) typeToTiles.set(t.type, []);
        typeToTiles.get(t.type)!.push(t);
    }
    
    // Hard check: count exactly 3 or 6
    for (const [type, tiles] of typeToTiles) {
        if (tiles.length !== 3 && tiles.length !== 6) {
            issues.push(`Type ${type} has invalid count ${tiles.length}`);
            return { valid: false, score: -1000, issues };
        }
    }

    // Opening state checks
    const freeTiles = board.filter(t => !isTileLocked(t, board));
    const freeCounts = new Map<string, number>();
    for (const t of freeTiles) freeCounts.set(t.type, (freeCounts.get(t.type) || 0) + 1);

    let matchCount = 0;
    let pairCount = 0;
    let typesExposed = freeCounts.size;

    for (const count of freeCounts.values()) {
        if (count >= 3) matchCount++;
        else if (count === 2) pairCount++;
    }

    if (matchCount < 1) { isValid = false; issues.push("No legal match-3 in opening"); score -= 50; }
    if (pairCount < 2) { isValid = false; issues.push("Less than 2 extra pairs in opening"); score -= 20; }
    if (typesExposed < 6) { isValid = false; issues.push("Less than 6 types exposed in opening"); score -= 30; }

    // Clustering check on free tiles (Manhattan <= 2)
    let duplicateClusters = 0;
    for (let i = 0; i < freeTiles.length; i++) {
        for (let j = i + 1; j < freeTiles.length; j++) {
            const t1 = freeTiles[i];
            const t2 = freeTiles[j];
            if (t1.type === t2.type) {
                // Approximate Mahjong space distance
                const manhattan = Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
                if (manhattan <= 2) {
                    duplicateClusters++;
                    score -= 5;
                }
                if (t1.x === t2.x && Math.abs(t1.y - t2.y) <= 1) {
                    score -= 10;
                }
                if (t1.y === t2.y && Math.abs(t1.x - t2.x) <= 2) {
                    score -= 10;
                }
            }
        }
    }
    
    if (duplicateClusters > 5) {
        isValid = false; 
        issues.push("Too many duplicate visible clusters");
        score -= 20;
    }

    return { valid: isValid, score, issues };
}

export function generateValidBoard(): TripleTileNode[] {
    const totalTiles = trueTripleTileMap.length;
    const classified = classifyBoardCells(trueTripleTileMap);
    
    let bestBoard: TripleTileNode[] = [];
    let bestScore = -9999;
    
    const TARGET_RETRIES = 60;
    const MAX_RETRIES = 100;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        const groups = generateTileGroups(totalTiles, TILE_TYPES);
        const board = placeGroupsAcrossBuckets(groups, classified);
        
        const result = validateAndScoreBoard(board);
        if (result.valid) {
            return board;
        }
        
        if (result.score > bestScore) {
            bestScore = result.score;
            bestBoard = board;
        }
        
        if (i >= TARGET_RETRIES && bestScore > 50) {
            break;
        }
    }
    
    console.warn(`[BoardGen] Exhausted retries, returning fallback board (score ${bestScore})`);
    return bestBoard;
}
