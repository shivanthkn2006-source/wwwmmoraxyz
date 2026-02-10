/**
 * Convert PCM audio data to WAV format
 * @param pcmData Base64 encoded PCM audio
 * @param sampleRate Sample rate (default: 24000 Hz)
 * @returns WAV audio as Blob
 */
export function pcmToWav(pcmData: string, sampleRate: number = 24000): Blob {
  // Decode base64 PCM data
  const binaryString = atob(pcmData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create Int16Array from bytes (PCM is 16-bit)
  const pcmSamples = new Int16Array(bytes.buffer);
  
  // Create WAV header
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmSamples.length * 2;
  
  // WAV file structure
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write PCM samples
  const samples = new Int16Array(buffer, 44);
  samples.set(pcmSamples);
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generate speech using Lovable AI TTS via edge function
 * NOTE: This function should only be called from server-side code (edge functions)
 * For client-side TTS, use speakAsZoe from @/utils/zoeVoice instead
 * 
 * @param text Text to convert to speech
 * @returns Audio blob or null on error
 * @deprecated Use speakAsZoe from @/utils/zoeVoice for client-side voice
 */
export async function generateSpeechWithGemini(text: string): Promise<Blob | null> {
  console.warn('[audioHelpers] generateSpeechWithGemini is deprecated. Use speakAsZoe from @/utils/zoeVoice for client-side TTS.');
  
  // This function is deprecated - client-side should use browser TTS via zoeVoice
  // Keeping for backward compatibility but it now falls back to browser TTS
  return null;
}

/**
 * Fallback to browser speech synthesis
 * 
 * NOTE: For Zoe AI voice responses, use speakAsZoe from @/utils/zoeVoice
 * for consistent calm, soothing voice across the platform
 * 
 * @param text Text to speak
 * @param options Voice options
 */
export function speakWithBrowserTTS(text: string, options?: { pitch?: number; rate?: number; volume?: number; voice?: string }) {
  if (!('speechSynthesis' in window)) {
    console.error('Browser TTS not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  
  if (options) {
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.rate) utterance.rate = options.rate;
    if (options.volume) utterance.volume = options.volume;
    
    if (options.voice) {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
  }

  speechSynthesis.speak(utterance);
}
