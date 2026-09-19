import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useCallEngine } from '@/contexts/CallEngineContext';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import { showGrowthPush } from '@/lib/growthPush';
import { useToast } from '@/hooks/use-toast';

/** Keeps incoming calls visible on every M'Mora page without mounting another call engine. */
export default function GlobalIncomingCallHost() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const calls = useCallEngine();
  const [ownsIncomingCall, setOwnsIncomingCall] = useState(false);
  const [ringedCallId, setRingedCallId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (calls.hasIncomingCall) setOwnsIncomingCall(true);
    if (calls.callState === 'idle' || calls.callState === 'ended') setOwnsIncomingCall(false);
  }, [calls.callState, calls.hasIncomingCall]);

  // Real device alert + in-app alert the moment a call arrives, on any page.
  useEffect(() => {
    const caller = calls.incomingCall;
    if (!calls.hasIncomingCall || !caller) return;
    const id = caller.userId ?? 'unknown';
    if (ringedCallId === id) return;
    setRingedCallId(id);
    const name = caller.displayName || 'Someone';
    toast({ title: `${name} is calling`, description: 'Answer with video or audio.' });
    void showGrowthPush({
      title: `${name} is calling`,
      body: 'Tap to answer on M\u2019Mora.',
      tag: 'mmora-call',
      onClickUrl: '/calls',
    });
  }, [calls.hasIncomingCall, calls.incomingCall, ringedCallId, toast]);

  useEffect(() => {
    if (calls.callState === 'idle' || calls.callState === 'ended') setRingedCallId(null);
  }, [calls.callState]);

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
