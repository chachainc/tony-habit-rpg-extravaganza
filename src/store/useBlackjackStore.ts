import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import type { DealerId, ThemeId } from '../data/blackjackContent';

// ── Card / Deck helpers ────────────────────────────────────────
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    suit: Suit;
    rank: Rank;
    value: number; // 1-11 for Ace handling
}

function createDeck(): Card[] {
    const suits: Suit[] = ['♠', '♥', '♦', '♣'];
    const ranks: { rank: Rank; value: number }[] = [
        { rank: 'A', value: 11 }, { rank: '2', value: 2 }, { rank: '3', value: 3 },
        { rank: '4', value: 4 }, { rank: '5', value: 5 }, { rank: '6', value: 6 },
        { rank: '7', value: 7 }, { rank: '8', value: 8 }, { rank: '9', value: 9 },
        { rank: '10', value: 10 }, { rank: 'J', value: 10 }, { rank: 'Q', value: 10 },
        { rank: 'K', value: 10 },
    ];
    const deck: Card[] = [];
    for (const suit of suits) {
        for (const r of ranks) {
            deck.push({ suit, rank: r.rank, value: r.value });
        }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function handValue(cards: Card[]): number {
    let total = cards.reduce((s, c) => s + c.value, 0);
    let aces = cards.filter(c => c.rank === 'A').length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

// ── State ──────────────────────────────────────────────────────
type GamePhase = 'idle' | 'betting' | 'playing' | 'dealer-turn' | 'result';
type GameResult = 'win' | 'lose' | 'push' | 'blackjack' | null;

function getEasternDateString(): string {
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

interface BlackjackState {
    // Casino coins (separate currency, NOT gold)
    casinoCoins: number;
    dailyWinnings: number;
    lastPlayDate: string | null;

    // Game state
    deck: Card[];
    playerHand: Card[];
    dealerHand: Card[];
    currentBet: number;
    phase: GamePhase;
    result: GameResult;
    message: string;

    // Lifetime
    totalHands: number;
    totalWins: number;

    // Progression & Cosmetics
    currentWinStreak: number;
    highestWinStreak: number;
    totalBlackjacks: number;
    unlockedDealers: DealerId[];
    unlockedThemes: ThemeId[];
    selectedDealer: DealerId;
    selectedTheme: ThemeId;

    // Actions
    resetDaily: () => void;
    canPlay: () => boolean;
    addToBet: (amount: number) => boolean;
    clearBet: () => void;
    deal: () => void;
    hit: () => void;
    stand: () => void;
    doubleDown: () => void;
    newHand: () => void;
    cashOut: () => void;
    
    selectDealer: (id: DealerId) => void;
    selectTheme: (id: ThemeId) => void;
}

const MAX_DAILY_WINNINGS = 500;
const DAILY_COINS = 50;

export const useBlackjackStore = create<BlackjackState>()(
    persist(
        (set, get) => ({
            casinoCoins: DAILY_COINS,
            dailyWinnings: 0,
            lastPlayDate: null,

            deck: [],
            playerHand: [],
            dealerHand: [],
            currentBet: 0,
            phase: 'idle',
            result: null,
            message: '',

            totalHands: 0,
            totalWins: 0,
            
            currentWinStreak: 0,
            highestWinStreak: 0,
            totalBlackjacks: 0,
            unlockedDealers: ['classic_cow'],
            unlockedThemes: ['classic_felt'],
            selectedDealer: 'classic_cow',
            selectedTheme: 'classic_felt',

            selectDealer: (id) => set({ selectedDealer: id }),
            selectTheme: (id) => set({ selectedTheme: id }),

            resetDaily: () => {
                const today = getEasternDateString();
                const s = get();
                if (s.lastPlayDate !== today) {
                    set({ casinoCoins: DAILY_COINS, dailyWinnings: 0, lastPlayDate: today, phase: 'idle' });
                }
            },

            canPlay: () => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastPlayDate !== today) return true; // will reset
                return s.casinoCoins >= 5 && s.dailyWinnings < MAX_DAILY_WINNINGS;
            },

            addToBet: (amount) => {
                const s = get();
                const today = getEasternDateString();
                if (s.lastPlayDate !== today) {
                    set({ casinoCoins: DAILY_COINS, dailyWinnings: 0, lastPlayDate: today, currentBet: 0 });
                }
                const currentState = get();
                if (currentState.currentBet + amount > currentState.casinoCoins) return false;
                set({ currentBet: currentState.currentBet + amount });
                return true;
            },

            clearBet: () => set({ currentBet: 0 }),

            deal: () => {
                const s = get();
                const today = getEasternDateString();
                // Auto-reset on new day
                if (s.lastPlayDate !== today) {
                    set({ casinoCoins: DAILY_COINS, dailyWinnings: 0, lastPlayDate: today, currentBet: 0 });
                }
                const state = get();
                if (state.currentBet === 0 || state.currentBet > state.casinoCoins) return;
                if (state.dailyWinnings >= MAX_DAILY_WINNINGS) return;

                const amount = state.currentBet;

                const deck = createDeck();
                const playerHand = [deck.pop()!, deck.pop()!];
                const dealerHand = [deck.pop()!, deck.pop()!];

                // Check natural blackjack
                const pVal = handValue(playerHand);
                if (pVal === 21) {
                    const dVal = handValue(dealerHand);
                    const win = Math.floor(amount * 1.5);
                    if (dVal === 21) {
                        set({
                            deck, playerHand, dealerHand, currentBet: amount,
                            casinoCoins: state.casinoCoins, // push — return bet
                            phase: 'result', result: 'push', message: 'Both Blackjack! Push.',
                            totalHands: state.totalHands + 1, lastPlayDate: today,
                        });
                    } else {
                        const cappedWin = Math.min(win, MAX_DAILY_WINNINGS - state.dailyWinnings);
                        const newStreak = state.currentWinStreak + 1;
                        set({
                            deck, playerHand, dealerHand, currentBet: amount,
                            casinoCoins: state.casinoCoins - amount + amount + cappedWin,
                            dailyWinnings: state.dailyWinnings + cappedWin,
                            phase: 'result', result: 'blackjack', message: `Blackjack! +${cappedWin} coins!`,
                            totalHands: state.totalHands + 1, totalWins: state.totalWins + 1, lastPlayDate: today,
                            currentWinStreak: newStreak, highestWinStreak: Math.max(state.highestWinStreak, newStreak),
                            totalBlackjacks: state.totalBlackjacks + 1
                        });
                    }
                    return;
                }

                set({
                    deck, playerHand, dealerHand, currentBet: amount,
                    casinoCoins: state.casinoCoins - amount,
                    phase: 'playing', result: null, message: '',
                    totalHands: state.totalHands + 1, lastPlayDate: today,
                });
            },

            hit: () => {
                const s = get();
                if (s.phase !== 'playing') return;
                const deck = [...s.deck];
                const playerHand = [...s.playerHand, deck.pop()!];
                const val = handValue(playerHand);
                if (val > 21) {
                    set({
                        deck, playerHand,
                        phase: 'result', result: 'lose', message: `Bust! (${val})`,
                        currentWinStreak: 0
                    });
                } else if (val === 21) {
                    // Auto-stand on 21
                    set({ deck, playerHand });
                    setTimeout(() => get().stand(), 300);
                } else {
                    set({ deck, playerHand });
                }
            },

            stand: () => {
                const s = get();
                if (s.phase !== 'playing') return;

                const deck = [...s.deck];
                let dealerHand = [...s.dealerHand];
                // Dealer draws to 17
                while (handValue(dealerHand) < 17) {
                    dealerHand.push(deck.pop()!);
                }

                const pVal = handValue(s.playerHand);
                const dVal = handValue(dealerHand);

                let result: GameResult;
                let message: string;
                let winnings = 0;

                if (dVal > 21) {
                    result = 'win'; message = `Dealer bust! (${dVal}) You win!`;
                    winnings = s.currentBet;
                } else if (pVal > dVal) {
                    result = 'win'; message = `You win! ${pVal} vs ${dVal}`;
                    winnings = s.currentBet;
                } else if (pVal === dVal) {
                    result = 'push'; message = `Push! ${pVal} vs ${dVal}`;
                    winnings = 0; // bet returned
                } else {
                    result = 'lose'; message = `Dealer wins! ${dVal} vs ${pVal}`;
                }

                const cappedWin = result === 'win'
                    ? Math.min(winnings, MAX_DAILY_WINNINGS - s.dailyWinnings)
                    : 0;
                const coinsBack = result === 'push' ? s.currentBet : (result === 'win' ? s.currentBet + cappedWin : 0);

                const newStreak = result === 'win' ? s.currentWinStreak + 1 : (result === 'push' ? s.currentWinStreak : 0);

                set({
                    deck, dealerHand, phase: 'result', result, message,
                    casinoCoins: s.casinoCoins + coinsBack,
                    dailyWinnings: s.dailyWinnings + cappedWin,
                    totalWins: result === 'win' ? s.totalWins + 1 : s.totalWins,
                    currentWinStreak: newStreak,
                    highestWinStreak: Math.max(s.highestWinStreak, newStreak)
                });
            },

            doubleDown: () => {
                const s = get();
                if (s.phase !== 'playing' || s.playerHand.length !== 2) return;
                if (s.currentBet > s.casinoCoins) return; // can't afford double

                const deck = [...s.deck];
                const playerHand = [...s.playerHand, deck.pop()!];
                const newBet = s.currentBet * 2;

                set({
                    deck, playerHand,
                    casinoCoins: s.casinoCoins - s.currentBet, // deduct extra bet
                    currentBet: newBet,
                });

                const val = handValue(playerHand);
                if (val > 21) {
                    set({
                        phase: 'result', result: 'lose', message: `Bust! (${val})`,
                        currentWinStreak: 0
                    });
                } else {
                    // Auto-stand after double
                    setTimeout(() => get().stand(), 300);
                }
            },

            newHand: () => {
                set({ phase: 'idle', playerHand: [], dealerHand: [], deck: [], currentBet: 0, result: null, message: '' });
            },

            cashOut: () => {
                const s = get();
                if (s.phase === 'result') {
                    set({ phase: 'idle', playerHand: [], dealerHand: [], deck: [], currentBet: 0, result: null, message: '' });
                    return;
                }
                if (s.phase === 'idle') {
                    set({ currentBet: 0 });
                    return;
                }
                
                // If phase is 'playing': return the player's bet (since they haven't busted)
                set({
                    phase: 'idle',
                    casinoCoins: s.casinoCoins + s.currentBet,
                    playerHand: [], dealerHand: [], deck: [],
                    currentBet: 0, result: null, message: 'Cashed out'
                });
            },
        }),
        { 
            name: PERSIST_REGISTRY.blackjack.persistKey,
            version: 2,
            migrate: (persistedState: any, version: number) => {
                const state = { ...persistedState };
                if (version === 0 || version === 1) { 
                    state.currentWinStreak = state.currentWinStreak || 0;
                    state.highestWinStreak = state.highestWinStreak || 0;
                    state.totalBlackjacks = state.totalBlackjacks || 0;
                    state.unlockedDealers = state.unlockedDealers || ['classic_cow'];
                    state.unlockedThemes = state.unlockedThemes || ['classic_felt'];
                    state.selectedDealer = state.selectedDealer || 'classic_cow';
                    state.selectedTheme = state.selectedTheme || 'classic_felt';
                }
                return state as any;
            }
        }
    )
);
