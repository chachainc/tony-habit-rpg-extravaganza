import * as fs from 'fs';
import { PET_DATABASE } from './src/store/usePetStore';
import { PET_META } from './src/data/pets';
import { PET_DB as GACHA_PETS } from './src/store/useGachaStore';
import { ITEM_DATABASE, Item } from './src/data/items';
import { getPetBattleStats, WILD_CREATURES } from './src/store/usePetBattleStore';

// Load item data for costs
const shopPets = Object.values(ITEM_DATABASE).filter(i => i && i.type === 'pet');

const result: any = {
    pets: [],
    globalSystems: {
        elementalSystem: "Triangle system: Fire > Nature > Water > Fire, Earth > Air > Water. Strong type gets +25% damage modifier, Weak type gets -25%. Shadow deals +15% damage to all types and receives +15% damage from all types. Aether (Ethereal Cow) operates similarly with specific damage scalings (e.g. ethereal cow has passives but standard combat defs).",
        statusEffectSystem: "Basic buff/debuff system natively supported via PetAbility types 'buff_atk', 'debuff_def', 'reduce_damage'. Status effects last for 'buffDuration' turns.",
        damageFormula: "Math.max(1, Math.floor((move.power * atkTotal / (defTotal + 5)) * typeMult))",
        turnLogic: "Turn priority resolved by Speed stat. In combat, both sides run their moves in speed order each round. Cooldowns tick downwards by 1 per turn.",
        scalingSystem: "Pets have base stats at Level 1. Upon catching, levels, rarity, and ascension stars grant additional stats. +3 HP & +0.5 ATK per level over 1. 'Rare' catches grant +15% to HP/ATK/DEF. Ascension grants +10% per star (0-5 stars). Instances are stored via addCaughtPetInstance alongside old species-based count."
    }
};

const allPetIds = new Set([
    ...Object.keys(PET_DATABASE),
    ...Object.keys(PET_META),
    ...Object.keys(GACHA_PETS),
    ...shopPets.map(p => p.id)
]);

for (const petId of allPetIds) {
    const pDef = PET_DATABASE[petId]; // Battle pet definition
    const pMeta = PET_META[petId]; // Tier/Obtain Metadata
    const pGacha = GACHA_PETS[petId]; // Gacha definition
    const pItem = ITEM_DATABASE[petId] as Item; // Item store definition

    let finalName = pDef?.name || pGacha?.name || pItem?.name || petId;
    let finalRarity = pDef?.rarity || pGacha?.rarity || pItem?.rarity || 'common';
    let obtainMethod = pMeta?.obtainMethod || pGacha?.source || pItem?.category || "other";
    
    // Attempt to merge gacha into "spin" if it lacks an obtain method
    if (pGacha && !pMeta) {
        obtainMethod = "daily_spin_or_gacha";
    }

    let goldCost = pItem?.cost?.gold || null;
    let gemsCost = pItem?.cost?.diamonds || null;
    let tokensCost = pItem?.cost?.tokens ? JSON.stringify(pItem.cost.tokens) : null;

    let baseHp = pDef?.hp || 0;
    let baseAtk = pDef?.attack || (pGacha?.passiveBonus?.type === 'attack' ? pGacha.passiveBonus.value : 0) || pItem?.stats?.attack || 0;
    let baseDef = pDef?.defense || (pGacha?.passiveBonus?.type === 'defense' ? pGacha.passiveBonus.value : 0) || pItem?.stats?.defense || 0;
    
    // Battle logic stats from getPetBattleStats
    const battleStats = pDef ? getPetBattleStats(petId) : null;
    let baseSpeed = battleStats?.speed || pDef?.attackSpeed || null;
    let baseMana = pItem?.stats?.maxMana || null;

    // Passive
    let passiveObjObj = null;
    if (pDef?.passive) {
        passiveObjObj = {
            name: pDef.passive.name,
            description: pDef.passive.description,
            trigger: pDef.passive.effect.type + " " + pDef.passive.effect.value + "%"
        };
    } else if (pGacha?.passiveBonus) {
         passiveObjObj = {
            name: "Gacha Passive",
            description: pGacha.description,
            trigger: pGacha.passiveBonus.type + " " + pGacha.passiveBonus.value
        };
    }

    let abilitiesList = [];
    if (pDef?.abilities) {
        abilitiesList = pDef.abilities.map((a: any) => ({
            name: a.name,
            description: a.description,
            damageType: a.type,
            cost: {
                mana: null,
                cooldown: a.cooldown
            }
        }));
    }

    let notesParts = [];
    if (pMeta?.notes) notesParts.push("Meta: " + pMeta.notes);
    if (pDef && pGacha) notesParts.push("Warning: Duplicate exists in both Battle and Gacha system.");
    if (pItem) notesParts.push("Item Store Unlockable.");

    const petExport = {
        id: petId,
        name: finalName,
        rarity: finalRarity,
        obtainMethod: obtainMethod,
        cost: {
            gold: goldCost,
            gems: gemsCost,
            other: tokensCost
        },
        baseStats: {
            hp: baseHp,
            attack: baseAtk,
            defense: baseDef,
            speed: baseSpeed,
            mana: baseMana
        },
        scaling: {
            hasLevelScaling: !!pDef,
            levelFormula: pDef ? "+3 HP and +0.5 ATK per level over 1" : null,
            ascensionScaling: pDef ? "+10% HP/ATK/DEF per star (max 5)" : null,
            rarityMultiplier: pDef ? "+15% HP/ATK/DEF for rare catch" : null
        },
        element: {
            type: pDef?.type || "None",
            description: pDef ? `${pDef.type} Element rules mapping` : "No in-combat element"
        },
        passive: passiveObjObj,
        abilities: abilitiesList,
        statusEffects: [], // Derived in global systems mostly
        isActiveInGame: true,
        notes: notesParts.join(" | ") || null
    };

    result.pets.push(petExport);
}

fs.writeFileSync('pet_system_export.json', JSON.stringify(result, null, 2));
console.log('Export complete');
