/**
 * GlobalAudioQuickConnect — headset status chip + hardware button bridge.
 *
 * Sits top-right (bottom-right stays reserved for the dock and call controls).
 * It also turns headset media-button presses into Zoe activations, so a stem
 * squeeze starts a one-to-one conversation exactly like Jarvis.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { audioRouter } from '@/services/AudioRouterService';
import { zoeBackgroundListener } from '@/services/ZoeBackgroundListener';
import AudioQuickConnectButton from '@/components/audio/AudioQuickConnectButton';
import { useAuth } from '@/lib/auth';
import { ZOE_AUDIO_PREF_EVENT } from '@/lib/zoeAudioPreference';
import { isZoeMuted } from '@/features/zoe-handsfree/muteGate';

const EXCLUDED_PREFIXES = [
  '/auth',
  '/signup',
  '/welcome',
  '/voice-auth',
  '/password-recovery',
  '/access-denied',
  '/zoe-infinity',
];

export const GlobalAudioQuickConnect: React.FC = () => {
  const { pathname } = useLocation();
  const { user, session, loading } = useAuth();
  const [muted, setMuted] = React.useState(() => isZoeMuted());
  const [wakeState, setWakeState] = React.useState(() => zoeBackgroundListener.getState());

  useEffect(() => zoeBackgroundListener.onStateChange(setWakeState), []);
  useEffect(() => {
    const onMute = (event: Event) => setMuted(Boolean((event as CustomEvent<{ muted?: boolean }>).detail?.muted));
    window.addEventListener('zoe-mute-changed', onMute);
    return () => window.removeEventListener('zoe-mute-changed', onMute);
  }, []);

  // Hardware button → Zoe. Registered once for the whole platform.
  useEffect(() => {
    const talk = () => {
      window.dispatchEvent(new CustomEvent('zoe-request-mic-permission'));
      window.dispatchEvent(new CustomEvent('zoe-orb-activate', { detail: { source: 'headset' } }));
    };
    const prompt = () => {
      window.dispatchEvent(new CustomEvent('zoe-orb-activate', { detail: { source: 'headset-double' } }));
    };
    window.addEventListener('zoe-headset-talk', talk);
    window.addEventListener('zoe-headset-prompt', prompt);
    return () => {
      window.removeEventListener('zoe-headset-talk', talk);
      window.removeEventListener('zoe-headset-prompt', prompt);
    };
  }, []);

  // Device discovery is safe at startup, but microphone capture is never
  // attached to an unrelated page tap. The quick-connect control and Zoe voice
  // controls remain the explicit activation points.
  useEffect(() => {
    void audioRouter.prepareDevices();
  }, []);

  // React immediately when the owner flips the switch on the Zoe Audio page.
  useEffect(() => {
    const onPref = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (enabled) void zoeBackgroundListener.enable();
      else zoeBackgroundListener.disable();
    };
    window.addEventListener(ZOE_AUDIO_PREF_EVENT, onPref);
    return () => window.removeEventListener(ZOE_AUDIO_PREF_EVENT, onPref);
  }, []);

  const confirmedSignedOut = !loading && !user && !session;
  if (confirmedSignedOut) return null;
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    // Small round icon only, parked immediately to the LEFT of the header
    // notification bell (bell 40px + 8px gap + 40px avatar + 16px inset).
    <div
      className={`fixed right-[104px] z-[55] flex items-center gap-2 pointer-events-auto ${pathname === '/music' ? 'music-audio-quick-connect top-0' : 'top-[18px]'}`}
      data-global-audio-quick-connect
    >
      {muted && (
        <span role="status" aria-live="polite" className="rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
          Muted · say “Zoe wake”
        </span>
      )}
      {!muted && (wakeState === 'error' || wakeState === 'suspended') && (
        <span role="status" className="hidden rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur sm:inline">
          {wakeState === 'suspended' ? 'Zoe paused · keep this page open' : 'Zoe needs microphone access'}
        </span>
      )}
      <AudioQuickConnectButton compact />
    </div>
  );
};

export default GlobalAudioQuickConnect;
