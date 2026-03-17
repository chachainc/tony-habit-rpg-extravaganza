import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useBookTrophyStore } from './useBookTrophyStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export type SkillName =
    | 'Sleep'
    | 'Hygiene'
    | 'Flexibility'
    | 'Strength'
    | 'Cardio'
    | 'Work'
    | 'Health'
    | 'Social'
    | 'Luck'
    | 'Habit'
    | 'Housemaid'
    | 'Intelligence';

// Daily XP caps by skill (task-earned XP only; 0 = blocked)
export const DAILY_XP_CAPS: Partial<Record<SkillName, number>> = {
    'Strength': 6,
    'Cardio': 6,
    'Health': 6,
    'Hygiene': 5,
    'Sleep': 5,
    'Habit': 8,
    'Work': 6,
    'Social': 5,
    'Intelligence': 4,
    'Flexibility': 4,
    'Housemaid': 6,
    'Luck': 0, // Luck cannot be earned from tasks
};



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
    addSkillXp: (
        skill: SkillName,
        amount: number,
        options?: { capExempt?: boolean }
    ) => { actual: number; overflow: number; leveledUp?: boolean; capHit?: boolean };
    addGlobalXp: (amount: number) => void;
    getGlobalLevel: () => number;
    clearLevelUp: () => void; // Clear pending level-up

    // Derived stats
    getAttack: () => number;
    getDefense: () => number;
    getMagicAttack: () => number;
    getMagicDefense: () => number;
    getMaxMP: () => number;
    getCritRate: () => number;
    getMaxSpellTier: () => number;
    getAttackSpeedTier: () => number;
    getDodgeChance: () => number;
    isDefenseSuppressed: () => boolean;
    applyDefenseDecay: () => void;

    // XP utilities
    getXpForLevel: (level: number) => number;
    getXpProgress: (skillName: SkillName) => { current: number; required: number; percentage: number };
    resetDailyXp: () => void;
    getDailyXpEarned: (skillName: SkillName) => number;
    getDailyCap: (skillName: SkillName) => number;
    getCumulativeLogs: (skillName: SkillName) => number;

    // Phase 8: Progression Systems
    dailyQuestSkill: SkillName | null; // Skill with 2x XP today
    consecutiveDays: Record<SkillName, number>; // Track streaks for fatigue
    lastLogDate: Record<SkillName, string>; // Track last log date per skill for fatigue
    getFatiguePenalty: (skillName: SkillName) => number; // Returns multiplier (e.g. 0.95)
    getWorkDiscount: () => number; // Returns % shop discount from Work skill (0–15)
}

export const INITIAL_SKILLS: Record<SkillName, Skill> = {
    'Sleep': { level: 1, xp: 0, totalXp: 0 },
    'Hygiene': { level: 1, xp: 0, totalXp: 0 },
    'Flexibility': { level: 1, xp: 0, totalXp: 0 },
    'Strength': { level: 1, xp: 0, totalXp: 0 },
    'Cardio': { level: 1, xp: 0, totalXp: 0 },
    'Work': { level: 1, xp: 0, totalXp: 0 },
    'Health': { level: 1, xp: 0, totalXp: 0 },
    'Social': { level: 1, xp: 0, totalXp: 0 },
    'Luck': { level: 1, xp: 0, totalXp: 0 },
    'Habit': { level: 1, xp: 0, totalXp: 0 },
    'Housemaid': { level: 1, xp: 0, totalXp: 0 },
    'Intelligence': { level: 1, xp: 0, totalXp: 0 },
};

// Helper: merge old save skills with new structure safely
export const mergeSkillsFromSave = (saved: Record<string, Skill>): Record<SkillName, Skill> => {
    const merged = { ...INITIAL_SKILLS };
    
    for (const [key, val] of Object.entries(saved)) {
        // Handle legacy rename: 'Habit Building' -> 'Habit'
        const targetKey = key === 'Habit Building' ? 'Habit' : key;
        
        if (targetKey in merged) {
            const castKey = targetKey as SkillName;
            const totalXp = val.totalXp ?? 0;
            
            // Recompute exact level and relative XP based entirely off lifetime total XP
            let remainingXp = totalXp;
            let calcLevel = 1;
            
            while (remainingXp >= getXpForLevel(calcLevel)) {
                remainingXp -= getXpForLevel(calcLevel);
                calcLevel++;
            }
            
            merged[castKey] = {
                level: calcLevel,
                xp: remainingXp,
                totalXp: totalXp
            };
        }
        // Legacy 'Clothing' is dropped, but Housemaid is now fully supported again.
    }
    return merged;
};



// NEW PROGRESSION CURVE: 10 + (Level - 1) * 5
// Level 1 = 0 total XP (base)
// Level 2 = 10 total XP
// Level 3 = 25 total XP
// Level 4 = 45 total XP
// Level 5 = 70 total XP
export const getXpForLevel = (level: number): number => {
    if (level <= 1) return 10;
    return 10 + (Math.floor(level) - 1) * 5;
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
    'Work': 0,
    'Health': 0,
    'Social': 0,
    'Luck': 0,
    'Habit': 0,
    'Housemaid': 0,
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
                'Work': '', 'Health': '', 'Social': '',
                'Luck': '', 'Habit': '', 'Housemaid': '', 'Intelligence': ''
            }, // Empty strings for dates

            getFatiguePenalty: (skillName) => {
                const streak = get().consecutiveDays[skillName] || 0;
                // Fatigue kicks in after 7 days
                if (streak > 7) {
                    return 0.95; // -5% penalty
                }
                return 1.0;
            },

            addCurrency: (amount) => {
                import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                    // Forward positive gains/losses to the modern currency store
                    if (amount > 0) useCurrencyStore.getState().addGold(amount);
                    if (amount < 0) useCurrencyStore.getState().spendGold(Math.abs(amount));
                });
                set((state) => ({
                    currency: Math.max(0, state.currency + amount)
                }));
            },

            addGems: (amount) => {
                import('./useCurrencyStore').then(({ useCurrencyStore }) => {
                    // Forward positive gains/losses to the modern currency store
                    if (amount > 0) useCurrencyStore.getState().addDiamonds(amount);
                    if (amount < 0) useCurrencyStore.getState().spendDiamonds(Math.abs(amount));
                });
                set((state) => ({
                    gems: Math.max(0, state.gems + amount)
                }));
            },

            addGlobalXp: (amount) => set((state) => ({
                globalXp: state.globalXp + amount
            })),

            addSkillXp: (skillName, amount, options) => {
                const state = get();
                const today = getEasternDateString();
                const capExempt = options?.capExempt === true;

                // Check if we need to reset daily XP
                if (state.lastXpResetDate !== today) {
                    // Pick random daily quest skill
                    const skillKeys = Object.keys(state.skills) as SkillName[];
                    const randomSkill = skillKeys[Math.floor(Math.random() * skillKeys.length)];

                    set({
                        dailyXpGained: { ...INITIAL_DAILY_XP },
                        lastXpResetDate: today,
                        dailyQuestSkill: randomSkill,
                        defenseDecayAmount: state.defenseDecayAmount,
                    });
                }

                // ── Daily XP Cap Enforcement ─────────────────────────────
                if (!capExempt) {
                    const cap = DAILY_XP_CAPS[skillName];
                    if (cap !== undefined) {
                        const earned = state.dailyXpGained[skillName] || 0;
                        if (earned >= cap) {
                            // Cap already hit — block entirely
                            return { actual: 0, overflow: 0, capHit: true };
                        }
                        // Trim to remaining allowance
                        amount = Math.min(amount, cap - earned);
                    }
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

                // 4. Housemaid Lv. 15 "Organized Workspace" Global XP Buff (+5% to all task XP)
                // Note: since this is Task XP processing, we apply this multiplier uniformly if the player is level 15+
                const housemaidLevel = state.skills['Housemaid']?.level ?? 1;
                if (housemaidLevel >= 15) {
                    finalAmount *= 1.05;
                }

                const currentDailyXp = state.dailyXpGained[skillName] || 0;
                const softCap = 1500;
                if (currentDailyXp > softCap) {
                    const penaltyRatio = softCap / (currentDailyXp + finalAmount);
                    finalAmount = Math.max(1, Math.floor(finalAmount * penaltyRatio));
                }
                
                finalAmount = Math.floor(finalAmount);
                const actualXp = finalAmount;
                const overflowAmount = 0;

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
                            [skillName]: capExempt ? currentDailyXp : currentDailyXp + actualXp,
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

            // GET STATS
            getAttack: () => {
                const { skills } = get();
                const strengthLevel = skills['Strength']?.level ?? 1;
                return 1 + strengthLevel;
            },

            getDefense: () => {
                const { skills } = get();
                const hygieneLevel = skills['Hygiene']?.level ?? 1;
                return 1 + hygieneLevel;
            },

            getMagicAttack: () => {
                const { skills } = get();
                const intelligenceLevel = skills['Intelligence']?.level ?? 1;
                return 1 + intelligenceLevel;
            },

            getMagicDefense: () => {
                const { skills } = get();
                const socialLevel = skills['Social']?.level ?? 1;
                return 1 + socialLevel;
            },

            getMaxMP: () => {
                const { skills } = get();
                const sleepLevel = skills['Sleep']?.level ?? 1;
                return 20 + ((sleepLevel - 1) * 5);
            },

            // Crit Rate from Habit Building
            getCritRate: () => {
                const { skills } = get();
                const habitLevel = skills['Habit']?.level ?? 1;
                // CritChance = HabitLevel %
                return habitLevel / 100;
            },

            // Max Spell Tier from Flexibility
            getMaxSpellTier: () => {
                const { skills } = get();
                const flexLevel = skills['Flexibility']?.level ?? 1;
                // SpellTierUnlocked = floor(Flexibility / 5) + 1
                return Math.floor(flexLevel / 5) + 1;
            },

            // Attack Speed Tier from Cardio
            getAttackSpeedTier: () => {
                const { skills } = get();
                const cardioLevel = skills['Cardio']?.level ?? 1;
                return cardioLevel;
            },

            // Dodge Chance from Cardio
            getDodgeChance: () => {
                const { skills } = get();
                const cardioLevel = skills['Cardio']?.level ?? 1;
                // DodgeChance = Cardio Level %
                return cardioLevel / 100;
            },

            isDefenseSuppressed: () => {
                const { skills } = get();
                return (skills['Sleep']?.level ?? 1) < 5 || (skills['Hygiene']?.level ?? 1) < 5;
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
                const skillKeys = Object.keys(get().skills) as SkillName[];
                set({
                    dailyXpGained: { ...INITIAL_DAILY_XP },
                    lastXpResetDate: getEasternDateString(),
                    dailyQuestSkill: skillKeys[Math.floor(Math.random() * skillKeys.length)],
                });
            },

            getDailyCap: (skillName) => {
                return DAILY_XP_CAPS[skillName] ?? Infinity;
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

            getWorkDiscount: () => {
                const workLevel = get().skills['Work']?.level ?? 1;
                return Math.min(Math.floor(workLevel * 0.5), 15); // 0.5% per level, max 15%
            },
        }),
        {
            name: PERSIST_REGISTRY.game.persistKey,
            merge: (persistedState: any, currentState: GameState) => {
                // Safely migrate skills from disk using absolute totalXp derivation
                const mergedSkills = persistedState.skills 
                    ? mergeSkillsFromSave(persistedState.skills) 
                    : currentState.skills;
                
                return {
                    ...currentState,
                    ...persistedState,
                    skills: mergedSkills,
                };
            }
        }
    )
);


