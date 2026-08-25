/**
 * Structured tracing for the M'Mora Zoe alignment overlay.
 *
 * Every read logs the exact inputs that decide which card a member sees —
 * timezone, local clock, target_date, computed slot and the chosen row id —
 * so a "wrong prompt" report can be traced in one glance at the console.
 * Also keeps the last 20 traces in memory for the on-screen indicator.
 */
import { deviceTimeZone, localClock, localDateKey, currentSlot } from './astroSlot';

export interface AstroTrace {
  at: string;
  source: string;
  timezone: string;
  local_time: string;
  target_date: string;
  computed_slot: string;
  selected_slot?: string | null;
  selected_row_id?: string | null;
  rows_returned?: number;
  note?: string;
}

const buffer: AstroTrace[] = [];

export function astroTrace(
  source: string,
  extra: Partial<AstroTrace> = {},
  now: Date = new Date(),
): AstroTrace {
  const tz = extra.timezone ?? deviceTimeZone();
  const trace: AstroTrace = {
    at: now.toISOString(),
    source,
    timezone: tz,
    local_time: localClock(now, tz),
    target_date: extra.target_date ?? localDateKey(now, tz),
    computed_slot: extra.computed_slot ?? currentSlot(now, tz),
    ...extra,
  };
  buffer.push(trace);
  if (buffer.length > 20) buffer.shift();
  // eslint-disable-next-line no-console
  console.info('[AstroSlot]', JSON.stringify(trace));
  return trace;
}

export function astroTraces(): AstroTrace[] {
  return [...buffer];
}
