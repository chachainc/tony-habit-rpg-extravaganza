const TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
];

const blueprint = [
    Array.from({ length: 21 }, () => 'XXXXXXXX'),
    [
        '        ', '        ', '        ',
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ', ' XXXXXX ', ' XXXXXX ',
        ' XXXXXX ', ' XXXXXX ',
        '        ', '        ', '        ', '        ',
    ],
    [
        '        ', '        ', '        ', '        ', '        ', '        ', '        ',
        '  XXXX  ', '  XXXX  ', '  XXXX  ',
        '  XXXX  ', '  XXXX  ', '  XXXX  ', '  XXXX  ',
        '        ', '        ', '        ', '        ', '        ', '        ', '        ',
    ],
    [
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ',
        '   XX   ', '   XX   ', '   XX   ', '   XX   ',
        '        ', '        ', '        ', '        ', '        ', '        ', '        ', '        ',
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
    const total  = coords.length;
    const groups = total / 3;

    const pool = [];
    TILE_TYPES.forEach(t => { for (let i = 0; i < 18; i++) pool.push(t); });

    let seed = 91237;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

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
    const directObstructors = trueTripleTileMap.filter(b => b.x === tile.x && b.y === tile.y && b.z > tile.z);
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
};\`;

const fs = require('fs');
fs.writeFileSync('output.js', output);
console.log("Done");
