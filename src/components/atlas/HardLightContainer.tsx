// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: HARD LIGHT HUD CONTAINER
// Purpose: Atlas movie Smith-style Neural HUD Container
// Visual Language: Deep Void Blue + Electric Cyan + Cut Corners + Hex Grid
// Reference: Smith AI from Atlas (2024) - Neural interface aesthetics
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HardLightContainerProps {
  children: React.ReactNode;
  className?: string;
  showHexGrid?: boolean;
  showConnectorLines?: boolean;
  showMicroText?: boolean;
  showScanLines?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  cutCornerSize?: 'sm' | 'md' | 'lg';
  variant?: 'panel' | 'card' | 'fullscreen' | 'modal';
}

// Generate random micro-text data points
const generateMicroText = () => {
  const prefixes = ['SYS', 'RMS', 'PWR', 'NET', 'CPU', 'MEM', 'DHF', 'ECN', 'ZOE'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const value = (Math.random() * 100).toFixed(1);
  return `${prefix}.${Math.floor(Math.random() * 99).toString().padStart(2, '0')}: ${value}`;
};

// Hex Grid Background Component
const HexGridOverlay = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <svg
      className="w-full h-full opacity-[0.07] animate-hex-pan"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="hex-pattern"
          width="60"
          height="52"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(30)"
        >
          <path
            d="M30 0L60 15L60 37L30 52L0 37L0 15Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-atlas-cyan"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-pattern)" />
    </svg>
  </div>
));
HexGridOverlay.displayName = 'HexGridOverlay';

// Scan Lines Overlay
const ScanLinesOverlay = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 animate-scan-line bg-gradient-to-b from-transparent via-atlas-cyan/5 to-transparent" 
         style={{ height: '2px', top: '0%' }} 
    />
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.05) 2px, rgba(0, 255, 255, 0.05) 4px)',
      }}
    />
  </div>
));
ScanLinesOverlay.displayName = 'ScanLinesOverlay';

// Micro Text Display
const MicroTextOverlay = memo(() => {
  const [microTexts, setMicroTexts] = useState<string[]>([]);
  
  useEffect(() => {
    // Generate initial micro texts
    setMicroTexts(Array.from({ length: 6 }, generateMicroText));
    
    // Update periodically for "live" feel
    const interval = setInterval(() => {
      setMicroTexts(prev => {
        const newTexts = [...prev];
        const indexToUpdate = Math.floor(Math.random() * newTexts.length);
        newTexts[indexToUpdate] = generateMicroText();
        return newTexts;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left micro text */}
      <div className="absolute top-2 left-3 flex flex-col gap-0.5">
        {microTexts.slice(0, 2).map((text, i) => (
          <span key={i} className="text-[8px] font-share-tech text-atlas-cyan/40 tracking-widest">
            {text}
          </span>
        ))}
      </div>
      
      {/* Top-right micro text */}
      <div className="absolute top-2 right-3 flex flex-col gap-0.5 text-right">
        {microTexts.slice(2, 4).map((text, i) => (
          <span key={i} className="text-[8px] font-share-tech text-atlas-cyan/40 tracking-widest">
            {text}
          </span>
        ))}
      </div>
      
      {/* Bottom-left micro text */}
      <div className="absolute bottom-2 left-3 flex flex-col gap-0.5">
        {microTexts.slice(4, 6).map((text, i) => (
          <span key={i} className="text-[8px] font-share-tech text-atlas-cyan/40 tracking-widest">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
});
MicroTextOverlay.displayName = 'MicroTextOverlay';

// Corner Brackets for tactical look
const CornerBrackets = memo(({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = { sm: 12, md: 20, lg: 32 };
  const s = sizeMap[size];
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Left */}
      <svg className="absolute top-0 left-0" width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={`M0 ${s} L0 0 L${s} 0`} stroke="currentColor" strokeWidth="1.5" fill="none" className="text-atlas-cyan" />
      </svg>
      
      {/* Top Right */}
      <svg className="absolute top-0 right-0" width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={`M0 0 L${s} 0 L${s} ${s}`} stroke="currentColor" strokeWidth="1.5" fill="none" className="text-atlas-cyan" />
      </svg>
      
      {/* Bottom Left */}
      <svg className="absolute bottom-0 left-0" width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={`M0 0 L0 ${s} L${s} ${s}`} stroke="currentColor" strokeWidth="1.5" fill="none" className="text-atlas-cyan" />
      </svg>
      
      {/* Bottom Right */}
      <svg className="absolute bottom-0 right-0" width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={`M${s} 0 L${s} ${s} L0 ${s}`} stroke="currentColor" strokeWidth="1.5" fill="none" className="text-atlas-cyan" />
      </svg>
    </div>
  );
});
CornerBrackets.displayName = 'CornerBrackets';

export const HardLightContainer: React.FC<HardLightContainerProps> = memo(({
  children,
  className,
  showHexGrid = true,
  showConnectorLines = false,
  showMicroText = true,
  showScanLines = false,
  glowIntensity = 'medium',
  cutCornerSize = 'md',
  variant = 'panel',
}) => {
  // Glow intensity mapping
  const glowMap = {
    low: 'shadow-atlas-glow-sm',
    medium: 'shadow-atlas-glow',
    high: 'shadow-atlas-glow-lg',
  };
  
  // Variant styles
  const variantStyles = {
    panel: 'atlas-panel',
    card: 'atlas-card',
    fullscreen: 'atlas-fullscreen',
    modal: 'atlas-modal',
  };
  
  return (
    <motion.div
      className={cn(
        'relative',
        'bg-atlas-void',
        'border border-atlas-cyan/30',
        glowMap[glowIntensity],
        variantStyles[variant],
        // Cut corners via clip-path
        'atlas-cut-corners',
        className
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Background Layers */}
      {showHexGrid && <HexGridOverlay />}
      {showScanLines && <ScanLinesOverlay />}
      
      {/* Corner Brackets */}
      <CornerBrackets size={cutCornerSize} />
      
      {/* Micro Text */}
      {showMicroText && <MicroTextOverlay />}
      
      {/* Main Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
      
      {/* Inner glow border */}
      <div className="absolute inset-0 pointer-events-none border border-atlas-cyan/10 shadow-inner-atlas" />
    </motion.div>
  );
});

HardLightContainer.displayName = 'HardLightContainer';

export default HardLightContainer;
