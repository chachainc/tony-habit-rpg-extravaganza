const fs = require('fs');

const fileContent = `import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Pet Ability Types ──────────────────────────────────────────
export type AbilityScalingStat = 'Strength' | 'Cardio' | 'Flexibility' | 'Sleep' | 'Hygiene' | 'Intelligence';
export type AbilityType = 'damage' | 'heal' | 'buff_atk' | 'buff_def' | 'debuff_def' | 'extra_damage' | 'reduce_damage';
export type PetElementType = 'Fire' | 'Water' | 'Nature' | 'Earth' | 'Air' | 'Shadow';

export interface PetAbility {
    id: string;
    name: string;
    icon: string;
    description: string;
    cooldown: number;
    type: AbilityType;
    baseDamage?: number;
    scalingStat?: AbilityScalingStat;
    scalingFactor?: number;
    buffValue?: number;
    buffDuration?: number;
    healBase?: number;
    healScaling?: number;
}

export interface PetPassive {
    id: string;
    name: string;
    description: string;
    icon: string;
    effect: {
        type: 'gold_gain' | 'attack_speed' | 'dodge_chance' | 'resource_gain' | 'xp_bonus' | 'crit_chance' | 'turn_speed' | 'attack_bonus' | 'defense_bonus';
        value: number; // Flat % like 3 or 5
    };
}

export interface PetDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    type: PetElementType;
    hp: number;
    attack: number;
    defense: number;
    attackSpeed: number;
    role: 'Tank' | 'Tank-lite' | 'DPS' | 'Fast DPS' | 'Fast' | 'Speed' | 'Balanced' | 'Support';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    
    abilities: [PetAbility, PetAbility];
    passive: PetPassive;
}

// Helper to grant generic abilities
const getAbilities = (type) => {
    switch(type) {
        case 'Earth': return [
            { id: 'tackle', name: 'Tackle', icon: '💥', description: 'Deals basic damage.', cooldown: 2, type: 'damage', baseDamage: 12 },
            { id: 'harden', name: 'Harden', icon: '🛡️', description: 'Reduces damage by 20% for 2 turns.', cooldown: 4, type: 'reduce_damage', buffValue: 20, buffDuration: 2 }
        ];
        case 'Air': return [
            { id: 'peck', name: 'Peck', icon: '🦅', description: 'Quick strike.', cooldown: 1, type: 'damage', baseDamage: 8 },
            { id: 'tailwind', name: 'Tailwind', icon: '💨', description: 'Boosts attack speed temporarily (flavor only).', cooldown: 3, type: 'buff_atk', buffValue: 5, buffDuration: 2 }
        ];
        case 'Nature': return [
            { id: 'vine_whip', name: 'Vine Whip', icon: '🌿', description: 'Whips the enemy.', cooldown: 2, type: 'damage', baseDamage: 10 },
            { id: 'synthesis', name: 'Synthesis', icon: '✨', description: 'Heals 25 HP.', cooldown: 5, type: 'heal', healBase: 25 }
        ];
        case 'Water': return [
            { id: 'water_gun', name: 'Water Gun', icon: '💧', description: 'Shoots water.', cooldown: 2, type: 'damage', baseDamage: 11 },
            { id: 'bubble', name: 'Bubble', icon: '🫧', description: 'Lowers enemy defense slightly.', cooldown: 3, type: 'debuff_def', buffValue: 10, buffDuration: 2 }
        ];
        case 'Shadow': return [
            { id: 'scratch', name: 'Scratch', icon: '🐾', description: 'Sharp claws.', cooldown: 1, type: 'damage', baseDamage: 9 },
            { id: 'shadow_sneak', name: 'Shadow Sneak', icon: '🌑', description: 'Deals 15 damage.', cooldown: 3, type: 'damage', baseDamage: 15 }
        ];
        case 'Fire': return [
            { id: 'ember', name: 'Ember', icon: '🔥', description: 'Burns the enemy.', cooldown: 2, type: 'damage', baseDamage: 12 },
            { id: 'roar', name: 'Roar', icon: '🗣️', description: 'Boosts attack by 20%.', cooldown: 5, type: 'buff_atk', buffValue: 20, buffDuration: 2 }
        ];
        default: return [
            { id: 'tackle', name: 'Tackle', icon: '💥', description: 'Tackle.', cooldown: 2, type: 'damage', baseDamage: 10 },
            { id: 'heal', name: 'Heal', icon: '💖', description: 'Heals.', cooldown: 4, type: 'heal', healBase: 20 }
        ];
    }
};

export const PET_DATABASE: Record<string, PetDefinition> = {
    // ── FARM / MONOPOLY PETS (BEGINNER TIER) ──
    'pet_cow': {
        id: 'pet_cow', name: 'Cow', icon: '🐮', description: 'A sturdy Earth companion.',
        type: 'Earth', rarity: 'common', role: 'Tank-lite',
        hp: 90, attack: 10, defense: 12, attackSpeed: 0.9,
        passive: { id: 'p_cow', name: 'Gold Finder', icon: '🪙', description: '+3% Gold Gain', effect: { type: 'gold_gain', value: 3 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    },
    'pet_chicken': {
        id: 'pet_chicken', name: 'Chicken', icon: '🐔', description: 'A fast Air companion.',
        type: 'Air', rarity: 'common', role: 'Fast',
        hp: 70, attack: 11, defense: 8, attackSpeed: 1.3,
        passive: { id: 'p_chicken', name: 'Quick Beak', icon: '⚡', description: '+3% Attack Speed', effect: { type: 'attack_speed', value: 3 } },
        abilities: getAbilities('Air') as [PetAbility, PetAbility]
    },
    'pet_goose': {
        id: 'pet_goose', name: 'Goose', icon: '🪿', description: 'An aggressive Air companion.',
        type: 'Air', rarity: 'rare', role: 'Fast DPS',
        hp: 80, attack: 13, defense: 9, attackSpeed: 1.35,
        passive: { id: 'p_goose', name: 'Evasive Wing', icon: '💨', description: '+5% Dodge Chance', effect: { type: 'dodge_chance', value: 5 } },
        abilities: getAbilities('Air') as [PetAbility, PetAbility]
    },
    'pet_pig': {
        id: 'pet_pig', name: 'Pig', icon: '🐷', description: 'A tanky Earth companion.',
        type: 'Earth', rarity: 'common', role: 'Tank',
        hp: 100, attack: 9, defense: 13, attackSpeed: 0.8,
        passive: { id: 'p_pig', name: 'Truffle Snout', icon: '🍄', description: '+3% Resource Gain', effect: { type: 'resource_gain', value: 3 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    },
    'pet_sheep': {
        id: 'pet_sheep', name: 'Sheep', icon: '🐑', description: 'A supportive Nature companion.',
        type: 'Nature', rarity: 'common', role: 'Support',
        hp: 85, attack: 9, defense: 10, attackSpeed: 1.0,
        passive: { id: 'p_sheep', name: 'Cozy Fleece', icon: '✨', description: '+3% XP Gain', effect: { type: 'xp_bonus', value: 3 } },
        abilities: getAbilities('Nature') as [PetAbility, PetAbility]
    },
    'pet_dog': {
        id: 'pet_dog', name: 'Dog', icon: '🐕', description: 'A balanced Nature companion.',
        type: 'Nature', rarity: 'uncommon', role: 'Balanced',
        hp: 85, attack: 12, defense: 10, attackSpeed: 1.2,
        passive: { id: 'p_dog', name: 'Loyal Companion', icon: '❤️', description: '+5% XP Gain', effect: { type: 'xp_bonus', value: 5 } },
        abilities: getAbilities('Nature') as [PetAbility, PetAbility]
    },
    'pixel_cat': {
        id: 'pixel_cat', name: 'Cat', icon: '🐱', description: 'A sharp Shadow companion.',
        type: 'Shadow', rarity: 'rare', role: 'Fast DPS',
        hp: 70, attack: 14, defense: 7, attackSpeed: 1.4,
        passive: { id: 'p_cat', name: 'Night Eye', icon: '👁️', description: '+6% Crit Chance', effect: { type: 'crit_chance', value: 6 } },
        abilities: getAbilities('Shadow') as [PetAbility, PetAbility]
    },
    'pet_rabbit': {
        id: 'pet_rabbit', name: 'Rabbit', icon: '🐇', description: 'A speedy Nature companion.',
        type: 'Nature', rarity: 'uncommon', role: 'Speed',
        hp: 65, attack: 10, defense: 8, attackSpeed: 1.5,
        passive: { id: 'p_rabbit', name: 'Agile Hop', icon: '⚡', description: '+5% Turn Speed Advantage', effect: { type: 'turn_speed', value: 5 } },
        abilities: getAbilities('Nature') as [PetAbility, PetAbility]
    },
    // ── WILD / CATCH MODE PETS (MID TIER) ──
    'war_chicken': {
        id: 'war_chicken', name: 'War Chicken', icon: '🐔🗡️', description: 'A fiery battle-ready fowl.',
        type: 'Fire', rarity: 'uncommon', role: 'DPS',
        hp: 85, attack: 15, defense: 9, attackSpeed: 1.3,
        passive: { id: 'p_war_chicken', name: 'Burning Rage', icon: '🔥', description: '+6% Attack', effect: { type: 'attack_bonus', value: 6 } },
        abilities: getAbilities('Fire') as [PetAbility, PetAbility]
    },
    'stoneback_turtle': {
        id: 'stoneback_turtle', name: 'Stoneback Turtle', icon: '🐢🪨', description: 'An Earth turtle with a rock-solid shell.',
        type: 'Earth', rarity: 'rare', role: 'Tank',
        hp: 120, attack: 12, defense: 18, attackSpeed: 0.7,
        passive: { id: 'p_turtle', name: 'Stone Shell', icon: '🪨', description: '+8% Defense', effect: { type: 'defense_bonus', value: 8 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    },
    'shadow_otter': {
        id: 'shadow_otter', name: 'Shadow Otter', icon: '🦦🌑', description: 'A shadowy water trickster.',
        type: 'Water', rarity: 'rare', role: 'Balanced',
        hp: 90, attack: 14, defense: 10, attackSpeed: 1.4,
        passive: { id: 'p_otter', name: 'Deep Diver', icon: '🌊', description: '+7% Resource Gain', effect: { type: 'resource_gain', value: 7 } },
        abilities: getAbilities('Water') as [PetAbility, PetAbility]
    },
    'blood_goose': {
        id: 'blood_goose', name: 'Blood Goose', icon: '🪿🩸', description: 'A terrifying shadowy predator.',
        type: 'Shadow', rarity: 'rare', role: 'DPS', // Treating Rare+ as rare for now, or epic
        hp: 95, attack: 16, defense: 9, attackSpeed: 1.35,
        passive: { id: 'p_blood_goose', name: 'Bloodlust', icon: '🩸', description: '+8% Crit Chance', effect: { type: 'crit_chance', value: 8 } },
        abilities: getAbilities('Shadow') as [PetAbility, PetAbility]
    },
    // ── SHOP PETS (PREMIUM TIER) ──
    'pet_porcupine': {
        id: 'pet_porcupine', name: 'Porcupine', icon: '🦔', description: 'An Earth guardian covered in quills.',
        type: 'Earth', rarity: 'uncommon', role: 'Tank',
        hp: 105, attack: 12, defense: 15, attackSpeed: 0.9,
        passive: { id: 'p_porcupine', name: 'Spiky Defense', icon: '🪡', description: '+7% Defense', effect: { type: 'defense_bonus', value: 7 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    },
    'pet_platypus': {
        id: 'pet_platypus', name: 'Platypus', icon: '🦆', description: 'A highly adaptable Water creature.',
        type: 'Water', rarity: 'uncommon', role: 'Balanced',
        hp: 95, attack: 13, defense: 11, attackSpeed: 1.2,
        passive: { id: 'p_platypus', name: 'Treasure Hunter', icon: '💎', description: '+7% Resource Gain', effect: { type: 'resource_gain', value: 7 } },
        abilities: getAbilities('Water') as [PetAbility, PetAbility]
    },
    'pet_giraffe': {
        id: 'pet_giraffe', name: 'Giraffe', icon: '🦒', description: 'A tall Nature companion that sees all.',
        type: 'Nature', rarity: 'rare', role: 'Balanced',
        hp: 110, attack: 14, defense: 12, attackSpeed: 1.1,
        passive: { id: 'p_giraffe', name: 'High Vantage', icon: '👁️', description: '+9% XP Gain', effect: { type: 'xp_bonus', value: 9 } },
        abilities: getAbilities('Nature') as [PetAbility, PetAbility]
    },
    'pet_raven': {
        id: 'pet_raven', name: 'Raven', icon: '🐦‍⬛', description: 'A swift Shadow bird.',
        type: 'Shadow', rarity: 'rare', role: 'Fast DPS',
        hp: 85, attack: 17, defense: 9, attackSpeed: 1.5,
        passive: { id: 'p_raven', name: 'Dark Flight', icon: '🌑', description: '+10% Crit Chance', effect: { type: 'crit_chance', value: 10 } },
        abilities: getAbilities('Shadow') as [PetAbility, PetAbility]
    },
    'pet_rhino': {
        id: 'pet_rhino', name: 'Rhino', icon: '🦏', description: 'A massive Earth juggernaut.',
        type: 'Earth', rarity: 'epic', role: 'Tank',
        hp: 135, attack: 16, defense: 19, attackSpeed: 0.8,
        passive: { id: 'p_rhino', name: 'Thick Skin', icon: '🛡️', description: '+12% Defense', effect: { type: 'defense_bonus', value: 12 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    },
    'pet_elephant': {
        id: 'pet_elephant', name: 'Elephant', icon: '🐘', description: 'An ancient Earth behemoth.',
        type: 'Earth', rarity: 'epic', role: 'Tank',
        hp: 140, attack: 18, defense: 20, attackSpeed: 0.7,
        passive: { id: 'p_elephant', name: 'Golden Ivory', icon: '🪙', description: '+12% Gold Gain', effect: { type: 'gold_gain', value: 12 } },
        abilities: getAbilities('Earth') as [PetAbility, PetAbility]
    }
};

export interface PetState {
    ownedPets: string[];       
    petQuantities: Record<string, number>; 
    equippedPetId: string | null;
    
    addPet: (petId: string) => void;
    equipPet: (petId: string) => void;
    unequipPet: () => void;
}

export const usePetStore = create<PetState>()(
    persist(
        (set, get) => ({
            ownedPets: ['pet_cow'], // Default starter
            petQuantities: { 'pet_cow': 1 },
            equippedPetId: null,

            addPet: (petId) => {
                const s = get();
                const currentQty = s.petQuantities[petId] || 0;
                set({
                    ownedPets: currentQty === 0 ? [...s.ownedPets, petId] : s.ownedPets,
                    petQuantities: { ...s.petQuantities, [petId]: currentQty + 1 }
                });
            },

            equipPet: (petId) => set({ equippedPetId: petId }),
            unequipPet: () => set({ equippedPetId: null })
        }),
        { name: PERSIST_REGISTRY.pets.persistKey }
    )
);
`;

fs.writeFileSync('src/store/usePetStore.ts', fileContent, 'utf8');
console.log('Successfully wrote src/store/usePetStore.ts');
