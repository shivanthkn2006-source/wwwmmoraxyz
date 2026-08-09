import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface NewContentBadgeProps {
  onViewed: () => void;
  className?: string;
}

const NewContentBadge: React.FC<NewContentBadgeProps> = ({ onViewed, className = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || !visible) return;
    let timer: number | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
        timer = window.setTimeout(() => {
          setVisible(false);
          onViewed();
          observer.disconnect();
        }, 900);
      } else if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }, { threshold: [0.6] });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [onViewed, visible]);

  if (!visible) return null;
  return (
    <Badge ref={ref} className={`pointer-events-none absolute z-20 bg-primary text-primary-foreground ${className}`} data-testid="new-content-badge">
      New
    </Badge>
  );
};

export default NewContentBadge;