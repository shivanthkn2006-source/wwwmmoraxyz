import { useState, useCallback, useRef, useEffect } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface UseGeminiTTSReturn {
  isSpeaking: boolean;
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}

// Chrome has a bug where speechSynthesis stops after ~15 seconds
// This workaround keeps it alive by resuming periodically
let chromeBugWorkaroundInterval: ReturnType<typeof setInterval> | null = null;

function startChromeBugWorkaround() {
  if (chromeBugWorkaroundInterval) return;
  
  chromeBugWorkaroundInterval = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 5000); // Resume every 5 seconds to prevent cutoff
}

function stopChromeBugWorkaround() {
  if (chromeBugWorkaroundInterval) {
    clearInterval(chromeBugWorkaroundInterval);
    chromeBugWorkaroundInterval = null;
  }
}

// Split text into speakable chunks at sentence boundaries
function splitIntoChunks(text: string, maxLength = 150): string[] {
  const chunks: string[] = [];
  
  // Split by sentence-ending punctuation while keeping the punctuation
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (!trimmedSentence) continue;
    
    // If adding this sentence exceeds max length, save current chunk and start new one
    if (currentChunk.length + trimmedSentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

export function useGeminiTTS(): UseGeminiTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceIndexRef = useRef(0);
  const voicesLoadedRef = useRef(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isCancelledRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttempts = 3;

  // Preload voices and find preferred voice
  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoadedRef.current = true;
      
      // Find best voice in priority order
      preferredVoiceRef.current = 
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('Alex')) ||
        voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
      
      console.log('[TTS] Loaded voice:', preferredVoiceRef.current?.name);
    }
  }, []);

  // Check for browser support and initialize
  useEffect(() => {
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasSpeechRecognition = !!SpeechRecognitionConstructor;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    setIsSupported(hasSpeechRecognition && hasSpeechSynthesis);

    console.log('[TTS] Browser support:', { hasSpeechRecognition, hasSpeechSynthesis });

    // Load voices immediately and on change
    if (hasSpeechSynthesis) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Force initial voice load (some browsers need this)
      setTimeout(loadVoices, 100);
      setTimeout(loadVoices, 500);
    }

    if (hasSpeechRecognition) {
      try {
        const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionInstance;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          const transcriptText = result[0].transcript;
          setTranscript(transcriptText);
          console.log('[TTS] Transcript:', transcriptText);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // Ignore common non-critical errors
          if (['no-speech', 'aborted'].includes(event.error)) {
            console.log('[TTS] Recognition ended:', event.error);
            return;
          }
          
          console.warn('[TTS] Speech recognition error:', event.error);
          setIsListening(false);
          
          // Auto-retry for transient errors
          if (event.error === 'network' && restartAttemptsRef.current < maxRestartAttempts) {
            restartAttemptsRef.current++;
            console.log('[TTS] Auto-retry attempt', restartAttemptsRef.current);
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.warn('[TTS] Retry failed:', e);
              }
            }, 500);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          restartAttemptsRef.current = 0;
        };

        recognitionRef.current = recognition;
        console.log('[TTS] Recognition initialized successfully');
      } catch (err) {
        console.error('[TTS] Failed to initialize recognition:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      window.speechSynthesis.cancel();
      stopChromeBugWorkaround();
      if (hasSpeechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [loadVoices]);

  // Speak the next chunk in queue
  const speakNextChunk = useCallback(() => {
    if (isCancelledRef.current) {
      setIsSpeaking(false);
      stopChromeBugWorkaround();
      return;
    }

    const queue = utteranceQueueRef.current;
    const currentIndex = currentUtteranceIndexRef.current;

    if (currentIndex >= queue.length) {
      // All chunks spoken
      setIsSpeaking(false);
      stopChromeBugWorkaround();
      utteranceQueueRef.current = [];
      currentUtteranceIndexRef.current = 0;
      return;
    }

    const utterance = queue[currentIndex];
    
    utterance.onend = () => {
      currentUtteranceIndexRef.current++;
      // Small delay between chunks for natural pacing
      setTimeout(speakNextChunk, 50);
    };

    utterance.onerror = (event) => {
      console.warn('[TTS] Utterance error:', event);
      // Try to continue with next chunk
      currentUtteranceIndexRef.current++;
      setTimeout(speakNextChunk, 100);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[TTS] Failed to speak chunk:', err);
      currentUtteranceIndexRef.current++;
      setTimeout(speakNextChunk, 100);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      // Fallback: just simulate speaking
      setIsSpeaking(true);
      const duration = Math.min(text.length * 50, 10000);
      setTimeout(() => setIsSpeaking(false), duration);
      return;
    }

    // Cancel any ongoing speech
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    stopChromeBugWorkaround();
    
    // Reset state
    isCancelledRef.current = false;
    utteranceQueueRef.current = [];
    currentUtteranceIndexRef.current = 0;

    // Split text into chunks for reliable playback
    const chunks = splitIntoChunks(text, 150);
    console.log('[TTS] Speaking', chunks.length, 'chunks');

    // Create utterances for each chunk
    const utterances = chunks.map(chunk => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      utterance.volume = 0.85;
      
      // Use preloaded voice
      if (preferredVoiceRef.current) {
        utterance.voice = preferredVoiceRef.current;
      }
      
      return utterance;
    });

    utteranceQueueRef.current = utterances;
    
    // Start speaking
    setIsSpeaking(true);
    startChromeBugWorkaround();
    speakNextChunk();
  }, [speakNextChunk]);

  const stopSpeaking = useCallback(() => {
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    stopChromeBugWorkaround();
    utteranceQueueRef.current = [];
    currentUtteranceIndexRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.warn('[TTS] Speech recognition not supported or not initialized');
      return;
    }

    // Stop any ongoing speech before listening
    stopSpeaking();
    restartAttemptsRef.current = 0;

    setTranscript('');
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
      console.log('[TTS] Started listening');
    } catch (err: any) {
      // Handle "already started" error gracefully
      if (err?.message?.includes('already started')) {
        console.log('[TTS] Recognition already active');
        return;
      }
      console.warn('[TTS] Failed to start recognition:', err);
      setIsListening(false);
    }
  }, [stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isSpeaking,
    isListening,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported
  };
}
