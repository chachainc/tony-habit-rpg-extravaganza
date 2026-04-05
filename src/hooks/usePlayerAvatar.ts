import { useProfileStore } from '../store/useProfileStore';

// Class-specific avatar images
import warriorImg from '../assets/characters/iron_vanguard_new.jpg';
import guardianImg from '../assets/characters/verdant_guardian_new.jpg';
import rangerImg from '../assets/characters/shadow_rogue_new.jpg';
import mageImg from '../assets/characters/arcane_scholar_new.jpg';

// Fallback (generic player sprite for legacy/error cases)
// (removed playerSprite)

export type ClassType = 'Warrior' | 'Mage' | 'Guardian' | 'Ranger' | null;

const AVATAR_MAP: Record<string, string> = {
    Warrior: warriorImg,
    Guardian: guardianImg,
    Ranger: rangerImg,
    Mage: mageImg,
};

/**
 * Returns the correct avatar image based on a provided class string.
 * This should be the ONLY source of truth for avatar mapping.
 */
export function getPlayerAvatar(classType: ClassType): string {
    if (classType && AVATAR_MAP[classType]) {
        return AVATAR_MAP[classType];
    }
    return warriorImg; // Global fallback is Warrior now, or playerSprite if preferred? The prompt said "fallback to Warrior".
}

/**
 * Reactive hook version for React components.
 */
export function usePlayerAvatar(): string {
    const classType = useProfileStore(s => s.classType);
    return getPlayerAvatar(classType);
}

const ULTIMATE_MAP: Record<string, string> = {
    Warrior: 'Berserker Cleave',
    Guardian: 'Judgment Slam',
    Ranger: 'Phantom Volley',
    Mage: 'Arcane Rupture',
};

export function getUltimateName(classType: ClassType): string {
    if (classType && ULTIMATE_MAP[classType]) {
        return ULTIMATE_MAP[classType];
    }
    return 'Berserker Cleave';
}
