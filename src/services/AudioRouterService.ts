/**
 * AudioRouterService — M'Mora / Zoe Audio Master
 * =================================================================
 * Single source of truth for:
 *  - Output sink binding (Zoe's Deepgram TTS -> chosen Bluetooth headset)
 *  - Microphone ingestion (echo cancellation / noise suppression / AGC)
 *  - Hardware media-key hooks (AirPod stem, headset buttons) via MediaSession
 *  - Dynamic ducking matrix + real-time level metering (Web Audio API)
 *  - One-time platform-wide microphone permission
 *
 * Raw Web Bluetooth cannot carry two-way voice (HFP/HSP vs A2DP vs BAP/LC3
 * profile locks), so we route through the OS audio stack: enumerateDevices,
 * setSinkId, getUserMedia, mediaSession.
 */

import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';
import { nativeZoeAudioBridge } from '@/services/NativeZoeAudioBridge';

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  groupId: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export interface AudioDiagnostics {
  inputSampleRate: number;
  outputLatencyMs: number;
  isSinkIdSupported: boolean;
  activeInputLabel: string;
  activeOutputLabel: string;
  audioContextState: AudioContextState;
  hasMediaSession: boolean;
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'fallback' | 'unsupported' | 'error';

type Listener<T> = (data: T) => void;

const STORAGE_OUTPUT = 'mmora.audio.outputDeviceId';
const STORAGE_INPUT = 'mmora.audio.inputDeviceId';
const STORAGE_MIC_GRANTED = 'mmora.audio.micGrantedOnce';

class AudioRouterService {
  private static instance: AudioRouterService;

  private audioCtx: AudioContext | null = null;
  private primaryOutputElement: HTMLAudioElement | null = null;
  private duckingGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private currentInputDeviceId: string = 'default';
  private currentOutputDeviceId: string = 'default';
  private micStream: MediaStream | null = null;

  private status: ConnectionState = 'disconnected';
  private isListeningActive: boolean = false;
  private micPermission: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
  private micRequestInFlight: Promise<boolean> | null = null;
  private inputDevices: AudioDeviceOption[] = [];
  private outputDevices: AudioDeviceOption[] = [];

  private statusListeners: Set<Listener<ConnectionState>> = new Set();
  private deviceListeners: Set<Listener<{ inputs: AudioDeviceOption[]; outputs: AudioDeviceOption[] }>> = new Set();
  private levelListeners: Set<Listener<number>> = new Set();
  private animationFrameId: number | null = null;
  private ttsUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.currentOutputDeviceId = this.readStored(STORAGE_OUTPUT) || 'default';
    this.currentInputDeviceId = this.readStored(STORAGE_INPUT) || 'default';
    this.initMediaListeners();
    this.bindTTSStream();
  }

  public static getInstance(): AudioRouterService {
    if (!AudioRouterService.instance) {
      AudioRouterService.instance = new AudioRouterService();
    }
    return AudioRouterService.instance;
  }

  private readStored(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private writeStored(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  }

  /**
   * Initializes the audio pipeline, creates nodes, and hooks the Media Session API
   */
  public async initialize(audioElement?: HTMLAudioElement): Promise<void> {
    // Server rendering and test environments have no Web Audio / device layer.
    // That is not a failure — stay silent and report an honest unsupported state.
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
    ) {
      this.setStatus('unsupported');
      return;
    }

    try {
      this.setStatus('connecting');
      if (audioElement) this.primaryOutputElement = audioElement;

      if (!this.audioCtx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();

        // Configure Dynamic Ducking Matrix
        this.duckingGainNode = this.audioCtx.createGain();
        this.duckingGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

        // Create Analyser for Visual Metronome / Diagnostics
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.8;

        this.duckingGainNode.connect(this.audioCtx.destination);
      }

      // Only wake the audio hardware when something actually needs to play or
      // be measured. Resuming on page load keeps a Bluetooth headset in an
      // always-open stream, which the user hears as a constant hiss.
      if (this.audioCtx.state === 'running' && !this.micStream && !this.isListeningActive) {
        await this.audioCtx.suspend().catch(() => undefined);
      }

      this.refreshMediaSessionHandlers();
      await this.refreshDeviceList();
      if (this.primaryOutputElement && this.currentOutputDeviceId !== 'default') {
        await this.setOutputDevice(this.currentOutputDeviceId);
      }
      // Web Audio being initialized does not prove that a headset exists.
      // `connected` is reserved for a real labelled external active output;
      // otherwise playback honestly uses the operating-system default.
      const headset = resolveHeadsetState(this.outputDevices, this.currentOutputDeviceId);
      this.setStatus(headset.connected ? 'connected' : 'fallback');
    } catch (err) {
      console.error('[AudioRouterService] Initialization failed:', err);
      this.setStatus('error');
    }
  }

  private initMediaListeners(): void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = async () => {
        console.warn('[AudioRouterService] Hardware change detected. Re-enumerating...');
        await this.refreshDeviceList();
        // Re-pin the chosen sink after a headset connect/disconnect.
        if (this.currentOutputDeviceId !== 'default') {
          void this.setOutputDevice(this.currentOutputDeviceId);
        }
        const headset = resolveHeadsetState(this.outputDevices, this.currentOutputDeviceId);
        this.setStatus(headset.connected ? 'connected' : 'fallback');
      };
    }
  }

  /**
   * Every Deepgram TTS chunk Zoe plays is pinned to the selected headset sink
   * and ducks other platform audio while she speaks.
   */
  private bindTTSStream(): void {
    if (typeof window === 'undefined' || this.ttsUnsubscribe) return;
    this.ttsUnsubscribe = subscribeTTSAudio((audio) => {
      if (audio) {
        void this.applySinkToElement(audio);
        this.duckAudio(true);
        void nativeZoeAudioBridge.setOutputActive(true);
      } else {
        this.duckAudio(false);
        void nativeZoeAudioBridge.setOutputActive(false);
      }
    });
  }

  /** Pin any media element (e.g. Zoe's Deepgram chunk) to the active sink. */
  public async applySinkToElement(element: HTMLMediaElement): Promise<boolean> {
    if (this.currentOutputDeviceId === 'default') return true;
    if (!('setSinkId' in element)) return false;
    try {
      await (element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(
        this.currentOutputDeviceId
      );
      return true;
    } catch (err) {
      console.warn('[AudioRouterService] Could not pin element to sink:', err);
      return false;
    }
  }

  public async refreshDeviceList(): Promise<{ inputs: AudioDeviceOption[]; outputs: AudioDeviceOption[] }> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { inputs: [], outputs: [] };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs: AudioDeviceOption[] = [];
    const outputs: AudioDeviceOption[] = [];

    devices.forEach((d) => {
      const entry: AudioDeviceOption = {
        deviceId: d.deviceId,
        label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${d.deviceId.slice(0, 5)}...)`,
        groupId: d.groupId,
        kind: d.kind as 'audioinput' | 'audiooutput',
        isDefault: d.deviceId === 'default',
      };
      if (d.kind === 'audioinput') inputs.push(entry);
      if (d.kind === 'audiooutput') outputs.push(entry);
    });

    this.inputDevices = inputs;
    this.outputDevices = outputs;
    this.deviceListeners.forEach((listener) => listener({ inputs, outputs }));
    return { inputs, outputs };
  }

  /**
   * ONE-TIME microphone permission for the whole platform.
   * Every Zoe voice surface calls this instead of asking again.
   */
  public async ensureMicPermission(): Promise<boolean> {
    if (this.micPermission === 'granted') return true;
    if (this.micRequestInFlight) return this.micRequestInFlight;

    this.micRequestInFlight = (async () => {
      try {
        const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
        if (perms?.query) {
          const st = await perms.query({ name: 'microphone' as PermissionName }).catch(() => null);
          if (st) {
            this.micPermission = st.state as 'granted' | 'denied' | 'prompt';
            st.onchange = () => {
              this.micPermission = st.state as 'granted' | 'denied' | 'prompt';
            };
            if (st.state === 'granted') {
              this.writeStored(STORAGE_MIC_GRANTED, '1');
              await this.refreshDeviceList();
              return true;
            }
            if (st.state === 'denied') return false;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        this.micPermission = 'granted';
        this.writeStored(STORAGE_MIC_GRANTED, '1');
        await this.refreshDeviceList();
        try {
          window.dispatchEvent(new CustomEvent('mmora-mic-permission-granted'));
        } catch { /* noop */ }
        return true;
      } catch (err) {
        console.warn('[AudioRouterService] Microphone permission not granted:', err);
        this.micPermission = 'denied';
        return false;
      } finally {
        this.micRequestInFlight = null;
      }
    })();

    return this.micRequestInFlight;
  }

  public wasMicGrantedBefore(): boolean {
    return this.readStored(STORAGE_MIC_GRANTED) === '1';
  }

  /**
   * Lightweight startup path: learn which speakers/mics exist WITHOUT opening
   * the audio hardware. Page load must never put a headset into an active
   * stream — that is what the user hears as a permanent hiss.
   */
  public async prepareDevices(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      this.setStatus('unsupported');
      return;
    }
    try {
      await this.refreshDeviceList();
      this.refreshMediaSessionHandlers();
      const headset = resolveHeadsetState(this.outputDevices, this.currentOutputDeviceId);
      this.setStatus(headset.connected ? 'connected' : 'fallback');
    } catch {
      this.setStatus('error');
    }
  }

  /**
   * Release the microphone and let the audio hardware go quiet again.
   * Called whenever hands-free listening stops, so a Bluetooth headset drops
   * out of the always-open call profile instead of hissing forever.
   */
  public async releaseMic(): Promise<void> {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.isListeningActive = false;
    this.levelListeners.forEach((listener) => listener(0));
    if (this.audioCtx && this.audioCtx.state === 'running') {
      await this.audioCtx.suspend().catch(() => undefined);
    }
  }

  /**
   * Sets Output Sink (routes Zoe's voice to selected headset)
   */
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.currentOutputDeviceId = deviceId;
    this.writeStored(STORAGE_OUTPUT, deviceId);

    const element = this.primaryOutputElement;
    if (!element) return false;

    if ('setSinkId' in element) {
      try {
        await (element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
        console.info(`[AudioRouterService] Output sink routed to: ${deviceId}`);
        const headset = resolveHeadsetState(this.outputDevices, deviceId);
        this.setStatus(headset.connected ? 'connected' : 'fallback');
        return true;
      } catch (err) {
        console.error('[AudioRouterService] Failed to set sink ID:', err);
        this.setStatus('fallback');
        return false;
      }
    }

    console.warn('[AudioRouterService] setSinkId is not supported in this browser. Default OS routing applied.');
    this.setStatus('fallback');
    return false;
  }

  /**
   * Attaches microphone stream with noise suppression and echo cancellation
   */
  public async setInputDevice(deviceId: string): Promise<MediaStream | null> {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    const allowed = await this.ensureMicPermission();
    if (!allowed) {
      this.setStatus('error');
      return null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentInputDeviceId = deviceId;
      this.writeStored(STORAGE_INPUT, deviceId);

      if (!this.audioCtx) await this.initialize();
      // A live mic is a real reason to wake the audio graph.
      if (this.audioCtx?.state === 'suspended') await this.audioCtx.resume().catch(() => undefined);
      if (this.audioCtx && this.analyserNode) {
        const source = this.audioCtx.createMediaStreamSource(this.micStream);
        source.connect(this.analyserNode);
        this.startLevelMeter();
      }

      this.setStatus(this.status === 'error' ? 'connected' : this.status);
      return this.micStream;
    } catch (err) {
      console.error('[AudioRouterService] Failed to capture input stream:', err);
      this.setStatus('error');
      return null;
    }
  }

  /** Active headset mic stream, if any (shared with the STT layer). */
  public getMicStream(): MediaStream | null {
    return this.micStream;
  }

  public getActiveInputDeviceId(): string {
    return this.currentInputDeviceId;
  }

  public getActiveOutputDeviceId(): string {
    return this.currentOutputDeviceId;
  }

  /**
   * Headset Hardware Media Button Interceptors (MediaSession API)
   */
  public refreshMediaSessionHandlers(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        void import('@/services/MusicEngine').then(({ musicEngine }) => {
          if (musicEngine.getState().track) void musicEngine.play();
          else {
            console.info('[MediaSession] Hardware play pressed: Activating Zoe');
            this.toggleVoiceInput(true);
            try { window.dispatchEvent(new CustomEvent('zoe-headset-talk')); } catch { /* noop */ }
          }
        });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        void import('@/services/MusicEngine').then(({ musicEngine }) => {
          if (musicEngine.getState().track) musicEngine.pause();
          else this.interruptZoe();
        });
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        void import('@/services/MusicEngine').then(({ musicEngine }) => {
          if (musicEngine.getState().track) musicEngine.stop();
          else this.interruptZoe();
        });
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        void import('@/services/MusicEngine').then(({ musicEngine }) => {
          if (musicEngine.getState().track) void musicEngine.next();
          else {
            this.interruptZoe();
            try { window.dispatchEvent(new CustomEvent('zoe-headset-prompt')); } catch { /* noop */ }
          }
        });
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        void import('@/services/MusicEngine').then(({ musicEngine }) => {
          if (musicEngine.getState().track) void musicEngine.previous();
        });
      });

      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Zoe Neural Assistant',
        artist: "M'Mora Voice Core",
        album: 'Bluetooth Link Active',
      });
    } catch (err) {
      console.warn('[AudioRouterService] MediaSession handlers unavailable:', err);
    }
  }

  /**
   * Smoothly duck background audio when Zoe speaks
   */
  public duckAudio(enable: boolean): void {
    if (!this.duckingGainNode || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const targetGain = enable ? 0.15 : 1.0;
    this.duckingGainNode.gain.cancelScheduledValues(now);
    this.duckingGainNode.gain.linearRampToValueAtTime(targetGain, now + 0.15);
  }

  public interruptZoe(): void {
    if (this.primaryOutputElement) {
      this.primaryOutputElement.pause();
      this.primaryOutputElement.currentTime = 0;
    }
    try { window.dispatchEvent(new CustomEvent('zoe-stop-speaking')); } catch { /* noop */ }
    this.duckAudio(false);
  }

  public toggleVoiceInput(active: boolean): void {
    this.isListeningActive = active;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = active;
      });
    }
  }

  public isListening(): boolean {
    return this.isListeningActive;
  }

  private startLevelMeter(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    const tick = () => {
      if (this.analyserNode) {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        this.levelListeners.forEach((listener) => listener(normalized));
      }
      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public getDiagnostics(): AudioDiagnostics {
    return {
      inputSampleRate: this.audioCtx?.sampleRate || 48000,
      outputLatencyMs: this.audioCtx?.baseLatency ? Math.round(this.audioCtx.baseLatency * 1000) : 12,
      isSinkIdSupported: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
      activeInputLabel: this.currentInputDeviceId,
      activeOutputLabel: this.currentOutputDeviceId,
      audioContextState: this.audioCtx?.state || 'suspended',
      hasMediaSession: typeof navigator !== 'undefined' && 'mediaSession' in navigator,
      micPermission: this.micPermission,
    };
  }

  public onStatusChange(fn: Listener<ConnectionState>): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  public onDeviceListChange(fn: Listener<{ inputs: AudioDeviceOption[]; outputs: AudioDeviceOption[] }>): () => void {
    this.deviceListeners.add(fn);
    return () => {
      this.deviceListeners.delete(fn);
    };
  }

  public onLevelUpdate(fn: Listener<number>): () => void {
    this.levelListeners.add(fn);
    return () => {
      this.levelListeners.delete(fn);
    };
  }

  private setStatus(newStatus: ConnectionState): void {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  public getCurrentStatus(): ConnectionState {
    return this.status;
  }
}

export const audioRouter = AudioRouterService.getInstance();
export default audioRouter;

/**
 * Headset presence, resolved from the real device list only.
 *
 * The browser only exposes device labels after microphone permission is
 * granted, so when there is no label we report "not connected" instead of
 * guessing. Any indicator built on this is therefore truthful: it lights up
 * only when an actual external/Bluetooth output is the one in use.
 */
export interface HeadsetState {
  connected: boolean;
  label: string | null;
  wireless: boolean;
}

const EXTERNAL_HINTS = [
  /bluetooth/i, /\bbt\b/i, /hands-?free/i, /a2dp/i, /hfp/i,
  /airpod/i, /headset/i, /headphone/i, /earphone/i, /earbud/i, /\bbuds?\b/i, /\bear\b/i,
  /boat|boAt/i, /sony|wh-|wf-/i, /jabra/i, /bose/i, /beats/i, /jbl/i, /sennheiser/i,
  /soundcore|anker/i, /shokz|aftershokz/i, /nothing/i, /oneplus/i, /realme/i, /redmi|mi\b/i,
  /noise/i, /skullcandy/i, /galaxy buds/i, /pixel buds/i, /marshall/i, /sennheiser/i, /qcy/i,
];
const BUILTIN_HINTS = [/built-?in/i, /internal/i, /display audio/i, /hdmi/i, /monitor/i, /macbook/i, /laptop/i];
const WIRELESS_HINTS = [/bluetooth/i, /\bbt\b/i, /airpod/i, /buds/i, /hands-?free/i, /wireless/i, /a2dp/i, /hfp/i];

export function resolveHeadsetState(
  outputs: AudioDeviceOption[],
  activeOutputDeviceId: string,
): HeadsetState {
  const active =
    outputs.find((d) => d.deviceId === activeOutputDeviceId) ??
    outputs.find((d) => d.deviceId === 'default') ??
    null;

  const raw = active?.label?.trim() ?? '';
  // No label means no permission yet — do not pretend a headset is attached.
  if (!raw || /^(Speaker|Microphone) \(/.test(raw)) {
    return { connected: false, label: null, wireless: false };
  }

  const external = EXTERNAL_HINTS.some((re) => re.test(raw));
  const builtin = BUILTIN_HINTS.some((re) => re.test(raw));
  const connected = external && !(builtin && !external);

  return {
    connected,
    label: connected ? raw.replace(/^Default\s*-\s*/i, '') : null,
    wireless: connected && WIRELESS_HINTS.some((re) => re.test(raw)),
  };
}
