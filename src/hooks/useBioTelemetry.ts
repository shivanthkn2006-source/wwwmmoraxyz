/**
 * BIO-TELEMETRY — REAL DEVICE SIGNALS ONLY.
 *
 * Nothing here is generated, interpolated or randomised. Every number comes
 * from a sensor the browser actually exposed:
 *
 *   • heartRate  — paired Bluetooth HRM (`pairHeartRateMonitor`), live notifications
 *   • activity   — DeviceMotion acceleration magnitude
 *   • energy     — Battery Status API level
 *   • signal     — NetworkInformation downlink/rtt
 *
 * Anything the device cannot report is marked unavailable in `available` and
 * left at 0 — it is never filled with a plausible-looking value. Consumers must
 * check `available` before rendering a metric.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  captureSensorReading,
  pairHeartRateMonitor,
  subscribeHeartRate,
  type SensorReading,
} from '@/services/dhfSensorIngest';

export interface BioMetrics {
  heartRate: number;
  hrv: number; // Heart Rate Variability (stress indicator)
  energyLevel: number; // 0-100 (device battery)
  oxygenLevel: number; // SpO2 percentage
  stressLevel: 'low' | 'moderate' | 'elevated' | 'high';
  activityState: 'resting' | 'active' | 'exercising' | 'sleeping';
  respiratoryRate: number;
  skinTemp: number;
  steps: number;
  calories: number;
}

export type BioMetricKey = keyof BioMetrics | 'motion';

export interface BioTelemetryState {
  metrics: BioMetrics;
  /** Which metrics were actually measured on this device right now. */
  available: Record<BioMetricKey, boolean>;
  /** Human-readable reason per unavailable sensor, straight from the ingest layer. */
  unavailable: Record<string, string>;
  /** Always 'device' now — simulated telemetry has been removed. */
  dataSource: 'device';
  isSimulated: false;
  isConnected: boolean;
  deviceName: string;
  lastSyncAt: Date | null;
  signalStrength: number;
  batteryLevel: number;
  motionMagnitude: number | null;
}

export interface ZoeAnalysis {
  message: string;
  recommendation: string;
  urgency: 'info' | 'suggestion' | 'warning' | 'critical';
  timestamp: Date;
}

const NO_METRICS: BioMetrics = {
  heartRate: 0,
  hrv: 0,
  energyLevel: 0,
  oxygenLevel: 0,
  stressLevel: 'low',
  activityState: 'resting',
  respiratoryRate: 0,
  skinTemp: 0,
  steps: 0,
  calories: 0,
};

const NONE_AVAILABLE: Record<BioMetricKey, boolean> = {
  heartRate: false,
  hrv: false,
  energyLevel: false,
  oxygenLevel: false,
  stressLevel: false,
  activityState: false,
  respiratoryRate: false,
  skinTemp: false,
  steps: false,
  calories: false,
  motion: false,
};

/** Stress is only stated when a real BPM exists. */
const getStressLevel = (heartRate: number): BioMetrics['stressLevel'] => {
  if (heartRate < 80) return 'low';
  if (heartRate < 100) return 'moderate';
  if (heartRate < 120) return 'elevated';
  return 'high';
};

/** Activity from real accelerometer magnitude (m/s², gravity included ≈ 9.8 at rest). */
const getActivityState = (motion: number | null): BioMetrics['activityState'] => {
  if (motion === null) return 'resting';
  if (motion > 16) return 'exercising';
  if (motion > 11) return 'active';
  return 'resting';
};

const signalFromNetwork = (network: SensorReading['network']): number => {
  if (!network) return 0;
  if (typeof network.rtt === 'number' && network.rtt > 0) {
    return Math.max(5, Math.min(100, Math.round(100 - network.rtt / 6)));
  }
  switch (network.effectiveType) {
    case '4g': return 90;
    case '3g': return 60;
    case '2g': return 30;
    case 'slow-2g': return 15;
    default: return 0;
  }
};

const analyseReal = (
  metrics: BioMetrics,
  available: Record<BioMetricKey, boolean>,
): ZoeAnalysis => {
  if (available.heartRate && metrics.heartRate > 100) {
    return {
      message: `Your heart rate is ${metrics.heartRate} BPM — elevated for this moment.`,
      recommendation: 'A slow 4-7-8 breathing round would bring it down.',
      urgency: 'warning',
      timestamp: new Date(),
    };
  }
  if (available.motion && metrics.activityState === 'exercising') {
    return {
      message: 'Strong movement detected from your device.',
      recommendation: 'Keep hydrating — I will log this as an active block.',
      urgency: 'info',
      timestamp: new Date(),
    };
  }
  if (available.energyLevel && metrics.energyLevel < 20) {
    return {
      message: `Device battery at ${Math.round(metrics.energyLevel)}%.`,
      recommendation: 'Charge soon so telemetry keeps flowing into the DHF.',
      urgency: 'suggestion',
      timestamp: new Date(),
    };
  }
  if (!available.heartRate) {
    return {
      message: 'No heart-rate monitor is paired, so I have no cardiac data.',
      recommendation: 'Pair a Bluetooth strap to unlock cardiac insight — I will not guess it.',
      urgency: 'info',
      timestamp: new Date(),
    };
  }
  return {
    message: 'Live signals look steady.',
    recommendation: 'Nothing needs your attention right now.',
    urgency: 'info',
    timestamp: new Date(),
  };
};

const POLL_MS = 15_000;

export const useBioTelemetry = () => {
  const [state, setState] = useState<BioTelemetryState>({
    metrics: NO_METRICS,
    available: { ...NONE_AVAILABLE },
    unavailable: {},
    dataSource: 'device',
    isSimulated: false,
    isConnected: false,
    deviceName: 'No sensor paired',
    lastSyncAt: null,
    signalStrength: 0,
    batteryLevel: 0,
    motionMagnitude: null,
  });

  const [analysis, setAnalysis] = useState<ZoeAnalysis>({
    message: 'Reading your device sensors…',
    recommendation: 'Only real measurements are used here.',
    urgency: 'info',
    timestamp: new Date(),
  });
  const [analysisHistory, setAnalysisHistory] = useState<ZoeAnalysis[]>([]);
  const heartRateRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const applyReading = useCallback((reading: SensorReading) => {
    const bpm = reading.heartRateBpm ?? heartRateRef.current;
    const hasHeartRate = typeof bpm === 'number' && bpm > 0;
    const hasMotion = reading.motionMagnitude !== null;
    const hasBattery = reading.battery !== null;

    const metrics: BioMetrics = {
      heartRate: hasHeartRate ? Math.round(bpm as number) : 0,
      hrv: 0, // no HRV stream from a standard BLE HRM profile
      energyLevel: hasBattery ? Math.round((reading.battery as NonNullable<SensorReading['battery']>).level * 100) : 0,
      oxygenLevel: 0, // no SpO2 sensor on the web platform
      stressLevel: hasHeartRate ? getStressLevel(bpm as number) : 'low',
      activityState: getActivityState(reading.motionMagnitude),
      respiratoryRate: 0,
      skinTemp: 0,
      steps: 0,
      calories: 0,
    };

    const available: Record<BioMetricKey, boolean> = {
      ...NONE_AVAILABLE,
      heartRate: hasHeartRate,
      stressLevel: hasHeartRate,
      energyLevel: hasBattery,
      activityState: hasMotion,
      motion: hasMotion,
    };

    const next = analyseReal(metrics, available);
    if (!mountedRef.current) return;
    setState({
      metrics,
      available,
      unavailable: reading.unavailable,
      dataSource: 'device',
      isSimulated: false,
      isConnected: hasHeartRate || hasMotion || hasBattery,
      deviceName: hasHeartRate ? 'Bluetooth heart-rate monitor' : hasMotion || hasBattery ? 'This device' : 'No sensor paired',
      lastSyncAt: new Date(reading.capturedAt),
      signalStrength: signalFromNetwork(reading.network),
      batteryLevel: hasBattery ? Math.round((reading.battery as NonNullable<SensorReading['battery']>).level * 100) : 0,
      motionMagnitude: reading.motionMagnitude,
    });
    setAnalysis((prev) => {
      if (prev.message === next.message) return prev;
      setAnalysisHistory((hist) => [next, ...hist.slice(0, 9)]);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      // Location is skipped here: the Vitruvian deck does not need a GPS prompt.
      const reading = await captureSensorReading({ includeLocation: false, motionMs: 2000 });
      applyReading(reading);
    } catch (err) {
      console.warn('[BioTelemetry] sensor read failed:', err);
    }
  }, [applyReading]);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = subscribeHeartRate((bpm) => { heartRateRef.current = bpm; });
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, POLL_MS);
    return () => {
      mountedRef.current = false;
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  /** Pair a real BLE heart-rate strap (requires a user gesture). */
  const connectHeartRateMonitor = useCallback(async () => {
    const paired = await pairHeartRateMonitor();
    if (paired) await refresh();
    return paired;
  }, [refresh]);

  const triggerBreathingProtocol = useCallback(() => {
    setAnalysis({
      message: 'Starting the 4-7-8 breathing protocol.',
      recommendation: 'Inhale 4s, hold 7s, exhale 8s.',
      urgency: 'suggestion',
      timestamp: new Date(),
    });
  }, []);

  return {
    ...state,
    analysis,
    analysisHistory,
    reconnect: refresh,
    connectHeartRateMonitor,
    triggerBreathingProtocol,
  };
};

export default useBioTelemetry;
