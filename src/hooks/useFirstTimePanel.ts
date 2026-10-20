import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { claimFirstTimePanel } from '@/lib/firstTimePanel';

export function useFirstTimePanel(panelId: string, enabled: boolean, previouslySeen = false) {
  const { user, loading } = useAuth();
  const [allowedFor, setAllowedFor] = useState<string | null>(null);
  useEffect(() => {
    if (loading || !user || !enabled) return;
    let cancelled = false;
    void claimFirstTimePanel(user.id, panelId, previouslySeen).then((allowed) => {
      if (!cancelled && allowed) setAllowedFor(user.id);
    });
    return () => { cancelled = true; };
  }, [user?.id, loading, enabled, panelId, previouslySeen]);
  return !!user && allowedFor === user.id;
}