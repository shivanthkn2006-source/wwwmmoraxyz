// ═══════════════════════════════════════════════════════════════════════════════
// INFINITY INPUT PHANTOM - Battery-optimized input bar
// Part 6: The Performance (Protocol Phantom)
// Phase 2: Document X-Ray - Paperclip upload added
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createSpeechRecognition,
  requestMicPermission,
  isSpeechRecognitionSupported,
  stopSpeechRecognition,
} from '@/utils/micPermissionManager';

interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
}

interface InfinityInputPhantomProps {
  onSend: (message: string) => void;
  mood?: 'neutral' | 'cyan' | 'gold';
  disabled?: boolean;
  voiceEnabled?: boolean;
  wakeWordActive?: boolean;
  onVoiceStart?: () => void;
  onVoiceEnd?: (transcript: string) => void;
  phantomMode?: boolean;
  // Phase 2: Document X-Ray
  onFileUpload?: (file: File) => Promise<unknown>;
  isUploading?: boolean;
  uploadedFile?: UploadedFileInfo | null;
  onClearUpload?: () => void;
  // SAMANTHA MODE: Hands-free continuous listening
  handsFreeMode?: boolean;
  onHandsFreeToggle?: (enabled: boolean) => void;
}

/**
 * Infinity Input with pure CSS animations
 * Zero blur/backdrop-filter in phantom mode
 * Uses will-change for GPU acceleration
 * Phase 2: Added paperclip for document uploads
 */
export const InfinityInputPhantom = memo(function InfinityInputPhantom({
  onSend,
  mood = 'neutral',
  disabled = false,
  voiceEnabled = false,
  wakeWordActive = false,
  onVoiceStart,
  onVoiceEnd,
  phantomMode = false,
  onFileUpload,
  isUploading = false,
  uploadedFile,
  onClearUpload,
  handsFreeMode = false,
  onHandsFreeToggle,
}: InfinityInputPhantomProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(handsFreeMode);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync hands-free mode from props
  useEffect(() => {
    setIsHandsFree(handsFreeMode);
  }, [handsFreeMode]);

  // Auto-start listening when wake word detected OR hands-free mode is on
  useEffect(() => {
    if ((wakeWordActive || isHandsFree) && voiceEnabled && !isListening) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordActive, voiceEnabled, isListening, isHandsFree]);

  const getMoodBorder = () => {
    if (phantomMode) return 'rgba(255, 255, 255, 0.2)';
    switch (mood) {
      case 'cyan': return 'rgba(0, 255, 255, 0.4)';
      case 'gold': return 'rgba(255, 215, 0, 0.4)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const handleSubmit = useCallback(() => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // File upload handler
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      await onFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileUpload]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Voice input - uses centralized micPermissionManager for cross-browser stability
  const startListening = useCallback(async () => {
    if (!isSpeechRecognitionSupported()) {
      console.log('[InfinityInputPhantom] Speech recognition not supported');
      toast.error('Voice input not supported in this browser');
      return;
    }

    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
    }

    // Request mic permission via centralized manager
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      toast.error('Microphone permission required');
      setIsListening(false);
      return;
    }

    const recognition = createSpeechRecognition({
      continuous: isHandsFree,
      interimResults: isHandsFree,
      lang: 'en-US',
    });

    if (!recognition) {
      toast.error('Could not start voice input');
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      console.log('[InfinityInputPhantom] 🎙️ Listening started (hands-free:', isHandsFree, ')');
      setIsListening(true);
      onVoiceStart?.();
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult?.[0]?.transcript || '';

      // In hands-free mode, only process final results
      if (isHandsFree) {
        if (lastResult?.isFinal && transcript.trim()) {
          console.log('[InfinityInputPhantom] 💬 Final transcript:', transcript);
          onVoiceEnd?.(transcript);
        }
      } else {
        // Single utterance mode
        setIsListening(false);
        if (transcript.trim()) onVoiceEnd?.(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[InfinityInputPhantom] Speech error:', event?.error);

      // In hands-free mode, auto-restart on certain errors
      const err = String(event?.error || 'unknown');
      const shouldRestart = isHandsFree && err !== 'aborted' && err !== 'not-allowed' && err !== 'service-not-allowed';

      if (shouldRestart) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isHandsFree) {
            console.log('[InfinityInputPhantom] 🔄 Auto-restarting hands-free listening');
            startListening();
          }
        }, 500);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log('[InfinityInputPhantom] Listening ended');
      // SAMANTHA MODE: Auto-restart in hands-free mode
      if (isHandsFree) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isHandsFree) {
            console.log('[InfinityInputPhantom] 🔄 Restarting hands-free listening');
            startListening();
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.log('[InfinityInputPhantom] start() failed:', e);
      setIsListening(false);
    }
  }, [onVoiceStart, onVoiceEnd, isHandsFree]);

  const stopListening = useCallback(() => {
    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
    }

    setIsListening(false);
  }, []);

  // Toggle hands-free mode
  const toggleHandsFree = useCallback(() => {
    const newState = !isHandsFree;
    console.log('[InfinityInputPhantom] 🎯 Hands-free mode:', newState ? 'ON' : 'OFF');
    setIsHandsFree(newState);
    onHandsFreeToggle?.(newState);
    
    if (newState) {
      // Start listening immediately
      startListening();
    } else {
      // Stop listening
      stopListening();
    }
  }, [isHandsFree, onHandsFreeToggle, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Phantom mode: Minimal styling, no blur
  const containerStyle: React.CSSProperties = phantomMode ? {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    willChange: 'transform',
  } : {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8) 40%)',
    zIndex: 30, // Above InfinityStream (z-20) to ensure input is interactive
  };

  const inputContainerStyle: React.CSSProperties = phantomMode ? {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${isListening ? 'rgba(0, 255, 255, 0.5)' : isFocused ? getMoodBorder() : 'rgba(255, 255, 255, 0.15)'}`,
    transition: 'border-color 0.2s ease',
    willChange: 'border-color',
  } : {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isListening ? 'rgba(0, 255, 255, 0.6)' : isFocused ? getMoodBorder() : 'rgba(255, 255, 255, 0.1)'}`,
    boxShadow: isListening 
      ? '0 0 30px rgba(0, 255, 255, 0.2)' 
      : '0 8px 32px rgba(0, 0, 0, 0.3)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div style={containerStyle}>
      <div className="max-w-2xl mx-auto">
        {/* Uploaded file indicator */}
        {uploadedFile && (
          <div 
            className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg animate-fade-in"
            style={{
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
            }}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="flex-1 text-sm text-cyan-300 truncate">
              {uploadedFile.name}
            </span>
            <span className="text-xs text-cyan-400/60">
              {formatFileSize(uploadedFile.size)}
            </span>
            <button
              onClick={onClearUpload}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        )}

        <div style={inputContainerStyle}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Paperclip / Upload Button */}
          {onFileUpload && (
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={disabled || isUploading}
              className="phantom-upload-btn"
              title="Upload document (PDF, image, text)"
              style={{
                padding: '8px',
                borderRadius: '50%',
                background: isUploading ? 'rgba(0, 255, 255, 0.2)' : uploadedFile ? 'rgba(0, 255, 255, 0.15)' : 'transparent',
                border: 'none',
                cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
                willChange: 'background',
              }}
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : (
                <Paperclip 
                  className="w-5 h-5" 
                  style={{ 
                    color: uploadedFile ? '#00FFFF' : 'rgba(255, 255, 255, 0.4)' 
                  }} 
                />
              )}
            </button>
          )}

          {/* Voice Button - SAMANTHA MODE: Long-press for hands-free toggle */}
          {voiceEnabled && (
            <button
              type="button"
              onClick={isHandsFree ? toggleHandsFree : (isListening ? stopListening : startListening)}
              onDoubleClick={toggleHandsFree}
              disabled={disabled}
              className="phantom-voice-btn"
              title={isHandsFree ? "Hands-free mode ON (double-tap to disable)" : "Tap to speak (double-tap for hands-free)"}
              style={{
                padding: '8px',
                borderRadius: '50%',
                background: isHandsFree 
                  ? 'rgba(255, 150, 200, 0.3)' // Pink glow for Samantha mode
                  : isListening 
                    ? 'rgba(0, 255, 255, 0.2)' 
                    : 'transparent',
                border: isHandsFree ? '2px solid rgba(255, 150, 200, 0.6)' : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                willChange: 'background, border',
                animation: isHandsFree && isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {isHandsFree ? (
                // Samantha mode icon - always listening
                <Mic style={{ width: 20, height: 20, color: '#FF96C8' }} />
              ) : isListening ? (
                <Mic style={{ width: 20, height: 20, color: '#00FFFF' }} />
              ) : (
                <MicOff style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.4)' }} />
              )}
            </button>
          )}

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isUploading 
                ? "Analyzing document..." 
                : uploadedFile 
                  ? `Ask about ${uploadedFile.name}...`
                  : isHandsFree
                    ? "💕 Samantha mode - just speak..."
                    : isListening 
                      ? "Listening..." 
                      : "Message Zoe…"
            }
            disabled={disabled || isListening || isUploading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FAFAFA',
              fontSize: '15px',
              letterSpacing: '0.3px',
            }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled || isUploading}
            className="phantom-send-btn"
            style={{
              padding: '8px',
              borderRadius: '50%',
              background: input.trim() && !disabled ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              cursor: input.trim() && !disabled ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !disabled ? 1 : 0.3,
              transition: 'background 0.15s ease, opacity 0.15s ease',
              willChange: 'background, opacity',
            }}
          >
            <Send style={{ width: 18, height: 18, color: '#FAFAFA' }} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default InfinityInputPhantom;
