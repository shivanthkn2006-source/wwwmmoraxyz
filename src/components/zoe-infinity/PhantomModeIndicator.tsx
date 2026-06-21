// ═══════════════════════════════════════════════════════════════════════════════
// PHANTOM MODE INDICATOR - Visual feedback for Text Only Mode toggle
// Part 6: The Performance (Protocol Phantom)
// ═══════════════════════════════════════════════════════════════════════════════

import { memo } from 'react';
import { Zap, ZapOff } from 'lucide-react';

interface PhantomModeIndicatorProps {
  isVisible: boolean;
  isPhantomMode: boolean;
}

/**
 * Pure CSS animated indicator for Phantom Mode toggle
 * Zero JS animations - uses will-change: transform
 */
export const PhantomModeIndicator = memo(function PhantomModeIndicator({
  isVisible,
  isPhantomMode,
}: PhantomModeIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="phantom-indicator"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div 
        className="phantom-indicator-inner"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px 32px',
          borderRadius: '16px',
          background: isPhantomMode 
            ? 'rgba(0, 255, 100, 0.15)' 
            : 'rgba(255, 255, 255, 0.1)',
          border: `1px solid ${isPhantomMode ? 'rgba(0, 255, 100, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
          animation: 'phantomFadeInOut 1.5s ease-out forwards',
        }}
      >
        {isPhantomMode ? (
          <Zap 
            className="phantom-icon" 
            style={{ 
              width: 32, 
              height: 32, 
              color: '#00FF64',
              animation: 'phantomPulse 0.3s ease-out',
            }} 
          />
        ) : (
          <ZapOff 
            className="phantom-icon" 
            style={{ 
              width: 32, 
              height: 32, 
              color: 'rgba(255, 255, 255, 0.6)',
            }} 
          />
        )}
        
        <span 
          style={{ 
            color: isPhantomMode ? '#00FF64' : 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          {isPhantomMode ? 'Text Only Mode' : 'Full Effects Mode'}
        </span>
        
        <span 
          style={{ 
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '11px',
          }}
        >
          {isPhantomMode ? 'Battery optimized' : 'Double-tap to toggle'}
        </span>
      </div>

      {/* Pure CSS Keyframes */}
      <style>{`
        @keyframes phantomFadeInOut {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        
        @keyframes phantomPulse {
          0% {
            transform: scale(0.8);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
});

export default PhantomModeIndicator;
