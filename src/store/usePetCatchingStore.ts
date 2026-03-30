import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PET_DATABASE } from './usePetStore';
import type { PetDefinition } from './usePetStore';
import { PERSIST_REGISTRY } from '../data/persistRegistry';
import { ZONE_MAP, WILD_ZONES, rollEncounter } from '../data/zones';
import {
    calculateCatchChance,
    rollCapture,
    FLEE_CHANCE_ON_FAILED_CAPTURE,
    RARE_STAT_BONUS,
    type CatchRarity,
} from '../data/catchRules';

// ── Wild Pet Encounter ────────────────────────────────────────────────────────

export interface WildPetEncounter extends PetDefinition {
    currentHp: number;
    maxHp: number;
    level: number;
    isRare: boolean;
    hasStatus: boolean; // Future: negative status applied by skill
}

// ── Store State & Actions ─────────────────────────────────────────────────────
// NOTE: Sigils are NOT stored here. The source of truth for sigils is
// useConquestStore.sigils. Spending calls useConquestStore.getState().addSigils(-1).

interface PetCatchingState {
    // Zone
    currentZone: string; // zone id, e.g. 'zone_meadow'

    // Player expedition HP (separate from human HP — no human progression)
    expeditionHp: number;
    maxExpeditionHp: number;

    // Encounter
    currentEncounter: WildPetEncounter | null;
    logs: string[];
    isCapturing: boolean;

    // Backward compat alias — reads from conquest store at call time
    // NOT persisted here — do not add sigilCount to initial state
    captureOrbs: number; // legacy alias: always 0 in state, actual value from conquest store

    // ── Actions ──
    setZone: (zoneId: string) => void;
    startEncounter: (zoneId?: string) => void;
    performAttack: () => void;
    performSkill: () => void;   // stub
    performSwitch: () => void;  // stub
    attemptCapture: () => Promise<boolean>;
    flee: () => void;
    endEncounter: () => void;
    healPlayer: () => void;
    addLog: (msg: string) => void;
    clearLogs: () => void;

    // Backward compat aliases
    enterGrass: () => void;
    attack: () => void;
    throwOrb: () => Promise<boolean>;
    fleeEncounter: () => void;
    buyCaptureOrb: (amount: number) => boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWildPet(petId: string, level: number, isRare: boolean): WildPetEncounter {
    const def = PET_DATABASE[petId];
    if (!def) throw new Error(`Unknown pet id: ${petId}`);

    const hpBoost = isRare ? RARE_STAT_BONUS : 1;
    const maxHp   = Math.floor((def.hp + level * 2) * hpBoost + Math.floor(Math.random() * 8));

    return {
        ...def,
        level,
        isRare,
        hasStatus: false,
        maxHp,
        currentHp: maxHp,
    };
}

function rarityToCatchRarity(rarity: string, isRare: boolean): CatchRarity {
    if (isRare) return 'rareEncounter';
    if (rarity === 'rare')     return 'rare';
    if (rarity === 'uncommon') return 'uncommon';
    return 'common';
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePetCatchingStore = create<PetCatchingState>()(
    persist(
        (set, get) => ({
            currentZone:      'zone_meadow',
            expeditionHp:     100,
            maxExpeditionHp:  100,
            currentEncounter: null,
            logs:             [],
            isCapturing:      false,
            captureOrbs:      0, // Legacy field — actual sigil count lives in useConquestStore

            // ── Zone ──
            setZone: (zoneId) => {
                if (ZONE_MAP[zoneId]) set({ currentZone: zoneId });
            },

            // ── Encounter Start ──
            startEncounter: (zoneIdOverride) => {
                const state  = get();
                const zoneId = zoneIdOverride ?? state.currentZone;
                const zone   = ZONE_MAP[zoneId] ?? WILD_ZONES[0];
                const roll   = rollEncounter(zone);

                let wildPet: WildPetEncounter;
                try {
                    wildPet = buildWildPet(roll.petId, roll.level, roll.isRare);
                } catch {
                    get().addLog('⚠️ No wild pets found in this zone!');
                    return;
                }

                const rareLabel = roll.isRare ? ' ✨ RARE!' : '';
                set({
                    currentZone:      zoneId,
                    currentEncounter: wildPet,
                    logs: [`A wild ${wildPet.name} appeared! (Lv.${roll.level})${rareLabel}`],
                    isCapturing: false,
                });
            },

            // ── Attack ──
            performAttack: () => {
                const state = get();
                if (!state.currentEncounter) return;

                const enc = state.currentEncounter;
                if (enc.currentHp <= 0) return;

                const playerDmg   = 12 + Math.floor(Math.random() * 10);
                const newHp       = Math.max(0, enc.currentHp - playerDmg);

                // Wild counter-attack (only if wild pet not fainted)
                const baseWild    = enc.rarity === 'rare' ? 18 : enc.rarity === 'uncommon' ? 12 : 8;
                const wildDmg     = newHp > 0 ? baseWild + Math.floor(Math.random() * 6) : 0;
                const newPlayerHp = Math.max(0, state.expeditionHp - wildDmg);

                const newLogs = [
                    ...state.logs,
                    `You attacked ${enc.name} for ${playerDmg} damage.`,
                ];

                if (newHp > 0) {
                    newLogs.push(`${enc.name} hits back for ${wildDmg} damage!`);
                } else {
                    newLogs.push(`${enc.name} fainted! It can't be caught now.`);
                }

                set({
                    currentEncounter: { ...enc, currentHp: newHp },
                    expeditionHp:     newPlayerHp,
                    logs:             newLogs.slice(-30),
                });

                // Player blacked out
                if (newPlayerHp <= 0) {
                    get().addLog('You ran out of HP! Retreating to town...');
                    setTimeout(() => set({ currentEncounter: null, expeditionHp: 10 }), 2000);
                }

                // Wild pet natural flee (escalating after 4+ turns)
                if (newHp > 0 && !state.isCapturing) {
                    const turns = get().logs.length / 2;
                    if (turns > 4 && Math.random() < 0.12) {
                        get().addLog(`${enc.name} fled from battle!`);
                        setTimeout(() => set({ currentEncounter: null }), 1500);
                    }
                }
            },

            // ── Skill (stub) ──
            performSkill: () => {
                get().addLog('Skill not yet unlocked. (Coming soon!)');
            },

            // ── Switch (stub) ──
            performSwitch: () => {
                get().addLog('Pet switching coming soon!');
            },

            // ── Capture ──
            // Spends 1 sigil directly from useConquestStore (single source of truth).
            // Does NOT touch any local sigilCount — avoids sync bugs.
            attemptCapture: async () => {
                const state = get();
                if (!state.currentEncounter) return false;

                const enc = state.currentEncounter;
                if (enc.currentHp <= 0) {
                    get().addLog(`${enc.name} has fainted and cannot be caught!`);
                    return false;
                }

                // Read AND spend sigil from conquest store (single source of truth)
                const { useConquestStore } = await import('./useConquestStore');
                const conquest             = useConquestStore.getState();
                if (conquest.sigils <= 0) {
                    get().addLog('No Capture Sigils!');
                    return false;
                }
                conquest.addSigils(-1); // deduct exactly 1 sigil

                set(s => ({
                    isCapturing: true,
                    logs: [...s.logs, 'You threw a Capture Sigil! ⭐'],
                }));

                const catchRarity = rarityToCatchRarity(enc.rarity, enc.isRare);
                const chance      = calculateCatchChance(
                    catchRarity,
                    enc.currentHp,
                    enc.maxHp,
                    enc.hasStatus,
                    enc.isRare
                );

                get().addLog(`Catch chance: ${(chance * 100).toFixed(1)}%...`);
                const success = rollCapture(chance);

                return new Promise<boolean>((resolve) => {
                    setTimeout(() => {
                        if (success) {
                            set(s => ({
                                logs: [...s.logs, `✅ Gotcha! ${enc.name} was caught!`],
                                isCapturing: false,
                            }));
                        } else {
                            const fled = Math.random() < FLEE_CHANCE_ON_FAILED_CAPTURE;
                            set(s => ({
                                logs: [
                                    ...s.logs,
                                    `❌ ${enc.name} broke free!`,
                                    ...(fled ? [`${enc.name} fled into the wild!`] : []),
                                ],
                                isCapturing: false,
                                currentEncounter: fled ? null : s.currentEncounter,
                            }));
                        }
                        resolve(success);
                    }, 800);
                });
            },

            // ── Flee ──
            flee: () => {
                const enc = get().currentEncounter;
                set({
                    currentEncounter: null,
                    logs: enc ? [`You fled from ${enc.name}!`] : [],
                });
            },

            endEncounter: () => set({ currentEncounter: null, logs: [] }),

            healPlayer: () => set({ expeditionHp: get().maxExpeditionHp }),

            addLog: (msg) => set(s => ({ logs: [...s.logs, msg].slice(-30) })),

            clearLogs: () => set({ logs: [] }),

            // ── Backward Compat Aliases ──────────────────────────────────────
            enterGrass:    () => get().startEncounter(),
            attack:        () => get().performAttack(),
            throwOrb:      () => get().attemptCapture(),
            fleeEncounter: () => get().flee(),
            // buyCaptureOrb: sigils now come from conquest store; this is a no-op for backward compat
            buyCaptureOrb: (_amount: number) => true,
        }),
        {
            name: PERSIST_REGISTRY.petCatching?.persistKey || 'gl-pet-catching-v1',
            partialize: (state) => ({
                // Only persist zone + expedition HP — never sigil count
                currentZone:    state.currentZone,
                expeditionHp:   state.expeditionHp,
                maxExpeditionHp: state.maxExpeditionHp,
            }),
        }
    )
);
