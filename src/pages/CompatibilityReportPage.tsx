import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  CompatEvent,
  CompatFeatureId,
  clearCompatEvents,
  detectDeviceProfile,
  getCompatEvents,
  subscribeCompatEvents,
} from '@/lib/runtimeCompatibility';
import { getMediaTrackSnapshot } from '@/lib/mediaTrackRegistry';

interface FeatureRow {
  id: CompatFeatureId;
  label: string;
  description: string;
}

const FEATURES: FeatureRow[] = [
  { id: 'live-stream', label: "M'Mora Live", description: 'Full-screen live view, adaptive camera capture' },
  { id: 'dock-badges', label: 'Home dock badges', description: 'Numeric counts on the glass dock icons' },
  { id: 'dock-badge-boundary', label: 'Badge error boundary', description: 'Isolates badge failures from HomePage' },
  { id: 'camera-indicator', label: 'Camera / mic indicator', description: 'Privacy-sanitised hardware in-use pills' },
  { id: 'media-teardown', label: 'Media track teardown', description: 'Camera/mic released on close and tab switch' },
];

const statusTone: Record<string, string> = {
  ok: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  degraded: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  failed: 'border-red-400/40 bg-red-400/10 text-red-200',
  unknown: 'border-white/20 bg-white/5 text-white/60',
};

const timeAgo = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

const CompatibilityReportPage: React.FC = () => {
  const [events, setEvents] = useState<CompatEvent[]>(() => getCompatEvents());
  const [tracks, setTracks] = useState(() => getMediaTrackSnapshot());
  const profile = useMemo(() => detectDeviceProfile(), []);

  useEffect(() => {
    const unsubscribe = subscribeCompatEvents(() => setEvents(getCompatEvents()));
    const timer = window.setInterval(() => {
      setTracks(getMediaTrackSnapshot());
      setEvents(getCompatEvents());
    }, 2000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const byFeature = useMemo(() => {
    const map = new Map<CompatFeatureId, CompatEvent>();
    events.forEach((event) => {
      const current = map.get(event.feature);
      if (!current || event.at >= current.at) map.set(event.feature, event);
    });
    return map;
  }, [events]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground" data-testid="compat-report">
      <Helmet>
        <title>Device Compatibility Report | M'Mora</title>
        <meta
          name="description"
          content="Runtime device and OS compatibility report for M'Mora Live, home dock badges and camera indicators."
        />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Device &amp; OS compatibility report</h1>
          <p className="text-sm text-muted-foreground">
            Live status is derived from this session&apos;s runtime events — no data leaves the device.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This device</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ['OS', profile.os],
              ['Browser', profile.browser],
              ['Device type', profile.deviceType],
              ['Viewport', profile.viewport],
              ['Pixel ratio', String(profile.dpr)],
              ['CPU cores', profile.cores ? String(profile.cores) : 'unknown'],
              ['Touch points', String(profile.touchPoints)],
              ['Secure context', profile.secureContext ? 'yes' : 'no'],
              ['getUserMedia', profile.supportsGetUserMedia ? 'supported' : 'missing'],
              ['Backdrop blur', profile.supportsBackdropFilter ? 'supported' : 'missing'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tested features</h2>
          <ul className="space-y-2" data-testid="compat-feature-list">
            {FEATURES.map((feature) => {
              const last = byFeature.get(feature.id);
              const status = last?.status ?? 'unknown';
              return (
                <li
                  key={feature.id}
                  data-feature={feature.id}
                  data-status={status}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                    {last && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {last.event}
                        {last.detail ? ` — ${last.detail}` : ''} · {timeAgo(last.at)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone[status]}`}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4" data-testid="compat-media">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Camera / mic tracks
          </h2>
          <p className="text-sm" data-live-tracks={tracks.liveTracks}>
            <span className="font-semibold">{tracks.liveTracks}</span> live track(s) · {tracks.acquired} acquired ·{' '}
            {tracks.released} released
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A healthy idle session shows 0 live tracks. Anything above 0 outside a live stream is a hardware leak.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session events</h2>
            <button
              type="button"
              onClick={() => clearCompatEvents()}
              className="rounded-full border border-border px-3 py-1 text-xs"
            >
              Clear
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runtime events recorded yet in this session.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto text-xs">
              {[...events].reverse().map((event, index) => (
                <li key={`${event.at}-${index}`} className="flex items-center justify-between gap-3 border-b border-border/40 py-1">
                  <span className="truncate">
                    <span className="font-medium">{event.feature}</span> · {event.event}
                    {event.detail ? ` — ${event.detail}` : ''}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{timeAgo(event.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default CompatibilityReportPage;
