/**
 * HomeFeedSwitcher — a compact, monochrome segmented control that makes the
 * Home feeds visible and switchable by tap. Purely additive: it only changes
 * the active tab value the Home surface already owns, and supports up to five
 * feeds side by side.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export interface HomeFeedOption {
  id: string;
  label: string;
}

interface HomeFeedSwitcherProps {
  options: HomeFeedOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  visible?: boolean;
}

export const HomeFeedSwitcher: React.FC<HomeFeedSwitcherProps> = ({
  options,
  value,
  onChange,
  className,
  visible = true,
}) => {
  const items = options.slice(0, 5);
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 transition-all duration-300',
        visible ? 'opacity-100' : '-translate-y-3 opacity-0',
        className,
      )}
      aria-hidden={!visible}
    >
      <div
        role="tablist"
        aria-label="Home feeds"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-background/85 p-1 shadow-sm backdrop-blur"
        data-testid="home-feed-switcher"
      >
        {items.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.id)}
              data-feed-switch={option.id}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomeFeedSwitcher;
