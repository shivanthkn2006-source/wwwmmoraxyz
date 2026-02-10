// ═══════════════════════════════════════════════════════════════════════════════
// USE ZOE PROFILE AUTO-FILL - Natural Language Profile Data Entry
// Allows users to tell Zoe their personal details via chat/voice
// Zoe automatically extracts and saves to profile
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfileSync } from '@/hooks/useProfileSync';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE FIELD PATTERNS - Natural language patterns for extracting user info
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtractedProfileData {
  field: string;
  value: any;
  label: string;
}

interface ProfileAutoFillResult {
  matched: boolean;
  extractedData?: ExtractedProfileData[];
  response?: string;
  fieldsUpdated?: string[];
}

// Date parsing utility
const parseDate = (text: string): string | null => {
  // Common date formats
  const patterns = [
    // March 15, 1990 or March 15 1990
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
    // 15 March 1990 or 15th March 1990
    /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i,
    // 1990-03-15 or 1990/03/15
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
    // 03-15-1990 or 03/15/1990
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
    // 15/03/1990 (DD/MM/YYYY)
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  ];

  const months: Record<string, string> = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12',
  };

  // Try pattern 1: Month Day, Year
  let match = text.match(patterns[0]);
  if (match) {
    const month = months[match[1].toLowerCase()];
    if (month) {
      const day = match[2].padStart(2, '0');
      return `${match[3]}-${month}-${day}`;
    }
  }

  // Try pattern 2: Day Month Year
  match = text.match(patterns[1]);
  if (match) {
    const month = months[match[2].toLowerCase()];
    if (month) {
      const day = match[1].padStart(2, '0');
      return `${match[3]}-${month}-${day}`;
    }
  }

  // Try pattern 3: YYYY-MM-DD
  match = text.match(patterns[2]);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  // Try pattern 4: MM-DD-YYYY
  match = text.match(patterns[3]);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }

  return null;
};

// Time parsing utility
const parseTime = (text: string): string | null => {
  // Patterns for time
  const patterns = [
    // 3:30 PM, 3:30PM, 3:30 pm
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    // 3 PM, 3PM, 3 am
    /(\d{1,2})\s*(am|pm)/i,
    // 15:30 (24-hour format)
    /(\d{1,2}):(\d{2})(?!\s*[ap])/i,
    // "morning", "afternoon", "evening", "night"
    /(morning|afternoon|evening|night)/i,
  ];

  let match = text.match(patterns[0]);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toLowerCase();
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  }

  match = text.match(patterns[1]);
  if (match) {
    let hours = parseInt(match[1]);
    const period = match[2].toLowerCase();
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:00:00`;
  }

  match = text.match(patterns[2]);
  if (match) {
    const hours = parseInt(match[1]);
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${match[2]}:00`;
    }
  }

  match = text.match(patterns[3]);
  if (match) {
    const period = match[1].toLowerCase();
    const times: Record<string, string> = {
      morning: '08:00:00',
      afternoon: '14:00:00',
      evening: '18:00:00',
      night: '22:00:00',
    };
    return times[period] || null;
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useZoeProfileAutoFill = () => {
  const { user } = useAuth();
  const { updateProfileField, updateProfileFields, forceProfileRefresh } = useProfileSync();

  /**
   * Check if message contains a profile update command
   */
  const isProfileUpdateRequest = useCallback((text: string): boolean => {
    const lower = text.toLowerCase();
    const updateKeywords = [
      'enter it to my profile',
      'save to my profile',
      'update my profile',
      'add to my profile',
      'save this to profile',
      'put it in my profile',
      'fill my profile',
      'add this to my profile',
      'save my details',
      'update my details',
      'enter my details',
      'save my info',
      'update my info',
      'fill in my profile',
      'complete my profile',
      'enter it',
      'save it',
      'add it',
    ];
    return updateKeywords.some(kw => lower.includes(kw));
  }, []);

  /**
   * Extract profile data from natural language text
   */
  const extractProfileData = useCallback((text: string): ExtractedProfileData[] => {
    const extracted: ExtractedProfileData[] = [];
    const lower = text.toLowerCase();

    // ═══ NAME EXTRACTION ═══
    const namePatterns = [
      /my name is ([a-zA-Z\s]+?)(?:,|\.|$|and|i was born)/i,
      /i am ([a-zA-Z\s]+?)(?:,|\.|$|and|i was born)/i,
      /i'm ([a-zA-Z\s]+?)(?:,|\.|$|and|i was born)/i,
      /call me ([a-zA-Z\s]+?)(?:,|\.|$|and)/i,
      /name[:\s]+([a-zA-Z\s]+?)(?:,|\.|$|and)/i,
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 1 && match[1].trim().length < 50) {
        const name = match[1].trim().replace(/\s+/g, ' ');
        // Skip if it's just common words
        if (!['is', 'am', 'was', 'born', 'live', 'from'].includes(name.toLowerCase())) {
          extracted.push({ field: 'display_name', value: name, label: 'Name' });
          break;
        }
      }
    }

    // ═══ BIRTH DATE EXTRACTION ═══
    const birthDatePatterns = [
      /(?:born on|birthday is|birth date is|date of birth is|dob is|born|birthdate)\s*:?\s*(.+?)(?:,|\.|$|at|in\s+(?:[a-zA-Z]))/i,
      /(?:my birthday|my birth date|my dob)\s*(?:is)?\s*:?\s*(.+?)(?:,|\.|$|at|in\s+(?:[a-zA-Z]))/i,
      /(?:i was born on)\s*(.+?)(?:,|\.|$|at|in\s+(?:[a-zA-Z]))/i,
    ];
    for (const pattern of birthDatePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = parseDate(match[1].trim());
        if (dateStr) {
          extracted.push({ field: 'birth_date', value: dateStr, label: 'Date of Birth' });
          break;
        }
      }
    }

    // ═══ BIRTH PLACE EXTRACTION ═══
    const birthPlacePatterns = [
      /(?:born in|birthplace is|birth place is|from|place of birth)\s*:?\s*([a-zA-Z\s,]+?)(?:\.|$|at\s+\d|on\s+\d)/i,
      /(?:i was born in|i'm from|i am from)\s*:?\s*([a-zA-Z\s,]+?)(?:\.|$|at\s+\d|on\s+\d)/i,
      /(?:birth place|birthplace)\s*:?\s*([a-zA-Z\s,]+?)(?:\.|$)/i,
    ];
    for (const pattern of birthPlacePatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        const place = match[1].trim().replace(/\s+/g, ' ');
        // Skip if too short or just common words
        if (place.length >= 3 && !['the', 'and', 'born'].includes(place.toLowerCase())) {
          extracted.push({ field: 'birth_place', value: place, label: 'Birth Place' });
          break;
        }
      }
    }

    // ═══ BIRTH TIME EXTRACTION ═══
    const birthTimePatterns = [
      /(?:born at|birth time is|time of birth)\s*:?\s*(.+?)(?:,|\.|$|in\s+(?:[a-zA-Z]))/i,
      /(?:at)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:in the morning|in the afternoon|in the evening|at night)?/i,
      /(?:time)\s*:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    ];
    for (const pattern of birthTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        const timeStr = parseTime(match[1].trim());
        if (timeStr) {
          extracted.push({ field: 'birth_time', value: timeStr, label: 'Birth Time' });
          break;
        }
      }
    }

    // ═══ CITY/LOCATION EXTRACTION ═══
    const cityPatterns = [
      /(?:i live in|living in|currently in|my city is|city)\s*:?\s*([a-zA-Z\s,]+?)(?:\.|$)/i,
      /(?:located in|location is)\s*:?\s*([a-zA-Z\s,]+?)(?:\.|$)/i,
    ];
    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        const city = match[1].trim().replace(/\s+/g, ' ');
        if (!['the', 'and'].includes(city.toLowerCase())) {
          extracted.push({ field: 'city', value: city, label: 'City' });
          break;
        }
      }
    }

    // ═══ PROFESSION EXTRACTION ═══
    const professionPatterns = [
      /(?:i work as|i am a|i'm a|profession is|job is|i do)\s*(?:a\s+)?([a-zA-Z\s]+?)(?:\.|$|,|and)/i,
      /(?:my profession|my job|my work)\s*(?:is)?\s*:?\s*([a-zA-Z\s]+?)(?:\.|$|,)/i,
    ];
    for (const pattern of professionPatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        const profession = match[1].trim().replace(/\s+/g, ' ');
        if (!['born', 'from', 'live', 'living'].includes(profession.toLowerCase())) {
          extracted.push({ field: 'profession', value: profession, label: 'Profession' });
          break;
        }
      }
    }

    // ═══ BIO EXTRACTION ═══
    const bioPatterns = [
      /(?:my bio is|bio)\s*:?\s*(.+?)(?:$)/i,
      /(?:about me)\s*:?\s*(.+?)(?:$)/i,
    ];
    for (const pattern of bioPatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 10) {
        extracted.push({ field: 'bio', value: match[1].trim(), label: 'Bio' });
        break;
      }
    }

    // ═══ GENDER EXTRACTION ═══
    const genderPatterns = [
      /(?:i am|i'm)\s+(male|female|non-binary|other)/i,
      /(?:gender is|my gender)\s*:?\s*(male|female|non-binary|other)/i,
    ];
    for (const pattern of genderPatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.push({ field: 'gender', value: match[1].toLowerCase(), label: 'Gender' });
        break;
      }
    }

    // ═══ HOBBIES EXTRACTION ═══
    const hobbyPatterns = [
      /(?:my hobbies are|hobbies include|i like|i love|i enjoy)\s*:?\s*(.+?)(?:\.|$)/i,
    ];
    for (const pattern of hobbyPatterns) {
      const match = text.match(pattern);
      if (match) {
        const hobbiesText = match[1].trim();
        // Split by comma, "and", or similar
        const hobbies = hobbiesText
          .split(/,|\sand\s/)
          .map(h => h.trim())
          .filter(h => h.length > 1 && h.length < 50);
        if (hobbies.length > 0) {
          extracted.push({ field: 'hobbies', value: hobbies, label: 'Hobbies' });
          break;
        }
      }
    }

    return extracted;
  }, []);

  /**
   * Process a message and auto-fill profile if data is detected
   */
  const processProfileAutoFill = useCallback(async (
    text: string,
    speakResponse: boolean = true
  ): Promise<ProfileAutoFillResult> => {
    if (!user?.id) {
      return { matched: false };
    }

    const isUpdateRequest = isProfileUpdateRequest(text);
    const extractedData = extractProfileData(text);

    // If no data extracted and not an update request, skip
    if (extractedData.length === 0) {
      return { matched: false };
    }

    // If data was extracted but no explicit update request, confirm first
    if (!isUpdateRequest && extractedData.length > 0) {
      const fieldLabels = extractedData.map(d => d.label).join(', ');
      const response = `I noticed you shared: ${fieldLabels}. Would you like me to save this to your profile? Just say "enter it to my profile" or "save it".`;
      if (speakResponse) speakAsZoe(response);
      return { 
        matched: true, 
        extractedData, 
        response,
        fieldsUpdated: []
      };
    }

    // ═══ PERFORM THE PROFILE UPDATE ═══
    try {
      const updates: Record<string, any> = {};
      const fieldsUpdated: string[] = [];

      for (const data of extractedData) {
        if (data.field === 'hobbies') {
          // For hobbies, we need to merge with existing
          const { data: profile } = await supabase
            .from('profiles')
            .select('hobbies')
            .eq('user_id', user.id)
            .single();
          
          const existingHobbies = profile?.hobbies || [];
          const newHobbies = [...new Set([...existingHobbies, ...data.value])];
          updates.hobbies = newHobbies;
        } else {
          updates[data.field] = data.value;
        }
        fieldsUpdated.push(data.label);
      }

      // Update all fields at once
      const result = await updateProfileFields(updates);

      if (result.success) {
        // Force refresh to update UI
        forceProfileRefresh();
        
        const fieldsText = fieldsUpdated.join(', ');
        const response = `Done! I've updated your profile with: ${fieldsText}. Your profile is looking more complete now! ✨`;
        
        if (speakResponse) speakAsZoe(response);
        toast.success(`Profile updated: ${fieldsText}`);

        // Log to DHF
        window.dispatchEvent(new CustomEvent('zoe-dhf-profile-autofill', {
          detail: {
            userId: user.id,
            fieldsUpdated,
            timestamp: Date.now()
          }
        }));

        return {
          matched: true,
          extractedData,
          response,
          fieldsUpdated
        };
      } else {
        const response = "I had trouble saving that to your profile. Please try again.";
        if (speakResponse) speakAsZoe(response);
        return {
          matched: true,
          extractedData,
          response,
          fieldsUpdated: []
        };
      }
    } catch (error) {
      console.error('[ZoeProfileAutoFill] Error:', error);
      const response = "Something went wrong while updating your profile. Please try again.";
      if (speakResponse) speakAsZoe(response);
      return {
        matched: true,
        extractedData,
        response,
        fieldsUpdated: []
      };
    }
  }, [user?.id, isProfileUpdateRequest, extractProfileData, updateProfileFields, forceProfileRefresh]);

  /**
   * Explicitly save extracted data to profile (after user confirms)
   */
  const saveExtractedToProfile = useCallback(async (
    extractedData: ExtractedProfileData[],
    speakResponse: boolean = true
  ): Promise<{ success: boolean; fieldsUpdated: string[] }> => {
    if (!user?.id || extractedData.length === 0) {
      return { success: false, fieldsUpdated: [] };
    }

    try {
      const updates: Record<string, any> = {};
      const fieldsUpdated: string[] = [];

      for (const data of extractedData) {
        if (data.field === 'hobbies') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('hobbies')
            .eq('user_id', user.id)
            .single();
          
          const existingHobbies = profile?.hobbies || [];
          const newHobbies = [...new Set([...existingHobbies, ...data.value])];
          updates.hobbies = newHobbies;
        } else {
          updates[data.field] = data.value;
        }
        fieldsUpdated.push(data.label);
      }

      const result = await updateProfileFields(updates);

      if (result.success) {
        forceProfileRefresh();
        const fieldsText = fieldsUpdated.join(', ');
        const response = `Perfect! I've saved ${fieldsText} to your profile. ✨`;
        if (speakResponse) speakAsZoe(response);
        toast.success(`Profile updated: ${fieldsText}`);
        return { success: true, fieldsUpdated };
      }

      return { success: false, fieldsUpdated: [] };
    } catch (error) {
      console.error('[ZoeProfileAutoFill] Save error:', error);
      return { success: false, fieldsUpdated: [] };
    }
  }, [user?.id, updateProfileFields, forceProfileRefresh]);

  /**
   * Get list of supported profile fields for help text
   */
  const getSupportedFields = useCallback((): string[] => {
    return [
      'Name (e.g., "My name is John")',
      'Date of Birth (e.g., "I was born on March 15, 1990")',
      'Birth Place (e.g., "I was born in New York")',
      'Birth Time (e.g., "I was born at 3:30 PM")',
      'City (e.g., "I live in Los Angeles")',
      'Profession (e.g., "I work as a Software Engineer")',
      'Gender (e.g., "I am male")',
      'Hobbies (e.g., "My hobbies are reading and gaming")',
      'Bio (e.g., "My bio is: Creative developer...")',
    ];
  }, []);

  return {
    processProfileAutoFill,
    extractProfileData,
    saveExtractedToProfile,
    isProfileUpdateRequest,
    getSupportedFields,
  };
};

export default useZoeProfileAutoFill;
