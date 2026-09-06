/**
 * Dictation → memory.
 *
 * Records a short spoken passage in the browser and sends it to the platform's
 * own transcription backend (`transcribe-audio`). This is speech *input* only —
 * it never speaks back, so the Deepgram-only voice policy is untouched.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DictationResult {
  text: string;
  /** True when no transcription provider was reachable — caller should say so honestly. */
  unavailable?: boolean;
}

const MAX_MS = 120_000;

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export class DictationSession {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  get active(): boolean {
    return this.recorder?.state === 'recording';
  }

  async start(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('This device has no microphone available to the browser.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMime();
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
    this.stopTimer = setTimeout(() => {
      if (this.recorder?.state === 'recording') this.recorder.stop();
    }, MAX_MS);
  }

  private cleanup() {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /** Stops recording and resolves with the transcript. */
  async stopAndTranscribe(): Promise<DictationResult> {
    const recorder = this.recorder;
    if (!recorder) return { text: '' };

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }));
      if (recorder.state === 'recording') recorder.stop();
      else resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }));
    });

    this.recorder = null;
    this.cleanup();

    if (blob.size < 1000) return { text: '' };

    const audio = await toBase64(blob);
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio, enableSentiment: false },
    });
    if (error) throw new Error('Transcription is not reachable right now.');
    const payload = data as { text?: string; useBrowserFallback?: boolean; error?: string } | null;
    if (payload?.useBrowserFallback) return { text: '', unavailable: true };
    if (payload?.error) throw new Error(payload.error);
    return { text: (payload?.text ?? '').trim() };
  }

  cancel(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recorder = null;
    this.chunks = [];
    this.cleanup();
  }
}
