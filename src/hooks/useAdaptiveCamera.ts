import { useState, useEffect, useRef, useCallback } from 'react';

interface AdaptiveStreamOptions {
  autoStart?: boolean;
}

export type AdaptiveNetworkType = 'high' | 'lite';
export type AdaptiveCameraErrorKind =
  | 'permission-denied'
  | 'no-device'
  | 'in-use'
  | 'unsupported'
  | 'insecure-context'
  | 'unknown';

export interface AdaptiveCameraError {
  kind: AdaptiveCameraErrorKind;
  title: string;
  message: string;
  /** true when the user can fix it by granting permission and retrying */
  recoverable: boolean;
}

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));

const isSafari = () =>
  typeof navigator !== 'undefined' &&
  /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

function describeError(err: any): AdaptiveCameraError {
  const name = err?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return {
      kind: 'permission-denied',
      title: 'Camera & microphone are blocked',
      message: isIOS() || isSafari()
        ? 'Allow camera and microphone for this site (Settings → Safari → Camera/Microphone, or the "aA" menu in the address bar), then tap Try again.'
        : 'Allow camera and microphone in your browser’s address-bar permission menu, then tap Try again.',
      recoverable: true,
    };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
    return {
      kind: 'no-device',
      title: 'No camera found',
      message: 'This device has no available camera. Connect one or open M’Mora Live on your phone.',
      recoverable: true,
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return {
      kind: 'in-use',
      title: 'Camera is busy',
      message: 'Another app or tab is using the camera. Close it and tap Try again.',
      recoverable: true,
    };
  }
  if (err?.__insecure) {
    return {
      kind: 'insecure-context',
      title: 'Secure connection required',
      message: 'Live needs an https connection to use the camera on this device.',
      recoverable: false,
    };
  }
  if (err?.__unsupported || name === 'NotSupportedError' || /not supported/i.test(String(err?.message ?? ''))) {
    return {
      kind: 'unsupported',
      title: 'Live is not supported here',
      message: 'This browser does not support camera capture. Try Safari on iOS or Chrome on Android/desktop.',
      recoverable: false,
    };
  }
  return {
    kind: 'unknown',
    title: 'Could not start the stream',
    message: err?.message || 'Something interrupted the camera. Tap Try again.',
    recoverable: true,
  };
}

/**
 * Adaptive camera hook: profiles network + hardware and picks safe capture
 * constraints so low-end devices never overheat. Guarantees full track teardown.
 * iOS/Safari safe: exact constraints are avoided and a progressively simpler
 * constraint ladder is attempted before surfacing an error.
 */
export const useAdaptiveCamera = ({ autoStart = true }: AdaptiveStreamOptions = {}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<AdaptiveCameraError | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [networkType, setNetworkType] = useState<AdaptiveNetworkType>('high');
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const getConstraintLadder = useCallback((): { ladder: MediaStreamConstraints[]; tier: AdaptiveNetworkType } => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const cores = navigator.hardwareConcurrency || 4;
    const ios = isIOS();

    const isFastNetwork = connection
      ? (connection.downlink >= 5 || connection.type === 'wifi') && connection.saveData !== true
      : true;
    // iOS throttles aggressively above 720p in the browser, so treat it as lite.
    const isCapableDevice = cores >= 4 && !ios;
    const tier: AdaptiveNetworkType = isFastNetwork && isCapableDevice ? 'high' : 'lite';

    const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true };
    const hd: MediaStreamConstraints = {
      video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 }, frameRate: { ideal: 30, max: 30 } },
      audio,
    };
    const lite: MediaStreamConstraints = {
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 24, max: 24 } },
      audio,
    };
    // Last resorts: bare video+audio, then video only (some iPads deny mic first).
    const ladder = tier === 'high'
      ? [hd, lite, { video: { facingMode: 'user' }, audio: true }, { video: true, audio: false }]
      : [lite, { video: { facingMode: 'user' }, audio: true }, { video: true, audio: false }];

    return { ladder, tier };
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
    setIsStarting(true);
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        const e: any = new Error('unsupported');
        if (typeof window !== 'undefined' && !window.isSecureContext) e.__insecure = true;
        else e.__unsupported = true;
        throw e;
      }

      const { ladder, tier } = getConstraintLadder();
      let mediaStream: MediaStream | null = null;
      let lastErr: any = null;

      for (const constraints of ladder) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err: any) {
          lastErr = err;
          // A denied permission will never be fixed by relaxing constraints.
          if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break;
        }
      }

      if (!mediaStream) throw lastErr ?? new Error('Unable to access camera');

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setNetworkType(tier);
      setStream(mediaStream);
      setIsLive(true);
    } catch (err: any) {
      console.warn('[useAdaptiveCamera] stream initialization failed:', err?.name ?? err);
      if (!mountedRef.current) return;
      setError(describeError(err));
      setIsLive(false);
    } finally {
      if (mountedRef.current) setIsStarting(false);
    }
  }, [getConstraintLadder]);

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

  return { stream, isLive, isStarting, error, networkType, startStream, stopStream };
};

export default useAdaptiveCamera;
