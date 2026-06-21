// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW BAN PROVIDER - Black Box Protocol Layer 4
// Wraps app to check shadow ban status and render fake app for banned users
// Integrated with Zoe DHF Core for behavioral analysis
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ShadowBanProviderProps {
  children: React.ReactNode;
}

export const ShadowBanProvider: React.FC<ShadowBanProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isShadowBanned, setIsShadowBanned] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [fakeLoadingPhase, setFakeLoadingPhase] = useState(0);

  const checkShadowBanStatus = useCallback(async () => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('shadow_ban_status')
        .select('is_shadow_banned')
        .eq('user_id', user.id)
        .maybeSingle();

      const banned = data?.is_shadow_banned || false;
      setIsShadowBanned(banned);

      // Log shadow ban check to DHF
      if (banned) {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'shadow_ban_served',
          event_category: 'security_enforcement',
          context_snippet: 'User served shadow banned experience',
          metadata: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          },
          dhf_logged: true,
          ecn_processed: false
        });
        console.log('[ShadowBan] 🚫 Shadow ban ACTIVE for user');
      }
    } catch {
      setIsShadowBanned(false);
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  useEffect(() => {
    checkShadowBanStatus();
  }, [checkShadowBanStatus]);

  // Fake loading phases for shadow banned users
  useEffect(() => {
    if (!isShadowBanned) return;

    const phases = [
      { delay: 3000, phase: 1 },
      { delay: 6000, phase: 2 },
      { delay: 10000, phase: 3 },
    ];

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setFakeLoadingPhase(phase), delay);
    });
  }, [isShadowBanned]);

  if (isChecking) return null;

  // Shadow banned users see infinite loading with fake progress
  if (isShadowBanned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {fakeLoadingPhase === 0 && 'Loading your experience...'}
            {fakeLoadingPhase === 1 && 'Syncing data...'}
            {fakeLoadingPhase === 2 && 'Almost ready...'}
            {fakeLoadingPhase === 3 && 'Finalizing...'}
          </p>
          {fakeLoadingPhase >= 2 && (
            <p className="text-xs text-muted-foreground/50">
              This may take a moment
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ShadowBanProvider;
