import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logMusicEvent } from '@/features/music/musicDiagnostics';

interface TrackArtworkProps {
  /** Current album art link (may be an expiring private upload link). */
  src?: string | null;
  /** Upload row id, so an expired private art link can be re-signed. */
  uploadId?: string;
  /** Track id — `upload:<id>` also identifies an upload. */
  trackId?: string;
  alt?: string;
  className?: string;
  lazy?: boolean;
  /** Shown while art is unavailable, retrying, or permanently missing. */
  fallback: React.ReactNode;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700;

function uploadIdOf(props: TrackArtworkProps): string | undefined {
  if (props.uploadId) return props.uploadId;
  if (props.trackId?.startsWith('upload:')) return props.trackId.slice('upload:'.length);
  return undefined;
}

/**
 * Album art that keeps trying: a failed load is retried with a cache-busted
 * link, private uploads get a freshly signed link, and anything that fails while
 * offline is retried automatically as soon as the connection returns.
 */
const TrackArtwork: React.FC<TrackArtworkProps> = (props) => {
  const { src, alt = '', className, lazy = true, fallback } = props;
  const [current, setCurrent] = useState<string | null>(src ?? null);
  const [failed, setFailed] = useState(false);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upload = uploadIdOf(props);

  useEffect(() => {
    attempts.current = 0;
    setFailed(false);
    setCurrent(src ?? null);
  }, [src]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const retry = useCallback(async () => {
    attempts.current += 1;
    if (upload) {
      try {
        const { refreshUploadTrack } = await import('@/features/music/musicUploads');
        const fresh = await refreshUploadTrack({ id: `upload:${upload}`, uploadId: upload, title: '', artist: '', url: '' } as never);
        if (fresh?.artwork) { setCurrent(fresh.artwork); setFailed(false); return; }
        logMusicEvent('artwork:resign', 'No fresh album art link was returned.', { uploadId: upload });
      } catch (error) {
        logMusicEvent('artwork:resign', error, { uploadId: upload });
      }
    }
    if (src) {
      const separator = src.includes('?') ? '&' : '?';
      setCurrent(`${src}${separator}artretry=${attempts.current}`);
      setFailed(false);
      return;
    }
    setFailed(true);
  }, [src, upload]);

  const scheduleRetry = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void retry(); }, RETRY_DELAY_MS * attempts.current || RETRY_DELAY_MS);
  }, [retry]);

  const handleError = useCallback(() => {
    logMusicEvent('artwork:load', 'Album art did not load.', { uploadId: upload, attempt: attempts.current + 1 });
    setFailed(true);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return; // the online listener retries
    if (attempts.current + 1 >= MAX_ATTEMPTS) return;
    scheduleRetry();
  }, [scheduleRetry, upload]);

  useEffect(() => {
    if (!failed || typeof window === 'undefined') return;
    const onOnline = () => { attempts.current = 0; void retry(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [failed, retry]);

  if (!current || failed) return <>{fallback}</>;
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      onError={handleError}
      onLoad={() => setFailed(false)}
    />
  );
};

export default TrackArtwork;
