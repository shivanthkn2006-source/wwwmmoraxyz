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
 *  - Native shell (Capacitor): the native microphone service/audio session owns
 *    listening. No silent browser audio or duplicate assistant is used.
 */

import { audioRouter } from '@/services/AudioRouterService';
import { HANDS_FREE_WAKE_PHRASES, HANDS_FREE_STOP_PHRASES, findHandsFreePhrase, normalizeVoicePhrase } from '@/features/zoe-handsfree/phrases';
import { zoeDebugLog, zoeDebugSetState, zoeDebugSpeechError, zoeDebugSpeechStart, zoeDebugSpeechStop } from '@/features/zoe-handsfree/debugBus';
import { nativeZoeAudioBridge } from '@/services/NativeZoeAudioBridge';
import { claimSpeechRecognition, releaseSpeechRecognition } from '@/utils/micPermissionManager';
import { gateTranscript, isZoeMuted, setZoeMuted } from '@/features/zoe-handsfree/muteGate';

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

export function commandAfterWakePhrase(transcript: string, wakePhrase: string): string {
  const normalizedTranscript = normalizeVoicePhrase(transcript);
  const normalizedWake = normalizeVoicePhrase(wakePhrase);
  const start = normalizedTranscript.indexOf(normalizedWake);
  if (start < 0) return '';
  return `${normalizedTranscript.slice(0, start)} ${normalizedTranscript.slice(start + normalizedWake.length)}`
    .replace(/\s+/g, ' ')
    .trim();
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

/**
 * iPhone / iPad / Safari. Apple's WebKit speech engine behaves differently from
 * Chrome in three ways that used to surface as a flat "wake word error":
 *   1. `continuous` is ignored — the session ends after every phrase, so the
 *      sentinel must restart itself instead of treating the end as a failure.
 *   2. Recognition refuses to start (`service-not-allowed`) while another part
 *      of the page is holding an open `getUserMedia` stream, so the shared mic
 *      must be released first.
 *   3. `start()` must originate from a real user gesture.
 */
export function isAppleWebkitSpeech(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints > 1);
  const safari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  return iOS || safari;
}

export function wakeWordCapability(): WakeWordCapability {
  const isNative = isNativeShell();
  const supported = isNative || Boolean(speechRecognitionCtor());
  if (!supported) {
    return {
      supported: false,
      isNative,
      backgroundCapable: false,
      reason:
        'This browser has no on-device speech recognition. Use the headset button, or the orb, to talk to Zoe — everything else still works.',
    };
  }
  if (isNative) {
    return {
      supported: true,
      isNative: true,
      backgroundCapable: true,
      reason: 'Native app support is installed for background audio. Locked-screen wake still requires validation on this device.',
    };
  }
  if (isAppleWebkitSpeech()) {
    return {
      supported: true,
      isNative: false,
      backgroundCapable: false,
      reason:
        'On iPhone, iPad and Safari, Zoe listens one phrase at a time and re-arms herself between phrases. Keep this tab in front; the screen must stay awake. Allow the microphone and speech recognition prompts once.',
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
  private listeners = new Set<Listener>();
  private lastError: string | null = null;
  private permissionRetries = 0;
  private conversationActive = false;
  private generation = 0;
  private conversationWatchdog: ReturnType<typeof setTimeout> | null = null;
  private detachGestureRetry: (() => void) | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('zoe-native-listening-state', ((event: CustomEvent<{ state?: WakeWordState }>) => {
      if (!this.enabled || !event.detail?.state) return;
      this.setState(event.detail.state);
    }) as EventListener);
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;
      if (document.hidden && !isNativeShell()) {
        this.setState('suspended');
        this.stopRecognition();
      } else if (!document.hidden) {
        this.permissionRetries = 0;
        void this.startRecognition();
      }
    });
    window.addEventListener('zoe-handsfree-start', () => {
      this.conversationActive = true;
      this.stopRecognition();
      this.setState('suspended');
      // Safety net: if the conversation layer never reports an end (Safari can
      // drop its recognition silently), re-arm the sentinel instead of leaving
      // the user stuck on "suspended".
      if (this.conversationWatchdog) clearTimeout(this.conversationWatchdog);
      this.conversationWatchdog = setTimeout(() => {
        this.conversationWatchdog = null;
        if (!this.conversationActive) return;
        this.conversationActive = false;
        if (this.enabled && !document.hidden) this.scheduleRestart(250);
      }, 25000);
    });
    window.addEventListener('zoe-handsfree-end', () => {
      this.conversationActive = false;
      if (this.conversationWatchdog) {
        clearTimeout(this.conversationWatchdog);
        this.conversationWatchdog = null;
      }
      if (this.enabled && !document.hidden) this.scheduleRestart(250);
    });
  }

  /**
   * Safari only reliably starts speech recognition from a real user gesture.
   * When it refuses, we wait for the very next tap or key press on the page and
   * silently re-arm — the user never has to find a switch again.
   */
  private armGestureRetry(): void {
    if (typeof window === 'undefined' || this.detachGestureRetry) return;
    const retry = () => {
      this.detachGestureRetry?.();
      if (!this.enabled) return;
      this.permissionRetries = 0;
      this.lastError = null;
      this.setState('starting');
      void this.startRecognition();
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchend', 'keydown'];
    events.forEach((evt) => window.addEventListener(evt, retry, { once: true }));
    this.detachGestureRetry = () => {
      events.forEach((evt) => window.removeEventListener(evt, retry));
      this.detachGestureRetry = null;
    };
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
    this.enabled = true;
    // The realtime Deepgram agent is an explicit alternate conversation mode.
    // It must release its MediaStream before the browser wake sentinel starts.
    window.dispatchEvent(new CustomEvent('zoe-agent-stop'));
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode */
    }
    if (cap.isNative) {
      try {
        const started = await nativeZoeAudioBridge.start(
          [...HANDS_FREE_WAKE_PHRASES],
          [...HANDS_FREE_STOP_PHRASES],
        );
        this.setState(started ? 'listening' : 'error');
        return started;
      } catch (error) {
        zoeDebugLog('error', `native wake service failed: ${error instanceof Error ? error.message : String(error)}`);
        this.setState('error');
        return false;
      }
    }
    this.permissionRetries = 0;
    this.lastError = null;
    if (isAppleWebkitSpeech()) {
      // Safari/iOS: never hold an open capture stream here. WebKit hands the
      // microphone to its own speech service and refuses to start while the
      // page owns one. Recognition raises its own permission prompt.
      try {
        await audioRouter.releaseMic?.();
      } catch {
        /* noop */
      }
      await this.startRecognition();
      return true;
    }
    const granted = await audioRouter.ensureMicPermission();
    if (!granted) {
      this.enabled = false;
      this.lastError = 'Microphone permission was declined.';
      this.setState('error');
      return false;
    }
    await this.startRecognition();
    return true;
  }

  /** Plain-language reason the wake word is not running, if any. */
  public getLastError(): string | null {
    return this.lastError;
  }

  public disable(): void {
    this.enabled = false;
    this.detachGestureRetry?.();
    if (this.conversationWatchdog) {
      clearTimeout(this.conversationWatchdog);
      this.conversationWatchdog = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      /* private mode */
    }
    void nativeZoeAudioBridge.stop();
    this.stopRecognition();

    // Hand the microphone back so a Bluetooth headset stops hissing.
    void audioRouter.releaseMic?.();
    this.setState('off');
  }

  public async toggle(on: boolean): Promise<boolean> {
    if (on) return this.enable();
    this.disable();
    return false;
  }

  private stopRecognition(): void {
    this.generation += 1;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const recognition = this.recognition;
    try {
      recognition?.abort?.();
    } catch {
      /* noop */
    }
    if (recognition) {
      releaseSpeechRecognition('wake-word', recognition);
      zoeDebugSpeechStop('wake-word', 'wake listener stopped');
    }
    this.recognition = null;
  }

  private scheduleRestart(delay = 700): void {
    if (!this.enabled || this.conversationActive || this.restartTimer) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.startRecognition();
    }, delay);
  }

  private async startRecognition(): Promise<void> {
    if (!this.enabled || this.conversationActive || this.recognition) return;
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      this.setState('error');
      return;
    }

    this.setState('starting');
    const apple = isAppleWebkitSpeech();
    const rec = new Ctor();
    const generation = ++this.generation;
    // Apple's engine ignores continuous mode and stops after each phrase; ask
    // for one phrase at a time and let `onend` re-arm the sentinel instantly.
    rec.continuous = !apple;
    rec.interimResults = !apple;
    rec.lang = 'en-US';

    rec.onstart = () => {
      if (generation !== this.generation || this.recognition !== rec) return;
      this.permissionRetries = 0;
      this.lastError = null;
      this.setState('listening');
      zoeDebugSetState({ hfState: 'awaiting-wake' });
      zoeDebugSpeechStart('wake-word', 'global hands-free sentinel');
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (generation !== this.generation || this.recognition !== rec) return;
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      if (!transcript.trim()) return;

      // Privacy boundary: while muted, no transcript can activate Zoe, reach
      // DHF, or reach a backend. Only the explicit “Zoe wake” phrase is
      // accepted. Any words after it become the first resumed command.
      if (isZoeMuted()) {
        const muteDecision = gateTranscript(transcript);
        if (muteDecision === 'ask-unmute' || muteDecision === 'keep-muted') {
          const reply = muteDecision === 'ask-unmute'
            ? 'You told me to mute. Should I unmute?'
            : 'Okay. I’ll stay muted.';
          window.dispatchEvent(new CustomEvent('zoe-handsfree-reply', { detail: { text: reply } }));
          void import('@/utils/zoeVoice').then(({ speakAsZoe }) => speakAsZoe(reply));
          return;
        }
        if (muteDecision !== 'unmute') {
          zoeDebugLog('voice', 'muted — wake listener discarded speech');
          return;
        }
        setZoeMuted(false);
        const resumedCommand = normalizeVoicePhrase(transcript)
          .replace(/^(?:zoe|zoey)\s+wake(?:\s+up)?\s*/i, '')
          .replace(/^wake\s+(?:up\s+)?(?:zoe|zoey)\s*/i, '')
          .trim();
        this.setState('triggered');
        window.dispatchEvent(new CustomEvent('zoe-orb-activate', {
          detail: {
            source: 'wake-word',
            transcript,
            command: resumedCommand || null,
            resumedFromMute: true,
          },
        }));
        this.stopRecognition();
        return;
      }

      const stop = findHandsFreePhrase(transcript, HANDS_FREE_STOP_PHRASES);
      if (stop) {
        audioRouter.interruptZoe();
        zoeDebugLog('wake', `stop phrase "${stop}"`);
        return;
      }

      const wake = findHandsFreePhrase(transcript, HANDS_FREE_WAKE_PHRASES);
      if (wake) {
        const command = commandAfterWakePhrase(transcript, wake);
        this.setState('triggered');
        zoeDebugSetState({ hfState: command ? 'processing' : 'wake-detected' });
        zoeDebugLog('wake', `wake phrase "${wake}" (headset)`);
        zoeDebugLog('voice', command ? `recognized: ${command}` : 'wake-only activation; awaiting question');
        try {
          window.dispatchEvent(new CustomEvent('zoe-request-mic-permission'));
          window.dispatchEvent(
            new CustomEvent('zoe-orb-activate', {
              detail: { source: 'wake-word', transcript, command: command || null },
            }),
          );
        } catch {
          /* noop */
        }
        // Hand the mic to the conversation layer. Its start/end events now own
        // the handoff, so the wake sentinel cannot steal the follow-up phrase.
        this.stopRecognition();
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (generation !== this.generation || this.recognition !== rec) return;
      const err = event.error;
      zoeDebugSpeechError('wake-word', err, 'global hands-free sentinel');

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        // Safari raises `service-not-allowed` transiently when a previous
        // session has not fully torn down, or while the page still owns the
        // microphone. Free the mic and retry quickly; if Safari still refuses,
        // stay switched on and re-arm on the user's very next tap.
        this.recognition = null;
        if (apple && this.permissionRetries < 6) {
          this.permissionRetries += 1;
          void audioRouter.releaseMic?.();
          this.setState('starting');
          this.scheduleRestart(300 * this.permissionRetries);
          return;
        }
        if (err === 'service-not-allowed' || apple) {
          this.lastError =
            'Safari paused listening. Tap anywhere on this page and Zoe starts listening again — no need to switch anything off.';
          this.setState('error');
          this.armGestureRetry();
          zoeDebugLog('error', `wake word paused by browser: ${err}`);
          return;
        }
        this.enabled = false;
        this.lastError =
          'Microphone access is blocked for this site. Allow the microphone in your browser settings, then switch hands-free on again.';
        this.setState('error');
        zoeDebugLog('error', `wake word blocked: ${err}`);
        return;
      }


      if (err === 'audio-capture') {
        this.recognition = null;
        this.lastError = 'No microphone was found. Connect or select an input device on this page.';
        this.scheduleRestart(2000);
        return;
      }

      // Everything else (no-speech, network, aborted) is routine on phones.
      this.recognition = null;
      this.scheduleRestart(err === 'no-speech' ? 300 : 1200);
    };

    rec.onend = () => {
      releaseSpeechRecognition('wake-word', rec);
      if (generation !== this.generation || this.recognition !== rec) return;
      this.recognition = null;
      // Apple ends the session after every phrase — that is normal, not a
      // failure. Re-arm quickly so "hey Zoe" keeps working on iPhone/iPad.
      if (this.enabled) this.scheduleRestart(apple ? 500 : 700);
      else this.setState('off');
    };

    this.recognition = rec;
    try {
      claimSpeechRecognition('wake-word', rec);
      rec.start();
    } catch (error) {
      releaseSpeechRecognition('wake-word', rec);
      zoeDebugSpeechError('wake-word', error instanceof Error ? error.message : String(error), 'start failed');
      this.recognition = null;
      this.scheduleRestart(1200);
    }
  }
}

export const zoeBackgroundListener = new ZoeBackgroundListener();
export default zoeBackgroundListener;
