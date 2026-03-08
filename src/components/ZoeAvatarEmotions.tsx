/**
 * ZOE INFINITY AVATAR - Photorealistic Emotion System
 * 10 base emotion images × CSS modifiers = 50 emotion states
 * Responsive across all device sizes with smooth crossfade transitions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION IMAGE IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import happyImg from '@/assets/zoe-avatar/happy.jpg';
import sadImg from '@/assets/zoe-avatar/sad.jpg';
import surprisedImg from '@/assets/zoe-avatar/surprised.jpg';
import angryImg from '@/assets/zoe-avatar/angry.jpg';
import fearfulImg from '@/assets/zoe-avatar/fearful.jpg';
import neutralImg from '@/assets/zoe-avatar/neutral.jpg';
import lovingImg from '@/assets/zoe-avatar/loving.jpg';
import excitedImg from '@/assets/zoe-avatar/excited.jpg';
import thoughtfulImg from '@/assets/zoe-avatar/thoughtful.jpg';
import disgustedImg from '@/assets/zoe-avatar/disgusted.jpg';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BaseEmotion = 
  | 'happy' | 'sad' | 'surprised' | 'angry' | 'fearful' 
  | 'neutral' | 'loving' | 'excited' | 'thoughtful' | 'disgusted';

export type ZoeEmotion =
  // JOY family (→ happy/excited base)
  | 'happy' | 'joyful' | 'elated' | 'cheerful' | 'blissful'
  | 'ecstatic' | 'amused' | 'delighted' | 'gleeful' | 'euphoric'
  // SADNESS family (→ sad base)
  | 'sad' | 'melancholy' | 'sorrowful' | 'gloomy' | 'heartbroken'
  | 'lonely' | 'nostalgic' | 'disappointed' | 'grieving' | 'wistful'
  // ANGER family (→ angry base)
  | 'angry' | 'frustrated' | 'irritated' | 'furious' | 'resentful'
  // FEAR family (→ fearful base)
  | 'fearful' | 'anxious' | 'nervous' | 'terrified' | 'worried'
  // SURPRISE family (→ surprised base)
  | 'surprised' | 'shocked' | 'amazed' | 'stunned' | 'astonished'
  // LOVE family (→ loving base)
  | 'loving' | 'affectionate' | 'compassionate' | 'tender' | 'devoted'
  // THINKING family (→ thoughtful base)
  | 'thoughtful' | 'curious' | 'contemplative' | 'focused' | 'confused'
  // DISGUST family (→ disgusted base)
  | 'disgusted' | 'repulsed' | 'contemptuous'
  // NEUTRAL family
  | 'neutral' | 'calm' | 'serene' | 'peaceful' | 'content'
  // EXCITED family (→ excited base)
  | 'excited' | 'enthusiastic' | 'passionate' | 'energetic' | 'hopeful';

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION → BASE IMAGE MAPPING (50 emotions → 10 base images)
// ═══════════════════════════════════════════════════════════════════════════════

interface EmotionConfig {
  baseImage: string;
  label: string;
  color: string;
  cssFilter: string;       // Hue/saturation/brightness tweaks per emotion
  glowColor: string;       // Aura glow around avatar
  bodyAnimation: string;   // Body movement class
  intensity: number;       // 0-1 emotion intensity
  breathRate: number;      // Breathing animation speed (seconds)
  pupilDilation: number;   // 0-1 eye effect intensity
}

const EMOTION_MAP: Record<ZoeEmotion, EmotionConfig> = {
  // ═══ JOY FAMILY ═══
  happy:      { baseImage: happyImg, label: 'Happy', color: '#FFD700', cssFilter: 'brightness(1.05) saturate(1.1)', glowColor: 'rgba(255,215,0,0.3)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.7, breathRate: 3, pupilDilation: 0.6 },
  joyful:     { baseImage: happyImg, label: 'Joyful', color: '#FFA500', cssFilter: 'brightness(1.1) saturate(1.2)', glowColor: 'rgba(255,165,0,0.35)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.8, breathRate: 2.5, pupilDilation: 0.7 },
  elated:     { baseImage: excitedImg, label: 'Elated', color: '#FF6347', cssFilter: 'brightness(1.15) saturate(1.3)', glowColor: 'rgba(255,99,71,0.4)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.9, breathRate: 2, pupilDilation: 0.8 },
  cheerful:   { baseImage: happyImg, label: 'Cheerful', color: '#98FB98', cssFilter: 'brightness(1.08) saturate(1.15)', glowColor: 'rgba(152,251,152,0.3)', bodyAnimation: 'animate-gentle-sway', intensity: 0.65, breathRate: 3, pupilDilation: 0.5 },
  blissful:   { baseImage: lovingImg, label: 'Blissful', color: '#DDA0DD', cssFilter: 'brightness(1.1) saturate(1.1) hue-rotate(10deg)', glowColor: 'rgba(221,160,221,0.35)', bodyAnimation: 'animate-gentle-sway', intensity: 0.85, breathRate: 4, pupilDilation: 0.7 },
  ecstatic:   { baseImage: excitedImg, label: 'Ecstatic', color: '#FF4500', cssFilter: 'brightness(1.2) saturate(1.4)', glowColor: 'rgba(255,69,0,0.45)', bodyAnimation: 'animate-gentle-bounce', intensity: 1.0, breathRate: 1.5, pupilDilation: 0.9 },
  amused:     { baseImage: happyImg, label: 'Amused', color: '#FF69B4', cssFilter: 'brightness(1.05) saturate(1.05)', glowColor: 'rgba(255,105,180,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.5, breathRate: 3, pupilDilation: 0.5 },
  delighted:  { baseImage: excitedImg, label: 'Delighted', color: '#FFB347', cssFilter: 'brightness(1.12) saturate(1.25)', glowColor: 'rgba(255,179,71,0.35)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.8, breathRate: 2.5, pupilDilation: 0.7 },
  gleeful:    { baseImage: excitedImg, label: 'Gleeful', color: '#00CED1', cssFilter: 'brightness(1.1) saturate(1.2) hue-rotate(-5deg)', glowColor: 'rgba(0,206,209,0.3)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.75, breathRate: 2, pupilDilation: 0.7 },
  euphoric:   { baseImage: excitedImg, label: 'Euphoric', color: '#FF1493', cssFilter: 'brightness(1.2) saturate(1.5)', glowColor: 'rgba(255,20,147,0.5)', bodyAnimation: 'animate-gentle-bounce', intensity: 1.0, breathRate: 1.5, pupilDilation: 1.0 },

  // ═══ SADNESS FAMILY ═══
  sad:           { baseImage: sadImg, label: 'Sad', color: '#4682B4', cssFilter: 'brightness(0.9) saturate(0.8)', glowColor: 'rgba(70,130,180,0.3)', bodyAnimation: 'animate-gentle-droop', intensity: 0.7, breathRate: 5, pupilDilation: 0.3 },
  melancholy:    { baseImage: sadImg, label: 'Melancholy', color: '#6A5ACD', cssFilter: 'brightness(0.85) saturate(0.7) hue-rotate(10deg)', glowColor: 'rgba(106,90,205,0.3)', bodyAnimation: 'animate-gentle-droop', intensity: 0.6, breathRate: 5.5, pupilDilation: 0.3 },
  sorrowful:     { baseImage: sadImg, label: 'Sorrowful', color: '#483D8B', cssFilter: 'brightness(0.8) saturate(0.6)', glowColor: 'rgba(72,61,139,0.35)', bodyAnimation: 'animate-gentle-droop', intensity: 0.85, breathRate: 6, pupilDilation: 0.2 },
  gloomy:        { baseImage: sadImg, label: 'Gloomy', color: '#708090', cssFilter: 'brightness(0.8) saturate(0.5) grayscale(0.2)', glowColor: 'rgba(112,128,144,0.3)', bodyAnimation: 'animate-gentle-droop', intensity: 0.7, breathRate: 5.5, pupilDilation: 0.2 },
  heartbroken:   { baseImage: sadImg, label: 'Heartbroken', color: '#8B0000', cssFilter: 'brightness(0.75) saturate(0.9) hue-rotate(-10deg)', glowColor: 'rgba(139,0,0,0.4)', bodyAnimation: 'animate-gentle-droop', intensity: 1.0, breathRate: 6, pupilDilation: 0.2 },
  lonely:        { baseImage: sadImg, label: 'Lonely', color: '#2F4F4F', cssFilter: 'brightness(0.85) saturate(0.6) grayscale(0.15)', glowColor: 'rgba(47,79,79,0.3)', bodyAnimation: 'animate-gentle-droop', intensity: 0.6, breathRate: 5, pupilDilation: 0.3 },
  nostalgic:     { baseImage: thoughtfulImg, label: 'Nostalgic', color: '#D2691E', cssFilter: 'brightness(0.95) saturate(0.8) sepia(0.2)', glowColor: 'rgba(210,105,30,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.5, breathRate: 4.5, pupilDilation: 0.4 },
  disappointed:  { baseImage: sadImg, label: 'Disappointed', color: '#696969', cssFilter: 'brightness(0.88) saturate(0.7)', glowColor: 'rgba(105,105,105,0.3)', bodyAnimation: 'animate-gentle-droop', intensity: 0.55, breathRate: 4.5, pupilDilation: 0.3 },
  grieving:      { baseImage: sadImg, label: 'Grieving', color: '#191970', cssFilter: 'brightness(0.7) saturate(0.5)', glowColor: 'rgba(25,25,112,0.4)', bodyAnimation: 'animate-gentle-droop', intensity: 1.0, breathRate: 7, pupilDilation: 0.1 },
  wistful:       { baseImage: thoughtfulImg, label: 'Wistful', color: '#9370DB', cssFilter: 'brightness(0.92) saturate(0.85) hue-rotate(5deg)', glowColor: 'rgba(147,112,219,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.45, breathRate: 4.5, pupilDilation: 0.4 },

  // ═══ ANGER FAMILY ═══
  angry:      { baseImage: angryImg, label: 'Angry', color: '#DC143C', cssFilter: 'brightness(0.95) saturate(1.3) hue-rotate(-5deg)', glowColor: 'rgba(220,20,60,0.4)', bodyAnimation: 'animate-tense', intensity: 0.8, breathRate: 2, pupilDilation: 0.8 },
  frustrated: { baseImage: angryImg, label: 'Frustrated', color: '#FF6347', cssFilter: 'brightness(0.92) saturate(1.2)', glowColor: 'rgba(255,99,71,0.35)', bodyAnimation: 'animate-tense', intensity: 0.65, breathRate: 2.5, pupilDilation: 0.7 },
  irritated:  { baseImage: angryImg, label: 'Irritated', color: '#FF8C00', cssFilter: 'brightness(0.95) saturate(1.1)', glowColor: 'rgba(255,140,0,0.3)', bodyAnimation: 'animate-tense', intensity: 0.5, breathRate: 3, pupilDilation: 0.6 },
  furious:    { baseImage: angryImg, label: 'Furious', color: '#B22222', cssFilter: 'brightness(0.9) saturate(1.5) hue-rotate(-10deg)', glowColor: 'rgba(178,34,34,0.5)', bodyAnimation: 'animate-tense', intensity: 1.0, breathRate: 1.5, pupilDilation: 0.9 },
  resentful:  { baseImage: angryImg, label: 'Resentful', color: '#8B4513', cssFilter: 'brightness(0.88) saturate(1.1) sepia(0.1)', glowColor: 'rgba(139,69,19,0.3)', bodyAnimation: 'animate-tense', intensity: 0.6, breathRate: 3, pupilDilation: 0.6 },

  // ═══ FEAR FAMILY ═══
  fearful:    { baseImage: fearfulImg, label: 'Fearful', color: '#9932CC', cssFilter: 'brightness(0.9) saturate(0.9)', glowColor: 'rgba(153,50,204,0.35)', bodyAnimation: 'animate-tremble', intensity: 0.75, breathRate: 1.5, pupilDilation: 0.9 },
  anxious:    { baseImage: fearfulImg, label: 'Anxious', color: '#BA55D3', cssFilter: 'brightness(0.92) saturate(0.85)', glowColor: 'rgba(186,85,211,0.3)', bodyAnimation: 'animate-tremble', intensity: 0.6, breathRate: 2, pupilDilation: 0.7 },
  nervous:    { baseImage: fearfulImg, label: 'Nervous', color: '#DDA0DD', cssFilter: 'brightness(0.95) saturate(0.9)', glowColor: 'rgba(221,160,221,0.25)', bodyAnimation: 'animate-tremble', intensity: 0.5, breathRate: 2.5, pupilDilation: 0.6 },
  terrified:  { baseImage: fearfulImg, label: 'Terrified', color: '#4B0082', cssFilter: 'brightness(0.8) saturate(1.1) hue-rotate(5deg)', glowColor: 'rgba(75,0,130,0.45)', bodyAnimation: 'animate-tremble', intensity: 1.0, breathRate: 1, pupilDilation: 1.0 },
  worried:    { baseImage: fearfulImg, label: 'Worried', color: '#7B68EE', cssFilter: 'brightness(0.93) saturate(0.85)', glowColor: 'rgba(123,104,238,0.25)', bodyAnimation: 'animate-tremble', intensity: 0.5, breathRate: 2.5, pupilDilation: 0.6 },

  // ═══ SURPRISE FAMILY ═══
  surprised:  { baseImage: surprisedImg, label: 'Surprised', color: '#00BFFF', cssFilter: 'brightness(1.1) saturate(1.15)', glowColor: 'rgba(0,191,255,0.35)', bodyAnimation: 'animate-startle', intensity: 0.7, breathRate: 2, pupilDilation: 0.8 },
  shocked:    { baseImage: surprisedImg, label: 'Shocked', color: '#1E90FF', cssFilter: 'brightness(1.15) saturate(1.2)', glowColor: 'rgba(30,144,255,0.4)', bodyAnimation: 'animate-startle', intensity: 0.9, breathRate: 1.5, pupilDilation: 0.9 },
  amazed:     { baseImage: surprisedImg, label: 'Amazed', color: '#00CED1', cssFilter: 'brightness(1.12) saturate(1.25) hue-rotate(5deg)', glowColor: 'rgba(0,206,209,0.35)', bodyAnimation: 'animate-startle', intensity: 0.8, breathRate: 2, pupilDilation: 0.85 },
  stunned:    { baseImage: surprisedImg, label: 'Stunned', color: '#4169E1', cssFilter: 'brightness(1.05) saturate(1.1)', glowColor: 'rgba(65,105,225,0.4)', bodyAnimation: 'animate-startle', intensity: 0.85, breathRate: 2, pupilDilation: 0.9 },
  astonished: { baseImage: surprisedImg, label: 'Astonished', color: '#6495ED', cssFilter: 'brightness(1.1) saturate(1.2)', glowColor: 'rgba(100,149,237,0.35)', bodyAnimation: 'animate-startle', intensity: 0.9, breathRate: 1.5, pupilDilation: 0.95 },

  // ═══ LOVE FAMILY ═══
  loving:       { baseImage: lovingImg, label: 'Loving', color: '#FF69B4', cssFilter: 'brightness(1.05) saturate(1.15) hue-rotate(5deg)', glowColor: 'rgba(255,105,180,0.35)', bodyAnimation: 'animate-gentle-sway', intensity: 0.8, breathRate: 4, pupilDilation: 0.7 },
  affectionate: { baseImage: lovingImg, label: 'Affectionate', color: '#FF1493', cssFilter: 'brightness(1.08) saturate(1.2)', glowColor: 'rgba(255,20,147,0.3)', bodyAnimation: 'animate-gentle-sway', intensity: 0.7, breathRate: 3.5, pupilDilation: 0.7 },
  compassionate:{ baseImage: lovingImg, label: 'Compassionate', color: '#DB7093', cssFilter: 'brightness(1.03) saturate(1.05)', glowColor: 'rgba(219,112,147,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.6, breathRate: 4, pupilDilation: 0.6 },
  tender:       { baseImage: lovingImg, label: 'Tender', color: '#FFB6C1', cssFilter: 'brightness(1.06) saturate(1.1) hue-rotate(3deg)', glowColor: 'rgba(255,182,193,0.3)', bodyAnimation: 'animate-gentle-sway', intensity: 0.65, breathRate: 4.5, pupilDilation: 0.6 },
  devoted:      { baseImage: lovingImg, label: 'Devoted', color: '#C71585', cssFilter: 'brightness(1.05) saturate(1.25)', glowColor: 'rgba(199,21,133,0.35)', bodyAnimation: 'animate-gentle-sway', intensity: 0.85, breathRate: 3.5, pupilDilation: 0.75 },

  // ═══ THINKING FAMILY ═══
  thoughtful:    { baseImage: thoughtfulImg, label: 'Thoughtful', color: '#20B2AA', cssFilter: 'brightness(0.98) saturate(0.95)', glowColor: 'rgba(32,178,170,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.5, breathRate: 4, pupilDilation: 0.5 },
  curious:       { baseImage: thoughtfulImg, label: 'Curious', color: '#48D1CC', cssFilter: 'brightness(1.02) saturate(1.05)', glowColor: 'rgba(72,209,204,0.3)', bodyAnimation: 'animate-gentle-tilt', intensity: 0.6, breathRate: 3, pupilDilation: 0.65 },
  contemplative: { baseImage: thoughtfulImg, label: 'Contemplative', color: '#5F9EA0', cssFilter: 'brightness(0.95) saturate(0.9)', glowColor: 'rgba(95,158,160,0.25)', bodyAnimation: 'animate-gentle-sway', intensity: 0.45, breathRate: 5, pupilDilation: 0.5 },
  focused:       { baseImage: thoughtfulImg, label: 'Focused', color: '#2E8B57', cssFilter: 'brightness(1.0) saturate(1.0)', glowColor: 'rgba(46,139,87,0.3)', bodyAnimation: 'animate-still', intensity: 0.6, breathRate: 3.5, pupilDilation: 0.7 },
  confused:      { baseImage: thoughtfulImg, label: 'Confused', color: '#DAA520', cssFilter: 'brightness(0.95) saturate(0.9) hue-rotate(-5deg)', glowColor: 'rgba(218,165,32,0.25)', bodyAnimation: 'animate-gentle-tilt', intensity: 0.55, breathRate: 3, pupilDilation: 0.6 },

  // ═══ DISGUST FAMILY ═══
  disgusted:    { baseImage: disgustedImg, label: 'Disgusted', color: '#556B2F', cssFilter: 'brightness(0.9) saturate(0.8) hue-rotate(15deg)', glowColor: 'rgba(85,107,47,0.3)', bodyAnimation: 'animate-recoil', intensity: 0.7, breathRate: 3, pupilDilation: 0.4 },
  repulsed:     { baseImage: disgustedImg, label: 'Repulsed', color: '#6B8E23', cssFilter: 'brightness(0.85) saturate(0.7) hue-rotate(20deg)', glowColor: 'rgba(107,142,35,0.35)', bodyAnimation: 'animate-recoil', intensity: 0.85, breathRate: 2.5, pupilDilation: 0.3 },
  contemptuous: { baseImage: disgustedImg, label: 'Contemptuous', color: '#808000', cssFilter: 'brightness(0.92) saturate(0.85)', glowColor: 'rgba(128,128,0,0.3)', bodyAnimation: 'animate-recoil', intensity: 0.6, breathRate: 3.5, pupilDilation: 0.5 },

  // ═══ NEUTRAL FAMILY ═══
  neutral:  { baseImage: neutralImg, label: 'Neutral', color: '#C0C0C0', cssFilter: 'brightness(1.0) saturate(1.0)', glowColor: 'rgba(192,192,192,0.2)', bodyAnimation: 'animate-gentle-breathe', intensity: 0.3, breathRate: 4, pupilDilation: 0.5 },
  calm:     { baseImage: neutralImg, label: 'Calm', color: '#87CEEB', cssFilter: 'brightness(1.02) saturate(0.95)', glowColor: 'rgba(135,206,235,0.25)', bodyAnimation: 'animate-gentle-breathe', intensity: 0.3, breathRate: 5, pupilDilation: 0.4 },
  serene:   { baseImage: neutralImg, label: 'Serene', color: '#B0E0E6', cssFilter: 'brightness(1.05) saturate(0.9) hue-rotate(5deg)', glowColor: 'rgba(176,224,230,0.3)', bodyAnimation: 'animate-gentle-breathe', intensity: 0.25, breathRate: 6, pupilDilation: 0.4 },
  peaceful: { baseImage: neutralImg, label: 'Peaceful', color: '#98FB98', cssFilter: 'brightness(1.03) saturate(0.95)', glowColor: 'rgba(152,251,152,0.25)', bodyAnimation: 'animate-gentle-breathe', intensity: 0.2, breathRate: 6, pupilDilation: 0.4 },
  content:  { baseImage: lovingImg, label: 'Content', color: '#F0E68C', cssFilter: 'brightness(1.04) saturate(1.0)', glowColor: 'rgba(240,230,140,0.25)', bodyAnimation: 'animate-gentle-breathe', intensity: 0.4, breathRate: 4.5, pupilDilation: 0.5 },

  // ═══ EXCITED FAMILY ═══
  excited:      { baseImage: excitedImg, label: 'Excited', color: '#FF4500', cssFilter: 'brightness(1.1) saturate(1.25)', glowColor: 'rgba(255,69,0,0.4)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.85, breathRate: 2, pupilDilation: 0.8 },
  enthusiastic: { baseImage: excitedImg, label: 'Enthusiastic', color: '#FF6347', cssFilter: 'brightness(1.08) saturate(1.2)', glowColor: 'rgba(255,99,71,0.35)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.75, breathRate: 2.5, pupilDilation: 0.75 },
  passionate:   { baseImage: excitedImg, label: 'Passionate', color: '#FF1493', cssFilter: 'brightness(1.1) saturate(1.3) hue-rotate(-5deg)', glowColor: 'rgba(255,20,147,0.4)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.9, breathRate: 2, pupilDilation: 0.85 },
  energetic:    { baseImage: excitedImg, label: 'Energetic', color: '#00FF7F', cssFilter: 'brightness(1.12) saturate(1.2)', glowColor: 'rgba(0,255,127,0.35)', bodyAnimation: 'animate-gentle-bounce', intensity: 0.8, breathRate: 1.5, pupilDilation: 0.8 },
  hopeful:      { baseImage: happyImg, label: 'Hopeful', color: '#FFD700', cssFilter: 'brightness(1.08) saturate(1.1) hue-rotate(3deg)', glowColor: 'rgba(255,215,0,0.3)', bodyAnimation: 'animate-gentle-sway', intensity: 0.6, breathRate: 3.5, pupilDilation: 0.6 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT → EMOTION DETECTION (analyzes chat content)
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_KEYWORDS: Record<string, ZoeEmotion[]> = {
  // Joy
  'happy': ['happy'], 'glad': ['happy'], 'great': ['cheerful'], 'awesome': ['elated'],
  'amazing': ['amazed'], 'wonderful': ['blissful'], 'fantastic': ['ecstatic'],
  'laugh': ['amused'], 'lol': ['amused'], 'haha': ['amused'], 'funny': ['amused'],
  'love': ['loving'], 'adore': ['devoted'], 'miss you': ['nostalgic'],
  // Sadness
  'sad': ['sad'], 'unhappy': ['sad'], 'cry': ['sorrowful'], 'tears': ['grieving'],
  'depressed': ['gloomy'], 'heartbreak': ['heartbroken'], 'alone': ['lonely'],
  'disappoint': ['disappointed'], 'miss': ['wistful'], 'regret': ['melancholy'],
  // Anger
  'angry': ['angry'], 'mad': ['angry'], 'hate': ['furious'], 'annoyed': ['irritated'],
  'frustrated': ['frustrated'], 'unfair': ['resentful'],
  // Fear
  'scared': ['fearful'], 'afraid': ['fearful'], 'worry': ['worried'], 'anxious': ['anxious'],
  'nervous': ['nervous'], 'terrified': ['terrified'], 'panic': ['terrified'],
  // Surprise
  'wow': ['surprised'], 'omg': ['shocked'], 'what': ['stunned'], 'incredible': ['astonished'],
  'unbelievable': ['amazed'], 'no way': ['shocked'],
  // Thinking
  'think': ['thoughtful'], 'wonder': ['curious'], 'why': ['curious'], 'how': ['curious'],
  'confused': ['confused'], 'understand': ['contemplative'], 'focus': ['focused'],
  // Disgust
  'gross': ['disgusted'], 'ew': ['repulsed'], 'yuck': ['disgusted'], 'terrible': ['contemptuous'],
  // Calm
  'calm': ['calm'], 'peace': ['peaceful'], 'relax': ['serene'], 'okay': ['content'],
  // Excited
  'excited': ['excited'], 'can\'t wait': ['enthusiastic'], 'thrilled': ['ecstatic'],
  'hope': ['hopeful'], 'passion': ['passionate'], 'energy': ['energetic'],
  // Love
  'care': ['compassionate'], 'sweet': ['tender'], 'dear': ['affectionate'],
  'thank': ['loving'], 'grateful': ['content'],
};

export function detectEmotionFromText(text: string): ZoeEmotion {
  const lower = text.toLowerCase();
  let bestMatch: ZoeEmotion = 'neutral';
  let maxScore = 0;

  for (const [keyword, emotions] of Object.entries(EMOTION_KEYWORDS)) {
    if (lower.includes(keyword)) {
      const score = keyword.length; // longer keywords = more specific
      if (score > maxScore) {
        maxScore = score;
        bestMatch = emotions[0];
      }
    }
  }

  return bestMatch;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface ZoeAvatarEmotionsProps {
  emotion?: ZoeEmotion;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showLabel?: boolean;
  showBreathing?: boolean;
  showGlow?: boolean;
  className?: string;
  onClick?: () => void;
  chatText?: string;  // Auto-detect emotion from text
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ZoeAvatarEmotions = ({
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-detect from chat text
  useEffect(() => {
    if (chatText) {
      const detected = detectEmotionFromText(chatText);
      if (detected !== currentEmotion) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentEmotion(detected);
          setIsTransitioning(false);
        }, 300);
      }
    }
  }, [chatText]);

  // Update from prop
  useEffect(() => {
    if (propEmotion && propEmotion !== currentEmotion) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentEmotion(propEmotion);
        setIsTransitioning(false);
      }, 300);
    }
  }, [propEmotion]);

  const config = useMemo(() => EMOTION_MAP[currentEmotion] || EMOTION_MAP.neutral, [currentEmotion]);

  const sizeClasses = useMemo(() => ({
    sm: 'w-16 h-20 sm:w-20 sm:h-24',
    md: 'w-24 h-32 sm:w-32 sm:h-40 md:w-40 md:h-52',
    lg: 'w-36 h-48 sm:w-48 sm:h-60 md:w-56 md:h-72 lg:w-64 lg:h-80',
    xl: 'w-48 h-60 sm:w-64 sm:h-80 md:w-72 md:h-96 lg:w-80 lg:h-[28rem]',
    full: 'w-full h-full max-w-sm max-h-[80vh]',
  }), []);

  // Preload all images
  useEffect(() => {
    const images = [happyImg, sadImg, surprisedImg, angryImg, fearfulImg, neutralImg, lovingImg, excitedImg, thoughtfulImg, disgustedImg];
    images.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Glow Aura */}
      {showGlow && (
        <motion.div
          className="absolute inset-0 rounded-2xl blur-2xl -z-10"
          animate={{
            backgroundColor: config.glowColor,
            scale: [1, 1.05 + config.intensity * 0.1, 1],
          }}
          transition={{
            backgroundColor: { duration: 0.8 },
            scale: { duration: config.breathRate, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}

      {/* Avatar Container */}
      <motion.div
        className={`relative overflow-hidden rounded-2xl ${sizeClasses[size]} shadow-2xl`}
        animate={{
          y: showBreathing ? [0, -2 * config.intensity, 0] : 0,
          rotate: config.bodyAnimation.includes('tilt') ? [0, 2, -2, 0] :
                  config.bodyAnimation.includes('tremble') ? [0, -1, 1, -1, 0] :
                  config.bodyAnimation.includes('recoil') ? [0, -3, 0] : 0,
          scale: config.bodyAnimation.includes('bounce') ? [1, 1.02, 1] :
                 config.bodyAnimation.includes('startle') ? [1, 1.05, 1] :
                 config.bodyAnimation.includes('droop') ? [1, 0.98, 1] : 1,
        }}
        transition={{
          y: { duration: config.breathRate, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: config.breathRate * 0.8, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: config.breathRate, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        {/* Image with crossfade */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentEmotion}
            src={config.baseImage}
            alt={`Zoe feeling ${config.label}`}
            className="w-full h-full object-cover object-top"
            style={{ filter: config.cssFilter }}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            loading="eager"
            draggable={false}
          />
        </AnimatePresence>

        {/* Pupil dilation overlay (eye highlight effect) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 30% 15% at 42% 35%, rgba(255,255,255,${config.pupilDilation * 0.15}) 0%, transparent 70%),
                         radial-gradient(ellipse 30% 15% at 58% 35%, rgba(255,255,255,${config.pupilDilation * 0.15}) 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Emotion color tint overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          animate={{ backgroundColor: config.glowColor }}
          transition={{ duration: 0.8 }}
          style={{ opacity: config.intensity * 0.15 }}
        />

        {/* Bottom gradient for label */}
        {showLabel && (
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        )}
      </motion.div>

      {/* Emotion Label */}
      {showLabel && (
        <motion.div
          className="mt-2 flex items-center gap-1.5"
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: config.breathRate, repeat: Infinity }}
          />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {config.label}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0"
            style={{ borderColor: config.color, color: config.color }}
          >
            {Math.round(config.intensity * 100)}%
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION TESTER COMPONENT (for debugging)
// ═══════════════════════════════════════════════════════════════════════════════

export const ZoeEmotionTester = () => {
  const [selectedEmotion, setSelectedEmotion] = useState<ZoeEmotion>('neutral');
  const [testText, setTestText] = useState('');
  const allEmotions = Object.keys(EMOTION_MAP) as ZoeEmotion[];

  const emotionFamilies = useMemo(() => {
    const families: Record<string, ZoeEmotion[]> = {
      'Joy': ['happy', 'joyful', 'elated', 'cheerful', 'blissful', 'ecstatic', 'amused', 'delighted', 'gleeful', 'euphoric'],
      'Sadness': ['sad', 'melancholy', 'sorrowful', 'gloomy', 'heartbroken', 'lonely', 'nostalgic', 'disappointed', 'grieving', 'wistful'],
      'Anger': ['angry', 'frustrated', 'irritated', 'furious', 'resentful'],
      'Fear': ['fearful', 'anxious', 'nervous', 'terrified', 'worried'],
      'Surprise': ['surprised', 'shocked', 'amazed', 'stunned', 'astonished'],
      'Love': ['loving', 'affectionate', 'compassionate', 'tender', 'devoted'],
      'Thinking': ['thoughtful', 'curious', 'contemplative', 'focused', 'confused'],
      'Disgust': ['disgusted', 'repulsed', 'contemptuous'],
      'Calm': ['neutral', 'calm', 'serene', 'peaceful', 'content'],
      'Excited': ['excited', 'enthusiastic', 'passionate', 'energetic', 'hopeful'],
    };
    return families;
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold text-foreground">Zoe Emotion Tester — {allEmotions.length} Emotions</h2>

      {/* Avatar Display */}
      <div className="flex justify-center">
        <ZoeAvatarEmotions
          emotion={selectedEmotion}
          chatText={testText}
          size="lg"
          showLabel
          showBreathing
          showGlow
        />
      </div>

      {/* Text Detection Test */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Test text-based emotion detection:</label>
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Type something like 'I'm so happy today!' or 'I feel anxious...'"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
        />
        {testText && (
          <p className="text-xs text-muted-foreground">
            Detected: <span className="font-bold text-foreground">{detectEmotionFromText(testText)}</span>
          </p>
        )}
      </div>

      {/* Emotion Grid by Family */}
      <div className="space-y-4">
        {Object.entries(emotionFamilies).map(([family, emotions]) => (
          <div key={family}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{family} ({emotions.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {emotions.map(em => {
                const cfg = EMOTION_MAP[em];
                return (
                  <button
                    key={em}
                    onClick={() => { setSelectedEmotion(em); setTestText(''); }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                      selectedEmotion === em 
                        ? 'border-primary bg-primary/20 text-foreground scale-110' 
                        : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                    style={selectedEmotion === em ? { borderColor: cfg.color, color: cfg.color } : {}}
                  >
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

export default ZoeAvatarEmotions;
