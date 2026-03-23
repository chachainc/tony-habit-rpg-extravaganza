import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { profileApi, authApi } from '../api/profileApi';
import { PERSIST_REGISTRY } from '../data/persistRegistry';

interface ProfileState {
    shareCode: string | null;
    profileName: string;
    isLoggedIn: boolean;
    isSyncing: boolean;
    lastSyncError: string | null;
    serverVersion: number;

    // Internal hydration guard — true once Zustand has read from localStorage
    _hasHydrated: boolean;
    setHasHydrated: (val: boolean) => void;

    // Has seen the 6-screen welcome tutorial
    hasSeenWelcomeTutorial: boolean;

    // Character Onboarding
    characterArchetype: 'iron_vanguard' | 'shadow_rogue' | 'arcane_scholar' | 'verdant_guardian' | null;
    appearance: { hairHue: number; skinHue: number };
    healthTrackingMode: 'sleep' | 'readiness' | 'none' | null;

    // Player Identity
    playerTitle: string;
    activeBannerId: string | null;
    unlockedBanners: string[];

    // Actions
    createProfile: (name?: string) => Promise<string | null>;
    login: (code: string) => Promise<boolean>;
    logout: () => void;
    syncToServer: () => Promise<void>;
    exportSave: () => void;
    importSave: (json: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<boolean>;

    // Tutorial Actions
    completeWelcomeTutorial: () => void;

    // Onboarding Actions
    setCharacterArchetype: (archetype: ProfileState['characterArchetype']) => void;
    setAppearance: (appearance: ProfileState['appearance']) => void;
    setHealthTrackingMode: (mode: ProfileState['healthTrackingMode']) => void;

    // Identity Actions
    setPlayerTitle: (title: string) => void;
    setActiveBanner: (bannerId: string | null) => void;
    unlockBanner: (bannerId: string) => void;
}

/**
 * Collect all persisted store data from localStorage.
 */
function collectStoreData(): Record<string, unknown> {
    const stores: Record<string, unknown> = {};
    const found: string[] = [];
    const missing: string[] = [];

    for (const entry of Object.values(PERSIST_REGISTRY)) {
        if (!entry.syncEnabled) continue;

        const key = entry.persistKey;
        const raw = localStorage.getItem(key);
        if (raw) {
            try {
                stores[key] = JSON.parse(raw);
                found.push(key);
            } catch {
                missing.push(key);
                console.error(`[Collection] Corrupted data skipped for key: ${key}`);
            }
        } else {
            missing.push(key);
        }
    }

    console.log(`[Collection Report] Collected: ${found.length}, Missing/Empty: ${missing.length}`);
    if (missing.length > 0) {
        console.warn('[Collection] Missing store keys (this is normal if the player has not interacted with these features yet):', missing);
    }

    return stores;
}

/**
 * Hydrate all stores from server data into localStorage safely.
 */
function hydrateStores(stores: Record<string, unknown>): void {
    const success: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const entry of Object.values(PERSIST_REGISTRY)) {
        if (!entry.restoreEnabled) continue;

        const key = entry.persistKey;
        if (stores[key] !== undefined && stores[key] !== null) {
            try {
                // Merge-safe restore: attempt to preserve existing local data if possible
                const existingRaw = localStorage.getItem(key);
                let incomingValue = stores[key];

                if (existingRaw) {
                    const existing = JSON.parse(existingRaw);
                    if (typeof existing === 'object' && typeof incomingValue === 'object' && !Array.isArray(incomingValue)) {
                        // Shallow merge where incoming server payload overwrites local
                        incomingValue = { ...existing, ...(incomingValue as object) };
                    }
                }

                localStorage.setItem(key, JSON.stringify(incomingValue));
                success.push(key);
            } catch (e) {
                failed.push(key);
                console.error(`[Hydration] Failed to restore store: ${key}`, e);
            }
        } else {
            // Incoming payload did not have this key
            skipped.push(key);
        }
    }

    console.log(`[Hydration Report] Success: ${success.length}, Skipped (not in payload): ${skipped.length}, Failed: ${failed.length}`);
    if (failed.length > 0) console.error('[Hydration] Failed to parse/write keys:', failed);
}

// Debounce timer
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            _hasHydrated: false,
            setHasHydrated: (val) => set({ _hasHydrated: val }),

            shareCode: null,
            profileName: 'Hero',
            isLoggedIn: false,
            isSyncing: false,
            lastSyncError: null,
            serverVersion: 0,
            hasSeenWelcomeTutorial: false,

            characterArchetype: null,
            appearance: { hairHue: 0, skinHue: 0 },
            healthTrackingMode: null,

            playerTitle: 'Adventurer',
            activeBannerId: null,
            unlockedBanners: [],

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
                    hasSeenWelcomeTutorial: false,
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

            loginWithGoogle: async () => {
                try {
                    console.log('[GoogleAuth] Checking Firebase config...');
                    if (!auth || !googleProvider) {
                        console.error('[GoogleAuth] ❌ Firebase not configured');
                        set({ lastSyncError: 'Firebase is not configured. Fill in your .env file.' });
                        return false;
                    }

                    // Use popup — signInWithRedirect is broken in most modern browsers
                    // due to third-party cookie restrictions causing getRedirectResult
                    // to always return null.
                    console.log('[GoogleAuth] Opening Google sign-in popup...');
                    const result = await signInWithPopup(auth, googleProvider);

                    const user = result.user;
                    const email = user.email;
                    console.log('[GoogleAuth] Popup completed, email:', email);

                    if (!email || email.toLowerCase() !== 'aduca375@gmail.com') {
                        console.error('[GoogleAuth] ❌ Unauthorized email:', email);
                        await auth.signOut();
                        set({ lastSyncError: 'Unauthorized email. Only aduca375@gmail.com is allowed.' });
                        return false;
                    }

                    console.log('[GoogleAuth] Getting ID token...');
                    const idToken = await user.getIdToken();

                    console.log('[GoogleAuth] Calling backend /api/auth/google...');
                    const { data, error } = await authApi.googleLogin(idToken);
                    console.log('[GoogleAuth] Backend response — data:', data, 'error:', error);

                    if (error || !data) {
                        console.error('[GoogleAuth] ❌ Backend error:', error);
                        set({ lastSyncError: error || 'Google login failed' });
                        return false;
                    }

                    console.log('[GoogleAuth] ✅ Backend returned code, calling login()...');
                    await get().login(data.code);
                    return true;
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Google sign-in failed';
                    console.error('[GoogleAuth] ❌ Popup error:', msg, err);
                    set({ lastSyncError: msg });
                    return false;
                }
            },

            completeWelcomeTutorial: () => set({ hasSeenWelcomeTutorial: true }),

            setCharacterArchetype: (archetype) => set({ characterArchetype: archetype }),
            setAppearance: (appearance) => set({ appearance }),
            setHealthTrackingMode: (mode) => set({ healthTrackingMode: mode }),

            // Identity Actions
            setPlayerTitle: (title) => set({ playerTitle: title }),
            setActiveBanner: (bannerId) => set({ activeBannerId: bannerId }),
            unlockBanner: (bannerId) => {
                const state = get();
                if (!state.unlockedBanners.includes(bannerId)) {
                    set({ unlockedBanners: [...state.unlockedBanners, bannerId] });
                }
            },
        }),
        {
            name: 'gl-profile-storage',
            version: 1,
            onRehydrateStorage: () => (state, error) => {
                if (state) {
                    state.setHasHydrated(true);
                } else {
                    // Safari / ITP / migration error: state is undefined.
                    // Force-hydrate so App.tsx never gets stuck returning null.
                    useProfileStore.getState().setHasHydrated(true);
                }
                if (error) {
                    console.warn('[ProfileStore] Rehydration error:', error);
                }
            },
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    const translations: Record<string, string> = {
                        vanguard: 'iron_vanguard',
                        ranger: 'verdant_guardian',
                        duelist: 'shadow_rogue',
                        mystic: 'arcane_scholar'
                    };
                    if (persistedState.characterArchetype && translations[persistedState.characterArchetype]) {
                        persistedState.characterArchetype = translations[persistedState.characterArchetype];
                    }
                }
                return persistedState;
            }
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

// handleGoogleRedirectResult is no longer needed — popup flow handles
// everything inline inside loginWithGoogle().  Keep a no-op export so
// existing call-sites don't break.
export async function handleGoogleRedirectResult(): Promise<void> {
    // No-op: popup-based auth handles everything in loginWithGoogle()
}
