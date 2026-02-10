// ═══════════════════════════════════════════════════════════════════════════════
// VR SPEAKING TO ORB - Detects when VR entities speak and positions Zoe Orb
// Dispatches events so the orb can appear in front of the speaking entity
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef } from 'react';

export interface VRSpeakerInfo {
  speakerId: string;
  speakerType: 'avatar' | 'animal' | 'npc' | 'character';
  speakerName: string;
  worldPosition: { x: number; y: number; z: number };
  isSpeaking: boolean;
}

// Global event for VR speaking
export const VR_SPEAKING_EVENT = 'vr-entity-speaking';
export const VR_SPEAKING_END_EVENT = 'vr-entity-speaking-end';

/**
 * Dispatch event when a VR entity starts speaking
 */
export const dispatchVRSpeaking = (speaker: VRSpeakerInfo) => {
  window.dispatchEvent(new CustomEvent(VR_SPEAKING_EVENT, { detail: speaker }));
};

/**
 * Dispatch event when a VR entity stops speaking
 */
export const dispatchVRSpeakingEnd = (speakerId: string) => {
  window.dispatchEvent(new CustomEvent(VR_SPEAKING_END_EVENT, { detail: { speakerId } }));
};

/**
 * Hook for VR components to trigger speaking events
 */
export const useVRSpeakingEmitter = () => {
  const activeSpeakersRef = useRef<Set<string>>(new Set());

  const startSpeaking = useCallback((speaker: Omit<VRSpeakerInfo, 'isSpeaking'>) => {
    if (activeSpeakersRef.current.has(speaker.speakerId)) return;
    
    activeSpeakersRef.current.add(speaker.speakerId);
    dispatchVRSpeaking({ ...speaker, isSpeaking: true });
    
    console.log(`[VRSpeaking] ${speaker.speakerType} "${speaker.speakerName}" started speaking at`, speaker.worldPosition);
  }, []);

  const stopSpeaking = useCallback((speakerId: string) => {
    if (!activeSpeakersRef.current.has(speakerId)) return;
    
    activeSpeakersRef.current.delete(speakerId);
    dispatchVRSpeakingEnd(speakerId);
    
    console.log(`[VRSpeaking] Speaker ${speakerId} stopped speaking`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeSpeakersRef.current.forEach(id => {
        dispatchVRSpeakingEnd(id);
      });
      activeSpeakersRef.current.clear();
    };
  }, []);

  return { startSpeaking, stopSpeaking };
};

/**
 * Hook for GlobalZoeAssistant to listen for VR speaking events
 * Returns screen position for orb placement
 */
export const useVRSpeakingListener = () => {
  const currentSpeakerRef = useRef<VRSpeakerInfo | null>(null);

  useEffect(() => {
    const handleSpeakingStart = (event: CustomEvent<VRSpeakerInfo>) => {
      currentSpeakerRef.current = event.detail;
      
      // Dispatch event to GlobalZoeAssistant with screen-space position hint
      window.dispatchEvent(new CustomEvent('zoe-orb-vr-position', {
        detail: {
          type: 'speaking-start',
          speaker: event.detail,
          // Convert world coords to a rough screen hint (orb will handle actual positioning)
          hint: {
            moveToCenter: true,
            speakerName: event.detail.speakerName,
            speakerType: event.detail.speakerType,
          }
        }
      }));
    };

    const handleSpeakingEnd = (event: CustomEvent<{ speakerId: string }>) => {
      if (currentSpeakerRef.current?.speakerId === event.detail.speakerId) {
        currentSpeakerRef.current = null;
        
        window.dispatchEvent(new CustomEvent('zoe-orb-vr-position', {
          detail: { type: 'speaking-end' }
        }));
      }
    };

    window.addEventListener(VR_SPEAKING_EVENT, handleSpeakingStart as EventListener);
    window.addEventListener(VR_SPEAKING_END_EVENT, handleSpeakingEnd as EventListener);

    return () => {
      window.removeEventListener(VR_SPEAKING_EVENT, handleSpeakingStart as EventListener);
      window.removeEventListener(VR_SPEAKING_END_EVENT, handleSpeakingEnd as EventListener);
    };
  }, []);

  return { getCurrentSpeaker: () => currentSpeakerRef.current };
};

export default useVRSpeakingEmitter;
