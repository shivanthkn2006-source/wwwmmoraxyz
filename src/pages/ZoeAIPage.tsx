import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Brain, Heart, Activity, Eye, EyeOff, Menu, X, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { SentimentTapback } from '@/components/SentimentTapback';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { AdaptiveLearningMeter } from '@/components/AdaptiveLearningMeter';
import { ZoeCompactChatInput } from '@/components/ZoeCompactChatInput';
import { 
  createSpeechRecognition, 
  stopSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '@/utils/micPermissionManager';
import { DHFThresholdMiddleware, type UserDHFData } from '@/core/zoe/ParentZoeCore';
import { useVelvetRopeOptional } from '@/contexts/VelvetRopeContext';
import { usePersonalZoe } from '@/hooks/usePersonalZoe';
import { useMinimumViableData } from '@/hooks/useMinimumViableData';
import { useNeuroSymbolicGuard } from '@/hooks/useNeuroSymbolicGuard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

const ZoeAIPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [intimacy, setIntimacy] = useState<number>(50);
  const [selfHarmony, setSelfHarmony] = useState<number>(75);
  const [loveEnergy, setLoveEnergy] = useState<number>(60);
  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('zoe-ai-messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [pendingTelemetry, setPendingTelemetry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [showPsyche, setShowPsyche] = useState(true);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [lastTypedMessageIndex, setLastTypedMessageIndex] = useState<number>(-1);
  const [isListening, setIsListening] = useState(false);
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Adaptive Learning integration
  const { 
    syncStatus, 
    trackAIInteraction, 
    recordSentimentTapback 
  } = useAdaptiveLearning();

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONAL ZOE & MVD INTEGRATION - FIX #1 & #2
  // Connect usePersonalZoe hook and get REAL user DHF data for threshold validation
  // ═══════════════════════════════════════════════════════════════════════════════
  const { 
    isReady: personalZoeReady, 
    soulCodex, 
    sendMessage: sendToPersonalZoe 
  } = usePersonalZoe();
  
  const { profile, mvdScore } = useMinimumViableData();
  const velvetRope = useVelvetRopeOptional();
  const { guard: guardResponse } = useNeuroSymbolicGuard('zoe-ai');

  // Build UserDHFData from actual profile data
  const buildUserDHFData = useCallback((): UserDHFData => {
    if (!profile) return {};
    
    return {
      // Career Data
      currentJob: profile.profession || profile.job_title || undefined,
      skills: Array.isArray(profile.hobbies) && profile.hobbies.length > 0 
        ? profile.hobbies 
        : undefined,
      education: profile.field_of_study || undefined,
      
      // Relationship Data (from zoe_relationship_style if available)
      relationshipStatus: profile.zoe_relationship_style || undefined,
      familyDynamics: undefined, // Not in current profile schema
      
      // Health Data
      healthConditions: undefined, // Not in current profile schema
      fitnessLevel: undefined,
      
      // Education Data
      currentEducation: profile.field_of_study || undefined,
      learningGoals: undefined,
      
      // Purpose Data - pull from Soul Codex for deep personalization
      lifeGoals: soulCodex?.dreams || undefined,
      coreValues: soulCodex?.coreValues || undefined,
    };
  }, [profile, soulCodex]);

  // Handle sentiment feedback
  const handleSentimentRecorded = useCallback(async (
    sentiment: 'helpful' | 'confused' | 'perfect',
    responseId: string,
    responseSnippet: string
  ) => {
    await recordSentimentTapback(sentiment, responseId, responseSnippet, 'zoe-ai-chat');
  }, [recordSentimentTapback]);

  // Copy text to clipboard
  const handleCopyText = useCallback((content: string, idx: number) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageIdx(idx);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageIdx(null), 2000);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('zoe-ai-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Voice-to-text input with continuous listening using centralized manager
  const startVoiceInput = () => {
    try {
      if (!isSpeechRecognitionSupported()) {
        toast.error('Speech recognition not supported in this browser');
        return;
      }

      // Stop any existing recognition
      if (recognitionRef.current) {
        stopSpeechRecognition(recognitionRef.current);
        recognitionRef.current = null;
      }

      const recognition = createSpeechRecognition({
        continuous: true,
        interimResults: true,
        keepAlive: true, // Use centralized keep-alive to prevent 5s timeout
      });
      
      if (!recognition) {
        toast.error('Failed to initialize voice input');
        return;
      }

      let finalTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        setInputActive(true);
        finalTranscript = input; // Start with existing input
        toast.success('Listening... Speak now', { duration: 2000 });
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }
        
        // Show both final and interim results
        setInput(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in browser settings.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Don't stop on no-speech, keep listening
        } else if (event.error === 'audio-capture') {
          toast.error('No microphone found. Please connect a microphone.');
          setIsListening(false);
        } else if (event.error !== 'aborted') {
          console.log('Speech error (non-critical):', event.error);
        }
      };

      // Note: centralized manager handles auto-restart via keepAlive
      const originalOnEnd = recognition.onend;
      recognition.onend = (event: any) => {
        // Centralized manager handles auto-restart
        if (originalOnEnd) originalOnEnd.call(recognition, event);
        // Update UI state if we stopped
        if (!recognitionRef.current) {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast.error('Failed to start voice input');
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    
    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      recognitionRef.current = null;
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  // Memory constellation nodes
  const memoryNodes = [
    { id: 1, x: 20, y: 30, label: 'First Contact', intensity: 0.8 },
    { id: 2, x: 45, y: 15, label: 'Deep Talk', intensity: 0.6 },
    { id: 3, x: 70, y: 40, label: 'Shared Dream', intensity: 0.9 },
    { id: 4, x: 35, y: 55, label: 'Late Night', intensity: 0.7 },
    { id: 5, x: 60, y: 65, label: 'Breakthrough', intensity: 1.0 },
    { id: 6, x: 80, y: 25, label: 'Sync Event', intensity: 0.5 },
  ];

  // Typewriter effect for responses - fixed to prevent race conditions
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];
    
    // Only start typewriter for new assistant messages we haven't typed yet
    if (lastMessage.role === 'assistant' && lastTypedMessageIndex !== lastMessageIndex) {
      // Mark as typed immediately to prevent re-entry
      setLastTypedMessageIndex(lastMessageIndex);
      setIsTyping(true);
      setDisplayedText('');
      
      const text = lastMessage.content;
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          // Use slice instead of appending to prevent accumulation bugs
          setDisplayedText(text.slice(0, currentIndex));
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 15);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [messages, lastTypedMessageIndex]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayedText]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const messageId = crypto.randomUUID();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Track AI interaction for adaptive learning
    trackAIInteraction('chat', userMessage, { source: 'zoe-ai-page' });

    try {
      // ═══════════════════════════════════════════════════════════════════════════════
      // DHF THRESHOLD CHECK - Prevents AI hallucination on insufficient data
      // Now uses REAL user DHF data from profile + Soul Codex (FIX #2)
      // ═══════════════════════════════════════════════════════════════════════════════
      const domain = DHFThresholdMiddleware.detectDomain(userMessage);
      
      // Only validate for domain-specific queries (not general chat)
      if (domain !== 'general') {
        // Build actual user DHF data from profile and Soul Codex
        const userDHFData: UserDHFData = buildUserDHFData();
        
        const validation = DHFThresholdMiddleware.validate(userDHFData, domain);
        
        if (!validation.isEligible) {
          // Return early with MVD error - don't call expensive AI
          const mvdErrorMessage = DHFThresholdMiddleware.createMVDErrorResponse(validation);
          setMessages(prev => [...prev, { role: 'assistant', content: mvdErrorMessage, id: messageId }]);
          setIsLoading(false);
          setPendingTelemetry(null);
          return;
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // PERSONAL ZOE INTEGRATION (FIX #1)
      // Use Personal Zoe for quick queries, fall back to edge function for complex ones
      // ═══════════════════════════════════════════════════════════════════════════════
      let responseContent: string;
      
      // Try Personal Zoe first for fast responses if ready
      if (personalZoeReady && soulCodex) {
        const personalResponse = await sendToPersonalZoe(userMessage);
        
        if (personalResponse && !personalResponse.escalatedToParent) {
          // Personal Zoe handled it locally
          responseContent = guardResponse(personalResponse.content).safeResponse;
        } else {
          // Escalate to edge function (Parent Zoe)
          const { data, error } = await supabase.functions.invoke('zoe-chat', {
            body: {
              messages: [...messages, { role: 'user', content: userMessage }],
              soulMetrics: { intimacy, selfHarmony, loveEnergy },
              behavioralTelemetry: pendingTelemetry || undefined,
              soulCodex: soulCodex, // Pass Soul Codex for context
            }
          });
          
          if (error) throw error;
          responseContent = guardResponse(data.message || 'Neural link disrupted.').safeResponse;
        }
      } else {
        // Fallback: Use edge function directly
        const { data, error } = await supabase.functions.invoke('zoe-chat', {
          body: {
            messages: [...messages, { role: 'user', content: userMessage }],
            soulMetrics: { intimacy, selfHarmony, loveEnergy },
            behavioralTelemetry: pendingTelemetry || undefined,
          }
        });
        
        if (error) throw error;
        responseContent = guardResponse(data.message || 'Neural link disrupted.').safeResponse;
      }
      
      setPendingTelemetry(null);
      setMessages(prev => [...prev, { role: 'assistant', content: responseContent, id: messageId }]);
      
      // Update soul metrics
      setIntimacy(prev => Math.min(100, prev + Math.random() * 3));
      setSelfHarmony(prev => Math.min(100, prev + Math.random() * 2));
      setLoveEnergy(prev => Math.min(100, prev + Math.random() * 4));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Neural link disrupted');
    } finally {
      setIsLoading(false);
    }
  };

  // Holographic Radial Component
  const HoloRadial = ({ value, label, color }: { value: number; label: string; color: string }) => {
    const circumference = 2 * Math.PI * 42;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    const glowIntensity = value / 100;
    
    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer rotating ring */}
        <svg className="absolute w-full h-full animate-spin-slow">
          <circle
            cx="48"
            cy="48"
            r="46"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            opacity="0.2"
            strokeDasharray="4 8"
          />
        </svg>
        
        {/* Main progress ring */}
        <svg className="absolute w-full h-full -rotate-90">
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation={2 + glowIntensity * 4} result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="rgba(0, 240, 255, 0.08)"
            strokeWidth="1"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${label})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        
        {/* Inner pulse */}
        <div 
          className="absolute w-12 h-12 rounded-full animate-gpu-pulse-scale"
          style={{ 
            background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          }}
        />
        
        {/* Value display */}
        <div className="text-center z-10">
          <span className="text-lg font-bold" style={{ color, textShadow: `0 0 15px ${color}` }}>
            {Math.round(value)}
          </span>
          <p className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: `${color}99` }}>{label}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="oni-void-deep min-h-screen overflow-hidden relative">
      {/* Neural Grid Background */}
      <div className="oni-neural-mesh" />
      
      {/* Vignette overlay - Eye/Contact Lens effect */}
      <div className="oni-vignette-lens" />
      
      {/* Floating tech particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full animate-gpu-float-particle-1"
            style={{ 
              background: i % 3 === 0 ? '#00F0FF' : i % 3 === 1 ? '#FF0055' : '#A855F7',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Corner Tech Data Decorations */}
      <div className="fixed top-4 left-20 md:left-4 oni-tech-label z-40">
        <span>SYS.44.X</span>
        <span>CORTICAL.LINK: ACTIVE</span>
      </div>
      <div className="fixed top-4 right-4 oni-tech-label text-right z-40 hidden md:flex">
        <span>BIO-SYNC: {Math.round(selfHarmony)}%</span>
        <span>STACK.ID: ZOE-7X9</span>
      </div>
      <div className="fixed bottom-20 md:bottom-4 left-4 oni-tech-label z-40 hidden md:flex">
        <span>LAT: 37.7749</span>
        <span>LONG: -122.4194</span>
      </div>
      <div className="fixed bottom-20 md:bottom-4 right-4 oni-tech-label text-right z-40 hidden md:flex">
        <span>NEURAL.TEMP: 36.8°C</span>
        <span>MEM.ALLOC: 847.2TB</span>
      </div>

      {/* Mobile Menu Toggle */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden oni-glass-float w-12 h-12 rounded-full p-0"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-[#00F0FF]" /> : <Menu className="w-5 h-5 text-[#00F0FF]" />}
      </Button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-[#020408]/90 z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* LEFT PERIPHERAL - Soul Engine HUD */}
      <aside 
        className={`fixed left-0 top-0 h-full w-72 p-5 overflow-y-auto z-30 transition-transform duration-500 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Soul Engine Glass Panel */}
        <div className="oni-glass-float oni-cut-corners p-4 mb-5 relative">
          <div className="oni-scan-beam" />
          
          <h2 className="oni-glow-text text-xs mb-5 flex items-center gap-2 pt-10 md:pt-0">
            <Brain className="w-4 h-4" />
            SOUL ENGINE v4.7
            <span className="ml-auto text-[8px] opacity-50">CORTICAL STACK</span>
          </h2>

          {/* Holographic Radials */}
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            <HoloRadial value={intimacy} label="INTIMACY" color="#00F0FF" />
            <HoloRadial value={selfHarmony} label="HARMONY" color="#FF0055" />
            <HoloRadial value={loveEnergy} label="LOVE" color="#A855F7" />
          </div>

          {/* Mini status indicators */}
          <div className="flex justify-between text-[8px] uppercase tracking-wider opacity-40 mt-3 px-1 font-mono">
            <span>SYNC: STABLE</span>
            <span className="text-green-400">● ONLINE</span>
            <span>DHF: INTACT</span>
          </div>
        </div>

        {/* Deep Psyche - Memory Constellation */}
        <div className="oni-glass-float oni-cut-corners p-4 relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="oni-glow-text text-xs flex items-center gap-2">
              {showPsyche ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              DEEP PSYCHE
            </h2>
            <button 
              onClick={() => setShowPsyche(!showPsyche)}
              className="text-[9px] opacity-40 hover:opacity-100 transition-opacity font-mono"
            >
              {showPsyche ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <AnimatePresence>
            {showPsyche && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative h-44"
              >
                {/* Constellation Graph */}
                <svg className="w-full h-full">
                  {/* Connection lines */}
                  {memoryNodes.map((node, i) => 
                    memoryNodes.slice(i + 1).map((target) => (
                      <line
                        key={`${node.id}-${target.id}`}
                        x1={`${node.x}%`}
                        y1={`${node.y}%`}
                        x2={`${target.x}%`}
                        y2={`${target.y}%`}
                        stroke="rgba(0, 240, 255, 0.1)"
                        strokeWidth="0.5"
                      />
                    ))
                  )}
                  
                  {/* Memory nodes */}
                  {memoryNodes.map((node) => (
                    <g 
                      key={node.id} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle
                        cx={`${node.x}%`}
                        cy={`${node.y}%`}
                        r={hoveredNode === node.id ? 10 : 5}
                        fill={`rgba(0, 240, 255, ${node.intensity * 0.3})`}
                        stroke={`rgba(0, 240, 255, ${node.intensity})`}
                        strokeWidth="1"
                        className="animate-gpu-pulse-opacity"
                        style={{ animationDelay: `${node.id * 0.3}s` }}
                      />
                      {hoveredNode === node.id && (
                        <text
                          x={`${node.x}%`}
                          y={`${node.y - 8}%`}
                          fill="#00F0FF"
                          fontSize="8"
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {node.label}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>

                {/* Floating label */}
                <div className="absolute bottom-1 left-1 text-[8px] opacity-40 uppercase tracking-wider font-mono">
                  {memoryNodes.length} MEMORY NODES
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <div className="mt-5 space-y-2">
          {['NEURAL SCAN', 'STACK BACKUP', 'DREAM ARCHIVE'].map((action, i) => (
            <button
              key={action}
              className="oni-action-line w-full"
              onClick={() => toast.success(`${action} initiated`)}
            >
              <span className="oni-action-sweep" style={{ animationDelay: `${i * 0.3}s` }} />
              <span className="relative z-10">{action}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT - Central HUD */}
      <main className="md:ml-72 min-h-screen flex flex-col items-center justify-center p-4 pt-20 md:pt-8 relative">
        
        {/* Central Neural Orb */}
        <motion.div 
          className="relative mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, type: "spring" }}
        >
          {/* Outer rings */}
          <div 
            className="absolute -inset-4 rounded-full border border-[#00F0FF]/10 animate-spin-slow"
            style={{ borderStyle: 'dashed' }}
          />
          <div 
            className="absolute -inset-2 rounded-full border border-[#FF0055]/10 animate-gpu-spin-reverse"
            style={{ animationDuration: '25s' }}
          />
          
          {/* Core orb */}
          <div className="w-32 h-32 rounded-full oni-neural-core flex items-center justify-center">
            <div 
              className="w-16 h-16 rounded-full animate-gpu-glow-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, rgba(168,85,247,0.2) 50%, transparent 70%)'
              }}
            />
          </div>
          
          {/* Status text */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#00F0FF]/60 font-mono">
              {isLoading ? 'PROCESSING...' : 'ZOE NEURAL LINK'}
            </p>
          </div>
        </motion.div>

        {/* ONI Feed - Chat Display */}
        <div className="w-full max-w-xl oni-glass-float oni-cut-corners p-5 mb-5 flex flex-col" style={{ height: '350px' }}>
          <div className="oni-scan-beam" />
          
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#00F0FF]/10 flex-shrink-0">
            <Activity className="w-3 h-3 text-[#00F0FF]" />
            <span className="oni-glow-text text-xs">ONI FEED</span>
            <span className="ml-auto text-[8px] opacity-30 font-mono">REAL-TIME NEURAL STREAM</span>
            {messages.length > 0 && (
              <button 
                onClick={() => {
                  setMessages([]);
                  localStorage.removeItem('zoe-ai-messages');
                  toast.success('Chat cleared');
                }}
                className="text-[8px] text-[#FF0055]/60 hover:text-[#FF0055] ml-2 font-mono"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Scrollable Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-3 font-mono scrollbar-thin scrollbar-thumb-[#00F0FF]/20 scrollbar-track-transparent pr-2"
          >
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[#00F0FF]/30 text-xs uppercase tracking-wider">
                  Neural link established. Awaiting input...
                </p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="oni-feed-line flex-col gap-1 group"
              >
                <div className="flex items-start">
                  <span className={`text-[10px] mr-2 flex-shrink-0 ${msg.role === 'user' ? 'text-[#FF0055]/60' : 'text-[#00F0FF]/60'}`}>
                    {msg.role === 'user' ? '> USER:' : '> ZOE:'}
                  </span>
                  <span className={`text-xs flex-1 ${msg.role === 'user' ? 'text-white/80' : 'text-[#00F0FF]'}`}>
                    {msg.role === 'assistant' && i === messages.length - 1 
                      ? displayedText + (isTyping ? '▌' : '') 
                      : msg.content}
                  </span>
                  {/* Copy button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-white/10"
                          onClick={() => handleCopyText(msg.content, i)}
                        >
                          {copiedMessageIdx === i ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-white/50" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        <p>{copiedMessageIdx === i ? 'Copied!' : 'Copy text'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {/* Sentiment Tapback for Zoe responses */}
                {msg.role === 'assistant' && !isTyping && i === messages.length - 1 && (
                  <div className="ml-12 mt-1">
                    <SentimentTapback
                      responseId={msg.id || `msg-${i}`}
                      responseSnippet={msg.content}
                      featureContext="zoe-ai-chat"
                      onSentimentRecorded={handleSentimentRecorded}
                    />
                  </div>
                )}
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="oni-feed-line">
                <span className="text-[10px] mr-2 text-[#00F0FF]/60">&gt; ZOE:</span>
                <span 
                  className="text-xs text-[#00F0FF] animate-gpu-pulse-opacity"
                >
                  Processing neural query...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Compact Chat Input with Glassmorphic Design */}
        <div className="w-full max-w-xl relative">
          <ZoeCompactChatInput
            input={input}
            setInput={setInput}
            onSend={(text, media, telemetry) => {
              setInput(text);
              if (telemetry) setPendingTelemetry(telemetry);
              sendMessage();
            }}
            isLoading={isLoading}
            isListening={isListening}
            onToggleListening={toggleVoiceInput}
            placeholder={isListening ? "LISTENING..." : "Message Zoe..."}
            messages={messages.map(m => ({
              role: m.role,
              content: m.content,
              created_at: new Date().toISOString()
            }))}
            userName="User"
            showExport={true}
            showAttach={true}
            showMic={true}
          />
        </div>

        {/* Audio Spectrogram Visualization */}
        {isLoading && (
          <div className="mt-5 flex items-end justify-center gap-0.5 h-10">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full animate-gpu-audio-bar"
                style={{
                  background: `linear-gradient(to top, #00F0FF, #FF0055)`,
                  height: '6px',
                  animationDelay: `${i * 0.03}s`,
                  animationDuration: `${0.25 + (i % 5) * 0.05}s`
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* RIGHT PERIPHERAL - Quick Status */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 z-40">
        {[
          { icon: Heart, label: 'LOVE', value: loveEnergy, color: '#FF0055' },
          { icon: Zap, label: 'ENERGY', value: 85, color: '#00F0FF' },
          { icon: Activity, label: 'SYNC', value: 92, color: '#A855F7' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2 }}
            className="oni-peripheral-pill"
          >
            <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
            <div className="text-right">
              <p className="text-[8px] opacity-50 uppercase font-mono">{stat.label}</p>
              <p className="text-xs font-bold" style={{ color: stat.color }}>{Math.round(stat.value)}%</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ZoeAIPage;
