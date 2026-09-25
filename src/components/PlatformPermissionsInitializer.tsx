/**
 * PlatformPermissionsInitializer
 *
 * Requests microphone, camera and location access once per device so every
 * M'Mora / Zoe / DHF feature (voice, live stream, camera capture, geo-aware
 * astrology) works without a per-feature prompt.
 *
 * Browsers only allow media prompts from a user gesture, so the request is
 * armed at load/sign-in and fires on the first interaction (or immediately when
 * the permission was already granted). Tracks are stopped right away — this
 * only warms the permission, it never keeps hardware open.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';

const STORAGE_KEY = 'mmora.permissions.primed.v1';

type PermissionKey = 'microphone' | 'camera' | 'geolocation';

const queryState = async (name: PermissionKey): Promise<PermissionState | 'unsupported'> => {
  try {
    const status = await navigator.permissions?.query({ name: name as PermissionName });
    return status?.state ?? 'unsupported';
  } catch {
    return 'unsupported';
  }
};

const requestMedia = async (constraints: MediaStreamConstraints) => {
  try {
    const stream = await navigator.mediaDevices?.getUserMedia(constraints);
    stream?.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};

const requestLocation = () =>
  new Promise<boolean>((resolve) => {
    if (!navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });

export const PlatformPermissionsInitializer: React.FC = () => {
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (typeof window === 'undefined' || !window.isSecureContext) return;
    if (!user?.id) return;
    // Ask ONCE per device. Safari / iPad / PWA do not remember grants for
    // getUserMedia, so re-priming on every visit re-showed the prompt each time.
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        ranRef.current = true;
        return;
      }
    } catch {
      /* storage blocked — fall through, still single-shot per session */
    }

    let disposed = false;

    const prime = async () => {
      if (ranRef.current || disposed) return;
      ranRef.current = true;
      detach();
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        /* private mode — best effort */
      }

      const [mic, cam] = await Promise.all([queryState('microphone'), queryState('camera')]);
      if (mic === 'prompt' || mic === 'unsupported') await requestMedia({ audio: true });
      if (cam === 'prompt' || cam === 'unsupported') await requestMedia({ video: true });
      const geo = await queryState('geolocation');
      if (geo === 'prompt' || geo === 'unsupported') await requestLocation();

      window.dispatchEvent(new CustomEvent('mmora:permissions-primed'));
    };

    const onGesture = () => void prime();
    const attach = () => {
      window.addEventListener('pointerdown', onGesture, { once: true });
      window.addEventListener('keydown', onGesture, { once: true });
      window.addEventListener('touchstart', onGesture, { once: true });
    };
    const detach = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };

    attach();

    return () => {
      disposed = true;
      detach();
    };
  }, [user?.id]);

  return null;
};

export default PlatformPermissionsInitializer;
