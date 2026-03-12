import { ITEM_DB, type ItemDef } from '../store/useInventoryStore';
import { PET_DB, type PetDef } from '../store/useGachaStore';
import { CODEX_ENTRIES } from './codex';

// ── Actual Implementation ────────
// We will iterate the databases directly to build the pools. We can cross-reference CODEX_ENTRIES to find the `source` tag since we stored it there during merge, or we can just read the original external ingestion. Wait, the `source` is ONLY mapped to the CodexEntry.
// Let's create a lookup map of ID -> source from the Codex to simplify this.

const getSourceMap = () => {
    const map: Record<string, string[]> = {};
    CODEX_ENTRIES.forEach(entry => {
        // Extract the base ID by stripping the prefix: 'codex_pet_pixel_cat' -> 'pixel_cat'
        // 'codex_weapon_rusty_sword' -> 'rusty_sword'
        const parts = entry.id.split('_');
        if (parts.length >= 3) {
            const baseId = parts.slice(2).join('_');
            map[baseId] = entry.sources as string[];
        }
    });
    return map;
};

// Lazy loaded so we don't circular depend before stores init
let sourceMapCache: Record<string, string[]> | null = null;
const getSourcesForId = (id: string): string[] => {
    if (!sourceMapCache) {
        sourceMapCache = getSourceMap();
    }
    return sourceMapCache[id] || [];
};

export const getConquestRewardPool = (): ItemDef[] => {
    // Return low-rarity items from the global pool
    return Object.values(ITEM_DB).filter(item =>
        item.rarity === 'common' || item.rarity === 'rare'
    );
};

export const getArenaRewardPool = (): ItemDef[] => {
    return Object.values(ITEM_DB).filter(item =>
        item.rarity === 'common' || item.rarity === 'rare' || item.rarity === 'epic'
    );
}

export const getDailySpinPetPool = (): PetDef[] => {
    // Daily Spin should strictly contain Pets where source includes 'gacha' or 'daily_spin'
    return Object.values(PET_DB).filter(pet => {
        const sources = getSourcesForId(pet.id);
        // By default, if no external source was provided, contentLoader defaults pets to 'daily_spin'
        return sources.includes('gacha') || sources.includes('daily_spin');
    });
};

export const getShopItemPool = (): ItemDef[] => {
    // Shop Items shouldn't include uniquely tagged source drops (like 'gacha' only) unless explicit, 
    // but for now, any generic marketplace item or book is fine.
    return Object.values(ITEM_DB).filter(item => {
        const sources = getSourcesForId(item.id);
        return sources.includes('marketplace') || sources.length === 0 || item.shopCategory !== 'general';
        // fallback heuristcs for hardcoded items without explicit codex sources
    });
};
