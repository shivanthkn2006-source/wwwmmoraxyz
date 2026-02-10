// ═══════════════════════════════════════════════════════════════════════════════
// VIRAL CONTENT LOOP ENGINE
// Growth Layer 2: AI-Driven Outbound Content for Mass Distribution
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type SocialPlatform = 'tiktok' | 'youtube' | 'instagram' | 'twitter' | 'linkedin' | 'whatsapp' | 'other';
export type ContentType = 'loops' | 'architect_plan' | 'dream' | 'timeline_insight' | 'post';

export interface PlatformOptimizedContent {
  platform: SocialPlatform;
  format: string;
  aspectRatio: string;
  duration?: string;
  caption: string;
  hashtags: string[];
  hook: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ViralContentStrategy {
  tiktok: PlatformOptimizedContent;
  youtube: PlatformOptimizedContent;
  twitter: PlatformOptimizedContent;
  instagram?: PlatformOptimizedContent;
}

export interface ShareMetrics {
  totalShares: number;
  platformBreakdown: Record<SocialPlatform, number>;
  viralityScore: number;
}

export const useViralContentEngine = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareMetrics, setShareMetrics] = useState<ShareMetrics | null>(null);

  // Generate platform-optimized content strategy
  const generateViralStrategy = useCallback(async (
    contentType: ContentType,
    contentTitle: string,
    contentDescription: string,
    keywords?: string[]
  ): Promise<ViralContentStrategy | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('zoe-universal-architect', {
        body: {
          userInput: `VIRAL CONTENT STRATEGY MODE:
Generate platform-optimized versions for external social media distribution.

CONTENT TYPE: ${contentType}
TITLE: ${contentTitle}
DESCRIPTION: ${contentDescription}
KEYWORDS: ${keywords?.join(', ') || 'auto-generate'}

Generate 3 platform-optimized versions:

1. TikTok/Reels: Vertical 9:16, 15-30 seconds, high-contrast text overlay, engagement hook
2. YouTube Shorts: 9:16, designed for long-term discovery, SEO optimized
3. Twitter/X: Compelling caption with hashtags optimized for virality

For each platform provide:
- Optimal format and aspect ratio
- Engaging hook (first 3 seconds)
- SEO-optimized title and description
- Low-competition/high-search-volume hashtags
- Call-to-action`,
          viralMode: true
        }
      });
      
      if (error) throw error;
      
      // Parse the response into structured strategy
      const strategy: ViralContentStrategy = {
        tiktok: {
          platform: 'tiktok',
          format: 'vertical video',
          aspectRatio: '9:16',
          duration: '15-30s',
          caption: data?.productionPlan?.narrative?.substring(0, 150) || contentTitle,
          hashtags: data?.productionPlan?.sourcingQueries?.map((q: string) => 
            '#' + q.split(' ').slice(0, 2).join('').toLowerCase()
          ) || ['#fyp', '#viral'],
          hook: `POV: ${contentTitle.substring(0, 50)}...`,
          seoTitle: contentTitle
        },
        youtube: {
          platform: 'youtube',
          format: 'short video',
          aspectRatio: '9:16',
          duration: '60s',
          caption: data?.productionPlan?.narrative || contentDescription,
          hashtags: ['#shorts', '#youtubeshorts', ...(keywords?.map(k => `#${k}`) || [])],
          hook: contentTitle,
          seoTitle: contentTitle,
          seoDescription: data?.productionPlan?.narrative?.substring(0, 200) || contentDescription
        },
        twitter: {
          platform: 'twitter',
          format: 'text + media',
          aspectRatio: '16:9',
          caption: `${contentTitle}\n\n${contentDescription.substring(0, 200)}...`,
          hashtags: keywords?.slice(0, 5).map(k => `#${k}`) || ['#AI', '#Tech'],
          hook: contentTitle
        }
      };
      
      return strategy;
    } catch (error) {
      console.error('Error generating viral strategy:', error);
      toast.error('Failed to generate viral content strategy');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Track external share
  const trackShare = useCallback(async (
    contentType: ContentType,
    contentId: string,
    platform: SocialPlatform,
    optimizedContent?: PlatformOptimizedContent
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to track shares');
      return false;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('viral_content_shares')
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          platform,
          platform_optimized_content: optimizedContent || {}
        });
      
      if (error) throw error;
      
      // Update ZSMT with virality tracking
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'external_share',
        content_text: `Shared ${contentType} to ${platform}`,
        external_virality_score: 5 // Increment
      });
      
      toast.success(`Shared to ${platform}!`, {
        icon: '🚀',
        description: 'Track engagement in your analytics'
      });
      
      return true;
    } catch (error) {
      console.error('Error tracking share:', error);
      return false;
    }
  }, [user]);

  // Get share metrics
  const getShareMetrics = useCallback(async (): Promise<ShareMetrics | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await (supabase as any)
        .from('viral_content_shares')
        .select('platform, virality_score')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const platformBreakdown: Record<SocialPlatform, number> = {
        tiktok: 0,
        youtube: 0,
        instagram: 0,
        twitter: 0,
        linkedin: 0,
        whatsapp: 0,
        other: 0
      };
      
      let totalViralityScore = 0;
      (data as any[])?.forEach((share: any) => {
        platformBreakdown[share.platform as SocialPlatform]++;
        totalViralityScore += share.virality_score || 0;
      });
      
      const metrics: ShareMetrics = {
        totalShares: data?.length || 0,
        platformBreakdown,
        viralityScore: Math.min(100, totalViralityScore)
      };
      
      setShareMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      return null;
    }
  }, [user]);

  // Generate share links
  const getShareLinks = useCallback((content: string, url?: string) => {
    const encodedContent = encodeURIComponent(content);
    const encodedUrl = url ? encodeURIComponent(url) : '';
    
    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedContent}${url ? `&url=${encodedUrl}` : ''}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedContent}${url ? ` ${encodedUrl}` : ''}`,
      tiktok: 'tiktok://create', // Deep link (requires app)
      instagram: 'instagram://story-camera', // Deep link (requires app)
      youtube: 'https://www.youtube.com/upload' // Redirect to upload
    };
  }, []);

  // Copy to clipboard for manual sharing
  const copyForPlatform = useCallback(async (
    platform: SocialPlatform,
    optimizedContent: PlatformOptimizedContent
  ): Promise<boolean> => {
    try {
      const shareText = `${optimizedContent.caption}\n\n${optimizedContent.hashtags.join(' ')}`;
      await navigator.clipboard.writeText(shareText);
      
      toast.success(`Copied for ${platform}!`, {
        description: 'Paste directly into the app',
        icon: '📋'
      });
      
      return true;
    } catch (error) {
      console.error('Error copying:', error);
      toast.error('Failed to copy');
      return false;
    }
  }, []);

  return {
    isGenerating,
    shareMetrics,
    generateViralStrategy,
    trackShare,
    getShareMetrics,
    getShareLinks,
    copyForPlatform
  };
};
