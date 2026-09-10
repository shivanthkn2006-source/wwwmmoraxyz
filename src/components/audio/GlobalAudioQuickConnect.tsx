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

  // Keep the router alive across routes so the chosen sink survives navigation.
  useEffect(() => {
    // Device list only — never open the audio hardware on page load, or a
    // connected headset sits in an open stream and hisses continuously.
    void audioRouter.prepareDevices();
    // Restore hands-free listening if the user switched it on before.
    if (zoeBackgroundListener.wasEnabledBefore() && audioRouter.wasMicGrantedBefore()) {
      void zoeBackgroundListener.enable();
    }
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
