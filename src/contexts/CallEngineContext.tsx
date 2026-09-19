import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useZoeQuantumCall } from '@/hooks/useZoeQuantumCall';
import { registerCallPushDevice } from '@/features/calls/callPush';

export type CallEngine = ReturnType<typeof useZoeQuantumCall>;

const CallEngineContext = createContext<CallEngine | null>(null);

export const CallEngineProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isStandaloneZoe = pathname === '/zoe-infinity' || pathname.startsWith('/zoe-infinity/');
  const calls = useZoeQuantumCall(isStandaloneZoe ? undefined : user?.id);

  // Remember this device so incoming calls can ring it while the app is closed.
  useEffect(() => {
    if (!user?.id || isStandaloneZoe) return;
    void registerCallPushDevice(user.id);
  }, [user?.id, isStandaloneZoe]);

  return <CallEngineContext.Provider value={calls}>{children}</CallEngineContext.Provider>;
};

export const useCallEngine = (): CallEngine => {
  const calls = useContext(CallEngineContext);
  if (!calls) throw new Error('useCallEngine must be used within CallEngineProvider');
  return calls;
};
