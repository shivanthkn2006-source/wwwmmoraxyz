/**
 * Search inside VR World (top-left): a plain search icon that slides open a
 * see-through glass type bar to the right; results drop straight down as plain
 * white text. Only VR World things are searched. Choosing a result walks you
 * there (members, streets, buildings, places, relics, M'Mora landmarks), or
 * invites a friend who isn't here yet to the portal.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useMeet } from '../meet/vrMeet';
import { loadFriends, sendPortalInvite, type Friend } from '../meet/vrInvite';
import { mapBlocks, useMapVersion } from '../realmap/mapIndex';
import { useStreetRelics } from '../realmap/streetRelics';
import { toLocal } from '../realmap/geo';
import { useWorldState, RETURN_PORTAL_POS, PORTAL_OFFSET, travelTo, travelHome } from '../worldMode';
import { searchPlaces, PLACE_DEBOUNCE_MS, PLACE_MIN_CHARS, type PlaceHit } from './placeSearch';
import { BEACON_POS } from '../journeyQuest';
import { searchWorld, KIND_LABEL, type WorldResult } from './worldSearch';

const ANIMALS = ['lion', 'tiger', 'bear', 'deer', 'bird', 'elephant', 'wolf', 'rabbit'];
const FOREST = { x: -20, z: -20 };
const LANDMARKS = [
  { id: 'return-door', title: 'Doorway back to my street', x: RETURN_PORTAL_POS[0], z: RETURN_PORTAL_POS[2] },
  { id: 'beacon', title: 'Blue journey beacon', x: BEACON_POS[0], z: BEACON_POS[2] },
  { id: 'forest', title: 'Animal forest', ...FOREST },
  ...ANIMALS.map((a) => ({ id: `animal-${a}`, title: `${a[0].toUpperCase()}${a.slice(1)} (animal)`, ...FOREST })),
];

export const VRWorldSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const meet = useMeet();
  const version = useMapVersion();
  const relics = useStreetRelics();
  const world = useWorldState();

  useEffect(() => { if (open) { inputRef.current?.focus(); if (!friends.length) void loadFriends().then(setFriends).catch(() => {}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => searchWorld(q, {
    members: meet.players, friends,
    blocks: world.mode === 'real' ? mapBlocks().values() : [],
    relics: world.mode === 'real' ? relics : [],
    landmarks: world.mode === 'mmora' ? LANDMARKS : [{ id: 'door', title: "Doorway to M'Mora Village", x: PORTAL_OFFSET[0], z: PORTAL_OFFSET[2] }],
  }), [q, meet.players, friends, version, relics, world.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [places, setPlaces] = useState<PlaceHit[]>([]);
  const [placeState, setPlaceState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(() => {
    if (!open || q.trim().length < PLACE_MIN_CHARS) { setPlaces([]); setPlaceState('idle'); return; }
    const ctl = new AbortController();
    setPlaceState('loading');
    const t = setTimeout(() => {
      searchPlaces(q, ctl.signal).then((p) => { setPlaces(p); setPlaceState('idle'); })
        .catch((e) => { if (!ctl.signal.aborted) { setPlaces([]); setPlaceState('error'); console.warn('[VR search] places', e); } });
    }, PLACE_DEBOUNCE_MS);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open]);
  const cityResults: WorldResult[] = useMemo(() => {
    const list: WorldResult[] = places.map((p) => ({ id: p.id, kind: 'city', title: p.name, detail: p.detail, at: { lat: p.lat, lng: p.lng } }));
    const home = 'back to my location';
    if (q.trim().length >= 2 && (home.includes(q.trim().toLowerCase()) || 'home'.startsWith(q.trim().toLowerCase()))) list.unshift({ id: 'home', kind: 'home', title: 'Back to my location', detail: '' });
    return list;
  }, [places, q]);

  const go = async (r: WorldResult) => {
    if (r.kind === 'home') { travelHome(); setNote('Going back to your location'); setQ(''); setOpen(false); return; }
    if (r.kind === 'city' && r.at && 'lat' in r.at) {
      travelTo({ name: r.title, lat: r.at.lat, lng: r.at.lng });
      setNote(`Going to ${r.title}`); setQ(''); setOpen(false); return;
    }
    if (r.kind === 'friend' && r.userId) {
      setNote('Sending invite…');
      const res = await sendPortalInvite(r.userId);
      setNote(res.ok ? `Invited ${r.title} to the portal` : res.error ?? 'Could not send');
      return;
    }
    if (!r.at) return;
    let x: number, z: number;
    if ('lat' in r.at) {
      if (world.origin.status !== 'ready') return;
      ({ x, z } = toLocal(r.at, world.origin.origin));
    } else ({ x, z } = r.at);
    window.dispatchEvent(new CustomEvent('vr-teleport', { detail: { position: [x + 2, 1.6, z + 2], lockGround: true } }));
    setNote(`Going to ${r.title}`);
    setQ(''); setOpen(false);
  };

  const close = () => { setOpen(false); setQ(''); setNote(null); };

  return (
    <div className="vr-world-search fixed left-3 z-[9995] flex flex-col" data-exclude-phantom-tap data-testid="vr-world-search">
      <div className={`flex items-center ${open ? 'vr-search-bar' : ''}`}>
        <button type="button" aria-label={open ? 'Search VR World' : 'Open VR World search'} onClick={() => (open ? inputRef.current?.focus() : setOpen(true))} className="vr-search-icon">
          <Search className="h-5 w-5" />
        </button>
        {open && (
          <>
            <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setNote(null); }} maxLength={60}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') close(); if (e.key === 'Enter' && (results[0] ?? cityResults[0])) void go(results[0] ?? cityResults[0]); }}
              onKeyUp={(e) => e.stopPropagation()}
              placeholder="Search people, streets, places…" aria-label="Search VR World" className="vr-search-input" />
            <button type="button" aria-label="Close search" onClick={close} className="vr-search-icon"><X className="h-4 w-4" /></button>
          </>
        )}
      </div>
      {open && (q || note) && (
        <ul className="vr-search-results" role="listbox" aria-label="VR World results">
          {note && <li className="vr-search-note">{note}</li>}
          {q && !results.length && !cityResults.length && placeState !== 'loading' && <li className="vr-search-note">Nothing in VR World matches “{q}”</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => void go(r)} className="vr-search-result">
                <span className="vr-search-title">{r.title}</span>
                <span className="vr-search-detail">{KIND_LABEL[r.kind]}{r.detail ? ` · ${r.detail}` : ''}</span>
              </button>
            </li>
          ))}
          {(cityResults.length > 0 || placeState !== 'idle') && <li className="vr-search-note">Cities and places</li>}
          {placeState === 'loading' && <li className="vr-search-note">Searching the map…</li>}
          {placeState === 'error' && <li className="vr-search-note">Place search is busy, try again in a moment</li>}
          {cityResults.map((r) => (
            <li key={r.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => void go(r)} className="vr-search-result">
                <span className="vr-search-title">{r.title}</span>
                <span className="vr-search-detail">{KIND_LABEL[r.kind]}{r.detail ? ` · ${r.detail}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default VRWorldSearch;
