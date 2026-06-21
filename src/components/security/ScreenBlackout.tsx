// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN BLACKOUT - PrintScreen & Visibility Detection
// Blacks out screen on suspected screenshot attempts
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useDevMode } from './DevModeContext';
import { logSecurityEvent, SECURITY_EVENTS, SECURITY_CATEGORIES } from './securityConfig';
import { supabase } from '@/integrations/supabase/client';

interface ScreenBlackoutProps {
  enabled?: boolean;
  children: React.ReactNode;
}

export const ScreenBlackout: React.FC<ScreenBlackoutProps> = ({ enabled = true, children }) => {
  const { user } = useAuth();
  const { isAdmin, isDevMode, securityEnabled, simulateUserView } = useDevMode();
  const [isBlacked, setIsBlacked] = useState(false);
  const [blurScreen, setBlurScreen] = useState(false);

  const shouldBypass = isAdmin && (isDevMode || !securityEnabled) && !simulateUserView;

  const logBreach = useCallback(async (type: string, details: string) => {
    if (!user) return;
    
    // Log to behavioral_events
    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.INTRUSION_ATTEMPT,
      SECURITY_CATEGORIES.VIOLATION,
      `${type}: ${details}`,
      { breach_type: type }
    );

    // Log to security_breaches table
    try {
      await supabase.from('security_breaches').insert({
        user_id: user.id,
        breach_type: type,
        severity: 'high',
        details,
        action_taken: 'screen_blackout',
      });
    } catch (e) {
      console.error('[ScreenBlackout] Failed to log breach:', e);
    }
  }, [user]);

  // Handle PrintScreen key detection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || shouldBypass) return;

    // Detect PrintScreen (different browsers report this differently)
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      e.preventDefault();
      setIsBlacked(true);
      logBreach('printscreen', 'PrintScreen key detected - screen blacked out');
      
      setTimeout(() => setIsBlacked(false), 3000);
    }
  }, [enabled, shouldBypass, logBreach]);

  // Handle visibility change (user switches tabs - might be saving screenshot)
  const handleVisibilityChange = useCallback(() => {
    if (!enabled || shouldBypass) return;

    if (document.hidden) {
      // User switched away - blur the content
      setBlurScreen(true);
    } else {
      // User returned
      setTimeout(() => setBlurScreen(false), 500);
    }
  }, [enabled, shouldBypass]);

  useEffect(() => {
    if (!enabled || shouldBypass) return;

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, shouldBypass, handleKeyDown, handleVisibilityChange]);

  return (
    <>
      {/* Content with optional blur */}
      <div className={blurScreen && !shouldBypass ? 'filter blur-lg transition-all duration-300' : ''}>
        {children}
      </div>

      {/* Full screen blackout on PrintScreen */}
      {isBlacked && !shouldBypass && (
        <div className="fixed inset-0 bg-black z-[99999] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🔒</div>
            <p className="text-red-500 text-xl font-bold">SCREENSHOT BLOCKED</p>
            <p className="text-red-400 text-sm mt-2">Security violation logged</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenBlackout;
