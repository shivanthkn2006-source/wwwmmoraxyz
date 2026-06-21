/**
 * ResponsiveLayout - Universal responsive wrapper component
 * Provides consistent responsive behavior across all device sizes
 * From 4.1" phones to 16K displays and IoT devices
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  // Layout variants
  variant?: 'page' | 'container' | 'card' | 'modal' | 'chat';
  // Safe area handling
  safeTop?: boolean;
  safeBottom?: boolean;
  // Navigation awareness
  hasBottomNav?: boolean;
  hasTopHeader?: boolean;
  // Max width constraints
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'screen';
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className,
  variant = 'page',
  safeTop = false,
  safeBottom = false,
  hasBottomNav = false,
  hasTopHeader = false,
  maxWidth = 'full',
}) => {
  const variantStyles = {
    page: cn(
      'min-h-screen w-full',
      hasTopHeader && 'pt-safe-top',
      hasBottomNav && 'pb-nav-safe',
      safeTop && 'safe-area-pt',
      safeBottom && 'safe-area-pb'
    ),
    container: cn(
      'w-full mx-auto',
      'px-2 xxs:px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 4k:px-16',
      maxWidth === 'sm' && 'max-w-sm',
      maxWidth === 'md' && 'max-w-md',
      maxWidth === 'lg' && 'max-w-lg',
      maxWidth === 'xl' && 'max-w-xl',
      maxWidth === '2xl' && 'max-w-2xl',
      maxWidth === 'full' && 'w-responsive-container',
      maxWidth === 'screen' && 'max-w-none'
    ),
    card: cn(
      'rounded-lg border border-border bg-card',
      'p-3 xxs:p-3 xs:p-4 sm:p-5 md:p-6 lg:p-6 xl:p-8 2xl:p-10 4k:p-12',
      'responsive-card'
    ),
    modal: cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'p-2 xxs:p-2 xs:p-3 sm:p-4 md:p-6',
      safeTop && 'pt-safe-top',
      safeBottom && 'pb-safe-bottom'
    ),
    chat: cn(
      'flex flex-col',
      'h-full w-full',
      'responsive-chat-window'
    ),
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {children}
    </div>
  );
};

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | 'hero';
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  className,
  as: Component = 'p',
  size = 'base',
}) => {
  const sizeStyles = {
    xs: 'text-fluid-xs',
    sm: 'text-fluid-sm',
    base: 'text-fluid-base',
    lg: 'text-fluid-lg',
    xl: 'text-fluid-xl',
    '2xl': 'text-fluid-2xl',
    '3xl': 'text-fluid-3xl',
    hero: 'text-fluid-hero',
  };

  return (
    <Component className={cn(sizeStyles[size], className)}>
      {children}
    </Component>
  );
};

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    xxs?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
    '4k'?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
}) => {
  const gapStyles = {
    none: 'gap-0',
    sm: 'gap-responsive-sm',
    md: 'gap-responsive',
    lg: 'gap-responsive-lg',
    xl: 'gap-4 xxs:gap-4 xs:gap-6 sm:gap-8 md:gap-10 lg:gap-12',
  };

  const colClasses = [
    cols.default && `grid-cols-${cols.default}`,
    cols.xxs && `xxs:grid-cols-${cols.xxs}`,
    cols.xs && `xs:grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
    cols['4k'] && `4k:grid-cols-${cols['4k']}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn('grid', colClasses, gapStyles[gap], className)}>
      {children}
    </div>
  );
};

// Responsive icon wrapper
interface ResponsiveIconProps {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveIcon: React.FC<ResponsiveIconProps> = ({
  children,
  className,
  size = 'md',
}) => {
  const sizeStyles = {
    xs: 'w-3 h-3 xxs:w-3 xxs:h-3 xs:w-4 xs:h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 4k:w-8 4k:h-8',
    sm: 'w-4 h-4 xxs:w-4 xxs:h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 4k:w-10 4k:h-10',
    md: 'w-5 h-5 xxs:w-5 xxs:h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 4k:w-12 4k:h-12',
    lg: 'w-6 h-6 xxs:w-6 xxs:h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-8 lg:h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 4k:w-14 4k:h-14',
    xl: 'w-8 h-8 xxs:w-8 xxs:h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 4k:w-20 4k:h-20',
  };

  return (
    <span className={cn('inline-flex items-center justify-center', sizeStyles[size], className)}>
      {children}
    </span>
  );
};

// Responsive button wrapper
interface ResponsiveButtonProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  className,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: cn(
      'h-8 xxs:h-8 xs:h-9 sm:h-10 md:h-11 lg:h-10 xl:h-11 2xl:h-12 4k:h-16',
      'px-2 xxs:px-2 xs:px-3 sm:px-4 md:px-5 lg:px-4 xl:px-5 2xl:px-6 4k:px-8',
      'text-xs xxs:text-xs xs:text-sm sm:text-sm md:text-base lg:text-sm xl:text-base 2xl:text-lg 4k:text-xl'
    ),
    md: cn(
      'h-10 xxs:h-10 xs:h-11 sm:h-12 md:h-14 lg:h-12 xl:h-14 2xl:h-16 4k:h-20',
      'px-3 xxs:px-3 xs:px-4 sm:px-5 md:px-6 lg:px-5 xl:px-6 2xl:px-8 4k:px-10',
      'text-sm xxs:text-sm xs:text-base sm:text-base md:text-lg lg:text-base xl:text-lg 2xl:text-xl 4k:text-2xl'
    ),
    lg: cn(
      'h-12 xxs:h-12 xs:h-14 sm:h-16 md:h-18 lg:h-16 xl:h-18 2xl:h-20 4k:h-24',
      'px-4 xxs:px-4 xs:px-6 sm:px-8 md:px-10 lg:px-8 xl:px-10 2xl:px-12 4k:px-16',
      'text-base xxs:text-base xs:text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl 4k:text-4xl'
    ),
  };

  return (
    <span className={cn('inline-flex', sizeStyles[size], className)}>
      {children}
    </span>
  );
};

// Hook for responsive breakpoint detection
export const useResponsiveBreakpoint = () => {
  const [breakpoint, setBreakpoint] = React.useState<string>('md');

  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 320) setBreakpoint('iot');
      else if (width < 380) setBreakpoint('xxs');
      else if (width < 640) setBreakpoint('xs');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 1024) setBreakpoint('md');
      else if (width < 1280) setBreakpoint('lg');
      else if (width < 1536) setBreakpoint('xl');
      else if (width < 1920) setBreakpoint('2xl');
      else if (width < 2560) setBreakpoint('3xl');
      else if (width < 4320) setBreakpoint('4k');
      else if (width < 7680) setBreakpoint('8k');
      else setBreakpoint('ultra');
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: ['iot', 'xxs', 'xs', 'sm'].includes(breakpoint),
    isTablet: ['md', 'lg'].includes(breakpoint),
    isDesktop: ['xl', '2xl', '3xl'].includes(breakpoint),
    is4K: ['4k', '8k', 'ultra'].includes(breakpoint),
    isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
  };
};

export default ResponsiveLayout;
