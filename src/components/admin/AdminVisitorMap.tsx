// OpenStreetMap world map of visitors: online now (green, labelled) and earlier in the period (tan); pins carry every recorded detail.
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = {
  key: string; lat: number; lon: number; name: string; userId: string | null; online: boolean; approx: boolean;
  details: [string, string][];
};

function Controls({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const fitAll = () => { if (points.length) map.fitBounds(points.map((p) => [p.lat, p.lon] as [number, number]), { padding: [40, 40], maxZoom: 11 }); };
  useEffect(() => { fitAll(); /* first fit only */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length > 0]);
  const btn = 'rounded bg-background/90 px-2 py-1 text-xs font-medium shadow';
  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control m-2 flex flex-col gap-1">
        <button type="button" className={btn} onClick={() => map.setView([20, 10], 2)}>World</button>
        <button type="button" className={btn} onClick={fitAll}>All pins</button>
        <button type="button" className={btn} onClick={() => map.setZoom(11)}>City level</button>
      </div>
    </div>
  );
}

export default function AdminVisitorMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="h-[24rem] w-full overflow-hidden rounded-md sm:h-[30rem]">
      <MapContainer center={[20, 10]} zoom={2} minZoom={1} maxZoom={18} zoomControl worldCopyJump scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Controls points={points} />
        {points.map((p) => (
          <CircleMarker key={p.key} center={[p.lat, p.lon]} radius={p.online ? 9 : 6}
            eventHandlers={{ click: (e) => e.target._map.setView([p.lat, p.lon], Math.max(e.target._map.getZoom(), 11)) }}
            pathOptions={{ color: p.online ? 'hsl(142 70% 30%)' : 'hsl(30 40% 40%)', fillColor: p.online ? 'hsl(142 70% 45%)' : 'hsl(30 45% 60%)', fillOpacity: p.online ? 0.85 : 0.5, weight: 2, dashArray: p.approx ? '3 3' : undefined }}>
            <Tooltip permanent={p.online} direction="top" offset={[0, -8]}>{p.name}{p.userId ? ` · ${p.userId.slice(0, 8)}` : ''}</Tooltip>
            <Popup maxWidth={320}>
              <div className="text-xs leading-5">
                <b>{p.name}</b> {p.online ? '· online now' : '· seen earlier'}
                <table className="mt-1"><tbody>
                  {p.details.map(([k, v]) => (
                    <tr key={k}><td className="pr-2 align-top opacity-70">{k}</td><td className="break-all">{v}</td></tr>
                  ))}
                </tbody></table>
                {p.approx && <p className="mt-1 opacity-70">Position is the city centre (exact point not recorded for this visit).</p>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
