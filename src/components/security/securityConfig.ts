// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CONFIG - Centralized Configuration for Black Box Protocol
// Single source of truth for security settings across all layers
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// Root administrators who bypass all security restrictions
// NOTE: Lowercased for case-insensitive matching.
export const ROOT_ADMINS = ['moksh50', 'justmkbhd', 'john', 'shivanth_kn'] as const;

// Admin contact info for alerts
export const ADMIN_PHONES = ['+917306879505', '+919840829217'] as const;

// Security event types for DHF logging
export const SECURITY_EVENTS = {
  // Layer 0 - Quantum Gatekeeper
  ADMIN_ACCESS_GRANTED: 'admin_access_granted',
  INVITE_TOKEN_USED: 'invite_token_used',
  ACCESS_DENIED: 'access_denied',
  INVITE_CODE_REVOKED: 'invite_code_revoked',
  
  // Layer 1 - VoidShell
  INTRUSION_ATTEMPT: 'intrusion_attempt',
  CONTEXT_MENU_BLOCKED: 'context_menu_blocked',
  KEYBOARD_SHORTCUT_BLOCKED: 'keyboard_shortcut_blocked',
  COPY_BLOCKED: 'copy_blocked',
  
  // Layer 2 - DevTools Trap
  DEVTOOLS_INTRUSION: 'devtools_intrusion',
  SCORCHED_EARTH_ACTIVATED: 'scorched_earth_activated',
  
  // Layer 3 - Fortress Protocol
  SCREEN_BLACKOUT: 'screen_blackout',
  CAMERA_VIOLATION: 'camera_violation',
  PHONE_DETECTED: 'phone_detected',
  USER_ABSENT: 'user_absent',
  SESSION_TERMINATED: 'session_terminated',
  
  // General Security
  SECURITY_SHELL_ACTIVATED: 'security_shell_activated',
  ADMIN_ALERT_SENT: 'admin_alert_sent',
  USER_BANNED: 'user_banned',
  SESSION_HEARTBEAT: 'session_heartbeat',
} as const;

// Security event categories
export const SECURITY_CATEGORIES = {
  ACCESS: 'security_access',
  VIOLATION: 'security_violation',
  INITIALIZATION: 'security_initialization',
  NOTIFICATION: 'security_notification',
} as const;

// Routes that bypass security (public access)
export const PUBLIC_ROUTES = [
  '/auth',
  '/password-recovery',
  '/access-denied',
  '/about',
] as const;

// Check if a username is a root admin (case-insensitive)
export const isRootAdmin = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const normalized = username.toLowerCase();
  return ROOT_ADMINS.includes(normalized as typeof ROOT_ADMINS[number]);
};

// Check if current user is a root admin via server-side edge function
// This is the PREFERRED method - validates roles server-side
export const checkRootAdminStatusServerSide = async (): Promise<{ isAdmin: boolean }> => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-check');
    if (error || !data) {
      return { isAdmin: false };
    }
    return { isAdmin: data.isAdmin === true };
  } catch (e) {
    console.error('[SecurityConfig] Server-side admin check failed:', e);
    return { isAdmin: false };
  }
};

// Legacy client-side check (kept for backward compatibility, but prefer server-side)
export const checkRootAdminStatus = async (userId: string): Promise<{ isAdmin: boolean; username: string | null }> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error || !profile) {
      return { isAdmin: false, username: null };
    }
    
    return {
      isAdmin: isRootAdmin(profile.username),
      username: profile.username
    };
  } catch (e) {
    console.error('[SecurityConfig] Failed to check admin status:', e);
    return { isAdmin: false, username: null };
  }
};

// Log security event to DHF behavioral_events table
export const logSecurityEvent = async (
  userId: string,
  eventType: string,
  category: string,
  details: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: eventType,
      event_category: category,
      context_snippet: details,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      },
      dhf_logged: true,
      ecn_processed: false,
    });
  } catch (e) {
    console.error('[SecurityConfig] Failed to log event:', e);
  }
};

// Notify admin users of security events
export const notifyAdmins = async (
  fromUserId: string,
  alertType: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
): Promise<void> => {
  try {
    // Get admin user IDs
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('username', [...ROOT_ADMINS]);
    
    if (adminProfiles && adminProfiles.length > 0) {
      const notifications = adminProfiles.map(admin => ({
        user_id: admin.user_id,
        type: 'security_alert',
        from_user_id: fromUserId,
        priority: severity === 'critical' ? 10 : severity === 'high' ? 8 : severity === 'medium' ? 5 : 2,
        context_data: {
          alert_type: alertType,
          intruder_id: fromUserId,
          timestamp: new Date().toISOString(),
          severity,
        },
      }));
      
      await supabase.from('notifications').insert(notifications);
      console.log('[SecurityConfig] Admin notifications sent');
    }
  } catch (e) {
    console.error('[SecurityConfig] Failed to notify admins:', e);
  }
};

export default {
  ROOT_ADMINS,
  ADMIN_PHONES,
  SECURITY_EVENTS,
  SECURITY_CATEGORIES,
  PUBLIC_ROUTES,
  isRootAdmin,
  checkRootAdminStatus,
  logSecurityEvent,
  notifyAdmins,
};
