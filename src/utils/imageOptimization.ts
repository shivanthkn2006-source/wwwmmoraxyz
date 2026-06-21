// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE OPTIMIZATION UTILITY
// Uses Supabase Image Transformation for compressed mobile-optimized images
// Reduces bandwidth and improves load times for Dream Artifacts & Digital Clones
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

// Device breakpoints for responsive images
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1280,
  large: 1920,
};

/**
 * Get optimized image URL from Supabase Storage with transformations
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param options - Transformation options
 */
export const getOptimizedImageUrl = (
  bucket: string,
  path: string,
  options: ImageTransformOptions = {}
): string => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover',
  } = options;

  // Get base public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  
  // Build transform query params manually for full control
  const transforms: string[] = [];
  if (width) transforms.push(`width=${width}`);
  if (height) transforms.push(`height=${height}`);
  if (quality) transforms.push(`quality=${quality}`);
  if (format) transforms.push(`format=${format}`);
  if (resize) transforms.push(`resize=${resize}`);

  // Append render transform endpoint
  if (transforms.length > 0) {
    const transformQuery = transforms.join('&');
    return `${data.publicUrl}?${transformQuery}`;
  }

  return data.publicUrl;
};

/**
 * Get responsive image srcSet for different viewport sizes
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param baseQuality - Base quality (default 80)
 */
export const getResponsiveImageSrcSet = (
  bucket: string,
  path: string,
  baseQuality: number = 80
): string => {
  const sizes = [
    { width: BREAKPOINTS.mobile, suffix: '480w' },
    { width: BREAKPOINTS.tablet, suffix: '768w' },
    { width: BREAKPOINTS.desktop, suffix: '1280w' },
    { width: BREAKPOINTS.large, suffix: '1920w' },
  ];

  return sizes
    .map(({ width, suffix }) => {
      const url = getOptimizedImageUrl(bucket, path, {
        width,
        quality: baseQuality,
        format: 'webp',
      });
      return `${url} ${suffix}`;
    })
    .join(', ');
};

/**
 * Get viewport-appropriate image width
 */
export const getViewportImageWidth = (): number => {
  if (typeof window === 'undefined') return BREAKPOINTS.desktop;
  
  const width = window.innerWidth;
  
  if (width <= BREAKPOINTS.mobile) return BREAKPOINTS.mobile;
  if (width <= BREAKPOINTS.tablet) return BREAKPOINTS.tablet;
  if (width <= BREAKPOINTS.desktop) return BREAKPOINTS.desktop;
  return BREAKPOINTS.large;
};

/**
 * Get optimized image for current viewport
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param quality - Image quality (default 80)
 */
export const getViewportOptimizedImage = (
  bucket: string,
  path: string,
  quality: number = 80
): string => {
  const width = getViewportImageWidth();
  return getOptimizedImageUrl(bucket, path, {
    width,
    quality,
    format: 'webp',
  });
};

/**
 * Preload critical images for faster LCP
 * @param urls - Array of image URLs to preload
 */
export const preloadCriticalImages = (urls: string[]): void => {
  if (typeof document === 'undefined') return;
  
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Compress base64 image for upload
 * @param base64 - Base64 encoded image
 * @param maxWidth - Maximum width (default 1920)
 * @param quality - Compression quality 0-1 (default 0.8)
 */
export const compressBase64Image = async (
  base64: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if wider than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP for best compression
      const compressed = canvas.toDataURL('image/webp', quality);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
};

/**
 * Check if image needs compression based on size
 * @param sizeInBytes - File size in bytes
 * @param maxSizeKB - Maximum size in KB (default 500)
 */
export const needsCompression = (
  sizeInBytes: number,
  maxSizeKB: number = 500
): boolean => {
  return sizeInBytes > maxSizeKB * 1024;
};

// Export breakpoints for external use
export { BREAKPOINTS };
