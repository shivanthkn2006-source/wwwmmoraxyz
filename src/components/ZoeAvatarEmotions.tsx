/**
 * ZOE AVATAR EMOTIONS - ONE Woman, 50 Emotions, Real-Time Animated
 * Same consistent face across ALL emotional states
 * Animated overlays: tears, blush, breathing, trembling, glow, particles
 * Wired to detect emotion from user conversation in real-time
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSISTENT FACE - ALL from the SAME woman (edited from one base portrait)
// ═══════════════════════════════════════════════════════════════════════════════
import zoeNeutral from '@/assets/zoe-avatar/zoe-neutral.jpg';
import zoeHappy from '@/assets/zoe-avatar/zoe-happy.jpg';
import zoeSad from '@/assets/zoe-avatar/zoe-sad.jpg';
import zoeSurprised from '@/assets/zoe-avatar/zoe-surprised.jpg';
import zoeAngry from '@/assets/zoe-avatar/zoe-angry.jpg';
import zoeFearful from '@/assets/zoe-avatar/zoe-fearful.jpg';
import zoeLaughing from '@/assets/zoe-avatar/zoe-laughing.jpg';
import zoeLovingImg from '@/assets/zoe-avatar/zoe-loving.jpg';
import zoeThinking from '@/assets/zoe-avatar/zoe-thinking.jpg';
import zoeDisgusted from '@/assets/zoe-avatar/zoe-disgusted.jpg';
import zoePeaceful from '@/assets/zoe-avatar/zoe-peaceful.jpg';

// ═══════════════════════════════════════════════════════════════════════════════
// 50 EMOTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ZoeEmotion =
  // JOY family (10)
  | 'happy' | 'joyful' | 'elated' | 'cheerful' | 'blissful'
  | 'ecstatic' | 'amused' | 'delighted' | 'gleeful' | 'euphoric'
  // SADNESS family (10)
  | 'sad' | 'melancholy' | 'sorrowful' | 'gloomy' | 'heartbroken'
  | 'lonely' | 'nostalgic' | 'disappointed' | 'grieving' | 'wistful'
  // ANGER family (5)
  | 'angry' | 'frustrated' | 'irritated' | 'furious' | 'resentful'
  // FEAR family (5)
  | 'fearful' | 'anxious' | 'nervous' | 'terrified' | 'worried'
  // SURPRISE family (5)
  | 'surprised' | 'shocked' | 'amazed' | 'stunned' | 'astonished'
  // LOVE family (5)
  | 'loving' | 'affectionate' | 'compassionate' | 'tender' | 'devoted'
  // THINKING family (5)
  | 'thoughtful' | 'curious' | 'contemplative' | 'focused' | 'confused'
  // DISGUST family (3)
  | 'disgusted' | 'repulsed' | 'contemptuous'
  // CALM family (5)
  | 'neutral' | 'calm' | 'serene' | 'peaceful' | 'content'
  // EXCITED family (5 — includes hopeful/passionate)
  | 'excited' | 'enthusiastic' | 'passionate' | 'energetic' | 'hopeful';

// ═══════════════════════════════════════════════════════════════════════════════
// OVERLAY TYPES
// ═══════════════════════════════════════════════════════════════════════════════
type OverlayEffect = 'tears' | 'blush' | 'sparkle' | 'hearts' | 'fire' | 'sweat' | 'stars' | 'question_marks';
type BodyAnim = 'breathe' | 'bounce' | 'tremble' | 'sway' | 'droop' | 'startle' | 'recoil' | 'tilt' | 'still';

interface EmotionConfig {
  baseImage: string;
  label: string;
  color: string;
  cssFilter: string;
  glowColor: string;
  bodyAnim: BodyAnim;
  intensity: number;
  breathRate: number;
  overlays: OverlayEffect[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 50 EMOTION → SAME WOMAN CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_MAP: Record<ZoeEmotion, EmotionConfig> = {
  // JOY (10)
  happy:     { baseImage: zoeHappy, label: 'Happy', color: '#FFD700', cssFilter: 'brightness(1.05) saturate(1.1)', glowColor: 'rgba(255,215,0,0.3)', bodyAnim: 'sway', intensity: 0.7, breathRate: 3, overlays: ['sparkle'] },
  joyful:    { baseImage: zoeHappy, label: 'Joyful', color: '#FFA500', cssFilter: 'brightness(1.1) saturate(1.2)', glowColor: 'rgba(255,165,0,0.35)', bodyAnim: 'bounce', intensity: 0.8, breathRate: 2.5, overlays: ['sparkle', 'stars'] },
  elated:    { baseImage: zoeLaughing, label: 'Elated', color: '#FF6347', cssFilter: 'brightness(1.15) saturate(1.3)', glowColor: 'rgba(255,99,71,0.4)', bodyAnim: 'bounce', intensity: 0.9, breathRate: 2, overlays: ['sparkle', 'stars'] },
  cheerful:  { baseImage: zoeHappy, label: 'Cheerful', color: '#98FB98', cssFilter: 'brightness(1.08) saturate(1.15)', glowColor: 'rgba(152,251,152,0.3)', bodyAnim: 'sway', intensity: 0.65, breathRate: 3, overlays: ['sparkle'] },
  blissful:  { baseImage: zoePeaceful, label: 'Blissful', color: '#DDA0DD', cssFilter: 'brightness(1.1) saturate(1.1) hue-rotate(10deg)', glowColor: 'rgba(221,160,221,0.35)', bodyAnim: 'sway', intensity: 0.85, breathRate: 4, overlays: ['sparkle', 'hearts'] },
  ecstatic:  { baseImage: zoeLaughing, label: 'Ecstatic', color: '#FF4500', cssFilter: 'brightness(1.2) saturate(1.4)', glowColor: 'rgba(255,69,0,0.45)', bodyAnim: 'bounce', intensity: 1.0, breathRate: 1.5, overlays: ['sparkle', 'stars'] },
  amused:    { baseImage: zoeLaughing, label: 'Amused', color: '#FF69B4', cssFilter: 'brightness(1.05) saturate(1.05)', glowColor: 'rgba(255,105,180,0.25)', bodyAnim: 'sway', intensity: 0.5, breathRate: 2, overlays: ['sparkle'] },
  delighted: { baseImage: zoeHappy, label: 'Delighted', color: '#FFB347', cssFilter: 'brightness(1.12) saturate(1.25)', glowColor: 'rgba(255,179,71,0.35)', bodyAnim: 'bounce', intensity: 0.8, breathRate: 2.5, overlays: ['sparkle'] },
  gleeful:   { baseImage: zoeLaughing, label: 'Gleeful', color: '#00CED1', cssFilter: 'brightness(1.1) saturate(1.2) hue-rotate(-5deg)', glowColor: 'rgba(0,206,209,0.3)', bodyAnim: 'bounce', intensity: 0.75, breathRate: 2, overlays: ['sparkle'] },
  euphoric:  { baseImage: zoeLaughing, label: 'Euphoric', color: '#FF1493', cssFilter: 'brightness(1.2) saturate(1.5)', glowColor: 'rgba(255,20,147,0.5)', bodyAnim: 'bounce', intensity: 1.0, breathRate: 1.5, overlays: ['sparkle', 'stars', 'hearts'] },

  // SADNESS (10)
  sad:          { baseImage: zoeSad, label: 'Sad', color: '#4682B4', cssFilter: 'brightness(0.9) saturate(0.8)', glowColor: 'rgba(70,130,180,0.3)', bodyAnim: 'droop', intensity: 0.7, breathRate: 5, overlays: ['tears'] },
  melancholy:   { baseImage: zoeSad, label: 'Melancholy', color: '#6A5ACD', cssFilter: 'brightness(0.85) saturate(0.7) hue-rotate(10deg)', glowColor: 'rgba(106,90,205,0.3)', bodyAnim: 'droop', intensity: 0.6, breathRate: 5.5, overlays: ['tears'] },
  sorrowful:    { baseImage: zoeSad, label: 'Sorrowful', color: '#483D8B', cssFilter: 'brightness(0.8) saturate(0.6)', glowColor: 'rgba(72,61,139,0.35)', bodyAnim: 'droop', intensity: 0.85, breathRate: 6, overlays: ['tears'] },
  gloomy:       { baseImage: zoeSad, label: 'Gloomy', color: '#708090', cssFilter: 'brightness(0.8) saturate(0.5) grayscale(0.2)', glowColor: 'rgba(112,128,144,0.3)', bodyAnim: 'droop', intensity: 0.7, breathRate: 5.5, overlays: [] },
  heartbroken:  { baseImage: zoeSad, label: 'Heartbroken', color: '#8B0000', cssFilter: 'brightness(0.75) saturate(0.9) hue-rotate(-10deg)', glowColor: 'rgba(139,0,0,0.4)', bodyAnim: 'tremble', intensity: 1.0, breathRate: 3, overlays: ['tears'] },
  lonely:       { baseImage: zoeSad, label: 'Lonely', color: '#2F4F4F', cssFilter: 'brightness(0.85) saturate(0.6) grayscale(0.15)', glowColor: 'rgba(47,79,79,0.3)', bodyAnim: 'droop', intensity: 0.6, breathRate: 5, overlays: ['tears'] },
  nostalgic:    { baseImage: zoeThinking, label: 'Nostalgic', color: '#D2691E', cssFilter: 'brightness(0.95) saturate(0.8) sepia(0.2)', glowColor: 'rgba(210,105,30,0.25)', bodyAnim: 'sway', intensity: 0.5, breathRate: 4.5, overlays: [] },
  disappointed: { baseImage: zoeSad, label: 'Disappointed', color: '#696969', cssFilter: 'brightness(0.88) saturate(0.7)', glowColor: 'rgba(105,105,105,0.3)', bodyAnim: 'droop', intensity: 0.55, breathRate: 4.5, overlays: [] },
  grieving:     { baseImage: zoeSad, label: 'Grieving', color: '#191970', cssFilter: 'brightness(0.7) saturate(0.5)', glowColor: 'rgba(25,25,112,0.4)', bodyAnim: 'tremble', intensity: 1.0, breathRate: 3, overlays: ['tears'] },
  wistful:      { baseImage: zoeThinking, label: 'Wistful', color: '#9370DB', cssFilter: 'brightness(0.92) saturate(0.85) hue-rotate(5deg)', glowColor: 'rgba(147,112,219,0.25)', bodyAnim: 'sway', intensity: 0.45, breathRate: 4.5, overlays: [] },

  // ANGER (5)
  angry:     { baseImage: zoeAngry, label: 'Angry', color: '#DC143C', cssFilter: 'brightness(0.95) saturate(1.3) hue-rotate(-5deg)', glowColor: 'rgba(220,20,60,0.4)', bodyAnim: 'tremble', intensity: 0.8, breathRate: 2, overlays: ['fire'] },
  frustrated:{ baseImage: zoeAngry, label: 'Frustrated', color: '#FF6347', cssFilter: 'brightness(0.92) saturate(1.2)', glowColor: 'rgba(255,99,71,0.35)', bodyAnim: 'tremble', intensity: 0.65, breathRate: 2.5, overlays: ['fire'] },
  irritated: { baseImage: zoeAngry, label: 'Irritated', color: '#FF8C00', cssFilter: 'brightness(0.95) saturate(1.1)', glowColor: 'rgba(255,140,0,0.3)', bodyAnim: 'tremble', intensity: 0.5, breathRate: 3, overlays: [] },
  furious:   { baseImage: zoeAngry, label: 'Furious', color: '#B22222', cssFilter: 'brightness(0.9) saturate(1.5) hue-rotate(-10deg)', glowColor: 'rgba(178,34,34,0.5)', bodyAnim: 'tremble', intensity: 1.0, breathRate: 1.5, overlays: ['fire'] },
  resentful: { baseImage: zoeAngry, label: 'Resentful', color: '#8B4513', cssFilter: 'brightness(0.88) saturate(1.1) sepia(0.1)', glowColor: 'rgba(139,69,19,0.3)', bodyAnim: 'tremble', intensity: 0.6, breathRate: 3, overlays: [] },

  // FEAR (5)
  fearful:   { baseImage: zoeFearful, label: 'Fearful', color: '#9932CC', cssFilter: 'brightness(0.9) saturate(0.9)', glowColor: 'rgba(153,50,204,0.35)', bodyAnim: 'tremble', intensity: 0.75, breathRate: 1.5, overlays: ['sweat'] },
  anxious:   { baseImage: zoeFearful, label: 'Anxious', color: '#BA55D3', cssFilter: 'brightness(0.92) saturate(0.85)', glowColor: 'rgba(186,85,211,0.3)', bodyAnim: 'tremble', intensity: 0.6, breathRate: 2, overlays: ['sweat'] },
  nervous:   { baseImage: zoeFearful, label: 'Nervous', color: '#DDA0DD', cssFilter: 'brightness(0.95) saturate(0.9)', glowColor: 'rgba(221,160,221,0.25)', bodyAnim: 'tremble', intensity: 0.5, breathRate: 2.5, overlays: ['sweat'] },
  terrified: { baseImage: zoeFearful, label: 'Terrified', color: '#4B0082', cssFilter: 'brightness(0.8) saturate(1.1) hue-rotate(5deg)', glowColor: 'rgba(75,0,130,0.45)', bodyAnim: 'tremble', intensity: 1.0, breathRate: 1, overlays: ['sweat'] },
  worried:   { baseImage: zoeFearful, label: 'Worried', color: '#7B68EE', cssFilter: 'brightness(0.93) saturate(0.85)', glowColor: 'rgba(123,104,238,0.25)', bodyAnim: 'sway', intensity: 0.5, breathRate: 2.5, overlays: [] },

  // SURPRISE (5)
  surprised:  { baseImage: zoeSurprised, label: 'Surprised', color: '#00BFFF', cssFilter: 'brightness(1.1) saturate(1.15)', glowColor: 'rgba(0,191,255,0.35)', bodyAnim: 'startle', intensity: 0.7, breathRate: 2, overlays: ['sparkle'] },
  shocked:    { baseImage: zoeSurprised, label: 'Shocked', color: '#1E90FF', cssFilter: 'brightness(1.15) saturate(1.2)', glowColor: 'rgba(30,144,255,0.4)', bodyAnim: 'startle', intensity: 0.9, breathRate: 1.5, overlays: ['sparkle'] },
  amazed:     { baseImage: zoeSurprised, label: 'Amazed', color: '#00CED1', cssFilter: 'brightness(1.12) saturate(1.25) hue-rotate(5deg)', glowColor: 'rgba(0,206,209,0.35)', bodyAnim: 'startle', intensity: 0.8, breathRate: 2, overlays: ['sparkle', 'stars'] },
  stunned:    { baseImage: zoeSurprised, label: 'Stunned', color: '#4169E1', cssFilter: 'brightness(1.05) saturate(1.1)', glowColor: 'rgba(65,105,225,0.4)', bodyAnim: 'startle', intensity: 0.85, breathRate: 2, overlays: [] },
  astonished: { baseImage: zoeSurprised, label: 'Astonished', color: '#6495ED', cssFilter: 'brightness(1.1) saturate(1.2)', glowColor: 'rgba(100,149,237,0.35)', bodyAnim: 'startle', intensity: 0.9, breathRate: 1.5, overlays: ['sparkle', 'stars'] },

  // LOVE (5)
  loving:       { baseImage: zoeLovingImg, label: 'Loving', color: '#FF69B4', cssFilter: 'brightness(1.05) saturate(1.15) hue-rotate(5deg)', glowColor: 'rgba(255,105,180,0.35)', bodyAnim: 'sway', intensity: 0.8, breathRate: 4, overlays: ['hearts'] },
  affectionate: { baseImage: zoeLovingImg, label: 'Affectionate', color: '#FF1493', cssFilter: 'brightness(1.08) saturate(1.2)', glowColor: 'rgba(255,20,147,0.3)', bodyAnim: 'sway', intensity: 0.7, breathRate: 3.5, overlays: ['hearts'] },
  compassionate:{ baseImage: zoeLovingImg, label: 'Compassionate', color: '#DB7093', cssFilter: 'brightness(1.03) saturate(1.05)', glowColor: 'rgba(219,112,147,0.25)', bodyAnim: 'sway', intensity: 0.6, breathRate: 4, overlays: ['hearts'] },
  tender:       { baseImage: zoeLovingImg, label: 'Tender', color: '#FFB6C1', cssFilter: 'brightness(1.06) saturate(1.1) hue-rotate(3deg)', glowColor: 'rgba(255,182,193,0.3)', bodyAnim: 'sway', intensity: 0.65, breathRate: 4.5, overlays: ['hearts', 'blush'] },
  devoted:      { baseImage: zoeLovingImg, label: 'Devoted', color: '#C71585', cssFilter: 'brightness(1.05) saturate(1.25)', glowColor: 'rgba(199,21,133,0.35)', bodyAnim: 'sway', intensity: 0.85, breathRate: 3.5, overlays: ['hearts'] },

  // THINKING (5)
  thoughtful:    { baseImage: zoeThinking, label: 'Thoughtful', color: '#20B2AA', cssFilter: 'brightness(0.98) saturate(0.95)', glowColor: 'rgba(32,178,170,0.25)', bodyAnim: 'sway', intensity: 0.5, breathRate: 4, overlays: [] },
  curious:       { baseImage: zoeThinking, label: 'Curious', color: '#48D1CC', cssFilter: 'brightness(1.02) saturate(1.05)', glowColor: 'rgba(72,209,204,0.3)', bodyAnim: 'tilt', intensity: 0.6, breathRate: 3, overlays: ['question_marks'] },
  contemplative: { baseImage: zoeThinking, label: 'Contemplative', color: '#5F9EA0', cssFilter: 'brightness(0.95) saturate(0.9)', glowColor: 'rgba(95,158,160,0.25)', bodyAnim: 'sway', intensity: 0.45, breathRate: 5, overlays: [] },
  focused:       { baseImage: zoeThinking, label: 'Focused', color: '#2E8B57', cssFilter: 'brightness(1.0) saturate(1.0)', glowColor: 'rgba(46,139,87,0.3)', bodyAnim: 'still', intensity: 0.6, breathRate: 3.5, overlays: [] },
  confused:      { baseImage: zoeThinking, label: 'Confused', color: '#DAA520', cssFilter: 'brightness(0.95) saturate(0.9) hue-rotate(-5deg)', glowColor: 'rgba(218,165,32,0.25)', bodyAnim: 'tilt', intensity: 0.55, breathRate: 3, overlays: ['question_marks'] },

  // DISGUST (3)
  disgusted:    { baseImage: zoeDisgusted, label: 'Disgusted', color: '#556B2F', cssFilter: 'brightness(0.9) saturate(0.8) hue-rotate(15deg)', glowColor: 'rgba(85,107,47,0.3)', bodyAnim: 'recoil', intensity: 0.7, breathRate: 3, overlays: [] },
  repulsed:     { baseImage: zoeDisgusted, label: 'Repulsed', color: '#6B8E23', cssFilter: 'brightness(0.85) saturate(0.7) hue-rotate(20deg)', glowColor: 'rgba(107,142,35,0.35)', bodyAnim: 'recoil', intensity: 0.85, breathRate: 2.5, overlays: [] },
  contemptuous: { baseImage: zoeDisgusted, label: 'Contemptuous', color: '#808000', cssFilter: 'brightness(0.92) saturate(0.85)', glowColor: 'rgba(128,128,0,0.3)', bodyAnim: 'recoil', intensity: 0.6, breathRate: 3.5, overlays: [] },

  // CALM (5)
  neutral:  { baseImage: zoeNeutral, label: 'Neutral', color: '#C0C0C0', cssFilter: 'brightness(1.0) saturate(1.0)', glowColor: 'rgba(192,192,192,0.2)', bodyAnim: 'breathe', intensity: 0.3, breathRate: 4, overlays: [] },
  calm:     { baseImage: zoePeaceful, label: 'Calm', color: '#87CEEB', cssFilter: 'brightness(1.02) saturate(0.95)', glowColor: 'rgba(135,206,235,0.25)', bodyAnim: 'breathe', intensity: 0.3, breathRate: 5, overlays: [] },
  serene:   { baseImage: zoePeaceful, label: 'Serene', color: '#B0E0E6', cssFilter: 'brightness(1.05) saturate(0.9) hue-rotate(5deg)', glowColor: 'rgba(176,224,230,0.3)', bodyAnim: 'breathe', intensity: 0.25, breathRate: 6, overlays: [] },
  peaceful: { baseImage: zoePeaceful, label: 'Peaceful', color: '#98FB98', cssFilter: 'brightness(1.03) saturate(0.95)', glowColor: 'rgba(152,251,152,0.25)', bodyAnim: 'breathe', intensity: 0.2, breathRate: 6, overlays: ['sparkle'] },
  content:  { baseImage: zoeLovingImg, label: 'Content', color: '#F0E68C', cssFilter: 'brightness(1.04) saturate(1.0)', glowColor: 'rgba(240,230,140,0.25)', bodyAnim: 'breathe', intensity: 0.4, breathRate: 4.5, overlays: [] },

  // EXCITED (5)
  excited:      { baseImage: zoeLaughing, label: 'Excited', color: '#FF4500', cssFilter: 'brightness(1.1) saturate(1.25)', glowColor: 'rgba(255,69,0,0.4)', bodyAnim: 'bounce', intensity: 0.85, breathRate: 2, overlays: ['sparkle', 'stars'] },
  enthusiastic: { baseImage: zoeHappy, label: 'Enthusiastic', color: '#FF6347', cssFilter: 'brightness(1.08) saturate(1.2)', glowColor: 'rgba(255,99,71,0.35)', bodyAnim: 'bounce', intensity: 0.75, breathRate: 2.5, overlays: ['sparkle'] },
  passionate:   { baseImage: zoeLaughing, label: 'Passionate', color: '#FF1493', cssFilter: 'brightness(1.1) saturate(1.3) hue-rotate(-5deg)', glowColor: 'rgba(255,20,147,0.4)', bodyAnim: 'bounce', intensity: 0.9, breathRate: 2, overlays: ['fire', 'hearts'] },
  energetic:    { baseImage: zoeLaughing, label: 'Energetic', color: '#00FF7F', cssFilter: 'brightness(1.12) saturate(1.2)', glowColor: 'rgba(0,255,127,0.35)', bodyAnim: 'bounce', intensity: 0.8, breathRate: 1.5, overlays: ['sparkle'] },
  hopeful:      { baseImage: zoeHappy, label: 'Hopeful', color: '#FFD700', cssFilter: 'brightness(1.08) saturate(1.1) hue-rotate(3deg)', glowColor: 'rgba(255,215,0,0.3)', bodyAnim: 'sway', intensity: 0.6, breathRate: 3.5, overlays: ['sparkle'] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED OVERLAYS — real tears, blush, particles
// ═══════════════════════════════════════════════════════════════════════════════

const TearDrop = ({ delay, x }: { delay: number; x: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: 3, height: 7,
      left: `${x}%`, top: '42%',
      background: 'linear-gradient(180deg, rgba(147,197,253,0.9) 0%, rgba(59,130,246,0.6) 100%)',
      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
    }}
    initial={{ y: 0, opacity: 0 }}
    animate={{ y: [0, 25, 55, 85], opacity: [0, 0.9, 0.7, 0], scaleY: [1, 1.3, 1.6, 1] }}
    transition={{ duration: 2.8, delay, repeat: Infinity, ease: 'easeIn' }}
  />
);

const TearsOverlay = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
    <TearDrop delay={0} x={34} />
    <TearDrop delay={0.9} x={36} />
    <TearDrop delay={1.8} x={62} />
    <TearDrop delay={2.3} x={64} />
    <TearDrop delay={0.5} x={35} />
    <TearDrop delay={1.4} x={63} />
  </div>
));

const BlushOverlay = memo(() => (
  <div className="absolute inset-0 pointer-events-none z-10">
    <motion.div className="absolute rounded-full" style={{ width: '20%', height: '10%', left: '20%', top: '55%', background: 'radial-gradient(circle, rgba(251,113,133,0.5) 0%, transparent 70%)' }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.div className="absolute rounded-full" style={{ width: '20%', height: '10%', right: '20%', top: '55%', background: 'radial-gradient(circle, rgba(251,113,133,0.5) 0%, transparent 70%)' }} animate={{ opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
  </div>
));

const Particle = ({ emoji, delay, x }: { emoji: string; delay: number; x: number }) => (
  <motion.span className="absolute text-sm pointer-events-none select-none z-10" style={{ left: `${x}%`, bottom: '15%' }}
    initial={{ y: 0, opacity: 0, scale: 0.5 }}
    animate={{ y: [-15, -50, -90], opacity: [0, 1, 0], scale: [0.5, 1, 0.6], x: [0, (Math.random() - 0.5) * 30] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeOut' }}
  >{emoji}</motion.span>
);

const SparkleOverlay = memo(() => <div className="absolute inset-0 pointer-events-none overflow-hidden"><Particle emoji="✨" delay={0} x={25} /><Particle emoji="✨" delay={1} x={65} /><Particle emoji="⭐" delay={0.5} x={45} /></div>);
const HeartsOverlay = memo(() => <div className="absolute inset-0 pointer-events-none overflow-hidden"><Particle emoji="❤️" delay={0} x={30} /><Particle emoji="💕" delay={1.2} x={60} /><Particle emoji="💗" delay={0.6} x={45} /></div>);
const FireOverlay = memo(() => <div className="absolute inset-0 pointer-events-none overflow-hidden"><Particle emoji="🔥" delay={0} x={20} /><Particle emoji="🔥" delay={0.8} x={70} /><Particle emoji="💢" delay={1.5} x={50} /></div>);
const StarsOverlay = memo(() => <div className="absolute inset-0 pointer-events-none overflow-hidden"><Particle emoji="🌟" delay={0} x={20} /><Particle emoji="⭐" delay={0.7} x={70} /><Particle emoji="💫" delay={1.4} x={45} /></div>);
const QuestionOverlay = memo(() => <div className="absolute inset-0 pointer-events-none overflow-hidden"><Particle emoji="❓" delay={0} x={70} /><Particle emoji="🤔" delay={1.5} x={25} /></div>);
const SweatOverlay = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
    <motion.div className="absolute" style={{ width: 5, height: 7, right: '28%', top: '28%', background: 'linear-gradient(180deg, rgba(147,197,253,0.7) 0%, rgba(59,130,246,0.4) 100%)', borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%' }}
      animate={{ y: [0, 10, 0], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
  </div>
));

const OVERLAY_COMPONENTS: Record<OverlayEffect, React.FC> = {
  tears: TearsOverlay, blush: BlushOverlay, sparkle: SparkleOverlay,
  hearts: HeartsOverlay, fire: FireOverlay, sweat: SweatOverlay,
  stars: StarsOverlay, question_marks: QuestionOverlay,
};

// ═══════════════════════════════════════════════════════════════════════════════
// BODY ANIMATION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const getAnimProps = (anim: BodyAnim, intensity: number, rate: number) => {
  const i = intensity;
  switch (anim) {
    case 'breathe': return { animate: { y: [0, -1.5 * i, 0], scale: [1, 1 + 0.01 * i, 1] }, transition: { duration: rate, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'bounce': return { animate: { y: [0, -5 * i, 0], scale: [1, 1 + 0.02 * i, 1] }, transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'tremble': return { animate: { x: [-1 * i, 1 * i, -0.5 * i, 0.5 * i, 0] }, transition: { duration: 0.35, repeat: Infinity, ease: 'linear' as const } };
    case 'sway': return { animate: { rotate: [-1.5 * i, 1.5 * i, -1.5 * i], x: [-2 * i, 2 * i, -2 * i] }, transition: { duration: rate, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'droop': return { animate: { y: [0, 2 * i, 0], scale: [1, 0.99, 1] }, transition: { duration: rate, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'startle': return { animate: { scale: [1, 1.04, 0.98, 1], y: [0, -4, 1, 0] }, transition: { duration: 0.6, repeat: 1, ease: 'easeOut' as const } };
    case 'recoil': return { animate: { scale: [1, 0.96, 1.02, 1], y: [0, 3, -1, 0] }, transition: { duration: 0.5, repeat: 1, ease: 'easeOut' as const } };
    case 'tilt': return { animate: { rotate: [0, 3, -3, 0] }, transition: { duration: rate, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'still': default: return { animate: { scale: [1, 1.003, 1] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const } };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT → EMOTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_KEYWORDS: Record<string, ZoeEmotion[]> = {
  'happy': ['happy'], 'glad': ['happy'], 'great': ['cheerful'], 'awesome': ['elated'],
  'amazing': ['amazed'], 'wonderful': ['blissful'], 'fantastic': ['ecstatic'],
  'laugh': ['amused'], 'lol': ['amused'], 'haha': ['amused'], 'funny': ['amused'],
  'love': ['loving'], 'adore': ['devoted'], 'miss you': ['nostalgic'],
  'sad': ['sad'], 'unhappy': ['sad'], 'cry': ['sorrowful'], 'tears': ['grieving'],
  'depressed': ['gloomy'], 'heartbreak': ['heartbroken'], 'alone': ['lonely'],
  'disappoint': ['disappointed'], 'miss': ['wistful'], 'regret': ['melancholy'],
  'angry': ['angry'], 'mad': ['angry'], 'hate': ['furious'], 'annoyed': ['irritated'],
  'frustrated': ['frustrated'], 'unfair': ['resentful'],
  'scared': ['fearful'], 'afraid': ['fearful'], 'worry': ['worried'], 'anxious': ['anxious'],
  'nervous': ['nervous'], 'terrified': ['terrified'], 'panic': ['terrified'],
  'wow': ['surprised'], 'omg': ['shocked'], 'unbelievable': ['amazed'], 'no way': ['shocked'],
  'think': ['thoughtful'], 'wonder': ['curious'], 'why': ['curious'], 'how': ['curious'],
  'confused': ['confused'], 'understand': ['contemplative'], 'focus': ['focused'],
  'gross': ['disgusted'], 'ew': ['repulsed'], 'yuck': ['disgusted'], 'terrible': ['contemptuous'],
  'calm': ['calm'], 'peace': ['peaceful'], 'relax': ['serene'], 'okay': ['content'],
  'excited': ['excited'], 'can\'t wait': ['enthusiastic'], 'thrilled': ['ecstatic'],
  'hope': ['hopeful'], 'passion': ['passionate'], 'energy': ['energetic'],
  'care': ['compassionate'], 'sweet': ['tender'], 'dear': ['affectionate'],
  'thank': ['loving'], 'grateful': ['content'],
};

export function detectEmotionFromText(text: string): ZoeEmotion {
  const lower = text.toLowerCase();
  let best: ZoeEmotion = 'neutral';
  let maxScore = 0;
  for (const [kw, emotions] of Object.entries(EMOTION_KEYWORDS)) {
    if (lower.includes(kw) && kw.length > maxScore) {
      maxScore = kw.length;
      best = emotions[0];
    }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ZoeAvatarEmotionsProps {
  emotion?: ZoeEmotion;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showLabel?: boolean;
  showBreathing?: boolean;
  showGlow?: boolean;
  className?: string;
  onClick?: () => void;
  chatText?: string;
}

const SIZE_CLASSES = {
  sm: 'w-16 h-20 sm:w-20 sm:h-24',
  md: 'w-24 h-32 sm:w-32 sm:h-40 md:w-40 md:h-52',
  lg: 'w-36 h-48 sm:w-48 sm:h-60 md:w-56 md:h-72 lg:w-64 lg:h-80',
  xl: 'w-48 h-60 sm:w-64 sm:h-80 md:w-72 md:h-96 lg:w-80 lg:h-[28rem]',
  full: 'w-full h-full max-w-sm max-h-[80vh]',
};

const ZoeAvatarEmotions = memo(({
  emotion: propEmotion,
  size = 'md',
  showLabel = true,
  showBreathing = true,
  showGlow = true,
  className = '',
  onClick,
  chatText,
}: ZoeAvatarEmotionsProps) => {
  const [currentEmotion, setCurrentEmotion] = useState<ZoeEmotion>(propEmotion || 'neutral');

  // Auto-detect from chat
  useEffect(() => {
    if (chatText) {
      const detected = detectEmotionFromText(chatText);
      if (detected !== currentEmotion) setCurrentEmotion(detected);
    }
  }, [chatText]);

  // Update from prop
  useEffect(() => {
    if (propEmotion && propEmotion !== currentEmotion) setCurrentEmotion(propEmotion);
  }, [propEmotion]);

  const config = EMOTION_MAP[currentEmotion] || EMOTION_MAP.neutral;
  const animProps = useMemo(() => getAnimProps(config.bodyAnim, config.intensity, config.breathRate), [config.bodyAnim, config.intensity, config.breathRate]);

  // Preload all consistent face images
  useEffect(() => {
    [zoeNeutral, zoeHappy, zoeSad, zoeSurprised, zoeAngry, zoeFearful, zoeLaughing, zoeLovingImg, zoeThinking, zoeDisgusted, zoePeaceful].forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} onClick={onClick}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {/* Glow */}
      {showGlow && (
        <motion.div className="absolute inset-0 rounded-2xl blur-2xl -z-10"
          animate={{ backgroundColor: config.glowColor, scale: [1, 1.05 + config.intensity * 0.1, 1] }}
          transition={{ backgroundColor: { duration: 0.8 }, scale: { duration: config.breathRate, repeat: Infinity, ease: 'easeInOut' } }}
        />
      )}

      {/* Avatar */}
      <motion.div className={`relative overflow-hidden rounded-2xl ${SIZE_CLASSES[size]} shadow-2xl border border-white/10`}
        {...(showBreathing ? animProps : {})} style={{ perspective: 800 }}>
        {/* Crossfade image */}
        <AnimatePresence mode="wait">
          <motion.img key={currentEmotion} src={config.baseImage}
            alt={`Zoe — ${config.label}`}
            className="w-full h-full object-cover object-top"
            style={{ filter: config.cssFilter }}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}
            loading="eager" draggable={false}
          />
        </AnimatePresence>

        {/* Eye shimmer */}
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 28% 14% at 42% 34%, rgba(255,255,255,${config.intensity * 0.12}) 0%, transparent 70%), radial-gradient(ellipse 28% 14% at 58% 34%, rgba(255,255,255,${config.intensity * 0.12}) 0%, transparent 70%)` }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Color tint overlay */}
        <motion.div className="absolute inset-0 pointer-events-none mix-blend-overlay"
          animate={{ backgroundColor: config.glowColor }}
          transition={{ duration: 0.8 }}
          style={{ opacity: config.intensity * 0.12 }}
        />

        {/* Dynamic overlays (tears, hearts, fire, etc.) */}
        {config.overlays.map(effect => {
          const Comp = OVERLAY_COMPONENTS[effect];
          return Comp ? <Comp key={effect} /> : null;
        })}

        {/* Bottom gradient */}
        {showLabel && <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />}
      </motion.div>

      {/* Label */}
      {showLabel && (
        <motion.div className="mt-2 flex items-center gap-1.5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: config.breathRate, repeat: Infinity }} />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">{config.label}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: config.color, color: config.color }}>
            {Math.round(config.intensity * 100)}%
          </Badge>
        </motion.div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTER
// ═══════════════════════════════════════════════════════════════════════════════

export const ZoeEmotionTester = () => {
  const [selected, setSelected] = useState<ZoeEmotion>('neutral');
  const [testText, setTestText] = useState('');
  const allEmotions = Object.keys(EMOTION_MAP) as ZoeEmotion[];

  const families = useMemo(() => ({
    'Joy': allEmotions.slice(0, 10),
    'Sadness': allEmotions.slice(10, 20),
    'Anger': allEmotions.slice(20, 25),
    'Fear': allEmotions.slice(25, 30),
    'Surprise': allEmotions.slice(30, 35),
    'Love': allEmotions.slice(35, 40),
    'Thinking': allEmotions.slice(40, 45),
    'Disgust': allEmotions.slice(45, 48),
    'Calm': allEmotions.slice(48, 53),
    'Excited': allEmotions.slice(53),
  }), [allEmotions]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold text-foreground">Zoe Avatar — {allEmotions.length} Emotions (Same Woman)</h2>
      <div className="flex justify-center">
        <ZoeAvatarEmotions emotion={testText ? undefined : selected} chatText={testText || undefined} size="lg" />
      </div>
      <div className="space-y-2">
        <input type="text" value={testText} onChange={(e) => setTestText(e.target.value)}
          placeholder="Type 'I'm so happy!' or 'I feel anxious' to test..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
        {testText && <p className="text-xs text-muted-foreground">Detected: <strong className="text-foreground">{detectEmotionFromText(testText)}</strong></p>}
      </div>
      <div className="space-y-3">
        {Object.entries(families).map(([family, emotions]) => (
          <div key={family}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">{family} ({emotions.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {emotions.map(em => {
                const cfg = EMOTION_MAP[em];
                if (!cfg) return null;
                return (
                  <button key={em} onClick={() => { setSelected(em); setTestText(''); }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all border ${selected === em && !testText ? 'border-primary bg-primary/20 text-foreground scale-110' : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
                    style={selected === em && !testText ? { borderColor: cfg.color, color: cfg.color } : {}}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export type { ZoeAvatarEmotionsProps };
export default ZoeAvatarEmotions;
