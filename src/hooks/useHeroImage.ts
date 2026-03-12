import { useProfileStore } from '../store/useProfileStore';

// Archetype-specific hero images
import ironVanguardImg from '../assets/characters/iron_vanguard.jpg';
import verdantGuardianImg from '../assets/characters/verdant_guardian.jpg';
import shadowRogueImg from '../assets/characters/shadow_rogue.png';
import arcaneScholarImg from '../assets/characters/arcane_scholar.jpg';

// Fallback (generic player sprite)
import playerSprite from '../assets/sprites/player.png';

const ARCHETYPE_IMAGES: Record<string, string> = {
    iron_vanguard: ironVanguardImg,
    verdant_guardian: verdantGuardianImg,
    shadow_rogue: shadowRogueImg,
    arcane_scholar: arcaneScholarImg,
};

/**
 * Returns the hero image based on the selected character archetype.
 * Falls back to the generic player sprite if no archetype is selected.
 */
export function useHeroImage(): string {
    const archetype = useProfileStore(s => s.characterArchetype);
    if (archetype && ARCHETYPE_IMAGES[archetype]) {
        return ARCHETYPE_IMAGES[archetype];
    }
    return playerSprite;
}

/**
 * Non-reactive version for use outside React components.
 */
export function getHeroImage(): string {
    const archetype = useProfileStore.getState().characterArchetype;
    if (archetype && ARCHETYPE_IMAGES[archetype]) {
        return ARCHETYPE_IMAGES[archetype];
    }
    return playerSprite;
}
