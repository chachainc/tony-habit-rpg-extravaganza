import { useInventoryStore, ITEM_DB } from './useInventoryStore';
import { PET_DB } from './useGachaStore';

export interface PassiveBonuses {
    attack_bonus: number;
    defense_bonus: number;
    max_hp_bonus: number;
    crit_bonus: number;
    gold_bonus: number;
    sigil_bonus: number;
    intelligence_bonus: number;
    strategy_bonus: number;
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
    };

    const equipped = useInventoryStore.getState().equipped;

    // Process Gear (weapons, armor, relics, artifacts)
    const processGear = (itemId: string | null) => {
        if (!itemId) return;
        const item = ITEM_DB[itemId];
        if (!item) return;

        // Base numeric values
        if (item.type === 'weapon') bonuses.attack_bonus += item.value;
        if (item.type === 'armor') bonuses.defense_bonus += item.value;
        if (item.critChance) bonuses.crit_bonus += Math.floor(item.critChance * 100);

        // String effects
        if (item.effect) parseEffectString(item.effect, bonuses);
    };

    processGear(equipped.weapon);
    processGear(equipped.armor);
    processGear(equipped.relic);
    processGear(equipped.artifact);

    // Process Pet
    if (equipped.pet) {
        const pet = PET_DB[equipped.pet];
        if (pet) {
            // Check pet passives
            if (pet.passiveBonus.type === 'attack') bonuses.attack_bonus += (pet.passiveBonus.value * 10); // Simplified scaling
            if (pet.passiveBonus.type === 'defense') bonuses.defense_bonus += (pet.passiveBonus.value * 10);
            if (pet.passiveBonus.type === 'gold_gain') bonuses.gold_bonus += (pet.passiveBonus.value * 100);
            if (pet.passiveBonus.type === 'skill_xp') {
                if (pet.passiveBonus.skillName === 'intelligence') bonuses.intelligence_bonus += 5;
                if (pet.passiveBonus.skillName === 'strategy') bonuses.strategy_bonus += 5;
            }

            // Allow string parsing from description or future effect strings if added spreadsheet side
            // For now, spreadsheets inject 'effectType'/'effectValue' into passiveBonus during ingest
        }
    }

    return bonuses;
};
