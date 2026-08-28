import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useGrowthFlags } from '@/hooks/useGrowthFlags';
import { GROWTH_FLAGS } from '@/lib/growthFlags';

interface NewContentBadgeProps {
  onViewed: () => void;
  className?: string;
  onDiagnostic?: (event: 'rendered' | 'viewed' | 'suppressed', reason?: string) => void;
}

const NewContentBadge: React.FC<NewContentBadgeProps> = ({ onViewed, className = '', onDiagnostic }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const onViewedRef = useRef(onViewed);
  const diagnosticRef = useRef(onDiagnostic);
  const suppressedLoggedRef = useRef(false);
  const [visible, setVisible] = useState(true);
  // Remote kill switch — the badge can be disabled platform-wide without a deploy.
  const { isEnabled, loading } = useGrowthFlags();
  const badgeEnabled = isEnabled(GROWTH_FLAGS.newBadge);

  onViewedRef.current = onViewed;
  diagnosticRef.current = onDiagnostic;

  useEffect(() => { diagnosticRef.current?.('rendered'); }, []);


  useEffect(() => {
    const node = ref.current;
    if (!node || !visible) return;
    // Non-breaking fallback: without a working IntersectionObserver we keep the
    // badge visible instead of dismissing content the user never actually saw.
    if (typeof IntersectionObserver === 'undefined') return;
    const viewedElement = node.parentElement ?? node;
    let timer: number | null = null;
    let observer: IntersectionObserver | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    try {
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (timer !== null) return;
          timer = window.setTimeout(() => {
            setVisible(false);
            onViewedRef.current();
            diagnosticRef.current?.('viewed');
            observer?.disconnect();
          }, 3000);
        } else {
          clearTimer();
        }
      }, { threshold: [0.6] });
      observer.observe(viewedElement);
    } catch {
      observer = null; // observer unavailable — badge stays until state changes upstream
      return;
    }

    return () => {
      observer?.disconnect();
      clearTimer();
    };
  }, [visible]);

  useEffect(() => {
    if (visible && !loading && !badgeEnabled && !suppressedLoggedRef.current) {
      suppressedLoggedRef.current = true;
      diagnosticRef.current?.('suppressed', 'remote_flag_disabled');
    }
  }, [visible, loading, badgeEnabled]);


  // Never hide a real unseen marker merely because the remote-flag request is
  // still loading. Only an explicitly loaded disabled flag may suppress it.
  if (!visible || (!loading && !badgeEnabled)) return null;
  return (
    <div ref={ref} className={`pointer-events-none absolute z-20 ${className}`} data-testid="new-content-badge">
      <Badge className="border border-primary-foreground/30 bg-primary px-2 py-1 font-semibold text-primary-foreground shadow-md">New</Badge>
    </div>
  );
};

export default NewContentBadge;