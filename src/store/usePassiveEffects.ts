import { useInventoryStore, ITEM_DB, type ItemStatBonuses } from './useInventoryStore';
import { PET_DB } from './useGachaStore';
import { useRiskStore } from './useRiskStore';

export interface PassiveBonuses {
    attack_bonus: number;
    defense_bonus: number;
    max_hp_bonus: number;
    crit_bonus: number;
    gold_bonus: number;
    sigil_bonus: number;
    intelligence_bonus: number;
    strategy_bonus: number;
    xp_multiplier: number;   // Percentage, e.g. 10 = +10%
    gold_multiplier: number; // Percentage, e.g. 8 = +8%
}

const parseEffectString = (effectStr: string, bonuses: PassiveBonuses) => {
    // Example format: "+10 Intelligence, +5 Strategy XP"
    const parts = effectStr.split(',').map(p => p.trim());

    parts.forEach(part => {
        const valMatch = part.match(/([+-]?\d+)/);
        if (!valMatch) return;

        const value = parseInt(valMatch[1], 10);
        const lowerPart = part.toLowerCase();

        if (lowerPart.includes('attack')) bonuses.attack_bonus += value;
        if (lowerPart.includes('defense')) bonuses.defense_bonus += value;
        if (lowerPart.includes('hp')) bonuses.max_hp_bonus += value;
        if (lowerPart.includes('crit')) bonuses.crit_bonus += value;
        if (lowerPart.includes('gold')) bonuses.gold_bonus += value;
        if (lowerPart.includes('sigil')) bonuses.sigil_bonus += value;
        if (lowerPart.includes('intelligence')) bonuses.intelligence_bonus += value;
        if (lowerPart.includes('strategy')) bonuses.strategy_bonus += value;
    });
};

/** Apply structured ItemStatBonuses directly without string parsing */
const applyStatBonuses = (bonuses: PassiveBonuses, sb: ItemStatBonuses | undefined) => {
    if (!sb) return;
    if (sb.attack) bonuses.attack_bonus += sb.attack;
    if (sb.defense) bonuses.defense_bonus += sb.defense;
    if (sb.hp) bonuses.max_hp_bonus += sb.hp;
    if (sb.crit) bonuses.crit_bonus += sb.crit;
    if (sb.xpMultiplier) bonuses.xp_multiplier += sb.xpMultiplier;
    if (sb.goldMultiplier) bonuses.gold_multiplier += sb.goldMultiplier;
    if (sb.intelligence) bonuses.intelligence_bonus += sb.intelligence;
    if (sb.strategy) bonuses.strategy_bonus += sb.strategy;
};

export const getPassiveBonuses = (): PassiveBonuses => {
    const bonuses: PassiveBonuses = {
        attack_bonus: 0,
        defense_bonus: 0,
        max_hp_bonus: 0,
        crit_bonus: 0,
        gold_bonus: 0,
        sigil_bonus: 0,
        intelligence_bonus: 0,
        strategy_bonus: 0,
        xp_multiplier: 0,
        gold_multiplier: 0,
    };

    const equipped = useInventoryStore.getState().equipped;

    // Process all gear slots that use ITEM_DB (weapon, armor, relic, artifact, book, jewelry)
    const processGear = (itemId: string | null) => {
        if (!itemId) return;
        const item = ITEM_DB[itemId];
        if (!item) return;

        // Prefer structured statBonuses when available
        if (item.statBonuses) {
            applyStatBonuses(bonuses, item.statBonuses);
        } else {
            // Legacy fallback: use raw value field
            if (item.type === 'weapon') bonuses.attack_bonus += item.value;
            if (item.type === 'armor') bonuses.defense_bonus += item.value;
            if (item.critChance) bonuses.crit_bonus += Math.floor(item.critChance * 100);
        }

        // Effect string (may provide additional bonuses on top of statBonuses)
        if (item.effect) parseEffectString(item.effect, bonuses);
    };

    processGear(equipped.weapon);
    processGear(equipped.armor);
    processGear(equipped.relic);
    processGear(equipped.artifact);
    processGear(equipped.book);     // New: book slot
    processGear(equipped.jewelry);  // New: jewelry slot

    // Process Pet (via PET_DB)
    if (equipped.pet) {
        const pet = PET_DB[equipped.pet];
        if (pet) {
            if (pet.passiveBonus.type === 'attack') bonuses.attack_bonus += (pet.passiveBonus.value * 10);
            if (pet.passiveBonus.type === 'defense') bonuses.defense_bonus += (pet.passiveBonus.value * 10);
            if (pet.passiveBonus.type === 'skill_xp') {
                if (pet.passiveBonus.skillName === 'intelligence') bonuses.intelligence_bonus += 5;
                if (pet.passiveBonus.skillName === 'strategy') bonuses.strategy_bonus += 5;
            }
        }
    }

    // Process Risk Map Region Bonuses
    const activeRiskRegions = useRiskStore.getState().getActiveRegionBonuses();
    if (activeRiskRegions.includes('start')) bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.05) || 1; // +5% ATK
    if (activeRiskRegions.includes('ash')) bonuses.gold_multiplier += 10; // +10% Gold
    if (activeRiskRegions.includes('iron')) bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.10) || 1; // +10% DEF 
    if (activeRiskRegions.includes('frost')) bonuses.xp_multiplier += 10; // +10% XP
    if (activeRiskRegions.includes('demon')) bonuses.max_hp_bonus += 5; // +5 Max HP

    return bonuses;
};
