// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENT VOICE COMMAND SERVICE
// A single long-lived recognizer that survives route changes, throttles noisy
// interim results, debounces final transcripts, and cancels in-flight handling
// when the route changes so a command never lands on the wrong screen.
// ═══════════════════════════════════════════════════════════════════════════════

import { usePlatformStore } from '@/store/usePlatformStore';

export interface VoiceCommand {
  /** Stable id used for logging and tests. */
  id: string;
  /** Matcher against the normalized (lowercased, trimmed) transcript. */
  match: RegExp | ((transcript: string) => boolean);
  /** Routes this command is valid on. Omit for "anywhere". */
  routes?: string[];
  run: (ctx: { transcript: string; signal: AbortSignal; route: string }) => void | Promise<void>;
}

export interface VoiceServiceOptions {
  /** Minimum ms between two accepted transcripts (throttle). */
  throttleMs?: number;
  /** Quiet period after the last partial before a transcript is handled. */
  debounceMs?: number;
  getRoute?: () => string;
}

type Recognition = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

const DEFAULTS = { throttleMs: 1200, debounceMs: 350 };

const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

export class VoiceCommandService {
  private recognition: Recognition | null = null;
  private commands: VoiceCommand[] = [];
  private running = false;
  private lastAcceptedAt = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: AbortController | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly opts: Required<VoiceServiceOptions>;

  constructor(options: VoiceServiceOptions = {}) {
    this.opts = {
      throttleMs: options.throttleMs ?? DEFAULTS.throttleMs,
      debounceMs: options.debounceMs ?? DEFAULTS.debounceMs,
      getRoute:
        options.getRoute ??
        (() => (typeof window !== 'undefined' ? window.location.pathname : '/')),
    };
  }

  register(command: VoiceCommand): () => void {
    this.commands = [...this.commands.filter((c) => c.id !== command.id), command];
    return () => {
      this.commands = this.commands.filter((c) => c.id !== command.id);
    };
  }

  get isRunning() {
    return this.running;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  start(): boolean {
    if (this.running) return true;
    if (!VoiceCommandService.isSupported()) {
      usePlatformStore.getState().setVoiceStatus('error');
      return false;
    }
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as new () => Recognition;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => {
      const code = (event as { error?: string })?.error ?? 'unknown';
      if (code === 'no-speech' || code === 'aborted') return;
      usePlatformStore.getState().setVoiceStatus('error');
    };
    // Browsers end long sessions on their own — persistence means restarting.
    recognition.onend = () => {
      if (!this.running) return;
      this.restartTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }, 400);
    };

    this.recognition = recognition;
    this.running = true;
    usePlatformStore.getState().toggleVoiceCommand(true);
    try {
      recognition.start();
    } catch {
      /* start() throws if already running */
    }
    return true;
  }

  stop() {
    this.running = false;
    this.cancelInFlight('service-stopped');
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.debounceTimer = null;
    this.restartTimer = null;
    try {
      this.recognition?.abort?.() ?? this.recognition?.stop();
    } catch {
      /* recognizer already torn down */
    }
    this.recognition = null;
    usePlatformStore.getState().toggleVoiceCommand(false);
  }

  /** Route-safe cancellation: abort work started on the previous screen. */
  handleRouteChange() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.cancelInFlight('route-changed');
    if (this.running) usePlatformStore.getState().setVoiceStatus('listening');
  }

  private cancelInFlight(reason: string) {
    if (!this.inFlight) return;
    this.inFlight.abort(reason);
    this.inFlight = null;
  }

  private handleResult(event: unknown) {
    const results = (event as { results?: ArrayLike<ArrayLike<{ transcript: string }>> })?.results;
    if (!results || results.length === 0) return;
    const last = results[results.length - 1];
    const transcript = normalize(last?.[0]?.transcript ?? '');
    if (!transcript) return;

    // Debounce: only act once the speaker has paused.
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.dispatch(transcript), this.opts.debounceMs);
  }

  /** Exposed for tests and for text-typed commands. */
  async dispatch(rawTranscript: string): Promise<'throttled' | 'no-match' | 'dispatched'> {
    const transcript = normalize(rawTranscript);
    const now = Date.now();

    // Throttle: ignore rapid repeats from a chatty recognizer.
    if (now - this.lastAcceptedAt < this.opts.throttleMs) return 'throttled';

    const route = this.opts.getRoute();
    const command = this.commands.find((c) => {
      if (c.routes && !c.routes.some((r) => route.startsWith(r))) return false;
      return typeof c.match === 'function' ? c.match(transcript) : c.match.test(transcript);
    });
    if (!command) return 'no-match';

    this.lastAcceptedAt = now;
    this.cancelInFlight('superseded');
    const controller = new AbortController();
    this.inFlight = controller;

    const store = usePlatformStore.getState();
    store.setLastCommand(transcript);
    store.setVoiceStatus('processing');

    try {
      await command.run({ transcript, signal: controller.signal, route });
    } catch (e) {
      if (!controller.signal.aborted) {
        console.warn('[voice] command failed:', command.id, e);
        usePlatformStore.getState().setVoiceStatus('error');
      }
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
      if (!controller.signal.aborted && this.running) {
        usePlatformStore.getState().setVoiceStatus('listening');
      }
    }
    return 'dispatched';
  }
}

/** Process-wide singleton — the service must outlive every route. */
export const voiceCommandService = new VoiceCommandService();
