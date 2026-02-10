// ═══════════════════════════════════════════════════════════════════════════════
// HARVEST INTEGRATION - Connects Background Harvest to App
// Silently initializes on app load, UI invisible to all users
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useBackgroundHarvest } from '@/hooks/useBackgroundHarvest';

/**
 * HarvestIntegration - Silent component that starts background data collection
 * No UI - renders nothing
 */
export const HarvestIntegration: React.FC = () => {
  const { user } = useAuth();
  const { trackKeystroke, trackBehavior, isActive } = useBackgroundHarvest();

  // Track scroll depth
  useEffect(() => {
    if (!user) return;

    let maxScrollDepth = 0;
    const handleScroll = () => {
      const scrollDepth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        if (scrollDepth > 0.5 && scrollDepth <= 0.51) {
          trackBehavior('scroll_depth', 0.5, 'mid_page');
        } else if (scrollDepth > 0.9 && scrollDepth <= 0.91) {
          trackBehavior('scroll_depth', 0.9, 'near_bottom');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, trackBehavior]);

  // Track keystroke patterns globally
  useEffect(() => {
    if (!user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCorrection = e.key === 'Backspace' || e.key === 'Delete';
      trackKeystroke(e.key, isCorrection);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, trackKeystroke]);

  // Track session start
  useEffect(() => {
    if (!user) return;
    
    trackBehavior('session', 1, 'session_start');
    
    return () => {
      trackBehavior('session', 0, 'session_end');
    };
  }, [user, trackBehavior]);

  // Log harvest status for admin debugging
  useEffect(() => {
    if (isActive) {
      console.log('[HARVEST INTEGRATION] Background harvest active');
    }
  }, [isActive]);

  // Renders nothing - completely invisible
  return null;
};

export default HarvestIntegration;
