import fs from 'fs';

// ─── TILE DISTRIBUTION ────────────────────────────────
const TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
];

const blueprint = [
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

function parseBlueprint(bp) {
    const coords = [];
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

function generateValidBoard(coords) {
    const total  = coords.length;          // 288
    const groups = total / 3;              // 96 triads

    // Build pool: 16 types × 18 = 288 (6 triads each)
    const pool = [];
    TILE_TYPES.forEach(t => { for (let i = 0; i < 18; i++) pool.push(t); });

    // Seeded shuffle
    let seed = 91237;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
    }

    // Spread triads: each type gets 1 tile in each of 3 z-level bands
    const sorted = [...coords].sort((a, b) => a[2] !== b[2] ? a[2] - b[2] : a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]);
    const third  = total / 3;
    const b1 = sorted.slice(0, third);
    const b2 = sorted.slice(third, third * 2);
    const b3 = sorted.slice(third * 2);

    const board = [];
    for (let i = 0; i < groups; i++) {
        const type = pool[i * 3 % pool.length] ?? TILE_TYPES[i % 16];
        const c1 = b1[i % b1.length];
        const c2 = b2[(i + 13) % b2.length];
        const c3 = b3[(i + 29) % b3.length];
        if (c1) board.push({ id: \`t\${c1[0]}_\${c1[1]}_\${c1[2]}\`, type, x: c1[0], y: c1[1], z: c1[2] });
        if (c2) board.push({ id: \`t\${c2[0]}_\${c2[1]}_\${c2[2]}\`, type, x: c2[0], y: c2[1], z: c2[2] });
        if (c3) board.push({ id: \`t\${c3[0]}_\${c3[1]}_\${c3[2]}\`, type, x: c3[0], y: c3[1], z: c3[2] });
    }
    return board;
}

const trueTripleTileMap = generateValidBoard(rawCoordinates);

const tiles = trueTripleTileMap.map((tile) => {
    // 1. Blocked from above: any tile at same x,y with higher z
    const directObstructors = trueTripleTileMap.filter(b => b.x === tile.x && b.y === tile.y && b.z > tile.z);
    
    // 2. We only include vertical blockers since typical "coveredBy" specifies vertical overlapping.
    const coveredBy = directObstructors.map(b => b.id);
    
    return {
        id: tile.id,
        type: tile.type,
        x: tile.x,
        y: tile.y,
        z: tile.z,
        coveredBy
    };
});

const output = \`export const LEVEL_1 = {
  tiles: \${JSON.stringify(tiles, null, 2)}
};
\`;

fs.writeFileSync('output.ts', output);
