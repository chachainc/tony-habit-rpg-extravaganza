import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Tile Types ─────────────────────────────────────────────────
export type BoardSpaceType =
    | 'gold'
    | 'stat_boost'
    | 'double_xp'
    | 'training_token'
    | 'shop_discount'
    | 'pet_shard'
    | 'mystery_encounter'
    | 'injury'
    | 'ticket'
    | 'gem'
    | 'go'
    | 'empty';

export type BoardRegion = 'early' | 'mid' | 'late';

export interface TileEffect {
    gold?: number;
    gems?: number;
    tickets?: number;
    luckXp?: number;
    statBoost?: { stat: string; value: number; durationHours: number };
    doubleXpNextHabit?: boolean;
    trainingTokens?: number;
    shopDiscount?: { value: number; durationHours: number };
    petShards?: number;
    mysteryEncounter?: boolean;
    injuryRest?: { defenseBonus: number; durationHours: number };
}

export interface BoardSpace {
    id: number;
    type: BoardSpaceType;
    name: string;
    reward: TileEffect;
    icon: string;
    region: BoardRegion;
}

// ── Luck Roll System ───────────────────────────────────────────
export type LuckRollType = 'none' | 'insane' | 'godly' | 'universe';

export interface LuckRollResult {
    type: LuckRollType;
    message: string;
    luckXpBonus: number;
    unlockedPet?: string;
    unlockedAuraId?: string;
    unlockedBannerId?: string;
}

// ── Board Generation ───────────────────────────────────────────
const getRegion = (id: number): BoardRegion => {
    if (id <= 13) return 'early';
    if (id <= 27) return 'mid';
    return 'late';
};

const STAT_BOOST_OPTIONS = ['Strength', 'Cardio', 'Flexibility', 'Hygiene', 'Sleep'];

const createBoard = (): BoardSpace[] => {
    const board: BoardSpace[] = [];

    // Space 0: GO
    board.push({
        id: 0,
        type: 'go',
        name: 'GO',
        reward: { luckXp: 1 },
        icon: '🍀',
        region: 'early',
    });

    for (let i = 1; i < 40; i++) {
        const region = getRegion(i);
        let space: BoardSpace = {
            id: i,
            type: 'empty',
            name: 'Rest Stop',
            reward: {},
            icon: '○',
            region,
        };

        // ── Early Region (1-13): coins + small boosts ────────────
        if (region === 'early') {
            // Gold tiles (1-3g)
            if (i === 2 || i === 5 || i === 8 || i === 11) {
                space = {
                    id: i, type: 'gold', name: 'Copper Coin', icon: '🪙', region,
                    reward: { gold: Math.floor(Math.random() * 3) + 1 },
                };
            }
            // Stat boost tiles
            if (i === 3 || i === 9) {
                const stat = STAT_BOOST_OPTIONS[Math.floor(Math.random() * STAT_BOOST_OPTIONS.length)];
                space = {
                    id: i, type: 'stat_boost', name: `${stat} Surge`, icon: '💎', region,
                    reward: { statBoost: { stat, value: 0.01, durationHours: 24 } },
                };
            }
            // Double XP
            if (i === 6 || i === 12) {
                space = {
                    id: i, type: 'double_xp', name: 'Double XP', icon: '⚡', region,
                    reward: { doubleXpNextHabit: true },
                };
            }
            // Silver coin
            if (i === 10) {
                space = {
                    id: i, type: 'gold', name: 'Silver Coin', icon: '💰', region,
                    reward: { gold: Math.floor(Math.random() * 2) + 4 },
                };
            }
        }

        // ── Mid Region (14-27): training tokens + shards ─────────
        if (region === 'mid') {
            // Gold
            if (i === 15 || i === 22) {
                space = {
                    id: i, type: 'gold', name: 'Copper Coin', icon: '🪙', region,
                    reward: { gold: Math.floor(Math.random() * 3) + 2 },
                };
            }
            // Training tokens
            if (i === 16 || i === 20 || i === 25) {
                space = {
                    id: i, type: 'training_token', name: 'Training Token', icon: '🎯', region,
                    reward: { trainingTokens: 1 },
                };
            }
            // Gem tile
            if (i === 17) {
                space = {
                    id: i, type: 'gem', name: 'Hidden Gem', icon: '💎', region,
                    reward: { gems: 1 },
                };
            }
            // Shop discount
            if (i === 18) {
                space = {
                    id: i, type: 'shop_discount', name: 'Merchant Favor', icon: '🏷️', region,
                    reward: { shopDiscount: { value: 0.15, durationHours: 24 } },
                };
            }
            // Stat boost
            if (i === 21) {
                const stat = STAT_BOOST_OPTIONS[Math.floor(Math.random() * STAT_BOOST_OPTIONS.length)];
                space = {
                    id: i, type: 'stat_boost', name: `${stat} Surge`, icon: '💎', region,
                    reward: { statBoost: { stat, value: 0.01, durationHours: 24 } },
                };
            }
            // Ticket
            if (i === 24) {
                space = {
                    id: i, type: 'ticket', name: 'Lucky Find', icon: '🎫', region,
                    reward: { tickets: 1 },
                };
            }
            // Pet shard
            if (i === 27) {
                space = {
                    id: i, type: 'pet_shard', name: 'Pet Shard', icon: '🔮', region,
                    reward: { petShards: 1 },
                };
            }
        }

        // ── Late Region (28-39): rare shards + encounters ────────
        if (region === 'late') {
            // Gold
            if (i === 28 || i === 35) {
                space = {
                    id: i, type: 'gold', name: 'Silver Coin', icon: '💰', region,
                    reward: { gold: Math.floor(Math.random() * 3) + 3 },
                };
            }
            // Pet shards
            if (i === 30 || i === 36) {
                space = {
                    id: i, type: 'pet_shard', name: 'Rare Shard', icon: '🔮', region,
                    reward: { petShards: 1 },
                };
            }
            // Mystery encounter
            if (i === 32 || i === 38) {
                space = {
                    id: i, type: 'mystery_encounter', name: 'Mystery Encounter', icon: '⚔️', region,
                    reward: { mysteryEncounter: true },
                };
            }
            // Injury tile
            if (i === 33) {
                space = {
                    id: i, type: 'gem', name: 'Rare Gem', icon: '💎', region,
                    reward: { gems: 2 },
                };
            }
            if (i === 34) {
                space = {
                    id: i, type: 'injury', name: 'Injury', icon: '🩹', region,
                    reward: { injuryRest: { defenseBonus: 0.05, durationHours: 24 } },
                };
            }
            // Training token
            if (i === 29 || i === 37) {
                space = {
                    id: i, type: 'training_token', name: 'Training Token', icon: '🎯', region,
                    reward: { trainingTokens: 1 },
                };
            }
            // Double XP
            if (i === 31) {
                space = {
                    id: i, type: 'double_xp', name: 'Double XP', icon: '⚡', region,
                    reward: { doubleXpNextHabit: true },
                };
            }
            // Stat boost (late = stronger)
            if (i === 39) {
                const stat = STAT_BOOST_OPTIONS[Math.floor(Math.random() * STAT_BOOST_OPTIONS.length)];
                space = {
                    id: i, type: 'stat_boost', name: `${stat} Surge+`, icon: '💎', region,
                    reward: { statBoost: { stat, value: 0.02, durationHours: 24 } },
                };
            }
        }

        board.push(space);
    }

    return board;
};

const BOARD = createBoard();

// ── Date Helper ────────────────────────────────────────────────
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

// ── Store ──────────────────────────────────────────────────────
interface MonopolyState {
    dailyTickets: number;
    currentPosition: number;
    lastTicketResetDate: string | null;
    totalRollsToday: number;
    totalLifetimeRolls: number;
    lastLuckRoll: LuckRollResult | null;

    // New: streak multiplier tracking
    streakMultiplierActive: boolean;

    // New: accumulated resources
    trainingTokens: number;
    petShards: number;

    // Actions
    rollDice: () => number;
    movePlayer: (spaces: number) => BoardSpace;
    resetDailyTickets: () => void;
    canRoll: () => boolean;
    checkLuckRoll: () => LuckRollResult;
    setStreakMultiplier: (active: boolean) => void;
    addTrainingTokens: (amount: number) => void;
    spendTrainingTokens: (amount: number) => boolean;
    addPetShards: (amount: number) => void;
}

export const useMonopolyStore = create<MonopolyState>()(
    persist(
        (set, get) => ({
            dailyTickets: 5,
            currentPosition: 0,
            lastTicketResetDate: null,
            totalRollsToday: 0,
            totalLifetimeRolls: 0,
            lastLuckRoll: null,
            streakMultiplierActive: false,
            trainingTokens: 0,
            petShards: 0,

            canRoll: () => {
                const state = get();
                const today = getEasternDateString();

                if (state.lastTicketResetDate !== today) {
                    get().resetDailyTickets();
                }

                return state.dailyTickets > 0;
            },

            rollDice: () => {
                const state = get();
                if (!state.canRoll()) return 0;

                const roll = Math.floor(Math.random() * 6) + 1;

                set((s) => ({
                    dailyTickets: s.dailyTickets - 1,
                    totalRollsToday: s.totalRollsToday + 1,
                    totalLifetimeRolls: (s.totalLifetimeRolls || 0) + 1,
                }));

                return roll;
            },

            movePlayer: (spaces) => {
                const state = get();
                const newPosition = (state.currentPosition + spaces) % 40;

                set({ currentPosition: newPosition });

                const landedSpace = BOARD[newPosition];

                // Auto-collect training tokens and pet shards
                if (landedSpace.reward.trainingTokens) {
                    set(s => ({ trainingTokens: s.trainingTokens + (landedSpace.reward.trainingTokens || 0) }));
                }
                if (landedSpace.reward.petShards) {
                    set(s => ({ petShards: s.petShards + (landedSpace.reward.petShards || 0) }));
                }

                // Check if passed GO
                if (state.currentPosition + spaces >= 40) {
                    const goSpace = BOARD[0];
                    return {
                        ...landedSpace,
                        reward: {
                            ...landedSpace.reward,
                            luckXp: (landedSpace.reward.luckXp || 0) + (goSpace.reward.luckXp || 0),
                        }
                    };
                }

                return landedSpace;
            },

            resetDailyTickets: () => {
                const today = getEasternDateString();
                set({
                    dailyTickets: 5,
                    lastTicketResetDate: today,
                    totalRollsToday: 0,
                });
            },

            setStreakMultiplier: (active) => {
                set({ streakMultiplierActive: active });
            },

            addTrainingTokens: (amount) => {
                set(s => ({ trainingTokens: s.trainingTokens + amount }));
            },

            spendTrainingTokens: (amount) => {
                const state = get();
                if (state.trainingTokens < amount) return false;
                set({ trainingTokens: state.trainingTokens - amount });
                return true;
            },

            addPetShards: (amount) => {
                set(s => ({ petShards: s.petShards + amount }));
            },

            // LUCK ROLL SYSTEM - Check for ultra-rare events
            checkLuckRoll: (): LuckRollResult => {
                const roll = Math.random();
                let result: LuckRollResult = {
                    type: 'none',
                    message: '',
                    luckXpBonus: 0,
                };

                // 1 in 250,000 - UNIVERSE ALTERING LUCK
                if (roll < 0.000004) {
                    result = {
                        type: 'universe',
                        message: '🌌✨ UNIVERSE ALTERING LUCK! You unlocked the ETHEREAL COW! 1 in 250,000!',
                        luckXpBonus: 1000,
                        unlockedPet: 'ethereal_cow',
                    };
                    import('./useSkillTrophyStore').then(({ useSkillTrophyStore }) => {
                        useSkillTrophyStore.getState().recordRareRoll(250000);
                    });
                    import('./useAchievementTrophyStore').then(({ useAchievementTrophyStore }) => {
                        useAchievementTrophyStore.getState().unlockEtherealCowTrophy();
                    });
                }
                // 1 in 10,000 - UNIQUE AURA DROP (Lucky Radiance)
                else if (roll < 0.0001) {
                    const auraId = 'lucky_radiance';
                    result = {
                        type: 'universe',
                        message: `🌈✨ ULTRA-RARE! Lucky Radiance aura unlocked! 1 in 10,000 chance! Check your Wardrobe!`,
                        luckXpBonus: 500,
                        unlockedAuraId: auraId,
                    };
                    import('./useAuraStore').then(({ useAuraStore }) => {
                        useAuraStore.getState().unlockAura(auraId);
                    });
                    import('./useSkillTrophyStore').then(({ useSkillTrophyStore }) => {
                        useSkillTrophyStore.getState().recordRareRoll(10000);
                    });
                }
                // 1 in 5,000 - RARE BANNER DROP
                else if (roll < 0.0002) {
                    const bannerIds = ['crimson_dawn', 'void_walker', 'celestial_guard', 'iron_sentinel', 'storm_herald'];
                    const bannerId = bannerIds[Math.floor(Math.random() * bannerIds.length)];
                    result = {
                        type: 'godly',
                        message: `🏳️✨ RARE BANNER UNLOCKED! "${bannerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"! 1 in 5,000!`,
                        luckXpBonus: 250,
                        unlockedBannerId: bannerId,
                    };
                    import('./useProfileStore').then(({ useProfileStore }) => {
                        useProfileStore.getState().unlockBanner(bannerId);
                    });
                    import('./useSkillTrophyStore').then(({ useSkillTrophyStore }) => {
                        useSkillTrophyStore.getState().recordRareRoll(5000);
                    });
                }
                // 1 in 25,000 - GOLDEN GOLDFISH
                else if (roll < 0.00004 + 0.0002) {
                    result = {
                        type: 'godly',
                        message: '🐠✨ GOLDEN FORTUNE! You unlocked the GOLDEN GOLDFISH! 1 in 25,000!',
                        luckXpBonus: 500,
                        unlockedPet: 'golden_goldfish',
                    };
                    import('./useSkillTrophyStore').then(({ useSkillTrophyStore }) => {
                        useSkillTrophyStore.getState().recordRareRoll(25000);
                    });
                    import('./useAchievementTrophyStore').then(({ useAchievementTrophyStore }) => {
                        useAchievementTrophyStore.getState().unlockGoldenGoldfishTrophy();
                    });
                }
                // 1 in 1,000 - INSANE LUCK
                else if (roll < 0.001) {
                    result = {
                        type: 'insane',
                        message: '✨ INSANE LUCK! 1 in 1,000 roll hit!',
                        luckXpBonus: 50,
                    };
                    import('./useSkillTrophyStore').then(({ useSkillTrophyStore }) => {
                        useSkillTrophyStore.getState().recordRareRoll(1000);
                    });
                }

                set({ lastLuckRoll: result });
                return result;
            },
        }),
        {
            name: PERSIST_REGISTRY.monopoly.persistKey, // v3 for board expansion
        }
    )
);

export { BOARD };
