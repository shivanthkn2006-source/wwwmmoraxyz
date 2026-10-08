/**
 * Map panel (VR menu → Map): where you are, which world, how many map blocks
 * around you are loaded, and a one-tap world check with real numbers only.
 */
import React, { useState } from 'react';
import { useWorldState } from '@/worlds/worldMode';
import { loaderStats } from '@/worlds/realmap/osm';
import { useJourney, journeyLabel } from '@/worlds/journeyQuest';

type Report = { geometries: number; textures: number; calls: number; heapMB: number | null };

export const RealMapStatus: React.FC = () => {
  const w = useWorldState();
  const journey = useJourney();
  const [report, setReport] = useState<Report | null>(null);

  const runCheck = () => {
    const s = (window as unknown as { __vrStats?: { geometries?: number; textures?: number; calls?: number } }).__vrStats ?? {};
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    setReport({
      geometries: s.geometries ?? 0, textures: s.textures ?? 0, calls: s.calls ?? 0,
      heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    });
  };

  const where = w.origin.status === 'locating' ? 'Finding your location…'
    : w.origin.status === 'pick' ? 'Location is off — pick a city to start'
    : w.origin.real ? `${w.origin.origin.lat.toFixed(4)}, ${w.origin.origin.lng.toFixed(4)}`
    : `Starting city: ${w.origin.label ?? 'chosen city'}`;

  return (
    <div className="fixed top-14 left-3 z-[9997] w-60 surface-warm-tan rounded-2xl p-3 text-[11px] text-white space-y-1" data-exclude-phantom-tap>
      <div className="font-semibold">{w.mode === 'real' ? 'Your street' : "M'Mora Village"}</div>
      <div>📍 {where}</div>
      {w.mode === 'real' && <div>Map blocks: {w.chunksLoaded} / {w.chunksWanted}</div>}
      <div>Saved on phone: {loaderStats.cacheHits} · Shared: {loaderStats.shared} · Downloaded: {loaderStats.network} · Failed: {loaderStats.failures}</div>
      <div>🧭 {journeyLabel(journey)}</div>
      <div>Doorway trips: {w.portalTrips}</div>
      <button type="button" onClick={runCheck} className="underline">Run world check</button>
      {report && (
        <div className="pt-1">
          Shapes {report.geometries} · Textures {report.textures} · Draw calls {report.calls}
          {report.heapMB !== null ? ` · Memory ${report.heapMB} MB` : ' · Memory —'}
        </div>
      )}
      <div className="opacity-80 pt-1">Map data © OpenStreetMap contributors</div>
    </div>
  );
};

export default RealMapStatus;
