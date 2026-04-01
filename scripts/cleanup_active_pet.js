const fs = require('fs');

const replaceInFile = (path, searchParams) => {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    let original = content;
    searchParams.forEach(([search, replace]) => {
        if (typeof search === 'string') {
            content = content.replaceAll(search, replace);
        } else {
            content = content.replace(search, replace);
        }
    });
    if (content !== original) {
        fs.writeFileSync(path, content, 'utf8');
        console.log(`Updated ${path}`);
    }
};

replaceInFile('src/features/pet/HomeModal.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/pet/PetPage.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/room/WalkableRoom.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/room/RoomLobby.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/room/Room2D.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/room/PlayerRoom.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/room/PetInteractionPanel.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/character/LoadoutPanel.tsx', [['activePet', 'equippedPetId']]);
replaceInFile('src/features/arena/ArenaBattlefieldLayout.tsx', [['activePet', 'equippedPetId']]);

// Fix Arena
replaceInFile('src/features/arena/Arena.tsx', [
    ['activePet: activePetId', 'equippedPetId: activePetId'],
    ['const activePet = activePetId ? PET_DATABASE[activePetId] : null;', 'const equippedPet = activePetId ? PET_DATABASE[activePetId] : null;'],
    [/{activePet \?/g, '{equippedPet ?'],
    [/{activePet.icon}/g, '{equippedPet.icon}'],
    [/{activePet.name}/g, '{equippedPet.name}'],
    [/{activePet.abilities && activePet.abilities\[0\] && \([\s\S]*?\)}/, ''] // Remove ability rendering
]);

console.log('Done replacements!');
