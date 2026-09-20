import { subscribeTTSAudio } from '@/utils/zoeTTSAudioBus';

/**
 * Routes the same authenticated Deepgram audio heard locally into a stable
 * WebRTC audio track. The track is created before peer negotiation, so every
 * group member receives Zoe without replacing the microphone track.
 */
export class ZoeGroupCallVoiceBridge {
  private context: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private unsubscribe: (() => void) | null = null;
  private sources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

  async start(): Promise<MediaStreamTrack | null> {
    if (typeof AudioContext === 'undefined') return null;
    if (!this.context) {
      this.context = new AudioContext();
      this.destination = this.context.createMediaStreamDestination();
      this.unsubscribe = subscribeTTSAudio(audio => {
        if (!audio || !this.context || !this.destination) return;
        try {
          let source = this.sources.get(audio);
          if (!source) {
            source = this.context.createMediaElementSource(audio);
            source.connect(this.context.destination);
            source.connect(this.destination);
            this.sources.set(audio, source);
          }
        } catch (error) {
          console.warn('[ZoeGroupVoice] could not route audio chunk', error);
        }
      });
    }
    if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
    return this.destination?.stream.getAudioTracks()[0] ?? null;
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.destination?.stream.getTracks().forEach(track => track.stop());
    this.destination = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.sources = new WeakMap();
  }
}