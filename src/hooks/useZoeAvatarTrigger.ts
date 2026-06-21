/**
 * USE ZOE AVATAR TRIGGER - Detects reveal/hide/minimize intents in user messages
 * and manages avatar visibility state.
 */

import { useState, useCallback } from 'react';
import { detectGestureFromText, triggerZoeGesture } from '@/utils/zoeGestureBus';

const REVEAL_PHRASES = [
  'i want to see you',
  'wanna see you',
  'i wanna see you',
  'can i see you',
  'let me see you',
  'show yourself',
  'show me yourself',
  'show me your avatar',
  'show your avatar',
  'show avatar',
  'avatar on',
  'open avatar',
  'avatar speaking',
  'avatar speak',
  'speaking avatar',
  'lip sync',
  'lipsync',
  'talk to me face',
  'show your face',
  'see your face',
  'pip on',
  'open pip',
  'tutor mode',
  'langify',
  'appear',
];

const DISMISS_PHRASES = [
  'back to chat',
  'go back',
  'hide',
  'disappear',
  'close',
  'go away',
  'bye for now',
];

const MINIMIZE_PHRASES = [
  'small',
  'make her small',
  'minimize',
  'shrink',
  'compact',
  'corner',
  'move to corner',
  'make small',
];

const EXPAND_PHRASES = [
  'make her big',
  'full screen',
  'expand',
  'bigger',
  'full size',
  'maximize',
];

export type AvatarVariant = 'zoe' | 'smith';
// NOTE: Chat avatar (Zoe Infinity) is GLB-only with full ARKit blendshapes for
// lip-sync + gestures. FBX body rigs (party-male/female) live ONLY in the VR
// world and are switched there via ZoeUtilityMenu / useVRAvatarProfile. The
// chat trigger must not dispatch VR variant events — that was polluting the VR
// avatar selection from chat phrases. Per user decision: keep FBX out of chat.

export function useZoeAvatarTrigger() {
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [avatarVariant, setAvatarVariant] = useState<AvatarVariant>('zoe');
  const [isAvatarCompact, setIsAvatarCompact] = useState(false);

  const checkAvatarTrigger = useCallback((message: string): string | null => {
    const normalized = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Gesture detection — fires a time-bounded facial gesture on the GLB rig
    // independently of show/hide/switch logic. If the avatar isn't visible,
    // we still queue the gesture (it will play next time the avatar mounts).
    const gestureMatch = detectGestureFromText(message);
    if (gestureMatch) {
      triggerZoeGesture(gestureMatch.gesture);
      // If avatar not visible yet, reveal it in PIP so user actually sees the gesture
      if (!isAvatarVisible) {
        setAvatarVariant('zoe');
        setIsAvatarVisible(true);
        setIsAvatarCompact(true);
      }
      return gestureMatch.reply;
    }

    const isDismissMatch =
      isAvatarVisible &&
      (DISMISS_PHRASES.some((p) => normalized === p || normalized.includes(p)) ||
        /(hide|dismiss|close)\s+(avatar|yourself|you)/.test(normalized));

    if (isDismissMatch) {
      setIsAvatarVisible(false);
      setIsAvatarCompact(false);
      return "okay, I'm right here whenever you need me ✨";
    }

    if (isAvatarVisible && !isAvatarCompact) {
      const isMinimizeMatch = MINIMIZE_PHRASES.some((p) => normalized === p || normalized.includes(p));
      if (isMinimizeMatch) {
        setIsAvatarCompact(true);
        return "I'll stay right here in the corner 💫";
      }
    }

    if (isAvatarVisible && isAvatarCompact) {
      const isExpandMatch = EXPAND_PHRASES.some((p) => normalized === p || normalized.includes(p));
      if (isExpandMatch) {
        setIsAvatarCompact(false);
        return 'here I am, full size 💫';
      }
    }

    const hasZoeIntent = /\bzoe\b/.test(normalized) && /(show|appear|see)/.test(normalized) && /(you|yourself|avatar)/.test(normalized);

    const isRevealMatch =
      REVEAL_PHRASES.some((p) => normalized === p || normalized.includes(p)) ||
      /(i|we|can i|let me|wanna|want to)\s+(see|view)\s+(you|u|yourself|your avatar)/.test(normalized) ||
      /show\s+(me\s+)?(yourself|your avatar|you)/.test(normalized) ||
      hasZoeIntent;

    if (isRevealMatch) {
      setAvatarVariant('zoe');
      setIsAvatarVisible(true);
      setIsAvatarCompact(false); // Face-to-face mode should open full-screen, not tiny PIP
      return 'here I am — face to face 💫';
    }

    const wantsSmith = /\b(show|switch|open|use|select)\b.*\b(smith|male avatar|man avatar)\b|\b(smith|male avatar|man avatar)\b.*\b(show|switch|open|use|select)\b/.test(normalized);
    if (wantsSmith) {
      setAvatarVariant('smith');
      setIsAvatarVisible(true);
      setIsAvatarCompact(true);
      return 'Smith presence is active in the corner.';
    }

    return null;
  }, [isAvatarVisible, isAvatarCompact]);

  const dismissAvatar = useCallback(() => {
    setIsAvatarVisible(false);
    setIsAvatarCompact(false);
  }, []);

  const showAvatar = useCallback((variant: AvatarVariant = 'zoe') => {
    setAvatarVariant(variant);
    setIsAvatarVisible(true);
    setIsAvatarCompact(true); // Default to PIP
  }, []);

  return {
    isAvatarVisible,
    isAvatarCompact,
    avatarVariant,
    checkAvatarTrigger,
    dismissAvatar,
    showAvatar,
    setIsAvatarCompact,
  };
}
