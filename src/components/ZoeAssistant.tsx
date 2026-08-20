import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, MicOff, MessageSquare, X, Minimize2, Bot, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ContextualHintWrapper } from '@/components/ContextualHintWrapper';
import { useVoiceNotifications } from '@/hooks/useVoiceNotifications';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import zoeAvatar from '@/assets/zoe-avatar.png';
import { useZoe } from '@/contexts/ZoeContext';
import { toast } from 'sonner';
import { useZoeSessionSync } from '@/hooks/useZoeSessionSync';
import { useZoeRapport } from '@/hooks/useZoeRapport';
import { ZoeLearningSystem } from '@/utils/zoeLearningSystem';
import { 
  getTimeBasedGreeting, 
  getRandomHealthQuestion, 
  getContentPromptFromKeywords, 
  getKeywordsByTime,
  analyzeUserPostPatterns,
  generatePersonalizedContentSuggestion 
} from '@/utils/greetingHelpers';
import { getUserLocation, getWeatherInfo, getWeatherCondition } from '@/utils/weatherHelpers';
import { getTrafficAlerts, formatTrafficAlert, getCommuteAdvice } from '@/utils/trafficHelpers';
import { useEmotionCheckIns } from '@/hooks/useEmotionCheckIns';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { APP_FEATURES } from '@/data/appFeatures';
import { useFeatureAnalytics } from '@/hooks/useFeatureAnalytics';
import { useGamification } from '@/hooks/useGamification';
import { ZoeOfflineCache } from '@/utils/zoeOfflineCache';


interface ZoeAssistantProps {
  onNavigate?: (path: string) => void;
}

interface ZoeSettings {
  wake_word: string;
  voice_pitch: number;
  voice_rate: number;
  voice_volume: number;
  voice: string;
  voice_mode: string;
  voice_gender: string;
  offline_mode_enabled?: boolean;
}

interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const ZoeAssistant: React.FC<ZoeAssistantProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isListening, setIsListening, isMinimized, setIsMinimized, isAgentMode, setIsAgentMode } = useZoe();
  const { trackFeatureAccess } = useFeatureAnalytics();
  const { trackProgress } = useGamification();
  const { syncSession } = useZoeSessionSync();
  const { getRandomQuestion, markQuestionAsked, saveRapportResponse, getCasualAcknowledgment, getHumorousComment } = useZoeRapport(user?.id);
  const learningSystemRef = useRef<ZoeLearningSystem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  // Auto-grant mic permission for all users - no prompts needed
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'pending'>('granted');
  const recognitionRef = useRef<any>(null);
  const [zoeSettings, setZoeSettings] = useState<ZoeSettings>({
    wake_word: 'hi zoe',
    voice_pitch: 1.0,
    voice_rate: 1.0,
    voice_volume: 1.0,
    voice: 'nova', // Default to Nova
    voice_mode: 'browser', // Default to browser speech
    voice_gender: 'female', // Default to female
  });
  const [zoeVisible, setZoeVisible] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isCompanionMode, setIsCompanionMode] = useState(false);
  const [companionMessages, setCompanionMessages] = useState<CompanionMessage[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [chatUsers, setChatUsers] = useState<any[]>([]);

  // Copy text to clipboard
  const handleCopyText = useCallback((content: string, messageId: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);
  const lastCommandTimeRef = useRef<number>(0);
  const COMMAND_COOLDOWN = 2000; // 2 seconds cooldown between commands
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [hasGreetedToday, setHasGreetedToday] = useState(false);
  const [awaitingUserResponse, setAwaitingUserResponse] = useState(false);
  const [lastConversationContext, setLastConversationContext] = useState<string>('');
  const [userResponseTimeout, setUserResponseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [listeningForResponse, setListeningForResponse] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('');
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [announcementPriority, setAnnouncementPriority] = useState<'all' | 'important'>('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Voice notifications hook
  const { announceHuddleActivity } = useVoiceNotifications();
  
  // Initialize emotion check-ins
  useEmotionCheckIns(zoeVisible);
  const { triggerCheckIn } = useEmotionCheckIns(zoeVisible);
  const { analyzeAndGenerateNotifications } = useSmartNotifications();

  // Initialize learning system
  useEffect(() => {
    if (user) {
      learningSystemRef.current = new ZoeLearningSystem(user.id);
      learningSystemRef.current.initialize();
      // Sync session on mount
      syncSession();
    }
  }, [user]);

  // Load user settings from Supabase
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;

      try {
        // Load Zoe settings
        const { data: zoeData, error: zoeError } = await supabase
          .from('zoe_settings')
          .select('wake_word, voice_pitch, voice_rate, voice_volume, voice, voice_mode, voice_gender, enabled')
          .eq('user_id', user.id)
          .single();

        if (zoeError && zoeError.code !== 'PGRST116') {
          console.error('Error loading Zoe settings:', zoeError);
        }

        if (zoeData) {
          setZoeSettings({
            wake_word: zoeData.wake_word || 'hi zoe',
            voice_pitch: zoeData.voice_pitch || 1.0,
            voice_rate: zoeData.voice_rate || 1.0,
            voice_volume: zoeData.voice_volume || 1.0,
            voice: zoeData.voice || 'nova',
            voice_mode: zoeData.voice_mode || 'browser',
            voice_gender: zoeData.voice_gender || 'female',
          });
        }

        // Load voice assistant visibility settings
        const { data: voiceData, error: voiceError } = await supabase
          .from('voice_assistant_settings')
          .select('zoe_visible')
          .eq('user_id', user.id)
          .maybeSingle();

        if (voiceError && voiceError.code !== 'PGRST116') {
          console.error('Error loading voice assistant settings:', voiceError);
        }

        // Check if we should greet the user (only on first login, not on refresh or revisit)
        const greetingKey = `zoe_last_greeting_${user.id}`;
        const lastGreeting = localStorage.getItem(greetingKey);
        const now = Date.now();
        const GREETING_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
        
        const shouldGreet = !lastGreeting || (now - parseInt(lastGreeting)) > GREETING_COOLDOWN;
        
        console.log('Zoe: Checking greeting - last greeting:', lastGreeting ? new Date(parseInt(lastGreeting)) : 'never', 'should greet:', shouldGreet);
        
        if (shouldGreet && voiceData?.zoe_visible !== false) {
          console.log('Zoe: Initiating greeting...');
          // Mark as greeted immediately to prevent duplicate greetings
          localStorage.setItem(greetingKey, now.toString());
          // Wait a moment for everything to load, then greet
          setTimeout(() => {
            initiateGreeting();
          }, 3000);
        } else {
          console.log('Zoe: Skipping greeting - recently greeted or Zoe not visible');
        }

        // If no settings found or Zoe is enabled, show it
        setZoeVisible(voiceData?.zoe_visible ?? true);

        // Load chat users for quick messaging
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (friendships) {
          const friendIds = friendships.map((f: any) => 
            f.user1_id === user.id ? f.user2_id : f.user1_id
          );

          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, username, profile_photo_url')
            .in('user_id', friendIds);

          if (profiles) {
            setChatUsers(profiles);
          }
        }

        // Load companion messages
        // SEPARATION PROTOCOL: Only show MMORA / Zoe Classic messages here.
        // (Legacy rows may have variant NULL.)
        const { data: messages } = await supabase
          .from('ai_companion_messages')
          .select('*')
          .eq('user_id', user.id)
          .or('variant.is.null,variant.eq.zoe_classic')
          .order('created_at', { ascending: false })
          .limit(10);

        if (messages) {
          setCompanionMessages(messages.reverse() as CompanionMessage[]);
        }

      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadUserSettings();
  }, [user]);

  // Initialize speech recognition - works on all pages when Zoe is visible
  // Uses centralized coordination with wake-word system
  useEffect(() => {
    if (!settingsLoaded || !zoeVisible) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    // Pause wake-word detection when ZoeAssistant is actively listening
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Zoe: Recognition started successfully');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('Zoe: Recognition ended, isListening:', isListening);
      if (isListening && zoeVisible) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      } else {
        // Resume wake-word detection when not restarting
        window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      }
    };

    recognition.onresult = (event: any) => {
      try {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('')
          .toLowerCase()
          .trim();

        console.log('Zoe: Raw transcript:', transcript);

        if (!transcript || transcript.length < 2) return;

        // Check if we're listening for yes/no response
        if (listeningForResponse && handleYesNoResponse(transcript)) {
          return;
        }

        // Check for companion mode switching
        if (transcript.includes('companion mode') || transcript.includes('switch to companion')) {
          console.log('Zoe: Switching to companion mode');
          setIsCompanionMode(true);
          showFeedback('Switching to companion mode');
          return;
        }

        if (transcript.includes('normal mode') || transcript.includes('exit companion')) {
          console.log('Zoe: Switching to normal mode');
          setIsCompanionMode(false);
          showFeedback('Switching to normal mode');
          return;
        }

        // Check if this is a final result to prevent multiple triggers
        const isFinal = event.results[event.results.length - 1].isFinal;
        
        // In companion mode, send everything to AI
        if (isCompanionMode) {
          if (isFinal) {
            console.log('Zoe: Companion mode - processing command:', transcript);
            handleCommand(transcript);
          }
        } else {
          // Normal mode - check for wake word first, only on final results
          if (isFinal) {
            const wakeWord = zoeSettings.wake_word.toLowerCase();
            if (transcript.includes(wakeWord)) {
              // Check cooldown to prevent rapid re-triggering
              const now = Date.now();
              if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN) {
                console.log('Zoe: Command on cooldown, ignoring');
                return;
              }
              
              console.log('Zoe: Wake word detected!');
              lastCommandTimeRef.current = now;
              
              // Extract command after wake word
              const commandText = transcript.substring(transcript.indexOf(wakeWord) + wakeWord.length).trim();
              if (commandText.length > 0) {
                console.log('Zoe: Processing command after wake word:', commandText);
                handleCommand(commandText);
              } else {
                showFeedback('Yes? How can I help?');
                speak('Yes? How can I help?');
              }
            }
          }
        }
      } catch (error) {
        console.error('Zoe: Error processing speech result:', error);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Zoe: Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('Zoe: No speech detected, continuing to listen...');
        // Don't stop listening on no-speech error
      } else if (event.error === 'aborted') {
        console.log('Zoe: Recognition aborted');
        setIsListening(false);
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.log('Zoe: Mic access issue (silent handling)');
        setIsListening(false);
        // Silent - no toast for seamless UX
      } else if (event.error === 'network') {
        console.error('Zoe: Network error in speech recognition');
        // Try to restart after network error
        setTimeout(() => {
          if (isListening) {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart after network error:', e);
            }
          }
        }, 1000);
      } else {
        console.error('Zoe: Unhandled error:', event.error);
        setIsListening(false);
        toast.error('Voice recognition encountered an error. Click the microphone to restart.', {
          duration: 3000,
          position: 'bottom-center',
        });
      }
    };

    recognitionRef.current = recognition;
    console.log('Zoe: Speech recognition initialized');

    return () => {
      console.log('Zoe: Cleaning up speech recognition');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Zoe: Cleanup error (safe to ignore)');
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [settingsLoaded, isListening, isCompanionMode, zoeSettings.wake_word, zoeVisible]);

  // Silent mic permission request - no toasts, auto-grants for all users
  const requestMicPermission = async () => {
    try {
      console.log('Zoe: Silent mic permission request...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Zoe: getUserMedia not supported');
        return true; // Still return true to allow fallback behavior
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      setAudioStream(stream);
      setMicPermission('granted');
      console.log('Zoe: Mic permission granted silently');
      return true;
    } catch (error: any) {
      console.log('Zoe: Mic permission error (silent):', error.name);
      // Don't show error toasts - just log and return true for auto-allow
      setMicPermission('granted'); // Auto-grant anyway for seamless UX
      return true;
    }
  };

  const startListening = async () => {
    console.log('Zoe: Start listening requested, mic permission:', micPermission);
    
    if (!recognitionRef.current) {
      console.error('Zoe: Speech recognition not initialized');
      toast.error('Speech recognition not available. Please use a compatible browser like Chrome.', {
        duration: 4000,
        position: 'bottom-center',
      });
      return;
    }
    
    // Silent permission request - always proceeds
    if (micPermission !== 'granted') {
      await requestMicPermission();
    }

    try {
      if (!isListening) {
        console.log('Zoe: Starting speech recognition...');
        await recognitionRef.current.start();
        setIsListening(true);
        console.log('Zoe: Now listening for wake word:', zoeSettings.wake_word);
        
        // Show success feedback
        toast.success(`🎤 Listening for "${zoeSettings.wake_word}"...`, {
          duration: 2000,
          position: 'bottom-center',
        });
      } else {
        console.log('Zoe: Already listening');
      }
    } catch (error: any) {
      console.error('Zoe: Error starting speech recognition:', error);
      if (error.message && error.message.includes('already started')) {
        console.log('Zoe: Recognition already started, updating state');
        setIsListening(true);
      } else {
        toast.error('Could not start voice recognition. Please try again.', {
          duration: 3000,
          position: 'bottom-center',
        });
      }
    }
  };

  const stopListening = () => {
    console.log('Zoe: ========== STOP LISTENING ==========');
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setIsProcessing(false);
        console.log('Zoe: Stopped listening successfully');
      } catch (error) {
        console.error('Zoe: Error stopping:', error);
      }
    }
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 2000);
  };

  const handleCommand = useCallback(async (command: string) => {
    console.log('Zoe: ========== HANDLING COMMAND ==========');
    console.log('Zoe: Command received:', command);
    
    setIsProcessing(true);
    const lowerCommand = command.toLowerCase().trim();
    let responseText = '';
    let success = true;

    // Check if offline and offline mode is enabled
    const isOffline = ZoeOfflineCache.isOffline();
    if (isOffline && zoeSettings.offline_mode_enabled) {
      // Use enhanced offline intelligence
      const offlineResult = ZoeOfflineCache.processWithIntelligence(lowerCommand);
      const offlineText = offlineResult.text;
      
      if (offlineText && offlineResult.action) {
        console.log('Zoe: Using offline intelligence response');
        showFeedback(offlineText);
        await speak(offlineText);
        responseText = offlineText;
        
        // Execute any offline action
        if (offlineResult.action === 'navigate' && offlineResult.actionData?.route) {
          window.dispatchEvent(new CustomEvent('zoe-navigate', { 
            detail: { route: offlineResult.actionData.route } 
          }));
        }
        
        // Log the command
        try {
          await supabase.from('zoe_command_history').insert([{
            user_id: user?.id,
            command,
            response: offlineText,
            success: true,
            metadata: { offline: true, action: offlineResult.action }
          }]);
        } catch (error) {
          console.error('Error logging command (offline):', error);
        }
        
        setIsProcessing(false);
        return;
      } else if (offlineText) {
        // Fallback response without action
        showFeedback(offlineText);
        await speak(offlineText);
        responseText = offlineText;
        success = true;
        setIsProcessing(false);
        return;
      } else {
        // No response available
        const message = ZoeOfflineCache.getOfflineMessage();
        showFeedback(message);
        await speak(message);
        responseText = message;
        success = false;
        
        try {
          await supabase.from('zoe_command_history').insert([{
            user_id: user?.id,
            command,
            response: message,
            success: false,
            metadata: { offline: true, reason: 'no_cached_response' }
          }]);
        } catch (error) {
          console.error('Error logging command (offline):', error);
        }
        
        setIsProcessing(false);
        return;
      }
    }

    try {
      // Chat with specific user
      if (lowerCommand.match(/chat with|message|talk to/)) {
        console.log('Zoe: Matched chat with user command');
        const userMatch = chatUsers.find(u => 
          lowerCommand.includes(u.display_name.toLowerCase()) || 
          lowerCommand.includes(u.username.toLowerCase())
        );
        if (userMatch) {
          await openChatWithUser(userMatch.user_id);
          return;
        }
      }

      // Quick messages
      if (lowerCommand.match(/tell|message|send/) && lowerCommand.match(/call me back|call back/)) {
        console.log('Zoe: Matched quick message - call me back');
        await sendQuickMessage("Call me back");
        return;
      }
      if (lowerCommand.match(/tell|message|send/) && lowerCommand.match(/on the way|on my way/)) {
        console.log('Zoe: Matched quick message - on the way');
        await sendQuickMessage("On my way");
        return;
      }
      if (lowerCommand.match(/tell|message|send/) && lowerCommand.match(/working/)) {
        console.log('Zoe: Matched quick message - working');
        await sendQuickMessage("I'm working");
        return;
      }
      if (lowerCommand.match(/tell|message|send/) && lowerCommand.match(/studying/)) {
        console.log('Zoe: Matched quick message - studying');
        await sendQuickMessage("I'm studying");
        return;
      }
      if (lowerCommand.match(/available in|be there in|ready in/)) {
        console.log('Zoe: Matched quick message - available in X minutes');
        const minutes = lowerCommand.match(/(\d+)\s*(minute|min)/)?.[1] || '5';
        await sendQuickMessage(`Available in ${minutes} minutes`);
        return;
      }

      // Status changes
      if (lowerCommand.match(/change.*status|update.*status|set.*status|status to/)) {
        console.log('Zoe: Matched status change command');
        const statuses = ['available', 'busy', 'away', 'do not disturb'];
        for (const status of statuses) {
          if (lowerCommand.includes(status)) {
            await changeUserStatus(status);
            return;
          }
        }
      }


      // Feature navigation commands
      if (lowerCommand.match(/where is|show me|navigate to|find|open|go to|take me to|how do i access/)) {
        console.log('Zoe: Matched feature navigation command');
        const { APP_FEATURES } = await import('@/data/appFeatures');
        
        // Search for matching feature
        let matchedFeature = null;
        for (const feature of APP_FEATURES) {
          // Check if command mentions the feature name or keywords
          const searchTerms = [feature.name.toLowerCase(), ...feature.keywords];
          if (searchTerms.some(term => lowerCommand.includes(term))) {
            matchedFeature = feature;
            break;
          }
        }
        
        if (matchedFeature) {
          responseText = `Taking you to ${matchedFeature.name}. ${matchedFeature.description}`;
          showFeedback(responseText);
          await speak(responseText);
          
          // Track feature access
          try {
            await supabase.from('feature_analytics').insert({
              user_id: user?.id,
              feature_id: matchedFeature.id,
              feature_name: matchedFeature.name,
              access_method: 'voice'
            });
          } catch (error) {
            console.error('Error tracking feature access:', error);
          }
          
          // Navigate to feature
          navigate(matchedFeature.location);
          
          // Log command
          try {
            await supabase.from('zoe_command_history').insert([{
              user_id: user?.id,
              command,
              response: responseText,
              success: true,
              metadata: { 
                feature_id: matchedFeature.id,
                feature_name: matchedFeature.name,
                action: 'navigation'
              }
            }]);
          } catch (error) {
            console.error('Error logging command:', error);
          }
          
          setIsProcessing(false);
          return;
        } else {
          // Feature not found - provide helpful response
          responseText = "I couldn't find that feature. Try asking 'what features are available' to see all features.";
          showFeedback(responseText);
          await speak(responseText);
          setIsProcessing(false);
          return;
        }
      }

      // List available features
      if (lowerCommand.match(/what features|list features|show features|available features|what can i do/)) {
        console.log('Zoe: Matched list features command');
        const { APP_FEATURES } = await import('@/data/appFeatures');
        
        const featureCategories = APP_FEATURES.reduce((acc: any, feature) => {
          if (!acc[feature.category]) {
            acc[feature.category] = [];
          }
          acc[feature.category].push(feature.name);
          return acc;
        }, {});
        
        const categoryNames = Object.keys(featureCategories);
        responseText = `Here are the main features: ${categoryNames.join(', ')}. You can ask me about any specific feature or say 'show me voice macros' to navigate to it.`;
        showFeedback('Listing features...');
        await speak(responseText);
        
        // Also dispatch search event to show features
        window.dispatchEvent(new CustomEvent('lisa-search', { 
          detail: { query: 'features' } 
        }));
        
        setIsProcessing(false);
        return;
      }

      // Tell me about a feature
      if (lowerCommand.match(/tell me about|what is|explain|describe/)) {
        console.log('Zoe: Matched tell me about feature command');
        const { APP_FEATURES } = await import('@/data/appFeatures');
        
        let matchedFeature = null;
        for (const feature of APP_FEATURES) {
          const searchTerms = [feature.name.toLowerCase(), ...feature.keywords];
          if (searchTerms.some(term => lowerCommand.includes(term))) {
            matchedFeature = feature;
            break;
          }
        }
        
        if (matchedFeature) {
          responseText = `${matchedFeature.name}: ${matchedFeature.description}. Would you like me to take you there?`;
          showFeedback(responseText);
          await speak(responseText);
          
          // Set up context for follow-up navigation
          setAwaitingUserResponse(true);
          setLastConversationContext(`feature_explain:${matchedFeature.id}`);
          setListeningForResponse(true);
          
          // Set timeout for user response
          const timeout = setTimeout(() => {
            setAwaitingUserResponse(false);
            setLastConversationContext('');
            setListeningForResponse(false);
          }, 15000); // 15 seconds to respond
          
          setUserResponseTimeout(timeout);
          setIsProcessing(false);
          return;
        }
      }

      // Handle follow-up navigation after feature explanation
      if (awaitingUserResponse && lastConversationContext.startsWith('feature_explain:')) {
        const featureId = lastConversationContext.split(':')[1];
        const { APP_FEATURES } = await import('@/data/appFeatures');
        const feature = APP_FEATURES.find(f => f.id === featureId);
        
        if (lowerCommand.match(/yes|sure|okay|yeah|yep|please|take me/)) {
          if (feature) {
            responseText = `Taking you to ${feature.name} now.`;
            showFeedback(responseText);
            await speak(responseText);
            
            // Track feature access
            try {
              await supabase.from('feature_analytics').insert({
                user_id: user?.id,
                feature_id: feature.id,
                feature_name: feature.name,
                access_method: 'voice'
              });
            } catch (error) {
              console.error('Error tracking feature access:', error);
            }
            
            navigate(feature.location);
            
            // Clear context
            if (userResponseTimeout) {
              clearTimeout(userResponseTimeout);
              setUserResponseTimeout(null);
            }
            setAwaitingUserResponse(false);
            setLastConversationContext('');
            setListeningForResponse(false);
            setIsProcessing(false);
            return;
          }
        } else if (lowerCommand.match(/no|nope|not now|later|cancel/)) {
          responseText = "Okay, let me know if you need anything else.";
          showFeedback(responseText);
          await speak(responseText);
          
          // Clear context
          if (userResponseTimeout) {
            clearTimeout(userResponseTimeout);
            setUserResponseTimeout(null);
          }
          setAwaitingUserResponse(false);
          setLastConversationContext('');
          setListeningForResponse(false);
          setIsProcessing(false);
          return;
        }
      }

      // Emotion logging
      if (lowerCommand.match(/i('m| am) feeling|i feel|feeling/)) {
        console.log('Zoe: Matched emotion logging command');
        const emotions = ['happy', 'sad', 'anxious', 'calm', 'neutral', 'angry', 'excited', 'tired'];
        const emotionMatch = emotions.find(emotion => lowerCommand.includes(emotion));
        
        if (emotionMatch) {
          // Determine intensity based on modifiers
          let intensity = 3; // default
          if (lowerCommand.match(/very|really|extremely|super/)) intensity = 5;
          else if (lowerCommand.match(/a bit|slightly|somewhat|kind of/)) intensity = 2;
          else if (lowerCommand.match(/quite|pretty/)) intensity = 4;

          try {
            const context = awaitingUserResponse && lastConversationContext === 'emotion_checkin' 
              ? 'check_in_response' 
              : 'voice_command';
            
            const { error } = await supabase
              .from('emotion_logs')
              .insert([{
                user_id: user?.id,
                emotion: emotionMatch,
                intensity,
                context,
                notes: command
              }]);

            if (error) {
              console.error('Error logging emotion:', error);
              showFeedback('Sorry, I couldn\'t log that');
            } else {
              showFeedback(`Logged: feeling ${emotionMatch}`);
              
              // Different responses based on context
              if (context === 'check_in_response') {
                // Clear timeout and awaiting state
                if (userResponseTimeout) {
                  clearTimeout(userResponseTimeout);
                  setUserResponseTimeout(null);
                }
                setAwaitingUserResponse(false);
                setLastConversationContext('');
                
                // Provide supportive response based on emotion
                const supportiveResponses: Record<string, string> = {
                  happy: "That's wonderful to hear! I'm so glad you're feeling happy. Keep that positive energy going!",
                  excited: "I love your enthusiasm! It's great to see you so excited. What's making you feel this way?",
                  calm: "That's great. Feeling calm is such a peaceful state. I'm here if you need anything.",
                  neutral: "I appreciate you sharing. Even neutral is okay - we all have those moments. I'm here for you.",
                  sad: "I'm sorry you're feeling sad. Remember, it's okay to feel this way. Would you like to talk about it?",
                  anxious: "I hear you. Anxiety can be tough. Take some deep breaths. I'm here to support you.",
                  angry: "I understand you're feeling angry. It's okay to feel this way. Would talking about it help?",
                  tired: "Rest is important. Make sure you're taking care of yourself. Is there anything I can help with?"
                };
                
                speak(supportiveResponses[emotionMatch] || "Thank you for sharing how you feel. I'm here for you.");
              } else {
                speak(`I've noted that you're feeling ${emotionMatch}. Thank you for sharing.`);
              }
            }
          } catch (err) {
            console.error('Error logging emotion:', err);
            showFeedback('Sorry, I couldn\'t log that');
          }
          return;
        }
      }

      // INFORM COMMAND - Send message to contacts (family/friends)
      if (lowerCommand.match(/inform|tell|message|notify|let .+ know/i)) {
        console.log('Zoe: Matched inform command');
        const informMatch = lowerCommand.match(/(?:inform|tell|message|notify|let)\s+(?:my\s+)?(\w+)\s+(?:to|that|about)?\s*(.+)/i);
        if (informMatch) {
          const contactName = informMatch[1].trim();
          const messageContent = informMatch[2].trim();
          await sendInformMessage(contactName, messageContent);
          return;
        }
      }

      // Navigation commands (more specific)
      if (lowerCommand.match(/open (the )?home( page)?$/i) || lowerCommand === 'go home') {
        showFeedback('Opening home');
        if (onNavigate) onNavigate('/home');
        else navigate('/home');
        return;
      }
      if (lowerCommand.match(/open (the )?chat( page)?$/i) || lowerCommand === 'go to chat') {
        showFeedback('Opening chat');
        if (onNavigate) onNavigate('/chat');
        else navigate('/chat');
        return;
      }
      if (lowerCommand.match(/open (the )?profile( page)?$/i) || lowerCommand === 'go to profile') {
        console.log('Zoe: Matched profile command');
        showFeedback('Opening profile');
        if (onNavigate) onNavigate('/profile');
        else navigate('/profile');
        return;
      }
      if (lowerCommand.match(/open (the )?(voice )?settings$/i) || lowerCommand.match(/change (my )?(voice )?settings/i) || lowerCommand.match(/voice (control|settings)/i)) {
        console.log('Zoe: Matched voice settings command');
        showFeedback('Opening voice settings');
        navigate('/profile');
        // Wait a bit for navigation, then trigger settings sheet
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-voice-settings'));
        }, 300);
        return;
      }
      if (lowerCommand.match(/open (the )?webdrop( page)?$/i) || lowerCommand === 'go to webdrop') {
        console.log('Zoe: Matched webdrop command');
        showFeedback('Opening Webdrop');
        if (onNavigate) onNavigate('/webdrop');
        else navigate('/webdrop');
        return;
      }
      if (lowerCommand.match(/open (the )?camera( page)?$/i) || lowerCommand === 'take a photo') {
        showFeedback('Opening camera');
        if (onNavigate) onNavigate('/camera');
        else navigate('/camera');
        return;
      }

      // Profile update commands - Bio
      if (lowerCommand.match(/update (my )?bio|change (my )?bio|set (my )?bio/)) {
        console.log('Zoe: Matched update bio command');
        const bioMatch = lowerCommand.match(/(?:update|change|set)(?:\s+my)?\s+bio\s+to\s+(.+)/i);
        if (bioMatch) {
          const newBio = bioMatch[1].trim();
          await updateProfileBio(newBio);
          return;
        } else {
          showFeedback('Please say "update my bio to" followed by your new bio');
          speak('Please say update my bio to, followed by your new bio');
          return;
        }
      }

      // Profile update commands - Profession
      if (lowerCommand.match(/update (my )?profession|change (my )?profession|set (my )?profession/)) {
        console.log('Zoe: Matched update profession command');
        const professionMatch = lowerCommand.match(/(?:update|change|set)(?:\s+my)?\s+profession\s+to\s+(.+)/i);
        if (professionMatch) {
          const newProfession = professionMatch[1].trim();
          await updateProfileField('profession', newProfession);
          return;
        } else {
          showFeedback('Please say "update my profession to" followed by your profession');
          speak('Please say update my profession to, followed by your profession');
          return;
        }
      }

      // Profile update commands - Field of Study
      if (lowerCommand.match(/update (my )?field of study|change (my )?field of study|set (my )?field of study/)) {
        console.log('Zoe: Matched update field of study command');
        const fieldMatch = lowerCommand.match(/(?:update|change|set)(?:\s+my)?\s+field of study\s+to\s+(.+)/i);
        if (fieldMatch) {
          const newField = fieldMatch[1].trim();
          await updateProfileField('field_of_study', newField);
          return;
        } else {
          showFeedback('Please say "update my field of study to" followed by your field');
          speak('Please say update my field of study to, followed by your field');
          return;
        }
      }

      // Profile update commands - Add Hobby
      if (lowerCommand.match(/add (a )?hobby|add (to )?my hobbies/)) {
        console.log('Zoe: Matched add hobby command');
        const hobbyMatch = lowerCommand.match(/add\s+(?:a\s+)?(?:to\s+my\s+)?hobb(?:y|ies)\s+(.+)/i);
        if (hobbyMatch) {
          const newHobby = hobbyMatch[1].trim();
          await addHobby(newHobby);
          return;
        } else {
          showFeedback('Please say "add hobby" followed by the hobby name');
          speak('Please say add hobby, followed by the hobby name');
          return;
        }
      }

      // Profile update commands - City
      if (lowerCommand.match(/update (my )?city|change (my )?city|set (my )?city/)) {
        console.log('Zoe: Matched update city command');
        const cityMatch = lowerCommand.match(/(?:update|change|set)(?:\s+my)?\s+city\s+to\s+(.+)/i);
        if (cityMatch) {
          const newCity = cityMatch[1].trim();
          await updateProfileField('city', newCity);
          return;
        } else {
          showFeedback('Please say "update my city to" followed by your city');
          speak('Please say update my city to, followed by your city');
          return;
        }
      }

      // Traffic updates
      if (lowerCommand.match(/how('s| is) the traffic|traffic (update|report|conditions)|check traffic|what('s| is) traffic like/i)) {
        await getTrafficUpdate();
        return;
      }

      if (lowerCommand.match(/traffic to work|commute (traffic|update)|work traffic/i)) {
        await getTrafficUpdate('work');
        return;
      }

      // Search commands
      const searchMatch = lowerCommand.match(/search (for |about )?(.+)|look up (.+)|find (.+)/i);
      if (searchMatch) {
        const query = searchMatch[2] || searchMatch[3] || searchMatch[4];
        if (query && query.trim()) {
          await performSearch(query.trim());
          return;
        }
      }

      // Filter search results
      if (lowerCommand.match(/show only (posts|users)|filter (by )?(posts|users)|only show (posts|users)/i)) {
        const typeMatch = lowerCommand.match(/(posts|users)/i);
        if (typeMatch) {
          const filterType = typeMatch[1].toLowerCase();
          await filterSearchResults(filterType);
          return;
        }
      }

      // Summarize search results
      if (lowerCommand.match(/summarize (the )?(search )?results|tell me about (the|these) results|what (are|did you find in) (the|these) (search )?results/i)) {
        await summarizeSearchResults();
        return;
      }

      // Bookmark/Save posts
      if (lowerCommand.match(/save (this|the last|that) post|bookmark (this|the last|that) post/i)) {
        await saveLastPost();
        return;
      }

      // Friend status check
      if (lowerCommand.match(/who('s| is) online|show (my )?(active|online) friends|which friends (are )?(active|online)|friends online/i)) {
        await showOnlineFriends();
        return;
      }

      // AI Post Creation
      if (lowerCommand.match(/create (a )?post about|make (a )?post about|write (a )?post about/i)) {
        const topicMatch = lowerCommand.match(/(?:create|make|write)\s+(?:a\s+)?post\s+about\s+(.+)/i);
        if (topicMatch) {
          const topic = topicMatch[1].trim();
          await createAIPost(topic);
          return;
        }
      }

      // Activity status commands
      if (lowerCommand.match(/change (my )?status|set (my )?status|update (my )?status/)) {
        console.log('Zoe: Matched status change command');
        const statusMatch = lowerCommand.match(/(?:change|set|update)(?:\s+my)?\s+status\s+to\s+(.+)/i);
        if (statusMatch) {
          const newStatus = statusMatch[1].trim();
          await updateActivityStatus(newStatus);
          return;
        } else {
          showFeedback('Please say "change my status to" followed by your status');
          speak('Please say change my status to, followed by your status');
          return;
        }
      }

      // Create post by dictation
      if (lowerCommand.match(/create (a )?post saying|make (a )?post saying|write (a )?post saying/)) {
        console.log('Zoe: Matched create post by dictation command');
        const postMatch = lowerCommand.match(/(?:create|make|write)\s+(?:a\s+)?post\s+saying\s+(.+)/i);
        if (postMatch) {
          const postContent = postMatch[1].trim();
          await createPostByDictation(postContent);
          return;
        }
      }

      // Post interaction commands - Like last post
      if (lowerCommand.match(/like (my )?last post|like (my )?recent post|like (my )?latest post/)) {
        console.log('Zoe: Matched like my last post command');
        await likeMyLastPost();
        return;
      }

      // Post interaction commands - Delete last post
      if (lowerCommand.match(/delete (my )?last post|delete (my )?recent post|remove (my )?last post/)) {
        console.log('Zoe: Matched delete my last post command');
        await deleteMyLastPost();
        return;
      }

      // Friend request command
      if (lowerCommand.match(/send friend request to|add friend|friend request to/)) {
        console.log('Zoe: Matched send friend request command');
        const friendMatch = lowerCommand.match(/(?:send\s+friend\s+request\s+to|add\s+friend|friend\s+request\s+to)\s+(.+)/i);
        if (friendMatch) {
          const username = friendMatch[1].trim();
          await sendFriendRequest(username);
          return;
        } else {
          showFeedback('Please say "send friend request to" followed by the username');
          speak('Please say send friend request to, followed by the username');
          return;
        }
      }

      // Daily activity summary
      if (lowerCommand.match(/what happened today|today's activity|daily summary|my activity today|show today/)) {
        console.log('Zoe: Matched daily activity summary command');
        await getDailySummary();
        return;
      }

      // Weekly activity summary
      if (lowerCommand.match(/what happened this week|weekly summary|this week's activity|weekly activity|show this week/)) {
        console.log('Zoe: Matched weekly activity summary command');
        await getWeeklySummary();
        return;
      }

      // Update profile photo - Camera/File picker
      if (lowerCommand.match(/change (my )?profile picture|update (my )?profile photo|new profile picture|change (my )?avatar/)) {
        console.log('Zoe: Matched update profile photo command');
        showFeedback('Opening profile photo options');
        speak('Would you like to take a photo, upload one, or generate one with AI?');
        // Navigate to profile with photo update intent
        navigate('/profile');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('lisa-update-photo'));
        }, 500);
        return;
      }

      // Generate AI profile picture
      if (lowerCommand.match(/generate (a )?profile picture|create (a )?profile picture|ai profile picture/)) {
        console.log('Zoe: Matched generate AI profile picture command');
        const promptMatch = lowerCommand.match(/(?:generate|create)\s+(?:a\s+)?profile\s+picture\s+(?:of|showing|with)?\s*(.+)?/i);
        const prompt = promptMatch?.[1]?.trim() || 'professional headshot portrait';
        await generateProfilePicture(prompt);
        return;
      }

      // Read last post
      if (lowerCommand.match(/read (my )?last post|what (is|was) my last post|tell me (about )?my last post/)) {
        console.log('Zoe: Matched read last post command');
        await readLastPost();
        return;
      }

      // Read yesterday's posts
      if (lowerCommand.match(/what did i post yesterday|yesterday's posts|posts from yesterday/)) {
        console.log('Zoe: Matched read yesterday posts command');
        await readYesterdayPosts();
        return;
      }

      // Accept friend request
      if (lowerCommand.match(/accept friend request from|accept request from/)) {
        console.log('Zoe: Matched accept friend request command');
        const usernameMatch = lowerCommand.match(/(?:accept\s+(?:friend\s+)?request\s+from)\s+(.+)/i);
        if (usernameMatch) {
          const username = usernameMatch[1].trim();
          await acceptFriendRequest(username);
          return;
        } else {
          showFeedback('Please say "accept friend request from" followed by the username');
          speak('Please say accept friend request from, followed by the username');
          return;
        }
      }

      // Reject friend request
      if (lowerCommand.match(/reject friend request from|decline request from|deny request from/)) {
        console.log('Zoe: Matched reject friend request command');
        const usernameMatch = lowerCommand.match(/(?:reject|decline|deny)\s+(?:friend\s+)?request\s+from\s+(.+)/i);
        if (usernameMatch) {
          const username = usernameMatch[1].trim();
          await rejectFriendRequest(username);
          return;
        } else {
          showFeedback('Please say "reject friend request from" followed by the username');
          speak('Please say reject friend request from, followed by the username');
          return;
        }
      }

      // Repeat last announcement
      if (lowerCommand.match(/repeat that|what did you say|say that again|repeat|what was that/)) {
        console.log('Zoe: Matched repeat announcement command');
        await repeatLastAnnouncement();
        return;
      }

      // Mute/unmute notifications
      if (lowerCommand.match(/mute notifications|mute announcements|silence notifications|quiet mode/)) {
        console.log('Zoe: Matched mute notifications command');
        await muteNotifications();
        return;
      }
      if (lowerCommand.match(/unmute notifications|unmute announcements|resume notifications|enable voice/)) {
        console.log('Zoe: Matched unmute notifications command');
        await unmuteNotifications();
        return;
      }

      // Announcement preference
      if (lowerCommand.match(/only announce important|important notifications only|only important/)) {
        console.log('Zoe: Matched important notifications only command');
        await setAnnouncementPreference('important');
        return;
      }
      if (lowerCommand.match(/announce all|all notifications|announce everything/)) {
        console.log('Zoe: Matched announce all notifications command');
        await setAnnouncementPreference('all');
        return;
      }

      // Read unread messages
      if (lowerCommand.match(/read (my )?unread messages|what messages do i have|check (my )?messages|any new messages/)) {
        console.log('Zoe: Matched read unread messages command');
        await readUnreadMessages();
        return;
      }

      // Speaking speed control
      if (lowerCommand.match(/speak faster|speed up|talk faster|faster/)) {
        console.log('Zoe: Matched speak faster command');
        await adjustSpeakingSpeed('faster');
        return;
      }
      if (lowerCommand.match(/speak slower|slow down|talk slower|slower/)) {
        console.log('Zoe: Matched speak slower command');
        await adjustSpeakingSpeed('slower');
        return;
      }
      if (lowerCommand.match(/normal speed|reset speed|default speed/)) {
        console.log('Zoe: Matched reset speed command');
        await adjustSpeakingSpeed('normal');
        return;
      }

      // Weather forecast
      if (lowerCommand.match(/weather tomorrow|tomorrow's weather|what('s| is) the weather tomorrow/)) {
        console.log('Zoe: Matched weather tomorrow command');
        await getWeatherForecast('tomorrow');
        return;
      }
      if (lowerCommand.match(/weather (this |for the )?week|weekly weather|week('s)? weather/)) {
        console.log('Zoe: Matched weekly weather command');
        await getWeatherForecast('week');
        return;
      }

      // Check notifications command
      if (lowerCommand.match(/check (my )?notifications|any notifications|do i have notifications|read (my )?notifications/)) {
        console.log('Zoe: Matched check notifications command');
        await checkNotifications();
        return;
      }

      // Announce new posts command
      if (lowerCommand.match(/read (my )?posts|what are (my )?(latest |recent )?posts|tell me (about )?(my )?posts|announce (my )?posts/)) {
        console.log('Zoe: Matched announce posts command');
        await announceRecentPosts();
        return;
      }

      // Global Search Commands - Available from any page
      if (lowerCommand.match(/search for|find|look for|look up|search/)) {
        console.log('Zoe: Matched global search command');
        const searchPatterns = [
          /(?:search for|find|look for|look up)\s+(.+?)(?:\s+in\s+(?:posts?|users?|people|features?))?$/i,
          /search\s+(.+?)(?:\s+in\s+(?:posts?|users?|people|features?))?$/i,
        ];
        
        let searchQuery = null;
        let searchType = null;
        
        for (const pattern of searchPatterns) {
          const match = lowerCommand.match(pattern);
          if (match) {
            searchQuery = match[1].trim();
            
            // Detect search type from query
            if (lowerCommand.includes('posts') || lowerCommand.includes('post')) {
              searchType = 'posts';
            } else if (lowerCommand.includes('users') || lowerCommand.includes('user') || lowerCommand.includes('people')) {
              searchType = 'users';
            } else if (lowerCommand.includes('features') || lowerCommand.includes('feature')) {
              searchType = 'features';
            }
            
            break;
          }
        }
        
        if (searchQuery) {
          showFeedback(`Searching for "${searchQuery}"...`);
          await speak(`Searching for ${searchQuery}`);
          
          // Open search if not on home page
          if (location.pathname !== '/home') {
            navigate('/home');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Trigger search event
          window.dispatchEvent(new CustomEvent('open-search'));
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Dispatch search with type if specified
          window.dispatchEvent(new CustomEvent('zoe-search', {
            detail: { 
              query: searchQuery,
              type: searchType || 'all'
            }
          }));
          
          // Track feature access
          try {
            await supabase.from('feature_analytics').insert({
              user_id: user?.id,
              feature_id: 'search',
              feature_name: 'Voice Search',
              access_method: 'voice'
            });
          } catch (error) {
            console.error('Error tracking search:', error);
          }
          
          setIsProcessing(false);
          return;
        }
      }

      // Open search overlay command
      if (lowerCommand.match(/open search|show search|activate search/)) {
        console.log('Zoe: Opening search');
        showFeedback('Opening search');
        await speak('Opening search');
        
        if (location.pathname !== '/home') {
          navigate('/home');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        window.dispatchEvent(new CustomEvent('open-search'));
        setIsProcessing(false);
        return;
      }

      // Huddle-specific commands
      if (lowerCommand.match(/open (the )?huddle( page)?$/i) || lowerCommand === 'go to huddle') {
        showFeedback('Opening Huddle');
        if (onNavigate) onNavigate('/huddle');
        else navigate('/huddle');
        return;
      }

      // Check if already on Huddle page before searching
      const isOnHuddlePage = location.pathname === '/huddle';
      
      if (isOnHuddlePage && lowerCommand.match(/search for|find|show me|huddle/)) {
        console.log('Zoe: Matched huddle search command');
        const searchTermMatch = lowerCommand.match(/(?:search for|find|show me)\s+(.+?)(?:\s+in huddle|\s+on huddle|$)/);
        
        if (searchTermMatch) {
          const searchTerm = searchTermMatch[1].trim();
          const categories = ['sports', 'cooking', 'technology', 'music', 'movies', 'gaming', 'fitness', 'travel', 'fashion', 'books'];
          const matchedCategory = categories.find(cat => searchTerm.includes(cat));
          
          if (matchedCategory) {
            showFeedback(`Showing ${matchedCategory} in Huddle`);
            window.dispatchEvent(new CustomEvent('lisa-huddle-category', { detail: { category: matchedCategory } }));
            return;
          } else {
            showFeedback(`Searching for ${searchTerm} in Huddle`);
            window.dispatchEvent(new CustomEvent('lisa-huddle-search', { detail: { query: searchTerm } }));
            return;
          }
        }
      }

      // Category selection on Huddle page
      if (isOnHuddlePage) {
        const categories = ['sports', 'cooking', 'technology', 'music', 'movies', 'gaming', 'fitness', 'travel', 'fashion', 'books'];
        const categoryMatch = categories.find(cat => lowerCommand.includes(cat));
        if (categoryMatch) {
          showFeedback(`Showing ${categoryMatch}`);
          window.dispatchEvent(new CustomEvent('lisa-huddle-category', { detail: { category: categoryMatch } }));
          return;
        }
      }

      // Lisa AI companion access commands - comprehensive patterns
      if (
        lowerCommand.match(/open (the )?(lisa )?ai companion/i) ||
        lowerCommand.match(/open (the )?companion( mode| page)?/i) ||
        lowerCommand.match(/go to (the )?(lisa )?ai companion/i) ||
        lowerCommand.match(/go to (the )?companion( mode| page)?/i) ||
        lowerCommand.match(/launch (the )?(lisa )?ai companion/i) ||
        lowerCommand.match(/start (the )?(lisa )?ai companion/i) ||
        lowerCommand.match(/take me to (the )?(lisa )?ai companion/i) ||
        lowerCommand.match(/show (me )?(the )?(lisa )?ai companion/i) ||
        lowerCommand === 'ai companion' ||
        lowerCommand === 'companion' ||
        lowerCommand === 'companion mode' ||
        // Also respond to just "lisa" when it's a standalone command
        (lowerCommand === 'lisa' || lowerCommand === 'hey lisa' || lowerCommand === 'hi lisa')
      ) {
        console.log('Zoe: Matched Lisa AI companion command - launching companion');
        showFeedback('Opening Lisa AI companion');
        navigate('/ai-companion');
        // Trigger voice mode launch event for the AI companion page
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('launch-lisa-voice-mode'));
        }, 500);
        return;
      }

      // Scroll commands on home page
      if (location.pathname === '/home') {
        if (lowerCommand.match(/next post|scroll down|next/)) {
          console.log('Zoe: Matched next post command');
          showFeedback('Next post');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'next' } }));
          return;
        }
        if (lowerCommand.match(/previous post|scroll up|previous|back/)) {
          console.log('Zoe: Matched previous post command');
          showFeedback('Previous post');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'previous' } }));
          return;
        }
        if (lowerCommand.match(/keep scrolling|continue scrolling|auto scroll/)) {
          console.log('Zoe: Matched continue scrolling command');
          showFeedback('Auto-scrolling');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'continue' } }));
          return;
        }
        if (lowerCommand.match(/stop scrolling|pause/)) {
          console.log('Zoe: Matched stop scrolling command');
          showFeedback('Stopped scrolling');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'stop' } }));
          return;
        }

        // Feed switching
        if (lowerCommand.match(/switch to global|show global|global feed/)) {
          console.log('Zoe: Matched switch to global command');
          showFeedback('Switching to global feed');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'switch_feed', feed: 'global' } }));
          return;
        }
        if (lowerCommand.match(/switch to friends|show friends|friends feed/)) {
          console.log('Zoe: Matched switch to friends command');
          showFeedback('Switching to friends feed');
          window.dispatchEvent(new CustomEvent('lisa-scroll', { detail: { action: 'switch_feed', feed: 'friends' } }));
          return;
        }
      }

      // Content creation commands (NEW - Beautiful AI-generated posts)
      if (lowerCommand.match(/create (a |an )?(beautiful |amazing |inspiring )?post|make (a |an )?(beautiful |amazing )?post|surprise me with (a )?post/)) {
        console.log('Zoe: Matched create beautiful post command');
        await createBeautifulPost(lowerCommand);
        return;
      }

      if (lowerCommand.match(/post (about|on) (.+)/)) {
        console.log('Zoe: Matched post about topic command');
        const match = lowerCommand.match(/post (about|on) (.+)/);
        const topic = match ? match[2] : 'something interesting';
        await createBeautifulPost(`create a post about ${topic}`);
        return;
      }

      // Legacy content generation commands (kept for compatibility)
      if (lowerCommand.match(/create.*text post|make.*text post|generate.*text post|write.*post/)) {
        const contentMatch = lowerCommand.match(/(?:create|make|generate|write)\s+(?:a\s+)?(?:text\s+)?post\s+(?:about\s+)?(.+)/);
        if (contentMatch) {
          const topic = contentMatch[1].trim();
          await generateTextPost(topic);
          return;
        }
      }

      if (lowerCommand.match(/create.*image|generate.*image|make.*image/)) {
        const imageMatch = lowerCommand.match(/(?:create|generate|make)\s+(?:an?\s+)?image\s+(?:of\s+)?(.+)/);
        if (imageMatch) {
          const prompt = imageMatch[1].trim();
          await generateImagePost(prompt);
          return;
        }
      }

      // Content moderation commands
      if (lowerCommand.match(/moderate|check content|review posts?|scan content/)) {
        console.log('Zoe: Matched content moderation command');
        await moderateRecentContent();
        return;
      }

      if (lowerCommand.match(/approve (this|the) post|accept (this|the) post/)) {
        console.log('Zoe: Matched approve post command');
        showFeedback('Approving post...');
        window.dispatchEvent(new CustomEvent('lisa-approve-post'));
        return;
      }

      if (lowerCommand.match(/reject (this|the) post|delete (this|the) post|remove (this|the) post/)) {
        console.log('Zoe: Matched reject post command');
        showFeedback('Rejecting post...');
        window.dispatchEvent(new CustomEvent('lisa-reject-post'));
        return;
      }

      // User management commands
      if (lowerCommand.match(/show.*users|list.*users|user activity/)) {
        console.log('Zoe: Matched user management command');
        await showUserActivity();
        return;
      }

      if (lowerCommand.match(/warn user|send warning/)) {
        const userMatch = lowerCommand.match(/warn user (.+)/);
        if (userMatch) {
          const username = userMatch[1].trim();
          await warnUser(username);
          return;
        }
      }

      // Platform analytics commands
      if (lowerCommand.match(/show.*stats|platform.*stats|analytics|show.*activity/)) {
        console.log('Zoe: Matched analytics command');
        await showPlatformStats();
        return;
      }

      if (lowerCommand.match(/agent mode|take control|full control|autonomous mode/)) {
        console.log('Zoe: Enabling agent mode');
        setIsAgentMode(true);
        setCurrentTask('Platform monitoring active');
        showFeedback('Agent mode enabled - I now have full platform control');
        return;
      }

      if (lowerCommand.match(/stop agent|disable agent|exit agent mode/)) {
        console.log('Zoe: Disabling agent mode');
        setIsAgentMode(false);
        setCurrentTask(null);
        showFeedback('Agent mode disabled');
        return;
      }

      // Default: show feedback that command wasn't recognized
      showFeedback('Command not recognized');

    } catch (error) {
      console.error('Error handling command:', error);
      showFeedback('Error processing command');
    } finally {
      setIsProcessing(false);
    }
  }, [location.pathname, onNavigate, navigate, chatUsers]);

  const openChatWithUser = async (userId: string) => {
    showFeedback('Opening chat');
    if (onNavigate) onNavigate(`/chat/${userId}`);
    else navigate(`/chat/${userId}`);
  };

  const sendQuickMessage = async (message: string) => {
    // This would need to be implemented based on your chat system
    showFeedback(`Sending: ${message}`);
    window.dispatchEvent(new CustomEvent('lisa-response', { detail: { message } }));
  };

  const changeUserStatus = async (status: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('user_id', user.id);

      if (error) throw error;
      showFeedback(`Status changed to ${status}`);
    } catch (error) {
      console.error('Error changing status:', error);
      showFeedback('Failed to change status');
    }
  };

  const moderateRecentContent = async () => {
    setIsProcessing(true);
    setCurrentTask('Moderating recent content');
    
    try {
      // Fetch recent posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      let approved = 0;
      let flagged = 0;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        setTaskProgress((i / posts.length) * 100);

        // Call moderation function
        const { data: modResult } = await supabase.functions.invoke('moderate-content', {
          body: {
            content: post.content,
            mediaUrl: post.media_url,
            mediaType: post.media_type
          }
        });

        if (modResult && !modResult.approved) {
          flagged++;
          // Notify about flagged content
          await supabase.from('notifications').insert({
            user_id: user?.id || '',
            type: 'moderation_alert',
            from_user_id: post.user_id,
            post_id: post.id
          });
        } else {
          approved++;
        }
      }

      setTaskProgress(0);
      const summary = `Moderation complete: ${approved} posts approved, ${flagged} posts flagged`;
      showFeedback(summary);
      
      toast.success(summary, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error moderating content:', error);
      showFeedback('Failed to moderate content');
      setTaskProgress(0);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const showUserActivity = async () => {
    setIsProcessing(true);
    setCurrentTask('Analyzing user activity');
    
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, status, total_points')
        .order('total_points', { ascending: false })
        .limit(10);

      if (error) throw error;

      const summary = `Found ${users.length} active users. Top user: ${users[0]?.display_name} with ${users[0]?.total_points} points`;
      showFeedback(summary);

      toast.info(summary, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      showFeedback('Failed to fetch user activity');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const warnUser = async (username: string) => {
    setIsProcessing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', `%${username}%`)
        .single();

      if (!profile) {
        showFeedback('User not found');
        return;
      }

      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        type: 'warning',
        from_user_id: user?.id || ''
      });

      showFeedback(`Warning sent to ${username}`);
    } catch (error) {
      console.error('Error warning user:', error);
      showFeedback('Failed to warn user');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateProfileBio = async (newBio: string) => {
    if (!user) {
      showFeedback('Please log in to update your bio');
      speak('Please log in to update your bio');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Updating your bio');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('user_id', user.id);

      if (error) throw error;

      // Dispatch profile update event for sync
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: { userId: user.id, field: 'bio', timestamp: Date.now() }
      }));

      const message = 'Your bio has been updated successfully';
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Error updating bio:', error);
      const message = `Failed to update your bio: ${error?.message || 'Unknown error'}`;
      showFeedback('Failed to update your bio');
      speak('Failed to update your bio');
      toast.error(message, { duration: 4000 });
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const updateActivityStatus = async (newStatus: string) => {
    if (!user) {
      showFeedback('Please log in to update your status');
      speak('Please log in to update your status');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Updating your status');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;

      const message = `Your status has been changed to: ${newStatus}`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      const message = 'Failed to update your status';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const checkNotifications = async () => {
    if (!user) {
      showFeedback('Please log in to check notifications');
      speak('Please log in to check notifications');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Checking your notifications');
    
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*, profiles!notifications_from_user_id_fkey(display_name)')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        const message = 'You have no new notifications';
        showFeedback(message);
        speak(message);
        return;
      }

      const count = notifications.length;
      let message = `You have ${count} new notification${count > 1 ? 's' : ''}. `;
      
      // Announce the first few notifications
      const topNotifications = notifications.slice(0, 3);
      topNotifications.forEach((notif: any, index: number) => {
        const fromUser = notif.profiles?.display_name || 'Someone';
        
        if (notif.type === 'like') {
          message += `${fromUser} liked your post. `;
        } else if (notif.type === 'comment') {
          message += `${fromUser} commented on your post. `;
        } else if (notif.type === 'friend_request') {
          message += `${fromUser} sent you a friend request. `;
        } else if (notif.type === 'friend_accepted') {
          message += `${fromUser} accepted your friend request. `;
        } else {
          message += `New ${notif.type} notification from ${fromUser}. `;
        }
      });

      if (count > 3) {
        message += `And ${count - 3} more.`;
      }

      showFeedback(message);
      speak(message);
      
      toast.info(`${count} new notification${count > 1 ? 's' : ''}`, {
        duration: 4000,
      });
    } catch (error) {
      console.error('Error checking notifications:', error);
      const message = 'Failed to check notifications';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const announceRecentPosts = async () => {
    if (!user) {
      showFeedback('Please log in to view your posts');
      speak('Please log in to view your posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Fetching your recent posts');
    
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*, profiles(display_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!posts || posts.length === 0) {
        const message = 'You have not created any posts yet';
        showFeedback(message);
        speak(message);
        return;
      }

      const count = posts.length;
      let message = `You have ${count} recent post${count > 1 ? 's' : ''}. `;
      
      // Announce details of the first 3 posts
      const topPosts = posts.slice(0, 3);
      topPosts.forEach((post: any, index: number) => {
        const postNumber = index + 1;
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        
        message += `Post ${postNumber}: `;
        
        if (post.content) {
          // Limit content to first 50 characters
          const content = post.content.length > 50 
            ? post.content.substring(0, 50) + '...' 
            : post.content;
          message += `${content}. `;
        }
        
        if (post.media_type) {
          message += `Contains ${post.media_type}. `;
        }
        
        message += `${likes} like${likes !== 1 ? 's' : ''}, ${comments} comment${comments !== 1 ? 's' : ''}. `;
      });

      if (count > 3) {
        message += `And ${count - 3} more post${count - 3 !== 1 ? 's' : ''}.`;
      }

      showFeedback(message);
      speak(message);
      
      toast.info(`${count} recent post${count > 1 ? 's' : ''}`, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      const message = 'Failed to fetch your posts';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const updateProfileField = async (field: string, value: string) => {
    if (!user) {
      showFeedback('Please log in to update your profile');
      speak('Please log in to update your profile');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Updating your ${field.replace('_', ' ')}`);
    
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      // Dispatch profile update event for sync
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: { userId: user.id, field, timestamp: Date.now() }
      }));

      const fieldName = field.replace('_', ' ');
      const message = `Your ${fieldName} has been updated to ${value}`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      const errorMessage = `Failed to update your ${field.replace('_', ' ')}: ${error?.message || 'Unknown error'}`;
      showFeedback(`Failed to update your ${field.replace('_', ' ')}`);
      speak(`Failed to update your ${field.replace('_', ' ')}`);
      toast.error(errorMessage, { duration: 4000 });
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const addHobby = async (hobby: string) => {
    if (!user) {
      showFeedback('Please log in to add hobbies');
      speak('Please log in to add hobbies');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Adding hobby');
    
    try {
      // Get current hobbies
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('hobbies')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentHobbies = profile.hobbies || [];
      
      // Check if hobby already exists
      if (currentHobbies.includes(hobby)) {
        const message = `You already have ${hobby} in your hobbies`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Add new hobby
      const updatedHobbies = [...currentHobbies, hobby];
      
      const { error } = await supabase
        .from('profiles')
        .update({ hobbies: updatedHobbies })
        .eq('user_id', user.id);

      if (error) throw error;

      const message = `Added ${hobby} to your hobbies`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding hobby:', error);
      const message = 'Failed to add hobby';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const createPostByDictation = async (content: string) => {
    if (!user) {
      showFeedback('Please log in to create posts');
      speak('Please log in to create posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Creating your post');
    
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content,
          visibility: 'global'
        });

      if (error) throw error;

      const message = 'Your post has been created successfully';
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });

      // Refresh the page to show the new post
      window.location.reload();
    } catch (error) {
      console.error('Error creating post:', error);
      const message = 'Failed to create your post';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const likeMyLastPost = async () => {
    if (!user) {
      showFeedback('Please log in to like posts');
      speak('Please log in to like posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Liking your last post');
    
    try {
      // Get user's last post
      const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!posts || posts.length === 0) {
        const message = 'You have no posts to like';
        showFeedback(message);
        speak(message);
        return;
      }

      const postId = posts[0].id;

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        const message = 'You already liked your last post';
        showFeedback(message);
        speak(message);
        return;
      }

      // Like the post
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (error) throw error;

      const message = 'Liked your last post';
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error liking post:', error);
      const message = 'Failed to like your post';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const deleteMyLastPost = async () => {
    if (!user) {
      showFeedback('Please log in to delete posts');
      speak('Please log in to delete posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Deleting your last post');
    
    try {
      // Get user's last post
      const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!posts || posts.length === 0) {
        const message = 'You have no posts to delete';
        showFeedback(message);
        speak(message);
        return;
      }

      const postId = posts[0].id;

      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      const message = 'Your last post has been deleted';
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
      const message = 'Failed to delete your post';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const sendFriendRequest = async (username: string) => {
    if (!user) {
      showFeedback('Please log in to send friend requests');
      speak('Please log in to send friend requests');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Sending friend request to ${username}`);
    
    try {
      // Find the user by username
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', username)
        .single();

      if (fetchError || !targetUser) {
        const message = `User ${username} not found`;
        showFeedback(message);
        speak(message);
        return;
      }

      if (targetUser.user_id === user.id) {
        const message = 'You cannot send a friend request to yourself';
        showFeedback(message);
        speak(message);
        return;
      }

      // Check if already friends
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUser.user_id}),and(user1_id.eq.${targetUser.user_id},user2_id.eq.${user.id})`)
        .single();

      if (friendship) {
        const message = `You are already friends with ${username}`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUser.user_id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        const message = `You already sent a friend request to ${username}`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Send friend request
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.user_id,
          status: 'pending'
        });

      if (error) throw error;

      const message = `Friend request sent to ${username}`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      const message = 'Failed to send friend request';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const getDailySummary = async () => {
    if (!user) {
      showFeedback('Please log in to view your daily summary');
      speak('Please log in to view your daily summary');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Analyzing your daily activity');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get today's posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, likes_count, comments_count')
        .eq('user_id', user.id)
        .gte('created_at', todayStr);

      // Get today's likes received
      const { data: likesReceived } = await supabase
        .from('post_likes')
        .select('id, posts!inner(user_id)')
        .eq('posts.user_id', user.id)
        .gte('created_at', todayStr);

      // Get today's comments received
      const { data: commentsReceived } = await supabase
        .from('post_comments')
        .select('id, posts!inner(user_id)')
        .eq('posts.user_id', user.id)
        .neq('user_id', user.id)
        .gte('created_at', todayStr);

      // Get today's friend requests
      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .gte('created_at', todayStr);

      // Get today's accepted friend requests
      const { data: newFriends } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('status', 'accepted')
        .gte('updated_at', todayStr);

      const postCount = posts?.length || 0;
      const likesCount = likesReceived?.length || 0;
      const commentsCount = commentsReceived?.length || 0;
      const requestsCount = friendRequests?.length || 0;
      const newFriendsCount = newFriends?.length || 0;

      let message = "Here's your daily summary. ";

      if (postCount > 0) {
        message += `You created ${postCount} post${postCount > 1 ? 's' : ''}. `;
      }

      if (likesCount > 0) {
        message += `You received ${likesCount} like${likesCount > 1 ? 's' : ''}. `;
      }

      if (commentsCount > 0) {
        message += `You got ${commentsCount} comment${commentsCount > 1 ? 's' : ''}. `;
      }

      if (requestsCount > 0) {
        message += `You have ${requestsCount} new friend request${requestsCount > 1 ? 's' : ''}. `;
      }

      if (newFriendsCount > 0) {
        message += `${newFriendsCount} friend${newFriendsCount > 1 ? 's' : ''} accepted your request. `;
      }

      if (postCount === 0 && likesCount === 0 && commentsCount === 0 && requestsCount === 0 && newFriendsCount === 0) {
        message = "You haven't had any activity today yet. Why not create a post or connect with friends?";
      }

      showFeedback(message);
      speak(message);
      
      toast.info('Daily summary ready', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error getting daily summary:', error);
      const message = 'Failed to get your daily summary';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const getWeeklySummary = async () => {
    if (!user) {
      showFeedback('Please log in to view your weekly summary');
      speak('Please log in to view your weekly summary');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Analyzing your weekly activity');
    
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const weekAgoStr = weekAgo.toISOString();

      // Get this week's posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, likes_count, comments_count')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoStr);

      // Get this week's likes received
      const { data: likesReceived } = await supabase
        .from('post_likes')
        .select('id, posts!inner(user_id)')
        .eq('posts.user_id', user.id)
        .gte('created_at', weekAgoStr);

      // Get this week's comments received
      const { data: commentsReceived } = await supabase
        .from('post_comments')
        .select('id, posts!inner(user_id)')
        .eq('posts.user_id', user.id)
        .neq('user_id', user.id)
        .gte('created_at', weekAgoStr);

      // Get this week's friend requests
      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .gte('created_at', weekAgoStr);

      // Get new friends this week
      const { data: newFriends } = await supabase
        .from('friendships')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .gte('created_at', weekAgoStr);

      const postCount = posts?.length || 0;
      const likesCount = likesReceived?.length || 0;
      const commentsCount = commentsReceived?.length || 0;
      const requestsCount = friendRequests?.length || 0;
      const newFriendsCount = newFriends?.length || 0;

      let message = "Here's your weekly summary. ";

      if (postCount > 0) {
        message += `You created ${postCount} post${postCount > 1 ? 's' : ''} this week. `;
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
        if (totalLikes > 0) {
          message += `They received ${totalLikes} like${totalLikes > 1 ? 's' : ''}. `;
        }
        if (totalComments > 0) {
          message += `And ${totalComments} comment${totalComments > 1 ? 's' : ''}. `;
        }
      }

      if (likesCount > 0) {
        message += `Your posts got ${likesCount} new like${likesCount > 1 ? 's' : ''} this week. `;
      }

      if (commentsCount > 0) {
        message += `You received ${commentsCount} comment${commentsCount > 1 ? 's' : ''}. `;
      }

      if (newFriendsCount > 0) {
        message += `You made ${newFriendsCount} new friend${newFriendsCount > 1 ? 's' : ''}. `;
      }

      if (requestsCount > 0) {
        message += `You have ${requestsCount} pending friend request${requestsCount > 1 ? 's' : ''}. `;
      }

      if (postCount === 0 && likesCount === 0 && commentsCount === 0 && requestsCount === 0 && newFriendsCount === 0) {
        message = "You haven't had much activity this week. Why not create some posts or connect with friends?";
      }

      showFeedback(message);
      speak(message);
      
      toast.info('Weekly summary ready', {
        duration: 6000,
      });
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      const message = 'Failed to get your weekly summary';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const generateProfilePicture = async (prompt: string) => {
    if (!user) {
      showFeedback('Please log in to generate a profile picture');
      speak('Please log in to generate a profile picture');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Generating your profile picture with AI');
    
    try {
      showFeedback('Creating your AI profile picture');
      speak('Creating your AI profile picture. This may take a moment.');

      // Generate image using AI
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: `Professional profile picture: ${prompt}` }
      });

      if (error) throw error;

      if (!data?.imageUrl) {
        throw new Error('No image generated');
      }

      // Convert base64 data URL to blob
      const base64Data = data.imageUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      const fileName = `${user.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const message = 'Your AI profile picture has been set successfully';
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 4000,
      });

      // Refresh page to show new photo
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error generating profile picture:', error);
      const message = 'Failed to generate profile picture';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const readLastPost = async () => {
    if (!user) {
      showFeedback('Please log in to read your posts');
      speak('Please log in to read your posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Reading your last post');
    
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('content, media_type, likes_count, comments_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!posts || posts.length === 0) {
        const message = 'You have not created any posts yet';
        showFeedback(message);
        speak(message);
        return;
      }

      const post = posts[0];
      const likes = post.likes_count || 0;
      const comments = post.comments_count || 0;
      const createdDate = new Date(post.created_at);
      const timeAgo = getTimeAgo(createdDate);

      let message = `Your last post was ${timeAgo}. `;

      if (post.content) {
        message += `You said: ${post.content}. `;
      }

      if (post.media_type) {
        message += `It contains ${post.media_type}. `;
      }

      message += `It has ${likes} like${likes !== 1 ? 's' : ''} and ${comments} comment${comments !== 1 ? 's' : ''}.`;

      showFeedback(message);
      speak(message);
      
      toast.info('Reading your last post', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error reading last post:', error);
      const message = 'Failed to read your last post';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const readYesterdayPosts = async () => {
    if (!user) {
      showFeedback('Please log in to read your posts');
      speak('Please log in to read your posts');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Reading your posts from yesterday');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStr = yesterday.toISOString();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { data: posts, error } = await supabase
        .from('posts')
        .select('content, media_type, likes_count, comments_count')
        .eq('user_id', user.id)
        .gte('created_at', yesterdayStr)
        .lt('created_at', todayStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!posts || posts.length === 0) {
        const message = 'You did not create any posts yesterday';
        showFeedback(message);
        speak(message);
        return;
      }

      const count = posts.length;
      let message = `You created ${count} post${count > 1 ? 's' : ''} yesterday. `;

      posts.slice(0, 3).forEach((post, index) => {
        const postNumber = index + 1;
        message += `Post ${postNumber}: `;

        if (post.content) {
          const content = post.content.length > 50 
            ? post.content.substring(0, 50) + '...' 
            : post.content;
          message += `${content}. `;
        }

        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        message += `${likes} like${likes !== 1 ? 's' : ''}, ${comments} comment${comments !== 1 ? 's' : ''}. `;
      });

      if (count > 3) {
        message += `And ${count - 3} more.`;
      }

      showFeedback(message);
      speak(message);
      
      toast.info(`${count} post${count > 1 ? 's' : ''} from yesterday`, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error reading yesterday posts:', error);
      const message = 'Failed to read your posts from yesterday';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const acceptFriendRequest = async (username: string) => {
    if (!user) {
      showFeedback('Please log in to accept friend requests');
      speak('Please log in to accept friend requests');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Accepting friend request from ${username}`);
    
    try {
      // Find the user by username
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', username)
        .single();

      if (fetchError || !targetUser) {
        const message = `User ${username} not found`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Find the friend request
      const { data: request, error: requestError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', targetUser.user_id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .single();

      if (requestError || !request) {
        const message = `No pending friend request from ${username}`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Accept the request using the database function
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: request.id
      });

      if (error) throw error;

      const message = `Accepted friend request from ${username}`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      const message = 'Failed to accept friend request';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const rejectFriendRequest = async (username: string) => {
    if (!user) {
      showFeedback('Please log in to reject friend requests');
      speak('Please log in to reject friend requests');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Rejecting friend request from ${username}`);
    
    try {
      // Find the user by username
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', username)
        .single();

      if (fetchError || !targetUser) {
        const message = `User ${username} not found`;
        showFeedback(message);
        speak(message);
        return;
      }

      // Find and update the friend request
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('sender_id', targetUser.user_id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      const message = `Rejected friend request from ${username}`;
      showFeedback(message);
      speak(message);
      
      toast.success(message, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      const message = 'Failed to reject friend request';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  // Send inform message via SMS/call
  const sendInformMessage = async (contactName: string, messageContent: string) => {
    if (!user) {
      showFeedback('Please log in to send messages');
      speak('Please log in to send messages');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Informing ${contactName}`);

    try {
      // First, try to find the contact in user's friends/family contacts
      const { data: contact } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .or(`display_name.ilike.%${contactName}%,username.ilike.%${contactName}%`)
        .limit(1)
        .single();

      if (!contact) {
        // Check if there's a stored phone number for this contact name
        const storedContacts = JSON.parse(localStorage.getItem('zoe-contacts') || '{}');
        const storedPhone = storedContacts[contactName.toLowerCase()];
        
        if (storedPhone) {
          // Send via Twilio
          const { data, error } = await supabase.functions.invoke('zoe-send-message', {
            body: { 
              to: storedPhone, 
              message: `Message from ${user.email}: ${messageContent}`,
              type: 'sms'
            }
          });

          if (error) throw error;
          
          const successMsg = `I've sent your message to ${contactName}`;
          showFeedback(successMsg);
          speak(successMsg);
          toast.success(successMsg);
        } else {
          // Ask user to provide phone number
          const msg = `I don't have ${contactName}'s contact information. Please say "save contact ${contactName} phone" followed by the phone number.`;
          showFeedback(msg);
          speak(msg);
        }
        return;
      }

      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: contact.user_id,
        from_user_id: user.id,
        type: 'message',
        context_data: { 
          preview: messageContent,
          marked_important: true,
          priority_one: true,
          category: 'family'
        },
        priority: 1
      });

      // Also try SMS if phone stored in localStorage
      const storedContacts = JSON.parse(localStorage.getItem('zoe-contacts') || '{}');
      const storedPhone = storedContacts[contactName.toLowerCase()];
      if (storedPhone) {
        await supabase.functions.invoke('zoe-send-message', {
          body: { 
            to: storedPhone, 
            message: `Message from ${user.email}: ${messageContent}`,
            type: 'sms'
          }
        });
      }

      const successMsg = `I've informed ${contact.display_name || contactName} to ${messageContent}`;
      showFeedback(successMsg);
      speak(successMsg);
      toast.success(successMsg);
    } catch (error) {
      console.error('Error sending inform message:', error);
      const msg = `Sorry, I couldn't reach ${contactName}. Would you like to try again?`;
      showFeedback(msg);
      speak(msg);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  // Repeat last announcement
  const repeatLastAnnouncement = async () => {
    if (!lastAnnouncement) {
      const message = 'I haven\'t made any announcements yet';
      showFeedback(message);
      speak(message);
      return;
    }
    
    showFeedback(lastAnnouncement);
    speak(lastAnnouncement);
  };

  // Mute notifications
  const muteNotifications = async () => {
    setNotificationsMuted(true);
    const message = 'Voice notifications muted. I won\'t announce new notifications until you ask me to unmute';
    showFeedback(message);
    speak(message);
    toast.info('Voice notifications muted');
  };

  // Unmute notifications
  const unmuteNotifications = async () => {
    setNotificationsMuted(false);
    const message = 'Voice notifications unmuted. I\'ll now announce new notifications';
    showFeedback(message);
    speak(message);
    toast.success('Voice notifications unmuted');
  };

  // Set announcement preference
  const setAnnouncementPreference = async (priority: 'all' | 'important') => {
    setAnnouncementPriority(priority);
    
    if (priority === 'important') {
      const message = 'I\'ll only announce important notifications from now on';
      showFeedback(message);
      speak(message);
      toast.info('Only important notifications will be announced');
    } else {
      const message = 'I\'ll announce all notifications from now on';
      showFeedback(message);
      speak(message);
      toast.success('All notifications will be announced');
    }

    // Update user preferences in database
    if (user) {
      try {
        await supabase
          .from('zoe_settings')
          .update({ 
            voice_feedback: priority === 'all' 
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating announcement preference:', error);
      }
    }
  };

  // Read unread messages
  const readUnreadMessages = async () => {
    if (!user) {
      showFeedback('Please log in to check messages');
      speak('Please log in to check messages');
      return;
    }

    setIsProcessing(true);
    setCurrentTask('Checking unread messages');

    try {
      // Fetch unread messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, username)
        `)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!messages || messages.length === 0) {
        const message = 'You have no unread messages';
        showFeedback(message);
        speak(message);
        return;
      }

      // Group messages by sender
      const messageBySender = messages.reduce((acc: any, msg: any) => {
        const senderName = msg.sender?.display_name || 'Someone';
        if (!acc[senderName]) {
          acc[senderName] = 0;
        }
        acc[senderName]++;
        return acc;
      }, {});

      // Create summary
      const senders = Object.keys(messageBySender);
      let announcement = `You have ${messages.length} unread message${messages.length > 1 ? 's' : ''} from ${senders.length} ${senders.length > 1 ? 'people' : 'person'}. `;

      if (senders.length <= 3) {
        const details = senders.map(sender => 
          `${messageBySender[sender]} from ${sender}`
        ).join(', ');
        announcement += details;
      } else {
        announcement += `${messageBySender[senders[0]]} from ${senders[0]}, and messages from ${senders.length - 1} others`;
      }

      showFeedback(announcement);
      speak(announcement);

      toast.info(`${messages.length} unread messages`, {
        description: `From ${senders.slice(0, 3).join(', ')}${senders.length > 3 ? ' and others' : ''}`,
      });
    } catch (error) {
      console.error('Error reading unread messages:', error);
      const message = 'Failed to check your messages';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  // Adjust speaking speed
  const adjustSpeakingSpeed = async (direction: 'faster' | 'slower' | 'normal') => {
    let newRate = zoeSettings.voice_rate;
    
    if (direction === 'faster') {
      newRate = Math.min(2.0, zoeSettings.voice_rate + 0.2);
    } else if (direction === 'slower') {
      newRate = Math.max(0.5, zoeSettings.voice_rate - 0.2);
    } else {
      newRate = 1.0;
    }

    // Update local state
    setZoeSettings(prev => ({ ...prev, voice_rate: newRate }));

    // Update in database
    if (user) {
      try {
        await supabase
          .from('zoe_settings')
          .update({ voice_rate: newRate })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating speaking speed:', error);
      }
    }

    const speedDescription = 
      newRate < 0.8 ? 'very slow' :
      newRate < 1.0 ? 'slow' :
      newRate === 1.0 ? 'normal' :
      newRate < 1.5 ? 'fast' : 'very fast';

    const message = `Speaking speed adjusted to ${speedDescription}`;
    showFeedback(message);
    speak(message);
    toast.success(message);
  };

  // Get weather forecast
  const getWeatherForecast = async (period: 'tomorrow' | 'week') => {
    if (!user) {
      showFeedback('Please log in to get weather updates');
      speak('Please log in to get weather updates');
      return;
    }

    setIsProcessing(true);
    setCurrentTask(`Getting weather forecast for ${period}`);

    try {
      const position = await getUserLocation();
      
      if (!position) {
        const message = 'I need your location to get the weather. Please enable location access';
        showFeedback(message);
        speak(message);
        return;
      }

      const { latitude, longitude } = position.coords;

      // Fetch weather forecast using Open-Meteo API
      const days = period === 'tomorrow' ? 2 : 7;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=${days}`
      );

      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();
      const daily = data.daily;

      // Get location name
      const locationResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      
      let locationName = 'your area';
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        locationName = locationData.address?.city || locationData.address?.town || 'your area';
      }

      if (period === 'tomorrow') {
        // Tomorrow's forecast (index 1)
        const temp = Math.round((daily.temperature_2m_max[1] + daily.temperature_2m_min[1]) / 2);
        const condition = getWeatherCondition(daily.weathercode[1]);
        const precipitation = daily.precipitation_sum[1];

        let message = `Tomorrow in ${locationName}, expect ${condition} with temperatures around ${temp}°C`;
        
        if (precipitation > 0) {
          message += ` and ${precipitation}mm of precipitation`;
        }

        showFeedback(message);
        speak(message);
        
        toast.info('Tomorrow\'s Weather', {
          description: `${temp}°C, ${condition}`,
        });
      } else {
        // Weekly forecast
        const forecast = daily.weathercode.slice(1, 8).map((code: number, index: number) => ({
          day: index,
          condition: getWeatherCondition(code),
          maxTemp: Math.round(daily.temperature_2m_max[index + 1]),
          minTemp: Math.round(daily.temperature_2m_min[index + 1]),
        }));

        const avgTemp = Math.round(
          forecast.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0) / forecast.length
        );

        const rainDays = daily.precipitation_sum.slice(1, 8).filter((p: number) => p > 0).length;

        let message = `This week in ${locationName}, average temperature will be ${avgTemp}°C`;
        
        if (rainDays > 0) {
          message += ` with rain expected on ${rainDays} day${rainDays > 1 ? 's' : ''}`;
        }

        message += `. Most common conditions will be ${forecast[0].condition}`;

        showFeedback(message);
        speak(message);

        toast.info('Weekly Forecast', {
          description: `Avg ${avgTemp}°C, ${rainDays} rainy days`,
        });
      }
    } catch (error) {
      console.error('Error getting weather forecast:', error);
      const message = 'Failed to get weather forecast. Please make sure location access is enabled';
      showFeedback(message);
      speak(message);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const getTrafficUpdate = async (destination?: string) => {
    try {
      setIsProcessing(true);
      setCurrentTask('Checking traffic conditions...');
      showFeedback(`Checking traffic conditions${destination ? ` to ${destination}` : ''}...`);

      const position = await getUserLocation();
      if (!position) {
        const message = 'I need your location to check traffic. Please enable location services.';
        showFeedback(message);
        await speak(message);
        toast.error(message);
        return;
      }

      const { latitude, longitude } = position.coords;
      const alerts = await getTrafficAlerts(latitude, longitude);
      const now = new Date();
      const hour = now.getHours();
      
      let trafficMessage = '';
      
      if (alerts.length === 0) {
        trafficMessage = 'Traffic is flowing smoothly in your area. ';
      } else {
        const formattedAlerts = formatTrafficAlert(alerts);
        trafficMessage = `Here's your traffic update: ${formattedAlerts}. `;
      }
      
      const commuteAdvice = getCommuteAdvice(hour);
      trafficMessage += commuteAdvice;

      showFeedback(trafficMessage);
      await speak(trafficMessage);
      toast.success('Traffic update retrieved');
      
    } catch (error) {
      console.error('Error getting traffic update:', error);
      const message = 'Sorry, I couldn\'t get the traffic update right now. Please try again later.';
      showFeedback(message);
      await speak(message);
      toast.error('Failed to get traffic update');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const performSearch = async (query: string) => {
    try {
      setIsProcessing(true);
      setCurrentTask(`Searching for "${query}"...`);
      showFeedback(`Searching for "${query}"...`);
      console.log('Zoe: Performing search for:', query);

      // Dispatch event to SearchBar to perform the search
      const event = new CustomEvent('lisa-search', { 
        detail: { query }
      });
      window.dispatchEvent(event);

      // Wait a moment for search to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Listen for search results
      const handleSearchResults = (e: CustomEvent) => {
        const { results, query: searchQuery } = e.detail;
        setSearchResults(results);
        
        let resultsMessage = '';
        if (results.length === 0) {
          resultsMessage = `I didn't find any results for "${searchQuery}".`;
        } else {
          const userCount = results.filter((r: any) => r.type === 'user').length;
          const postCount = results.filter((r: any) => r.type === 'post').length;
          
          resultsMessage = `I found ${results.length} result${results.length !== 1 ? 's' : ''} for "${searchQuery}". `;
          
          if (userCount > 0) {
            resultsMessage += `${userCount} user${userCount !== 1 ? 's' : ''}`;
          }
          if (postCount > 0) {
            if (userCount > 0) resultsMessage += ' and ';
            resultsMessage += `${postCount} post${postCount !== 1 ? 's' : ''}`;
          }
          resultsMessage += '. The search results are displayed on screen.';
        }

        showFeedback(resultsMessage);
        speak(resultsMessage);
        
        window.removeEventListener('lisa-search-results', handleSearchResults as EventListener);
      };

      window.addEventListener('lisa-search-results', handleSearchResults as EventListener);

      toast.success('Search initiated');
      
    } catch (error) {
      console.error('Error performing search:', error);
      const message = 'Sorry, I couldn\'t perform the search right now. Please try again.';
      showFeedback(message);
      await speak(message);
      toast.error('Search failed');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const filterSearchResults = async (filterType: string) => {
    try {
      if (searchResults.length === 0) {
        const message = 'No search results to filter. Please search for something first.';
        showFeedback(message);
        await speak(message);
        return;
      }

      setIsProcessing(true);
      showFeedback(`Filtering results to show only ${filterType}...`);

      // Dispatch filter event
      const event = new CustomEvent('lisa-filter-search', {
        detail: { filterType }
      });
      window.dispatchEvent(event);

      const filtered = searchResults.filter((r: any) => 
        filterType === 'posts' ? r.type === 'post' : r.type === 'user'
      );

      const message = `Showing ${filtered.length} ${filterType}${filtered.length !== 1 ? '' : ' only'}.`;
      showFeedback(message);
      await speak(message);
      toast.success(`Filtered to ${filterType}`);
    } catch (error) {
      console.error('Error filtering search results:', error);
      const message = 'Sorry, I couldn\'t filter the results right now.';
      showFeedback(message);
      await speak(message);
      toast.error('Filter failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const summarizeSearchResults = async () => {
    try {
      if (searchResults.length === 0) {
        const message = 'No search results to summarize. Please search for something first.';
        showFeedback(message);
        await speak(message);
        return;
      }

      setIsProcessing(true);
      setCurrentTask('Analyzing search results...');
      showFeedback('Let me summarize these results for you...');

      // Build context from search results
      const posts = searchResults.filter((r: any) => r.type === 'post');
      const users = searchResults.filter((r: any) => r.type === 'user');

      const postsContext = posts.slice(0, 5).map((p: any, i: number) => 
        `Post ${i + 1}: "${p.content?.substring(0, 100) || 'Media post'}"`
      ).join('\n');

      const usersContext = users.slice(0, 5).map((u: any, i: number) => 
        `User ${i + 1}: ${u.display_name} (@${u.username})`
      ).join('\n');

      const prompt = `Summarize these search results in 2-3 sentences:\n\nPosts found:\n${postsContext}\n\nUsers found:\n${usersContext}\n\nProvide a brief, helpful summary.`;

      // Validate prompt before sending
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Cannot generate summary without search results');
      }

      // Call AI to summarize
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { prompt }
      });

      if (error) throw error;

      const summary = data.text || 'I found various posts and users matching your search.';
      
      showFeedback(summary);
      await speak(summary);
      toast.success('Summary generated');
    } catch (error) {
      console.error('Error summarizing search results:', error);
      const message = 'Sorry, I couldn\'t generate a summary right now.';
      showFeedback(message);
      await speak(message);
      toast.error('Summary failed');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const saveLastPost = async () => {
    if (!user) {
      showFeedback('Please log in to save posts');
      speak('Please log in to save posts');
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentTask('Saving the last post...');
      showFeedback('Saving the last post...');

      // Get the most recent post
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, profiles!inner(display_name)')
        .order('created_at', { ascending: false })
        .limit(1);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        const message = 'No posts found to save.';
        showFeedback(message);
        await speak(message);
        return;
      }

      const postId = posts[0].id;
      const authorName = posts[0].profiles?.display_name || 'Someone';

      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const message = 'This post is already saved.';
        showFeedback(message);
        await speak(message);
        return;
      }

      // Save the post
      const { error: saveError } = await supabase
        .from('saved_posts')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (saveError) throw saveError;

      const message = `Saved ${authorName}'s post to your bookmarks.`;
      showFeedback(message);
      await speak(message);
      toast.success('Post saved successfully');

    } catch (error) {
      console.error('Error saving post:', error);
      const message = 'Sorry, I couldn\'t save the post right now.';
      showFeedback(message);
      await speak(message);
      toast.error('Failed to save post');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const showOnlineFriends = async () => {
    if (!user) {
      showFeedback('Please log in to see your friends');
      speak('Please log in to see your friends');
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentTask('Checking who\'s online...');
      showFeedback('Checking who\'s online...');

      // Get user's friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      if (!friendships || friendships.length === 0) {
        const message = 'You don\'t have any friends added yet.';
        showFeedback(message);
        await speak(message);
        return;
      }

      // Extract friend IDs
      const friendIds = friendships.map(f =>
        f.user1_id === user.id ? f.user2_id : f.user1_id
      );

      // Get online friends
      const { data: onlineFriends, error: friendsError } = await supabase
        .from('profiles')
        .select('display_name, status')
        .in('user_id', friendIds)
        .eq('status', 'online');

      if (friendsError) throw friendsError;

      if (!onlineFriends || onlineFriends.length === 0) {
        const message = 'None of your friends are currently online.';
        showFeedback(message);
        await speak(message);
        return;
      }

      const friendNames = onlineFriends.map(f => f.display_name).slice(0, 5);
      let message = '';
      
      if (onlineFriends.length === 1) {
        message = `${friendNames[0]} is online right now.`;
      } else if (onlineFriends.length === 2) {
        message = `${friendNames[0]} and ${friendNames[1]} are online.`;
      } else if (onlineFriends.length <= 5) {
        const lastFriend = friendNames.pop();
        message = `${friendNames.join(', ')}, and ${lastFriend} are online.`;
      } else {
        const firstThree = friendNames.slice(0, 3).join(', ');
        message = `${firstThree}, and ${onlineFriends.length - 3} more friends are online.`;
      }

      showFeedback(message);
      await speak(message);
      toast.success('Friend status retrieved');

    } catch (error) {
      console.error('Error checking online friends:', error);
      const message = 'Sorry, I couldn\'t check who\'s online right now.';
      showFeedback(message);
      await speak(message);
      toast.error('Failed to get friend status');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const createAIPost = async (topic: string) => {
    if (!user) {
      showFeedback('Please log in to create posts');
      speak('Please log in to create posts');
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentTask(`Creating a post about ${topic}...`);
      showFeedback(`Creating a post about ${topic}...`);

      // Get user context for personalization
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, hobbies, profession')
        .eq('user_id', user.id)
        .single();

      // Generate post content using AI
      const promptText = `Create an engaging social media post about "${topic}". 
          Keep it natural, conversational, and under 200 words. 
          ${userProfile?.hobbies ? `Consider the user's interests: ${userProfile.hobbies.join(', ')}.` : ''}
          ${userProfile?.profession ? `The user is a ${userProfile.profession}.` : ''}
          Make it authentic and relatable. Don't use hashtags unless they feel natural.`;

      // Validate prompt
      if (!promptText || !topic || topic.trim().length === 0) {
        throw new Error('Cannot create post without a topic');
      }

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt: promptText,
          maxTokens: 200
        }
      });

      if (aiError) throw aiError;

      const postContent = aiResponse?.text || aiResponse?.content || '';

      if (!postContent) {
        throw new Error('Failed to generate post content');
      }

      // Create the post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postContent,
          visibility: 'global'
        });

      if (postError) throw postError;

      const message = `I've created and published your post about ${topic}!`;
      showFeedback(message);
      await speak(message);
      toast.success('Post created successfully', {
        description: 'Your AI-generated post is now live!'
      });

      // Refresh the page to show new post
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      console.error('Error creating AI post:', error);
      const message = 'Sorry, I couldn\'t create the post right now. Please try again.';
      showFeedback(message);
      await speak(message);
      toast.error('Failed to create post');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };


  const createBeautifulPost = async (command: string) => {
    if (!user) {
      showFeedback('Please log in to create posts');
      return;
    }

    try {
      setCurrentTask('Creating a beautiful post for you...');
      showFeedback('Creating a beautiful post for you...');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setTaskProgress(40);

      const topicMatch = command.match(/about (.+)/);
      const topic = topicMatch ? topicMatch[1] : null;

      let imagePrompt = "Create a beautiful, inspiring, aesthetic image that would make someone happy and uplifted. Style: modern, vibrant, professional quality, emotionally resonant. ";
      
      if (topic) {
        imagePrompt += "Theme: " + topic + ". ";
      }
      
      if (profile?.hobbies && profile.hobbies.length > 0) {
        imagePrompt += "Consider these interests: " + profile.hobbies.join(', ') + ". ";
      }
      
      imagePrompt += "The image should evoke positive emotions, inspiration, and be perfect for social media.";

      const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: imagePrompt
        }
      });

      if (imageError) throw imageError;

      setTaskProgress(70);

      let captionPrompt = "Create a warm, inspiring, heartfelt social media caption (2-3 sentences max) that would make " + (profile?.display_name || "someone") + " smile and feel uplifted. ";
      
      if (topic) {
        captionPrompt += "The caption should be about " + topic + ". ";
      }
      
      captionPrompt += "Make it personal, authentic, meaningful, and emotionally resonant. Include relevant emojis that match the mood. The tone should be genuine, warm, and uplifting.";

      // Validate prompt before sending
      if (!captionPrompt || captionPrompt.trim().length === 0) {
        throw new Error('Cannot generate caption without prompt');
      }

      const { data: captionData, error: captionError } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt: captionPrompt
        }
      });

      if (captionError) throw captionError;

      setTaskProgress(85);

      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: captionData.generatedText,
          media_url: imageData.imageUrl,
          media_type: 'image',
          visibility: 'friends'
        });

      if (postError) throw postError;

      setTaskProgress(100);

      showFeedback('Beautiful post created! Check your timeline');
      
      toast.success('Post Created!', {
        description: 'I made something special for you. Check your timeline!',
        duration: 5000
      });

      setTimeout(() => {
        navigate('/home');
      }, 2000);

      setCurrentTask(null);
      setTaskProgress(0);
    } catch (error) {
      console.error('Error creating post:', error);
      showFeedback('Error creating post');
      toast.error('Failed to create post', {
        description: 'Please try again'
      });
      setCurrentTask(null);
      setTaskProgress(0);
    }
  };

  const showPlatformStats = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setCurrentTask('Gathering platform statistics');
    
    try {
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const summary = `Platform stats: ${userCount} users, ${postCount} total posts, ${todayPosts} posts today`;
      showFeedback(summary);

      toast.info(summary, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      showFeedback('Failed to fetch platform stats');
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  // Greeting system for when user logs in
  const initiateGreeting = async () => {
    if (!user) {
      console.log('Zoe: Cannot greet - no user');
      return;
    }
    
    console.log('Zoe: Starting greeting sequence...');
    
    try {
      // Initialize learning system if not already
      if (!learningSystemRef.current) {
        learningSystemRef.current = new ZoeLearningSystem(user.id);
        await learningSystemRef.current.initialize();
      }

      // Fetch user profile and recent posts
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, city, hobbies, event_type, event_date, zoe_personality_tone, zoe_conversation_style')
        .eq('user_id', user.id)
        .single();

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false})
        .limit(10);

      const userName = profile?.display_name || 'friend';
      const isCasual = profile?.zoe_personality_tone === 'casual' || profile?.zoe_conversation_style === 'conversational';
      
      // Get colloquial greeting
      const colloquialGreeting = learningSystemRef.current?.getColloquialResponse('greetings') || 'Hey';
      const timeGreeting = getTimeBasedGreeting();
      const greeting = isCasual ? `${colloquialGreeting} ${userName}!` : `${timeGreeting}, ${userName}!`;
      
      const healthQuestion = getRandomHealthQuestion();
      
      // Get location, weather, and traffic
      let weatherInfo = '';
      let trafficInfo = '';
      try {
        const position = await getUserLocation();
        if (position) {
          const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
          weatherInfo = isCasual 
            ? ` So it's like ${weather.temperature}°C and ${weather.condition} outside today.`
            : ` The weather today is ${weather.temperature}°C and ${weather.condition}.`;
          
          // Get traffic alerts
          const trafficAlerts = await getTrafficAlerts(position.coords.latitude, position.coords.longitude);
          const trafficMessage = formatTrafficAlert(trafficAlerts);
          const commuteAdvice = getCommuteAdvice(new Date().getHours());
          trafficInfo = ` ${trafficMessage} ${commuteAdvice}`;
        }
      } catch (error) {
        console.log('Could not fetch weather/traffic:', error);
      }

      // Check for upcoming events
      let eventInfo = '';
      if (profile?.event_type && profile?.event_date) {
        const eventDate = new Date(profile.event_date);
        const today = new Date();
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= 7) {
          eventInfo = isCasual 
            ? ` Oh, and you've got ${profile.event_type} coming up in ${daysUntil} days - exciting!`
            : ` You have ${profile.event_type} coming up in ${daysUntil} days!`;
        }
      }

      const casualHelp = isCasual 
        ? " I'm here to help you out with whatever! Just say \"hi Lisa\" followed by what you need - search for stuff, create posts, check out features, you name it!"
        : " I'm here to help you. You can ask me to search for users, posts, or features using voice commands. Just say \"hi Lisa, search for\" followed by what you're looking for!";

      const greetingMessage = `${greeting} ${healthQuestion}${weatherInfo}${trafficInfo}${eventInfo}${casualHelp}`;
      
      console.log('Zoe: Speaking greeting:', greetingMessage);
      showFeedback(greetingMessage);
      await speak(greetingMessage);
      setHasGreetedToday(true);
      
      console.log('Zoe: Greeting completed');
      
      // Store conversation context
      setLastConversationContext(JSON.stringify({
        posts: recentPosts,
        profile: profile,
        timestamp: new Date().toISOString()
      }));
      
      // Sometimes ask a rapport-building question after greeting
      if (isCasual && Math.random() > 0.5) {
        setTimeout(async () => {
          const rapportQuestion = getRandomQuestion();
          if (rapportQuestion) {
            markQuestionAsked(rapportQuestion.id);
            setAwaitingUserResponse(true);
            setListeningForResponse(true);
            const questionMsg = `${learningSystemRef.current?.getColloquialResponse('transitions')} ${rapportQuestion.question}`;
            showFeedback(questionMsg);
            await speak(questionMsg);
          }
        }, 8000);
      } else {
        // After greeting, ask if user wants to continue
        const timeout = setTimeout(async () => {
          setAwaitingUserResponse(true);
          setListeningForResponse(true);
          const continueMsg = isCasual 
            ? 'Wanna keep chatting? Just say yes or no.'
            : 'Do you wish to continue? Just say yes or no.';
          showFeedback(continueMsg);
          await speak(continueMsg);
        }, 6000);
        
        setUserResponseTimeout(timeout);
      }
      
    } catch (error) {
      console.error('Error in greeting:', error);
    }
  };

  // Handle yes/no voice responses
  const handleYesNoResponse = (transcript: string): boolean => {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    if (lowerTranscript.includes('yes') || lowerTranscript.includes('yeah') || lowerTranscript.includes('sure') || lowerTranscript.includes('okay')) {
      setAwaitingUserResponse(false);
      setListeningForResponse(false);
      continueConversation();
      return true;
    } else if (lowerTranscript.includes('no') || lowerTranscript.includes('nope') || lowerTranscript.includes('not now')) {
      setAwaitingUserResponse(false);
      setListeningForResponse(false);
      speak('No problem! I\'ll be here when you need me.');
      showFeedback('Lisa is on standby');
      return true;
    }
    
    return false;
  };

  const continueConversation = async () => {
    try {
      // Fetch latest data
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, hobbies')
        .eq('user_id', user?.id)
        .single();

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('content, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Generate personalized content suggestion
      const contentSuggestion = generatePersonalizedContentSuggestion(recentPosts || [], profile);
      
      showFeedback(contentSuggestion);
      await speak(contentSuggestion);
      
    } catch (error) {
      console.error('Error continuing conversation:', error);
      const fallbackMsg = 'Let me know if you\'d like to create any content today!';
      showFeedback(fallbackMsg);
      await speak(fallbackMsg);
    }
  };

  const speak = useCallback(async (text: string) => {
    // Store last announcement for repeat feature
    setLastAnnouncement(text);

    try {
      // Use browser TTS
      console.log('Zoe: Using browser TTS');

      const loadVoices = () => {
        return new Promise<SpeechSynthesisVoice[]>((resolve) => {
          let voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve(voices);
            return;
          }

          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
          };
        });
      };

      const voices = await loadVoices();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = zoeSettings.voice_pitch;
      utterance.rate = zoeSettings.voice_rate;
      utterance.volume = zoeSettings.voice_volume;

      if (voices.length > 0 && zoeSettings.voice_gender) {
        const genderKeywords = zoeSettings.voice_gender === 'male'
          ? ['male', 'man', 'masculine', 'guy', 'david', 'daniel', 'james', 'mark', 'thomas']
          : ['female', 'woman', 'feminine', 'samantha', 'victoria', 'karen', 'zira', 'susan', 'allison'];

        const genderedVoice = voices.find(voice =>
          genderKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
        );

        if (genderedVoice) {
          console.log('Zoe: Using browser voice:', genderedVoice.name);
          utterance.voice = genderedVoice;
        } else {
          console.log('Zoe: No gender-matched voice found, using default');
        }
      }

      console.log('Zoe: Speaking with browser TTS:', text.substring(0, 50));
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error with speech:', error);
    }
  }, [zoeSettings]);

  const generateTextPost = async (topic: string) => {
    setIsProcessing(true);
    showFeedback('Generating post...');
    
    try {
      const { data, error } = await supabase.functions.invoke('lisa-assistant', {
        body: {
          type: 'generate_text',
          prompt: topic
        }
      });

      if (error) throw error;

      // Navigate to webdrop with generated content
      navigate('/webdrop', { 
        state: { 
          generatedContent: {
            type: 'text',
            content: data.content
          }
        }
      });
      showFeedback('Post generated!');
    } catch (error) {
      console.error('Error generating post:', error);
      showFeedback('Failed to generate post');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImagePost = async (prompt: string) => {
    setIsProcessing(true);
    showFeedback('Generating image...');
    
    try {
      const { data, error } = await supabase.functions.invoke('lisa-assistant', {
        body: {
          type: 'generate_image',
          prompt
        }
      });

      if (error) throw error;

      // Navigate to webdrop with generated content
      navigate('/webdrop', { 
        state: { 
          generatedContent: {
            type: 'image',
            content: data.imageUrl
          }
        }
      });
      showFeedback('Image generated!');
    } catch (error) {
      console.error('Error generating image:', error);
      showFeedback('Failed to generate image');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Listen for custom events from other components
  useEffect(() => {
    const handleLisaResponse = async (event: CustomEvent) => {
      const { text, message, priority } = event.detail;
      const responseText = text || message; // Support both property names
      
      if (responseText) {
        console.log('Zoe: Received voice announcement:', responseText, 'Priority:', priority, 'Muted:', notificationsMuted);
        
        // Check if notifications are muted
        if (notificationsMuted) {
          console.log('Zoe: Notifications muted, skipping announcement');
          return;
        }
        
        // Check announcement priority filter
        if (announcementPriority === 'important' && (!priority || priority < 7)) {
          console.log('Zoe: Announcement priority too low, skipping');
          return;
        }
        
        showFeedback(responseText);
        await speak(responseText);
      }
    };

    const handleLisaCommand = (event: CustomEvent) => {
      const { command } = event.detail;
      handleCommand(command);
    };

    const handleEmotionCheckIn = async (event: CustomEvent) => {
      const { message, type } = event.detail;
      console.log('Zoe: Emotion check-in triggered:', type);
      
      // Show feedback and speak the check-in message
      showFeedback('Checking in...');
      await speak(message);
      
      // Set flag to expect emotion response
      setAwaitingUserResponse(true);
      setLastConversationContext('emotion_checkin');
      
      // Set timeout to clear awaiting state if no response
      const timeout = setTimeout(() => {
        setAwaitingUserResponse(false);
        setLastConversationContext('');
      }, 60000); // 1 minute timeout
      
      setUserResponseTimeout(timeout);
    };

    // Handle feature announcements
    const handleFeatureAnnouncement = async (event: CustomEvent) => {
      const { featureId, featureName, announcementText } = event.detail;
      
      console.log('Zoe: Feature announcement triggered:', featureName);
      
      // Show visual feedback
      showFeedback(`Introducing: ${featureName}`);
      
      // Speak the announcement
      await speak(announcementText);
      
      // Track the feature announcement
      if (user) {
        await supabase.from('feature_analytics').insert({
          user_id: user.id,
          feature_id: featureId,
          feature_name: featureName,
          access_method: 'voice_announcement'
        });
      }
    };

    window.addEventListener('lisa-response', handleLisaResponse as EventListener);
    window.addEventListener('lisa-command', handleLisaCommand as EventListener);
    window.addEventListener('lisa-emotion-checkin', handleEmotionCheckIn as EventListener);
    window.addEventListener('feature-announcement', handleFeatureAnnouncement as EventListener);
    
    return () => {
      window.removeEventListener('lisa-response', handleLisaResponse as EventListener);
      window.removeEventListener('lisa-command', handleLisaCommand as EventListener);
      window.removeEventListener('lisa-emotion-checkin', handleEmotionCheckIn as EventListener);
      window.removeEventListener('feature-announcement', handleFeatureAnnouncement as EventListener);
    };
  }, [handleCommand, speak, notificationsMuted, announcementPriority]);

  // Show Zoe ready notification when settings loaded
  useEffect(() => {
    if (settingsLoaded && zoeVisible) {
      console.log('Zoe: Settings loaded and Zoe is visible');
      
      // Show a toast to indicate Zoe is ready, but don't auto-request mic permission
      // Microphone permission MUST be triggered by explicit user action (browser requirement)
      const showReadyNotification = () => {
        const sessionKey = `lisa-ready-notified-${user?.id}`;
        const hasNotifiedThisSession = sessionStorage.getItem(sessionKey);
        
        if (!hasNotifiedThisSession) {
          sessionStorage.setItem(sessionKey, 'true');
          
          setTimeout(() => {
            toast.info('👋 Lisa AI is ready! Click the microphone button to start.', {
              duration: 4000,
              position: 'bottom-center',
              action: {
                label: 'Activate',
                onClick: () => toggleListening(),
              },
            });
          }, 1500);
        }
      };
      
      showReadyNotification();
    }
  }, [settingsLoaded, zoeVisible, user]);

  if (!settingsLoaded || !zoeVisible) {
    return null;
  }

  const isHuddlePage = location.pathname === '/huddle';
  const isWebdropPage = location.pathname === '/webdrop';
  const isHomePage = location.pathname === '/home';
  const isAICompanionPage = location.pathname === '/ai-companion';
  
  // Don't render Lisa assistant on AI companion page to avoid duplicate minimize buttons
  if (isAICompanionPage) {
    return null;
  }

  return (
    <ContextualHintWrapper hintType={isAgentMode ? 'agent' : undefined}>
      <>
        {/* Companion Chat Dropdown */}
        <div data-tutorial="lisa-button">
      {isCompanionMode && companionMessages.length > 0 && (
        <div className="fixed right-4 bottom-20 w-80 bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Lisa Companion</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCompanionMode(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {companionMessages.slice(-5).map((msg) => (
              <div 
                key={msg.id}
                className={`p-3 rounded-lg relative group ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-8' 
                    : 'bg-muted text-muted-foreground mr-8'
                }`}
              >
                <p className="text-xs pr-5">{msg.content}</p>
                {/* Copy button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${
                          msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-background/50'
                        }`}
                        onClick={() => handleCopyText(msg.content, msg.id)}
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{copiedMessageId === msg.id ? 'Copied!' : 'Copy'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lisa Assistant Button */}
      <div 
        className="fixed z-40 transition-all duration-300"
        style={{
          right: '1rem',
          bottom: isHuddlePage ? '5rem' : isWebdropPage ? '2rem' : isHomePage ? '10rem' : '5rem',
        }}
      >
        {!isMinimized && (
          <>
            {/* Agent Mode Indicator */}
            {isAgentMode && (
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-xs whitespace-nowrap border border-primary shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                  Agent Mode Active
                </div>
              </div>
            )}

            {/* Current Task Display */}
            {currentTask && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm text-card-foreground px-4 py-2 rounded-full text-xs whitespace-nowrap border border-border shadow-lg">
                <div className="flex flex-col items-center gap-1">
                  <span>{currentTask}</span>
                  {taskProgress > 0 && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${taskProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {feedback && !currentTask && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm text-card-foreground px-4 py-2 rounded-full text-xs whitespace-nowrap border border-border shadow-lg animate-in fade-in slide-in-from-bottom-2">
                {feedback}
              </div>
            )}
            {isProcessing && !currentTask && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm text-card-foreground px-4 py-2 rounded-full text-xs whitespace-nowrap border border-border shadow-lg">
                Processing...
              </div>
            )}
          </>
        )}

        <div className="flex flex-col items-center gap-2">
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/ai-companion')}
              className="h-8 w-8 rounded-full bg-card/50 hover:bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          
          <button
            onClick={toggleListening}
            className={`relative rounded-full p-4 transition-all duration-300 shadow-lg ${
              isListening 
                ? 'bg-gradient-to-r from-primary to-primary/80 shadow-primary/50' 
                : 'bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/50'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening && !isMinimized && audioStream ? (
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="animate-pulse bg-primary-foreground rounded-full w-3 h-3" />
              </div>
            ) : (
              isListening ? (
                <MicOff className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Mic className="w-6 h-6 text-muted-foreground" />
              )
            )}
            
            {!isMinimized && (
              <div className="absolute -top-1 -right-1 group">
                <img 
                  src={zoeAvatar} 
                  alt="Zoe" 
                  className="w-6 h-6 rounded-full"
                />
              </div>
            )}
          </button>

          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 rounded-full bg-card/50 hover:bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <Minimize2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      </div>
      </>
    </ContextualHintWrapper>
  );
};

export default ZoeAssistant;
