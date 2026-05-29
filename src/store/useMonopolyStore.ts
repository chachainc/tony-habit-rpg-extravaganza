import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Tile Types ─────────────────────────────────────────────────
export type BoardSpaceType =
    | 'go'
    | 'gold'
    | 'mystery'
    | 'ticket'
    | 'empty';

export type BoardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'ultra_rare';

export interface BoardReward {
    gold?: number;
    tickets?: number;
    gems?: number;
    // Trophies / cosmetics specific to the board theme
    petId?: string;
    cosmeticId?: string;
    titleId?: string;
    bannerId?: string;
}

export interface BoardSpace {
    id: number;
    type: BoardSpaceType;
    name: string;
    icon: string;
    baseReward: BoardReward;
}

// ── Ownership Tiers ────────────────────────────────────────────
export interface OwnedTile {
    level: number; // 1-4 = Houses, 5 = Hotel
}

export const OWNERSHIP_TIERS = [
    { level: 1, icon: '🏠' },
    { level: 2, icon: '🏠🏠' },
    { level: 3, icon: '🏠🏠🏠' },
    { level: 4, icon: '🏠🏠🏠🏠' },
    { level: 5, icon: '🏨' },
];

export const PROPERTY_UPGRADE_COSTS: Record<number, import('./useCurrencyStore').CurrencyCost> = {
    1: { gold: 50 },
    2: { gold: 100 },
    3: { gold: 250 },
    4: { gold: 500 },
    5: { gold: 2000, gems: 5 },
};

export const getPropertyMultiplier = (level: number): number => {
    const roll = Math.random() * 100;
    let odds1x = 100, odds2x = 0;
    if (level === 1) { odds1x = 80; odds2x = 18; }
    else if (level === 2) { odds1x = 70; odds2x = 25; }
    else if (level === 3) { odds1x = 55; odds2x = 35; }
    else if (level === 4) { odds1x = 40; odds2x = 45; }
    else if (level >= 5) { odds1x = 25; odds2x = 50; }

    if (roll < odds1x) return 1;
    if (roll < odds1x + odds2x) return 2;
    return 3;
};

export const getPropertyMultiplierPool = (level: number): number[] => {
    let odds1x = 100, odds2x = 0;
    if (level === 1) { odds1x = 80; odds2x = 18; }
    else if (level === 2) { odds1x = 70; odds2x = 25; }
    else if (level === 3) { odds1x = 55; odds2x = 35; }
    else if (level === 4) { odds1x = 40; odds2x = 45; }
    else if (level >= 5) { odds1x = 25; odds2x = 50; }

    const pool: number[] = [];
    const count1x = Math.round(odds1x / 5);
    const count2x = Math.round(odds2x / 5);
    const count3x = 20 - count1x - count2x;

    for (let i = 0; i < count1x; i++) pool.push(1);
    for (let i = 0; i < count2x; i++) pool.push(2);
    for (let i = 0; i < count3x; i++) pool.push(3);

    return pool.length > 0 ? pool : [1];
};

// ── Drop Tables & Odds ─────────────────────────────────────────

export const BOARD_ODDS = {
    ultra_rare: 0.00001, // 1/100,000 — Ethereal Cow
    epic:       0.005,   // 0.5%
    rare:       0.01,    // 1%
    uncommon:   0.08,    // 8%
    // common is the remainder: ~90.499%
    get common() { return 1 - this.ultra_rare - this.epic - this.rare - this.uncommon; }
};

export interface MysteryRollResult {
    rarity: BoardRarity;
    reward: BoardReward;
    message: string;
    isDuplicate?: boolean;
}


// ── Board Generation (24 spaces perimeter board) ───────────────
const TOTAL_SPACES = 24;

const createBoard = (): BoardSpace[] => {
    const board: BoardSpace[] = [];

    // Space 0: GO
    board.push({
        id: 0,
        type: 'go',
        name: 'GO',
        icon: '🏠',
        baseReward: {}, // GO reward is handled dynamically via lap count
    });

    for (let i = 1; i < TOTAL_SPACES; i++) {
        let space: BoardSpace = {
            id: i,
            type: 'empty',
            name: 'Grass',
            icon: '🌾',
            baseReward: {},
        };

        // Gold Tiles (3 tiles)
        if (i === 4 || i === 10 || i === 16) {
            space = {
                id: i,
                type: 'gold',
                name: 'Small Coin',
                icon: '', // Handled dynamically in MonopolyBoard
                baseReward: { gold: Math.floor(Math.random() * 5) + 3 },
            };
        }

        // Gold Bonus Tiles (2 tiles)
        if (i === 8 || i === 20) {
            space = {
                id: i,
                type: 'gold',
                name: 'Gold Stash',
                icon: '',
                baseReward: { gold: (Math.floor(Math.random() * 3) + 1) * 5 }, // 5–15 base
            };
        }

        // Mystery / Chest Tiles (4 tiles — triggers drop table)
        if (i === 3 || i === 9 || i === 15 || i === 21) {
            space = {
                id: i,
                type: 'mystery',
                name: 'Mystery Crop',
                icon: '🎁',
                baseReward: {},
            };
        }

        // Ticket (1 tile)
        if (i === 12) {
            space = {
                id: i,
                type: 'ticket',
                name: 'Lost Ticket',
                icon: '🎫',
                baseReward: { tickets: 1 },
            };
        }

        // Positions 6 and 18: remain as grass (empty) — no hazard tiles

        board.push(space);
    }

    return board;
};

// ── Mutable board state (re-generated on each lap) ────────────
let currentBoard = createBoard();

export const getBoard = () => currentBoard;

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

// ── Move result type ──────────────────────────────────────────
export interface MoveResult {
    landedSpace: BoardSpace;
    passedGo: boolean;
    goReward: number; // gold awarded for passing GO (0 if didn't pass)
}

// ── Store ──────────────────────────────────────────────────────
interface MonopolyState {
    dailyTickets: number;
    currentPosition: number;
    lastTicketResetDate: string | null;
    totalRollsToday: number;
    totalLifetimeRolls: number;
    lastLuckRoll: MysteryRollResult | null;
    streakMultiplierActive: boolean;
    lapCount: number;
    boardRefreshPending: boolean;

    // Property Ownership
    ownedTiles: Record<number, OwnedTile>;

    // Actions
    rollDice: () => number;
    movePlayer: (spaces: number) => MoveResult;
    addDailyTickets: (amount: number) => void;
    resetDailyTickets: () => void;
    canRoll: () => boolean;
    setStreakMultiplier: (active: boolean) => void;
    rollMysteryBox: () => MysteryRollResult;
    regenerateBoard: () => void;
    getGoReward: () => number;

    // Property actions
    buyTile: (tileId: number) => boolean;
    upgradeTile: (tileId: number) => boolean;
    getBuyCost: (tileId: number) => import('./useCurrencyStore').CurrencyCost;
    getUpgradeCost: (tileId: number) => import('./useCurrencyStore').CurrencyCost | null;
    canBuyTile: (tileId: number) => boolean;
    canUpgradeTile: (tileId: number) => boolean;
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
            lapCount: 0,
            boardRefreshPending: false,
            ownedTiles: {},

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

            movePlayer: (spaces): MoveResult => {
                const state = get();
                const oldPos = state.currentPosition;
                const rawNew = oldPos + spaces;
                const passedGo = rawNew >= TOTAL_SPACES;

                if (passedGo) {
                    // Stop on GO tile, award scaled reward
                    const goReward = get().getGoReward();
                    set({
                        currentPosition: 0,
                        lapCount: state.lapCount + 1,
                        boardRefreshPending: true,
                    });

                    return {
                        landedSpace: currentBoard[0],
                        passedGo: true,
                        goReward,
                    };
                }

                // Normal movement — no GO pass
                const newPosition = rawNew % TOTAL_SPACES;
                set({ currentPosition: newPosition });

                const landedSpace = currentBoard[newPosition];

                return {
                    landedSpace,
                    passedGo: false,
                    goReward: 0,
                };
            },

            addDailyTickets: (amount) => {
                set((state) => ({
                    dailyTickets: state.dailyTickets + amount,
                }));
            },

            resetDailyTickets: () => {
                const today = getEasternDateString();
                // Reset lap count on new day
                currentBoard = createBoard();
                set({
                    dailyTickets: 5,
                    lastTicketResetDate: today,
                    totalRollsToday: 0,
                    lapCount: 0,
                    boardRefreshPending: false,
                });
            },

            setStreakMultiplier: (active) => {
                set({ streakMultiplierActive: active });
            },

            regenerateBoard: () => {
                currentBoard = createBoard();
                set({ boardRefreshPending: false });
            },

            getGoReward: () => {
                let bonus = 0;
                const state = get();
                for (const tileId in state.ownedTiles) {
                    bonus += state.ownedTiles[tileId].level * 5;
                }
                return 25 + state.lapCount + bonus;
            },

             // ── Property Ownership ────────────────────────────────
            getBuyCost: () => {
                return PROPERTY_UPGRADE_COSTS[1];
            },

            getUpgradeCost: (tileId) => {
                const owned = get().ownedTiles[tileId];
                if (!owned || owned.level >= 5) return null;
                return PROPERTY_UPGRADE_COSTS[owned.level + 1] || null;
            },

            canBuyTile: (tileId) => {
                const state = get();
                if (state.ownedTiles[tileId]) return false;
                const tile = currentBoard[tileId];
                if (!tile || tile.type === 'go') return false;
                return true;
            },

            canUpgradeTile: (tileId) => {
                const owned = get().ownedTiles[tileId];
                return !!owned && owned.level < 5;
            },

            buyTile: (tileId) => {
                const state = get();
                if (!state.canBuyTile(tileId)) return false;
                set(s => ({
                    ownedTiles: { ...s.ownedTiles, [tileId]: { level: 1 } },
                }));
                return true;
            },

            upgradeTile: (tileId) => {
                const state = get();
                if (!state.canUpgradeTile(tileId)) return false;
                set(s => ({
                    ownedTiles: {
                        ...s.ownedTiles,
                        [tileId]: { level: (s.ownedTiles[tileId]?.level || 1) + 1 },
                    },
                }));
                return true;
            },

            rollMysteryBox: (): MysteryRollResult => {
                const roll = Math.random() * 100;
                
                let result: MysteryRollResult = {
                    rarity: 'common',
                    reward: {},
                    message: ''
                };

                // Probability breakdown:
                // - 25 Gold: 25% (0 <= roll < 25)
                // - 50 Gold: 25% (25 <= roll < 50)
                // - 75 Gold: 20% (50 <= roll < 70)
                // - 100 Gold: 12% (70 <= roll < 82)
                // - 150 Gold: 6% (82 <= roll < 88)
                // - 250 Gold: 5% (88 <= roll < 93)
                // - 1 Gem: 4% (93 <= roll < 97)
                // - 3 Gems: 2.5% (97 <= roll < 99.5)
                // - 5 Gems (Jackpot): 0.5% (99.5 <= roll <= 100)

                if (roll < 25) {
                    result.rarity = 'common';
                    result.reward.gold = 25;
                    result.message = 'Found a bag of gold! (+25 Gold)';
                } else if (roll < 50) {
                    result.rarity = 'common';
                    result.reward.gold = 50;
                    result.message = 'Found a treasure pouch! (+50 Gold)';
                } else if (roll < 70) {
                    result.rarity = 'common';
                    result.reward.gold = 75;
                    result.message = 'Discovered a chest of gold! (+75 Gold)';
                } else if (roll < 82) {
                    result.rarity = 'common';
                    result.reward.gold = 100;
                    result.message = 'Unearthed a massive gold stash! (+100 Gold)';
                } else if (roll < 88) {
                    result.rarity = 'uncommon';
                    result.reward.gold = 150;
                    result.message = 'Rich harvest! A heavy chest of gold! (+150 Gold)';
                } else if (roll < 93) {
                    result.rarity = 'uncommon';
                    result.reward.gold = 250;
                    result.message = 'Incredible fortune! A massive stack of coins! (+250 Gold)';
                } else if (roll < 97) {
                    result.rarity = 'rare';
                    result.reward.gems = 1;
                    result.message = 'A rare discovery! You found a Gem! (+1 Gem)';
                } else if (roll < 99.5) {
                    result.rarity = 'epic';
                    result.reward.gems = 3;
                    result.message = 'Incredible fortune! Found a cluster of Gems! (+3 Gems)';
                } else {
                    result.rarity = 'ultra_rare';
                    result.reward.gems = 5;
                    result.message = '🌌 JACKPOT! Found a flawless Gem hoard! (+5 Gems)';
                }

                set({ lastLuckRoll: result });
                return result;
            },
        }),
        {
            name: PERSIST_REGISTRY.monopoly.persistKey,
        }
    )
);

// Legacy export for backward compat — now returns dynamic board
export const BOARD = currentBoard;
