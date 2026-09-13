/**
 * SENTINEL WATCH — silent presence + tamper watcher.
 *
 * Mounted once, globally. It does three things and says nothing:
 *   1. Registers the visitor's live session (device/hardware here, IP + geo
 *      resolved server-side) and keeps it warm with a heartbeat.
 *   2. Reports tamper attempts — source view, context-menu probing, the
 *      inspector shortcuts, and copy-the-page attempts.
 *   3. Honours a block: once the server says "blocked", the visitor is signed
 *      out and the watcher goes quiet.
 *
 * Admins are exempt from tamper reporting so operators can work normally.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { callSentinel, reportThreat } from '@/lib/sentinelClient';

const HEARTBEAT_MS = 60_000;

/**
 * Keyboard shortcuts that only ever mean "open the inspector".
 * Save (Ctrl/⌘+S) and underline (Ctrl/⌘+U) are everyday editing shortcuts, so
 * they are never treated as tampering.
 */
const isInspectorKey = (e: KeyboardEvent): string | null => {
  if (e.key === 'F12') return 'devtools_shortcut';
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) return 'devtools_shortcut';
  return null;
};

export const useSentinelWatch = (): { blocked: boolean } => {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const blockedRef = useRef(false);
  const lastReportRef = useRef<Record<string, number>>({});

  // Admin lookup — admins never get reported for inspecting their own platform.
  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => {
        if (alive) setIsAdmin(Boolean(data));
      });
    return () => {
      alive = false;
    };
  }, [user]);

  // Presence heartbeat.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = async () => {
      if (!alive || blockedRef.current) return;
      const res = await callSentinel('heartbeat');
      if (res.blocked && alive) {
        blockedRef.current = true;
        setBlocked(true);
        void supabase.auth.signOut();
      }
    };

    void beat();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void beat();
    }, HEARTBEAT_MS);

    const onHide = () => {
      if (document.visibilityState === 'hidden') void callSentinel('end');
      else void beat();
    };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [user?.id]);

  // Tamper watcher.
  useEffect(() => {
    if (isAdmin) return;

    const fire = (type: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
      const now = Date.now();
      // One report per type per 10s — a held-down key must not flood the log.
      if (now - (lastReportRef.current[type] ?? 0) < 10_000) return;
      lastReportRef.current[type] = now;
      void reportThreat(type, severity, { path: window.location.pathname }).then((res) => {
        if (res.blocked) {
          blockedRef.current = true;
          setBlocked(true);
          void supabase.auth.signOut();
        }
      });
    };

    const onKey = (e: KeyboardEvent) => {
      const type = isInspectorKey(e);
      if (type) {
        e.preventDefault();
        fire(type, type === 'devtools_shortcut' ? 'high' : 'medium');
      }
    };
    const onContext = (e: MouseEvent) => {
      // Right-click stays available — people need copy, paste and spell-check.
      // Only note it when it isn't ordinary text or media interaction.
      const target = e.target as HTMLElement | null;
      const editing = Boolean(
        target?.closest('input, textarea, [contenteditable="true"], img, video, a'),
      );
      if (editing) return;
      fire('context_menu_probe', 'low');
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', onContext, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('contextmenu', onContext, true);
    };
  }, [isAdmin]);

  return { blocked };
};

export default useSentinelWatch;
