// ═══════════════════════════════════════════════════════════════════════════════
// SESSION HEARTBEAT - Maintains online presence for Sovereign Control
// Updates every 30 seconds to track active users
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionHeartbeatOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export const useSessionHeartbeat = (options: UseSessionHeartbeatOptions = {}) => {
  const { enabled = true, intervalMs = 30000 } = options;
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create or update session
  const heartbeat = useCallback(async (status: 'active' | 'idle' = 'active') => {
    if (!user) return;

    try {
      if (sessionIdRef.current) {
        // Update existing session
        await supabase
          .from('online_sessions')
          .update({
            status,
            last_heartbeat: new Date().toISOString(),
          })
          .eq('id', sessionIdRef.current);
      } else {
        // Create new session
        const { data } = await supabase
          .from('online_sessions')
          .insert({
            user_id: user.id,
            status,
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
            },
          })
          .select('id')
          .single();

        if (data) {
          sessionIdRef.current = data.id;
        }
      }
    } catch (err) {
      console.error('[SessionHeartbeat] Error:', err);
    }
  }, [user]);

  // End session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('online_sessions')
        .update({ status: 'offline' })
        .eq('id', sessionIdRef.current);
    } catch (err) {
      console.error('[SessionHeartbeat] End session error:', err);
    }
  }, []);

  // Set up heartbeat interval
  useEffect(() => {
    if (!enabled || !user) return;

    // Initial heartbeat
    heartbeat('active');

    // Set up interval
    intervalRef.current = setInterval(() => {
      heartbeat('active');
    }, intervalMs);

    // Track visibility for idle status
    const handleVisibilityChange = () => {
      heartbeat(document.hidden ? 'idle' : 'active');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [enabled, user, heartbeat, endSession, intervalMs]);

  return { heartbeat, endSession };
};

export default useSessionHeartbeat;
