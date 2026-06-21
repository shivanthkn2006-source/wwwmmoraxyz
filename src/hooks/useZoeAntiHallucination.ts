// ═══════════════════════════════════════════════════════════════════════════════
// useZoeAntiHallucination — Unified Foundation Layer
// One hook to opt any feature into the 5 anti-hallucination protocols.
// NO UI changes — purely functional layer Zoe Infinity flows can call into.
//
// USAGE (existing flows wire in 1 line, no UI changes):
//   const ah = useZoeAntiHallucination();
//   const { temperature, requireCritique } = ah.profileQuery(query);
//   const verified = await ah.verifyImage(imageUrl, prompt);
//   const anchor = await ah.anchorVideo(prompt);
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  classifyDeterminism,
  getCritiqueRouting,
  type DeterminismProfile,
} from '@/core/inference/Determinism';

export interface ImageVerifyResult {
  match: boolean;
  score: number;
  missing_elements: string[];
  suggestions: string[];
  skipped?: boolean;
}

export interface VideoAnchorResult {
  success: boolean;
  anchorFrame: string | null;
  frameScore: number;
  frameVerified: boolean;
  motionPrompt: string;
}

export interface AntiHallucinationMetrics {
  totalProfiled: number;
  factualCount: number;
  creativeCount: number;
  imagesVerified: number;
  imagesRejected: number;
  videosAnchored: number;
}

export function useZoeAntiHallucination() {
  const metricsRef = useRef<AntiHallucinationMetrics>({
    totalProfiled: 0,
    factualCount: 0,
    creativeCount: 0,
    imagesVerified: 0,
    imagesRejected: 0,
    videosAnchored: 0,
  });

  // ── 1. Determinism profiling ───────────────────────────────────────────
  const profileQuery = useCallback((query: string): DeterminismProfile & {
    routing: ReturnType<typeof getCritiqueRouting>;
  } => {
    const profile = classifyDeterminism(query);
    metricsRef.current.totalProfiled++;
    if (profile.mode === 'factual') metricsRef.current.factualCount++;
    if (profile.mode === 'creative') metricsRef.current.creativeCount++;
    return { ...profile, routing: getCritiqueRouting(profile.mode) };
  }, []);

  // ── 3. Image verification (post-generation) ────────────────────────────
  const verifyImage = useCallback(async (
    imageUrl: string,
    originalPrompt: string,
    strict = false,
  ): Promise<ImageVerifyResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-image-verify', {
        body: { imageUrl, originalPrompt, strict },
      });
      if (error) {
        console.warn('[AntiHall] image verify error, fail-open', error);
        return { match: true, score: 0.5, missing_elements: [], suggestions: [], skipped: true };
      }
      metricsRef.current.imagesVerified++;
      if (!data.match) metricsRef.current.imagesRejected++;
      return data as ImageVerifyResult;
    } catch (e) {
      console.warn('[AntiHall] image verify exception, fail-open', e);
      return { match: true, score: 0.5, missing_elements: [], suggestions: [], skipped: true };
    }
  }, []);

  // ── 4. Video anchoring (pre-generation) ────────────────────────────────
  const anchorVideo = useCallback(async (
    prompt: string,
    referenceImageUrl?: string,
    duration = 5,
  ): Promise<VideoAnchorResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-video-anchor', {
        body: { prompt, referenceImageUrl, duration },
      });
      if (error) {
        console.warn('[AntiHall] video anchor error, fail-open', error);
        return {
          success: false,
          anchorFrame: null,
          frameScore: 0,
          frameVerified: false,
          motionPrompt: prompt,
        };
      }
      metricsRef.current.videosAnchored++;
      return data as VideoAnchorResult;
    } catch (e) {
      console.warn('[AntiHall] video anchor exception, fail-open', e);
      return {
        success: false,
        anchorFrame: null,
        frameScore: 0,
        frameVerified: false,
        motionPrompt: prompt,
      };
    }
  }, []);

  // ── 5. Citation prompt builder (client-side helper) ────────────────────
  const buildCitationGuard = useCallback((profile: DeterminismProfile): string => {
    if (!profile.requireCitations) return '';
    return `\n\n[Anti-Hallucination Guard]
- Append [Source: <URL or "training_data">] after every factual claim.
- If uncertain, prefix with "Unverified:" instead of guessing.
- Never invent dates, names, statistics, or URLs.`;
  }, []);

  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

  return {
    // Layer 1: Determinism
    profileQuery,
    // Layer 2: Cross-model critique routing (consumed by edge fns)
    getCritiqueRouting,
    // Layer 3: Image verification
    verifyImage,
    // Layer 4: Video anchoring
    anchorVideo,
    // Layer 5: Citation enforcement
    buildCitationGuard,
    // Telemetry
    getMetrics,
  };
}

export default useZoeAntiHallucination;
