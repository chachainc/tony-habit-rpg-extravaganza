// ─── TILE CONFIG — Hardcoded Board Engine ─────────────
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
    1: { name: 'Normal', totalTiles: 222, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    2: { name: 'Normal', totalTiles: 222, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    3: { name: 'Normal', totalTiles: 222, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
    4: { name: 'Normal', totalTiles: 222, symbolCount: 0, layers: 5, label: '🎴 Mahjong', gemReward: 2 },
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

export const trueTripleTileMap: TripleTileNode[] = [
    { id: "t0000", x: 2, y: 0, z: 0, type: "chest", coveredBy: ["t0066", "t0132"] },
    { id: "t0002", x: 6, y: 0, z: 0, type: "scroll", coveredBy: ["t0067", "t0068", "t0134", "t0182", "t0183", "t0216"] },
    { id: "t0011", x: 9, y: 1, z: 0, type: "shield", coveredBy: ["t0077"] },
    { id: "t0016", x: 0, y: 2, z: 0, type: "flame", coveredBy: ["t0082"] },
    { id: "t0017", x: 2, y: 2, z: 0, type: "sword", coveredBy: ["t0082", "t0083", "t0144"] },
    { id: "t0021", x: 16, y: 2, z: 0, type: "sword", coveredBy: ["t0086", "t0087", "t0148", "t0192", "t0193"] },
    { id: "t0022", x: 18, y: 2, z: 0, type: "gauntlet", coveredBy: ["t0087", "t0088", "t0149", "t0193"] },
    { id: "t0023", x: 20, y: 2, z: 0, type: "gauntlet", coveredBy: ["t0088", "t0089"] },
    { id: "t0024", x: 0, y: 3, z: 0, type: "gauntlet", coveredBy: ["t0090"] },
    { id: "t0025", x: 2, y: 3, z: 0, type: "helmet", coveredBy: ["t0090", "t0091", "t0150"] },
    { id: "t0026", x: 4, y: 3, z: 0, type: "relic", coveredBy: ["t0091", "t0092", "t0151", "t0194"] },
    { id: "t0027", x: 6, y: 3, z: 0, type: "shield", coveredBy: ["t0092", "t0093", "t0152", "t0194", "t0195", "t0222"] },
    { id: "t0029", x: 16, y: 3, z: 0, type: "coin", coveredBy: ["t0094", "t0095", "t0154", "t0196", "t0197"] },
    { id: "t0031", x: 20, y: 3, z: 0, type: "book", coveredBy: ["t0096", "t0097"] },
    { id: "t0032", x: 0, y: 4, z: 0, type: "crown", coveredBy: ["t0098"] },
    { id: "t0033", x: 2, y: 4, z: 0, type: "book", coveredBy: ["t0098", "t0099", "t0156"] },
    { id: "t0034", x: 4, y: 4, z: 0, type: "helmet", coveredBy: ["t0099", "t0100", "t0157", "t0198"] },
    { id: "t0035", x: 6, y: 4, z: 0, type: "book", coveredBy: ["t0100", "t0101", "t0158", "t0198", "t0199", "t0224"] },
    { id: "t0036", x: 14, y: 4, z: 0, type: "coin", coveredBy: ["t0102", "t0159", "t0200", "t0225"] },
    { id: "t0037", x: 16, y: 4, z: 0, type: "sword", coveredBy: ["t0102", "t0103", "t0160", "t0200", "t0201"] },
    { id: "t0038", x: 18, y: 4, z: 0, type: "helmet", coveredBy: ["t0103", "t0104", "t0161", "t0201"] },
    { id: "t0039", x: 20, y: 4, z: 0, type: "gauntlet", coveredBy: ["t0104", "t0105"] },
    { id: "t0040", x: 0, y: 5, z: 0, type: "scroll", coveredBy: ["t0106"] },
    { id: "t0041", x: 2, y: 5, z: 0, type: "helmet", coveredBy: ["t0106", "t0107", "t0162"] },
    { id: "t0042", x: 4, y: 5, z: 0, type: "sword", coveredBy: ["t0107", "t0108", "t0163", "t0202"] },
    { id: "t0043", x: 6, y: 5, z: 0, type: "moon", coveredBy: ["t0108", "t0109", "t0164", "t0202", "t0203", "t0226"] },
    { id: "t0044", x: 14, y: 5, z: 0, type: "potion", coveredBy: ["t0110", "t0165", "t0204", "t0227"] },
    { id: "t0045", x: 16, y: 5, z: 0, type: "moon", coveredBy: ["t0110", "t0111", "t0166", "t0204", "t0205"] },
    { id: "t0046", x: 18, y: 5, z: 0, type: "moon", coveredBy: ["t0111", "t0112", "t0167", "t0205"] },
    { id: "t0047", x: 20, y: 5, z: 0, type: "book", coveredBy: ["t0112", "t0113"] },
    { id: "t0049", x: 2, y: 6, z: 0, type: "flame", coveredBy: ["t0114", "t0115", "t0168"] },
    { id: "t0050", x: 4, y: 6, z: 0, type: "gauntlet", coveredBy: ["t0115", "t0116", "t0169", "t0206"] },
    { id: "t0051", x: 6, y: 6, z: 0, type: "sword", coveredBy: ["t0116", "t0117", "t0170", "t0206", "t0207", "t0228"] },
    { id: "t0052", x: 14, y: 6, z: 0, type: "chest", coveredBy: ["t0118", "t0171", "t0208", "t0229"] },
    { id: "t0053", x: 16, y: 6, z: 0, type: "book", coveredBy: ["t0118", "t0119", "t0172", "t0208", "t0209"] },
    { id: "t0054", x: 18, y: 6, z: 0, type: "moon", coveredBy: ["t0119", "t0120", "t0173", "t0209"] },
    { id: "t0055", x: 20, y: 6, z: 0, type: "chest", coveredBy: ["t0120", "t0121"] },
    { id: "t0056", x: 0, y: 7, z: 0, type: "potion", coveredBy: ["t0122"] },
    { id: "t0057", x: 2, y: 7, z: 0, type: "scroll", coveredBy: ["t0122", "t0123", "t0174"] },
    { id: "t0058", x: 4, y: 7, z: 0, type: "shield", coveredBy: ["t0123", "t0124", "t0175", "t0210"] },
    { id: "t0059", x: 6, y: 7, z: 0, type: "relic", coveredBy: ["t0124", "t0125", "t0176", "t0210", "t0211", "t0230"] },
    { id: "t0060", x: 14, y: 7, z: 0, type: "flame", coveredBy: ["t0126", "t0177", "t0212", "t0231"] },
    { id: "t0061", x: 16, y: 7, z: 0, type: "gauntlet", coveredBy: ["t0126", "t0127", "t0178", "t0212", "t0213"] },
    { id: "t0062", x: 18, y: 7, z: 0, type: "sword", coveredBy: ["t0127", "t0128", "t0179", "t0213"] },
    { id: "t0063", x: 20, y: 7, z: 0, type: "potion", coveredBy: ["t0128", "t0129"] },
    { id: "t0065", x: 23, y: 9, z: 0, type: "flame", coveredBy: ["t0131", "t0181", "t0215", "t0233", "t0235", "t0237", "t0239", "t0241"] },
    { id: "t0066", x: 3, y: 0, z: 1, type: "relic", coveredBy: ["t0132", "t0133"] },
    { id: "t0067", x: 5, y: 0, z: 1, type: "book", coveredBy: ["t0133", "t0134", "t0182", "t0216"] },
    { id: "t0068", x: 7, y: 0, z: 1, type: "gauntlet", coveredBy: ["t0134", "t0183", "t0216"] },
    { id: "t0069", x: 10, y: 0, z: 1, type: "relic", coveredBy: [] },
    { id: "t0070", x: 12, y: 0, z: 1, type: "relic", coveredBy: [] },
    { id: "t0071", x: 15, y: 0, z: 1, type: "moon", coveredBy: ["t0135", "t0136", "t0184", "t0217"] },
    { id: "t0072", x: 17, y: 0, z: 1, type: "relic", coveredBy: ["t0136", "t0137", "t0185"] },
    { id: "t0073", x: 19, y: 0, z: 1, type: "book", coveredBy: ["t0137"] },
    { id: "t0074", x: 3, y: 1, z: 1, type: "chest", coveredBy: ["t0138", "t0139"] },
    { id: "t0075", x: 5, y: 1, z: 1, type: "crown", coveredBy: ["t0139", "t0140", "t0186", "t0218"] },
    { id: "t0076", x: 7, y: 1, z: 1, type: "flame", coveredBy: ["t0140", "t0187", "t0218"] },
    { id: "t0077", x: 10, y: 1, z: 1, type: "book", coveredBy: [] },
    { id: "t0078", x: 12, y: 1, z: 1, type: "gauntlet", coveredBy: [] },
    { id: "t0079", x: 15, y: 1, z: 1, type: "scroll", coveredBy: ["t0141", "t0142", "t0188", "t0219"] },
    { id: "t0080", x: 17, y: 1, z: 1, type: "coin", coveredBy: ["t0142", "t0143", "t0189"] },
    { id: "t0081", x: 19, y: 1, z: 1, type: "ring", coveredBy: ["t0143"] },
    { id: "t0082", x: 1, y: 2, z: 1, type: "relic", coveredBy: ["t0144"] },
    { id: "t0083", x: 3, y: 2, z: 1, type: "gem", coveredBy: ["t0144", "t0145"] },
    { id: "t0084", x: 5, y: 2, z: 1, type: "key", coveredBy: ["t0145", "t0146", "t0190", "t0220"] },
    { id: "t0085", x: 7, y: 2, z: 1, type: "ring", coveredBy: ["t0146", "t0191", "t0220"] },
    { id: "t0086", x: 15, y: 2, z: 1, type: "gem", coveredBy: ["t0147", "t0148", "t0192", "t0221"] },
    { id: "t0087", x: 17, y: 2, z: 1, type: "scroll", coveredBy: ["t0148", "t0149", "t0193"] },
    { id: "t0088", x: 19, y: 2, z: 1, type: "flame", coveredBy: ["t0149"] },
    { id: "t0089", x: 21, y: 2, z: 1, type: "gauntlet", coveredBy: [] },
    { id: "t0090", x: 1, y: 3, z: 1, type: "sword", coveredBy: ["t0150"] },
    { id: "t0091", x: 3, y: 3, z: 1, type: "shield", coveredBy: ["t0150", "t0151"] },
    { id: "t0092", x: 5, y: 3, z: 1, type: "crown", coveredBy: ["t0151", "t0152", "t0194", "t0222"] },
    { id: "t0093", x: 7, y: 3, z: 1, type: "gem", coveredBy: ["t0152", "t0195", "t0222"] },
    { id: "t0094", x: 15, y: 3, z: 1, type: "ring", coveredBy: ["t0153", "t0154", "t0196", "t0223"] },
    { id: "t0095", x: 17, y: 3, z: 1, type: "ring", coveredBy: ["t0154", "t0155", "t0197"] },
    { id: "t0096", x: 19, y: 3, z: 1, type: "scroll", coveredBy: ["t0155"] },
    { id: "t0097", x: 21, y: 3, z: 1, type: "crown", coveredBy: [] },
    { id: "t0098", x: 1, y: 4, z: 1, type: "ring", coveredBy: ["t0156"] },
    { id: "t0099", x: 3, y: 4, z: 1, type: "flame", coveredBy: ["t0156", "t0157"] },
    { id: "t0100", x: 5, y: 4, z: 1, type: "helmet", coveredBy: ["t0157", "t0158", "t0198", "t0224"] },
    { id: "t0101", x: 7, y: 4, z: 1, type: "scroll", coveredBy: ["t0158", "t0199", "t0224"] },
    { id: "t0102", x: 15, y: 4, z: 1, type: "flame", coveredBy: ["t0159", "t0160", "t0200", "t0225"] },
    { id: "t0103", x: 17, y: 4, z: 1, type: "scroll", coveredBy: ["t0160", "t0161", "t0201"] },
    { id: "t0104", x: 19, y: 4, z: 1, type: "ring", coveredBy: ["t0161"] },
    { id: "t0105", x: 21, y: 4, z: 1, type: "potion", coveredBy: [] },
    { id: "t0106", x: 1, y: 5, z: 1, type: "key", coveredBy: ["t0162"] },
    { id: "t0107", x: 3, y: 5, z: 1, type: "flame", coveredBy: ["t0162", "t0163"] },
    { id: "t0108", x: 5, y: 5, z: 1, type: "gauntlet", coveredBy: ["t0163", "t0164", "t0202", "t0226"] },
    { id: "t0109", x: 7, y: 5, z: 1, type: "ring", coveredBy: ["t0164", "t0203", "t0226"] },
    { id: "t0110", x: 15, y: 5, z: 1, type: "helmet", coveredBy: ["t0165", "t0166", "t0204", "t0227"] },
    { id: "t0111", x: 17, y: 5, z: 1, type: "flame", coveredBy: ["t0166", "t0167", "t0205"] },
    { id: "t0112", x: 19, y: 5, z: 1, type: "crown", coveredBy: ["t0167"] },
    { id: "t0113", x: 21, y: 5, z: 1, type: "book", coveredBy: [] },
    { id: "t0114", x: 1, y: 6, z: 1, type: "flame", coveredBy: ["t0168"] },
    { id: "t0115", x: 3, y: 6, z: 1, type: "sword", coveredBy: ["t0168", "t0169"] },
    { id: "t0116", x: 5, y: 6, z: 1, type: "book", coveredBy: ["t0169", "t0170", "t0206", "t0228"] },
    { id: "t0117", x: 7, y: 6, z: 1, type: "potion", coveredBy: ["t0170", "t0207", "t0228"] },
    { id: "t0118", x: 15, y: 6, z: 1, type: "relic", coveredBy: ["t0171", "t0172", "t0208", "t0229"] },
    { id: "t0119", x: 17, y: 6, z: 1, type: "moon", coveredBy: ["t0172", "t0173", "t0209"] },
    { id: "t0120", x: 19, y: 6, z: 1, type: "book", coveredBy: ["t0173"] },
    { id: "t0121", x: 21, y: 6, z: 1, type: "scroll", coveredBy: [] },
    { id: "t0122", x: 1, y: 7, z: 1, type: "crown", coveredBy: ["t0174"] },
    { id: "t0123", x: 3, y: 7, z: 1, type: "gem", coveredBy: ["t0174", "t0175"] },
    { id: "t0124", x: 5, y: 7, z: 1, type: "gauntlet", coveredBy: ["t0175", "t0176", "t0210", "t0230"] },
    { id: "t0125", x: 7, y: 7, z: 1, type: "shield", coveredBy: ["t0176", "t0211", "t0230"] },
    { id: "t0126", x: 15, y: 7, z: 1, type: "shield", coveredBy: ["t0177", "t0178", "t0212", "t0231"] },
    { id: "t0127", x: 17, y: 7, z: 1, type: "ring", coveredBy: ["t0178", "t0179", "t0213"] },
    { id: "t0128", x: 19, y: 7, z: 1, type: "crown", coveredBy: ["t0179"] },
    { id: "t0129", x: 21, y: 7, z: 1, type: "ring", coveredBy: [] },
    { id: "t0130", x: -3, y: 9, z: 1, type: "key", coveredBy: ["t0180", "t0214", "t0232", "t0234", "t0236", "t0238", "t0240"] },
    { id: "t0131", x: 23, y: 9, z: 1, type: "helmet", coveredBy: ["t0181", "t0215", "t0233", "t0235", "t0237", "t0239", "t0241"] },
    { id: "t0132", x: 2, y: 0, z: 2, type: "chest", coveredBy: [] },
    { id: "t0133", x: 4, y: 0, z: 2, type: "gem", coveredBy: ["t0182"] },
    { id: "t0134", x: 6, y: 0, z: 2, type: "book", coveredBy: ["t0182", "t0183", "t0216"] },
    { id: "t0135", x: 14, y: 0, z: 2, type: "helmet", coveredBy: ["t0184", "t0217"] },
    { id: "t0136", x: 16, y: 0, z: 2, type: "gem", coveredBy: ["t0184", "t0185"] },
    { id: "t0137", x: 18, y: 0, z: 2, type: "key", coveredBy: ["t0185"] },
    { id: "t0138", x: 2, y: 1, z: 2, type: "helmet", coveredBy: [] },
    { id: "t0139", x: 4, y: 1, z: 2, type: "potion", coveredBy: ["t0186"] },
    { id: "t0140", x: 6, y: 1, z: 2, type: "coin", coveredBy: ["t0186", "t0187", "t0218"] },
    { id: "t0141", x: 14, y: 1, z: 2, type: "coin", coveredBy: ["t0188", "t0219"] },
    { id: "t0142", x: 16, y: 1, z: 2, type: "gem", coveredBy: ["t0188", "t0189"] },
    { id: "t0143", x: 18, y: 1, z: 2, type: "moon", coveredBy: ["t0189"] },
    { id: "t0144", x: 2, y: 2, z: 2, type: "coin", coveredBy: [] },
    { id: "t0145", x: 4, y: 2, z: 2, type: "gauntlet", coveredBy: ["t0190"] },
    { id: "t0146", x: 6, y: 2, z: 2, type: "coin", coveredBy: ["t0190", "t0191", "t0220"] },
    { id: "t0147", x: 14, y: 2, z: 2, type: "relic", coveredBy: ["t0192", "t0221"] },
    { id: "t0148", x: 16, y: 2, z: 2, type: "book", coveredBy: ["t0192", "t0193"] },
    { id: "t0149", x: 18, y: 2, z: 2, type: "potion", coveredBy: ["t0193"] },
    { id: "t0150", x: 2, y: 3, z: 2, type: "sword", coveredBy: [] },
    { id: "t0151", x: 4, y: 3, z: 2, type: "shield", coveredBy: ["t0194"] },
    { id: "t0152", x: 6, y: 3, z: 2, type: "key", coveredBy: ["t0194", "t0195", "t0222"] },
    { id: "t0153", x: 14, y: 3, z: 2, type: "gem", coveredBy: ["t0196", "t0223"] },
    { id: "t0154", x: 16, y: 3, z: 2, type: "moon", coveredBy: ["t0196", "t0197"] },
    { id: "t0155", x: 18, y: 3, z: 2, type: "chest", coveredBy: ["t0197"] },
    { id: "t0156", x: 2, y: 4, z: 2, type: "potion", coveredBy: [] },
    { id: "t0157", x: 4, y: 4, z: 2, type: "gem", coveredBy: ["t0198"] },
    { id: "t0158", x: 6, y: 4, z: 2, type: "relic", coveredBy: ["t0198", "t0199", "t0224"] },
    { id: "t0159", x: 14, y: 4, z: 2, type: "gauntlet", coveredBy: ["t0200", "t0225"] },
    { id: "t0160", x: 16, y: 4, z: 2, type: "chest", coveredBy: ["t0200", "t0201"] },
    { id: "t0161", x: 18, y: 4, z: 2, type: "chest", coveredBy: ["t0201"] },
    { id: "t0162", x: 2, y: 5, z: 2, type: "gem", coveredBy: [] },
    { id: "t0163", x: 4, y: 5, z: 2, type: "ring", coveredBy: ["t0202"] },
    { id: "t0164", x: 6, y: 5, z: 2, type: "flame", coveredBy: ["t0202", "t0203", "t0226"] },
    { id: "t0165", x: 14, y: 5, z: 2, type: "gem", coveredBy: ["t0204", "t0227"] },
    { id: "t0166", x: 16, y: 5, z: 2, type: "chest", coveredBy: ["t0204", "t0205"] },
    { id: "t0167", x: 18, y: 5, z: 2, type: "ring", coveredBy: ["t0205"] },
    { id: "t0168", x: 2, y: 6, z: 2, type: "gauntlet", coveredBy: [] },
    { id: "t0169", x: 4, y: 6, z: 2, type: "scroll", coveredBy: ["t0206"] },
    { id: "t0170", x: 6, y: 6, z: 2, type: "coin", coveredBy: ["t0206", "t0207", "t0228"] },
    { id: "t0171", x: 14, y: 6, z: 2, type: "shield", coveredBy: ["t0208", "t0229"] },
    { id: "t0172", x: 16, y: 6, z: 2, type: "moon", coveredBy: ["t0208", "t0209"] },
    { id: "t0173", x: 18, y: 6, z: 2, type: "scroll", coveredBy: ["t0209"] },
    { id: "t0174", x: 2, y: 7, z: 2, type: "coin", coveredBy: [] },
    { id: "t0175", x: 4, y: 7, z: 2, type: "scroll", coveredBy: ["t0210"] },
    { id: "t0176", x: 6, y: 7, z: 2, type: "moon", coveredBy: ["t0210", "t0211", "t0230"] },
    { id: "t0177", x: 14, y: 7, z: 2, type: "gem", coveredBy: ["t0212", "t0231"] },
    { id: "t0178", x: 16, y: 7, z: 2, type: "crown", coveredBy: ["t0212", "t0213"] },
    { id: "t0179", x: 18, y: 7, z: 2, type: "coin", coveredBy: ["t0213"] },
    { id: "t0180", x: -3, y: 9, z: 2, type: "scroll", coveredBy: ["t0214", "t0232", "t0234", "t0236", "t0238", "t0240"] },
    { id: "t0181", x: 23, y: 9, z: 2, type: "book", coveredBy: ["t0215", "t0233", "t0235", "t0237", "t0239", "t0241"] },
    { id: "t0182", x: 5, y: 0, z: 3, type: "chest", coveredBy: ["t0216"] },
    { id: "t0183", x: 7, y: 0, z: 3, type: "relic", coveredBy: ["t0216"] },
    { id: "t0184", x: 15, y: 0, z: 3, type: "shield", coveredBy: ["t0217"] },
    { id: "t0185", x: 17, y: 0, z: 3, type: "key", coveredBy: [] },
    { id: "t0186", x: 5, y: 1, z: 3, type: "flame", coveredBy: ["t0218"] },
    { id: "t0187", x: 7, y: 1, z: 3, type: "potion", coveredBy: ["t0218"] },
    { id: "t0188", x: 15, y: 1, z: 3, type: "shield", coveredBy: ["t0219"] },
    { id: "t0189", x: 17, y: 1, z: 3, type: "sword", coveredBy: [] },
    { id: "t0190", x: 5, y: 2, z: 3, type: "relic", coveredBy: ["t0220"] },
    { id: "t0191", x: 7, y: 2, z: 3, type: "book", coveredBy: ["t0220"] },
    { id: "t0192", x: 15, y: 2, z: 3, type: "potion", coveredBy: ["t0221"] },
    { id: "t0193", x: 17, y: 2, z: 3, type: "crown", coveredBy: [] },
    { id: "t0194", x: 5, y: 3, z: 3, type: "crown", coveredBy: ["t0222"] },
    { id: "t0195", x: 7, y: 3, z: 3, type: "coin", coveredBy: ["t0222"] },
    { id: "t0196", x: 15, y: 3, z: 3, type: "shield", coveredBy: ["t0223"] },
    { id: "t0197", x: 17, y: 3, z: 3, type: "relic", coveredBy: [] },
    { id: "t0198", x: 5, y: 4, z: 3, type: "flame", coveredBy: ["t0224"] },
    { id: "t0199", x: 7, y: 4, z: 3, type: "helmet", coveredBy: ["t0224"] },
    { id: "t0200", x: 15, y: 4, z: 3, type: "key", coveredBy: ["t0225"] },
    { id: "t0201", x: 17, y: 4, z: 3, type: "scroll", coveredBy: [] },
    { id: "t0202", x: 5, y: 5, z: 3, type: "key", coveredBy: ["t0226"] },
    { id: "t0203", x: 7, y: 5, z: 3, type: "relic", coveredBy: ["t0226"] },
    { id: "t0204", x: 15, y: 5, z: 3, type: "chest", coveredBy: ["t0227"] },
    { id: "t0205", x: 17, y: 5, z: 3, type: "chest", coveredBy: [] },
    { id: "t0206", x: 5, y: 6, z: 3, type: "crown", coveredBy: ["t0228"] },
    { id: "t0207", x: 7, y: 6, z: 3, type: "ring", coveredBy: ["t0228"] },
    { id: "t0208", x: 15, y: 6, z: 3, type: "sword", coveredBy: ["t0229"] },
    { id: "t0209", x: 17, y: 6, z: 3, type: "crown", coveredBy: [] },
    { id: "t0210", x: 5, y: 7, z: 3, type: "chest", coveredBy: ["t0230"] },
    { id: "t0211", x: 7, y: 7, z: 3, type: "crown", coveredBy: ["t0230"] },
    { id: "t0212", x: 15, y: 7, z: 3, type: "chest", coveredBy: ["t0231"] },
    { id: "t0213", x: 17, y: 7, z: 3, type: "shield", coveredBy: [] },
    { id: "t0214", x: -3, y: 9, z: 3, type: "helmet", coveredBy: ["t0232", "t0234", "t0236", "t0238", "t0240"] },
    { id: "t0215", x: 23, y: 9, z: 3, type: "coin", coveredBy: ["t0233", "t0235", "t0237", "t0239", "t0241"] },
    { id: "t0216", x: 6, y: 0, z: 4, type: "sword", coveredBy: [] },
    { id: "t0217", x: 14, y: 0, z: 4, type: "relic", coveredBy: [] },
    { id: "t0218", x: 6, y: 1, z: 4, type: "sword", coveredBy: [] },
    { id: "t0219", x: 14, y: 1, z: 4, type: "scroll", coveredBy: [] },
    { id: "t0220", x: 6, y: 2, z: 4, type: "moon", coveredBy: [] },
    { id: "t0221", x: 14, y: 2, z: 4, type: "moon", coveredBy: [] },
    { id: "t0222", x: 6, y: 3, z: 4, type: "crown", coveredBy: [] },
    { id: "t0223", x: 14, y: 3, z: 4, type: "chest", coveredBy: [] },
    { id: "t0224", x: 6, y: 4, z: 4, type: "potion", coveredBy: [] },
    { id: "t0225", x: 14, y: 4, z: 4, type: "sword", coveredBy: [] },
    { id: "t0226", x: 6, y: 5, z: 4, type: "shield", coveredBy: [] },
    { id: "t0227", x: 14, y: 5, z: 4, type: "key", coveredBy: [] },
    { id: "t0228", x: 6, y: 6, z: 4, type: "key", coveredBy: [] },
    { id: "t0229", x: 14, y: 6, z: 4, type: "shield", coveredBy: [] },
    { id: "t0230", x: 6, y: 7, z: 4, type: "crown", coveredBy: [] },
    { id: "t0231", x: 14, y: 7, z: 4, type: "coin", coveredBy: [] },
    { id: "t0232", x: -3, y: 9, z: 4, type: "key", coveredBy: ["t0234", "t0236", "t0238", "t0240"] },
    { id: "t0233", x: 23, y: 9, z: 4, type: "key", coveredBy: ["t0235", "t0237", "t0239", "t0241"] },
    { id: "t0234", x: -3, y: 9, z: 5, type: "sword", coveredBy: ["t0236", "t0238", "t0240"] },
    { id: "t0235", x: 23, y: 9, z: 5, type: "coin", coveredBy: ["t0237", "t0239", "t0241"] },
    { id: "t0236", x: -3, y: 9, z: 6, type: "potion", coveredBy: ["t0238", "t0240"] },
    { id: "t0237", x: 23, y: 9, z: 6, type: "helmet", coveredBy: ["t0239", "t0241"] },
    { id: "t0238", x: -3, y: 9, z: 7, type: "flame", coveredBy: ["t0240"] },
    { id: "t0239", x: 23, y: 9, z: 7, type: "gauntlet", coveredBy: ["t0241"] },
    { id: "t0240", x: -3, y: 9, z: 8, type: "shield", coveredBy: [] },
    { id: "t0241", x: 23, y: 9, z: 8, type: "coin", coveredBy: [] }
];

export function isTileLocked(tile: TripleTileNode, board: TripleTileNode[]): boolean {
    if (tile.coveredBy.length === 0) return false;
    const boardIds = new Set(board.map(b => b.id));
    return tile.coveredBy.some(id => boardIds.has(id));
}

export const bedrockDivots: { x: number; y: number }[] = [];

// LEGACY STUBS
export function isDirectStackLocked(tile: TripleTileNode, tiles: TripleTileNode[]) { return isTileLocked(tile, tiles); }
export function isLeftRightBlocked() { return false; }
export function generateBoard() { return []; }
export function generateStackBoard() { return []; }
export function generateValidBoard() { return trueTripleTileMap; }
