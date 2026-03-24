import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useBoardCollectionStore } from './useBoardCollectionStore';

// ── Tile Types ─────────────────────────────────────────────────
export type BoardSpaceType =
    | 'go'
    | 'gold'
    | 'shmeckles'
    | 'mystery'
    | 'ticket'
    | 'empty'
    | 'tax'
    | 'storm'
    | 'thief';

export type BoardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'ultra_rare';

export interface BoardReward {
    gold?: number;
    shmeckles?: number;
    tickets?: number;
    sigils?: number;
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
    level: number; // 1 = Homestead, 2 = Village, 3 = Fortress
}

export const OWNERSHIP_TIERS = [
    { level: 1, icon: '🏡', name: 'Homestead', multiplier: 1.5 },
    { level: 2, icon: '🏘️', name: 'Village', multiplier: 2.0, shmeckleCost: 3 },
    { level: 3, icon: '🏰', name: 'Fortress', multiplier: 3.0, shmeckleCost: 5 },
];

// Buy costs by tile type (gold)
export const BUY_COSTS: Partial<Record<BoardSpaceType, number>> = {
    gold: 20,
    shmeckles: 30,
    mystery: 40,
    ticket: 50,
    empty: 15,
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

// ── Hazard helpers ─────────────────────────────────────────────
export type HazardType = 'tax' | 'storm' | 'thief';

const HAZARD_CONFIGS: Record<HazardType, { name: string; icon: string }> = {
    tax:   { name: 'Tax Collector', icon: '💰' },
    storm: { name: 'Storm',         icon: '⛈️' },
    thief: { name: 'Thief',         icon: '🗡️' },
};

const pickRandomHazard = (): HazardType => {
    const types: HazardType[] = ['tax', 'storm', 'thief'];
    return types[Math.floor(Math.random() * types.length)];
};

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
                icon: '🪙',
                baseReward: { gold: Math.floor(Math.random() * 5) + 3 },
            };
        }

        // Shmeckles Tiles (2 tiles)
        if (i === 8 || i === 20) {
            space = {
                id: i,
                type: 'shmeckles',
                name: 'Small Shmeckle',
                icon: '🐌',
                baseReward: { shmeckles: Math.floor(Math.random() * 5) + 1 },
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

        // Hazard Tiles (2 tiles — random hazard type each board gen)
        if (i === 6 || i === 18) {
            const hazard = pickRandomHazard();
            const cfg = HAZARD_CONFIGS[hazard];
            space = {
                id: i,
                type: hazard,
                name: cfg.name,
                icon: cfg.icon,
                baseReward: {},
            };
        }

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
    rentCollected: number; // gold collected from owned tiles passed over
    hazardResult?: {
        type: HazardType;
        penalty: number; // gold/shmeckles lost
        message: string;
    };
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
    skipNextTurn: boolean;

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
    getBuyCost: (tileId: number) => number;
    getUpgradeCost: (tileId: number) => number;
    canBuyTile: (tileId: number) => boolean;
    canUpgradeTile: (tileId: number) => boolean;
    getTileMultiplier: (tileId: number) => number;
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
            skipNextTurn: false,

            canRoll: () => {
                const state = get();
                const today = getEasternDateString();

                if (state.lastTicketResetDate !== today) {
                    get().resetDailyTickets();
                }

                if (state.skipNextTurn) return false;

                return state.dailyTickets > 0;
            },

            rollDice: () => {
                const state = get();

                // If skip turn is active, consume it and return 0
                if (state.skipNextTurn) {
                    set({ skipNextTurn: false });
                    return 0;
                }

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

                // Calculate rent from owned tiles passed over
                let rentCollected = 0;
                for (let step = 1; step <= spaces; step++) {
                    const pos = (oldPos + step) % TOTAL_SPACES;
                    const tileOwnership = state.ownedTiles[pos];
                    if (tileOwnership) {
                        const tile = currentBoard[pos];
                        const baseGold = tile.baseReward.gold || 2;
                        const tier = OWNERSHIP_TIERS.find(t => t.level === tileOwnership.level);
                        rentCollected += Math.floor(baseGold * (tier?.multiplier || 1));
                    }
                }

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
                        rentCollected,
                    };
                }

                // Normal movement — no GO pass
                const newPosition = rawNew % TOTAL_SPACES;
                set({ currentPosition: newPosition });

                const landedSpace = currentBoard[newPosition];

                // Handle hazard tiles
                let hazardResult: MoveResult['hazardResult'];
                if (landedSpace.type === 'tax') {
                    const penalty = Math.floor(Math.random() * 11) + 5; // 5–15 gold
                    hazardResult = {
                        type: 'tax',
                        penalty,
                        message: `The Tax Collector takes ${penalty} gold!`,
                    };
                } else if (landedSpace.type === 'storm') {
                    hazardResult = {
                        type: 'storm',
                        penalty: 0,
                        message: 'A storm brews! You must skip your next turn.',
                    };
                    set({ skipNextTurn: true });
                } else if (landedSpace.type === 'thief') {
                    const penalty = Math.floor(Math.random() * 3) + 1; // 1–3 shmeckles
                    hazardResult = {
                        type: 'thief',
                        penalty,
                        message: `A thief steals ${penalty} shmeckle${penalty > 1 ? 's' : ''}!`,
                    };
                }

                return {
                    landedSpace,
                    passedGo: false,
                    goReward: 0,
                    rentCollected,
                    hazardResult,
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
                    skipNextTurn: false,
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
                return 25 + get().lapCount;
            },

            // ── Property Ownership ────────────────────────────────
            getBuyCost: (tileId) => {
                const tile = currentBoard[tileId];
                return BUY_COSTS[tile?.type] || 20;
            },

            getUpgradeCost: (tileId) => {
                const owned = get().ownedTiles[tileId];
                if (!owned || owned.level >= 3) return Infinity;
                const nextTier = OWNERSHIP_TIERS.find(t => t.level === owned.level + 1);
                return nextTier?.shmeckleCost || Infinity;
            },

            canBuyTile: (tileId) => {
                const state = get();
                if (state.ownedTiles[tileId]) return false;
                const tile = currentBoard[tileId];
                if (!tile || tile.type === 'go' || tile.type === 'tax' || tile.type === 'storm' || tile.type === 'thief') return false;
                return true;
            },

            canUpgradeTile: (tileId) => {
                const owned = get().ownedTiles[tileId];
                return !!owned && owned.level < 3;
            },

            getTileMultiplier: (tileId) => {
                const owned = get().ownedTiles[tileId];
                if (!owned) return 1;
                const tier = OWNERSHIP_TIERS.find(t => t.level === owned.level);
                return tier?.multiplier || 1;
            },

            buyTile: (tileId) => {
                const state = get();
                if (!state.canBuyTile(tileId)) return false;
                // Actual gold deduction handled by caller (MonopolyBoard.tsx via useCurrencyStore)
                set(s => ({
                    ownedTiles: { ...s.ownedTiles, [tileId]: { level: 1 } },
                }));
                return true;
            },

            upgradeTile: (tileId) => {
                const state = get();
                if (!state.canUpgradeTile(tileId)) return false;
                // Actual shmeckle deduction handled by caller
                set(s => ({
                    ownedTiles: {
                        ...s.ownedTiles,
                        [tileId]: { level: (s.ownedTiles[tileId]?.level || 1) + 1 },
                    },
                }));
                return true;
            },

            // ── Themed Board Mystery Roll Logic ───────────────────
            rollMysteryBox: (): MysteryRollResult => {
                const roll = Math.random();
                let rarity: BoardRarity = 'common';
                
                // Determine Rarities based on BOARD_ODDS
                if (roll < BOARD_ODDS.ultra_rare) rarity = 'ultra_rare';
                else if (roll < BOARD_ODDS.ultra_rare + BOARD_ODDS.epic) rarity = 'epic';
                else if (roll < BOARD_ODDS.ultra_rare + BOARD_ODDS.epic + BOARD_ODDS.rare) rarity = 'rare';
                else if (roll < BOARD_ODDS.ultra_rare + BOARD_ODDS.epic + BOARD_ODDS.rare + BOARD_ODDS.uncommon) rarity = 'uncommon';
                
                let result: MysteryRollResult = {
                    rarity,
                    reward: {},
                    message: '',
                    isDuplicate: false
                };

                const boardCol = useBoardCollectionStore.getState();

                if (rarity === 'common') {
                    // 1-9 Gold, OR 1 Shmeckle, OR 1 Sigil
                    const pick = Math.floor(Math.random() * 3);
                    if (pick === 0) {
                        result.reward.gold = Math.floor(Math.random() * 9) + 1;
                        result.message = `Found a small pouch of gold! (+${result.reward.gold} Gold)`;
                    } else if (pick === 1) {
                        result.reward.shmeckles = 1;
                        result.message = `Found a tiny Schmeckle! (+1 Schmeckle)`;
                    } else {
                        result.reward.sigils = 1;
                        result.message = `A Sigil appeared! (+1 Sigil)`;
                    }
                } 
                else if (rarity === 'uncommon') {
                    // 2–3 Sigils, 2–3 Schmeckles, or 10–15 Gold
                    const pick = Math.floor(Math.random() * 3);
                    if (pick === 0) {
                        result.reward.sigils = Math.floor(Math.random() * 2) + 2;
                        result.message = `Found a Sigil cache! (+${result.reward.sigils} Sigils)`;
                    } else if (pick === 1) {
                        result.reward.shmeckles = Math.floor(Math.random() * 2) + 2;
                        result.message = `A handful of Schmeckles! (+${result.reward.shmeckles} Schmeckles)`;
                    } else {
                        result.reward.gold = Math.floor(Math.random() * 6) + 10;
                        result.message = `Found a muddy coin purse! (+${result.reward.gold} Gold)`;
                    }
                }
                else if (rarity === 'rare') {
                    const rareItems = ['cow', 'sheep', 'pig', 'chicken'];
                    const drop = rareItems[Math.floor(Math.random() * rareItems.length)];
                    result.reward.petId = `board_farm_${drop}`;
                    result.message = `Found a stray ${drop}!`;
                    
                    if (boardCol.ownedPets.includes(result.reward.petId)) {
                        result.isDuplicate = true;
                        result.reward.gold = 15; // duplicate compensation
                        result.message = `You already own the ${drop}. Converted to 15 Gold.`;
                    } else {
                        boardCol.unlockPet(result.reward.petId);
                    }
                }
                else if (rarity === 'epic') {
                    const epicItems = ['goat', 'duck', 'straw_hat', 'farmer_title'];
                    const drop = epicItems[Math.floor(Math.random() * epicItems.length)];

                    if (drop === 'straw_hat') {
                        result.reward.cosmeticId = 'board_farm_straw_hat';
                        result.message = `Found a nice Straw Hat!`;
                        if (boardCol.ownedCosmetics.includes(result.reward.cosmeticId)) {
                            result.isDuplicate = true;
                            result.reward.gold = 20;
                        } else {
                            boardCol.unlockCosmetic(result.reward.cosmeticId);
                        }
                    } else if (drop === 'farmer_title') {
                        result.reward.titleId = 'board_farm_title';
                        result.message = `Unlocked the "The Farmer" Title!`;
                        if (boardCol.ownedTitles.includes(result.reward.titleId)) {
                            result.isDuplicate = true;
                            result.reward.gold = 20;
                        } else {
                            boardCol.unlockTitle(result.reward.titleId);
                        }
                    } else {
                        result.reward.petId = `board_farm_${drop}`;
                        result.message = `Found a rare ${drop}!`;
                        if (boardCol.ownedPets.includes(result.reward.petId)) {
                            result.isDuplicate = true;
                            result.reward.gold = 20;
                        } else {
                            boardCol.unlockPet(result.reward.petId);
                        }
                    }
                }
                else if (rarity === 'ultra_rare') {
                    // Always Ethereal Cow — 1 in 100,000
                    result.reward.petId = 'board_farm_ethereal_cow';
                    result.message = `🌌✨ UNIVERSE LUCK! Unlocked the ETHEREAL COW! (1 in 100,000)`;
                    if (boardCol.ownedPets.includes(result.reward.petId)) {
                        result.isDuplicate = true;
                        result.reward.gold = 100;
                        result.message = `You already own the Ethereal Cow... +100 Gold (consolation).`;
                    } else {
                        boardCol.unlockPet(result.reward.petId);
                    }
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
