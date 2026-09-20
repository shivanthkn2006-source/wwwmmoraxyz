import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import ZoeCallsIcon from '@/components/icons/ZoeCallsIcon';
import { CallControlPanel } from '@/components/zoe-infinity/CallControlPanel';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import type { CallParticipant } from '@/hooks/useZoeQuantumCall';
import { useCallEngine } from '@/contexts/CallEngineContext';

const CallsPage = () => {
  const { user } = useAuth();
  const calls = useCallEngine();
  const [target, setTarget] = useState<CallParticipant | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const startCall = useCallback(async (
    userId: string,
    displayName?: string,
    avatarUrl?: string,
    withVideo = false,
  ) => {
    const participant = { userId, displayName, avatarUrl, isAI: false };
    setTarget(participant);
    setIsOpen(true);
    await calls.initiateCall(participant, withVideo);
  }, [calls]);

  if (!user) return null;

  return (
    <main className="calls-liquid-page relative min-h-[100dvh] overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute left-14 top-[max(5rem,env(safe-area-inset-top))] sm:left-4 sm:top-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 text-white/90">
          <ZoeCallsIcon className="h-9 w-9" />
          <h1 className="text-xl font-medium text-white">Zoe Calls</h1>
          <div className="pointer-events-auto ml-2 flex items-center gap-2">
            <Link to="/calls/history" className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              Call history
            </Link>
            <Link to="/calls/group" className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              Group call
            </Link>
          </div>
        </div>
      </div>


      <CallControlPanel
        currentUserId={user.id}
        onStartCall={startCall}
        onEndCall={() => void calls.endCall('user_hangup')}
        isInCall={calls.isInCall}
        callState={calls.callState}
        videoEnabled={calls.video.isEnabled}
      />

      <QuantumCallModal
        currentUserId={user.id}
        isOpen={isOpen || calls.hasIncomingCall}
        onClose={() => {
          setIsOpen(false);
          setTarget(null);
        }}
        quantumCallState={calls}
        targetParticipant={target ?? undefined}
      />
    </main>
  );
};

export default CallsPage;