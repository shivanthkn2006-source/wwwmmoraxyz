import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { MusicTrack } from '@/features/music/musicProviders';

interface NativeMusicState {
  state: 'idle' | 'buffering' | 'playing' | 'paused' | 'error';
  position?: number;
  duration?: number;
  reason?: string;
}

interface NativeZoeMusicPlugin {
  load(options: { url: string; title: string; artist: string; artwork?: string }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  addListener(eventName: 'stateChanged', listener: (state: NativeMusicState) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'next', listener: () => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'previous', listener: () => void): Promise<PluginListenerHandle>;
}

const NativeZoeMusic = registerPlugin<NativeZoeMusicPlugin>('NativeZoeMusic');

export class NativeZoeMusicBridge {
  private handles: PluginListenerHandle[] = [];
  private initialized = false;

  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(onState: (state: NativeMusicState) => void, onNext: () => void, onPrevious: () => void) {
    if (!this.isAvailable() || this.initialized) return;
    this.initialized = true;
    this.handles = await Promise.all([
      NativeZoeMusic.addListener('stateChanged', onState),
      NativeZoeMusic.addListener('next', onNext),
      NativeZoeMusic.addListener('previous', onPrevious),
    ]);
  }

  load(track: MusicTrack): Promise<void> {
    return NativeZoeMusic.load({
      url: track.url,
      title: track.title,
      artist: track.artist,
      ...(track.artwork ? { artwork: track.artwork } : {}),
    });
  }

  play(): Promise<void> { return NativeZoeMusic.play(); }
  pause(): Promise<void> { return NativeZoeMusic.pause(); }
  stop(): Promise<void> { return NativeZoeMusic.stop(); }
  seek(position: number): Promise<void> { return NativeZoeMusic.seek({ position }); }
  setVolume(volume: number): Promise<void> { return NativeZoeMusic.setVolume({ volume }); }
}

export const nativeZoeMusicBridge = new NativeZoeMusicBridge();