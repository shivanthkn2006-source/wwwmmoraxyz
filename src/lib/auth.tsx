import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { recoverAuthTransportOncePerSession } from '@/lib/authTransportRecovery';
import { markStartupPhase } from '@/lib/startupTiming';
import { ensureOwnProfile } from '@/lib/ensureOwnProfile';

const AUTH_REQUEST_TIMEOUT_MS = 12_000;

const withinAuthBudget = async <T,>(request: PromiseLike<T>, label: string): Promise<T> => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(
          () => reject(Object.assign(new Error(`${label} timed out`), { name: 'AuthTimeoutError' })),
          AUTH_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    return {
      user: null,
      session: null,
      loading: false,
      initialized: false,
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
  const [initialized, setInitialized] = useState(false);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession((current) => current?.access_token === nextSession?.access_token ? current : nextSession);
    setUser((current) => current?.id === nextSession?.user?.id ? current : nextSession?.user ?? null);
    setLoading(false);
    setInitialized(true);
    markStartupPhase('auth-session-resolved');
  }, []);

  useEffect(() => {
    let finished = false;

    const timeout = window.setTimeout(() => {
      if (finished) return;
      console.warn('[Auth] Session load slow — continuing without blocking the interface');
      setLoading(false);
      // We do NOT set initialized=true here because we haven't actually checked yet.
    }, 1500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      finished = true;
      applySession(session);
      window.clearTimeout(timeout);

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        try {
          sessionStorage.removeItem('zoe_infinity_session_valid');
        } catch {}
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in:', session.user.id);
        try {
          sessionStorage.setItem('zoe_infinity_session_valid', 'true');
        } catch {}
        void ensureOwnProfile(session.user);
      }
    });

    withinAuthBudget(supabase.auth.getSession(), 'Session restoration')
      .then(({ data: { session } }) => {
        finished = true;
        applySession(session);
        window.clearTimeout(timeout);
      })
      .catch((err) => {
        console.warn('[Auth] getSession failed:', err);
        finished = true;
        setLoading(false);
        setInitialized(true);
        window.clearTimeout(timeout);
      });

    return () => {
      finished = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [applySession]);

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
      || name.includes('authtimeout')
      || message.includes('timed out')
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
      const { error, data } = await withinAuthBudget(
        supabase.auth.signInWithPassword(credentials),
        'Sign in',
      );

      if (error && isTransientAuthError(error)) {
        const recovered = await recoverAuthTransportOncePerSession('signin');

        if (recovered) {
          const { error: retryError, data: retryData } = await withinAuthBudget(
            supabase.auth.signInWithPassword(credentials),
            'Sign in retry',
          );

          if (!retryError && retryData?.session) {
            applySession(retryData.session);
            try {
              sessionStorage.setItem('zoe_infinity_session_valid', 'true');
            } catch {}
          }

          return { error: retryError && isTransientAuthError(retryError) ? connectionError : retryError };
        }

        return { error: connectionError };
      }

      if (!error && data?.session) {
        applySession(data.session);
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
          const { error: retryError, data: retryData } = await withinAuthBudget(
            supabase.auth.signInWithPassword(credentials),
            'Sign in retry',
          );

          if (!retryError && retryData?.session) {
            applySession(retryData.session);
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
    initialized,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
