/**
 * ZOE'S DHF CARD — presentation only.
 *
 * Mirrors the existing growth-insight card geometry so the feed keeps exactly
 * the same look and rhythm. It never fetches or generates anything: the image
 * URL and every line of copy come pre-computed from `dhf_daily_posts`, so a
 * scroll or a reload costs nothing.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Compass, ChevronDown, ChevronUp, Flag, ImageOff, Share2 } from 'lucide-react';
import { slotLabel, type DhfDailyPost } from '@/lib/dhfCompass';
import { COMPASS_SLOTS, normalizeSlotTime } from '@/lib/dhfCompass';
import ZoeCardNarrationControls from '@/components/voice/ZoeCardNarrationControls';
import ReportContentDialog from '@/components/moderation/ReportContentDialog';
import DhfShareSheet from '@/components/dhf/DhfShareSheet';
import DhfVideoLinks from '@/components/dhf/DhfVideoLinks';
import { Button } from '@/components/ui/button';


interface Props {
  post: DhfDailyPost;
  className?: string;
  /** Fired once when the card first becomes at least half visible. */
  onImpression?: (post: DhfDailyPost) => void;
  onShare?: (post: DhfDailyPost) => void;
}

const CompassImage: React.FC<{ post: DhfDailyPost }> = ({ post }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => { setStatus('loading'); }, [post.image_url]);
  if (!post.image_url || status === 'failed') return (
    <div className="flex min-h-36 items-center justify-center bg-muted/40 text-muted-foreground" data-dhf-image-fallback>
      <ImageOff className="h-5 w-5" aria-hidden="true" />
    </div>
  );
  return (
    <div className="relative h-full min-h-40 overflow-hidden bg-muted/40" data-dhf-image>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-muted">
          <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
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
        className={`absolute inset-0 h-full w-full scale-[1.06] object-cover transition-opacity duration-500 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />
      <span
        className="absolute bottom-0 right-0 z-10 flex h-[9%] min-h-6 w-[30%] min-w-24 items-center justify-end bg-gradient-to-l from-background/95 via-background/85 to-transparent pr-2 text-[9px] font-semibold text-foreground backdrop-blur-sm"
        data-dhf-image-brand
      >
        M&apos;Mora / Zoe
      </span>
    </div>
  );
};

export const DHFCompassCard: React.FC<Props> = ({ post, className, onImpression, onShare }) => {
  const ref = useRef<HTMLElement | null>(null);
  const reported = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!onImpression || reported.current) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !reported.current) {
          reported.current = true;
          onImpression(post);
          observer.disconnect();
        }
      }
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onImpression, post]);

  return (
    <article
      ref={ref}
      className={`overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${className ?? ''}`}
      data-dhf-card
      data-dhf-slot={post.slot_time}
    >
      <div className="grid grid-cols-1 overflow-hidden sm:grid-cols-[minmax(0,42%)_minmax(0,58%)]" data-dhf-lead>
        <CompassImage post={post} />
        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.08em] text-primary" data-dhf-brand>
            <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Zoe&apos;s DHF</span>
          </div>
          <header className="mb-3 grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Compass className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{post.category}</span>
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{slotLabel(post.slot_time)}</span>
            </div>
            <div className="relative z-20 flex shrink-0 items-center gap-1">
          <ZoeCardNarrationControls
            id={`dhf:${post.id}`}
            text={`${post.headline}. ${post.short_summary}${post.full_story_content ? ` ${post.full_story_content}` : ''}`}
            kind="dhf"
            order={Math.max(0, COMPASS_SLOTS.findIndex((slot) => slot.time === normalizeSlotTime(post.slot_time)))}
          />
          <button
            type="button"
            aria-label="Share this compass card"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onShare?.(post);
              setShareOpen(true);
            }}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Report this compass card"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setReportOpen(true); }}
            className="pointer-events-auto h-10 w-10 rounded-full text-muted-foreground"
          >
            <Flag className="h-5 w-5" aria-hidden="true" />
          </Button>
            </div>
          </header>
          <h2 className="mb-2 text-lg font-semibold leading-snug">{post.headline}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{post.short_summary}</p>
        </div>
      </div>

      <div className="p-4 pt-3 sm:p-5 sm:pt-4">

      {/* Real destinations for this story — never a dead placeholder link. */}
      <DhfVideoLinks headline={post.headline} category={post.category} />

      {post.full_story_content && (

        <>
          {expanded && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground" data-dhf-story>
              {post.full_story_content}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-expanded={expanded}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExpanded((v) => !v); }}
              className="inline-flex items-center gap-1 rounded-full bg-transparent px-1 py-1 text-xs font-medium text-primary transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded ? 'Show less' : 'Read the full story'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            <Link
              to={`/dhf/essay/${post.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full px-1 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open essay
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {post.powered_by_badge || "Powered by Zoe's DHF"}
        </span>
        {post.referral_cta && (
          <span className="text-[11px] text-muted-foreground" data-dhf-referral>{post.referral_cta}</span>
        )}
      </div>
      <DhfShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Share this compass card"
        payload={{
          text: `${post.headline} — ${post.short_summary}`,
          url: typeof window !== 'undefined' ? `${window.location.origin}/dhf/essay/${post.id}` : undefined,
          hashtags: [post.category, 'MMora', 'DailyCompass'],
        }}
      />
      <ReportContentDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="dhf_compass"
        targetId={post.id}
      />
      </div>
    </article>
  );
};

export default DHFCompassCard;
