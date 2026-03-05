// ─── COLLECTION CODEX DATA ────────────────────────────────────────────────────
// Single source-of-truth for every collectible in the game.
// Used by CollectionCodex.tsx to display all items — locked or owned.

import { AURAS } from '../store/useAuraStore';
import { TITLES } from '../store/useTitleStore';
import { PET_DB } from '../store/useGachaStore';

// ── Types ────────────────────────────────────────────────────────────────────

export type CodexSection =
    | 'pets'
    | 'auras'
    | 'banners'
    | 'titles'
    | 'artifacts'
    | 'relics'
    | 'cosmetics'
    | 'books';

export type CodexRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type CodexSource =
    | 'daily_spin'
    | 'marketplace'
    | 'arena'
    | 'conquest'
    | 'achievement'
    | 'secret'
    | 'event'
    | 'starter'
    | 'library';

export interface CodexEntry {
    id: string;
    name: string;
    icon: string;
    section: CodexSection;
    rarity: CodexRarity;
    description: string;
    sources: CodexSource[];

    // How to get it (shown on locked items)
    obtainHint: string;

    // If from spin — show odds string
    spinOdds?: string;

    // If marketplace — price description
    priceHint?: string;

    // Secret items — reveal only after discovered
    isSecret?: boolean;

    // Quantity / duplicate matters (e.g. pet evolution)
    dupeMatters?: boolean;
}

// ── Helper ───────────────────────────────────────────────────────────────────

function rarityFromGacha(r: string): CodexRarity {
    if (r === 'mythic') return 'mythic';
    if (r === 'legendary') return 'legendary';
    if (r === 'epic') return 'epic';
    if (r === 'rare') return 'rare';
    if (r === 'uncommon') return 'uncommon';
    return 'common';
}

// ── PETS (from GachaMachine PET_DB) ──────────────────────────────────────────

const PET_ENTRIES: CodexEntry[] = Object.values(PET_DB).map(p => ({
    id: `codex_pet_${p.id}`,
    name: p.name,
    icon: p.icon,
    section: 'pets',
    rarity: rarityFromGacha(p.rarity),
    description: p.description,
    sources: ['daily_spin'],
    obtainHint: `Obtainable from the Daily Spin. ${p.rarity === 'legendary' || p.rarity === 'mythic' ? 'Ultra-rare!' : 'See banner odds.'}`,
    spinOdds: p.rarity === 'legendary' ? '~1:1,000' : p.rarity === 'mythic' ? '1:50,000' : 'See odds table',
    dupeMatters: true,
}));

// Add marketplace pets from items.ts
const MARKETPLACE_PET_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_pet_wolf_market',
        name: 'Wolf',
        icon: '🐺',
        section: 'pets',
        rarity: 'rare',
        description: 'A fierce and loyal battle companion. Purchasable in the Pet Store.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Pet Store. Requires Strength Lv.15.',
        priceHint: '150 tickets + 35,000 gold',
    },
    {
        id: 'codex_pet_phoenix',
        name: 'Phoenix Chick',
        icon: '🔥',
        section: 'pets',
        rarity: 'epic',
        description: 'A mythical firebird with regenerative powers. Purchasable in the Pet Store.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Pet Store. Requires Cardio Lv.20.',
        priceHint: '250 tickets + 75,000 gold + 50 diamonds',
    },
    {
        id: 'codex_pet_dragon_hatchling',
        name: 'Dragon Hatchling',
        icon: '🐲',
        section: 'pets',
        rarity: 'legendary',
        description: 'A tiny dragon with devastating fire attacks. Top-tier marketplace pet.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Pet Store. Requires Strength Lv.25 + Intelligence Lv.15.',
        priceHint: '500 tickets + 150,000 gold + 150 diamonds',
    },
    {
        id: 'codex_pet_cosmic_turtle',
        name: 'Cosmic Turtle',
        icon: '🐢',
        section: 'pets',
        rarity: 'epic',
        description: 'An ancient chelonian with cosmic armor.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Pet Store. Requires Hygiene Lv.20.',
        priceHint: '200 tickets + 50,000 gold',
    },
];

// Ultra-rare spin-only pets
const ULTRA_RARE_PET_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_pet_dragon_ultra',
        name: 'Dragon',
        icon: '🐉',
        section: 'pets',
        rarity: 'mythic',
        description: '🌌 MYTHIC — A true Dragon companion. Astronomical rarity from the Daily Spin.',
        sources: ['daily_spin'],
        obtainHint: 'Ultra-rare Daily Spin reward.',
        spinOdds: '1:50,000',
        dupeMatters: true,
    },
    {
        id: 'codex_pet_ethereal_cow',
        name: 'Ethereal Cow',
        icon: '🐮✨',
        section: 'pets',
        rarity: 'legendary',
        description: '🌌 Ultra-Rare Cosmic Bovine! Grants +25% Housemaid & Strength XP.',
        sources: ['daily_spin'],
        obtainHint: 'Ultra-rare Daily Spin jackpot reward.',
        spinOdds: '1:10,000',
        dupeMatters: true,
    },
    {
        id: 'codex_pet_golden_goldfish',
        name: 'Golden Goldfish',
        icon: '🐠',
        section: 'pets',
        rarity: 'legendary',
        description: '🐠 Ultra-Rare Aquatic Fortune! Grants +5% Hygiene XP.',
        sources: ['daily_spin'],
        obtainHint: 'Extremely rare Daily Spin luck roll.',
        spinOdds: '1:5,000',
        dupeMatters: true,
    },
];

// ── AURAS (from AURAS array) ──────────────────────────────────────────────────

const AURA_SOURCE_MAP: Record<string, { sources: CodexSource[]; hint: string; spinOdds?: string }> = {
    'none': { sources: ['starter'], hint: 'Default — always equipped.' },
    'novice_glow': { sources: ['arena'], hint: 'Reach Floor 2 in Arena.' },
    'iron_will': { sources: ['arena'], hint: 'Reach Floor 10 in Arena.' },
    'dragon_fire': { sources: ['arena'], hint: 'Defeat Floor 20 Boss in Arena.' },
    'void_essence': { sources: ['arena'], hint: 'Defeat Floor 30 in Arena.' },
    'celestial_light': { sources: ['arena'], hint: 'Reach Floor 50 in Arena.' },
    'awakening_spark': { sources: ['achievement'], hint: 'Reach Total Skill Level 25.' },
    'rising_force': { sources: ['achievement'], hint: 'Reach Total Skill Level 50.' },
    'tempest_soul': { sources: ['achievement'], hint: 'Reach Total Skill Level 100.' },
    'transcendent': { sources: ['achievement'], hint: 'Reach Total Skill Level 200.' },
    'lucky_radiance': { sources: ['daily_spin'], hint: 'Ultra-rare Daily Spin reward.', spinOdds: '1:10,000' },
};

const AURA_RARITY_MAP: Record<string, CodexRarity> = {
    'none': 'common',
    'novice_glow': 'common',
    'iron_will': 'uncommon',
    'dragon_fire': 'rare',
    'void_essence': 'epic',
    'celestial_light': 'legendary',
    'awakening_spark': 'common',
    'rising_force': 'uncommon',
    'tempest_soul': 'rare',
    'transcendent': 'epic',
    'lucky_radiance': 'mythic',
};

const AURA_ENTRIES: CodexEntry[] = AURAS.map(a => {
    const meta = AURA_SOURCE_MAP[a.id] ?? { sources: ['achievement' as CodexSource], hint: a.unlockCondition };
    return {
        id: `codex_aura_${a.id}`,
        name: a.name,
        icon: a.icon,
        section: 'auras',
        rarity: AURA_RARITY_MAP[a.id] ?? 'common',
        description: a.description,
        sources: meta.sources,
        obtainHint: meta.hint,
        spinOdds: meta.spinOdds,
    };
});

// New ultra-rare auras
const EXTRA_AURA_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_aura_cosmic',
        name: 'Cosmic Aura',
        icon: '🌌',
        section: 'auras',
        rarity: 'mythic',
        description: 'A shimmering cosmic glow of pure destiny. The rarest aura in existence.',
        sources: ['daily_spin'],
        obtainHint: 'Ultra-rare Daily Spin. Truly astronomical luck required.',
        spinOdds: '1:50,000',
    },
    {
        id: 'codex_aura_secret_green',
        name: 'Secret Green Aura',
        icon: '💚',
        section: 'auras',
        rarity: 'epic',
        description: 'A mysterious green energy. Hides a secret within it.',
        sources: ['secret'],
        obtainHint: 'Hidden unlock condition',
        isSecret: true,
    },
    {
        id: 'codex_aura_exclusive_glow',
        name: 'Exclusive Glow',
        icon: '✨',
        section: 'auras',
        rarity: 'legendary',
        description: 'Earned by the most dedicated players. A warm golden radiance.',
        sources: ['achievement'],
        obtainHint: 'Complete a 30-day login streak.',
    },
];

// ── BANNERS ───────────────────────────────────────────────────────────────────

const BANNER_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_banner_default',
        name: 'Adventurer Banner',
        icon: '🏴',
        section: 'banners',
        rarity: 'common',
        description: 'The default banner for every hero.',
        sources: ['starter'],
        obtainHint: 'Available by default.',
    },
    {
        id: 'codex_banner_flame',
        name: 'Flame Banner',
        icon: '🔥',
        section: 'banners',
        rarity: 'rare',
        description: 'A blazing banner that shows your combat spirit.',
        sources: ['arena'],
        obtainHint: 'Unlock by defeating Floor 15 Boss in Arena.',
    },
    {
        id: 'codex_banner_mythic',
        name: 'Mythic Banner',
        icon: '🌟',
        section: 'banners',
        rarity: 'mythic',
        description: 'Awarded only to those who maintain a 30-day streak. Legendary dedication.',
        sources: ['secret'],
        obtainHint: 'Hidden unlock condition',
        isSecret: true,
    },
    {
        id: 'codex_banner_conquest',
        name: 'Conquest Banner',
        icon: '⚔️',
        section: 'banners',
        rarity: 'epic',
        description: 'A banner that proves dominance on the Conquest battlefield.',
        sources: ['conquest'],
        obtainHint: 'Win 10 Conquest Tiles games.',
    },
];

// ── TITLES (from TITLES array) ────────────────────────────────────────────────

const TITLE_SOURCE_MAP: Record<string, CodexSource[]> = {
    'disciplined': ['achievement'],
    'unstoppable': ['achievement'],
    'iron_fist': ['achievement'],
    'fleet_foot': ['achievement'],
    'scholar': ['achievement'],
    'clean_freak': ['achievement'],
    'centurion': ['achievement'],
    'sleep_master': ['achievement'],
    'warrior': ['arena'],
    'champion': ['arena'],
    'golden_hand': ['achievement'],
};

const TITLE_RARITY_MAP: Record<string, CodexRarity> = {
    'disciplined': 'rare',
    'unstoppable': 'epic',
    'iron_fist': 'uncommon',
    'fleet_foot': 'uncommon',
    'scholar': 'uncommon',
    'clean_freak': 'uncommon',
    'centurion': 'rare',
    'sleep_master': 'rare',
    'warrior': 'rare',
    'champion': 'epic',
    'golden_hand': 'legendary',
};

const TITLE_ENTRIES: CodexEntry[] = TITLES.map(t => ({
    id: `codex_title_${t.id}`,
    name: t.name,
    icon: t.icon,
    section: 'titles',
    rarity: TITLE_RARITY_MAP[t.id] ?? 'uncommon',
    description: t.description,
    sources: TITLE_SOURCE_MAP[t.id] ?? ['achievement'],
    obtainHint: t.requirement,
}));

// Extra titles (secret/ultra-rare)
const EXTRA_TITLE_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_title_developer',
        name: 'Developer',
        icon: '💻',
        section: 'titles',
        rarity: 'mythic',
        description: 'An extremely rare cosmetic title. Only the luckiest reach this.',
        sources: ['secret'],
        obtainHint: 'Hidden unlock condition',
        isSecret: true,
    },
    {
        id: 'codex_title_streak_guardian',
        name: 'Streak Guardian',
        icon: '🛡️',
        section: 'titles',
        rarity: 'legendary',
        description: 'Awarded for completing a 30-day login streak.',
        sources: ['achievement'],
        obtainHint: 'Complete a 30-day consecutive daily login streak.',
    },
];

// ── ARTIFACTS (equippable for battle) ─────────────────────────────────────────

const ARTIFACT_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_artifact_combat_charm',
        name: 'Combat Charm',
        icon: '🧿',
        section: 'artifacts',
        rarity: 'common',
        description: 'A simple charm that provides minor battle bonuses.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Marketplace.',
        priceHint: '500 gold',
    },
    {
        id: 'codex_artifact_war_relic',
        name: 'War Relic',
        icon: '⚔️',
        section: 'artifacts',
        rarity: 'rare',
        description: 'An ancient relic from a forgotten war. Boosts attack.',
        sources: ['arena'],
        obtainHint: 'Reach Arena Floor 25.',
    },
    {
        id: 'codex_artifact_phoenix_feather',
        name: 'Phoenix Feather',
        icon: '🪶',
        section: 'artifacts',
        rarity: 'epic',
        description: 'A feather from a mythical phoenix. Grants regeneration in battle.',
        sources: ['conquest'],
        obtainHint: 'Win a Conquest Tiles game on Hard difficulty.',
    },
    {
        id: 'codex_artifact_dragon_scale',
        name: 'Dragon Scale',
        icon: '🐉',
        section: 'artifacts',
        rarity: 'legendary',
        description: 'A scale from a real dragon. Extreme defense bonus.',
        sources: ['arena'],
        obtainHint: 'Defeat the Arena Floor 50 Boss.',
    },
];

// ── RELICS (placeable in room) ────────────────────────────────────────────────

const RELIC_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_relic_fireplace',
        name: 'Fireplace',
        icon: '🔥',
        section: 'relics',
        rarity: 'uncommon',
        description: 'A warm fireplace to place in your room. Cozy and inviting.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Furniture Store.',
        priceHint: '8,000 gold',
    },
    {
        id: 'codex_relic_pet_bed',
        name: 'Pet Bed',
        icon: '🛏️',
        section: 'relics',
        rarity: 'common',
        description: 'A soft bed for your pet to rest in.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Furniture Store.',
        priceHint: '2,000 gold',
    },
    {
        id: 'codex_relic_guitar',
        name: 'Guitar',
        icon: '🎸',
        section: 'relics',
        rarity: 'uncommon',
        description: 'A decorative guitar for your room. Your hero can play it!',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Furniture Store.',
        priceHint: '5,000 gold',
    },
    {
        id: 'codex_relic_arcane_bookshelf',
        name: 'Arcane Bookshelf',
        icon: '📚',
        section: 'relics',
        rarity: 'legendary',
        description: 'Holds knowledge from ancient times. Grants bonus Intelligence XP.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Furniture Store. Requires Housemaid Lv.25.',
        priceHint: '80,000 gold + 100 diamonds',
    },
    {
        id: 'codex_relic_celestial_chandelier',
        name: 'Celestial Chandelier',
        icon: '💎',
        section: 'relics',
        rarity: 'legendary',
        description: 'Radiates a Cleanliness Aura. Grants +10% HP/MP regen while resting.',
        sources: ['marketplace'],
        obtainHint: 'Purchase from the Furniture Store. Requires Housemaid Lv.30.',
        priceHint: '150,000 gold + 250 diamonds',
    },
    {
        id: 'codex_relic_trophy_case',
        name: 'Trophy Case',
        icon: '🏆',
        section: 'relics',
        rarity: 'rare',
        description: 'Display your achievements. Earned through consistent wins.',
        sources: ['achievement'],
        obtainHint: 'Win 50 battles in Arena to earn your trophy case.',
    },
];

// ── COSMETICS (poses / animations) ───────────────────────────────────────────

const COSMETIC_ENTRIES: CodexEntry[] = [
    {
        id: 'codex_cosmetic_idle_default',
        name: 'Default Idle',
        icon: '🧍',
        section: 'cosmetics',
        rarity: 'common',
        description: 'The standard hero idle stance.',
        sources: ['starter'],
        obtainHint: 'Available by default.',
    },
    {
        id: 'codex_cosmetic_idle_warrior',
        name: 'Warrior Idle',
        icon: '⚔️',
        section: 'cosmetics',
        rarity: 'uncommon',
        description: 'A battle-ready stance that shows combat experience.',
        sources: ['daily_spin'],
        obtainHint: 'Obtainable from the Daily Spin.',
        spinOdds: '~1:50',
    },
    {
        id: 'codex_cosmetic_idle_zen',
        name: 'Zen Idle',
        icon: '🧘',
        section: 'cosmetics',
        rarity: 'rare',
        description: 'A peaceful meditative idle. Rare spin reward.',
        sources: ['daily_spin'],
        obtainHint: 'Rare Daily Spin reward.',
        spinOdds: '~1:200',
    },
    {
        id: 'codex_cosmetic_victory_cheer',
        name: 'Victory Cheer',
        icon: '🎉',
        section: 'cosmetics',
        rarity: 'uncommon',
        description: 'Pump your fist in victory!',
        sources: ['daily_spin'],
        obtainHint: 'Obtainable from the Daily Spin.',
        spinOdds: '~1:50',
    },
    {
        id: 'codex_cosmetic_victory_dragon',
        name: 'Dragon Victory Pose',
        icon: '🐉',
        section: 'cosmetics',
        rarity: 'epic',
        description: 'Summon a dragon silhouette behind you on victory.',
        sources: ['daily_spin'],
        obtainHint: 'Epic Daily Spin reward.',
        spinOdds: '~1:500',
    },
    {
        id: 'codex_cosmetic_pose_triumphant',
        name: 'Triumphant Pose',
        icon: '💪',
        section: 'cosmetics',
        rarity: 'rare',
        description: 'Strike a heroic pose that intimidates foes.',
        sources: ['arena'],
        obtainHint: 'Win 100 Arena battles.',
    },
    {
        id: 'codex_cosmetic_victory_cosmic',
        name: 'Cosmic Burst Victory',
        icon: '🌌',
        section: 'cosmetics',
        rarity: 'legendary',
        description: 'An explosion of cosmic energy fills the screen.',
        sources: ['daily_spin'],
        obtainHint: 'Legendary Daily Spin reward.',
        spinOdds: '~1:2,000',
    },
];

// ── BOOK ARTIFACTS (from Library) ────────────────────────────────────────────
// Each book type has levels 1-5 in the codex; owned based on useBookArtifactStore

const BOOK_CODEX_ENTRIES: CodexEntry[] = [
    // Fantasy Book
    ...([1, 2, 3, 4, 5].map(lv => ({
        id: `codex_book_fantasy_lv${lv}`,
        name: `Fantasy Book — Level ${lv}`,
        icon: '📘',
        section: 'books' as CodexSection,
        rarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'] as CodexRarity[])[lv - 1],
        description: `A Fantasy Book at Level ${lv}. Grants +${[0.05, 1, 2, 3.5, 5][lv - 1]}% Arena Combat XP.`,
        sources: ['library'] as CodexSource[],
        obtainHint: lv === 1 ? 'Complete any Fantasy book in the Library.' : `Fuse ${lv} Fantasy Books of the previous level.`,
    }))),
    // History Book
    ...([1, 2, 3, 4, 5].map(lv => ({
        id: `codex_book_history_lv${lv}`,
        name: `History Book — Level ${lv}`,
        icon: '📖',
        section: 'books' as CodexSection,
        rarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'] as CodexRarity[])[lv - 1],
        description: `A History Book at Level ${lv}. Grants +${[0.05, 1, 2, 3.5, 5][lv - 1]}% Boss Damage.`,
        sources: ['library'] as CodexSource[],
        obtainHint: lv === 1 ? 'Complete any History book in the Library.' : `Fuse ${lv} History Books of the previous level.`,
    }))),
    // Business Book
    ...([1, 2, 3, 4, 5].map(lv => ({
        id: `codex_book_business_lv${lv}`,
        name: `Business Book — Level ${lv}`,
        icon: '📓',
        section: 'books' as CodexSection,
        rarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'] as CodexRarity[])[lv - 1],
        description: `A Business Book at Level ${lv}. Grants +${[0.05, 1, 2, 3.5, 5][lv - 1]}% Marketplace Rewards.`,
        sources: ['library'] as CodexSource[],
        obtainHint: lv === 1 ? 'Complete any Business book in the Library.' : `Fuse ${lv} Business Books of the previous level.`,
    }))),
    // Self-Help Book
    ...([1, 2, 3, 4, 5].map(lv => ({
        id: `codex_book_selfhelp_lv${lv}`,
        name: `Self-Help Book — Level ${lv}`,
        icon: '📒',
        section: 'books' as CodexSection,
        rarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'] as CodexRarity[])[lv - 1],
        description: `A Self-Help Book at Level ${lv}. Grants +${[0.05, 1, 2, 3.5, 5][lv - 1]}% overall Skill XP gain.`,
        sources: ['library'] as CodexSource[],
        obtainHint: lv === 1 ? 'Complete any Self-Help/Improvement book in the Library.' : `Fuse ${lv} Self-Help Books of the previous level.`,
    }))),
];

// ── COMBINED CODEX ────────────────────────────────────────────────────────────

export const CODEX_ENTRIES: CodexEntry[] = [
    ...PET_ENTRIES,
    ...MARKETPLACE_PET_ENTRIES,
    ...ULTRA_RARE_PET_ENTRIES,
    ...AURA_ENTRIES,
    ...EXTRA_AURA_ENTRIES,
    ...BANNER_ENTRIES,
    ...TITLE_ENTRIES,
    ...EXTRA_TITLE_ENTRIES,
    ...ARTIFACT_ENTRIES,
    ...RELIC_ENTRIES,
    ...COSMETIC_ENTRIES,
    ...BOOK_CODEX_ENTRIES,
];

export function getCodexBySection(section: CodexSection): CodexEntry[] {
    return CODEX_ENTRIES.filter(e => e.section === section);
}

export const CODEX_SECTIONS: { id: CodexSection; label: string; icon: string }[] = [
    { id: 'pets', label: 'Pets', icon: '🐾' },
    { id: 'auras', label: 'Auras', icon: '✨' },
    { id: 'banners', label: 'Banners', icon: '🏴' },
    { id: 'titles', label: 'Titles', icon: '👑' },
    { id: 'artifacts', label: 'Artifacts', icon: '🧿' },
    { id: 'relics', label: 'Relics', icon: '🏺' },
    { id: 'cosmetics', label: 'Cosmetics', icon: '🎭' },
    { id: 'books', label: 'Books', icon: '📚' },
];

export const RARITY_ORDER: CodexRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITY_COLORS: Record<CodexRarity, string> = {
    common: '#94a3b8',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a78bfa',
    legendary: '#f59e0b',
    mythic: '#f43f5e',
};

export const RARITY_GLOWS: Record<CodexRarity, string> = {
    common: 'none',
    uncommon: '0 0 8px rgba(74,222,128,0.4)',
    rare: '0 0 12px rgba(96,165,250,0.5)',
    epic: '0 0 16px rgba(167,139,250,0.6)',
    legendary: '0 0 20px rgba(245,158,11,0.7)',
    mythic: '0 0 24px rgba(244,63,94,0.8)',
};

export const SOURCE_LABELS: Record<CodexSource, string> = {
    daily_spin: '🎰 Daily Spin',
    marketplace: '🏪 Marketplace',
    arena: '⚔️ Arena',
    conquest: '🗺️ Conquest',
    achievement: '🏅 Achievement',
    secret: '🔐 Secret',
    event: '🎉 Event',
    starter: '🎁 Starter',
    library: '📚 Library',
};
