import { useInventoryStore, getItemById, type ItemStatBonuses } from './useInventoryStore';
import { PET_DATABASE } from '../data/pets';
import { usePetStore } from './usePetStore';
import { useRiskStore } from './useRiskStore';
import { useTraitStore } from './useTraitStore';
import { useAuraStore } from './useAuraStore';
import { useTitleStore } from './useTitleStore';

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

    // Process all gear slots (weapon, armor, relic, artifact, book, jewelry)
    const processGear = (itemId: string | null) => {
        if (!itemId) return;
        const item = getItemById(itemId);
        if (!item) return;

        // Prefer structured statBonuses when available (LEGACY)
        if (item.statBonuses) {
            applyStatBonuses(bonuses, item.statBonuses);
        } else if (item.stats) {
            // New structured ITEM_DATABASE format support
            if (item.stats.attack) bonuses.attack_bonus += item.stats.attack;
            if (item.stats.defense) bonuses.defense_bonus += item.stats.defense;
            if (item.stats.hp) bonuses.max_hp_bonus += item.stats.hp;
            if (item.stats.magicAttack) bonuses.magic_attack_bonus += item.stats.magicAttack;
            if (item.stats.magicDefense) bonuses.magic_defense_bonus += item.stats.magicDefense;
            if (item.stats.maxMana) bonuses.max_mana_bonus += item.stats.maxMana;
        } else {
            // Ultra-legacy fallback: use raw value field
            if (item.type === 'weapon') bonuses.attack_bonus += item.value || 0;
            if (item.type === 'armor') bonuses.defense_bonus += item.value || 0;
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

    // ── Process Pet (via PET_DATABASE — usePetStore is the single source of truth) ──
    // We read from usePetStore.equippedPetId, NOT useInventoryStore.equipped.pet
    const equippedPetId = usePetStore.getState().equippedPetId;
    if (equippedPetId) {
        const petDef = PET_DATABASE[equippedPetId];
        if (petDef?.passive?.effectType === 'bonus_gold') {
            bonuses.gold_bonus += petDef.passive.value ?? 0;
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
    // Map 1 regions
    if (activeRiskRegions.includes('verdant_plains')) bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.05) || 1; // +5% ATK
    if (activeRiskRegions.includes('ashlands')) bonuses.gold_multiplier += 10; // +10% Gold
    if (activeRiskRegions.includes('iron_highlands')) bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.10) || 1; // +10% DEF 
    if (activeRiskRegions.includes('frozen_north')) bonuses.xp_multiplier += 10; // +10% XP
    if (activeRiskRegions.includes('sunken_expanse')) bonuses.max_hp_bonus += 5; // +5 Max HP
    // Map 2 regions (stronger)
    if (activeRiskRegions.includes('obsidian_peaks')) bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * 0.15) || 2; // +15% ATK
    if (activeRiskRegions.includes('dead_marshes')) bonuses.gold_multiplier += 15; // +15% Gold
    if (activeRiskRegions.includes('ember_wastes')) bonuses.max_hp_bonus += 10; // +10 Max HP
    if (activeRiskRegions.includes('shadow_rift')) bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * 0.20) || 2; // +20% DEF
    if (activeRiskRegions.includes('cursed_tundra')) bonuses.xp_multiplier += 15; // +15% XP

    // Process Aura
    const activeAura = useAuraStore.getState().getActiveAura();
    if (activeAura?.bonus) {
        const { type, value } = activeAura.bonus;
        if (type === 'atk') bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * value) || (value >= 1 ? value : 1);
        if (type === 'def') bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * value) || (value >= 1 ? value : 1);
        if (type === 'hp') bonuses.max_hp_bonus += value;
        if (type === 'xp') bonuses.xp_multiplier += value * 100;
        if (type === 'gold') bonuses.gold_multiplier += value * 100;
        if (type === 'crit') bonuses.crit_bonus += value * 100;
        if (type === 'speed') bonuses.strategy_bonus += value * 100; // proxy speed
    }

    // Process Title
    const titleDefs = useTitleStore.getState().getUnlockedTitleDefs();
    const activeTitleId = useTitleStore.getState().activeTitle;
    const activeTitle = titleDefs.find(t => t.id === activeTitleId);
    if (activeTitle?.bonus) {
        const { type, value } = activeTitle.bonus;
        if (type === 'atk') bonuses.attack_bonus += Math.floor(bonuses.attack_bonus * value) || (value >= 1 ? value : 1);
        if (type === 'def') bonuses.defense_bonus += Math.floor(bonuses.defense_bonus * value) || (value >= 1 ? value : 1);
        if (type === 'hp') bonuses.max_hp_bonus += value;
        if (type === 'xp') bonuses.xp_multiplier += value * 100;
        if (type === 'gold') bonuses.gold_multiplier += value * 100;
        if (type === 'crit') bonuses.crit_bonus += value * 100;
        if (type === 'speed') bonuses.strategy_bonus += value * 100; // proxy speed
    }

    return bonuses;
};
