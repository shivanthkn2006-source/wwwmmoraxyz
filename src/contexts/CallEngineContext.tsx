import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useZoeQuantumCall } from '@/hooks/useZoeQuantumCall';

export type CallEngine = ReturnType<typeof useZoeQuantumCall>;

const CallEngineContext = createContext<CallEngine | null>(null);

export const CallEngineProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isStandaloneZoe = pathname === '/zoe-infinity' || pathname.startsWith('/zoe-infinity/');
  const calls = useZoeQuantumCall(isStandaloneZoe ? undefined : user?.id);

  return <CallEngineContext.Provider value={calls}>{children}</CallEngineContext.Provider>;
};

export const useCallEngine = (): CallEngine => {
  const calls = useContext(CallEngineContext);
  if (!calls) throw new Error('useCallEngine must be used within CallEngineProvider');
  return calls;
};
