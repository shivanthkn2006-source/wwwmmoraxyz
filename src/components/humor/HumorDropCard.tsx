/**
 * Zoe's humor drop — a plain feed post in the Calls-page liquid-glass style.
 * Presentation only; the skit comes pre-written from `humor_drops`. Audio is
 * played only when the member taps Play, one Deepgram voice at a time with a
 * short gap between speakers so lines never overlap.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Laugh, Pause, Play, ThumbsUp, ThumbsDown, MessageCircle, Share2, Send } from 'lucide-react';
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

const ANNOUNCED_KEY = 'mmora:humor-announced:v1';
/** A drop is announced once per device, only while fresh (first 2h after its slot). */
function shouldAnnounce(drop: HumorDrop): boolean {
  if (Date.now() - new Date(drop.created_at).getTime() > 2 * 3600_000) return false;
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(ANNOUNCED_KEY) || '[]');
    if (seen.includes(drop.id)) return false;
    localStorage.setItem(ANNOUNCED_KEY, JSON.stringify([...seen.slice(-40), drop.id]));
    return true;
  } catch { return false; }
}

type Comment = { id: string; user_id: string; body: string; created_at: string };

export const HumorDropCard: React.FC<{ drop: HumorDrop; autoAnnounce?: boolean }> = ({ drop, autoAnnounce = false }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [mine, setMine] = useState<'like' | 'dislike' | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadSocial = React.useCallback(async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('humor_reactions' as never).select('user_id, reaction').eq('drop_id', drop.id),
      supabase.from('humor_comments' as never).select('id, user_id, body, created_at').eq('drop_id', drop.id).order('created_at').limit(100),
    ]);
    const rows = (r ?? []) as unknown as { user_id: string; reaction: 'like' | 'dislike' }[];
    setLikes(rows.filter((x) => x.reaction === 'like').length);
    setDislikes(rows.filter((x) => x.reaction === 'dislike').length);
    setMine(rows.find((x) => x.user_id === user?.id)?.reaction ?? null);
    setComments((c ?? []) as unknown as Comment[]);
  }, [drop.id, user?.id]);
  useEffect(() => { if (user?.id) void loadSocial().catch(() => {}); }, [loadSocial, user?.id]);

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
  // Scheduled announcement: when a fresh drop lands, Zoe reads it once per device
  // (never over a live search/chat voice; browsers may still require a prior tap).
  useEffect(() => {
    if (!autoAnnounce || !shouldAnnounce(drop)) return;
    const t = setTimeout(() => void play(true), 1500);
    return () => clearTimeout(t);
  }, [autoAnnounce, drop.id]);

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

  return (
    <article
      data-humor-drop={drop.id}
      className={`w-full rounded-3xl border border-white/15 bg-gradient-to-br ${TINT[drop.metal]} to-transparent bg-white/5 p-5 text-white backdrop-blur-xl`}
    >
      <header className="mb-3 flex items-center gap-2 text-xs text-white/70">
        <Laugh className="h-4 w-4" aria-hidden />
        <span>Zoe's LOL · {LABEL[drop.metal]}</span>
      </header>
      {drop.image_url && (
        <img src={drop.image_url} alt={drop.headline} loading="lazy" className="mb-4 aspect-square w-full rounded-2xl object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}
      <h3
        className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-white"
        style={{ WebkitTextStroke: '0.6px rgba(0,0,0,0.55)', textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
      >
        {drop.headline}
      </h3>
      <ul className="space-y-2">
        {drop.lines.map((line, i) => (
          <li
            key={i}
            className={`text-[15px] leading-snug transition-opacity ${active === -1 || active === i ? 'opacity-100' : 'opacity-50'} ${line.speaker === 'B' ? 'pl-6 font-semibold' : 'font-medium'}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {line.text}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void play(false)}
          aria-label={playing ? 'Stop the skit' : 'Play the skit'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        {failed && <span className="text-xs text-white/70">Voice unavailable right now — the words are all here.</span>}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <button type="button" aria-label="Like" aria-pressed={mine === 'like'} onClick={() => void react('like')} className={`flex items-center gap-1 ${mine === 'like' ? 'text-white' : 'text-white/70'}`}>
            <ThumbsUp className="h-5 w-5" fill={mine === 'like' ? 'currentColor' : 'none'} />{likes}
          </button>
          <button type="button" aria-label="Dislike" aria-pressed={mine === 'dislike'} onClick={() => void react('dislike')} className={`flex items-center gap-1 ${mine === 'dislike' ? 'text-white' : 'text-white/70'}`}>
            <ThumbsDown className="h-5 w-5" fill={mine === 'dislike' ? 'currentColor' : 'none'} />{dislikes}
          </button>
          <button type="button" aria-label="Comments" onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1 text-white/70">
            <MessageCircle className="h-5 w-5" />{comments.length}
          </button>
          <button type="button" aria-label="Share" onClick={() => void share()} className="text-white/70">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-3 text-xs text-white/60">
        <button type="button" onClick={() => void share('whatsapp')}>WhatsApp</button>
        <button type="button" onClick={() => void share('x')}>X</button>
        <button type="button" onClick={() => void share('facebook')}>Facebook</button>
      </div>
      {showComments && (
        <section className="mt-3 space-y-2" data-humor-comments>
          {comments.map((c) => (
            <p key={c.id} className="text-sm text-white/90"><span className="font-semibold">{c.user_id === user?.id ? 'You' : 'Member'}:</span> {c.body}</p>
          ))}
          <div className="flex items-center gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void postComment(); }} maxLength={500} placeholder="Share your view…" className="flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/50 outline-none" />
            <button type="button" aria-label="Post comment" onClick={() => void postComment()} disabled={sending || !draft.trim()} className="text-white disabled:opacity-40"><Send className="h-5 w-5" /></button>
          </div>
        </section>
      )}
    </article>
  );
};

export default HumorDropCard;
