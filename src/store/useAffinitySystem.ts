export type AffinityType = 'fire' | 'ice' | 'shadow' | 'economy' | 'luck' | 'neutral';
import { useChessStore } from './useChessStore';

export interface AffinityLoadout {
    petAffinity?: AffinityType;
    weaponAffinity?: AffinityType;
    spellAffinity?: AffinityType;
    armorAffinities?: AffinityType[];
    armorItemIds?: string[];
}

export type CrossCombo = 'hellfire' | 'shatter' | 'jackpot' | null;

export interface AffinitySynergyResult {
    majorAffinity: AffinityType | null;
    matchCount: number;
    majorBonusMultiplier: number;
    armorMatchCount: number;
    armorBonus: number;
    crossCombo: CrossCombo;
    dominantTaskAffinity: AffinityType | null;
    summaryLabel: string;
    frostboundSetCount: number;
}

export const determineDominantTaskAffinity = (recentTasks: { type: string, category: string }[]): AffinityType | null => {
    // Fire: Strength, Cardio, workouts
    // Ice: Sleep, Hygiene, Recovery
    // Shadow: Deep focus, Isolation tasks, Mental work (Intelligence)
    // Economy: Budget tracking, Money logging
    // Luck: Streak-based behaviors ONLY
    
    // We will pass an array of task category strings or skill names
    // Fallback simple mock for now until we define how tasks pass in here
    const scores: Record<AffinityType, number> = {
        fire: 0,
        ice: 0,
        shadow: 0,
        economy: 0,
        luck: 0,
        neutral: 0
    };

    for (const t of recentTasks) {
        if (['Strength', 'Cardio', 'Health'].includes(t.category)) scores.fire++;
        else if (['Sleep', 'Hygiene'].includes(t.category)) scores.ice++;
        else if (['Intelligence', 'Work', 'deep_work'].includes(t.category)) scores.shadow++; // We will map Work to Economy below if budget
        else if (['budget', 'money', 'economy', 'finance'].includes(t.category)) scores.economy++;
        else if (['streak', 'luck'].includes(t.category)) scores.luck++;
    }

    let dominant: AffinityType | null = null;
    let max = 0;

    for (const [aff, num] of Object.entries(scores)) {
        if (num > max && aff !== 'neutral') {
            max = num;
            dominant = aff as AffinityType;
        }
    }

    return dominant;
};

export const calculateAffinitySynergy = (
    loadout: AffinityLoadout,
    recentTasks: { type: string, category: string }[] = []
): AffinitySynergyResult => {
    
    // 1. Calculate Dominant Task Affinity
    const dominantTaskAffinity = determineDominantTaskAffinity(recentTasks);

    // 2. Count Major Sources (Pet, Weapon, Spell, Chess Mastery)
    const chessAffinity = useChessStore.getState().getChessAffinity();
    const majors = [loadout.petAffinity, loadout.weaponAffinity, loadout.spellAffinity, chessAffinity].filter(Boolean) as AffinityType[];
    
    // Which affinity shows up most among majors? (Exclude neutral)
    const majorScores: Record<AffinityType, number> = { fire: 0, ice: 0, shadow: 0, economy: 0, luck: 0, neutral: 0 };
    for (const a of majors) {
        majorScores[a]++;
    }

    let majorAffinity: AffinityType | null = null;
    let matchCount = 0;

    for (const [aff, num] of Object.entries(majorScores)) {
        if (aff !== 'neutral' && num >= matchCount) {
            matchCount = num;
            majorAffinity = aff as AffinityType;
        }
    }

    // 3. Major Synergy Math
    let majorBonusMultiplier = 0;
    if (matchCount === 2) majorBonusMultiplier = 0.10;
    else if (matchCount === 3) majorBonusMultiplier = 0.25;

    // 4. Armor Stacking Math
    let armorMatchCount = 0;
    if (majorAffinity && loadout.armorAffinities) {
        armorMatchCount = loadout.armorAffinities.filter(a => a === majorAffinity).length;
    }
    // +1% per piece, max 5%
    let armorBonus = Math.min(0.05, armorMatchCount * 0.01);

    // 5. Cross Combos
    let crossCombo: CrossCombo = null;
    const allLoadoutAffinities = new Set([...majors, ...(loadout.armorAffinities || [])]);
    
    if (allLoadoutAffinities.has('fire') && allLoadoutAffinities.has('shadow')) {
        crossCombo = 'hellfire';
    } else if (allLoadoutAffinities.has('ice') && allLoadoutAffinities.has('luck')) {
        crossCombo = 'shatter';
    } else if (allLoadoutAffinities.has('economy') && allLoadoutAffinities.has('luck')) {
        crossCombo = 'jackpot';
    }

    // 6. Set Bonuses
    let frostboundSetCount = 0;
    if (loadout.armorItemIds) {
        frostboundSetCount = loadout.armorItemIds.filter(id => id && id.startsWith('frostbound_')).length;
    }

    // 7. Summary Label
    let summaryLabel = 'No Synergy';
    if (matchCount > 0 && majorAffinity) {
        summaryLabel = `${matchCount}/3 ${majorAffinity.toUpperCase()} Synergy`;
    }

    return {
        majorAffinity,
        matchCount,
        majorBonusMultiplier,
        armorMatchCount,
        armorBonus,
        crossCombo,
        dominantTaskAffinity,
        summaryLabel,
        frostboundSetCount
    };
};
