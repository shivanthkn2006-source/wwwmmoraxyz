import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff } from 'lucide-react';

interface GlassInputProps {
  onSubmit: (text: string) => void;
  isListening?: boolean;
  onMicToggle?: () => void;
  disabled?: boolean;
  transcript?: string;
}

export default function GlassInput({ 
  onSubmit, 
  isListening = false, 
  onMicToggle,
  disabled = false,
  transcript = ''
}: GlassInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Update input when transcript changes from voice
  useEffect(() => {
    if (transcript && isListening) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  // Auto-submit when voice input stops with transcript
  // Use ref to track if we've already submitted this transcript
  const lastSubmittedRef = useRef<string>('');
  
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      // Prevent double-submission of the same transcript
      if (lastSubmittedRef.current === transcript.trim()) {
        return;
      }
      
      // Small delay to let user see the transcript
      const timer = setTimeout(() => {
        lastSubmittedRef.current = transcript.trim();
        onSubmit(transcript.trim());
        setInput('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, onSubmit]);
  
  // Reset submitted ref when listening starts
  useEffect(() => {
    if (isListening) {
      lastSubmittedRef.current = '';
    }
  }, [isListening]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
      className="fixed bottom-0 left-0 right-0 z-[100] pb-8 pt-4 px-4"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
    >
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
        <div className="relative flex items-end gap-3 px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-2xl shadow-2xl shadow-cyan-500/10">
          {/* Mic Button with active indicator */}
          <motion.button
            type="button"
            onClick={onMicToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-2 rounded-full transition-colors flex-shrink-0 ${
              isListening 
                ? 'bg-cyan-500/30 text-cyan-400' 
                : 'bg-white/5 text-white/60 hover:text-white/80'
            }`}
          >
            {/* Green dot indicator when listening */}
            {isListening && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-gpu-ring-scale-pulse" />
            )}
            {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
          </motion.button>

          {/* Listening Indicator */}
          {isListening && (
            <div className="absolute left-16 bottom-4 flex items-center gap-1 animate-gpu-pulse-scale-slow">
              <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          {/* Input Field - Textarea for multi-line */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !disabled) {
                  onSubmit(input.trim());
                  setInput('');
                }
              }
            }}
            placeholder={isListening ? "Listening..." : "Speak to the Orb..."}
            disabled={disabled || isListening}
            rows={1}
            className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 font-mono text-sm focus:outline-none resize-none min-h-[24px] max-h-[120px] py-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={!input.trim() || disabled}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              input.trim() && !disabled
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black'
                : 'bg-white/5 text-white/30'
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Glow Effect - enhanced when listening */}
        <motion.div 
          animate={{ 
            opacity: isListening ? 0.8 : 0.5,
            scale: isListening ? 1.05 : 1
          }}
          className="absolute inset-0 -z-10 rounded-full bg-cyan-500/20 blur-xl" 
        />
      </form>
    </motion.div>
  );
}
