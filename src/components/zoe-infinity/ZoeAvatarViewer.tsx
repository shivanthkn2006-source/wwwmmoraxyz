/**
 * ZOE AVATAR VIEWER - Full-screen overlay with transparent chat
 * Avatar fills background, chat floats over with semi-transparent bubbles.
 * Supports minimize to corner + voice commands for show/hide.
 */

import { useEffect, useCallback, useRef, useState, useMemo, Suspense, lazy, Component, ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, useDragControls } from 'framer-motion';
import { type AvatarEmotionState } from '@/utils/avatarEmotionClassifier';
import { subscribeRuntimeSignals, getRuntimeSignals, type RuntimeSignals } from '@/utils/zoeRuntimeSignalBus';
import type { FusedEmotion } from '@/core/zoe/EmotionalFusionLayer';

// Map FusedEmotion → AvatarEmotionState (avatar classifier vocabulary).
const FUSED_TO_AVATAR: Record<FusedEmotion, AvatarEmotionState> = {
  idle: 'idle', happy: 'happy', sad: 'sad', crying: 'crying', angry: 'angry',
  surprised: 'surprised', loving: 'loving', thinking: 'thinking',
  nostalgic: 'nostalgic', focused: 'focused', joyful: 'joyful',
  concerned: 'sympathetic', flirty: 'flirty', sleepy: 'peaceful', restless: 'anxious',
};


const PIP_POS_KEY = 'zoe_pip_position_v1';
const PIP_MIN_KEY = 'zoe_pip_minimized_v1';

interface PipPos { x: number; y: number; }

const loadPipPos = (): PipPos | null => {
  try { const raw = localStorage.getItem(PIP_POS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const savePipPos = (p: PipPos) => { try { localStorage.setItem(PIP_POS_KEY, JSON.stringify(p)); } catch { /* ignore */ } };
const loadPipMin = (): boolean => { try { return localStorage.getItem(PIP_MIN_KEY) === '1'; } catch { return false; } };
const savePipMin = (m: boolean) => { try { localStorage.setItem(PIP_MIN_KEY, m ? '1' : '0'); } catch { /* ignore */ } };

const AvatarCanvas = lazy(() => import('./ZoeAvatarCanvas'));
const GLBLipSyncCanvas = lazy(() => import('./ZoeGLBLipSyncCanvas'));
const LipSyncControlPanel = lazy(() => import('./ZoeLipSyncControlPanel'));

import { getLipSyncSettings, subscribeLipSyncSettings } from '@/stores/zoeLipSyncSettings';

type AvatarVariant = 'zoe' | 'smith';

interface ZoeAvatarViewerProps {
  isVisible: boolean;
  isCompact: boolean;
  onDismiss: () => void;
  onToggleCompact: () => void;
  variant?: AvatarVariant;
  emotionState?: AvatarEmotionState;
  isSpeaking?: boolean;
  regionalFilter?: string;
  regionalAvatarImage?: string;
}

class AvatarErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) {
    console.warn('[ZoeAvatarViewer] Avatar module failed; rendering safe fallback.', error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function ZoeAvatarViewer({ isVisible, isCompact, onDismiss, onToggleCompact, variant = 'zoe', emotionState = 'idle', isSpeaking = false, regionalFilter = '', regionalAvatarImage = '' }: ZoeAvatarViewerProps) {
  // Background prefetch
  useEffect(() => {
    const prefetch = setTimeout(() => {
      import('./ZoeAvatarCanvas').catch(() => {});
    }, 800);
    return () => clearTimeout(prefetch);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isVisible, onDismiss]);

  const [useGLB, setUseGLB] = useState<boolean>(() => getLipSyncSettings().enabled);
  useEffect(() => {
    const unsub = subscribeLipSyncSettings((s) => setUseGLB(s.enabled));
    return () => { unsub(); };
  }, []);
  const fallback2D = (
    <AvatarCanvas variant={variant} emotionState={emotionState} isSpeaking={isSpeaking} regionalFilter={regionalFilter} regionalAvatarImage={regionalAvatarImage} />
  );

  const avatarContent = (
    <AvatarErrorBoundary
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <p className="text-white/70 text-sm">Presence is active ✨</p>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        }
      >
        {useGLB ? (
          <GLBLipSyncCanvas isSpeaking={isSpeaking} emotionState={emotionState} fallback={fallback2D} />
        ) : (
          fallback2D
        )}
      </Suspense>
    </AvatarErrorBoundary>
  );

  return (
    <>
      {/* Lip-Sync Studio gear — always mounted on /zoe-infinity, independent of avatar visibility */}
      <Suspense fallback={null}><LipSyncControlPanel /></Suspense>
      <AnimatePresence>
      {isVisible && (
        <>
          {/* FULL-SCREEN MODE: Avatar fills background behind chat */}
          {!isCompact ? (
            <motion.div
              className="fixed top-0 left-0 w-screen h-[100dvh] z-10 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 pointer-events-none">
                {avatarContent}
              </div>

              {/* Control buttons */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2 pointer-events-auto">
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/20 text-white/80 transition-colors backdrop-blur-sm"
                  onClick={onToggleCompact}
                  aria-label="Minimize avatar"
                  title="Minimize"
                >
                  <svg width="14" height="2" viewBox="0 0 14 2" fill="currentColor"><rect width="14" height="2" rx="1"/></svg>
                </button>
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/20 text-white/80 transition-colors backdrop-blur-sm"
                  onClick={onDismiss}
                  aria-label="Close avatar"
                  title="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Name label */}
              <div
                className="absolute left-0 right-0 text-center pointer-events-none z-50"
                style={{ bottom: 'max(214px, calc(env(safe-area-inset-bottom) + 176px))' }}
              >
                <span className="text-white/50 text-xs font-light tracking-widest uppercase">
                  {variant === 'zoe' ? 'Zoe' : 'Smith'}
                </span>
              </div>
            </motion.div>
          ) : (
            /* COMPACT MODE: Small floating avatar in bottom-right corner */
            <CompactPip
              avatarContent={avatarContent}
              onDismiss={onDismiss}
              onToggleCompact={onToggleCompact}
              isSpeaking={isSpeaking}
            />
          )}
        </>
      )}
      </AnimatePresence>
    </>
  );
}

// ─── DRAGGABLE PIP + MINIMIZE-TO-DOT ─────────────────────────────────────────
interface CompactPipProps {
  avatarContent: ReactNode;
  onDismiss: () => void;
  onToggleCompact: () => void;
  isSpeaking: boolean;
}

function CompactPip({ avatarContent, onDismiss, onToggleCompact, isSpeaking }: CompactPipProps) {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState<boolean>(() => loadPipMin());
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Compute bounds + restore position responsively
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = minimized ? 56 : Math.min(Math.max(vw * 0.28, 100), 140);
      const h = minimized ? 56 : Math.min(Math.max(vh * 0.24, 140), 190);
      const margin = 8;
      const safeRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0', 10) || 0;
      const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0', 10) || 0;
      const newBounds = {
        left: -(vw - w - margin - safeRight),
        top: -(vh - h - margin - safeBottom - 80),
        right: 0,
        bottom: 0,
      };
      setBounds(newBounds);

      // Restore + clamp position
      const saved = loadPipPos();
      if (saved) {
        const cx = Math.min(Math.max(saved.x, newBounds.left), newBounds.right);
        const cy = Math.min(Math.max(saved.y, newBounds.top), newBounds.bottom);
        x.set(cx); y.set(cy);
      }
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [minimized, x, y]);

  const handleDragEnd = useCallback(() => {
    savePipPos({ x: x.get(), y: y.get() });
  }, [x, y]);

  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimized((m) => { const next = !m; savePipMin(next); return next; });
  }, []);

  const baseStyle: React.CSSProperties = {
    right: 'max(10px, env(safe-area-inset-right))',
    bottom: 'max(104px, calc(env(safe-area-inset-bottom) + 76px))',
    touchAction: 'none',
  };

  if (minimized) {
    return (
      <motion.div
        ref={containerRef}
        className="fixed z-40"
        style={baseStyle}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={bounds}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, x: x.get(), y: y.get() }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <motion.button
          onPointerDown={(e) => dragControls.start(e)}
          onClick={(e) => { e.stopPropagation(); setMinimized(false); savePipMin(false); }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center border border-cyan-400/40 shadow-[0_0_18px_rgba(0,255,255,0.35)] backdrop-blur-md bg-black/40 cursor-grab active:cursor-grabbing"
          aria-label="Expand avatar PIP"
          title="Drag • Tap to expand"
          animate={isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={isSpeaking ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          <span className="text-white/90 text-[10px] font-light tracking-widest">ZOE</span>
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-white/40'}`} />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-40"
      style={baseStyle}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={bounds}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: x.get() }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div
        className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_35px_rgba(0,255,255,0.12),inset_0_0_24px_rgba(0,255,255,0.05)]"
        style={{
          width: 'clamp(100px, 28vw, 140px)',
          height: 'clamp(140px, 24vh, 190px)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,255,255,0.03) 52%, rgba(255,255,255,0.04) 100%)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
        }}
      >
        {/* Drag handle strip — top edge */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="absolute top-0 left-0 right-0 h-6 z-20 cursor-grab active:cursor-grabbing flex items-center justify-center"
          aria-label="Drag avatar"
        >
          <div className="w-8 h-1 rounded-full bg-white/30" />
        </div>

        {avatarContent}

        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 transition-colors text-[10px]"
            onClick={toggleMinimize}
            aria-label="Minimize to dot"
            title="Minimize"
          >
            –
          </button>
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 transition-colors text-[10px]"
            onClick={(e) => { e.stopPropagation(); onToggleCompact(); }}
            aria-label="Expand fullscreen"
            title="Fullscreen"
          >
            ▢
          </button>
          <button
            className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            aria-label="Close avatar"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default ZoeAvatarViewer;
