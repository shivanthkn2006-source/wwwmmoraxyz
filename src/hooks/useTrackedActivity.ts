import { useCallback, useEffect, useRef, useState } from "react";
import { earnKarma, type ActivityKind } from "@/lib/karma";

/** Metres of real GPS movement per karma unit; workout uses phone motion minutes instead. */
const METRES_PER_UNIT: Partial<Record<ActivityKind, number>> = {
  walking: 100, running: 200, cycling: 400, riding: 800,
};
const MAX_SPEED: Partial<Record<ActivityKind, number>> = { walking: 3, running: 7, cycling: 15, riding: 45 }; // m/s

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.latitude - a.latitude), dLon = toR(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.latitude)) * Math.cos(toR(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tracks a real activity with GPS (or phone motion for workouts) and pays karma on stop. */
export function useTrackedActivity() {
  const [active, setActive] = useState<ActivityKind | null>(null);
  const [progress, setProgress] = useState(0); // metres or motion-minutes
  const watchId = useRef<number | null>(null);
  const last = useRef<GeolocationPosition | null>(null);
  const motionSecs = useRef(0);
  const motionHandler = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const motionTick = useRef<number | null>(null);
  const moving = useRef(false);

  const cleanup = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; last.current = null;
    if (motionHandler.current) window.removeEventListener("devicemotion", motionHandler.current);
    motionHandler.current = null;
    if (motionTick.current) clearInterval(motionTick.current);
    motionTick.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback((kind: ActivityKind): string | null => {
    cleanup(); setProgress(0); motionSecs.current = 0;
    if (kind === "workout") {
      if (typeof DeviceMotionEvent === "undefined") return "This device has no motion sensor";
      const req = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
      if (req) void req().catch(() => undefined);
      motionHandler.current = (e) => {
        const a = e.acceleration;
        if (a && Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) > 2.5) moving.current = true;
      };
      window.addEventListener("devicemotion", motionHandler.current);
      motionTick.current = window.setInterval(() => {
        if (moving.current) { motionSecs.current += 5; setProgress(Math.floor(motionSecs.current / 60)); }
        moving.current = false;
      }, 5000);
    } else {
      if (!("geolocation" in navigator)) return "Location isn't available on this device";
      watchId.current = navigator.geolocation.watchPosition((pos) => {
        if (pos.coords.accuracy > 50) return;
        const prev = last.current; last.current = pos;
        if (!prev) return;
        const d = haversine(prev.coords, pos.coords);
        const secs = (pos.timestamp - prev.timestamp) / 1000;
        if (secs <= 0 || d / secs > (MAX_SPEED[kind] ?? 10)) return; // ignore GPS jumps / wrong activity
        setProgress((p) => p + d);
      }, undefined, { enableHighAccuracy: true, maximumAge: 0 });
    }
    setActive(kind);
    return null;
  }, [cleanup]);

  const stop = useCallback(async (): Promise<number> => {
    const kind = active; cleanup(); setActive(null);
    if (!kind) return 0;
    const units = kind === "workout" ? progress : Math.floor(progress / (METRES_PER_UNIT[kind] ?? 100));
    setProgress(0);
    return units > 0 ? earnKarma(kind, units) : 0;
  }, [active, progress, cleanup]);

  return { active, progress, start, stop };
}
