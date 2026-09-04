/**
 * sharedGeolocation — Single geolocation request shared across all hooks.
 * Caches coordinates so the browser only prompts once.
 * Falls back to New York if geolocation is unavailable (sandbox, denied, etc.)
 */

let cachedCoords: { lat: number; lng: number } | null = null;
let coordsPromise: Promise<{ lat: number; lng: number }> | null = null;
/** Set only when the browser really returned a fix (never the fallback). */
let realCoords: { lat: number; lng: number } | null = null;

export async function getSharedCoords(): Promise<{ lat: number; lng: number }> {
  if (cachedCoords) return cachedCoords;
  if (coordsPromise) return coordsPromise;

  coordsPromise = (async () => {
    try {
      if (!navigator.geolocation) throw new Error('no geolocation');
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 300000,
        })
      );
      cachedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      console.log(`[Geolocation] 📍 ${cachedCoords.lat.toFixed(4)}, ${cachedCoords.lng.toFixed(4)}`);
      return cachedCoords;
    } catch {
      console.warn('[Geolocation] Unavailable — using New York fallback');
      cachedCoords = { lat: 40.7128, lng: -74.0060 };
      return cachedCoords;
    }
  })();
  return coordsPromise;
}

/** Reset cached coords (useful for testing) */
export function resetSharedCoords(): void {
  cachedCoords = null;
  coordsPromise = null;
  realCoords = null;
}

/**
 * Coordinates ONLY when the browser actually granted geolocation.
 * Never prompts and never returns the New York fallback, so Zoe's prompt is
 * either grounded in a real position or carries no position at all.
 */
export async function getGrantedCoords(): Promise<{ lat: number; lng: number } | null> {
  if (realCoords) return realCoords;
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return null;
  } catch {
    return null;
  }
  await getSharedCoords();
  return realCoords;
}