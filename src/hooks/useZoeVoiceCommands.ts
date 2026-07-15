import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNaturalLanguageCommands } from './useNaturalLanguageCommands';
import { useVoiceShortcuts } from './useVoiceShortcuts';

interface ZoeCommand {
  pattern: RegExp;
  action: (matches: RegExpMatchArray) => Promise<void> | void;
  description: string;
  requiresConfirmation?: boolean;
}

// Fuzzy matching helper - checks if text is similar enough
const fuzzyMatch = (text: string, pattern: string, threshold: number = 0.8): boolean => {
  const textLower = text.toLowerCase().trim();
  const patternLower = pattern.toLowerCase().trim();
  
  // Exact match
  if (textLower === patternLower) return true;
  
  // Contains match
  if (textLower.includes(patternLower) || patternLower.includes(textLower)) return true;
  
  // Levenshtein distance for typos/accents
  const distance = levenshteinDistance(textLower, patternLower);
  const maxLength = Math.max(textLower.length, patternLower.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity >= threshold;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Debounce recognition restarts to prevent rapid abort cycles
let recognitionRestartTimeout: NodeJS.Timeout | null = null;
const RESTART_DELAY = 300; // Reduced for faster restart
let keepAliveInterval: NodeJS.Timeout | null = null;
const KEEP_ALIVE_INTERVAL = 6000; // Restart every 6 seconds (Safari times out at ~7s, Chrome at ~60s)

// Cross-browser SpeechRecognition API
const getSpeechRecognition = (): any | null => {
  if (typeof window === 'undefined') return null;
  
  // Standard API (Firefox, Safari 14.1+)
  if ('SpeechRecognition' in window) {
    return (window as any).SpeechRecognition;
  }
  
  // Webkit prefix (Chrome, Edge, Safari older versions)
  if ('webkitSpeechRecognition' in window) {
    return (window as any).webkitSpeechRecognition;
  }
  
  return null;
};

// Detect browser/platform for platform-specific fixes
const detectPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isChrome = /chrome/.test(ua) && !/edge/.test(ua);
  const isMac = /macintosh/.test(ua);
  
  return { isIOS, isSafari, isChrome, isMac };
};

export const useZoeVoiceCommands = (userId: string | undefined) => {
  const navigate = useNavigate();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const [pendingCommand, setPendingCommand] = useState<{ command: string; action: () => void } | null>(null);
  const confirmationTimeoutRef = useRef<NodeJS.Timeout>();
  const { processNaturalLanguage } = useNaturalLanguageCommands(userId);
  const { matchShortcut, executeShortcut } = useVoiceShortcuts();

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE CALL COMMANDS - "Zoe call John", "Zoe video call John"
  // Phase 4: Calls to Zoe AI are DISABLED - only P2P calls allowed
  // ═══════════════════════════════════════════════════════════════════════════
  const initiateVoiceCall = useCallback(async (targetName: string, withVideo: boolean = false) => {
    if (!userId) {
      speakResponse('Please sign in to make calls');
      return;
    }
    
    // Phase 4: SEVER ZOE-AI VIDEO LINK - Block calls to AI
    const lowerTarget = targetName.toLowerCase().trim();
    if (lowerTarget === 'zoe' || lowerTarget === 'zoe ai' || lowerTarget === 'zoe a.i.' || lowerTarget === 'the ai') {
      speakResponse('Voice and video calls with Zoe AI are currently unavailable. You can still call other users.');
      toast.error('Protocol Unavailable', {
        description: 'Voice/video calls with Zoe AI are disabled. P2P calls with other users remain active.',
        duration: 4000,
      });
      return;
    }
    
    // Search for user by display name or username
    const { data: targetUsers, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url')
      .or(`display_name.ilike.%${targetName}%,username.ilike.%${targetName}%`)
      .limit(1);
    
    if (error || !targetUsers?.length) {
      speakResponse(`I couldn't find a user named ${targetName}. Please check the name and try again.`);
      return;
    }
    
    const target = targetUsers[0];
    const displayName = target.display_name || target.username || targetName;
    
    speakResponse(`Initiating ${withVideo ? 'video' : 'voice'} call to ${displayName}`);
    
    // Dispatch event for QuantumCallUI to handle
    window.dispatchEvent(new CustomEvent('zoe-initiate-call', { 
      detail: { 
        userId: target.user_id, 
        displayName,
        avatarUrl: target.profile_photo_url,
        withVideo 
      } 
    }));
    
    toast.success(`Calling ${displayName}...`, {
      description: withVideo ? 'Video call' : 'Voice call',
    });
  }, [userId]);

  const commands: ZoeCommand[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // VOICE/VIDEO CALL COMMANDS - "Zoe call John", "call John video"
    // ═══════════════════════════════════════════════════════════════════════════
    {
      pattern: /^(?:zoe\s+)?(?:call|phone|dial)\s+(.+?)(?:\s+(?:video|with\s+video))?$/i,
      action: async (matches) => {
        const fullMatch = matches[0].toLowerCase();
        const targetName = matches[1].trim();
        const withVideo = /video|with\s+video/.test(fullMatch);
        await initiateVoiceCall(targetName, withVideo);
      },
      description: 'Call [username] - Voice call a user'
    },
    {
      pattern: /^(?:zoe\s+)?video\s+call\s+(.+)$/i,
      action: async (matches) => {
        const targetName = matches[1].trim();
        await initiateVoiceCall(targetName, true);
      },
      description: 'Video call [username] - Video call a user'
    },
    {
      pattern: /^(?:zoe\s+)?(?:start|make|initiate)\s+(?:a\s+)?(?:video\s+)?call\s+(?:to|with)\s+(.+)$/i,
      action: async (matches) => {
        const fullMatch = matches[0].toLowerCase();
        const targetName = matches[1].trim();
        const withVideo = fullMatch.includes('video');
        await initiateVoiceCall(targetName, withVideo);
      },
      description: 'Start call with [username]'
    },
    {
      pattern: /^(?:end|hang\s*up|stop)\s+(?:the\s+)?call$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-end-call'));
        speakResponse('Ending call');
      },
      description: 'End call - Hang up current call'
    },

    // Quick navigation - multiple aliases for natural speech
    {
      pattern: /^(?:open|show|go(?:\s+to)?|take\s+me\s+to|navigate\s+to)\s+(home|profile|chat|huddle|webdrop|camera)$/i,
      action: async (matches) => {
        const page = matches[1].toLowerCase();
        const routes: Record<string, string> = {
          home: '/home',
          profile: '/profile',
          chat: '/chat',
          huddle: '/huddle',
          webdrop: '/webdrop',
          camera: '/camera'
        };
        navigate(routes[page] || '/home');
        speakResponse(`Opening ${page}`);
      },
      description: 'Open home, profile, chat, huddle, webdrop, or camera'
    },

    // Direct page shortcuts
    {
      pattern: /^(home|profile|chat|huddle|webdrop|camera)$/i,
      action: async (matches) => {
        const page = matches[1].toLowerCase();
        const routes: Record<string, string> = {
          home: '/home',
          profile: '/profile',
          chat: '/chat',
          huddle: '/huddle',
          webdrop: '/webdrop',
          camera: '/camera'
        };
        navigate(routes[page] || '/home');
        speakResponse(`Opening ${page}`);
      },
      description: 'Quick page access'
    },

    // Weather commands
    {
      pattern: /^(?:what(?:'s| is)?|tell me|get|show|check)\s+(?:the\s+)?weather(?:\s+today)?$/i,
      action: async () => {
        speakResponse('Let me check the weather for you');
        try {
          const { getUserLocation, getWeatherInfo } = await import('@/utils/weatherHelpers');
          const position = await getUserLocation();
          const weather = await getWeatherInfo(position.coords.latitude, position.coords.longitude);
          if (weather) {
            speakResponse(`It's ${weather.temperature} degrees with ${weather.condition} in ${weather.location}`);
          } else {
            speakResponse('I couldn\'t get the weather right now. Please try again.');
          }
        } catch (error) {
          speakResponse('Weather information is not available. Please check your location settings.');
        }
      },
      description: 'Get current weather'
    },

    {
      pattern: /^(?:weather\s+)?(?:in|for|at)\s+(.+)$/i,
      action: async (matches) => {
        const location = matches[1];
        speakResponse(`Checking weather for ${location}`);
        // For specific locations, we'd need geocoding API - for now give general response
        speakResponse(`I can check the weather for your current location. For ${location}, please use the search feature.`);
      },
      description: 'Get weather for location'
    },

    // Traffic commands
    {
      pattern: /^(?:what(?:'s| is)?|tell me|get|show|check)\s+(?:the\s+)?traffic(?:\s+(?:conditions?|today|now))?$/i,
      action: async () => {
        speakResponse('Checking traffic conditions');
        try {
          const { getUserLocation } = await import('@/utils/weatherHelpers');
          const { getTrafficInfo } = await import('@/utils/trafficHelpers');
          const position = await getUserLocation();
          const traffic = await getTrafficInfo(position.coords.latitude, position.coords.longitude);
          if (traffic) {
            speakResponse(traffic.summary);
          } else {
            speakResponse('Traffic information is not available right now.');
          }
        } catch (error) {
          speakResponse('I couldn\'t get traffic information. Please check your location settings.');
        }
      },
      description: 'Get traffic conditions'
    },

    {
      pattern: /^(?:how(?:'s| is)?)\s+(?:the\s+)?(?:commute|drive|driving)(?:\s+today)?$/i,
      action: async () => {
        speakResponse('Let me check your commute conditions');
        try {
          const { getCommuteAdvice } = await import('@/utils/trafficHelpers');
          const hour = new Date().getHours();
          const advice = getCommuteAdvice(hour);
          speakResponse(advice);
        } catch (error) {
          speakResponse('Commute information is not available right now.');
        }
      },
      description: 'Get commute advice'
    },

    // Daily briefing command
    {
      pattern: /^(?:give me|tell me|what(?:'s| is))\s+(?:my\s+)?(?:daily\s+)?(?:briefing|update|summary)$/i,
      action: async () => {
        speakResponse('Preparing your daily briefing');
        window.dispatchEvent(new CustomEvent('zoe-trigger-briefing'));
      },
      description: 'Get daily briefing'
    },

    {
      pattern: /^(?:good\s+)?(?:morning|afternoon|evening)(?:\s+zoe)?$/i,
      action: async () => {
        speakResponse('Let me give you a quick update');
        window.dispatchEvent(new CustomEvent('zoe-trigger-briefing'));
      },
      description: 'Trigger greeting briefing'
    },

    // AI companion access
    {
      pattern: /^(?:open|show|talk\s+to|speak\s+with)\s+(?:zoe|ai)$/i,
      action: async () => {
        navigate('/ai-companion');
        speakResponse('Opening Zoe');
      },
      description: 'Open Zoe AI companion'
    },

    // Universal Timeline access
    {
      pattern: /^(?:open|show|display|take\s+me\s+to)\s+(?:universal\s+)?(?:timeline|time\s+line|cosmic\s+timeline|history)$/i,
      action: async () => {
        navigate('/universal-timeline');
        speakResponse('Opening Universal Timeline. Explore the cosmos from the Big Bang to the future');
      },
      description: 'Open Universal Agentic Timeline'
    },

    {
      pattern: /^(?:show|explore|see)\s+(?:the\s+)?(?:universe|cosmos|big\s+bang|history\s+of\s+universe)$/i,
      action: async () => {
        navigate('/universal-timeline');
        speakResponse('Initiating cosmic exploration from the Big Bang to post-human future');
      },
      description: 'Open Universal Timeline with cosmic journey'
    },

    // Huddle zoom controls
    {
      pattern: /^(?:zoom\s+in|increase\s+zoom|zoom\s+closer)$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('huddle-zoom', { detail: { direction: 'in' } }));
        speakResponse('Zooming in');
      },
      description: 'Zoom in on map'
    },

    {
      pattern: /^(?:zoom\s+out|decrease\s+zoom|zoom\s+away)$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('huddle-zoom', { detail: { direction: 'out' } }));
        speakResponse('Zooming out');
      },
      description: 'Zoom out on map'
    },

    {
      pattern: /^(?:zoom\s+to|focus\s+on|show\s+me)\s+(.+)$/i,
      action: (matches) => {
        const location = matches[1];
        window.dispatchEvent(new CustomEvent('huddle-zoom-location', { detail: { location } }));
        speakResponse(`Zooming to ${location}`);
      },
      description: 'Zoom to specific location'
    },

    // Online user search
    {
      pattern: /^(?:show|find|search|who\s+is)\s+online(?:\s+(?:users?|friends?|people))?$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('huddle-show-online'));
        speakResponse('Showing online users');
      },
      description: 'Show online users in huddle'
    },

    {
      pattern: /^(?:search|find|look\s+for)\s+(?:online\s+)?(?:user|friend|person)\s+(.+)$/i,
      action: (matches) => {
        const query = matches[1];
        window.dispatchEvent(new CustomEvent('huddle-search-user', { detail: { query } }));
        speakResponse(`Searching for ${query}`);
      },
      description: 'Search for specific online user'
    },

    // All users / recommendations toggle
    {
      pattern: /^(?:show|display|find)\s+all\s+(?:users?|people)$/i,
      action: () => {
        navigate('/huddle');
        window.dispatchEvent(new CustomEvent('huddle-show-all-users'));
        speakResponse('Showing all users on the platform');
      },
      description: 'Show all users in huddle'
    },

    {
      pattern: /^(?:show|display|find)\s+(?:my\s+)?(?:matches|recommendations|interest\s+matches)$/i,
      action: () => {
        navigate('/huddle');
        window.dispatchEvent(new CustomEvent('huddle-show-recommendations'));
        speakResponse('Showing your interest matches');
      },
      description: 'Show interest-based recommendations'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SELF-HEALING DIAGNOSTICS - "Zoe, scan for bugs"
    // Triggers comprehensive system diagnostic and shows stability score
    // ═══════════════════════════════════════════════════════════════════════════
    {
      pattern: /^(?:zoe\s+)?(?:scan\s+for\s+bugs?|run\s+diagnostics?|self\s+scan|health\s+check|system\s+check|check\s+health|fix\s+yourself|self\s+heal)$/i,
      action: async () => {
        speakResponse('Initiating self-diagnostic scan. Analyzing system integrity...');
        
        // Trigger the self-scan event
        window.dispatchEvent(new CustomEvent('zoe-self-scan-and-fix'));
        
        // Fetch stability score from ZSMT
        if (userId) {
          try {
            const { data, error } = await supabase.rpc('get_zoe_stability_score', { p_user_id: userId });
            
            if (!error && data !== null) {
              const score = (typeof data === 'number' ? data : parseFloat(String(data))) * 100;
              const status = score >= 85 ? 'healthy' : score >= 60 ? 'degraded' : 'critical';
              
              speakResponse(`System stability score: ${score.toFixed(1)}%. Status: ${status}. ${
                status === 'healthy' ? 'All systems operating normally.' :
                status === 'degraded' ? 'Some issues detected. Running auto-repair.' :
                'Critical issues found. Manual attention may be required.'
              }`);
              
              toast.info(`Stability Score: ${score.toFixed(1)}%`, {
                description: `System status: ${status.toUpperCase()}`,
                duration: 5000,
              });
            } else {
              speakResponse('Diagnostic complete. No stability data available yet. System appears operational.');
            }
          } catch (err) {
            console.error('[SELF-SCAN] Error:', err);
            speakResponse('Diagnostic scan encountered an error, but I\'m still operational.');
          }
        } else {
          speakResponse('Diagnostic requires authentication. Please sign in to access full system health.');
        }
      },
      description: 'Scan for bugs and show system stability score'
    },


    // Quick search commands
    {
      pattern: /^(?:find|search|look\s+for|show\s+me)\s+users?\s+(.+)/i,
      action: async (matches) => {
        const query = matches[1];
        navigate(`/huddle?search=${encodeURIComponent(query)}`);
        speakResponse(`Finding users with ${query}`);
      },
      description: 'Find users'
    },
    
    {
      pattern: /^(?:find|search|look\s+for|show\s+me)\s+posts?\s+(?:about\s+)?(.+)/i,
      action: async (matches) => {
        const query = matches[1];
        navigate(`/home?search=${encodeURIComponent(query)}`);
        speakResponse(`Finding posts about ${query}`);
      },
      description: 'Find posts'
    },

    // Universal conversational search
    {
      pattern: /^(?:search|find|look\s+for|tell\s+me\s+about|what\s+is|who\s+is|show\s+me\s+information\s+about)\s+(.+)/i,
      action: async (matches) => {
        const query = matches[1];
        navigate(`/home?search=${encodeURIComponent(query)}`);
        speakResponse(`I'm searching for "${query}" across the entire platform. Let me show you what I found!`);
      },
      description: 'Universal search',
      requiresConfirmation: false
    },

    // Quick post creation
    {
      pattern: /^(?:post|create\s+post|make\s+post|share)\s+(.+)/i,
      action: async (matches) => {
        if (!userId) return;
        const content = matches[1];
        
        const { error } = await supabase.from('posts').insert({
          user_id: userId,
          content,
          visibility: 'global'
        });

        if (error) {
          speakResponse('Could not create post');
        } else {
          speakResponse('Post created');
          navigate('/home');
        }
      },
      description: 'Post [your message]'
    },

    // Zoe: generate image and auto-post to a timeline.
    // Examples:
    //   "create an image of a red elephant and post to general timeline"
    //   "create image for friends day and post it to my friends timeline"
    //   "generate a picture of paris at sunset and share to my timeline"
    {
      pattern: /^(?:create|generate|make)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of|for|about)\s+(.+?)(?:\s+and\s+(?:post|share|publish)(?:\s+it)?\s+(?:to|on)\s+(?:my\s+)?(general|friends?|personal|private|public)\s+timeline)?\s*$/i,
      action: async (matches) => {
        if (!userId) { speakResponse('You need to be signed in first'); return; }
        const subject = (matches[1] || '').trim();
        const audience = (matches[2] || 'general').toLowerCase();
        const visibility = audience.startsWith('friend') || audience === 'personal' || audience === 'private' ? 'friends' : 'global';
        speakResponse(`Creating an image of ${subject} — one moment.`);
        try {
          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt: subject, width: 1024, height: 1024 },
          });
          if (error || !data?.imageUrl) {
            console.error('[Zoe] image generation failed', error, data);
            speakResponse('Sorry, I could not generate that image right now.');
            return;
          }
          const { error: postErr } = await supabase.from('posts').insert({
            user_id: userId,
            content: subject,
            media_url: data.imageUrl,
            media_type: 'image/generated',
            visibility,
          });
          if (postErr) {
            console.error('[Zoe] post insert failed', postErr);
            speakResponse('The image was created but I could not post it.');
            return;
          }
          speakResponse(`Done. I posted the image to your ${visibility === 'friends' ? 'friends' : 'general'} timeline.`);
          navigate('/home');
        } catch (e) {
          console.error('[Zoe] create-image-and-post threw', e);
          speakResponse('Something went wrong while creating the image.');
        }
      },
      description: 'Create an image and post to a timeline',
    },

    // Quick profile updates
    {
      pattern: /^(?:bio|update\s+bio|set\s+bio|change\s+bio)\s+(.+)/i,
      action: async (matches) => {
        if (!userId) return;
        const newBio = matches[1];
        
        const { error } = await supabase
          .from('profiles')
          .update({ bio: newBio })
          .eq('user_id', userId);

        if (!error) {
          speakResponse('Bio updated');
        }
      },
      description: 'Bio [new bio]'
    },

    {
      pattern: /^(?:status|set\s+status|update\s+status|change\s+status)\s+(.+)/i,
      action: async (matches) => {
        if (!userId) return;
        const newStatus = matches[1];
        
        const { error } = await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('user_id', userId);

        if (!error) {
          speakResponse(`Status set to ${newStatus}`);
        }
      },
      description: 'Status [new status]'
    },

    // Quick hobby management
    {
      pattern: /^(?:add\s+hobby|new\s+hobby|create\s+hobby)\s+(.+)/i,
      action: async (matches) => {
        if (!userId) return;
        const newHobby = matches[1];
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('hobbies')
          .eq('user_id', userId)
          .single();

        const hobbies = profile?.hobbies || [];
        if (!hobbies.includes(newHobby)) {
          hobbies.push(newHobby);
          
          const { error } = await supabase
            .from('profiles')
            .update({ hobbies })
            .eq('user_id', userId);

          if (!error) {
            speakResponse(`Added ${newHobby}`);
          }
        } else {
          speakResponse(`Already have ${newHobby}`);
        }
      },
      description: 'Add hobby [hobby name]'
    },

    // Quick friend actions
    {
      pattern: /^(?:friend|add\s+friend|send\s+friend\s+request\s+to)\s+(?:request\s+)?(.+)/i,
      action: async (matches) => {
        if (!userId) return;
        const username = matches[1];
        
        const { data: targetUser } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', username)
          .single();

        if (targetUser) {
          const { error } = await supabase.from('friend_requests').insert({
            sender_id: userId,
            receiver_id: targetUser.user_id,
            status: 'pending'
          });

          if (!error) {
            speakResponse(`Request sent to ${username}`);
          }
        } else {
          speakResponse(`User ${username} not found`);
        }
      },
      description: 'Friend [username]'
    },

    // Quick settings access
    {
      pattern: /^(?:settings|open\s+settings|show\s+settings)$/i,
      action: () => {
        navigate('/profile');
        speakResponse('Opening settings');
      },
      description: 'Settings'
    },

    // Logout
    {
      pattern: /^(?:logout|log\s+out|sign\s+out)$/i,
      action: async () => {
        await supabase.auth.signOut();
        speakResponse('Logging out');
        navigate('/auth');
      },
      description: 'Logout'
    },

    // Refresh
    {
      pattern: /^(?:refresh|reload)$/i,
      action: () => {
        window.location.reload();
        speakResponse('Refreshing');
      },
      description: 'Refresh'
    },

    // Voice commands reference
    {
      pattern: /^(?:show|view|open)\s+commands$/i,
      action: () => {
        navigate('/profile');
        speakResponse('Opening commands reference');
      },
      description: 'Show commands reference'
    },

    // Zoe Orb User Messaging Commands
    {
      pattern: /^(?:open|show|switch\s+to)\s+(?:zoe|zoe\s+orb|ai\s+chat)$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-orb-switch-mode', { detail: { mode: 'zoe' } }));
        speakResponse('Switching to Zoe AI chat');
      },
      description: 'Switch to Zoe AI mode in orb'
    },

    {
      pattern: /^(?:open|show|switch\s+to)\s+(?:user\s+chat|messages|direct\s+messages?)$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-orb-switch-mode', { detail: { mode: 'user' } }));
        speakResponse('Opening user messaging');
      },
      description: 'Switch to user messaging mode'
    },

    {
      pattern: /^(?:message|send\s+message\s+to|chat\s+with|dm)\s+(.+)$/i,
      action: async (matches) => {
        const userName = matches[1].trim();
        window.dispatchEvent(new CustomEvent('zoe-orb-message-user', { detail: { userName } }));
        speakResponse(`Opening conversation with ${userName}`);
      },
      description: 'Message [username] - Start a chat with a user'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RELATIONSHIP-BASED MESSAGING COMMANDS
    // Examples: "Zoe inform my son to call me", "Tell my wife I'll be late"
    // ═══════════════════════════════════════════════════════════════════════════
    {
      pattern: /^(?:zoe\s+)?(?:inform|tell|message|notify|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|grandpa|grandma|grandfather|grandmother|uncle|aunt|cousin|friend|partner)\s+(?:to|that|about)?\s*(.+)$/i,
      action: async (matches) => {
        if (!userId) {
          speakResponse('Please sign in to send messages');
          return;
        }
        
        const relation = matches[1].toLowerCase().trim();
        const message = matches[2].trim();
        
        // Map relation names to relationship types
        const relationMap: Record<string, string[]> = {
          'son': ['parent_child'],
          'daughter': ['parent_child'],
          'wife': ['spouse'],
          'husband': ['spouse'],
          'father': ['parent_child'],
          'mother': ['parent_child'],
          'dad': ['parent_child'],
          'mom': ['parent_child'],
          'brother': ['sibling'],
          'sister': ['sibling'],
          'grandpa': ['grandparent'],
          'grandma': ['grandparent'],
          'grandfather': ['grandparent'],
          'grandmother': ['grandparent'],
          'uncle': ['extended_family'],
          'aunt': ['extended_family'],
          'cousin': ['extended_family'],
          'friend': ['friend'],
          'partner': ['partner', 'spouse']
        };
        
        const relationTypes = relationMap[relation] || ['friend'];
        
        speakResponse(`Looking for your ${relation} to send: "${message}"`);
        
        try {
          // Find related user - check user_relationships table
          const { data: relationships, error: relError } = await supabase
            .from('user_relationships')
            .select(`
              id,
              requester_id,
              recipient_id,
              relationship_type,
              requester_label,
              recipient_label,
              status
            `)
            .eq('status', 'confirmed')
            .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
          
          if (relError || !relationships?.length) {
            speakResponse(`I couldn't find your ${relation}. Please add them as a relationship first in your profile.`);
            return;
          }
          
          // Find matching relationship
          let targetUserId: string | null = null;
          
          for (const rel of relationships) {
            const isRequester = rel.requester_id === userId;
            const otherUserLabel = isRequester ? rel.recipient_label : rel.requester_label;
            const myLabel = isRequester ? rel.requester_label : rel.recipient_label;
            
            // Check if the relation matches either label
            const labelsToCheck = [otherUserLabel?.toLowerCase(), myLabel?.toLowerCase()].filter(Boolean);
            const relationLower = relation.toLowerCase();
            
            // Map common variations
            const matchLabels = [relation];
            if (relation === 'dad') matchLabels.push('father');
            if (relation === 'mom') matchLabels.push('mother');
            if (relation === 'grandpa') matchLabels.push('grandfather');
            if (relation === 'grandma') matchLabels.push('grandmother');
            
            // Check for match
            for (const label of labelsToCheck) {
              if (matchLabels.includes(label) || 
                  (label?.includes(relationLower)) ||
                  relationTypes.includes(rel.relationship_type)) {
                targetUserId = isRequester ? rel.recipient_id : rel.requester_id;
                break;
              }
            }
            
            if (targetUserId) break;
          }
          
          if (!targetUserId) {
            speakResponse(`I found some relationships but none match "${relation}". Please check your relationships in profile settings.`);
            return;
          }
          
          // Get target user's profile
          const { data: targetProfile } = await supabase
            .from('safe_public_profiles')
            .select('user_id, display_name, username')
            .eq('user_id', targetUserId)
            .single();
          
          if (!targetProfile) {
            speakResponse(`I couldn't find the profile for your ${relation}.`);
            return;
          }
          
          // Send the message
          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              sender_id: userId,
              receiver_id: targetUserId,
              content: message,
              read: false,
              delivered: false
            });
          
          if (msgError) {
            console.error('[ZoeVoiceCommands] Message send error:', msgError);
            speakResponse('I had trouble sending that message. Please try again.');
            return;
          }
          
          speakResponse(`Message sent to your ${relation}, ${targetProfile.display_name}. I told them: "${message}"`);
          
          // Also trigger the Zoe Orb to show the conversation
          window.dispatchEvent(new CustomEvent('zoe-orb-message-user', { 
            detail: { userName: targetProfile.username || targetProfile.display_name } 
          }));
          
        } catch (err) {
          console.error('[ZoeVoiceCommands] Relationship message error:', err);
          speakResponse('Something went wrong while sending the message. Please try again.');
        }
      },
      description: 'Inform/Tell my [relation] to/that [message] - Send message to family member'
    },

    // Simpler variations
    {
      pattern: /^(?:zoe\s+)?(?:send|text)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)$/i,
      action: async (matches) => {
        const relation = matches[1].toLowerCase().trim();
        speakResponse(`What would you like me to tell your ${relation}?`);
        // This opens the conversation for follow-up
        window.dispatchEvent(new CustomEvent('zoe-awaiting-message', { detail: { relation } }));
      },
      description: 'Send/Text my [relation] - Initiate message to family member'
    },

    // Call request commands
    {
      pattern: /^(?:zoe\s+)?(?:ask|tell|remind)\s+(?:my\s+)?(son|daughter|wife|husband|father|mother|dad|mom|brother|sister|friend|partner)\s+to\s+call\s+(?:me|back)$/i,
      action: async (matches) => {
        if (!userId) {
          speakResponse('Please sign in to send messages');
          return;
        }
        
        const relation = matches[1].toLowerCase().trim();
        // Reuse the main relationship messaging logic
        const syntheticTranscript = `inform my ${relation} to please call me when you get a chance`;
        await processCommand(syntheticTranscript, true);
      },
      description: 'Ask my [relation] to call me - Quick call request'
    },

    {
      pattern: /^(?:show|list|open)\s+(?:recent\s+)?(?:contacts|conversations|chats)$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-orb-show-contacts'));
        speakResponse('Showing your recent conversations');
      },
      description: 'Show recent contacts'
    },

    {
      pattern: /^(?:enable|turn\s+on|start)\s+hands[\s-]?free(?:\s+mode)?$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-hands-free-mode', { detail: { enabled: true } }));
        speakResponse('Hands-free mode enabled. I\'ll listen continuously and respond after 5 seconds of silence');
      },
      description: 'Enable hands-free voice mode'
    },

    {
      pattern: /^(?:disable|turn\s+off|stop)\s+hands[\s-]?free(?:\s+mode)?$/i,
      action: () => {
        window.dispatchEvent(new CustomEvent('zoe-hands-free-mode', { detail: { enabled: false } }));
        speakResponse('Hands-free mode disabled. Tap the mic to speak');
      },
      description: 'Disable hands-free voice mode'
    },

    // Help command
    {
      pattern: /^(?:help|what\s+can\s+you\s+do|commands)$/i,
      action: () => {
        speakResponse('Say: open home, message username, inform my son to call me, show contacts, enable hands-free, post your message, bio, status, add hobby, friend username, settings, logout, or refresh');
      },
      description: 'Help'
    },

    // Dynamic voice command creation
    {
      pattern: /^add\s+(?:command\s+)?(?:for\s+)?(.+)$/i,
      action: async (matches) => {
        if (!userId) {
          speakResponse('Please sign in to add commands');
          return;
        }
        
        const commandName = matches[1].toLowerCase().trim();
        
        // Map common command names to routes
        const commandRoutes: Record<string, { route: string; displayName: string }> = {
          'zoe ai architect': { route: '/webdrop', displayName: 'Zoe AI Architect' },
          'zoe architect': { route: '/webdrop', displayName: 'Zoe Architect' },
          'architect': { route: '/webdrop', displayName: 'Zoe Architect' },
          'webdrop': { route: '/webdrop', displayName: 'WebDrop' },
          'home': { route: '/home', displayName: 'Home' },
          'profile': { route: '/profile', displayName: 'Profile' },
          'chat': { route: '/chat', displayName: 'Chat' },
          'huddle': { route: '/huddle', displayName: 'Huddle' },
          'camera': { route: '/camera', displayName: 'Camera' },
          'ai companion': { route: '/ai-companion', displayName: 'AI Companion' },
          'zoe': { route: '/ai-companion', displayName: 'Zoe AI' },
          'settings': { route: '/profile', displayName: 'Settings' },
          'voice commands': { route: '/voice-commands', displayName: 'Voice Commands' },
          'notification history': { route: '/notification-history', displayName: 'Notifications' },
          'activity export': { route: '/activity-export', displayName: 'Activity Export' }
        };

        const matchedCommand = commandRoutes[commandName];
        
        if (!matchedCommand) {
          speakResponse(`I don't recognize "${commandName}". Try adding commands for: home, profile, chat, huddle, camera, Zoe AI architect, or AI companion`);
          return;
        }

        // Create the voice shortcut
        const triggerPhrase = commandName;
        const actions = [{ type: 'navigate', route: matchedCommand.route }];

        const { data: existingShortcut } = await supabase
          .from('voice_shortcuts')
          .select('id')
          .eq('user_id', userId)
          .eq('trigger_phrase', triggerPhrase)
          .maybeSingle();

        if (existingShortcut) {
          speakResponse(`You already have a voice command for ${matchedCommand.displayName}`);
          return;
        }

        const { data: newShortcut, error } = await supabase
          .from('voice_shortcuts')
          .insert({
            user_id: userId,
            shortcut_name: `Open ${matchedCommand.displayName}`,
            trigger_phrase: triggerPhrase,
            actions: actions,
            enabled: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating voice shortcut:', error);
          speakResponse('Failed to add voice command. Please try again');
          return;
        }

        speakResponse(`Voice command added! Now you can say "${triggerPhrase}" to open ${matchedCommand.displayName}. Refreshing to apply changes`);
        
        // Wait a moment then refresh
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      description: 'Add [command name] - Create a new voice command dynamically'
    },

    // Remove voice command
    {
      pattern: /^(?:remove|delete)\s+(?:command\s+)?(?:for\s+)?(.+)$/i,
      action: async (matches) => {
        if (!userId) {
          speakResponse('Please sign in to remove commands');
          return;
        }
        
        const commandName = matches[1].toLowerCase().trim();
        
        const { data: shortcut, error: fetchError } = await supabase
          .from('voice_shortcuts')
          .select('id, shortcut_name')
          .eq('user_id', userId)
          .eq('trigger_phrase', commandName)
          .maybeSingle();

        if (fetchError || !shortcut) {
          speakResponse(`No voice command found for "${commandName}"`);
          return;
        }

        const { error: deleteError } = await supabase
          .from('voice_shortcuts')
          .delete()
          .eq('id', shortcut.id);

        if (deleteError) {
          console.error('Error deleting voice shortcut:', deleteError);
          speakResponse('Failed to remove voice command');
          return;
        }

        speakResponse(`Voice command for ${commandName} removed. Refreshing to apply changes`);
        
        // Wait a moment then refresh
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      description: 'Remove [command name] - Delete an existing voice command'
    },

    // Voice control commands
    {
      pattern: /^(?:set\s+)?(?:voice\s+)?speed\s+(?:to\s+)?(\d+(?:\.\d+)?|slow|normal|fast)$/i,
      action: async (matches) => {
        const speedInput = matches[1].toLowerCase();
        let rate = 1.0;
        
        if (speedInput === 'slow') rate = 0.75;
        else if (speedInput === 'normal') rate = 1.0;
        else if (speedInput === 'fast') rate = 1.5;
        else rate = Math.min(2.0, Math.max(0.5, parseFloat(speedInput)));
        
        if (!userId) return;
        
        await supabase
          .from('zoe_settings')
          .update({ voice_rate: rate })
          .eq('user_id', userId);
        
        speakResponse(`Speed set to ${rate === 0.75 ? 'slow' : rate === 1.0 ? 'normal' : rate === 1.5 ? 'fast' : rate}`);
      },
      description: 'Set voice speed (slow/normal/fast or 0.5-2.0)'
    },

    {
      pattern: /^(?:set\s+)?(?:voice\s+)?volume\s+(?:to\s+)?(\d+)%?$/i,
      action: async (matches) => {
        const volume = Math.min(100, Math.max(0, parseInt(matches[1]))) / 100;
        
        if (!userId) return;
        
        await supabase
          .from('zoe_settings')
          .update({ voice_volume: volume })
          .eq('user_id', userId);
        
        speakResponse(`Volume set to ${Math.round(volume * 100)} percent`);
      },
      description: 'Set voice volume (0-100)'
    },

    {
      pattern: /^(?:set\s+)?(?:voice\s+)?pitch\s+(?:to\s+)?(\d+(?:\.\d+)?|low|normal|high)$/i,
      action: async (matches) => {
        const pitchInput = matches[1].toLowerCase();
        let pitch = 1.0;
        
        if (pitchInput === 'low') pitch = 0.8;
        else if (pitchInput === 'normal') pitch = 1.0;
        else if (pitchInput === 'high') pitch = 1.2;
        else pitch = Math.min(2.0, Math.max(0.5, parseFloat(pitchInput)));
        
        if (!userId) return;
        
        await supabase
          .from('zoe_settings')
          .update({ voice_pitch: pitch })
          .eq('user_id', userId);
        
        speakResponse(`Pitch set to ${pitch === 0.8 ? 'low' : pitch === 1.0 ? 'normal' : pitch === 1.2 ? 'high' : pitch}`);
      },
      description: 'Set voice pitch (low/normal/high or 0.5-2.0)'
    },

    {
      pattern: /^(?:mute|silence|quiet)$/i,
      action: () => {
        window.speechSynthesis.cancel();
        speakResponse('Voice muted');
      },
      description: 'Mute voice output'
    }
  ];

  const speakResponse = (text: string) => {
    const event = new CustomEvent('zoe-response', {
      detail: { text, priority: 5 }
    });
    window.dispatchEvent(event);
  };

  const processCommand = useCallback(async (transcript: string, skipConfirmation: boolean = false) => {
    console.log('[ZoeVoiceCommands] Processing:', transcript);
    
    // Try voice shortcuts first
    const shortcut = matchShortcut(transcript);
    if (shortcut) {
      console.log('[ZoeVoiceCommands] Matched shortcut:', shortcut.shortcut_name);
      speakResponse(`Executing ${shortcut.shortcut_name}`);
      await executeShortcut(shortcut.id, shortcut.actions);
      
      if (userId) {
        await supabase.from('zoe_command_history').insert({
          user_id: userId,
          command: transcript,
          success: true,
          metadata: { matched: `shortcut: ${shortcut.shortcut_name}` }
        });
      }
      return true;
    }
    
    // Try exact pattern matching
    for (const command of commands) {
      const matches = transcript.match(command.pattern);
      if (matches) {
        console.log('[ZoeVoiceCommands] Matched command:', command.description);
        
        // Voice confirmation for important commands
        if (command.requiresConfirmation && !skipConfirmation) {
          speakResponse(`Did you say ${transcript}? Say yes to confirm or no to cancel`);
          setPendingCommand({
            command: transcript,
            action: async () => {
              await command.action(matches);
              if (userId) {
                await supabase.from('zoe_command_history').insert({
                  user_id: userId,
                  command: transcript,
                  success: true,
                  metadata: { matched: command.description }
                });
              }
            }
          });
          
          // Auto-cancel after 10 seconds
          if (confirmationTimeoutRef.current) {
            clearTimeout(confirmationTimeoutRef.current);
          }
          confirmationTimeoutRef.current = setTimeout(() => {
            setPendingCommand(null);
            speakResponse('Command cancelled');
          }, 10000);
          
          return true;
        }
        
        await command.action(matches);
        
        // Log command usage
        if (userId) {
          await supabase.from('zoe_command_history').insert({
            user_id: userId,
            command: transcript,
            success: true,
            metadata: { matched: command.description }
          });
        }
        return true;
      }
    }
    
    // Try natural language processing
    const nlpResult = await processNaturalLanguage(transcript);
    if (nlpResult.matched) {
      console.log('[ZoeVoiceCommands] NLP matched:', nlpResult.command);
      speakResponse(`Got it! ${nlpResult.command}`);
      
      if (nlpResult.action) {
        await nlpResult.action();
      }
      
      if (userId) {
        await supabase.from('zoe_command_history').insert({
          user_id: userId,
          command: transcript,
          success: true,
          metadata: { matched: `NLP: ${nlpResult.command}` }
        });
      }
      return true;
    }
    
    // Fuzzy matching fallback for common commands
    const fuzzyCommands = ['home', 'profile', 'chat', 'huddle', 'webdrop', 'camera', 'settings', 'logout', 'refresh'];
    for (const cmd of fuzzyCommands) {
      if (fuzzyMatch(transcript, cmd, 0.75)) {
        console.log('[ZoeVoiceCommands] Fuzzy matched:', cmd);
        speakResponse(`Did you mean ${cmd}?`);
        const syntheticMatches = [transcript, cmd];
        
        // Find and execute the command
        for (const command of commands) {
          const testMatch = cmd.match(command.pattern);
          if (testMatch) {
            await command.action(testMatch);
            if (userId) {
              await supabase.from('zoe_command_history').insert({
                user_id: userId,
                command: transcript,
                success: true,
                metadata: { matched: command.description, fuzzy: true }
              });
            }
            return true;
          }
        }
      }
    }
    
    return false;
  }, [userId, navigate, commands, matchShortcut, executeShortcut, processNaturalLanguage]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognition();
    
    if (!SpeechRecognitionAPI) {
      toast.error('Speech recognition not supported on this browser');
      return;
    }

    if (isListeningRef.current) return;

    const platform = detectPlatform();
    console.log('[ZoeVoiceCommands] Platform detected:', platform);

    const createRecognition = () => {
      const recognition = new SpeechRecognitionAPI();
      
      // Platform-specific settings
      // Safari/iOS: continuous mode is limited, use shorter sessions
      // Chrome: supports long continuous sessions but has ~60s timeout
      recognition.continuous = true;
      recognition.interimResults = !platform.isIOS; // iOS interim results can be buggy
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = async (event: any) => {
        // Get the last result
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        
        // Only process final results
        if (!lastResult.isFinal) {
          console.log('[ZoeVoiceCommands] Interim:', transcript);
          return;
        }
        
        console.log('[ZoeVoiceCommands] Heard:', transcript);
        
        // Handle confirmation responses
        if (pendingCommand) {
          if (fuzzyMatch(transcript, 'yes', 0.8) || fuzzyMatch(transcript, 'confirm', 0.8)) {
            if (confirmationTimeoutRef.current) {
              clearTimeout(confirmationTimeoutRef.current);
            }
            await pendingCommand.action();
            setPendingCommand(null);
            return;
          } else if (fuzzyMatch(transcript, 'no', 0.8) || fuzzyMatch(transcript, 'cancel', 0.8)) {
            if (confirmationTimeoutRef.current) {
              clearTimeout(confirmationTimeoutRef.current);
            }
            setPendingCommand(null);
            speakResponse('Command cancelled');
            return;
          }
        }
        
        const handled = await processCommand(transcript);
        if (!handled) {
          console.log('[ZoeVoiceCommands] No command matched, could send to AI chat');
        }
      };

      recognition.onerror = (event: any) => {
        // Silently ignore common non-critical errors
        const ignoredErrors = ['aborted', 'no-speech', 'network'];
        if (ignoredErrors.includes(event.error)) {
          console.log('[ZoeVoiceCommands] Non-critical error:', event.error);
          return;
        }
        
        // Safari-specific: handle 'not-allowed' gracefully
        if (event.error === 'not-allowed') {
          console.log('[ZoeVoiceCommands] Microphone permission denied');
          toast.error('Microphone permission required for voice commands');
          isListeningRef.current = false;
          shouldBeListeningRef.current = false;
          return;
        }
        
        console.error('[ZoeVoiceCommands] Error:', event.error);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        console.log('[ZoeVoiceCommands] Recognition ended, shouldBe:', shouldBeListeningRef.current);
        
        // Only restart if we should still be listening
        if (shouldBeListeningRef.current) {
          // Clear any pending restart
          if (recognitionRestartTimeout) {
            clearTimeout(recognitionRestartTimeout);
          }
          
          // Use shorter delay for Safari/iOS which times out faster
          const restartDelay = platform.isSafari || platform.isIOS ? 100 : RESTART_DELAY;
          
          recognitionRestartTimeout = setTimeout(() => {
            if (shouldBeListeningRef.current) {
              console.log('[ZoeVoiceCommands] Auto-restarting recognition...');
              try {
                // Create fresh recognition instance for reliability
                const newRecognition = createRecognition();
                newRecognition.start();
                recognitionRef.current = newRecognition;
                isListeningRef.current = true;
              } catch (e) {
                console.log('[ZoeVoiceCommands] Restart failed:', e);
                // Retry after a bit longer
                setTimeout(() => {
                  if (shouldBeListeningRef.current) {
                    try {
                      const retryRecognition = createRecognition();
                      retryRecognition.start();
                      recognitionRef.current = retryRecognition;
                      isListeningRef.current = true;
                    } catch (e2) {
                      console.error('[ZoeVoiceCommands] Retry also failed:', e2);
                    }
                  }
                }, 1000);
              }
            }
          }, restartDelay);
        }
      };

      return recognition;
    };

    try {
      const recognition = createRecognition();
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      shouldBeListeningRef.current = true;
      
      // Set up keep-alive interval - shorter for Safari/iOS
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      
      // Safari times out at ~7s, Chrome at ~60s
      const keepAliveMs = platform.isSafari || platform.isIOS ? 5000 : KEEP_ALIVE_INTERVAL;
      
      keepAliveInterval = setInterval(() => {
        if (shouldBeListeningRef.current && recognitionRef.current) {
          console.log('[ZoeVoiceCommands] Keep-alive restart...');
          try {
            recognitionRef.current.stop();
            // onend handler will restart it
          } catch (e) {
            console.log('[ZoeVoiceCommands] Keep-alive stop error (ignored):', e);
          }
        }
      }, keepAliveMs);
      
      speakResponse('Zoe listening');
    } catch (e) {
      console.error('[ZoeVoiceCommands] Failed to start:', e);
      toast.error('Failed to start voice recognition');
    }
  }, [processCommand, pendingCommand]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    
    // Clear keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    
    if (recognitionRestartTimeout) {
      clearTimeout(recognitionRestartTimeout);
      recognitionRestartTimeout = null;
    }
    if (recognitionRef.current) {
      isListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('[ZoeVoiceCommands] Stop error (ignored):', e);
      }
      recognitionRef.current = null;
      speakResponse('Zoe paused');
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      if (recognitionRestartTimeout) {
        clearTimeout(recognitionRestartTimeout);
        recognitionRestartTimeout = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    };
  }, []);

  return {
    startListening,
    stopListening,
    isListening: isListeningRef.current,
    processCommand
  };
};
