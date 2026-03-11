import type { StateStorage } from 'zustand/middleware';

export const safeStorage: StateStorage = {
    getItem: (name: string): string | null => {
        try {
            const value = localStorage.getItem(name);
            if (value === null) {
                return null;
            }
            // Attempt to parse it to ensure it's not corrupted JSON.
            // Zustand's persist middleware also calls JSON.parse internally, 
            // but catching it here prevents the internal throw from bubbling up.
            JSON.parse(value);
            return value;
        } catch (e) {
            console.warn(`[BOOT] Corrupted data found in localStorage for key "${name}". Returning null to use default state. Error:`, e);
            return null; // Returning null tells Zustand there is no valid stored state, so it uses defaults.
        }
    },
    setItem: (name: string, value: string): void => {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            console.warn(`[BOOT] Failed to save state to localStorage for key "${name}". Quota exceeded? Error:`, e);
        }
    },
    removeItem: (name: string): void => {
        try {
            localStorage.removeItem(name);
        } catch (e) {
            console.warn(`[BOOT] Failed to remove state from localStorage for key "${name}". Error:`, e);
        }
    },
};
