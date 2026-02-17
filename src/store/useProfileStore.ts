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

    // Actions
    createProfile: (name?: string) => Promise<string | null>;
    login: (code: string) => Promise<boolean>;
    logout: () => void;
    syncToServer: () => Promise<void>;
    exportSave: () => void;
    importSave: (json: string) => Promise<boolean>;
}

/**
 * Collect all persisted store data from localStorage.
 */
function collectStoreData(): Record<string, unknown> {
    const stores: Record<string, unknown> = {};
    const storeKeys = [
        'gl-game-storage-v7',
        'gl-battle-storage',
        'gl-pet-storage',
        'gl-calendar-storage',
        'gl-inventory-storage',
        'gl-equipment-storage',
        'gl-currency-storage',
        'gl-enemy-storage',
        'gl-book-storage',
        'gl-gym-storage',
        'gl-task-storage',
        'gl-recurring-tasks',
        'gl-room-storage',
        'gl-character-storage',
        'gl-magic-storage',
        'gl-gacha-storage',
        'gl-monopoly-storage',
        'gl-sound-storage',
        'gl-day-storage',
        'gl-campaign-storage',
        'gl-faction-storage',
        'gl-marketplace-storage',
        'gl-checkin-storage',
        'gl-consistency-storage',
        'gl-aura-storage',
        'gl-buff-storage',
        'gl-title-storage',
        'gl-skill-trophy-storage',
        'gl-book-trophy-storage',
        'gl-achievement-trophy-storage',
        'gl-conquest-storage',
        'gl-strategy-storage',
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
