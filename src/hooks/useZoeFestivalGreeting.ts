// ═══════════════════════════════════════════════════════════════════════════════
// ZOE FESTIVAL GREETING ENGINE
// Detects festivals, birthdays, and family occasions for personalized greetings
// Wired into Adaptive Learning Engine + DHF profiling
// Now auto-fed by IP geolocation detection
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getDetectedLocationSync } from '@/hooks/useZoeLocationAutoDetect';
import {
  detectTodaysFestivals,
  isBirthdayToday,
  getBirthdayGreeting,
  getFamilyBirthdayReminder,
  Festival,
} from '@/utils/worldFestivals';

interface UserFestivalProfile {
  realName: string | null;
  dateOfBirth: string | null;
  location: string | null;
  country: string | null;
  familyBirthdays: { name: string; relation: string; dob: string }[];
}

// Track which greetings were already shown today (per session)
const shownGreetingsToday = new Set<string>();
const SESSION_KEY = 'zoe_festival_greetings_shown';

function loadShownGreetings(): void {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const today = new Date().toDateString();
      if (parsed.date === today && Array.isArray(parsed.ids)) {
        parsed.ids.forEach((id: string) => shownGreetingsToday.add(id));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {}
}

function saveShownGreeting(id: string): void {
  shownGreetingsToday.add(id);
  try {
    const today = new Date().toDateString();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      date: today,
      ids: Array.from(shownGreetingsToday),
    }));
  } catch {}
}

export function useZoeFestivalGreeting() {
  const { user } = useAuth();
  const profileRef = useRef<UserFestivalProfile | null>(null);
  const [needsDOB, setNeedsDOB] = useState(false);
  const loadedRef = useRef(false);

  // Load on mount
  useEffect(() => {
    loadShownGreetings();
  }, []);

  // Load user profile for festival detection
  const loadProfile = useCallback(async (): Promise<UserFestivalProfile | null> => {
    if (!user?.id) return null;

    const ipLocation = getDetectedLocationSync();

    if (profileRef.current) {
      if (ipLocation && (!profileRef.current.location || !profileRef.current.country)) {
        profileRef.current = {
          ...profileRef.current,
          location: profileRef.current.location || [ipLocation.city, ipLocation.region].filter(Boolean).join(', ') || null,
          country: profileRef.current.country || ipLocation.countryCode || ipLocation.country || null,
        };
      }
      return profileRef.current;
    }

    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('real_name, date_of_birth, birth_date, city')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[FestivalGreeting] Profile query error:', profileError);
      }

      // Get location from adaptive learning
      const { data: locationPatterns } = await supabase
        .from('zoe_adaptive_learning')
        .select('pattern_key, pattern_value')
        .eq('user_id', user.id)
        .eq('pattern_type', 'location')
        .order('usage_count', { ascending: false })
        .limit(5);

      // Get family birthdays from adaptive learning
      const { data: familyPatterns } = await supabase
        .from('zoe_adaptive_learning')
        .select('pattern_key, pattern_value')
        .eq('user_id', user.id)
        .eq('pattern_type', 'family')
        .limit(20);

      const { data: personalPatterns } = await supabase
        .from('zoe_adaptive_learning')
        .select('pattern_key, pattern_value')
        .eq('user_id', user.id)
        .eq('pattern_type', 'personal')
        .in('pattern_key', ['date_of_birth', 'birth_date'])
        .limit(10);

      // Build location string from multiple sources
      const dbLocation = locationPatterns?.find(p => p.pattern_key === 'current_location')?.pattern_value;
      const profileLocation = (profile as any)?.city;
      const bestLocation = dbLocation || profileLocation || 
        (ipLocation ? [ipLocation.city, ipLocation.region].filter(Boolean).join(', ') : null);

      // Get country from adaptive learning or IP
      const dbCountry = locationPatterns?.find(p => p.pattern_key === 'country')?.pattern_value;
      const bestCountry = dbCountry || ipLocation?.countryCode || ipLocation?.country || null;

      const learnedDob = personalPatterns?.find(
        (p) => p.pattern_key === 'date_of_birth' || p.pattern_key === 'birth_date'
      )?.pattern_value;

      const p: UserFestivalProfile = {
        realName: (profile as any)?.real_name || null,
        dateOfBirth: (profile as any)?.date_of_birth || (profile as any)?.birth_date || learnedDob || null,
        location: bestLocation,
        country: bestCountry,
        familyBirthdays: [],
      };

      // Parse family birthdays from learned patterns
      if (familyPatterns) {
        for (const fp of familyPatterns) {
          // Check if we have birthday info stored as "family_wife_birthday" etc.
          if (fp.pattern_key.includes('birthday') || fp.pattern_key.includes('dob')) {
            const parts = fp.pattern_key.split('_');
            const relation = parts[1] || 'family member';
            p.familyBirthdays.push({
              name: fp.pattern_value,
              relation,
              dob: fp.pattern_value,
            });
          }
        }
      }

      // Check if DOB is missing — we'll prompt user
      if (!p.dateOfBirth) {
        setNeedsDOB(true);
      }

      profileRef.current = p;
      return p;
    } catch (e) {
      console.error('[FestivalGreeting] Profile load error:', e);
      return null;
    }
  }, [user?.id]);

  // Auto-load profile
  useEffect(() => {
    if (user?.id && !loadedRef.current) {
      loadedRef.current = true;
      loadProfile();
    }
  }, [user?.id, loadProfile]);

  // Get today's greeting (called once per login session)
  const getTodaysGreeting = useCallback(async (): Promise<string | null> => {
    const profile = await loadProfile();
    if (!profile) return null;

    const greetings: string[] = [];

    // 1. Birthday check (highest priority)
    if (profile.dateOfBirth && isBirthdayToday(profile.dateOfBirth)) {
      const greetingId = `birthday_${new Date().toDateString()}`;
      if (!shownGreetingsToday.has(greetingId)) {
        const dob = new Date(profile.dateOfBirth);
        const age = new Date().getFullYear() - dob.getFullYear();
        const name = profile.realName || 'friend';
        greetings.push(getBirthdayGreeting(name, age));
        saveShownGreeting(greetingId);
      }
    }

    // 2. Festival check (location + name based)
    const festivals = detectTodaysFestivals(
      profile.location || undefined,
      profile.realName || undefined,
      profile.country || undefined,
    );

    for (const f of festivals) {
      const greetingId = `festival_${f.name}_${new Date().toDateString()}`;
      if (!shownGreetingsToday.has(greetingId)) {
        greetings.push(`${f.emoji} ${f.greeting}`);
        saveShownGreeting(greetingId);
      }
    }

    // 3. Family birthday reminders
    for (const fb of profile.familyBirthdays) {
      if (fb.dob && isBirthdayToday(fb.dob)) {
        const greetingId = `family_bday_${fb.name}_${new Date().toDateString()}`;
        if (!shownGreetingsToday.has(greetingId)) {
          greetings.push(getFamilyBirthdayReminder(
            fb.name,
            fb.relation,
            profile.realName || 'friend',
          ));
          saveShownGreeting(greetingId);
        }
      }
    }

    if (greetings.length === 0) return null;
    return greetings.join('\n\n');
  }, [loadProfile]);

  // DOB collection — returns prompt message if DOB is missing
  const getDOBCollectionPrompt = useCallback((): string | null => {
    if (!needsDOB || !user?.id) return null;

    const promptId = `dob_prompt_${user.id}`;
    // Only ask once per session
    if (shownGreetingsToday.has(promptId)) return null;
    saveShownGreeting(promptId);

    return "By the way, I'd love to remember your birthday so I can celebrate with you! 🎂 When's your birthday? You can tell me in any format like '15 Jan 1990' or '1990-01-15'.";
  }, [needsDOB, user?.id]);

  // Save DOB when user provides it
  const saveDateOfBirth = useCallback(async (dobText: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Parse date from text
    const dob = parseDateFromText(dobText);
    if (!dob) return false;

    const dobStr = dob.toISOString().split('T')[0];

    try {
      // Save to profiles
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ date_of_birth: dobStr, birth_date: dobStr } as any)
        .eq('user_id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      // Save to adaptive learning
      const { error: learningUpdateError } = await supabase
        .from('zoe_adaptive_learning')
        .upsert([
          {
            user_id: user.id,
            pattern_type: 'personal',
            pattern_key: 'date_of_birth',
            pattern_value: dobStr,
            confidence_score: 1.0,
            usage_count: 1,
            source: 'user_provided',
          },
          {
            user_id: user.id,
            pattern_type: 'personal',
            pattern_key: 'birth_date',
            pattern_value: dobStr,
            confidence_score: 1.0,
            usage_count: 1,
            source: 'user_provided',
          },
        ], { onConflict: 'user_id,pattern_key' });

      if (learningUpdateError) throw learningUpdateError;

      setNeedsDOB(false);
      if (profileRef.current) {
        profileRef.current.dateOfBirth = dobStr;
      }

      console.log('[FestivalGreeting] DOB saved:', dobStr);
      return true;
    } catch (e) {
      console.error('[FestivalGreeting] DOB save error:', e);
      return false;
    }
  }, [user?.id]);

  // Learn family member birthday from conversation
  const learnFamilyBirthday = useCallback(async (
    relation: string,
    memberName: string,
    dob: string,
  ): Promise<void> => {
    if (!user?.id) return;

    try {
      await supabase
        .from('zoe_adaptive_learning')
        .upsert({
          user_id: user.id,
          pattern_type: 'family',
          pattern_key: `family_${relation}_birthday`,
          pattern_value: `${memberName}|${dob}`,
          confidence_score: 1.0,
          usage_count: 1,
          source: 'user_provided',
        }, { onConflict: 'user_id,pattern_key' });

      console.log(`[FestivalGreeting] Learned family birthday: ${relation} ${memberName} - ${dob}`);
    } catch (e) {
      console.error('[FestivalGreeting] Family birthday save error:', e);
    }
  }, [user?.id]);

  // Build festival context for brain injection
  const buildFestivalContext = useCallback(async (): Promise<string> => {
    const profile = await loadProfile();
    if (!profile) return '';

    const festivals = detectTodaysFestivals(
      profile.location || undefined,
      profile.realName || undefined,
      profile.country || undefined,
    );

    if (festivals.length === 0 && !isBirthdayToday(profile.dateOfBirth)) return '';

    const parts: string[] = ['═══ TODAY\'S CELEBRATIONS ═══'];

    if (profile.dateOfBirth && isBirthdayToday(profile.dateOfBirth)) {
      const age = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
      parts.push(`🎂 TODAY IS THE USER'S BIRTHDAY! They are turning ${age}. Make it special!`);
    }

    for (const f of festivals) {
      parts.push(`${f.emoji} ${f.name}: ${f.greeting}`);
    }

    parts.push('Naturally weave these celebrations into your conversation. Be warm and festive!');
    parts.push('═══════════════════════════════');

    return parts.join('\n');
  }, [loadProfile]);

  return {
    getTodaysGreeting,
    getDOBCollectionPrompt,
    saveDateOfBirth,
    learnFamilyBirthday,
    buildFestivalContext,
    needsDOB,
  };
}

// ═══ DATE PARSER ═══
function parseDateFromText(text: string): Date | null {
  const cleaned = text.trim();

  // Try ISO format: 1990-01-15
  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(cleaned);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(cleaned);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);

  // Try "15 Jan 1990" or "Jan 15 1990"
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };

  const textDate = /(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})/i.exec(cleaned);
  if (textDate) {
    const m = months[textDate[2].toLowerCase()];
    if (m !== undefined) return new Date(+textDate[3], m, +textDate[1]);
  }

  const textDate2 = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i.exec(cleaned);
  if (textDate2) {
    const m = months[textDate2[1].toLowerCase()];
    if (m !== undefined) return new Date(+textDate2[3], m, +textDate2[2]);
  }

  // Try native Date parse as last resort
  const d = new Date(cleaned);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2020) return d;

  return null;
}
