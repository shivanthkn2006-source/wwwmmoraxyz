// ═══════════════════════════════════════════════════════════════════════════════
// SCORCHED EARTH SCREEN - Black Box Protocol
// Visual "self-destruct" screen when security breach is detected
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';

interface ScorchedEarthScreenProps {
  onCountdownEnd?: () => void;
}

export const ScorchedEarthScreen: React.FC<ScorchedEarthScreenProps> = ({ 
  onCountdownEnd 
}) => {
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onCountdownEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [onCountdownEnd]);
  
  return (
    <div className="fixed inset-0 bg-background z-[99999] flex items-center justify-center">
      <div className="text-center">
        <div className="text-destructive text-4xl md:text-6xl font-mono mb-8 animate-pulse">
          ⚠️ SECURITY BREACH DETECTED ⚠️
        </div>
        <div className="text-destructive/80 text-xl md:text-2xl font-mono mb-4">
          Purging Local Memory in {countdown}...
        </div>
        <div className="text-muted-foreground text-sm font-mono">
          Your IP has been flagged. Administrators have been notified.
        </div>
        <div className="mt-8 flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full ${
                i <= (5 - countdown) ? 'bg-destructive' : 'bg-muted'
              } transition-colors duration-300`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScorchedEarthScreen;
