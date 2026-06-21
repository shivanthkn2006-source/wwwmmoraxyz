// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL AUTO-HEAL: TextAutoScaler Component
// Purpose: Self-healing typography - never allow text to overflow or cut off
// Usage: Wrap critical headers, profile names, time displays
// ═══════════════════════════════════════════════════════════════════════════════

import React, { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface TextAutoScalerProps extends React.HTMLAttributes<HTMLElement> {
  /** The HTML tag to render (default: 'span') */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';
  /** Minimum font size before ellipsis (default: 10px) */
  minFontSize?: number;
  /** Maximum font size (default: inherit) */
  maxFontSize?: number;
  /** Font reduction step size (default: 1px) */
  stepSize?: number;
  /** Enable ellipsis when min reached (default: true) */
  enableEllipsis?: boolean;
  /** Also check height overflow (default: false) */
  checkHeight?: boolean;
  /** Callback when text is scaled */
  onScale?: (fontSize: number, isEllipsis: boolean) => void;
  /** Children content */
  children: React.ReactNode;
}

/**
 * TextAutoScaler - Self-healing text component
 * 
 * Automatically scales text to fit container:
 * - Uses ResizeObserver for real-time detection
 * - Shrinks font incrementally until it fits
 * - Falls back to ellipsis at minimum size
 * 
 * @example
 * ```tsx
 * <TextAutoScaler as="h1" minFontSize={14}>
 *   Long Profile Name That Might Overflow
 * </TextAutoScaler>
 * ```
 */
export const TextAutoScaler = forwardRef<HTMLElement, TextAutoScalerProps>(
  (
    {
      as: Component = 'span',
      minFontSize = 10,
      maxFontSize,
      stepSize = 1,
      enableEllipsis = true,
      checkHeight = false,
      onScale,
      className,
      children,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLElement>(null);
    const [computedStyle, setComputedStyle] = useState<React.CSSProperties>({});
    const originalFontSizeRef = useRef<number | null>(null);
    const isScalingRef = useRef(false);
    const observerRef = useRef<ResizeObserver | null>(null);

    // Merge refs
    const ref = (forwardedRef as React.RefObject<HTMLElement>) || internalRef;

    /**
     * Check if element overflows
     */
    const isOverflowing = useCallback((element: HTMLElement): boolean => {
      const widthOverflow = element.scrollWidth > element.clientWidth + 1; // +1 for rounding
      const heightOverflow = checkHeight && element.scrollHeight > element.clientHeight + 1;
      return widthOverflow || heightOverflow;
    }, [checkHeight]);

    /**
     * Calculate and apply optimal font size
     */
    const calculateOptimalSize = useCallback(() => {
      const element = ref.current || internalRef.current;
      if (!element || isScalingRef.current) return;

      isScalingRef.current = true;

      try {
        // Get original font size on first run
        if (originalFontSizeRef.current === null) {
          const computed = window.getComputedStyle(element);
          originalFontSizeRef.current = parseFloat(computed.fontSize) || 16;
        }

        const startSize = maxFontSize ?? originalFontSizeRef.current;
        let currentSize = startSize;
        let needsEllipsis = false;

        // Reset to start size
        const resetStyle: React.CSSProperties = {
          fontSize: `${startSize}px`,
          whiteSpace: undefined,
          overflow: undefined,
          textOverflow: undefined,
        };
        setComputedStyle(resetStyle);

        // Force reflow to get accurate measurements
        void element.offsetWidth;

        // Check if it fits at original size
        if (!isOverflowing(element)) {
          setComputedStyle({ fontSize: `${startSize}px` });
          isScalingRef.current = false;
          return;
        }

        // Reduce font size until it fits
        while (isOverflowing(element) && currentSize > minFontSize) {
          currentSize -= stepSize;
          const testSize = Math.max(currentSize, minFontSize);
          element.style.fontSize = `${testSize}px`;
          void element.offsetWidth; // Force reflow
        }

        // Still overflowing? Apply ellipsis
        if (isOverflowing(element) && enableEllipsis) {
          needsEllipsis = true;
          currentSize = minFontSize;
        }

        // Apply final styles
        const finalSize = Math.max(currentSize, minFontSize);
        const finalStyle: React.CSSProperties = {
          fontSize: `${finalSize}px`,
          ...(needsEllipsis && {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }),
        };
        setComputedStyle(finalStyle);

        // Callback
        if (onScale && finalSize < startSize) {
          onScale(finalSize, needsEllipsis);
        }

        // Development logging
        if (process.env.NODE_ENV === 'development' && finalSize < startSize) {
          console.log(`[AutoHeal] "${String(children).slice(0, 20)}..." scaled: ${startSize}px → ${finalSize}px${needsEllipsis ? ' (ellipsis)' : ''}`);
        }
      } finally {
        isScalingRef.current = false;
      }
    }, [ref, minFontSize, maxFontSize, stepSize, enableEllipsis, checkHeight, isOverflowing, onScale, children]);

    /**
     * Setup observer and calculate on mount/update
     */
    useEffect(() => {
      const element = ref.current || internalRef.current;
      if (!element) return;

      // Initial calculation (delayed to ensure render complete)
      const initialTimer = setTimeout(calculateOptimalSize, 50);

      // Setup ResizeObserver
      if ('ResizeObserver' in window) {
        observerRef.current = new ResizeObserver(() => {
          // Debounce
          setTimeout(calculateOptimalSize, 100);
        });

        observerRef.current.observe(element);
        if (element.parentElement) {
          observerRef.current.observe(element.parentElement);
        }
      }

      // Fallback: window resize
      const handleResize = () => setTimeout(calculateOptimalSize, 100);
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      return () => {
        clearTimeout(initialTimer);
        observerRef.current?.disconnect();
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }, [calculateOptimalSize, ref]);

    // Recalculate when children change
    useEffect(() => {
      originalFontSizeRef.current = null; // Reset to get new base size
      const timer = setTimeout(calculateOptimalSize, 50);
      return () => clearTimeout(timer);
    }, [children, calculateOptimalSize]);

    return (
      <Component
        ref={internalRef as React.LegacyRef<never>}
        className={cn('auto-heal-text', className)}
        style={{ ...style, ...computedStyle }}
        {...(props as Record<string, unknown>)}
      >
        {children}
      </Component>
    );
  }
);

TextAutoScaler.displayName = 'TextAutoScaler';

/**
 * Preset components for common use cases
 */

export const AutoScaleHeading = forwardRef<HTMLElement, Omit<TextAutoScalerProps, 'as'>>(
  (props, ref) => <TextAutoScaler ref={ref} as="h1" minFontSize={14} {...props} />
);
AutoScaleHeading.displayName = 'AutoScaleHeading';

export const AutoScaleTitle = forwardRef<HTMLElement, Omit<TextAutoScalerProps, 'as'>>(
  (props, ref) => <TextAutoScaler ref={ref} as="h2" minFontSize={12} {...props} />
);
AutoScaleTitle.displayName = 'AutoScaleTitle';

export const AutoScaleLabel = forwardRef<HTMLElement, Omit<TextAutoScalerProps, 'as'>>(
  (props, ref) => <TextAutoScaler ref={ref} as="span" minFontSize={10} {...props} />
);
AutoScaleLabel.displayName = 'AutoScaleLabel';

export const AutoScaleName = forwardRef<HTMLElement, Omit<TextAutoScalerProps, 'as'>>(
  (props, ref) => <TextAutoScaler ref={ref} as="span" minFontSize={11} {...props} />
);
AutoScaleName.displayName = 'AutoScaleName';

export default TextAutoScaler;
