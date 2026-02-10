import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type OnboardingScope = 'zoe_classic' | 'zoe_infinity';

const getOnboardingStorageKey = (scope: OnboardingScope) =>
  scope === 'zoe_infinity'
    ? 'zoe_infinity_conversational_onboarding_v1'
    : 'zoe_conversational_onboarding_v1';

type LocalOnboardingSnapshot = {
  version: 1;
  currentStep: OnboardingStep;
  isOnboarding: boolean;
  profile: {
    realName: string | null;
    dateOfBirthISO: string | null; // YYYY-MM-DD
    assistantName: string;
    voicePreference: 'female' | 'male';
  };
};

function safeReadLocalSnapshot(storageKey: string): LocalOnboardingSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalOnboardingSnapshot;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteLocalSnapshot(storageKey: string, snapshot: LocalOnboardingSnapshot): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

/**
 * Conversational Voice-Based Onboarding System
 * Zoe collects user profile through natural conversation (not forms).
 * 
 * Steps:
 * 1. name - What should I call you?
 * 2. (classic only) dob - When's your birthday? (for horoscope/personalization)
 * 3. assistant_name - What would you like to call me?
 * 4. voice_preference - Would you like a female or male voice?
 * 5. complete - All done!
 */

export type OnboardingStep = 'name' | 'dob' | 'assistant_name' | 'voice_preference' | 'complete';

export interface OnboardingProfile {
  realName: string | null;
  dateOfBirth: Date | null;
  assistantName: string;
  voicePreference: 'female' | 'male';
}

export interface UseConversationalOnboardingReturn {
  currentStep: OnboardingStep;
  profile: OnboardingProfile;
  isOnboarding: boolean;
  processUserResponse: (text: string) => Promise<{
    nextPrompt: string;
    stepAdvanced: boolean;
    complete: boolean;
  }>;
  getInitialPrompt: () => string;
  skipOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

// Date parsing patterns
const DATE_PATTERNS = [
  // "January 15, 1990" or "Jan 15 1990"
  /(\w+)\s+(\d{1,2}),?\s*(\d{4})/i,
  // "15 January 1990" or "15 Jan 1990"
  /(\d{1,2})\s+(\w+),?\s*(\d{4})/i,
  // "1990-01-15" or "15/01/1990" or "01-15-1990"
  /(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})/,
  // "15th of January 1990"
  /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)\s+(\d{4})/i,
];

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

function parseDate(text: string): Date | null {
  const cleanedOriginal = text.trim();
  const cleaned = cleanedOriginal
    .toLowerCase()
    .replace(/[.,]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
  
  for (const pattern of DATE_PATTERNS) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    
    let day: number, month: number, year: number;
    
    if (pattern === DATE_PATTERNS[2]) {
      // Numeric format - guess based on values
      const [, p1, p2, p3] = match;
      const n1 = parseInt(p1), n2 = parseInt(p2), n3 = parseInt(p3);
      
      if (n1 > 31) { // YYYY-MM-DD
        year = n1; month = n2 - 1; day = n3;
      } else if (n3 > 31) { // DD/MM/YYYY or MM/DD/YYYY
        year = n3;
        if (n1 > 12) { day = n1; month = n2 - 1; }
        else if (n2 > 12) { month = n1 - 1; day = n2; }
        else { day = n1; month = n2 - 1; } // Assume DD/MM
      } else {
        continue;
      }
    } else if (pattern === DATE_PATTERNS[0]) {
      // "January 15, 1990"
      const monthName = match[1].toLowerCase();
      month = MONTH_NAMES[monthName] ?? MONTH_NAMES[monthName.substring(0, 3)];
      if (month === undefined) continue;
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    } else {
      // "15 January 1990" or "15th of January 1990"
      day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      month = MONTH_NAMES[monthName] ?? MONTH_NAMES[monthName.substring(0, 3)];
      if (month === undefined) continue;
      year = parseInt(match[3]);
    }
    
    if (year < 100) year += 1900;
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear || month < 0 || month > 11 || day < 1 || day > 31) continue;
    
    return new Date(year, month, day);
  }
  
  // Fallback: let the JS engine parse common formats like "15 Jan 1990", "Jan-15-1990", etc.
  // This is intentionally permissive; we still clamp to a sane year range.
  const parsed = new Date(cleanedOriginal);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const currentYear = new Date().getFullYear();
    if (y >= 1900 && y <= currentYear) return parsed;
  }

  return null;
}

function looksLikeRequestOrCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  // Common non-name intents during onboarding (avoid treating these as the user's name)
  return /\b(draw|create|generate|make|show|paint|sketch|image|picture|photo|bike|art)\b/.test(t) ||
    /\?$/.test(t) ||
    /\b(can you|could you|please|help me|i want|i need)\b/.test(t);
}

function extractName(text: string): string | null {
  const cleaned = text.trim();

  // Prevent accidental names like "Draw bike" / "Show me a bike" during onboarding.
  if (looksLikeRequestOrCommand(cleaned)) return null;
  
  // Common patterns: "I'm John", "Call me John", "My name is John", just "John"
  const patterns = [
    /(?:i'?m|i am|call me|my name is|it'?s|just)\s+([a-z]+(?:\s+[a-z]+)?)/i,
    /^([a-z]+(?:\s+[a-z]+)?)$/i, // Just a name
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  // If it's just 1-2 words, treat as name
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  if (words.length <= 2 && words.length > 0) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  
  return null;
}

function extractVoicePreference(text: string): 'female' | 'male' | null {
  const lower = text.toLowerCase();
  if (/\b(female|woman|girl|her|she|feminine|samantha|zoe)\b/.test(lower)) return 'female';
  if (/\b(male|man|guy|him|he|masculine|deep|jarvis)\b/.test(lower)) return 'male';
  return null;
}

export const useConversationalOnboarding = (): UseConversationalOnboardingReturn => {
  const { user } = useAuth();

  // Zoe Infinity must not share onboarding state with other experiences.
  // Default remains classic for backward compatibility.
  const scope: OnboardingScope = 'zoe_infinity';
  const storageKey = getOnboardingStorageKey(scope);

  // Local-first: prevents "I must say my name/DOB every time" even if the user
  // isn't signed in yet, auth loads late, or backend read fails.
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    const snap = safeReadLocalSnapshot(storageKey);
    // CRITICAL FIX: Zoe Infinity skips birthday entirely - advance if stuck on 'dob'
    const rawStep = snap?.currentStep ?? 'name';
    return rawStep === 'dob' ? 'assistant_name' : rawStep;
  });

  const [profile, setProfile] = useState<OnboardingProfile>(() => {
    const snap = safeReadLocalSnapshot(storageKey);
    return {
      realName: snap?.profile.realName ?? null,
      dateOfBirth: snap?.profile.dateOfBirthISO ? new Date(snap.profile.dateOfBirthISO) : null,
      assistantName: snap?.profile.assistantName ?? 'Zoe',
      voicePreference: snap?.profile.voicePreference ?? 'female',
    };
  });

  const [isOnboarding, setIsOnboarding] = useState(() => {
    const snap = safeReadLocalSnapshot(storageKey);
    // CRITICAL FIX: If the profile has a name already, onboarding is complete
    if (snap?.profile.realName && snap.profile.realName.length > 0) {
      return false;
    }
    // Also check if step is 'complete'
    if (snap?.currentStep === 'complete') {
      return false;
    }
    // Check if isOnboarding is explicitly set to false
    if (snap?.isOnboarding === false) {
      return false;
    }
    // For Zoe Infinity: check the genesis flag directly
    if (scope === 'zoe_infinity') {
      try {
        if (localStorage.getItem('zoe_infinity_genesis_complete') === 'true') {
          return false;
        }
      } catch {}
    }
    return snap?.isOnboarding ?? true;
  });

  const persistLocal = useCallback(
    (next: { currentStep: OnboardingStep; isOnboarding: boolean; profile: OnboardingProfile }) => {
      safeWriteLocalSnapshot(storageKey, {
        version: 1,
        currentStep: next.currentStep,
        isOnboarding: next.isOnboarding,
        profile: {
          realName: next.profile.realName ?? null,
          dateOfBirthISO: next.profile.dateOfBirth ? next.profile.dateOfBirth.toISOString().split('T')[0] : null,
          assistantName: next.profile.assistantName || 'Zoe',
          voicePreference: next.profile.voicePreference === 'male' ? 'male' : 'female',
        },
      });
    },
    [storageKey]
  );

  // Load existing profile on mount + check for existing chat history
  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfile = async () => {
      // CRITICAL FIX: First check if user has ANY chat history in Zoe Infinity
      // If they do, they are NOT a new user - skip all onboarding
      const { data: chatHistory, error: chatError } = await supabase
        .from('zoe_infinity_messages')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      const hasExistingHistory = !chatError && (chatHistory?.length ?? 0) > 0;
      
      if (hasExistingHistory) {
        console.log('[Onboarding] User has existing chat history - marking onboarding complete');
        setIsOnboarding(false);
        setCurrentStep('complete');
        persistLocal({
          currentStep: 'complete',
          isOnboarding: false,
          profile,
        });
        // Also update the database flag
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'complete',
            zoe_infinity_genesis_complete: true 
          } as any)
          .eq('user_id', user.id);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        // NOTE: keep classic + infinity flags so either scope can be read safely.
        .select('real_name, date_of_birth, assistant_name, assistant_voice_preference, onboarding_step, zoe_genesis_complete, zoe_infinity_genesis_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        const nextProfile: OnboardingProfile = {
          realName: (data as any).real_name || null,
          dateOfBirth: (data as any).date_of_birth ? new Date((data as any).date_of_birth) : null,
          assistantName: (data as any).assistant_name || 'Zoe',
          voicePreference: (data as any).assistant_voice_preference === 'male' ? 'male' : 'female',
        };
        setProfile(nextProfile);
        
        // Zoe Infinity: birthday collection is disabled.
        // If an old profile is sitting on the 'dob' step, jump forward.
        const rawStep = ((data as any).onboarding_step || 'name') as OnboardingStep;
        const step: OnboardingStep = scope === 'zoe_infinity' && rawStep === 'dob' ? 'assistant_name' : rawStep;
        setCurrentStep(step);
        
        const completeFlag = scope === 'zoe_infinity'
          ? !!(data as any).zoe_infinity_genesis_complete
          : !!(data as any).zoe_genesis_complete;

        // CRITICAL FIX: If user has a real_name, consider onboarding complete
        const hasName = !!nextProfile.realName && nextProfile.realName.length > 0;

        if (completeFlag || step === 'complete' || hasName) {
          setIsOnboarding(false);
          // Sync to database if not already marked complete
          if (!completeFlag && scope === 'zoe_infinity') {
            await supabase
              .from('profiles')
              .update({ 
                onboarding_step: 'complete',
                zoe_infinity_genesis_complete: true 
              } as any)
              .eq('user_id', user.id);
          }
        }

        // Persist locally too (so refreshes don't reset onboarding)
        persistLocal({
          currentStep: step,
          isOnboarding: !(completeFlag || step === 'complete' || hasName),
          profile: nextProfile,
        });
      }
    };
    
    loadProfile();
  }, [user?.id, persistLocal, profile]);

  const getInitialPrompt = useCallback((): string => {
    if (profile.realName) {
      return `Welcome back, ${profile.realName}! What's on your mind today?`;
    }
    return `Hey! I'm ${profile.assistantName}. Before we dive in, let me get to know you a bit.\n\nWhat should I call you?\n\n*(Say "skip" to start chatting right away)*`;
  }, [profile.realName, profile.assistantName]);

  const processUserResponse = useCallback(async (text: string): Promise<{
    nextPrompt: string;
    stepAdvanced: boolean;
    complete: boolean;
  }> => {
    const lower = text.toLowerCase().trim();
    
    // Check for skip command
    if (/^(skip|skip\s*intro|just\s*start|let'?s\s*go)$/i.test(lower)) {
      setIsOnboarding(false);
      setCurrentStep('complete');

      persistLocal({
        currentStep: 'complete',
        isOnboarding: false,
        profile,
      });
      
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({
            onboarding_step: 'complete',
            ...(scope === 'zoe_infinity'
              ? { zoe_infinity_genesis_complete: true }
              : { zoe_genesis_complete: true, zoe_genesis_completed_at: new Date().toISOString() }),
          } as any)
          .eq('user_id', user.id);
      }
      
      return {
        nextPrompt: `No problem! I'm ${profile.assistantName}, and I'm here whenever you need me. What's on your mind?`,
        stepAdvanced: true,
        complete: true,
      };
    }

    switch (currentStep) {
      case 'name': {
        const name = extractName(text);
        if (!name) {
          return {
            nextPrompt: looksLikeRequestOrCommand(text)
              ? 'I can do that in a second — first, what would you like me to call you? (or say “skip”)'
              : "I didn't quite catch that. What would you like me to call you?",
            stepAdvanced: false,
            complete: false,
          };
        }
        
        const nextStep: OnboardingStep = scope === 'zoe_infinity' ? 'assistant_name' : 'dob';
        setProfile(p => ({ ...p, realName: name }));
        setCurrentStep(nextStep);

        persistLocal({
          currentStep: nextStep,
          isOnboarding: true,
          profile: { ...profile, realName: name },
        });
        
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ real_name: name, onboarding_step: nextStep } as any)
            .eq('user_id', user.id);
        }
        
        return {
          nextPrompt:
            scope === 'zoe_infinity'
              ? `Nice to meet you, ${name}!\n\nOne quick thing — is there anything you'd like to call me instead of Zoe?\n\n*(Just say "Zoe is fine" or give me a new name)*`
              : `Nice to meet you, ${name}! 🎉\n\nWhen's your birthday? This helps me personalize things for you.\n\n*(You can say something like "January 15, 1990" or just "skip")*`,
          stepAdvanced: true,
          complete: false,
        };
      }
      
      case 'dob': {
        // Zoe Infinity: birthday step is disabled entirely.
        // If we ever land here (e.g. stale localStorage), jump forward immediately.
        if (scope === 'zoe_infinity') {
          setCurrentStep('assistant_name');
          persistLocal({
            currentStep: 'assistant_name',
            isOnboarding: true,
            profile,
          });
          if (user?.id) {
            await supabase
              .from('profiles')
              .update({ onboarding_step: 'assistant_name' } as any)
              .eq('user_id', user.id);
          }
          return {
            nextPrompt: `One quick thing — is there anything you'd like to call me instead of Zoe?\n\n*(Just say "Zoe is fine" or give me a new name)*`,
            stepAdvanced: true,
            complete: false,
          };
        }

        // If they ask for something else (e.g. "draw a bike"), don't treat it as a "bad date".
        if (looksLikeRequestOrCommand(text) && !/skip/i.test(lower)) {
          return {
            nextPrompt: 'Any birthday format is fine — what date were you born? (or say “skip”)',
            stepAdvanced: false,
            complete: false,
          };
        }

        // Allow skip
        if (/skip/i.test(lower)) {
          setCurrentStep('assistant_name');

          persistLocal({
            currentStep: 'assistant_name',
            isOnboarding: true,
            profile,
          });
          if (user?.id) {
            await supabase
              .from('profiles')
              .update({ onboarding_step: 'assistant_name' } as any)
              .eq('user_id', user.id);
          }
          return {
            nextPrompt: `No worries! One more thing - is there anything you'd like to call me instead of Zoe?\n\n*(Just say "Zoe is fine" or give me a new name)*`,
            stepAdvanced: true,
            complete: false,
          };
        }
        
        const dob = parseDate(text);
        if (!dob) {
          return {
            nextPrompt: "I couldn't understand that birthday. You can type it in *any* format (like '15 Jan 1990', '1990/01/15', or '15-01-1990') — or say 'skip' to move on.",
            stepAdvanced: false,
            complete: false,
          };
        }
        
        setProfile(p => ({ ...p, dateOfBirth: dob }));
        setCurrentStep('assistant_name');

        persistLocal({
          currentStep: 'assistant_name',
          isOnboarding: true,
          profile: { ...profile, dateOfBirth: dob },
        });
        
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ 
              date_of_birth: dob.toISOString().split('T')[0], 
              onboarding_step: 'assistant_name' 
            } as any)
            .eq('user_id', user.id);
        }
        
        const month = dob.toLocaleDateString('en', { month: 'long' });
        const day = dob.getDate();
        
        return {
          nextPrompt: `Got it! ${month} ${day} - I'll remember that! 🎂\n\nNow, is there anything you'd like to call me instead of Zoe?\n\n*(Just say "Zoe is fine" or give me a new name like "Samantha")*`,
          stepAdvanced: true,
          complete: false,
        };
      }
      
      case 'assistant_name': {
        let newName = 'Zoe';
        
        if (/zoe\s*(is\s*)?(fine|good|ok|perfect|great)/i.test(lower) || /keep\s*(it\s*)?zoe/i.test(lower)) {
          newName = 'Zoe';
        } else {
          const extracted = extractName(text);
          if (extracted) newName = extracted;
        }
        
        setProfile(p => ({ ...p, assistantName: newName }));
        setCurrentStep('voice_preference');

        persistLocal({
          currentStep: 'voice_preference',
          isOnboarding: true,
          profile: { ...profile, assistantName: newName },
        });
        
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ assistant_name: newName, onboarding_step: 'voice_preference' } as any)
            .eq('user_id', user.id);
        }
        
        const greeting = newName === 'Zoe' ? "Zoe it is!" : `${newName} - I like it!`;
        
        return {
          nextPrompt: `${greeting} ✨\n\nLast question: Would you prefer a female or male voice for me?\n\n*(Say "female" or "male", or "skip" to keep the default)*`,
          stepAdvanced: true,
          complete: false,
        };
      }
      
      case 'voice_preference': {
        let voice: 'female' | 'male' = 'female';
        
        if (!/skip/i.test(lower)) {
          const pref = extractVoicePreference(text);
          if (pref) voice = pref;
        }
        
        setProfile(p => ({ ...p, voicePreference: voice }));
        setCurrentStep('complete');
        setIsOnboarding(false);

        persistLocal({
          currentStep: 'complete',
          isOnboarding: false,
          profile: { ...profile, voicePreference: voice },
        });
        
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ 
              assistant_voice_preference: voice, 
              onboarding_step: 'complete',
              ...(scope === 'zoe_infinity'
                ? { zoe_infinity_genesis_complete: true }
                : { zoe_genesis_complete: true, zoe_genesis_completed_at: new Date().toISOString() }),
            } as any)
            .eq('user_id', user.id);
        }
        
        return {
          nextPrompt: `Perfect! We're all set, ${profile.realName || 'friend'}! 🚀\n\nI'm ${profile.assistantName}, and I'm here whenever you need me. What's on your mind?`,
          stepAdvanced: true,
          complete: true,
        };
      }
      
      default:
        return {
          nextPrompt: `What's on your mind, ${profile.realName || 'friend'}?`,
          stepAdvanced: false,
          complete: true,
        };
    }
  }, [currentStep, profile, user?.id, persistLocal, scope]);

  const skipOnboarding = useCallback(async () => {
    setIsOnboarding(false);
    setCurrentStep('complete');

    persistLocal({
      currentStep: 'complete',
      isOnboarding: false,
      profile,
    });
    
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({
          onboarding_step: 'complete',
          ...(scope === 'zoe_infinity'
            ? { zoe_infinity_genesis_complete: true }
            : { zoe_genesis_complete: true, zoe_genesis_completed_at: new Date().toISOString() }),
        } as any)
        .eq('user_id', user.id);
    }
  }, [user?.id, profile, persistLocal, scope]);

  const resetOnboarding = useCallback(() => {
    setCurrentStep('name');
    setIsOnboarding(true);
    setProfile({
      realName: null,
      dateOfBirth: null,
      assistantName: 'Zoe',
      voicePreference: 'female',
    });

    safeWriteLocalSnapshot(storageKey, {
      version: 1,
      currentStep: 'name',
      isOnboarding: true,
      profile: {
        realName: null,
        dateOfBirthISO: null,
        assistantName: 'Zoe',
        voicePreference: 'female',
      },
    });
  }, [storageKey]);

  return {
    currentStep,
    profile,
    isOnboarding,
    processUserResponse,
    getInitialPrompt,
    skipOnboarding,
    resetOnboarding,
  };
};
