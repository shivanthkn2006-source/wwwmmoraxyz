/**
 * Real-world ↔ VR-meter maths for the Real Map layer.
 *
 * Chunks are defined in plain latitude/longitude (not in meters from the
 * session origin) so a chunk key is the same for every visit and every
 * member — the on-device cache keeps working even when the player's
 * starting spot moves a few metres between sessions.
 */
export type LatLng = { lat: number; lng: number };
export type BBox = { south: number; west: number; north: number; east: number };

export const M_PER_DEG_LAT = 111_320;
/** ~200 m tall chunks. */
export const CHUNK_DEG_LAT = 0.0018;

/** Longitude step stays fixed per 1° latitude band so keys are stable. */
export function chunkDegLng(lat: number): number {
  const band = Math.round(lat);
  const cos = Math.max(0.05, Math.cos((band * Math.PI) / 180));
  return CHUNK_DEG_LAT / cos;
}

const mPerDegLng = (lat0: number) => M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);

/** VR space: +x = east, −z = north, y = up. Origin = session start point. */
export function toLocal(p: LatLng, origin: LatLng): { x: number; z: number } {
  return {
    x: (p.lng - origin.lng) * mPerDegLng(origin.lat),
    z: -(p.lat - origin.lat) * M_PER_DEG_LAT,
  };
}

export function toLatLng(x: number, z: number, origin: LatLng): LatLng {
  return {
    lat: origin.lat + -z / M_PER_DEG_LAT,
    lng: origin.lng + x / mPerDegLng(origin.lat),
  };
}

export type ChunkId = { i: number; j: number; key: string };

export function chunkOf(p: LatLng, bandLat = p.lat): ChunkId {
  const i = Math.floor(p.lat / CHUNK_DEG_LAT);
  const j = Math.floor(p.lng / chunkDegLng(bandLat));
  return { i, j, key: `${i}_${j}` };
}

export function chunkBBox(i: number, j: number, bandLat: number): BBox {
  const dLng = chunkDegLng(bandLat);
  return {
    south: i * CHUNK_DEG_LAT,
    north: (i + 1) * CHUNK_DEG_LAT,
    west: j * dLng,
    east: (j + 1) * dLng,
  };
}

/** Square ring of chunk ids around (i, j), nearest first. */
export function neighborhood(i: number, j: number, radius: number): ChunkId[] {
  const out: ChunkId[] = [];
  for (let di = -radius; di <= radius; di++) {
    for (let dj = -radius; dj <= radius; dj++) {
      out.push({ i: i + di, j: j + dj, key: `${i + di}_${j + dj}` });
    }
  }
  return out.sort((a, b) =>
    (Math.abs(a.i - i) + Math.abs(a.j - j)) - (Math.abs(b.i - i) + Math.abs(b.j - j)));
}

export function chebyshev(a: { i: number; j: number }, b: { i: number; j: number }) {
  return Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
}
