// ============================================
// HOLOGRAPHIC LOADING SPINNER
// Futuristic loading animation for 3D globe
// ============================================

import React from 'react';
import { Html } from '@react-three/drei';

interface HolographicLoaderProps {
  progress?: number;
  message?: string;
}

export const HolographicLoader: React.FC<HolographicLoaderProps> = ({ 
  progress = 0, 
  message = 'INITIALIZING GAIA...' 
}) => {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 p-8">
        {/* Holographic Hexagon Spinner */}
        <div className="relative w-24 h-24">
          {/* Outer rotating ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin"
            style={{ animationDuration: '3s' }}
          />
          
          {/* Middle pulsing ring */}
          <div 
            className="absolute inset-2 rounded-full border border-primary/50 animate-pulse"
            style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
          />
          
          {/* Inner counter-rotating ring */}
          <div 
            className="absolute inset-4 rounded-full border-2 border-cyan-400/40 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2s' }}
          />
          
          {/* Center hexagon core */}
          <div className="absolute inset-6 flex items-center justify-center">
            <div 
              className="w-full h-full bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-lg rotate-45"
              style={{ 
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                boxShadow: '0 0 30px hsl(var(--primary) / 0.5), inset 0 0 20px hsl(var(--primary) / 0.3)'
              }}
            />
          </div>
          
          {/* Orbiting particles */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full animate-ping"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translateX(40px) translateY(-50%)`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s',
                opacity: 0.7
              }}
            />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="w-40 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-cyan-400 to-primary rounded-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
            }}
          />
        </div>
        
        {/* Status text */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-mono text-primary tracking-widest animate-pulse">
            {message}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {progress > 0 ? `${Math.round(progress)}%` : 'CALIBRATING...'}
          </p>
        </div>
        
        {/* Scan lines effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary) / 0.1) 2px, hsl(var(--primary) / 0.1) 4px)',
            animation: 'scanlines 8s linear infinite'
          }}
        />
      </div>
      
      <style>{`
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(100px); }
        }
      `}</style>
    </Html>
  );
};

// Simple CSS-only version for use outside of Canvas
export const HolographicLoaderCSS: React.FC<HolographicLoaderProps> = ({ 
  progress = 0, 
  message = 'INITIALIZING GAIA...' 
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4 p-8">
        {/* Holographic Spinner */}
        <div className="relative w-24 h-24">
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin"
            style={{ animationDuration: '3s' }}
          />
          <div 
            className="absolute inset-2 rounded-full border border-primary/50 animate-pulse"
            style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' }}
          />
          <div 
            className="absolute inset-4 rounded-full border-2 border-cyan-400/40 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2s' }}
          />
          <div className="absolute inset-6 flex items-center justify-center">
            <div 
              className="w-full h-full bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-lg rotate-45"
              style={{ 
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                boxShadow: '0 0 30px hsl(var(--primary) / 0.5)'
              }}
            />
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full animate-ping"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translateX(40px) translateY(-50%)`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s',
                opacity: 0.7
              }}
            />
          ))}
        </div>
        
        <div className="w-40 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-cyan-400 to-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-mono text-primary tracking-widest animate-pulse">
            {message}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {progress > 0 ? `${Math.round(progress)}%` : 'CALIBRATING...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HolographicLoader;
