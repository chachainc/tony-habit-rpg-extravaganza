/**
 * useCombatFormulas.ts — Centralized Combat Formula Engine
 * 
 * Pure functions that read from existing stores to produce detailed
 * combat stat breakdowns. Not a Zustand store itself.
 */

import { useGameStore, type SkillName } from './useGameStore';
import { getPassiveBonuses } from './usePassiveEffects';
import { useSkillTrophyStore } from './useSkillTrophyStore';
import { useBookTrophyStore } from './useBookTrophyStore';
import { useRoomStore } from './useRoomStore';
import { useAuraStore, AURAS } from './useAuraStore';
import { useConsistencyStore } from './useConsistencyStore';

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
    'Strength': { skill: 'Strength', primaryStat: 'ATK', description: 'Pure attack power scaling', icon: '💪' },
    'Cardio': { skill: 'Cardio', primaryStat: 'SPD', description: 'Crit chance, speed, HP pool', icon: '🏃' },
    'Sleep': { skill: 'Sleep', primaryStat: 'DEF', description: 'Defense contributor, HP regen', icon: '😴' },
    'Intelligence': { skill: 'Intelligence', primaryStat: 'MATK', description: 'Magic ATK, XP multiplier', icon: '🧠' },
    'Flexibility': { skill: 'Flexibility', primaryStat: 'SPD', description: 'Dodge chance, speed, DEF contributor', icon: '🤸' },
    'Hygiene': { skill: 'Hygiene', primaryStat: 'DEF', description: 'Resistance, DEF contributor', icon: '🧼' },
    'Habit Building': { skill: 'Habit Building', primaryStat: 'DEF', description: 'DEF contributor, streak bonus', icon: '🔥' },
    'Luck': { skill: 'Luck', primaryStat: 'CRIT', description: 'Crit chance scaling', icon: '🍀' },
    'Clothing': { skill: 'Clothing', primaryStat: 'MISC', description: 'Social stat', icon: '👔' },
    'Housemaid': { skill: 'Housemaid', primaryStat: 'MP', description: 'Mana pool scaling', icon: '🧹' },
    'Work': { skill: 'Work', primaryStat: 'GOLD', description: 'Currency generation', icon: '💼' },
    'Health': { skill: 'Health', primaryStat: 'HP', description: 'Survivability', icon: '❤️' },
    'Social': { skill: 'Social', primaryStat: 'MISC', description: 'Social stat', icon: '🤝' },
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
    const { skills, defenseDecayAmount } = gameStore;

    const activeAura = AURAS.find(a => a.id === auraStore.activeAuraId);
    const weeklyProgress = consistencyStore.getWeeklyProgress();
    const hasBerserk = weeklyProgress.daysCompleted >= 3;
    const synergy = getSkillSynergyBonus();

    // ── ATK ──────────────────────────────
    const strengthLevel = skills['Strength'].level;
    const baseAtk = Math.floor(strengthLevel * 1.5) + 5;
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

    // ── DEF ──────────────────────────────
    const sleepLevel = skills['Sleep'].level;
    const hygieneLevel = skills['Hygiene'].level;
    const cardioLevel = skills['Cardio'].level;
    const flexLevel = skills['Flexibility'].level;
    const habitLevel = skills['Habit Building'].level;
    const avgDefenseSkills = (sleepLevel + hygieneLevel + cardioLevel + flexLevel + habitLevel) / 5;
    let baseDef = Math.floor(avgDefenseSkills * 1.2) + 3;

    const defSources: StatSource[] = [
        { label: `Skills avg (${Math.round(avgDefenseSkills)})`, value: baseDef },
    ];

    if (defenseDecayAmount > 0) {
        const decayPenalty = Math.floor(baseDef * defenseDecayAmount);
        baseDef = Math.floor(baseDef * (1 - defenseDecayAmount));
        defSources.push({ label: `Decay (-${Math.round(defenseDecayAmount * 100)}%)`, value: -decayPenalty });
    }

    if (gameStore.isDefenseSuppressed()) {
        const suppressPenalty = Math.floor(baseDef * 0.5);
        baseDef = Math.floor(baseDef * 0.5);
        defSources.push({ label: 'Suppressed (-50%)', value: -suppressPenalty });
    }

    const equipDef = passives.defense_bonus;
    const trophyDef = skillTrophyStore.getSleepDEFBonus();
    defSources.push({ label: 'Equipment', value: equipDef });
    defSources.push({ label: 'Trophies', value: trophyDef });

    let defSubtotal = Math.max(1, baseDef + equipDef + trophyDef);

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

    // ── MATK ─────────────────────────────
    const intLevel = skills['Intelligence'].level;
    const baseMatk = Math.floor(5 + intLevel * 2);
    const bookTrophyBonus = bookTrophyStore.getIntelligenceBonus();
    const matkSources: StatSource[] = [
        { label: `Intelligence Lv.${intLevel}`, value: baseMatk },
        { label: 'Book Trophies', value: bookTrophyBonus },
    ];

    // ── HP ───────────────────────────────
    const baseHp = Math.round(cardioLevel * 15 + 80);
    const roomHp = roomBonuses.maxHP;
    const trophyHp = skillTrophyStore.getSleepHPBonus();
    const equipHp = passives.max_hp_bonus;
    const hpSources: StatSource[] = [
        { label: `Cardio Lv.${cardioLevel}`, value: baseHp },
        { label: 'Room', value: roomHp },
        { label: 'Trophies', value: trophyHp },
        { label: 'Equipment', value: equipHp },
    ];

    // ── SPD ──────────────────────────────
    const baseSpd = Math.round(flexLevel * 2 + 50);
    const trophySpd = skillTrophyStore.getCardioSPDBonus();
    const spdSources: StatSource[] = [
        { label: `Flexibility Lv.${flexLevel}`, value: baseSpd },
        { label: 'Trophies', value: trophySpd },
    ];
    let spdSubtotal = baseSpd + trophySpd;
    if (roomBonuses.spdPercent > 0) {
        const roomSpdVal = Math.round(spdSubtotal * roomBonuses.spdPercent / 100);
        spdSources.push({ label: `Room (+${roomBonuses.spdPercent}%)`, value: roomSpdVal });
        spdSubtotal += roomSpdVal;
    }

    // ── CRIT ─────────────────────────────
    const baseCrit = 0.10;
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
    const housemaidLevel = skills['Housemaid'].level;
    const baseMp = Math.round(50 + housemaidLevel * 5);
    const bookMpBonus = bookTrophyStore.getMaxMPBonus();
    const mpSources: StatSource[] = [
        { label: `Housemaid Lv.${housemaidLevel}`, value: baseMp },
        { label: 'Book Trophies', value: bookMpBonus },
    ];

    // Filter out zero-value sources for cleaner display
    const filterSources = (sources: StatSource[]) =>
        sources.filter(s => s.value !== 0);

    return {
        atk: { total: Math.round(atkSubtotal), sources: filterSources(atkSources) },
        def: { total: Math.round(defSubtotal), sources: filterSources(defSources) },
        matk: { total: Math.round(baseMatk + bookTrophyBonus), sources: filterSources(matkSources) },
        hp: { total: Math.round(baseHp + roomHp + trophyHp + equipHp), sources: filterSources(hpSources) },
        spd: { total: Math.round(spdSubtotal), sources: filterSources(spdSources) },
        critChance: {
            total: Math.round((baseCrit + luckCrit + roomCrit + trophyCrit + (equipCritPct / 100) + auraCritBonus) * 100),
            sources: filterSources(critSources),
        },
        mp: { total: Math.round(baseMp + bookMpBonus), sources: filterSources(mpSources) },
        synergy,
    };
}
