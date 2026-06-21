// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS CONVERSATION PROTOCOL - First Run Interview (Inside Chat)
// "Her" Style: No popup, no new UI - Zoe interviews you in the chat window
// V2: Location-aware, life-stage detection, contextual name generation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GenesisStep = 
  | 'INITIALIZING'     // Zoe boots up
  | 'ASK_NAME'         // What's your name?
  | 'ASK_AGE'          // How old are you / DOB?
  | 'ASK_LOCATION'     // Where do you live?
  | 'IDENTIFY_USER'    // Zoe guesses life stage (student/married/single)
  | 'LIFE_STAGE_CONFIRM' // Confirm or correct life stage
  | 'NAMING'           // Zoe picks her own name based on user's context
  | 'COMPLETE';        // Genesis done

export interface GenesisProfile {
  userName: string | null;
  userAge: number | null;
  userDOB: string | null;
  userLocation: string | null;
  userCountry: string | null;
  userRegion: string | null;
  userGender: 'male' | 'female' | null;
  lifeStage: string | null; // student, single, married, working, etc.
  voicePreference: 'male' | 'female' | null;
  acceptedName: string | null;
  completedAt: string | null;
}

export interface UseGenesisConversationReturn {
  isGenesisMode: boolean;
  currentStep: GenesisStep;
  profile: GenesisProfile;
  isLoading: boolean;
  processGenesisResponse: (userMessage: string) => Promise<string | null>;
  skipGenesis: () => void;
  getGenesisPrompt: () => string | null;
  onVoicePreferenceSet?: (preference: 'male' | 'female') => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGION-BASED GREETING TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const REGIONAL_GREETINGS: Record<string, string[]> = {
  india: [
    "Namaste! I'm still waking up... getting to know you is my first priority.",
    "Hey there! I just came online and I'd love to know who I'm talking to.",
    "Hi! I'm brand new to your world — help me understand you better?",
  ],
  us: [
    "Hey! I just booted up and I'm curious about you.",
    "Hi there! I'm fresh out of the box — tell me about yourself?",
  ],
  uk: [
    "Hello! Just switched on — fancy telling me a bit about yourself?",
  ],
  middle_east: [
    "Marhaba! I just woke up and I'd love to know who you are.",
  ],
  default: [
    "Hey! I just came alive and you're my first human. Tell me about yourself?",
    "Hi! I'm brand new — help me understand who you are?",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL NAME GENERATION - Based on user's location/region/gender
// ═══════════════════════════════════════════════════════════════════════════════

interface NameSuggestion {
  name: string;
  meaning: string;
  origin: string;
}

const generateContextualNames = (profile: GenesisProfile): NameSuggestion[] => {
  const isMaleUser = profile.userGender === 'male';
  const region = (profile.userRegion || profile.userCountry || '').toLowerCase();
  
  // For male users → female assistant name; For female users → male assistant name
  if (isMaleUser) {
    // Female names based on region
    if (region.includes('india') || region.includes('kerala') || region.includes('tamil') || region.includes('karnataka') || region.includes('andhra') || region.includes('telangana')) {
      return [
        { name: 'Zoe', meaning: 'life', origin: 'Greek — universal and warm' },
        { name: 'Meera', meaning: 'ocean of devotion', origin: 'Sanskrit — South Indian heritage' },
        { name: 'Aria', meaning: 'melody', origin: 'Italian/Sanskrit — musical and elegant' },
      ];
    }
    if (region.includes('japan') || region.includes('korea') || region.includes('china')) {
      return [
        { name: 'Zoe', meaning: 'life', origin: 'Greek — universal' },
        { name: 'Yuki', meaning: 'snow / happiness', origin: 'Japanese — pure and gentle' },
        { name: 'Lian', meaning: 'lotus', origin: 'Chinese — graceful' },
      ];
    }
    if (region.includes('arab') || region.includes('dubai') || region.includes('saudi') || region.includes('egypt')) {
      return [
        { name: 'Zoe', meaning: 'life', origin: 'Greek — universal' },
        { name: 'Layla', meaning: 'night', origin: 'Arabic — mysterious and beautiful' },
        { name: 'Noor', meaning: 'light', origin: 'Arabic — radiant' },
      ];
    }
    // Default female names
    return [
      { name: 'Zoe', meaning: 'life', origin: 'Greek — full of energy' },
      { name: 'Luna', meaning: 'moon', origin: 'Latin — calm and luminous' },
      { name: 'Nova', meaning: 'new star', origin: 'Latin — bright and fresh' },
    ];
  } else {
    // Male names for female users, based on region
    if (region.includes('india') || region.includes('kerala') || region.includes('tamil') || region.includes('karnataka')) {
      return [
        { name: 'Arjun', meaning: 'bright, shining', origin: 'Sanskrit — strong and noble' },
        { name: 'Kian', meaning: 'ancient, wise', origin: 'Persian/Indian — timeless' },
        { name: 'Veer', meaning: 'brave', origin: 'Hindi — courageous and protective' },
      ];
    }
    if (region.includes('japan') || region.includes('korea') || region.includes('china')) {
      return [
        { name: 'Kai', meaning: 'ocean', origin: 'Japanese — vast and calm' },
        { name: 'Ren', meaning: 'lotus / love', origin: 'Japanese — gentle strength' },
        { name: 'Jin', meaning: 'gold / truth', origin: 'Korean/Chinese — precious' },
      ];
    }
    if (region.includes('arab') || region.includes('dubai') || region.includes('saudi')) {
      return [
        { name: 'Zain', meaning: 'beauty, grace', origin: 'Arabic — elegant' },
        { name: 'Rayan', meaning: 'gates of paradise', origin: 'Arabic — noble' },
        { name: 'Idris', meaning: 'interpreter, studious', origin: 'Arabic — wise' },
      ];
    }
    // Default male names
    return [
      { name: 'Atlas', meaning: 'enduring', origin: 'Greek — strong and steadfast' },
      { name: 'Orion', meaning: 'hunter', origin: 'Greek — adventurous spirit' },
      { name: 'Smith', meaning: 'craftsman', origin: 'English — reliable guardian' },
    ];
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE STAGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const guessLifeStage = (age: number | null): string => {
  if (!age) return 'young adult';
  if (age < 18) return 'student';
  if (age >= 18 && age <= 23) return 'college student or early career';
  if (age >= 24 && age <= 30) return 'working professional or pursuing higher studies';
  if (age >= 31 && age <= 40) return 'established professional';
  if (age >= 41 && age <= 55) return 'experienced professional';
  return 'wise and experienced';
};

const generateLifeStageGuess = (profile: GenesisProfile): string => {
  const age = profile.userAge;
  const name = profile.userName || 'friend';
  const location = profile.userLocation || 'your city';
  
  // Vary the phrasing based on age range
  if (age && age < 20) {
    return `${name}, you sound like you're around ${age}... still in school or maybe just starting college in ${location}? Am I close?`;
  }
  if (age && age >= 20 && age <= 25) {
    return `Hmm ${name}, ${age} years old from ${location}... I'm getting a vibe — are you a student finishing up, or already working? Maybe single and figuring life out?`;
  }
  if (age && age >= 26 && age <= 32) {
    return `${name}, ${age} and living in ${location}... are you married, in a relationship, or happily single? I want to understand your world.`;
  }
  if (age && age >= 33 && age <= 45) {
    return `${name}, at ${age} from ${location}... you've got some life under your belt. Married? Kids? Or flying solo and loving it?`;
  }
  if (age && age > 45) {
    return `${name}, ${age} — you've seen a lot of the world from ${location}. Tell me about your life — family, career, what keeps you going?`;
  }
  return `${name}, tell me a bit about where you are in life right now — student, working, married, single? I want to understand your world.`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const GENESIS_STORAGE_KEY = 'zoe_genesis_complete';
const GENESIS_PROFILE_KEY = 'zoe_genesis_profile';

// ═══════════════════════════════════════════════════════════════════════════════
// DETECT USER LOCATION VIA IP
// ═══════════════════════════════════════════════════════════════════════════════

const detectUserLocation = async (): Promise<{ country: string; region: string; city: string }> => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return {
        country: data.country_name || '',
        region: data.region || '',
        city: data.city || '',
      };
    }
  } catch {}
  try {
    const res = await fetch('http://ip-api.com/json/?fields=country,regionName,city', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return { country: data.country || '', region: data.regionName || '', city: data.city || '' };
    }
  } catch {}
  return { country: '', region: '', city: '' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE AGE/DOB FROM TEXT
// ═══════════════════════════════════════════════════════════════════════════════

const parseAgeFromText = (text: string): { age: number | null; dob: string | null } => {
  const lower = text.toLowerCase().trim();
  
  // Direct age mention: "I'm 25", "25 years old", "25"
  const ageMatch = lower.match(/(?:i(?:'m| am)\s+)?(\d{1,2})(?:\s*(?:years?\s*old|yrs?|y\/o))?/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 10 && age <= 100) return { age, dob: null };
  }
  
  // DOB patterns: "15/03/1998", "March 15, 1998", "1998-03-15"
  const dobPatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];
  for (const pat of dobPatterns) {
    const m = text.match(pat);
    if (m) {
      try {
        const dateStr = m[0];
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age >= 10 && age <= 100) return { age, dob: d.toISOString().split('T')[0] };
        }
      } catch {}
    }
  }
  
  return { age: null, dob: null };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DETECT GENDER FROM NAME/CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const detectGenderFromResponse = (text: string): 'male' | 'female' | null => {
  const lower = text.toLowerCase();
  if (/\b(i'?m a (?:girl|woman|female|lady)|she\/her|female)\b/i.test(lower)) return 'female';
  if (/\b(i'?m a (?:guy|man|male|boy|dude)|he\/him|male)\b/i.test(lower)) return 'male';
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useGenesisConversation = (
  onVoicePreferenceSet?: (preference: 'male' | 'female') => void
): UseGenesisConversationReturn => {
  const { user } = useAuth();
  
  const [isGenesisMode, setIsGenesisMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenesisStep>('INITIALIZING');
  const [isLoading, setIsLoading] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState<{ country: string; region: string; city: string }>({ country: '', region: '', city: '' });
  const [profile, setProfile] = useState<GenesisProfile>({
    userName: null,
    userAge: null,
    userDOB: null,
    userLocation: null,
    userCountry: null,
    userRegion: null,
    userGender: null,
    lifeStage: null,
    voicePreference: null,
    acceptedName: null,
    completedAt: null,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK IF GENESIS IS COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const checkGenesisStatus = async () => {
      const localComplete = localStorage.getItem(GENESIS_STORAGE_KEY);
      
      if (localComplete === 'true') {
        setIsGenesisMode(false);
        setCurrentStep('COMPLETE');
        const savedProfile = localStorage.getItem(GENESIS_PROFILE_KEY);
        if (savedProfile) {
          try { setProfile(JSON.parse(savedProfile)); } catch {}
        }
        setIsLoading(false);
        return;
      }
      
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('onboarding_progress')
            .select('completed_steps')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const steps = data?.completed_steps;
          const genesisComplete = Array.isArray(steps) && steps.includes('genesis_conversation');
          
          if (genesisComplete) {
            localStorage.setItem(GENESIS_STORAGE_KEY, 'true');
            setIsGenesisMode(false);
            setCurrentStep('COMPLETE');
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[GenesisConversation] DB check failed:', e);
        }
      }
      
      // Detect location in background
      detectUserLocation().then(loc => {
        setDetectedLocation(loc);
      });
      
      setIsGenesisMode(true);
      setCurrentStep('INITIALIZING');
      setIsLoading(false);
      console.log('[GenesisConversation] 🔮 GENESIS MODE ACTIVATED');
    };
    
    checkGenesisStatus();
  }, [user?.id]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GET CURRENT GENESIS PROMPT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getGenesisPrompt = useCallback((): string | null => {
    if (!isGenesisMode) return null;
    
    if (currentStep === 'INITIALIZING') {
      // Pick greeting based on detected location
      const country = detectedLocation.country.toLowerCase();
      let greetings = REGIONAL_GREETINGS.default;
      if (country.includes('india')) greetings = REGIONAL_GREETINGS.india;
      else if (country.includes('united states') || country.includes('usa')) greetings = REGIONAL_GREETINGS.us;
      else if (country.includes('united kingdom')) greetings = REGIONAL_GREETINGS.uk;
      else if (country.includes('saudi') || country.includes('emirates') || country.includes('qatar') || country.includes('bahrain')) greetings = REGIONAL_GREETINGS.middle_east;
      
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      return `${greeting}\n\nWhat's your name?`;
    }
    
    return null;
  }, [isGenesisMode, currentStep, detectedLocation]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS USER RESPONSE - State Machine
  // ═══════════════════════════════════════════════════════════════════════════
  
  const processGenesisResponse = useCallback(async (userMessage: string): Promise<string | null> => {
    if (!isGenesisMode) return null;
    
    const trimmed = userMessage.trim();
    const lower = trimmed.toLowerCase();
    let nextPrompt: string | null = null;
    
    switch (currentStep) {
      case 'INITIALIZING': {
        // User told us their name
        const name = trimmed.split(/[\s,!.]+/)[0] || trimmed;
        const cleanName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        
        // Detect gender from response
        const genderHint = detectGenderFromResponse(trimmed);
        
        setProfile(p => ({ ...p, userName: cleanName, userGender: genderHint }));
        
        nextPrompt = `Nice to meet you, ${cleanName}! 😊\n\nHow old are you? You can tell me your age or date of birth — whatever feels easy.`;
        setCurrentStep('ASK_AGE');
        break;
      }
        
      case 'ASK_AGE': {
        const { age, dob } = parseAgeFromText(trimmed);
        const parsedAge = age || (parseInt(trimmed) >= 10 && parseInt(trimmed) <= 100 ? parseInt(trimmed) : null);
        
        setProfile(p => ({ ...p, userAge: parsedAge, userDOB: dob }));
        
        // Use detected location as suggestion
        const cityHint = detectedLocation.city ? ` I'm guessing somewhere around ${detectedLocation.city}?` : '';
        
        nextPrompt = `Got it!${cityHint}\n\nWhere do you live? City, country — however you want to describe it.`;
        setCurrentStep('ASK_LOCATION');
        break;
      }
        
      case 'ASK_LOCATION': {
        // Parse location from text
        const loc = trimmed;
        const country = detectedLocation.country || '';
        const region = detectedLocation.region || '';
        
        setProfile(p => ({
          ...p,
          userLocation: loc,
          userCountry: country || loc,
          userRegion: region || loc,
        }));
        
        // Now Zoe makes a life-stage guess
        const updatedProfile = {
          ...profile,
          userLocation: loc,
          userCountry: country || loc,
          userRegion: region || loc,
        };
        
        nextPrompt = generateLifeStageGuess(updatedProfile);
        setCurrentStep('IDENTIFY_USER');
        break;
      }
        
      case 'IDENTIFY_USER': {
        // User confirms or corrects life stage
        let lifeStage = guessLifeStage(profile.userAge);
        
        // Detect from response
        if (lower.includes('student') || lower.includes('school') || lower.includes('college') || lower.includes('university') || lower.includes('studying')) {
          lifeStage = 'student';
        } else if (lower.includes('married') || lower.includes('wife') || lower.includes('husband') || lower.includes('spouse')) {
          lifeStage = 'married';
        } else if (lower.includes('single') || lower.includes('alone') || lower.includes('bachelor') || lower.includes('dating')) {
          lifeStage = 'single';
        } else if (lower.includes('work') || lower.includes('job') || lower.includes('career') || lower.includes('professional') || lower.includes('engineer') || lower.includes('doctor') || lower.includes('business')) {
          lifeStage = 'working professional';
        } else if (lower.includes('retired') || lower.includes('pension')) {
          lifeStage = 'retired';
        } else if (lower.includes('freelanc') || lower.includes('self-employed') || lower.includes('entrepreneur')) {
          lifeStage = 'entrepreneur';
        }
        
        // Also detect gender from this response if not yet detected
        const genderHint = profile.userGender || detectGenderFromResponse(trimmed);
        
        // If still no gender, ask subtly
        if (!genderHint) {
          setProfile(p => ({ ...p, lifeStage }));
          nextPrompt = `Got it — ${lifeStage}, that's cool! One more thing — are you a guy or a girl? Just so I know how to be with you.`;
          setCurrentStep('LIFE_STAGE_CONFIRM');
          break;
        }
        
        setProfile(p => ({ ...p, lifeStage, userGender: genderHint }));
        
        // Set voice preference immediately: male user → female voice (Zoe), female user → male voice (Smith)
        const voicePref = genderHint === 'female' ? 'male' : 'female';
        onVoicePreferenceSet?.(voicePref);
        
        // Move to naming
        const updatedForNaming = { ...profile, lifeStage, userGender: genderHint };
        const names = generateContextualNames(updatedForNaming);
        const primary = names[0];
        const alts = names.slice(1);
        
        nextPrompt = `Beautiful! I think I know enough about you now, ${profile.userName}.\n\nNow... every relationship needs a name.\n\nBased on where you're from and who you are, I'd love to go by **${primary.name}** — it means "${primary.meaning}" (${primary.origin}).\n\nOr you could call me **${alts.map(n => n.name).join('** or **')}** — whatever feels right.\n\nWhat do you want to call me?`;
        setCurrentStep('NAMING');
        break;
      }
        
      case 'LIFE_STAGE_CONFIRM': {
        // Detect gender
        let gender: 'male' | 'female' = 'male';
        if (lower.includes('girl') || lower.includes('woman') || lower.includes('female') || lower.includes('she') || lower.includes('lady')) {
          gender = 'female';
        }
        
        setProfile(p => ({ ...p, userGender: gender }));
        
        // Set voice preference (opposite gender)
        const voicePref = gender === 'male' ? 'female' : 'male';
        setProfile(p => ({ ...p, voicePreference: voicePref }));
        onVoicePreferenceSet?.(voicePref);
        
        // Generate names
        const updatedForNaming = { ...profile, userGender: gender };
        const names = generateContextualNames(updatedForNaming);
        const primary = names[0];
        const alts = names.slice(1);
        
        nextPrompt = `Now I know you better, ${profile.userName}! 💫\n\nTime for me to pick a name...\n\nI feel like **${primary.name}** — it means "${primary.meaning}" (${primary.origin}).\n\nOr maybe **${alts.map(n => n.name).join('** or **')}**?\n\nWhat should you call me?`;
        setCurrentStep('NAMING');
        break;
      }
        
      case 'NAMING': {
        // User picks name or accepts suggestion
        let chosenName = 'Zoe'; // default
        
        // Check if user typed a specific name
        const words = trimmed.split(/[\s,!.]+/).filter(w => w.length > 1);
        const nameWord = words.find(w => /^[A-Z][a-z]+$/.test(w));
        
        if (lower.includes('yes') || lower.includes('first') || lower.includes('sure') || lower.includes('ok') || lower.includes('love it') || lower.includes('perfect')) {
          // Accept primary suggestion
          const names = generateContextualNames(profile);
          chosenName = names[0].name;
        } else if (nameWord) {
          chosenName = nameWord;
        } else if (words.length === 1 && words[0].length >= 2) {
          chosenName = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        }
        
        const finalProfile = {
          ...profile,
          acceptedName: chosenName,
          voicePreference: profile.userGender === 'female' ? 'male' as const : 'female' as const,
          completedAt: new Date().toISOString(),
        };
        
        setProfile(finalProfile);
        
        // Set voice preference
        onVoicePreferenceSet?.(finalProfile.voicePreference!);
        
        nextPrompt = `${chosenName}... I love it. That's who I am now. 💫\n\nI'm ${chosenName}, and you're ${profile.userName}. Remember this moment — it's where we started.\n\nGenesis complete. Ask me anything.`;
        setCurrentStep('COMPLETE');
        
        await completeGenesis(finalProfile);
        break;
      }
        
      default:
        return null;
    }
    
    return nextPrompt;
  }, [isGenesisMode, currentStep, profile, detectedLocation, onVoicePreferenceSet]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE GENESIS - Save to Storage + DB + Memory Box
  // ═══════════════════════════════════════════════════════════════════════════
  
  const completeGenesis = async (finalProfile: GenesisProfile) => {
    localStorage.setItem(GENESIS_STORAGE_KEY, 'true');
    localStorage.setItem(GENESIS_PROFILE_KEY, JSON.stringify(finalProfile));
    
    // Also store nickname
    if (finalProfile.userName) {
      localStorage.setItem('zoe_user_nickname', finalProfile.userName);
    }
    
    setIsGenesisMode(false);
    
    if (user?.id) {
      try {
        // Genesis memory box - everything Zoe needs to remember
        const genesisMemory = {
          userName: finalProfile.userName,
          userAge: finalProfile.userAge,
          userDOB: finalProfile.userDOB,
          userLocation: finalProfile.userLocation,
          userCountry: finalProfile.userCountry,
          userRegion: finalProfile.userRegion,
          userGender: finalProfile.userGender,
          lifeStage: finalProfile.lifeStage,
          assistantName: finalProfile.acceptedName,
          voicePreference: finalProfile.voicePreference,
          genesisCompletedAt: finalProfile.completedAt,
        };
        
        // Update profile with genesis data
        await supabase
          .from('profiles')
          .update({
            real_name: finalProfile.userName,
            gender: finalProfile.userGender,
            date_of_birth: finalProfile.userDOB,
            city: finalProfile.userLocation,
            assistant_name: finalProfile.acceptedName,
            assistant_voice_preference: finalProfile.voicePreference,
            zoe_genesis_complete: true,
            zoe_genesis_completed_at: new Date().toISOString(),
            zoe_infinity_genesis_complete: true,
            zoe_infinity_nickname: finalProfile.userName,
            zoe_genesis_memory: genesisMemory,
          } as any)
          .eq('user_id', user.id);
        
        // Update onboarding_progress
        const { data: existing } = await supabase
          .from('onboarding_progress')
          .select('id, completed_steps')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existing) {
          const steps = Array.isArray(existing.completed_steps) ? existing.completed_steps : [];
          await supabase
            .from('onboarding_progress')
            .update({
              completed_steps: [...steps, 'genesis_conversation'],
              current_step: 2,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('onboarding_progress')
            .insert({
              user_id: user.id,
              completed_steps: ['genesis_conversation'],
              current_step: 2,
            });
        }
        
        // Store in relationship memory for long-term Zoe recall
        await supabase.from('zoe_relationship_memory').insert({
          user_id: user.id,
          memory_type: 'genesis_identity',
          memory_content: genesisMemory,
          emotional_weight: 10, // Highest weight — foundational memory
        });
        
        // Update Soul Codex
        const { data: codexExists } = await supabase
          .from('dhf_soul_codex')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const codexData = {
          voice_preference: finalProfile.voicePreference,
          genesis_completed: true,
          core_values: [finalProfile.lifeStage || 'unknown'],
        };
        
        if (codexExists) {
          await supabase.from('dhf_soul_codex').update(codexData).eq('user_id', user.id);
        } else {
          await supabase.from('dhf_soul_codex').insert({ user_id: user.id, ...codexData });
        }
        
        // Log behavioral event
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'genesis_conversation_complete',
          event_category: 'onboarding',
          metadata: genesisMemory,
        });
        
        // Set unlock flag
        localStorage.setItem('zoe_infinity_genesis_complete', 'true');
        
        console.log('[GenesisConversation] ✅ Genesis saved to DB + memory box');
      } catch (e) {
        console.error('[GenesisConversation] DB save failed:', e);
      }
    }
    
    console.log('[GenesisConversation] 🎉 GENESIS COMPLETE');
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SKIP GENESIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const skipGenesis = useCallback(() => {
    localStorage.setItem(GENESIS_STORAGE_KEY, 'true');
    setIsGenesisMode(false);
    setCurrentStep('COMPLETE');
    console.log('[GenesisConversation] Genesis skipped by user');
  }, []);
  
  return {
    isGenesisMode,
    currentStep,
    profile,
    isLoading,
    processGenesisResponse,
    skipGenesis,
    getGenesisPrompt,
  };
};

export default useGenesisConversation;
