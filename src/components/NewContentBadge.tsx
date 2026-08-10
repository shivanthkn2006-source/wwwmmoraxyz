import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface NewContentBadgeProps {
  onViewed: () => void;
  className?: string;
}

const NewContentBadge: React.FC<NewContentBadgeProps> = ({ onViewed, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const onViewedRef = useRef(onViewed);
  const [visible, setVisible] = useState(true);

  onViewedRef.current = onViewed;

  useEffect(() => {
    const node = ref.current;
    if (!node || !visible) return;
    // Non-breaking fallback: without IntersectionObserver we keep the badge visible
    // rather than dismissing it on a timer the user never actually saw.
    if (typeof IntersectionObserver === 'undefined') return;
    const viewedElement = node.parentElement ?? node;
    let timer: number | null = null;
    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (timer !== null) return;
        timer = window.setTimeout(() => {
          setVisible(false);
          onViewedRef.current();
          observer.disconnect();
        }, 3000);
      } else if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      }, { threshold: [0.6] });
      observer.observe(viewedElement);
    } catch {
      return; // observer unavailable — badge stays until state changes upstream
    }
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div ref={ref} className={`pointer-events-none absolute z-20 ${className}`} data-testid="new-content-badge">
      <Badge className="border border-primary-foreground/30 bg-primary px-2 py-1 font-semibold text-primary-foreground shadow-md">New</Badge>
    </div>
  );
};

export default NewContentBadge;