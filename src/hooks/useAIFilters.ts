import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FilterConfig } from '@/components/AIFilterPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// AI FILTERS HOOK - Google Gemini Powered (No HuggingFace)
// Uses Gemini Vision via edge functions for AI-powered image processing
// ═══════════════════════════════════════════════════════════════════════════════

export const useAIFilters = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [filteredImageUrl, setFilteredImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const applyAIFilter = useCallback(async (
    imageUrl: string,
    filter: FilterConfig
  ): Promise<string | null> => {
    setIsProcessing(true);
    try {
      // Convert image URL to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Build the prompt based on filter type
      let prompt = '';
      switch (filter.type) {
        case 'text-prompt':
          prompt = `Apply this artistic effect to the image: ${filter.prompt}. Preserve the main subject while adding the filter effect.`;
          break;
        case 'background-remove':
          prompt = `Remove the background and replace with ${filter.style || 'transparent background'}. Keep the main subject intact.`;
          break;
        case 'context-aware':
          prompt = `Analyze this image and ${filter.prompt}. Apply intelligent enhancements based on scene context.`;
          break;
        case 'holographic':
          prompt = `Apply ${filter.style} holographic effect to create a futuristic 3D appearance.`;
          break;
        case 'time-based':
          prompt = `Create a time-lapse or multi-dimensional effect on this image.`;
          break;
      }

      // Call AI to process the image (uses Gemini Vision via edge function)
      const { data, error } = await supabase.functions.invoke('apply-ai-filter', {
        body: {
          imageData: base64,
          prompt,
          filterType: filter.type,
          intensity: filter.intensity || 0.8
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setFilteredImageUrl(data.imageUrl);
        toast({
          title: "Filter Applied!",
          description: "AI filter processed successfully.",
        });
        return data.imageUrl;
      }

      throw new Error('No image returned from AI');

    } catch (error: any) {
      console.error('Filter error:', error);
      
      if (error?.message?.includes('RATE_LIMIT')) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please wait a moment.",
          variant: "destructive",
        });
      } else if (error?.message?.includes('NO_CREDITS')) {
        toast({
          title: "No Credits",
          description: "Please add credits to continue using AI filters.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Filter Failed",
          description: "Could not apply AI filter. Please try again.",
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const applyBackgroundRemoval = useCallback(async (
    imageUrl: string
  ): Promise<string | null> => {
    // Use AI-based background removal via edge function (Gemini Vision)
    setIsProcessing(true);
    try {
      // Call the AI filter with background removal config
      return await applyAIFilter(imageUrl, {
        type: 'background-remove',
        style: 'transparent',
      });
    } catch (error) {
      console.error('Background removal error:', error);
      toast({
        title: "Processing Failed",
        description: "Could not remove background. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, applyAIFilter]);

  return {
    isProcessing,
    filteredImageUrl,
    applyAIFilter,
    applyBackgroundRemoval,
    clearFilter: () => setFilteredImageUrl(null),
  };
};
