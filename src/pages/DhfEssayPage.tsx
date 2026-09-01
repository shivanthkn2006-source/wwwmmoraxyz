/**
 * DHF ESSAY READER — the long-form half of a Daily Compass card.
 *
 * The feed card shows the headline plus a short summary; this page opens the
 * card's `full_story_content` at reading width with its own illustration and a
 * schedule control, so a member can push the essay to a moment they will
 * actually read it. Row-level security scopes `dhf_daily_posts` to its owner,
 * so an unknown or foreign id simply renders the not-found state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Compass, ImageOff, Loader2, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { slotLabel, type DhfDailyPost } from '@/lib/dhfCompass';
import {
  cancelEssaySchedule,
  defaultEssayTime,
  fetchEssaySchedule,
  scheduleEssay,
  toLocalInputValue,
  type EssaySchedule,
} from '@/lib/dhfEssaySchedule';

const statusTone: Record<string, string> = {
  scheduled: 'bg-sky-500/15 text-sky-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-muted text-muted-foreground',
};

const EssayImage: React.FC<{ post: DhfDailyPost }> = ({ post }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => setStatus('loading'), [post.image_url]);
  if (!post.image_url || status === 'failed') return null;
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl bg-muted/40 aspect-[16/9]">
      {status === 'loading' && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-muted">
          <ImageOff className="h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
        </div>
      )}
      <img
        src={post.image_url}
        alt={`Illustration for ${post.headline}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('failed')}
        className={`h-full w-full object-cover transition-opacity duration-500 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default function DhfEssayPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<DhfDailyPost | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<EssaySchedule | null>(null);
  const [when, setWhen] = useState(() => toLocalInputValue(defaultEssayTime()));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setUserId(uid);

      const { data, error } = await supabase
        .from('dhf_daily_posts')
        .select(
          'id, post_date, slot_time, category, headline, short_summary, full_story_content, image_url, image_path, image_source, powered_by_badge, referral_cta, astrological_context, created_at',
        )
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        console.error('[DhfEssay] load failed', error);
        toast.error('Could not open this essay.');
      }
      setPost((data as DhfDailyPost) ?? null);

      if (uid && data) {
        const existing = await fetchEssaySchedule(uid, postId);
        setSchedule(existing);
        if (existing) setWhen(toLocalInputValue(new Date(existing.scheduled_for)));
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const paragraphs = useMemo(
    () =>
      (post?.full_story_content ?? '')
        .split(/\n{2,}|\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [post?.full_story_content],
  );

  const onSchedule = async () => {
    if (!post || !userId) return;
    setSaving(true);
    const { error } = await scheduleEssay({
      userId,
      postId: post.id,
      scheduledFor: when,
      createdBy: userId,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not schedule: ${error}`);
      return;
    }
    toast.success(`Essay scheduled for ${new Date(when).toLocaleString()}.`);
    void load();
  };

  const onCancel = async () => {
    if (!schedule) return;
    setSaving(true);
    const { error } = await cancelEssaySchedule(schedule.id);
    setSaving(false);
    if (error) {
      toast.error(`Could not cancel: ${error}`);
      return;
    }
    toast.success('Schedule cancelled.');
    void load();
  };

  const onShare = async () => {
    if (!post) return;
    const url = `${window.location.origin}/dhf/essay/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.headline, text: post.short_summary, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied.');
    } catch {
      /* the member dismissed the share sheet — nothing to report */
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Helmet>
        <title>{post ? `${post.headline} | Zoe's DHF` : "DHF Essay | Zoe's DHF"}</title>
        <meta
          name="description"
          content={post?.short_summary?.slice(0, 155) ?? 'The full story behind your Daily Compass card.'}
        />
      </Helmet>

      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Link to="/compass" className="text-sm text-muted-foreground hover:text-foreground">
            All compass cards
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening the essay…
          </div>
        ) : !post ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              This essay is not available. Compass cards are private to the member they were written
              for, and they may also have been pruned.
            </CardContent>
          </Card>
        ) : (
          <>
            <article className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-7">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.08em] text-primary">
                <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Zoe&apos;s DHF</span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-medium">
                  <Compass className="h-3 w-3" aria-hidden="true" />
                  {post.category}
                </span>
                <span>{post.post_date}</span>
                <span>·</span>
                <span>{slotLabel(post.slot_time)}</span>
                <button
                  type="button"
                  onClick={() => void onShare()}
                  aria-label="Share this essay"
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <EssayImage post={post} />

              <h1 className="mb-3 text-2xl font-semibold leading-tight">{post.headline}</h1>
              <p className="mb-5 text-base leading-relaxed text-muted-foreground">{post.short_summary}</p>

              <div className="space-y-4" data-dhf-essay-body>
                {paragraphs.length ? (
                  paragraphs.map((para, index) => (
                    <p key={index} className="text-[15px] leading-7 text-foreground">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This card does not carry a long-form story yet.
                  </p>
                )}
              </div>

              {post.astrological_context && (
                <p className="mt-6 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  {post.astrological_context}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {post.powered_by_badge || "Powered by Zoe's DHF"}
                </span>
                {post.referral_cta && (
                  <span className="text-[11px] text-muted-foreground">{post.referral_cta}</span>
                )}
              </div>
            </article>

            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Schedule this essay</h2>
                  {schedule && (
                    <Badge className={statusTone[schedule.status] ?? ''}>{schedule.status}</Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Zoe will send you a notification with this essay at the time you pick.
                  {schedule?.status === 'scheduled' &&
                    ` Currently set for ${new Date(schedule.scheduled_for).toLocaleString()}.`}
                  {schedule?.status === 'delivered' &&
                    schedule.delivered_at &&
                    ` Delivered ${new Date(schedule.delivered_at).toLocaleString()}.`}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={when}
                    onChange={(event) => setWhen(event.target.value)}
                    className="w-auto min-w-[15rem]"
                    aria-label="Essay delivery time"
                  />
                  <Button onClick={() => void onSchedule()} disabled={saving || !userId}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarClock className="mr-2 h-4 w-4" />
                    )}
                    {schedule?.status === 'scheduled' ? 'Reschedule' : 'Schedule essay'}
                  </Button>
                  {schedule?.status === 'scheduled' && (
                    <Button variant="ghost" onClick={() => void onCancel()} disabled={saving}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
