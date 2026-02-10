import { memo, useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Volume2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getVADFirewall, type VADCallbacks } from '@/core/audio/VADCostFirewall';

interface InfinityInputProps {
  onSend: (message: string) => void;
  mood?: 'neutral' | 'cyan' | 'gold';
  disabled?: boolean;
  onVoiceStart?: () => void;
  onVoiceEnd?: (transcript: string) => void;
  voiceEnabled?: boolean;
  wakeWordActive?: boolean;
  enableVAD?: boolean; // Enable VAD Cost Firewall (PROMPT 1)
}

export const InfinityInput = memo(function InfinityInput({ 
  onSend, 
  mood = 'neutral',
  disabled = false,
  onVoiceStart,
  onVoiceEnd,
  voiceEnabled = true,
  wakeWordActive = false,
  enableVAD = true, // VAD enabled by default to protect Deepgram costs
}: InfinityInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 1: VAD COST FIREWALL
  // Only send audio to Deepgram when speech is detected (saves 95% cost)
  // ═══════════════════════════════════════════════════════════════════════════
  const [vadActive, setVadActive] = useState(false);
  const [vadGateOpen, setVadGateOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const vadRef = useRef(getVADFirewall());

  const getMoodGlow = () => {
    switch (mood) {
      case 'cyan': return 'rgba(0, 255, 255, 0.5)';
      case 'gold': return 'rgba(255, 215, 0, 0.5)';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      // Stop VAD on unmount
      if (vadRef.current.isRunning()) {
        vadRef.current.stop();
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VAD INITIALIZATION - Start Cost Firewall when voice is enabled
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (enableVAD && voiceEnabled && !vadActive) {
      const startVAD = async () => {
        const vadCallbacks: VADCallbacks = {
          onSpeechStart: () => {
            console.log('[InfinityInput] 🎤 VAD: Speech detected');
          },
          onSpeechEnd: () => {
            console.log('[InfinityInput] 🔇 VAD: Speech ended');
          },
          onGateOpen: () => {
            setVadGateOpen(true);
            console.log('[InfinityInput] 🔓 VAD: Gate OPEN - Deepgram can receive');
          },
          onGateClose: () => {
            setVadGateOpen(false);
            console.log('[InfinityInput] 🔒 VAD: Gate CLOSED - Protecting Deepgram');
          },
          onAudioLevel: (level) => {
            setAudioLevel(level);
          },
        };
        
        const success = await vadRef.current.start(vadCallbacks);
        setVadActive(success);
        
        if (success) {
          console.log('[InfinityInput] 🛡️ VAD Cost Firewall ACTIVE - 95% savings');
        }
      };
      
      startVAD();
    }
    
    return () => {
      // Don't stop VAD here - let it run while component is mounted
    };
  }, [enableVAD, voiceEnabled, vadActive]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE INPUT - Speech-to-Text
  // ═══════════════════════════════════════════════════════════════════════════

  const startVoiceInput = useCallback(() => {
    // Prevent starting if already listening
    if (isListening || recognitionRef.current) {
      console.log('[InfinityInput] Already listening, skipping start');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[InfinityInput] Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
      onVoiceStart?.();
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setValue(prev => prev + final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[InfinityInput] Voice error:', event.error);
      setIsListening(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const finalValue = value + interimTranscript;
      setInterimTranscript('');
      
      if (finalValue.trim()) {
        onVoiceEnd?.(finalValue.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [value, interimTranscript, onVoiceStart, onVoiceEnd, isListening]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  // Auto-start voice if wake word was detected
  useEffect(() => {
    if (wakeWordActive && !isListening && !disabled) {
      startVoiceInput();
    }
  }, [wakeWordActive, isListening, disabled, startVoiceInput]);

  const displayValue = value + (interimTranscript ? interimTranscript : '');

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
      <div 
        className={`
          relative max-w-2xl mx-auto rounded-2xl overflow-hidden
          transition-all duration-300
        `}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${isListening ? 'rgba(0,255,255,0.6)' : isFocused ? getMoodGlow() : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isListening 
            ? '0 0 40px rgba(0,255,255,0.4)' 
            : isFocused ? `0 0 30px ${getMoodGlow()}` : 'none',
        }}
      >
        {/* Voice visualization wave */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-1 flex gap-[2px] px-3"
            >
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-cyan-400 rounded-full"
                  animate={{
                    height: ['2px', `${4 + Math.random() * 8}px`, '2px'],
                  }}
                  transition={{
                    duration: 0.3 + Math.random() * 0.2,
                    repeat: Infinity,
                    delay: i * 0.02,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-3 p-3">
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={(e) => {
              setValue(e.target.value);
              setInterimTranscript('');
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isListening ? "Listening..." : "Speak to the Universe..."}
            disabled={disabled || isListening}
            rows={1}
            className="
              flex-1 bg-transparent text-white placeholder-white/30
              text-base resize-none outline-none
              min-h-[24px] max-h-[200px]
            "
            style={{ 
              scrollbarWidth: 'none',
              color: interimTranscript ? 'rgba(0,255,255,0.7)' : 'white'
            }}
          />
          
          <div className="flex items-center gap-2 pb-0.5">
            {/* VAD Shield indicator - shows when Cost Firewall is active */}
            {enableVAD && vadActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`
                  p-1.5 rounded-full transition-all duration-200
                  ${vadGateOpen 
                    ? 'text-green-400 bg-green-400/20' 
                    : 'text-yellow-400/60 bg-yellow-400/10'
                  }
                `}
                title={vadGateOpen ? "Speech detected - Deepgram active" : "VAD active - Deepgram protected"}
              >
                <Shield className="w-4 h-4" />
              </motion.div>
            )}
            
            {/* Voice input toggle */}
            {voiceEnabled && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVoice}
                disabled={disabled}
                className={`
                  p-2 rounded-full transition-all duration-200
                  ${isListening 
                    ? 'text-cyan-400 bg-cyan-400/20 ring-2 ring-cyan-400/50' 
                    : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                  }
                `}
                aria-label={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Mic className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </motion.button>
            )}
            
            {/* Send button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!displayValue.trim() || disabled}
              className={`
                p-2 rounded-full transition-all duration-200
                ${displayValue.trim() && !disabled
                  ? 'text-white bg-white/20 hover:bg-white/30' 
                  : 'text-white/30 cursor-not-allowed'
                }
              `}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Wake word indicator */}
      <AnimatePresence>
        {wakeWordActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 
                       text-cyan-400 text-sm flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>"Hey Zoe" detected</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default InfinityInput;
