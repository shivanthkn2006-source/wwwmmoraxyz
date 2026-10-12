/**
 * Shown when the phone won't share its location: the member picks the city
 * VR World starts in (remembered on this device), or tries their location again.
 * City search uses the free OpenStreetMap place search.
 */
import React, { useState } from 'react';
import { useWorldState, resolveOrigin, chooseStartCity, savedStartCity, type StartCity } from '@/worlds/worldMode';

const CITIES: StartCity[] = [
  { name: 'New York', lat: 40.758, lng: -73.9855 },
  { name: 'London', lat: 51.5079, lng: -0.1283 },
  { name: 'Paris', lat: 48.8584, lng: 2.2945 },
  { name: 'Tokyo', lat: 35.6595, lng: 139.7005 },
  { name: 'Dubai', lat: 25.1972, lng: 55.2744 },
  { name: 'Singapore', lat: 1.2834, lng: 103.8607 },
  { name: 'Mumbai', lat: 18.922, lng: 72.8347 },
  { name: 'Delhi', lat: 28.6315, lng: 77.2167 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Trivandrum', lat: 8.5241, lng: 76.9366 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'San Francisco', lat: 37.7879, lng: -122.4075 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
];

export const RealStartCityPicker: React.FC = () => {
  const w = useWorldState();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<StartCity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (w.mode !== 'real' || w.origin.status !== 'pick') return null;
  const saved = savedStartCity();
  const list = saved ? [saved, ...CITIES.filter((c) => c.name !== saved.name)] : CITIES;

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (text.length < 2 || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(text)}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      const rows = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      setResults(rows.map((x) => ({ name: x.display_name.split(',').slice(0, 2).join(','), lat: parseFloat(x.lat), lng: parseFloat(x.lon) })));
      if (!rows.length) setError('No place found — try another name.');
    } catch {
      setError('Place search is busy right now — pick a city below.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" data-exclude-phantom-tap>
      <div className="w-full max-w-md surface-warm-tan rounded-3xl p-4 text-white space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="text-base font-semibold">Where should VR World start?</div>
        <p className="text-[12px] opacity-90">
          {w.origin.reason === 'denied'
            ? 'Your location is blocked for this site. Allow location in your browser settings and try again, or pick a city.'
            : "We couldn't get your location. Try again, or pick a city."}
        </p>
        <button type="button" onClick={() => resolveOrigin()} className="w-full rounded-full bg-white text-stone-800 py-2 text-sm font-semibold">
          Use my location
        </button>
        <form onSubmit={search} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a city or street"
            className="flex-1 rounded-full bg-white/90 text-stone-800 px-3 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={busy} className="rounded-full px-3 text-sm font-semibold">{busy ? '…' : 'Search'}</button>
        </form>
        {error && <div className="text-[12px]">{error}</div>}
        {results && results.length > 0 && (
          <div className="space-y-1">
            {results.map((c, k) => (
              <button key={k} type="button" onClick={() => chooseStartCity(c)} className="block w-full text-left rounded-xl px-3 py-2 text-sm bg-white/15">
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {list.map((c) => (
            <button key={c.name} type="button" onClick={() => chooseStartCity(c)} className="rounded-xl px-3 py-2 text-sm bg-white/15 text-left">
              {c.name}
            </button>
          ))}
        </div>
        <div className="text-[10px] opacity-75">Map data © OpenStreetMap contributors</div>
      </div>
    </div>
  );
};

export default RealStartCityPicker;
