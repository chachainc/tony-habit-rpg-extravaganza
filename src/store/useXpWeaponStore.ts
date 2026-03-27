// ─── XP WEAPONS STORE ──────────────────────────────────────────────────────
// Weapons purchased by spending skill totalXp — separate from gear-shop equipment.
// Each weapon has passive combat modifiers applied in battle.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillName } from './useGameStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface XpWeaponCost {
    skill: SkillName;
    xp: number;
}

export type WeaponTier = 'beginner' | 'medium' | 'hard' | 'elite' | 'mythic';

export interface XpWeaponDef {
    id: string;
    name: string;
    icon: string;
    tier: WeaponTier;
    costs: XpWeaponCost[];
    effect: string;          // Display label
    // Passive modifiers (applied in combat calculations)
    modifiers: {
        staminaRegenPct?: number;      // +% stamina regen
        poisonResistPct?: number;       // +% resistance to status
        dodgePct?: number;              // +% dodge
        atkPct?: number;                // +% basic attack damage
        spdPct?: number;                // +% attack speed
        arenaRewardPct?: number;        // +% arena reward
        bossDmgPct?: number;            // +% damage vs bosses
        doubleDropChance?: number;      // % chance double loot
        battleXpPct?: number;           // +% XP from battles
        maxHpPct?: number;              // +% max HP
        firstStrikeAvoidPct?: number;   // % avoid first attack
        dropRatePct?: number;           // +% resource drops
        critPct?: number;               // +% critical strike
        statusImmunityFirst?: boolean;  // Immune first status effect
        revivePetOnce?: boolean;        // Revive pet once per battle
        comboBonus?: boolean;           // Double arena rewards chance
        globalCombatEffPct?: number;    // +% total combat efficiency
        allBattleXpPct?: number;        // +% XP all battles (dup of battleXpPct but distinct)
        goldenAura?: boolean;           // Golden aura display
    };
}

// ── Weapon Catalog ──────────────────────────────────────────────────────────

export const XP_WEAPONS: XpWeaponDef[] = [
    // ══ BEGINNER TIER ══════════════════════════════════════════════════════
    {
        id: 'morningsteel_dagger', name: 'Morningsteel Dagger', icon: '🗡️', tier: 'beginner',
        costs: [{ skill: 'Sleep', xp: 250 }],
        effect: '+3% stamina regen at battle start',
        modifiers: { staminaRegenPct: 3 },
    },
    {
        id: 'clean_edge_knife', name: 'Clean Edge Knife', icon: '🔪', tier: 'beginner',
        costs: [{ skill: 'Hygiene', xp: 250 }],
        effect: '+5% resistance to poison/decay',
        modifiers: { poisonResistPct: 5 },
    },
    {
        id: 'stretchblade', name: 'Stretchblade', icon: '⚔️', tier: 'beginner',
        costs: [{ skill: 'Flexibility', xp: 300 }],
        effect: '+5% dodge chance',
        modifiers: { dodgePct: 5 },
    },
    {
        id: 'iron_grip_club', name: 'Iron Grip Club', icon: '🪃', tier: 'beginner',
        costs: [{ skill: 'Strength', xp: 300 }],
        effect: '+6% basic attack damage',
        modifiers: { atkPct: 6 },
    },
    {
        id: 'windrunner_knife', name: 'Windrunner Knife', icon: '🍃', tier: 'beginner',
        costs: [{ skill: 'Cardio', xp: 300 }],
        effect: '+5% attack speed',
        modifiers: { spdPct: 5 },
    },
    {
        id: 'tailored_rapier', name: 'Tailored Rapier', icon: '🤺', tier: 'beginner',
        costs: [{ skill: 'Hygiene', xp: 250 }],
        effect: '+3% arena reward bonus',
        modifiers: { arenaRewardPct: 3 },
    },
    {
        id: 'workman_hammer', name: 'Workman Hammer', icon: '🔨', tier: 'beginner',
        costs: [{ skill: 'Work', xp: 300 }],
        effect: '+7% damage vs bosses',
        modifiers: { bossDmgPct: 7 },
    },
    {
        id: 'lucky_coin_blade', name: 'Lucky Coin Blade', icon: '🪙', tier: 'beginner',
        costs: [{ skill: 'Luck', xp: 300 }],
        effect: '5% chance to trigger double loot',
        modifiers: { doubleDropChance: 5 },
    },
    {
        id: 'habit_forge_blade', name: 'Habit Forge Blade', icon: '🔗', tier: 'beginner',
        costs: [{ skill: 'Habit', xp: 350 }],
        effect: '+5% XP from battles',
        modifiers: { battleXpPct: 5 },
    },
    {
        id: 'heartguard_knife', name: 'Heartguard Knife', icon: '💚', tier: 'beginner',
        costs: [{ skill: 'Health', xp: 300 }],
        effect: '+6% maximum health',
        modifiers: { maxHpPct: 6 },
    },
    {
        id: 'mediators_dagger', name: "Mediator's Dagger", icon: '🕊️', tier: 'beginner',
        costs: [{ skill: 'Social', xp: 250 }],
        effect: '+5% chance to avoid first enemy attack',
        modifiers: { firstStrikeAvoidPct: 5 },
    },
    {
        id: 'caretaker_broomblade', name: 'Caretaker Broomblade', icon: '🧹', tier: 'beginner',
        costs: [{ skill: 'Sleep', xp: 300 }],
        effect: '+6% resource drops from battles',
        modifiers: { dropRatePct: 6 },
    },
    {
        id: 'toothbrush_weapon', name: 'Enchanted Toothbrush', icon: '🪥', tier: 'beginner',
        costs: [{ skill: 'Hygiene', xp: 1000 }],
        effect: '+10% resistance to poison/decay effects',
        modifiers: { poisonResistPct: 10 },
    },

    // ══ MEDIUM TIER ════════════════════════════════════════════════════════

    {
        id: 'runners_twin_daggers', name: "Runner's Twin Daggers", icon: '⚔️', tier: 'medium',
        costs: [{ skill: 'Cardio', xp: 600 }, { skill: 'Flexibility', xp: 400 }],
        effect: '+8% dodge and +5% attack speed',
        modifiers: { dodgePct: 8, spdPct: 5 },
    },
    {
        id: 'rested_titan_hammer', name: 'Rested Titan Hammer', icon: '🔨', tier: 'medium',
        costs: [{ skill: 'Sleep', xp: 700 }, { skill: 'Strength', xp: 500 }],
        effect: '+12% opening strike damage',
        modifiers: { atkPct: 12 },
    },
    {
        id: 'clean_discipline_halberd', name: 'Clean Discipline Halberd', icon: '🪓', tier: 'medium',
        costs: [{ skill: 'Hygiene', xp: 700 }, { skill: 'Habit', xp: 600 }],
        effect: '+10% resistance to status effects',
        modifiers: { poisonResistPct: 10 },
    },
    {
        id: 'scholars_duelist_blade', name: "Scholar's Duelist Blade", icon: '🤺', tier: 'medium',
        costs: [{ skill: 'Hygiene', xp: 600 }, { skill: 'Social', xp: 400 }],
        effect: '+8% arena reward bonus',
        modifiers: { arenaRewardPct: 8 },
    },
    {
        id: 'orderkeeper_axe', name: 'Orderkeeper Axe', icon: '🪓', tier: 'medium',
        costs: [{ skill: 'Work', xp: 700 }, { skill: 'Sleep', xp: 500 }],
        effect: '+10% boss damage',
        modifiers: { bossDmgPct: 10 },
    },
    {
        id: 'vitality_serpent_whip', name: 'Vitality Serpent Whip', icon: '🐍', tier: 'medium',
        costs: [{ skill: 'Flexibility', xp: 600 }, { skill: 'Health', xp: 600 }],
        effect: '+10% critical strike chance',
        modifiers: { critPct: 10 },
    },
    {
        id: 'fortune_spear', name: 'Fortune Spear', icon: '🔱', tier: 'medium',
        costs: [{ skill: 'Luck', xp: 700 }, { skill: 'Social', xp: 400 }],
        effect: '10% chance for bonus loot',
        modifiers: { doubleDropChance: 10 },
    },
    {
        id: 'iron_endurance_blade', name: 'Iron Endurance Blade', icon: '⚔️', tier: 'medium',
        costs: [{ skill: 'Strength', xp: 700 }, { skill: 'Cardio', xp: 600 }],
        effect: '+12% sustained damage',
        modifiers: { atkPct: 12, spdPct: 3 },
    },

    // ══ HARD TIER ══════════════════════════════════════════════════════════
    {
        id: 'champions_discipline_sword', name: "Champion's Discipline Sword", icon: '🗡️', tier: 'hard',
        costs: [{ skill: 'Strength', xp: 800 }, { skill: 'Habit', xp: 700 }, { skill: 'Work', xp: 600 }],
        effect: '+15% overall damage',
        modifiers: { atkPct: 15 },
    },
    {
        id: 'balanced_hunter_spear', name: 'Balanced Hunter Spear', icon: '🔱', tier: 'hard',
        costs: [{ skill: 'Cardio', xp: 700 }, { skill: 'Flexibility', xp: 700 }, { skill: 'Health', xp: 700 }],
        effect: '+15% dodge and stamina',
        modifiers: { dodgePct: 15, staminaRegenPct: 8 },
    },
    {
        id: 'clean_mind_glaive', name: 'Clean Mind Glaive', icon: '🌙', tier: 'hard',
        costs: [{ skill: 'Hygiene', xp: 800 }, { skill: 'Sleep', xp: 800 }, { skill: 'Habit', xp: 700 }],
        effect: 'Immunity to the first status effect each battle',
        modifiers: { statusImmunityFirst: true },
    },
    {
        id: 'silver_envoy_rapier', name: 'Silver Envoy Rapier', icon: '🤺', tier: 'hard',
        costs: [{ skill: 'Social', xp: 700 }, { skill: 'Hygiene', xp: 700 }, { skill: 'Luck', xp: 700 }],
        effect: '+15% chance for bonus rewards',
        modifiers: { arenaRewardPct: 15, doubleDropChance: 5 },
    },

    // ══ ELITE TIER ═════════════════════════════════════════════════════════
    {
        id: 'titanbreaker_greatsword', name: 'Titanbreaker Greatsword', icon: '⚔️', tier: 'elite',
        costs: [{ skill: 'Strength', xp: 1200 }, { skill: 'Cardio', xp: 900 }, { skill: 'Habit', xp: 900 }],
        effect: '+20% boss damage',
        modifiers: { bossDmgPct: 20, atkPct: 10 },
    },
    {
        id: 'fortune_emperor_blade', name: 'Fortune Emperor Blade', icon: '👑', tier: 'elite',
        costs: [{ skill: 'Luck', xp: 1300 }, { skill: 'Social', xp: 900 }, { skill: 'Work', xp: 900 }],
        effect: 'Chance to double arena rewards',
        modifiers: { comboBonus: true, arenaRewardPct: 12, doubleDropChance: 15 },
    },
    {
        id: 'soulkeeper_hammer', name: 'Soulkeeper Hammer', icon: '🔮', tier: 'elite',
        costs: [{ skill: 'Health', xp: 1200 }, { skill: 'Sleep', xp: 1000 }, { skill: 'Hygiene', xp: 900 }],
        effect: 'Revive pet once per battle at 20% HP',
        modifiers: { revivePetOnce: true, maxHpPct: 10 },
    },

    // ══ MYTHIC TIER ════════════════════════════════════════════════════════
    {
        id: 'master_of_balance_relic', name: 'Master of Balance Relic Blade', icon: '🌌', tier: 'mythic',
        costs: [
            { skill: 'Sleep', xp: 900 },
            { skill: 'Hygiene', xp: 800 },
            { skill: 'Flexibility', xp: 800 },
            { skill: 'Strength', xp: 900 },
            { skill: 'Cardio', xp: 900 },
            { skill: 'Hygiene', xp: 600 },
            { skill: 'Sleep', xp: 700 },
            { skill: 'Work', xp: 900 },
            { skill: 'Health', xp: 900 },
            { skill: 'Social', xp: 700 },
            { skill: 'Luck', xp: 800 },
            { skill: 'Habit', xp: 1000 },
        ],
        effect: '+25% combat efficiency · +10% XP from battles · Golden arena aura',
        modifiers: { globalCombatEffPct: 25, allBattleXpPct: 10, goldenAura: true },
    },
];

export const XP_WEAPON_MAP: Record<string, XpWeaponDef> = Object.fromEntries(
    XP_WEAPONS.map(w => [w.id, w])
);

export const TIER_ORDER: WeaponTier[] = ['beginner', 'medium', 'hard', 'elite', 'mythic'];

export const TIER_LABELS: Record<WeaponTier, string> = {
    beginner: '⚔️ Beginner',
    medium: '🔥 Medium',
    hard: '💀 Hard',
    elite: '👑 Elite',
    mythic: '🌌 Mythic',
};

export const TIER_COLORS: Record<WeaponTier, string> = {
    beginner: '#9ca3af',
    medium: '#3b82f6',
    hard: '#a855f7',
    elite: '#f59e0b',
    mythic: '#f43f5e',
};

// ── Store ───────────────────────────────────────────────────────────────────

interface XpWeaponState {
    equippedWeaponId: string | null;
    unlockedWeaponIds: string[];

    // Purchase: spends skill totalXp
    purchaseWeapon: (weaponId: string) => { success: boolean; reason?: string };

    // Equip / unequip
    equipWeapon: (weaponId: string | null) => void;

    // Getters
    getEquippedWeapon: () => XpWeaponDef | null;
    ownsWeapon: (weaponId: string) => boolean;
    canAfford: (weaponId: string) => boolean;
    getModifiers: () => XpWeaponDef['modifiers'];
}

export const useXpWeaponStore = create<XpWeaponState>()(
    persist(
        (set, get) => ({
            equippedWeaponId: null,
            unlockedWeaponIds: [],

            purchaseWeapon: (weaponId) => {
                const def = XP_WEAPON_MAP[weaponId];
                if (!def) return { success: false, reason: 'Unknown weapon' };

                if (get().unlockedWeaponIds.includes(weaponId)) {
                    return { success: false, reason: 'Already owned' };
                }

                // Lazy import to avoid circular dep — cached on globalThis
                let useGameStore = (globalThis as any).__useGameStoreRef;
                if (!useGameStore) {
                    // Not yet cached — trigger async load for next call
                    import('./useGameStore').then(m => { (globalThis as any).__useGameStoreRef = m.useGameStore; });
                    return { success: false, reason: 'Game store loading, please try again' };
                }
                const gameState = useGameStore.getState();

                // Check all cost requirements (against totalXp)
                for (const cost of def.costs) {
                    const skill = gameState.skills[cost.skill];
                    if (!skill || skill.totalXp < cost.xp) {
                        return {
                            success: false,
                            reason: `Need ${cost.xp} total ${cost.skill} XP (have ${skill?.totalXp ?? 0})`,
                        };
                    }
                }

                // Deduct totalXp from each skill (adjust xp within current level and totalXp)
                for (const cost of def.costs) {
                    const skills = useGameStore.getState().skills;
                    const skill = skills[cost.skill];
                    const newTotalXp = Math.max(0, skill.totalXp - cost.xp);
                    const newXp = Math.max(0, skill.xp - cost.xp); // Best effort deduct from current xp
                    useGameStore.setState((s: ReturnType<typeof useGameStore.getState>) => ({
                        skills: {
                            ...s.skills,
                            [cost.skill]: {
                                ...s.skills[cost.skill],
                                totalXp: newTotalXp,
                                xp: Math.max(0, newXp),
                            },
                        },
                    }));
                }

                set(s => ({ unlockedWeaponIds: [...s.unlockedWeaponIds, weaponId] }));
                return { success: true };
            },

            equipWeapon: (weaponId) => {
                set({ equippedWeaponId: weaponId });
            },

            getEquippedWeapon: () => {
                const id = get().equippedWeaponId;
                return id ? XP_WEAPON_MAP[id] ?? null : null;
            },

            ownsWeapon: (weaponId) => get().unlockedWeaponIds.includes(weaponId),

            canAfford: (weaponId) => {
                const def = XP_WEAPON_MAP[weaponId];
                if (!def) return false;
                const useGameStore = (globalThis as any).__useGameStoreRef;
                if (!useGameStore) {
                    import('./useGameStore').then(m => { (globalThis as any).__useGameStoreRef = m.useGameStore; });
                    return false;
                }
                const skills = useGameStore.getState().skills;
                return def.costs.every((c: XpWeaponCost) => (skills[c.skill]?.totalXp ?? 0) >= c.xp);
            },

            getModifiers: () => {
                const equipped = get().getEquippedWeapon();
                return equipped?.modifiers ?? {};
            },
        }),
        { name: PERSIST_REGISTRY.xpWeapons.persistKey }
    )
);
// Eagerly cache useGameStore on globalThis for sync access in purchaseWeapon/canAfford
import('./useGameStore').then(m => { (globalThis as any).__useGameStoreRef = m.useGameStore; }).catch(() => {});
