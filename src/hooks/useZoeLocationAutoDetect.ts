// ═══════════════════════════════════════════════════════════════════════════════
// ZOE LOCATION AUTO-DETECT (Silent Background)
// Detects user location via IP at login and feeds into:
// 1. Festival Greeting Engine
// 2. Hidden Adaptive Learning Engine
// 3. User profile (if empty)
// Runs once per session, silently, no memory leaks
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface IPLocationData {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lon: number;
  isp: string;
}

const SESSION_KEY = 'zoe_location_detected';
let cachedLocation: IPLocationData | null = null;

export function useZoeLocationAutoDetect() {
  const { user } = useAuth();
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || detectedRef.current) return;

    // Only detect once per browser session
    const already = sessionStorage.getItem(SESSION_KEY);
    if (already) {
      try { cachedLocation = JSON.parse(already); } catch {}
      detectedRef.current = true;
      return;
    }

    const detect = async () => {
      detectedRef.current = true;
      try {
        // Use HTTPS-first provider so login-time detection works on secure previews.
        const res = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) throw new Error('ipapi failed');
        const raw = await res.json();

        const loc: IPLocationData = {
          city: raw.city || '',
          region: raw.region || '',
          country: raw.country_name || '',
          countryCode: raw.country_code || '',
          timezone: raw.timezone || '',
          lat: raw.latitude || 0,
          lon: raw.longitude || 0,
          isp: raw.org || '',
        };

        cachedLocation = loc;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
        console.log(`[LocationAutoDetect] 📍 ${loc.city}, ${loc.region}, ${loc.country}`);

        // Feed into Hidden Adaptive Learning Engine (silent, fire-and-forget)
        await feedToAdaptiveLearning(user.id, loc);

        // Update profile location if empty
        await updateProfileLocation(user.id, loc);

        // Track login event with location
        await trackLoginEvent(user.id, loc);

      } catch (e) {
        console.warn('[LocationAutoDetect] Failed, trying fallback...');
        try {
          // Fallback for non-HTTPS environments only.
          if (window.location.protocol === 'https:') return;

          const res2 = await fetch('http://ip-api.com/json/?fields=city,regionName,country,countryCode,timezone,lat,lon,isp', {
            signal: AbortSignal.timeout(5000),
          });
          if (res2.ok) {
            const raw2 = await res2.json();
            const loc: IPLocationData = {
              city: raw2.city || '',
              region: raw2.regionName || '',
              country: raw2.country || '',
              countryCode: raw2.countryCode || '',
              timezone: raw2.timezone || '',
              lat: raw2.lat || 0,
              lon: raw2.lon || 0,
              isp: raw2.isp || '',
            };
            cachedLocation = loc;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
            console.log(`[LocationAutoDetect] 📍 Fallback: ${loc.city}, ${loc.region}, ${loc.country}`);
            await feedToAdaptiveLearning(user.id, loc);
            await updateProfileLocation(user.id, loc);
            await trackLoginEvent(user.id, loc);
          }
        } catch {}
      }
    };

    // Small delay to avoid blocking initial render while still beating greeting checks.
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
  }, [user?.id]);

  return { getDetectedLocation: () => cachedLocation };
}

// ═══ Feed location into Adaptive Learning Engine ═══
async function feedToAdaptiveLearning(userId: string, loc: IPLocationData) {
  try {
    const locationStr = [loc.city, loc.region, loc.country].filter(Boolean).join(', ');

    // Store current location
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'location',
      pattern_key: 'current_location',
      pattern_value: locationStr,
      confidence_score: 1.0,
      usage_count: 1,
      source: 'ip_detection',
    }, { onConflict: 'user_id,pattern_key' });

    // Store country
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'location',
      pattern_key: 'country',
      pattern_value: loc.country,
      confidence_score: 1.0,
      usage_count: 1,
      source: 'ip_detection',
    }, { onConflict: 'user_id,pattern_key' });

    // Store country code (used by festival engine)
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'location',
      pattern_key: 'country_code',
      pattern_value: loc.countryCode,
      confidence_score: 1.0,
      usage_count: 1,
      source: 'ip_detection',
    }, { onConflict: 'user_id,pattern_key' });

    // Store region/state
    if (loc.region) {
      await supabase.from('zoe_adaptive_learning').upsert({
        user_id: userId,
        pattern_type: 'location',
        pattern_key: 'region',
        pattern_value: loc.region,
        confidence_score: 1.0,
        usage_count: 1,
        source: 'ip_detection',
      }, { onConflict: 'user_id,pattern_key' });
    }

    // Store city
    if (loc.city) {
      await supabase.from('zoe_adaptive_learning').upsert({
        user_id: userId,
        pattern_type: 'location',
        pattern_key: 'city',
        pattern_value: loc.city,
        confidence_score: 1.0,
        usage_count: 1,
        source: 'ip_detection',
      }, { onConflict: 'user_id,pattern_key' });
    }

    // Store timezone
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'routine',
      pattern_key: 'timezone',
      pattern_value: loc.timezone,
      confidence_score: 1.0,
      usage_count: 1,
      source: 'ip_detection',
    }, { onConflict: 'user_id,pattern_key' });

    // Track login time pattern
    const hour = new Date().getHours();
    const timeSlot = hour < 6 ? 'night_owl' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'routine',
      pattern_key: 'login_time_preference',
      pattern_value: timeSlot,
      confidence_score: 0.7,
      usage_count: 1,
      source: 'auto_detected',
    }, { onConflict: 'user_id,pattern_key' });

    // Track device type
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    await supabase.from('zoe_adaptive_learning').upsert({
      user_id: userId,
      pattern_type: 'routine',
      pattern_key: 'primary_device',
      pattern_value: deviceType,
      confidence_score: 0.6,
      usage_count: 1,
      source: 'auto_detected',
    }, { onConflict: 'user_id,pattern_key' });

  } catch (e) {
    console.error('[LocationAutoDetect] Adaptive learning feed error:', e);
  }
}

// ═══ Update profile location if empty ═══
async function updateProfileLocation(userId: string, loc: IPLocationData) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('location')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile || !(profile as any).location) {
      const locationStr = [loc.city, loc.region].filter(Boolean).join(', ');
      await supabase
        .from('profiles')
        .update({ location: locationStr } as any)
        .eq('user_id', userId);
      console.log('[LocationAutoDetect] Profile location updated:', locationStr);
    }
  } catch (e) {
    // Silent fail - non-critical
  }
}

// ═══ Track login event for pattern analysis ═══
async function trackLoginEvent(userId: string, loc: IPLocationData) {
  try {
    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: 'login',
      event_category: 'session',
      context_snippet: `${loc.city}, ${loc.country}`,
      metadata: {
        city: loc.city,
        region: loc.region,
        country: loc.country,
        country_code: loc.countryCode,
        timezone: loc.timezone,
        device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        hour: new Date().getHours(),
        day_of_week: new Date().getDay(),
        user_agent_hash: navigator.userAgent.length.toString(),
      },
    });
  } catch (e) {
    // Silent fail
  }
}

// Export for use by festival engine
export function getDetectedLocationSync(): IPLocationData | null {
  if (cachedLocation) return cachedLocation;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      cachedLocation = JSON.parse(stored);
      return cachedLocation;
    }
  } catch {}
  return null;
}
