/**
 * Platform-Wide Purge & Resync System
 * Clears old logs, caches, and stuck states - "Ghost Bug" elimination
 * 
 * IMPORTANT: This system is SILENT - no sounds, no toasts, no voice announcements
 * All purge operations happen silently to avoid disruptive audio
 */

const PURGE_VERSION_KEY = 'mmora_purge_version';
const CURRENT_PURGE_VERSION = '2026-01-04-v2'; // Increment to trigger purge on deploy

// Flag to prevent sounds during/after purge
const SOUND_SUPPRESSION_KEY = 'mmora_sound_suppressed_until';
const SOUND_SUPPRESSION_DURATION_MS = 10000; // 10 seconds after purge

// Keys to wipe during purge
const PURGEABLE_KEYS = [
  'zoe_chat_history',
  'zoe-chat-history',
  'map_cache',
  'temp_voice_logs',
  'zoe-speech-state',
  'zoe-old-cache',
  'temp-data',
  'expired-sessions',
  'autofix-errors',
  'zoe-offline-memory',
  'zoe-offline-conversations',
  'zoe-dhf-authorization',
  'selfie-city-cache',
  'navigation-bus-state',
];

// Session keys to clear
const SESSION_PURGEABLE_KEYS = [
  'autofix-errors',
  'zoe-session-token',
  'ws-handshake-token',
];

export const executePlatformPurge = (): { purged: boolean; keysCleared: number } => {
  try {
    const storedVersion = localStorage.getItem(PURGE_VERSION_KEY);
    
    // Skip if already purged for this version
    if (storedVersion === CURRENT_PURGE_VERSION) {
      console.log('[Purge] Already clean for version:', CURRENT_PURGE_VERSION);
      return { purged: false, keysCleared: 0 };
    }

    console.log('[Purge] Executing platform-wide cache purge...');
    let keysCleared = 0;

    // Clear localStorage
    PURGEABLE_KEYS.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        keysCleared++;
        console.log('[Purge] Cleared localStorage:', key);
      }
    });

    // Clear sessionStorage
    SESSION_PURGEABLE_KEYS.forEach(key => {
      if (sessionStorage.getItem(key) !== null) {
        sessionStorage.removeItem(key);
        keysCleared++;
        console.log('[Purge] Cleared sessionStorage:', key);
      }
    });

    // Mark as purged
    localStorage.setItem(PURGE_VERSION_KEY, CURRENT_PURGE_VERSION);

    // Set sound suppression flag to prevent activation sounds
    const suppressUntil = Date.now() + SOUND_SUPPRESSION_DURATION_MS;
    sessionStorage.setItem(SOUND_SUPPRESSION_KEY, suppressUntil.toString());

    // Dispatch SILENT event to notify Zoe core of fresh state (no sounds triggered)
    window.dispatchEvent(new CustomEvent('zoe-platform-purged', {
      detail: { version: CURRENT_PURGE_VERSION, keysCleared, silent: true }
    }));

    console.log('[Purge] Complete (silent). Keys cleared:', keysCleared);
    return { purged: true, keysCleared };
  } catch (e) {
    console.warn('[Purge] Failed:', e);
    return { purged: false, keysCleared: 0 };
  }
};

export const forceManualPurge = (): void => {
  localStorage.removeItem(PURGE_VERSION_KEY);
  executePlatformPurge();
};

export const reconnectZoeCore = (): void => {
  // Generate fresh handshake token
  const freshToken = `zoe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('ws-handshake-token', freshToken);
  
  // Dispatch reconnect signal
  window.dispatchEvent(new CustomEvent('zoe-core-reconnect', {
    detail: { token: freshToken }
  }));
  
  console.log('[Purge] Zoe core reconnect signal dispatched');
};

// Truncate console noise in production
export const truncateConsoleLogs = (): void => {
  if (import.meta.env.PROD) {
    const noop = () => {};
    // Keep errors and warns, mute debug noise
    console.debug = noop;
    console.log('[Purge] Debug logs truncated for production');
  }
};

// Check if sounds should be suppressed (after purge)
export const isSoundSuppressed = (): boolean => {
  try {
    const suppressUntil = sessionStorage.getItem(SOUND_SUPPRESSION_KEY);
    if (!suppressUntil) return false;
    return Date.now() < parseInt(suppressUntil, 10);
  } catch {
    return false;
  }
};

// Clear sound suppression (for manual override)
export const clearSoundSuppression = (): void => {
  sessionStorage.removeItem(SOUND_SUPPRESSION_KEY);
};
