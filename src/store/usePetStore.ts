import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

// ── Pet Ability Types ──────────────────────────────────────────
export type AbilityScalingStat = 'Strength' | 'Cardio' | 'Flexibility' | 'Sleep' | 'Hygiene' | 'Intelligence';
export type AbilityType = 'damage' | 'heal' | 'buff_atk' | 'buff_def' | 'debuff_def' | 'extra_damage' | 'reduce_damage';
export type PetElementType = 'Fire' | 'Water' | 'Nature' | 'Earth' | 'Air' | 'Shadow' | 'Aether';

export interface PetAbility {
    id: string;
    name: string;
    icon: string;
    description: string;
    cooldown: number;
    type: AbilityType;
    baseDamage?: number;
    scalingStat?: AbilityScalingStat;
    scalingFactor?: number;
    buffValue?: number;
    buffDuration?: number;
    healBase?: number;
    healScaling?: number;
}

export interface PetPassive {
    id: string;
    name: string;
    description: string;
    icon: string;
    effect: {
        type: 'gold_gain' | 'attack_speed' | 'dodge_chance' | 'resource_gain' | 'xp_bonus' | 'crit_chance' | 'turn_speed' | 'attack_bonus' | 'defense_bonus';
        value: number; // Flat % like 3 or 5
    };
}

// Keeping these Optional since UI might expect them
export interface PetUltimate {
    id: string;
    name: string;
    icon: string;
    description: string;
    streakRequired: number;
    baseDamage: number;
    scalingStat: AbilityScalingStat;
    scalingFactor: number;
    healPercent?: number;
}
export interface PetEvolution {
    evolvedPetId: string;
    evolvedName: string;
    requiredSkill: AbilityScalingStat;
    requiredLogs: number;
    scalingBonus: number;
    newPassiveDescription: string;
}

export interface PetDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    type: PetElementType;
    hp: number;
    attack: number;
    defense: number;
    attackSpeed: number;
    role: 'Tank' | 'Tank-lite' | 'DPS' | 'Fast DPS' | 'Fast' | 'Speed' | 'Balanced' | 'Support' | 'Beginner Tank' | 'Hybrid DPS / Scaling unit' | 'Magic DPS' | 'Balanced / Sustain';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    
    abilities: [PetAbility, PetAbility];
    passive: PetPassive;
    ultimate?: PetUltimate;
    evolution?: PetEvolution;
    
    // UI might still look for these
    damageScaling?: { stat: AbilityScalingStat; factor: number };
    speedScaling?: { stat: AbilityScalingStat; factor: number };
    dodgeScaling?: { stat: AbilityScalingStat; factor: number };
    critScaling?: { stat: AbilityScalingStat; factor: number };
    resistScaling?: { stat: AbilityScalingStat; factor: number };
    spellScaling?: { stat: AbilityScalingStat; factor: number };
}

// Helper to grant generic abilities
const getAbilities = (type: PetElementType): [PetAbility, PetAbility] => {
    switch(type) {
        case 'Earth': return [
            { id: 'tackle', name: 'Tackle', icon: '💥', description: 'Deals basic damage.', cooldown: 2, type: 'damage', baseDamage: 12 },
            { id: 'harden', name: 'Harden', icon: '🛡️', description: 'Reduces damage by 20% for 2 turns.', cooldown: 4, type: 'reduce_damage', buffValue: 20, buffDuration: 2 }
        ];
        case 'Air': return [
            { id: 'peck', name: 'Peck', icon: '🦅', description: 'Quick strike.', cooldown: 1, type: 'damage', baseDamage: 8 },
            { id: 'tailwind', name: 'Tailwind', icon: '💨', description: 'Boosts attack speed temporarily.', cooldown: 3, type: 'buff_atk', buffValue: 5, buffDuration: 2 }
        ];
        case 'Nature': return [
            { id: 'vine_whip', name: 'Vine Whip', icon: '🌿', description: 'Whips the enemy.', cooldown: 2, type: 'damage', baseDamage: 10 },
            { id: 'synthesis', name: 'Synthesis', icon: '✨', description: 'Heals 25 HP.', cooldown: 5, type: 'heal', healBase: 25 }
        ];
        case 'Water': return [
            { id: 'water_gun', name: 'Water Gun', icon: '💧', description: 'Shoots water.', cooldown: 2, type: 'damage', baseDamage: 11 },
            { id: 'bubble', name: 'Bubble', icon: '🫧', description: 'Lowers enemy defense slightly.', cooldown: 3, type: 'debuff_def', buffValue: 10, buffDuration: 2 }
        ];
        case 'Shadow': return [
            { id: 'scratch', name: 'Scratch', icon: '🐾', description: 'Sharp claws.', cooldown: 1, type: 'damage', baseDamage: 9 },
            { id: 'shadow_sneak', name: 'Shadow Sneak', icon: '🌑', description: 'Deals 15 damage.', cooldown: 3, type: 'damage', baseDamage: 15 }
        ];
        case 'Fire': return [
            { id: 'ember', name: 'Ember', icon: '🔥', description: 'Burns the enemy.', cooldown: 2, type: 'damage', baseDamage: 12 },
            { id: 'roar', name: 'Roar', icon: '🗣️', description: 'Boosts attack by 20%.', cooldown: 5, type: 'buff_atk', buffValue: 20, buffDuration: 2 }
        ];
        case 'Aether': return [
            { id: 'star_flare', name: 'Star Flare', icon: '✨', description: 'Cosmic blast.', cooldown: 2, type: 'damage', baseDamage: 15 },
            { id: 'aether_veil', name: 'Aether Veil', icon: '🌌', description: 'Reduces damage by 30%.', cooldown: 5, type: 'reduce_damage', buffValue: 30, buffDuration: 2 }
        ];
        default: return [
            { id: 'tackle', name: 'Tackle', icon: '💥', description: 'Tackle.', cooldown: 2, type: 'damage', baseDamage: 10 },
            { id: 'heal', name: 'Heal', icon: '💖', description: 'Heals.', cooldown: 4, type: 'heal', healBase: 20 }
        ];
    }
};

export const PET_DATABASE: Record<string, PetDefinition> = {
    // ── FARM / MONOPOLY PETS (BEGINNER TIER) ──
    'pet_cow': {
        id: 'pet_cow', name: 'Cow', icon: '🐮', description: 'A sturdy Earth companion.',
        type: 'Earth', rarity: 'common', role: 'Beginner Tank',
        hp: 95, attack: 11, defense: 13, attackSpeed: 0.9,
        passive: { id: 'p_cow', name: 'Gold Finder', icon: '🪙', description: '+3% Gold Gain', effect: { type: 'gold_gain', value: 3 } },
        abilities: getAbilities('Earth')
    },
    'ethereal_cow': {
        id: 'ethereal_cow', name: 'Ethereal Cow', icon: '🌌', description: 'A cosmic cow that transcends space and time. Deals +20% damage to all types and takes -10% from all.',
        type: 'Aether', rarity: 'legendary', role: 'Hybrid DPS / Scaling unit',
        hp: 130, attack: 20, defense: 16, attackSpeed: 1.2,
        passive: { id: 'p_ethereal_cow', name: 'Cosmic Blessing', icon: '✨', description: '+15% ALL rewards', effect: { type: 'gold_gain', value: 15 } },
        abilities: getAbilities('Aether')
    },
    'wizard_cow': {
        id: 'wizard_cow', name: 'Wizard Cow', icon: '🧙🐮', description: 'A cow that has mastered the arcane arts.',
        type: 'Water', rarity: 'rare', role: 'Magic DPS',
        hp: 105, attack: 17, defense: 11, attackSpeed: 1.2,
        passive: { id: 'p_wizard_cow', name: 'Arcane Foraging', icon: '🔮', description: '+9% Resource Gain', effect: { type: 'resource_gain', value: 9 } },
        abilities: getAbilities('Water')
    },
    'highland_archer_cow': {
        id: 'highland_archer_cow', name: 'Highland Archer Cow', icon: '🏹🐮', description: 'A precise marksman from the grassy peaks.',
        type: 'Air', rarity: 'rare', role: 'Fast DPS',
        hp: 95, attack: 18, defense: 10, attackSpeed: 1.4,
        passive: { id: 'p_archer_cow', name: 'Swift Draw', icon: '💨', description: '+9% Attack Speed', effect: { type: 'attack_speed', value: 9 } },
        abilities: getAbilities('Air')
    },
    'meditating_war_cow': {
        id: 'meditating_war_cow', name: 'Meditating War Cow', icon: '🧘🐮', description: 'A disciplined warrior of inner peace.',
        type: 'Nature', rarity: 'epic', role: 'Balanced / Sustain',
        hp: 120, attack: 16, defense: 15, attackSpeed: 1.1,
        passive: { id: 'p_war_cow', name: 'Zen Mind', icon: '🌿', description: '+12% XP Gain', effect: { type: 'xp_bonus', value: 12 } },
        abilities: getAbilities('Nature')
    },
    'pet_chicken': {
        id: 'pet_chicken', name: 'Chicken', icon: '🐔', description: 'A fast Air companion.',
        type: 'Air', rarity: 'common', role: 'Fast',
        hp: 70, attack: 11, defense: 8, attackSpeed: 1.3,
        passive: { id: 'p_chicken', name: 'Quick Beak', icon: '⚡', description: '+3% Attack Speed', effect: { type: 'attack_speed', value: 3 } },
        abilities: getAbilities('Air')
    },
    'pet_goose': {
        id: 'pet_goose', name: 'Goose', icon: '🪿', description: 'An aggressive Air companion.',
        type: 'Air', rarity: 'rare', role: 'Fast DPS',
        hp: 80, attack: 13, defense: 9, attackSpeed: 1.35,
        passive: { id: 'p_goose', name: 'Evasive Wing', icon: '💨', description: '+5% Dodge Chance', effect: { type: 'dodge_chance', value: 5 } },
        abilities: getAbilities('Air')
    },
    'pet_pig': {
        id: 'pet_pig', name: 'Pig', icon: '🐷', description: 'A tanky Earth companion.',
        type: 'Earth', rarity: 'common', role: 'Tank',
        hp: 100, attack: 9, defense: 13, attackSpeed: 0.8,
        passive: { id: 'p_pig', name: 'Truffle Snout', icon: '🍄', description: '+3% Resource Gain', effect: { type: 'resource_gain', value: 3 } },
        abilities: getAbilities('Earth')
    },
    'pet_sheep': {
        id: 'pet_sheep', name: 'Sheep', icon: '🐑', description: 'A supportive Nature companion.',
        type: 'Nature', rarity: 'common', role: 'Support',
        hp: 85, attack: 9, defense: 10, attackSpeed: 1.0,
        passive: { id: 'p_sheep', name: 'Cozy Fleece', icon: '✨', description: '+3% XP Gain', effect: { type: 'xp_bonus', value: 3 } },
        abilities: getAbilities('Nature')
    },
    'pet_dog': {
        id: 'pet_dog', name: 'Dog', icon: '🐕', description: 'A balanced Nature companion.',
        type: 'Nature', rarity: 'uncommon', role: 'Balanced',
        hp: 85, attack: 12, defense: 10, attackSpeed: 1.2,
        passive: { id: 'p_dog', name: 'Loyal Companion', icon: '❤️', description: '+5% XP Gain', effect: { type: 'xp_bonus', value: 5 } },
        abilities: getAbilities('Nature')
    },
    'pixel_cat': {
        id: 'pixel_cat', name: 'Cat', icon: '🐱', description: 'A sharp Shadow companion.',
        type: 'Shadow', rarity: 'rare', role: 'Fast DPS',
        hp: 70, attack: 14, defense: 7, attackSpeed: 1.4,
        passive: { id: 'p_cat', name: 'Night Eye', icon: '👁️', description: '+6% Crit Chance', effect: { type: 'crit_chance', value: 6 } },
        abilities: getAbilities('Shadow')
    },
    'pet_rabbit': {
        id: 'pet_rabbit', name: 'Rabbit', icon: '🐇', description: 'A speedy Nature companion.',
        type: 'Nature', rarity: 'uncommon', role: 'Speed',
        hp: 65, attack: 10, defense: 8, attackSpeed: 1.5,
        passive: { id: 'p_rabbit', name: 'Agile Hop', icon: '⚡', description: '+5% Turn Speed Advantage', effect: { type: 'turn_speed', value: 5 } },
        abilities: getAbilities('Nature')
    },
    // ── WILD / CATCH MODE PETS (MID TIER) ──
    'war_chicken': {
        id: 'war_chicken', name: 'War Chicken', icon: '🐔🗡️', description: 'A fiery battle-ready fowl.',
        type: 'Fire', rarity: 'uncommon', role: 'DPS',
        hp: 85, attack: 15, defense: 9, attackSpeed: 1.3,
        passive: { id: 'p_war_chicken', name: 'Burning Rage', icon: '🔥', description: '+6% Attack', effect: { type: 'attack_bonus', value: 6 } },
        abilities: getAbilities('Fire')
    },
    'stoneback_turtle': {
        id: 'stoneback_turtle', name: 'Stoneback Turtle', icon: '🐢🪨', description: 'An Earth turtle with a rock-solid shell.',
        type: 'Earth', rarity: 'rare', role: 'Tank',
        hp: 120, attack: 12, defense: 18, attackSpeed: 0.7,
        passive: { id: 'p_turtle', name: 'Stone Shell', icon: '🪨', description: '+8% Defense', effect: { type: 'defense_bonus', value: 8 } },
        abilities: getAbilities('Earth')
    },
    'shadow_otter': {
        id: 'shadow_otter', name: 'Shadow Otter', icon: '🦦🌑', description: 'A shadowy water trickster.',
        type: 'Water', rarity: 'rare', role: 'Balanced',
        hp: 90, attack: 14, defense: 10, attackSpeed: 1.4,
        passive: { id: 'p_otter', name: 'Deep Diver', icon: '🌊', description: '+7% Resource Gain', effect: { type: 'resource_gain', value: 7 } },
        abilities: getAbilities('Water')
    },
    'blood_goose': {
        id: 'blood_goose', name: 'Blood Goose', icon: '🪿🩸', description: 'A terrifying shadowy predator.',
        type: 'Shadow', rarity: 'rare', role: 'DPS',
        hp: 95, attack: 16, defense: 9, attackSpeed: 1.35,
        passive: { id: 'p_blood_goose', name: 'Bloodlust', icon: '🩸', description: '+8% Crit Chance', effect: { type: 'crit_chance', value: 8 } },
        abilities: getAbilities('Shadow')
    },
    // ── SHOP PETS (PREMIUM TIER) ──
    'pet_porcupine': {
        id: 'pet_porcupine', name: 'Porcupine', icon: '🦔', description: 'An Earth guardian covered in quills.',
        type: 'Earth', rarity: 'uncommon', role: 'Tank',
        hp: 105, attack: 12, defense: 15, attackSpeed: 0.9,
        passive: { id: 'p_porcupine', name: 'Spiky Defense', icon: '🪡', description: '+7% Defense', effect: { type: 'defense_bonus', value: 7 } },
        abilities: getAbilities('Earth')
    },
    'pet_platypus': {
        id: 'pet_platypus', name: 'Platypus', icon: '🦆', description: 'A highly adaptable Water creature.',
        type: 'Water', rarity: 'uncommon', role: 'Balanced',
        hp: 95, attack: 13, defense: 11, attackSpeed: 1.2,
        passive: { id: 'p_platypus', name: 'Treasure Hunter', icon: '💎', description: '+7% Resource Gain', effect: { type: 'resource_gain', value: 7 } },
        abilities: getAbilities('Water')
    },
    'pet_giraffe': {
        id: 'pet_giraffe', name: 'Giraffe', icon: '🦒', description: 'A tall Nature companion that sees all.',
        type: 'Nature', rarity: 'rare', role: 'Balanced',
        hp: 110, attack: 14, defense: 12, attackSpeed: 1.1,
        passive: { id: 'p_giraffe', name: 'High Vantage', icon: '👁️', description: '+9% XP Gain', effect: { type: 'xp_bonus', value: 9 } },
        abilities: getAbilities('Nature')
    },
    'pet_raven': {
        id: 'pet_raven', name: 'Raven', icon: '🐦‍⬛', description: 'A swift Shadow bird.',
        type: 'Shadow', rarity: 'rare', role: 'Fast DPS',
        hp: 85, attack: 17, defense: 9, attackSpeed: 1.5,
        passive: { id: 'p_raven', name: 'Dark Flight', icon: '🌑', description: '+10% Crit Chance', effect: { type: 'crit_chance', value: 10 } },
        abilities: getAbilities('Shadow')
    },
    'pet_rhino': {
        id: 'pet_rhino', name: 'Rhino', icon: '🦏', description: 'A massive Earth juggernaut.',
        type: 'Earth', rarity: 'epic', role: 'Tank',
        hp: 135, attack: 16, defense: 19, attackSpeed: 0.8,
        passive: { id: 'p_rhino', name: 'Thick Skin', icon: '🛡️', description: '+12% Defense', effect: { type: 'defense_bonus', value: 12 } },
        abilities: getAbilities('Earth')
    },
    'pet_elephant': {
        id: 'pet_elephant', name: 'Elephant', icon: '🐘', description: 'An ancient Earth behemoth.',
        type: 'Earth', rarity: 'epic', role: 'Tank',
        hp: 140, attack: 18, defense: 20, attackSpeed: 0.7,
        passive: { id: 'p_elephant', name: 'Golden Ivory', icon: '🪙', description: '+12% Gold Gain', effect: { type: 'gold_gain', value: 12 } },
        abilities: getAbilities('Earth')
    }
};

// ── Per-catch instance shape ─────────────────────────────────────────────────
// Exists alongside the existing species-quantity system. All existing logic is
// untouched — instances are purely additive.
export interface OwnedPetInstance {
    instanceId: string;         // unique per catch (e.g. 'inst_war_chicken_1743330000')
    petId: string;              // references PET_DATABASE key
    nickname?: string;          // future: user-set nickname
    level: number;              // level at time of catch
    isRare: boolean;            // true if caught as a rare encounter
    ascensionStars: number;     // 0–5, defaults to 0
    obtainedAt: number;         // Date.now() at catch time
    obtainMethod: string;       // e.g. 'caught', 'shop_purchase'
}

// ── Store ──────────────────────────────────────────────────────
export interface PetState {
    activePet: string;
    name: string;
    health: number;
    hunger: number;
    mood: number;
    energy: number;
    ownedPets: string[];
    petQuantities: Record<string, number>;

    // Per-catch instances (NEW — additive, does not replace species ownership)
    ownedPetInstances: OwnedPetInstance[];
    activePetInstanceId: string | null;  // matches an instanceId; null = use species fallback

    // Evolution tracking
    evolvedPets: string[];  // pet IDs that have been evolved

    // Ultimate unlock tracking
    ultimateUnlocked: Record<string, boolean>;

    // Actions
    feed: (amount: number) => void;
    play: (amount: number) => void;
    sleep: () => void;
    tick: () => void;
    setName: (name: string) => void;
    switchPet: (petId: string) => void;
    addPet: (petId: string) => void;
    evolvePet: (petId: string) => void;
    unlockUltimate: (petId: string) => void;
    isEvolved: (petId: string) => boolean;
    hasUltimate: (petId: string) => boolean;
    getActivePetDef: () => PetDefinition | null;

    // New instance-based actions
    addCaughtPetInstance: (params: {
        petId: string;
        level: number;
        isRare: boolean;
        obtainMethod?: string;
    }) => OwnedPetInstance;
    getActivePetInstance: () => OwnedPetInstance | null;
    setActivePetInstance: (instanceId: string | null) => void;

    // Instance-aware resolution
    getResolvedActivePet: () => ResolvedActivePet;
    setActivePetByBestAvailable: (petId: string) => void;
}

// ── Resolved active pet shape ─────────────────────────────────────────────────
// Single object callers can use regardless of whether an instance is active.
export interface ResolvedActivePet {
    petDef: PetDefinition;       // full stat definition
    petId: string;
    level: number;               // from instance if available, else 1
    isRare: boolean;             // from instance if available, else false
    ascensionStars: number;      // from instance if available, else 0
    source: 'instance' | 'species';
    instanceId: string | null;   // null when source === 'species'
}

export const usePetStore = create<PetState>()(
    persist(
        (set, get) => ({
            activePet: 'pet_cow',
            name: 'Moo',
            health: 100,
            hunger: 80,
            mood: 80,
            energy: 90,
            ownedPets: ['pet_cow'],
            petQuantities: { 'pet_cow': 1 },
            // Instance layer — empty by default; populated by catches going forward
            ownedPetInstances: [],
            activePetInstanceId: null,
            evolvedPets: [],
            ultimateUnlocked: {},

            feed: (amount) => set((state) => ({
                hunger: Math.min(100, state.hunger + amount),
                health: Math.min(100, state.health + 5),
            })),

            play: (amount) => set((state) => ({
                mood: Math.min(100, state.mood + amount),
                energy: Math.max(0, state.energy - 10),
            })),

            sleep: () => set(() => ({ energy: 100 })),

            tick: () => {
                set((state) => ({
                    hunger: Math.max(0, state.hunger - 2),
                    mood: Math.max(0, state.mood - 1),
                    energy: Math.max(0, state.energy - 1),
                    health: state.hunger < 10 ? Math.max(0, state.health - 5) : state.health,
                }));
            },

            setName: (name) => set({ name }),

            switchPet: (petId) => {
                const state = get();
                if (state.ownedPets.includes(petId)) {
                    // Clear instance pointer unless it already belongs to this species
                    const currentInstance = state.activePetInstanceId
                        ? state.ownedPetInstances.find(i => i.instanceId === state.activePetInstanceId)
                        : null;
                    const clearInstance = currentInstance?.petId !== petId;
                    set({
                        activePet: petId,
                        ...(clearInstance ? { activePetInstanceId: null } : {}),
                    });
                }
            },

            addPet: (petId) => {
                const state = get();
                const currentQty = state.petQuantities?.[petId] || 0;
                set({
                    ownedPets: currentQty === 0 ? [...state.ownedPets, petId] : state.ownedPets,
                    petQuantities: { ...state.petQuantities, [petId]: currentQty + 1 }
                });
            },

            evolvePet: (petId) => {
                const state = get();
                if (!state.evolvedPets.includes(petId)) {
                    set({ evolvedPets: [...state.evolvedPets, petId] });
                }
            },

            unlockUltimate: (petId) => {
                set((state) => ({
                    ultimateUnlocked: { ...state.ultimateUnlocked, [petId]: true },
                }));
            },

            isEvolved: (petId) => {
                return get().evolvedPets.includes(petId);
            },

            hasUltimate: (petId) => {
                return get().ultimateUnlocked[petId] || false;
            },

            getActivePetDef: () => {
                const { activePet, evolvedPets } = get();
                const pet = PET_DATABASE[activePet];
                if (!pet) return null;

                if (evolvedPets.includes(activePet) && pet.evolution) {
                    return PET_DATABASE[pet.evolution.evolvedPetId] || pet;
                }
                return pet;
            },

            // ── Instance layer (additive — does not replace species logic) ──

            addCaughtPetInstance: (params) => {
                const { petId, level, isRare, obtainMethod = 'caught' } = params;
                const state = get();

                const instanceId = `inst_${petId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                const instance: OwnedPetInstance = {
                    instanceId,
                    petId,
                    level,
                    isRare,
                    ascensionStars: 0,
                    obtainedAt: Date.now(),
                    obtainMethod,
                };

                // Increment petQuantities (backward compat) + ensure species in ownedPets
                const currentQty = state.petQuantities?.[petId] ?? 0;
                set({
                    ownedPetInstances: [...state.ownedPetInstances, instance],
                    ownedPets: currentQty === 0 ? [...state.ownedPets, petId] : state.ownedPets,
                    petQuantities: { ...state.petQuantities, [petId]: currentQty + 1 },
                });

                return instance;
            },

            // Returns the active instance if activePetInstanceId is set and valid;
            // otherwise returns null (caller should fall back to species logic).
            getActivePetInstance: () => {
                const { activePetInstanceId, ownedPetInstances } = get();
                if (!activePetInstanceId) return null;
                return ownedPetInstances.find(i => i.instanceId === activePetInstanceId) ?? null;
            },

            setActivePetInstance: (instanceId) => {
                set({ activePetInstanceId: instanceId });
            },

            // ── getResolvedActivePet ──────────────────────────────────────────
            // Primary selector for any UI that wants the "current active pet".
            // Prefers instance data when activePetInstanceId is valid.
            getResolvedActivePet: (): ResolvedActivePet => {
                const state = get();

                // Try to resolve active instance first
                const instance = state.activePetInstanceId
                    ? state.ownedPetInstances.find(i => i.instanceId === state.activePetInstanceId) ?? null
                    : null;

                // Determine which petId + def to use
                const petId   = instance?.petId ?? state.activePet;
                const evolved = state.evolvedPets.includes(petId);
                const baseDef = PET_DATABASE[petId];
                const petDef  = evolved && baseDef?.evolution
                    ? (PET_DATABASE[baseDef.evolution.evolvedPetId] ?? baseDef)
                    : baseDef;

                if (!petDef) {
                    // Safety fallback — should not happen in practice
                    const fallbackId  = state.ownedPets[0] ?? 'pet_cow';
                    const fallbackDef = PET_DATABASE[fallbackId] ?? PET_DATABASE['pet_cow'];
                    return {
                        petDef: fallbackDef!,
                        petId: fallbackId,
                        level: 1,
                        isRare: false,
                        ascensionStars: 0,
                        source: 'species',
                        instanceId: null,
                    };
                }

                if (instance) {
                    return {
                        petDef,
                        petId: instance.petId,
                        level: instance.level,
                        isRare: instance.isRare,
                        ascensionStars: instance.ascensionStars,
                        source: 'instance',
                        instanceId: instance.instanceId,
                    };
                }

                // Species-only fallback
                return {
                    petDef,
                    petId,
                    level: 1,
                    isRare: false,
                    ascensionStars: 0,
                    source: 'species',
                    instanceId: null,
                };
            },

            // ── setActivePetByBestAvailable ───────────────────────────────────
            // Selects a species as active pet AND wires to the best (highest level)
            // owned instance of that species if one exists.
            setActivePetByBestAvailable: (petId) => {
                const state = get();
                if (!state.ownedPets.includes(petId)) return;

                // Find instances of this species, sort by level desc
                const instances = state.ownedPetInstances
                    .filter(i => i.petId === petId)
                    .sort((a, b) => b.level - a.level);

                const best = instances[0] ?? null;
                set({
                    activePet: petId,
                    activePetInstanceId: best?.instanceId ?? null,
                });
            },
        }),
        {
            name: PERSIST_REGISTRY.pets.persistKey
        }
    )
);
