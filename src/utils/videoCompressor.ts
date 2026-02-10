// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE VIDEO COMPRESSOR
// Compresses videos to 1MB / 59 seconds for loop uploads
// Uses Canvas + MediaRecorder API (no external libraries)
// ═══════════════════════════════════════════════════════════════════════════════

import { MEDIA_DIET_LIMITS, formatBytes, getVideoDuration } from './mediaCompression';

export interface VideoCompressionResult {
  success: boolean;
  file?: File;
  error?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  trimmed: boolean;
}

export interface VideoCompressionProgress {
  stage: 'loading' | 'analyzing' | 'compressing' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

// Supported output formats in order of preference
const OUTPUT_FORMATS = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
] as const;

// Get the best supported format
const getSupportedFormat = (): string => {
  for (const format of OUTPUT_FORMATS) {
    if (MediaRecorder.isTypeSupported(format)) {
      return format;
    }
  }
  return 'video/webm'; // Fallback
};

// Calculate target bitrate to achieve ~1MB for given duration
const calculateTargetBitrate = (durationSeconds: number): number => {
  const targetBytes = MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES * 0.9; // 90% of limit for safety
  const targetBits = targetBytes * 8;
  const bitrate = Math.floor(targetBits / durationSeconds);
  // Clamp between reasonable values (50kbps to 2Mbps)
  return Math.max(50000, Math.min(bitrate, 2000000));
};

// Compress video using Canvas + MediaRecorder
export const compressVideo = async (
  file: File,
  onProgress?: (progress: VideoCompressionProgress) => void
): Promise<VideoCompressionResult> => {
  const originalSize = file.size;
  
  const updateProgress = (stage: VideoCompressionProgress['stage'], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  try {
    updateProgress('loading', 0, 'Loading video...');

    // Create video element
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    // Load video
    const videoUrl = URL.createObjectURL(file);
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = videoUrl;
    });

    updateProgress('analyzing', 10, 'Analyzing video...');

    // Get duration and check if trimming needed
    let duration = video.duration;
    const needsTrimming = duration > MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS;
    const targetDuration = Math.min(duration, MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS);

    // Calculate dimensions (max 720p for compression)
    const maxWidth = 720;
    const maxHeight = 720;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    // Ensure even dimensions (required for video encoding)
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

    updateProgress('compressing', 20, `Resizing to ${width}x${height}...`);

    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Get supported format and calculate bitrate
    const mimeType = getSupportedFormat();
    const videoBitrate = calculateTargetBitrate(targetDuration);

    updateProgress('encoding', 30, 'Starting compression...');

    // Capture stream from canvas
    const stream = canvas.captureStream(24); // 24 FPS for smaller file

    // Create MediaRecorder with target bitrate
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
    });

    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Promise to handle recording completion
    const recordingComplete = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        resolve(blob);
      };
    });

    // Start recording
    mediaRecorder.start(100); // Collect data every 100ms

    // Play and render video to canvas
    video.currentTime = 0;
    await video.play();

    const startTime = Date.now();
    const renderFrame = () => {
      if (video.ended || video.currentTime >= targetDuration) {
        video.pause();
        mediaRecorder.stop();
        return;
      }

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Update progress
      const elapsed = (Date.now() - startTime) / 1000;
      const progressPercent = Math.min(90, 30 + (video.currentTime / targetDuration) * 60);
      updateProgress('encoding', progressPercent, `Encoding: ${Math.round(video.currentTime)}s / ${Math.round(targetDuration)}s`);

      // Continue rendering
      requestAnimationFrame(renderFrame);
    };

    renderFrame();

    // Wait for recording to complete
    const compressedBlob = await recordingComplete;
    
    // Clean up
    URL.revokeObjectURL(videoUrl);
    video.remove();

    updateProgress('complete', 95, 'Finalizing...');

    // Create compressed file
    const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const compressedFile = new File(
      [compressedBlob],
      `${baseName}_compressed.${extension}`,
      { type: mimeType.split(';')[0], lastModified: Date.now() }
    );

    const compressionRatio = originalSize / compressedFile.size;

    // Check if we achieved target size
    if (compressedFile.size > MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES) {
      // Try again with lower quality if still too large
      updateProgress('error', 100, 'Video still too large after compression');
      return {
        success: false,
        error: `Compressed video is ${formatBytes(compressedFile.size)}, still exceeds 1MB limit. Try a shorter video or lower resolution source.`,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio,
        duration: targetDuration,
        trimmed: needsTrimming,
      };
    }

    updateProgress('complete', 100, 'Compression complete!');

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio,
      duration: targetDuration,
      trimmed: needsTrimming,
    };
  } catch (error) {
    updateProgress('error', 0, 'Compression failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Video compression failed',
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      duration: 0,
      trimmed: false,
    };
  }
};

// Check if browser supports video compression
export const isVideoCompressionSupported = (): boolean => {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    OUTPUT_FORMATS.some(format => MediaRecorder.isTypeSupported(format))
  );
};

// Main function to process video with auto-compression
export const processVideoWithCompression = async (
  file: File,
  onProgress?: (progress: VideoCompressionProgress) => void
): Promise<VideoCompressionResult> => {
  const originalSize = file.size;

  // Check if compression is supported
  if (!isVideoCompressionSupported()) {
    return {
      success: false,
      error: 'Your browser does not support video compression. Please use Chrome, Firefox, or Edge.',
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      duration: 0,
      trimmed: false,
    };
  }

  // Get video duration first
  let duration: number;
  try {
    duration = await getVideoDuration(file);
  } catch {
    return {
      success: false,
      error: 'Could not read video file. Please try a different video.',
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      duration: 0,
      trimmed: false,
    };
  }

  // Check if video is already within limits
  const isWithinSizeLimit = file.size <= MEDIA_DIET_LIMITS.VIDEO_MAX_SIZE_BYTES;
  const isWithinDurationLimit = duration <= MEDIA_DIET_LIMITS.VIDEO_MAX_DURATION_SECONDS;

  if (isWithinSizeLimit && isWithinDurationLimit) {
    // No compression needed
    onProgress?.({ stage: 'complete', progress: 100, message: 'Video already optimized!' });
    return {
      success: true,
      file,
      originalSize,
      compressedSize: file.size,
      compressionRatio: 1,
      duration,
      trimmed: false,
    };
  }

  // Compress the video
  return compressVideo(file, onProgress);
};
