/**
 * Platform-wide Real Map admin settings (row room_id='realmap' in
 * vr_world_settings: only the admin writes, every signed-in member reads):
 *  - demo_bot: show the demo explorer walker for everyone
 *  - relic_drops: relics the admin dropped at shops (today only)
 */
import { supabase } from '@/integrations/supabase/client';

export type RelicDrop = { lat: number; lng: number; name: string; day: string };
export type RealmapSettings = { demo_bot?: boolean; relic_drops?: RelicDrop[] };
const ROOM = 'realmap';
const db = supabase as any;

export async function loadRealmapSettings(): Promise<RealmapSettings> {
  const { data } = await db.from('vr_world_settings').select('settings').eq('room_id', ROOM).maybeSingle();
  return (data?.settings as RealmapSettings) ?? {};
}

export async function saveRealmapSettings(patch: Partial<RealmapSettings>): Promise<string | null> {
  const cur = await loadRealmapSettings();
  const { error } = await db.from('vr_world_settings').upsert({ room_id: ROOM, settings: { ...cur, ...patch } });
  return error ? error.message : null;
}
