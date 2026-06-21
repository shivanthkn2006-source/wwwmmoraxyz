/**
 * ZOE EMOTION TEST PANEL - Debug tool to preview all 50 emotions
 * Shows the full-body avatar with emotion switching controls.
 * Groups emotions by core family with video mapping info.
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ALL_AVATAR_EMOTIONS,
  type AvatarEmotionState,
  type AvatarCoreEmotion,
  getCoreEmotion,
  getVideoEmotion,
  getEmotionColor,
  getEmotionLabel,
} from '@/utils/avatarEmotionClassifier';
import AvatarCanvas from './ZoeAvatarCanvas';

const ALL_EMOTIONS: AvatarEmotionState[] = ALL_AVATAR_EMOTIONS;

const CORE_FAMILY_LABELS: Record<AvatarCoreEmotion, string> = {
  idle: '⚪ Idle',
  happy: '😊 Happy',
  sad: '😢 Sad',
  crying: '😭 Crying',
  angry: '😡 Angry',
  surprised: '😲 Surprised',
  loving: '❤️ Loving',
  thinking: '🤔 Thinking',
};

const CORE_FAMILY_ORDER: AvatarCoreEmotion[] = ['idle', 'happy', 'sad', 'crying', 'angry', 'surprised', 'loving', 'thinking'];

interface Props {
  onClose: () => void;
}

export default function ZoeEmotionTestPanel({ onClose }: Props) {
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotionState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoIndex, setAutoIndex] = useState(0);

  // Group emotions by core family
  const grouped = useMemo(() => {
    const map = new Map<AvatarCoreEmotion, AvatarEmotionState[]>();
    CORE_FAMILY_ORDER.forEach(c => map.set(c, []));
    ALL_EMOTIONS.forEach(e => {
      const core = getCoreEmotion(e);
      map.get(core)?.push(e);
    });
    return map;
  }, []);

  // Auto-play through all emotions
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setAutoIndex(prev => {
        const next = (prev + 1) % ALL_EMOTIONS.length;
        setCurrentEmotion(ALL_EMOTIONS[next]);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [autoPlay]);

  const videoEmotion = getVideoEmotion(currentEmotion);
  const coreEmotion = getCoreEmotion(currentEmotion);
  const colors = getEmotionColor(currentEmotion);
  const currentIndex = ALL_EMOTIONS.indexOf(currentEmotion);
  const hasVideo = videoEmotion === currentEmotion;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Left: Full-background Avatar Preview */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <AvatarCanvas variant="zoe" emotionState={currentEmotion} isSpeaking={isSpeaking} />
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-30">
          <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                  style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
                >
                  {getEmotionLabel(currentEmotion)}
                </span>
                <span className="text-white/40 text-xs">#{currentIndex + 1} / {ALL_EMOTIONS.length}</span>
              </div>
              <button
                onClick={() => setIsSpeaking(!isSpeaking)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  isSpeaking
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                    : 'bg-white/5 border-white/20 text-white/50 hover:bg-white/10'
                }`}
              >
                {isSpeaking ? '🔊 Speaking ON' : '🔇 Speaking OFF'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-white/30">Core Family:</span>
                <span className="ml-1 text-white/70">{CORE_FAMILY_LABELS[coreEmotion]}</span>
              </div>
              <div>
                <span className="text-white/30">Expression Profile:</span>
                <span className={`ml-1 ${hasVideo ? 'text-green-400' : 'text-yellow-400'}`}>
                  {videoEmotion} {hasVideo ? '✓ direct' : '↗ mapped'}
                </span>
              </div>
              <div>
                <span className="text-white/30">Render Mode:</span>
                <span className="ml-1 text-white/50">Realistic full-body saree avatar</span>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const prev = (currentIndex - 1 + ALL_EMOTIONS.length) % ALL_EMOTIONS.length;
                  setCurrentEmotion(ALL_EMOTIONS[prev]);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  const next = (currentIndex + 1) % ALL_EMOTIONS.length;
                  setCurrentEmotion(ALL_EMOTIONS[next]);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition-colors"
              >
                Next →
              </button>
              <button
                onClick={() => {
                  setAutoPlay(!autoPlay);
                  if (!autoPlay) {
                    let idx = currentIndex;
                    const interval = setInterval(() => {
                      idx = (idx + 1) % ALL_EMOTIONS.length;
                      setCurrentEmotion(ALL_EMOTIONS[idx]);
                    }, 3000);
                    (window as any).__emotionAutoPlay = interval;
                  } else {
                    clearInterval((window as any).__emotionAutoPlay);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  autoPlay
                    ? 'bg-green-500/20 border-green-400/30 text-green-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                {autoPlay ? '⏸ Stop Auto' : '▶ Auto Play'}
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white/80 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Right: Emotion Grid */}
      <div className="w-80 bg-black/40 border-l border-white/10 overflow-y-auto p-4 space-y-4">
        <h2 className="text-white/90 text-sm font-semibold tracking-wide uppercase">
          All 50 Emotions
        </h2>

        {CORE_FAMILY_ORDER.map(core => {
          const emotions = grouped.get(core) || [];
          if (emotions.length === 0) return null;

          return (
            <div key={core} className="space-y-1.5">
              <h3 className="text-white/40 text-[11px] font-medium uppercase tracking-wider">
                {CORE_FAMILY_LABELS[core]} ({emotions.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {emotions.map(em => {
                  const emColors = getEmotionColor(em);
                  const isActive = currentEmotion === em;
                  const emVideoEmotion = getVideoEmotion(em);
                  const isDirect = emVideoEmotion === em;

                  return (
                    <button
                      key={em}
                      onClick={() => setCurrentEmotion(em)}
                      className={`px-2 py-1 rounded-md text-[10px] border transition-all ${
                        isActive
                          ? 'ring-1 ring-white/40 scale-105'
                          : 'hover:scale-102 hover:brightness-125'
                      }`}
                      style={{
                        background: isActive ? emColors.bg.replace('0.15', '0.3') : emColors.bg,
                        borderColor: isActive ? emColors.border.replace('0.3', '0.6') : emColors.border,
                        color: emColors.text,
                      }}
                      title={`${getEmotionLabel(em)} → video: ${emVideoEmotion} (${isDirect ? 'direct' : 'mapped'})`}
                    >
                      {isDirect ? '' : '↗ '}{getEmotionLabel(em)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/40 space-y-1">
          <div>✅ <span className="text-white/60">50 emotions</span> routed through the classifier</div>
          <div>↗ <span className="text-white/60">Granular mapping</span> tuned for realistic pose/filter shifts</div>
          <div>🎨 <span className="text-white/60">50 unique</span> color palettes</div>
          <div>🔊 <span className="text-white/60">8 audio cue</span> families</div>
        </div>
      </div>
    </motion.div>
  );
}
