/**
 * Zoe's humor drop — a plain feed post in the Calls-page liquid-glass style.
 * Presentation only; the skit comes pre-written from `humor_drops`. Audio is
 * played only when the member taps Play, one Deepgram voice at a time with a
 * short gap between speakers so lines never overlap.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Laugh, Pause, Play, ThumbsUp, ThumbsDown, MessageCircle, Share2, Send, Eye, Bell, BellRing } from 'lucide-react';
import { claimVoice, releaseVoice, registerVoiceChannel } from '@/lib/zoeVoiceArbiter';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import type { HumorDrop } from '@/hooks/useHumorDrops';

const VOICE = { A: 'aura-2-janus-en', B: 'aura-2-orion-en' } as const;
const GAP_MS = 450;
const TINT: Record<HumorDrop['metal'], string> = {
  iron: 'from-destructive/25',
  silver: 'from-primary/25',
  lead: 'from-accent/25',
  quicksilver: 'from-secondary/30',
};
const LABEL: Record<HumorDrop['metal'], string> = {
  iron: 'Mars mood', silver: 'Moon mood', lead: 'Saturn mood', quicksilver: 'Mercury mood',
};

async function speak(text: string, model: string, signal: AbortSignal): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('signed out');
  const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/deepgram-tts`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  return res.blob();
}

type Comment = { id: string; user_id: string; body: string; created_at: string };

export const HumorDropCard: React.FC<{ drop: HumorDrop }> = ({ drop }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [mine, setMine] = useState<'like' | 'dislike' | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [views, setViews] = useState(0);
  const [following, setFollowing] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const loadSocial = React.useCallback(async () => {
    const [{ data: r }, { data: c }, { count }, { data: f }] = await Promise.all([
      supabase.from('humor_reactions' as never).select('user_id, reaction').eq('drop_id', drop.id),
      supabase.from('humor_comments' as never).select('id, user_id, body, created_at').eq('drop_id', drop.id).order('created_at').limit(100),
      supabase.from('humor_views' as never).select('drop_id', { count: 'exact', head: true }).eq('drop_id', drop.id),
      supabase.from('humor_follows' as never).select('category').eq('user_id', user?.id ?? '').eq('category', drop.category).maybeSingle(),
    ]);
    setViews(count ?? 0);
    setFollowing(Boolean(f));
    const rows = (r ?? []) as unknown as { user_id: string; reaction: 'like' | 'dislike' }[];
    setLikes(rows.filter((x) => x.reaction === 'like').length);
    setDislikes(rows.filter((x) => x.reaction === 'dislike').length);
    setMine(rows.find((x) => x.user_id === user?.id)?.reaction ?? null);
    setComments((c ?? []) as unknown as Comment[]);
  }, [drop.id, user?.id]);
  useEffect(() => { if (user?.id) void loadSocial().catch(() => {}); }, [loadSocial, user?.id]);

  // Record one view per member once the card is actually on screen.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !user?.id) return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      void supabase.from('humor_views' as never).upsert({ drop_id: drop.id, user_id: user.id } as never, { onConflict: 'drop_id,user_id', ignoreDuplicates: true })
        .then(() => loadSocial().catch(() => {}));
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [drop.id, user?.id, loadSocial]);

  const toggleFollow = async () => {
    if (!user?.id) return;
    const table = supabase.from('humor_follows' as never);
    if (following) await table.delete().eq('user_id', user.id).eq('category', drop.category);
    else await table.insert({ user_id: user.id, category: drop.category } as never);
    setFollowing(!following);
    window.dispatchEvent(new CustomEvent('mmora:humor-follows'));
  };

  const react = async (kind: 'like' | 'dislike') => {
    if (!user?.id) return;
    const table = supabase.from('humor_reactions' as never);
    if (mine === kind) await table.delete().eq('drop_id', drop.id).eq('user_id', user.id);
    else await table.upsert({ drop_id: drop.id, user_id: user.id, reaction: kind } as never, { onConflict: 'drop_id,user_id' });
    await loadSocial().catch(() => {});
  };

  const postComment = async () => {
    const body = draft.trim().slice(0, 500);
    if (!body || !user?.id || sending) return;
    setSending(true);
    const { error } = await supabase.from('humor_comments' as never).insert({ drop_id: drop.id, user_id: user.id, body } as never);
    setSending(false);
    if (!error) { setDraft(''); await loadSocial().catch(() => {}); }
  };

  const share = async (target?: 'x' | 'whatsapp' | 'facebook') => {
    const text = `${drop.headline} — ${drop.lines.map((l) => l.text).join(' ')}`.slice(0, 280);
    const url = `${window.location.origin}/zoe-lol`;
    if (!target && navigator.share) { try { await navigator.share({ title: drop.headline, text, url }); return; } catch { return; } }
    const e = encodeURIComponent;
    const href = target === 'whatsapp' ? `https://wa.me/?text=${e(`${text} ${url}`)}`
      : target === 'facebook' ? `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`
      : `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);
  const stopRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    stopRef.current?.abort();
    audioRef.current?.pause();
    setPlaying(false);
    setActive(-1);
  };
  useEffect(() => {
    const unregister = registerVoiceChannel('narration', stop);
    return () => { unregister(); stop(); };
  }, []);
  const play = async (ambient = false) => {
    if (playing) return stop();
    if (!claimVoice('narration', { ambient })) return;
    const ctrl = new AbortController();
    stopRef.current = ctrl;
    setPlaying(true);
    setFailed(false);
    try {
      // Fetch clips in parallel, play strictly in order.
      const clips = drop.lines.map((l) => speak(l.text, VOICE[l.speaker], ctrl.signal));
      for (let i = 0; i < clips.length; i++) {
        const blob = await clips[i];
        if (ctrl.signal.aborted) return;
        setActive(i);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = audio.onerror = () => resolve();
          ctrl.signal.addEventListener('abort', () => resolve(), { once: true });
          void audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        if (ctrl.signal.aborted) return;
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    } catch {
      if (!ctrl.signal.aborted) setFailed(true);
    } finally {
      if (stopRef.current === ctrl) { setPlaying(false); setActive(-1); releaseVoice('narration'); }
    }
  };

  const when = new Date(drop.scheduled_for || drop.created_at);
  const stamp = Number.isNaN(when.getTime()) ? '' : when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const icon = 'flex items-center gap-1 border-0 bg-transparent p-0 text-white outline-none';

  return (
    <article
      ref={cardRef}
      data-humor-drop={drop.id}
      className="relative w-full overflow-hidden rounded-3xl bg-white/5 text-white backdrop-blur-xl"
    >
      {drop.image_url && (
        <img src={drop.image_url} alt="" aria-hidden loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${TINT[drop.metal]} via-black/30 to-black/75`} aria-hidden />
      <div className="relative flex min-h-[26rem] flex-col p-5">
        <header className="flex items-center gap-2 text-xs text-white">
          <Laugh className="h-4 w-4" aria-hidden />
          <span className="font-semibold tracking-wide">Zoe's LOL</span>
          <span className="text-white/80">· {drop.origin === 'member' ? 'Member joke' : LABEL[drop.metal]} · {drop.category}</span>
          <button type="button" onClick={() => void toggleFollow()} aria-pressed={following} aria-label={following ? `Unfollow ${drop.category} jokes` : `Follow ${drop.category} jokes`} className={`${icon} ml-auto`}>
            {following ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}<span>{following ? 'Following' : 'Follow'}</span>
          </button>
        </header>
        {stamp && <time dateTime={when.toISOString()} className="mt-1 text-[11px] text-white/70">{stamp}</time>}
        <div className="mt-auto pt-24">
          <h3 className="mb-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {drop.headline}
          </h3>
          <ul className="space-y-2">
            {drop.lines.map((line, i) => (
              <li
                key={i}
                className={`break-words text-[15px] leading-snug transition-opacity ${active === -1 || active === i ? 'opacity-100' : 'opacity-50'} ${line.speaker === 'B' ? 'pl-6 font-semibold' : 'font-medium'}`}
                style={{ textShadow: '0 1px 5px rgba(0,0,0,0.7)' }}
              >
                {line.text}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <button type="button" onClick={() => void play(false)} aria-label={playing ? 'Stop the skit' : 'Play the skit'} className={icon}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" aria-label="Like" aria-pressed={mine === 'like'} onClick={() => void react('like')} className={icon}>
              <ThumbsUp className="h-5 w-5" fill={mine === 'like' ? 'currentColor' : 'none'} />{likes}
            </button>
            <button type="button" aria-label="Dislike" aria-pressed={mine === 'dislike'} onClick={() => void react('dislike')} className={icon}>
              <ThumbsDown className="h-5 w-5" fill={mine === 'dislike' ? 'currentColor' : 'none'} />{dislikes}
            </button>
            <button type="button" aria-label="Comments" onClick={() => setShowComments((v) => !v)} className={icon}>
              <MessageCircle className="h-5 w-5" />{comments.length}
            </button>
            <span className={icon} aria-label={`${views} views`}><Eye className="h-5 w-5" />{views}</span>
            <button type="button" aria-label="Share" onClick={() => void share()} className={`${icon} ml-auto`}>
              <Share2 className="h-5 w-5" />
            </button>
          </div>
          {failed && <p className="mt-2 text-xs text-white/80">Voice unavailable right now — the words are all here.</p>}
          <div className="mt-2 flex justify-end gap-3 text-xs text-white/80">
            <button type="button" className="border-0 bg-transparent p-0" onClick={() => void share('whatsapp')}>WhatsApp</button>
            <button type="button" className="border-0 bg-transparent p-0" onClick={() => void share('x')}>X</button>
            <button type="button" className="border-0 bg-transparent p-0" onClick={() => void share('facebook')}>Facebook</button>
          </div>
          {showComments && (
            <section className="mt-3 max-h-48 space-y-2 overflow-y-auto" data-humor-comments>
              {comments.map((c) => (
                <p key={c.id} className="break-words text-sm text-white"><span className="font-semibold">{c.user_id === user?.id ? 'You' : 'Member'}:</span> {c.body}</p>
              ))}
              <div className="flex items-center gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void postComment(); }} maxLength={500} placeholder="Share your view…" className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-white placeholder:text-white/60 outline-none" />
                <button type="button" aria-label="Post comment" onClick={() => void postComment()} disabled={sending || !draft.trim()} className={`${icon} disabled:opacity-40`}><Send className="h-5 w-5" /></button>
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  );
};

export default HumorDropCard;
