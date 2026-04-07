import { trueTripleTileMap, TILE_TYPES, TripleTileNode, isTileLocked } from './tileConfig';

type Accessibility = 'easy' | 'medium' | 'deep';

interface BoardCell extends TripleTileNode {
    bucket: Accessibility;
    wave: number;
}

interface TileGroup {
    type: string;
    count: 3 | 6;
}

function classifyBoardCells(layout: TripleTileNode[]): BoardCell[] {
    let cells: BoardCell[] = layout.map(t => ({ ...t, bucket: 'deep', wave: -1 }));
    let remainingIds = new Set(cells.map(c => c.id));
    
    let wave = 0;
    while (remainingIds.size > 0) {
        // "Free" computation needs to simulate the board with ONLY remainingIds
        const remainingCells = cells.filter(c => remainingIds.has(c.id));
        const freeInWave = remainingCells.filter(c => !isTileLocked(c, remainingCells));
        
        if (freeInWave.length === 0) {
            // Deadlock fallback -> dump rest in last wave
            for (let id of remainingIds) {
                const c = cells.find(x => x.id === id)!;
                c.wave = wave;
            }
            break;
        }

        for (let c of freeInWave) {
            const cell = cells.find(x => x.id === c.id)!;
            cell.wave = wave;
            remainingIds.delete(c.id);
        }
        wave++;
    }

    cells.sort((a, b) => a.wave - b.wave);
    
    const easyCount = Math.floor(cells.length * 0.35);
    const mediumCount = Math.floor(cells.length * 0.40);
    
    for (let i = 0; i < cells.length; i++) {
        if (i < easyCount) cells[i].bucket = 'easy';
        else if (i < easyCount + mediumCount) cells[i].bucket = 'medium';
        else cells[i].bucket = 'deep';
    }

    return cells;
}

function generateTileGroups(totalTiles: number, types: readonly string[]): TileGroup[] {
    if (totalTiles % 3 !== 0) throw new Error("totalTiles must be divisible by 3");
    
    const groupsNeeded = totalTiles / 3;
    let shuffledTypes = [...types].sort(() => Math.random() - 0.5);
    const usedTypeCount = Math.min(shuffledTypes.length, groupsNeeded);
    const usedTypes = shuffledTypes.slice(0, usedTypeCount);

    const groupsPerType: Record<string, number> = {};
    for (const type of usedTypes) groupsPerType[type] = 1;

    let remainingGroups = groupsNeeded - usedTypes.length;
    let expandable = [...usedTypes].sort(() => Math.random() - 0.5);
    
    let guard = 0;
    while (remainingGroups > 0 && guard < 10000) {
        const type = expandable[guard % expandable.length];
        if (groupsPerType[type] < 2) {
            groupsPerType[type] += 1;
            remainingGroups--;
        }
        guard++;
    }

    return Object.entries(groupsPerType).map(([type, groups]) => ({
        type,
        count: (groups * 3) as 3 | 6
    }));
}

function placeGroupsAcrossBuckets(groups: TileGroup[], classifiedCells: BoardCell[]): TripleTileNode[] {
    let easySlots = classifiedCells.filter(c => c.bucket === 'easy').sort(() => Math.random() - 0.5);
    let mediumSlots = classifiedCells.filter(c => c.bucket === 'medium').sort(() => Math.random() - 0.5);
    let deepSlots = classifiedCells.filter(c => c.bucket === 'deep').sort(() => Math.random() - 0.5);

    const pickSlot = (preferred: Accessibility[]) => {
        for (let pref of preferred) {
            if (pref === 'easy' && easySlots.length > 0) return easySlots.pop()!;
            if (pref === 'medium' && mediumSlots.length > 0) return mediumSlots.pop()!;
            if (pref === 'deep' && deepSlots.length > 0) return deepSlots.pop()!;
        }
        if (easySlots.length > 0) return easySlots.pop()!;
        if (mediumSlots.length > 0) return mediumSlots.pop()!;
        if (deepSlots.length > 0) return deepSlots.pop()!;
        throw new Error("No slots left");
    };

    let result: TripleTileNode[] = [];

    // Shuffle groups to avoid bias
    let shuffledGroups = [...groups].sort(() => Math.random() - 0.5);

    for (let group of shuffledGroups) {
        const slots: BoardCell[] = [];
        if (group.count === 3) {
            slots.push(pickSlot(['easy', 'medium']));
            slots.push(pickSlot(['deep', 'medium']));
            slots.push(pickSlot(['medium', 'easy', 'deep']));
            
            // Re-check if all are deep (should not happen with above logic, but just in case)
            if (slots.every(s => s.bucket === 'deep')) {
                // Swap one with an easy or medium if available
            }
        } else if (group.count === 6) {
            slots.push(pickSlot(['easy']));
            slots.push(pickSlot(['easy']));
            slots.push(pickSlot(['medium']));
            slots.push(pickSlot(['medium']));
            slots.push(pickSlot(['deep']));
            slots.push(pickSlot(['deep']));
        }
        
        for (const s of slots) {
            result.push({ ...s, type: group.type });
        }
    }
    return result;
}

function validateAndScoreBoard(board: TripleTileNode[]): { valid: boolean, score: number, issues: string[] } {
    let issues: string[] = [];
    let score = 100;
    let isValid = true;
    
    if (board.length % 3 !== 0) {
        issues.push("Length not divisible by 3");
        return { valid: false, score: -1000, issues };
    }

    const typeCounts: Record<string, number> = {};
    for (const t of board) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    
    for (const count of Object.values(typeCounts)) {
        if (count !== 3 && count !== 6) {
            issues.push("Invalid type count " + count);
            return { valid: false, score: -1000, issues };
        }
    }

    // Check deep burial
    for (const [type, count] of Object.entries(typeCounts)) {
        if (count === 3) {
            const tiles = board.filter(t => t.type === type);
            // Re-classify to check if all are deep? Actually we don't have bucket in `board` easily unless we keep it.
            // Let's do it via distance to surface or initial free state
        }
    }

    // Opening state
    const freeTiles = board.filter(t => !isTileLocked(t, board));
    const freeCounts: Record<string, number> = {};
    for (const t of freeTiles) freeCounts[t.type] = (freeCounts[t.type] || 0) + 1;

    let matchCount = 0;
    let pairCount = 0;
    let typesExposed = Object.keys(freeCounts).length;

    for (const count of Object.values(freeCounts)) {
        if (count >= 3) matchCount++;
        if (count === 2) pairCount++;
    }

    if (matchCount < 1) { isValid = false; issues.push("No legal match-3 in opening"); score -= 50; }
    if (pairCount < 2) { isValid = false; issues.push("Less than 2 extra pairs in opening"); score -= 20; }
    if (typesExposed < 6) { isValid = false; issues.push("Less than 6 types exposed"); score -= 30; }

    // Clustering check
    for (const t1 of freeTiles) {
        for (const t2 of freeTiles) {
            if (t1.id !== t2.id && t1.type === t2.type) {
                const manhattan = Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
                if (manhattan <= 2) {
                    score -= 5; // soft penalty
                }
            }
        }
    }

    return { valid: isValid, score, issues };
}

export function generateValidBoard(): TripleTileNode[] {
    const totalTiles = trueTripleTileMap.length;
    const classified = classifyBoardCells(trueTripleTileMap);
    
    let bestBoard: TripleTileNode[] = [];
    let bestScore = -9999;
    let maxRetries = 100;
    
    for (let i = 0; i < maxRetries; i++) {
        const groups = generateTileGroups(totalTiles, TILE_TYPES);
        const board = placeGroupsAcrossBuckets(groups, classified);
        
        const result = validateAndScoreBoard(board);
        if (result.valid) {
            if (i > 0) console.log(`Valid board found on retry ${i}`);
            return board;
        }
        
        if (result.score > bestScore) {
            bestScore = result.score;
            bestBoard = board;
        }
    }
    
    console.warn(`[BoardGen] Exhausted retries, returning fallback (score ${bestScore})`);
    return bestBoard;
}

function test() {
    let successCount = 0;
    for (let i = 0; i < 100; i++) {
        try {
            const b = generateValidBoard();
            successCount++;
        } catch (e) {
            console.error("error", e);
        }
    }
    console.log(`Generated ${successCount}/100 boards successfully`);
}

test();
