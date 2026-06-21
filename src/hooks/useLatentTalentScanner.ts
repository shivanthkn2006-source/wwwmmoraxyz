/**
 * useLatentTalentScanner - Project Re-Sleeve
 * Deep scan analysis engine for detecting dormant talents
 * Analyzes DHF_History (Chat logs, Saved locations, Photo uploads)
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Vocational Archetypes Database
const VOCATIONAL_ARCHETYPES = [
  { id: 'painter', name: 'Painter', keywords: ['art', 'paint', 'draw', 'canvas', 'color', 'gallery', 'abstract', 'mural', 'creative', 'design'], sleeveId: 'zoe-painter' },
  { id: 'musician', name: 'Musician', keywords: ['music', 'song', 'melody', 'rhythm', 'instrument', 'concert', 'band', 'compose', 'audio', 'sound'], sleeveId: 'zoe-creator' },
  { id: 'trader', name: 'Trader', keywords: ['invest', 'stock', 'market', 'finance', 'trade', 'crypto', 'business', 'money', 'profit', 'strategy'], sleeveId: 'zoe-entrepreneur' },
  { id: 'chef', name: 'Chef', keywords: ['cook', 'recipe', 'food', 'restaurant', 'kitchen', 'cuisine', 'taste', 'flavor', 'ingredient', 'meal'], sleeveId: 'zoe-healer' },
  { id: 'coder', name: 'Coder', keywords: ['code', 'program', 'software', 'app', 'developer', 'tech', 'algorithm', 'debug', 'api', 'system'], sleeveId: 'zoe-coder' },
  { id: 'connector', name: 'Connector', keywords: ['network', 'community', 'social', 'people', 'event', 'collaborate', 'team', 'leader', 'connect', 'relationship'], sleeveId: 'zoe-connector' },
  { id: 'healer', name: 'Healer', keywords: ['health', 'wellness', 'meditation', 'yoga', 'therapy', 'mental', 'calm', 'peace', 'balance', 'mindful'], sleeveId: 'zoe-healer' },
  { id: 'writer', name: 'Writer', keywords: ['write', 'story', 'blog', 'article', 'book', 'poem', 'content', 'creative', 'narrative', 'author'], sleeveId: 'zoe-painter' },
] as const;

export interface TalentMatch {
  archetypeId: string;
  archetypeName: string;
  confidence: number; // 0-100
  matchedKeywords: string[];
  dataPoints: number;
  suggestedSleeve: string;
}

export interface LatentTalentScanResult {
  scannedAt: number;
  totalDataPoints: number;
  hiddenTalent: TalentMatch | null;
  allMatches: TalentMatch[];
  destinyNotification: string | null;
  timeSpentAnalysis: Record<string, number>; // percentage of time on each archetype
}

export const useLatentTalentScanner = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<LatentTalentScanResult | null>(null);
  const [destinyTriggered, setDestinyTriggered] = useState(false);

  /**
   * Deep Scan: Analyze DHF_History for recurring themes
   */
  const scanForLatentTalent = useCallback(async (): Promise<LatentTalentScanResult> => {
    if (!user) throw new Error('Authentication required for talent scanning');

    setIsScanning(true);
    console.log('[LatentTalentScanner] Initiating deep scan...');

    try {
      // Fetch all behavioral data from DHF
      // ISOLATION: Only fetch from Zoe Classic (ai_companion_messages with variant filter)
      // Zoe Infinity has its own separate table (zoe_infinity_messages) - talent scanning is Classic-only
      const [
        chatLogsResult,
        postsResult,
        emotionsResult,
        eventsResult
      ] = await Promise.all([
        supabase.from('ai_companion_messages')
          .select('content')
          .eq('user_id', user.id)
          .or('variant.is.null,variant.eq.zoe_classic')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('posts')
          .select('content, media_type')
          .eq('user_id', user.id)
          .limit(100),
        supabase.from('emotion_logs')
          .select('emotion, context, intensity')
          .eq('user_id', user.id)
          .limit(100),
        supabase.from('behavioral_events')
          .select('event_type, event_category, context_snippet, metadata')
          .eq('user_id', user.id)
          .limit(200)
      ]);

      const chatLogs = chatLogsResult.data || [];
      const posts = postsResult.data || [];
      const emotions = emotionsResult.data || [];
      const events = eventsResult.data || [];

      const totalDataPoints = chatLogs.length + posts.length + emotions.length + events.length;
      
      // Combine all text content for analysis
      const allText = [
        ...chatLogs.map(c => c.content || ''),
        ...posts.map(p => p.content || ''),
        ...emotions.map(e => e.context || ''),
        ...events.map(e => e.context_snippet || '')
      ].join(' ').toLowerCase();

      // Count image uploads (photo hobby indicator)
      const imageUploads = posts.filter(p => p.media_type?.includes('image')).length;

      // Analyze against archetypes
      const archetypeScores: TalentMatch[] = VOCATIONAL_ARCHETYPES.map(archetype => {
        const matchedKeywords: string[] = [];
        let score = 0;

        archetype.keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = allText.match(regex);
          if (matches && matches.length > 0) {
            matchedKeywords.push(keyword);
            score += matches.length;
          }
        });

        // Bonus for image-heavy users (painter archetype)
        if (archetype.id === 'painter' && imageUploads > 10) {
          score += imageUploads * 2;
          matchedKeywords.push(`${imageUploads} photos`);
        }

        // Calculate confidence (0-100)
        const confidence = Math.min(100, Math.round((score / (totalDataPoints * 0.1)) * 100));

        return {
          archetypeId: archetype.id,
          archetypeName: archetype.name,
          confidence,
          matchedKeywords,
          dataPoints: score,
          suggestedSleeve: archetype.sleeveId
        };
      });

      // Sort by confidence
      const sortedMatches = archetypeScores
        .filter(m => m.confidence > 0)
        .sort((a, b) => b.confidence - a.confidence);

      // Calculate time spent analysis
      const timeSpentAnalysis: Record<string, number> = {};
      const totalScore = sortedMatches.reduce((sum, m) => sum + m.dataPoints, 0);
      sortedMatches.forEach(match => {
        timeSpentAnalysis[match.archetypeName] = Math.round((match.dataPoints / Math.max(1, totalScore)) * 100);
      });

      // Determine hidden talent (highest confidence > 85%)
      const hiddenTalent = sortedMatches.length > 0 && sortedMatches[0].confidence >= 85
        ? sortedMatches[0]
        : null;

      // Generate destiny notification
      let destinyNotification: string | null = null;
      if (hiddenTalent) {
        const percentage = timeSpentAnalysis[hiddenTalent.archetypeName] || 0;
        destinyNotification = `I notice you spend ${percentage}% of your time engaging with ${hiddenTalent.archetypeName.toLowerCase()}-related content. I have a '${hiddenTalent.suggestedSleeve.replace('zoe-', 'Zoe-')}' Sleeve available. Would you like to try it?`;
        setDestinyTriggered(true);
      }

      const result: LatentTalentScanResult = {
        scannedAt: Date.now(),
        totalDataPoints,
        hiddenTalent,
        allMatches: sortedMatches,
        destinyNotification,
        timeSpentAnalysis
      };

      setLastScan(result);

      // Log detected talent to behavioral events (if significant)
      if (hiddenTalent && hiddenTalent.confidence >= 85) {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'latent_talent_detected',
          event_category: 'resleeve',
          context_snippet: `Detected: ${hiddenTalent.archetypeName} (${hiddenTalent.confidence}% confidence)`,
          metadata: {
            archetype: hiddenTalent.archetypeName,
            confidence: hiddenTalent.confidence,
            suggested_sleeve: hiddenTalent.suggestedSleeve,
            matched_keywords: hiddenTalent.matchedKeywords
          }
        });

        console.log('[LatentTalentScanner] Hidden talent logged:', hiddenTalent);
      }

      // Dispatch to Zoe Core DHF
      window.dispatchEvent(new CustomEvent('zoe-talent-detected', {
        detail: { result, userId: user.id }
      }));

      console.log('[LatentTalentScanner] Deep scan complete:', result);
      return result;

    } finally {
      setIsScanning(false);
    }
  }, [user]);

  /**
   * Trigger Destiny Notification if talent detected
   */
  const getDestinyNotification = useCallback(() => {
    if (!lastScan) return null;
    return lastScan.destinyNotification;
  }, [lastScan]);

  return {
    // State
    isScanning,
    lastScan,
    destinyTriggered,

    // Actions
    scanForLatentTalent,
    getDestinyNotification,

    // Data
    archetypes: VOCATIONAL_ARCHETYPES,
  };
};

export default useLatentTalentScanner;
