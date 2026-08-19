import React from 'react';
import { useAstroDiagnostics } from '@/hooks/useAstroDiagnostics';
import { useMoraZoeScheduler } from '@/hooks/useMoraZoeScheduler';
import { MoraZoeMorningTakeover } from './MoraZoeMorningTakeover';
import { MoraZoeLoginGreeting } from './MoraZoeLoginGreeting';

/**
 * Single plug-and-play overlay host. Fully sandboxed: renders nothing when
 * diagnostics fail, and never touches feed/routing components.
 */
export const MoraZoeGlobalHost: React.FC = () => {
  const { loading, diagnostics, todayPrediction } = useAstroDiagnostics();
  const {
    showMorningTakeover,
    showLoginGreeting,
    secondsRemaining,
    dismissTakeover,
    dismissLoginGreeting,
  } = useMoraZoeScheduler(diagnostics?.user_id);

  if (loading || !diagnostics?.passed || !todayPrediction) return null;

  return (
    <>
      {showMorningTakeover && (
        <MoraZoeMorningTakeover
          prediction={todayPrediction}
          secondsRemaining={secondsRemaining}
          onDismiss={() => dismissTakeover('manual')}
        />
      )}
      {showLoginGreeting && !showMorningTakeover && (
        <MoraZoeLoginGreeting prediction={todayPrediction} onDismiss={dismissLoginGreeting} />
      )}
    </>
  );
};

export default MoraZoeGlobalHost;
