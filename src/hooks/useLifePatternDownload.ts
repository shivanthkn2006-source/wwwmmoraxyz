/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIFE PATTERN DOWNLOAD - 50MB+ Comprehensive User Life Data Package
 * Downloads everything needed for Zoe to work 100% offline on any device
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { loadDestinySeed, type DestinySeed } from '@/core/soul/AtmanArchive';
import { loadLineageTree, type LineageTree } from '@/core/soul/GenerationalThread';
import { OFFLINE_RESPONSES } from './useZoeOfflineLanguages';
import offlineWisdom from '@/data/offline_wisdom.json';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LifePatternPackage {
  version: string;
  createdAt: string;
  userId: string;
  
  // Core Identity
  profile: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    birthData?: {
      date: string;
      time?: string;
      place?: string;
    };
  };
  
  // Destiny & Soul Data
  destinySeed: DestinySeed | null;
  lineageTree: LineageTree | null;
  
  // Conversation History (last 500 messages)
  conversations: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  
  // Preferences & Settings
  preferences: {
    nickname?: string;
    language: string;
    intimacyLevel: number;
    voiceSettings?: {
      rate: number;
      pitch: number;
      volume: number;
    };
  };
  
  // Offline Wisdom (all categories)
  offlineWisdom: typeof offlineWisdom;
  
  // Multi-Language Responses
  offlineLanguages: typeof OFFLINE_RESPONSES;
  
  // Karmic Memory
  karmicMemory: {
    interactions: number;
    lastInteraction?: string;
    emotionalPatterns: string[];
    significantMoments: string[];
  };
  
  // Metadata
  metadata: {
    packageSize: string;
    deviceId?: string;
    downloadedAt: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useLifePatternDownload = () => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generatePackage = useCallback(async (): Promise<LifePatternPackage | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    setIsDownloading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Fetch profile (10%)
      setProgress(10);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name, profile_photo_url')
        .eq('user_id', user.id)
        .single();
      
      // Cast to expected shape (Supabase types may be stale)
      const profile = profileData as { username?: string; display_name?: string; profile_photo_url?: string } | null;

      // Step 2: Fetch conversation history (30%)
      // BUG FIX: Include BOTH Zoe Infinity messages (primary) AND Classic as fallback
      // This ensures complete offline data regardless of which interface user primarily uses
      setProgress(30);
      
      // Fetch Zoe Infinity messages first (preferred)
      const { data: infinityMessages } = await supabase
        .from('zoe_infinity_messages')
        .select('content, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      
      // Also fetch Classic messages as backup (20% progress)
      setProgress(35);
      const { data: classicMessages } = await supabase
        .from('ai_companion_messages')
        .select('content, role, created_at')
        .eq('user_id', user.id)
        .or('variant.is.null,variant.eq.zoe_classic')
        .order('created_at', { ascending: false })
        .limit(250);
      
      // Merge and deduplicate by timestamp (prefer Infinity messages)
      const allMessages = [...(infinityMessages || []), ...(classicMessages || [])];
      const seenTimestamps = new Set<string>();
      const messages = allMessages.filter(m => {
        if (seenTimestamps.has(m.created_at)) return false;
        seenTimestamps.add(m.created_at);
        return true;
      }).slice(0, 500);

      // Step 3: Load destiny seed from localStorage (40%)
      setProgress(40);
      const destinySeed = loadDestinySeed();

      // Step 4: Load lineage tree (50%)
      setProgress(50);
      const lineageTree = loadLineageTree();

      // Step 5: Load preferences (60%)
      setProgress(60);
      const nickname = localStorage.getItem('zoe_user_nickname') || undefined;
      const language = localStorage.getItem('zoe_active_language') || 'en';
      const intimacyLevel = parseInt(localStorage.getItem('zoe_intimacy_level') || '0', 10);

      // Step 6: Load karmic memory (70%)
      setProgress(70);
      const karmicData = localStorage.getItem('zoe_karmic_memory');
      const karmicMemory = karmicData ? JSON.parse(karmicData) : {
        interactions: 0,
        emotionalPatterns: [],
        significantMoments: [],
      };

      // Step 7: Bundle offline resources (80%)
      setProgress(80);

      // Step 8: Create package (90%)
      setProgress(90);
      
      const packageData: LifePatternPackage = {
        version: '2.0.0',
        createdAt: new Date().toISOString(),
        userId: user.id,
        
        profile: {
          username: profile?.username || undefined,
          displayName: profile?.display_name || profile?.username || undefined,
          avatarUrl: profile?.profile_photo_url || undefined,
          birthData: destinySeed ? {
            date: typeof destinySeed.birthDate === 'string' 
              ? destinySeed.birthDate 
              : (destinySeed.birthDate instanceof Date 
                ? destinySeed.birthDate.toISOString().split('T')[0] 
                : String(destinySeed.birthDate)),
            time: destinySeed.birthTime || undefined,
            place: destinySeed.birthPlace || undefined,
          } : undefined,
        },
        
        destinySeed,
        lineageTree,
        
        conversations: (messages || []).reverse().map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
        })),
        
        preferences: {
          nickname,
          language,
          intimacyLevel,
          voiceSettings: {
            rate: 0.82,
            pitch: 1.0,
            volume: 0.9,
          },
        },
        
        offlineWisdom,
        offlineLanguages: OFFLINE_RESPONSES,
        
        karmicMemory,
        
        metadata: {
          packageSize: '~50MB',
          deviceId: localStorage.getItem('device_id') || undefined,
          downloadedAt: new Date().toISOString(),
        },
      };

      setProgress(100);
      return packageData;

    } catch (err) {
      console.error('[LifePatternDownload] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate package');
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, [user?.id]);

  const downloadAsFile = useCallback(async () => {
    const packageData = await generatePackage();
    if (!packageData) return false;

    try {
      const jsonString = JSON.stringify(packageData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `zoe-life-pattern-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also save to localStorage for offline access
      localStorage.setItem('zoe_life_pattern_cache', jsonString);
      localStorage.setItem('zoe_life_pattern_date', new Date().toISOString());

      return true;
    } catch (err) {
      console.error('[LifePatternDownload] Download error:', err);
      setError('Failed to download file');
      return false;
    }
  }, [generatePackage]);

  const loadCachedPattern = useCallback((): LifePatternPackage | null => {
    try {
      const cached = localStorage.getItem('zoe_life_pattern_cache');
      if (!cached) return null;
      return JSON.parse(cached) as LifePatternPackage;
    } catch {
      return null;
    }
  }, []);

  const getCacheDate = useCallback((): string | null => {
    return localStorage.getItem('zoe_life_pattern_date');
  }, []);

  const hasCachedPattern = useCallback((): boolean => {
    return !!localStorage.getItem('zoe_life_pattern_cache');
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem('zoe_life_pattern_cache');
    localStorage.removeItem('zoe_life_pattern_date');
  }, []);

  return {
    // State
    isDownloading,
    progress,
    error,
    
    // Actions
    generatePackage,
    downloadAsFile,
    loadCachedPattern,
    getCacheDate,
    hasCachedPattern,
    clearCache,
  };
};

export default useLifePatternDownload;