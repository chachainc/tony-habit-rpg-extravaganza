import { useProfileStore } from '../store/useProfileStore';

// Archetype-specific hero images
import vanguardImg from '../assets/characters/vanguard.png';
import rangerImg from '../assets/characters/ranger.png';
import duelistImg from '../assets/characters/duelist.png';
import mysticImg from '../assets/characters/mystic.png';

// Fallback (generic player sprite)
import playerSprite from '../assets/sprites/player.png';

const ARCHETYPE_IMAGES: Record<string, string> = {
    vanguard: vanguardImg,
    ranger: rangerImg,
    duelist: duelistImg,
    mystic: mysticImg,
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
