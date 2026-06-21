import { useActivityTracking } from '@/hooks/useActivityTracking';

/**
 * Global activity tracking component
 * Automatically tracks user sessions, page views, and time spent
 */
export const ActivityTracker = () => {
  useActivityTracking();
  return null;
};
