/**
 * VR world control panel (admin only). Writes go to vr_world_events /
 * vr_world_settings, which the database accepts only from the admin role.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { loadRealmapSettings, saveRealmapSettings, type RealmapSettings } from '@/worlds/realmap/realmapAdminSettings';

const ROOM = 'global';
type Settings = { maintenance?: boolean; voice_chat?: boolean; max_players?: number; motd?: string };

export default function AdminVRWorldPage() {
  const db = supabase as any;
  const [settings, setSettings] = useState<Settings>({ voice_chat: true, max_players: 50 });
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [rm, setRm] = useState<RealmapSettings>({});
  useEffect(() => { void loadRealmapSettings().then(setRm).catch(() => {}); }, []);
  const saveRm = async (patch: Partial<RealmapSettings>) => {
    const err = await saveRealmapSettings(patch);
    if (err) return toast.error(`Not saved: ${err}`);
    setRm((r) => ({ ...r, ...patch })); toast.success('Saved for every member');
  };
  const todayStr = new Date().toISOString().slice(0, 10);
  const drops = (rm.relic_drops ?? []).filter((d) => d.day === todayStr);

  const loadEvents = async () => {
    const { data } = await db.from('vr_world_events').select('*').eq('room_id', ROOM).order('created_at', { ascending: false }).limit(15);
    setEvents(data ?? []);
  };

  useEffect(() => {
    db.from('vr_world_settings').select('settings').eq('room_id', ROOM).maybeSingle()
      .then(({ data }: any) => data?.settings && setSettings(data.settings));
    void loadEvents();
  }, []);

  const save = async () => {
    const { error } = await db.from('vr_world_settings').upsert({ room_id: ROOM, settings });
    if (error) return toast.error(`Not saved: ${error.message}`);
    await db.from('vr_world_events').insert({ room_id: ROOM, event: 'setting', data: settings });
    toast.success('World settings saved');
    void loadEvents();
  };

  const send = async (event: string, data: Record<string, unknown> = {}) => {
    const { error } = await db.from('vr_world_events').insert({ room_id: ROOM, event, data });
    if (error) return toast.error(`Refused: ${error.message}`);
    toast.success('Sent to the VR world');
    void loadEvents();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">VR world controls</h1>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between"><span>Maintenance mode</span>
          <Switch checked={!!settings.maintenance} onCheckedChange={(v) => setSettings({ ...settings, maintenance: v })} /></div>
        <div className="flex items-center justify-between"><span>Voice chat</span>
          <Switch checked={settings.voice_chat !== false} onCheckedChange={(v) => setSettings({ ...settings, voice_chat: v })} /></div>
        <label className="block text-sm">Max players
          <Input type="number" min={1} max={500} value={settings.max_players ?? 50}
            onChange={(e) => setSettings({ ...settings, max_players: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} /></label>
        <label className="block text-sm">Welcome message
          <Input maxLength={200} value={settings.motd ?? ''} onChange={(e) => setSettings({ ...settings, motd: e.target.value })} /></label>
        <Button onClick={save}>Save settings</Button>
      </Card>
      <Card className="p-4 space-y-3">
        <h2 className="font-medium">Real Map (everyone)</h2>
        <div className="flex items-center justify-between"><span>Demo explorer walker</span>
          <Switch checked={rm.demo_bot !== false} onCheckedChange={(v) => void saveRm({ demo_bot: v })} /></div>
        <div className="text-sm">
          <p>Shop relics dropped today: {drops.length}</p>
          {drops.slice(0, 8).map((d, i) => <p key={i} className="text-muted-foreground">{d.name}</p>)}
          <p className="text-muted-foreground mt-1">Drop new ones inside VR World: Admin box → <span className="font-mono">relics</span> or <span className="font-mono">relics KFC</span>.</p>
        </div>
        <Button variant="outline" disabled={!drops.length} onClick={() => void saveRm({ relic_drops: [] })}>Clear shop relics</Button>
      </Card>
      <Card className="p-4 space-y-3">
        <Input maxLength={280} placeholder="Announcement to everyone in the world" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!message.trim()} onClick={() => { void send('broadcast', { message: message.trim() }); setMessage(''); }}>Announce</Button>
          <Button variant="outline" onClick={() => send('summon_all', { position: { x: 0, y: 1.6, z: 0 } })}>Summon everyone</Button>
          <Button variant="destructive" onClick={() => confirm('Reset the world for everyone?') && send('world_reset')}>Reset world</Button>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-medium mb-2">Recent commands</h2>
        <ul className="text-sm space-y-1">
          {events.map((e) => <li key={e.id} className="flex justify-between"><span>{e.event}</span><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span></li>)}
          {events.length === 0 && <li className="text-muted-foreground">No commands yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
