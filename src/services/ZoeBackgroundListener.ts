/**
 * ZoeBackgroundListener — hands-free wake word for the headset link.
 * ==================================================================
 * Keeps a continuous Deepgram Nova pass running on the microphone, matches the
 * shared Zoe wake phrases, and fires the
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
import { reserveSpeechRecognition, releaseSpeechRecognition } from '@/utils/micPermissionManager';
import { gateTranscript, isZoeMuted, setZoeMuted } from '@/features/zoe-handsfree/muteGate';
import { createDeepgramListener, isDeepgramListeningSupported, type DeepgramListener } from '@/services/deepgramListening';

export type WakeWordState = 'off' | 'starting' | 'listening' | 'triggered' | 'suspended' | 'error';

export interface WakeWordCapability {
  /** Deepgram streaming prerequisites exist in this browser. */
  supported: boolean;
  /** Running inside the Capacitor native shell. */
  isNative: boolean;
  /** Honest answer to "will this keep listening in my pocket?". */
  backgroundCapable: boolean;
  reason: string;
}

const STORAGE_KEY = 'mmora.audio.wakeWordEnabled';
type Listener = (state: WakeWordState) => void;

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
  const supported = isNative || isDeepgramListeningSupported();
  if (!supported) {
    return {
      supported: false,
      isNative,
      backgroundCapable: false,
      reason:
        'This device cannot stream microphone audio to Deepgram. Use the headset button or type to Zoe.',
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
  return {
    supported: true,
    isNative: false,
    backgroundCapable: false,
    reason:
      'In a browser tab the wake word only works while this tab is open and visible. Install the native app for pocket listening.',
  };
}

class ZoeBackgroundListener {
  private recognition: DeepgramListener | null = null;
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
      this.armConversationWatchdog();
    });
    // Any sign of life in the conversation layer pushes the safety net out, so a
    // long chat is never interrupted by the wake sentinel taking the microphone.
    window.addEventListener('zoe-handsfree-transcript', () => this.armConversationWatchdog());
    window.addEventListener('zoe-handsfree-reply', () => this.armConversationWatchdog());
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
   * Safety net for a conversation that dies silently (Safari can drop its
   * recognition without firing an end event). It is pushed out on every sign of
   * life, so it can only fire when the conversation really has gone quiet.
   */
  private armConversationWatchdog(): void {
    if (this.conversationWatchdog) clearTimeout(this.conversationWatchdog);
    this.conversationWatchdog = setTimeout(() => {
      this.conversationWatchdog = null;
      if (!this.conversationActive) return;
      this.conversationActive = false;
      if (this.enabled && !document.hidden) this.scheduleRestart(250);
    }, 120_000);
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
      releaseSpeechRecognition('wake-word');
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
    if (!isDeepgramListeningSupported()) {
      this.setState('error');
      return;
    }

    this.setState('starting');
    const generation = ++this.generation;
    const handleTranscript = (transcript: string) => {
      if (generation !== this.generation || this.recognition !== rec) return;
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

    const rec = createDeepgramListener({
      onStart: () => {
        if (generation !== this.generation || this.recognition !== rec) return;
        this.permissionRetries = 0;
        this.lastError = null;
        this.setState('listening');
        zoeDebugSetState({ hfState: 'awaiting-wake' });
        zoeDebugSpeechStart('wake-word', 'Deepgram global hands-free sentinel');
      },
      onTranscript: (transcript) => handleTranscript(transcript),
      onError: (error) => {
        if (generation !== this.generation || this.recognition !== rec) return;
        this.lastError = error.message;
        zoeDebugSpeechError('wake-word', error.message, 'Deepgram sentinel');
      },
      onEnd: () => {
        releaseSpeechRecognition('wake-word');
        if (generation !== this.generation || this.recognition !== rec) return;
        this.recognition = null;
        if (this.enabled) this.scheduleRestart(700);
        else this.setState('off');
      },
    });

    this.recognition = rec;
    try {
      reserveSpeechRecognition('wake-word');
      await rec.start();
    } catch (error) {
      releaseSpeechRecognition('wake-word');
      zoeDebugSpeechError('wake-word', error instanceof Error ? error.message : String(error), 'start failed');
      this.recognition = null;
      this.scheduleRestart(1200);
    }
  }
}

export const zoeBackgroundListener = new ZoeBackgroundListener();
export default zoeBackgroundListener;
