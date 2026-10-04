import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import IOSSwitch from '@/components/admin/IOSSwitch';
import { getShareRealLocation, setShareRealLocation } from '@/lib/vrPrivacy';

export function VRLocationPrivacyCard() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { getShareRealLocation().then((v) => { setOn(v); setReady(true); }); }, []);

  const change = async (next: boolean) => {
    setOn(next);
    const ok = await setShareRealLocation(next);
    if (!ok) { setOn(!next); toast.error("Couldn't save — please try again"); }
    else toast.success(next ? 'Others can now see you on the VR map' : 'Your real location is hidden on the VR map');
  };

  return (
    <Card className="p-6 space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5" />VR map privacy</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Show my real location on the map</p>
          <p className="text-xs text-muted-foreground">When on, other players in VR World can see you near your real street (never your exact home). Off by default.</p>
        </div>
        <IOSSwitch checked={on} onChange={change} label="Show my real location on the map" disabled={!ready} />
      </div>
    </Card>
  );
}

export default VRLocationPrivacyCard;
