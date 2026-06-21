/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - COMPOSE INTERFACE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Glass-morphic compose window with Zoe AI assistance.
 * Stream-of-consciousness typing with real-time suggestions.
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, Wand2, Mic, ChevronDown } from 'lucide-react';
import { ComposeDraft } from './types';

interface MailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (draft: ComposeDraft) => void;
  replyTo?: {
    email: string;
    subject: string;
    threadId?: string;
  };
  initialDraft?: Partial<ComposeDraft>;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', emoji: '👔' },
  { value: 'friendly', label: 'Friendly', emoji: '😊' },
  { value: 'casual', label: 'Casual', emoji: '✌️' },
  { value: 'formal', label: 'Formal', emoji: '📜' },
];

export const MailCompose = memo(function MailCompose({
  isOpen,
  onClose,
  onSend,
  replyTo,
  initialDraft,
}: MailComposeProps) {
  const [to, setTo] = useState(replyTo?.email || initialDraft?.to?.join(', ') || '');
  const [subject, setSubject] = useState(
    replyTo?.subject ? `Re: ${replyTo.subject}` : initialDraft?.subject || ''
  );
  const [body, setBody] = useState(initialDraft?.body || '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [isZoeThinking, setIsZoeThinking] = useState(false);
  const [zoeSuggestion, setZoeSuggestion] = useState<string | null>(null);
  
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize body textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${Math.max(200, bodyRef.current.scrollHeight)}px`;
    }
  }, [body]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTo(replyTo?.email || '');
      setSubject(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
      setBody('');
      setAttachments([]);
      setZoeSuggestion(null);
    }
  }, [isOpen, replyTo]);

  const handleSend = useCallback(() => {
    if (!to.trim() || !subject.trim()) return;
    
    const draft: ComposeDraft = {
      id: `draft-${Date.now()}`,
      to: to.split(',').map(e => e.trim()).filter(Boolean),
      subject,
      body,
      attachments,
      replyToId: replyTo?.threadId,
      threadId: replyTo?.threadId,
      createdAt: new Date(),
      updatedAt: new Date(),
      zoeAssisted: !!zoeSuggestion,
      zoeSuggestions: zoeSuggestion ? { body: zoeSuggestion } : undefined,
    };
    
    onSend(draft);
  }, [to, subject, body, attachments, replyTo, zoeSuggestion, onSend]);

  const handleZoeAssist = useCallback(async () => {
    if (!body.trim()) return;
    
    setIsZoeThinking(true);
    
    // Simulate Zoe thinking (will integrate with real AI in Part 2)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock suggestion based on tone
    const suggestions: Record<string, string> = {
      professional: `${body}\n\nBest regards,\n[Your Name]`,
      friendly: `${body}\n\nLooking forward to hearing from you! 😊`,
      casual: `${body}\n\nCatch you later! ✌️`,
      formal: `${body}\n\nYours faithfully,\n[Your Name]`,
    };
    
    setZoeSuggestion(suggestions[selectedTone] || body);
    setIsZoeThinking(false);
  }, [body, selectedTone]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl"
            style={{
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-medium">New Message</h3>
              <div className="flex items-center gap-2">
                {/* Tone selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowToneSelector(!showToneSelector)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg
                               text-xs text-white/60 bg-white/5 hover:bg-white/10
                               transition-colors"
                  >
                    {TONE_OPTIONS.find(t => t.value === selectedTone)?.emoji}
                    <span>{TONE_OPTIONS.find(t => t.value === selectedTone)?.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  <AnimatePresence>
                    {showToneSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-1 w-40 rounded-xl overflow-hidden
                                   bg-black/90 border border-white/10 z-10"
                      >
                        {TONE_OPTIONS.map(tone => (
                          <button
                            key={tone.value}
                            onClick={() => {
                              setSelectedTone(tone.value);
                              setShowToneSelector(false);
                            }}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                              transition-colors
                              ${selectedTone === tone.value 
                                ? 'bg-cyan-500/20 text-cyan-300' 
                                : 'text-white/60 hover:bg-white/5'
                              }
                            `}
                          >
                            <span>{tone.emoji}</span>
                            <span>{tone.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/80
                             hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* To field */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <label className="text-sm text-white/40 w-12">To:</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@email.com"
                  className="flex-1 bg-transparent text-white text-sm outline-none
                             placeholder-white/20"
                />
              </div>

              {/* Subject field */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <label className="text-sm text-white/40 w-12">Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="flex-1 bg-transparent text-white text-sm outline-none
                             placeholder-white/20"
                />
              </div>

              {/* Body */}
              <div className="p-4">
                <textarea
                  ref={bodyRef}
                  value={zoeSuggestion || body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setZoeSuggestion(null);
                  }}
                  placeholder="Compose your message... Zoe is here to help ✨"
                  className="w-full min-h-[200px] bg-transparent text-white/90 text-sm
                             outline-none resize-none placeholder-white/20"
                  style={{ lineHeight: '1.6' }}
                />
                
                {/* Zoe suggestion indicator */}
                {zoeSuggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-2 text-xs text-cyan-400"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Enhanced by Zoe • Click to edit</span>
                  </motion.div>
                )}
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                                   bg-white/5 border border-white/10"
                      >
                        <Paperclip className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60 max-w-[150px] truncate">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-white/40 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                {/* Attach file */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-white/40 hover:text-white/80
                             hover:bg-white/10 transition-colors"
                  title="Attach files"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Zoe AI assist */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleZoeAssist}
                  disabled={isZoeThinking || !body.trim()}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                    transition-all duration-200
                    ${isZoeThinking 
                      ? 'bg-cyan-500/20 text-cyan-300' 
                      : body.trim()
                        ? 'bg-white/5 text-white/60 hover:bg-cyan-500/20 hover:text-cyan-300'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }
                  `}
                  title="Let Zoe enhance your message"
                >
                  {isZoeThinking ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Wand2 className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span>{isZoeThinking ? 'Thinking...' : 'Zoe Assist'}</span>
                </motion.button>
              </div>

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                disabled={!to.trim() || !subject.trim()}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                  transition-all duration-200
                  ${to.trim() && subject.trim()
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default MailCompose;
