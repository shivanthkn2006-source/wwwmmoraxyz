import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedHamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Hamburger toggle. Colors come from shared `--menu-*` tokens (index.css):
 * - bars use `--menu-accent` (blue)
 * - open state pops `--menu-highlight` (yellow)
 */
const AnimatedHamburgerButton: React.FC<AnimatedHamburgerButtonProps> = ({
  isOpen,
  onClick,
  className,
}) => {
  const barColor = isOpen
    ? 'bg-[hsl(var(--menu-highlight))]'
    : 'bg-[hsl(var(--menu-accent))]';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center w-8 h-8 rounded-md',
        'transition-all duration-300',
        'hover:bg-[hsl(var(--menu-accent)/0.12)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--menu-highlight)/0.6)]',
        className
      )}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <span
        className={cn(
          'block w-5 h-0.5 rounded-full transition-all duration-300 ease-in-out',
          barColor,
          isOpen && 'rotate-45'
        )}
      />
      <span
        className={cn(
          'absolute block w-5 h-0.5 rounded-full transition-all duration-300 ease-in-out',
          barColor,
          isOpen ? '-rotate-45 opacity-100' : 'opacity-0'
        )}
      />
    </button>
  );
};

export default AnimatedHamburgerButton;
