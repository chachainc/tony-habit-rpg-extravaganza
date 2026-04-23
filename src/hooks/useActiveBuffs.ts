import { useState, useEffect } from 'react';
import { useConquestStore } from '../store/useConquestStore';

export interface ActiveBuffs {
    attackPct: number;
    defensePct: number;
    healthPct: number;
    healthFlat: number;
    critPct: number;
    energyPct: number;
    goldGainPct: number;
    healingBonusPct: number;
    chessRewardBonus: number;
    sources: {
        attack: string[];
        defense: string[];
        health: string[];
        crit: string[];
        energy: string[];
        misc: string[];
    };
}

export function useActiveBuffs(): ActiveBuffs {
    const conquestBuffs = useConquestStore(state => state.runBuffs);

    let attackPct = 0;
    let defensePct = 0;
    let healthPct = 0;
    let healthFlat = 0;
    let critPct = 0;
    let energyPct = 0;
    let goldGainPct = 0;
    let healingBonusPct = 0;
    let chessRewardBonus = 0;

    const sources = {
        attack: [] as string[],
        defense: [] as string[],
        health: [] as string[],
        crit: [] as string[],
        energy: [] as string[],
        misc: [] as string[]
    };

    if (conquestBuffs) {
        conquestBuffs.forEach(buff => {
            switch (buff.type) {
                case 'attackPercent':
                case 'strength':
                    attackPct += buff.amount;
                    sources.attack.push(buff.label);
                    break;
                case 'defensePercent':
                case 'defense':
                    defensePct += buff.amount;
                    sources.defense.push(buff.label);
                    break;
                case 'maxHpPercent':
                    healthPct += buff.amount;
                    sources.health.push(buff.label);
                    break;
                case 'maxHpFlat':
                    healthFlat += buff.amount;
                    sources.health.push(buff.label);
                    break;
                case 'critPercent':
                    critPct += buff.amount;
                    sources.crit.push(buff.label);
                    break;
                case 'healingBonusPercent':
                    healingBonusPct += buff.amount;
                    sources.misc.push(buff.label);
                    break;
                case 'goldGainPercent':
                case 'wealth':
                    goldGainPct += buff.amount;
                    sources.misc.push(buff.label);
                    break;
                case 'chessRewardBonus':
                    chessRewardBonus += buff.amount;
                    sources.misc.push(buff.label);
                    break;
            }
        });
    }

    return {
        attackPct,
        defensePct,
        healthPct,
        healthFlat,
        critPct,
        energyPct,
        goldGainPct,
        healingBonusPct,
        chessRewardBonus,
        sources
    };
}
