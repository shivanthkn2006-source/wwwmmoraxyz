import { type AvatarCoreEmotion, type AvatarEmotionState } from '@/utils/avatarEmotionClassifier';

type MotionPreset = 'serene' | 'buoyant' | 'heavy' | 'tense' | 'pulse' | 'warm' | 'analytical' | 'unsteady';

type BaseVisual = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  sepia: number;
  overlay: string;
  auraColor: string;
  auraIntensity: number;
  breath: number;
  float: number;
  sway: number;
  duration: number;
  jitterX: number;
  motionPreset: MotionPreset;
};

type EmotionOverride = Partial<{
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  sepia: number;
  overlay: string;
  auraIntensity: number;
  breath: number;
  float: number;
  sway: number;
  duration: number;
  yOffset: number;
  tilt: number;
  speakingColor: string;
  jitterX: number;
  motionPreset: MotionPreset;
}>;

const CORE_BASE: Record<AvatarCoreEmotion, BaseVisual> = {
  idle:      { brightness: 0.99, contrast: 1.02, saturate: 1.02, hue: 0,  sepia: 0.01, overlay: 'rgba(0,229,255,0.03)', auraColor: '0,229,255', auraIntensity: 0.05, breath: 0.003, float: 0.22, sway: 0.05, duration: 7.2, jitterX: 0, motionPreset: 'serene' },
  happy:     { brightness: 1.11, contrast: 1.12, saturate: 1.22, hue: 6,  sepia: 0.05, overlay: 'rgba(255,220,50,0.14)', auraColor: '255,220,50', auraIntensity: 0.14, breath: 0.02, float: 2.2, sway: 0.45, duration: 3.8, jitterX: 0.1, motionPreset: 'buoyant' },
  sad:       { brightness: 0.8, contrast: 1.1, saturate: 0.7, hue: -10, sepia: 0.03, overlay: 'rgba(80,80,200,0.17)', auraColor: '80,100,220', auraIntensity: 0.1, breath: 0.002, float: 0.12, sway: 0.04, duration: 7.8, jitterX: 0, motionPreset: 'heavy' },
  crying:    { brightness: 0.72, contrast: 1.16, saturate: 0.58, hue: -14, sepia: 0.04, overlay: 'rgba(120,50,80,0.2)', auraColor: '150,50,100', auraIntensity: 0.16, breath: 0.012, float: 0.5, sway: 0.2, duration: 3.4, jitterX: 0.2, motionPreset: 'unsteady' },
  angry:     { brightness: 0.84, contrast: 1.26, saturate: 1.3, hue: -6, sepia: 0.05, overlay: 'rgba(255,40,40,0.18)', auraColor: '255,50,30', auraIntensity: 0.18, breath: 0.022, float: 0.35, sway: 0.44, duration: 2.6, jitterX: 1.3, motionPreset: 'tense' },
  surprised: { brightness: 1.14, contrast: 1.12, saturate: 1.2, hue: 3,  sepia: 0.04, overlay: 'rgba(255,200,0,0.14)', auraColor: '255,200,0', auraIntensity: 0.14, breath: 0.018, float: 1.5, sway: 0.25, duration: 2.9, jitterX: 0.35, motionPreset: 'pulse' },
  loving:    { brightness: 1.07, contrast: 1.05, saturate: 1.16, hue: 10, sepia: 0.08, overlay: 'rgba(255,80,180,0.13)', auraColor: '255,80,180', auraIntensity: 0.14, breath: 0.012, float: 0.78, sway: 0.27, duration: 4.8, jitterX: 0.08, motionPreset: 'warm' },
  thinking:  { brightness: 0.94, contrast: 1.06, saturate: 0.9, hue: 8,  sepia: 0.03, overlay: 'rgba(100,180,255,0.1)', auraColor: '100,160,255', auraIntensity: 0.08, breath: 0.004, float: 0.2, sway: 0.09, duration: 6.2, jitterX: 0.06, motionPreset: 'analytical' },
};

const OVERRIDE: Partial<Record<AvatarEmotionState, EmotionOverride>> = {
  idle: { speakingColor: 'rgba(0,255,255,0.8)' },
  happy: { brightness: 1.13, yOffset: -1.1 },
  joyful: { brightness: 1.16, saturate: 1.27, float: 2.5, speakingColor: 'rgba(255,230,120,0.9)' },
  excited: { contrast: 1.16, float: 2.8, sway: 0.58, duration: 3.0, speakingColor: 'rgba(255,200,80,0.9)', motionPreset: 'pulse' },
  playful: { hue: 11, sway: 0.62, tilt: 0.28, duration: 3.2, motionPreset: 'buoyant' },
  proud: { contrast: 1.13, yOffset: -1.5, tilt: -0.08 },
  grateful: { sepia: 0.12, auraIntensity: 0.16, speakingColor: 'rgba(255,220,90,0.9)' },

  sad: { yOffset: 1.6 },
  melancholic: { brightness: 0.76, saturate: 0.62, duration: 8.2 },
  lonely: { hue: -15, auraIntensity: 0.12, yOffset: 1.85 },
  disappointed: { contrast: 1.14, yOffset: 1.5 },
  nostalgic: { sepia: 0.16, hue: -5, duration: 7.4 },
  vulnerable: { brightness: 0.79, auraIntensity: 0.12 },
  bored: { saturate: 0.56, sway: 0.02, duration: 8.6 },

  crying: { yOffset: 2.0 },
  heartbroken: { hue: -20, contrast: 1.2, auraIntensity: 0.2 },
  grieving: { brightness: 0.64, saturate: 0.5, duration: 4.0, yOffset: 2.25, motionPreset: 'heavy' },
  overwhelmed: { sway: 0.4, duration: 2.4, tilt: -0.45, jitterX: 1.8, motionPreset: 'unsteady' },

  angry: { speakingColor: 'rgba(255,120,90,0.9)' },
  frustrated: { sway: 0.52, duration: 2.4, tilt: 0.28, jitterX: 1.6 },
  jealous: { hue: -12, saturate: 1.18, auraIntensity: 0.18 },
  annoyed: { float: 0.28, sway: 0.34, duration: 2.7, jitterX: 0.95 },
  disgusted: { hue: 18, sepia: 0.1, overlay: 'rgba(120,180,40,0.17)', motionPreset: 'tense' },
  impatient: { duration: 2.2, breath: 0.018, sway: 0.46, jitterX: 1.5, motionPreset: 'tense' },

  surprised: { speakingColor: 'rgba(255,220,100,0.9)' },
  amazed: { brightness: 1.18, contrast: 1.14, float: 1.9 },
  confused: { hue: -3, sway: 0.3, duration: 2.7, motionPreset: 'analytical' },
  curious: { hue: 13, float: 1.35, tilt: 0.24, motionPreset: 'analytical' },
  skeptical: { contrast: 1.15, saturate: 0.96, tilt: -0.26, motionPreset: 'analytical' },
  embarrassed: { overlay: 'rgba(255,120,140,0.13)', yOffset: 0.7, tilt: 0.3 },
  inspired: { overlay: 'rgba(255,230,120,0.15)', auraIntensity: 0.17, float: 1.6, motionPreset: 'pulse' },

  loving: { speakingColor: 'rgba(255,140,210,0.9)' },
  romantic: { sepia: 0.14, hue: 14, auraIntensity: 0.17 },
  caring: { brightness: 1.03, duration: 5.2, float: 0.62 },
  flirty: { hue: 16, saturate: 1.22, tilt: 0.26, sway: 0.34 },
  shy: { brightness: 0.99, overlay: 'rgba(255,170,200,0.12)', yOffset: 0.9 },
  tender: { contrast: 1.02, sepia: 0.11, duration: 5.4 },
  sympathetic: { overlay: 'rgba(210,170,240,0.12)', duration: 5.5 },

  thinking: { speakingColor: 'rgba(120,190,255,0.9)' },
  contemplative: { duration: 6.8, sway: 0.06, tilt: -0.12, motionPreset: 'analytical' },
  focused: { contrast: 1.12, saturate: 0.94, float: 0.12, motionPreset: 'analytical' },
  determined: { contrast: 1.16, breath: 0.006, sway: 0.08, yOffset: -0.5, motionPreset: 'analytical' },
  peaceful: { brightness: 1.01, overlay: 'rgba(120,200,255,0.09)', duration: 7.2, motionPreset: 'serene' },
  anxious: { sway: 0.34, duration: 2.2, tilt: 0.38, jitterX: 1.9, speakingColor: 'rgba(190,150,255,0.9)', motionPreset: 'unsteady' },
  nervous: { sway: 0.36, duration: 2.1, breath: 0.014, tilt: -0.32, jitterX: 2.1, speakingColor: 'rgba(190,150,255,0.9)', motionPreset: 'unsteady' },

  content: { duration: 6.1, float: 0.5, auraIntensity: 0.12, motionPreset: 'serene' },
  confident: { contrast: 1.15, yOffset: -1.0, tilt: -0.16 },
  relieved: { brightness: 1.05, duration: 5.8, breath: 0.006 },
  hopeful: { overlay: 'rgba(130,230,180,0.12)', auraIntensity: 0.16 },
  sarcastic: { hue: 22, tilt: 0.34, sway: 0.38, motionPreset: 'analytical' },
};

const getEmotionSeed = (emotion: AvatarEmotionState): number => {
  let hash = 0;
  for (let i = 0; i < emotion.length; i++) hash = (hash * 33 + emotion.charCodeAt(i)) % 4093;
  return hash;
};

export function getEmotionVisualProfile(emotion: AvatarEmotionState, coreEmotion: AvatarCoreEmotion) {
  const base = CORE_BASE[coreEmotion];
  const override = OVERRIDE[emotion] ?? {};
  const seed = getEmotionSeed(emotion);

  const seededHue = ((seed % 13) - 6) * 0.85;
  const seededSat = 1 + ((seed % 7) - 3) * 0.02;
  const seededScale = 1 + ((seed % 9) - 4) * 0.0025;
  const seededAura = 1 + ((seed % 5) * 0.11);

  const brightness = override.brightness ?? base.brightness;
  const contrast = override.contrast ?? base.contrast;
  const saturate = (override.saturate ?? base.saturate) * seededSat;
  const hue = (override.hue ?? base.hue) + seededHue;
  const sepia = override.sepia ?? base.sepia;

  const breath = override.breath ?? base.breath;
  const float = override.float ?? base.float;
  const sway = override.sway ?? base.sway;
  const duration = Math.max(2.1, override.duration ?? base.duration);

  const yOffset = override.yOffset ?? (coreEmotion === 'sad' || coreEmotion === 'crying' ? 1.4 : coreEmotion === 'happy' ? -0.8 : 0);
  const tilt = override.tilt ?? ((seed % 11) - 5) * 0.08;

  return {
    filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hue}deg) sepia(${sepia})`,
    overlay: override.overlay ?? base.overlay,
    aura: {
      color: base.auraColor,
      intensity: (override.auraIntensity ?? base.auraIntensity) * seededAura,
    },
    motion: {
      breath,
      float,
      sway,
      duration,
      jitterX: override.jitterX ?? base.jitterX,
      preset: override.motionPreset ?? base.motionPreset,
    },
    signature: {
      scaleBase: seededScale,
      yOffset,
      tilt,
    },
    speakingColor: override.speakingColor ?? 'rgba(0,255,255,0.8)',
  };
}

export function getEmotionVisualFingerprint(emotion: AvatarEmotionState, coreEmotion: AvatarCoreEmotion): string {
  const p = getEmotionVisualProfile(emotion, coreEmotion);
  return [
    emotion,
    p.filter,
    p.overlay,
    p.aura.color,
    p.aura.intensity.toFixed(4),
    p.motion.breath,
    p.motion.float,
    p.motion.sway,
    p.motion.duration,
    p.motion.jitterX,
    p.motion.preset,
    p.signature.yOffset,
    p.signature.tilt,
  ].join('|');
}
