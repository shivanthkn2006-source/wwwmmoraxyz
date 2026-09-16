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
  private uploadRetries = new Set<number>();
  private shuffledIndices: number[] = [];

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

  private el(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    try {
      const stored = Number(window.localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(stored) && stored > 0 && stored <= 1) this.state.volume = stored;
    } catch { /* ignored */ }
    audio.volume = this.state.volume;
    audio.onplaying = () => this.patch({ status: 'playing', error: null });
    audio.onpause = () => { if (this.state.status !== 'idle') this.patch({ status: 'paused' }); };
    audio.onwaiting = () => this.patch({ status: 'buffering' });
    audio.ontimeupdate = () => this.patch({
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
    } catch { /* ignored */ }
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
        album: track.album || track.credit,
        artwork: track.artwork ? [{ src: track.artwork, sizes: '512x512' }] : [],
      });
      navigator.mediaSession.playbackState = this.state.status === 'playing' ? 'playing' : 'paused';
    } catch { /* ignored */ }
  }

  subscribe(listener: (state: MusicState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  getState(): MusicState { return this.state; }

  private patch(next: Partial<MusicState>): void {
    this.state = { ...this.state, ...next };
    this.publishMetadata();
    for (const listener of this.listeners) listener(this.state);
  }

  async playQueue(tracks: MusicTrack[], startIndex = 0): Promise<boolean> {
    if (!tracks.length) {
      this.patch({ error: 'I could not find that on any of the free music sources.' });
      return false;
    }
    this.failedIndexes.clear();
    this.shuffledIndices = [];
    this.patch({ queue: tracks, index: -1, error: null });
    void import('@/services/AudioRouterService').then(({ audioRouter }) => audioRouter.refreshMediaSessionHandlers());
    return this.playIndex(startIndex);
  }

  async playIndex(index: number): Promise<boolean> {
    let track = this.state.queue[index];
    if (!track) return false;
    this.patch({ index, track, status: 'buffering', position: 0, duration: 0, error: null });
    if (track.source === 'upload') {
      const fresh = await this.refreshUpload(track);
      if (!fresh) {
        this.patch({
          status: 'error',
          error: typeof navigator !== 'undefined' && navigator.onLine === false
            ? 'You are offline, so your upload cannot be opened. Reconnect and press play again.'
            : 'That upload could not be opened. Press play to try again.',
        });
        return false;
      }
      track = fresh;
      const queue = [...this.state.queue];
      queue[index] = fresh;
      this.patch({ queue, track: fresh });
    }
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
      this.patch({ status: 'error', error: 'Playback needs one tap first on this device — tap the play symbol and it continues.' });
      return false;
    }
  }

  /** Mints a fresh private link for one of the member's own uploads. */
  private async refreshUpload(track: MusicTrack): Promise<MusicTrack | null> {
    try {
      const { refreshUploadTrack } = await import('@/features/music/musicUploads');
      const fresh = await refreshUploadTrack(track);
      if (fresh?.url) return fresh;
    } catch { /* fall through to the stored link below */ }
    return track.url && /^https:/.test(track.url) ? track : null;
  }

  private async recoverFromStreamError(): Promise<void> {
    const failed = this.state.index;
    // A member's own upload usually fails only because its private link aged
    // out, so retry the same song once with a freshly signed link.
    if (failed >= 0 && this.state.track?.source === 'upload' && !this.uploadRetries.has(failed)) {
      this.uploadRetries.add(failed);
      this.patch({ status: 'buffering', error: null });
      if (await this.playIndex(failed)) return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.patch({ status: 'error', error: 'You are offline. Playback continues as soon as the connection is back.' });
      return;
    }
    if (failed >= 0) this.failedIndexes.add(failed);
    const { queue } = this.state;
    const nextIndex = queue.length
      ? Array.from({ length: queue.length }, (_, offset) => (failed + offset + 1) % queue.length)
          .find((index) => !this.failedIndexes.has(index)) ?? -1
      : -1;
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
    } catch { /* ignored */ }
  }

  async play(): Promise<void> {
    if (!this.state.track && this.state.queue.length) { await this.playIndex(0); return; }
    if (await this.ensureNative()) { await nativeZoeMusicBridge.play(); return; }
    const audio = this.el();
    if (!audio) return;
    try { await audio.play(); } catch { this.patch({ status: 'paused' }); }
  }

  pause(): void {
    if (nativeZoeMusicBridge.isAvailable()) { void nativeZoeMusicBridge.pause(); return; }
    this.audio?.pause();
  }

  toggle(): void {
    if (this.state.status === 'playing' || this.state.status === 'buffering') this.pause();
    else void this.play();
  }

  stop(): void {
    if (nativeZoeMusicBridge.isAvailable()) void nativeZoeMusicBridge.stop();
    const audio = this.audio;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    this.patch({ status: 'idle', position: 0 });
    void import('@/services/AudioRouterService').then(({ audioRouter }) => audioRouter.refreshMediaSessionHandlers());
  }

  async next(auto = false): Promise<void> {
    const { queue, index, shuffle, repeat } = this.state;
    if (!queue.length) return;
    if (auto && repeat === 'one' && index >= 0) { await this.playIndex(index); return; }

    let target = index + 1;
    if (shuffle && queue.length > 1) {
      if (this.shuffledIndices.length !== queue.length) {
        this.shuffledIndices = Array.from({ length: queue.length }, (_, i) => i).sort(() => Math.random() - 0.5);
      }
      const currentPos = this.shuffledIndices.indexOf(index);
      target = this.shuffledIndices[(currentPos + 1) % this.shuffledIndices.length];
      if (target === index) target = this.shuffledIndices[(currentPos + 2) % this.shuffledIndices.length];
    }

    if (target >= queue.length || (shuffle && target === this.shuffledIndices[0] && index !== -1)) {
      if (repeat === 'off' && auto) { this.patch({ status: 'idle', position: 0 }); return; }
      target = shuffle ? this.shuffledIndices[0] : 0;
    }
    await this.playIndex(target);
  }

  async previous(): Promise<void> {
    const { queue, index } = this.state;
    if (!queue.length) return;
    const audio = this.audio;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    await this.playIndex(index <= 0 ? queue.length - 1 : index - 1);
  }

  seek(seconds: number): void {
    if (nativeZoeMusicBridge.isAvailable()) { void nativeZoeMusicBridge.seek(Math.max(0, seconds)); return; }
    const audio = this.audio;
    if (!audio || !Number.isFinite(seconds)) return;
    try { audio.currentTime = Math.max(0, seconds); } catch { /* ignored */ }
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    const audio = this.el();
    if (audio) audio.volume = clamped;
    if (nativeZoeMusicBridge.isAvailable()) void nativeZoeMusicBridge.setVolume(clamped);
    this.duckedFrom = null;
    try { window.localStorage.setItem(VOLUME_KEY, String(clamped)); } catch { /* ignored */ }
    this.patch({ volume: clamped });
  }

  toggleShuffle(): void { this.patch({ shuffle: !this.state.shuffle }); }

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(this.state.repeat) + 1) % order.length];
    this.patch({ repeat: next });
  }
}

export const musicEngine = new MusicEngineImpl();
export default musicEngine;
