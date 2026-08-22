/**
 * MediaStream leak registry.
 *
 * Wraps `navigator.mediaDevices.getUserMedia` once, at app start, and keeps a
 * live count of tracks that have not been stopped yet. Nothing about capture
 * behaviour changes — this is a pure observability layer used by the
 * compatibility report page and the Playwright leak checks.
 */

export interface MediaTrackSnapshot {
  /** Tracks handed out by getUserMedia that are still not `ended`. */
  liveTracks: number;
  /** Live tracks by kind (video/audio). */
  byKind: Record<string, number>;
  /** Total tracks ever acquired in this session. */
  acquired: number;
  /** Total tracks observed as stopped/ended. */
  released: number;
  lastAcquiredAt: number | null;
  lastReleasedAt: number | null;
}

interface Entry {
  track: MediaStreamTrack;
  acquiredAt: number;
}

const entries = new Set<Entry>();
let acquired = 0;
let released = 0;
let lastAcquiredAt: number | null = null;
let lastReleasedAt: number | null = null;
let installed = false;

const prune = () => {
  entries.forEach((entry) => {
    if (entry.track.readyState === 'ended') {
      entries.delete(entry);
      released += 1;
      lastReleasedAt = Date.now();
    }
  });
};

export const getMediaTrackSnapshot = (): MediaTrackSnapshot => {
  prune();
  const byKind: Record<string, number> = {};
  entries.forEach(({ track }) => {
    byKind[track.kind] = (byKind[track.kind] ?? 0) + 1;
  });
  return {
    liveTracks: entries.size,
    byKind,
    acquired,
    released,
    lastAcquiredAt,
    lastReleasedAt,
  };
};

const registerTrack = (track: MediaStreamTrack) => {
  const entry: Entry = { track, acquiredAt: Date.now() };
  entries.add(entry);
  acquired += 1;
  lastAcquiredAt = entry.acquiredAt;

  const finish = () => {
    if (!entries.has(entry)) return;
    entries.delete(entry);
    released += 1;
    lastReleasedAt = Date.now();
  };

  track.addEventListener('ended', finish);
  // `stop()` does not fire `ended` on most browsers — patch the instance.
  const originalStop = track.stop.bind(track);
  track.stop = () => {
    try {
      originalStop();
    } finally {
      finish();
    }
  };
};

/** Idempotent. Safe to call on every app boot. */
export const installMediaTrackRegistry = () => {
  if (installed || typeof navigator === 'undefined') return;
  const devices = navigator.mediaDevices;
  if (!devices?.getUserMedia) return;
  installed = true;

  const original = devices.getUserMedia.bind(devices);
  devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    const stream = await original(constraints);
    try {
      stream.getTracks().forEach(registerTrack);
    } catch {
      /* observability must never break capture */
    }
    return stream;
  };

  try {
    (window as unknown as Record<string, unknown>).__mmoraMediaTracks = getMediaTrackSnapshot;
  } catch {
    /* noop */
  }
};

export default installMediaTrackRegistry;
