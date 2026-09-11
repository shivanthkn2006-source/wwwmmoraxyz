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
import { ZOE_AUDIO_PREF_EVENT, isZoeAudioEnabled } from '@/lib/zoeAudioPreference';

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

  // Zoe audio is ON by default from the moment the platform starts. Nobody has
  // to open a settings page to switch it on; the settings page only turns it
  // OFF. Two guarded paths, so this can never nag or hiss:
  //   - Devices are only enumerated (no capture opened) on load.
  //   - Listening starts immediately when the microphone was already granted,
  //     otherwise it waits for the first real tap/click, which is what every
  //     browser (and iOS in particular) requires before recognition may start.
  useEffect(() => {
    void audioRouter.prepareDevices();

    let armed = false;
    const startLink = () => {
      if (armed) return;
      if (!isZoeAudioEnabled()) return;
      armed = true;
      void zoeBackgroundListener.enable();
    };

    if (isZoeAudioEnabled() && audioRouter.wasMicGrantedBefore()) {
      startLink();
      return;
    }

    const onGesture = () => startLink();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
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
    <div className="fixed top-[18px] right-[104px] z-[55] pointer-events-auto">
      <AudioQuickConnectButton compact />
    </div>
  );
};

export default GlobalAudioQuickConnect;
