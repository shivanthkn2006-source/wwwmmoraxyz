/** Subscribes a component to the global music engine without owning the audio. */
import { useEffect, useState } from 'react';
import { musicEngine, type MusicState } from '@/services/MusicEngine';

export function useMusicEngine(): MusicState {
  const [state, setState] = useState<MusicState>(() => musicEngine.getState());
  useEffect(() => musicEngine.subscribe(setState), []);
  return state;
}

export default useMusicEngine;
