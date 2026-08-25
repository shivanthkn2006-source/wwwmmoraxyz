import React from 'react';
import { useAstroDiagnostics } from '@/hooks/useAstroDiagnostics';
import { useZoeMotivation } from '@/hooks/useZoeMotivation';
import { useMoraZoeScheduler } from '@/hooks/useMoraZoeScheduler';
import { useBirthDetailsGate } from '@/hooks/useBirthDetailsGate';
import { useCardImpression } from '@/hooks/useCardImpression';
import { useAstroTimezoneSync } from '@/hooks/useAstroTimezoneSync';
import { resolvePosterUrl } from '@/lib/astroPoster';
import { MoraZoeMorningTakeover } from './MoraZoeMorningTakeover';
import { MoraZoeLoginGreeting } from './MoraZoeLoginGreeting';
import { MoraZoeBirthDetailsPrompt } from './MoraZoeBirthDetailsPrompt';

/**
 * Single plug-and-play overlay host. Fully sandboxed: renders nothing when a
 * layer has no data, and never touches feed/routing components.
 *
 * Two distinct layers:
 *  • Morning takeover  → astrology alignment (needs birth details)
 *  • Login greeting    → everyday motivation (works for every member)
 */
export const MoraZoeGlobalHost: React.FC = () => {
  const { diagnostics, todayPrediction } = useAstroDiagnostics();
  const { motivation, posterUrl, userId, loading: motivationLoading } = useZoeMotivation();
  const scheduleUserId = diagnostics?.user_id ?? userId;

  const {
    showMorningTakeover,
    showLoginGreeting,
    secondsRemaining,
    dismissTakeover,
    dismissLoginGreeting,
  } = useMoraZoeScheduler(scheduleUserId);

  const [astroPoster, setAstroPoster] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    void resolvePosterUrl(todayPrediction?.poster_image_url).then((url) => {
      if (!cancelled) setAstroPoster(url);
    });
    return () => { cancelled = true; };
  }, [todayPrediction?.poster_image_url]);

  const {
    needsDetails,
    existing: existingBirth,
    loading: birthLoading,
    save: saveBirth,
    snooze: snoozeBirth,
  } = useBirthDetailsGate();

  const canShowAstro = !!diagnostics?.passed && !!todayPrediction;
  const canShowMotivation = !motivationLoading && !!motivation;

  // The astrology takeover needs birth-derived data. Members without it still
  // get their full-screen motivation instead, so nobody sees a blank morning.
  const showAstroTakeover = showMorningTakeover && canShowAstro;
  const showMotivationCard =
    canShowMotivation && !showAstroTakeover && (showLoginGreeting || showMorningTakeover);

  // Only members with missing birth date/time/place ever see this, and only
  // once nothing else is on screen, so overlays never stack.
  const showBirthPrompt =
    !birthLoading && needsDetails && !showAstroTakeover && !showMotivationCard;

  // Open-rate tracking (fire-and-forget; never blocks the overlays).
  const astroImpression = useCardImpression('morning_takeover', showAstroTakeover, todayPrediction?.id);
  const motivationImpression = useCardImpression('login_greeting', showMotivationCard, motivation?.id);

  return (
    <>
      {showAstroTakeover && todayPrediction && (
        <MoraZoeMorningTakeover
          prediction={todayPrediction}
          posterUrl={astroPoster}
          secondsRemaining={secondsRemaining}
          onDismiss={() => { void astroImpression.markDismissed(); dismissTakeover('manual'); }}
        />
      )}
      {showMotivationCard && motivation && (
        <MoraZoeLoginGreeting
          motivation={motivation}
          posterUrl={posterUrl}
          onDismiss={() => {
            void motivationImpression.markDismissed();
            dismissLoginGreeting();
            if (showMorningTakeover) dismissTakeover('manual');
          }}
        />
      )}
      {showBirthPrompt && (
        <MoraZoeBirthDetailsPrompt
          initial={existingBirth}
          onSave={saveBirth}
          onSkip={snoozeBirth}
        />
      )}
    </>
  );
};


export default MoraZoeGlobalHost;
