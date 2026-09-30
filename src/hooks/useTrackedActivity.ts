import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type ActivityKind } from "@/lib/karma";

export type ActivityResult = { karma: number; distanceM: number; steps: number; paceMinPerKm: number | null; minutes: number };

/** Metres of real GPS movement per karma unit; workout uses phone motion minutes instead. */
const METRES_PER_UNIT: Partial<Record<ActivityKind, number>> = {
  walking: 100, running: 200, cycling: 400, riding: 800,
};
/** Real steps per karma unit (walking/running must match both GPS distance and steps). */
const STEPS_PER_UNIT: Partial<Record<ActivityKind, number>> = { walking: 130, running: 220 };
const MAX_SPEED: Partial<Record<ActivityKind, number>> = { walking: 3, running: 7, cycling: 15, riding: 45 }; // m/s

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.latitude - a.latitude), dLon = toR(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.latitude)) * Math.cos(toR(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function askMotion() {
  const req = (globalThis.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> } | undefined)?.requestPermission;
  if (!req) return true;
  try { return (await req()) === "granted"; } catch { return false; }
}

function askGps(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve("Location isn't available on this device");
    navigator.geolocation.getCurrentPosition(
      () => resolve(null),
      (e) => resolve(e.code === e.PERMISSION_DENIED
        ? "Location permission is off. Turn it on in your browser settings to earn from real movement."
        : "Couldn't get your location. Try outdoors."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

/** Tracks a real activity with GPS + step counting (or phone motion for workouts) and pays karma on stop. */
export function useTrackedActivity() {
  const [active, setActive] = useState<ActivityKind | null>(null);
  const [progress, setProgress] = useState(0); // metres or motion-minutes
  const [steps, setSteps] = useState(0);
  const watchId = useRef<number | null>(null);
  const last = useRef<GeolocationPosition | null>(null);
  const motionSecs = useRef(0);
  const motionHandler = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const motionTick = useRef<number | null>(null);
  const moving = useRef(false);
  const stepState = useRef({ above: false, lastStep: 0 });
  const startedAt = useRef<Date | null>(null);

  const cleanup = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; last.current = null;
    if (motionHandler.current) window.removeEventListener("devicemotion", motionHandler.current);
    motionHandler.current = null;
    if (motionTick.current) clearInterval(motionTick.current);
    motionTick.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (kind: ActivityKind): Promise<string | null> => {
    cleanup(); setProgress(0); setSteps(0); motionSecs.current = 0;
    if (typeof DeviceMotionEvent === "undefined" && (kind === "workout" || STEPS_PER_UNIT[kind])) {
      return "This device has no motion sensor for step counting";
    }
    if (kind === "workout" || STEPS_PER_UNIT[kind]) {
      if (!(await askMotion())) return "Motion permission is off. Allow it to count your steps.";
    }
    if (kind === "workout") {
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
      const gpsErr = await askGps();
      if (gpsErr) return gpsErr;
      if (STEPS_PER_UNIT[kind]) {
        // Simple pedometer: count peaks of total acceleration, at most ~4 steps/second.
        motionHandler.current = (e) => {
          const a = e.accelerationIncludingGravity;
          if (!a) return;
          const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
          const s = stepState.current, now = performance.now();
          if (!s.above && mag > 11.5 && now - s.lastStep > 250) { s.above = true; s.lastStep = now; setSteps((n) => n + 1); }
          else if (s.above && mag < 9.5) s.above = false;
        };
        window.addEventListener("devicemotion", motionHandler.current);
      }
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
    startedAt.current = new Date();
    setActive(kind);
    return null;
  }, [cleanup]);

  const stop = useCallback(async (): Promise<ActivityResult | null> => {
    const kind = active; cleanup(); setActive(null);
    const started = startedAt.current; startedAt.current = null;
    if (!kind || !started) return null;
    let units = kind === "workout" ? progress : Math.floor(progress / (METRES_PER_UNIT[kind] ?? 100));
    const spu = STEPS_PER_UNIT[kind];
    if (spu) units = Math.min(units, Math.floor(steps / spu)); // distance AND steps must both be real
    const distanceM = kind === "workout" ? 0 : progress;
    const finished = new Date();
    const minutes = (finished.getTime() - started.getTime()) / 60000;
    setProgress(0); setSteps(0);
    if (minutes < 0.05) return { karma: 0, distanceM, steps, paceMinPerKm: null, minutes };
    const { data, error } = await supabase.rpc("record_activity_session" as never, {
      p_kind: kind, p_started: started.toISOString(), p_finished: finished.toISOString(),
      p_distance_m: Math.round(distanceM), p_steps: steps, p_units: Math.max(0, units),
    } as never);
    const r = (data ?? {}) as { karma?: number; pace?: number | null };
    if (!error && (r.karma ?? 0) > 0) window.dispatchEvent(new CustomEvent("karma-changed"));
    return { karma: error ? 0 : Number(r.karma) || 0, distanceM, steps, paceMinPerKm: r.pace ?? null, minutes };
  }, [active, progress, steps, cleanup]);

  return { active, progress, steps, start, stop };
}
