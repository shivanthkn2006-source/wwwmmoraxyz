// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM GATEKEEPER - Fortress Protocol Layer 0
// GENESIS LAUNCH: Beta lock DISABLED - Platform is now LIVE
// Integrated with Zoe DHF Core via centralized security config
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AccessDeniedScreen } from './AccessDeniedScreen';
import { 
  checkRootAdminStatus,
  logSecurityEvent,
  SECURITY_EVENTS,
  SECURITY_CATEGORIES,
  PUBLIC_ROUTES 
} from './securityConfig';
import { isBetaLocked, isLive } from '@/core/security/ConstitutionalKernel';

interface GatekeeperState {
  isLoading: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  deniedReason: string | null;
}

interface QuantumGatekeeperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const QuantumGatekeeper: React.FC<QuantumGatekeeperProps> = ({
  children,
  enabled = true
}) => {
  const { user, session, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const lastCheckRef = useRef<string>('');
  
  const [state, setState] = useState<GatekeeperState>({
    isLoading: true,
    hasAccess: false,
    isAdmin: false,
    deniedReason: null
  });

  // Log security event to DHF
  const logEvent = useCallback(async (eventType: string, details: string) => {
    if (!user) return;
    
    await logSecurityEvent(
      user.id,
      eventType,
      SECURITY_CATEGORIES.ACCESS,
      details,
      { route: location.pathname }
    );
  }, [user, location.pathname]);

  // Check if user is a root admin
  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    const { isAdmin, username } = await checkRootAdminStatus(user.id);
    
    if (isAdmin) {
      console.log('[QuantumGatekeeper] 👑 Root Admin detected:', username);
      await logEvent(SECURITY_EVENTS.ADMIN_ACCESS_GRANTED, `Root admin ${username} granted access`);
    }
    
    return isAdmin;
  }, [user, logEvent]);

  // Validate invite token
  const validateInviteToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const { data: invite, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', token)
        .eq('is_active', true)
        .single();

      if (error || !invite) {
        console.log('[QuantumGatekeeper] Invalid invite token');
        return false;
      }

      // Check expiration
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        console.log('[QuantumGatekeeper] Invite token expired');
        return false;
      }

      // Check max uses
      if (invite.max_uses && invite.current_uses >= invite.max_uses) {
        console.log('[QuantumGatekeeper] Invite token max uses reached');
        return false;
      }

      // Store valid invite in session
      sessionStorage.setItem('quantum_invite_token', token);
      
      // Update usage count if user is logged in
      if (user) {
        await supabase
          .from('invite_codes')
          .update({ 
            current_uses: (invite.current_uses || 0) + 1,
            used_by: user.id,
            used_at: new Date().toISOString()
          })
          .eq('id', invite.id);
        
        await logEvent(SECURITY_EVENTS.INVITE_TOKEN_USED, `Invite token validated: ${token.substring(0, 8)}...`);
      }

      console.log('[QuantumGatekeeper] ✓ Valid invite token');
      return true;
    } catch (e) {
      console.error('[QuantumGatekeeper] Token validation error:', e);
      return false;
    }
  }, [user, logEvent]);

  // Main access check
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // GENESIS LAUNCH: Check Constitutional Kernel for beta status
    // If platform is LIVE, bypass invite-only restrictions entirely
    if (!enabled || isLive() || !isBetaLocked()) {
      console.log('[QuantumGatekeeper] 🚀 GENESIS LAUNCH ACTIVE - Gates are OPEN');
      setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
      return;
    }

    // Prevent duplicate checks for same conditions
    const checkKey = `${user?.id || 'anon'}-${location.pathname}-${searchParams.get('invite_token') || ''}`;
    if (checkKey === lastCheckRef.current && !state.isLoading) {
      return;
    }
    lastCheckRef.current = checkKey;

    const checkAccess = async () => {
      setState(prev => ({ ...prev, isLoading: true }));

      // CRITICAL: Check for invite token in URL FIRST (before public route check)
      // This ensures tokens are captured even on public routes like "/"
      const urlToken = searchParams.get('invite_token');
      if (urlToken) {
        const isValid = await validateInviteToken(urlToken);
        if (isValid) {
          console.log('[QuantumGatekeeper] ✓ Invite token validated from URL');
          // Token is now stored in sessionStorage by validateInviteToken
          // Continue to grant access
          setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
          return;
        }
      }

      // Check 0: Allow public routes (auth, recovery, etc.)
      // NOTE: We treat the root path "/" as public so users can reach the AuthPage.
      if (
        location.pathname === '/' ||
        PUBLIC_ROUTES.some(route => location.pathname === route || location.pathname.startsWith(route))
      ) {
        console.log('[QuantumGatekeeper] ✓ Public route allowed:', location.pathname);
        setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
        return;
      }

      // Check 1: If user is not authenticated, do NOT hard-block the app.
      // ProtectedRoute will handle redirects to /auth.
      // Invite tokens are used for onboarding/validation, not as a permanent lock screen.
      if (!user) {
        setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
        return;
      }

      // Check 2: Authenticated user access (post-signup/login)
      // Once a user is authenticated, they should not be blocked by invite-gating.
      if (session) {
        console.log('[QuantumGatekeeper] ✓ Authenticated session - access granted');
        setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
        return;
      }

      // Check 2: Root Admin bypass
      if (user) {
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
          setState({ isLoading: false, hasAccess: true, isAdmin: true, deniedReason: null });
          return;
        }
      }

      // Check 2: Session stored invite token (URL token already checked above)
      const sessionToken = sessionStorage.getItem('quantum_invite_token');
      if (sessionToken) {
        const isValid = await validateInviteToken(sessionToken);
        if (isValid) {
          setState({ isLoading: false, hasAccess: true, isAdmin: false, deniedReason: null });
          return;
        }
      }

      // (Session token check moved to Check 2 above)

      // No valid access - deny
      console.log('[QuantumGatekeeper] ⛔ Access DENIED - No valid credentials');
      
      // Log denial to DHF if user exists
      if (user) {
        await logEvent(SECURITY_EVENTS.ACCESS_DENIED, 'Access denied - no valid invite token');
      }
      
      setState({ 
        isLoading: false, 
        hasAccess: false, 
        isAdmin: false, 
        deniedReason: 'No valid invite token or admin credentials' 
      });
    };

    checkAccess();
  }, [enabled, user, session, authLoading, location.pathname, searchParams, checkAdminStatus, validateInviteToken, logEvent, state.isLoading]);

  // Show loading state (but not if auth is still loading)
  if (state.isLoading || authLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[99999]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4 mx-auto" />
          <div className="text-primary font-mono text-sm animate-pulse">
            QUANTUM ENTANGLEMENT VERIFICATION...
          </div>
        </div>
      </div>
    );
  }

  // Access denied
  if (!state.hasAccess) {
    return <AccessDeniedScreen />;
  }

  // Access granted
  return <>{children}</>;
};

export default QuantumGatekeeper;
