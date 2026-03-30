// ── Catch Rules — Single source of truth for all capture mechanics ─────────────

export type CatchRarity = 'common' | 'uncommon' | 'rare' | 'rareEncounter';

// ── Base Catch Rates by Rarity ────────────────────────────────────────────────
export const BASE_CATCH_RATES: Record<CatchRarity, number> = {
    common:        0.65, // 65% base
    uncommon:      0.40, // 40% base
    rare:          0.20, // 20% base
    rareEncounter: 0.10, // 10% base (rare encounter variant - harder to catch)
};

// ── Rare Encounter Roll ───────────────────────────────────────────────────────
/** Exactly 1 in 4000 chance to get a rare encounter variant */
export const RARE_ENCOUNTER_CHANCE = 1 / 4000;

/** Rare encounter stat multiplier */
export const RARE_STAT_BONUS = 1.2; // +20% stats

// ── HP Multipliers ────────────────────────────────────────────────────────────
/** Returns multiplier based on wild pet's HP percentage */
export function getHpMultiplier(currentHp: number, maxHp: number): number {
    const pct = maxHp > 0 ? currentHp / maxHp : 1;
    if (pct < 0.20) return 4.0;   // Low HP (<20%) = 4x easier
    if (pct < 0.50) return 2.0;   // Half HP (<50%) = 2x easier
    return 1.0;                    // Full HP = 1x (no bonus)
}

// ── Status Multiplier ─────────────────────────────────────────────────────────
/** Bonus when wild pet has a negative status effect */
export const STATUS_MULTIPLIER = 1.5; // 1.5x if status applied

// ── Rare Penalty ──────────────────────────────────────────────────────────────
/** Penalty applied to rare encounter variants */
export const RARE_PENALTY = 0.5; // 0.5x for rare encounters

// ── Wild Pet Flee Chance on Failed Capture ───────────────────────────────────
export const FLEE_CHANCE_ON_FAILED_CAPTURE = 0.20; // 20%

// ── Core Formula ─────────────────────────────────────────────────────────────
/**
 * calculateCatchChance — Full formula
 * baseRate * hpMultiplier * statusMultiplier * rarePenalty
 * Clamped between 0.01 and 0.95
 */
export function calculateCatchChance(
    rarity: CatchRarity,
    currentHp: number,
    maxHp: number,
    hasStatus: boolean,
    isRareEncounter: boolean
): number {
    const base        = BASE_CATCH_RATES[rarity];
    const hpMult      = getHpMultiplier(currentHp, maxHp);
    const statusMult  = hasStatus ? STATUS_MULTIPLIER : 1.0;
    const rarePenalty = isRareEncounter ? RARE_PENALTY : 1.0;

    const chance = base * hpMult * statusMult * rarePenalty;
    return Math.max(0.01, Math.min(0.95, chance));
}

/** Roll capture — returns true if caught */
export function rollCapture(chance: number): boolean {
    return Math.random() < chance;
}
