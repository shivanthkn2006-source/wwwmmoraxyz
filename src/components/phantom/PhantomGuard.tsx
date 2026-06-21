// ═══════════════════════════════════════════════════════════════════════════════
// PHANTOM GUARD - The Performance Wrapper
// When Ghost Mode is active, this UNMOUNTS children entirely
// This physically removes heavy code from the CPU - it doesn't just 'hide' it
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useRef, Suspense } from 'react';
import { usePhantomVisible } from '@/stores/usePhantomStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type PhantomPriority = 'critical' | 'high' | 'medium' | 'low';

interface PhantomGuardProps {
  children: React.ReactNode;
  
  /**
   * Priority level determines unmount behavior:
   * - critical: Never unmounts (voice, core auth)
   * - high: Unmounts last (essential UI)
   * - medium: Unmounts early (3D, heavy animations)
   * - low: Unmounts first (cosmetic effects)
   */
  priority?: PhantomPriority;
  
  /**
   * Optional fallback to render when unmounted
   * If not provided, renders null (complete removal)
   */
  fallback?: React.ReactNode;
  
  /**
   * Whether to show a loading skeleton when remounting
   */
  showLoadingSkeleton?: boolean;
  
  /**
   * Callback when component is unmounted by phantom
   */
  onPhantomUnmount?: () => void;
  
  /**
   * Callback when component is remounted after phantom
   */
  onPhantomMount?: () => void;
  
  /**
   * Component name for debugging
   */
  debugName?: string;
  
  /**
   * Delay before unmounting (allows animations to complete)
   */
  unmountDelay?: number;
  
  /**
   * Whether to animate mount/unmount transitions
   */
  animated?: boolean;
  
  /**
   * Custom className for the wrapper
   */
  className?: string;
}

// Loading skeleton for when components are remounting
const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center p-4 ${className}`}>
    <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
  </div>
);

const PhantomGuard: React.FC<PhantomGuardProps> = ({
  children,
  priority = 'medium',
  fallback = null,
  showLoadingSkeleton = false,
  onPhantomUnmount,
  onPhantomMount,
  debugName,
  unmountDelay = 0,
  animated = true,
  className,
}) => {
  const isVisible = usePhantomVisible();
  const wasVisibleRef = useRef(isVisible);
  const mountedRef = useRef(false);
  const [shouldRender, setShouldRender] = React.useState(isVisible || priority === 'critical');
  
  // Handle visibility changes
  useEffect(() => {
    // Critical priority never unmounts
    if (priority === 'critical') {
      setShouldRender(true);
      return;
    }
    
    if (isVisible !== wasVisibleRef.current) {
      if (isVisible) {
        // Becoming visible - mount immediately or with slight delay for animation
        setShouldRender(true);
        if (mountedRef.current) {
          onPhantomMount?.();
          if (debugName) {
            console.log(`[PhantomGuard] 🟢 ${debugName} MOUNTED`);
          }
        }
      } else {
        // Becoming invisible - unmount with optional delay
        const delay = priority === 'high' ? unmountDelay + 200 : 
                      priority === 'medium' ? unmountDelay + 100 : 
                      unmountDelay;
        
        setTimeout(() => {
          setShouldRender(false);
          onPhantomUnmount?.();
          if (debugName) {
            console.log(`[PhantomGuard] 👻 ${debugName} UNMOUNTED (priority: ${priority})`);
          }
        }, delay);
      }
      
      wasVisibleRef.current = isVisible;
    }
    
    mountedRef.current = true;
  }, [isVisible, priority, unmountDelay, onPhantomMount, onPhantomUnmount, debugName]);
  
  // Don't render anything if phantom is hiding and this is not critical
  if (!shouldRender) {
    if (showLoadingSkeleton && !isVisible) {
      return <LoadingSkeleton className={className} />;
    }
    return <>{fallback}</>;
  }
  
  // Render with optional animation
  if (animated) {
    return (
      <AnimatePresence mode="wait">
        {shouldRender && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={className}
          >
            <Suspense fallback={<LoadingSkeleton className={className} />}>
              {children}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Render without animation for performance-critical components
  return (
    <Suspense fallback={<LoadingSkeleton className={className} />}>
      {children}
    </Suspense>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED GUARDS FOR COMMON USE CASES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Guard for 3D/WebGL components - unmounts early to save GPU
 */
export const Phantom3DGuard: React.FC<Omit<PhantomGuardProps, 'priority'>> = (props) => (
  <PhantomGuard {...props} priority="low" debugName={props.debugName || '3D Component'} />
);

/**
 * Guard for heavy animations - unmounts with medium priority
 */
export const PhantomAnimationGuard: React.FC<Omit<PhantomGuardProps, 'priority'>> = (props) => (
  <PhantomGuard {...props} priority="medium" debugName={props.debugName || 'Animation'} />
);

/**
 * Guard for UI components - unmounts last
 */
export const PhantomUIGuard: React.FC<Omit<PhantomGuardProps, 'priority'>> = (props) => (
  <PhantomGuard {...props} priority="high" debugName={props.debugName || 'UI Component'} />
);

/**
 * Guard for voice/critical systems - never unmounts
 */
export const PhantomVoiceGuard: React.FC<Omit<PhantomGuardProps, 'priority'>> = (props) => (
  <PhantomGuard {...props} priority="critical" debugName={props.debugName || 'Voice System'} />
);

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK FOR CHECKING PHANTOM STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to check if a component should render based on phantom state
 * Useful for components that can't use the wrapper pattern
 */
export const usePhantomRender = (priority: PhantomPriority = 'medium'): boolean => {
  const isVisible = usePhantomVisible();
  return priority === 'critical' || isVisible;
};

export default memo(PhantomGuard);
