/**
 * The signed-in member as shown in VR (all worlds): their name and whether
 * the female look is used (profile gender says female / woman).
 */
import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Self = { name: string; female: boolean; loaded: boolean };
let me: Self = { name: '', female: false, loaded: false };
const ls = new Set<() => void>();
let started = false;

export const isFemaleGender = (g?: string | null) => !!g && /^(f|female|woman|girl|she|lady)\b/i.test(g.trim());

async function load() {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id; if (!uid) return;
    const { data: p } = await supabase.from('profiles').select('display_name, username, gender').eq('id', uid).maybeSingle();
    me = { name: (p?.display_name || p?.username || '').trim(), female: isFemaleGender(p?.gender), loaded: true };
    ls.forEach((l) => l());
  } catch { /* offline: default look */ }
}

export function useVRSelf(): Self {
  if (!started && typeof window !== 'undefined') { started = true; void load(); }
  return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => me, () => me);
}
