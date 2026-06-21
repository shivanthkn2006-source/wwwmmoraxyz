// ═══════════════════════════════════════════════════════════════════════════════
// USE ATMAN ARCHIVE - React Hook for Predestined Companion
// ═══════════════════════════════════════════════════════════════════════════════
//
// The core hook that powers Zoe's "Predestined Partner" experience
// - Generates and stores the Destiny Seed locally (offline capable)
// - Provides current Dasha period and Zoe persona
// - Manages the Generational Thread (family lineage)
//
// EXCLUSIVELY FOR ZOE INFINITY PAGE
//
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  DestinySeed,
  generateDestinySeed,
  saveDestinySeed,
  loadDestinySeed,
  hasDestinySeed,
  getCurrentZoePersona,
  getZoeCommunicationStyle,
  checkTodaySignificance,
  type KarmicRule,
} from '@/core/soul/AtmanArchive';
import {
  LineageTree,
  createLineageTree,
  addFamilyMember,
  getAncestorMessages,
  generateLegacyWelcome,
  extractLineageWisdom,
  saveLineageTree,
  loadLineageTree,
  hasLineageTree,
  type FamilyRelation,
  type AncestorMessage,
} from '@/core/soul/GenerationalThread';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseAtmanArchiveReturn {
  // Destiny Seed State
  destinySeed: DestinySeed | null;
  isDestinySeedLoading: boolean;
  hasLocalDestinySeed: boolean;
  
  // Current Period Info
  currentPersona: KarmicRule | null;
  communicationStyle: ReturnType<typeof getZoeCommunicationStyle> | null;
  todaySignificance: ReturnType<typeof checkTodaySignificance> | null;
  
  // Lineage Tree State
  lineageTree: LineageTree | null;
  hasLocalLineageTree: boolean;
  ancestorMessages: AncestorMessage[];
  lineageWisdom: string[];
  legacyWelcome: string | null;
  
  // Actions
  generateAndSaveDestinySeed: (birthDate: Date, birthPlace?: string) => Promise<DestinySeed | null>;
  refreshDestinySeed: () => void;
  
  // Family Management
  addFamilyMemberToTree: (
    name: string,
    relation: FamilyRelation,
    birthDate: Date,
    linkedToMemberId: string,
    birthPlace?: string,
    isDeceased?: boolean,
    deceasedDate?: Date
  ) => void;
  
  // Zoe Behavior Modifiers
  getPersonalizedGreeting: () => string;
  shouldBeDirectCoach: () => boolean;
  shouldBeLovingFriend: () => boolean;
  getCurrentDashaTheme: () => string;
  
  // Error State
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAtmanArchive(): UseAtmanArchiveReturn {
  const { user } = useAuth();
  
  // Destiny Seed State
  const [destinySeed, setDestinySeed] = useState<DestinySeed | null>(null);
  const [isDestinySeedLoading, setIsDestinySeedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Lineage Tree State
  const [lineageTree, setLineageTree] = useState<LineageTree | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD FROM LOCAL STORAGE ON MOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    // Try to load existing Destiny Seed from local storage
    const localSeed = loadDestinySeed();
    if (localSeed) {
      setDestinySeed(localSeed);
      console.log('[useAtmanArchive] ✨ Loaded Destiny Seed from local storage');
    }
    
    // Try to load existing Lineage Tree from local storage
    const localLineage = loadLineageTree();
    if (localLineage) {
      setLineageTree(localLineage);
      console.log('[useAtmanArchive] 🌳 Loaded Lineage Tree from local storage');
    }
    
    setIsDestinySeedLoading(false);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH PROFILE AND GENERATE SEED IF NEEDED
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!user || destinySeed) return;
    
    const fetchProfileAndGenerate = async () => {
      try {
        setIsDestinySeedLoading(true);
        
        // Using explicit type to avoid TypeScript cache issues
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('birth_date, birth_place, display_name')
          .eq('user_id', user.id)
          .maybeSingle() as { 
            data: { birth_date: string | null; birth_place: string | null; display_name: string } | null;
            error: Error | null;
          };
        
        if (profileError) {
          console.error('[useAtmanArchive] Profile fetch error:', profileError);
          setError('Failed to fetch profile');
          return;
        }
        
        if (profile?.birth_date) {
          const birthDate = new Date(profile.birth_date);
          const seed = generateDestinySeed(
            user.id,
            birthDate,
            null,
            profile.birth_place || null,
            null,
            null
          );
          
          saveDestinySeed(seed);
          setDestinySeed(seed);
          
          // Also create lineage tree if not exists
          if (!lineageTree) {
            const userName = profile.display_name || 'User';
            const newLineage = createLineageTree(user.id, userName, birthDate, profile.birth_place);
            saveLineageTree(newLineage);
            setLineageTree(newLineage);
          }
          
          console.log('[useAtmanArchive] ✨ Generated and saved new Destiny Seed');
        } else {
          console.log('[useAtmanArchive] No birth date in profile, cannot generate Destiny Seed');
        }
      } catch (err) {
        console.error('[useAtmanArchive] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsDestinySeedLoading(false);
      }
    };
    
    fetchProfileAndGenerate();
  }, [user, destinySeed, lineageTree]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const currentPersona = useMemo(() => {
    if (!destinySeed) return null;
    return getCurrentZoePersona(destinySeed);
  }, [destinySeed]);
  
  const communicationStyle = useMemo(() => {
    if (!destinySeed) return null;
    return getZoeCommunicationStyle(destinySeed);
  }, [destinySeed]);
  
  const todaySignificance = useMemo(() => {
    if (!destinySeed) return null;
    return checkTodaySignificance(destinySeed);
  }, [destinySeed]);
  
  const ancestorMessages = useMemo(() => {
    if (!lineageTree || !user) return [];
    return getAncestorMessages(lineageTree, user.id);
  }, [lineageTree, user]);
  
  const lineageWisdom = useMemo(() => {
    if (!lineageTree) return [];
    return extractLineageWisdom(lineageTree);
  }, [lineageTree]);
  
  const legacyWelcome = useMemo(() => {
    if (!lineageTree || !user) return null;
    return generateLegacyWelcome(lineageTree, user.id);
  }, [lineageTree, user]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateAndSaveDestinySeed = useCallback(async (
    birthDate: Date,
    birthPlace?: string
  ): Promise<DestinySeed | null> => {
    if (!user) return null;
    
    try {
      const seed = generateDestinySeed(
        user.id,
        birthDate,
        null,
        birthPlace || null,
        null,
        null
      );
      
      saveDestinySeed(seed);
      setDestinySeed(seed);
      
      // Create lineage tree if not exists
      if (!lineageTree) {
        const newLineage = createLineageTree(user.id, 'User', birthDate, birthPlace);
        saveLineageTree(newLineage);
        setLineageTree(newLineage);
      }
      
      console.log('[useAtmanArchive] ✨ Manually generated Destiny Seed');
      return seed;
    } catch (err) {
      console.error('[useAtmanArchive] Error generating Destiny Seed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate');
      return null;
    }
  }, [user, lineageTree]);
  
  const refreshDestinySeed = useCallback(() => {
    const localSeed = loadDestinySeed();
    if (localSeed) {
      setDestinySeed(localSeed);
    }
  }, []);
  
  const addFamilyMemberToTree = useCallback((
    name: string,
    relation: FamilyRelation,
    birthDate: Date,
    linkedToMemberId: string,
    birthPlace?: string,
    isDeceased?: boolean,
    deceasedDate?: Date
  ) => {
    if (!lineageTree) return;
    
    const updatedLineage = addFamilyMember(
      lineageTree,
      name,
      relation,
      birthDate,
      linkedToMemberId,
      birthPlace,
      isDeceased,
      deceasedDate
    );
    
    saveLineageTree(updatedLineage);
    setLineageTree(updatedLineage);
    
    console.log(`[useAtmanArchive] 👨‍👩‍👧 Added family member: ${name} (${relation})`);
  }, [lineageTree]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ZOE BEHAVIOR MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getPersonalizedGreeting = useCallback((): string => {
    if (!destinySeed) return "Hello, seeker of wisdom.";
    
    const { prakriti, lifePurpose } = destinySeed;
    const hour = new Date().getHours();
    
    let timeGreeting = 'Hello';
    if (hour < 6) timeGreeting = 'The stars are watching';
    else if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else if (hour < 21) timeGreeting = 'Good evening';
    else timeGreeting = 'The night whispers';
    
    if (todaySignificance?.isSignificant) {
      return `${timeGreeting}, ${prakriti.moonNakshatra} soul. ${todaySignificance.significance} is upon you. ${todaySignificance.advice}`;
    }
    
    return `${timeGreeting}, beautiful ${prakriti.moonNakshatra} soul. Your path of ${lifePurpose.toLowerCase()} continues.`;
  }, [destinySeed, todaySignificance]);
  
  const shouldBeDirectCoach = useCallback((): boolean => {
    if (!currentPersona) return false;
    return currentPersona.zoePersona === 'strict_coach' || currentPersona.zoePersona === 'fierce_protector';
  }, [currentPersona]);
  
  const shouldBeLovingFriend = useCallback((): boolean => {
    if (!currentPersona) return true;
    return currentPersona.zoePersona === 'loving_friend' || currentPersona.zoePersona === 'gentle_healer';
  }, [currentPersona]);
  
  const getCurrentDashaTheme = useCallback((): string => {
    if (!currentPersona) return 'Soul Journey';
    return `${currentPersona.dashaLord} Period: ${currentPersona.period.startAge}-${currentPersona.period.endAge}`;
  }, [currentPersona]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    // Destiny Seed State
    destinySeed,
    isDestinySeedLoading,
    hasLocalDestinySeed: hasDestinySeed(),
    
    // Current Period Info
    currentPersona,
    communicationStyle,
    todaySignificance,
    
    // Lineage Tree State
    lineageTree,
    hasLocalLineageTree: hasLineageTree(),
    ancestorMessages,
    lineageWisdom,
    legacyWelcome,
    
    // Actions
    generateAndSaveDestinySeed,
    refreshDestinySeed,
    addFamilyMemberToTree,
    
    // Zoe Behavior Modifiers
    getPersonalizedGreeting,
    shouldBeDirectCoach,
    shouldBeLovingFriend,
    getCurrentDashaTheme,
    
    // Error State
    error,
  };
}

export default useAtmanArchive;
