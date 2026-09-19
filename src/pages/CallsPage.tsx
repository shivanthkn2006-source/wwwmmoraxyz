import { useCallback, useState } from 'react';
import { Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CallControlPanel } from '@/components/zoe-infinity/CallControlPanel';
import { QuantumCallModal } from '@/components/quantum/QuantumCallModal';
import { useZoeQuantumCall, type CallParticipant } from '@/hooks/useZoeQuantumCall';

const CallsPage = () => {
  const { user } = useAuth();
  const calls = useZoeQuantumCall(user?.id);
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-transparent text-white">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Phone className="h-8 w-8" />
          <h1 className="text-xl font-medium text-white">Calls</h1>
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