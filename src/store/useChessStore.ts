import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AffinityType } from './useAffinitySystem';

export type ChessPlaystyle = 'Magnus' | 'Kasparov' | 'Hikaru' | 'Karpov' | 'Unknown';

export interface ChessBehavior {
    aggressiveScore: number;
    defensiveScore: number;
    positionalScore: number;
    tacticalScore: number;
    trapUsageCount: number;
    speedSolves: number;
    lessonConsistency: number;
}

export interface ChessState {
    // Mastery Tracking
    openingsMastered: string[];
    trapsMastered: string[];
    ladderWins: string[];
    completedStyleLessons: string[]; // Isolated Playstyles history museum progress
    interactiveLessonsMastered: string[]; // For new Interactive Mobile Lesson system
    arenaProgress: Record<string, { highestTierCleared: number; attempts: number; clears: number }>;

    // Behavior Tracking
    behavior: ChessBehavior;

    // Energy System
    energy: number;
    maxEnergy: number;
    lastEnergyTick: number;

    // Actions
    masterOpening: (id: string, stylePoints: Partial<ChessBehavior>) => void;
    masterTrap: (id: string) => void;
    recordLadderWin: (id: string) => void;
    completeStyleLesson: (playerId: string) => void;
    completeInteractiveLesson: (lessonId: string) => void;
    addBehavior: (points: Partial<ChessBehavior>) => void;
    consumeEnergy: (amount: number) => boolean;
    replenishEnergy: (amount: number) => void;
    tickEnergy: () => void;
    recordArenaAttempt: (bossId: string) => void;
    recordArenaClear: (bossId: string, tier: number) => void;

    // Compute
    getPlaystyle: () => ChessPlaystyle;
    getChessAffinity: () => AffinityType | null;
}

export const useChessStore = create<ChessState>()(
    persist(
        (set, get) => ({
            openingsMastered: [],
            trapsMastered: [],
            ladderWins: [],
            completedStyleLessons: [],
            interactiveLessonsMastered: [],
            arenaProgress: {},

            behavior: {
                aggressiveScore: 0,
                defensiveScore: 0,
                positionalScore: 0,
                tacticalScore: 0,
                trapUsageCount: 0,
                speedSolves: 0,
                lessonConsistency: 0,
            },

            energy: 100,
            maxEnergy: 100,
            lastEnergyTick: Date.now(),

            masterOpening: (id, stylePoints) => {
                const state = get();
                if (!state.openingsMastered.includes(id)) {
                    state.addBehavior(stylePoints);
                    set({ openingsMastered: [...state.openingsMastered, id] });
                }
            },

            masterTrap: (id) => {
                const state = get();
                if (!state.trapsMastered.includes(id)) {
                    state.addBehavior({ trapUsageCount: 1, tacticalScore: 2 });
                    set({ trapsMastered: [...state.trapsMastered, id] });
                }
            },

            recordLadderWin: (id) => {
                const state = get();
                if (!state.ladderWins.includes(id)) {
                    set({ ladderWins: [...state.ladderWins, id] });
                }
            },

            completeStyleLesson: (playerId) => {
                const state = get();
                if (!state.completedStyleLessons.includes(playerId)) {
                    set({ completedStyleLessons: [...state.completedStyleLessons, playerId] });
                }
            },

            completeInteractiveLesson: (lessonId) => {
                const state = get();
                if (!state.interactiveLessonsMastered.includes(lessonId)) {
                    set({ interactiveLessonsMastered: [...state.interactiveLessonsMastered, lessonId] });
                }
            },

            addBehavior: (points) => {
                set((state) => ({
                    behavior: {
                        aggressiveScore: state.behavior.aggressiveScore + (points.aggressiveScore || 0),
                        defensiveScore: state.behavior.defensiveScore + (points.defensiveScore || 0),
                        positionalScore: state.behavior.positionalScore + (points.positionalScore || 0),
                        tacticalScore: state.behavior.tacticalScore + (points.tacticalScore || 0),
                        trapUsageCount: state.behavior.trapUsageCount + (points.trapUsageCount || 0),
                        speedSolves: state.behavior.speedSolves + (points.speedSolves || 0),
                        lessonConsistency: state.behavior.lessonConsistency + (points.lessonConsistency || 0),
                    }
                }));
            },

            consumeEnergy: (amount) => {
                const state = get();
                // Ensure we tick before consuming in case we have regen
                state.tickEnergy(); 
                const currentEnergy = get().energy;
                if (currentEnergy >= amount) {
                    set({ energy: currentEnergy - amount });
                    return true;
                }
                return false;
            },

            replenishEnergy: (amount) => {
                set((state) => ({ energy: Math.min(state.maxEnergy, state.energy + amount) }));
            },

            recordArenaAttempt: (bossId) => {
                set((state) => {
                    const current = state.arenaProgress[bossId] || { highestTierCleared: 0, attempts: 0, clears: 0 };
                    return {
                        arenaProgress: {
                            ...state.arenaProgress,
                            [bossId]: { ...current, attempts: current.attempts + 1 }
                        }
                    };
                });
            },

            recordArenaClear: (bossId, tier) => {
                set((state) => {
                    const current = state.arenaProgress[bossId] || { highestTierCleared: 0, attempts: 0, clears: 0 };
                    return {
                        arenaProgress: {
                            ...state.arenaProgress,
                            [bossId]: { 
                                ...current, 
                                clears: current.clears + 1,
                                highestTierCleared: Math.max(current.highestTierCleared, tier)
                            }
                        }
                    };
                });
            },

            tickEnergy: () => {
                const state = get();
                const now = Date.now();
                // 1 energy every 3 minutes
                const MS_PER_ENERGY = 3 * 60 * 1000;
                const elapsed = now - state.lastEnergyTick;
                
                if (elapsed >= MS_PER_ENERGY) {
                    const ticks = Math.floor(elapsed / MS_PER_ENERGY);
                    const newEnergy = Math.min(state.maxEnergy, state.energy + ticks);
                    set({ 
                        energy: newEnergy, 
                        lastEnergyTick: state.lastEnergyTick + (ticks * MS_PER_ENERGY) 
                    });
                }
            },

            getPlaystyle: () => {
                const { aggressiveScore, defensiveScore, positionalScore, tacticalScore, speedSolves } = get().behavior;
                
                // Very basic heuristic
                let maxLabel: ChessPlaystyle = 'Unknown';
                let maxScore = 0;

                // Magnus (Positional / Consistent)
                if (positionalScore > maxScore) { maxScore = positionalScore; maxLabel = 'Magnus'; }
                
                // Kasparov (Aggressive)
                if (aggressiveScore > maxScore) { maxScore = aggressiveScore; maxLabel = 'Kasparov'; }
                
                // Hikaru (Tactical / Speed)
                const hikaruScore = tacticalScore + Math.floor(speedSolves / 2);
                if (hikaruScore > maxScore) { maxScore = hikaruScore; maxLabel = 'Hikaru'; }

                // Karpov (Defensive)
                if (defensiveScore > maxScore) { maxScore = defensiveScore; maxLabel = 'Karpov'; }

                if (maxScore === 0) return 'Unknown';
                return maxLabel;
            },

            getChessAffinity: () => {
                const ps = get().getPlaystyle();
                if (ps === 'Kasparov') return 'fire'; // Aggressive -> Fire
                if (ps === 'Karpov') return 'ice';    // Defensive -> Ice
                if (ps === 'Hikaru') return 'shadow'; // Tactical -> Shadow
                if (ps === 'Magnus') return 'economy';// Positional -> Economy
                return null;
            }
        }),
        {
            name: 'gl-chess-store',
        }
    )
);
