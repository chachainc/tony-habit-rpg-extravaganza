import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPassiveBonuses } from './usePassiveEffects';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

export interface TowerDefenseState {
    baseHealth: number;
    maxBaseHealth: number;
    currentWave: number;
    isWaveActive: boolean;
    targetEnemies: number;
    enemiesDefeated: number;
    enemiesEscaped: number;
    takeDamage: (amount: number) => void;
    startNextWave: () => void;
    defeatEnemy: () => void;
    enemyEscaped: () => void;
    resetGame: () => void;
}

export const useTowerDefenseStore = create<TowerDefenseState>()(
    persist(
        (set) => ({
            baseHealth: 100,
            maxBaseHealth: 100,
            currentWave: 0,
            isWaveActive: false,
            targetEnemies: 0,
            enemiesDefeated: 0,
            enemiesEscaped: 0,

            takeDamage: (amount: number) => {
                set(state => ({
                    baseHealth: Math.max(0, state.baseHealth - amount)
                }));
            },

            startNextWave: () => {
                set(state => {
                    const nextWave = state.currentWave + 1;
                    let enemies = 5;
                    if (nextWave === 2) enemies = 8;
                    else if (nextWave === 3) enemies = 12;
                    else if (nextWave === 4) enemies = 18;
                    else if (nextWave > 4) enemies = 18 + (nextWave - 4) * 5;

                    return {
                        currentWave: nextWave,
                        isWaveActive: true,
                        targetEnemies: enemies,
                        enemiesDefeated: 0,
                        enemiesEscaped: 0
                    };
                });
            },

            defeatEnemy: () => {
                set(state => {
                    const newDefeated = state.enemiesDefeated + 1;
                    const totalProcessed = newDefeated + state.enemiesEscaped;

                    if (totalProcessed >= state.targetEnemies) {
                        // Wave complete! Grant 1-3 sigils (+ passives)
                        const passives = getPassiveBonuses();
                        const sigils = Math.floor(Math.random() * 3) + 1 + passives.sigil_bonus;
                        import('./useConquestStore').then(({ useConquestStore: cs }) => {
                            cs.getState().addSigils(sigils);
                        });
                        return { enemiesDefeated: newDefeated, isWaveActive: false };
                    }
                    return { enemiesDefeated: newDefeated };
                });
            },

            enemyEscaped: () => {
                set(state => {
                    const newEscaped = state.enemiesEscaped + 1;
                    const totalProcessed = state.enemiesDefeated + newEscaped;

                    if (totalProcessed >= state.targetEnemies) {
                        // Wave complete (even if some escaped)
                        const passives = getPassiveBonuses();
                        const sigils = Math.floor(Math.random() * 3) + 1 + passives.sigil_bonus;
                        import('./useConquestStore').then(({ useConquestStore: cs }) => {
                            cs.getState().addSigils(sigils);
                        });
                        return { enemiesEscaped: newEscaped, isWaveActive: false, baseHealth: Math.max(0, state.baseHealth - 10) };
                    }
                    return { enemiesEscaped: newEscaped, baseHealth: Math.max(0, state.baseHealth - 10) };
                });
            },

            resetGame: () => {
                set({
                    baseHealth: 100,
                    currentWave: 0,
                    isWaveActive: false,
                    targetEnemies: 0,
                    enemiesDefeated: 0,
                    enemiesEscaped: 0
                });
            }
        }),
        {
            name: PERSIST_REGISTRY.towerDefense.persistKey
        }
    )
);
