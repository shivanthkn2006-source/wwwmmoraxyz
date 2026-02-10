/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE NICKNAME SYSTEM - What Zoe Calls You
 * Allows users and Zoe to change nicknames with confirmation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const NICKNAME_STORAGE_KEY = 'zoe_user_nickname';

export interface NicknameState {
  nickname: string;
  isConfirmed: boolean;
  pendingNickname: string | null;
  awaitingConfirmation: boolean;
}

export interface UseZoeNicknameReturn {
  nickname: string;
  setNickname: (name: string) => void;
  requestNicknameChange: (newName: string) => { needsConfirmation: boolean; message: string };
  confirmNickname: () => void;
  rejectNickname: () => void;
  detectNicknameRequest: (text: string) => { detected: boolean; suggestedName?: string };
  awaitingConfirmation: boolean;
  pendingNickname: string | null;
}

// Patterns for detecting nickname change requests
const NICKNAME_PATTERNS = [
  /call\s+me\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /my\s+name\s+is\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /i\s*(?:am|'m)\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /you\s+can\s+call\s+me\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /nickname\s+(?:is|:)?\s*["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /call\s+me\s+(\w+)/i,
];

// Patterns for Zoe suggesting name change
const ZOE_NICKNAME_PATTERNS = [
  /can\s+i\s+call\s+you\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /let\s+me\s+call\s+you\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
  /how\s+about\s+i\s+call\s+you\s+["']?([a-zA-Z][a-zA-Z\s]{0,20})["']?/i,
];

export const useZoeNickname = (): UseZoeNicknameReturn => {
  const { user } = useAuth();
  
  const [state, setState] = useState<NicknameState>({
    nickname: '',
    isConfirmed: false,
    pendingNickname: null,
    awaitingConfirmation: false,
  });

  // Load nickname from storage/database on mount
  // BUG FIX: Added isMounted check to prevent state updates on unmounted component
  useEffect(() => {
    let isMounted = true;
    
    const loadNickname = async () => {
      // First try local storage
      const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
      if (storedNickname && isMounted) {
        setState(prev => ({ ...prev, nickname: storedNickname, isConfirmed: true }));
      }

      // Then try to fetch from profile
      if (user?.id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

          if (isMounted && profile?.display_name && !storedNickname) {
            const firstName = profile.display_name.split(' ')[0];
            setState(prev => ({ ...prev, nickname: firstName, isConfirmed: true }));
            localStorage.setItem(NICKNAME_STORAGE_KEY, firstName);
          }
        } catch (e) {
          console.error('[ZoeNickname] Failed to load profile:', e);
        }
      }
    };

    loadNickname();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Set nickname directly (with confirmation)
  // BUG FIX: Also sync to profiles.zoe_infinity_nickname for persistence
  const setNickname = useCallback(async (name: string) => {
    const cleanName = name.trim().slice(0, 30);
    if (!cleanName) return;

    setState(prev => ({
      ...prev,
      nickname: cleanName,
      isConfirmed: true,
    }));
    localStorage.setItem(NICKNAME_STORAGE_KEY, cleanName);
    console.log(`[ZoeNickname] 🏷️ Nickname set to: ${cleanName}`);
    
    // Sync to database for cross-device persistence
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ zoe_infinity_nickname: cleanName } as any)
          .eq('user_id', user.id);
        console.log('[ZoeNickname] ✓ Synced nickname to DB');
      } catch (e) {
        console.warn('[ZoeNickname] DB sync failed:', e);
      }
    }
  }, [user?.id]);

  // Request nickname change (needs confirmation)
  const requestNicknameChange = useCallback((newName: string): { needsConfirmation: boolean; message: string } => {
    const cleanName = newName.trim().slice(0, 30);
    if (!cleanName) {
      return { needsConfirmation: false, message: '' };
    }

    setState(prev => ({
      ...prev,
      pendingNickname: cleanName,
      awaitingConfirmation: true,
    }));

    return {
      needsConfirmation: true,
      message: `Got it! Should I call you "${cleanName}" from now on? Just say "yes" or "no".`,
    };
  }, []);

  // Confirm pending nickname
  // BUG FIX: Also sync confirmed nickname to DB
  const confirmNickname = useCallback(async () => {
    const pending = state.pendingNickname;
    if (!pending) return;
    
    localStorage.setItem(NICKNAME_STORAGE_KEY, pending);
    console.log(`[ZoeNickname] ✅ Confirmed nickname: ${pending}`);
    
    setState(prev => ({
      ...prev,
      nickname: pending,
      isConfirmed: true,
      pendingNickname: null,
      awaitingConfirmation: false,
    }));
    
    // Sync to database
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ zoe_infinity_nickname: pending } as any)
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('[ZoeNickname] DB sync failed:', e);
      }
    }
  }, [state.pendingNickname, user?.id]);

  // Reject pending nickname
  const rejectNickname = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingNickname: null,
      awaitingConfirmation: false,
    }));
    console.log('[ZoeNickname] ❌ Nickname change rejected');
  }, []);

  // Detect nickname request from text
  const detectNicknameRequest = useCallback((text: string): { detected: boolean; suggestedName?: string } => {
    const lowerText = text.toLowerCase().trim();

    // Check for user requesting nickname change
    for (const pattern of NICKNAME_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const suggestedName = match[1].trim();
        // Filter out common words that aren't names
        const notNames = ['here', 'there', 'hello', 'hi', 'zoe', 'smith', 'ok', 'okay', 'sure', 'yes', 'no'];
        if (notNames.includes(suggestedName.toLowerCase())) continue;
        
        return { detected: true, suggestedName };
      }
    }

    // Check for Zoe suggesting nickname
    for (const pattern of ZOE_NICKNAME_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return { detected: true, suggestedName: match[1].trim() };
      }
    }

    // Check for confirmation/rejection if awaiting
    if (state.awaitingConfirmation) {
      if (/^(yes|yeah|yep|sure|ok|okay|confirm|yup|definitely|absolutely)/i.test(lowerText)) {
        return { detected: true, suggestedName: '__CONFIRM__' };
      }
      if (/^(no|nope|nah|cancel|nevermind|never mind|don't|dont)/i.test(lowerText)) {
        return { detected: true, suggestedName: '__REJECT__' };
      }
    }

    return { detected: false };
  }, [state.awaitingConfirmation]);

  return {
    nickname: state.nickname,
    setNickname,
    requestNicknameChange,
    confirmNickname,
    rejectNickname,
    detectNicknameRequest,
    awaitingConfirmation: state.awaitingConfirmation,
    pendingNickname: state.pendingNickname,
  };
};

export default useZoeNickname;
