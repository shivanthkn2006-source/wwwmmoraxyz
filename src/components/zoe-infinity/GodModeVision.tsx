// ═══════════════════════════════════════════════════════════════════════════════
// GOD MODE VISION - Minimal object detection overlay
// Shows thin bounding boxes around detected objects/faces directly in camera view
// Activated by voice command "god mode" - NO buttons, NO panels, just detection
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, width, height
}

interface GodModeVisionProps {
  isActive: boolean;
  onClose: () => void;
}

// Lazy load TensorFlow.js and COCO-SSD
let cocoModel: any = null;
let tfLoaded = false;

const loadCocoModel = async (): Promise<any> => {
  if (cocoModel) return cocoModel;
  
  try {
    if (!tfLoaded) {
      console.log('[GodMode] Loading TensorFlow.js...');
      const tf = await import('@tensorflow/tfjs');
      await tf.setBackend('webgl');
      await tf.ready();
      tfLoaded = true;
      console.log('[GodMode] TensorFlow.js ready');
    }
    
    console.log('[GodMode] Loading COCO-SSD model...');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    cocoModel = await cocoSsd.load();
    console.log('[GodMode] COCO-SSD model loaded');
    return cocoModel;
  } catch (e) {
    console.error('[GodMode] Failed to load:', e);
    return null;
  }
};

export const GodModeVision: React.FC<GodModeVisionProps> = ({ isActive, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  // Detection loop
  const detectLoop = useCallback(async () => {
    if (!videoRef.current || !cocoModel || !isActive) return;
    
    try {
      const predictions = await cocoModel.detect(videoRef.current);
      const objects: DetectedObject[] = predictions.map((p: any) => ({
        class: p.class,
        score: Math.round(p.score * 100),
        bbox: p.bbox as [number, number, number, number],
      }));
      setDetectedObjects(objects);
    } catch (e) {
      console.error('[GodMode] Detection error:', e);
    }
    
    if (isActive) {
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(() => detectLoop(), 200); // ~5 FPS detection
      });
    }
  }, [isActive]);

  // Start camera and model
  useEffect(() => {
    if (!isActive) return;
    
    let mounted = true;
    
    const start = async () => {
      setIsLoading(true);
      
      try {
        // Load model
        await loadCocoModel();
        
        // Get camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>(resolve => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                  setVideoSize({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                  });
                }
                resolve();
              };
            }
          });
        }
        
        setIsLoading(false);
        
        // Start detection
        if (cocoModel) {
          detectLoop();
        }
      } catch (e) {
        console.error('[GodMode] Start error:', e);
        setIsLoading(false);
      }
    };
    
    start();
    
    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setDetectedObjects([]);
    };
  }, [isActive, detectLoop]);

  // Draw bounding boxes with CORRECTED text direction (not mirrored)
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Draw thin boxes - coordinates are mirrored along with video
    detectedObjects.forEach(obj => {
      const [x, y, width, height] = obj.bbox;
      
      // Mirror the x coordinate since video is mirrored
      const mirroredX = w - x - width;
      
      // Thin cyan stroke
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mirroredX, y, width, height);
      
      // Corner accents
      const cornerLen = 10;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(mirroredX, y + cornerLen);
      ctx.lineTo(mirroredX, y);
      ctx.lineTo(mirroredX + cornerLen, y);
      ctx.stroke();
      
      // Top-right
      ctx.beginPath();
      ctx.moveTo(mirroredX + width - cornerLen, y);
      ctx.lineTo(mirroredX + width, y);
      ctx.lineTo(mirroredX + width, y + cornerLen);
      ctx.stroke();
      
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(mirroredX, y + height - cornerLen);
      ctx.lineTo(mirroredX, y + height);
      ctx.lineTo(mirroredX + cornerLen, y + height);
      ctx.stroke();
      
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(mirroredX + width - cornerLen, y + height);
      ctx.lineTo(mirroredX + width, y + height);
      ctx.lineTo(mirroredX + width, y + height - cornerLen);
      ctx.stroke();
      
      // Label - draw ABOVE the box, text reads correctly (not mirrored)
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
      const label = `${obj.class} ${obj.score}%`;
      ctx.fillText(label, mirroredX + 2, y - 6);
    });
  }, [detectedObjects]);

  // Close on tap outside or swipe down
  const handleBackdropClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-cyan-400/60 text-sm font-mono">Initializing vision...</p>
            </div>
          </motion.div>
        )}

        {/* Camera + Detection Overlay */}
        <div className="relative w-full h-full">
          {/* Video feed - mirrored for selfie view */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Detection canvas overlay - NOT mirrored, text reads correctly */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          
          {/* Minimal status indicator */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-cyan-400/70 text-xs font-mono uppercase tracking-wider">
                Vision Active
              </span>
            </motion.div>
          )}
          
          {/* Object count */}
          {detectedObjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 right-4"
            >
              <span className="text-cyan-400/70 text-xs font-mono">
                {detectedObjects.length} detected
              </span>
            </motion.div>
          )}
          
          {/* Exit hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <span className="text-white/40 text-xs font-mono">
              tap to exit
            </span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
