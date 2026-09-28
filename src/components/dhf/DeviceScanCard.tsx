import { useEffect, useState } from 'react';
import { Cpu, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { dash, getLastDeviceScan, scanAndSaveDevice, type DeviceScanResult } from '@/services/zoeDeviceScan';

export default function DeviceScanCard() {
  const [scan, setScan] = useState<DeviceScanResult | null>(() => getLastDeviceScan());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = (e: Event) => setScan((e as CustomEvent<DeviceScanResult>).detail);
    window.addEventListener('zoe-device-scan-complete', on);
    return () => window.removeEventListener('zoe-device-scan-complete', on);
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await scanAndSaveDevice('manual');
      setScan(r.scan);
      toast[r.ok ? 'success' : 'error'](r.ok ? 'Device scan saved to your DHF' : 'Scan done, but it could not be saved');
    } finally { setBusy(false); }
  };

  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4" /> This device</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Button size="sm" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />} Scan device
        </Button>
        {scan ? (
          <div className="space-y-1 text-xs">
            {row('Device', `${scan.platform.browser} on ${scan.platform.os}${scan.isNewDevice ? ' (new)' : ''}`)}
            {row('Microphone', `${dash(scan.microphone.permission)} · ${dash(scan.microphone.inputs)} found`)}
            {row('Camera', `${dash(scan.camera.permission)} · ${dash(scan.camera.inputs)} found`)}
            {row('Speaker', `${dash(scan.speaker.outputs)} outputs`)}
            {row('Memory', dash(scan.memory.deviceGb, ' GB'))}
            {row('CPU cores', dash(scan.cpu.cores))}
            {row('Last scan', new Date(scan.scannedAt).toLocaleString())}
          </div>
        ) : <p className="text-muted-foreground text-xs">No scan yet.</p>}
      </CardContent>
    </Card>
  );
}
