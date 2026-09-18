// ═══════════════════════════════════════════════════════════════════════════════
// VR SOCIAL FEED PANEL
// Additive in-world feed of real alerts: friends' listening alerts and new music
// uploads. Nothing is invented — rows come from the member's own notifications.
// Tapping an alert plays or opens it without leaving the VR world.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Music4, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { musicEngine } from '@/services/MusicEngine';
import { resolveMusicQueue } from '@/features/music/musicProviders';
import { fetchSharedPlaylist } from '@/features/music/musicShares';
import { useDailyPlanetaryMood } from '@/hooks/useDailyPlanetaryMood';

interface Alert {
  id: string;
  title: string;
  body: string;
  query: string;
  shareId?: string;
  at: string;
}

const TYPES = ['friend_music_listen', 'music_upload', 'friend_upload', 'playlist_share'];

const VRSocialFeedPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setAlerts([]); setNotice('Sign in to see your friends’ music.'); return; }
      const [notificationResult, uploadResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('id,type,context_data,created_at')
          .eq('user_id', auth.user.id)
          .in('type', TYPES)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('music_uploads')
          .select('id,title,artist,created_at')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (notificationResult.error) throw notificationResult.error;
      const notificationAlerts = (notificationResult.data ?? []).map((row) => {
        const context = (row.context_data ?? {}) as {
          track_title?: string; track_artist?: string; message?: string;
          share_id?: string; playlist_name?: string; track_count?: number;
        };
        const query = [context.track_title, context.track_artist].filter(Boolean).join(' ');
        const isShare = row.type === 'playlist_share';
        return {
          id: row.id as string,
          title: isShare ? (context.playlist_name || 'Shared playlist') : (context.track_title || 'Music alert'),
          body: isShare
            ? `Playlist from a friend · ${context.track_count ?? 0} songs`
            : (context.track_artist || context.message || ''),
          query,
          shareId: isShare ? context.share_id : undefined,
          at: new Date(row.created_at as string).toLocaleString(),
        };
      });
      const uploadAlerts: Alert[] = (uploadResult.data ?? []).map((row) => ({
        id: `upload:${row.id as string}`,
        title: row.title as string,
        body: `${(row.artist as string) || 'My upload'} · uploaded by me`,
        query: [row.title, row.artist].filter(Boolean).join(' '),
        at: new Date(row.created_at as string).toLocaleString(),
      }));
      setAlerts([...notificationAlerts, ...uploadAlerts]
        .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
        .slice(0, 30));
      setNotice('');
    } catch {
      setNotice('Alerts could not be loaded. Check your connection.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const play = async (alert: Alert) => {
    musicEngine.unlock();
    if (alert.shareId) {
      try {
        const shared = await fetchSharedPlaylist(alert.shareId);
        if (!shared?.tracks.length) { setNotice('That shared playlist has no songs yet.'); return; }
        await musicEngine.playQueue(shared.tracks, 0);
        setNotice(`Playing “${shared.name}” (${shared.tracks.length} songs).`);
      } catch {
        setNotice('That shared playlist could not be opened right now.');
      }
      return;
    }
    if (!alert.query) { setNotice('That alert has no song attached.'); return; }
    try {
      const result = await resolveMusicQueue(alert.query, 'track');
      if (!result.tracks.length) { setNotice('That song is not playable from the connected sources.'); return; }
      await musicEngine.playQueue(result.tracks);
      setNotice(`Playing “${result.tracks[0].title}”.`);
    } catch {
      setNotice('That song could not be started right now.');
    }
  };


  return (
    <div className="w-64 sm:w-72 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-300" aria-hidden="true" />
        <p className="flex-1 text-xs font-semibold">Friends’ music</p>
        <button type="button" aria-label="Refresh friends’ music alerts" onClick={() => void load()} className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>
      {moodLine && (
        <p className="mb-2 text-[11px] text-white/60">
          <span className="text-white/40">My mood now: </span>{moodLine}
        </p>
      )}
      {notice && <p role="status" className="mb-2 text-[11px] text-white/60">{notice}</p>}
      <ul className="max-h-52 space-y-1 overflow-y-auto">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => void play(alert)}
              className="flex w-full min-h-11 items-start gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Music4 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs">{alert.title}</span>
                <span className="block truncate text-[10px] text-white/50">{alert.body || alert.at}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!busy && !alerts.length && !notice && <p className="text-[11px] text-white/40">No music alerts yet. They appear here as friends play and upload songs.</p>}
    </div>
  );
};

export default VRSocialFeedPanel;
