/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VAD COST FIREWALL - Zero-Cost Voice Activity Detection
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Uses Web Audio API for local speech detection (FREE, runs in browser).
 * Gates audio processing: only passes through when human speech is detected.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══ CONFIGURATION ═══
const SPEECH_PROBABILITY_THRESHOLD = 0.8;
const SILENCE_TIMEOUT_MS = 2000;
const ANALYSIS_INTERVAL_MS = 100;
const HUMAN_VOICE_MIN_HZ = 85;
const HUMAN_VOICE_MAX_HZ = 255;
const ENERGY_THRESHOLD = 0.15;

// ═══ TYPES ═══
export interface VADState {
  isSpeechDetected: boolean;
  speechProbability: number;
  audioLevel: number;
  gateOpen: boolean;
  lastSpeechTimestamp: number;
}

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSilence?: () => void;
  onAudioLevel?: (level: number) => void;
  onGateOpen?: () => void;
  onGateClose?: () => void;
}

// ═══ VAD COST FIREWALL CLASS ═══
class VADCostFirewall {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null;
  
  private state: VADState = {
    isSpeechDetected: false,
    speechProbability: 0,
    audioLevel: 0,
    gateOpen: false,
    lastSpeechTimestamp: 0,
  };

  private callbacks: VADCallbacks = {};
  private frequencyData: any = null;
  private timeData: any = null;
  private isActive = false;
  private speechHistory: boolean[] = [];
  private readonly HISTORY_LENGTH = 5;

  async start(callbacks: VADCallbacks = {}): Promise<boolean> {
    if (this.isActive) return true;
    this.callbacks = callbacks;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      this.analysisInterval = setInterval(() => this.analyze(), ANALYSIS_INTERVAL_MS);
      this.isActive = true;

      console.log('[VAD] 🛡️ Cost Firewall ACTIVE');
      return true;
    } catch (error) {
      console.error('[VAD] Failed to start:', error);
      return false;
    }
  }

  stop(): void {
    if (this.analysisInterval) { clearInterval(this.analysisInterval); this.analysisInterval = null; }
    if (this.silenceTimeout) { clearTimeout(this.silenceTimeout); this.silenceTimeout = null; }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(track => track.stop()); this.mediaStream = null; }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
    this.analyser = null;
    this.isActive = false;
    this.state = { isSpeechDetected: false, speechProbability: 0, audioLevel: 0, gateOpen: false, lastSpeechTimestamp: 0 };
    console.log('[VAD] 🛑 Cost Firewall stopped');
  }

  private analyze(): void {
    if (!this.analyser || !this.frequencyData || !this.timeData) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const audioLevel = this.calculateAudioLevel();
    this.state.audioLevel = audioLevel;
    this.callbacks.onAudioLevel?.(audioLevel);

    const speechProbability = this.calculateSpeechProbability();
    this.state.speechProbability = speechProbability;

    const isSpeech = speechProbability >= SPEECH_PROBABILITY_THRESHOLD;
    this.speechHistory.push(isSpeech);
    if (this.speechHistory.length > this.HISTORY_LENGTH) this.speechHistory.shift();

    const speechCount = this.speechHistory.filter(Boolean).length;
    const smoothedSpeech = speechCount > this.HISTORY_LENGTH / 2;

    if (smoothedSpeech && !this.state.isSpeechDetected) {
      this.state.isSpeechDetected = true;
      this.state.lastSpeechTimestamp = Date.now();
      this.callbacks.onSpeechStart?.();

      if (!this.state.gateOpen) {
        this.state.gateOpen = true;
        this.callbacks.onGateOpen?.();
        console.log('[VAD] 🔓 GATE OPEN - Speech detected');
      }

      if (this.silenceTimeout) { clearTimeout(this.silenceTimeout); this.silenceTimeout = null; }
    } else if (!smoothedSpeech && this.state.isSpeechDetected) {
      this.state.isSpeechDetected = false;
      this.callbacks.onSpeechEnd?.();

      if (!this.silenceTimeout && this.state.gateOpen) {
        this.silenceTimeout = setTimeout(() => {
          this.state.gateOpen = false;
          this.callbacks.onGateClose?.();
          this.callbacks.onSilence?.();
          console.log('[VAD] 🔒 GATE CLOSED - Silence detected');
        }, SILENCE_TIMEOUT_MS);
      }
    } else if (smoothedSpeech) {
      this.state.lastSpeechTimestamp = Date.now();
    }
  }

  private calculateAudioLevel(): number {
    if (!this.timeData) return 0;
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const sample = (this.timeData[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / this.timeData.length);
  }

  private calculateSpeechProbability(): number {
    if (!this.frequencyData || !this.analyser || !this.audioContext) return 0;

    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;

    const minBin = Math.floor(HUMAN_VOICE_MIN_HZ / binSize);
    const maxBin = Math.ceil(HUMAN_VOICE_MAX_HZ / binSize);

    let voiceEnergy = 0;
    let voiceCount = 0;
    for (let i = minBin; i <= maxBin && i < this.frequencyData.length; i++) {
      voiceEnergy += this.frequencyData[i];
      voiceCount++;
    }
    const avgVoiceEnergy = voiceEnergy / voiceCount / 255;

    let highEnergy = 0;
    let highCount = 0;
    const highMinBin = Math.floor(2000 / binSize);
    const highMaxBin = Math.ceil(4000 / binSize);
    for (let i = highMinBin; i <= highMaxBin && i < this.frequencyData.length; i++) {
      highEnergy += this.frequencyData[i];
      highCount++;
    }
    const avgHighEnergy = highEnergy / highCount / 255;

    const voiceRatio = avgVoiceEnergy > 0.01 ? avgVoiceEnergy / (avgHighEnergy + 0.01) : 0;
    const audioLevel = this.calculateAudioLevel();
    const hasEnoughEnergy = audioLevel > ENERGY_THRESHOLD;

    let probability = 0;
    if (hasEnoughEnergy) {
      probability = Math.min(avgVoiceEnergy * 3, 0.6);
      if (voiceRatio > 1.5 && voiceRatio < 5.0) probability += 0.3;
      probability += Math.min(audioLevel * 0.5, 0.2);
    }

    return Math.min(probability, 1.0);
  }

  getState(): VADState { return { ...this.state }; }
  isGateOpen(): boolean { return this.state.gateOpen; }
  isRunning(): boolean { return this.isActive; }
}

// ═══ SINGLETON INSTANCE ═══
let vadInstance: VADCostFirewall | null = null;

export function getVADFirewall(): VADCostFirewall {
  if (!vadInstance) vadInstance = new VADCostFirewall();
  return vadInstance;
}

export async function createProtectedAudioStream(callbacks?: VADCallbacks): Promise<{
  stream: MediaStream | null;
  vad: VADCostFirewall;
  isGateOpen: () => boolean;
  stop: () => void;
}> {
  const vad = getVADFirewall();
  await vad.start(callbacks);
  return { stream: null, vad, isGateOpen: () => vad.isGateOpen(), stop: () => vad.stop() };
}

export function guardWithVAD<T>(callback: () => T, fallback: T): T {
  const vad = getVADFirewall();
  return vad.isGateOpen() ? callback() : fallback;
}

export async function guardWithVADAsync<T>(callback: () => Promise<T>, fallback: T): Promise<T> {
  const vad = getVADFirewall();
  return vad.isGateOpen() ? callback() : fallback;
}
