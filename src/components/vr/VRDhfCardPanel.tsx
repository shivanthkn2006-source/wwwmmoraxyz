// ═══════════════════════════════════════════════════════════════════════════════
// VR DHF CARD PANEL
// Zoe's DHF cards inside the world: the same rows the Home feed reads, with
// their oil-painting artwork. Tapping a card opens it full-screen in-world with
// the painting and the full text. Read-only and additive — no DHF generation,
// card component or Home feed code is touched.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useDhfDailyFeed } from '@/hooks/useDhfDailyFeed';
import type { DhfDailyPost } from '@/lib/dhfCompass';

const VRDhfCardPanel: React.FC = () => {
  const { posts, loading, error, generating } = useDhfDailyFeed();
  const [open, setOpen] = useState<DhfDailyPost | null>(null);

  return (
    <div className="w-64 sm:w-80 rounded-2xl bg-black/50 p-3 text-white backdrop-blur-xl">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
        Zoe&apos;s cards
      </p>

      {(loading || generating) && !posts.length && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-white/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zoe is preparing today&apos;s cards…
        </p>
      )}
      {error && !posts.length && (
        <p role="status" className="mt-2 text-[11px] text-white/60">Today&apos;s cards could not be loaded.</p>
      )}
      {!loading && !error && !posts.length && (
        <p className="mt-2 text-[11px] text-white/50">No card has arrived yet today.</p>
      )}

      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => setOpen(post)}
              className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Sparkles className="h-4 w-4 text-white/50" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold">{post.headline}</span>
                <span className="block truncate text-[10px] text-white/50">{post.category}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.headline}
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl"
        >
          <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-black/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-white/40">{open.category}</p>
                <h2 className="text-base font-semibold sm:text-lg">{open.headline}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close card"
                className="rounded-full bg-white/10 p-2 focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {open.image_url && (
                <img
                  src={open.image_url}
                  alt={open.headline}
                  className="w-full rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 space-y-2 text-sm text-white/80">
                <p>{open.short_summary}</p>
                <p className="whitespace-pre-line text-[13px] text-white/70">{open.full_story_content}</p>
                {open.astrological_context && (
                  <p className="text-[11px] text-white/50">{open.astrological_context}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VRDhfCardPanel;
