// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERCEPTION HOOK - Multimodal Input Handler with DHF Integration
// Handles file uploads, validation, and perception API calls
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/utils/mediaCompression';

export interface PerceptionResult {
  success: boolean;
  analysis?: {
    objects: string[];
    scene: string;
    context: string;
    text_extracted: string | null;
    emotional_sentiment: string;
    colors: string[];
    entities: string[];
    summary: string;
    visual_tags: string[];
    person_present?: boolean;
    subject_identity?: 'account_holder' | 'other_person' | 'no_person' | 'unknown';
    identity_match_confidence?: number;
    identity_notes?: string;
  };
  zoe_response?: string;
  identity_prompt?: 'none' | 'offer_lock' | 'verified' | 'mismatch';
  has_locked_reference?: boolean;
  cross_referenced?: boolean;
  error?: string;
}

// Supported file types and limits
const SUPPORTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_DOCS = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const SUPPORTED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const useZoePerception = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<PerceptionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string; mediaType: 'image' | 'document' | 'video' } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be under 10MB', mediaType: 'image' };
    }

    if (SUPPORTED_IMAGES.includes(file.type)) {
      return { valid: true, mediaType: 'image' };
    }
    if (SUPPORTED_DOCS.includes(file.type)) {
      return { valid: true, mediaType: 'document' };
    }
    if (SUPPORTED_VIDEO.includes(file.type)) {
      return { valid: true, mediaType: 'video' };
    }

    return { valid: false, error: 'Unsupported file type. Use JPG, PNG, PDF, TXT, DOCX, or MP4.', mediaType: 'image' };
  }, []);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const processMedia = useCallback(async (
    file: File, 
    context?: string,
    crossReference: boolean = true
  ): Promise<PerceptionResult> => {
    setIsProcessing(true);
    
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return { success: false, error: validation.error };
      }

      // Compress images for efficiency
      let processedFile = file;
      if (validation.mediaType === 'image') {
        const compressionResult = await compressImage(file, 800); // Compress to 800KB max
        if (compressionResult.success && compressionResult.file) {
          processedFile = compressionResult.file;
        }
      }

      // Convert to base64
      const base64Data = await fileToBase64(processedFile);

      console.log('[Zoe Perception] Processing', validation.mediaType, ':', file.name);

      // Call perception endpoint
      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: {
          media_type: validation.mediaType,
          media_data: base64Data,
          file_name: file.name,
          context,
          cross_reference: crossReference,
        },
      });

      if (error) {
        console.error('[Zoe Perception] API error:', error);
        throw error;
      }

      const result: PerceptionResult = {
        success: data.success,
        analysis: data.analysis,
        zoe_response: data.zoe_response,
        identity_prompt: data.identity_prompt,
        has_locked_reference: data.has_locked_reference,
        cross_referenced: data.cross_referenced,
        error: data.error,
      };

      setLastResult(result);

      if (result.success) {
        toast.success('I see it now!', { 
          description: result.analysis?.emotional_sentiment ? `Feeling: ${result.analysis.emotional_sentiment}` : undefined 
        });
      }

      return result;

    } catch (error) {
      console.error('[Zoe Perception] Error:', error);
      const result: PerceptionResult = {
        success: false,
        error: 'I had a moment of visual uncertainty. Could you try again?',
        zoe_response: 'I seem to have experienced a minor cognitive flicker... Could you share that again?',
      };
      setLastResult(result);
      toast.error('Vision processing failed');
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, fileToBase64]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    processMedia,
    openFilePicker,
    fileInputRef,
    isProcessing,
    lastResult,
    clearResult,
    supportedTypes: [...SUPPORTED_IMAGES, ...SUPPORTED_DOCS, ...SUPPORTED_VIDEO].join(','),
  };
};
