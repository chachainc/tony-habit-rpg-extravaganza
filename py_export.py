import json

TILE_TYPES = [
    'sword', 'shield', 'potion', 'crown', 'book', 'gem',
    'key', 'scroll', 'helmet', 'coin', 'relic', 'gauntlet',
    'ring', 'chest', 'flame', 'moon',
]

blueprint = [
    ['XXXXXXXX'] * 21,
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
    ]
]

def parse_blueprint(bp):
    coords = []
    for z, layer in enumerate(bp):
        for y, row in enumerate(layer):
            for x, char in enumerate(row):
                if char == 'X':
                    coords.append((x, y, z))
    return coords

raw_coordinates = parse_blueprint(blueprint)

def generate_valid_board(coords):
    total = len(coords)
    groups = total // 3
    pool = []
    for t in TILE_TYPES:
        for _ in range(18):
            pool.append(t)

    class RNG:
        def __init__(self, seed):
            self.seed = seed
        def next(self):
            self.seed = (self.seed * 16807) % 2147483647
            return (self.seed - 1) / 2147483646

    rng = RNG(91237)
    for i in range(len(pool) - 1, 0, -1):
        j = int(rng.next() * (i + 1))
        pool[i], pool[j] = pool[j], pool[i]

    sorted_coords = sorted(coords, key=lambda c: (c[2], c[1], c[0]))
    third = total // 3
    b1 = sorted_coords[0:third]
    b2 = sorted_coords[third:third*2]
    b3 = sorted_coords[third*2:]

    board = []
    for i in range(groups):
        type_idx = (i * 3) % len(pool)
        type_val = pool[type_idx]
        c1 = b1[i % len(b1)]
        c2 = b2[(i + 13) % len(b2)]
        c3 = b3[(i + 29) % len(b3)]
        board.append({"id": f"t{c1[0]}_{c1[1]}_{c1[2]}", "type": type_val, "x": c1[0], "y": c1[1], "z": c1[2]})
        board.append({"id": f"t{c2[0]}_{c2[1]}_{c2[2]}", "type": type_val, "x": c2[0], "y": c2[1], "z": c2[2]})
        board.append({"id": f"t{c3[0]}_{c3[1]}_{c3[2]}", "type": type_val, "x": c3[0], "y": c3[1], "z": c3[2]})
    return board

true_triple_tile_map = generate_valid_board(raw_coordinates)
tiles = []
for tile in true_triple_tile_map:
    direct_obstructors = [b for b in true_triple_tile_map if b["x"] == tile["x"] and b["y"] == tile["y"] and b["z"] > tile["z"]]
    tiles.append({
        "id": tile["id"],
        "type": tile["type"],
        "x": tile["x"],
        "y": tile["y"],
        "z": tile["z"],
        "coveredBy": [b["id"] for b in direct_obstructors]
    })

lines = [json.dumps(t) for t in tiles]
inner = ",\n    ".join(lines)
with open('output-utf8-compact.ts', 'w', encoding='utf-8') as f:
    f.write(f"export const LEVEL_1 = {{\n  tiles: [\n    {inner}\n  ]\n}};\n")
