// OpenStreetMap world map of visitors. Pin colour = status (green online, yellow idle, red left); pins carry every recorded detail.
// Pins that would sit on top of each other (same city, or close at the current zoom) are fanned out into a
// readable column, each with its own name label to the right of the dot.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = {
  key: string; lat: number; lon: number; name: string; userId: string | null; online: boolean; approx: boolean;
  status: 'online' | 'idle' | 'offline'; details: [string, string][];
};

const COLORS = {
  online: { stroke: 'hsl(142 70% 28%)', fill: 'hsl(142 72% 45%)', label: 'Online now' },
  idle: { stroke: 'hsl(45 90% 35%)', fill: 'hsl(48 95% 52%)', label: 'Idle' },
  offline: { stroke: 'hsl(0 70% 35%)', fill: 'hsl(0 75% 55%)', label: 'Signed out / left' },
} as const;
const STATUS_ORDER = { online: 0, idle: 1, offline: 2 } as const;
const DEFAULT_CENTER: [number, number] = [20, 10];
const DEFAULT_ZOOM = 2;
/** Pins closer than this many screen pixels are grouped and fanned out. */
const GROUP_PX = 22;
/** Vertical spacing between fanned-out pins in a group. */
const ROW_PX = 22;

type Placed = { p: MapPoint; pos: [number, number] };
type Group = { anchor: [number, number]; items: Placed[] };

function Controls({ points, full, setFull }: { points: MapPoint[]; full: boolean; setFull: (f: boolean) => void }) {
  const map = useMap();
  // Smallest zoom at which the world still fills the whole box (no grey bands on tall or wide screens).
  const fillZoom = () => {
    const { x, y } = map.getSize();
    return Math.max(DEFAULT_ZOOM, Math.ceil(Math.log2(Math.max(x, y) / 256)));
  };
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const z = fillZoom();
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setView(DEFAULT_CENTER, z);
    };
    const t = setTimeout(fit, 150);
    window.addEventListener('resize', fit);
    return () => { clearTimeout(t); window.removeEventListener('resize', fit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, map]);
  const fitAll = () => { if (points.length) map.fitBounds(points.map((p) => [p.lat, p.lon] as [number, number]), { padding: [40, 40], maxZoom: 11 }); };
  const cityLevel = () => {
    const target = [...points].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])[0];
    if (target) map.setView([target.lat, target.lon], 11); else map.setZoom(11);
  };
  const btn = 'rounded bg-background/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow';
  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control m-2 flex flex-col gap-1">
        <button type="button" className={btn} onClick={() => map.setView(DEFAULT_CENTER, fillZoom())}>⟲ Default view</button>
        <button type="button" className={btn} onClick={fitAll}>All pins</button>
        <button type="button" className={btn} onClick={cityLevel}>City level</button>
        <button type="button" className={btn} onClick={() => setFull(!full)}>{full ? '✕ Exit full screen' : '⛶ Full screen'}</button>
      </div>
    </div>
  );
}

/** Groups pins that overlap on screen. A group shows one pin with a count; tap it to open the list of
 *  people as a column below, tap again to fold it back. Single visitors always show their own pin. */
function SpreadPins({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [open, setOpen] = useState<Set<string>>(new Set());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo<(Group & { id: string })[]>(() => {
    const sorted = [...points].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
    const raw: { px: { x: number; y: number }; anchor: [number, number]; pts: MapPoint[] }[] = [];
    for (const p of sorted) {
      const px = map.project([p.lat, p.lon], zoom);
      const g = raw.find((r) => Math.hypot(r.px.x - px.x, r.px.y - px.y) < GROUP_PX);
      if (g) g.pts.push(p);
      else raw.push({ px, anchor: [p.lat, p.lon], pts: [p] });
    }
    return raw.map((r) => {
      const single = r.pts.length === 1;
      return {
        id: r.pts.map((p) => p.key).sort().join('|'),
        anchor: r.anchor,
        items: r.pts.map((p, i) => {
          if (single) return { p, pos: r.anchor };
          const ll = map.unproject([r.px.x, r.px.y + (i + 1) * ROW_PX], zoom);
          return { p, pos: [ll.lat, ll.lng] as [number, number] };
        }),
      };
    });
  }, [points, zoom, map]);

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      {groups.map((g) => g.items.length === 1
        ? <GroupPins key={g.id} group={g} />
        : <ClusterPin key={g.id} group={g} expanded={open.has(g.id)} onToggle={() => toggle(g.id)} />)}
    </>
  );
}

function ClusterPin({ group, expanded, onToggle }: { group: Group; expanded: boolean; onToggle: () => void }) {
  const n = group.items.length;
  const on = group.items.filter((x) => x.p.status === 'online').length;
  const idle = group.items.filter((x) => x.p.status === 'idle').length;
  const c = COLORS[on ? 'online' : idle ? 'idle' : 'offline'];
  const label = `${n} visitors${on ? ` · ${on} online` : ''}${idle ? ` · ${idle} idle` : ''} ${expanded ? '▾ hide' : '▸ show'}`;
  return (
    <>
      <CircleMarker center={group.anchor} radius={11} eventHandlers={{ click: onToggle }}
        pathOptions={{ color: 'hsl(0 0% 12%)', fillColor: c.fill, fillOpacity: 0.95, weight: 3 }}>
        <Tooltip permanent interactive direction="right" offset={[12, 0]} className="mmora-pin-label mmora-pin-cluster"
          eventHandlers={{ click: onToggle } as any}>{label}</Tooltip>
      </CircleMarker>
      {expanded && <GroupPins group={group} />}
    </>
  );
}

function GroupPins({ group }: { group: Group }) {
  const last = group.items[group.items.length - 1].pos;
  return (
    <>
      {group.items.length > 1 && (
        <Polyline positions={[group.anchor, last] as LatLngExpression[]}
          pathOptions={{ color: 'hsl(0 0% 15%)', weight: 1.5, opacity: 0.6, dashArray: '2 3' }} interactive={false} />
      )}
      {group.items.map(({ p, pos }) => {
        const c = COLORS[p.status];
        return (
          <CircleMarker key={p.key} center={pos} radius={p.status === 'online' ? 8 : 7}
            eventHandlers={{ click: (e) => e.target._map.setView([p.lat, p.lon], Math.max(e.target._map.getZoom(), 11)) }}
            pathOptions={{ color: c.stroke, fillColor: c.fill, fillOpacity: 0.95, weight: 2, dashArray: p.approx ? '3 3' : undefined }}>
            <Tooltip permanent direction="right" offset={[9, 0]} className="mmora-pin-label">
              {p.name}{p.userId ? ` · ${p.userId.slice(0, 8)}` : ''}
            </Tooltip>
            <Popup maxWidth={320}>
              <div className="text-xs leading-5">
                <b>{p.name}</b> · {c.label}
                <table className="mt-1"><tbody>
                  {p.details.map(([k, v]) => (
                    <tr key={k}><td className="pr-2 align-top opacity-70">{k}</td><td className="break-all">{v}</td></tr>
                  ))}
                </tbody></table>
                {p.approx && <p className="mt-1 opacity-70">Position is the city centre (exact point not recorded for this visit).</p>}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// White text with a solid dark outline: readable over white land, blue sea and dark map areas alike. No box.
const LABEL_CSS = `.mmora-pin-label{background:transparent;border:0;box-shadow:none;padding:0 2px;font-weight:700;font-size:12px;line-height:14px;color:#fff;white-space:nowrap;
text-shadow:-1px -1px 0 #111,1px -1px 0 #111,-1px 1px 0 #111,1px 1px 0 #111,0 0 3px #000,0 0 5px #000;}
.mmora-pin-label::before{display:none}
.mmora-pin-cluster{cursor:pointer;pointer-events:auto;font-size:13px}`;

export default function AdminVisitorMap({ points }: { points: MapPoint[] }) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [full]);

  const map = (
    <MapContainer key={full ? 'full' : 'inline'} center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} minZoom={2} maxZoom={18} zoomControl scrollWheelZoom
      maxBounds={[[-85, -200], [85, 200]]} maxBoundsViscosity={1} style={{ height: '100%', width: '100%' }}>
      <TileLayer noWrap attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Controls points={points} full={full} setFull={setFull} />
      <SpreadPins points={points} />
    </MapContainer>
  );

  return (
    <>
      <style>{LABEL_CSS}</style>
      {full
        // Rendered on the page body so no parent card can shrink it: the map fills the whole screen.
        ? createPortal(<div className="fixed inset-0 z-[1000] bg-background" style={{ height: '100dvh', width: '100vw' }}>{map}</div>, document.body)
        : <div className="h-[24rem] w-full overflow-hidden rounded-md sm:h-[30rem]">{map}</div>}
    </>
  );
}
