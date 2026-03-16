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

// ── Board Generation (40 spaces perimeter board) ───────────────

const createBoard = (): BoardSpace[] => {
    const board: BoardSpace[] = [];

    // Space 0: GO
    board.push({
        id: 0,
        type: 'go',
        name: 'GO',
        icon: '🏠',
        baseReward: { gold: 25 },
    });

    for (let i = 1; i < 40; i++) {
        let space: BoardSpace = {
            id: i,
            type: 'empty',
            name: 'Grass',
            icon: '🌾',
            baseReward: {},
        };

        // Standard Gold Tiles
        if (i % 6 === 0) {
            space = {
                id: i,
                type: 'gold',
                name: 'Small Coin',
                icon: '🪙',
                baseReward: { gold: Math.floor(Math.random() * 5) + 3 },
            };
        }
        
        // Shmeckles Tiles
        if (i % 11 === 0) {
            space = {
                id: i,
                type: 'shmeckles',
                name: 'Small Shmeckle',
                icon: '🐌',
                baseReward: { shmeckles: Math.floor(Math.random() * 5) + 1 },
            };
        }

        // Mystery / Chest Tiles (Triggers drop tables)
        if (i === 5 || i === 15 || i === 25 || i === 35) {
            space = {
                id: i,
                type: 'mystery',
                name: 'Mystery Crop',
                icon: '🎁',
                baseReward: {},
            };
        }

        // Ticket (Rare)
        if (i === 20) {
            space = {
                id: i,
                type: 'ticket',
                name: 'Lost Ticket',
                icon: '🎫',
                baseReward: { tickets: 1 },
            };
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
    lastLuckRoll: MysteryRollResult | null;
    streakMultiplierActive: boolean;

    // Actions
    rollDice: () => number;
    movePlayer: (spaces: number) => BoardSpace;
    addDailyTickets: (amount: number) => void;
    resetDailyTickets: () => void;
    canRoll: () => boolean;
    setStreakMultiplier: (active: boolean) => void;
    rollMysteryBox: () => MysteryRollResult;
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

                // Check if passed GO (if position wraps around or lands exactly on 0)
                if (state.currentPosition + spaces >= 40) {
                    const goSpace = BOARD[0];
                    return {
                        ...landedSpace,
                        baseReward: {
                            ...landedSpace.baseReward,
                            gold: (landedSpace.baseReward.gold || 0) + (goSpace.baseReward.gold || 0),
                        }
                    };
                }

                return landedSpace;
            },

            addDailyTickets: (amount) => {
                set((state) => ({
                    dailyTickets: state.dailyTickets + amount,
                }));
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
            name: PERSIST_REGISTRY.monopoly.persistKey, // Keep v3 to reuse current tokens if possible, or v4 if breaking
        }
    )
);

export { BOARD };
