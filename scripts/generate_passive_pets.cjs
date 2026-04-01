const fs = require('fs');

const data = JSON.parse(fs.readFileSync('pet_system_export.json', 'utf-8'));

const getPassive = (name, rarity, originalPassive) => {
    let value = 1;
    let cap = 10;
    let description = '';
    
    if (rarity === 'common') { value = 1; cap = 10; description = `+${value} gold per reward (max ${cap}/day)`; }
    if (rarity === 'uncommon') { value = 2; cap = 12; description = `+${value} gold per reward (max ${cap}/day)`; }
    if (rarity === 'rare') { value = 4; cap = 15; description = `+${value} gold per reward (max ${cap}/day)`; }
    if (rarity === 'epic') { value = 6; cap = 20; description = `+${value} gold per reward (max ${cap}/day)`; }
    if (rarity === 'legendary') { value = 10; cap = 25; description = `+${value} gold per reward (max ${cap}/day)`; }
    if (rarity === 'mythic') { value = 15; cap = 30; description = `+${value} gold per reward (max ${cap}/day)`; }

    // Special cases based on original pasives for Epic/Legendary
    if (originalPassive && originalPassive.name.includes('Cosmic')) {
       return {
         name: originalPassive.name,
         description: `+10 gold per reward (max 25/day), 5% chance to refund shop purchases.`,
         effectType: 'bonus_gold',
         value: 10,
         capPerDay: 25
       }
    }

    return {
        name: (originalPassive && originalPassive.name) ? originalPassive.name : 'Loyal Companion',
        description,
        effectType: 'bonus_gold',
        value,
        capPerDay: cap
    };
};

const iconMap = {
    'pet_cow': '🐮', 'ethereal_cow': '🌌', 'wizard_cow': '🧙🐮', 'highland_archer_cow': '🏹🐮', 'meditating_war_cow': '🧘🐮', 'cow_king': '👑🐮',
    'pet_chicken': '🐔', 'pet_goose': '🪿', 'pet_pig': '🐷', 'pet_sheep': '🐑', 'pet_dog': '🐕', 'pixel_cat': '🐱', 'pet_rabbit': '🐇',
    'war_chicken': '🐔🗡️', 'stoneback_turtle': '🐢🪨', 'shadow_otter': '🦦🌑', 'blood_goose': '🪿🩸', 'pet_porcupine': '🦔',
    'pet_platypus': '🦆', 'pet_giraffe': '🦒', 'pet_raven': '🐦‍⬛', 'pet_rhino': '🦏', 'pet_elephant': '🐘',
    'blue_slime': '💧', 'green_slime': '🌿', 'red_slime': '🔥', 'fairy': '🧚', 'mushroom_sprite': '🍄', 'will_o_wisp': '👻',
    'ancient_owl': '🦉', 'moon_moth': '🦋'
};

// Dedupe by ID in case export had duplicates
const uniquePets = new Map();
data.pets.forEach(p => {
    if (!uniquePets.has(p.id)) uniquePets.set(p.id, p);
});

const petDB = Array.from(uniquePets.values()).map(p => {
    return `    '${p.id}': {
        id: '${p.id}', name: '${p.name.replace(/'/g, "\\'")}', icon: '${iconMap[p.id] || '🐾'}',
        rarity: '${p.rarity || 'common'}', obtainMethod: '${p.obtainMethod || 'other'}',
        passive: ${JSON.stringify(getPassive(p.name, p.rarity, p.passive))}
    }`;
});

const fileStr = `export interface PetPassive {
    name: string;
    description: string;
    effectType: 'bonus_gold' | 'extra_currency_chance' | 'shop_reroll' | 'daily_bonus' | 'refund_chance';
    value: number;
    capPerDay?: number;
}

export type PetRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface PetDefinition {
    id: string;
    name: string;
    icon: string;
    rarity: PetRarity;
    obtainMethod: string;
    passive: PetPassive;
}

export const PET_DATABASE: Record<string, PetDefinition> = {
${petDB.join(',\\n')}
};
`;

fs.writeFileSync('src/data/pets.ts', fileStr);
console.log('Done!');
