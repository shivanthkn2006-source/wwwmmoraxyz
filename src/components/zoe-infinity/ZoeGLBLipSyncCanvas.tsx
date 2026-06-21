/**
 * ZOE GLB LIP-SYNC CANVAS — Real 3D head with audio-driven blendshapes
 * =====================================================================
 * Loads a Ready Player Me GLB rig (ARKit + Oculus Visemes) and drives
 * jawOpen + viseme blendshapes from live Web Audio AnalyserNode samples
 * tapped off the Deepgram Aura-2 TTS audio stream.
 *
 * Non-destructive: rendered ONLY when the parent opts in via prop.
 * Falls back to children (the existing 2D AvatarCanvas) on any error.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import zoeGlbUrl from '@/assets/models/zoe-avatar.glb';
import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';
import { type AvatarEmotionState, getCoreEmotion } from '@/utils/avatarEmotionClassifier';
import {
  getLipSyncSettings,
  subscribeLipSyncSettings,
  subscribeLipSyncFileAudio,
  publishLipSyncDebug,
  type ZoeLipSyncSettings,
} from '@/stores/zoeLipSyncSettings';
import { subscribeZoeGesture, type ZoeGestureEvent, type ZoeGestureName } from '@/utils/zoeGestureBus';
import { getActivePreset, subscribeLipSyncPreset, type LipSyncPreset } from '@/stores/zoeLipSyncPresets';

useGLTF.preload(zoeGlbUrl);

const PORTRAIT_TARGET = new THREE.Vector3(0, 1.55, 0.03);
const PORTRAIT_CAMERA_Z = 1.45;
const PORTRAIT_FOV = 28;

// Vowel-shape weighting based on rough spectral centroid (low → "aa/oh", high → "ee/ss")
type VisemeWeights = Partial<Record<
  'viseme_aa' | 'viseme_E' | 'viseme_I' | 'viseme_O' | 'viseme_U' |
  'viseme_PP' | 'viseme_FF' | 'viseme_SS' | 'viseme_sil' |
  'jawOpen' | 'mouthOpen' | 'mouthClose' | 'mouthFunnel' | 'mouthSmile' |
  'mouthSmileLeft' | 'mouthSmileRight' | 'mouthPucker' | 'mouthFrownLeft' | 'mouthFrownRight' |
  'mouthLowerDownLeft' | 'mouthLowerDownRight' | 'mouthUpperUpLeft' | 'mouthUpperUpRight' |
  'mouthStretchLeft' | 'mouthStretchRight' | 'mouthShrugLower' | 'mouthShrugUpper' |
  'mouthPressLeft' | 'mouthPressRight' | 'cheekSquintLeft' | 'cheekSquintRight' |
  'eyeSquintLeft' | 'eyeSquintRight' | 'eyeWideLeft' | 'eyeWideRight' |
  'eyeLookDownLeft' | 'eyeLookDownRight' | 'browInnerUp' | 'browDownLeft' | 'browDownRight',
  number
>>;

interface ZoeHeadProps {
  isSpeaking: boolean;
  emotionState: AvatarEmotionState;
}

function PortraitCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, PORTRAIT_TARGET.y, PORTRAIT_CAMERA_Z);
      camera.fov = PORTRAIT_FOV;
      camera.near = 0.03;
      camera.far = 50;
      camera.lookAt(PORTRAIT_TARGET);
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  return null;
}

function ZoeHead({ isSpeaking, emotionState }: ZoeHeadProps) {
  const { scene } = useGLTF(zoeGlbUrl) as { scene: THREE.Group };

  const model = useMemo(() => scene.clone(true), [scene]);
  const basePositionRef = useRef(new THREE.Vector3(0, -1.5, 0));
  const baseRotationYRef = useRef(0);

  // Find every mesh that has morph targets (face mesh, teeth, tongue)
  const morphMeshes = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        meshes.push(obj);
      }
    });
    return meshes;
  }, [model]);

  // Audio analyser refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array>(new Uint8Array(64));
  const connectedAudios = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());
  const activeAudioRef = useRef<HTMLMediaElement | null>(null);
  const activeSourceTypeRef = useRef<'tts' | 'file' | 'idle'>('idle');
  const settingsRef = useRef<ZoeLipSyncSettings>(getLipSyncSettings());
  const presetRef = useRef<LipSyncPreset>(getActivePreset());

  // Live settings + preset subscription
  useEffect(() => {
    const unsubS = subscribeLipSyncSettings((s) => { settingsRef.current = s; });
    const unsubP = subscribeLipSyncPreset((p) => { presetRef.current = p; });
    return () => { unsubS(); unsubP(); };
  }, []);

  const ensureAnalyser = () => {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) {
      ctxRef.current = new Ctx();
      const analyser = ctxRef.current.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume().catch(() => {});
    return analyserRef.current;
  };

  const tapAudio = (audio: HTMLMediaElement, kind: 'tts' | 'file') => {
    const analyser = ensureAnalyser();
    if (!analyser || !ctxRef.current) return;
    if (connectedAudios.current.has(audio)) {
      activeSourceTypeRef.current = kind;
      activeAudioRef.current = audio;
      return;
    }
    try {
      const src = ctxRef.current.createMediaElementSource(audio);
      src.connect(analyser);
      analyser.connect(ctxRef.current.destination);
      connectedAudios.current.add(audio);
      activeSourceTypeRef.current = kind;
      activeAudioRef.current = audio;
      const clearIfCurrent = () => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
        if (activeSourceTypeRef.current === kind) activeSourceTypeRef.current = 'idle';
      };
      audio.addEventListener('ended', clearIfCurrent, { once: true });
      audio.addEventListener('pause', () => {
        if (audio.ended) clearIfCurrent();
      });
    } catch (err) {
      console.debug('[ZoeGLBLipSync] analyser tap skipped:', err);
    }
  };

  // TTS audio subscription
  useEffect(() => {
    const unsub = subscribeTTSAudio((audio) => {
      if (!audio) return;
      if (settingsRef.current.source !== 'tts') return;
      tapAudio(audio, 'tts');
    });
    return () => { unsub(); };
  }, []);

  // File audio subscription
  useEffect(() => {
    const unsub = subscribeLipSyncFileAudio((audio) => {
      if (!audio) return;
      if (settingsRef.current.source !== 'file') return;
      tapAudio(audio, 'file');
    });
    return () => { unsub(); };
  }, []);

  // Smoothed targets
  const smoothJaw = useRef(0);
  const blinkPhase = useRef(0);
  const breathPhase = useRef(0);
  const emotionStrength = useRef(0);

  // Active time-bounded gesture (overlay on top of base emotion)
  const activeGestureRef = useRef<ZoeGestureEvent | null>(null);
  useEffect(() => {
    const unsub = subscribeZoeGesture((evt) => { activeGestureRef.current = evt; });
    return () => { unsub(); };
  }, []);

  const debugFrame = useRef(0);

  useFrame((_, dt) => {
    const settings = settingsRef.current;
    const preset = presetRef.current;
    const sil = preset.silence;
    const map = preset.mapping;
    let amp = 0;
    let centroid = 0;
    const activeAudio = activeAudioRef.current;
    const hasLiveAudio = !!activeAudio && !activeAudio.paused && !activeAudio.ended;
    const shouldSampleAudio = isSpeaking || (settings.source === 'file' && hasLiveAudio);

    if (shouldSampleAudio && analyserRef.current) {
      analyserRef.current.getByteFrequencyData(dataRef.current as any);
      let sum = 0;
      let weighted = 0;
      let total = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        const v = dataRef.current[i];
        sum += v;
        weighted += v * i;
        total += v;
      }
      amp = Math.min(1, (sum / dataRef.current.length) / 110);
      centroid = total > 0 ? (weighted / total) / dataRef.current.length : 0;
    }

    // Threshold + sensitivity
    const gated = amp < settings.threshold ? 0 : (amp - settings.threshold) / (1 - settings.threshold);
    const targetJaw = shouldSampleAudio ? Math.min(0.95, gated * settings.sensitivity) : 0;
    const k = targetJaw > smoothJaw.current ? settings.smoothing : Math.max(0.05, settings.smoothing * 0.4);
    smoothJaw.current += (targetJaw - smoothJaw.current) * k;

    const coreEmotion = getCoreEmotion(emotionState);
    emotionStrength.current += ((coreEmotion === 'idle' ? 0.25 : 1) - emotionStrength.current) * 0.045;

    const weights: VisemeWeights = {};
    let visemeName = 'sil';
    if (smoothJaw.current < 0.05) {
      // Per-avatar relaxed silence pose. Tunable via preset to fix rigs that
      // close their mouth too tightly in the neutral pose ("lipstick seal").
      const breath = Math.sin(breathPhase.current * 1.3) * 0.5 + 0.5;
      weights.viseme_sil = sil.visemeSilWeight;
      weights.mouthClose = 0;
      weights.jawOpen = sil.jawOpen + breath * sil.breathGain;
      weights.mouthOpen = sil.mouthOpen + breath * sil.breathGain;
      visemeName = 'sil';
    } else if (centroid < 0.18) {
      weights.viseme_O = smoothJaw.current * 0.9;
      weights.mouthFunnel = smoothJaw.current * map.mouthFunnelGain;
      visemeName = 'O';
    } else if (centroid < 0.32) {
      weights.viseme_aa = smoothJaw.current * 1.0;
      visemeName = 'aa';
    } else if (centroid < 0.5) {
      weights.viseme_E = smoothJaw.current * 0.85;
      visemeName = 'E';
    } else {
      weights.viseme_I = smoothJaw.current * 0.7;
      weights.viseme_SS = Math.max(0, (centroid - 0.5)) * 0.6;
      visemeName = 'I/SS';
    }
    weights.jawOpen = smoothJaw.current * map.jawOpenGain;
    weights.mouthOpen = smoothJaw.current * map.mouthOpenGain;
    weights.mouthClose = shouldSampleAudio ? 0 : weights.mouthClose;
    weights.mouthLowerDownLeft = smoothJaw.current * map.mouthLowerDownGain;
    weights.mouthLowerDownRight = smoothJaw.current * map.mouthLowerDownGain;
    weights.mouthUpperUpLeft = smoothJaw.current * map.mouthUpperUpGain;
    weights.mouthUpperUpRight = smoothJaw.current * map.mouthUpperUpGain;
    if (visemeName === 'E' || visemeName === 'I/SS') {
      weights.mouthStretchLeft = smoothJaw.current * map.mouthStretchGain;
      weights.mouthStretchRight = smoothJaw.current * map.mouthStretchGain;
    }
    if (visemeName === 'O') {
      weights.mouthPucker = Math.max(weights.mouthPucker ?? 0, smoothJaw.current * map.mouthPuckerGain);
    }

    const e = emotionStrength.current;
    // When the mouth is actively forming a viseme (jaw is open), damp the
    // emotion-driven MOUTH shapes so they don't fight the speech shape and
    // create the "split lip / dark seam" artifact. Eyes/brows/cheeks stay full.
    const mouthDamp = shouldSampleAudio ? Math.max(0.15, 1 - smoothJaw.current * 1.2) : 1;
    const emotionWeights: Record<string, number> = (() => {
      switch (coreEmotion) {
        case 'happy':
          return { mouthSmileLeft: 0.42 * e * mouthDamp, mouthSmileRight: 0.42 * e * mouthDamp, cheekSquintLeft: 0.18 * e, cheekSquintRight: 0.18 * e, eyeSquintLeft: 0.1 * e, eyeSquintRight: 0.1 * e };
        case 'loving':
          return { mouthSmileLeft: 0.5 * e * mouthDamp, mouthSmileRight: 0.5 * e * mouthDamp, mouthPucker: 0.18 * e * mouthDamp, cheekSquintLeft: 0.22 * e, cheekSquintRight: 0.22 * e, eyeSquintLeft: 0.12 * e, eyeSquintRight: 0.12 * e };
        case 'sad':
        case 'crying':
          return { mouthFrownLeft: 0.35 * e * mouthDamp, mouthFrownRight: 0.35 * e * mouthDamp, browInnerUp: 0.36 * e, eyeLookDownLeft: 0.16 * e, eyeLookDownRight: 0.16 * e };
        case 'angry':
          return { browDownLeft: 0.45 * e, browDownRight: 0.45 * e, mouthPressLeft: 0.18 * e * mouthDamp, mouthPressRight: 0.18 * e * mouthDamp, eyeSquintLeft: 0.16 * e, eyeSquintRight: 0.16 * e };
        case 'surprised':
          return { eyeWideLeft: 0.44 * e, eyeWideRight: 0.44 * e, browInnerUp: 0.28 * e, jawOpen: Math.max(weights.jawOpen ?? 0, 0.18 * e), mouthFunnel: Math.max(weights.mouthFunnel ?? 0, 0.12 * e) };
        case 'thinking':
          return { browInnerUp: 0.18 * e, mouthPressLeft: 0.08 * e * mouthDamp, mouthPressRight: 0.06 * e * mouthDamp, eyeLookDownLeft: 0.08 * e, eyeLookDownRight: 0.08 * e };
        default:
          return { mouthSmileLeft: 0.06 * e * mouthDamp, mouthSmileRight: 0.06 * e * mouthDamp };
      }
    })();
    Object.assign(weights, emotionWeights);

    // ─── MUTUAL EXCLUSION: smile ⊥ frown/press ──────────────────────────────
    // The "split lip / dark seam" artifact happens when smile AND frown (or
    // press) both have non-zero weight. Pick the dominant family and zero the
    // other. This is a one-line guarantee that lips never fight themselves.
    const smileSum = (weights.mouthSmileLeft ?? 0) + (weights.mouthSmileRight ?? 0);
    const frownSum = (weights.mouthFrownLeft ?? 0) + (weights.mouthFrownRight ?? 0)
      + (weights.mouthPressLeft ?? 0) + (weights.mouthPressRight ?? 0);
    if (smileSum > frownSum) {
      weights.mouthFrownLeft = 0; weights.mouthFrownRight = 0;
      weights.mouthPressLeft = 0; weights.mouthPressRight = 0;
    } else if (frownSum > smileSum) {
      weights.mouthSmileLeft = 0; weights.mouthSmileRight = 0;
    }

    // Symmetry guard: if one side is set but the other isn't (only valid for
    // `wink`), force both sides to the same value to prevent corner asymmetry.
    const symmetrize = (l: keyof VisemeWeights, r: keyof VisemeWeights) => {
      const a = (weights as Record<string, number>)[l as string] ?? 0;
      const b = (weights as Record<string, number>)[r as string] ?? 0;
      if (a > 0 || b > 0) {
        const v = Math.max(a, b);
        (weights as Record<string, number>)[l as string] = v;
        (weights as Record<string, number>)[r as string] = v;
      }
    };
    symmetrize('mouthSmileLeft', 'mouthSmileRight');
    symmetrize('mouthFrownLeft', 'mouthFrownRight');
    symmetrize('mouthPressLeft', 'mouthPressRight');
    symmetrize('cheekSquintLeft', 'cheekSquintRight');


    // ─── GESTURE OVERLAY ─────────────────────────────────────────────────────
    // Time-bounded gesture (laugh, kiss, hug, gasp, wink, blink, sad-pout, rain-react,
    // thinking-tap, love-eyes). Overlays additional blendshape weights on top of
    // the base emotion. Easing: ramp in (first 15%), hold, ramp out (last 25%).
    let gestureBlinkBoost = 0;       // forces blink during kiss/love-eyes
    let gestureHeadBob = 0;          // adds head bob during laugh
    let gestureHeadTilt = 0;         // adds head tilt during hug
    let gestureLookUp = 0;           // adds look-up during rain-react
    let gestureWinkLeft = 0;         // forces left-eye-only blink for wink
    const activeGesture = activeGestureRef.current;
    if (activeGesture) {
      const elapsed = performance.now() - activeGesture.startedAt;
      if (elapsed > activeGesture.duration) {
        activeGestureRef.current = null;
      } else {
        const p = elapsed / activeGesture.duration; // 0..1
        // Envelope: ease in/out
        const env = p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1;
        const g = Math.max(0, Math.min(1, env));
        const oscillate = (freqHz: number) => Math.sin((elapsed / 1000) * freqHz * Math.PI * 2);

        const addG = (key: keyof VisemeWeights, val: number) => {
          (weights as Record<string, number>)[key as string] = Math.max(
            (weights as Record<string, number>)[key as string] ?? 0,
            val
          );
        };

        switch (activeGesture.name as ZoeGestureName) {
          case 'blink':
            gestureBlinkBoost = g;
            break;
          case 'wink':
            gestureWinkLeft = g;
            break;
          case 'laugh':
            addG('mouthSmileLeft', 0.85 * g);
            addG('mouthSmileRight', 0.85 * g);
            addG('cheekSquintLeft', 0.55 * g);
            addG('cheekSquintRight', 0.55 * g);
            addG('eyeSquintLeft', 0.4 * g);
            addG('eyeSquintRight', 0.4 * g);
            addG('jawOpen', 0.18 * g + 0.08 * Math.abs(oscillate(2.4)) * g);
            gestureHeadBob = 0.05 * g * oscillate(2.2);
            break;
          case 'kiss':
            addG('mouthPucker', 0.95 * g);
            addG('mouthFunnel', 0.55 * g);
            addG('cheekSquintLeft', 0.25 * g);
            addG('cheekSquintRight', 0.25 * g);
            // close eyes during kiss (last 60% of gesture)
            gestureBlinkBoost = p > 0.2 && p < 0.85 ? g : 0;
            break;
          case 'hug':
            addG('mouthSmileLeft', 0.55 * g);
            addG('mouthSmileRight', 0.55 * g);
            addG('cheekSquintLeft', 0.32 * g);
            addG('cheekSquintRight', 0.32 * g);
            addG('eyeSquintLeft', 0.22 * g);
            addG('eyeSquintRight', 0.22 * g);
            gestureHeadTilt = 0.12 * g;
            break;
          case 'gasp':
            addG('eyeWideLeft', 0.85 * g);
            addG('eyeWideRight', 0.85 * g);
            addG('browInnerUp', 0.6 * g);
            addG('jawOpen', 0.42 * g);
            addG('mouthFunnel', 0.32 * g);
            break;
          case 'sad-pout':
            addG('mouthFrownLeft', 0.7 * g);
            addG('mouthFrownRight', 0.7 * g);
            addG('browInnerUp', 0.6 * g);
            addG('eyeLookDownLeft', 0.32 * g);
            addG('eyeLookDownRight', 0.32 * g);
            break;
          case 'rain-react':
            addG('mouthSmileLeft', 0.35 * g);
            addG('mouthSmileRight', 0.35 * g);
            addG('eyeWideLeft', 0.3 * g);
            addG('eyeWideRight', 0.3 * g);
            addG('browInnerUp', 0.32 * g);
            gestureLookUp = 0.18 * g;
            break;
          case 'thinking-tap':
            addG('browInnerUp', 0.3 * g);
            addG('browDownLeft', 0.18 * g);
            addG('mouthPressLeft', 0.32 * g);
            addG('mouthPressRight', 0.18 * g);
            addG('eyeLookDownLeft', 0.22 * g);
            addG('eyeLookDownRight', 0.22 * g);
            break;
          case 'love-eyes':
            addG('mouthSmileLeft', 0.7 * g);
            addG('mouthSmileRight', 0.7 * g);
            addG('cheekSquintLeft', 0.5 * g);
            addG('cheekSquintRight', 0.5 * g);
            addG('eyeSquintLeft', 0.45 * g);
            addG('eyeSquintRight', 0.45 * g);
            break;
        }
      }
    }

    // ─── POST-GESTURE MOUTH RECONCILIATION ──────────────────────────────────
    // Gestures can re-add smile/frown/press; re-enforce the mutual exclusion
    // and symmetry so the lips never split or smear after a gesture overlay.
    {
      const sSum2 = (weights.mouthSmileLeft ?? 0) + (weights.mouthSmileRight ?? 0);
      const fSum2 = (weights.mouthFrownLeft ?? 0) + (weights.mouthFrownRight ?? 0)
        + (weights.mouthPressLeft ?? 0) + (weights.mouthPressRight ?? 0);
      if (sSum2 > fSum2) {
        weights.mouthFrownLeft = 0; weights.mouthFrownRight = 0;
        weights.mouthPressLeft = 0; weights.mouthPressRight = 0;
      } else if (fSum2 > sSum2) {
        weights.mouthSmileLeft = 0; weights.mouthSmileRight = 0;
      }
      const sym2 = (l: keyof VisemeWeights, r: keyof VisemeWeights) => {
        const a = (weights as Record<string, number>)[l as string] ?? 0;
        const b = (weights as Record<string, number>)[r as string] ?? 0;
        if (a > 0 || b > 0) {
          const v = Math.max(a, b);
          (weights as Record<string, number>)[l as string] = v;
          (weights as Record<string, number>)[r as string] = v;
        }
      };
      sym2('mouthSmileLeft', 'mouthSmileRight');
      sym2('mouthFrownLeft', 'mouthFrownRight');
      sym2('mouthPressLeft', 'mouthPressRight');
    }

    if (settings.debugOverlay) {
      debugFrame.current += dt;
      if (debugFrame.current > 0.1) {
        debugFrame.current = 0;
        publishLipSyncDebug({
          amp,
          jaw: smoothJaw.current,
          centroid,
          viseme: visemeName,
          source: shouldSampleAudio ? activeSourceTypeRef.current : 'idle',
        });
      }
    }

    // Blink every ~4s (passive)
    blinkPhase.current += dt;
    let blink = 0;
    if (blinkPhase.current > 4) {
      const t = blinkPhase.current - 4;
      if (t < 0.18) blink = Math.sin((t / 0.18) * Math.PI);
      else blinkPhase.current = 0;
    }
    // Gesture-driven blink boost (kiss / love-eyes / explicit blink)
    blink = Math.max(blink, gestureBlinkBoost);

    // Subtle breathing — small mouth motion when idle
    breathPhase.current += dt * 0.6;

    // Apply to all morph-target meshes
    for (const mesh of morphMeshes) {
      const dict = mesh.morphTargetDictionary!;
      const infl = mesh.morphTargetInfluences!;
      // Reset mouth-region targets we control (fast — only ones we set)
      const RESET_KEYS = [
        'jawOpen', 'mouthOpen', 'mouthClose', 'mouthFunnel', 'mouthSmile',
        'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
        'viseme_PP', 'viseme_FF', 'viseme_SS', 'viseme_sil',
        'mouthSmileLeft', 'mouthSmileRight', 'mouthPucker', 'mouthFrownLeft', 'mouthFrownRight',
        'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
        'mouthStretchLeft', 'mouthStretchRight', 'mouthShrugLower', 'mouthShrugUpper',
        'mouthPressLeft', 'mouthPressRight', 'cheekSquintLeft', 'cheekSquintRight',
        'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight',
        'eyeLookDownLeft', 'eyeLookDownRight', 'browInnerUp', 'browDownLeft', 'browDownRight',
      ];
      for (const key of RESET_KEYS) {
        const idx = dict[key];
        if (idx !== undefined) {
          const target = (weights as Record<string, number>)[key] ?? 0;
          // Per-avatar release lerp (preset.mapping.resetLerp).
          infl[idx] += (target - infl[idx]) * map.resetLerp;
        }
      }
      // Per-avatar hard clamp on mouthClose. Default cap = 0 (never close)
      // for rigs prone to "lipstick seal"; some male rigs can use a small
      // cap (e.g. 0.05) for a firmer resting pose.
      const mcIdx = dict['mouthClose'];
      if (mcIdx !== undefined) {
        const mcTarget = Math.min((weights as Record<string, number>)['mouthClose'] ?? 0, sil.mouthCloseCap);
        if (infl[mcIdx] > mcTarget) infl[mcIdx] = mcTarget;
      }
      // Blink (both eyes)
      const blinkL = dict['eyeBlinkLeft'];
      const blinkR = dict['eyeBlinkRight'];
      if (blinkL !== undefined) infl[blinkL] = Math.max(blink, gestureWinkLeft);
      if (blinkR !== undefined) infl[blinkR] = blink;
    }

    // Subtle head/breath movement + gesture-driven head motion.
    // Preserves the fitted face framing.
    model.position.y = basePositionRef.current.y + Math.sin(breathPhase.current) * 0.005 + gestureHeadBob * 0.02;
    model.rotation.y = baseRotationYRef.current + Math.sin(breathPhase.current * 0.4) * 0.04 + gestureHeadTilt;
    model.rotation.x = -gestureLookUp;
  });

  // Keep the model at its real GLB coordinates; the camera itself is aimed at
  // the head/shoulders. This prevents any repeated transform pass from ever
  // recentering the avatar on the feet again.
  useEffect(() => {
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);

    const fullBox = new THREE.Box3().setFromObject(model);
    const fullCenter = new THREE.Vector3(); fullBox.getCenter(fullCenter);

    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.frustumCulled = false;
      }
    });

    const fittedPosition = new THREE.Vector3(
      -fullCenter.x,
      0,
      -fullCenter.z
    );
    model.position.copy(fittedPosition);
    basePositionRef.current.copy(fittedPosition);
    baseRotationYRef.current = model.rotation.y;
  }, [model]);

  return <primitive object={model} />;
}

interface ZoeGLBLipSyncCanvasProps {
  isSpeaking: boolean;
  emotionState?: AvatarEmotionState;
  fallback?: ReactNode;
}

export default function ZoeGLBLipSyncCanvas({ isSpeaking, emotionState = 'idle', fallback = null }: ZoeGLBLipSyncCanvasProps) {
  const [errored, setErrored] = useState(false);
  if (errored) return <>{fallback}</>;

  return (
    <div className="absolute inset-0 h-full w-full">
      <Canvas
        camera={{ position: [0, 0.02, 2.35], fov: 30, near: 0.05, far: 50 }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        onError={() => setErrored(true)}
      >
        <PortraitCamera />
        <ambientLight intensity={0.55} />
        <directionalLight position={[1.2, 2, 1.5]} intensity={1.1} />
        <directionalLight position={[-1.5, 1, 0.8]} intensity={0.45} color="#9fc7ff" />
        <Suspense fallback={null}>
          <ZoeHead isSpeaking={isSpeaking} emotionState={emotionState} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
