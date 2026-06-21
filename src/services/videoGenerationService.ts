/**
 * ═══════════════════════════════════════════════════════════════
 * VIDEO GENERATION SERVICE - Zoe video generation
 * ═══════════════════════════════════════════════════════════════
 * 
 * Routes through edge function which uses stored API keys.
 * Fallback chain:
 * 1. Pollinations Seedance (via edge function w/ API key)
 * 2. Pollinations Veo (via edge function w/ API key)
 * 3. Pollinations image fallback (free, no key)
 * 4. Gemini image fallback
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

export interface VideoGenResult {
  videoUrl: string;
  provider: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isImageFallback?: boolean;
}

/**
 * Generate video via edge function (handles auth + fallback chain)
 */
export async function generateVideo(
  prompt: string,
  timeoutMs = 120000
): Promise<VideoGenResult> {
  console.log('[VideoGen] Requesting video:', prompt.slice(0, 60));

  // ── Anti-Hallucination Layer 4: Frame anchoring (fail-open) ──
  // Locks first frame + composes motion-only prompt to kill drift.
  let videoPrompt = prompt;
  let referenceImageUrl: string | undefined;
  try {
    const { data: anchor } = await supabase.functions.invoke('zoe-video-anchor', {
      body: { prompt, duration: 6 },
    });
    if (anchor?.success && anchor.frameVerified && anchor.motionPrompt) {
      videoPrompt = anchor.motionPrompt;
      referenceImageUrl = anchor.anchorFrame ?? undefined;
      console.log('[VideoGen] ⚓ Frame anchored, score:', anchor.frameScore);
    }
  } catch (e) {
    console.warn('[VideoGen] anchor skipped (fail-open)', e);
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-video', {
      body: { prompt: videoPrompt, model: 'seedance', duration: 6, referenceImageUrl },
    });

    if (error) {
      console.error('[VideoGen] Edge function error:', error);
      throw new Error(error.message || 'Edge function failed');
    }

    if (data?.success && data?.videoUrl) {
      console.log(`[VideoGen] ✅ Success via ${data.provider}`);
      return {
        videoUrl: data.videoUrl,
        provider: data.provider,
        isImageFallback: data.isImageFallback || false,
        durationSeconds: data.isImageFallback ? undefined : 6,
      };
    }

    throw new Error(data?.error || 'No video returned');
  } catch (e) {
    console.error('[VideoGen] All providers failed:', e);

    // Last-resort: client-side Pollinations image (free endpoint)
    try {
      const { generateImage } = await import('@/services/pollinationsService');
      const imgResult = await generateImage(
        `cinematic ${prompt}, dynamic motion blur, film still`,
        { width: 640, height: 360, timeoutMs: 15000 }
      );
      console.log('[VideoGen] ⚠️ Client-side image fallback');
      return {
        videoUrl: imgResult.imageUrl,
        provider: 'animated-fallback',
        thumbnailUrl: imgResult.imageUrl,
        isImageFallback: true,
      };
    } catch (fallbackErr) {
      console.error('[VideoGen] Client fallback also failed:', fallbackErr);
    }

    throw new Error('All video generation providers failed');
  }
}

export default { generateVideo };
