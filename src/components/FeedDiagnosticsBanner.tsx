import React, { useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

export interface FeedDiagnostics {
  status: 'ok' | 'empty' | 'auth' | 'rls' | 'timeout' | 'error';
  message?: string;
  code?: string;
  durationMs?: number;
  rowCount?: number;
  authReady?: boolean;
  timestamp?: string;
}

interface Props {
  diag: FeedDiagnostics | null;
  onRetry?: () => void;
  consecutiveFailures?: number;
}

const RLS_HINTS: Record<string, string> = {
  rls: 'A Row-Level-Security policy on `posts` / `feed_posts_safe` blocked this row. Likely cause: post visibility is not "global", `private_timeline_id` is set, or the post owner blocked you. Authenticated users can only see global posts whose author has not blocked them.',
  auth: 'Your session token is missing or stale. RLS evaluates `auth.uid()` as null, so all rows are filtered out. Re-login or wait for the session to refresh.',
  empty: 'Query succeeded but returned 0 rows. Either no global posts exist, or every row was filtered by your "not interested" preferences or block list.',
  timeout: 'The Supabase query exceeded the safety cap (12s). This is usually a slow network, a cold-start replica, or a heavy data:image payload before the safe view kicked in.',
  error: 'A transport or parse error occurred before RLS was evaluated. Check the error code (PGRST/22P02 = JSON parse, 42501 = RLS).',
  ok: '',
};

const FeedDiagnosticsBanner: React.FC<Props> = ({ diag, onRetry, consecutiveFailures = 0 }) => {
  const [showWhy, setShowWhy] = useState(false);
  if (!diag || diag.status === 'ok') {
    if (consecutiveFailures >= 3) {
      return (
        <Alert variant="destructive" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Repeated feed failures detected</AlertTitle>
          <AlertDescription className="text-xs">
            {consecutiveFailures} consecutive empty/timeout loads. Open the Admin Feed Debugger below for details.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const titles: Record<FeedDiagnostics['status'], string> = {
    ok: 'Feed loaded',
    empty: 'No posts found',
    auth: 'Authentication not ready',
    rls: 'Access blocked by security policy',
    timeout: 'Feed request timed out',
    error: 'Feed failed to load',
  };

  const variant = diag.status === 'empty' ? 'default' : 'destructive';

  return (
    <Alert variant={variant as any} className="mb-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{titles[diag.status]}</span>
        <span className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowWhy(v => !v)} className="h-7">
            <HelpCircle className="h-3 w-3 mr-1" /> Why blocked?
          </Button>
          {onRetry && (
            <Button size="sm" variant="ghost" onClick={onRetry} className="h-7">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </span>
      </AlertTitle>
      <AlertDescription className="text-xs space-y-1 mt-1">
        {diag.message && <div>{diag.message}</div>}
        <div className="opacity-70">
          {diag.code && <span>code: {diag.code} · </span>}
          {typeof diag.durationMs === 'number' && <span>{diag.durationMs}ms · </span>}
          {typeof diag.rowCount === 'number' && <span>{diag.rowCount} rows · </span>}
          <span>auth: {diag.authReady ? 'ready' : 'pending'}</span>
        </div>
        {showWhy && (
          <div className="mt-2 p-2 rounded bg-background/40 border border-border text-[11px] leading-relaxed">
            {RLS_HINTS[diag.status]}
          </div>
        )}
        {consecutiveFailures >= 2 && (
          <div className="mt-1 text-[11px] opacity-80">⚠ {consecutiveFailures} consecutive failures</div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default FeedDiagnosticsBanner;
