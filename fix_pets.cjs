const fs = require('fs');
let content = fs.readFileSync('src/data/pets.ts', 'utf8');

// remove imports
content = content.replace(/import \w+ from '\.\.\/assets\/pets\/[^']+';\r?\n/g, '');

const map = {
    'petCowSpinImg': 'pet_cow_spin.jpg',
    'wizardCowImg': 'wizard_cow.jpg',
    'archerCowImg': 'archer_cow.jpg',
    'warCowImg': 'war_cow.jpg',
    'cowKingImg': 'cow_king.png',
    'etherealCowImg': 'ethereal_cow.png',
    'petChickenImg': 'pet_chicken_spin.jpg',
    'petGooseImg': 'pet_goose_spin.jpg',
    'petPigImg': 'pet_pig_spin.jpg',
    'petSheepImg': 'pet_sheep_spin.jpg',
    'petDogImg': 'pet_dog_spin.jpg',
    'petCatImg': 'pet_cat_spin.jpg',
    'petRabbitImg': 'pet_rabbit_spin.jpg',
    'petPorcupineImg': 'pet_porcupine.jpg',
    'petPlatypusImg': 'pet_platypus.jpg',
    'petGiraffeImg': 'pet_giraffe.jpg',
    'petRavenImg': 'pet_raven.jpg',
    'petRhinoImg': 'pet_rhino.jpg',
    'petElephantImg': 'pet_elephant.jpg',
    'petBearImg': 'pet_bear.jpg',
    'tankCowImg': 'tank_cow.jpg',
    'treasureCowImg': 'treasure_cow.jpg',
    'blazehornCowImg': 'blazehorn_cow.jpg',
    'frostgrazerCowImg': 'frostgrazer_cow.jpg',
    'shadowhoofCowImg': 'shadowhoof_cow.jpg',
    'infernohornCowImg': 'infernohorn_cow.jpg',
    'glacierhoofCowImg': 'glacierhoof_cow.jpg',
    'jackpotCowImg': 'jackpot_cow.jpg'
};

for (const [v, f] of Object.entries(map)) {
    content = content.replace(new RegExp(`image: ${v}`, 'g'), `image: '/assets/pets/${f}?v=2'`);
}

// Add missing images
const missing = {
    'commander_cow': "image: '/assets/pets/commander_cow.jpg?v=2',",
    'rock_cow': "image: '/assets/pets/rock_cow.png?v=2',",
    'gambler_cow': "image: '/assets/pets/gambler_cow.png?v=2',",
    'ironhide_cow': "image: '/assets/pets/ironhide_cow.png?v=2',",
    'penny_hoof_cow': "image: '/assets/pets/penny_hoof_cow.png?v=2',"
};

for (const [id, imgStr] of Object.entries(missing)) {
    content = content.replace(new RegExp(`(id: '${id}', name: '[^']+', icon: '[^']+',)(?! image:)`), `$1 ${imgStr}`);
}

fs.writeFileSync('src/data/pets.ts', content);
