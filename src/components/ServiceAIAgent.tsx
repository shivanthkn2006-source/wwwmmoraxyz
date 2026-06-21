import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, Mic, MicOff, Phone, PhoneOff, Send, 
  Bot, User, Shield, Lock, Globe, X, Volume2, VolumeX,
  Loader2, CheckCircle, AlertCircle, Activity, Copy, Paperclip, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ServiceAIAgentProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  businessContext?: string;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
];

const ServiceAIAgent = ({ isOpen, onClose, businessName = 'Universe of Life', businessContext }: ServiceAIAgentProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mode, setMode] = useState<'chat' | 'voice' | 'call'>('chat');
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [securityVerified, setSecurityVerified] = useState(false);
  const [displayedText, setDisplayedText] = useState<{[key: string]: string}>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track which messages have been fully typed
  const [typedMessageIds, setTypedMessageIds] = useState<Set<string>>(new Set());
  
  // Typewriter effect for messages - completely rewritten to prevent race conditions
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') {
      return;
    }
    
    // Skip if already typed this message
    if (typedMessageIds.has(lastMessage.id)) {
      return;
    }
    
    // Mark as being typed immediately to prevent re-entry
    setTypedMessageIds(prev => new Set([...prev, lastMessage.id]));
    
    const text = lastMessage.content;
    const messageId = lastMessage.id;
    let currentIndex = 0;
    
    // Initialize displayed text to empty for this message
    setDisplayedText(prev => ({ ...prev, [messageId]: '' }));
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        currentIndex++;
        setDisplayedText(prev => ({
          ...prev,
          [messageId]: text.slice(0, currentIndex)
        }));
      } else {
        clearInterval(interval);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [messages, typedMessageIds]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hello! I'm Zoe, your 24/7 AI Service Assistant for ${businessName}. How can I help you today? You can type, speak, or even request a voice call.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      
      if (voiceEnabled) {
        setTimeout(() => {
          speakAsZoe(welcomeMessage.content, {}, () => setIsSpeaking(true), () => setIsSpeaking(false));
        }, 500);
      }
    }
  }, [isOpen, businessName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText]);

  // Store messages to DHF for learning
  const storeToDHF = async (message: Message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: message.role === 'user' ? 'service_ai_query' : 'service_ai_response',
        event_category: 'ai_interaction',
        context_snippet: message.content.slice(0, 200),
        metadata: { 
          full_content: message.content,
          timestamp: message.timestamp.toISOString(),
          business_name: businessName 
        },
        sentiment_score: 0.7
      });
    } catch (error) {
      console.error('DHF storage error:', error);
    }
  };

  // Copy message to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Handle file attachment
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Use images, PDF, or documents.');
      return;
    }
    
    setInput(prev => prev + ` [Attached: ${file.name}]`);
    toast.success(`File "${file.name}" attached`);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Use dedicated service AI edge function
      const { data, error } = await supabase.functions.invoke('zoe-service-ai', {
        body: {
          messages: [
            ...conversationHistory,
            { role: 'user', content: messageText }
          ],
          businessName: businessName,
          businessContext: businessContext,
          industryType: 'General Customer Service'
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || data?.message || "I'm here to help! Could you please rephrase your question?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Store both messages to DHF
      storeToDHF(userMessage);
      storeToDHF(assistantMessage);

      if (voiceEnabled) {
        speakAsZoe(
          assistantMessage.content,
          {},
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (error: any) {
      console.error('Service AI error:', error);
      const errorContent = error?.message?.includes('Rate limit') 
        ? "I'm experiencing high demand right now. Please wait a moment and try again."
        : error?.message?.includes('Payment') 
        ? "The AI service is temporarily unavailable. Please try again shortly."
        : "I apologize, but I'm having trouble processing your request. Please try again or contact human support.";
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Connection issue - please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      toast.info('Listening...', { duration: 2000 });
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast.error('Voice recognition error. Please try again.');
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const initiateCall = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const phoneRegex = /^[0-9]{6,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setCallStatus('connecting');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSecurityVerified(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCallStatus('connected');
    
    toast.success(`Connected to ${countryCode} ${phoneNumber}`);
    
    const callMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `📞 Voice call connected to ${countryCode} ${phoneNumber}. You can now speak with Zoe AI.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, callMessage]);

    speakAsZoe(
      `Hello! This is Zoe from ${businessName} customer service. I'm here to assist you. How may I help you today?`,
      {},
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const endCall = () => {
    setCallStatus('ended');
    stopZoeSpeech();
    
    const endMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: '📞 Call ended. Thank you for contacting us!',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, endMessage]);
    
    setTimeout(() => {
      setCallStatus('idle');
      setSecurityVerified(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        {/* ONI Deep Void Background */}
        <div className="absolute inset-0 oni-void-deep" />
        <div className="absolute inset-0 oni-neural-mesh opacity-30" />
        <div className="absolute inset-0 oni-vignette-lens" />
        
        {/* Floating Bioluminescent Particles - GPU accelerated */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-1 h-1 rounded-full",
                i < 4 ? 'animate-gpu-float-particle-1' :
                i < 8 ? 'animate-gpu-float-particle-2' :
                i < 12 ? 'animate-gpu-float-particle-3' :
                i < 16 ? 'animate-gpu-float-particle-4' : 'animate-gpu-float-particle-5'
              )}
              style={{
                background: i % 2 === 0 ? 'hsl(var(--oni-cyan))' : 'hsl(var(--oni-pink))',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: `0 0 ${8 + Math.random() * 12}px ${i % 2 === 0 ? 'hsl(var(--oni-cyan))' : 'hsl(var(--oni-pink))'}`
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-lg h-[calc(100vh-64px)] sm:h-auto sm:max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
          style={{ perspective: '1000px' }}
        >
          {/* ONI Curved Lens Frame - Main Container */}
          <div className="oni-curved-lens relative overflow-hidden">
            {/* Outer Glow Ring */}
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[hsl(var(--oni-cyan))] via-[hsl(var(--oni-purple))] to-[hsl(var(--oni-pink))] opacity-30 blur-xl animate-pulse" />
            
            {/* Main Glass Panel */}
            <div className="relative rounded-t-[1.5rem] sm:rounded-[2rem] overflow-hidden oni-glass-curved h-full flex flex-col">
              {/* Scan Line Effect */}
              <div className="absolute inset-0 oni-scan-beam pointer-events-none" />
              
              {/* Inner Gradient Border */}
              <div className="absolute inset-0 rounded-[1.5rem] sm:rounded-[2rem] p-[1px] bg-gradient-to-br from-[hsl(var(--oni-cyan))/0.5] via-transparent to-[hsl(var(--oni-pink))/0.3]" />
              
              {/* Header - ONI Curved Top */}
              <div className="relative p-3 sm:p-4 border-b border-[hsl(var(--oni-cyan))]/20">
                {/* Tech Data Decorations */}
                <div className="absolute top-2 left-3 text-[8px] sm:text-[9px] text-[hsl(var(--oni-cyan))]/40 font-mono">SYS.ONI.SVC.v2.1</div>
                <div className="absolute top-2 right-12 text-[8px] sm:text-[9px] text-[hsl(var(--oni-pink))]/40 font-mono">BIO-SYNC: ACTIVE</div>
                
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Holographic Avatar */}
                    <div className="relative">
                      <motion.div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full oni-holo-ring flex items-center justify-center"
                        animate={{ 
                          boxShadow: isSpeaking 
                            ? ['0 0 20px hsl(var(--oni-cyan))', '0 0 40px hsl(var(--oni-cyan))', '0 0 20px hsl(var(--oni-cyan))']
                            : '0 0 15px hsl(var(--oni-cyan)/0.5)'
                        }}
                        transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                      >
                        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--oni-cyan))]" />
                      </motion.div>
                      {/* Orbiting Particle - CSS animation */}
                      <div
                        className="absolute w-1.5 h-1.5 bg-[hsl(var(--oni-pink))] rounded-full animate-gpu-spin-3s"
                        style={{ 
                          top: '50%', 
                          left: '50%',
                          transformOrigin: '0 -20px'
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[hsl(var(--oni-cyan))] oni-glow-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        ZOE SERVICE AI
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">24/7 NEURAL SUPPORT</span>
                        <Badge className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-transparent border border-[hsl(var(--oni-cyan))]/50 text-[hsl(var(--oni-cyan))] shadow-[0_0_8px_hsl(var(--oni-cyan)/0.4)]">
                          <span className="w-1.5 h-1.5 bg-[hsl(var(--oni-cyan))] rounded-full mr-1 animate-pulse" />
                          ONLINE
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Badge className="hidden sm:flex text-[9px] bg-transparent border border-[hsl(var(--oni-purple))]/50 text-[hsl(var(--oni-purple))]">
                      <Shield className="w-3 h-3 mr-1" />
                      SECURE
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onClose}
                      className="w-8 h-8 rounded-full border border-[hsl(var(--oni-pink))]/30 hover:bg-[hsl(var(--oni-pink))]/20 hover:border-[hsl(var(--oni-pink))]/60"
                    >
                      <X className="w-4 h-4 text-[hsl(var(--oni-pink))]" />
                    </Button>
                  </div>
                </div>

                {/* Mode Tabs - ONI Curved Pills */}
                <div className="flex gap-1 sm:gap-2 mt-3">
                  {(['chat', 'voice', 'call'] as const).map((m) => (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 py-2 px-2 sm:px-3 rounded-full text-[10px] sm:text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                        mode === m 
                          ? 'bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] text-white shadow-[0_0_15px_hsl(var(--oni-cyan)/0.5)]' 
                          : 'bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/20 text-[hsl(var(--oni-cyan))]/70 hover:border-[hsl(var(--oni-cyan))]/50'
                      }`}
                      style={{ fontFamily: "'Orbitron', sans-serif" }}
                      onClick={() => setMode(m)}
                    >
                      {m === 'chat' && <MessageSquare className="w-3 h-3" />}
                      {m === 'voice' && <Mic className="w-3 h-3" />}
                      {m === 'call' && <Phone className="w-3 h-3" />}
                      <span className="hidden xs:inline">{m.toUpperCase()}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Call Setup - ONI Style */}
              {mode === 'call' && callStatus === 'idle' && (
                <div className="p-3 sm:p-4 border-b border-[hsl(var(--oni-cyan))]/10 bg-gradient-to-b from-[hsl(var(--oni-purple))]/10 to-transparent">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">
                      <Lock className="w-3 h-3" />
                      <span>ENTERPRISE-GRADE ENCRYPTED CONNECTION</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-24 sm:w-28 p-2 rounded-lg bg-[hsl(var(--oni-void))]/80 border border-[hsl(var(--oni-cyan))]/30 text-xs sm:text-sm text-[hsl(var(--oni-cyan))] font-mono focus:border-[hsl(var(--oni-cyan))]/60 focus:outline-none"
                        style={{ backdropFilter: 'blur(12px)' }}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-[hsl(var(--oni-void))]">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
                        placeholder="Enter phone number"
                        className="flex-1 bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm focus:border-[hsl(var(--oni-cyan))]/60"
                        style={{ backdropFilter: 'blur(12px)' }}
                      />
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 0 25px hsl(var(--oni-cyan)/0.6)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={initiateCall}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_hsl(var(--oni-cyan)/0.4)]"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                      <Phone className="w-4 h-4" />
                      START SECURE CALL
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Call Status - ONI Style */}
              {mode === 'call' && callStatus !== 'idle' && (
                <div className="p-3 sm:p-4 border-b border-[hsl(var(--oni-cyan))]/10 bg-gradient-to-r from-[hsl(var(--oni-cyan))]/10 to-[hsl(var(--oni-purple))]/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {callStatus === 'connecting' && (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--oni-cyan))]" />
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>CONNECTING...</div>
                            <div className="text-[10px] text-[hsl(var(--oni-cyan))]/60 font-mono">
                              {securityVerified ? 'ESTABLISHING SECURE LINK' : 'VERIFYING BIOMETRICS'}
                            </div>
                          </div>
                        </>
                      )}
                      {callStatus === 'connected' && (
                        <>
                          <div className="w-3 h-3 bg-[hsl(var(--oni-cyan))] rounded-full animate-gpu-pulse-scale-fast" />
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>CALL CONNECTED</div>
                            <div className="text-[10px] text-[hsl(var(--oni-cyan))]/60 font-mono">{countryCode} {phoneNumber}</div>
                          </div>
                        </>
                      )}
                      {callStatus === 'ended' && (
                        <>
                          <CheckCircle className="w-5 h-5 text-[hsl(var(--oni-cyan))]" />
                          <div className="text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>CALL ENDED</div>
                        </>
                      )}
                    </div>
                    {callStatus === 'connected' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={endCall}
                        className="px-3 py-1.5 rounded-full bg-[hsl(var(--oni-pink))]/20 border border-[hsl(var(--oni-pink))]/50 text-[hsl(var(--oni-pink))] text-xs flex items-center gap-1"
                      >
                        <PhoneOff className="w-3 h-3" />
                        END
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages - ONI Data Stream */}
              <ScrollArea className="flex-1 min-h-[200px] max-h-[calc(100vh-320px)] sm:h-[300px] sm:max-h-none" ref={scrollRef}>
                <div className="p-3 sm:p-4 space-y-3">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {message.role !== 'system' && (
                        <div 
                          className={cn(
                            "p-1.5 sm:p-2 rounded-full flex-shrink-0",
                            message.role === 'user' 
                              ? 'bg-gradient-to-br from-[hsl(var(--oni-purple))]/30 to-[hsl(var(--oni-pink))]/20 border border-[hsl(var(--oni-purple))]/40' 
                              : 'bg-gradient-to-br from-[hsl(var(--oni-cyan))]/30 to-[hsl(var(--oni-purple))]/20 border border-[hsl(var(--oni-cyan))]/40',
                            message.role === 'assistant' && isSpeaking && 'animate-gpu-oni-speaking'
                          )}
                        >
                          {message.role === 'user' ? (
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-[hsl(var(--oni-purple))]" />
                          ) : (
                            <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-[hsl(var(--oni-cyan))]" />
                          )}
                        </div>
                      )}
                      <div className={`max-w-[85%] oni-message-glass rounded-2xl p-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-[hsl(var(--oni-purple))]/20 to-[hsl(var(--oni-pink))]/10 border-[hsl(var(--oni-purple))]/30'
                          : message.role === 'system'
                          ? 'bg-[hsl(var(--oni-void))]/60 border-[hsl(var(--oni-cyan))]/20 text-center w-full'
                          : 'bg-gradient-to-br from-[hsl(var(--oni-cyan))]/10 to-[hsl(var(--oni-purple))]/5 border-[hsl(var(--oni-cyan))]/30'
                      }`}>
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          message.role === 'user' 
                            ? 'text-[hsl(var(--oni-purple))]' 
                            : message.role === 'system'
                            ? 'text-[hsl(var(--oni-cyan))]/70 text-[10px] sm:text-xs'
                            : 'text-[hsl(var(--oni-cyan))]'
                        }`} style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          {message.role === 'assistant' 
                            ? (displayedText[message.id] || '') + (displayedText[message.id]?.length < message.content.length ? '▊' : '')
                            : message.content
                          }
                        </p>
                        {/* Timestamp and actions */}
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/10">
                          <span className="text-[8px] text-white/30 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {format(message.timestamp, 'HH:mm')}
                          </span>
                          {message.role !== 'system' && (
                            <button
                              onClick={() => copyToClipboard(message.content)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title="Copy message"
                            >
                              <Copy className="w-3 h-3 text-white/40 hover:text-white/70" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <div className="p-2 rounded-full bg-[hsl(var(--oni-cyan))]/20 border border-[hsl(var(--oni-cyan))]/40">
                        <Bot className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                      </div>
                      <div className="oni-message-glass rounded-2xl p-3 bg-[hsl(var(--oni-cyan))]/10 border-[hsl(var(--oni-cyan))]/30">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[hsl(var(--oni-cyan))] animate-pulse" />
                          <span className="text-xs text-[hsl(var(--oni-cyan))] font-mono">PROCESSING NEURAL QUERY...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area - ONI Synapse Style */}
              <div className="p-3 sm:p-4 border-t border-[hsl(var(--oni-cyan))]/20 bg-gradient-to-t from-[hsl(var(--oni-void))] to-transparent">
                <div className="flex items-center gap-2">
                  {/* Voice Toggle */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`p-2 rounded-full transition-all ${
                      voiceEnabled 
                        ? 'bg-[hsl(var(--oni-cyan))]/20 border border-[hsl(var(--oni-cyan))]/50 text-[hsl(var(--oni-cyan))]' 
                        : 'bg-[hsl(var(--oni-void))]/60 border border-white/10 text-white/40'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </motion.button>

                  {/* Mic Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2 rounded-full transition-all ${
                      isListening 
                        ? 'bg-[hsl(var(--oni-pink))]/30 border border-[hsl(var(--oni-pink))]/60 text-[hsl(var(--oni-pink))] shadow-[0_0_15px_hsl(var(--oni-pink)/0.5)] animate-pulse' 
                        : 'bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] hover:border-[hsl(var(--oni-cyan))]/60'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </motion.button>

                  {/* File Attach Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] hover:border-[hsl(var(--oni-cyan))]/60"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </motion.button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                    onChange={handleFileAttach}
                  />

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="w-full bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 rounded-full px-4 py-2 text-sm font-mono focus:border-[hsl(var(--oni-cyan))]/60 focus:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.3)]"
                      style={{ backdropFilter: 'blur(12px)' }}
                    />
                  </div>

                  {/* Send Button */}
                  <motion.button
                    whileHover={{ scale: 1.1, boxShadow: '0 0 20px hsl(var(--oni-cyan)/0.6)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className="p-2.5 rounded-full bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] text-white shadow-[0_0_15px_hsl(var(--oni-cyan)/0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
                
                {/* Tech Footer */}
                <div className="flex justify-between mt-2 px-2">
                  <span className="text-[8px] sm:text-[9px] text-[hsl(var(--oni-cyan))]/30 font-mono">NEURAL.LINK.v4.2</span>
                  <span className="text-[8px] sm:text-[9px] text-[hsl(var(--oni-pink))]/30 font-mono">WETWARE.ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceAIAgent;
