// ═══════════════════════════════════════════════════════════════════════════════
// SAFE QUANTUM SHARD - WebGL-safe wrapper with 2D fallback
// Prevents crashes on devices without WebGL/WebGPU support
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, Suspense, lazy, memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, Zap } from 'lucide-react';

type ShardState = 'locked' | 'scanning' | 'unlocked' | 'error';

interface SafeQuantumShardProps {
  state: ShardState;
  onTouch?: () => void;
  className?: string;
}

// Lazy load the 3D component
const QuantumShard3D = lazy(() => 
  import('./QuantumShard3D').catch(() => ({
    default: () => null
  }))
);

// Check if WebGL is available
const checkWebGLSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
};

// 2D Fallback Component - CSS-only crystal
const CrystalFallback2D = memo(({ state, onTouch }: { state: ShardState; onTouch?: () => void }) => {
  const stateColors = {
    locked: { primary: '#ff3366', glow: '#ff0044' },
    scanning: { primary: '#00ffff', glow: '#00ccff' },
    unlocked: { primary: '#00ff88', glow: '#00ffaa' },
    error: { primary: '#ff4444', glow: '#ff0000' },
  };
  
  const colors = stateColors[state];
  
  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      onClick={onTouch}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '120%',
          height: '120%',
          background: `radial-gradient(circle, ${colors.glow}40 0%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
        animate={{
          scale: state === 'scanning' ? [1, 1.2, 1] : 1,
          opacity: state === 'scanning' ? [0.5, 1, 0.5] : 0.6,
        }}
        transition={{
          duration: state === 'scanning' ? 1 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Crystal shape (CSS diamond) */}
      <motion.div
        className="relative"
        style={{
          width: 120,
          height: 120,
        }}
        animate={{
          rotate: state === 'scanning' ? 360 : [0, 5, -5, 0],
          scale: state === 'unlocked' ? [1, 1.3, 0] : state === 'scanning' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: { duration: state === 'scanning' ? 2 : 4, repeat: Infinity, ease: 'linear' },
          scale: { duration: state === 'scanning' ? 0.5 : 0.8, repeat: state === 'unlocked' ? 0 : Infinity },
        }}
      >
        {/* Diamond shape using rotated square */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}80, ${colors.primary}20)`,
            transform: 'rotate(45deg)',
            borderRadius: '10%',
            boxShadow: `
              0 0 20px ${colors.glow}60,
              inset 0 0 30px ${colors.glow}40,
              0 0 60px ${colors.glow}30
            `,
            border: `2px solid ${colors.primary}80`,
          }}
        />
        
        {/* Inner core */}
        <div
          className="absolute inset-4"
          style={{
            background: `linear-gradient(225deg, ${colors.primary}60, transparent)`,
            transform: 'rotate(45deg)',
            borderRadius: '10%',
          }}
        />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {state === 'scanning' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-8 h-8" style={{ color: colors.primary }} />
            </motion.div>
          ) : state === 'locked' ? (
            <Shield className="w-8 h-8" style={{ color: colors.primary }} />
          ) : (
            <Fingerprint className="w-8 h-8" style={{ color: colors.primary }} />
          )}
        </div>
      </motion.div>
      
      {/* Scanning rings */}
      {state === 'scanning' && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: 160,
                height: 160,
                borderColor: colors.glow,
              }}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
});

CrystalFallback2D.displayName = 'CrystalFallback2D';

// Loading fallback
const LoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center">
    <motion.div
      className="w-16 h-16 rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

// Main safe component
export const SafeQuantumShard: React.FC<SafeQuantumShardProps> = memo(({ 
  state, 
  onTouch, 
  className 
}) => {
  const [use3D, setUse3D] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // Check WebGL support on mount
    const webglSupported = checkWebGLSupport();
    
    // Also check device performance
    const isLowPowerDevice = (navigator as any).deviceMemory < 4 || navigator.hardwareConcurrency < 4;
    
    // Use 3D only on capable devices
    setUse3D(webglSupported && !isLowPowerDevice && !hasError);
  }, [hasError]);
  
  // If 3D fails, fall back to 2D
  if (hasError || !use3D) {
    return (
      <div className={`w-full h-full ${className || ''}`}>
        <CrystalFallback2D state={state} onTouch={onTouch} />
      </div>
    );
  }
  
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <ErrorBoundary2D 
        fallback={<CrystalFallback2D state={state} onTouch={onTouch} />}
        onError={() => setHasError(true)}
      >
        <Suspense fallback={<LoadingFallback />}>
          <QuantumShard3D state={state} onTouch={onTouch} />
        </Suspense>
      </ErrorBoundary2D>
    </div>
  );
});

SafeQuantumShard.displayName = 'SafeQuantumShard';

// Simple error boundary for 3D fallback
class ErrorBoundary2D extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: () => void;
}, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.warn('[SafeQuantumShard] 3D rendering failed, using 2D fallback:', error.message);
    this.props.onError?.();
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default SafeQuantumShard;
