// ═══════════════════════════════════════════════════════════════════════════════
// USE MEDIA UPLOAD HOOK - THE MEDIA DIET ENFORCER
// Zero server cost - All validation/compression on client
// Now with AUTO VIDEO COMPRESSION to 1MB/59s loops!
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  processMediaForUpload, 
  validateMediaFile,
  formatBytes,
  isVideoFile,
  MEDIA_DIET_LIMITS 
} from '@/utils/mediaCompression';
import { 
  processVideoWithCompression, 
  isVideoCompressionSupported,
  VideoCompressionProgress 
} from '@/utils/videoCompressor';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  stats?: {
    originalSize: number;
    finalSize: number;
    compressionRatio: number;
    format: string;
  };
}

interface UseMediaUploadOptions {
  bucket: string;
  folder?: string;
  onProgress?: (progress: number) => void;
  showToasts?: boolean;
}

export const useMediaUpload = (options: UseMediaUploadOptions) => {
  const { bucket, folder = '', onProgress, showToasts = true } = options;
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── THE SHIELD: Pre-upload validation ───
  const validateFile = useCallback(async (file: File) => {
    const result = await validateMediaFile(file);
    
    if (!result.valid && showToasts) {
      toast.error('Upload blocked', {
        description: result.error,
        duration: 5000
      });
    }
    
    if (result.warnings?.length && showToasts) {
      result.warnings.forEach(warning => {
        toast.info(warning, { duration: 3000 });
      });
    }
    
    return result;
  }, [showToasts]);

  // ─── THE MAIN UPLOAD FUNCTION ───
  const uploadMedia = useCallback(async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Validate first (THE SHIELD)
      const validation = await validateFile(file);
      if (!validation.valid) {
        const result = { success: false, error: validation.error };
        setLastResult(result);
        return result;
      }

      setProgress(5);
      onProgress?.(5);

      let processedFile: File = file;
      let compressionStats: { originalSize: number; finalSize: number; compressionRatio: number; format: string } | undefined;

      // Step 2: Handle video compression if needed
      if (isVideoFile(file) && validation.requiresCompression) {
        if (!isVideoCompressionSupported()) {
          if (showToasts) {
            toast.error('Video compression not supported', {
              id: 'media-upload',
              description: 'Please use Chrome, Firefox, or Edge browser'
            });
          }
          const result = { success: false, error: 'Browser does not support video compression' };
          setLastResult(result);
          return result;
        }

        if (showToasts) {
          toast.loading('🎬 Compressing video to 1MB loop...', { id: 'media-upload' });
        }

        const videoResult = await processVideoWithCompression(file, (progress: VideoCompressionProgress) => {
          const mappedProgress = 5 + (progress.progress * 0.4); // 5-45%
          setProgress(mappedProgress);
          onProgress?.(mappedProgress);
          
          if (showToasts && progress.stage !== 'complete') {
            toast.loading(`🎬 ${progress.message}`, { id: 'media-upload' });
          }
        });

        if (!videoResult.success || !videoResult.file) {
          if (showToasts) {
            toast.error('Video compression failed', {
              id: 'media-upload',
              description: videoResult.error
            });
          }
          const result = { success: false, error: videoResult.error };
          setLastResult(result);
          return result;
        }

        processedFile = videoResult.file;
        compressionStats = {
          originalSize: videoResult.originalSize,
          finalSize: videoResult.compressedSize,
          compressionRatio: videoResult.compressionRatio,
          format: processedFile.type
        };

        if (showToasts && videoResult.trimmed) {
          toast.info('Video trimmed to 59 seconds', { duration: 3000 });
        }
      } else {
        // Step 2b: Process images/audio (existing logic)
        if (showToasts) {
          toast.loading('Processing media...', { id: 'media-upload' });
        }

        const processed = await processMediaForUpload(file);
        
        if (!processed.success || !processed.file) {
          if (showToasts) {
            toast.error('Processing failed', { 
              id: 'media-upload',
              description: processed.error 
            });
          }
          const result = { success: false, error: processed.error };
          setLastResult(result);
          return result;
        }

        processedFile = processed.file;
        compressionStats = processed.stats;
      }

      setProgress(50);
      onProgress?.(50);

      // Step 3: Upload to storage
      const timestamp = Date.now();
      const safeFileName = processedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = folder 
        ? `${folder}/${timestamp}_${safeFileName}`
        : `${timestamp}_${safeFileName}`;

      if (showToasts) {
        toast.loading('Uploading...', { id: 'media-upload' });
      }

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (showToasts) {
          toast.error('Upload failed', { 
            id: 'media-upload',
            description: uploadError.message 
          });
        }
        const result = { success: false, error: uploadError.message };
        setLastResult(result);
        return result;
      }

      setProgress(90);
      onProgress?.(90);

      // Step 4: Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      onProgress?.(100);

      const compressionInfo = compressionStats && compressionStats.compressionRatio > 1 
        ? ` (${formatBytes(compressionStats.originalSize)} → ${formatBytes(compressionStats.finalSize)})`
        : '';

      if (showToasts) {
        toast.success('Upload complete!' + compressionInfo, { 
          id: 'media-upload',
          duration: 3000
        });
      }

      const result: UploadResult = {
        success: true,
        url: urlData.publicUrl,
        stats: compressionStats
      };
      setLastResult(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (showToasts) {
        toast.error('Upload failed', { 
          id: 'media-upload',
          description: errorMessage 
        });
      }
      const result = { success: false, error: errorMessage };
      setLastResult(result);
      return result;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [bucket, folder, onProgress, showToasts, validateFile]);

  // ─── BATCH UPLOAD ───
  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await uploadMedia(file);
      results.push(result);
      
      // Stop on first failure if desired
      // if (!result.success) break;
    }
    
    return results;
  }, [uploadMedia]);

  // ─── CANCEL UPLOAD ───
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setProgress(0);
      if (showToasts) {
        toast.info('Upload cancelled');
      }
    }
  }, [showToasts]);

  // ─── GET LIMITS INFO ───
  const getLimitsInfo = useCallback(() => ({
    video: {
      maxSize: formatBytes(MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES),
      maxDuration: `${MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS} seconds`,
      raw: MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES
    },
    image: {
      maxSize: formatBytes(MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES),
      maxWidth: `${MEDIA_DIET_LIMITS.IMAGE_MAX_WIDTH}px`,
      autoCompress: true,
      raw: MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES
    },
    audio: {
      maxSize: formatBytes(MEDIA_DIET_LIMITS.AUDIO_MAX_SIZE_BYTES),
      raw: MEDIA_DIET_LIMITS.AUDIO_MAX_SIZE_BYTES
    }
  }), []);

  return {
    // State
    isUploading,
    progress,
    lastResult,
    
    // Actions
    uploadMedia,
    uploadMultiple,
    validateFile,
    cancelUpload,
    
    // Info
    getLimitsInfo,
    limits: MEDIA_DIET_LIMITS
  };
};

export default useMediaUpload;
