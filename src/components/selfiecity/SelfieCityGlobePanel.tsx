import React, { useEffect, useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

const zoom = (type: 'zoom_in' | 'zoom_out') =>
  window.dispatchEvent(new CustomEvent('selfie-city-camera-control', { detail: { type } }));
import SelfieGlobe from '@/components/selfiecity/SelfieGlobe';
import { useSelfieCityStore, type SelfieCityPin } from '@/hooks/useSelfieCityStore';

/** 3D globe inside the Home Selfie City tab: your live spot, live members, friends' pins. */
const SelfieCityGlobePanel: React.FC = () => {
  const [picked, setPicked] = useState<SelfieCityPin | null>(null);
  const { selfies, liveMembers, localPlace, userLocation, loadSelfies } = useSelfieCityStore();
  useEffect(() => { void loadSelfies(); }, [loadSelfies]);
  const friends = selfies.filter((p) => p.isFriend).length;

  return (
    <div className="absolute inset-0 h-[100dvh] w-full overflow-hidden">
      <SelfieGlobe
        selfies={[...liveMembers, ...selfies]}
        onSelfieSelect={(p: any) => setPicked(p)}
        onLocationSelect={() => {}}
      />
      <div className="pointer-events-none absolute left-1/2 top-28 z-10 max-w-[90%] -translate-x-1/2 truncate rounded-full surface-warm-tan px-3 py-1 text-xs shadow-md">
        {userLocation ? `You${localPlace ? ` · ${localPlace}` : ''}` : 'Allow location to appear'} · {liveMembers.length} live · {friends} friends' pins
      </div>
      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
        <button type="button" aria-label="Zoom in" onClick={() => zoom('zoom_in')} className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg"><Plus className="h-5 w-5" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom('zoom_out')} className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg"><Minus className="h-5 w-5" /></button>
      </div>
      {picked && (
        <div className="absolute inset-x-3 bottom-24 z-20 flex items-center gap-3 rounded-2xl surface-warm-tan p-3 shadow-lg">
          <img src={picked.imageUrl} alt={picked.userName || 'Member'} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{picked.userName || 'Member'}{picked.isFriend ? ' · friend' : ''}</p>
            <p className="truncate text-xs opacity-80">{picked.location.name || 'Nearby'}</p>
            {picked.caption && <p className="truncate text-xs">{picked.caption}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={() => setPicked(null)} className="p-1"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
};

export default SelfieCityGlobePanel;
