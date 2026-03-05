// ─── TILE CONFIG ──────────────────────────────────
// Centralised symbol + level config for Conquest Tiles.
// Swap icons / images here without touching game code.

import bloomSprite from '../../assets/pets/bloom_sprite.png';
import clockworkOwl from '../../assets/pets/clockwork_owl.png';
import emberfox from '../../assets/pets/emberfox.png';
import etherealCow from '../../assets/pets/ethereal_cow.png';
import lanternSlime from '../../assets/pets/lantern_slime.png';
import mossGolem from '../../assets/pets/moss_golem.png';
import obsidianBeetle from '../../assets/pets/obsidian_beetle.png';
import stormPup from '../../assets/pets/storm_pup.png';
import voidling from '../../assets/pets/voidling.png';

// ─── TYPES ────────────────────────────────────────
export type TileRarity = 'common' | 'rare' | 'epic';

export interface TileSymbol {
    id: string;
    label: string;
    emoji?: string;      // emoji-based icon
    imageSrc?: string;    // image-based icon (overrides emoji when present)
    rarity: TileRarity;
}

// ─── SOLDIER SYMBOLS (common) ─────────────────────
export const SOLDIER_SYMBOLS: TileSymbol[] = [
    { id: 'soldier_infantry', label: 'Infantry', emoji: '⚔️', rarity: 'common' },
    { id: 'soldier_archer', label: 'Archer', emoji: '🏹', rarity: 'common' },
    { id: 'soldier_cavalry', label: 'Cavalry', emoji: '🐴', rarity: 'common' },
    { id: 'soldier_mage', label: 'Mage', emoji: '🔮', rarity: 'common' },
    { id: 'soldier_siege', label: 'Siege', emoji: '🏗️', rarity: 'common' },
    { id: 'soldier_healer', label: 'Healer', emoji: '💊', rarity: 'common' },
    { id: 'soldier_banner', label: 'Banner', emoji: '🚩', rarity: 'common' },
    { id: 'soldier_scout', label: 'Scout', emoji: '🔭', rarity: 'common' },
    { id: 'soldier_shield', label: 'Shield', emoji: '🛡️', rarity: 'common' },
    { id: 'soldier_spear', label: 'Spear', emoji: '🗡️', rarity: 'common' },
    { id: 'soldier_drum', label: 'War Drum', emoji: '🥁', rarity: 'common' },
    { id: 'soldier_catapult', label: 'Catapult', emoji: '💣', rarity: 'common' },
];

// ─── PET SYMBOLS (rare) ──────────────────────────
export const PET_SYMBOLS: TileSymbol[] = [
    { id: 'pet_bloom_sprite', label: 'Bloom Sprite', imageSrc: bloomSprite, rarity: 'rare' },
    { id: 'pet_clockwork_owl', label: 'Clockwork Owl', imageSrc: clockworkOwl, rarity: 'rare' },
    { id: 'pet_emberfox', label: 'Emberfox', imageSrc: emberfox, rarity: 'rare' },
    { id: 'pet_ethereal_cow', label: 'Ethereal Cow', imageSrc: etherealCow, rarity: 'epic' },
    { id: 'pet_lantern_slime', label: 'Lantern Slime', imageSrc: lanternSlime, rarity: 'rare' },
    { id: 'pet_moss_golem', label: 'Moss Golem', imageSrc: mossGolem, rarity: 'rare' },
    { id: 'pet_obsidian_beetle', label: 'Obsidian Beetle', imageSrc: obsidianBeetle, rarity: 'rare' },
    { id: 'pet_storm_pup', label: 'Storm Pup', imageSrc: stormPup, rarity: 'rare' },
    { id: 'pet_voidling', label: 'Voidling', imageSrc: voidling, rarity: 'epic' },
];

export const ALL_SYMBOLS: TileSymbol[] = [...SOLDIER_SYMBOLS, ...PET_SYMBOLS];

// ─── DIFFICULTY PRESETS ───────────────────────────
export type Difficulty = 1 | 2 | 3 | 4;   // 1=Easy, 2=Medium, 3=Hard, 4=Impossible

export interface DifficultyPreset {
    name: string;
    totalTiles: number;
    symbolCount: number;     // how many unique symbols to use
    layers: number;
    label: string;
    gemReward: number;       // gems awarded on win
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
    1: { name: 'Easy', totalTiles: 48, symbolCount: 16, layers: 3, label: '🟢 Easy', gemReward: 0 },
    2: { name: 'Medium', totalTiles: 72, symbolCount: 24, layers: 4, label: '🟡 Medium', gemReward: 0 },
    3: { name: 'Hard', totalTiles: 96, symbolCount: 32, layers: 5, label: '🔴 Hard', gemReward: 1 },
    4: { name: 'Impossible', totalTiles: 120, symbolCount: 40, layers: 6, label: '💀 Impossible', gemReward: 3 },
};

// ─── SEEDED RNG ───────────────────────────────────
export function createSeededRng(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// ─── TILE & BOARD TYPES ──────────────────────────
export interface BoardTile {
    uid: number;               // unique instance id
    symbolId: string;
    symbol: TileSymbol;
    layer: number;             // z-layer (higher = on top)
    x: number;                 // grid col position
    y: number;                 // grid row position
    removed: boolean;          // true when moved to tray or removed by power
}

// ─── LEVEL GENERATOR ─────────────────────────────
// Produces a deterministic board given a seed and difficulty.
// Uses bag-based randomization to prevent clusters.
export function generateBoard(difficulty: Difficulty, seed: number): BoardTile[] {
    const rng = createSeededRng(seed);
    const preset = DIFFICULTY_PRESETS[difficulty];

    // Pick symbols — fill with soldiers first, pad with pets for variety
    const availableSymbols = [...SOLDIER_SYMBOLS];
    const shuffledPets = [...PET_SYMBOLS].sort(() => rng() - 0.5);
    availableSymbols.push(...shuffledPets);

    // Take symbolCount symbols and ensure total = totalTiles (multiple of 3 per symbol)
    const tilesPerSymbol = 3;
    const symbolsNeeded = preset.totalTiles / tilesPerSymbol;
    const chosenSymbols: TileSymbol[] = [];
    for (let i = 0; i < symbolsNeeded; i++) {
        chosenSymbols.push(availableSymbols[i % availableSymbols.length]);
    }

    // Build flat tile bag (each symbol appears exactly 3 times)
    const tileBag: { symbolId: string; symbol: TileSymbol }[] = [];
    for (const sym of chosenSymbols) {
        for (let i = 0; i < tilesPerSymbol; i++) {
            tileBag.push({ symbolId: sym.id, symbol: sym });
        }
    }

    // Fisher-Yates shuffle the bag
    for (let i = tileBag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [tileBag[i], tileBag[j]] = [tileBag[j], tileBag[i]];
    }

    // Anti-consecutive pass: prevent 2+ identical symbols adjacent in draw order
    for (let i = 1; i < tileBag.length - 1; i++) {
        if (tileBag[i].symbolId === tileBag[i - 1].symbolId) {
            // Find a different tile to swap with (look ahead)
            for (let j = i + 1; j < tileBag.length; j++) {
                if (tileBag[j].symbolId !== tileBag[i].symbolId &&
                    (j + 1 >= tileBag.length || tileBag[j + 1]?.symbolId !== tileBag[i - 1].symbolId)) {
                    [tileBag[i], tileBag[j]] = [tileBag[j], tileBag[i]];
                    break;
                }
            }
        }
    }

    // Generate layout positions — stacked cluster with jitter
    const cols = Math.ceil(Math.sqrt(preset.totalTiles / preset.layers) * 1.5);
    const rows = Math.ceil(preset.totalTiles / (cols * preset.layers));

    const tiles: BoardTile[] = [];
    let uid = 0;

    // Create position indices and shuffle them for randomized spawn positions
    const positionIndices = Array.from({ length: tileBag.length }, (_, i) => i);
    for (let i = positionIndices.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [positionIndices[i], positionIndices[j]] = [positionIndices[j], positionIndices[i]];
    }

    for (let idx = 0; idx < tileBag.length; idx++) {
        const posIdx = positionIndices[idx];
        const layer = posIdx % preset.layers;
        const posInLayer = Math.floor(posIdx / preset.layers);
        const row = posInLayer % rows;
        const col = Math.floor(posInLayer / rows);

        // Add position jitter for unpredictability
        const xJitter = (rng() - 0.5) * 0.15;
        const yJitter = (rng() - 0.5) * 0.15;

        // Layer stagger for overlapping effect
        const xOffset = layer * 0.35;
        const yOffset = layer * 0.35;

        tiles.push({
            uid: uid++,
            symbolId: tileBag[idx].symbolId,
            symbol: tileBag[idx].symbol,
            layer,
            x: col + xOffset + xJitter,
            y: row + yOffset + yJitter,
            removed: false,
        });
    }

    return tiles;
}

// ─── OVERLAP CHECK ────────────────────────────────
// A tile is "blocked" if any tile on a higher layer overlaps its area by >15%.
const TILE_W = 1;
const TILE_H = 1;

function rectOverlapArea(
    ax: number, ay: number,
    bx: number, by: number,
): number {
    const overlapX = Math.max(0, Math.min(ax + TILE_W, bx + TILE_W) - Math.max(ax, bx));
    const overlapY = Math.max(0, Math.min(ay + TILE_H, by + TILE_H) - Math.max(ay, by));
    return overlapX * overlapY;
}

export function isTileBlocked(tile: BoardTile, allTiles: BoardTile[]): boolean {
    const tileArea = TILE_W * TILE_H;
    for (const other of allTiles) {
        if (other.removed || other.uid === tile.uid) continue;
        if (other.layer <= tile.layer) continue;
        const overlap = rectOverlapArea(tile.x, tile.y, other.x, other.y);
        if (overlap / tileArea > 0.15) return true;
    }
    return false;
}

// ─── POWER-UP COSTS ───────────────────────────────
export const POWER_COSTS = {
    remove: 10,
    undo: 10,
    shuffle: 10,
} as const;
