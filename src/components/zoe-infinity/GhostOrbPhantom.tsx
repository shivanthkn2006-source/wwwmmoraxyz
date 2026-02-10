// ═══════════════════════════════════════════════════════════════════════════════
// GHOST ORB PHANTOM - Battery-optimized version with pure CSS animations
// Part 6: The Performance (Protocol Phantom)
// FIX 2: THE SAFARI CAP - Optimized for Safari thermal safety
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useMemo } from 'react';

interface GhostOrbPhantomProps {
  isProcessing?: boolean;
  mood?: 'neutral' | 'cyan' | 'gold';
  phantomMode?: boolean;
}

// FIX 2: Detect Safari at module level for performance
const isSafari = typeof navigator !== 'undefined' && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/**
 * Ghost Orb with pure CSS animations
 * Uses will-change: transform for GPU acceleration
 * Zero JS animations - zero thermal throttling
 * FIX 2: Safari optimizations - reduced blur, simpler animations
 */
export const GhostOrbPhantom = memo(function GhostOrbPhantom({ 
  isProcessing = false, 
  mood = 'neutral',
  phantomMode = false,
}: GhostOrbPhantomProps) {
  
  // FIX 2: Safari uses reduced visual complexity
  const safariMode = isSafari || phantomMode;
  
  // In phantom/safari mode, use simpler colors
  const getMoodColor = useMemo(() => {
    if (safariMode) {
      return 'rgba(255, 255, 255, 0.3)';
    }
    switch (mood) {
      case 'cyan': return 'rgba(0, 255, 255, 0.6)';
      case 'gold': return 'rgba(255, 215, 0, 0.6)';
      default: return 'rgba(255, 255, 255, 0.4)';
    }
  }, [mood, safariMode]);

  // Phantom mode OR Safari: Minimal orb, no blur, simple animation
  if (safariMode) {
    return (
      <div className="phantom-orb-container">
        <div 
          className={`phantom-orb ${isProcessing ? 'phantom-orb-processing' : ''}`}
          aria-hidden="true"
        />
        
        {/* Pure CSS Styles - GPU accelerated, Safari-optimized */}
        <style>{`
          .phantom-orb-container {
            position: absolute;
            top: 32px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            will-change: transform;
          }
          
          .phantom-orb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            /* FIX 2: Safari uses slower animation (3s→4s) to reduce GPU load */
            animation: phantomBreathe 4s ease-in-out infinite;
            will-change: transform, opacity;
          }
          
          .phantom-orb-processing {
            animation: phantomBreathe 2s ease-in-out infinite;
            background: rgba(0, 255, 255, 0.5);
          }
          
          @keyframes phantomBreathe {
            0%, 100% { 
              transform: scale(1); 
              opacity: 0.6; 
            }
            50% { 
              transform: scale(1.15); /* FIX 2: Reduced scale (1.2→1.15) */
              opacity: 1; 
            }
          }
        `}</style>
      </div>
    );
  }

  // Standard mode (Chrome/Firefox): Full orb with gradient and blur
  return (
    <div className="ghost-orb-container">
      <div 
        className={`ghost-orb ${isProcessing ? 'ghost-orb-processing' : ''}`}
        style={{
          background: `radial-gradient(circle at center, ${getMoodColor} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      
      {/* Pure CSS Styles - GPU accelerated */}
      <style>{`
        .ghost-orb-container {
          position: absolute;
          top: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          will-change: transform;
        }
        
        .ghost-orb {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          filter: blur(8px);
          animation: ghostBreathe 3s ease-in-out infinite;
          will-change: transform, opacity;
        }
        
        .ghost-orb-processing {
          animation: ghostBreathe 1.5s ease-in-out infinite;
        }
        
        @keyframes ghostBreathe {
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.6; 
          }
          50% { 
            transform: scale(1.3); 
            opacity: 1; 
          }
        }
      `}</style>
    </div>
  );
});

export default GhostOrbPhantom;
