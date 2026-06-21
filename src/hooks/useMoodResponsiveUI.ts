/**
 * MOOD-RESPONSIVE UI SYSTEM
 * Dynamically shifts chat bubble colors, background tints, and UI accents
 * based on the current emotion state of the conversation.
 */

import { useMemo } from 'react';
import { type AvatarEmotionState, getCoreEmotion } from '@/utils/avatarEmotionClassifier';

export interface MoodUITheme {
  // Chat bubble styles
  userBubbleBg: string;
  userBubbleBorder: string;
  zoeBubbleBg: string;
  zoeBubbleBorder: string;
  zoeBubbleGlow: string;
  
  // Background ambient tint
  ambientGradient: string;
  ambientOpacity: number;
  
  // Input bar accent
  inputAccent: string;
  inputGlow: string;
  
  // Scrollbar & accent
  accentColor: string;
  
  // Transition speed
  transitionDuration: string;
}

const MOOD_THEMES: Record<string, MoodUITheme> = {
  idle: {
    userBubbleBg: 'rgba(255,255,255,0.06)',
    userBubbleBorder: 'rgba(255,255,255,0.1)',
    zoeBubbleBg: 'rgba(0,229,255,0.06)',
    zoeBubbleBorder: 'rgba(0,229,255,0.12)',
    zoeBubbleGlow: '0 0 20px rgba(0,229,255,0.08)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(0,229,255,0.04) 0%, transparent 60%)',
    ambientOpacity: 0.5,
    inputAccent: 'rgba(0,229,255,0.3)',
    inputGlow: '0 0 12px rgba(0,229,255,0.1)',
    accentColor: '#00e5ff',
    transitionDuration: '0.8s',
  },
  happy: {
    userBubbleBg: 'rgba(255,220,50,0.08)',
    userBubbleBorder: 'rgba(255,220,50,0.15)',
    zoeBubbleBg: 'rgba(255,220,50,0.07)',
    zoeBubbleBorder: 'rgba(255,220,50,0.14)',
    zoeBubbleGlow: '0 0 24px rgba(255,220,50,0.1)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(255,220,50,0.06) 0%, transparent 60%)',
    ambientOpacity: 0.6,
    inputAccent: 'rgba(255,220,50,0.3)',
    inputGlow: '0 0 14px rgba(255,220,50,0.12)',
    accentColor: '#ffd700',
    transitionDuration: '0.6s',
  },
  sad: {
    userBubbleBg: 'rgba(80,100,200,0.08)',
    userBubbleBorder: 'rgba(80,100,200,0.14)',
    zoeBubbleBg: 'rgba(80,100,200,0.07)',
    zoeBubbleBorder: 'rgba(80,100,200,0.12)',
    zoeBubbleGlow: '0 0 20px rgba(80,100,200,0.08)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(80,100,200,0.06) 0%, transparent 60%)',
    ambientOpacity: 0.7,
    inputAccent: 'rgba(80,100,200,0.25)',
    inputGlow: '0 0 10px rgba(80,100,200,0.08)',
    accentColor: '#6474c8',
    transitionDuration: '1.2s',
  },
  crying: {
    userBubbleBg: 'rgba(150,50,100,0.08)',
    userBubbleBorder: 'rgba(150,50,100,0.14)',
    zoeBubbleBg: 'rgba(150,50,100,0.07)',
    zoeBubbleBorder: 'rgba(150,50,100,0.12)',
    zoeBubbleGlow: '0 0 18px rgba(150,50,100,0.08)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(150,50,100,0.06) 0%, transparent 60%)',
    ambientOpacity: 0.7,
    inputAccent: 'rgba(150,50,100,0.25)',
    inputGlow: '0 0 10px rgba(150,50,100,0.08)',
    accentColor: '#963264',
    transitionDuration: '1.4s',
  },
  angry: {
    userBubbleBg: 'rgba(255,50,30,0.08)',
    userBubbleBorder: 'rgba(255,50,30,0.14)',
    zoeBubbleBg: 'rgba(255,50,30,0.07)',
    zoeBubbleBorder: 'rgba(255,50,30,0.12)',
    zoeBubbleGlow: '0 0 22px rgba(255,50,30,0.1)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(255,50,30,0.06) 0%, transparent 60%)',
    ambientOpacity: 0.6,
    inputAccent: 'rgba(255,50,30,0.3)',
    inputGlow: '0 0 14px rgba(255,50,30,0.12)',
    accentColor: '#ff321e',
    transitionDuration: '0.5s',
  },
  surprised: {
    userBubbleBg: 'rgba(255,200,0,0.08)',
    userBubbleBorder: 'rgba(255,200,0,0.14)',
    zoeBubbleBg: 'rgba(255,200,0,0.07)',
    zoeBubbleBorder: 'rgba(255,200,0,0.13)',
    zoeBubbleGlow: '0 0 22px rgba(255,200,0,0.1)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(255,200,0,0.06) 0%, transparent 60%)',
    ambientOpacity: 0.6,
    inputAccent: 'rgba(255,200,0,0.3)',
    inputGlow: '0 0 14px rgba(255,200,0,0.12)',
    accentColor: '#ffc800',
    transitionDuration: '0.4s',
  },
  loving: {
    userBubbleBg: 'rgba(255,80,180,0.08)',
    userBubbleBorder: 'rgba(255,80,180,0.15)',
    zoeBubbleBg: 'rgba(255,80,180,0.07)',
    zoeBubbleBorder: 'rgba(255,80,180,0.13)',
    zoeBubbleGlow: '0 0 26px rgba(255,80,180,0.12)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(255,80,180,0.07) 0%, transparent 60%)',
    ambientOpacity: 0.7,
    inputAccent: 'rgba(255,80,180,0.3)',
    inputGlow: '0 0 16px rgba(255,80,180,0.14)',
    accentColor: '#ff50b4',
    transitionDuration: '0.7s',
  },
  thinking: {
    userBubbleBg: 'rgba(100,160,255,0.06)',
    userBubbleBorder: 'rgba(100,160,255,0.12)',
    zoeBubbleBg: 'rgba(100,160,255,0.06)',
    zoeBubbleBorder: 'rgba(100,160,255,0.11)',
    zoeBubbleGlow: '0 0 18px rgba(100,160,255,0.08)',
    ambientGradient: 'radial-gradient(ellipse at 50% 80%, rgba(100,160,255,0.05) 0%, transparent 60%)',
    ambientOpacity: 0.5,
    inputAccent: 'rgba(100,160,255,0.25)',
    inputGlow: '0 0 10px rgba(100,160,255,0.08)',
    accentColor: '#64a0ff',
    transitionDuration: '1s',
  },
};

export function useMoodResponsiveUI(emotion: AvatarEmotionState): MoodUITheme {
  return useMemo(() => {
    const core = getCoreEmotion(emotion);
    return MOOD_THEMES[core] || MOOD_THEMES.idle;
  }, [emotion]);
}

export default useMoodResponsiveUI;
