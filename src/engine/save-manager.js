/**
 * save-manager.js
 * Persists game progress to localStorage.
 * All data lives under a single key ('megahuman_save') as a JSON object.
 */

const STORAGE_KEY = 'megahuman_save';

/** Default save shape — used when no save exists yet. */
function defaultSave() {
    return {
        memoryCount: 0,
        bossesDefeated: [],   // stage names, e.g. ['chill_penguin']
        heartTanks: 0,        // 0-8, each adds +1 max HP
    };
}

/** Read the full save object (returns defaults if nothing stored). */
export function loadSave() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSave();
        const data = JSON.parse(raw);
        // Merge with defaults so new fields are always present
        return { ...defaultSave(), ...data };
    } catch {
        return defaultSave();
    }
}

/** Write the full save object. */
export function writeSave(save) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
        // Storage full or unavailable — silently ignore
    }
}

/** Convenience: read → mutate → write in one call. */
export function updateSave(fn) {
    const save = loadSave();
    fn(save);
    writeSave(save);
}

/** Wipe save data (for a "new game" option later). */
export function clearSave() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
