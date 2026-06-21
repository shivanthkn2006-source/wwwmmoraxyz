// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL AUTO-HEAL: Self-Healing Typography Engine
// Purpose: Automatically scale text to prevent overflow on any screen
// Integration: Deep binding to Zoe DHF for self-correction awareness
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback } from 'react';

export interface TextAutoScalerOptions {
  /** Minimum font size before switching to ellipsis (default: 10px) */
  minFontSize?: number;
  /** Maximum font size to start scaling from (default: inherit from element) */
  maxFontSize?: number;
  /** Step size for font reduction (default: 1px) */
  stepSize?: number;
  /** Enable ellipsis when min size reached (default: true) */
  enableEllipsis?: boolean;
  /** Enable height overflow detection (default: false, only width) */
  checkHeight?: boolean;
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
  /** Callback when scaling occurs */
  onScale?: (scaledSize: number, isEllipsis: boolean) => void;
}

export interface TextAutoScalerResult {
  /** Ref to attach to the text element */
  ref: React.RefObject<HTMLElement>;
  /** Current computed font size */
  currentFontSize: number;
  /** Whether text is currently using ellipsis */
  isEllipsis: boolean;
  /** Whether text had to be scaled down */
  wasScaled: boolean;
  /** Force a recalculation */
  recalculate: () => void;
}

/**
 * useTextAutoScaler - Self-healing typography hook
 * 
 * Automatically scales text to prevent overflow:
 * 1. Uses ResizeObserver to detect container changes
 * 2. Reduces font-size incrementally until text fits
 * 3. Falls back to ellipsis if minimum size reached
 * 
 * @example
 * ```tsx
 * const { ref, isEllipsis } = useTextAutoScaler({ minFontSize: 12 });
 * return <h1 ref={ref}>Long Title That Might Overflow</h1>;
 * ```
 */
export const useTextAutoScaler = (
  options: TextAutoScalerOptions = {}
): TextAutoScalerResult => {
  const {
    minFontSize = 10,
    maxFontSize,
    stepSize = 1,
    enableEllipsis = true,
    checkHeight = false,
    debounceMs = 100,
    onScale,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState<number>(16);
  const [isEllipsis, setIsEllipsis] = useState<boolean>(false);
  const [wasScaled, setWasScaled] = useState<boolean>(false);
  const originalFontSizeRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScalingRef = useRef<boolean>(false);

  /**
   * Check if element is overflowing
   */
  const isOverflowing = useCallback((element: HTMLElement): boolean => {
    const widthOverflow = element.scrollWidth > element.clientWidth;
    const heightOverflow = checkHeight && element.scrollHeight > element.clientHeight;
    return widthOverflow || heightOverflow;
  }, [checkHeight]);

  /**
   * Get initial font size from element
   */
  const getComputedFontSize = useCallback((element: HTMLElement): number => {
    const computed = window.getComputedStyle(element);
    return parseFloat(computed.fontSize) || 16;
  }, []);

  /**
   * Apply styles to element
   */
  const applyStyles = useCallback((
    element: HTMLElement,
    fontSize: number,
    useEllipsis: boolean
  ) => {
    element.style.fontSize = `${fontSize}px`;
    
    if (useEllipsis) {
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'hidden';
      element.style.textOverflow = 'ellipsis';
    } else {
      // Only reset if we explicitly set ellipsis before
      if (element.style.textOverflow === 'ellipsis') {
        element.style.whiteSpace = '';
        element.style.overflow = '';
        element.style.textOverflow = '';
      }
    }
  }, []);

  /**
   * Core scaling algorithm
   */
  const calculateOptimalSize = useCallback(() => {
    const element = ref.current;
    if (!element || isScalingRef.current) return;

    isScalingRef.current = true;

    try {
      // Store original font size on first run
      if (originalFontSizeRef.current === null) {
        originalFontSizeRef.current = getComputedFontSize(element);
      }

      const startSize = maxFontSize ?? originalFontSizeRef.current;
      let currentSize = startSize;
      let needsEllipsis = false;

      // Reset to max size first
      applyStyles(element, startSize, false);

      // Check if it fits at original size
      if (!isOverflowing(element)) {
        setCurrentFontSize(startSize);
        setIsEllipsis(false);
        setWasScaled(false);
        isScalingRef.current = false;
        return;
      }

      // Reduce font size until it fits or hits minimum
      while (isOverflowing(element) && currentSize > minFontSize) {
        currentSize -= stepSize;
        applyStyles(element, Math.max(currentSize, minFontSize), false);
      }

      // If still overflowing at min size, apply ellipsis
      if (isOverflowing(element) && enableEllipsis) {
        needsEllipsis = true;
        currentSize = minFontSize;
        applyStyles(element, minFontSize, true);
      }

      // Update state
      const finalSize = Math.max(currentSize, minFontSize);
      setCurrentFontSize(finalSize);
      setIsEllipsis(needsEllipsis);
      setWasScaled(finalSize < startSize);

      // Callback
      if (onScale && (finalSize < startSize || needsEllipsis)) {
        onScale(finalSize, needsEllipsis);
      }

      // Log for debugging in development
      if (process.env.NODE_ENV === 'development' && finalSize < startSize) {
        console.log(`[AutoHeal] Text scaled: ${startSize}px → ${finalSize}px${needsEllipsis ? ' (ellipsis)' : ''}`);
      }
    } finally {
      isScalingRef.current = false;
    }
  }, [minFontSize, maxFontSize, stepSize, enableEllipsis, isOverflowing, getComputedFontSize, applyStyles, onScale]);

  /**
   * Debounced recalculation
   */
  const recalculate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(calculateOptimalSize, debounceMs);
  }, [calculateOptimalSize, debounceMs]);

  /**
   * Setup ResizeObserver and initial calculation
   */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Initial calculation
    calculateOptimalSize();

    // Setup ResizeObserver for container changes
    let resizeObserver: ResizeObserver | null = null;
    
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === element || entry.target === element.parentElement) {
            recalculate();
          }
        }
      });

      // Observe both element and parent
      resizeObserver.observe(element);
      if (element.parentElement) {
        resizeObserver.observe(element.parentElement);
      }
    }

    // Fallback: window resize
    const handleResize = () => recalculate();
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalSize, recalculate]);

  return {
    ref: ref as React.RefObject<HTMLElement>,
    currentFontSize,
    isEllipsis,
    wasScaled,
    recalculate,
  };
};

export default useTextAutoScaler;
