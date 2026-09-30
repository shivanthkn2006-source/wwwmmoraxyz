import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SelfieGlobe from '@/components/selfiecity/SelfieGlobe';
import { useSelfieCityStore } from '@/hooks/useSelfieCityStore';

/** 3D globe inside the Home Selfie City tab: your live spot, live members, friends' pins. */
const SelfieCityGlobePanel: React.FC = () => {
  const navigate = useNavigate();
  const { selfies, liveMembers, localPlace, userLocation, loadSelfies } = useSelfieCityStore();
  useEffect(() => { void loadSelfies(); }, [loadSelfies]);
  const friends = selfies.filter((p) => p.isFriend).length;

  return (
    <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden rounded-2xl">
      <SelfieGlobe
        selfies={[...liveMembers, ...selfies]}
        onSelfieSelect={() => navigate('/selfie-city')}
        onLocationSelect={() => {}}
      />
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[90%] -translate-x-1/2 truncate rounded-full surface-warm-tan px-3 py-1 text-xs shadow-md">
        {userLocation ? `You${localPlace ? ` · ${localPlace}` : ''}` : 'Allow location to appear'} · {liveMembers.length} live · {friends} friends' pins
      </div>
    </div>
  );
};

export default SelfieCityGlobePanel;
