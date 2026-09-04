/**
 * DHF SENSOR PANEL — opt-in capture of real device sensors into the DHF.
 * Shows exactly which sensors the device exposes and why the others are absent;
 * nothing is simulated.
 */
import React, { useState } from 'react';
import { Activity, Loader2, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ingestSensorsIntoDhf, pairHeartRateMonitor, type SensorReading } from '@/services/dhfSensorIngest';
import { requestBiometricRecommendation, type BiometricRecommendation } from '@/services/zoeBiometricRecommend';

export default function DhfSensorPanel() {
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<BiometricRecommendation | null>(null);

  const capture = async () => {
    setBusy(true);
    try {
      const result = await ingestSensorsIntoDhf();
      setReading(result.reading);
      toast[result.ok ? 'success' : 'error'](
        result.ok ? 'Sensor snapshot written to your DHF' : 'Sign in to store sensor readings',
      );
      if (result.ok) {
        // Zoe's next suggestion is regenerated from the reading that was just stored.
        const rec = await requestBiometricRecommendation();
        setAdvice(rec);
        if (rec) toast.success('Zoe updated her suggestion from your live sensors');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" /> Live device sensors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Captures real location, motion, battery and network readings from this device and records them in your DHF with a
          cryptographic lineage entry.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void capture()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Capture snapshot
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const paired = await pairHeartRateMonitor();
              toast[paired ? 'success' : 'error'](paired ? 'Heart-rate monitor connected' : 'No heart-rate monitor available');
            }}
          >
            <HeartPulse className="w-4 h-4 mr-2" /> Pair heart-rate monitor
          </Button>
        </div>
        {reading && (
          <div className="text-xs space-y-1">
            <div>Location: {reading.location ? `${reading.location.lat.toFixed(3)}, ${reading.location.lng.toFixed(3)}` : '—'}</div>
            <div>Motion: {reading.motionMagnitude ?? '—'} ({reading.motionSamples} samples)</div>
            <div>Battery: {reading.battery ? `${Math.round(reading.battery.level * 100)}%${reading.battery.charging ? ' charging' : ''}` : '—'}</div>
            <div>Network: {reading.network?.effectiveType ?? '—'} {reading.network?.rtt ? `· ${reading.network.rtt}ms rtt` : ''}</div>
            <div>Heart rate: {reading.heartRateBpm ?? '—'}</div>
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(reading.unavailable).map(([key, why]) => (
                <Badge key={key} variant="secondary" title={why}>{key}: unavailable</Badge>
              ))}
            </div>
          </div>
        )}
        {advice && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs space-y-1">
            <p className="font-medium">Zoe's suggestion from your live sensors</p>
            <p className="opacity-90">{advice.recommendation}</p>
            <p className="opacity-60">
              {advice.signals.samples} sensor snapshot{advice.signals.samples === 1 ? '' : 's'}
              {advice.signals.heartRate.latest !== null ? ` · ${advice.signals.heartRate.latest} bpm` : ''}
              {advice.signals.motion.avg !== null ? ` · motion ${advice.signals.motion.avg}` : ''}
              {advice.signals.movementKm !== null ? ` · ${advice.signals.movementKm} km moved` : ''}
              {` · ${advice.model}`}
            </p>
            {advice.signals.missing.length > 0 && (
              <p className="opacity-60">Not available: {advice.signals.missing.join(', ')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
