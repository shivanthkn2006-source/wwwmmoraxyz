// ═══════════════════════════════════════════════════════════════════════════════
// STARFIELD BACKGROUND - 3D Animated Space Environment
// Creates depth and immersion for the Voice Citadel login
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  layer: 'far' | 'mid' | 'near';
}

const generateStars = (count: number): Star[] => {
  return Array.from({ length: count }, (_, i) => {
    const layer = i < count * 0.5 ? 'far' : i < count * 0.8 ? 'mid' : 'near';
    const sizeMultiplier = layer === 'far' ? 0.5 : layer === 'mid' ? 1 : 1.5;
    
    return {
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: (Math.random() * 2 + 0.5) * sizeMultiplier,
      opacity: layer === 'far' ? 0.3 : layer === 'mid' ? 0.5 : 0.8,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      layer,
    };
  });
};

const StarfieldBackgroundComponent: React.FC<{ className?: string }> = ({ className }) => {
  // Reduce star count on mobile for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const stars = useMemo(() => generateStars(isMobile ? 80 : 150), [isMobile]);

  return (
    <div className={`fixed inset-0 overflow-hidden bg-[#030014] ${className || ''}`}>
      {/* Deep space gradient - Enhanced Cyan/Gold */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(6, 182, 212, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(251, 191, 36, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%),
            linear-gradient(180deg, #030014 0%, #0a0520 40%, #050218 100%)
          `,
        }}
      />

      {/* Animated nebula clouds - GPU accelerated */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-3xl opacity-20 animate-gpu-nebula-drift"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
          top: '10%',
          left: '10%',
          '--drift-x': '50px',
          '--drift-y': '30px',
          '--drift-duration': '20s',
        } as React.CSSProperties}
      />
      
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-15 animate-gpu-nebula-drift"
        style={{
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
          bottom: '20%',
          right: '10%',
          '--drift-x': '-40px',
          '--drift-y': '-20px',
          '--drift-duration': '25s',
        } as React.CSSProperties}
      />

      {/* Stars - GPU accelerated */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-gpu-star-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: star.layer === 'near' 
              ? 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(6, 182, 212, 0.5) 100%)'
              : 'white',
            boxShadow: star.layer === 'near' 
              ? `0 0 ${star.size * 3}px rgba(6, 182, 212, 0.5)`
              : 'none',
            '--star-opacity-start': `${star.opacity * 0.5}`,
            '--star-opacity-end': `${star.opacity}`,
            '--star-duration': `${star.duration}s`,
            '--star-delay': `${star.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Shooting stars - GPU accelerated */}
      {[0, 1, 2].map((i) => (
        <div
          key={`shooting-${i}`}
          className="absolute w-[100px] h-[1px] animate-gpu-shooting-star"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
            top: `${20 + i * 25}%`,
            left: '-100px',
            transform: 'rotate(-45deg)',
            '--shoot-delay': `${5 + i * 8}s`,
            animationDuration: '1.5s',
          } as React.CSSProperties}
        />
      ))}

      {/* Grid overlay for depth - Hide on mobile for performance */}
      <div 
        className="absolute inset-0 opacity-[0.025] hidden md:block"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
        }}
      />
    </div>
  );
};

export const StarfieldBackground = memo(StarfieldBackgroundComponent);
export default StarfieldBackground;
