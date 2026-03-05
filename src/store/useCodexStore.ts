import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── CODEX STORE ──────────────────────────────────────────────────────────────
// Tracks secret discovery state and lifetime spin tickets spent.

interface CodexState {
    // Secrets revealed when discovered
    discoveredSecrets: string[];
    // Total lifetime gacha tickets spent (for the 777 secret)
    lifetimeTicketsSpent: number;

    // Actions
    markSecretDiscovered: (codexId: string) => void;
    addLifetimeTickets: (count: number) => void;
    isSecretDiscovered: (codexId: string) => boolean;
    checkSecretUnlocks: () => string[]; // returns newly discovered secret IDs
}

export const useCodexStore = create<CodexState>()(
    persist(
        (set, get) => ({
            discoveredSecrets: [],
            lifetimeTicketsSpent: 0,

            markSecretDiscovered: (codexId) => {
                if (!get().discoveredSecrets.includes(codexId)) {
                    set(s => ({ discoveredSecrets: [...s.discoveredSecrets, codexId] }));
                }
            },

            addLifetimeTickets: (count) => {
                const prev = get().lifetimeTicketsSpent;
                const next = prev + count;
                set({ lifetimeTicketsSpent: next });

                // Check if crossing 777 threshold
                if (prev < 777 && next >= 777) {
                    get().markSecretDiscovered('codex_aura_secret_green');
                    // Grant the aura
                    import('./useAuraStore').then(({ useAuraStore }) => {
                        useAuraStore.getState().unlockAura('secret_green');
                    });
                    import('../components/ui/Toast').then(({ useToastStore }) => {
                        useToastStore.getState().addToast({
                            type: 'success',
                            message: '🔐 SECRET UNLOCKED: Secret Green Aura! (777 tickets spent)',
                            duration: 6000,
                        });
                    }).catch(() => { });
                }
            },

            isSecretDiscovered: (codexId) => {
                return get().discoveredSecrets.includes(codexId);
            },

            checkSecretUnlocks: () => {
                // Called externally to check streak-based secrets
                return [];
            },
        }),
        { name: 'gl-codex-v1' }
    )
);
