/**
 * GLOBAL BUG REPORTER
 *
 * A floating report button mounted once in PlatformLayout, so every route has
 * it. On submit it silently attaches the technical context an engineer needs:
 * route, device/browser info, and the last 3 platform-store state changes.
 *
 * Nothing here can crash a route: every failure path degrades to a toast.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformStore, type PlatformState } from '@/store/usePlatformStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StateChange {
  at: string;
  activeAgent: string | null;
  voiceStatus: string;
  lastCommand: string | null;
  thermalSafeMode: boolean;
  heavyModulesMounted: number;
}

/** Ring buffer of the last 3 platform-store transitions (module scope, cheap). */
const recentChanges: StateChange[] = [];

function snapshotOf(s: PlatformState): StateChange {
  return {
    at: new Date().toISOString(),
    activeAgent: s.activeAgent,
    voiceStatus: s.voiceStatus,
    lastCommand: s.lastCommand,
    thermalSafeMode: s.thermalSafeMode,
    heavyModulesMounted: s.heavyModulesMounted,
  };
}

// Subscribed once for the lifetime of the tab — no per-render listeners.
usePlatformStore.subscribe((state) => {
  recentChanges.push(snapshotOf(state));
  if (recentChanges.length > 3) recentChanges.shift();
});

function deviceInfo() {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
  return {
    userAgent: nav.userAgent,
    language: nav.language,
    platform: (nav as unknown as { platform?: string }).platform ?? null,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    connection: nav.connection?.effectiveType ?? null,
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio : null,
    online: nav.onLine,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export const GlobalBugReporter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted.current) setUserId(data.user?.id ?? null);
    }).catch(() => undefined);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted.current) setUserId(session?.user?.id ?? null);
    });
    const onRouteChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  const submit = async () => {
    if (!userId) {
      toast.error('Sign in to send a report.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('platform_error_logs').insert({
        user_id: userId,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        device_info: deviceInfo(),
        zustand_state_snapshot: JSON.parse(JSON.stringify({ recentChanges, current: snapshotOf(usePlatformStore.getState()) })),
        user_message: message.trim() || null,
      });
      if (error) throw error;
      toast.success('Report sent. Thank you — we captured the technical details.');
      setMessage('');
      setOpen(false);
    } catch (e) {
      console.error('[GlobalBugReporter] submit failed', e);
      toast.error('Could not send the report. Please try again.');
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  // Not signed in → nothing to attach a report to; stay out of the way.
  if (!userId) return null;
  // Home screen keeps the chrome clean; the reporter is available on every other route.

  return (
    <>
      <button
        type="button"
        aria-label="Report a problem"
        title="Report a problem"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-1/2 z-40 -translate-y-1/2 bg-transparent p-2 text-muted-foreground transition hover:text-foreground"
      >
        <Bug className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What went wrong?</DialogTitle>
            <DialogDescription>
              Describe it in your own words. We automatically attach the page, your device details
              and the app's recent state so nothing has to be explained twice.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. the feed went blank after I liked a post"
            rows={5}
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalBugReporter;
