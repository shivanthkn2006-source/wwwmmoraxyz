/**
 * ZoeBackgroundListener — hands-free wake word for the headset link.
 * ==================================================================
 * Keeps a continuous SpeechRecognition pass running on the microphone that
 * AudioRouterService owns, matches the shared Zoe wake phrases, and fires the
 * same `zoe-orb-activate` event a headset button press fires — so the whole
 * existing Zoe pipeline (askZoe -> Deepgram -> selected sink) is reused.
 *
 * Honesty about platforms:
 *  - Browser tabs: the OS suspends capture when the tab is hidden or the phone
 *    is locked. We report that instead of pretending it keeps listening.
 *  - Native shell (Capacitor): a silent looping audio element holds the audio
 *    session open so the recognizer survives backgrounding, and Media Session
 *    keeps the lock-screen controls wired to Zoe.
 */

import { audioRouter } from '@/services/AudioRouterService';
import { HANDS_FREE_WAKE_PHRASES, HANDS_FREE_STOP_PHRASES, findHandsFreePhrase } from '@/features/zoe-handsfree/phrases';
import { zoeDebugLog } from '@/features/zoe-handsfree/debugBus';

export type WakeWordState = 'off' | 'starting' | 'listening' | 'triggered' | 'suspended' | 'error';

export interface WakeWordCapability {
  /** SpeechRecognition exists in this browser. */
  supported: boolean;
  /** Running inside the Capacitor native shell. */
  isNative: boolean;
  /** Honest answer to "will this keep listening in my pocket?". */
  backgroundCapable: boolean;
  reason: string;
}

const STORAGE_KEY = 'mmora.audio.wakeWordEnabled';
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

type Listener = (state: WakeWordState) => void;

interface MinimalRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
}

function speechRecognitionCtor(): (new () => MinimalRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalRecognition;
    webkitSpeechRecognition?: new () => MinimalRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function wakeWordCapability(): WakeWordCapability {
  const supported = Boolean(speechRecognitionCtor());
  const isNative = isNativeShell();
  if (!supported) {
    return {
      supported: false,
      isNative,
      backgroundCapable: false,
      reason: 'This browser has no on-device speech recognition. Use the headset button to talk to Zoe.',
    };
  }
  if (isNative) {
    return {
      supported: true,
      isNative: true,
      backgroundCapable: true,
      reason: 'Native app: Zoe keeps the audio session open, so the wake word still works with the screen locked.',
    };
  }
  return {
    supported: true,
    isNative: false,
    backgroundCapable: false,
    reason:
      'In a browser tab the wake word only works while this tab is open and visible. Install the native app for pocket listening.',
  };
}

class ZoeBackgroundListener {
  private recognition: MinimalRecognition | null = null;
  private state: WakeWordState = 'off';
  private enabled = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAlive: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;
      if (document.hidden && !isNativeShell()) {
        this.setState('suspended');
        this.stopRecognition();
      } else if (!document.hidden) {
        void this.startRecognition();
      }
    });
  }

  public wasEnabledBefore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  public getState(): WakeWordState {
    return this.state;
  }

  public onStateChange(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private setState(next: WakeWordState) {
    this.state = next;
    this.listeners.forEach((fn) => {
      try {
        fn(next);
      } catch {
        /* noop */
      }
    });
  }

  /** Turn hands-free listening on. Requires the one-time mic grant. */
  public async enable(): Promise<boolean> {
    const cap = wakeWordCapability();
    if (!cap.supported) {
      this.setState('error');
      return false;
    }
    const granted = await audioRouter.ensureMicPermission();
    if (!granted) {
      this.setState('error');
      return false;
    }
    this.enabled = true;
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode */
    }
    this.startKeepAlive();
    await this.startRecognition();
    return true;
  }

  public disable(): void {
    this.enabled = false;
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      /* private mode */
    }
    this.stopKeepAlive();
    this.stopRecognition();
    this.setState('off');
  }

  public async toggle(on: boolean): Promise<boolean> {
    if (on) return this.enable();
    this.disable();
    return false;
  }

  /**
   * Silent looping element pinned to the chosen headset sink. On a native shell
   * this keeps the audio session (and therefore the mic) alive in the pocket.
   */
  private startKeepAlive(): void {
    if (this.keepAlive || !isNativeShell()) return;
    try {
      const el = new Audio(SILENT_WAV);
      el.loop = true;
      el.volume = 0.0001;
      void audioRouter.applySinkToElement(el);
      void el.play().catch(() => undefined);
      this.keepAlive = el;
    } catch {
      this.keepAlive = null;
    }
  }

  private stopKeepAlive(): void {
    if (!this.keepAlive) return;
    try {
      this.keepAlive.pause();
      this.keepAlive.src = '';
    } catch {
      /* noop */
    }
    this.keepAlive = null;
  }

  private stopRecognition(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try {
      this.recognition?.abort?.();
    } catch {
      /* noop */
    }
    this.recognition = null;
  }

  private scheduleRestart(delay = 700): void {
    if (!this.enabled || this.restartTimer) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.startRecognition();
    }, delay);
  }

  private async startRecognition(): Promise<void> {
    if (!this.enabled || this.recognition) return;
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      this.setState('error');
      return;
    }

    this.setState('starting');
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => this.setState('listening');

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      if (!transcript.trim()) return;

      const stop = findHandsFreePhrase(transcript, HANDS_FREE_STOP_PHRASES);
      if (stop) {
        audioRouter.interruptZoe();
        zoeDebugLog('wake', `stop phrase "${stop}"`);
        return;
      }

      const wake = findHandsFreePhrase(transcript, HANDS_FREE_WAKE_PHRASES);
      if (wake) {
        this.setState('triggered');
        zoeDebugLog('wake', `wake phrase "${wake}" (headset)`);
        try {
          window.dispatchEvent(new CustomEvent('zoe-request-mic-permission'));
          window.dispatchEvent(
            new CustomEvent('zoe-orb-activate', {
              detail: { source: 'wake-word', transcript },
            }),
          );
        } catch {
          /* noop */
        }
        // Hand the mic to the conversation layer; resume the sentinel after.
        this.stopRecognition();
        this.scheduleRestart(4000);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this.enabled = false;
        this.setState('error');
        zoeDebugLog('error', `wake word blocked: ${err}`);
        return;
      }
      this.recognition = null;
      this.scheduleRestart(err === 'no-speech' ? 300 : 1200);
    };

    rec.onend = () => {
      this.recognition = null;
      if (this.enabled) this.scheduleRestart();
      else this.setState('off');
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this.recognition = null;
      this.scheduleRestart(1200);
    }
  }
}

export const zoeBackgroundListener = new ZoeBackgroundListener();
export default zoeBackgroundListener;
