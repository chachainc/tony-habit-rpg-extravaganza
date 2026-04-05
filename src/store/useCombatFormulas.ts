/**
 * useCombatFormulas.ts — Centralized Combat Formula Engine
 * 
 * Pure functions that read from existing stores to produce detailed
 * combat stat breakdowns. Not a Zustand store itself.
 */

import { AURAS, useAuraStore } from './useAuraStore';
import { useBookTrophyStore } from './useBookTrophyStore';
import { useConsistencyStore } from './useConsistencyStore';
import { useGameStore, type SkillName } from './useGameStore';
import { getPassiveBonuses } from './usePassiveEffects';
import { useRoomStore } from './useRoomStore';
import { useSkillTrophyStore } from './useSkillTrophyStore';
import { useRiskStore } from './useRiskStore';
import { useBudgetStore } from './useBudgetStore';

// ═══════════════════════════════════════════
// SKILL IDENTITY ROLES
// ═══════════════════════════════════════════

export interface SkillCombatRole {
    skill: SkillName;
    primaryStat: string;
    description: string;
    icon: string;
}

export const SKILL_COMBAT_ROLES: Record<SkillName, SkillCombatRole> = {
    'Strength': { skill: 'Strength', primaryStat: 'ATK', description: 'Physical attack damage (ATK = 1 + level)', icon: '💪' },
    'Health': { skill: 'Health', primaryStat: 'HP', description: 'Max health (50 base HP, +5 per level after Lv1)', icon: '❤️' },
    'Hygiene': { skill: 'Hygiene', primaryStat: 'DEF', description: 'Physical defense (DEF = 1 + level)', icon: '🧼' },
    'Cardio': { skill: 'Cardio', primaryStat: 'SPD & ULT', description: 'Improves agility and slightly increases Ultimate energy gain during combat.', icon: '🏃' },
    'Sleep': { skill: 'Sleep', primaryStat: 'MP', description: 'Mana pool (20 base MP, +5 per level after Lv1)', icon: '😴' },
    'Intelligence': { skill: 'Intelligence', primaryStat: 'MATK', description: 'Magic attack (MAG = 1 + level)', icon: '🧠' },
    'Social': { skill: 'Social', primaryStat: 'MDEF', description: 'Magic defense (MDEF = 1 + level)', icon: '🤝' },
    'Habit': { skill: 'Habit', primaryStat: 'CRIT', description: 'Crit chance (Crit = level%)', icon: '🔥' },
    'Work': { skill: 'Work', primaryStat: 'ECON', description: 'Shop discount (Discount = level%)', icon: '💼' },
    'Housemaid': { skill: 'Housemaid', primaryStat: 'HP/GOLD', description: 'Chores and upkeep. Gives +1% Gold per level and unlocks Room upgrades. Pairs with Work for an Economic Build.', icon: '🧹' },
    'Flexibility': { skill: 'Flexibility', primaryStat: 'TIER', description: 'Spell cooldown reduction (Cooldown reduction = level%)', icon: '🤸' },
    'Luck': { skill: 'Luck', primaryStat: 'DROP', description: 'Rare reward probability (Drops = level%)', icon: '🍀' },
};

// ═══════════════════════════════════════════
// MILESTONE TIERS
// ═══════════════════════════════════════════

export interface MilestoneTier {
    level: number;
    name: string;
    reward: string;
    goldReward: number;
    ticketReward: number;
}

export const SKILL_MILESTONES: MilestoneTier[] = [
    { level: 5, name: 'Apprentice', reward: '+1 stat point', goldReward: 50, ticketReward: 1 },
    { level: 10, name: 'Journeyman', reward: '+2 stat points', goldReward: 150, ticketReward: 2 },
    { level: 15, name: 'Adept', reward: '+3 stat points', goldReward: 300, ticketReward: 3 },
    { level: 20, name: 'Expert', reward: '+5 stat points', goldReward: 500, ticketReward: 5 },
    { level: 25, name: 'Master', reward: 'Combat passive', goldReward: 1000, ticketReward: 10 },
];

export interface MilestoneInfo {
    currentTier: MilestoneTier | null;
    nextTier: MilestoneTier | null;
    progressToNext: number;  // 0..1
    levelsToNext: number;
}

export function getMilestoneForSkill(_skillName: SkillName, level: number): MilestoneInfo {
    let currentTier: MilestoneTier | null = null;
    let nextTier: MilestoneTier | null = null;

    for (const tier of SKILL_MILESTONES) {
        if (level >= tier.level) {
            currentTier = tier;
        } else if (!nextTier) {
            nextTier = tier;
        }
    }

    const prevLevel = currentTier ? currentTier.level : 0;
    const nextLevel = nextTier ? nextTier.level : (currentTier ? currentTier.level + 25 : 25);
    const progressToNext = nextTier
        ? Math.min(1, (level - prevLevel) / (nextLevel - prevLevel))
        : 1;
    const levelsToNext = nextTier ? nextTier.level - level : 0;

    return { currentTier, nextTier, progressToNext, levelsToNext };
}

// ═══════════════════════════════════════════
// SYNERGY SYSTEM
// ═══════════════════════════════════════════

export interface SynergyInfo {
    active: boolean;
    bonusMultiplier: number;
    cardioLevel: number;
    strengthLevel: number;
    levelDiff: number;
    description: string;
}

export function getSkillSynergyBonus(): SynergyInfo {
    const { skills } = useGameStore.getState();
    const cardioLevel = skills['Cardio'].level;
    const strengthLevel = skills['Strength'].level;
    const levelDiff = Math.abs(cardioLevel - strengthLevel);
    const active = levelDiff <= 3;

    return {
        active,
        bonusMultiplier: active ? 1.05 : 1.0,
        cardioLevel,
        strengthLevel,
        levelDiff,
        description: active
            ? `Body & Strength Synergy: Cardio Lv.${cardioLevel} ↔ Strength Lv.${strengthLevel} (+5% ATK)`
            : `Synergy inactive (gap: ${levelDiff} levels, need ≤3)`,
    };
}

// ═══════════════════════════════════════════
// DETAILED COMBAT BREAKDOWN
// ═══════════════════════════════════════════

export interface StatSource {
    label: string;
    value: number;
}

export interface StatBreakdown {
    total: number;
    sources: StatSource[];
}

export interface CombatBreakdown {
    atk: StatBreakdown;
    def: StatBreakdown;
    matk: StatBreakdown;
    hp: StatBreakdown;
    spd: StatBreakdown;
    critChance: StatBreakdown;
    mp: StatBreakdown;
    synergy: SynergyInfo;
}

export function getDetailedCombatBreakdown(): CombatBreakdown {
    const gameStore = useGameStore.getState();
    const passives = getPassiveBonuses();
    const skillTrophyStore = useSkillTrophyStore.getState();
    const bookTrophyStore = useBookTrophyStore.getState();
    const roomBonuses = useRoomStore.getState().getRoomCombatBonuses();
    const auraStore = useAuraStore.getState();
    const consistencyStore = useConsistencyStore.getState();
    const activeRiskRegions = useRiskStore.getState().getActiveRegionBonuses();
    const { skills } = gameStore;

    const activeAura = AURAS.find(a => a.id === auraStore.activeAuraId);
    const weeklyProgress = consistencyStore.getWeeklyProgress();
    const hasBerserk = weeklyProgress.daysCompleted >= 3;
    const synergy = getSkillSynergyBonus();
    const budgetPower = useBudgetStore.getState().getPowerMultiplier();

    // ── ATK ──────────────────────────────
    const strengthLevel = skills['Strength']?.level ?? 1;
    const baseAtk = 1 + strengthLevel;
    const equipAtk = passives.attack_bonus;
    const trophyAtk = skillTrophyStore.getStrengthATKBonus();
    const roomAtkPercent = roomBonuses.atkPercent;
    const auraAtkBonus = activeAura?.bonus?.type === 'atk' ? activeAura.bonus.value : 0;

    const atkSources: StatSource[] = [
        { label: `Strength Lv.${strengthLevel}`, value: baseAtk },
        { label: 'Equipment', value: equipAtk },
        { label: 'Trophies', value: trophyAtk },
    ];

    let atkSubtotal = baseAtk + equipAtk + trophyAtk;

    if (activeRiskRegions.includes('verdant_plains')) {
        const riskAtkVal = Math.round(atkSubtotal * 0.05);
        atkSources.push({ label: 'Risk Verdant Plains (+5%)', value: riskAtkVal });
        atkSubtotal += riskAtkVal;
    }
    if (activeRiskRegions.includes('obsidian_peaks')) {
        const riskAtkVal2 = Math.round(atkSubtotal * 0.15);
        atkSources.push({ label: 'Risk Obsidian Peaks (+15%)', value: riskAtkVal2 });
        atkSubtotal += riskAtkVal2;
    }

    if (roomAtkPercent > 0) {
        const roomAtkVal = Math.round(atkSubtotal * roomAtkPercent / 100);
        atkSources.push({ label: `Room (+${roomAtkPercent}%)`, value: roomAtkVal });
        atkSubtotal += roomAtkVal;
    }

    if (auraAtkBonus > 0) {
        const auraVal = Math.round(atkSubtotal * auraAtkBonus);
        atkSources.push({ label: `Aura (+${Math.round(auraAtkBonus * 100)}%)`, value: auraVal });
        atkSubtotal += auraVal;
    }

    if (synergy.active) {
        const synergyVal = Math.round(atkSubtotal * 0.05);
        atkSources.push({ label: 'Synergy (+5%)', value: synergyVal });
        atkSubtotal += synergyVal;
    }

    if (hasBerserk) {
        const berserkVal = Math.round(atkSubtotal * 0.25);
        atkSources.push({ label: 'Berserk (+25%)', value: berserkVal });
        atkSubtotal += berserkVal;
    }

    if (budgetPower !== 1.0) {
        // Multiplier acts on the total calculated so far
        const newTotal = Math.round(atkSubtotal * budgetPower);
        const diff = newTotal - atkSubtotal;
        atkSources.push({ label: `Budget Power (x${budgetPower.toFixed(2)})`, value: diff });
        atkSubtotal = newTotal;
    }

    // ── DEF ──────────────────────────────
    const hygieneLevel = skills['Hygiene']?.level ?? 1;
    const defSources: StatSource[] = [
        { label: `Hygiene Mitigation (%)`, value: hygieneLevel },
    ];

    const equipDef = passives.defense_bonus;
    const trophyDef = skillTrophyStore.getSleepDEFBonus();
    defSources.push({ label: 'Equipment Flat DEF', value: equipDef });
    defSources.push({ label: 'Trophies Flat DEF', value: trophyDef });

    let defSubtotal = Math.max(1, (1 + hygieneLevel) + equipDef + trophyDef);

    if (activeRiskRegions.includes('iron_highlands')) {
        const riskDefVal = Math.round(defSubtotal * 0.10);
        defSources.push({ label: 'Risk Iron Highlands (+10%)', value: riskDefVal });
        defSubtotal += riskDefVal;
    }
    if (activeRiskRegions.includes('shadow_rift')) {
        const riskDefVal2 = Math.round(defSubtotal * 0.20);
        defSources.push({ label: 'Risk Shadow Rift (+20%)', value: riskDefVal2 });
        defSubtotal += riskDefVal2;
    }

    if (roomBonuses.defPercent > 0) {
        const roomDefVal = Math.round(defSubtotal * roomBonuses.defPercent / 100);
        defSources.push({ label: `Room (+${roomBonuses.defPercent}%)`, value: roomDefVal });
        defSubtotal += roomDefVal;
    }

    const auraDefBonus = activeAura?.bonus?.type === 'def' ? activeAura.bonus.value : 0;
    if (auraDefBonus > 0) {
        const auraVal = Math.round(defSubtotal * auraDefBonus);
        defSources.push({ label: `Aura (+${Math.round(auraDefBonus * 100)}%)`, value: auraVal });
        defSubtotal += auraVal;
    }

    if (budgetPower !== 1.0) {
        const newTotal = Math.round(defSubtotal * budgetPower);
        const diff = newTotal - defSubtotal;
        defSources.push({ label: `Budget Power (x${budgetPower.toFixed(2)})`, value: diff });
        defSubtotal = newTotal;
    }

    // ── MATK ─────────────────────────────
    const intLevel = skills['Intelligence']?.level ?? 1;
    let baseMatk = 1 + intLevel;
    const bookTrophyBonus = bookTrophyStore.getIntelligenceBonus();
    const matkSources: StatSource[] = [
        { label: `Int Lv.${intLevel} Base`, value: baseMatk },
        { label: 'Book Trophies', value: bookTrophyBonus },
    ];

    let matkSubtotal = baseMatk + bookTrophyBonus;

    if (budgetPower !== 1.0) {
        const newTotal = Math.round(matkSubtotal * budgetPower);
        const diff = newTotal - matkSubtotal;
        matkSources.push({ label: `Budget Power (x${budgetPower.toFixed(2)})`, value: diff });
        matkSubtotal = newTotal;
    }

    // ── HP ───────────────────────────────
    const healthLevel = skills['Health']?.level ?? 1;
    const baseHp = 50 + ((healthLevel - 1) * 5);
    const roomHp = roomBonuses.maxHP;
    const trophyHp = skillTrophyStore.getSleepHPBonus();
    const equipHp = passives.max_hp_bonus;
    const hpSources: StatSource[] = [
        { label: `Health Lv.${healthLevel} Base`, value: baseHp },
    ];

    let totalHp = baseHp;

    // Housemaid Level 10: "Better Bed" room upgrade grants +5 max HP
    const housemaidLevel = skills['Housemaid']?.level ?? 1;
    if (housemaidLevel >= 10) {
        hpSources.push({ label: 'Housemaid Lv.10 (Better Bed)', value: 5 });
        totalHp += 5;
    }

    hpSources.push(
        { label: 'Room', value: roomHp },
        { label: 'Trophies', value: trophyHp },
        { label: 'Equipment', value: equipHp },
    );
    totalHp += roomHp + trophyHp + equipHp;

    if (activeRiskRegions.includes('sunken_expanse')) {
        hpSources.push({ label: 'Risk Sunken Expanse', value: 5 });
        totalHp += 5;
    }
    if (activeRiskRegions.includes('ember_wastes')) {
        hpSources.push({ label: 'Risk Ember Wastes', value: 10 });
        totalHp += 10;
    }

    // ── SPD ──────────────────────────────
    const cardioLevel = skills['Cardio']?.level ?? 1;
    const baseSpd = cardioLevel;
    const trophySpd = skillTrophyStore.getCardioSPDBonus();
    const spdSources: StatSource[] = [
        { label: `Cardio Speed`, value: baseSpd },
        { label: 'Trophies', value: trophySpd },
    ];
    let spdSubtotal = baseSpd + trophySpd;
    if (roomBonuses.spdPercent > 0) {
        const roomSpdVal = Math.round(spdSubtotal * roomBonuses.spdPercent / 100);
        spdSources.push({ label: `Room (+${roomBonuses.spdPercent}%)`, value: roomSpdVal });
        spdSubtotal += roomSpdVal;
    }

    // ── CRIT ─────────────────────────────
    const habitLevel = skills['Habit']?.level ?? 1;
    const baseCrit = habitLevel / 100;
    const luckCrit = (skills['Luck']?.level || 1) * 0.01;
    const roomCrit = roomBonuses.critPercent / 100;
    const trophyCrit = skillTrophyStore.getLuckCritBonus();
    const equipCritPct = passives.crit_bonus;
    const auraCritBonus = activeAura?.bonus?.type === 'crit' ? activeAura.bonus.value : 0;
    const critSources: StatSource[] = [
        { label: 'Base', value: Math.round(baseCrit * 100) },
        { label: `Luck Lv.${skills['Luck']?.level || 1}`, value: Math.round(luckCrit * 100) },
        { label: 'Room', value: Math.round(roomCrit * 100) },
        { label: 'Trophies', value: Math.round(trophyCrit * 100) },
        { label: 'Equipment', value: equipCritPct },
    ];
    if (auraCritBonus > 0) {
        critSources.push({ label: 'Aura', value: Math.round(auraCritBonus * 100) });
    }

    // ── MP ───────────────────────────────
    const sleepManaLevel = skills['Sleep']?.level ?? 1;
    const baseMp = 20 + ((sleepManaLevel - 1) * 5);
    const bookMpBonus = bookTrophyStore.getMaxMPBonus();
    const mpSources: StatSource[] = [
        { label: `Sleep Lv.${sleepManaLevel}`, value: baseMp },
        { label: 'Book Trophies', value: bookMpBonus },
    ];

    // Filter out zero-value sources for cleaner display
    const filterSources = (sources: StatSource[]) =>
        sources.filter(s => s.value !== 0);

    return {
        atk: { total: Math.round(atkSubtotal), sources: filterSources(atkSources) },
        def: { total: Math.round(defSubtotal), sources: filterSources(defSources) },
        matk: { total: Math.round(matkSubtotal), sources: filterSources(matkSources) },
        hp: { total: Math.round(totalHp), sources: filterSources(hpSources) },
        spd: { total: Math.round(spdSubtotal), sources: filterSources(spdSources) },
        critChance: {
            total: Math.round((baseCrit + luckCrit + roomCrit + trophyCrit + (equipCritPct / 100) + auraCritBonus) * 100),
            sources: filterSources(critSources),
        },
        mp: { total: Math.round(baseMp + bookMpBonus), sources: filterSources(mpSources) },
        synergy,
    };
}
