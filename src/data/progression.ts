// ── Pet Progression Rules ───────────────────────────────────────────────────
// Level caps, ascension stars, stat growth, evolution thresholds.

// ── Level System ──────────────────────────────────────────────────────────────
export const MAX_LEVEL = 50;
export const BASE_XP_PER_LEVEL = 100; // XP needed for level 1→2
export const XP_GROWTH_FACTOR = 1.15; // Each level needs 15% more XP

/** XP required to reach the next level from `currentLevel` */
export function xpToNextLevel(currentLevel: number): number {
    return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, currentLevel - 1));
}

// ── Ascension Stars ───────────────────────────────────────────────────────────
export const MAX_ASCENSION = 5;
export const ASCENSION_STAT_BONUS_PER_STAR = 0.10; // +10% base stats per star

/** Returns total stat multiplier at given ascension level */
export function ascensionMultiplier(stars: number): number {
    return 1 + Math.min(stars, MAX_ASCENSION) * ASCENSION_STAT_BONUS_PER_STAR;
}

// ── Evolution ────────────────────────────────────────────────────────────────
// Evolution is manual — player must choose to evolve when threshold is met.
// NOTE: Evolution is currently handled per-pet in PET_DATABASE.evolution.
// This is the global threshold rule.
export const EVOLUTION_UNLOCK_LEVEL = 25; // Must reach Lv.25 to evolve
export const EVOLUTION_IS_MANUAL = true;   // Player must confirm

// ── Stat Growth ───────────────────────────────────────────────────────────────
// Per-level stat increases applied on top of base stats.
// Simple linear scaling; can be replaced per-role later.
export const STAT_GROWTH_PER_LEVEL = {
    hp:      3.0,  // +3 HP per level
    attack:  0.5,  // +0.5 ATK per level
    defense: 0.4,  // +0.4 DEF per level
    speed:   0.02, // +0.02 SPD per level (tiny)
};

/** Compute scaled stats at a given level & ascension */
export function computeScaledStats(
    base: { hp: number; attack: number; defense: number; attackSpeed: number },
    level: number,
    stars: number
): { hp: number; attack: number; defense: number; attackSpeed: number } {
    const lvl    = Math.max(1, Math.min(level, MAX_LEVEL));
    const ascMult = ascensionMultiplier(stars);

    return {
        hp:          Math.floor((base.hp     + STAT_GROWTH_PER_LEVEL.hp      * (lvl - 1)) * ascMult),
        attack:      Math.floor((base.attack  + STAT_GROWTH_PER_LEVEL.attack  * (lvl - 1)) * ascMult),
        defense:     Math.floor((base.defense + STAT_GROWTH_PER_LEVEL.defense * (lvl - 1)) * ascMult),
        attackSpeed: parseFloat(((base.attackSpeed + STAT_GROWTH_PER_LEVEL.speed * (lvl - 1)) * ascMult).toFixed(2)),
    };
}

// ── Fusion / Duplicate System Passthrough ────────────────────────────────────
// Gacha duplicate fusion is handled by useFusionStore.ts.
// Fusion thresholds: Lv2 = 3 copies, Lv3 = 5 copies.
export const FUSION_LV2_THRESHOLD = 3;
export const FUSION_LV3_THRESHOLD = 5;
