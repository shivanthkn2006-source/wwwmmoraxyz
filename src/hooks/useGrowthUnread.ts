/**
 * Read-only view of the growth alert store for badges and lists.
 * Uses useSyncExternalStore so every consumer stays in lockstep without a
 * provider, context, or extra query.
 */
import { useSyncExternalStore } from 'react';
import {
  subscribeGrowthAlerts, getGrowthAlertState, clearGrowthUnread,
} from '@/lib/growthAlertStore';

export function useGrowthAlertQueue() {
  return useSyncExternalStore(subscribeGrowthAlerts, getGrowthAlertState, getGrowthAlertState);
}

export function useGrowthUnread(): number {
  return useGrowthAlertQueue().unread;
}

export { clearGrowthUnread };
export default useGrowthUnread;
