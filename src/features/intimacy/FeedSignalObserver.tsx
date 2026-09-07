/**
 * Passive feed-signal observer.
 *
 * Renders nothing and changes no markup. It watches the post cards the feed
 * already renders (`[data-post-card]`) and translates real attention — a card
 * entering view, how long it genuinely stayed on screen — into `feed_events`,
 * which the closeness graph is built from. Signed-out members produce nothing.
 */
import { useEffect } from 'react';
import { recordFeedEvent, flushFeedEvents } from './feedEvents';

const MIN_DWELL_MS = 1200;
const VISIBLE_RATIO = 0.5;

interface Props {
  /** Surface label recorded with each event, e.g. "home". */
  surface?: string;
  enabled?: boolean;
}

export const FeedSignalObserver: React.FC<Props> = ({ surface = 'home', enabled = true }) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const shownAt = new WeakMap<Element, number>();
    const seen = new WeakSet<Element>();

    const meta = (el: Element) => {
      const node = el as HTMLElement;
      return {
        postId: node.dataset.postId ?? null,
        targetUserId: node.dataset.authorId ?? node.dataset.userId ?? null,
      };
    };

    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const entry of entries) {
          const { postId, targetUserId } = meta(entry.target);
          if (!postId && !targetUserId) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            shownAt.set(entry.target, now);
            if (!seen.has(entry.target)) {
              seen.add(entry.target);
              void recordFeedEvent({ type: 'view', postId, targetUserId, surface });
            }
          } else {
            const start = shownAt.get(entry.target);
            if (start == null) continue;
            shownAt.delete(entry.target);
            const dwellMs = Math.round(now - start);
            if (dwellMs >= MIN_DWELL_MS) {
              void recordFeedEvent({ type: 'dwell', postId, targetUserId, dwellMs, surface });
            } else {
              void recordFeedEvent({ type: 'skip', postId, targetUserId, surface });
            }
          }
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );

    const attach = () => {
      document.querySelectorAll('[data-post-card]').forEach((el) => io.observe(el));
    };
    attach();

    // The feed streams in new cards; pick them up without re-rendering anything.
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      void flushFeedEvents();
    };
  }, [surface, enabled]);

  return null;
};

export default FeedSignalObserver;
