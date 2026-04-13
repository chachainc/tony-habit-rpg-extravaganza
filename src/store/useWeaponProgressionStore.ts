import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WeaponMetrics {
    enemiesKilled?: number;
    critsHits?: number; // Void Dagger / Abyss Render
    diceRolled?: number; // Diceblade / Chaos Edge
    chilledEnemiesApplied?: number; // Glacial Hammer / Frost Titan Breaker
    burnDamageDealt?: number; // Moltenblade / Infernal Coreblade
}

interface WeaponProgressionState {
    weaponMetrics: Record<string, WeaponMetrics>;
    incrementMetric: (weaponId: string, metric: keyof WeaponMetrics, amount?: number) => void;
    getMetric: (weaponId: string, metric: keyof WeaponMetrics) => number;
}

export const useWeaponProgressionStore = create<WeaponProgressionState>()(
    persist(
        (set, get) => ({
            weaponMetrics: {},

            incrementMetric: (weaponId: string, metric: keyof WeaponMetrics, amount: number = 1) => {
                set(state => {
                    const currentMetrics = state.weaponMetrics[weaponId] || {};
                    const currentValue = currentMetrics[metric] || 0;
                    return {
                        weaponMetrics: {
                            ...state.weaponMetrics,
                            [weaponId]: {
                                ...currentMetrics,
                                [metric]: currentValue + amount
                            }
                        }
                    };
                });
            },

            getMetric: (weaponId: string, metric: keyof WeaponMetrics) => {
                const metrics = get().weaponMetrics[weaponId];
                return metrics ? (metrics[metric] || 0) : 0;
            }
        }),
        {
            name: 'gl-weapon-progression-v1',
        }
    )
);
