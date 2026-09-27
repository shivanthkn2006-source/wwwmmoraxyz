type LatestCardAnnouncement = {
  id: string;
  generatedAt: number;
  announce: () => Promise<boolean>;
};

const candidates = new Map<string, LatestCardAnnouncement>();
const STORAGE_KEY = 'mmora:latest-card-announcement:v1';
let unlocked = false;
let timer: number | null = null;
let running = false;

function lastAnnouncedId(): string | null {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function remember(id: string) {
  try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
}

function schedule() {
  if (!unlocked || running || typeof window === 'undefined') return;
  if (timer !== null) window.clearTimeout(timer);
  // DHF and LOL arrive through separate async feeds. Let both register before
  // selecting one winner, rather than speaking whichever request finishes first.
  timer = window.setTimeout(async () => {
    timer = null;
    const latest = Array.from(candidates.values()).reduce<LatestCardAnnouncement | null>(
      (best, item) => (!best || item.generatedAt > best.generatedAt ? item : best),
      null,
    );
    if (!latest || latest.id === lastAnnouncedId()) return;
    running = true;
    try {
      if (await latest.announce()) remember(latest.id);
    } finally {
      running = false;
    }
  }, 8_500);
}

export function offerLatestCardAnnouncement(candidate: LatestCardAnnouncement) {
  candidates.set(candidate.id, candidate);
  schedule();
}

export function unlockLatestCardAnnouncement() {
  unlocked = true;
  schedule();
}