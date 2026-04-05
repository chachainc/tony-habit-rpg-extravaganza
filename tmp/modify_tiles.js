const fs = require('fs');
let content = fs.readFileSync('c:/Users/aduca/.gemini/antigravity/scratch/gamified-life/src/features/conquest/tileConfig.ts', 'utf8');

const toRemove = [
    't0001', 't0009', 
    't0005', 't0006', 't0020',
    't0008', 't0010', 't0014',
    't0004', 't0012', 't0048',
    't0003', 't0015', 't0028',
    't0013', 't0018', 't0019',
    't0007', 't0030', 't0064'
];

toRemove.forEach(id => {
    // allow matching \r\n or \n
    const regex = new RegExp('.*id: "' + id + '".*\\r?\\n?', 'g');
    content = content.replace(regex, '');
});

content = content.replace(/totalTiles: 242/g, 'totalTiles: 222');

fs.writeFileSync('c:/Users/aduca/.gemini/antigravity/scratch/gamified-life/src/features/conquest/tileConfig.ts', content, 'utf8');
console.log('Removed tiles and updated config.');
