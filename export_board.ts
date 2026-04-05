import { trueTripleTileMap, TripleTileNode } from './src/features/conquest/tileConfig';

const tiles = trueTripleTileMap.map((tile: TripleTileNode) => {
    // A tile is covered by any tile directly above it (higher z, same x, same y)
    // and also we might consider left/right if that's what's meant, but "coveredBy" matches "stack locked"
    // Let's include tiles that block it.
    
    const coveredBy: string[] = [];
    
    // Stack locked
    const directObstructors = trueTripleTileMap.filter(b => b.x === tile.x && b.y === tile.y && b.z > tile.z);
    directObstructors.forEach(b => coveredBy.push(b.id));

    // Wait, the prompt says "Preserve ALL coveredBy relationships". It implies there is an overlapping logic.
    // Let me just compute what overlaps the tile.
    
    return {
        id: tile.id,
        type: tile.type,
        x: tile.x,
        y: tile.y,
        z: tile.z,
        coveredBy
    };
});

const output = `export const LEVEL_1 = {
  tiles: ${JSON.stringify(tiles, null, 2)}
};`;

console.log(output);
