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
  const [expanded, setExpanded] = React.useState(false);
  const primary = items.find((item) => item.id === 'global') ?? items[0];
  const secondary = primary ? items.filter((item) => item.id !== primary.id) : [];

  if (!primary) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-4 top-16 z-50 transition-all duration-300',
        visible ? 'opacity-100' : '-translate-y-3 opacity-0',
        className,
      )}
      aria-hidden={!visible}
    >
      <div
        role="tablist"
        aria-label="Home feeds"
        className="pointer-events-auto flex items-center gap-4"
        data-testid="home-feed-switcher"
      >
        <button
          type="button"
          role="tab"
          aria-selected={value === primary.id}
          aria-expanded={expanded}
          onClick={() => {
            onChange(primary.id);
            setExpanded((open) => !open);
          }}
          data-feed-switch={primary.id}
          className={cn(
            'px-0 py-1 text-sm font-semibold text-foreground transition-opacity hover:opacity-70',
            value !== primary.id && 'text-muted-foreground',
          )}
        >
          {primary.label}
        </button>
        <div
          className={cn(
            'flex items-center gap-4 overflow-hidden transition-all duration-300',
            expanded ? 'max-w-[270px] translate-x-0 opacity-100' : 'pointer-events-none max-w-0 -translate-x-2 opacity-0',
          )}
          aria-hidden={!expanded}
        >
        {secondary.map((option) => {
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
                'whitespace-nowrap px-0 py-1 text-sm font-medium transition-opacity hover:opacity-70',
                active
                  ? 'text-foreground underline underline-offset-4'
                  : 'text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default HomeFeedSwitcher;
