// ═══════════════════════════════════════════════════════════════════════════════
// NEUROSYMBOLIC GUARD HOOK
// React hook wrapping guardAIResponse for use in chat components
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';
import { guardAIResponse, type GuardContext, type GuardResult } from '@/core/neurosymbolic/NeuroSymbolicGuard';
import { useAuth } from '@/lib/auth';

type Surface = GuardContext['surface'];

/**
 * Hook that provides a guard function for filtering AI responses
 * 
 * Usage:
 *   const { guard } = useNeuroSymbolicGuard('mmora');
 *   // After receiving AI response:
 *   const filtered = guard(data.message);
 *   setResponseText(filtered.safeResponse);
 */
export function useNeuroSymbolicGuard(surface: Surface) {
  const { user } = useAuth();
  const statsRef = useRef({ totalGuarded: 0, totalBlocked: 0, totalRedactions: 0 });

  const guard = useCallback(
    (
      rawResponse: string,
      options?: Partial<Omit<GuardContext, 'surface'>>
    ): GuardResult => {
      const result = guardAIResponse(rawResponse, {
        surface,
        userId: user?.id,
        ...options,
      });

      // Track stats silently
      statsRef.current.totalGuarded++;
      if (result.blocked) statsRef.current.totalBlocked++;
      statsRef.current.totalRedactions += result.redactions.redactionsApplied;

      return result;
    },
    [surface, user?.id]
  );

  return { guard, stats: statsRef.current };
}

export default useNeuroSymbolicGuard;
