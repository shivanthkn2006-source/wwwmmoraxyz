// ═══════════════════════════════════════════════════════════════════════════════
// ZOE BEHAVIORAL TELEMETRY - Sensing user's emotional state through typing patterns
// Tracks: hesitation, deletions, typing speed to infer emotional state
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';

export interface BehavioralTelemetry {
  // Core metrics
  hesitationLevel: 'none' | 'low' | 'medium' | 'high';
  deletionCount: number;
  wordsPerMinute: number;
  
  // Inferred emotional state
  inferredState: 'calm' | 'contemplative' | 'hesitant' | 'anxious' | 'urgent' | 'excited';
  confidenceScore: number; // 0-1 how confident we are in the inference
  
  // Raw data for AI analysis
  pausesBetweenWords: number[];
  totalTypingDuration: number;
  characterCount: number;
  wordCount: number;
}

interface TelemetryHookReturn {
  telemetry: BehavioralTelemetry;
  startTracking: () => void;
  stopTracking: () => BehavioralTelemetry;
  recordKeystroke: (key: string, currentText: string) => void;
  resetTelemetry: () => void;
}

const HESITATION_THRESHOLD_MS = 3000; // 3 seconds between keystrokes = hesitation
const LONG_PAUSE_THRESHOLD_MS = 5000; // 5 seconds = contemplative

const createEmptyTelemetry = (): BehavioralTelemetry => ({
  hesitationLevel: 'none',
  deletionCount: 0,
  wordsPerMinute: 0,
  inferredState: 'calm',
  confidenceScore: 0.5,
  pausesBetweenWords: [],
  totalTypingDuration: 0,
  characterCount: 0,
  wordCount: 0,
});

export const useBehavioralTelemetry = (): TelemetryHookReturn => {
  const [telemetry, setTelemetry] = useState<BehavioralTelemetry>(createEmptyTelemetry());
  
  // Tracking refs (don't trigger re-renders)
  const isTrackingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const lastKeystrokeTimeRef = useRef<number | null>(null);
  const deletionCountRef = useRef(0);
  const pausesRef = useRef<number[]>([]);
  const characterCountRef = useRef(0);
  const wordCountRef = useRef(0);
  const longPauseCountRef = useRef(0);

  const startTracking = useCallback(() => {
    isTrackingRef.current = true;
    startTimeRef.current = Date.now();
    lastKeystrokeTimeRef.current = null;
    deletionCountRef.current = 0;
    pausesRef.current = [];
    characterCountRef.current = 0;
    wordCountRef.current = 0;
    longPauseCountRef.current = 0;
  }, []);

  const recordKeystroke = useCallback((key: string, currentText: string) => {
    if (!isTrackingRef.current) {
      startTracking();
    }

    const now = Date.now();
    
    // Track pause between keystrokes
    if (lastKeystrokeTimeRef.current) {
      const pause = now - lastKeystrokeTimeRef.current;
      
      // Only track significant pauses (> 500ms)
      if (pause > 500) {
        pausesRef.current.push(pause);
        
        // Count long pauses
        if (pause >= LONG_PAUSE_THRESHOLD_MS) {
          longPauseCountRef.current++;
        }
      }
    }
    
    lastKeystrokeTimeRef.current = now;
    
    // Track deletions
    if (key === 'Backspace' || key === 'Delete') {
      deletionCountRef.current++;
    } else if (key.length === 1) {
      // Regular character
      characterCountRef.current++;
    }
    
    // Track word count
    wordCountRef.current = currentText.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [startTracking]);

  const calculateTelemetry = useCallback((): BehavioralTelemetry => {
    const endTime = Date.now();
    const totalDuration = startTimeRef.current ? endTime - startTimeRef.current : 0;
    const durationMinutes = totalDuration / 60000;
    
    // Calculate WPM
    const wpm = durationMinutes > 0 ? Math.round(wordCountRef.current / durationMinutes) : 0;
    
    // Calculate hesitation level based on pauses
    const significantPauses = pausesRef.current.filter(p => p >= HESITATION_THRESHOLD_MS).length;
    let hesitationLevel: BehavioralTelemetry['hesitationLevel'] = 'none';
    if (significantPauses >= 3) hesitationLevel = 'high';
    else if (significantPauses >= 2) hesitationLevel = 'medium';
    else if (significantPauses >= 1) hesitationLevel = 'low';
    
    // Calculate average pause
    const avgPause = pausesRef.current.length > 0 
      ? pausesRef.current.reduce((a, b) => a + b, 0) / pausesRef.current.length 
      : 0;
    
    // Infer emotional state
    let inferredState: BehavioralTelemetry['inferredState'] = 'calm';
    let confidenceScore = 0.5;
    
    // High WPM + low deletions = urgent/excited
    if (wpm > 60 && deletionCountRef.current < 5) {
      inferredState = 'excited';
      confidenceScore = 0.7;
    }
    // Very high WPM = urgent
    else if (wpm > 80) {
      inferredState = 'urgent';
      confidenceScore = 0.75;
    }
    // Many deletions = uncertain/anxious
    else if (deletionCountRef.current > 10 || (deletionCountRef.current > 5 && wordCountRef.current < 10)) {
      inferredState = 'anxious';
      confidenceScore = 0.65;
    }
    // Long pauses = contemplative
    else if (longPauseCountRef.current >= 2 || avgPause > 4000) {
      inferredState = 'contemplative';
      confidenceScore = 0.7;
    }
    // Moderate pauses = hesitant
    else if (hesitationLevel === 'high' || hesitationLevel === 'medium') {
      inferredState = 'hesitant';
      confidenceScore = 0.6;
    }
    
    return {
      hesitationLevel,
      deletionCount: deletionCountRef.current,
      wordsPerMinute: wpm,
      inferredState,
      confidenceScore,
      pausesBetweenWords: [...pausesRef.current],
      totalTypingDuration: totalDuration,
      characterCount: characterCountRef.current,
      wordCount: wordCountRef.current,
    };
  }, []);

  const stopTracking = useCallback((): BehavioralTelemetry => {
    isTrackingRef.current = false;
    const finalTelemetry = calculateTelemetry();
    setTelemetry(finalTelemetry);
    return finalTelemetry;
  }, [calculateTelemetry]);

  const resetTelemetry = useCallback(() => {
    isTrackingRef.current = false;
    startTimeRef.current = null;
    lastKeystrokeTimeRef.current = null;
    deletionCountRef.current = 0;
    pausesRef.current = [];
    characterCountRef.current = 0;
    wordCountRef.current = 0;
    longPauseCountRef.current = 0;
    setTelemetry(createEmptyTelemetry());
  }, []);

  return {
    telemetry,
    startTracking,
    stopTracking,
    recordKeystroke,
    resetTelemetry,
  };
};
