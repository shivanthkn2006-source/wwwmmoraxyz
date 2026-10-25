// ═══════════════════════════════════════════════════════════════════════════════
// DEV TEST BUTTON - Quick access to Gate Crash Test Suite
// Only visible in development mode
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, memo, lazy, Suspense } from 'react';
import { Bug, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VelvetRopeTestSuite = lazy(() => import('./VelvetRopeTestSuite'));

const DevTestButton: React.FC = () => {
  const [showTestSuite, setShowTestSuite] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* Floating Dev Button - positioned to avoid overlapping auth forms */}
      <Button
        aria-label="Open development tests"
        variant="outline"
        size="sm"
        onClick={() => setShowTestSuite(true)}
        className="fixed left-3 top-[calc(50%+2.25rem)] z-40 min-h-11 gap-1.5 bg-background border-border text-foreground text-xs transition-opacity"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Dev</span>
      </Button>

      {/* Test Suite Modal */}
      {showTestSuite && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <VelvetRopeTestSuite onClose={() => setShowTestSuite(false)} />
        </Suspense>
      )}
    </>
  );
};

export default memo(DevTestButton);
