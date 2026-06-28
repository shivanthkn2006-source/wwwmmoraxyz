/**
 * useZoeVirtualHormones — React hook around VirtualHormonesEngine.
 * Refreshes every 5 minutes. Exposes current snapshot and a prompt fragment.
 */
import { useEffect, useState, useMemo } from 'react';
import {
  computeHormoneSnapshot,
  buildHormonePromptFragment,
  type HormoneSnapshot,
  type LifestylePresetId,
} from '@/core/zoe/VirtualHormonesEngine';

const STORAGE_KEY = 'zoe_infinity_lifestyle_preset';

function readPreset(): LifestylePresetId {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as LifestylePresetId | null;
    if (v === 'night_owl' || v === 'early_bird' || v === 'balanced') return v;
  } catch {}
  return 'balanced';
}

export function useZoeVirtualHormones(intimacy: number = 50) {
  const [preset, setPresetState] = useState<LifestylePresetId>(readPreset);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  const snapshot: HormoneSnapshot = useMemo(
    () => computeHormoneSnapshot(preset, now.getHours(), intimacy),
    [preset, now, intimacy],
  );

  const promptFragment = useMemo(() => buildHormonePromptFragment(snapshot), [snapshot]);

  const setPreset = (p: LifestylePresetId) => {
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
    setPresetState(p);
  };

  return { snapshot, promptFragment, preset, setPreset, lazyMode: snapshot.lazyMode };
}

export default useZoeVirtualHormones;
