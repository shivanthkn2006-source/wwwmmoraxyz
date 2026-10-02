// Black-box gate: admin pages inside it open only while a live vault tunnel exists in this tab and is still valid on the server.
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { loadVaultTunnel } from '@/lib/security/sovereignVault';

export default function VaultGate({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const [state, setState] = useState<'checking' | 'open' | 'closed'>('checking');

  useEffect(() => {
    const t = loadVaultTunnel();
    if (!t?.sessionId) { setState('closed'); return; }
    let alive = true;
    void (supabase as any).from('sovereign_vault_sessions').select('id, revoked, expires_at').eq('id', t.sessionId).maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setState(data && !data.revoked && new Date(data.expires_at).getTime() > Date.now() ? 'open' : 'closed');
      });
    const id = window.setInterval(() => { if (!loadVaultTunnel()) setState('closed'); }, 15_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [loc.pathname]);

  if (state === 'checking') return null;
  if (state === 'closed') return <Navigate to="/admin/vault" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
