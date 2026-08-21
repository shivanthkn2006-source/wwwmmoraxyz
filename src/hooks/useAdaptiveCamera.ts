import { useState, useEffect, useRef, useCallback } from 'react';

interface AdaptiveStreamOptions {
  autoStart?: boolean;
}

export type AdaptiveNetworkType = 'high' | 'lite';

/**
 * Adaptive camera hook: profiles network + hardware and picks safe capture
 * constraints so low-end devices never overheat. Guarantees full track teardown.
 */
export const useAdaptiveCamera = ({ autoStart = true }: AdaptiveStreamOptions = {}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkType, setNetworkType] = useState<AdaptiveNetworkType>('high');
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const getOptimalConstraints = useCallback((): { constraints: MediaStreamConstraints; tier: AdaptiveNetworkType } => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const cores = navigator.hardwareConcurrency || 4;

    const isFastNetwork = connection
      ? (connection.downlink >= 5 || connection.type === 'wifi') && connection.saveData !== true
      : true;
    const isCapableDevice = cores >= 4;

    if (isFastNetwork && isCapableDevice) {
      return {
        tier: 'high',
        constraints: {
          video: {
            facingMode: 'user',
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: { echoCancellation: true, noiseSuppression: true },
        },
      };
    }

    return {
      tier: 'lite',
      constraints: {
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 },
          frameRate: { ideal: 24, max: 24 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      },
    };
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* noop */ }
      });
      streamRef.current = null;
    }
    if (mountedRef.current) {
      setStream(null);
      setIsLive(false);
    }
  }, []);

  const startStream = useCallback(async () => {
    if (streamRef.current) return;
    try {
      setError(null);
      const { constraints, tier } = getOptimalConstraints();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported on this device');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setNetworkType(tier);
      setStream(mediaStream);
      setIsLive(true);
    } catch (err: any) {
      console.error('Camera stream initialization failed:', err);
      if (!mountedRef.current) return;
      setError(err?.message || 'Unable to access camera');
      setIsLive(false);
    }
  }, [getOptimalConstraints]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoStart) void startStream();
    return () => {
      mountedRef.current = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release hardware locks when the tab is hidden (prevents thermal drain)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopStream();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stopStream]);

  return { stream, isLive, error, networkType, startStream, stopStream };
};

export default useAdaptiveCamera;
