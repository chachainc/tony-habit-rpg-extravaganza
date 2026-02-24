import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEquipmentStore } from './useEquipmentStore';
import { useBookTrophyStore } from './useBookTrophyStore';
import { useSkillTrophyStore } from './useSkillTrophyStore';

export type SkillName =
    | 'Sleep'
    | 'Hygiene'
    | 'Flexibility'
    | 'Strength'
    | 'Cardio'
    | 'Clothing'
    | 'Housemaid'
    | 'Work'
    | 'Health'
    | 'Social'
    | 'Luck'
    | 'Habit Building'
    | 'Intelligence';

interface Skill {
    level: number;
    xp: number;
    totalXp: number;
}

interface GameState {
    currency: number;
    gems: number;
    skills: Record<SkillName, Skill>;
    globalXp: number;
    overflowXp: number;
    dailyXpGained: Record<SkillName, number>;
    lastXpResetDate: string | null;
    lastDefenseDecayDate: string | null;
    defenseDecayAmount: number; // Accumulated decay percentage
    pendingLevelUp: { skill: SkillName; newLevel: number; milestone?: any } | null; // For level-up modal
    cumulativeLogs: Record<SkillName, number>; // Cumulative times logged (for pet evolution)

    // Actions
    addCurrency: (amount: number) => void;
    addGems: (amount: number) => void;
    addSkillXp: (skill: SkillName, amount: number) => { actual: number; overflow: number; leveledUp?: boolean };
    addGlobalXp: (amount: number) => void;
    getGlobalLevel: () => number;
    clearLevelUp: () => void; // Clear pending level-up

    // Derived stats
    getAttack: () => number;
    getDefense: () => number;
    getMagicAttack: () => number;
    getMaxMP: () => number;
    isDefenseSuppressed: () => boolean;
    applyDefenseDecay: () => void;

    // XP utilities
    getXpForLevel: (level: number) => number;
    getXpProgress: (skillName: SkillName) => { current: number; required: number; percentage: number };
    resetDailyXp: () => void;
    getDailyXpEarned: (skillName: SkillName) => number;
    getCumulativeLogs: (skillName: SkillName) => number;

    // Phase 8: Progression Systems
    dailyQuestSkill: SkillName | null; // Skill with 2x XP today
    consecutiveDays: Record<SkillName, number>; // Track streaks for fatigue
    lastLogDate: Record<SkillName, string>; // Track last log date per skill for fatigue
    getFatiguePenalty: (skillName: SkillName) => number; // Returns multiplier (e.g. 0.95)
}

export const INITIAL_SKILLS: Record<SkillName, Skill> = {
    'Sleep': { level: 1, xp: 0, totalXp: 0 },
    'Hygiene': { level: 1, xp: 0, totalXp: 0 },
    'Flexibility': { level: 1, xp: 0, totalXp: 0 },
    'Strength': { level: 1, xp: 0, totalXp: 0 },
    'Cardio': { level: 1, xp: 0, totalXp: 0 },
    'Clothing': { level: 1, xp: 0, totalXp: 0 },
    'Housemaid': { level: 1, xp: 0, totalXp: 0 },
    'Work': { level: 1, xp: 0, totalXp: 0 },
    'Health': { level: 1, xp: 0, totalXp: 0 },
    'Social': { level: 1, xp: 0, totalXp: 0 },
    'Luck': { level: 1, xp: 0, totalXp: 0 },
    'Habit Building': { level: 1, xp: 0, totalXp: 0 },
    'Intelligence': { level: 1, xp: 0, totalXp: 0 },
};



// ULTRA-SLOW progression for years of gameplay
// Much steeper than previous level² × 10
// This makes leveling take YEARS
const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    // Exponential curve: level³ × 200 (Much slower, multi-year progression)
    // Level 10: 200,000 XP (~1 year)
    // Level 20: 1,600,000 XP (~5-8 years)
    return Math.floor(Math.pow(level, 3) * 200);
};

// Get current date in Eastern Time
const getEasternDateString = (): string => {
    const now = new Date();
    const eastern = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const [month, day, year] = eastern.split('/');
    return `${year}-${month}-${day}`;
};

const INITIAL_DAILY_XP: Record<SkillName, number> = {
    'Sleep': 0,
    'Hygiene': 0,
    'Flexibility': 0,
    'Strength': 0,
    'Cardio': 0,
    'Clothing': 0,
    'Housemaid': 0,
    'Work': 0,
    'Health': 0,
    'Social': 0,
    'Luck': 0,
    'Habit Building': 0,
    'Intelligence': 0,
};

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            currency: 0,
            gems: 0,
            skills: INITIAL_SKILLS,
            globalXp: 0,
            overflowXp: 0,
            dailyXpGained: { ...INITIAL_DAILY_XP },
            lastXpResetDate: null,
            lastDefenseDecayDate: null,
            defenseDecayAmount: 0,
            pendingLevelUp: null,
            cumulativeLogs: { ...INITIAL_DAILY_XP }, // Reuse same zero-initialized shape

            // Phase 8 Init
            dailyQuestSkill: null,
            consecutiveDays: { ...INITIAL_DAILY_XP },
            lastLogDate: {
                'Sleep': '', 'Hygiene': '', 'Flexibility': '', 'Strength': '', 'Cardio': '',
                'Clothing': '', 'Housemaid': '', 'Work': '', 'Health': '', 'Social': '',
                'Luck': '', 'Habit Building': '', 'Intelligence': ''
            }, // Empty strings for dates

            getFatiguePenalty: (skillName) => {
                const streak = get().consecutiveDays[skillName] || 0;
                // Fatigue kicks in after 7 days
                if (streak > 7) {
                    return 0.95; // -5% penalty
                }
                return 1.0;
            },

            addCurrency: (amount) => set((state) => ({
                currency: Math.max(0, state.currency + amount)
            })),

            addGems: (amount) => set((state) => ({
                gems: Math.max(0, state.gems + amount)
            })),

            addGlobalXp: (amount) => set((state) => ({
                globalXp: state.globalXp + amount
            })),

            addSkillXp: (skillName, amount) => {
                const state = get();
                const today = getEasternDateString();

                // Check if we need to reset daily XP
                if (state.lastXpResetDate !== today) {
                    // Pick random daily quest skill
                    const skillKeys = Object.keys(state.skills) as SkillName[];
                    const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];

                    set({
                        dailyXpGained: { ...INITIAL_DAILY_XP },
                        lastXpResetDate: today,
                        dailyQuestSkill: randomSkill,
                        // Apply defense decay checks on new day
                        defenseDecayAmount: state.defenseDecayAmount, // Trigger logic below properly if needed? 
                        // Actually applyDefenseDecay is separate. We should strictly call it or handle it.
                        // Existing code calls applyDefenseDecay implicitly? No, it's an action. 
                        // We'll leave it to the UI/App init to call applyDefenseDecay.
                    });
                }

                // Phase 8: Fatigue System Update
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                // Wait, getEasternDateString uses format yyyy-mm-dd manually?
                // "const [month, day, year] = eastern.split('/'); return `${year}-${month}-${day}`;"
                // Let's replicate strict yesterday string generation to match
                const yDate = new Date();
                yDate.setDate(yDate.getDate() - 1);
                const yEastern = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/New_York',
                    year: 'numeric', month: '2-digit', day: '2-digit'
                }).format(yDate);
                const [yM, yD, yY] = yEastern.split('/');
                const yesterdayString = `${yY}-${yM}-${yD}`;

                const lastLog = state.lastLogDate[skillName];
                let currentConsecutive = state.consecutiveDays[skillName] || 0;

                let newConsecutive = currentConsecutive;
                if (lastLog === yesterdayString) {
                    newConsecutive += 1;
                } else if (lastLog !== today) {
                    // Missed a day (and not today), reset
                    newConsecutive = 1;
                }
                // If lastLog === today, streak is already updated/maintained, don't increment

                // Calculate final amount with multipliers
                let finalAmount = amount;

                // 1. Daily Quest Multiplier (2x)
                if (state.dailyQuestSkill === skillName) {
                    finalAmount *= 2;
                }

                // 2. Fatigue Penalty (-5% if > 7 days)
                if (newConsecutive > 7) {
                    finalAmount *= 0.95;
                }

                // 3. Intelligence Magic XP Multiplier (existing)
                if (skillName === 'Intelligence') {
                    const hasMagicMultiplier = useBookTrophyStore.getState().hasMagicXPMultiplier();
                    if (hasMagicMultiplier) {
                        finalAmount *= 2;
                    }
                }

                finalAmount = Math.floor(finalAmount); // Ensure integer

                // No more daily cap check
                const actualXp = finalAmount;
                const overflowAmount = 0;
                const currentDailyXp = state.dailyXpGained[skillName] || 0;

                const skill = state.skills[skillName];
                const oldLevel = skill.level;
                let newXp = skill.xp + actualXp;
                let newLevel = skill.level;
                let newTotalXp = skill.totalXp + actualXp;

                // Check for level ups
                while (newXp >= getXpForLevel(newLevel)) {
                    newXp -= getXpForLevel(newLevel);
                    newLevel++;
                }

                const didLevelUp = newLevel > oldLevel;

                set((s) => {
                    const updates: Partial<GameState> = {
                        skills: {
                            ...s.skills,
                            [skillName]: {
                                level: newLevel,
                                xp: newXp,
                                totalXp: newTotalXp,
                            },
                        },
                        dailyXpGained: {
                            ...s.dailyXpGained,
                            [skillName]: currentDailyXp + actualXp,
                        },
                        cumulativeLogs: {
                            ...s.cumulativeLogs,
                            [skillName]: (s.cumulativeLogs[skillName] || 0) + 1,
                        },
                        consecutiveDays: {
                            ...s.consecutiveDays,
                            [skillName]: newConsecutive,
                        },
                        lastLogDate: {
                            ...s.lastLogDate,
                            [skillName]: today,
                        },
                        overflowXp: s.overflowXp + overflowAmount,
                        // Global XP gains 10% of skill XP
                        globalXp: s.globalXp + Math.floor(actualXp * 0.1),
                    };

                    // Set pending level-up for modal (only if not already showing one)
                    if (didLevelUp && !s.pendingLevelUp) {
                        updates.pendingLevelUp = { skill: skillName, newLevel };
                        // Asynchronously fetch milestone to avoid circular dependency
                        import('./useCombatFormulas').then(({ getMilestoneForSkill }) => {
                            const info = getMilestoneForSkill(skillName, newLevel);
                            if (info.currentTier && info.currentTier.level === newLevel) {
                                set(st => st.pendingLevelUp?.skill === skillName
                                    ? { pendingLevelUp: { ...st.pendingLevelUp, milestone: info.currentTier } }
                                    : {}
                                );
                            }
                        }).catch(() => { });
                    }

                    return updates;
                });

                // Grant milestone rewards for every 5 levels (handled separately to avoid store conflicts)
                if (didLevelUp && newLevel % 5 === 0) {
                    // Use dynamic import approach to avoid circular dependency issues
                    import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                        const { addGold, addTickets } = useCurrencyStore.getState();
                        addGold(50);
                        addTickets(1);
                    }).catch(() => {
                        // Currency store not available - skip milestone rewards
                    });
                }

                // Add faction reputation (+1 per skill log)
                import('./useFactionStore').then(({ useFactionStore }) => {
                    useFactionStore.getState().addReputationFromSkill(skillName);
                }).catch(() => { });

                return { actual: actualXp, overflow: overflowAmount, leveledUp: didLevelUp };
            },

            clearLevelUp: () => set({ pendingLevelUp: null }),

            getGlobalLevel: () => {
                const { skills, globalXp } = get();
                const levels = Object.values(skills).map(s => s.level);
                const avgSkillLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
                const bonusLevels = Math.floor(globalXp / 1000); // Slower global level gains
                return Math.floor(avgSkillLevel) + bonusLevels;
            },

            // Attack from Strength (very slow) + equipment + trophy bonus
            getAttack: () => {
                const { skills } = get();
                const strengthLevel = skills['Strength'].level;
                // Ultra slow: level × 1.5 + 5
                const baseAtk = Math.floor(strengthLevel * 1.5) + 5;
                // Add equipment bonus
                const equipBonus = useEquipmentStore.getState().getEquipmentBonuses().atk;
                // Add Strength trophy bonus
                const trophyBonus = useSkillTrophyStore.getState().getStrengthATKBonus();
                return baseAtk + equipBonus + trophyBonus;
            },

            // Defense from 5 skills including Habit Building + trophy bonus
            getDefense: () => {
                const { skills, defenseDecayAmount } = get();
                const sleepLevel = skills['Sleep'].level;
                const hygieneLevel = skills['Hygiene'].level;
                const cardioLevel = skills['Cardio'].level;
                const flexLevel = skills['Flexibility'].level;
                const habitLevel = skills['Habit Building'].level;

                // Habit Building contributes directly to defense
                const avgDefenseSkills = (sleepLevel + hygieneLevel + cardioLevel + flexLevel + habitLevel) / 5;
                let baseDef = Math.floor(avgDefenseSkills * 1.2) + 3;

                // Apply decay
                baseDef = Math.floor(baseDef * (1 - defenseDecayAmount));

                // Apply suppression if Sleep or Hygiene is too low
                const isSuppressed = get().isDefenseSuppressed();
                if (isSuppressed) {
                    baseDef = Math.floor(baseDef * 0.5);
                }

                // Add equipment bonus
                const equipBonus = useEquipmentStore.getState().getEquipmentBonuses().def;
                // Add Sleep trophy DEF bonus
                const trophyBonus = useSkillTrophyStore.getState().getSleepDEFBonus();
                return Math.max(1, baseDef + equipBonus + trophyBonus);
            },

            // Magic Attack from Intelligence skill + trophy bonus
            getMagicAttack: () => {
                const { skills } = get();
                const intelligenceLevel = skills['Intelligence'].level;
                // Get trophy bonus from book completions
                const trophyBonus = useBookTrophyStore.getState().getIntelligenceBonus();
                // Base magic attack: 5 + (level * 2) + trophy Intelligence bonus
                return Math.floor(5 + (intelligenceLevel * 2) + trophyBonus);
            },

            // Max MP from Intelligence skill + trophy bonus
            getMaxMP: () => {
                const { skills } = get();
                const intelligenceLevel = skills['Intelligence'].level;
                // Get trophy MP bonus from book completions
                const trophyMPBonus = useBookTrophyStore.getState().getMaxMPBonus();
                // Base MP: 50 + (level * 10) + trophy MP bonus
                return Math.floor(50 + (intelligenceLevel * 10) + trophyMPBonus);
            },

            isDefenseSuppressed: () => {
                const { skills } = get();
                return skills['Sleep'].level < 5 || skills['Hygiene'].level < 5;
            },

            // NEW: Defense decay -1% per day if Sleep or Hygiene neglected
            applyDefenseDecay: () => {
                const today = getEasternDateString();
                const { lastDefenseDecayDate, skills } = get();

                if (lastDefenseDecayDate === today) return;

                const sleepNeglected = skills['Sleep'].level < 5;
                const hygieneNeglected = skills['Hygiene'].level < 5;

                if (sleepNeglected || hygieneNeglected) {
                    set((s) => ({
                        defenseDecayAmount: Math.min(0.5, s.defenseDecayAmount + 0.01), // Cap at 50%
                        lastDefenseDecayDate: today,
                    }));
                } else {
                    // If maintaining good habits, slowly recover
                    set((s) => ({
                        defenseDecayAmount: Math.max(0, s.defenseDecayAmount - 0.005),
                        lastDefenseDecayDate: today,
                    }));
                }
            },

            getXpForLevel,

            getXpProgress: (skillName) => {
                const { skills } = get();
                const skill = skills[skillName];
                const required = getXpForLevel(skill.level);
                const percentage = required > 0 ? Math.min(100, (skill.xp / required) * 100) : 0;
                return { current: skill.xp, required, percentage };
            },

            resetDailyXp: () => {
                set({
                    dailyXpGained: { ...INITIAL_DAILY_XP },
                    lastXpResetDate: getEasternDateString(),
                    // Re-roll daily quest on manual reset too
                    dailyQuestSkill: (Object.keys(get().skills) as SkillName[])[Math.floor(Math.random() * 13)],
                });
            },

            getDailyXpEarned: (skillName) => {
                const state = get();
                const today = getEasternDateString();

                if (state.lastXpResetDate !== today) {
                    return 0;
                }

                return state.dailyXpGained[skillName] || 0;
            },

            getCumulativeLogs: (skillName) => {
                return get().cumulativeLogs[skillName] || 0;
            },
        }),
        {
            name: 'gl-game-storage-v7', // Added cumulative logs for pet evolution
        }
    )
);

export { getXpForLevel };
