import { useInventoryStore, ITEM_DB, type ItemStatBonuses } from './useInventoryStore';
import { ITEM_DATABASE } from '../data/items';
import { PET_DB } from './useGachaStore';
import { useRiskStore } from './useRiskStore';
import { useTraitStore } from './useTraitStore';

export interface PassiveBonuses {
    attack_bonus: number;
    defense_bonus: number;
    max_hp_bonus: number;
    crit_bonus: number;
    gold_bonus: number;
    sigil_bonus: number;
    intelligence_bonus: number;
    strategy_bonus: number;
    magic_attack_bonus: number;
    magic_defense_bonus: number;
    max_mana_bonus: number;
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
        magic_attack_bonus: 0,
        magic_defense_bonus: 0,
        max_mana_bonus: 0,
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

    // Process Pet (via PET_DB or ITEM_DATABASE)
    if (equipped.pet) {
        const gachaPet = PET_DB[equipped.pet];
        if (gachaPet) {
            if (gachaPet.passiveBonus.type === 'attack') bonuses.attack_bonus += (gachaPet.passiveBonus.value * 10);
            if (gachaPet.passiveBonus.type === 'defense') bonuses.defense_bonus += (gachaPet.passiveBonus.value * 10);
            if (gachaPet.passiveBonus.type === 'skill_xp') {
                if (gachaPet.passiveBonus.skillName === 'intelligence') bonuses.intelligence_bonus += 5;
                if (gachaPet.passiveBonus.skillName === 'strategy') bonuses.strategy_bonus += 5;
            }
        }
        
        const marketPet = ITEM_DATABASE[equipped.pet];
        if (marketPet && marketPet.stats) {
            if (marketPet.stats.attack) bonuses.attack_bonus += marketPet.stats.attack;
            if (marketPet.stats.defense) bonuses.defense_bonus += marketPet.stats.defense;
            if (marketPet.stats.magicAttack) bonuses.magic_attack_bonus += marketPet.stats.magicAttack;
            if (marketPet.stats.magicDefense) bonuses.magic_defense_bonus += marketPet.stats.magicDefense;
            if (marketPet.stats.maxMana) bonuses.max_mana_bonus += marketPet.stats.maxMana;
            // Note: bonusXp for skill is generally handled via getMarketplaceXpBonuses, but we capture the raw stats here.
        }
    }

    // Process Traits
    const ts = useTraitStore.getState();
    if (ts.hasTrait('iron_discipline')) bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.05) || 2;
    if (ts.hasTrait('steady_hands')) bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.05) || 2;
    if (ts.hasTrait('warriors_body')) bonuses.max_hp_bonus += 20;
    if (ts.hasTrait('rested_mind')) bonuses.xp_multiplier += 5;
    if (ts.hasTrait('scholars_mind')) bonuses.xp_multiplier += 5;
    if (ts.hasTrait('master_of_order')) {
        bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.02) || 1;
        bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.02) || 1;
        bonuses.max_hp_bonus += 10;
        bonuses.xp_multiplier += 2;
    }

    // Process Risk Map Region Bonuses
    const activeRiskRegions = useRiskStore.getState().getActiveRegionBonuses();
    if (activeRiskRegions.includes('verdant_plains')) bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.05) || 1; // +5% ATK
    if (activeRiskRegions.includes('ashlands')) bonuses.gold_multiplier += 10; // +10% Gold
    if (activeRiskRegions.includes('iron_highlands')) bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.10) || 1; // +10% DEF 
    if (activeRiskRegions.includes('frozen_north')) bonuses.xp_multiplier += 10; // +10% XP
    if (activeRiskRegions.includes('sunken_expanse')) bonuses.max_hp_bonus += 5; // +5 Max HP

    return bonuses;
};
