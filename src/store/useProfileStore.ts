import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithPopup, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
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
                    persistLog('Checking Firebase config...');
                    if (!auth || !googleProvider) {
                        persistLog('❌ Firebase not configured');
                        set({ lastSyncError: 'Firebase is not configured. Fill in your .env file.' });
                        return false;
                    }

                    // Full inline flow: popup → get user → token → backend → login
                    let user;
                    try {
                        persistLog('Opening popup...');
                        const result = await signInWithPopup(auth, googleProvider);
                        user = result.user;
                        persistLog(`Popup success! user=${user.email}`);
                    } catch (popupErr: unknown) {
                        const code = (popupErr as { code?: string })?.code;
                        const msg = (popupErr as { message?: string })?.message || '';
                        persistLog(`Popup error: code=${code} msg=${msg}`);
                        set({ lastSyncError: `Google popup failed: ${code || msg}` });
                        return false;
                    }

                    // Verify email
                    const email = user.email;
                    persistLog(`Verifying email: ${email}`);
                    if (!email || email.toLowerCase() !== 'aduca375@gmail.com') {
                        persistLog(`❌ Unauthorized email: ${email}`);
                        await auth!.signOut();
                        set({ lastSyncError: 'Unauthorized email. Only aduca375@gmail.com is allowed.' });
                        return false;
                    }

                    // Get token
                    persistLog('Getting ID token...');
                    const idToken = await user.getIdToken();
                    persistLog(`Got token (${idToken.length} chars)`);

                    // Call backend
                    persistLog('Calling backend /api/auth/google...');
                    const { data, error } = await authApi.googleLogin(idToken);
                    persistLog(`Backend response: data=${JSON.stringify(data)} error=${error || 'none'}`);

                    if (error || !data) {
                        persistLog(`❌ Backend error: ${error}`);
                        set({ lastSyncError: error || 'Google login failed' });
                        return false;
                    }

                    // Login with the code (sets isLoggedIn=true, calls reload)
                    persistLog(`Calling login() with code=${data.code.substring(0, 8)}...`);
                    _googleAuthProcessing = true;
                    const loginOk = await get().login(data.code);
                    persistLog(`login() returned: ${loginOk}`);
                    return loginOk;
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Google sign-in failed';
                    persistLog(`❌ Outer error: ${msg}`);
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

// Flag to prevent double-processing in onAuthStateChanged
let _googleAuthProcessing = false;

/**
 * Persistent debug log — survives page reloads so we can trace
 * what happens during redirect flows.
 */
function persistLog(msg: string): void {
    const ts = new Date().toLocaleTimeString();
    const line = `${ts}: ${msg}`;
    console.log('[GoogleAuth]', msg);
    try {
        const existing = JSON.parse(localStorage.getItem('__google_auth_debug') || '[]');
        existing.push(line);
        // Keep last 50 entries
        if (existing.length > 50) existing.splice(0, existing.length - 50);
        localStorage.setItem('__google_auth_debug', JSON.stringify(existing));
    } catch { /* ignore */ }
}

/**
 * Call once on app startup.  Handles two cases:
 * 1. getRedirectResult — processes any pending redirect sign-in
 * 2. onAuthStateChanged — catches auth state from cached sessions
 */
export async function handleGoogleRedirectResult(): Promise<void> {
    if (!auth) return;

    persistLog('handleGoogleRedirectResult called');

    // 1. Check for redirect result first (this is the proper Firebase v9 way)
    try {
        persistLog('Calling getRedirectResult...');
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            persistLog(`getRedirectResult got user: ${result.user.email}`);
            await processFirebaseUser(result.user);
            return; // handled
        }
        persistLog('getRedirectResult: no pending result');
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        persistLog(`getRedirectResult error: ${msg}`);
    }

    // 2. Also listen for auth state changes (cached sessions)
    onAuthStateChanged(auth, async (user) => {
        if (!user || _googleAuthProcessing) return;
        const { isLoggedIn } = useProfileStore.getState();
        if (isLoggedIn) return;

        persistLog(`onAuthStateChanged fired — user: ${user.email}`);
        await processFirebaseUser(user);
    });
}

/**
 * Shared logic: given a Firebase user, verify email, get token,
 * call backend, and complete login.
 */
async function processFirebaseUser(user: import('firebase/auth').User): Promise<void> {
    _googleAuthProcessing = true;
    try {
        const email = user.email;
        persistLog(`Processing user: ${email}`);

        if (!email || email.toLowerCase() !== 'aduca375@gmail.com') {
            persistLog(`❌ Unauthorized email: ${email}`);
            await auth!.signOut();
            useProfileStore.setState({ lastSyncError: 'Unauthorized email.' });
            return;
        }

        persistLog('Getting ID token...');
        const idToken = await user.getIdToken();
        persistLog(`Got token (${idToken.length} chars)`);

        persistLog('Calling backend /api/auth/google...');
        const { data, error } = await authApi.googleLogin(idToken);
        persistLog(`Backend: data=${JSON.stringify(data)} error=${error || 'none'}`);

        if (error || !data) {
            persistLog(`❌ Backend error: ${error}`);
            useProfileStore.setState({ lastSyncError: error || 'Google login failed' });
            return;
        }

        persistLog(`✅ Logging in with code=${data.code.substring(0, 8)}...`);
        await useProfileStore.getState().login(data.code);
        persistLog('login() complete — page should reload');
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Google auth failed';
        persistLog(`❌ processFirebaseUser error: ${msg}`);
        useProfileStore.setState({ lastSyncError: msg });
    } finally {
        _googleAuthProcessing = false;
    }
}
