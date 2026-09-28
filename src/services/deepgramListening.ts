/** Deepgram-only live transcription for Zoe. The API key never reaches the browser. */
import { supabase } from '@/integrations/supabase/client';

const LISTEN_URL = 'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true&punctuate=true&endpointing=300&utterance_end_ms=1000&vad_events=true';

export interface DeepgramListener {
  start: () => Promise<void>;
  stop: () => void;
  abort: () => void;
  readonly active: boolean;
}

export interface DeepgramListeningOptions {
  onStart?: () => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

function pcm16(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer;
}

export function isDeepgramListeningSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia) && typeof AudioContext !== 'undefined';
}

export function createDeepgramListener(options: DeepgramListeningOptions): DeepgramListener {
  let socket: WebSocket | null = null;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let committed = '';
  let delivered = '';
  let active = false;
  let intentional = false;

  const releaseMedia = () => {
    if (keepAlive) clearInterval(keepAlive);
    keepAlive = null;
    processor?.disconnect();
    source?.disconnect();
    silentGain?.disconnect();
    processor = null;
    source = null;
    silentGain = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    void context?.close().catch(() => undefined);
    context = null;
  };

  const stop = () => {
    intentional = true;
    active = false;
    releaseMedia();
    const current = socket;
    socket = null;
    if (current?.readyState === WebSocket.OPEN) {
      try { current.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* closed */ }
    }
    try { current?.close(); } catch { /* closed */ }
  };

  const emit = (text: string, isFinal: boolean) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean || (isFinal && clean === delivered)) return;
    if (isFinal) delivered = clean;
    options.onTranscript(clean, isFinal);
  };

  const start = async () => {
    if (active || socket) return;
    if (!isDeepgramListeningSupported()) throw new Error('Deepgram listening is not supported on this device.');
    intentional = false;
    committed = '';
    delivered = '';

    const { data, error } = await supabase.functions.invoke('zoe-agent-token', { body: {} });
    if (error || !data?.token) throw new Error(error?.message || data?.error || 'Zoe could not start Deepgram listening.');
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(LISTEN_URL, ['token', data.token]);
      socket = ws;
      ws.onopen = () => {
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          context = audioContext;
          source = audioContext.createMediaStreamSource(stream as MediaStream);
          processor = audioContext.createScriptProcessor(2048, 1, 1);
          silentGain = audioContext.createGain();
          silentGain.gain.value = 0;
          processor.onaudioprocess = (event) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(pcm16(event.inputBuffer.getChannelData(0)));
          };
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioContext.destination);
          keepAlive = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }, 8000);
          active = true;
          options.onStart?.();
          resolve();
        } catch (cause) { reject(cause); }
      };
      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        let message: any;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'Results') {
          const fragment = String(message.channel?.alternatives?.[0]?.transcript ?? '').trim();
          if (message.is_final && fragment) committed = `${committed} ${fragment}`.trim();
          const visible = message.is_final ? committed : `${committed} ${fragment}`.trim();
          if (visible) emit(visible, Boolean(message.speech_final));
          if (message.speech_final) committed = '';
        } else if (message.type === 'UtteranceEnd' && committed) {
          emit(committed, true);
          committed = '';
        }
      };
      ws.onerror = () => {
        const failure = new Error('Deepgram listening connection failed.');
        options.onError?.(failure);
        if (!active) reject(failure);
      };
      ws.onclose = () => {
        const wasActive = active;
        active = false;
        socket = null;
        releaseMedia();
        if (wasActive || !intentional) options.onEnd?.();
      };
    });
  };

  return { start, stop, abort: stop, get active() { return active; } };
}