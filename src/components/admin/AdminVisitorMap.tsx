// OpenStreetMap world map of visitors. Pin colour = status (green online, yellow idle, red left); pins carry every recorded detail.
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
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
const DEFAULT_CENTER: [number, number] = [20, 10];
const DEFAULT_ZOOM = 2;

function Controls({ points, full, setFull }: { points: MapPoint[]; full: boolean; setFull: (f: boolean) => void }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 150); return () => clearTimeout(t); }, [full, map]);
  const fitAll = () => { if (points.length) map.fitBounds(points.map((p) => [p.lat, p.lon] as [number, number]), { padding: [40, 40], maxZoom: 11 }); };
  const btn = 'rounded bg-background/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow';
  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control m-2 flex flex-col gap-1">
        <button type="button" className={btn} onClick={() => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}>⟲ Default view</button>
        <button type="button" className={btn} onClick={fitAll}>All pins</button>
        <button type="button" className={btn} onClick={() => map.setZoom(11)}>City level</button>
        <button type="button" className={btn} onClick={() => setFull(!full)}>{full ? '✕ Close full screen' : '⛶ Full screen'}</button>
      </div>
    </div>
  );
}

export default function AdminVisitorMap({ points }: { points: MapPoint[] }) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [full]);
  return (
    <div className={full ? 'fixed inset-0 z-[100] bg-background' : 'h-[24rem] w-full overflow-hidden rounded-md sm:h-[30rem]'}>
      <style>{`.mmora-pin-label{background:transparent;border:0;box-shadow:none;padding:0;font-weight:700;font-size:12px;color:hsl(var(--foreground));text-shadow:0 0 3px hsl(var(--background)),0 0 3px hsl(var(--background));}.mmora-pin-label::before{display:none}`}</style>
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} minZoom={2} maxZoom={18} zoomControl scrollWheelZoom
        maxBounds={[[-85, -200], [85, 200]]} maxBoundsViscosity={1} style={{ height: '100%', width: '100%' }}>
        <TileLayer noWrap attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Controls points={points} full={full} setFull={setFull} />
        {points.map((p) => {
          const c = COLORS[p.status];
          return (
            <CircleMarker key={p.key} center={[p.lat, p.lon]} radius={p.status === 'online' ? 9 : 7}
              eventHandlers={{ click: (e) => e.target._map.setView([p.lat, p.lon], Math.max(e.target._map.getZoom(), 11)) }}
              pathOptions={{ color: c.stroke, fillColor: c.fill, fillOpacity: 0.9, weight: 2, dashArray: p.approx ? '3 3' : undefined }}>
              <Tooltip permanent direction="top" offset={[0, -8]} className="mmora-pin-label">{p.name}{p.userId ? ` · ${p.userId.slice(0, 8)}` : ''}</Tooltip>
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
      </MapContainer>
    </div>
  );
}
