import type { AffinityType } from './affinities';

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
import tankCowImg from '../assets/pets/tank_cow.jpg';
import treasureCowImg from '../assets/pets/treasure_cow.jpg';
import blazehornCowImg from '../assets/pets/blazehorn_cow.jpg';
import frostgrazerCowImg from '../assets/pets/frostgrazer_cow.jpg';
import shadowhoofCowImg from '../assets/pets/shadowhoof_cow.jpg';
import infernohornCowImg from '../assets/pets/infernohorn_cow.jpg';
import glacierhoofCowImg from '../assets/pets/glacierhoof_cow.jpg';
import jackpotCowImg from '../assets/pets/jackpot_cow.jpg';

export interface PetPassive {
    name: string;
    description: string;
    type: 'gold_percent' | 'drop_chance' | 'flat_hp' | 'flat_atk' | 'flat_def' | 'hybrid' | 'hybrid_defense' | 'store_discount' | 'combat_all' | 'daily_rewards' | 'bonus_roll' | 'gold_double_chance' | 'tank_storm' | 'treasure_hoof' | 'blazehorn_burn' | 'frostgrazer_slow' | 'shadowhoof_lifesteal' | 'infernohorn_burn' | 'glacierhoof_freeze' | 'jackpot_multiplier' | 'commander_cow_neutral' | 'rock_cow_defense' | 'dreamshade_cow_sleep';
    value: number | { defense?: number; hp?: number; fortHpPercent?: number; fortCostDiscount?: number; goldPct?: number; flatGold?: number; chanceExtraCurrency?: number; atkPct?: number; burnTurnPct?: number; defPct?: number; slowChancePct?: number; slowTurns?: number; critPct?: number; lifestealPct?: number; spreads?: boolean; freezeChancePct?: number; freezeTurns?: number; rewardMultiplierChance?: number; rewardMultiplier?: number; spdPct?: number; flatDamResist?: number; maxMpPct?: number; healPct?: number; drowsyChance?: number; sleepUpgradeChance?: number; bonusSoldier?: number; };
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
    affinity?: AffinityType;
}

export const PET_DATABASE: Record<string, PetDefinition> = {
    'pet_cow': {
        id: 'pet_cow', name: 'Cow', icon: '🐮', image: petCowSpinImg,
        rarity: 'common', obtainMethod: 'shop_purchase',
        passive: { name: 'Novice Greed', description: '+2% gold earned', type: 'gold_percent', value: 2 }
    },
    'ethereal_cow': {
        id: 'ethereal_cow', name: 'Ethereal Cow', icon: '🌌', image: etherealCowImg,
        rarity: 'legendary', obtainMethod: 'jackpot',
        passive: { name: 'Cosmic Blessing', description: '+20% daily rewards', type: 'daily_rewards', value: 20 }
    },
    'wizard_cow': {
        id: 'wizard_cow', name: 'Wizard Cow', icon: '🧙🐮', image: wizardCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Arcane Sight', description: '+10% drop chance', type: 'drop_chance', value: 10 }
    },
    'highland_archer_cow': {
        id: 'highland_archer_cow', name: 'Highland Archer Cow', icon: '🏹🐮', image: archerCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'meditating_war_cow': {
        id: 'meditating_war_cow', name: 'Meditating War Cow', icon: '🧘🐮', image: warCowImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Savage Strike', description: '+10 Attack', type: 'flat_atk', value: 10 }
    },
    'cow_king': {
        id: 'cow_king', name: 'Cow King', icon: '👑🐮', image: cowKingImg,
        rarity: 'legendary', obtainMethod: 'other',
        passive: { name: "Warlord's Aura", description: '+10% all combat stats', type: 'combat_all', value: 10 }
    },
    'pet_chicken': {
        id: 'pet_chicken', name: 'Chicken', icon: '🐔', image: petChickenImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Novice Greed', description: '+2% gold earned', type: 'gold_percent', value: 2 }
    },
    'pet_goose': {
        id: 'pet_goose', name: 'Goose', icon: '🪿', image: petGooseImg,
        rarity: 'rare', obtainMethod: 'board_drop',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'pet_pig': {
        id: 'pet_pig', name: 'Pig', icon: '🐷', image: petPigImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Novice Greed', description: '+2% gold earned', type: 'gold_percent', value: 2 }
    },
    'pet_sheep': {
        id: 'pet_sheep', name: 'Sheep', icon: '🐑', image: petSheepImg,
        rarity: 'common', obtainMethod: 'board_drop',
        passive: { name: 'Novice Greed', description: '+2% gold earned', type: 'gold_percent', value: 2 }
    },
    'pet_dog': {
        id: 'pet_dog', name: 'Dog', icon: '🐕', image: petDogImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Adept Greed', description: '+4% gold earned', type: 'gold_percent', value: 4 }
    },
    'pixel_cat': {
        id: 'pixel_cat', name: 'Cat', icon: '🐱', image: petCatImg,
        rarity: 'rare', obtainMethod: 'daily_spin',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'pet_rabbit': {
        id: 'pet_rabbit', name: 'Rabbit', icon: '🐇', image: petRabbitImg,
        rarity: 'uncommon', obtainMethod: 'board_drop',
        passive: { name: 'Adept Greed', description: '+4% gold earned', type: 'gold_percent', value: 4 }
    },
    'war_chicken': {
        id: 'war_chicken', name: 'War Chicken', icon: '🐔🗡️',
        rarity: 'uncommon', obtainMethod: 'catch',
        passive: { name: 'Adept Greed', description: '+4% gold earned', type: 'gold_percent', value: 4 }
    },
    'stoneback_turtle': {
        id: 'stoneback_turtle', name: 'Stoneback Turtle', icon: '🐢🪨',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'shadow_otter': {
        id: 'shadow_otter', name: 'Shadow Otter', icon: '🦦🌑',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'blood_goose': {
        id: 'blood_goose', name: 'Blood Goose', icon: '🪿🩸',
        rarity: 'rare', obtainMethod: 'catch',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'pet_porcupine': {
        id: 'pet_porcupine', name: 'Porcupine', icon: '🦔', image: petPorcupineImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Adept Greed', description: '+4% gold earned', type: 'gold_percent', value: 4 }
    },
    'pet_platypus': {
        id: 'pet_platypus', name: 'Platypus', icon: '🦆', image: petPlatypusImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Adept Greed', description: '+4% gold earned', type: 'gold_percent', value: 4 }
    },
    'pet_giraffe': {
        id: 'pet_giraffe', name: 'Giraffe', icon: '🦒', image: petGiraffeImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'pet_raven': {
        id: 'pet_raven', name: 'Raven', icon: '🐦‍⬛', image: petRavenImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'pet_rhino': {
        id: 'pet_rhino', name: 'Rhino', icon: '🦏', image: petRhinoImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Savage Strike', description: '+10 Attack', type: 'flat_atk', value: 10 }
    },
    'pet_elephant': {
        id: 'pet_elephant', name: 'Elephant', icon: '🐘', image: petElephantImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: "Master's Greed", description: '+12% gold earned', type: 'gold_percent', value: 12 }
    },
    'pet_bear': {
        id: 'pet_bear', name: 'Bear', icon: '🐻', image: petBearImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'cyber_dog': {
        id: 'cyber_dog', name: 'Cyber Dog', icon: '🐾',
        rarity: 'common', obtainMethod: 'gacha',
        passive: { name: 'Novice Greed', description: '+2% gold earned', type: 'gold_percent', value: 2 }
    },
    'spirit_fox': {
        id: 'spirit_fox', name: 'Spirit Fox', icon: '🦊',
        rarity: 'rare', obtainMethod: 'gacha',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'dragon_hatchling': {
        id: 'dragon_hatchling', name: 'Dragon Hatchling', icon: '🐉',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: { name: 'Savage Strike', description: '+10 Attack', type: 'flat_atk', value: 10 }
    },
    'phoenix_chick': {
        id: 'phoenix_chick', name: 'Phoenix Chick', icon: '🔥',
        rarity: 'epic', obtainMethod: 'gacha',
        passive: { name: "Master's Greed", description: '+12% gold earned', type: 'gold_percent', value: 12 }
    },
    'ancient_owl': {
        id: 'ancient_owl', name: 'Ancient Owl', icon: '🦉',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: { name: 'Daily Blessing', description: '+20% daily rewards', type: 'daily_rewards', value: 20 }
    },
    'cosmic_turtle': {
        id: 'cosmic_turtle', name: 'Cosmic Turtle', icon: '🐢',
        rarity: 'legendary', obtainMethod: 'gacha',
        passive: { name: "Merchant's Smile", description: '15% store discount', type: 'store_discount', value: 15 }
    },
    'galaxy_heifer': {
        id: 'galaxy_heifer', name: 'Galaxy-Eyed Heifer', icon: '🐮✨',
        rarity: 'mythic', obtainMethod: 'gacha',
        passive: { name: 'Daily Blessing', description: '+20% daily rewards', type: 'daily_rewards', value: 20 }
    },
    'golden_goldfish': {
        id: 'golden_goldfish', name: 'Golden Goldfish', icon: '🐟',
        rarity: 'legendary', obtainMethod: 'luck_roll',
        passive: { name: 'Daily Blessing', description: '+20% daily rewards', type: 'daily_rewards', value: 20 }
    },
    'pet_wolf': {
        id: 'pet_wolf', name: 'Wolf', icon: '🐺',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Keen Eye', description: '+5% drop chance', type: 'drop_chance', value: 5 }
    },
    'penny_hoof_cow': {
        id: 'penny_hoof_cow', name: 'Penny Hoof Cow', icon: '🐮💲',
        rarity: 'common', obtainMethod: 'shop_purchase',
        passive: { name: 'Penny Hoof', description: 'Earn 5% more gold from all sources.', type: 'gold_percent', value: 5 }
    },
    'ironhide_cow': {
        id: 'ironhide_cow', name: 'Ironhide Cow', icon: '🐮🛡️',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Ironhide', description: 'Gain +8% Defense and +5% Max HP.', type: 'hybrid_defense', value: { defense: 8, hp: 5 } }
    },
    'gambler_cow': {
        id: 'gambler_cow', name: 'Gambler Cow', icon: '🐮🎲',
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Lucky Hoof', description: '15% chance to double gold rewards.', type: 'gold_double_chance', value: 15 }
    },
    'tank_cow': {
        id: 'tank_cow', name: 'Tank Cow', icon: '🐮🧱', image: tankCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Storm Wall', description: 'Gain +12% Defense. Walls start with +25% HP and upgrades cost 10% less.', type: 'tank_storm', value: { defense: 12, fortHpPercent: 25, fortCostDiscount: 10 } }
    },
    'treasure_cow': {
        id: 'treasure_cow', name: 'Treasure Hoof Cow', icon: '🐮🏴‍☠️', image: treasureCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Pirate Hoard', description: 'Gain +15% gold, +1 bonus gold per reward, and a 10% chance for extra sigils or shmeckles.', type: 'treasure_hoof', value: { goldPct: 15, flatGold: 1, chanceExtraCurrency: 10 } },
        affinity: 'economy'
    },
    'blazehorn_cow': {
        id: 'blazehorn_cow', name: 'Blazehorn Cow', icon: '🐮🔥', image: blazehornCowImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Blazing Hooves', description: '+10% damage. Applies Burn (2% max HP per turn for 3 turns) when attacking.', type: 'blazehorn_burn', value: { atkPct: 10, burnTurnPct: 2 } },
        affinity: 'fire'
    },
    'frostgrazer_cow': {
        id: 'frostgrazer_cow', name: 'Frostgrazer Cow', icon: '🐮❄️', image: frostgrazerCowImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Glacial Presence', description: '+8% defense. Attacks have a 20% chance to Slow enemies for 2 turns.', type: 'frostgrazer_slow', value: { defPct: 8, slowChancePct: 20, slowTurns: 2 } },
        affinity: 'ice'
    },
    'shadowhoof_cow': {
        id: 'shadowhoof_cow', name: 'Shadowhoof Cow', icon: '🐮🌑', image: shadowhoofCowImg,
        rarity: 'uncommon', obtainMethod: 'shop_purchase',
        passive: { name: 'Vampiric Aura', description: '+5% crit chance. Heal 3% of damage dealt.', type: 'shadowhoof_lifesteal', value: { critPct: 5, lifestealPct: 3 } },
        affinity: 'shadow'
    },
    'infernohorn_cow': {
        id: 'infernohorn_cow', name: 'Infernohorn Cow', icon: '🐮🔥', image: infernohornCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Living Inferno', description: '+15% damage. Applies Burn (3% max HP per turn). Burn spreads on kill.', type: 'infernohorn_burn', value: { atkPct: 15, burnTurnPct: 3, spreads: true } },
        affinity: 'fire'
    },
    'glacierhoof_cow': {
        id: 'glacierhoof_cow', name: 'Glacierhoof Cow', icon: '🐮❄️', image: glacierhoofCowImg,
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Deep Freeze', description: '+12% defense. Attacks have a 25% chance to Freeze enemies for 1 turn.', type: 'glacierhoof_freeze', value: { defPct: 12, freezeChancePct: 25, freezeTurns: 1 } },
        affinity: 'ice'
    },
    'jackpot_cow': {
        id: 'jackpot_cow', name: 'Jackpot Cow', icon: '🐮🎰', image: jackpotCowImg,
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Triple 7s', description: '+8% crit chance. 12% chance to TRIPLE all rewards!', type: 'jackpot_multiplier', value: { critPct: 8, rewardMultiplierChance: 12, rewardMultiplier: 3 } },
        affinity: 'luck'
    },
    'commander_cow': {
        id: 'commander_cow', name: 'Commander Cow', icon: '🐮🎖️',
        rarity: 'rare', obtainMethod: 'shop_purchase',
        passive: { name: 'Tactical Command', description: '+8% Attack, +8% Defense, +5% Speed. +1 Bonus Soldier in Conquest.', type: 'commander_cow_neutral', value: { atkPct: 8, defPct: 8, spdPct: 5, bonusSoldier: 1 } },
        affinity: 'neutral'
    },
    'rock_cow': {
        id: 'rock_cow', name: 'Rock Cow', icon: '🐮🪨',
        rarity: 'epic', obtainMethod: 'shop_purchase',
        passive: { name: 'Stone Scale', description: '+17% Defense, Reduce all damage by 8%', type: 'rock_cow_defense', value: { defPct: 17, flatDamResist: 8 } },
        affinity: 'neutral'
    },
    'dreamshade_cow': {
        id: 'dreamshade_cow', name: 'Dreamshade Cow', icon: '🐮💤',
        rarity: 'legendary', obtainMethod: 'earned',
        passive: { name: 'Dreamstate', description: '+10% Mana. Restores 2% Max HP/MP on turn start. 15% Drowsy infliction, 10% Sleep inflict.', type: 'dreamshade_cow_sleep', value: { maxMpPct: 10, healPct: 2, drowsyChance: 15, sleepUpgradeChance: 10 } },
        affinity: 'shadow'
    }
};
