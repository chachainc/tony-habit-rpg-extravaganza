import random

# ──────────────────────────────────────────────────────────────
#  TRUE MAHJONG SPLIT-COVERAGE BOARD GENERATOR
#
#  Core Mahjong rule:
#    Each tile is 2 units wide, 1 unit tall.
#    A tile at z+1, x+1 overlaps BOTH tiles at (z, x) and (z, x+2).
#    → ONE upper tile BLOCKS TWO lower tiles (split coverage).
#
#  Implementation:
#    Even z layers: x = base positions  (e.g. 0, 2, 4, 6)
#    Odd  z layers: x = base + 1        (e.g. 1, 3, 5, 7)
#
#  This creates the classic interlocking Mahjong stagger.
# ──────────────────────────────────────────────────────────────

TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon'
]

TILE_W_UNITS = 2   # each tile is 2 logical units wide
TILE_H_UNITS = 1   # 1 unit tall

# ── CLUSTER BASE POSITIONS (even x, for z=0) ──────────────────
# Left cluster : x = 0, 2, 4, 6  (4 columns, inner=6 is deepest)
# Right cluster: x = 14,16,18,20 (4 columns, inner=14 is deepest)
# Bridge       : x = 8, 10, 12  (thin top connector)
# Anchors      : x = -4 and x = 24 (isolated pillars)

LEFT_BASE  = [0, 2, 4, 6]
RIGHT_BASE = [14, 16, 18, 20]
BRIDGE_BASE = [9, 11]   # was [8,10,12] — 2-column bridge emphasizes cluster separation
Y_ROWS     = 8    # 8 rows per cluster
ANCHOR_Z   = 9    # anchor stack height

# ── MAX LAYER per column ───────────────────────────────────────
# Outermost columns are shallower; innermost are deepest.
# Left  cluster: col_idx 0=x0 (outer), 3=x6 (inner, max depth)
# Right cluster: col_idx 0=x14 (inner, max depth), 3=x20 (outer)

def left_max_z(col_idx):
    # 0=outermost→ max_z=1  (2 layers: z=0,1)
    # 3=innermost → max_z=4 (5 layers: z=0..4)
    return col_idx + 1

def right_max_z(col_idx):
    # 0=innermost → max_z=4
    # 3=outermost → max_z=1
    return (3 - col_idx) + 1

# ── BUILD COORDINATE SET ──────────────────────────────────────
coords = set()

# Left cluster
for z in range(5):
    x_offset = z % 2  # 0 for even z, 1 for odd z → stagger!
    for cidx, base_x in enumerate(LEFT_BASE):
        if z > left_max_z(cidx):
            continue
        for y in range(Y_ROWS):
            # Outermost column: skip top 2 rows for cleaner shape
            if cidx == 0 and y < 2:
                continue
            coords.add((base_x + x_offset, y, z))

# Right cluster (mirror)
for z in range(5):
    x_offset = z % 2
    for cidx, base_x in enumerate(RIGHT_BASE):
        if z > right_max_z(cidx):
            continue
        for y in range(Y_ROWS):
            # Outermost column: skip top 2 rows
            if cidx == 3 and y < 2:
                continue
            coords.add((base_x + x_offset, y, z))

# Bridge (top connector, z=0 and z=1 only)
for z in range(2):
    x_offset = z % 2
    for base_x in BRIDGE_BASE:
        for y in [0, 1]:
            coords.add((base_x + x_offset, y, z))

# Left anchor stack (pure vertical, isolated — moved inward from x=-4 to x=-3)
for z in range(ANCHOR_Z):
    coords.add((-3, 9, z))

# Right anchor stack (moved inward from x=24 to x=23)
for z in range(ANCHOR_Z):
    coords.add((23, 9, z))

# ── SORT + LIST ───────────────────────────────────────────────
coords_list = sorted(coords, key=lambda c: (c[2], c[1], c[0]))
total = len(coords_list)

# ── SYMBOL DISTRIBUTION ───────────────────────────────────────
N = len(TILE_TYPES)
sets_of_all  = total // (3 * N)
remainder    = total % (3 * N)

types_pool = []
for t in TILE_TYPES:
    types_pool.extend([t] * (sets_of_all * 3))

# Fill remainder in groups of 3
extra_full_sets = remainder // 3
for i in range(extra_full_sets):
    types_pool.extend([TILE_TYPES[i % N]] * 3)

# Pad any last 1-2 tiles (unavoidable edge)
while len(types_pool) < total:
    types_pool.append(TILE_TYPES[0])
while len(types_pool) > total:
    types_pool.pop()

random.seed(2025)
random.shuffle(types_pool)

# ── ASSIGN IDs ────────────────────────────────────────────────
tiles = []
for i, (x, y, z) in enumerate(coords_list):
    tiles.append({
        "id": f"t{i:04d}",
        "x": x, "y": y, "z": z,
        "type": types_pool[i],
        "coveredBy": []
    })

# ── COVEREDBY (SPLIT-COVERAGE MAHJONG RULE) ───────────────────
# T1 covers T2 iff:
#   T1.z > T2.z                              (T1 is above T2)
#   T1.x footprint [x, x+2) overlaps T2.x   (any x overlap)
#   T1.y footprint [y, y+1) overlaps T2.y   (same row)
#
# Because of the z%2 stagger, a tile at (x+1, y, z+1) overlaps
# BOTH (x, y, z) and (x+2, y, z) — true split coverage.

def covers(t1, t2):
    if t1["z"] <= t2["z"]:
        return False
    # x overlap: [t1.x, t1.x+2) ∩ [t2.x, t2.x+2) ≠ ∅
    x_ok = (t1["x"] < t2["x"] + TILE_W_UNITS) and (t2["x"] < t1["x"] + TILE_W_UNITS)
    # y overlap: [t1.y, t1.y+1) ∩ [t2.y, t2.y+1) ≠ ∅
    y_ok = (t1["y"] < t2["y"] + TILE_H_UNITS) and (t2["y"] < t1["y"] + TILE_H_UNITS)
    return x_ok and y_ok

for t2 in tiles:
    for t1 in tiles:
        if covers(t1, t2):
            t2["coveredBy"].append(t1["id"])

# ── STATS ─────────────────────────────────────────────────────
free_count    = sum(1 for t in tiles if not t["coveredBy"])
covered_count = total - free_count
print(f"Total tiles  : {total}")
print(f"Free (z=top) : {free_count}  ({100*free_count//total}%)")
print(f"Covered      : {covered_count}  ({100*covered_count//total}%)")
print(f"Symbol pool  : {len(types_pool)}")

# Verify split-coverage: count tiles with 2+ blockers
split = sum(1 for t in tiles if len(t["coveredBy"]) >= 2)
print(f"Split-covered (2+ blockers): {split}")

# ── OUTPUT ────────────────────────────────────────────────────
def fmt_cb(cb):
    if not cb:
        return "[]"
    return "[" + ", ".join(f'"{x}"' for x in cb) + "]"

tile_lines = [
    f'    {{ id: "{t["id"]}", x: {t["x"]}, y: {t["y"]}, z: {t["z"]}, '
    f'type: "{t["type"]}", coveredBy: {fmt_cb(t["coveredBy"])} }}'
    for t in tiles
]
tiles_str    = ",\n".join(tile_lines)
TARGET_TOTAL = total

out = f'''// ─── TILE CONFIG — Hardcoded Board Engine ─────────────
export type TileRarity      = 'common' | 'rare' | 'epic';
export type TileColorFamily = 'blue' | 'gold' | 'red' | 'green' | 'purple';
export interface TileSymbol {{
    id: string; label: string; emoji?: string; imageSrc?: string;
    rarity: TileRarity; colorFamily: TileColorFamily;
}}
export type Difficulty = 1 | 2 | 3 | 4;

export const TILE_IMAGES: Record<string, string> = {{
    sword:    '/assets/tiles/sword.png',    shield:   '/assets/tiles/shield.png',
    potion:   '/assets/tiles/potion.png',   crown:    '/assets/tiles/crown.png',
    book:     '/assets/tiles/book.png',     gem:      '/assets/tiles/gem.png',
    key:      '/assets/tiles/key.png',      scroll:   '/assets/tiles/scroll.png',
    helmet:   '/assets/tiles/helmet.png',   coin:     '/assets/tiles/coin.png',
    relic:    '/assets/tiles/relic.png',    gauntlet: '/assets/tiles/gauntlet.png',
    ring:     '/assets/tiles/ring.png',     chest:    '/assets/tiles/chest.png',
    flame:    '/assets/tiles/flame.png',    moon:     '/assets/tiles/moon.png',
}};

export const DIFFICULTY_PRESETS = {{
    1: {{ name: 'Normal', totalTiles: {TARGET_TOTAL}, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 }},
    2: {{ name: 'Normal', totalTiles: {TARGET_TOTAL}, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 }},
    3: {{ name: 'Normal', totalTiles: {TARGET_TOTAL}, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 }},
    4: {{ name: 'Normal', totalTiles: {TARGET_TOTAL}, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 }},
}} as const;

export const POWER_COSTS = {{ remove: 30, undo: 20, shuffle: 20, hint: 20 }} as const;

export const TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
] as const;

export const TILE_COLORS: Record<string, string> = {{
    sword: '#1e293b', shield: '#1e293b', potion: '#1e293b', crown: '#1e293b',
    book: '#1e293b', gem: '#1e293b', key: '#1e293b', scroll: '#1e293b',
    helmet: '#1e293b', coin: '#1e293b', relic: '#1e293b', gauntlet: '#1e293b',
    ring: '#1e293b', chest: '#1e293b', flame: '#1e293b', moon: '#1e293b',
}};

export type TripleTileNode = {{
    id: string;
    type: string;
    x: number;
    y: number;
    z: number;
    coveredBy: string[];
}};

export type DockTile = {{
    id: string;
    type: string;
    x: number; y: number; z: number;
}};

export type UndoEntry = {{
    tile: DockTile;
    prevScore: number;
}};

export const trueTripleTileMap: TripleTileNode[] = [
{tiles_str}
];

export function isTileLocked(tile: TripleTileNode, board: TripleTileNode[]): boolean {{
    if (tile.coveredBy.length === 0) return false;
    const boardIds = new Set(board.map(b => b.id));
    return tile.coveredBy.some(id => boardIds.has(id));
}}

export const bedrockDivots: {{ x: number; y: number }}[] = [];

// LEGACY STUBS
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]) {{ return isTileLocked(tile, tiles); }}
export function isLeftRightBlocked() {{ return false; }}
export function generateBoard() {{ return []; }}
export function generateStackBoard() {{ return []; }}
export function generateValidBoard() {{ return trueTripleTileMap; }}
'''

with open('src/features/conquest/tileConfig.ts', 'w', encoding='utf-8') as f:
    f.write(out)

print(f"SUCCESS: tileConfig.ts written with {total} tiles.")
