export type TowerType = 'archer' | 'mage' | 'frost' | 'cannon';
export type EnemyType = 'goblin' | 'orc' | 'golem' | 'boss_slime';

export interface GridPos {
    x: number;
    y: number;
}

export interface TowerDef {
    type: TowerType;
    name: string;
    icon: string;
    color: string;
    cost: number;
    range: number;      // Grid tiles
    damage: number;     // Physical damage
    cooldown: number;   // ms between shots
    description: string;
    projectileColor: string;
}

export interface EnemyDef {
    type: EnemyType;
    name: string;
    icon: string;
    baseHp: number;
    speed: number;      // Grid tiles per second
    reward: number;     // Mana rewarded on kill
}

export const TD_TOWERS: Record<TowerType, TowerDef> = {
    archer: { type: 'archer', name: 'Archer', icon: '🏹', color: '#16a34a', cost: 50, range: 3, damage: 15, cooldown: 600, description: 'Fast, single target.', projectileColor: '#86efac' },
    mage: { type: 'mage', name: 'Mage', icon: '🔮', color: '#9333ea', cost: 100, range: 4, damage: 40, cooldown: 1200, description: 'High damage, slow.', projectileColor: '#d8b4fe' },
    frost: { type: 'frost', name: 'Frost', icon: '❄️', color: '#0284c7', cost: 75, range: 2, damage: 5, cooldown: 1500, description: 'Slows enemies in range (NYI).', projectileColor: '#bae6fd' },
    cannon: { type: 'cannon', name: 'Cannon', icon: '💣', color: '#b91c1c', cost: 150, range: 2.5, damage: 80, cooldown: 2000, description: 'Massive local damage.', projectileColor: '#fca5a5' }
};

export const TD_ENEMIES: Record<EnemyType, EnemyDef> = {
    goblin: { type: 'goblin', name: 'Goblin', icon: '👺', baseHp: 40, speed: 1.5, reward: 5 },
    orc: { type: 'orc', name: 'Orc', icon: '👹', baseHp: 120, speed: 1.0, reward: 10 },
    golem: { type: 'golem', name: 'Golem', icon: '🪨', baseHp: 400, speed: 0.6, reward: 25 },
    boss_slime: { type: 'boss_slime', name: 'King Slime', icon: '👑', baseHp: 1500, speed: 0.4, reward: 100 }
};

// 12x8 Grid. 
// Path: Starts (0,2) -> (8,2) -> (8,5) -> (2,5) -> (2,7) -> (11,7) [Base]
export const TD_GRID_WIDTH = 12;
export const TD_GRID_HEIGHT = 8;
export const TD_PATH: GridPos[] = [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    
    { x: 8, y: 3 },
    { x: 8, y: 4 },
    { x: 8, y: 5 },
    
    { x: 7, y: 5 },
    { x: 6, y: 5 },
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 5 },
    
    { x: 2, y: 6 },
    { x: 2, y: 7 },
    
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 },
    { x: 7, y: 7 },
    { x: 8, y: 7 },
    { x: 9, y: 7 },
    { x: 10, y: 7 },
    { x: 11, y: 7 }, // Base
];

// Helper to check if a tile is path
export const isPath = (x: number, y: number) => {
    return TD_PATH.some(p => p.x === x && p.y === y);
};

export const getWaveComposition = (wave: number): EnemyType[] => {
    const enemies: EnemyType[] = [];
    
    if (wave === 1) {
        for(let i=0; i<8; i++) enemies.push('goblin');
    } else if (wave === 2) {
        for(let i=0; i<12; i++) enemies.push('goblin');
        for(let i=0; i<2; i++) enemies.push('orc');
    } else if (wave === 3) {
        for(let i=0; i<15; i++) enemies.push('goblin');
        for(let i=0; i<5; i++) enemies.push('orc');
    } else if (wave === 4) {
        for(let i=0; i<10; i++) enemies.push('goblin');
        for(let i=0; i<8; i++) enemies.push('orc');
        for(let i=0; i<2; i++) enemies.push('golem');
    } else if (wave % 5 === 0) {
        // Boss wave
        enemies.push('boss_slime');
        for(let i=0; i<wave; i++) enemies.push('orc');
    } else {
        // Scaled wave
        const count = 15 + wave * 2;
        for(let i=0; i<count; i++) {
            const r = Math.random();
            if (r < 0.6) enemies.push('goblin');
            else if (r < 0.9) enemies.push('orc');
            else enemies.push('golem');
        }
    }
    return enemies;
};

// ─── Phase 2: Modifiers ────────────────────────

export type MapModifierType = 'leyline_surge' | 'drought' | 'fortified_path' | 'none';
export type WaveModifierType = 'horde' | 'armored' | 'regenerating' | 'swift' | 'none';

export interface MapModifier {
    type: MapModifierType;
    name: string;
    description: string;
    icon: string;
}

export interface WaveModifier {
    type: WaveModifierType;
    name: string;
    description: string;
    icon: string;
}

export const TD_MAP_MODIFIERS: Record<MapModifierType, MapModifier> = {
    none: { type: 'none', name: 'Stable Realm', description: 'Standard environmental conditions.', icon: '🌍' },
    leyline_surge: { type: 'leyline_surge', name: 'Leyline Surge', description: 'Towers fire 20% faster, but enemies move 10% faster.', icon: '⚡' },
    drought: { type: 'drought', name: 'Drought', description: 'Mana yields reduced by 10%, but Towers sell for 100% value.', icon: '🏜️' },
    fortified_path: { type: 'fortified_path', name: 'Fortified Path', description: 'Base HP is doubled. Towers cost 10% more mana.', icon: '🛡️' }
};

export const TD_WAVE_MODIFIERS: Record<WaveModifierType, WaveModifier> = {
    none: { type: 'none', name: 'Standard Approach', description: 'Enemies possess normal stats.', icon: '🚶' },
    horde: { type: 'horde', name: 'Horde', description: '+50% enemies spawn, but each has -20% HP.', icon: '🦠' },
    armored: { type: 'armored', name: 'Armored', description: 'Enemies have +30% HP but move 10% slower.', icon: '🦾' },
    regenerating: { type: 'regenerating', name: 'Regenerating', description: 'Enemies heal 5 HP per second while alive.', icon: '💚' },
    swift: { type: 'swift', name: 'Swift', description: 'Enemies move 30% faster.', icon: '💨' }
};

export const rollMapModifier = (): MapModifierType => {
    const mods: MapModifierType[] = ['none', 'none', 'leyline_surge', 'drought', 'fortified_path'];
    return mods[Math.floor(Math.random() * mods.length)];
};

export const rollWaveModifier = (wave: number): WaveModifierType => {
    // No mods on wave 1
    if (wave <= 1) return 'none';
    
    // 50% chance of no mod
    if (Math.random() > 0.5) return 'none';

    const mods: WaveModifierType[] = ['horde', 'armored', 'regenerating', 'swift'];
    return mods[Math.floor(Math.random() * mods.length)];
};
