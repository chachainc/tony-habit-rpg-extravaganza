// ── Pet Tiers & Obtain Methods ─────────────────────────────────────────────────
// Thin extension over PET_DATABASE — adds tier/obtainMethod metadata.
// Does NOT duplicate the stat/ability/passive data.

import { PET_DATABASE, type PetDefinition } from '../store/usePetStore';

export type PetTier = 'catch' | 'shop' | 'spin' | 'legendary' | 'rareEncounter';
export type ObtainMethod = 'catch' | 'shop_purchase' | 'daily_spin' | 'board_drop' | 'jackpot' | 'secret';

export interface PetMeta {
    id: string;
    tier: PetTier;
    obtainMethod: ObtainMethod;
    notes?: string;
}

// ── Metadata by tier ──────────────────────────────────────────────────────────
// Only battle-capable pets that belong in the battle roster.
// Gacha-passive-only pets (ancient_owl passives etc.) are NOT in the battle roster — see useGachaStore.ts.

export const PET_META: Record<string, PetMeta> = {
    // CATCH tier — catchable in the wild via Pet Catch Mode
    war_chicken:      { id: 'war_chicken',      tier: 'catch',       obtainMethod: 'catch' },
    stoneback_turtle: { id: 'stoneback_turtle',  tier: 'catch',       obtainMethod: 'catch' },
    shadow_otter:     { id: 'shadow_otter',      tier: 'catch',       obtainMethod: 'catch' },
    blood_goose:      { id: 'blood_goose',       tier: 'catch',       obtainMethod: 'catch' },

    // SHOP tier — purchasable from Pet Shop
    pet_cow:          { id: 'pet_cow',           tier: 'shop',        obtainMethod: 'shop_purchase', notes: 'Free starter' },
    pet_porcupine:    { id: 'pet_porcupine',     tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_platypus:     { id: 'pet_platypus',      tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_giraffe:      { id: 'pet_giraffe',       tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_raven:        { id: 'pet_raven',         tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_rhino:        { id: 'pet_rhino',         tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_elephant:     { id: 'pet_elephant',      tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_dog:          { id: 'pet_dog',           tier: 'shop',        obtainMethod: 'shop_purchase' },
    pet_chicken:      { id: 'pet_chicken',       tier: 'shop',        obtainMethod: 'board_drop' },
    pet_sheep:        { id: 'pet_sheep',         tier: 'shop',        obtainMethod: 'board_drop' },
    pet_pig:          { id: 'pet_pig',           tier: 'shop',        obtainMethod: 'board_drop' },
    pet_goose:        { id: 'pet_goose',         tier: 'shop',        obtainMethod: 'board_drop' },
    pet_rabbit:       { id: 'pet_rabbit',        tier: 'shop',        obtainMethod: 'board_drop' },
    pixel_cat:        { id: 'pixel_cat',         tier: 'spin',        obtainMethod: 'daily_spin' },

    // COW FAMILY — shop purchasable variants (standalone archetypes)
    wizard_cow:           { id: 'wizard_cow',           tier: 'shop',    obtainMethod: 'shop_purchase' },
    highland_archer_cow:  { id: 'highland_archer_cow',  tier: 'shop',    obtainMethod: 'shop_purchase' },
    meditating_war_cow:   { id: 'meditating_war_cow',   tier: 'shop',    obtainMethod: 'shop_purchase' },

    // LEGENDARY — apex pets
    ethereal_cow:     { id: 'ethereal_cow',      tier: 'legendary',   obtainMethod: 'jackpot',       notes: 'Ethereal Cow — power ceiling' },
};

// ── Helper — get full PetDefinition + PetMeta merged ─────────────────────────
export function getPetWithMeta(petId: string): (PetDefinition & PetMeta) | null {
    const def  = PET_DATABASE[petId];
    const meta = PET_META[petId];
    if (!def) return null;
    return { ...def, ...(meta ?? { id: petId, tier: 'shop', obtainMethod: 'shop_purchase' }) };
}

// ── Battle Roster pets (catch + shop + spin + legendary tiers) ────────────────
export const BATTLE_ROSTER_PET_IDS: string[] = Object.values(PET_META)
    .filter(m => m.tier !== 'rareEncounter')
    .map(m => m.id);
