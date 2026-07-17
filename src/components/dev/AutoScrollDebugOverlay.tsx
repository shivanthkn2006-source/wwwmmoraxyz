import React, { useEffect, useState } from 'react';

interface Entry {
  scope: 'today' | 'fallback';
  count: number;
  lastScrolledId?: string | null;
  at: number;
}

/**
 * Dev-only floating overlay that surfaces how many posts were classified as
 * `data-today` and which post was most recently auto-scrolled. Never rendered
 * in production builds.
 */
const AutoScrollDebugOverlay: React.FC = () => {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const refreshCounts = () => {
      setTodayCount(document.querySelectorAll('[data-post-card][data-today="true"]').length);
      setTotalCount(document.querySelectorAll('[data-post-card]').length);
    };
    refreshCounts();
    const mo = new MutationObserver(refreshCounts);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-today'] });

    const onAnalytics = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name === 'home_autoscroll_scope') {
        setEntry({
          scope: detail.scope,
          count: detail.count,
          lastScrolledId: detail.lastScrolledId ?? null,
          at: Date.now(),
        });
      }
    };
    window.addEventListener('mmora:analytics', onAnalytics);
    return () => {
      mo.disconnect();
      window.removeEventListener('mmora:analytics', onAnalytics);
    };
  }, []);

  if (!import.meta.env.DEV || hidden) return null;

  return (
    <div
      data-testid="autoscroll-debug-overlay"
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        font: '11px/1.3 ui-monospace, monospace',
        padding: '6px 8px',
        borderRadius: 6,
        maxWidth: 240,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>auto-scroll</strong>
        <button
          onClick={() => setHidden(true)}
          style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}
          aria-label="Hide debug overlay"
        >
          ×
        </button>
      </div>
      <div data-testid="autoscroll-today-count">today: {todayCount}</div>
      <div data-testid="autoscroll-total-count">total: {totalCount}</div>
      <div data-testid="autoscroll-scope">
        scope: {entry?.scope ?? '—'} ({entry?.count ?? 0})
      </div>
      <div data-testid="autoscroll-last" style={{ wordBreak: 'break-all' }}>
        last: {entry?.lastScrolledId ?? '—'}
      </div>
    </div>
  );
};

export default AutoScrollDebugOverlay;
