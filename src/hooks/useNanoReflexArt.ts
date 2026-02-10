/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO REFLEX ART - Offline Art Generation Trigger
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROMPT 3 IMPLEMENTATION: "The Offline Hands (Local Art)"
 * 
 * LOGIC:
 * - Instruction: GeminiNano outputs [ACTION:DRAW_GIFT] when user needs comfort
 * - Listener: This hook catches 'nano-reflex-action' events
 * - Action: Triggers ArtGenerator.ts (Canvas API) locally, bypassing cloud
 * - Goal: She can give gifts even in Flight Mode
 * 
 * WIRING:
 * NanoReflexProtocol → dispatchEvent('nano-reflex-action') → This hook → ArtGenerator
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { generateArt, type GeneratedArt, type ArtStyle } from '@/utils/ArtGenerator';
import type { BioMood } from '@/core/soul/ZoeBioKernel';

interface NanoReflexArtOptions {
  onArtGenerated?: (art: GeneratedArt) => void;
  onMusicRequested?: (params?: string) => void;
  onMeditationRequested?: (params?: string) => void;
  onBreathingRequested?: (params?: string) => void;
  onHugSent?: () => void;
  onQuoteShared?: (quote?: string) => void;
  onMemoryRequested?: (params?: string) => void;
  currentMood?: BioMood;
  autoDisplay?: boolean; // Auto-display art in a modal/overlay
}

interface NanoReflexArtReturn {
  // Last generated art
  lastArt: GeneratedArt | null;
  
  // Generation state
  isGenerating: boolean;
  
  // Manual trigger (for testing or direct calls)
  generateGift: (prompt?: string) => Promise<GeneratedArt>;
  
  // Clear the art
  clearArt: () => void;
  
  // Action counts (for analytics)
  actionCounts: Record<string, number>;
}

// Parse prompt into mood hints
function parseMoodFromPrompt(prompt?: string): BioMood {
  if (!prompt) return 'NEUTRAL_COMPANION';
  
  const lower = prompt.toLowerCase();
  
  if (lower.includes('sad') || lower.includes('cry') || lower.includes('tear')) return 'SAD';
  if (lower.includes('happy') || lower.includes('joy') || lower.includes('excite')) return 'HAPPY';
  if (lower.includes('calm') || lower.includes('peace') || lower.includes('relax')) return 'CALM';
  if (lower.includes('love') || lower.includes('heart') || lower.includes('care')) return 'LOVING';
  if (lower.includes('hope') || lower.includes('bright') || lower.includes('light')) return 'HOPEFUL';
  if (lower.includes('anxious') || lower.includes('worry') || lower.includes('stress')) return 'ANXIOUS';
  if (lower.includes('sunset') || lower.includes('warm') || lower.includes('golden')) return 'GRATEFUL';
  if (lower.includes('night') || lower.includes('star') || lower.includes('dream')) return 'CONTEMPLATIVE';
  
  return 'NEUTRAL_COMPANION';
}

export function useNanoReflexArt(options: NanoReflexArtOptions = {}): NanoReflexArtReturn {
  const {
    onArtGenerated,
    onMusicRequested,
    onMeditationRequested,
    onBreathingRequested,
    onHugSent,
    onQuoteShared,
    onMemoryRequested,
    currentMood = 'NEUTRAL_COMPANION',
    autoDisplay = true,
  } = options;

  const [lastArt, setLastArt] = useState<GeneratedArt | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});

  /**
   * Generate art gift (the core function)
   */
  const generateGift = useCallback(async (prompt?: string): Promise<GeneratedArt> => {
    setIsGenerating(true);
    console.log('[NanoReflexArt] 🎨 Generating offline art gift:', prompt || 'emotional support');

    try {
      // Determine mood from prompt or use current mood
      const mood = prompt ? parseMoodFromPrompt(prompt) : currentMood;
      
      // Generate art using Canvas API (100% offline)
      const art = await generateArt({
        mood,
        intensity: 0.7,
      });

      setLastArt(art);
      onArtGenerated?.(art);
      
      console.log('[NanoReflexArt] ✅ Art generated:', art.style, art.caption);
      
      // Dispatch event for UI to pick up
      if (autoDisplay) {
        window.dispatchEvent(new CustomEvent('zoe-art-gift', {
          detail: { art, prompt }
        }));
      }

      return art;
    } finally {
      setIsGenerating(false);
    }
  }, [currentMood, onArtGenerated, autoDisplay]);

  /**
   * Handle all nano-reflex-action events
   */
  useEffect(() => {
    const handleReflexAction = async (event: CustomEvent) => {
      const { action, params } = event.detail;
      
      console.log('[NanoReflexArt] 🎯 Received action:', action, params);
      
      // Track action counts
      setActionCounts(prev => ({
        ...prev,
        [action]: (prev[action] || 0) + 1,
      }));

      switch (action) {
        case 'DRAW_GIFT':
          await generateGift(params);
          break;
          
        case 'PLAY_MUSIC':
          onMusicRequested?.(params);
          // Emit event for music player to pick up
          window.dispatchEvent(new CustomEvent('zoe-music-request', {
            detail: { params }
          }));
          break;
          
        case 'MEDITATION':
          onMeditationRequested?.(params);
          window.dispatchEvent(new CustomEvent('zoe-meditation-start', {
            detail: { params }
          }));
          break;
          
        case 'BREATHING':
          onBreathingRequested?.(params);
          window.dispatchEvent(new CustomEvent('zoe-breathing-start', {
            detail: { params }
          }));
          break;
          
        case 'SEND_HUG':
          onHugSent?.();
          // Trigger haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
          }
          window.dispatchEvent(new CustomEvent('zoe-hug-sent'));
          break;
          
        case 'SHARE_QUOTE':
          onQuoteShared?.(params);
          window.dispatchEvent(new CustomEvent('zoe-quote-shared', {
            detail: { quote: params }
          }));
          break;
          
        case 'SHOW_MEMORY':
          onMemoryRequested?.(params);
          window.dispatchEvent(new CustomEvent('zoe-memory-request', {
            detail: { params }
          }));
          break;
          
        default:
          console.warn('[NanoReflexArt] Unknown action:', action);
      }
    };

    // Listen for nano-reflex-action events from NanoReflexProtocol
    window.addEventListener('nano-reflex-action', handleReflexAction as EventListener);

    return () => {
      window.removeEventListener('nano-reflex-action', handleReflexAction as EventListener);
    };
  }, [generateGift, onMusicRequested, onMeditationRequested, onBreathingRequested, onHugSent, onQuoteShared, onMemoryRequested]);

  /**
   * Clear the last art
   */
  const clearArt = useCallback(() => {
    setLastArt(null);
  }, []);

  return {
    lastArt,
    isGenerating,
    generateGift,
    clearArt,
    actionCounts,
  };
}

export default useNanoReflexArt;
