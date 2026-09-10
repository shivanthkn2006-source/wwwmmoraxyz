/**
 * NativeZoeAudioBridge
 * --------------------
 * Typed bridge to the Capacitor microphone foreground service / iOS audio
 * session. Native wake and headset events are translated into the same browser
 * events already consumed by M'Mora Zoe, so there is still only one assistant,
 * one mic-permission path and one Deepgram output route.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type NativeListeningState = 'off' | 'starting' | 'listening' | 'error';

interface NativeVoiceEvent {
  phrase?: string;
  reason?: string;
}

interface NativeVoiceState {
  state: NativeListeningState;
  reason?: string;
}

interface NativeZoeAudioPlugin {
  startListening(options: { wakePhrases: string[]; stopPhrases: string[] }): Promise<{ active: boolean }>;
  stopListening(): Promise<void>;
  setOutputActive(options: { active: boolean }): Promise<void>;
  getStatus(): Promise<{ active: boolean; permission: string }>;
  addListener(eventName: 'wakeWord', listener: (event: NativeVoiceEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'stopPhrase', listener: (event: NativeVoiceEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'headsetButton', listener: (event: NativeVoiceEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'stateChanged', listener: (event: NativeVoiceState) => void): Promise<PluginListenerHandle>;
}

const pluginScope = globalThis as typeof globalThis & { __mmoraNativeZoeAudio?: NativeZoeAudioPlugin };
const NativeZoeAudio = pluginScope.__mmoraNativeZoeAudio ?? registerPlugin<NativeZoeAudioPlugin>('NativeZoeAudio');
pluginScope.__mmoraNativeZoeAudio = NativeZoeAudio;

class NativeZoeAudioBridge {
  private handles: PluginListenerHandle[] = [];
  private initialized = false;

  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<void> {
    if (!this.isAvailable() || this.initialized) return;
    this.initialized = true;
    this.handles = await Promise.all([
      NativeZoeAudio.addListener('wakeWord', ({ phrase }) => {
        window.dispatchEvent(new CustomEvent('zoe-orb-activate', { detail: { source: 'native-wake-word', transcript: phrase } }));
      }),
      NativeZoeAudio.addListener('stopPhrase', () => {
        window.dispatchEvent(new CustomEvent('zoe-stop-speaking'));
      }),
      NativeZoeAudio.addListener('headsetButton', () => {
        window.dispatchEvent(new CustomEvent('zoe-headset-talk'));
      }),
      NativeZoeAudio.addListener('stateChanged', (detail) => {
        window.dispatchEvent(new CustomEvent('zoe-native-listening-state', { detail }));
      }),
    ]);
  }

  async start(wakePhrases: string[], stopPhrases: string[]): Promise<boolean> {
    if (!this.isAvailable()) return false;
    await this.initialize();
    const result = await NativeZoeAudio.startListening({ wakePhrases, stopPhrases });
    return result.active;
  }

  async stop(): Promise<void> {
    if (!this.isAvailable()) return;
    await NativeZoeAudio.stopListening();
  }

  async setOutputActive(active: boolean): Promise<void> {
    if (!this.isAvailable()) return;
    await NativeZoeAudio.setOutputActive({ active });
  }

  async dispose(): Promise<void> {
    await Promise.all(this.handles.map((handle) => handle.remove()));
    this.handles = [];
    this.initialized = false;
  }
}

export const nativeZoeAudioBridge = new NativeZoeAudioBridge();
export default nativeZoeAudioBridge;