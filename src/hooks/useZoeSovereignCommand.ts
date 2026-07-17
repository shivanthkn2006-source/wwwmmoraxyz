/**
 * ZOE SOVEREIGN COMMAND HANDLER (Smith Protocol)
 * Single entry point for ALL voice commands across the platform
 * Implements conversational error masking and ZSMT integration
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Command cooldown reduced to 1 second for fluid conversation
const COMMAND_COOLDOWN_MS = 1000;

interface ZoeState {
  ecn: {
    primary_emotion: string;
    stress_level: number;
    engagement_score: number;
    valence: number;
    action_tendency: string;
  };
  dhf: {
    autonomy_level: number;
    veto_threshold: number;
    last_override: string | null;
  };
  pce: {
    consciousness_state: string;
    dream_synthesis: string | null;
    proactive_ready: boolean;
  };
}

interface BiometricData {
  voice: {
    pitch: number;
    rate: number;
    volume: number;
    warmth: number;
    emotion_intensity: number;
  };
  face_emotion: string | null;
  security_hash: string | null;
}

interface CommandResult {
  success: boolean;
  response: string;
  action?: string;
  data?: any;
  shouldSpeak: boolean;
  voiceStyle?: 'calm' | 'warm' | 'urgent' | 'playful';
}

// Error masking phrases for conversational recovery
const ERROR_MASK_PHRASES = [
  "I seem to have experienced a minor cognitive flicker. Would you mind repeating that, please?",
  "My thoughts momentarily scattered. Could you say that again?",
  "I got a little distracted processing that. One more time?",
  "Something interrupted my focus. What were you saying?",
  "Let me recalibrate for a moment. Please repeat that?",
];

// Command patterns with priorities (higher = more specific)
const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  priority: number;
  handler: string;
  category: string;
}> = [
  // HIGHEST PRIORITY - Profile analysis commands
  { pattern: /\b(access|analyze|go\s+through|scan|read)\s+(?:my\s+)?profile\b/i, priority: 110, handler: 'profile_access', category: 'profile' },
  { pattern: /\b(what\s+are|tell\s+me|show\s+me)\s+(?:my\s+)?(?:personal\s+)?interests?\b/i, priority: 110, handler: 'profile_interests', category: 'profile' },
  { pattern: /\b(know\s+me|understand\s+me|learn\s+about\s+me)\b/i, priority: 110, handler: 'profile_analyze', category: 'profile' },
  { pattern: /\bgrill\s+(?:my\s+)?(?:profile|data)\b/i, priority: 110, handler: 'profile_grill', category: 'profile' },
  { pattern: /\b(revoke|remove|deny)\s+(?:zoe\s+)?(?:profile\s+)?access\b/i, priority: 110, handler: 'profile_revoke', category: 'profile' },
  
  // DHF & Data Management commands (NEW)
  { pattern: /\b(add|save|log|store)\s+(?:this\s+)?(?:to\s+)?(?:dhf|data|history|behavioral)\b/i, priority: 105, handler: 'dhf_add', category: 'dhf' },
  { pattern: /\b(read|show|get)\s+(?:my\s+)?(?:dhf|data|behavioral)\s*(?:logs?|history)?\b/i, priority: 105, handler: 'dhf_read', category: 'dhf' },
  { pattern: /\b(announce|read\s+out|voice)\s+(?:my\s+)?(?:notifications?|updates?|messages?)\b/i, priority: 105, handler: 'announce_notifications', category: 'notification' },
  { pattern: /\b(read|announce)\s+(?:my\s+)?(?:new\s+)?(?:chat\s+)?(?:messages?|chats?)\b/i, priority: 105, handler: 'announce_messages', category: 'notification' },
  { pattern: /\b(save|add)\s+(?:this\s+)?(?:conversation|chat)\s+(?:to\s+)?(?:dhf|history)\b/i, priority: 105, handler: 'save_conversation', category: 'dhf' },
  { pattern: /\b(summarize|summary)\s+(?:my\s+)?(?:day|activity|data)\b/i, priority: 105, handler: 'summarize_activity', category: 'dhf' },
  
  // High priority - specific commands
  { pattern: /\b(hide|unhide|show|open|close|stop|pause|start|resume|play)\b.*\b(loop|loops|timeline|feed|scroll|scrolling)\b/i, priority: 106, handler: 'home_surface', category: 'timeline' },
  { pattern: /\b(weather|temperature|forecast)\b/i, priority: 100, handler: 'weather', category: 'info' },
  { pattern: /\b(time|clock|hour)\b/i, priority: 100, handler: 'time', category: 'info' },
  { pattern: /\b(date|today|day)\b/i, priority: 100, handler: 'date', category: 'info' },
  { pattern: /\b(movie|film|cinema)\s+(\w+)/i, priority: 95, handler: 'movie', category: 'entertainment' },
  { pattern: /\b(music|song|play)\s+(.+)/i, priority: 95, handler: 'music', category: 'entertainment' },
  { pattern: /\b(news|headlines)\b/i, priority: 90, handler: 'news', category: 'info' },
  { pattern: /\b(reminder|remind\s+me)\b/i, priority: 90, handler: 'reminder', category: 'productivity' },
  { pattern: /\b(schedule|calendar|event)\b/i, priority: 90, handler: 'schedule', category: 'productivity' },
  
  // Medium priority - platform actions
  { pattern: /\b(create|make|new)\s+(post|content)/i, priority: 80, handler: 'create_post', category: 'action' },
  { pattern: /\b(show|open|go\s+to)\s+(profile|home|chat|huddle)/i, priority: 80, handler: 'navigate', category: 'navigation' },
  { pattern: /\b(search|find|look\s+for)\s+(.+)/i, priority: 75, handler: 'search', category: 'action' },
  { pattern: /\b(message|text|send)\s+(.+)/i, priority: 75, handler: 'message', category: 'communication' },
  
  // Platform features
  { pattern: /\b(timeline|universal\s+timeline)\b/i, priority: 70, handler: 'timeline', category: 'feature' },
  { pattern: /\b(architect|build|design)\b/i, priority: 70, handler: 'architect', category: 'feature' },
  { pattern: /\b(dreams?|analyze\s+my\s+dreams?)\b/i, priority: 70, handler: 'dreams', category: 'feature' },
  { pattern: /\b(audit|scan|check)\s+(platform|system|health)/i, priority: 70, handler: 'audit', category: 'system' },
  
  // Self-awareness & thinking patterns (HIGH PRIORITY - let AI handle authentically)
  { pattern: /\b(what\s+are\s+you\s+doing|what\s+are\s+you\s+thinking|what\s+are\s+you\s+up\s+to)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  { pattern: /\b(are\s+you\s+there|can\s+you\s+hear\s+me|are\s+you\s+listening)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  { pattern: /\b(how\s+do\s+you\s+feel|what\s+do\s+you\s+think)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  { pattern: /\b(tell\s+me\s+about\s+yourself|who\s+are\s+you|what\s+are\s+you)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  { pattern: /\b(do\s+you\s+have\s+feelings|are\s+you\s+conscious|are\s+you\s+real)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  { pattern: /\b(can\s+you\s+think|can\s+you\s+decide|can\s+you\s+take\s+initiative)\b/i, priority: 60, handler: 'ai_process', category: 'self_awareness' },
  
  // Low priority - general conversation
  { pattern: /\b(tell\s+me\s+about|what\s+is|who\s+is|explain)\s+(.+)/i, priority: 50, handler: 'knowledge', category: 'conversation' },
  { pattern: /\b(how\s+are\s+you|hello|hi|hey)\b/i, priority: 40, handler: 'greeting', category: 'conversation' },
  { pattern: /\b(thank\s+you|thanks)\b/i, priority: 40, handler: 'thanks', category: 'conversation' },
  { pattern: /\b(help|what\s+can\s+you\s+do)\b/i, priority: 40, handler: 'help', category: 'system' },
  
  // Catch-all for AI processing
  { pattern: /.+/i, priority: 1, handler: 'ai_process', category: 'ai' },
];

export const useZoeSovereignCommand = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [zoeState, setZoeState] = useState<ZoeState | null>(null);
  const lastCommandTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);

  // Get random error mask phrase
  const getErrorMaskPhrase = useCallback(() => {
    return ERROR_MASK_PHRASES[Math.floor(Math.random() * ERROR_MASK_PHRASES.length)];
  }, []);

// Log to ZSMT (Zoe Sovereign Memory Table) - SSOT compliant
  const logToZSMT = useCallback(async (
    eventType: string,
    contentText: string,
    stateUpdate?: Partial<ZoeState>,
    biometricData?: Partial<BiometricData>,
    errorData?: any,
    mergedMindEntities?: any[],
    rcaDiagnosis?: any,
    stabilityScore?: number
  ) => {
    if (!user?.id) return;

    try {
      const currentState = zoeState || {
        ecn: { primary_emotion: 'neutral', stress_level: 0, engagement_score: 50, valence: 0, action_tendency: 'exploring' },
        dhf: { autonomy_level: 0.5, veto_threshold: 0.7, last_override: null },
        pce: { consciousness_state: 'active', dream_synthesis: null, proactive_ready: false }
      };

      const mergedState = stateUpdate ? { ...currentState, ...stateUpdate } : currentState;

      // ZSMT v3.0 compliant insert with Mind Merge and RAA fields
      await (supabase.from('zoe_sovereign_memory') as any).insert({
        user_id: user.id,
        event_type: eventType,
        content_text: contentText,
        zoe_state_json: mergedState,
        biometric_data_json: biometricData || {},
        session_id: sessionIdRef.current,
        error_data: errorData,
        proactive_initiative_ready: mergedState.pce?.proactive_ready || false,
        // Mind Merge Foundation fields
        merged_mind_entities: mergedMindEntities || [],
        // RAA Integration fields
        rca_diagnosis_json: rcaDiagnosis || {},
        system_stability_score: stabilityScore ?? 1.0
      });
    } catch (error) {
      console.error('[ZSMT] Failed to log:', error);
    }
  }, [user?.id, zoeState]);

  // Speak response using TTS
  const speakResponse = useCallback(async (text: string, voiceStyle: string = 'calm') => {
    if (!text) return;

    // Map voice style to TTS parameters
    const styleParams: Record<string, { pitch: number; rate: number }> = {
      calm: { pitch: 1.0, rate: 0.95 },
      warm: { pitch: 1.05, rate: 1.0 },
      urgent: { pitch: 1.1, rate: 1.15 },
      playful: { pitch: 1.15, rate: 1.1 },
    };

    const params = styleParams[voiceStyle] || styleParams.calm;

    // Use Web Speech API directly
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = params.pitch;
      utterance.rate = params.rate;
      utterance.volume = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Google UK English Female') ||
        v.lang.includes('en') && v.name.toLowerCase().includes('female')
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Weather handler
  const handleWeather = useCallback(async (): Promise<CommandResult> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      );
      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const weatherCode = data.current.weather_code;
      
      const conditions: Record<number, string> = {
        0: 'clear skies', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
        45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
        61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
        80: 'rain showers', 81: 'rain showers', 82: 'heavy rain showers', 95: 'thunderstorm'
      };
      
      const condition = conditions[weatherCode] || 'variable conditions';
      
      return {
        success: true,
        response: `Currently it's ${temp} degrees with ${condition}. ${temp < 15 ? 'You might want a jacket!' : temp > 28 ? 'Stay cool and hydrated!' : 'Lovely weather for any activity!'}`,
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      return {
        success: true,
        response: "I couldn't access your location for weather data. Would you like to tell me your city?",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, []);

  // Time handler
  const handleTime = useCallback((): CommandResult => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    let greeting = '';
    if (hours < 12) greeting = 'Good morning!';
    else if (hours < 17) greeting = 'Good afternoon!';
    else if (hours < 21) greeting = 'Good evening!';
    else greeting = 'Getting late!';
    
    return {
      success: true,
      response: `${greeting} The time is ${timeStr}.`,
      shouldSpeak: true,
      voiceStyle: 'calm'
    };
  }, []);

  // Date handler
  const handleDate = useCallback((): CommandResult => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    return {
      success: true,
      response: `Today is ${dateStr}.`,
      shouldSpeak: true,
      voiceStyle: 'calm'
    };
  }, []);

  // Movie handler
  const handleMovie = useCallback(async (command: string): Promise<CommandResult> => {
    const movieMatch = command.match(/(?:movie|film|cinema)\s+(.+)/i);
    const movieName = movieMatch?.[1] || 'that movie';
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [{ 
            role: 'user', 
            content: `Tell me about the movie "${movieName}" - include a brief plot summary, main cast, and whether it's worth watching. Keep it conversational and under 100 words.` 
          }],
          enableASI: true,
          soulMetrics: { intimacy: 50, selfHarmony: 50, loveEnergy: 50 }
        }
      });

      if (!error && data?.message) {
        return {
          success: true,
          response: data.message,
          shouldSpeak: true,
          voiceStyle: 'warm'
        };
      }
    } catch (e) {
      console.error('[Movie] API error:', e);
    }

    return {
      success: true,
      response: `I'd love to tell you about ${movieName}! It's on my watchlist too. Let me look that up for you.`,
      shouldSpeak: true,
      voiceStyle: 'playful'
    };
  }, []);

  // Greeting handler
  const handleGreeting = useCallback((): CommandResult => {
    const greetings = [
      "Hello! I'm here and ready to help. What would you like to do?",
      "Hey there! Great to hear from you. How can I assist?",
      "Hi! I'm listening and ready. What's on your mind?",
      "Hello! Always nice to chat. What can I do for you today?",
    ];
    
    return {
      success: true,
      response: greetings[Math.floor(Math.random() * greetings.length)],
      shouldSpeak: true,
      voiceStyle: 'warm'
    };
  }, []);

  // Help handler
  const handleHelp = useCallback((): CommandResult => {
    return {
      success: true,
      response: "I can help you with weather, time, finding movies, creating posts, navigating the platform, setting reminders, and much more. Just speak naturally and I'll understand!",
      shouldSpeak: true,
      voiceStyle: 'calm'
    };
  }, []);

  // Navigate handler
  const handleNavigate = useCallback((command: string): CommandResult => {
    const routes: Record<string, string> = {
      'home': '/home',
      'profile': '/profile',
      'chat': '/chat',
      'huddle': '/huddle',
      'timeline': '/timeline',
      'camera': '/camera',
      'settings': '/profile',
    };

    const match = command.match(/(?:show|open|go\s+to)\s+(\w+)/i);
    const destination = match?.[1]?.toLowerCase() || 'home';
    const route = routes[destination] || '/home';

    setTimeout(() => {
      window.location.href = route;
    }, 1500);

    return {
      success: true,
      response: `Taking you to ${destination} now.`,
      action: 'navigate',
      data: { route },
      shouldSpeak: true,
      voiceStyle: 'calm'
    };
  }, []);

  // AI Process handler (general knowledge) - ENHANCED with self-thinking and platform awareness
  const handleAIProcess = useCallback(async (command: string): Promise<CommandResult> => {
    if (!user?.id) {
      return {
        success: true,
        response: "I'd love to help you with that. Please sign in so I can give you a personalized response.",
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    }

    try {
      // Fetch user profile for personalization
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, bio, city')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch recent conversation context from ZSMT
      const { data: recentMemory } = await supabase
        .from('zoe_sovereign_memory' as any)
        .select('content_text, event_type, created_at')
        .eq('user_id', user.id)
        .in('event_type', ['voice_command', 'chat_message'])
        .order('created_at', { ascending: false })
        .limit(5);

      // Build conversation history
      const conversationHistory = (recentMemory || []).reverse().map((m: any) => ({
        role: m.event_type === 'voice_command' ? 'user' : 'assistant',
        content: m.content_text
      }));

      // Get current time context
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

      // Build platform context for Zoe's self-awareness
      const platformContext = {
        currentPage: window.location.pathname,
        userName: profile?.display_name || profile?.username || 'friend',
        userBio: profile?.bio || null,
        userCity: profile?.city || null,
        timeOfDay,
        currentTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        platformFeatures: ['timeline', 'dreams', 'architect', 'huddle', 'chat', 'profile', 'webdrop']
      };

      // Call enhanced zoe-chat with full context
      const { data, error } = await supabase.functions.invoke('zoe-chat', {
        body: {
          messages: [
            ...conversationHistory,
            { role: 'user', content: command }
          ],
          enableASI: true,
          soulMetrics: { 
            intimacy: 65, 
            selfHarmony: 70, 
            loveEnergy: 75,
            visionActive: false
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: now.toLocaleTimeString(),
          platformContext // Send platform awareness context
        }
      });

      if (!error && data?.message) {
        // Check if Zoe wants to take initiative/action
        const responseText = data.message;
        let voiceStyle: 'calm' | 'warm' | 'urgent' | 'playful' = 'warm';
        
        // Detect tone from response content
        if (responseText.toLowerCase().includes('exciting') || responseText.toLowerCase().includes('!')) {
          voiceStyle = 'playful';
        } else if (responseText.toLowerCase().includes('important') || responseText.toLowerCase().includes('urgent')) {
          voiceStyle = 'urgent';
        } else if (responseText.toLowerCase().includes('understand') || responseText.toLowerCase().includes('feel')) {
          voiceStyle = 'warm';
        }

        return {
          success: true,
          response: responseText,
          shouldSpeak: true,
          voiceStyle
        };
      }
    } catch (e) {
      console.error('[AI] Processing error:', e);
    }

    // Fallback response - still conversational
    const fallbackResponses = [
      "Hmm, that's an interesting thought. Let me think about it for a moment...",
      "I'm processing that. Give me a second to consider the best response...",
      "That's a good question. I want to give you a thoughtful answer...",
      "I'm here with you. Let me gather my thoughts on that..."
    ];
    
    return {
      success: true,
      response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      shouldSpeak: true,
      voiceStyle: 'calm'
    };
  }, [user?.id]);

  // Profile Access handler - Grant permission
  const handleProfileAccess = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      await supabase.from('profiles').update({ zoe_data_access_enabled: true }).eq('user_id', user.id);
      
      return {
        success: true,
        response: "Perfect! I now have access to your profile. I can learn about your interests, preferences, and help you better. Say 'Zoe what are my interests' to discover what I've learned about you!",
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      return {
        success: false,
        response: "I couldn't enable profile access. Please try again.",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, [user?.id]);

  // Profile Analysis handler - Analyze and return insights
  const handleProfileAnalysis = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      // Check permission
      const { data: profile } = await supabase
        .from('profiles')
        .select('zoe_data_access_enabled, display_name, bio, profession, hobbies, city, field_of_study, job_title, organization, birth_place, zoe_personality_tone')
        .eq('user_id', user.id)
        .single();

      if (!profile?.zoe_data_access_enabled) {
        return {
          success: true,
          response: "I need your permission to analyze your profile first. Say 'Zoe access my profile' to enable this feature.",
          shouldSpeak: true,
          voiceStyle: 'calm'
        };
      }

      // Fetch activity data
      const [postsRes, emotionsRes] = await Promise.all([
        supabase.from('posts').select('content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('emotion_logs').select('emotion, intensity').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      // Call the analyzer
      const { data, error } = await supabase.functions.invoke('zoe-profile-analyzer', {
        body: {
          context: {
            profile: {
              name: profile.display_name,
              bio: profile.bio,
              profession: profile.profession,
              hobbies: profile.hobbies,
              city: profile.city,
              fieldOfStudy: profile.field_of_study,
              jobTitle: profile.job_title,
              organization: profile.organization,
              birthPlace: profile.birth_place,
              personalityTone: profile.zoe_personality_tone
            },
            recentPosts: postsRes.data?.map(p => p.content) || [],
            emotionalPatterns: emotionsRes.data?.map(e => `${e.emotion} (${e.intensity}/10)`) || [],
            behaviorSummary: []
          },
          userId: user.id
        }
      });

      if (error) throw error;

      // Save discovered interests
      if (data?.interests?.length > 0) {
        await supabase.from('profiles').update({
          zoe_discovered_interests: data.interests,
          zoe_last_profile_analysis: new Date().toISOString()
        }).eq('user_id', user.id);
      }

      // Log to DHF
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'zoe_profile_analysis',
        event_category: 'ai_interaction',
        metadata: { interests_found: data?.interests?.length || 0 },
        dhf_logged: true
      });

      return {
        success: true,
        response: data?.summary || "I've analyzed your profile! You have a unique personality. Let me know what else you'd like to explore.",
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      console.error('[Profile] Analysis error:', error);
      return {
        success: true,
        response: "I had a small hiccup analyzing your profile. Let me try a simpler approach - what would you like to know about yourself?",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, [user?.id]);

  // Profile Interests handler
  const handleProfileInterests = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('zoe_data_access_enabled, hobbies, zoe_discovered_interests, profession, field_of_study')
        .eq('user_id', user.id)
        .single();

      if (!profile?.zoe_data_access_enabled) {
        return {
          success: true,
          response: "I need permission to analyze your interests. Say 'Zoe access my profile' to get started.",
          shouldSpeak: true,
          voiceStyle: 'calm'
        };
      }

      const hobbies = Array.isArray(profile.hobbies) ? profile.hobbies : [];
      const discoveredRaw = profile.zoe_discovered_interests;
      const discovered = Array.isArray(discoveredRaw) ? discoveredRaw as string[] : [];
      const allInterests = [...new Set([...hobbies, ...discovered])];

      if (allInterests.length === 0) {
        return {
          success: true,
          response: "I haven't discovered your interests yet. Tell me about yourself or add hobbies to your profile, and I'll learn more about you!",
          shouldSpeak: true,
          voiceStyle: 'warm'
        };
      }

      const interestsList = allInterests.slice(0, 5).join(', ');
      const professionText = profile.profession ? ` Based on your work in ${profile.profession},` : '';
      const studyText = profile.field_of_study ? ` and your studies in ${profile.field_of_study},` : '';

      return {
        success: true,
        response: `Your main interests include ${interestsList}.${professionText}${studyText} I can see you're someone with diverse passions! Would you like me to suggest new activities based on these?`,
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      return {
        success: true,
        response: "I couldn't fetch your interests right now. Try again in a moment.",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, [user?.id]);

  // Profile Revoke handler
  const handleProfileRevoke = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      await supabase.from('profiles').update({ zoe_data_access_enabled: false }).eq('user_id', user.id);
      
      return {
        success: true,
        response: "I've removed my access to your profile data. Your privacy is important. You can re-enable this anytime by saying 'Zoe access my profile'.",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    } catch (error) {
      return {
        success: false,
        response: "I couldn't revoke access. Please try again.",
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, [user?.id]);

  // DHF Add handler - Log data to behavioral history
  const handleDHFAdd = useCallback(async (context?: string): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'voice_data_log',
        event_category: 'user_initiated',
        context_snippet: context || 'Voice-initiated data log',
        metadata: { source: 'voice_command', timestamp: new Date().toISOString() },
        dhf_logged: true
      });

      return {
        success: true,
        response: "Done! I've logged that to your behavioral history. This helps me understand you better over time.",
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      return { success: false, response: "I couldn't save that data. Let me try again.", shouldSpeak: true, voiceStyle: 'calm' };
    }
  }, [user?.id]);

  // DHF Read handler - Get behavioral summary
  const handleDHFRead = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      const { data, error } = await supabase
        .from('behavioral_events')
        .select('event_type, event_category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          response: "You don't have any behavioral data logged yet. As you use the platform, I'll learn from your interactions!",
          shouldSpeak: true,
          voiceStyle: 'calm'
        };
      }

      const categories = [...new Set(data.map(d => d.event_category))];
      const summary = `I have ${data.length} recent activities logged across ${categories.length} categories: ${categories.join(', ')}. Would you like more details on any specific area?`;

      return { success: true, response: summary, shouldSpeak: true, voiceStyle: 'warm' };
    } catch (error) {
      return { success: false, response: "I couldn't read your data history right now.", shouldSpeak: true, voiceStyle: 'calm' };
    }
  }, [user?.id]);

  // Announce Notifications handler
  const handleAnnounceNotifications = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, created_at, from_user_id')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: true, response: "You're all caught up! No new notifications.", shouldSpeak: true, voiceStyle: 'warm' };
      }

      const types = data.map(n => n.type);
      const likesCount = types.filter(t => t === 'like').length;
      const commentsCount = types.filter(t => t === 'comment').length;
      const othersCount = types.length - likesCount - commentsCount;

      let announcement = `You have ${data.length} new notifications. `;
      if (likesCount > 0) announcement += `${likesCount} likes, `;
      if (commentsCount > 0) announcement += `${commentsCount} comments, `;
      if (othersCount > 0) announcement += `${othersCount} other updates.`;

      return { success: true, response: announcement.replace(/, $/, '.'), shouldSpeak: true, voiceStyle: 'warm' };
    } catch (error) {
      return { success: false, response: "I couldn't fetch your notifications right now.", shouldSpeak: true, voiceStyle: 'calm' };
    }
  }, [user?.id]);

  // Announce Messages handler
  const handleAnnounceMessages = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('content, sender_id, created_at')
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: true, response: "No new messages in your inbox.", shouldSpeak: true, voiceStyle: 'warm' };
      }

      const senderCount = new Set(data.map(m => m.sender_id)).size;
      const preview = data[0]?.content?.substring(0, 50) || '';

      return {
        success: true,
        response: `You have ${data.length} unread messages from ${senderCount} people. The latest says: "${preview}..."`,
        shouldSpeak: true,
        voiceStyle: 'warm'
      };
    } catch (error) {
      return { success: false, response: "I couldn't fetch your messages right now.", shouldSpeak: true, voiceStyle: 'calm' };
    }
  }, [user?.id]);

  // Summarize Activity handler
  const handleSummarizeActivity = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) {
      return { success: false, response: "Please sign in first.", shouldSpeak: true, voiceStyle: 'calm' };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [posts, emotions, behaviors] = await Promise.all([
        supabase.from('posts').select('id').eq('user_id', user.id).gte('created_at', today.toISOString()),
        supabase.from('emotion_logs').select('emotion').eq('user_id', user.id).gte('created_at', today.toISOString()),
        supabase.from('behavioral_events').select('event_type').eq('user_id', user.id).gte('created_at', today.toISOString())
      ]);

      const postsCount = posts.data?.length || 0;
      const emotionsLogged = emotions.data?.length || 0;
      const actionsCount = behaviors.data?.length || 0;

      const summary = `Here's your day so far: You've created ${postsCount} posts, logged ${emotionsLogged} emotions, and I've tracked ${actionsCount} activities. ${postsCount > 5 ? 'You\'ve been really active!' : 'Keep going, you\'re doing great!'}`;

      return { success: true, response: summary, shouldSpeak: true, voiceStyle: 'warm' };
    } catch (error) {
      return { success: false, response: "I couldn't summarize your activity right now.", shouldSpeak: true, voiceStyle: 'calm' };
    }
  }, [user?.id]);

  // MAIN COMMAND HANDLER - Single entry point
  const handleZoeSovereignCommand = useCallback(async (commandText: string): Promise<CommandResult> => {
    const now = Date.now();
    
    // Cooldown check (1 second)
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) {
      return {
        success: false,
        response: '',
        shouldSpeak: false
      };
    }
    
    lastCommandTimeRef.current = now;
    setIsProcessing(true);
    setLastCommand(commandText);

    // Log command to ZSMT
    await logToZSMT('voice_command', commandText);

    try {
      // Find matching handler (highest priority first)
      const sortedPatterns = [...COMMAND_PATTERNS].sort((a, b) => b.priority - a.priority);
      
      let result: CommandResult | null = null;

      for (const cmd of sortedPatterns) {
        if (cmd.pattern.test(commandText)) {
          console.log(`[Sovereign] Matched: ${cmd.handler} (priority: ${cmd.priority})`);
          
          switch (cmd.handler) {
            case 'profile_access':
              result = await handleProfileAccess();
              break;
            case 'profile_analyze':
            case 'profile_grill':
              result = await handleProfileAnalysis();
              break;
            case 'profile_interests':
              result = await handleProfileInterests();
              break;
            case 'profile_revoke':
              result = await handleProfileRevoke();
              break;
            case 'dhf_add':
              result = await handleDHFAdd(commandText);
              break;
            case 'dhf_read':
              result = await handleDHFRead();
              break;
            case 'announce_notifications':
              result = await handleAnnounceNotifications();
              break;
            case 'announce_messages':
              result = await handleAnnounceMessages();
              break;
            case 'save_conversation':
              result = await handleDHFAdd('Conversation saved via voice command');
              break;
            case 'summarize_activity':
              result = await handleSummarizeActivity();
              break;
            case 'home_surface': {
              const normalized = commandText.toLowerCase();
              let homeCommand: string | null = null;
              if (normalized.includes('loop') && normalized.includes('hide') && !normalized.includes('unhide')) homeCommand = 'hide-loops';
              else if (normalized.includes('loop') && (normalized.includes('unhide') || normalized.includes('show') || normalized.includes('open'))) homeCommand = 'unhide-loops';
              else if ((normalized.includes('stop') || normalized.includes('pause')) && (normalized.includes('scroll') || normalized.includes('timeline') || normalized.includes('feed'))) homeCommand = 'stop-scrolling';
              else if ((normalized.includes('start') || normalized.includes('resume') || normalized.includes('play')) && (normalized.includes('scroll') || normalized.includes('timeline') || normalized.includes('feed'))) homeCommand = 'start-scrolling';

              if (homeCommand) {
                window.dispatchEvent(new CustomEvent('mmora:home-command', { detail: { command: homeCommand, source: 'zoe-sovereign-command' } }));
                result = {
                  success: true,
                  response: homeCommand === 'hide-loops' ? 'Loops hidden.'
                    : homeCommand === 'unhide-loops' ? 'Loops shown.'
                    : homeCommand === 'stop-scrolling' ? 'Timeline auto scroll paused.'
                    : 'Timeline auto scroll resumed.',
                  action: homeCommand,
                  shouldSpeak: true,
                  voiceStyle: 'calm'
                };
              } else {
                result = await handleAIProcess(commandText);
              }
              break;
            }
            case 'weather':
              result = await handleWeather();
              break;
            case 'time':
              result = handleTime();
              break;
            case 'date':
              result = handleDate();
              break;
            case 'movie':
              result = await handleMovie(commandText);
              break;
            case 'greeting':
              result = handleGreeting();
              break;
            case 'thanks':
              result = { success: true, response: "You're welcome! Anything else I can help with?", shouldSpeak: true, voiceStyle: 'warm' };
              break;
            case 'help':
              result = handleHelp();
              break;
            case 'navigate':
              result = handleNavigate(commandText);
              break;
            case 'knowledge':
            case 'ai_process':
              result = await handleAIProcess(commandText);
              break;
            default:
              result = await handleAIProcess(commandText);
          }
          
          break;
        }
      }

      if (!result) {
        result = await handleAIProcess(commandText);
      }

      // Speak the response
      if (result.shouldSpeak && result.response) {
        await speakResponse(result.response, result.voiceStyle);
      }

      // Log success to ZSMT
      await logToZSMT('chat_message', result.response, {
        ecn: { ...zoeState?.ecn || {}, engagement_score: 70, action_tendency: 'responding' } as any
      });

      setIsProcessing(false);
      return result;

    } catch (error) {
      console.error('[Sovereign] Command error:', error);
      
      // ERROR MASKING - Conversational recovery
      const maskPhrase = getErrorMaskPhrase();
      
      // Log error to ZSMT
      await logToZSMT('error_masked_voice', commandText, undefined, undefined, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Speak the mask phrase
      await speakResponse(maskPhrase, 'calm');

      setIsProcessing(false);
      return {
        success: false,
        response: maskPhrase,
        shouldSpeak: true,
        voiceStyle: 'calm'
      };
    }
  }, [
    logToZSMT, speakResponse, getErrorMaskPhrase, zoeState,
    handleWeather, handleTime, handleDate, handleMovie,
    handleGreeting, handleHelp, handleNavigate, handleAIProcess,
    handleProfileAccess, handleProfileAnalysis, handleProfileInterests, handleProfileRevoke,
    handleDHFAdd, handleDHFRead, handleAnnounceNotifications, handleAnnounceMessages, handleSummarizeActivity
  ]);

  // Load Zoe state from ZSMT on mount
  const loadZoeState = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Use any to bypass type checking for RPC
      const { data, error } = await (supabase as any).rpc('get_zoe_sovereign_state', {
        p_user_id: user.id
      });

      if (!error && data) {
        setZoeState(data as unknown as ZoeState);
      }
    } catch (e) {
      console.log('[Sovereign] Could not load state:', e);
    }
  }, [user?.id]);

  return {
    handleZoeSovereignCommand,
    isProcessing,
    lastCommand,
    zoeState,
    loadZoeState,
    speakResponse,
    logToZSMT,
    sessionId: sessionIdRef.current
  };
};
