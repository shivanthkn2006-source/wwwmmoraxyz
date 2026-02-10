import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Mic, MicOff, X, Minimize2, Maximize2, Sparkles, Brain, TrendingUp, MapPin, Heart, Clock, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { useZoePersonalization } from '@/hooks/useZoePersonalization';
import zoeAvatar from '@/assets/zoe-avatar.png';
import { 
  createSpeechRecognition, 
  stopSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '@/utils/micPermissionManager';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ZoeHuddleAssistantProps {
  onClose?: () => void;
}

const ZoeHuddleAssistant: React.FC<ZoeHuddleAssistantProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { 
    behavior, 
    trackHuddleInteraction, 
    getHuddlePersonalizedSuggestions 
  } = useZoePersonalization();
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [huddleSuggestions, setHuddleSuggestions] = useState<string[]>([]);
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Copy text to clipboard
  const handleCopyText = (content: string, idx: number) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageIdx(idx);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageIdx(null), 2000);
  };

  // Initialize session and load personalized suggestions
  useEffect(() => {
    if (user) {
      initializeSession();
      loadPersonalizationInsights();
      loadHuddleSuggestions();
    }
  }, [user]);

  // Update suggestions when behavior changes
  useEffect(() => {
    if (behavior) {
      loadHuddleSuggestions();
    }
  }, [behavior]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeSession = async () => {
    if (!user) return;

    try {
      // Create or get active session
      const { data: existingSession } = await supabase
        .from('zoe_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('session_type', 'huddle')
        .single();

      if (existingSession) {
        setCurrentSession(existingSession.id);
        loadSessionMessages(existingSession.id);
      } else {
        const { data: newSession, error } = await supabase
          .from('zoe_sessions')
          .insert({
            user_id: user.id,
            session_name: 'Huddle Assistant',
            session_type: 'huddle',
            session_context: { location: 'huddle_page' }
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(newSession.id);
        
        // Send personalized welcome message
        const huddlePatterns = behavior?.huddle_usage_patterns;
        let welcomeContent = `Hi! I'm Zoe, your personal Huddle assistant. `;
        
        if (huddlePatterns) {
          const topLocation = Object.entries(huddlePatterns.visited_locations || {})
            .sort(([, a], [, b]) => b - a)[0]?.[0];
          const topInterest = Object.entries(huddlePatterns.filtered_interests || {})
            .sort(([, a], [, b]) => b - a)[0]?.[0];
          
          if (topLocation || topInterest) {
            welcomeContent += `I've noticed you love exploring ${topLocation || 'new places'}`;
            if (topInterest) welcomeContent += ` and connecting with people interested in ${topInterest}`;
            welcomeContent += `. `;
          }
        }
        
        welcomeContent += `What would you like to explore today?`;
        
        const welcomeMessage: Message = {
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }

      // Track behavioral data
      trackBehavior('session_start');
    } catch (error) {
      console.error('Error initializing session:', error);
      toast.error('Failed to initialize Zoe assistant');
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data: sessionMessages } = await supabase
        .from('zoe_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (sessionMessages) {
        setMessages(sessionMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata
        })));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadPersonalizationInsights = async () => {
    if (!user) return;

    try {
      const { data: personalization } = await supabase
        .from('zoe_personalization')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (personalization) {
        setInsights(personalization);
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
    }
  };

  const loadHuddleSuggestions = () => {
    const suggestions = getHuddlePersonalizedSuggestions();
    setHuddleSuggestions(suggestions);
  };

  const trackBehavior = async (eventType: string, data?: any) => {
    if (!user) return;

    try {
      // Update behavior patterns
      const { data: behavior } = await supabase
        .from('zoe_user_behavior')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const currentHour = new Date().getHours();
      const patterns = (behavior?.daily_usage_patterns || {}) as Record<string, number>;
      const updatedPatterns = {
        ...patterns,
        [eventType]: (patterns[eventType] || 0) + 1
      };

      const peakHours = Array.isArray(behavior?.peak_usage_hours) 
        ? [...behavior.peak_usage_hours] 
        : [];
      if (!peakHours.includes(currentHour)) {
        peakHours.push(currentHour);
      }

      if (behavior) {
        await supabase
          .from('zoe_user_behavior')
          .update({
            daily_usage_patterns: updatedPatterns,
            peak_usage_hours: peakHours,
            text_interaction_frequency: (behavior.text_interaction_frequency || 0) + 1
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('zoe_user_behavior')
          .insert({
            user_id: user.id,
            daily_usage_patterns: updatedPatterns,
            peak_usage_hours: [currentHour],
            text_interaction_frequency: 1
          });
      }
    } catch (error) {
      console.error('Error tracking behavior:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentSession || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Save user message
      await supabase.from('zoe_messages').insert({
        session_id: currentSession,
        user_id: user.id,
        role: 'user',
        content: inputValue,
        message_type: 'text'
      });

      // Track behavior
      trackBehavior('message_sent', { content_length: inputValue.length });

      // Call AI function
      const response = await generateAIResponse(inputValue);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak response with Zoe's calm voice
      const { speakAsZoe } = await import('@/utils/zoeVoice');
      speakAsZoe(response);

      // Save assistant message
      await supabase.from('zoe_messages').insert({
        session_id: currentSession,
        user_id: user.id,
        role: 'assistant',
        content: response,
        message_type: 'text'
      });

      // Store memory
      await supabase.from('zoe_memory').insert({
        user_id: user.id,
        memory_type: 'fact',
        memory_content: `User asked: "${inputValue}". Zoe responded with assistance.`,
        importance_score: 5
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userInput: string): Promise<string> => {
    const lowerInput = userInput.toLowerCase();
    const huddlePatterns = behavior?.huddle_usage_patterns;
    
    // Track interaction
    if (trackHuddleInteraction) {
      trackHuddleInteraction('message_sent', { query: userInput });
    }
    
    // Personalized responses based on learned patterns
    if (lowerInput.includes('find') || lowerInput.includes('show') || lowerInput.includes('people')) {
      let response = "I can help you discover people! ";
      
      if (huddlePatterns?.filtered_interests) {
        const topInterests = Object.entries(huddlePatterns.filtered_interests)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([interest]) => interest);
        
        if (topInterests.length > 0) {
          response += `Based on your patterns, you might enjoy meeting people interested in ${topInterests.join(' and ')}. `;
        }
      }
      
      response += "Try using the filters panel to narrow down by location, interests, or online status!";
      return response;
      
    } else if (lowerInput.includes('friend') || lowerInput.includes('connect')) {
      let response = "Looking to connect with new friends? ";
      
      if (huddlePatterns?.visited_locations) {
        const topLocation = Object.entries(huddlePatterns.visited_locations)
          .sort(([, a], [, b]) => b - a)[0]?.[0];
        
        if (topLocation) {
          response += `You frequently explore ${topLocation}. I can show you active people there! `;
        }
      }
      
      response += "I've analyzed your interests and can recommend people you might enjoy meeting.";
      return response;
      
    } else if (lowerInput.includes('location') || lowerInput.includes('city') || lowerInput.includes('place')) {
      let response = "I can help you navigate locations on the map! ";
      
      if (huddlePatterns?.visited_locations) {
        const locations = Object.keys(huddlePatterns.visited_locations).slice(0, 3);
        if (locations.length > 0) {
          response += `Your favorite spots include ${locations.join(', ')}. `;
        }
      }
      
      response += "Try saying 'go to Paris' or 'show me Tokyo'. What location interests you?";
      return response;
      
    } else if (lowerInput.includes('interest') || lowerInput.includes('hobby')) {
      let response = "Interests are a great way to find like-minded people! ";
      
      if (huddlePatterns?.filtered_interests) {
        const topInterests = Object.entries(huddlePatterns.filtered_interests)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([interest]) => interest);
        
        if (topInterests.length > 0) {
          response += `I've noticed you enjoy ${topInterests.join(', ')}. Want to discover more people with these interests? `;
        }
      }
      
      response += "What interests are you passionate about?";
      return response;
      
    } else if (lowerInput.includes('suggest') || lowerInput.includes('recommend')) {
      const suggestions = getHuddlePersonalizedSuggestions();
      if (suggestions.length > 0) {
        return `Based on your patterns, here are my suggestions:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      }
      return "Let me analyze your patterns... Try exploring more locations and interests, and I'll learn your preferences!";
      
    } else {
      let response = "I'm here to help you with everything Huddle-related! ";
      
      const currentHour = new Date().getHours();
      if (huddlePatterns?.peak_huddle_hours?.includes(currentHour)) {
        response += "It's your prime Huddle time! ";
      }
      
      response += "I can help you find friends, discover people by interests, navigate locations, and personalize your experience. What would you like to do?";
      return response;
    }
  };

  const startVoiceRecognition = () => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    // Use centralized manager
    const recognition = createSpeechRecognition({
      continuous: false,
      interimResults: false,
      keepAlive: false, // Single-shot mode
    });
    
    if (!recognition) {
      toast.error('Failed to initialize voice recognition');
      return;
    }

    const originalOnStart = recognition.onstart;
    recognition.onstart = (event: any) => {
      setIsListening(true);
      trackBehavior('voice_start');
      if (originalOnStart) originalOnStart.call(recognition, event);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      trackBehavior('voice_command', { transcript });
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
        toast.error('Voice recognition error');
      }
      setIsListening(false);
    };

    // Override onend to prevent auto-restart in single-shot mode
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-28 right-4 sm:bottom-24 sm:right-6 z-[1004] w-[calc(100vw-2rem)] sm:w-[420px] max-h-[70vh] sm:max-h-[600px] flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px -10px rgba(139, 92, 246, 0.4), 0 0 40px -10px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-primary/20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* CSS animation instead of framer-motion infinite */}
            <div className="flex-shrink-0 animate-gpu-spin-slow">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">Zoe AI Assistant</h3>
              <p className="text-xs text-muted-foreground truncate">Huddle Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {insights && (
              <Badge variant="secondary" className="text-xs hidden sm:flex">
                <TrendingUp className="w-3 h-3 mr-1" />
                Personalized
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={onClose}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        {isExpanded && (
          <>
            <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                     <Avatar className="h-8 w-8">
                      {message.role === 'assistant' ? (
                        <AvatarImage src={zoeAvatar} alt="Zoe" />
                      ) : (
                        <AvatarFallback>U</AvatarFallback>
                      )}
                    </Avatar>
                    <div
                      className={`flex-1 rounded-2xl p-3 relative group ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border'
                      }`}
                      style={{
                        backdropFilter: message.role === 'assistant' ? 'blur(10px)' : 'none',
                      }}
                    >
                      <p className="text-sm pr-6">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {/* Copy button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                                message.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-background/50'
                              }`}
                              onClick={() => handleCopyText(message.content, index)}
                            >
                              {copiedMessageIdx === index ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{copiedMessageIdx === index ? 'Copied!' : 'Copy text'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <div className="w-full h-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    </Avatar>
                    <div className="flex-1 rounded-2xl p-3 bg-card border border-border">
                      {/* CSS animated loading dots */}
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-gpu-dot-1" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-gpu-dot-2" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-gpu-dot-3" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Personalized Insights Panel */}
            {huddleSuggestions.length > 0 && (
              <div className="px-3 sm:px-4 pb-2">
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Personalized for You</span>
                  </div>
                  <div className="space-y-1">
                    {huddleSuggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 sm:p-4 border-t border-primary/20">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about Huddle..."
                  className="flex-1 bg-background/50 border-primary/20 text-sm"
                  disabled={isLoading}
                />
                <Button
                  variant={isListening ? 'destructive' : 'secondary'}
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                >
                  {isListening ? <MicOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Mic className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  Powered by hyper-personalized AI learning
                </p>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ZoeHuddleAssistant;
