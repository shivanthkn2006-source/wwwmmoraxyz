import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useCallEngine } from '@/contexts/CallEngineContext';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';

/** Keeps incoming calls visible on every M'Mora page without mounting another call engine. */
export default function GlobalIncomingCallHost() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const calls = useCallEngine();
  const [ownsIncomingCall, setOwnsIncomingCall] = useState(false);

  useEffect(() => {
    if (calls.hasIncomingCall) setOwnsIncomingCall(true);
    if (calls.callState === 'idle' || calls.callState === 'ended') setOwnsIncomingCall(false);
  }, [calls.callState, calls.hasIncomingCall]);

  if (!user || pathname === '/calls' || pathname.startsWith('/zoe-infinity')) return null;

  return (
    <QuantumCallModal
      currentUserId={user.id}
      isOpen={ownsIncomingCall}
      onClose={() => void calls.endCall('user_hangup')}
      quantumCallState={calls}
    />
  );
}
