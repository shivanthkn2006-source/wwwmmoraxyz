/**
 * GLOBAL MUSIC ENGINE — a plain TypeScript singleton that lives OUTSIDE the
 * React tree.
 *
 * Why a singleton: React unmounts and remounts components on every route
 * change, which would tear down an <audio> element owned by a component. This
 * engine owns one element for the whole app, so playback survives navigation
 * across every page, and the UI merely subscribes to its state.
 *
 * It also:
 *   · registers Media Session so the OS lock screen, Control Center and
 *     desktop media keys drive playback;
 *   · pins output to the member's selected Bluetooth headset (AudioRouter);
 *   · ducks itself while Zoe speaks, and restores the level afterwards;
 *   · queues, shuffles, repeats and auto-advances.
 *
 * Nothing here renders anything, so no existing UI or layout is affected.
 */

import type { MusicTrack } from '@/features/music/musicProviders';
import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';
import { nativeZoeMusicBridge } from '@/services/NativeZoeMusicBridge';

export type MusicStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';
export type RepeatMode = 'off' | 'all' | 'one';

export interface MusicState {
  status: MusicStatus;
  track: MusicTrack | null;
  queue: MusicTrack[];
  index: number;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Honest, member-readable reason when something could not play. */
  error: string | null;
}

const VOLUME_KEY = 'mmora.music.volume';

class MusicEngineImpl {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<(state: MusicState) => void>();
  private ttsUnsub: (() => void) | null = null;
  private duckedFrom: number | null = null;
  private unlocked = false;
  private nativeReady = false;
  private failedIndexes = new Set<number>();

  private state: MusicState = {
    status: 'idle',
    track: null,
    queue: [],
    index: -1,
    position: 0,
    duration: 0,
    volume: 1,
    shuffle: false,
    repeat: 'off',
    error: null,
  };

  /* ───────────────────────────── lifecycle ───────────────────────────── */

  private el(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (this.audio) return this.audio;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    try {
      const stored = Number(window.localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(stored) && stored > 0 && stored <= 1) this.state.volume = stored;
    } catch {
      /* private mode — default volume */
    }
    audio.volume = this.state.volume;

    audio.onplaying = () => this.patch({ status: 'playing', error: null });
    audio.onpause = () => {
      if (this.state.status !== 'idle') this.patch({ status: 'paused' });
    };
    audio.onwaiting = () => this.patch({ status: 'buffering' });
    audio.ontimeupdate = () =>
      this.patch({
        position: audio.currentTime || 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    audio.onended = () => void this.next(true);
    audio.onerror = () => void this.recoverFromStreamError();

    this.audio = audio;
    this.bindDucking();
    return audio;
  }

  private async ensureNative(): Promise<boolean> {
    if (!nativeZoeMusicBridge.isAvailable()) return false;
    if (!this.nativeReady) {
      await nativeZoeMusicBridge.initialize(
        (event) => this.patch({
          status: event.state,
          ...(typeof event.position === 'number' ? { position: event.position } : {}),
          ...(typeof event.duration === 'number' ? { duration: event.duration } : {}),
          error: event.state === 'error' ? event.reason ?? 'Native playback failed.' : null,
        }),
        () => void this.next(),
        () => void this.previous(),
      );
      this.nativeReady = true;
    }
    return true;
  }

  /** iOS/Android block audio until a real gesture — call this from any tap. */
  unlock(): void {
    if (this.unlocked) return;
    const audio = this.el();
    if (!audio) return;
    this.unlocked = true;
    try {
      audio.muted = true;
      void audio.play().catch(() => undefined);
      audio.pause();
      audio.muted = false;
    } catch {
      /* nothing to unlock yet */
    }
  }

  private bindDucking(): void {
    if (this.ttsUnsub) return;
    this.ttsUnsub = subscribeTTSAudio((speaking) => {
      const audio = this.audio;
      if (!audio) return;
      if (speaking) {
        if (this.duckedFrom === null) this.duckedFrom = audio.volume;
        audio.volume = Math.min(audio.volume, Math.max(0.08, this.duckedFrom * 0.15));
      } else if (this.duckedFrom !== null) {
        audio.volume = this.duckedFrom;
        this.duckedFrom = null;
      }
    });
  }

  private publishMetadata(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const track = this.state.track;
    if (!track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.credit,
        artwork: track.artwork ? [{ src: track.artwork, sizes: '512x512' }] : [],
      });
      navigator.mediaSession.playbackState = this.state.status === 'playing' ? 'playing' : 'paused';
    } catch {
      /* metadata is best-effort */
    }
  }

  /* ───────────────────────────── subscription ───────────────────────────── */

  subscribe(listener: (state: MusicState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): MusicState {
    return this.state;
  }

  private patch(next: Partial<MusicState>): void {
    this.state = { ...this.state, ...next };
    this.publishMetadata();
    for (const listener of this.listeners) listener(this.state);
  }

  /* ───────────────────────────── playback ───────────────────────────── */

  async playQueue(tracks: MusicTrack[], startIndex = 0): Promise<boolean> {
    if (!tracks.length) {
      this.patch({ error: 'I could not find that on any of the free music sources.' });
      return false;
    }
    this.failedIndexes.clear();
    this.patch({ queue: tracks, index: -1, error: null });
    void import('@/services/AudioRouterService').then(({ audioRouter }) => audioRouter.refreshMediaSessionHandlers());
    return this.playIndex(startIndex);
  }

  enqueue(tracks: MusicTrack[]): void {
    if (!tracks.length) return;
    this.patch({ queue: [...this.state.queue, ...tracks] });
  }

  async playIndex(index: number): Promise<boolean> {
    const track = this.state.queue[index];
    if (!track) return false;
    this.patch({ index, track, status: 'buffering', position: 0, duration: 0, error: null });
    if (await this.ensureNative()) {
      try {
        await nativeZoeMusicBridge.load(track);
        await nativeZoeMusicBridge.play();
        return true;
      } catch (error) {
        this.patch({ status: 'error', error: error instanceof Error ? error.message : 'Native playback failed.' });
        return false;
      }
    }
    const audio = this.el();
    if (!audio) return false;
    audio.src = track.url;
    try {
      await audio.play();
      void this.routeToHeadset(audio);
      return true;
    } catch {
      this.patch({
        status: 'error',
        error: 'Playback needs one tap first on this device — tap the play symbol and it continues.',
      });
      return false;
    }
  }

  private async recoverFromStreamError(): Promise<void> {
    const failed = this.state.index;
    if (failed >= 0) this.failedIndexes.add(failed);
    const nextIndex = this.state.queue.findIndex((_, index) => !this.failedIndexes.has(index));
    if (nextIndex >= 0) {
      this.patch({ status: 'buffering', error: 'That stream was unavailable, so I’m trying the next one.' });
      await this.playIndex(nextIndex);
      return;
    }
    this.patch({ status: 'error', error: 'None of those streams would play right now. Try another search.' });
  }

  private async routeToHeadset(audio: HTMLAudioElement): Promise<void> {
    try {
      const { audioRouter } = await import('@/services/AudioRouterService');
      await audioRouter.applySinkToElement(audio);
    } catch {
      /* default output is fine */
    }
  }

  async play(): Promise<void> {
    if (!this.state.track && this.state.queue.length) {
      await this.playIndex(0);
      return;
    }
    if (await this.ensureNative()) {
      await nativeZoeMusicBridge.play();
      return;
    }
    const audio = this.el();
    if (!audio) return;
    try {
      await audio.play();
    } catch {
      this.patch({ status: 'paused' });
    }
  }

  pause(): void {
    if (nativeZoeMusicBridge.isAvailable()) {
      void nativeZoeMusicBridge.pause();
      return;
    }
    this.audio?.pause();
  }

  toggle(): void {
    if (this.state.status === 'playing' || this.state.status === 'buffering') this.pause();
    else void this.play();
  }

  stop(): void {
    if (nativeZoeMusicBridge.isAvailable()) void nativeZoeMusicBridge.stop();
    const audio = this.audio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    // Keep the loaded track and queue selected so the global transport remains
    // visible and Play can restart the same song after Stop.
    this.patch({ status: 'idle', position: 0 });
    void import('@/services/AudioRouterService').then(({ audioRouter }) => audioRouter.refreshMediaSessionHandlers());
  }

  async next(auto = false): Promise<void> {
    const { queue, index, shuffle, repeat } = this.state;
    if (!queue.length) return;
    if (auto && repeat === 'one') {
      await this.playIndex(index);
      return;
    }
    let target = shuffle ? Math.floor(Math.random() * queue.length) : index + 1;
    if (target >= queue.length) {
      if (repeat === 'off' && auto) {
        this.patch({ status: 'idle', position: 0 });
        return;
      }
      target = 0;
    }
    await this.playIndex(target);
  }

  async previous(): Promise<void> {
    const { queue, index } = this.state;
    if (!queue.length) return;
    const audio = this.audio;
    if (audio && audio.currentTime > 3) {
    await this.playIndex(target);
      audio.currentTime = 0;
      return;
    }
    await this.playIndex(index <= 0 ? queue.length - 1 : index - 1);
  }

  seek(seconds: number): void {
    if (nativeZoeMusicBridge.isAvailable()) {
      void nativeZoeMusicBridge.seek(Math.max(0, seconds));
      return;
    }
    const audio = this.audio;
    if (!audio || !Number.isFinite(seconds)) return;
    try {
      audio.currentTime = Math.max(0, seconds);
    } catch {
      /* live streams are not seekable */
    }
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    const audio = this.el();
    if (audio) audio.volume = clamped;
    if (nativeZoeMusicBridge.isAvailable()) void nativeZoeMusicBridge.setVolume(clamped);
    this.duckedFrom = null;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      /* private mode */
    }
    this.patch({ volume: clamped });
  }

  toggleShuffle(): void {
    this.patch({ shuffle: !this.state.shuffle });
  }

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(this.state.repeat) + 1) % order.length];
    this.patch({ repeat: next });
  }
}

export const musicEngine = new MusicEngineImpl();
export default musicEngine;
