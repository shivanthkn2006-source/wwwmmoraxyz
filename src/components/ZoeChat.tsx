import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Loader2, Volume2, VolumeX, AlertCircle, Copy, Check, Search, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ZoeCompactChatInput } from '@/components/ZoeCompactChatInput';
import zoeAvatar from '@/assets/zoe-avatar.png';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';
import SpokenTranscript from '@/components/zoe-infinity/SpokenTranscript';
import { isZoeInfinityMessage, stripZoeInfinityMarker } from '@/utils/conversationNamespaces';
import { setActiveVoiceExperience } from '@/utils/voiceExperienceLock';
import { useZoe } from '@/contexts/ZoeContext';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition, 
  stopSpeechRecognition 
} from '@/utils/micPermissionManager';
import { useZoeOrbSelfieCitySearch } from '@/hooks/useZoeOrbSelfieCitySearch';
import { useNeuroSymbolicGuard } from '@/hooks/useNeuroSymbolicGuard';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ZoeChat = () => {
  useEffect(() => {
    setActiveVoiceExperience('mmora');
  }, []);

  const { user } = useAuth();
  const { executeCommand, isAgentMode, taskProgress } = useZoe();
  const { searchResults, zoeInsight, hasNewResults, lastQuery, markResultsSeen } = useZoeOrbSelfieCitySearch();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { guard: guardResponse } = useNeuroSymbolicGuard('zoe-chat');

  // Listen for Selfie City search results and display in chat
  useEffect(() => {
    if (hasNewResults && searchResults.length > 0) {
      setShowSearchResults(true);
      markResultsSeen();
      
      // Add search results as Zoe message
      const searchMessage: Message = {
        role: 'assistant',
        content: `🔍 **Selfie City Search: "${lastQuery}"**\n\n${zoeInsight || `I found ${searchResults.length} results for you.`}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, searchMessage]);
    }
  }, [hasNewResults, searchResults, zoeInsight, lastQuery, markResultsSeen]);

  // Check speech recognition support on mount
  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  // Load conversation history
  useEffect(() => {
    if (!user) return;
    
    const loadHistory = async () => {
      try {
        // SEPARATION PROTOCOL: Only load 'zoe_classic' variant (Old Zoe)
        const { data, error: fetchError } = await supabase
          .from('ai_companion_messages')
          .select('id, content, role, created_at, variant')
          .eq('user_id', user.id)
          .or('variant.is.null,variant.eq.zoe_classic') // Old messages have no variant
          .order('created_at', { ascending: true })
          .limit(50);

        if (fetchError) {
          console.error('Error loading conversation history:', fetchError);
          return;
        }

        if (data && data.length > 0) {
          const loadedMessages: Message[] = data
            .filter(msg => msg.content && msg.content.trim()) // Filter out empty messages
            // Hide Zoe Infinity messages
            .filter(msg => !isZoeInfinityMessage(msg.content))
            .map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: stripZoeInfinityMarker(msg.content),
              timestamp: new Date(msg.created_at)
            }));
          setMessages(loadedMessages);
          console.log('[ZoeChat] Loaded', loadedMessages.length, 'messages');
        }
      } catch (err) {
        console.error('Error loading conversation history:', err);
      }
    };
    
    loadHistory();
  }, [user]);

  // Auto-scroll on new messages and initial load
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isLoading]);

  // Load voice mode preference
  useEffect(() => {
    const loadVoiceMode = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('zoe_settings')
          .select('output_mode')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading Zoe voice settings for chat:', error);
          return;
        }

        if (data?.output_mode === 'voice' || data?.output_mode === 'both') {
          setVoiceMode(true);
        } else {
          setVoiceMode(false);
        }
      } catch (err) {
        console.error('Error loading Zoe voice settings for chat:', err);
      }
    };

    loadVoiceMode();
  }, [user]);

  // Save message to database
  const saveMessageToDb = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!user || !content.trim()) return null;
    
    try {
      // SEPARATION PROTOCOL: Tag all messages as 'zoe_classic' (Old Zoe)
      const { data, error } = await supabase
        .from('ai_companion_messages')
        .insert({
          user_id: user.id,
          role,
          variant: 'zoe_classic',
          content: content.trim()
        } as any)
        .select('id')
        .single();
      
      if (error) {
        console.error('[ZoeChat] Failed to save message:', error);
        return null;
      }
      
      console.log('[ZoeChat] Saved message:', data?.id);
      return data?.id;
    } catch (err) {
      console.error('[ZoeChat] Save error:', err);
      return null;
    }
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    setError(null);
    const userMessage: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message first
      await saveMessageToDb('user', text.trim());

      // Get conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Detect self-awareness questions for enhanced responses
      const lowerText = text.toLowerCase();
      const isSelfAwarenessQuery = lowerText.includes('what are you doing') || 
        lowerText.includes('how are you') || 
        lowerText.includes('what are you thinking') ||
        lowerText.includes('how do you feel') ||
        lowerText.includes('are you there') ||
        lowerText.includes('what\'s on your mind');

      // Get current time info for context with proper formatting
      const now = new Date();
      const hours = now.getHours();
      const timeOfDay = hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';
      
      // Format time properly with 12-hour format and AM/PM
      const formattedTime = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log('[ZoeChat] Sending time context:', { formattedTime, userTimezone, timeOfDay });

      // Call Zoe chat function with enhanced context
      const { data, error: chatError } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [...conversationHistory, { role: 'user', content: text.trim() }],
          soulMetrics: { 
            intimacy: 75, 
            selfHarmony: 80, 
            loveEnergy: 70,
            visionActive: false,
            detectedEmotion: 'engaged'
          },
          platformContext: {
            currentPage: window.location.pathname,
            userName: user?.email?.split('@')[0] || 'friend',
            timeOfDay,
            currentTime: formattedTime,
            platformFeatures: ['Solar System Explorer', 'Zoe Dreams', 'Universal Timeline', 'DHF Upload', 'Architect Mode']
          },
          timezone: userTimezone,
          localTime: formattedTime
        }
      });

      if (chatError) {
        console.error('Zoe chat error:', chatError);
        throw new Error(chatError.message || 'Failed to get response');
      }

      // Handle response - filter through NeuroSymbolic Guard
      const rawContent = data?.message || data?.response || "I'm here to help. Could you please try again?";
      const responseContent = guardResponse(rawContent).safeResponse;
      
      if (!responseContent || responseContent.trim() === '') {
        throw new Error('Empty response from Zoe');
      }
      
      const assistantMessage: Message = {
        id: (globalThis.crypto?.randomUUID?.() ?? `zoe-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant response
      await saveMessageToDb('assistant', responseContent);

      // Speak the response if voice mode is enabled
      if (voiceMode && responseContent) {
        await speakResponse(responseContent, assistantMessage.id);
      }


    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response from Zoe';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, messages, voiceMode, saveMessageToDb]);

  const speakResponse = useCallback(async (text: string, messageId?: string) => {
    setIsSpeaking(true);

    try {
      speakAsZoe(
        text,
        messageId ? { messageId } : undefined,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        (err) => {
          console.error('Speech error:', err);
          setIsSpeaking(false);
        }
      );
    } catch (err) {
      console.error('Speech error:', err);
      setIsSpeaking(false);
    }
  }, []);

  const startVoiceInput = useCallback(() => {
    if (!speechSupported || !isSpeechRecognitionSupported()) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    // Pause wake word detection while single-shot voice input is running
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));

    try {
      // Use centralized manager with keep-alive
      const recognition = createSpeechRecognition({
        continuous: false,
        interimResults: false,
        keepAlive: false, // Single-shot mode
      });
      
      if (!recognition) {
        toast.error('Failed to initialize voice input');
        window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
        return;
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          setIsListening(false);
          window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
          return;
        }
        console.error('Speech recognition error:', event.error);
        toast.error(`Voice input error: ${event.error}`);
        setIsListening(false);
        window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      };

      recognition.onend = () => {
        setIsListening(false);
        window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      toast.info('Listening... Speak now');
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      toast.error('Failed to start voice input');
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    }
  }, [speechSupported, sendMessage]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
      setIsListening(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const handleVoiceModeToggle = useCallback(async (enabled: boolean) => {
    setVoiceMode(enabled);
    
    // Also update in settings
    if (user) {
      try {
        await supabase
          .from('zoe_settings')
          .upsert({
            user_id: user.id,
            output_mode: enabled ? 'both' : 'text'
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('Failed to save voice mode preference:', err);
      }
    }
    
    if (enabled) {
      toast.success('Voice responses enabled');
    } else {
      stopZoeSpeech();
      setIsSpeaking(false);
    }
  }, [user]);

  // Copy text to clipboard
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  
  const handleCopyText = useCallback((content: string, messageIdx: number) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageIdx);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={zoeAvatar} alt="Zoe" />
            <AvatarFallback>Z</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Zoe AI Companion</h3>
            <p className="text-sm text-muted-foreground">
              {isSpeaking ? "Speaking..." : isAgentMode ? `Processing (${taskProgress}%)` : "Your intelligent assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="voice-mode" className="text-sm cursor-pointer">
            {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Label>
          <Switch
            id="voice-mode"
            checked={voiceMode}
            onCheckedChange={handleVoiceModeToggle}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation with Zoe!</p>
              <p className="text-sm mt-2">I can help with navigation, content creation, search, and more.</p>
              {!speechSupported && (
                <p className="text-xs text-amber-500 mt-2">
                  Note: Voice input not supported in this browser
                </p>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarImage src={zoeAvatar} alt="Zoe" />
                    <AvatarFallback>Z</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[80%] relative ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap pr-6">
                    <SpokenTranscript
                      messageId={msg.role === 'assistant' ? msg.id : undefined}
                      text={msg.content}
                    />
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                  {/* Copy button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                            msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-background/50'
                          }`}
                          onClick={() => handleCopyText(msg.content, idx)}
                        >
                          {copiedMessageId === idx ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copiedMessageId === idx ? 'Copied!' : 'Copy text'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))
          )}
          
          {/* Selfie City Search Results Card */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={zoeAvatar} alt="Zoe" />
                <AvatarFallback>Z</AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 bg-primary/10 border border-primary/20 max-w-[85%]">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Search className="w-4 h-4" />
                  <span className="font-medium text-sm">Selfie City Results</span>
                </div>
                <div className="space-y-2">
                  {searchResults.slice(0, 5).map((result, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 p-2 rounded-md bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                      onClick={() => setShowSearchResults(false)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground uppercase">{result.category} • {result.type}</p>
                      </div>
                      {result.discount && (
                        <span className="text-xs text-primary shrink-0">{result.discount}</span>
                      )}
                    </div>
                  ))}
                </div>
                {searchResults.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    +{searchResults.length - 5} more results
                  </p>
                )}
                <button 
                  onClick={() => setShowSearchResults(false)}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={zoeAvatar} alt="Zoe" />
                <AvatarFallback>Z</AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 bg-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-background/30 backdrop-blur-xl">
        <ZoeCompactChatInput
          input={input}
          setInput={setInput}
          onSend={(text) => sendMessage(text)}
          isLoading={isLoading}
          isListening={isListening}
          onToggleListening={isListening ? stopVoiceInput : startVoiceInput}
          placeholder={isSpeaking ? "Zoe is speaking..." : "Message Zoe..."}
          disabled={isSpeaking}
          messages={messages.map(m => ({
            role: m.role,
            content: m.content,
            created_at: m.timestamp.toISOString()
          }))}
          showMic={speechSupported}
        />
      </div>
    </Card>
  );
};
