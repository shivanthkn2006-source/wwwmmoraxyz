/** DHF dashboard: each city/place explored in VR World, % of the 150-area goal (one area = a 50 m square walked through). */
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { pullCloud } from '@/lib/vrPickups';

const GOAL = 150;
const read = () => {
  const out: { city: string; n: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('vr-explored:')) continue;
      const n = (JSON.parse(localStorage.getItem(k) || '[]') as unknown[]).length;
      out.push({ city: k.slice('vr-explored:'.length), n });
    }
  } catch { /* */ }
  let portals: Record<string, number> = {};
  try { portals = JSON.parse(localStorage.getItem('vr-portal-visits') || '{}'); } catch { /* */ }
  for (const c of Object.keys(portals)) if (!out.some((r) => r.city === c)) out.push({ city: c, n: 0 });
  return out.map((r) => ({ ...r, portals: portals[r.city] || 0 })).sort((a, b) => b.n - a.n);
};

export const VRCityGoals: React.FC = () => {
  const [rows, setRows] = useState(read);
  useEffect(() => {
    // Account copy first, so every device shows the same progress.
    void pullCloud(true).then(() => setRows(read()));
    const on = () => setRows(read());
    window.addEventListener('vr-explore-changed', on);
    const t = setInterval(on, 3000);
    return () => { clearInterval(t); window.removeEventListener('vr-explore-changed', on); };
  }, []);
  return (
    <Card className="p-4 space-y-3" data-testid="vr-city-goals">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">City goals</h2>
        <span className="text-xs text-muted-foreground">Goal: {GOAL} areas (50 m each) per city</span>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Walk around a city in VR World to start.</p>}
      {rows.map((r) => {
        const pct = Math.min(100, Math.round((r.n / GOAL) * 100));
        return (
          <div key={r.city} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-foreground">{r.city}</span><span className="text-muted-foreground">{pct}% · {Math.min(r.n, GOAL)}/{GOAL} · {r.portals} portal visit{r.portals === 1 ? '' : 's'}{pct >= 100 ? ' · goal reached' : ''}</span></div>
            <Progress value={pct} />
          </div>
        );
      })}
    </Card>
  );
};
export default VRCityGoals;
