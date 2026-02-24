import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profileApi } from '../api/profileApi';

interface ProfileState {
    shareCode: string | null;
    profileName: string;
    isLoggedIn: boolean;
    isSyncing: boolean;
    lastSyncError: string | null;
    serverVersion: number;

    // Character Onboarding
    characterArchetype: 'vanguard' | 'ranger' | 'duelist' | 'mystic' | null;
    appearance: { hairHue: number; skinHue: number };
    healthTrackingMode: 'sleep' | 'readiness' | 'none' | null;

    // Actions
    createProfile: (name?: string) => Promise<string | null>;
    login: (code: string) => Promise<boolean>;
    logout: () => void;
    syncToServer: () => Promise<void>;
    exportSave: () => void;
    importSave: (json: string) => Promise<boolean>;

    // Onboarding Actions
    setCharacterArchetype: (archetype: ProfileState['characterArchetype']) => void;
    setAppearance: (appearance: ProfileState['appearance']) => void;
    setHealthTrackingMode: (mode: ProfileState['healthTrackingMode']) => void;
}

/**
 * Collect all persisted store data from localStorage.
 */
function collectStoreData(): Record<string, unknown> {
    const stores: Record<string, unknown> = {};
    const storeKeys = [
        'gl-game-storage-v7',
        'gl-pet-storage-v3',
        'gl-calendar-storage',
        'gl-inventory-v4',
        'gl-equipment-v1',
        'gl-currency-v2',
        'gl-enemies-v3',
        'gl-books-storage-v1',
        'gl-gym-v1',
        'gl-tasks-storage-v4',
        'gl-recurring-tasks-v2',
        'gl-room-v1',
        'gl-character-v1',
        'gl-magic-storage-v1',
        'gl-gacha-v1',
        'gl-monopoly-v3',
        'gl-sound-v1',
        'gl-day-v3',
        'gl-campaign-v2',
        'gl-factions-v1',
        'gl-marketplace-v1',
        'gl-checkin-v1',
        'gl-consistency-v1',
        'gl-auras-v1',
        'gl-buffs-v2',
        'gl-titles-v1',
        'gl-skill-trophy-v1',
        'gl-book-trophy-v1',
        'gl-achievement-trophies-v2',
        'gl-conquest-storage-v1',
        'gl-strategy-storage-v1',
        'gl-health-v1',
    ];

    for (const key of storeKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
            try {
                stores[key] = JSON.parse(raw);
            } catch {
                // Skip corrupted data
            }
        }
    }

    return stores;
}

/**
 * Hydrate all stores from server data into localStorage.
 */
function hydrateStores(stores: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(stores)) {
        if (value && typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }
}

// Debounce timer
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            shareCode: null,
            profileName: 'Hero',
            isLoggedIn: false,
            isSyncing: false,
            lastSyncError: null,
            serverVersion: 0,

            characterArchetype: null,
            appearance: { hairHue: 0, skinHue: 0 },
            healthTrackingMode: null,

            createProfile: async (name?: string) => {
                const { data, error } = await profileApi.create(name);
                if (error || !data) {
                    set({ lastSyncError: error || 'Failed to create profile' });
                    return null;
                }

                set({
                    shareCode: data.code,
                    profileName: data.profileName,
                    isLoggedIn: true,
                    lastSyncError: null,
                    serverVersion: 1,
                });

                // Initial sync
                await get().syncToServer();

                return data.code;
            },

            login: async (code: string) => {
                const trimmed = code.trim().toLowerCase();
                const { data, error } = await profileApi.load(trimmed);
                if (error || !data) {
                    set({ lastSyncError: error || 'Invalid share code' });
                    return false;
                }

                // Hydrate all stores from server data
                const serverStores = (data.data as Record<string, unknown>)?.stores;
                if (serverStores && typeof serverStores === 'object') {
                    hydrateStores(serverStores as Record<string, unknown>);
                }

                set({
                    shareCode: trimmed,
                    profileName: ((data.data as Record<string, unknown>)?.profileName as string) || 'Hero',
                    isLoggedIn: true,
                    lastSyncError: null,
                    serverVersion: data.version,
                });

                // Reload to pick up hydrated localStorage data
                window.location.reload();

                return true;
            },

            logout: () => {
                set({
                    shareCode: null,
                    profileName: 'Hero',
                    isLoggedIn: false,
                    isSyncing: false,
                    lastSyncError: null,
                    serverVersion: 0,
                    characterArchetype: null,
                    appearance: { hairHue: 0, skinHue: 0 },
                    healthTrackingMode: null,
                });
            },

            syncToServer: async () => {
                const { shareCode, isSyncing } = get();
                if (!shareCode || isSyncing) return;

                set({ isSyncing: true });

                const storeData = collectStoreData();
                const profileData = {
                    profileName: get().profileName,
                    stores: storeData,
                };

                const { data, error } = await profileApi.save(shareCode, profileData);
                if (error) {
                    set({ isSyncing: false, lastSyncError: error });
                    return;
                }

                set({
                    isSyncing: false,
                    lastSyncError: null,
                    serverVersion: data?.version || get().serverVersion,
                });
            },

            exportSave: () => {
                const storeData = collectStoreData();
                const exportData = {
                    profileName: get().profileName,
                    exportedAt: new Date().toISOString(),
                    stores: storeData,
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tony-habit-rpg-save-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            },

            importSave: async (json: string) => {
                try {
                    const data = JSON.parse(json);
                    if (!data.stores || typeof data.stores !== 'object') {
                        set({ lastSyncError: 'Invalid save file format' });
                        return false;
                    }

                    hydrateStores(data.stores as Record<string, unknown>);

                    if (data.profileName) {
                        set({ profileName: data.profileName });
                    }

                    // Sync imported data to server
                    await get().syncToServer();

                    window.location.reload();
                    return true;
                } catch {
                    set({ lastSyncError: 'Failed to parse save file' });
                    return false;
                }
            },

            // Onboarding Setters
            setCharacterArchetype: (archetype) => set({ characterArchetype: archetype }),
            setAppearance: (appearance) => set({ appearance }),
            setHealthTrackingMode: (mode) => set({ healthTrackingMode: mode }),
        }),
        {
            name: 'gl-profile-storage',
        }
    )
);

/**
 * Auto-sync: call this to trigger a debounced save to server.
 * Should be called on any significant state change.
 */
export function triggerAutoSync(): void {
    const { isLoggedIn, shareCode } = useProfileStore.getState();
    if (!isLoggedIn || !shareCode) return;

    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
        useProfileStore.getState().syncToServer();
    }, 5000); // 5 second debounce
}
