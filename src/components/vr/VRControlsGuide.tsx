// ═══════════════════════════════════════════════════════════════════════════════
// VR CONTROLS GUIDE + PANEL HUB
// Additive discoverability layer: a draggable dropdown that lists every VR panel
// so nothing stays hidden, plus a one-time coach card explaining tap / drag.
// No existing VR component, design or feature is modified.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Hand,
  LayoutGrid,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VRPanelToggle {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

interface VRControlsGuideProps {
  panels: VRPanelToggle[];
  needsRotate?: boolean;
  onRequestLandscape?: () => void;
}

const COACH_KEY = 'vr-controls-coach-seen';

export const VRControlsGuide: React.FC<VRControlsGuideProps> = ({
  panels,
  needsRotate = false,
  onRequestLandscape,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCoach, setShowCoach] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COACH_KEY) !== '1';
  });

  const dismissCoach = () => {
    setShowCoach(false);
    try {
      window.localStorage.setItem(COACH_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <>
      {/* Rotate-to-landscape prompt (touch devices held in portrait) */}
      <AnimatePresence>
        {needsRotate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-xl px-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 90, 90, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <RotateCcw className="w-12 h-12 text-purple-300" />
            </motion.div>
            <p className="text-white/90 text-sm font-semibold">Turn your device sideways</p>
            <p className="text-white/60 text-xs max-w-xs">
              The VR world opens in landscape so you can see the full space and reach every control.
            </p>
            {onRequestLandscape && (
              <button
                type="button"
                onClick={onRequestLandscape}
                className="px-4 py-2 rounded-full bg-purple-600/40 border border-purple-400/40 text-purple-100 text-xs font-mono"
              >
                Go landscape
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* One-time coach card */}
      <AnimatePresence>
        {showCoach && !needsRotate && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 sm:bottom-4 left-2 sm:left-4 z-[9996] w-[min(88vw,24rem)]
                       bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <Hand className="w-5 h-5 text-cyan-300 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-white/90 text-xs font-semibold mb-1">How to use this world</p>
                <ul className="text-white/60 text-[11px] space-y-0.5">
                  <li>• Tap any pill to open or close that panel</li>
                  <li>• Drag a pill by its handle to move the panel anywhere</li>
                  <li>• Use the Panels button to bring back anything you hid</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={dismissCoach}
                aria-label="Dismiss guide"
                className="ml-auto p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable panel hub */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        className="fixed bottom-4 right-4 z-[9997] cursor-grab active:cursor-grabbing touch-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex flex-col items-end gap-1.5">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-52 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl"
            >
              <p className="text-[10px] font-mono text-white/50 px-1.5 pb-1.5">SHOW / HIDE PANELS</p>
              <div className="space-y-1">
                {panels.map(panel => (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={panel.onToggle}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-colors',
                      panel.visible
                        ? 'bg-white/10 text-white/90'
                        : 'bg-transparent text-white/45 hover:bg-white/5'
                    )}
                  >
                    {panel.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="truncate">{panel.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            aria-expanded={isOpen}
            aria-label="VR panels menu"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/75 backdrop-blur-xl
                       border border-white/25 text-white/85 hover:bg-black/90 transition-all shadow-lg"
          >
            <GripVertical className="w-3 h-3 text-white/40" />
            <LayoutGrid className="w-4 h-4 text-cyan-300" />
            <span className="text-[10px] sm:text-xs font-mono">Panels</span>
            {isOpen ? <ChevronDown className="w-3 h-3 text-white/60" /> : <ChevronUp className="w-3 h-3 text-white/60" />}
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default VRControlsGuide;
