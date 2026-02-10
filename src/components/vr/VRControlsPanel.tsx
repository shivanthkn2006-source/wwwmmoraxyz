// ═══════════════════════════════════════════════════════════════════════════════
// VR CONTROLS PANEL - Draggable, Non-blocking, Always Accessible
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Eye, 
  Keyboard, 
  Mouse, 
  Smartphone, 
  Target,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pin,
  PinOff,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VRControlsPanelProps {
  onClose?: () => void;
  hasSeenTutorial?: boolean;
}

const VRControlsPanel: React.FC<VRControlsPanelProps> = ({ 
  onClose,
  hasSeenTutorial = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState({ x: 12, y: typeof window !== 'undefined' ? window.innerHeight - 200 : 400 });
  const [zIndex, setZIndex] = useState(9998);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 100),
        y: Math.min(prev.y, window.innerHeight - 80),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDrag = (_: any, info: PanInfo) => {
    const newX = Math.max(0, Math.min(window.innerWidth - 100, position.x + info.delta.x));
    const newY = Math.max(48, Math.min(window.innerHeight - 50, position.y + info.delta.y));
    setPosition({ x: newX, y: newY });
  };

  const handleDismiss = () => {
    setIsExpanded(false);
    localStorage.setItem('vr_omega_tutorial_seen', 'true');
    onClose?.();
  };

  if (typeof document === 'undefined') return null;

  if (isMinimized) {
    return createPortal(
      <motion.button
        style={{ position: 'fixed', left: position.x, top: position.y, zIndex }}
        drag={!isPinned}
        dragMomentum={false}
        dragElastic={0}
        onDrag={handleDrag}
        onClick={() => setIsMinimized(false)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border hover:bg-black/80 transition-colors pointer-events-auto',
          isPinned ? 'border-primary/50' : 'border-white/20',
          !isPinned && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <Eye className="w-3 h-3 text-purple-400" />
        <span className="text-[9px] font-mono text-white/70">VR</span>
        <Maximize2 className="w-2.5 h-2.5 text-white/40" />
      </motion.button>,
      document.body
    );
  }

  return createPortal(
    <>
      {!isExpanded && (
        <motion.button
          style={{ position: 'fixed', left: position.x, top: position.y, zIndex }}
          drag={!isPinned}
          dragMomentum={false}
          dragElastic={0}
          onDrag={handleDrag}
          onClick={() => setIsExpanded(true)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full border hover:bg-black/80 transition-colors pointer-events-auto',
            isPinned ? 'border-primary/50' : 'border-white/20',
            !isPinned && 'cursor-grab active:cursor-grabbing'
          )}
        >
          <GripVertical className="w-3 h-3 text-white/40" />
          <Eye className="w-3 h-3 text-purple-400" />
          <span className="text-[9px] font-mono text-white/70">Controls</span>
          <ChevronUp className="w-2.5 h-2.5 text-white/40" />
        </motion.button>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'fixed', left: position.x, top: position.y, zIndex }}
            drag={!isPinned}
            dragMomentum={false}
            dragElastic={0}
            onDrag={handleDrag}
            className={cn(
              'w-[260px] sm:w-[300px] pointer-events-auto',
              !isPinned && 'cursor-grab active:cursor-grabbing'
            )}
          >
            <div className={cn(
              'bg-black/85 backdrop-blur-xl rounded-xl border overflow-hidden shadow-2xl',
              isPinned ? 'border-primary/50' : 'border-white/20'
            )}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-white/40" />
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">VR Controls</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setIsPinned(!isPinned)} className="p-1 hover:bg-white/20 rounded transition-colors">
                    {isPinned ? <PinOff className="w-3 h-3 text-primary" /> : <Pin className="w-3 h-3 text-white/60" />}
                  </button>
                  <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded transition-colors">
                    <Minimize2 className="w-3 h-3 text-white/60" />
                  </button>
                  <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              <div className="p-2 space-y-2 max-h-[240px] overflow-y-auto" onPointerDown={(e) => e.stopPropagation()}>
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1.5"><Keyboard className="w-3 h-3 text-cyan-400" /><span className="text-[10px] font-semibold text-white">Keyboard</span></div>
                  <div className="grid grid-cols-3 gap-1 text-[8px]">
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">W</kbd><span className="text-white/50">Fwd</span></div>
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">S</kbd><span className="text-white/50">Back</span></div>
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">A</kbd><span className="text-white/50">Left</span></div>
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">D</kbd><span className="text-white/50">Right</span></div>
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">E</kbd><span className="text-white/50">Select</span></div>
                    <div className="flex items-center gap-1"><kbd className="px-1 bg-white/10 rounded text-white/80 font-mono">H</kbd><span className="text-white/50">Help</span></div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1.5"><Mouse className="w-3 h-3 text-purple-400" /><span className="text-[10px] font-semibold text-white">Mouse</span></div>
                  <div className="grid grid-cols-2 gap-1 text-[8px] text-white/50"><div>Drag → Look</div><div>Scroll → Zoom</div><div>Click → Select</div><div>Hover → Info</div></div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1.5"><Smartphone className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-semibold text-white">Touch</span></div>
                  <div className="grid grid-cols-2 gap-1 text-[8px] text-white/50"><div>1 Finger → Look</div><div>Pinch → Zoom</div><div>Tap → Select</div><div>Hold → Bio-Sync</div></div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1.5"><Target className="w-3 h-3 text-amber-400" /><span className="text-[10px] font-semibold text-white">Objects</span></div>
                  <div className="grid grid-cols-2 gap-1 text-[8px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-white/50">Memory</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-purple-500"/><span className="text-white/50">Holo-Wall</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-400"/><span className="text-white/50">Core</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-cyan-400"/><span className="text-white/50">Bio-Sync</span></div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <span className="text-[10px] font-semibold text-white block mb-1">Emotions</span>
                  <div className="flex flex-wrap gap-2 text-[8px]">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFD700]"/><span className="text-white/50">Joy</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#4169E1]"/><span className="text-white/50">Sad</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#DC143C]"/><span className="text-white/50">Anger</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#8B4513]"/><span className="text-white/50">Fear</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#9370DB]"/><span className="text-white/50">Think</span></div>
                  </div>
                </div>
              </div>

              <div className="p-2 border-t border-white/10">
                <button onClick={handleDismiss} onPointerDown={(e) => e.stopPropagation()} className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-white font-semibold text-xs hover:from-purple-500 hover:to-cyan-500 transition-all">
                  {!hasSeenTutorial ? 'Enter Memory Palace' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default VRControlsPanel;
