import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { AffinityType } from './useAffinitySystem';

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
    addBehavior: (points: Partial<ChessBehavior>) => void;
    consumeEnergy: (amount: number) => boolean;
    tickEnergy: () => void;

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
