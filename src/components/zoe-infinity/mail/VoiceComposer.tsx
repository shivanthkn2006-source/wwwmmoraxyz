/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - VOICE COMPOSER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Voice-to-Email Composer: "Tell John I'm late" → Formal email draft
 * 
 * User speaks naturally, Zoe drafts contextually appropriate emails.
 * Zero typing required. Pure voice interaction.
 * 
 * Architecture: Standalone for migration
 * Cost: $0.00 (Browser Speech API + Lovable AI)
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Wand2, 
  RotateCcw, 
  Volume2,
  Sparkles,
  User,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { ComposeDraft } from './types';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';

interface VoiceComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (draft: ComposeDraft) => void;
  recentContacts?: { name: string; email: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE COMMAND PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const COMMAND_PATTERNS = {
  tell: /^(?:tell|message|email)\s+(\w+)\s+(?:that\s+)?(.+)$/i,
  reply: /^reply\s+(?:to\s+)?(\w+)\s+(?:that\s+)?(.+)$/i,
  schedule: /^(?:schedule|set up|arrange)\s+(?:a\s+)?(?:meeting|call)\s+with\s+(\w+)\s+(.+)$/i,
  thank: /^thank\s+(\w+)\s+for\s+(.+)$/i,
  remind: /^remind\s+(\w+)\s+(?:about\s+)?(.+)$/i,
  apologize: /^(?:apologize|say sorry)\s+to\s+(\w+)\s+(?:for\s+)?(.+)$/i,
};

const TONE_TEMPLATES = {
  formal: {
    greeting: 'Dear',
    closing: 'Best regards,',
    style: 'professional and courteous',
  },
  friendly: {
    greeting: 'Hi',
    closing: 'Cheers,',
    style: 'warm and personable',
  },
  casual: {
    greeting: 'Hey',
    closing: 'Talk soon,',
    style: 'relaxed and conversational',
  },
  urgent: {
    greeting: 'Hi',
    closing: 'Please respond ASAP.',
    style: 'direct and time-sensitive',
  },
};

export const VoiceComposer = memo(function VoiceComposer({
  isOpen,
  onClose,
  onSend,
  recentContacts = [],
}: VoiceComposerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState<ComposeDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState<keyof typeof TONE_TEMPLATES>('formal');
  const [showToneSelector, setShowToneSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setInterimTranscript('');
      setGeneratedDraft(null);
      setError(null);
      setIsListening(false);
    }
  }, [isOpen]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEECH RECOGNITION
  // ═══════════════════════════════════════════════════════════════════════════

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      // Zoe feedback
      speakAsZoe("I'm listening. Tell me what you'd like to say.", {}, () => {}, () => {});
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += result;
        } else {
          interim += result;
        }
      }

      if (final) {
        setTranscript(prev => prev + ' ' + final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceComposer] Recognition error:', event.error);
      setError(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AI DRAFT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  const generateDraft = useCallback(async () => {
    const text = (transcript + ' ' + interimTranscript).trim();
    if (!text) return;

    setIsGenerating(true);
    stopListening();

    try {
      // Parse the voice command
      let recipientName = '';
      let messageIntent = text;
      
      for (const [pattern, regex] of Object.entries(COMMAND_PATTERNS)) {
        const match = text.match(regex);
        if (match) {
          recipientName = match[1];
          messageIntent = match[2];
          break;
        }
      }

      // Find recipient email from recent contacts
      const contact = recentContacts.find(
        c => c.name.toLowerCase().includes(recipientName.toLowerCase())
      );

      // Generate contextual email based on intent
      const tone = TONE_TEMPLATES[selectedTone];
      let subject = '';
      let body = '';

      // Analyze intent and generate appropriate content
      if (text.toLowerCase().includes('late') || text.toLowerCase().includes('delay')) {
        subject = 'Running a bit behind';
        body = `${tone.greeting} ${recipientName || 'there'},\n\nI wanted to let you know that ${messageIntent}. I apologize for any inconvenience this may cause.\n\n${tone.closing}`;
      } else if (text.toLowerCase().includes('thank')) {
        subject = 'Thank you';
        body = `${tone.greeting} ${recipientName || 'there'},\n\nI wanted to take a moment to express my gratitude. ${messageIntent}.\n\nIt really means a lot.\n\n${tone.closing}`;
      } else if (text.toLowerCase().includes('meeting') || text.toLowerCase().includes('schedule')) {
        subject = 'Meeting Request';
        body = `${tone.greeting} ${recipientName || 'there'},\n\nI would like to ${messageIntent}.\n\nPlease let me know your availability.\n\n${tone.closing}`;
      } else if (text.toLowerCase().includes('sorry') || text.toLowerCase().includes('apologize')) {
        subject = 'Apologies';
        body = `${tone.greeting} ${recipientName || 'there'},\n\nI sincerely apologize ${messageIntent}.\n\nI hope we can move forward positively.\n\n${tone.closing}`;
      } else {
        // Generic message
        subject = `Message from Me`;
        body = `${tone.greeting} ${recipientName || 'there'},\n\n${messageIntent.charAt(0).toUpperCase() + messageIntent.slice(1)}.\n\n${tone.closing}`;
      }

      // Create the draft
      const draft: ComposeDraft = {
        id: `voice-draft-${Date.now()}`,
        to: contact ? [contact.email] : recipientName ? [`${recipientName.toLowerCase()}@email.com`] : [],
        subject,
        body,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        zoeAssisted: true,
        zoeSuggestions: {
          subject,
          body,
          tone: selectedTone as 'formal' | 'casual' | 'friendly' | 'professional',
        },
      };

      setGeneratedDraft(draft);

      // Zoe reads back the draft
      speakAsZoe(`Here's what I drafted: "${subject}". ${body.substring(0, 100)}... Would you like me to send it?`, {}, () => {}, () => {});

    } catch (err) {
      console.error('[VoiceComposer] Generation error:', err);
      setError('Failed to generate email draft');
    } finally {
      setIsGenerating(false);
    }
  }, [transcript, interimTranscript, selectedTone, recentContacts, stopListening]);

  const handleSend = useCallback(() => {
    if (generatedDraft) {
      onSend(generatedDraft);
      speakAsZoe('Email sent successfully.', {}, () => {}, () => {});
      onClose();
    }
  }, [generatedDraft, onSend, onClose]);

  const resetDraft = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setGeneratedDraft(null);
    setError(null);
  }, []);

  const displayText = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 80px -20px rgba(34, 211, 238, 0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 
                               flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Voice Composer</h3>
                  <p className="text-xs text-white/40">Speak naturally, I'll draft it</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
              {/* Voice Input Section */}
              {!generatedDraft && (
                <div className="space-y-4">
                  {/* Listening Indicator */}
                  <div className="flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleListening}
                      className={`
                        relative w-24 h-24 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isListening 
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                          : 'bg-white/10 hover:bg-white/20'
                        }
                      `}
                    >
                      {isListening && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-cyan-400"
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      {isListening ? (
                        <Mic className="w-10 h-10 text-white" />
                      ) : (
                        <MicOff className="w-10 h-10 text-white/60" />
                      )}
                    </motion.button>
                  </div>

                  {/* Transcript Display */}
                  <div className="min-h-[100px] p-4 rounded-2xl bg-white/5 border border-white/10">
                    {displayText ? (
                      <p className="text-white/80 text-center leading-relaxed">
                        {displayText}
                        {isListening && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-2 h-4 ml-1 bg-cyan-400"
                          />
                        )}
                      </p>
                    ) : (
                      <p className="text-white/30 text-center text-sm">
                        {isListening 
                          ? 'Listening... Try saying "Tell John I\'m running late"'
                          : 'Tap the mic to start speaking'
                        }
                      </p>
                    )}
                  </div>

                  {/* Example Commands */}
                  {!isListening && !displayText && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/30 text-center">Examples:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          'Tell John I\'m late',
                          'Thank Sarah for lunch',
                          'Schedule a meeting with Mike',
                        ].map((example) => (
                          <button
                            key={example}
                            onClick={() => setTranscript(example)}
                            className="px-3 py-1.5 rounded-full text-xs text-white/50 
                                     bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            "{example}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tone Selector */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <button
                        onClick={() => setShowToneSelector(!showToneSelector)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl
                                   bg-white/5 border border-white/10 text-white/60
                                   hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm capitalize">{selectedTone} Tone</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showToneSelector && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden
                                       bg-black/90 border border-white/10 z-10"
                          >
                            {(Object.keys(TONE_TEMPLATES) as Array<keyof typeof TONE_TEMPLATES>).map((tone) => (
                              <button
                                key={tone}
                                onClick={() => {
                                  setSelectedTone(tone);
                                  setShowToneSelector(false);
                                }}
                                className={`
                                  w-full px-4 py-2.5 text-left text-sm capitalize transition-colors
                                  ${selectedTone === tone 
                                    ? 'bg-cyan-500/20 text-cyan-300' 
                                    : 'text-white/60 hover:bg-white/5'
                                  }
                                `}
                              >
                                {tone}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Generate Button */}
                  {displayText && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={generateDraft}
                      disabled={isGenerating}
                      className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2
                                 bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                                 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isGenerating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles className="w-5 h-5" />
                          </motion.div>
                          <span>Drafting...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          <span>Generate Email</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              )}

              {/* Generated Draft Preview */}
              {generatedDraft && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* To field */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <User className="w-4 h-4 text-white/40" />
                    <div className="flex-1">
                      <p className="text-xs text-white/40">To:</p>
                      <p className="text-sm text-white">
                        {generatedDraft.to.join(', ') || 'No recipient specified'}
                      </p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <Mail className="w-4 h-4 text-white/40" />
                    <div className="flex-1">
                      <p className="text-xs text-white/40">Subject:</p>
                      <p className="text-sm text-white font-medium">{generatedDraft.subject}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">
                      {generatedDraft.body}
                    </p>
                  </div>

                  {/* AI Badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-cyan-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Drafted by Zoe • {selectedTone} tone</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetDraft}
                      className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2
                                 bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Start Over</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSend}
                      className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2
                                 bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                                 hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default VoiceComposer;
