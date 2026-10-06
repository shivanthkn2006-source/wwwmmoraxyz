/**
 * Live VR World card for the Zoe and DHF dashboards: street, nearby places,
 * friend trails (live while VR World runs, last snapshot otherwise) and top players.
 */
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getAmbientContext, onAmbientContextChange } from '@/services/zoe-agent/ambientContext';
import { refreshTopPlayersForZoe } from '@/worlds/realmap/ZoeStreetAwareness';

const SNAP = 'vr-live-snapshot';
type Snap = { at: number; location: string | null; extras: Record<string, string> };
const read = (): Snap | null => { try { return JSON.parse(localStorage.getItem(SNAP) || 'null'); } catch { return null; } };

const build = (): Snap | null => {
  const c = getAmbientContext();
  const vrKeys = Object.keys(c.extras).filter((k) => k.startsWith('VR '));
  if (!c.activeVRLocation && !vrKeys.length) return null;
  return { at: Date.now(), location: c.activeVRLocation, extras: Object.fromEntries(vrKeys.map((k) => [k, c.extras[k]])) };
};

export const VRLiveCard: React.FC = () => {
  const [snap, setSnap] = useState<Snap | null>(() => build() ?? read());
  useEffect(() => {
    void refreshTopPlayersForZoe().catch(() => {});
    const off = onAmbientContextChange(() => {
      const s = build();
      if (s) { setSnap((p) => ({ ...p, ...s, extras: { ...(p?.extras ?? {}), ...s.extras } })); try { localStorage.setItem(SNAP, JSON.stringify(s)); } catch { /* */ } }
    });
    const t = setInterval(() => void refreshTopPlayersForZoe().catch(() => {}), 60_000);
    return () => { off(); clearInterval(t); };
  }, []);
  const live = !!getAmbientContext().activeVRLocation;
  const row = (label: string, v?: string | null) => (
    <div className="text-sm"><span className="text-muted-foreground">{label}: </span><span className="text-foreground">{v || '—'}</span></div>
  );
  return (
    <Card className="p-4 space-y-1.5" data-testid="vr-live-card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">VR World live</h2>
        <span className="text-xs text-muted-foreground">{live ? 'Live' : snap ? `Last seen ${new Date(snap.at).toLocaleTimeString()}` : 'Open VR World to start'}</span>
      </div>
      {row('Street', snap?.location)}
      {row('Nearby places', snap?.extras['VR nearby places'])}
      {row('Friends & trails', snap?.extras['VR friends nearby'])}
      {row('Top players', snap?.extras['VR top players'])}
      {row('My rank', snap?.extras['VR my rank'])}
    </Card>
  );
};
export default VRLiveCard;
