// ── Pet image assets (imported here so PET_DATABASE is the single truth source) ──
import petCowSpinImg from '../assets/pets/pet_cow_spin.jpg';
import wizardCowImg from '../assets/pets/wizard_cow.jpg';
import archerCowImg from '../assets/pets/archer_cow.jpg';
import warCowImg from '../assets/pets/war_cow.jpg';
import cowKingImg from '../assets/pets/cow_king.png';
import etherealCowImg from '../assets/pets/ethereal_cow.png';
import petChickenImg from '../assets/pets/pet_chicken_spin.jpg';
import petGooseImg from '../assets/pets/pet_goose_spin.jpg';
import petPigImg from '../assets/pets/pet_pig_spin.jpg';
import petSheepImg from '../assets/pets/pet_sheep_spin.jpg';
import petDogImg from '../assets/pets/pet_dog_spin.jpg';
import petCatImg from '../assets/pets/pet_cat_spin.jpg';
import petRabbitImg from '../assets/pets/pet_rabbit_spin.jpg';
import petPorcupineImg from '../assets/pets/pet_porcupine.jpg';
import petPlatypusImg from '../assets/pets/pet_platypus.jpg';
import petGiraffeImg from '../assets/pets/pet_giraffe.jpg';
import petRavenImg from '../assets/pets/pet_raven.jpg';
import petRhinoImg from '../assets/pets/pet_rhino.jpg';
import petElephantImg from '../assets/pets/pet_elephant.jpg';
import petBearImg from '../assets/pets/pet_bear.jpg';

export interface PetPassive {
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
    /** Emoji used for combat display and identity badges */
    icon: string;
    /** Optional image asset — used in shop, loadout, All Pets. Falls back to icon if absent. */
    image?: string;
    rarity: PetRarity;
    obtainMethod: string;
    passive: PetPassive;
}

export const PET_DATABASE: Record<string, PetDefinition> = {
    'pet_cow': {
        id: 'pet_cow', name: 'Cow', icon: '🐮', image: petCowSpinImg,
        rarity: 'common', obtainMethod: 'shop_purchase',
        passive: { name: 'Gold Finder', description: '+1 gold per reward (max 10/day)', effectType: 'bonus_gold', value: 1, capPerDay: 10 }
    },
    'ethereal_cow': {
        id: 'ethereal_cow', name: 'Ethereal Cow', icon: '🌌', image: etherealCowImg,
        rarity: 'legendary', obtainMethod: 'jackpot',
        passive: { name: 'Cosmic Blessing', description: '+10 gold per reward (max 25/day), 5% chance to refund shop purchases.', effectType: 'bonus_gold', value: 10, capPerDay: 25 }
    },
    'wizard_cow': {
        id: 'wizard_cow', name: 'Wizard Cow', icon: '🧙🐮', image: wizardCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Arcane Foraging', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'highland_archer_cow': {
        id: 'highland_archer_cow', name: 'Highland Archer Cow', icon: '🏹🐮', image: archerCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Swift Draw', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'meditating_war_cow': {
        id: 'meditating_war_cow', name: 'Meditating War Cow', icon: '🧘🐮', image: warCowImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Zen Mind', description: '+6 gold per reward (max 20/day)', effectType: 'bonus_gold', value: 6, capPerDay: 20 }
    },
    'cow_king': {
        id: 'cow_king', name: 'Cow King', icon: '👑🐮', image: cowKingImg,
        rarity: 'legendary', obtainMethod: 'other',
        passive: { name: 'Royal Bounty', description: '+10 gold per reward (max 25/day)', effectType: 'bonus_gold', value: 10, capPerDay: 25 }
    },
    'pet_chicken': {
        id: 'pet_chicken', name: 'Chicken', icon: '🐔', image: petChickenImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Quick Beak', description: '+1 gold per reward (max 10/day)', effectType: 'bonus_gold', value: 1, capPerDay: 10 }
    },
    'pet_goose': {
        id: 'pet_goose', name: 'Goose', icon: '🪿', image: petGooseImg,
        rarity: 'rare', obtainMethod: 'board_drop',
        passive: { name: 'Evasive Wing', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'pet_pig': {
        id: 'pet_pig', name: 'Pig', icon: '🐷', image: petPigImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Truffle Snout', description: '+1 gold per reward (max 10/day)', effectType: 'bonus_gold', value: 1, capPerDay: 10 }
    },
    'pet_sheep': {
        id: 'pet_sheep', name: 'Sheep', icon: '🐑', image: petSheepImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Cozy Fleece', description: '+1 gold per reward (max 10/day)', effectType: 'bonus_gold', value: 1, capPerDay: 10 }
    },
    'pet_dog': {
        id: 'pet_dog', name: 'Dog', icon: '🐕', image: petDogImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Loyal Companion', description: '+2 gold per reward (max 12/day)', effectType: 'bonus_gold', value: 2, capPerDay: 12 }
    },
    'pixel_cat': {
        id: 'pixel_cat', name: 'Cat', icon: '🐱', image: petCatImg,
        rarity: 'rare', obtainMethod: 'daily_spin',
        passive: { name: 'Night Eye', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'pet_rabbit': {
        id: 'pet_rabbit', name: 'Rabbit', icon: '🐇', image: petRabbitImg,
        rarity: 'uncommon', obtainMethod: 'board_drop',
        passive: { name: 'Agile Hop', description: '+2 gold per reward (max 12/day)', effectType: 'bonus_gold', value: 2, capPerDay: 12 }
    },
    'war_chicken': {
        id: 'war_chicken', name: 'War Chicken', icon: '🐔🗡️',
        rarity: 'uncommon', obtainMethod: 'catch',
        passive: { name: 'Burning Rage', description: '+2 gold per reward (max 12/day)', effectType: 'bonus_gold', value: 2, capPerDay: 12 }
    },
    'stoneback_turtle': {
        id: 'stoneback_turtle', name: 'Stoneback Turtle', icon: '🐢🪨',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Stone Shell', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'shadow_otter': {
        id: 'shadow_otter', name: 'Shadow Otter', icon: '🦦🌑',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Deep Diver', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'blood_goose': {
        id: 'blood_goose', name: 'Blood Goose', icon: '🪿🩸',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Bloodlust', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'pet_porcupine': {
        id: 'pet_porcupine', name: 'Porcupine', icon: '🦔', image: petPorcupineImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Spiky Defense', description: '+2 gold per reward (max 12/day)', effectType: 'bonus_gold', value: 2, capPerDay: 12 }
    },
    'pet_platypus': {
        id: 'pet_platypus', name: 'Platypus', icon: '🦆', image: petPlatypusImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Treasure Hunter', description: '+2 gold per reward (max 12/day)', effectType: 'bonus_gold', value: 2, capPerDay: 12 }
    },
    'pet_giraffe': {
        id: 'pet_giraffe', name: 'Giraffe', icon: '🦒', image: petGiraffeImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'High Vantage', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'pet_raven': {
        id: 'pet_raven', name: 'Raven', icon: '🐦‍⬛', image: petRavenImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Dark Flight', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'pet_rhino': {
        id: 'pet_rhino', name: 'Rhino', icon: '🦏', image: petRhinoImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Thick Skin', description: '+6 gold per reward (max 20/day)', effectType: 'bonus_gold', value: 6, capPerDay: 20 }
    },
    'pet_elephant': {
        id: 'pet_elephant', name: 'Elephant', icon: '🐘', image: petElephantImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Golden Ivory', description: '+6 gold per reward (max 20/day)', effectType: 'bonus_gold', value: 6, capPerDay: 20 }
    },
    'pet_bear': {
        id: 'pet_bear', name: 'Bear', icon: '🐻', image: petBearImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Grizzly Guard', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'cyber_dog': {
        id: 'cyber_dog', name: 'Cyber Dog', icon: '🐾',
        rarity: 'common', obtainMethod: 'gacha',
        passive: { name: 'Circuit Sniff', description: '+1 gold per reward (max 10/day)', effectType: 'bonus_gold', value: 1, capPerDay: 10 }
    },
    'spirit_fox': {
        id: 'spirit_fox', name: 'Spirit Fox', icon: '🦊',
        rarity: 'rare', obtainMethod: 'gacha',
        passive: { name: 'Spirit Sight', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    },
    'dragon_hatchling': {
        id: 'dragon_hatchling', name: 'Dragon Hatchling', icon: '🐉',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: { name: 'Dragon Greed', description: '+6 gold per reward (max 20/day)', effectType: 'bonus_gold', value: 6, capPerDay: 20 }
    },
    'phoenix_chick': {
        id: 'phoenix_chick', name: 'Phoenix Chick', icon: '🔥',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: { name: 'Ember Blessing', description: '+6 gold per reward (max 20/day)', effectType: 'bonus_gold', value: 6, capPerDay: 20 }
    },
    'ancient_owl': {
        id: 'ancient_owl', name: 'Ancient Owl', icon: '🦉',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: { name: 'Wisdom Gaze', description: '+10 gold per reward (max 25/day)', effectType: 'bonus_gold', value: 10, capPerDay: 25 }
    },
    'cosmic_turtle': {
        id: 'cosmic_turtle', name: 'Cosmic Turtle', icon: '🐢',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: { name: 'Cosmic Shell', description: '+10 gold per reward (max 25/day)', effectType: 'bonus_gold', value: 10, capPerDay: 25 }
    },
    'galaxy_heifer': {
        id: 'galaxy_heifer', name: 'Galaxy-Eyed Heifer', icon: '🐮✨',
        rarity: 'mythic', obtainMethod: 'gacha',
        passive: { name: 'Galactic Graze', description: '+15 gold per reward (max 30/day)', effectType: 'bonus_gold', value: 15, capPerDay: 30 }
    },
    'golden_goldfish': {
        id: 'golden_goldfish', name: 'Golden Goldfish', icon: '🐟',
        rarity: 'legendary', obtainMethod: 'luck_roll',
        passive: { name: 'Golden Blessing', description: '+10 gold per reward (max 25/day)', effectType: 'bonus_gold', value: 10, capPerDay: 25 }
    },
    'pet_wolf': {
        id: 'pet_wolf', name: 'Wolf', icon: '🐺',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Wolf Spirit', description: '+4 gold per reward (max 15/day)', effectType: 'bonus_gold', value: 4, capPerDay: 15 }
    }
};
