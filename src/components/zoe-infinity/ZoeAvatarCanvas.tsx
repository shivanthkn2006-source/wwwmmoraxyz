/**
 * ZOE AVATAR CANVAS - Emotion-specific avatar images with motion overlays.
 * Uses 8 DIFFERENT avatar images (one per core emotion) with distinct facial expressions.
 * All 50 granular emotions map to their core emotion image + unique CSS filter/motion overlays.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AvatarEmotionState, getEmotionColor, getEmotionLabel, getCoreEmotion, type AvatarCoreEmotion } from '@/utils/avatarEmotionClassifier';
import { playEmotionAudioCue } from '@/utils/avatarEmotionAudio';
import { getEmotionVisualProfile } from './avatarEmotionVisualProfiles';
import EmotionParticles from './EmotionParticles';

// 8 distinct emotion images with real facial expressions
import zoeIdle from '@/assets/zoe-emotions/idle.png';
import zoeHappy from '@/assets/zoe-emotions/happy.png';
import zoeSad from '@/assets/zoe-emotions/sad.png';
import zoeCrying from '@/assets/zoe-emotions/crying.png';
import zoeAngry from '@/assets/zoe-emotions/angry.png';
import zoeSurprised from '@/assets/zoe-emotions/surprised.png';
import zoeLoving from '@/assets/zoe-emotions/loving.png';
import zoeThinking from '@/assets/zoe-emotions/thinking.png';

const EMOTION_IMAGES: Record<AvatarCoreEmotion, string> = {
  idle: zoeIdle,
  happy: zoeHappy,
  sad: zoeSad,
  crying: zoeCrying,
  angry: zoeAngry,
  surprised: zoeSurprised,
  loving: zoeLoving,
  thinking: zoeThinking,
};

interface AvatarCanvasProps {
  variant?: 'zoe' | 'smith';
  emotionState?: AvatarEmotionState;
  isSpeaking?: boolean;
  regionalFilter?: string; // CSS filter from regional dress system
  regionalAvatarImage?: string; // Full regional dress avatar image
}

export default function AvatarCanvas({ variant = 'zoe', emotionState = 'idle', isSpeaking = false, regionalFilter = '', regionalAvatarImage = '' }: AvatarCanvasProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const prevCoreEmotion = useRef<AvatarCoreEmotion>('idle');

  const coreEmotion = getCoreEmotion(emotionState);
  const colors = getEmotionColor(emotionState);
  const visualProfile = useMemo(() => getEmotionVisualProfile(emotionState, coreEmotion), [emotionState, coreEmotion]);
  const { filter, overlay, aura, motion: motionProfile, signature, speakingColor } = visualProfile;

  const currentImage = EMOTION_IMAGES[coreEmotion];

  // Preload all emotion images on mount
  useEffect(() => {
    Object.values(EMOTION_IMAGES).forEach(src => {
      const img = new Image();
      img.onload = () => setLoadedImages(prev => new Set(prev).add(src));
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (prevCoreEmotion.current !== coreEmotion) {
      prevCoreEmotion.current = coreEmotion;
      playEmotionAudioCue(coreEmotion);
    }
  }, [coreEmotion]);

  const isLoaded = loadedImages.has(currentImage);

  const imageAnimation = useMemo(() => {
    if (isSpeaking) {
      return {
        scale: [signature.scaleBase, signature.scaleBase + 0.008, signature.scaleBase],
        y: [signature.yOffset, signature.yOffset - 0.6, signature.yOffset],
        rotate: [signature.tilt, signature.tilt + 0.08, signature.tilt],
      };
    }

    // Subtle motion only - the real emotion is in the IMAGE itself
    return {
      scale: [signature.scaleBase, signature.scaleBase + motionProfile.breath * 0.5, signature.scaleBase],
      y: [signature.yOffset, signature.yOffset - motionProfile.float * 0.3, signature.yOffset],
      rotate: [signature.tilt, signature.tilt + motionProfile.sway * 0.3, signature.tilt],
    };
  }, [isSpeaking, motionProfile, signature]);

  const motionTransition = useMemo(() => {
    return {
      scale: { duration: isSpeaking ? 0.4 : motionProfile.duration, repeat: Infinity, ease: 'easeInOut' as const },
      y: { duration: isSpeaking ? 0.4 : motionProfile.duration, repeat: Infinity, ease: 'easeInOut' as const },
      rotate: { duration: isSpeaking ? 0.4 : motionProfile.duration + 0.5, repeat: Infinity, ease: 'easeInOut' as const },
    };
  }, [isSpeaking, motionProfile]);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/20">
      {/* Aura glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{
          background: [
            `radial-gradient(ellipse at 50% 40%, rgba(${aura.color},${aura.intensity}) 0%, transparent 70%)`,
            `radial-gradient(ellipse at 45% 50%, rgba(${aura.color},${aura.intensity * 1.35}) 0%, transparent 65%)`,
            `radial-gradient(ellipse at 55% 45%, rgba(${aura.color},${aura.intensity}) 0%, transparent 70%)`,
          ],
        }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        key={`aura-${coreEmotion}`}
      />

      {/* Regional dress avatar - full body in traditional attire */}
      {regionalAvatarImage && (
        <motion.img
          key={`regional-dress`}
          src={regionalAvatarImage}
          alt="Regional traditional dress"
          className="absolute inset-0 z-[5] w-full h-full object-contain object-center"
          style={{ maxHeight: '100dvh', maxWidth: '100vw' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          draggable={false}
        />
      )}

      {/* Avatar image - swaps based on core emotion */}
      <AnimatePresence mode="wait">
        <motion.img
          key={`avatar-${coreEmotion}`}
          src={currentImage}
          alt={`Zoe ${getEmotionLabel(emotionState)}`}
          className="relative z-10 w-full h-full object-contain object-center"
          style={{
            filter: regionalFilter ? `${filter} ${regionalFilter}` : filter,
            maxHeight: '100dvh',
            maxWidth: '100vw',
          }}
          initial={{ opacity: 0 }}
          animate={isLoaded ? { opacity: regionalAvatarImage ? 0.85 : 1, ...imageAnimation } : { opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.5 }, ...motionTransition }}
          draggable={false}
        />
      </AnimatePresence>

      {/* Color overlay for sub-emotion tinting */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`overlay-${emotionState}`}
          className="absolute inset-0 z-[15] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{ background: overlay, mixBlendMode: 'color' }}
        />
      </AnimatePresence>

      {/* Emotion particles (hearts, sparkles, tears, etc.) */}
      <EmotionParticles emotion={emotionState} isSpeaking={isSpeaking} />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[16] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.42) 100%)`,
        }}
      />

      {/* Emotion label badge */}
      {emotionState !== 'idle' && (
        <motion.div
          className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase border"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            color: colors.text,
          }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          key={emotionState}
        >
          {getEmotionLabel(emotionState)}
        </motion.div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: `${speakingColor.replace('0.8', '0.16')}`, border: `1px solid ${speakingColor.replace('0.8', '0.35')}` }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{ background: speakingColor }}
              animate={{ height: ['4px', '12px', '4px'] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
          <span className="text-[10px] ml-1" style={{ color: speakingColor.replace('0.8', '0.9') }}>Speaking</span>
        </motion.div>
      )}

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 z-20 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
        }}
      />

      {/* Loading spinner */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="w-8 h-8 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
