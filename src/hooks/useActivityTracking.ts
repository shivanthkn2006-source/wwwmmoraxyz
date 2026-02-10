import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SessionData {
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  deviceVendor?: string;
  deviceModel?: string;
  os?: string;
  osVersion?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

// Session storage key for persistence across page reloads
const SESSION_STORAGE_KEY = 'mmora_activity_session';

interface StoredSession {
  token: string;
  id: string;
  userId: string;
  createdAt: number;
}

export const useActivityTracking = () => {
  const { user } = useAuth();
  const location = useLocation();
  const sessionTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pageEnterTimeRef = useRef<number>(Date.now());
  const currentPageRef = useRef<string>(location.pathname);
  const isInitializedRef = useRef(false);
  const lastTrackedPageRef = useRef<string | null>(null);

  // Restore session from storage on mount
  useEffect(() => {
    if (!user) return;
    
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const session: StoredSession = JSON.parse(stored);
        // Only restore if same user and session is less than 30 minutes old
        const isValid = session.userId === user.id && 
                       (Date.now() - session.createdAt) < 30 * 60 * 1000;
        if (isValid) {
          sessionTokenRef.current = session.token;
          sessionIdRef.current = session.id;
          console.log('[ActivityTracking] Restored existing session:', session.id);
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('[ActivityTracking] Failed to restore session:', e);
    }
  }, [user]);

  const getDeviceInfo = useCallback((): Partial<SessionData> => {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let os = 'Unknown';
    let browser = 'Unknown';
    let browserVersion = '';
    let osVersion = '';
    
    // Detect device type
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/.test(ua)) {
      deviceType = 'tablet';
    }
    
    // Detect OS with version
    if (/Windows NT 10/.test(ua)) { os = 'Windows'; osVersion = '10'; }
    else if (/Windows NT 11/.test(ua)) { os = 'Windows'; osVersion = '11'; }
    else if (/Windows/.test(ua)) { os = 'Windows'; }
    else if (/Mac OS X ([\d._]+)/.test(ua)) { 
      os = 'MacOS'; 
      const match = ua.match(/Mac OS X ([\d._]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    }
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android ([\d.]+)/.test(ua)) { 
      os = 'Android'; 
      const match = ua.match(/Android ([\d.]+)/);
      osVersion = match ? match[1] : '';
    }
    else if (/iOS|iPhone|iPad/.test(ua)) { 
      os = 'iOS';
      const match = ua.match(/OS ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    }
    
    // Detect browser with version
    if (/Chrome\/([\d.]+)/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }
    else if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) {
      browser = 'Safari';
      const match = ua.match(/Version\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }
    else if (/Firefox\/([\d.]+)/.test(ua)) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }
    else if (/Edg\/([\d.]+)/.test(ua)) {
      browser = 'Edge';
      const match = ua.match(/Edg\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }
    
    return {
      userAgent: ua,
      browser,
      browserVersion,
      deviceType,
      os,
      osVersion,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }, []);

  const getLocationInfo = useCallback(async (): Promise<Partial<SessionData>> => {
    try {
      // Use a more reliable IP geolocation service with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn('[ActivityTracking] IP geolocation failed:', response.status);
        return {};
      }
      
      const data = await response.json();
      
      return {
        ipAddress: data.ip,
        country: data.country_name,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } catch (error) {
      console.warn('[ActivityTracking] Failed to get location:', error);
      return {};
    }
  }, []);

  const trackActivity = useCallback(async (
    activityType: 'session_start' | 'session_end' | 'page_view' | 'page_exit' | 'user_action',
    data?: any
  ) => {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        return;
      }

      const { data: response, error } = await supabase.functions.invoke('track-activity', {
        body: {
          activityType,
          sessionData: sessionTokenRef.current ? {
            sessionToken: sessionTokenRef.current,
            ...data?.sessionData,
          } : undefined,
          pageData: data?.pageData,
          activityDetails: data?.activityDetails,
        },
      });

      if (error) {
        if (error.message?.includes('Auth') || error.message?.includes('session')) {
          return;
        }
        throw error;
      }
      return response;
    } catch (error: any) {
      if (error?.message?.includes('Auth') || error?.message?.includes('session')) {
        return;
      }
      console.warn('[ActivityTracking] Error:', error);
    }
  }, [user]);

  // Use sendBeacon for reliable exit tracking
  const trackExitWithBeacon = useCallback((sessionToken: string, pagePath: string, durationSeconds: number) => {
    if (!sessionToken) return;
    
    const payload = JSON.stringify({
      activityType: 'page_exit',
      sessionData: { sessionToken },
      pageData: {
        sessionId: sessionIdRef.current,
        pagePath,
        durationSeconds,
      },
    });
    
    // sendBeacon is more reliable for unload events
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-activity`;
    const blob = new Blob([payload], { type: 'application/json' });
    
    // Note: sendBeacon doesn't support custom headers, so this is best-effort
    // The edge function handles missing auth gracefully
    navigator.sendBeacon(url, blob);
  }, []);

  const startSession = useCallback(async () => {
    if (!user) return;
    
    // Check if we already have a valid session
    if (sessionTokenRef.current && sessionIdRef.current) {
      console.log('[ActivityTracking] Session already exists, skipping creation');
      return;
    }

    const sessionToken = `session_${user.id}_${Date.now()}`;
    sessionTokenRef.current = sessionToken;

    const deviceInfo = getDeviceInfo();
    const locationInfo = await getLocationInfo();

    const response = await trackActivity('session_start', {
      sessionData: {
        sessionToken,
        ...deviceInfo,
        ...locationInfo,
      },
    });

    if (response?.data?.id) {
      sessionIdRef.current = response.data.id;
      
      // Store session for persistence
      const storedSession: StoredSession = {
        token: sessionToken,
        id: response.data.id,
        userId: user.id,
        createdAt: Date.now(),
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));
      
      console.log('[ActivityTracking] New session created:', response.data.id);
    }
  }, [user, getDeviceInfo, getLocationInfo, trackActivity]);

  const endSession = useCallback(async () => {
    if (!sessionTokenRef.current) return;

    await trackActivity('session_end', {
      sessionData: { sessionToken: sessionTokenRef.current },
    });

    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionTokenRef.current = null;
    sessionIdRef.current = null;
  }, [trackActivity]);

  const trackPageView = useCallback(async (pagePath: string, pageTitle?: string) => {
    if (!user || !sessionIdRef.current) return;
    
    // Prevent duplicate tracking of same page
    if (lastTrackedPageRef.current === pagePath) {
      return;
    }
    lastTrackedPageRef.current = pagePath;

    await trackActivity('page_view', {
      pageData: {
        sessionId: sessionIdRef.current,
        pagePath,
        pageTitle: pageTitle || document.title,
        referrer: document.referrer,
      },
    });

    pageEnterTimeRef.current = Date.now();
    currentPageRef.current = pagePath;
  }, [user, trackActivity]);

  const trackPageExit = useCallback(async () => {
    if (!user || !sessionIdRef.current || !currentPageRef.current) return;

    const durationSeconds = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);
    
    // Reset last tracked page so we can track it again if user returns
    lastTrackedPageRef.current = null;

    await trackActivity('page_exit', {
      pageData: {
        sessionId: sessionIdRef.current,
        pagePath: currentPageRef.current,
        durationSeconds,
      },
    });
  }, [user, trackActivity]);

  const trackUserAction = useCallback(async (actionType: string, details?: any) => {
    if (!user) return;

    await trackActivity('user_action', {
      activityDetails: {
        type: actionType,
        ...details,
      },
      pageData: {
        pagePath: location.pathname,
      },
    });
  }, [user, location.pathname, trackActivity]);

  // Initialize session once
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      isInitializedRef.current = true;
      startSession();
    }

    return () => {
      // Don't end session on unmount - let beforeunload handle it
    };
  }, [user, startSession]);

  // Track page views on route change
  useEffect(() => {
    if (user && sessionIdRef.current) {
      // Track exit from previous page if different
      if (currentPageRef.current !== location.pathname && lastTrackedPageRef.current) {
        trackPageExit();
      }

      // Track new page view
      trackPageView(location.pathname);
    }
  }, [location.pathname, user, trackPageView, trackPageExit]);

  // Handle page unload with sendBeacon for reliability
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!sessionTokenRef.current || !currentPageRef.current) return;
      
      const durationSeconds = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);
      
      // Use sendBeacon for reliable delivery during unload
      trackExitWithBeacon(sessionTokenRef.current, currentPageRef.current, durationSeconds);
      
      // Also try to end session
      const sessionPayload = JSON.stringify({
        activityType: 'session_end',
        sessionData: { sessionToken: sessionTokenRef.current },
      });
      
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-activity`;
      const blob = new Blob([sessionPayload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      
      // Clear session storage
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackExitWithBeacon]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page going hidden - track exit
        if (sessionTokenRef.current && currentPageRef.current) {
          const durationSeconds = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);
          trackExitWithBeacon(sessionTokenRef.current, currentPageRef.current, durationSeconds);
        }
      } else if (user && sessionIdRef.current) {
        // Page visible again - track new view
        lastTrackedPageRef.current = null; // Allow re-tracking
        pageEnterTimeRef.current = Date.now();
        trackPageView(location.pathname);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, location.pathname, trackPageView, trackExitWithBeacon]);

  return {
    trackUserAction,
    sessionToken: sessionTokenRef.current,
    sessionId: sessionIdRef.current,
  };
};
