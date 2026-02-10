// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Protocol EMP Visual Overlay
// Full-screen static/corruption effect when security breach detected
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProtocolEMPOverlayProps {
  isActive: boolean;
  reason: string | null;
}

const ProtocolEMPOverlay: React.FC<ProtocolEMPOverlayProps> = ({ isActive, reason }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Generate static noise effect
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let frame = 0;

    const renderStatic = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      // Generate random static with red tint
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255;
        const redBias = Math.sin(frame * 0.1) * 50 + 50;
        
        data[i] = Math.min(255, noise + redBias);     // R - biased
        data[i + 1] = noise * 0.3;                     // G - reduced
        data[i + 2] = noise * 0.3;                     // B - reduced
        data[i + 3] = 200;                             // A - semi-transparent
      }

      // Add scanlines
      for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          data[i] *= 0.7;
          data[i + 1] *= 0.7;
          data[i + 2] *= 0.7;
        }
      }

      // Add glitch bands
      const glitchY = (frame * 7) % canvas.height;
      const bandHeight = 20 + Math.random() * 30;
      for (let y = glitchY; y < Math.min(glitchY + bandHeight, canvas.height); y++) {
        const offset = Math.floor(Math.random() * 50 - 25);
        for (let x = 0; x < canvas.width; x++) {
          const srcX = Math.max(0, Math.min(canvas.width - 1, x + offset));
          const srcI = (y * canvas.width + srcX) * 4;
          const dstI = (y * canvas.width + x) * 4;
          
          data[dstI] = 255;     // Full red for glitch band
          data[dstI + 1] = 50;
          data[dstI + 2] = 50;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Add warning text
      ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + Math.sin(frame * 0.2) * 0.3})`;
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ SECURITY BREACH ⚠', canvas.width / 2, canvas.height / 2 - 50);
      
      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.fillText('PROTOCOL EMP ACTIVATED', canvas.width / 2, canvas.height / 2);
      
      ctx.font = '16px monospace';
      ctx.fillStyle = 'rgba(255, 150, 150, 0.7)';
      ctx.fillText(reason || 'Video feed corrupted', canvas.width / 2, canvas.height / 2 + 40);

      frame++;
      animationRef.current = requestAnimationFrame(renderStatic);
    };

    animationRef.current = requestAnimationFrame(renderStatic);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, reason]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 pointer-events-none"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Corner warning indicators */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-red-400 animate-pulse">
              ENCRYPTED FEED COMPROMISED
            </span>
          </div>
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs font-mono text-red-400 animate-pulse">
              MAN-IN-THE-MIDDLE DETECTED
            </span>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          
          <div className="absolute bottom-4 left-4">
            <span className="text-xs font-mono text-red-400/70">
              Auto-recovery initiating...
            </span>
          </div>
          
          <div className="absolute bottom-4 right-4">
            <span className="text-xs font-mono text-red-400/70">
              Timestamp: {new Date().toISOString()}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProtocolEMPOverlay;
