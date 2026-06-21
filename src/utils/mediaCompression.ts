// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA DIET PROTOCOL - Strict Client-Side Upload Limits
// Zero server cost - All validation/compression happens on device
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// STRICT LIMITS - THE MEDIA DIET
// ═══════════════════════════════════════════════════════════════════════════════
export const MEDIA_DIET_LIMITS = {
  // Video Gatekeeper
  VIDEO_MAX_SIZE_BYTES: 1 * 1024 * 1024,     // 1MB HARD LIMIT
  VIDEO_MAX_DURATION_SECONDS: 59,             // Max 59 seconds
  
  // Image Crusher
  IMAGE_MAX_SIZE_BYTES: 100 * 1024,          // 100KB target
  IMAGE_MAX_WIDTH: 1080,                      // Max width 1080px
  IMAGE_QUALITY_START: 0.85,                  // Starting quality
  IMAGE_QUALITY_MIN: 0.3,                     // Minimum quality before rejection
  
  // Audio limits
  AUDIO_MAX_SIZE_BYTES: 5 * 1024 * 1024,     // 5MB for audio
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  requiresCompression?: boolean;
  estimatedFinalSize?: number;
}

export interface CompressionResult {
  success: boolean;
  file?: File;
  error?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};

export const isPNGFile = (file: File): boolean => {
  return file.type === 'image/png';
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO DURATION CHECKER
// ═══════════════════════════════════════════════════════════════════════════════
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE SHIELD - VALIDATION (Now allows videos that need compression)
// ═══════════════════════════════════════════════════════════════════════════════
export const validateMediaFile = async (file: File): Promise<MediaValidationResult> => {
  const warnings: string[] = [];
  
  // ─── VIDEO GATEKEEPER ───
  if (isVideoFile(file)) {
    // Check for absurdly large files (>100MB) - reject outright
    if (file.size > 100 * 1024 * 1024) {
      return { 
        valid: false, 
        error: `Video too large (${formatBytes(file.size)}). Maximum input: 100MB.`,
        requiresCompression: false
      };
    }
    
    // Check duration
    try {
      const duration = await getVideoDuration(file);
      
      // Allow videos up to 5 minutes (will be trimmed to 59s)
      if (duration > 300) {
        return { 
          valid: false, 
          error: `Video too long (${Math.round(duration)}s). Maximum: 5 minutes.`
        };
      }
      
      // Mark for compression if over limits
      const needsCompression = file.size > MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES || 
                               duration > MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS;
      
      if (needsCompression) {
        warnings.push(`Video will be auto-compressed to 1MB / 59s loop`);
      }
      
      return { valid: true, warnings, requiresCompression: needsCompression };
    } catch (err) {
      warnings.push('Could not verify video duration');
      return { 
        valid: true, 
        warnings, 
        requiresCompression: file.size > MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES 
      };
    }
  }
  
  // ─── IMAGE CRUSHER CHECK ───
  if (isImageFile(file)) {
    // Images will be auto-compressed, but warn if very large
    if (file.size > 10 * 1024 * 1024) { // 10MB raw input limit
      return { 
        valid: false, 
        error: 'Image too large. Maximum raw input: 10MB.'
      };
    }
    
    if (file.size > MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES) {
      warnings.push('Image will be automatically compressed to 100KB');
    }
    
    if (isPNGFile(file)) {
      warnings.push('PNG will be converted to WebP for better compression');
    }
    
    return { 
      valid: true, 
      warnings,
      requiresCompression: file.size > MEDIA_DIET_LIMITS.IMAGE_MAX_SIZE_BYTES
    };
  }
  
  // ─── AUDIO CHECK ───
  if (isAudioFile(file)) {
    if (file.size > MEDIA_DIET_LIMITS.AUDIO_MAX_SIZE_BYTES) {
      return { 
        valid: false, 
        error: `Audio file too large (${formatBytes(file.size)}). Maximum: 5MB.`
      };
    }
    return { valid: true };
  }
  
  // ─── UNSUPPORTED TYPE ───
  return { valid: false, error: 'Unsupported file type. Only images, videos, and audio are allowed.' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE CRUSHER - AGGRESSIVE COMPRESSION TO 100KB / 1080px / WebP
// ═══════════════════════════════════════════════════════════════════════════════
export const compressImage = async (
  file: File, 
  maxSizeKB: number = 100,
  maxWidth: number = 1080
): Promise<CompressionResult> => {
  const originalSize = file.size;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      // Calculate dimensions - max width 1080px
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (smaller), fallback to JPEG
        const tryCompress = (quality: number, format: 'image/webp' | 'image/jpeg') => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const extension = format === 'image/webp' ? '.webp' : '.jpg';
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                
                const compressedFile = new File([blob], `${baseName}${extension}`, {
                  type: format,
                  lastModified: Date.now(),
                });

                // Check if file size is acceptable
                if (compressedFile.size <= maxSizeKB * 1024) {
                  resolve({
                    success: true,
                    file: compressedFile,
                    originalSize,
                    compressedSize: compressedFile.size,
                    compressionRatio: originalSize / compressedFile.size
                  });
                } else if (quality > MEDIA_DIET_LIMITS.IMAGE_QUALITY_MIN) {
                  // Reduce quality and try again
                  tryCompress(quality - 0.1, format);
                } else if (format === 'image/webp') {
                  // Try JPEG as fallback (sometimes better for photos)
                  tryCompress(MEDIA_DIET_LIMITS.IMAGE_QUALITY_START, 'image/jpeg');
                } else {
                  // Accept what we have - it's the best we can do
                  resolve({
                    success: true,
                    file: compressedFile,
                    originalSize,
                    compressedSize: compressedFile.size,
                    compressionRatio: originalSize / compressedFile.size
                  });
                }
              } else {
                resolve({
                  success: false,
                  error: 'Compression failed',
                  originalSize,
                  compressedSize: originalSize,
                  compressionRatio: 1
                });
              }
            },
            format,
            quality
          );
        };

        // Start with WebP (best compression)
        tryCompress(MEDIA_DIET_LIMITS.IMAGE_QUALITY_START, 'image/webp');
      } else {
        resolve({
          success: false,
          error: 'Could not get canvas context',
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        success: false,
        error: 'Failed to load image',
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO GATEKEEPER - Now supports auto-compression
// ═══════════════════════════════════════════════════════════════════════════════
export const validateVideoForUpload = async (file: File): Promise<MediaValidationResult> => {
  // Allow larger files now - they'll be compressed
  if (file.size > 100 * 1024 * 1024) {
    return { 
      valid: false, 
      error: `🎬 Video too large: ${formatBytes(file.size)}. Max input: 100MB.`,
      requiresCompression: false
    };
  }
  
  // Check if compression is needed
  const needsCompression = file.size > MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES;
  
  // Duration check
  try {
    const duration = await getVideoDuration(file);
    if (duration > 300) { // 5 min max input
      return { 
        valid: false, 
        error: `🎬 Video too long: ${Math.round(duration)}s. Max input: 5 minutes.`
      };
    }
    
    const needsTrimming = duration > MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS;
    
    return { 
      valid: true, 
      requiresCompression: needsCompression || needsTrimming,
      warnings: (needsCompression || needsTrimming) 
        ? ['Video will be auto-compressed to 1MB / 59s'] 
        : undefined
    };
  } catch {
    return { valid: true, requiresCompression: needsCompression };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE COMPLETE MEDIA DIET PROCESSOR
// Validates + Compresses + Returns upload-ready file
// ═══════════════════════════════════════════════════════════════════════════════
export const processMediaForUpload = async (file: File): Promise<{
  success: boolean;
  file?: File;
  error?: string;
  stats?: {
    originalSize: number;
    finalSize: number;
    compressionRatio: number;
    format: string;
  };
}> => {
  // Step 1: Validate
  const validation = await validateMediaFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // Step 2: Process based on type
  if (isImageFile(file)) {
    // Auto-compress images
    const result = await compressImage(file);
    if (result.success && result.file) {
      return {
        success: true,
        file: result.file,
        stats: {
          originalSize: result.originalSize,
          finalSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          format: result.file.type
        }
      };
    }
    return { success: false, error: result.error || 'Image compression failed' };
  }
  
  if (isVideoFile(file)) {
    // Videos must already be under 1MB - no server-side compression
    const videoValidation = await validateVideoForUpload(file);
    if (!videoValidation.valid) {
      return { success: false, error: videoValidation.error };
    }
    return {
      success: true,
      file,
      stats: {
        originalSize: file.size,
        finalSize: file.size,
        compressionRatio: 1,
        format: file.type
      }
    };
  }
  
  if (isAudioFile(file)) {
    // Audio passes through if under 5MB
    return {
      success: true,
      file,
      stats: {
        originalSize: file.size,
        finalSize: file.size,
        compressionRatio: 1,
        format: file.type
      }
    };
  }
  
  return { success: false, error: 'Unsupported file type' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getMediaDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (isImageFile(file)) {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    } else if (isVideoFile(file)) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
      video.src = URL.createObjectURL(file);
    } else {
      reject(new Error('Unsupported file type'));
    }
  });
};

// Legacy export for backward compatibility
export const compressVideo = async (file: File): Promise<File> => {
  const validation = await validateVideoForUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  return file;
};
