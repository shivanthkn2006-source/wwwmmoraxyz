// ═══════════════════════════════════════════════════════════════════════════════
// ZOE TUBE SIGHT - YouTube Video Analysis Hook
// Enables Zoe to "watch" YouTube videos via transcript analysis
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface YouTubeAnalysis {
  videoId: string;
  title: string | null;
  author: string | null;
  thumbnail: string | null;
  hasTranscript: boolean;
  contentType: 'transcript' | 'metadata';
  analysis: string;
  processingTimeMs: number;
}

interface UseZoeTubeSightReturn {
  isAnalyzing: boolean;
  lastAnalysis: YouTubeAnalysis | null;
  analyzeVideo: (url: string) => Promise<YouTubeAnalysis | null>;
  detectYouTubeLinks: (text: string) => string[];
  error: string | null;
}

// Regex patterns to detect YouTube URLs in text
const YOUTUBE_PATTERNS = [
  /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+(?:&[^\s]*)?/g,
  /https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+(?:\?[^\s]*)?/g,
  /https?:\/\/(?:www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/g,
  /https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+/g,
  /https?:\/\/m\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+(?:&[^\s]*)?/g,
];

export const useZoeTubeSight = (): UseZoeTubeSightReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<YouTubeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect YouTube links in text
  const detectYouTubeLinks = useCallback((text: string): string[] => {
    const links: Set<string> = new Set();
    
    for (const pattern of YOUTUBE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => links.add(match.split(/\s/)[0])); // Clean up any trailing spaces
      }
    }
    
    return Array.from(links);
  }, []);

  // Analyze a YouTube video
  const analyzeVideo = useCallback(async (url: string): Promise<YouTubeAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    console.log('[TubeSight] Starting video analysis:', url);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-youtube', {
        body: { url },
      });
      
      if (invokeError) {
        console.error('[TubeSight] Edge function error:', invokeError);
        setError(invokeError.message || 'Failed to analyze video');
        toast.error('Failed to analyze video', {
          description: invokeError.message,
        });
        return null;
      }
      
      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown analysis error';
        console.error('[TubeSight] Analysis failed:', errorMsg);
        setError(errorMsg);
        toast.error('Video analysis failed', {
          description: errorMsg,
        });
        return null;
      }
      
      const analysis: YouTubeAnalysis = {
        videoId: data.videoId,
        title: data.title,
        author: data.author,
        thumbnail: data.thumbnail,
        hasTranscript: data.hasTranscript,
        contentType: data.contentType,
        analysis: data.analysis,
        processingTimeMs: data.processingTimeMs,
      };
      
      console.log('[TubeSight] Analysis complete:', {
        videoId: analysis.videoId,
        title: analysis.title,
        hasTranscript: analysis.hasTranscript,
        timeMs: analysis.processingTimeMs,
      });
      
      setLastAnalysis(analysis);
      
      toast.success('🎬 Zoe watched the video!', {
        description: analysis.hasTranscript 
          ? `Analyzed ${Math.round(analysis.processingTimeMs / 1000)}s of content`
          : 'Used metadata (no transcript available)',
      });
      
      return analysis;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unexpected error';
      console.error('[TubeSight] Unexpected error:', err);
      setError(errorMsg);
      toast.error('Error analyzing video', {
        description: errorMsg,
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    lastAnalysis,
    analyzeVideo,
    detectYouTubeLinks,
    error,
  };
};

// Export types for use in other components
export type { YouTubeAnalysis };
