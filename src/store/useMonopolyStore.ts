import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { useBoardCollectionStore } from './useBoardCollectionStore';
import { usePetStore } from './usePetStore';

// ── Tile Types ─────────────────────────────────────────────────
export type BoardSpaceType =
    | 'go'
    | 'gold'
    | 'shmeckles'
    | 'mystery'
    | 'ticket'
    | 'empty';

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
    5: { gold: 2000, diamonds: 5 },
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
                    // Common pet tier
                    const rareItems = ['pet_cow', 'pet_chicken', 'pet_pig', 'pet_sheep'];
                    const drop = rareItems[Math.floor(Math.random() * rareItems.length)];
                    result.reward.petId = drop;
                    
                    const displayName = drop.replace('pet_', '').charAt(0).toUpperCase() + drop.replace('pet_', '').slice(1);
                    
                    result.message = `Found a stray ${displayName}!`;
                    usePetStore.getState().addPet(drop);
                    result.isDuplicate = (usePetStore.getState().petQuantities[drop] || 0) > 1;
                }
                else if (rarity === 'epic') {
                    // Uncommon / Rare pet tier
                    const epicItems = ['pet_dog', 'pet_rabbit', 'pet_cat', 'pet_goose', 'straw_hat', 'farmer_title'];
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
                        result.reward.petId = drop;
                        const displayName = drop.replace('pet_', '').charAt(0).toUpperCase() + drop.replace('pet_', '').slice(1);
                        result.message = `Found a rare ${displayName}!`;
                        usePetStore.getState().addPet(drop);
                        result.isDuplicate = (usePetStore.getState().petQuantities[drop] || 0) > 1;
                    }
                }
                else if (rarity === 'ultra_rare') {
                    // Always Ethereal Cow — 1 in 100,000
                    result.reward.petId = 'ethereal_cow';
                    result.message = `🌌✨ UNIVERSE LUCK! Unlocked the ETHEREAL COW! (1 in 100,000)`;
                    usePetStore.getState().addPet('ethereal_cow');
                    result.isDuplicate = (usePetStore.getState().petQuantities['ethereal_cow'] || 0) > 1;
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
