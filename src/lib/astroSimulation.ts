/**
 * Dev-only timezone / clock simulation for the M'Mora Zoe alignment overlay.
 *
 * Lets an engineer verify slot selection for any IANA zone and wall-clock
 * time WITHOUT touching the machine's system clock. The override is stored in
 * sessionStorage and is a hard no-op in production builds, so a released app
 * can never resolve a simulated slot.
 */

export interface AstroSimulation {
  /** IANA zone to pretend the device is in. */
  timeZone: string;
  /** Local wall clock to pretend it is, as HH:MM in that zone. */
  clock: string;
  /** Local calendar date to pretend it is, as YYYY-MM-DD in that zone. */
  date: string;
}

const KEY = 'astro_sim_override_v1';

export const SIMULATION_ENABLED = Boolean(
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV,
);

export const SIMULATION_ZONES = [
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Kiritimati',
  'UTC',
];

const listeners = new Set<() => void>();
let cached: AstroSimulation | null | undefined;

/** Current override, or null when simulation is off / unavailable. */
export function getSimulation(): AstroSimulation | null {
  if (!SIMULATION_ENABLED) return null;
  if (cached !== undefined) return cached;
  try {
    const raw = sessionStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as AstroSimulation) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function setSimulation(sim: AstroSimulation | null): void {
  if (!SIMULATION_ENABLED) return;
  cached = sim;
  try {
    if (sim) sessionStorage.setItem(KEY, JSON.stringify(sim));
    else sessionStorage.removeItem(KEY);
  } catch { /* private mode */ }
  listeners.forEach((l) => l());
}

export function subscribeSimulation(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Simulated zone, if any. */
export function simulatedTimeZone(): string | null {
  return getSimulation()?.timeZone ?? null;
}

/**
 * The `Date` that corresponds to the simulated local date+clock in the
 * simulated zone. Resolved by probing the real offset of that zone at the
 * candidate instant, so DST is honoured rather than approximated.
 */
export function simulatedNow(): Date | null {
  const sim = getSimulation();
  if (!sim) return null;
  const [y, mo, d] = sim.date.split('-').map(Number);
  const [h, mi] = sim.clock.split(':').map(Number);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null;
  const asUtc = Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0);
  // Two passes converge even across a DST boundary.
  let guess = new Date(asUtc);
  for (let i = 0; i < 2; i++) {
    const offset = zoneOffsetMs(guess, sim.timeZone);
    guess = new Date(asUtc - offset);
  }
  return guess;
}

/** Offset of `timeZone` from UTC at instant `d`, in milliseconds. */
function zoneOffsetMs(d: Date, timeZone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p: Record<string, number> = {};
    for (const part of fmt.formatToParts(d)) {
      if (part.type !== 'literal') p[part.type] = Number(part.value);
    }
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
    return asUtc - d.getTime();
  } catch {
    return 0;
  }
}
