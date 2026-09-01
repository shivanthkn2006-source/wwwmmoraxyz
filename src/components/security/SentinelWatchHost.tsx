/**
 * Invisible host that runs the Sentinel watcher for the whole app and shows a
 * plain lock-out screen if the visitor has been blocked. It renders nothing at
 * all in the normal case.
 */
import React from 'react';
import { useSentinelWatch } from '@/hooks/useSentinelWatch';

const SentinelWatchHost: React.FC = () => {
  const { blocked } = useSentinelWatch();

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Access suspended</h1>
        <p className="text-sm text-muted-foreground">
          This session has been closed. If you believe this is a mistake, contact support.
        </p>
      </div>
    </div>
  );
};

export default SentinelWatchHost;
