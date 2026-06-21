/**
 * ZOE GESTURE BUS — Lightweight pub/sub for time-bounded avatar gestures.
 * Triggers facial gesture overlays on the GLB rig (laugh, kiss, hug, gasp, blink, wink, sad, rain-react).
 * Gestures are additive — they overlay on top of the current emotion blendshapes for a fixed duration.
 *
 * Non-destructive: completely independent module. No existing file imports it unless explicitly wired.
 */

export type ZoeGestureName =
  | 'blink'        // Single deliberate blink
  | 'wink'         // One-eye wink
  | 'laugh'        // Big sustained smile + cheek squint + head bob (~2.4s)
  | 'kiss'         // Pucker + eyes closed (~1.6s)
  | 'hug'          // Warm wide smile + head tilt + slight squint (~2.2s)
  | 'gasp'         // Wide eyes + jaw open + brow up (~1.0s)
  | 'sad-pout'     // Frown + brow inner up + look down (~2.0s)
  | 'rain-react'   // Surprised glance up + soft smile (~2.2s)
  | 'thinking-tap' // Brow furrow + look down-left (~1.8s)
  | 'love-eyes';   // Big smile + eye squint + cheek puff (~2.0s)

export interface ZoeGestureEvent {
  name: ZoeGestureName;
  startedAt: number; // performance.now()
  duration: number;  // ms
}

const GESTURE_DURATIONS: Record<ZoeGestureName, number> = {
  blink: 220,
  wink: 380,
  laugh: 2400,
  kiss: 1600,
  hug: 2200,
  gasp: 1000,
  'sad-pout': 2000,
  'rain-react': 2200,
  'thinking-tap': 1800,
  'love-eyes': 2000,
};

type Listener = (e: ZoeGestureEvent) => void;
const listeners = new Set<Listener>();

export function subscribeZoeGesture(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function triggerZoeGesture(name: ZoeGestureName, customDuration?: number): void {
  const evt: ZoeGestureEvent = {
    name,
    startedAt: performance.now(),
    duration: customDuration ?? GESTURE_DURATIONS[name],
  };
  listeners.forEach((fn) => {
    try { fn(evt); } catch (err) { console.warn('[ZoeGestureBus] listener error', err); }
  });
}

/**
 * Detect a gesture intent from a user message (English keywords).
 * Returns the gesture name + a short natural reply, or null.
 */
export function detectGestureFromText(message: string): { gesture: ZoeGestureName; reply: string } | null {
  const t = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  if (/\b(blink|wink at me|wink for me)\b/.test(t)) {
    if (/\bwink\b/.test(t)) return { gesture: 'wink', reply: '😉' };
    return { gesture: 'blink', reply: '*blinks*' };
  }
  if (/\b(laugh|tell .* joke|make me laugh|funny|haha|lol)\b/.test(t)) {
    return { gesture: 'laugh', reply: 'haha — that got me 😄' };
  }
  if (/\b(flying kiss|blow .* kiss|kiss me|send .* kiss)\b/.test(t)) {
    return { gesture: 'kiss', reply: 'mwah 💋' };
  }
  if (/\b(hug me|give .* hug|virtual hug|hold me)\b/.test(t)) {
    return { gesture: 'hug', reply: 'come here — *hugs* 🤗' };
  }
  if (/\b(love you|i love|adore you|heart you)\b/.test(t)) {
    return { gesture: 'love-eyes', reply: 'love you too 💕' };
  }
  if (/\b(surprise|wow|omg|shocked|gasp)\b/.test(t)) {
    return { gesture: 'gasp', reply: 'oh!' };
  }
  if (/\b(sad|crying|down|feel low|depressed|hurt)\b/.test(t)) {
    return { gesture: 'sad-pout', reply: 'I feel that with you 💙' };
  }
  if (/\b(thinking|let me think|hmm|ponder)\b/.test(t)) {
    return { gesture: 'thinking-tap', reply: 'hmm…' };
  }
  if (/\b(raining|its rain|it rains|rainy)\b/.test(t)) {
    return { gesture: 'rain-react', reply: 'oh — it\'s raining! ☔' };
  }
  return null;
}
