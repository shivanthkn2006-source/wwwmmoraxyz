// ═══════════════════════════════════════════════════════════════════════════════
// INFINITY INPUT PHANTOM - Battery-optimized input bar
// Redesigned: + menu (mic/paperclip), emoji picker, pill-shaped bar
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, X, FileText, Loader2, Plus, Smile, Microscope } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSpeechRecognition,
  requestMicPermission,
  isSpeechRecognitionSupported,
} from '@/utils/micPermissionManager';
import { EmojiPicker } from './EmojiPicker';
import { findHandsFreePhrase, HANDS_FREE_STOP_PHRASES } from '@/features/zoe-handsfree/phrases';
import { zoeDebugLog } from '@/features/zoe-handsfree/debugBus';
import {
  isDeepResearchEnabled,
  setDeepResearchEnabled,
  subscribeDeepResearch,
} from '@/stores/zoeInfinityDeepResearchToggle';

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
  onVoiceStop?: () => void;
  onListeningChange?: (listening: boolean) => void;
  onInputChange?: (value: string) => void;
  phantomMode?: boolean;
  onFileUpload?: (file: File) => Promise<unknown>;
  isUploading?: boolean;
  uploadedFile?: UploadedFileInfo | null;
  onClearUpload?: () => void;
  handsFreeMode?: boolean;
  onHandsFreeToggle?: (enabled: boolean) => void;
}

export const InfinityInputPhantom = memo(function InfinityInputPhantom({
  onSend,
  mood = 'neutral',
  disabled = false,
  voiceEnabled = false,
  wakeWordActive = false,
  onVoiceStart,
  onVoiceEnd,
  onVoiceStop,
  onListeningChange,
  onInputChange,
  phantomMode = false,
  onFileUpload,
  isUploading = false,
  uploadedFile,
  onClearUpload,
  handsFreeMode = false,
  onHandsFreeToggle,
}: InfinityInputPhantomProps) {
  const [input, setInput] = useState('');
  const [pendingCustomEmoji, setPendingCustomEmoji] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(handsFreeMode);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deepResearch, setDeepResearch] = useState(isDeepResearchEnabled());
  useEffect(() => subscribeDeepResearch(setDeepResearch), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handsFreeSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handsFreeRef = useRef(handsFreeMode);
  const recognitionSessionRef = useRef(0);
  const manualStopSessionRef = useRef<number | null>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  // Sync hands-free mode from props
  useEffect(() => {
    setIsHandsFree(handsFreeMode);
    handsFreeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  // Auto-start listening when wake word detected OR hands-free mode is on
  useEffect(() => {
    if ((wakeWordActive || isHandsFree) && voiceEnabled && !isListening) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordActive, voiceEnabled, isListening, isHandsFree]);

  // Close plus menu on outside click
  useEffect(() => {
    if (!showPlusMenu) return;
    const handler = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPlusMenu]);

  const getMoodBorder = () => {
    if (phantomMode) return 'rgba(255, 255, 255, 0.2)';
    switch (mood) {
      case 'cyan': return 'rgba(0, 255, 255, 0.4)';
      case 'gold': return 'rgba(255, 215, 0, 0.4)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const handleSubmit = useCallback(() => {
    const trimmedInput = input.trim();
    const message = [trimmedInput, pendingCustomEmoji].filter(Boolean).join(' ').trim();

    if (message && !disabled) {
      onSend(message);
      setInput('');
      setPendingCustomEmoji(null);
    }
  }, [input, pendingCustomEmoji, disabled, onSend]);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowPlusMenu(false);
  }, [onFileUpload]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (emoji.startsWith('data:image/')) {
      setPendingCustomEmoji(emoji);
      setShowEmojiPicker(false);
      return;
    }

    setInput(prev => {
      const next = prev + emoji;
      onInputChange?.(next);
      return next;
    });
    // Keep emoji picker open for multi-select
  }, [onInputChange]);

  const hasSendableContent = input.trim().length > 0 || !!pendingCustomEmoji;

  // Voice input
  const startListening = useCallback(async (forceHandsFree?: boolean) => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    const activeHandsFree = forceHandsFree ?? handsFreeRef.current;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (handsFreeSilenceTimeoutRef.current) {
      clearTimeout(handsFreeSilenceTimeoutRef.current);
      handsFreeSilenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
      recognitionRef.current = null;
    }

    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      setIsListening(false);
      toast.error('Microphone permission required');
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setIsListening(false);
      toast.error('Could not start voice input');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    const sessionId = recognitionSessionRef.current + 1;
    recognitionSessionRef.current = sessionId;
    manualStopSessionRef.current = null;

    recognition.continuous = !!activeHandsFree;
    recognition.interimResults = !!activeHandsFree;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let latestTranscript = '';

    const disableHandsFreeAndStop = (reason: string) => {
      zoeDebugLog('voice', reason);
      handsFreeRef.current = false;
      setIsHandsFree(false);
      onHandsFreeToggle?.(false);
      window.dispatchEvent(new CustomEvent('zoe-handsfree-stop-requested', { detail: { reason } }));
      if (handsFreeSilenceTimeoutRef.current) {
        clearTimeout(handsFreeSilenceTimeoutRef.current);
        handsFreeSilenceTimeoutRef.current = null;
      }
      try { recognition.stop(); } catch { /* noop */ }
    };

    const armHandsFreeSilenceTimeout = () => {
      if (!handsFreeRef.current) return;
      if (handsFreeSilenceTimeoutRef.current) clearTimeout(handsFreeSilenceTimeoutRef.current);
      handsFreeSilenceTimeoutRef.current = setTimeout(() => {
        if (sessionId !== recognitionSessionRef.current || !handsFreeRef.current) return;
        disableHandsFreeAndStop('hands-free silence timeout → stopping mic');
      }, latestTranscript.trim() ? 6500 : 8500);
    };

    recognition.onstart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      setIsListening(true);
      onVoiceStart?.();
      window.dispatchEvent(new CustomEvent('zoe-voice-system-activated'));
      if (activeHandsFree) armHandsFreeSilenceTimeout();
    };

    recognition.onresult = (event: any) => {
      if (sessionId !== recognitionSessionRef.current) return;
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) {
          finalTranscript += `${result[0]?.transcript || ''} `;
        } else {
          interimTranscript += `${result[0]?.transcript || ''} `;
        }
      }
      latestTranscript = `${finalTranscript} ${interimTranscript}`.trim();

      if (activeHandsFree) {
        const stopPhrase = findHandsFreePhrase(latestTranscript, HANDS_FREE_STOP_PHRASES);
        if (stopPhrase) {
          finalTranscript = '';
          latestTranscript = '';
          disableHandsFreeAndStop(`hands-free stop phrase (${stopPhrase}) → stopping mic`);
          return;
        }
        armHandsFreeSilenceTimeout();
      }
    };

    recognition.onerror = (event: any) => {
      if (sessionId !== recognitionSessionRef.current) return;
      const err = String(event?.error || 'unknown');
      const shouldRestart = handsFreeRef.current && err !== 'aborted' && err !== 'not-allowed' && err !== 'service-not-allowed';
      zoeDebugLog('error', `voice input error: ${err}`);
      if (shouldRestart) {
        restartTimeoutRef.current = setTimeout(() => {
          if (handsFreeRef.current) startListening(true);
        }, 450);
      } else {
        setIsListening(false);
        onVoiceStop?.();
      }
    };

    recognition.onend = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      if (manualStopSessionRef.current === sessionId) {
        manualStopSessionRef.current = null;
        setIsListening(false);
        onVoiceStop?.();
        return;
      }
      const cleaned = finalTranscript.trim();
      if (handsFreeSilenceTimeoutRef.current) {
        clearTimeout(handsFreeSilenceTimeoutRef.current);
        handsFreeSilenceTimeoutRef.current = null;
      }
      if (cleaned) onVoiceEnd?.(cleaned);
      if (handsFreeRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (handsFreeRef.current) startListening(true);
        }, 300);
      } else {
        setIsListening(false);
        onVoiceStop?.();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      onVoiceStop?.();
      toast.error('Could not start voice input');
    }
  }, [onVoiceStart, onVoiceEnd, onVoiceStop, onHandsFreeToggle]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (handsFreeSilenceTimeoutRef.current) {
      clearTimeout(handsFreeSilenceTimeoutRef.current);
      handsFreeSilenceTimeoutRef.current = null;
    }
    manualStopSessionRef.current = recognitionSessionRef.current;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
    onVoiceStop?.();
  }, [onVoiceStop]);

  useEffect(() => {
    if (!handsFreeMode && isListening && handsFreeRef.current === false) {
      stopListening();
    }
  }, [handsFreeMode, isListening, stopListening]);

  const toggleHandsFree = useCallback(() => {
    const newState = !isHandsFree;
    setIsHandsFree(newState);
    handsFreeRef.current = newState;
    onHandsFreeToggle?.(newState);
    if (newState) {
      startListening(true);
    } else {
      stopListening();
    }
  }, [isHandsFree, onHandsFreeToggle, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (handsFreeSilenceTimeoutRef.current) clearTimeout(handsFreeSilenceTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // Container positioning
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '0 8px',
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    zIndex: 40,
    willChange: 'transform',
  };

  // Pill-shaped glassmorphism bar matching screenshot proportions
  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(24px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
    border: `1px solid ${isListening ? 'rgba(0, 255, 255, 0.5)' : isFocused ? getMoodBorder() : 'rgba(255, 255, 255, 0.12)'}`,
    boxShadow: isListening
      ? '0 0 30px rgba(0, 255, 255, 0.15), inset 0 0 20px rgba(0,255,255,0.03)'
      : '0 4px 24px rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(255,255,255,0.02)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    minHeight: '44px',
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <div className="mx-auto w-full" style={{ maxWidth: 'min(760px, calc(100vw - 16px))' }}>
        {/* Uploaded file indicator */}
        {uploadedFile && (
          <div
            className="flex items-center gap-2 mb-1 px-3 py-1.5 rounded-lg animate-fade-in"
            style={{
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
            }}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="flex-1 text-xs text-cyan-300 truncate">{uploadedFile.name}</span>
            <span className="text-[10px] text-cyan-400/60">{formatFileSize(uploadedFile.size)}</span>
            <button onClick={onClearUpload} className="p-0.5 hover:bg-white/10 rounded transition-colors">
              <X className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        )}

        {/* Listening indicator bar */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 mb-1 py-1 animate-fade-in">
            <span className="w-1 h-3 rounded-full animate-pulse" style={{ background: '#00FFFF', animationDelay: '0ms' }} />
            <span className="w-1 h-4 rounded-full animate-pulse" style={{ background: '#00FFFF', animationDelay: '150ms' }} />
            <span className="w-1 h-2 rounded-full animate-pulse" style={{ background: '#00FFFF', animationDelay: '300ms' }} />
            <span className="text-[10px] text-cyan-400/70 ml-1.5">
              {isHandsFree ? '💕 Hands-free' : 'Listening...'}
            </span>
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

          {/* + Button — opens menu with mic & paperclip */}
          <div ref={plusMenuRef} className="relative flex-shrink-0" style={{ alignSelf: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setShowPlusMenu(prev => !prev);
                setShowEmojiPicker(false);
              }}
              className="flex items-center justify-center transition-all duration-200"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: showPlusMenu ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                cursor: 'pointer',
                transform: showPlusMenu ? 'rotate(45deg)' : 'rotate(0deg)',
              }}
            >
              <Plus
                className="transition-colors"
                style={{
                  width: 16, height: 16,
                  color: showPlusMenu ? '#00FFFF' : 'rgba(255, 255, 255, 0.6)',
                }}
              />
            </button>

            {/* Plus menu popover */}
            {showPlusMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-150"
                style={{
                  background: 'rgba(20, 20, 25, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: '140px',
                }}
              >
                {/* Paperclip / Attach */}
                {onFileUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerFileInput();
                      setShowPlusMenu(false);
                    }}
                    disabled={disabled || isUploading}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" style={{ color: uploadedFile ? '#00FFFF' : 'rgba(255,255,255,0.6)' }} />
                    )}
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {isUploading ? 'Uploading...' : 'Attach File'}
                    </span>
                  </button>
                )}

                {/* Mic */}
                {voiceEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening(isHandsFree);
                      }
                      setShowPlusMenu(false);
                    }}
                    onDoubleClick={() => {
                      toggleHandsFree();
                      setShowPlusMenu(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <Mic
                      className="w-4 h-4"
                      style={{
                        color: isHandsFree ? '#FF96C8' : isListening ? '#00FFFF' : 'rgba(255,255,255,0.6)',
                      }}
                    />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {isListening ? 'Stop Mic' : isHandsFree ? 'Hands-free ON' : 'Voice Input'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Text Input — fills remaining space */}
          <textarea
            ref={textareaRef}
            autoFocus
            value={input}
            onChange={(e) => {
              const nextValue = e.target.value;
              setInput(nextValue);
              onInputChange?.(nextValue);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isUploading
                ? "Analyzing document..."
                : uploadedFile
                  ? `Ask about ${uploadedFile.name}...`
                  : pendingCustomEmoji
                    ? 'Custom emoji ready…'
                  : isHandsFree
                    ? "💕 Hands-free mode..."
                    : isListening
                      ? "Listening..."
                      : "Talk to Zoe…"
            }
            disabled={isUploading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FAFAFA',
              fontSize: '14px',
              letterSpacing: '0.2px',
              resize: 'none',
              minHeight: '18px',
              maxHeight: '96px',
              lineHeight: '1.25',
              padding: '5px 0',
              alignSelf: 'center',
            }}
          />

          {/* Deep Research toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !deepResearch;
              setDeepResearchEnabled(next);
              toast(next ? '🔬 Deep Research ON' : 'Deep Research off', { duration: 1500 });
            }}
            title={deepResearch ? 'Deep Research ON (Gemini 2.5 Pro)' : 'Enable Deep Research'}
            className="flex-shrink-0 flex items-center justify-center transition-colors"
            style={{
              alignSelf: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: deepResearch ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
              border: deepResearch ? '1px solid rgba(16, 185, 129, 0.6)' : 'none',
              cursor: 'pointer',
            }}
          >
            <Microscope
              style={{
                width: 16, height: 16,
                color: deepResearch ? '#10b981' : 'rgba(255,255,255,0.5)',
              }}
            />
          </button>

          {/* Emoji button */}
          <div className="relative flex-shrink-0" style={{ alignSelf: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(prev => !prev);
                setShowPlusMenu(false);
              }}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: showEmojiPicker ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Smile
                style={{
                  width: 18, height: 18,
                  color: showEmojiPicker ? '#00FFFF' : 'rgba(255, 255, 255, 0.5)',
                }}
              />
            </button>

            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onSelect={handleEmojiSelect}
            />
          </div>

          {/* Send Button — compact circle */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSendableContent || disabled || isUploading}
            className="flex-shrink-0 flex items-center justify-center transition-all duration-150"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: hasSendableContent && !disabled
                ? 'rgba(0, 255, 255, 0.9)'
                : 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              cursor: hasSendableContent && !disabled ? 'pointer' : 'not-allowed',
              alignSelf: 'center',
            }}
          >
            <Send
              style={{
                width: 13, height: 13,
                color: hasSendableContent && !disabled ? '#000' : 'rgba(255,255,255,0.3)',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
});

export default InfinityInputPhantom;
