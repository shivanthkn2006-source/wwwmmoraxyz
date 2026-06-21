/**
 * DHF HEARTBEAT PULSE - Invisible background component
 * Sends "I am alive" signal on every app open.
 * If no heartbeat in 24h → system lockdown.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes while app is open

export const DHFHeartbeatPulse: React.FC = () => {
  const sentRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('dhf_heartbeats').insert({
          user_id: user.id,
          device_signature: navigator.userAgent.substring(0, 100),
          app_version: '1.0.0',
          metadata: {
            screen: `${screen.width}x${screen.height}`,
            online: navigator.onLine,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (e) {
        // Silent fail — heartbeat is non-blocking
        console.debug('[DHFHeartbeat] Pulse failed (offline?):', e);
      }
    };

    // Send immediately on mount
    if (!sentRef.current) {
      sentRef.current = true;
      sendHeartbeat();
    }

    // Repeat every 5 minutes while app is open
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Invisible — no UI
  return null;
};

export default DHFHeartbeatPulse;
