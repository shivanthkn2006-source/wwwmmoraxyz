/**
 * REAL SENSOR INGESTION INTO THE DHF
 *
 * Honest, browser-real signals only — nothing simulated. Each field is either a
 * value the device actually reported or `null` with a stated reason:
 *
 *   • location      — Geolocation API (shared single prompt), written to `user_route_history`
 *   • motion        — DeviceMotion acceleration magnitude sampled over ~3s
 *   • battery       — Battery Status API where exposed
 *   • network       — NetworkInformation effectiveType / downlink / rtt
 *   • device        — hardwareConcurrency, deviceMemory, screen, timezone
 *   • heart rate    — only when a Bluetooth HRM has been paired by the user
 *
 * Every ingest writes one `behavioral_events` row (category `biometric`) plus a
 * cryptographic lineage entry, so Zoe's recommendations can be traced back to
 * the exact device reading that triggered them.
 */
import { supabase } from '@/integrations/supabase/client';
import { logBehavioralEvent, resolveAuthUid } from '@/lib/safeTelemetry';
import { getSharedCoords } from '@/utils/sharedGeolocation';
import { recordDhfLineage, getLineageSessionId } from '@/services/dhfLineage';

export interface SensorReading {
  capturedAt: string;
  location: { lat: number; lng: number } | null;
  motionMagnitude: number | null;
  motionSamples: number;
  battery: { level: number; charging: boolean } | null;
  network: { effectiveType: string | null; downlink: number | null; rtt: number | null } | null;
  device: {
    cores: number | null;
    memoryGb: number | null;
    screen: string;
    timezone: string;
  };
  heartRateBpm: number | null;
  /** Human-readable reason for each unavailable sensor. */
  unavailable: Record<string, string>;
}

let lastHeartRate: number | null = null;

/** Register a live heart rate from a paired BLE monitor (see `pairHeartRateMonitor`). */
export function setLiveHeartRate(bpm: number | null) {
  lastHeartRate = typeof bpm === 'number' && bpm > 20 && bpm < 250 ? bpm : null;
}

async function readMotion(durationMs = 3000): Promise<{ magnitude: number | null; samples: number; reason?: string }> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    return { magnitude: null, samples: 0, reason: 'DeviceMotion API not supported' };
  }
  const anyMotion = (window as any).DeviceMotionEvent;
  if (typeof anyMotion.requestPermission === 'function') {
    try {
      const state = await anyMotion.requestPermission();
      if (state !== 'granted') return { magnitude: null, samples: 0, reason: 'motion permission denied' };
    } catch {
      return { magnitude: null, samples: 0, reason: 'motion permission unavailable' };
    }
  }
  return new Promise((resolve) => {
    let total = 0;
    let samples = 0;
    const handler = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      total += Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      samples += 1;
    };
    window.addEventListener('devicemotion', handler);
    window.setTimeout(() => {
      window.removeEventListener('devicemotion', handler);
      resolve(
        samples > 0
          ? { magnitude: Number((total / samples).toFixed(3)), samples }
          : { magnitude: null, samples: 0, reason: 'no motion events emitted' },
      );
    }, durationMs);
  });
}

async function readBattery(): Promise<{ value: SensorReading['battery']; reason?: string }> {
  const getBattery = (navigator as any)?.getBattery;
  if (typeof getBattery !== 'function') return { value: null, reason: 'Battery API not exposed' };
  try {
    const battery = await getBattery.call(navigator);
    return { value: { level: Number(battery.level), charging: Boolean(battery.charging) } };
  } catch {
    return { value: null, reason: 'battery read failed' };
  }
}

function readNetwork(): { value: SensorReading['network']; reason?: string } {
  const conn = (navigator as any)?.connection;
  if (!conn) return { value: null, reason: 'NetworkInformation not exposed' };
  return {
    value: {
      effectiveType: conn.effectiveType ?? null,
      downlink: typeof conn.downlink === 'number' ? conn.downlink : null,
      rtt: typeof conn.rtt === 'number' ? conn.rtt : null,
    },
  };
}

/** Capture one honest reading from every sensor the device actually exposes. */
export async function captureSensorReading(options: { includeLocation?: boolean; motionMs?: number } = {}): Promise<SensorReading> {
  const unavailable: Record<string, string> = {};

  let location: SensorReading['location'] = null;
  if (options.includeLocation !== false) {
    try {
      location = await getSharedCoords();
    } catch {
      unavailable.location = 'geolocation unavailable';
    }
  } else {
    unavailable.location = 'location skipped by caller';
  }

  const motion = await readMotion(options.motionMs ?? 3000);
  if (motion.reason) unavailable.motion = motion.reason;

  const battery = await readBattery();
  if (battery.reason) unavailable.battery = battery.reason;

  const network = readNetwork();
  if (network.reason) unavailable.network = network.reason;

  if (lastHeartRate === null) unavailable.heartRate = 'no paired heart-rate monitor';

  return {
    capturedAt: new Date().toISOString(),
    location,
    motionMagnitude: motion.magnitude,
    motionSamples: motion.samples,
    battery: battery.value,
    network: network.value,
    device: {
      cores: typeof navigator?.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null,
      memoryGb: typeof (navigator as any)?.deviceMemory === 'number' ? (navigator as any).deviceMemory : null,
      screen: typeof window !== 'undefined' ? `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}@${window.devicePixelRatio ?? 1}` : 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    heartRateBpm: lastHeartRate,
    unavailable,
  };
}

export interface IngestResult {
  ok: boolean;
  reading: SensorReading;
  wroteEvent: boolean;
  wroteLocation: boolean;
  lineageId: string | null;
}

/** Capture and persist one reading into the DHF (event + route history + lineage). */
export async function ingestSensorsIntoDhf(options: { includeLocation?: boolean; motionMs?: number } = {}): Promise<IngestResult> {
  const reading = await captureSensorReading(options);
  const uid = await resolveAuthUid();
  if (!uid) {
    return { ok: false, reading, wroteEvent: false, wroteLocation: false, lineageId: null };
  }

  const event = await logBehavioralEvent({
    event_type: 'sensor_snapshot',
    event_category: 'biometric',
    session_id: getLineageSessionId(),
    context_snippet: `motion=${reading.motionMagnitude ?? 'n/a'} battery=${reading.battery?.level ?? 'n/a'} hr=${reading.heartRateBpm ?? 'n/a'}`,
    metadata: reading as unknown as Record<string, unknown>,
    dhf_logged: true,
  });

  let wroteLocation = false;
  if (reading.location) {
    const { error } = await supabase.from('user_route_history').insert({
      user_id: uid,
      location_lat: reading.location.lat,
      location_lng: reading.location.lng,
    });
    wroteLocation = !error;
    if (error) console.warn('[DHFSensors] route history write failed:', error.message);
  }

  const lineageId = await recordDhfLineage({
    entityType: 'dhf_sensor_reading',
    entityId: reading.capturedAt,
    action: 'sensor:ingest',
    content: JSON.stringify(reading),
    intent: 'dhf_write',
    metadata: {
      hasLocation: !!reading.location,
      hasMotion: reading.motionMagnitude !== null,
      hasHeartRate: reading.heartRateBpm !== null,
      unavailable: Object.keys(reading.unavailable),
    },
  });

  return { ok: event.ok, reading, wroteEvent: event.ok, wroteLocation, lineageId };
}

/**
 * Pair a real Bluetooth heart-rate monitor (user gesture required).
 * Returns false when Web Bluetooth is unavailable or the user cancels — we never
 * fabricate a BPM value.
 */
export async function pairHeartRateMonitor(): Promise<boolean> {
  const bluetooth = (navigator as any)?.bluetooth;
  if (!bluetooth?.requestDevice) return false;
  try {
    const device = await bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      const value: DataView = event.target.value;
      const flags = value.getUint8(0);
      const bpm = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
      setLiveHeartRate(bpm);
    });
    return true;
  } catch (err) {
    console.warn('[DHFSensors] heart-rate pairing failed:', err);
    return false;
  }
}
