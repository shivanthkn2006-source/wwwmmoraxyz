/**
 * ZOE LIP-SYNC SETTINGS STORE
 * ============================
 * Persistent, isolated settings for the GLB lip-sync engine.
 * Non-destructive: read by ZoeGLBLipSyncCanvas + LipSyncControlPanel only.
 */

const KEY = 'zoe_lipsync_settings_v1';

export interface ZoeLipSyncSettings {
  enabled: boolean;            // master 3D toggle (replaces console flag)
  sensitivity: number;         // 0.5..3.0 amplitude gain
  smoothing: number;           // 0.05..0.6 jaw smoothing factor (lower = smoother)
  threshold: number;           // 0..0.3 silence threshold
  source: 'tts' | 'file';      // amplitude source
  debugOverlay: boolean;       // show real-time HUD
}

export const LIPSYNC_DEFAULTS: ZoeLipSyncSettings = {
  enabled: true,
  sensitivity: 1.3,
  smoothing: 0.45,
  threshold: 0.05,
  source: 'tts',
  debugOverlay: false,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const getLipSyncSettings = (): ZoeLipSyncSettings => {
  try {
    // Migrate legacy flag
    const legacy = localStorage.getItem('zoe_glb_lipsync');
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { ...LIPSYNC_DEFAULTS, enabled: legacy === '0' ? false : LIPSYNC_DEFAULTS.enabled };
    }
    const p = JSON.parse(raw) as Partial<ZoeLipSyncSettings>;
    return {
      enabled: typeof p.enabled === 'boolean' ? p.enabled : legacy === '1',
      sensitivity: typeof p.sensitivity === 'number' ? clamp(p.sensitivity, 0.5, 3) : LIPSYNC_DEFAULTS.sensitivity,
      smoothing: typeof p.smoothing === 'number' ? clamp(p.smoothing, 0.05, 0.6) : LIPSYNC_DEFAULTS.smoothing,
      threshold: typeof p.threshold === 'number' ? clamp(p.threshold, 0, 0.3) : LIPSYNC_DEFAULTS.threshold,
      source: p.source === 'file' ? 'file' : 'tts',
      debugOverlay: !!p.debugOverlay,
    };
  } catch {
    return LIPSYNC_DEFAULTS;
  }
};

export const setLipSyncSettings = (patch: Partial<ZoeLipSyncSettings>): ZoeLipSyncSettings => {
  const next = { ...getLipSyncSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // Keep legacy flag in sync so old reads still work
    localStorage.setItem('zoe_glb_lipsync', next.enabled ? '1' : '0');
    window.dispatchEvent(new CustomEvent('zoe-lipsync-settings', { detail: next }));
  } catch { /* noop */ }
  return next;
};

export const subscribeLipSyncSettings = (cb: (s: ZoeLipSyncSettings) => void): (() => void) => {
  const handler = (e: Event) => cb((e as CustomEvent<ZoeLipSyncSettings>).detail);
  window.addEventListener('zoe-lipsync-settings', handler);
  return () => window.removeEventListener('zoe-lipsync-settings', handler);
};

// File-audio bus (when source = 'file'). HTMLMediaElement supports both
// audio files and video files with an audio track, such as phone .MOV clips.
let fileAudioEl: HTMLMediaElement | null = null;
const fileListeners = new Set<(a: HTMLMediaElement | null) => void>();
export const setLipSyncFileAudio = (a: HTMLMediaElement | null) => {
  fileAudioEl = a;
  fileListeners.forEach((l) => { try { l(a); } catch { /* noop */ } });
};
export const getLipSyncFileAudio = () => fileAudioEl;
export const subscribeLipSyncFileAudio = (cb: (a: HTMLMediaElement | null) => void) => {
  fileListeners.add(cb);
  if (fileAudioEl) try { cb(fileAudioEl); } catch { /* noop */ }
  return () => { fileListeners.delete(cb); };
};

// Debug HUD bus
export interface LipSyncDebugFrame {
  amp: number;
  jaw: number;
  centroid: number;
  viseme: string;
  source: 'tts' | 'file' | 'idle';
}
const debugListeners = new Set<(f: LipSyncDebugFrame) => void>();
export const publishLipSyncDebug = (f: LipSyncDebugFrame) => {
  debugListeners.forEach((l) => { try { l(f); } catch { /* noop */ } });
};
export const subscribeLipSyncDebug = (cb: (f: LipSyncDebugFrame) => void) => {
  debugListeners.add(cb);
  return () => { debugListeners.delete(cb); };
};
