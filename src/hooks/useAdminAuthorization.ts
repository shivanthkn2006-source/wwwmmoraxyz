import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Admin users who can authorize Zoe for deep system access
const AUTHORIZED_ADMINS = ['moksh50'];

interface AdminAuthState {
  isAdmin: boolean;
  isAuthorized: boolean;
  adminHandle: string | null;
  authorizationTimestamp: string | null;
}

const STORAGE_KEY = 'zoe-admin-authorization';

export const useAdminAuthorization = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isAuthorized: false,
    adminHandle: null,
    authorizationTimestamp: null,
  });
  const [userHandle, setUserHandle] = useState<string | null>(null);

  // Fetch user's handle from profiles
  useEffect(() => {
    const fetchUserHandle = async () => {
      if (!user?.id) {
        setUserHandle(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.username) {
        setUserHandle(data.username);
      }
    };

    fetchUserHandle();
  }, [user?.id]);

  // Check if current user is an admin
  useEffect(() => {
    const isAdmin = userHandle ? AUTHORIZED_ADMINS.includes(userHandle) : false;
    
    // Load stored authorization
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if same admin user
        if (parsed.adminHandle === userHandle && isAdmin) {
          setState({
            isAdmin,
            isAuthorized: parsed.isAuthorized,
            adminHandle: parsed.adminHandle,
            authorizationTimestamp: parsed.authorizationTimestamp,
          });
          return;
        }
      }
    } catch {}

    setState(prev => ({
      ...prev,
      isAdmin,
      adminHandle: isAdmin ? userHandle : null,
    }));
  }, [userHandle]);

  // Persist authorization state
  useEffect(() => {
    if (state.isAuthorized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const authorize = useCallback(() => {
    if (!state.isAdmin) {
      toast.error('Authorization denied: Admin privileges required');
      console.log('[ZoeAuth] Denied: User is not an authorized admin');
      return false;
    }

    const timestamp = new Date().toISOString();
    setState(prev => ({
      ...prev,
      isAuthorized: true,
      authorizationTimestamp: timestamp,
    }));

    toast.success(`Zoe authorized by @${userHandle} - Full system access granted`);
    console.log(`[ZoeAuth] AUTHORIZED by @${userHandle} at ${timestamp}`);
    console.log('[ZoeAuth] Zoe now has full access to: frontend, backend, database, architecture');
    
    return true;
  }, [state.isAdmin, userHandle]);

  const revoke = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAuthorized: false,
      authorizationTimestamp: null,
    }));
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Zoe authorization revoked');
    console.log('[ZoeAuth] Authorization REVOKED');
  }, []);

  const checkPermission = useCallback((action: string): boolean => {
    if (!state.isAuthorized) {
      console.log(`[ZoeAuth] Action "${action}" blocked - not authorized`);
      return false;
    }
    console.log(`[ZoeAuth] Action "${action}" permitted by @${state.adminHandle}`);
    return true;
  }, [state.isAuthorized, state.adminHandle]);

  return {
    ...state,
    userHandle,
    authorize,
    revoke,
    checkPermission,
    authorizedAdmins: AUTHORIZED_ADMINS,
  };
};
