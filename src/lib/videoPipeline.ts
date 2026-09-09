/**
 * Video delivery pipeline.
 *
 * Uploaded videos are re-encoded in the browser into two renditions before they
 * ever reach storage, then served from the storage CDN with immutable, long
 * cache headers so repeat plays come from the edge instead of the origin:
 *
 *   - delivery rendition   : <= 720p, ~1.8 Mbps  (default playback)
 *   - low-bandwidth version: <= 360p, ~0.6 Mbps  (Save-Data / 2g / 3g)
 *
 * Every rendition is recorded in `public.video_assets` so playback can pick the
 * right file, and so we can measure how much bandwidth transcoding saved.
 *
 * Honest limitation: true server-side multi-bitrate HLS/DASH packaging needs a
 * dedicated transcoding service. This pipeline does real re-encoding, but it
 * runs on the uploader's device and produces progressive MP4/WebM files.
 */
import { supabase } from '@/integrations/supabase/client';
import { transcodeVideoForPreview } from '@/lib/mediaUtils';

/** One year, immutable — every object path is unique so it can never go stale. */
export const CDN_CACHE_CONTROL = '31536000';

export interface VideoProbe {
  width: number;
  height: number;
  duration: number;
}

export interface VideoRenditions {
  delivery: File;
  lowBandwidth: File | null;
  probe: VideoProbe | null;
  transcoded: boolean;
  sourceBytes: number;
  deliveredBytes: number;
}

export const probeVideo = (file: File): Promise<VideoProbe | null> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (value: VideoProbe | null) => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      resolve(value);
    };
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () =>
      finish({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 8000);
    video.src = url;
  });

/**
 * Produce the delivery renditions. Falls back to the original file whenever the
 * browser cannot re-encode — a member's upload is never blocked by transcoding.
 */
export async function prepareVideoRenditions(file: File): Promise<VideoRenditions> {
  const probe = await probeVideo(file);
  const duration = probe?.duration ?? 0;
  const longForm = duration > 300; // 5 minutes: re-encoding in-page would take too long

  let delivery = file;
  if (!longForm) {
    delivery = await transcodeVideoForPreview(file, {
      maxDurationSec: 300,
      minBytes: 2 * 1024 * 1024,
      maxHeight: 720,
      bitrate: 1_800_000,
    }).catch(() => file);
  }

  let lowBandwidth: File | null = null;
  if (!longForm && file.size > 8 * 1024 * 1024) {
    const small = await transcodeVideoForPreview(file, {
      maxDurationSec: 300,
      minBytes: 0,
      maxHeight: 360,
      bitrate: 600_000,
    }).catch(() => null);
    if (small && small !== file && small.size < delivery.size) lowBandwidth = small;
  }

  return {
    delivery,
    lowBandwidth,
    probe,
    transcoded: delivery !== file,
    sourceBytes: file.size,
    deliveredBytes: delivery.size,
  };
}

/** Upload a rendition with CDN cache headers. Returns its public URL. */
export async function uploadRendition(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from('posts').upload(path, file, {
    contentType: file.type || 'video/webm',
    cacheControl: CDN_CACHE_CONTROL,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
}

export interface VideoAssetInput {
  userId: string;
  postId?: string | null;
  storagePath: string;
  playbackUrl: string;
  lowBandwidthUrl?: string | null;
  posterUrl?: string | null;
  renditions: VideoRenditions;
}

/** Record the asset so playback can choose a rendition. Never throws. */
export async function registerVideoAsset(input: VideoAssetInput): Promise<void> {
  const { renditions } = input;
  const { error } = await supabase.from('video_assets').insert({
    user_id: input.userId,
    post_id: input.postId ?? null,
    storage_path: input.storagePath,
    playback_url: input.playbackUrl,
    low_bandwidth_url: input.lowBandwidthUrl ?? null,
    poster_url: input.posterUrl ?? null,
    width: renditions.probe?.width ?? null,
    height: renditions.probe?.height ?? null,
    duration_seconds: renditions.probe?.duration ?? null,
    source_bytes: renditions.sourceBytes,
    delivered_bytes: renditions.deliveredBytes,
    container: renditions.delivery.type || null,
    codec: renditions.delivery.type?.includes('vp9') ? 'vp9' : null,
    transcoded: renditions.transcoded,
  });
  if (error) console.warn('[videoPipeline] asset record failed', error.message);
}

/** True when the viewer is on a metered or slow connection. */
export function prefersLowBandwidth(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.effectiveType === '3g';
}

/** Pick the file a viewer should stream right now. */
export function pickPlaybackUrl(asset: { playback_url: string; low_bandwidth_url?: string | null }): string {
  if (asset.low_bandwidth_url && prefersLowBandwidth()) return asset.low_bandwidth_url;
  return asset.playback_url;
}
