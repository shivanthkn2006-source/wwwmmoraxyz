// OpenStreetMap world map of visitors: online now (filled) and earlier in the period (faint), labelled with name + user ID.
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = { key: string; lat: number; lon: number; name: string; userId: string | null; place: string; path: string; online: boolean; device: string | null };

export default function AdminVisitorMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="h-[22rem] w-full overflow-hidden rounded-md sm:h-[28rem]">
      <MapContainer center={[20, 10]} zoom={2} minZoom={1} worldCopyJump scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => (
          <CircleMarker key={p.key} center={[p.lat, p.lon]} radius={p.online ? 9 : 5}
            pathOptions={{ color: p.online ? 'hsl(142 70% 35%)' : 'hsl(30 40% 45%)', fillColor: p.online ? 'hsl(142 70% 45%)' : 'hsl(30 40% 60%)', fillOpacity: p.online ? 0.85 : 0.4, weight: 2 }}>
            {p.online && <Tooltip permanent direction="top" offset={[0, -8]}>{p.name}</Tooltip>}
            <Popup>
              <div className="text-xs">
                <b>{p.name}</b>{p.online ? ' · online now' : ''}<br />
                {p.userId ? <>User ID: <code>{p.userId}</code><br /></> : 'Not signed in<br />'}
                {p.place}<br />Page: {p.path}{p.device ? <><br />Device: {p.device}</> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
