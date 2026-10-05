/**
 * "Cities and places" for VR World search: the free OpenStreetMap place
 * search (Nominatim), called from the member's own phone. Waits for typing to
 * pause, needs 3+ letters, keeps 5 results and remembers answers, so it stays
 * within the free service's fair-use rules.
 */
export type PlaceHit = { id: string; name: string; detail: string; lat: number; lng: number };

const cache = new Map<string, PlaceHit[]>();
export const PLACE_MIN_CHARS = 3;
export const PLACE_DEBOUNCE_MS = 450;

export function mapNominatim(rows: unknown): PlaceHit[] {
  if (!Array.isArray(rows)) return [];
  const out: PlaceHit[] = [];
  for (const r of rows as Array<Record<string, unknown>>) {
    const lat = Number(r.lat), lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const full = String(r.display_name ?? '');
    const parts = full.split(',').map((s) => s.trim()).filter(Boolean);
    const name = String(r.name || parts[0] || 'Place');
    out.push({ id: `c:${r.place_id ?? `${lat},${lng}`}`, name, detail: parts.slice(1, 4).join(', '), lat, lng });
    if (out.length >= 5) break;
  }
  return out;
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const t = q.trim().toLowerCase();
  if (t.length < PLACE_MIN_CHARS) return [];
  const hit = cache.get(t);
  if (hit) return hit;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=en&q=${encodeURIComponent(t)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const list = mapNominatim(await res.json());
  cache.set(t, list);
  return list;
}
