const fs = require('fs');

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
        '  XXXX  ', '  XXXX  ', '    XX  ', // row 9 logic? Wait, let's copy EXACTLY the blueprint from tileConfig.ts.
    ],
];
