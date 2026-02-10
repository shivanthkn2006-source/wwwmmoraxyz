/**
 * Light Activity Tracker
 * Tracks user sessions, page views, and activity with deferred initialization
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ActivityTracker } from './ActivityTracker';

export const LightActivityTracker = () => {
  const { user } = useAuth();
  const [shouldTrack, setShouldTrack] = useState(false);

  useEffect(() => {
    if (!user) {
      setShouldTrack(false);
      return;
    }
    
    // Defer activity tracking initialization by 2 seconds to avoid blocking initial render
    const timer = setTimeout(() => {
      setShouldTrack(true);
      console.log('[ActivityTracker] Initialized after defer');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user]);

  // Only render ActivityTracker when user is authenticated and after defer
  if (!shouldTrack) return null;

  return <ActivityTracker />;
};

export default LightActivityTracker;
