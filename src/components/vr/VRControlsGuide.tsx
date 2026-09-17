// ═══════════════════════════════════════════════════════════════════════════════
// VR CONTROLS GUIDE + PANEL HUB
// Additive discoverability layer: a draggable dropdown that lists every VR panel
// so nothing stays hidden, a one-tap full-screen/landscape toggle, plus a
// first-time coach card explaining tap / drag.
// No existing VR component, design or feature is modified.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Hand,
  LayoutGrid,
  Maximize,
  Minimize,
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
  /** True when the VR world currently owns the full screen. */
  isFullscreen?: boolean;
  /** One-tap full-screen (and landscape where supported) toggle. */
  onToggleFullscreen?: () => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  /** Puts every panel back in its default slot and clears saved positions. */
  onResetLayout?: () => void;
}

const COACH_KEY = 'vr-controls-coach-seen';
const HUB_OPEN_KEY = 'vr-panel-open:hub';
const HUB_POS_KEY = 'vr-panel-pos:hub';

const readHubPosition = () => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const raw = window.localStorage.getItem(HUB_POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as { x: number; y: number };
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return { x: 0, y: 0 };
    const maxX = Math.max(0, window.innerWidth - 80);
    const maxY = Math.max(0, window.innerHeight - 80);
    return {
      x: Math.max(-maxX, Math.min(maxX, parsed.x)),
      y: Math.max(-maxY, Math.min(maxY, parsed.y)),
    };
  } catch {
    return { x: 0, y: 0 };
  }
};

export const VRControlsGuide: React.FC<VRControlsGuideProps> = ({
  panels,
  needsRotate = false,
  onRequestLandscape,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(HUB_OPEN_KEY) === '1';
  });
  const [showCoach, setShowCoach] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COACH_KEY) !== '1';
  });

  const initialHub = useRef(readHubPosition());
  const x = useMotionValue(initialHub.current.x);
  const y = useMotionValue(initialHub.current.y);

  useEffect(() => {
    try {
      window.localStorage.setItem(HUB_OPEN_KEY, isOpen ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [isOpen]);

  const persistHubPosition = () => {
    try {
      window.localStorage.setItem(HUB_POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* storage unavailable */
    }
  };

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
            role="dialog"
            aria-modal="false"
            aria-labelledby="vr-controls-coach-title"
            data-testid="vr-first-time-tutorial"
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
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-purple-600/40 border border-purple-400/40 text-purple-100 text-xs font-mono
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-200/80"
              >
                Go landscape
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-time coach card */}
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
              <div className="min-w-0 flex-1 text-left">
                <p id="vr-controls-coach-title" className="text-white/90 text-xs font-semibold mb-1">How to use this world</p>
                <ul className="text-white/60 text-[11px] space-y-0.5">
                  <li>• Tap any pill to open or close that panel</li>
                  <li>• Drag a pill by its handle to move the panel anywhere</li>
                  <li>• Use the Panels button to bring back anything you hid</li>
                  <li>• Tap the full-screen icon for true landscape</li>
                </ul>
                <button
                  type="button"
                  onClick={dismissCoach}
                  className="mt-2 min-h-[40px] px-4 py-2 rounded-full bg-white/10 border border-white/25 text-white/85 text-[11px] font-mono
                             hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Got it
                </button>
              </div>
              <button
                type="button"
                onClick={dismissCoach}
                aria-label="Dismiss guide"
                className="relative z-10 ml-auto flex-shrink-0 p-2 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
        style={{ touchAction: 'none', x, y }}
        onDragEnd={persistHubPosition}
        whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        className="fixed bottom-4 right-4 z-[9997] cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex flex-col items-end gap-1.5">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-56 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl"
            >
              <p className="text-[10px] font-mono text-white/50 px-1.5 pb-1.5">SHOW / HIDE PANELS</p>
              <div className="space-y-1">
                {panels.map(panel => (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={panel.onToggle}
                    aria-pressed={panel.visible}
                    className={cn(
                      'w-full flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-[11px] transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      panel.visible
                        ? 'bg-white/10 text-white/90 hover:bg-white/20'
                        : 'bg-transparent text-white/45 hover:bg-white/10'
                    )}
                  >
                    {panel.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="truncate">{panel.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-1.5">
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                aria-pressed={isFullscreen}
                aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen landscape'}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-black/75 backdrop-blur-xl
                           border border-white/25 text-white/85 hover:bg-black/90 transition-all shadow-lg
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(v => !v)}
              aria-expanded={isOpen}
              aria-label="VR panels menu"
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2.5 rounded-full bg-black/75 backdrop-blur-xl
                         border border-white/25 text-white/85 hover:bg-black/90 transition-all shadow-lg
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <GripVertical className="w-4 h-4 text-white/50" aria-hidden />
              <LayoutGrid className="w-4 h-4 text-cyan-300" aria-hidden />
              <span className="text-[11px] sm:text-xs font-mono">Panels</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-white/70" /> : <ChevronUp className="w-4 h-4 text-white/70" />}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default VRControlsGuide;
