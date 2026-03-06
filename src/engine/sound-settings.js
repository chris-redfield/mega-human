/**
 * sound-settings.js
 * Manages volume levels and mute states for Music, SFX, and Buster Charge.
 * Persists to localStorage. Call apply(audioManager) to push values to the audio system.
 */

const STORAGE_KEY = 'megahuman_sound';

const DEFAULTS = {
    musicVolume:  70,   // 0-100
    sfxVolume:    40,
    chargeVolume: 25,
};

// Internal gain multipliers (maps 0-100 to the gain values the AudioManager expects)
const MUSIC_MAX_GAIN = 0.35;
const SFX_MAX_GAIN   = 0.5;
const CHARGE_MAX_GAIN = 0.5;

let _settings = null;

function _load() {
    if (_settings) return _settings;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        _settings = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
        _settings = { ...DEFAULTS };
    }
    return _settings;
}

function _save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
    } catch { /* quota exceeded — ignore */ }
}

export function resetSoundSettings() {
    _settings = { ...DEFAULTS };
    _save();
}

export function loadSoundSettings() {
    return _load();
}

export function updateSoundSettings(fn) {
    const s = _load();
    fn(s);
    _save();
}

/**
 * Push current settings to the AudioManager's gain nodes.
 * Call after any change and once at game start.
 */
export function applySoundSettings(audio) {
    if (!audio) return;
    const s = _load();

    const musicGain  = (s.musicVolume / 100) * MUSIC_MAX_GAIN;
    const sfxGain    = (s.sfxVolume / 100) * SFX_MAX_GAIN;
    const chargeGain = (s.chargeVolume / 100) * CHARGE_MAX_GAIN;

    audio.setMusicVolume(musicGain);
    audio.setSFXVolume(sfxGain);
    if (audio.setChargeVolume) audio.setChargeVolume(chargeGain);
}
