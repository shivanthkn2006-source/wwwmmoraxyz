// ═══════════════════════════════════════════════════════════════════════════════
// USE ZOE DISCOVERY COMMANDS - Voice Command Handler for Feature Discovery & Sessions
// Processes natural language commands for onboarding, planning, and coaching
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { speakAsZoe } from '@/utils/zoeVoice';

// Import profession and feature data - use dynamic import to avoid circular dependencies
let PROFESSION_CATALOG: any[] = [];
let UNIVERSAL_FEATURES: any[] = [];

// Lazy load the catalog data
const loadCatalogs = async () => {
  try {
    const module = await import('@/components/ZoeFeatureDiscovery');
    PROFESSION_CATALOG = module.PROFESSION_CATALOG || [];
    UNIVERSAL_FEATURES = module.UNIVERSAL_FEATURES || [];
  } catch (error) {
    console.warn('[ZoeDiscoveryCommands] Could not load catalogs:', error);
  }
};

export interface DiscoveryCommandResult {
  matched: boolean;
  command?: string;
  action?: 'open_discovery' | 'open_session' | 'set_name' | 'set_profession' | 'list_features' | 'explain_feature';
  data?: any;
  response?: string;
}

export const useZoeDiscoveryCommands = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [initialProfession, setInitialProfession] = useState<string | null>(null);

  const processDiscoveryCommand = useCallback(async (text: string): Promise<DiscoveryCommandResult> => {
    // Ensure catalogs are loaded
    if (PROFESSION_CATALOG.length === 0) {
      await loadCatalogs();
    }
    
    const lower = text.toLowerCase().trim();
    
    // Clean common prefixes
    const cleanText = lower
      .replace(/^(hey |ok |hi |hello )?zoe,?\s*/i, '')
      .replace(/^(can you |could you |please |would you )\s*/i, '')
      .trim();

    // ═══ NAME COMMANDS ═══
    if (/my name is (.+)/i.test(cleanText)) {
      const match = cleanText.match(/my name is (.+)/i);
      if (match && user?.id) {
        const name = match[1].trim();
        await supabase.from('profiles').update({ display_name: name }).eq('user_id', user.id);
        const response = `Nice to meet you, ${name}! I'll remember that. What do you do? I can personalize features for your profession.`;
        speakAsZoe(response);
        return { matched: true, command: 'set_name', action: 'set_name', data: { name }, response };
      }
    }

    if (/call me (.+)/i.test(cleanText)) {
      const match = cleanText.match(/call me (.+)/i);
      if (match && user?.id) {
        const name = match[1].trim();
        await supabase.from('profiles').update({ display_name: name }).eq('user_id', user.id);
        const response = `Got it! I'll call you ${name} from now on.`;
        speakAsZoe(response);
        return { matched: true, command: 'set_name', action: 'set_name', data: { name }, response };
      }
    }

    // ═══ PROFESSION DISCOVERY COMMANDS ═══
    if (/i('m| am) a (.+)/i.test(cleanText) || /i work as a (.+)/i.test(cleanText)) {
      const match = cleanText.match(/i('m| am) a (.+)/i) || cleanText.match(/i work as a (.+)/i);
      if (match) {
        const professionText = match[2]?.trim() || match[1]?.trim();
        const profession = PROFESSION_CATALOG.find(
          p => p.name.toLowerCase().includes(professionText) || 
          p.id.includes(professionText.replace(/\s+/g, '_'))
        );
        
        if (profession) {
          setInitialProfession(profession.id);
          setShowDiscovery(true);
          const response = `Great! As a ${profession.name}, I have ${profession.features.length} powerful features curated for you. Let me show you!`;
          speakAsZoe(response);
          return { matched: true, command: 'set_profession', action: 'open_discovery', data: { profession: profession.id }, response };
        } else {
          setShowDiscovery(true);
          const response = `I'd love to learn more about what you do! Let me show you our profession options.`;
          speakAsZoe(response);
          return { matched: true, command: 'open_discovery', action: 'open_discovery', response };
        }
      }
    }

    // ═══ FEATURE DISCOVERY COMMANDS ═══
    if (/what (can|do) (you|zoe) do/i.test(cleanText) || 
        /what features/i.test(cleanText) ||
        /show me features/i.test(cleanText) ||
        /what are (the )?useful features/i.test(cleanText) ||
        /help me discover/i.test(cleanText) ||
        /personalize (for|my) experience/i.test(cleanText)) {
      setShowDiscovery(true);
      const response = "I can do so many things! Let me show you features based on your interests. What do you do?";
      speakAsZoe(response);
      return { matched: true, command: 'open_discovery', action: 'open_discovery', response };
    }

    // Specific profession queries
    if (/features for (a )?(.+)/i.test(cleanText)) {
      const match = cleanText.match(/features for (a )?(.+)/i);
      if (match) {
        const professionText = match[2]?.trim();
        const profession = PROFESSION_CATALOG.find(
          p => p.name.toLowerCase().includes(professionText) || 
          professionText.includes(p.name.toLowerCase())
        );
        
        if (profession) {
          const features = profession.features.slice(0, 3).map(f => f.name).join(', ');
          const response = `For ${profession.name}s, I recommend: ${features}. Want to see all ${profession.features.length} features?`;
          speakAsZoe(response);
          setInitialProfession(profession.id);
          setShowDiscovery(true);
          return { matched: true, command: 'list_features', action: 'open_discovery', data: { profession: profession.id }, response };
        }
      }
    }

    // ═══ SESSION & PLANNING COMMANDS ═══
    if (/plan (my )?day/i.test(cleanText) || 
        /day planning/i.test(cleanText) ||
        /help me plan/i.test(cleanText) ||
        /what should i do today/i.test(cleanText)) {
      setSessionType('day_planning');
      setShowSession(true);
      const response = "Let's plan your day together! I'll ask you a few questions to help you prioritize.";
      speakAsZoe(response);
      return { matched: true, command: 'day_planning', action: 'open_session', data: { sessionType: 'day_planning' }, response };
    }

    if (/morning briefing/i.test(cleanText) || 
        /good morning/i.test(cleanText) ||
        /start my day/i.test(cleanText)) {
      setSessionType('morning_briefing');
      setShowSession(true);
      const response = "Good morning! Let's start your day right with a quick check-in.";
      speakAsZoe(response);
      return { matched: true, command: 'morning_briefing', action: 'open_session', data: { sessionType: 'morning_briefing' }, response };
    }

    if (/let('s| us) evolve/i.test(cleanText) || 
        /evolution session/i.test(cleanText) ||
        /reflect on (my|the) day/i.test(cleanText) ||
        /how did i do today/i.test(cleanText) ||
        /evening reflection/i.test(cleanText)) {
      setSessionType('evolution_reflection');
      setShowSession(true);
      const response = "Let's reflect and evolve together! Tell me about your day.";
      speakAsZoe(response);
      return { matched: true, command: 'evolution_reflection', action: 'open_session', data: { sessionType: 'evolution_reflection' }, response };
    }

    if (/evening review/i.test(cleanText) || 
        /end (my |of )?day/i.test(cleanText) ||
        /good night/i.test(cleanText) ||
        /wrap up (my )?day/i.test(cleanText)) {
      setSessionType('evening_review');
      setShowSession(true);
      const response = "Let's wrap up your day with a quick review.";
      speakAsZoe(response);
      return { matched: true, command: 'evening_review', action: 'open_session', data: { sessionType: 'evening_review' }, response };
    }

    if (/goal check/i.test(cleanText) || 
        /check (my )?goals/i.test(cleanText) ||
        /how am i doing/i.test(cleanText) ||
        /progress check/i.test(cleanText)) {
      setSessionType('goal_check');
      setShowSession(true);
      const response = "Let's check on your goals and progress!";
      speakAsZoe(response);
      return { matched: true, command: 'goal_check', action: 'open_session', data: { sessionType: 'goal_check' }, response };
    }

    if (/let('s| us) talk/i.test(cleanText) || 
        /chat with me/i.test(cleanText) ||
        /i need to talk/i.test(cleanText) ||
        /can we chat/i.test(cleanText)) {
      setSessionType('quick_chat');
      setShowSession(true);
      const response = "I'm here for you. What's on your mind?";
      speakAsZoe(response);
      return { matched: true, command: 'quick_chat', action: 'open_session', data: { sessionType: 'quick_chat' }, response };
    }

    // ═══ TRAFFIC & WEATHER COMMANDS ═══
    if (/traffic update/i.test(cleanText) || /traffic/i.test(cleanText)) {
      const response = "I'll check the traffic for you. For real-time updates, I can integrate with your location. Would you like to set up traffic alerts?";
      speakAsZoe(response);
      return { matched: true, command: 'traffic', response };
    }

    if (/weather/i.test(cleanText)) {
      navigate('/briefing-preferences');
      const response = "I can give you weather updates in your daily briefing. Let me show you the briefing settings.";
      speakAsZoe(response);
      return { matched: true, command: 'weather', response };
    }

    // ═══ UNIVERSAL FEATURE EXPLANATIONS ═══
    for (const feature of UNIVERSAL_FEATURES) {
      if (cleanText.includes(feature.name.toLowerCase())) {
        const response = `${feature.name}: ${feature.description}. You can say "${feature.voiceCommand}" to use it.`;
        speakAsZoe(response);
        return { matched: true, command: 'explain_feature', action: 'explain_feature', data: { feature: feature.name }, response };
      }
    }

    // ═══ LIFE QUESTIONS / EXISTENTIAL ═══
    if (/what (can|else can) (i|we) (do|ask|try)/i.test(cleanText) ||
        /what else/i.test(cleanText)) {
      const suggestions = [
        "You can plan your day with me",
        "Explore VR worlds together", 
        "Generate stunning images with Dreams AI",
        "Track your emotions and growth",
        "Connect with people nearby via Huddle",
        "Get personalized feature recommendations"
      ];
      const response = `There's so much we can do together! ${suggestions.slice(0, 3).join('. ')}. Want me to show you features for your profession?`;
      speakAsZoe(response);
      setShowDiscovery(true);
      return { matched: true, command: 'suggestions', action: 'open_discovery', response };
    }

    return { matched: false };
  }, [navigate, user?.id]);

  const closeDiscovery = useCallback(() => {
    setShowDiscovery(false);
    setInitialProfession(null);
  }, []);

  const closeSession = useCallback(() => {
    setShowSession(false);
    setSessionType(null);
  }, []);

  return {
    processDiscoveryCommand,
    showDiscovery,
    setShowDiscovery,
    closeDiscovery,
    showSession,
    setShowSession,
    closeSession,
    sessionType,
    setSessionType,
    initialProfession,
    setInitialProfession,
  };
};

export default useZoeDiscoveryCommands;
