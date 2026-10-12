/**
 * The member's own avatar look (skin, hair colour, shirt, trousers): saved on
 * the device and in vr_player_look so it follows the member to any device.
 */
import { useSyncExternalStore } from 'react';

export type Look = { skin: string; hair_color: string; shirt: string; trousers: string };
export const DEFAULT_LOOK: Look = { skin: '#e1c3a4', hair_color: '#2b1d14', shirt: '#22305a', trousers: '#e4dfd3' };
export const LOOK_OPTIONS: Record<keyof Look, string[]> = {
  skin: ['#f1d5bd', '#e1c3a4', '#c69872', '#9b6b47', '#6b4630'],
  hair_color: ['#2b1d14', '#5a3a22', '#a8743f', '#d9b56a', '#1a1a1a'],
  shirt: ['#22305a', '#387BF6', '#3b3b3b', '#6b2a2a', '#2f4f3a'],
  trousers: ['#e4dfd3', '#2b2b2b', '#4a3a2a', '#33415c'],
};
const KEY = 'vr-look';
let look: Look = (() => { try { return { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULT_LOOK; } })();
const ls = new Set<() => void>();
export const useLook = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => look, () => look);

let timer: number | undefined;
export function setLook(patch: Partial<Look>) {
  look = { ...look, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* */ }
  ls.forEach((l) => l());
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.auth.getSession(); const id = data.session?.user?.id; if (!id) return;
      await supabase.from('vr_player_look' as never).upsert({ user_id: id, ...look, updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
    } catch { /* offline */ }
  }, 1200);
}
let loaded = false;
export async function loadLook() {
  if (loaded) return; loaded = true;
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession(); const id = data.session?.user?.id; if (!id) { loaded = false; return; }
    const { data: row } = await supabase.from('vr_player_look' as never).select('skin,hair_color,shirt,trousers').eq('user_id', id).maybeSingle();
    if (row) { look = { ...look, ...(row as Look) }; try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* */ } ls.forEach((l) => l()); }
  } catch { loaded = false; }
}
