// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN TAP CONTROLLER - Protocol Phantom
// Invisible layer that detects the deliberate double interaction that shows Zoe.
// A single interaction outside the orb never changes visibility.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback, useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { usePhantomStore, usePhantomVisible } from '@/stores/usePhantomStore';

interface ScreenTapControllerProps {
  /** Elements to exclude from tap detection (e.g., chat panel, orb itself) */
  excludeSelectors?: string[];
}

const ScreenTapController: React.FC<ScreenTapControllerProps> = ({
  excludeSelectors = [
    '[data-orb-conversation-panel]',
    '[data-zoe-orb]',
    '[data-exclude-phantom-tap]',
    'button',
    'a',
    'input',
    'textarea',
    '[role="button"]',
    '[role="dialog"]',
    '.dialog',
    '.modal',
  ],
}) => {
  const location = useLocation();
  const isVRRoute = location.pathname.startsWith('/zoe-omega');

  const isVisible = usePhantomVisible();
  const show = usePhantomStore(state => state.show);
  const hide = usePhantomStore(state => state.hide);
  
  // Refs for tap/click detection
  const lastInteractionRef = useRef<number>(0);
  const singleActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Check if the event target is excluded
  const isExcludedElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    
    // Check if target or any parent matches exclude selectors
    for (const selector of excludeSelectors) {
      if (target.closest(selector)) {
        return true;
      }
    }
    return false;
  }, [excludeSelectors]);

  // Show orb only after a deliberate double click/tap.
  const showOrb = useCallback(() => {
    if (isProcessingRef.current || isVisible) return;
    
    isProcessingRef.current = true;
    show();
    console.log('[ScreenTap] Orb visible (double tap/click)');
    
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  }, [isVisible, show]);

  // Handle interaction (works for both touch and click)
  const handleInteraction = useCallback((e: MouseEvent | TouchEvent) => {
    // Skip excluded elements
    if (isExcludedElement(e.target)) {
      return;
    }

    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionRef.current;

    if (timeSinceLastInteraction < 350) {
      // Double tap/click detected — show Zoe.
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
        singleActionTimeoutRef.current = null;
      }
      showOrb();
      lastInteractionRef.current = 0;
    } else {
      // First tap/click — remember it, but intentionally do nothing.
      lastInteractionRef.current = now;

      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
      }

      singleActionTimeoutRef.current = setTimeout(() => {
        lastInteractionRef.current = 0;
        singleActionTimeoutRef.current = null;
      }, 350);
    }
  }, [isExcludedElement, showOrb]);

  // Always hide orb on route changes (except VR world where in-world orb guidance is required)
  useEffect(() => {
    if (isVRRoute) return;
    hide();
  }, [location.pathname, hide, isVRRoute]);

  // Attach global listeners
  useEffect(() => {
    if (isVRRoute) return;

    // Use touchend for touch devices, click for mouse
    const handleTouchEnd = (e: TouchEvent) => {
      handleInteraction(e);
    };

    const handleClick = (e: MouseEvent) => {
      // Only handle click if not a touch device (to avoid double firing)
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        return; // Touch device - use touchend instead
      }
      handleInteraction(e);
    };

    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleClick);
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
      }
    };
  }, [handleInteraction, isVRRoute]);

  // This component doesn't render anything - it's just a listener
  return null;
};

export default memo(ScreenTapController);
