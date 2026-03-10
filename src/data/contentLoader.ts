import gameContent from './gameContent.json';
import type { ItemDef, ItemType, Rarity as ItemRarity, ShopCategory } from '../store/useInventoryStore';
import type { PetDef } from '../store/useGachaStore';
import type { CodexEntry, CodexSection, CodexRarity, CodexSource } from './codex';

// ── Raw Format from JSON ──
export interface ExternalItemData {
    id: string;
    type: string;
    category?: string;
    shopCategory?: string;
    name: string;
    level?: number;
    fusionRequirement?: number;
    rarity: string;
    effectType?: string;
    effectValue?: number;
    value?: number;
    critChance?: number;
    price?: number;
    source?: string;
    description?: string;
    icon?: string;
}

const rawData = gameContent as ExternalItemData[];

// ── Merge Functions ──

export function mergeExternalPets(hardcodedPets: Record<string, PetDef>): Record<string, PetDef> {
    const combined = { ...hardcodedPets };
    let loadedCount = 0;

    rawData.forEach(item => {
        if (item.type !== 'pet') return;

        // 1. Duplicate ID Safety
        if (combined[item.id]) {
            console.warn(`[Content Loader] Skipping Pet collision. ID '${item.id}' already exists natively.`);
            return;
        }

        // 2. Map structure safely
        const petInfo: PetDef = {
            id: item.id,
            name: item.name,
            rarity: (item.rarity as PetDef['rarity']) || 'common',
            icon: item.icon || '🐾',
            description: item.description || '',
            source: item.source,
            passiveBonus: {
                type: 'attack', // Fallback
                value: item.effectValue || 0
            }
        };

        if (item.effectType === 'gold_gain' || item.effectType === 'xp_gain' || item.effectType === 'defense' || item.effectType === 'skill_xp') {
            petInfo.passiveBonus.type = item.effectType;
        }

        combined[petInfo.id] = petInfo;
        loadedCount++;
    });

    console.log(`[Content Loader] Successfully merged ${loadedCount} external pets.`);
    return combined;
}

export function mergeExternalItems(hardcodedItems: Record<string, ItemDef>): Record<string, ItemDef> {
    const combined = { ...hardcodedItems };
    let loadedCount = 0;

    rawData.forEach(item => {
        if (!['book', 'weapon', 'armor', 'relic', 'furniture', 'pet_gear', 'ticket'].includes(item.type)) return;

        // 1. Duplicate ID Safety
        if (combined[item.id]) {
            console.warn(`[Content Loader] Skipping Item collision. ID '${item.id}' already exists natively.`);
            return;
        }

        // 2. Map structure safely
        const itemInfo: ItemDef = {
            id: item.id,
            name: item.name,
            type: item.type as ItemType,
            rarity: item.rarity as ItemRarity,
            shopCategory: (item.shopCategory || 'general') as ShopCategory,
            value: item.value || 0,
            price: item.price || 0,
            critChance: item.critChance,
            icon: item.icon || (item.type === 'weapon' ? '🗡️' : item.type === 'book' ? '📘' : '📦'),
            description: item.description || '',
            category: item.category as any,
            level: item.level,
            fusionRequired: item.fusionRequirement,
            effect: item.effectType ? `+${item.effectValue} ${item.effectType}` : undefined,
            source: item.source
        };

        combined[itemInfo.id] = itemInfo;
        loadedCount++;
    });

    console.log(`[Content Loader] Successfully merged ${loadedCount} external items.`);
    return combined;
}

export function mergeExternalCodex(hardcodedCodex: CodexEntry[]): CodexEntry[] {
    const combined = [...hardcodedCodex];
    let loadedCount = 0;

    // Create a Set of existing IDs for fast O(1) collision checking
    const existingIds = new Set(combined.map(entry => entry.id));

    rawData.forEach(item => {
        let entryId = '';
        let section = '';

        if (item.type === 'pet') {
            entryId = `codex_pet_${item.id}`;
            section = 'pets';
        } else {
            const sectionMap: Record<string, string> = {
                'book': 'books',
                'weapon': 'artifacts',
                'armor': 'artifacts',
                'relic': 'relics',
                'furniture': 'relics'
            };
            if (!sectionMap[item.type]) return;
            entryId = `codex_${item.type}_${item.id}`;
            section = sectionMap[item.type];
        }

        // 1. Duplicate ID Safety
        if (existingIds.has(entryId)) {
            // No warning needed here; the pet/item mergers already threw one for this ID
            return;
        }

        // 2. Auto-Entry Stub mapping
        combined.push({
            id: entryId,
            name: item.name,
            icon: item.icon || (item.type === 'pet' ? '🐾' : item.type === 'weapon' ? '🗡️' : item.type === 'book' ? '📘' : '📦'),
            section: section as CodexSection,
            rarity: item.rarity as CodexRarity,
            description: item.description || 'A mysterious object of unknown origin.', // Fallback description stub
            sources: [(item.source as CodexSource) || (item.type === 'pet' ? 'daily_spin' : 'marketplace')],
            obtainHint: `Acquired from ${item.source || 'Unknown Route'}.`, // Fallback hint
            dupeMatters: item.type === 'pet' || item.type === 'book'
        });

        loadedCount++;
    });

    console.log(`[Content Loader] Successfully generated ${loadedCount} external Codex stubs.`);
    return combined;
}
