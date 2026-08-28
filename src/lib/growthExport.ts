/**
 * Self-service export of a member's growth data: preferences, delivered
 * insights, saved bookmarks and card analytics.
 *
 * Everything is read under the member's own session, so row-level security
 * guarantees an export can only ever contain that member's rows. The file is
 * built in the browser and downloaded through a blob URL — no server round trip
 * and no temporary public link.
 */
import { supabase } from '@/integrations/supabase/client';

export type GrowthExportFormat = 'json' | 'csv';

export interface GrowthExportBundle {
  exported_at: string;
  user_id: string;
  preferences: Record<string, unknown> | null;
  insights: Array<Record<string, unknown>>;
  saved_item_ids: string[];
  events: Array<Record<string, unknown>>;
}

export async function collectGrowthExport(userId: string): Promise<GrowthExportBundle> {
  const [prefRes, itemRes, savedRes, eventRes] = await Promise.all([
    supabase.from('growth_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('growth_feed_items')
      .select('id, local_date, slot, title, category, content, actionable_step, status, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('growth_saved_items').select('item_id').eq('user_id', userId).limit(1000),
    supabase
      .from('growth_card_events')
      .select('item_id, slot, category, event_type, surface, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const prefs = (prefRes.data as Record<string, unknown> | null) ?? null;
  if (prefs) delete prefs.push_subscription; // device token is not user-facing data

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    preferences: prefs,
    insights: (itemRes.data as Array<Record<string, unknown>> | null) ?? [],
    saved_item_ids: ((savedRes.data as Array<{ item_id: string }> | null) ?? []).map((r) => r.item_id),
    events: (eventRes.data as Array<Record<string, unknown>> | null) ?? [],
  };
}

/** RFC 4180 quoting, with a leading apostrophe guard against formula injection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = Array.isArray(value) ? value.join('; ') : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const head = cols.map(csvCell).join(',');
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
}

/** Flattens the bundle into one CSV with a `record_type` discriminator column. */
export function bundleToCsv(bundle: GrowthExportBundle): string {
  const savedSet = new Set(bundle.saved_item_ids);
  const rows: Array<Record<string, unknown>> = [];

  if (bundle.preferences) {
    rows.push({ record_type: 'preference', ...bundle.preferences });
  }
  bundle.insights.forEach((i) => {
    rows.push({ record_type: 'insight', saved: savedSet.has(String(i.id)), ...i });
  });
  bundle.events.forEach((e) => rows.push({ record_type: 'event', ...e }));

  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return toCsv(rows, ['record_type', ...cols.filter((c) => c !== 'record_type')]);
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export async function exportGrowthData(userId: string, format: GrowthExportFormat) {
  const bundle = await collectGrowthExport(userId);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    downloadBlob(bundleToCsv(bundle), `growth-engine-${stamp}.csv`, 'text/csv');
  } else {
    downloadBlob(JSON.stringify(bundle, null, 2), `growth-engine-${stamp}.json`, 'application/json');
  }
  return {
    insights: bundle.insights.length,
    events: bundle.events.length,
    saved: bundle.saved_item_ids.length,
  };
}
