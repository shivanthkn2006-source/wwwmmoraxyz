/**
 * ZOE LIP-SYNC PER-AVATAR PRESETS
 * ================================
 * Tunable, per-GLB silence pose + morph mapping multipliers so different
 * avatar rigs can avoid the "lipstick-seal / painted lips" artifact that
 * comes from one rig's neutral pose closing the mouth too tightly.
 *
 * Non-destructive: read by ZoeGLBLipSyncCanvas + LipSyncControlPanel only.
 * Stored in localStorage, keyed by avatar ID. Default avatar = 'zoe'.
 */

const KEY = 'zoe_lipsync_presets_v1';
const ACTIVE_KEY = 'zoe_lipsync_active_avatar_v1';

export interface LipSyncSilencePose {
  /** Resting jaw open (0..0.1). Higher = lips parted more in silence. */
  jawOpen: number;
  /** Resting mouth open (0..0.1). */
  mouthOpen: number;
  /** Breath-driven micro motion gain (0..0.05). */
  breathGain: number;
  /** Silence viseme weight (0..0.5). */
  visemeSilWeight: number;
  /** Hard cap on mouthClose during ANY frame (0..1). 0 = never close. */
  mouthCloseCap: number;
}

export interface LipSyncMorphMapping {
  /** jawOpen multiplier when speaking (0.4..1.5). */
  jawOpenGain: number;
  /** mouthOpen multiplier when speaking (0.4..1.5). */
  mouthOpenGain: number;
  /** mouthLowerDown L+R multiplier (0..1). Big values exaggerate chin drop. */
  mouthLowerDownGain: number;
  /** mouthUpperUp L+R multiplier (0..1). */
  mouthUpperUpGain: number;
  /** mouthStretch L+R multiplier on E/I/SS visemes (0..1). */
  mouthStretchGain: number;
  /** mouthPucker multiplier on O viseme (0..1). */
  mouthPuckerGain: number;
  /** mouthFunnel multiplier on O viseme (0..1). */
  mouthFunnelGain: number;
  /** Lerp factor for morph reset (0.3..0.95). Higher = snappier release. */
  resetLerp: number;
}

export interface LipSyncPreset {
  id: string;
  label: string;
  description: string;
  silence: LipSyncSilencePose;
  mapping: LipSyncMorphMapping;
}

/** Built-in presets shipped with the app. Users can override or add new ones. */
export const BUILTIN_PRESETS: Record<string, LipSyncPreset> = {
  zoe: {
    id: 'zoe',
    label: 'Zoe (default)',
    description: 'Tuned for the bundled Ready Player Me Zoe rig.',
    silence: {
      jawOpen: 0.012,
      mouthOpen: 0.018,
      breathGain: 0.014,
      visemeSilWeight: 0.15,
      mouthCloseCap: 0.0,
    },
    mapping: {
      jawOpenGain: 1.0,
      mouthOpenGain: 1.0,
      mouthLowerDownGain: 0.65,
      mouthUpperUpGain: 0.22,
      mouthStretchGain: 0.42,
      mouthPuckerGain: 0.32,
      mouthFunnelGain: 0.5,
      resetLerp: 0.7,
    },
  },
  'rpm-female': {
    id: 'rpm-female',
    label: 'RPM Female (open lips)',
    description: 'Generic Ready Player Me female rig, slightly more open.',
    silence: {
      jawOpen: 0.02,
      mouthOpen: 0.025,
      breathGain: 0.018,
      visemeSilWeight: 0.1,
      mouthCloseCap: 0.0,
    },
    mapping: {
      jawOpenGain: 1.05,
      mouthOpenGain: 1.05,
      mouthLowerDownGain: 0.7,
      mouthUpperUpGain: 0.28,
      mouthStretchGain: 0.45,
      mouthPuckerGain: 0.38,
      mouthFunnelGain: 0.55,
      resetLerp: 0.75,
    },
  },
  'rpm-male': {
    id: 'rpm-male',
    label: 'RPM Male (firm lips)',
    description: 'Generic Ready Player Me male rig, firmer resting pose.',
    silence: {
      jawOpen: 0.008,
      mouthOpen: 0.012,
      breathGain: 0.012,
      visemeSilWeight: 0.18,
      mouthCloseCap: 0.05,
    },
    mapping: {
      jawOpenGain: 0.95,
      mouthOpenGain: 0.95,
      mouthLowerDownGain: 0.6,
      mouthUpperUpGain: 0.18,
      mouthStretchGain: 0.4,
      mouthPuckerGain: 0.28,
      mouthFunnelGain: 0.45,
      resetLerp: 0.7,
    },
  },
  'sealed-fix': {
    id: 'sealed-fix',
    label: 'Anti-Lipstick Seal',
    description: 'Aggressive silence-open + zero mouthClose for stuck rigs.',
    silence: {
      jawOpen: 0.035,
      mouthOpen: 0.04,
      breathGain: 0.022,
      visemeSilWeight: 0.05,
      mouthCloseCap: 0.0,
    },
    mapping: {
      jawOpenGain: 1.15,
      mouthOpenGain: 1.15,
      mouthLowerDownGain: 0.8,
      mouthUpperUpGain: 0.32,
      mouthStretchGain: 0.5,
      mouthPuckerGain: 0.35,
      mouthFunnelGain: 0.55,
      resetLerp: 0.85,
    },
  },
};

interface PresetStore {
  /** Active avatar ID (which preset is in effect). */
  activeAvatarId: string;
  /** Per-avatar preset overrides (merged on top of BUILTIN_PRESETS[id]). */
  overrides: Record<string, LipSyncPreset>;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const sanitizeSilence = (s: Partial<LipSyncSilencePose> | undefined, base: LipSyncSilencePose): LipSyncSilencePose => ({
  jawOpen: clamp(typeof s?.jawOpen === 'number' ? s.jawOpen : base.jawOpen, 0, 0.1),
  mouthOpen: clamp(typeof s?.mouthOpen === 'number' ? s.mouthOpen : base.mouthOpen, 0, 0.1),
  breathGain: clamp(typeof s?.breathGain === 'number' ? s.breathGain : base.breathGain, 0, 0.05),
  visemeSilWeight: clamp(typeof s?.visemeSilWeight === 'number' ? s.visemeSilWeight : base.visemeSilWeight, 0, 0.5),
  mouthCloseCap: clamp(typeof s?.mouthCloseCap === 'number' ? s.mouthCloseCap : base.mouthCloseCap, 0, 1),
});

const sanitizeMapping = (m: Partial<LipSyncMorphMapping> | undefined, base: LipSyncMorphMapping): LipSyncMorphMapping => ({
  jawOpenGain: clamp(typeof m?.jawOpenGain === 'number' ? m.jawOpenGain : base.jawOpenGain, 0.4, 1.5),
  mouthOpenGain: clamp(typeof m?.mouthOpenGain === 'number' ? m.mouthOpenGain : base.mouthOpenGain, 0.4, 1.5),
  mouthLowerDownGain: clamp(typeof m?.mouthLowerDownGain === 'number' ? m.mouthLowerDownGain : base.mouthLowerDownGain, 0, 1),
  mouthUpperUpGain: clamp(typeof m?.mouthUpperUpGain === 'number' ? m.mouthUpperUpGain : base.mouthUpperUpGain, 0, 1),
  mouthStretchGain: clamp(typeof m?.mouthStretchGain === 'number' ? m.mouthStretchGain : base.mouthStretchGain, 0, 1),
  mouthPuckerGain: clamp(typeof m?.mouthPuckerGain === 'number' ? m.mouthPuckerGain : base.mouthPuckerGain, 0, 1),
  mouthFunnelGain: clamp(typeof m?.mouthFunnelGain === 'number' ? m.mouthFunnelGain : base.mouthFunnelGain, 0, 1),
  resetLerp: clamp(typeof m?.resetLerp === 'number' ? m.resetLerp : base.resetLerp, 0.3, 0.95),
});

const loadStore = (): PresetStore => {
  let activeAvatarId = 'zoe';
  let overrides: Record<string, LipSyncPreset> = {};
  try {
    const a = localStorage.getItem(ACTIVE_KEY);
    if (a && typeof a === 'string') activeAvatarId = a;
  } catch { /* noop */ }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { overrides?: Record<string, LipSyncPreset> };
      if (parsed && typeof parsed === 'object' && parsed.overrides) {
        overrides = parsed.overrides;
      }
    }
  } catch { /* noop */ }
  return { activeAvatarId, overrides };
};

const saveStore = (store: PresetStore) => {
  try {
    localStorage.setItem(ACTIVE_KEY, store.activeAvatarId);
    localStorage.setItem(KEY, JSON.stringify({ overrides: store.overrides }));
    window.dispatchEvent(new CustomEvent('zoe-lipsync-preset', { detail: getActivePreset() }));
  } catch { /* noop */ }
};

export const listAvatarIds = (): string[] => {
  const store = loadStore();
  const ids = new Set<string>([...Object.keys(BUILTIN_PRESETS), ...Object.keys(store.overrides)]);
  return Array.from(ids);
};

export const getActiveAvatarId = (): string => loadStore().activeAvatarId;

export const setActiveAvatarId = (id: string): LipSyncPreset => {
  const store = loadStore();
  store.activeAvatarId = id;
  saveStore(store);
  return getActivePreset();
};

/** Resolve effective preset for an avatar id (override on top of builtin). */
export const getPresetFor = (avatarId: string): LipSyncPreset => {
  const store = loadStore();
  const builtin = BUILTIN_PRESETS[avatarId] ?? BUILTIN_PRESETS.zoe;
  const override = store.overrides[avatarId];
  if (!override) return builtin;
  return {
    id: avatarId,
    label: override.label || builtin.label,
    description: override.description || builtin.description,
    silence: sanitizeSilence(override.silence, builtin.silence),
    mapping: sanitizeMapping(override.mapping, builtin.mapping),
  };
};

export const getActivePreset = (): LipSyncPreset => getPresetFor(getActiveAvatarId());

export const updateActivePreset = (patch: {
  silence?: Partial<LipSyncSilencePose>;
  mapping?: Partial<LipSyncMorphMapping>;
  label?: string;
  description?: string;
}): LipSyncPreset => {
  const store = loadStore();
  const id = store.activeAvatarId;
  const current = getPresetFor(id);
  const next: LipSyncPreset = {
    id,
    label: patch.label ?? current.label,
    description: patch.description ?? current.description,
    silence: sanitizeSilence({ ...current.silence, ...(patch.silence ?? {}) }, current.silence),
    mapping: sanitizeMapping({ ...current.mapping, ...(patch.mapping ?? {}) }, current.mapping),
  };
  store.overrides[id] = next;
  saveStore(store);
  return next;
};

export const resetActivePreset = (): LipSyncPreset => {
  const store = loadStore();
  const id = store.activeAvatarId;
  delete store.overrides[id];
  saveStore(store);
  return getActivePreset();
};

export const subscribeLipSyncPreset = (cb: (p: LipSyncPreset) => void): (() => void) => {
  const handler = (e: Event) => cb((e as CustomEvent<LipSyncPreset>).detail);
  window.addEventListener('zoe-lipsync-preset', handler);
  return () => window.removeEventListener('zoe-lipsync-preset', handler);
};
