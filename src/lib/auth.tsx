import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { recoverAuthTransportOncePerSession } from '@/lib/authTransportRecovery';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  // Never hard-crash UI if provider ordering breaks during hot reload/transient boot states.
  if (context === undefined) {
    return {
      user: null,
      session: null,
      loading: false,
      signUp: async () => ({ error: { message: 'Auth provider unavailable', name: 'AuthProviderMissing' } }),
      signIn: async () => ({ error: { message: 'Auth provider unavailable', name: 'AuthProviderMissing' } }),
      signOut: async () => {},
    };
  }

  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let finished = false;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let retryInterval: ReturnType<typeof setInterval> | null = null;

    // IMPORTANT: For Zoe Infinity continuity we must not prematurely treat users as logged-out.
    // Some environments take 8–12s for /user to resolve (cold starts, mobile networks).
    // We still allow UI to render, but we keep retrying session fetch in the background.
    const timeout = window.setTimeout(() => {
      if (finished) return;
      console.warn('[Auth] Session load slow — continuing UI, retrying session fetch');
      setLoading(false);

      // Background retries (max ~30s) to avoid permanent "guest" state.
      let attempts = 0;
      retryInterval = setInterval(async () => {
        attempts += 1;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[Auth] Session recovered after slow start');
            setSession(session);
            setUser(session.user);
            if (retryInterval) clearInterval(retryInterval);
            retryInterval = null;
          }
        } catch {
          // ignore
        }

        if (attempts >= 15) {
          if (retryInterval) clearInterval(retryInterval);
          retryInterval = null;
        }
      }, 2000);
    }, 12000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      finished = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      window.clearTimeout(timeout);

      // Handle token refresh events
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed successfully');
      }
      
      // Handle sign out - clear any cached session flags
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        // Clear any Zoe Infinity session flags so next login gets fresh state
        try {
          sessionStorage.removeItem('zoe_infinity_session_valid');
        } catch {}
      }
      
      // Handle sign in - mark session as valid
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in:', session.user.id);
        try {
          sessionStorage.setItem('zoe_infinity_session_valid', 'true');
        } catch {}
      }
    });

    // Initial session fetch
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        finished = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        window.clearTimeout(timeout);

        // If we recovered quickly, stop any slow-start retries
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }

        // Set up proactive token refresh if session exists
        if (session) {
          // Refresh token every 10 minutes to prevent JWT expiry issues
          refreshInterval = setInterval(async () => {
            try {
              // First check if we still have a valid session
              const { data: currentSession } = await supabase.auth.getSession();
              if (!currentSession?.session) {
                // No session, skip refresh attempt
                console.debug('[Auth] No active session, skipping proactive refresh');
                return;
              }
              
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                // Only warn if it's not an expected session missing error
                if (!error.message?.includes('session missing')) {
                  console.warn('[Auth] Proactive token refresh failed:', error.message);
                }
              } else if (data.session) {
                console.debug('[Auth] Proactive token refresh successful');
              }
            } catch (err: any) {
              // Silently handle session-related errors
              if (!err?.message?.includes('session')) {
                console.warn('[Auth] Proactive refresh error:', err);
              }
            }
          }, 10 * 60 * 1000); // Every 10 minutes
        }
      })
      .catch((err) => {
        console.warn('[Auth] getSession failed:', err);
        finished = true;
        setLoading(false);
        window.clearTimeout(timeout);

        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      });

    return () => {
      finished = true;
      window.clearTimeout(timeout);
      if (refreshInterval) clearInterval(refreshInterval);
      if (retryInterval) clearInterval(retryInterval);
      subscription.unsubscribe();
    };
  }, []);

  const connectionError = {
    message: 'Connection failed. The backend may be paused or unavailable. Please try again in a few moments.',
    name: 'ConnectionError',
  };

  const isTransientAuthError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    const name = String(error?.name || '').toLowerCase();

    return (
      message.includes('failed to fetch') ||
      message.includes('load failed') ||
      message.includes('network request failed') ||
      message.includes('connection failed') ||
      message.includes('networkerror') ||
      name.includes('fetch')
    );
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    const signUpPayload = {
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    };

    try {
      const { error } = await supabase.auth.signUp(signUpPayload);

      if (error && isTransientAuthError(error)) {
        const recovered = await recoverAuthTransportOncePerSession('signup');

        if (recovered) {
          const { error: retryError } = await supabase.auth.signUp(signUpPayload);
          return { error: retryError && isTransientAuthError(retryError) ? connectionError : retryError };
        }

        return { error: connectionError };
      }

      return { error };
    } catch (err) {
      console.error('SignUp failed:', err);

      if (isTransientAuthError(err)) {
        const recovered = await recoverAuthTransportOncePerSession('signup');

        if (recovered) {
          const { error: retryError } = await supabase.auth.signUp(signUpPayload);
          return { error: retryError && isTransientAuthError(retryError) ? connectionError : retryError };
        }
      }

      return { error: isTransientAuthError(err) ? connectionError : err };
    }
  };

  const signIn = async (email: string, password: string) => {
    const credentials = { email, password };

    try {
      const { error, data } = await supabase.auth.signInWithPassword(credentials);

      if (error && isTransientAuthError(error)) {
        const recovered = await recoverAuthTransportOncePerSession('signin');

        if (recovered) {
          const { error: retryError, data: retryData } = await supabase.auth.signInWithPassword(credentials);

          if (!retryError && retryData?.session) {
            setSession(retryData.session);
            setUser(retryData.session.user);
            try {
              sessionStorage.setItem('zoe_infinity_session_valid', 'true');
            } catch {}
          }

          return { error: retryError && isTransientAuthError(retryError) ? connectionError : retryError };
        }

        return { error: connectionError };
      }

      if (!error && data?.session) {
        // Hydrate auth state immediately to avoid route-guard race conditions.
        setSession(data.session);
        setUser(data.session.user);
        try {
          sessionStorage.setItem('zoe_infinity_session_valid', 'true');
        } catch {}
      }

      return { error };
    } catch (err) {
      console.error('SignIn failed:', err);

      if (isTransientAuthError(err)) {
        const recovered = await recoverAuthTransportOncePerSession('signin');

        if (recovered) {
          const { error: retryError, data: retryData } = await supabase.auth.signInWithPassword(credentials);

          if (!retryError && retryData?.session) {
            setSession(retryData.session);
            setUser(retryData.session.user);
            try {
              sessionStorage.setItem('zoe_infinity_session_valid', 'true');
            } catch {}
          }

          return { error: retryError && isTransientAuthError(retryError) ? connectionError : retryError };
        }
      }

      return { error: isTransientAuthError(err) ? connectionError : err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
