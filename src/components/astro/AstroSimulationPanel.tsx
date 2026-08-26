import React from 'react';
import { FlaskConical } from 'lucide-react';
import {
  SIMULATION_ENABLED, SIMULATION_ZONES, getSimulation, setSimulation, subscribeSimulation,
} from '@/lib/astroSimulation';
import { currentSlot, localClock, localDateKey, deviceTimeZone } from '@/lib/astroSlot';

/**
 * Dev-only overlay control: pretend the device is in another IANA zone at a
 * chosen local time so slot selection can be verified without moving the
 * system clock. Renders nothing at all in production builds.
 */
export const AstroSimulationPanel: React.FC = () => {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => subscribeSimulation(force), []);

  if (!SIMULATION_ENABLED) return null;

  const sim = getSimulation();
  const realTz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
  })();

  const draft = sim ?? {
    timeZone: realTz,
    clock: localClock(new Date(), realTz),
    date: localDateKey(new Date(), realTz),
  };

  const update = (patch: Partial<typeof draft>) => setSimulation({ ...draft, ...patch });

  return (
    <div className="pointer-events-auto mt-3 w-full text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur"
      >
        <FlaskConical className="h-3 w-3" />
        {sim ? `simulating ${sim.timeZone} ${sim.clock}` : 'simulate timezone (dev)'}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-card/90 p-3 text-xs backdrop-blur">
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Zone</span>
            <select
              value={draft.timeZone}
              onChange={(e) => update({ timeZone: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            >
              {[...new Set([realTz, ...SIMULATION_ZONES])].map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Local date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Local time</span>
            <input
              type="time"
              value={draft.clock}
              onChange={(e) => update({ clock: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <div className="flex items-center justify-between pt-1 text-muted-foreground">
            <span>resolved slot</span>
            <span className="text-primary">{currentSlot()}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>device zone</span>
            <span>{deviceTimeZone()}</span>
          </div>
          {sim && (
            <button
              type="button"
              onClick={() => setSimulation(null)}
              className="w-full rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              Stop simulating
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AstroSimulationPanel;
