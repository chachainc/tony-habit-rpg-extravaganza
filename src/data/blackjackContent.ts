export type DealerId = 'classic_cow' | 'royal_cow' | 'frost_cow' | 'arcane_cow' | 'infernal_cow' | 'boss_crimson_bull';
export type ThemeId = 'classic_felt' | 'ice_table' | 'fire_table' | 'shadow_table' | 'royal_gilded' | 'arcane_runes';

export interface DealerDef {
    id: DealerId;
    name: string;
    imagePath: string; // E.g., '/assets/dealers/classic_cow.png'
    fallbackEmoji: string;
    flavorText?: string;
    unlockCondition?: { type: 'win_streak' | 'total_wins' | 'total_blackjacks' | 'default'; value: number };
    themeAffinity?: ThemeId; 
    isBoss?: boolean;
}

export interface TableThemeDef {
    id: ThemeId;
    name: string;
    cssVariables: {
        '--bj-table-center': string;
        '--bj-table-edge': string;
        '--bj-border-color': string;
    };
    particleEffect?: 'snow' | 'embers' | 'void_sparkles' | 'gold_dust' | null;
    unlockCondition?: { type: 'win_streak' | 'total_wins' | 'total_blackjacks' | 'default'; value: number };
}

// ── Scaffold Data ──────────────────────────────────────────────

export const DEALERS: Record<DealerId, DealerDef> = {
    'classic_cow': {
        id: 'classic_cow',
        name: 'Classic Cow Dealer',
        imagePath: '/assets/dealers/classic_cow.jpg',
        fallbackEmoji: '🤵🐮',
        flavorText: 'A reliable bovine professional.',
        unlockCondition: { type: 'default', value: 0 },
        themeAffinity: 'classic_felt'
    },
    'royal_cow': {
        id: 'royal_cow',
        name: 'Royal Cow Dealer',
        imagePath: '/assets/dealers/royal_cow.png',
        fallbackEmoji: '👑🐮',
        flavorText: 'Only deals in high stakes.',
        unlockCondition: { type: 'total_wins', value: 50 },
        themeAffinity: 'royal_gilded'
    },
    'frost_cow': {
        id: 'frost_cow',
        name: 'Frosthorn Croupier',
        imagePath: '/assets/dealers/frost_cow.png',
        fallbackEmoji: '❄️🐮',
        flavorText: 'Has ice in his veins. Literally.',
        unlockCondition: { type: 'win_streak', value: 10 },
        themeAffinity: 'ice_table'
    },
    'arcane_cow': {
        id: 'arcane_cow',
        name: 'Arcane Cow',
        imagePath: '/assets/dealers/arcane_cow.png',
        fallbackEmoji: '🔮🐮',
        flavorText: 'Can he read your cards? Perhaps.',
        unlockCondition: { type: 'total_blackjacks', value: 25 },
        themeAffinity: 'arcane_runes'
    },
    'infernal_cow': {
        id: 'infernal_cow',
        name: 'Infernal Croupier',
        imagePath: '/assets/dealers/infernal_cow.png',
        fallbackEmoji: '🔥🐮',
        flavorText: 'Deals with the devil.',
        unlockCondition: { type: 'total_wins', value: 250 },
        themeAffinity: 'fire_table'
    },
    'boss_crimson_bull': {
        id: 'boss_crimson_bull',
        name: 'The Crimson Bull',
        imagePath: '/assets/dealers/boss_crimson_bull.png',
        fallbackEmoji: '👹🐂',
        flavorText: 'A legendary master of the tables. Do not challenge lightly.',
        unlockCondition: { type: 'total_wins', value: 500 },
        themeAffinity: 'shadow_table',
        isBoss: true
    }
};

export const TABLE_THEMES: Record<ThemeId, TableThemeDef> = {
    'classic_felt': {
        id: 'classic_felt',
        name: 'Classic Casino Felt',
        cssVariables: {
            '--bj-table-center': '#115e3a',
            '--bj-table-edge': '#032112',
            '--bj-border-color': '#3e2723'
        },
        particleEffect: null,
        unlockCondition: { type: 'default', value: 0 }
    },
    'royal_gilded': {
        id: 'royal_gilded',
        name: 'The Golden Vault',
        cssVariables: {
            '--bj-table-center': '#b45309',
            '--bj-table-edge': '#451a03',
            '--bj-border-color': '#fcd34d'
        },
        particleEffect: 'gold_dust',
        unlockCondition: { type: 'total_wins', value: 50 }
    },
    'ice_table': {
        id: 'ice_table',
        name: 'Glacial Plateau',
        cssVariables: {
            '--bj-table-center': '#0284c7',
            '--bj-table-edge': '#082f49',
            '--bj-border-color': '#e0f2fe'
        },
        particleEffect: 'snow',
        unlockCondition: { type: 'win_streak', value: 10 }
    },
    'fire_table': {
        id: 'fire_table',
        name: 'Infernal Depths',
        cssVariables: {
            '--bj-table-center': '#b91c1c',
            '--bj-table-edge': '#450a0a',
            '--bj-border-color': '#1c1917'
        },
        particleEffect: 'embers',
        unlockCondition: { type: 'total_wins', value: 250 }
    },
    'arcane_runes': {
        id: 'arcane_runes',
        name: 'Astral Convergence',
        cssVariables: {
            '--bj-table-center': '#4c1d95',
            '--bj-table-edge': '#1e1b4b',
            '--bj-border-color': '#c084fc'
        },
        particleEffect: 'void_sparkles',
        unlockCondition: { type: 'total_blackjacks', value: 25 }
    },
    'shadow_table': {
        id: 'shadow_table',
        name: 'The Hollow Casino',
        cssVariables: {
            '--bj-table-center': '#3f3f46',
            '--bj-table-edge': '#09090b',
            '--bj-border-color': '#18181b'
        },
        particleEffect: 'void_sparkles',
        unlockCondition: { type: 'total_wins', value: 500 }
    }
};
