import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  setCurrentAssistant, 
  getCurrentAssistant, 
  detectAssistantFromInput,
  type AssistantVoiceType 
} from '@/utils/assistantVoice';

export type AssistantName = 'Zoe' | 'Smith';

interface AssistantConfig {
  name: AssistantName;
  pronoun: 'she' | 'he';
  title: 'ZOE' | 'SMITH';
  description: string;
}

const ASSISTANT_CONFIGS: Record<AssistantName, AssistantConfig> = {
  Zoe: {
    name: 'Zoe',
    pronoun: 'she',
    title: 'ZOE',
    description: 'Zone Operations Entity'
  },
  Smith: {
    name: 'Smith',
    pronoun: 'he',
    title: 'SMITH',
    description: 'Sentinel Mesh Intelligence Tactical Handler'
  }
};

/**
 * Hook to manage assistant name with voice-switching support.
 * ZOE PROTOCOL: "BIOLOGICAL VOICE" (Zero Cost)
 * 
 * - Default assistant is "Zoe" for Zoe Infinity platform
 * - Smith for tactical/security contexts
 * - User can switch by saying "Hey Zoe" or "Hey Smith"
 * 
 * Voice Physics:
 * - Zoe: Pitch 1.15 (Bright), Rate 1.05 (Quick-witted)
 * - Smith: Pitch 0.85 (Deep), Rate 0.95 (Calculated)
 */
export function useAssistantName() {
  const { user } = useAuth();
  // Default to Zoe for entire Mmora platform
  const [assistantName, setAssistantName] = useState<AssistantName>('Zoe');
  const [isLoading, setIsLoading] = useState(true);

  // Sync with global voice system
  useEffect(() => {
    const handleAssistantChange = (e: CustomEvent<{ assistant: AssistantVoiceType }>) => {
      setAssistantName(e.detail.assistant);
    };
    
    window.addEventListener('assistant-changed', handleAssistantChange as EventListener);
    return () => window.removeEventListener('assistant-changed', handleAssistantChange as EventListener);
  }, []);

  useEffect(() => {
    const fetchUserGender = async () => {
      if (!user?.id) {
        setIsLoading(false);
        // Default to Zoe for entire platform
        setCurrentAssistant('Zoe');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Failed to fetch user gender:', error);
          // Default to Zoe
          setAssistantName('Zoe');
          setCurrentAssistant('Zoe');
          return;
        }

        // Gender-based initial preference:
        // Male users get Zoe (female), Female users get Smith (male)
        // Default to Zoe for unset gender
        const gender = data?.gender?.toLowerCase();
        const initialAssistant: AssistantName = gender === 'female' ? 'Smith' : 'Zoe';
        
        setAssistantName(initialAssistant);
        setCurrentAssistant(initialAssistant);
      } catch (err) {
        console.error('Error fetching gender:', err);
        setAssistantName('Zoe');
        setCurrentAssistant('Zoe');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserGender();
  }, [user?.id]);

  const config = ASSISTANT_CONFIGS[assistantName];

  /**
   * Switch the active assistant
   */
  const switchAssistant = useCallback((name: AssistantName) => {
    setAssistantName(name);
    setCurrentAssistant(name);
  }, []);

  /**
   * Check if voice input mentions either assistant name (wake word)
   */
  const isWakeWord = useCallback((text: string): boolean => {
    const lower = text.toLowerCase();
    return lower.includes('zoe') || lower.includes('smith');
  }, []);

  /**
   * Detect and switch assistant based on input, returns the detected assistant
   */
  const detectAndSwitch = useCallback((text: string): AssistantName => {
    const detected = detectAssistantFromInput(text);
    if (detected) {
      switchAssistant(detected);
      return detected;
    }
    return assistantName;
  }, [assistantName, switchAssistant]);

  /**
   * Extract the actual message after the wake word
   */
  const extractMessage = useCallback((text: string): string => {
    let message = text;
    
    // Remove wake words from the message
    const wakePatterns = [
      /^(hey\s+)?(zoe|smith)[,\s]*/i,
      /^(ok\s+)?(zoe|smith)[,\s]*/i,
      /(zoe|smith)[,\s]+/i
    ];
    
    for (const pattern of wakePatterns) {
      message = message.replace(pattern, '');
    }
    
    return message.trim() || text;
  }, []);

  return {
    assistantName,
    config,
    isLoading,
    isWakeWord,
    extractMessage,
    switchAssistant,
    detectAndSwitch,
    // Both names are valid for voice activation
    validNames: ['Zoe', 'Smith'] as const
  };
}
