import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedHamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const AnimatedHamburgerButton: React.FC<AnimatedHamburgerButtonProps> = ({
  isOpen,
  onClick,
  className
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-8 h-8",
        "transition-all duration-300",
        className
      )}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      {/* Single horizontal line - transforms to X when open */}
      <span
        className={cn(
          "block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out",
          isOpen && "rotate-45"
        )}
      />
      {/* Second line only visible when open (forms X) */}
      <span
        className={cn(
          "absolute block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out",
          isOpen ? "-rotate-45 opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
};

export default AnimatedHamburgerButton;
