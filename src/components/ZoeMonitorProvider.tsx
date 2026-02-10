// ═══════════════════════════════════════════════════════════════════════════════
// ZOE MONITOR PROVIDER - Phase 3: "SysAdmin Zoe" Global Error Boundary Integration
// Wraps the app and connects error boundary to Zoe Core monitoring
// ═══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoeMonitorContextType {
  captureError: (error: Error, componentStack?: string, isRecoverable?: boolean) => Promise<void>;
  logRecovery: (fromScreen: string) => Promise<void>;
  sessionId: string;
  isVRScreen: () => boolean;
  getScreenName: (path: string) => string;
}

interface CrashLogEntry {
  user_id: string | null;
  log_type: 'crash' | 'warning' | 'recovery' | 'auto_heal';
  screen_name: string | null;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_heal_attempted: boolean;
  auto_heal_success: boolean | null;
  auto_heal_action: string | null;
  device_info: Record<string, unknown>;
  session_id: string | null;
  url_path: string;
  metadata?: Record<string, unknown>;
  timestamp?: string; // ISO string format for database compatibility
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ZoeMonitorContext = createContext<ZoeMonitorContextType | null>(null);

export const useZoeMonitorContext = () => {
  const context = useContext(ZoeMonitorContext);
  if (!context) {
    // Return safe defaults when not in provider
    return {
      captureError: async () => {},
      logRecovery: async () => {},
      sessionId: 'unknown',
      isVRScreen: () => false,
      getScreenName: () => 'Unknown',
    };
  }
  return context;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_USERNAMES = ['saraswathi', 'moksh50'];
const VR_FALLBACK_PATH = '/selfie-city';

// ─── Utility Functions ────────────────────────────────────────────────────────

const generateSessionId = (): string => 
  `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const getDeviceInfo = (): Record<string, unknown> => {
  const connection = (navigator as any).connection;
  const memory = (performance as any).memory;
  
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    connectionType: connection?.effectiveType || 'unknown',
    memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
    memoryLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1048576) : null,
  };
};

const isVRScreen = (): boolean => {
  const path = window.location.pathname;
  return path.includes('/vr') || path.includes('/3d') || path.includes('/globe') || path.includes('/world');
};

const getScreenName = (path: string): string => {
  const screenMap: Record<string, string> = {
    '/vr': 'VR World',
    '/3d': '3D View',
    '/globe': 'Selfie Globe',
    '/world': 'World Map',
    '/home': 'Home',
    '/chat': 'Chat',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/selfie-city': 'Selfie City',
    '/huddle': 'Huddle Map',
  };
  
  for (const [key, name] of Object.entries(screenMap)) {
    if (path.includes(key)) return name;
  }
  return path || 'Unknown Screen';
};

// ─── Provider Component ───────────────────────────────────────────────────────

interface ZoeMonitorProviderProps {
  children: React.ReactNode;
}

export const ZoeMonitorProvider: React.FC<ZoeMonitorProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(generateSessionId());
  const errorCountRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number>(0);

  // Log crash to system_health_logs table
  const logCrash = useCallback(async (entry: Omit<CrashLogEntry, 'device_info' | 'session_id' | 'url_path' | 'timestamp'>) => {
    try {
      const crashLog: CrashLogEntry = {
        ...entry,
        device_info: getDeviceInfo(),
        session_id: sessionIdRef.current,
        url_path: window.location.pathname,
        timestamp: new Date().toISOString(), // Always use ISO string for database
      };

      const { error } = await supabase
        .from('system_health_logs')
        .insert([crashLog] as any);

      if (error) {
        console.error('[ZoeMonitor] Failed to log crash:', error);
        // Fallback: store in localStorage for later sync (use ISO string)
        const pendingLogs = JSON.parse(localStorage.getItem('zoe_pending_crash_logs') || '[]');
        pendingLogs.push({ ...crashLog, timestamp: new Date().toISOString() });
        localStorage.setItem('zoe_pending_crash_logs', JSON.stringify(pendingLogs.slice(-10)));
      } else {
        console.log('[ZoeMonitor] Crash logged:', entry.log_type, entry.severity);
      }

      return !error;
    } catch (e) {
      console.error('[ZoeMonitor] Crash logging failed:', e);
      return false;
    }
  }, []);

  // Send "Zoe Whisper" notification to admin (Saraswathi)
  const notifyAdmin = useCallback(async (
    errorMessage: string,
    screenName: string,
    severity: 'high' | 'critical',
    userId?: string
  ) => {
    try {
      // Get admin user IDs
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, username')
        .or(ADMIN_USERNAMES.map(u => `username.ilike.${u}`).join(','));

      if (!admins || admins.length === 0) {
        console.log('[ZoeMonitor] No admins found for notification');
        return;
      }

      // Get username of crashed user
      let crashedUsername = 'Unknown User';
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();
        crashedUsername = profile?.username || 'Unknown User';
      }

      // Create notification for each admin
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        from_user_id: userId || admin.id,
        type: 'system_alert',
        priority: severity === 'critical' ? 5 : 4,
        read: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        context_data: {
          title: `🚨 Zoe Sentry Alert: ${severity.toUpperCase()}`,
          message: `Alert: User @${crashedUsername} just crashed on the ${screenName}. Error: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`,
          crash_type: 'zoe_sentry',
          crashed_user_id: userId,
          crashed_username: crashedUsername,
          screen_name: screenName,
          severity,
          timestamp: new Date().toISOString(),
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications as any);

      if (error) {
        console.error('[ZoeMonitor] Failed to notify admin:', error);
      } else {
        console.log('[ZoeMonitor] Admin notified via Zoe Whisper:', admins.map(a => a.username).join(', '));
      }
    } catch (e) {
      console.error('[ZoeMonitor] Admin notification failed:', e);
    }
  }, []);

  // Auto-heal: Redirect VR crashes to Lite 2D Map
  const autoHealVRCrash = useCallback((): boolean => {
    if (isVRScreen()) {
      console.log('[ZoeMonitor] VR crash detected - auto-healing to Lite 2D Map');
      
      toast.warning('VR World recovery', {
        description: 'Switching to Lite 2D Map for stability...',
        duration: 3000,
      });

      // Clear problematic state
      try {
        sessionStorage.removeItem('vr_state');
        sessionStorage.removeItem('globe_state');
        localStorage.removeItem('vr_cache');
      } catch (e) {
        // Ignore storage errors
      }

      // Redirect after brief delay
      setTimeout(() => {
        window.location.href = VR_FALLBACK_PATH;
      }, 1500);

      return true;
    }
    
    return false;
  }, []);

  // Main error capture function
  const captureError = useCallback(async (
    error: Error,
    componentStack?: string,
    isRecoverable: boolean = false
  ) => {
    const now = Date.now();
    const screenName = getScreenName(window.location.pathname);
    
    // Rate limiting: max 5 errors per minute
    if (now - lastErrorTimeRef.current < 60000) {
      errorCountRef.current++;
      if (errorCountRef.current > 5) {
        console.warn('[ZoeMonitor] Error rate limit exceeded, skipping log');
        return;
      }
    } else {
      errorCountRef.current = 1;
      lastErrorTimeRef.current = now;
    }

    // Determine severity
    const severity: 'low' | 'medium' | 'high' | 'critical' = 
      error.message.includes('Out of Memory') || error.message.includes('memory') ? 'critical' :
      error.message.includes('ChunkLoadError') ? 'medium' :
      isVRScreen() ? 'high' :
      isRecoverable ? 'medium' : 'critical';

    // Attempt auto-heal for VR crashes
    let autoHealSuccess: boolean | null = null;
    let autoHealAction: string | null = null;
    
    if (severity === 'critical' || severity === 'high') {
      const healed = autoHealVRCrash();
      if (healed) {
        autoHealSuccess = true;
        autoHealAction = 'Redirected to Lite 2D Map';
      }
    }

    // Log the crash
    await logCrash({
      user_id: user?.id || null,
      log_type: autoHealSuccess ? 'auto_heal' : 'crash',
      screen_name: screenName,
      error_message: error.message || 'Unknown error',
      error_stack: error.stack || null,
      component_stack: componentStack || null,
      severity,
      auto_heal_attempted: autoHealSuccess !== null,
      auto_heal_success: autoHealSuccess,
      auto_heal_action: autoHealAction,
      metadata: {
        errorName: error.name,
        isRecoverable,
        errorCount: errorCountRef.current,
      }
    });

    // Notify admin for critical/high severity crashes
    if ((severity === 'critical' || severity === 'high') && !autoHealSuccess) {
      await notifyAdmin(error.message, screenName, severity, user?.id);
    }

    console.log(`[ZoeMonitor] Captured ${severity} error on ${screenName}:`, error.message);
  }, [user?.id, logCrash, notifyAdmin, autoHealVRCrash]);

  // Log recovery
  const logRecovery = useCallback(async (fromScreen: string) => {
    await logCrash({
      user_id: user?.id || null,
      log_type: 'recovery',
      screen_name: getScreenName(window.location.pathname),
      error_message: `User recovered from ${fromScreen}`,
      error_stack: null,
      component_stack: null,
      severity: 'low',
      auto_heal_attempted: false,
      auto_heal_success: null,
      auto_heal_action: null,
      metadata: { recoveredFrom: fromScreen }
    });
  }, [user?.id, logCrash]);

  // Sync pending crash logs from localStorage
  const syncPendingLogs = useCallback(async () => {
    try {
      const pendingLogs = JSON.parse(localStorage.getItem('zoe_pending_crash_logs') || '[]');
      if (pendingLogs.length === 0) return;

      // Ensure all timestamps are ISO strings (fix legacy Unix millisecond timestamps)
      const sanitizedLogs = pendingLogs.map((log: any) => ({
        ...log,
        timestamp: typeof log.timestamp === 'number' 
          ? new Date(log.timestamp).toISOString() 
          : log.timestamp || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('system_health_logs')
        .insert(sanitizedLogs as any);

      if (!error) {
        localStorage.removeItem('zoe_pending_crash_logs');
        console.log('[ZoeMonitor] Synced', pendingLogs.length, 'pending crash logs');
      }
    } catch (e) {
      // Silent fail for sync
    }
  }, []);

  // Setup global error handlers
  useEffect(() => {
    // Track if we've already processed an error in this cycle to prevent loops
    let processingError = false;
    
    const handleGlobalError = (event: ErrorEvent) => {
      // Prevent recursive error handling loops
      if (processingError) return;
      
      // Skip errors from the monitor itself to prevent infinite loops
      if (event.message?.includes('ZoeMonitor') || event.filename?.includes('ZoeMonitorProvider')) {
        return;
      }
      
      processingError = true;
      try {
        captureError(event.error || new Error(event.message), undefined, false);
      } finally {
        // Reset after a small delay to allow batch processing
        setTimeout(() => { processingError = false; }, 100);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent recursive error handling loops
      if (processingError) return;
      
      const errorMessage = String(event.reason);
      // Skip errors from the monitor itself
      if (errorMessage.includes('ZoeMonitor')) {
        return;
      }
      
      processingError = true;
      try {
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(errorMessage);
        captureError(error, undefined, false);
      } finally {
        setTimeout(() => { processingError = false; }, 100);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Sync any pending logs on mount
    syncPendingLogs();

    console.log('[ZoeMonitor] Sentry Agent activated - Session:', sessionIdRef.current);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [captureError, syncPendingLogs]);

  const contextValue: ZoeMonitorContextType = {
    captureError,
    logRecovery,
    sessionId: sessionIdRef.current,
    isVRScreen,
    getScreenName,
  };

  return (
    <ZoeMonitorContext.Provider value={contextValue}>
      {children}
    </ZoeMonitorContext.Provider>
  );
};

export default ZoeMonitorProvider;
