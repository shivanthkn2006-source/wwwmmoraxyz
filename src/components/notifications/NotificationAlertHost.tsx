/**
 * Headless host that keeps platform-wide notification alerts (sound + haptics
 * + toast) running on every route. Renders nothing.
 *
 * forwardRef so error-boundary wrappers that attach refs never warn.
 */
import { forwardRef, useEffect, useState } from 'react';
import useGlobalNotificationAlerts from '@/hooks/useGlobalNotificationAlerts';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import {
  initializeAudio,
  isAudioUnlocked,
  NOTIFICATION_AUDIO_STATE_EVENT,
  playIncomingCue,
} from '@/utils/notificationSounds';

export const NotificationAlertHost = forwardRef<HTMLDivElement>((_props, _ref) => {
  useGlobalNotificationAlerts();
  const [unlocked, setUnlocked] = useState(isAudioUnlocked());

  useEffect(() => {
    const sync = () => setUnlocked(isAudioUnlocked());
    window.addEventListener(NOTIFICATION_AUDIO_STATE_EVENT, sync);
    const timer = window.setTimeout(sync, 250);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(NOTIFICATION_AUDIO_STATE_EVENT, sync);
    };
  }, []);

  if (unlocked) return null;
  return (
    <div ref={_ref} className="pointer-events-none fixed inset-x-0 top-2 z-[10001] flex justify-center px-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pointer-events-auto gap-2 border border-border bg-card/95 shadow-lg backdrop-blur-xl"
        onClick={() => {
          initializeAudio();
          playIncomingCue();
          setUnlocked(isAudioUnlocked());
        }}
      >
        <Volume2 className="h-4 w-4" aria-hidden="true" />
        Enable alert sound
      </Button>
    </div>
  );
});
NotificationAlertHost.displayName = 'NotificationAlertHost';

export default NotificationAlertHost;
