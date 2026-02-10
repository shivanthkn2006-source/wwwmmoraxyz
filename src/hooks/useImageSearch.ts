import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImageAnalysisResult {
  success: boolean;
  analysis?: {
    emotion?: string;
    intensity?: number;
    patterns?: string[];
    context?: string;
    objects?: string[];
    scene?: string;
    text?: string;
    colors?: string[];
    mood?: string;
    category?: string;
    product?: string;
    brand?: string;
    condition?: string;
    issues?: string[];
    recommendations?: string[];
  };
  error?: string;
}

export const useImageSearch = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);

  const analyzeImage = useCallback(async (
    imageData: string,
    analysisType: 'face' | 'content' | 'product' = 'content'
  ): Promise<ImageAnalysisResult> => {
    setIsAnalyzing(true);
    
    try {
      console.log('Analyzing image with type:', analysisType);
      
      const { data, error } = await supabase.functions.invoke('analyze-face-emotion', {
        body: {
          image: imageData,
          analysisType: analysisType
        }
      });

      if (error) {
        console.error('Image analysis error:', error);
        
        if (error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded', {
            description: 'Please wait a moment before analyzing another image.'
          });
        } else if (error.message?.includes('credits exhausted')) {
          toast.error('AI credits exhausted', {
            description: 'Please add more credits to continue using image analysis.'
          });
        } else {
          toast.error('Image analysis failed', {
            description: error.message || 'Failed to analyze image'
          });
        }
        
        const result: ImageAnalysisResult = {
          success: false,
          error: error.message
        };
        setAnalysisResult(result);
        return result;
      }

      const result: ImageAnalysisResult = {
        success: data.success,
        analysis: data.analysis,
        error: data.error
      };

      setAnalysisResult(result);
      
      if (result.success) {
        toast.success('Image analyzed successfully', {
          description: 'AI vision analysis completed successfully'
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      const result: ImageAnalysisResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setAnalysisResult(result);
      toast.error('Analysis failed', {
        description: 'Failed to analyze image'
      });
      return result;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeImageFromFile = useCallback(async (
    file: File,
    analysisType: 'face' | 'content' | 'product' = 'content'
  ): Promise<ImageAnalysisResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        const result = await analyzeImage(base64Image, analysisType);
        resolve(result);
      };
      
      reader.onerror = () => {
        const result: ImageAnalysisResult = {
          success: false,
          error: 'Failed to read image file'
        };
        setAnalysisResult(result);
        toast.error('File read error', {
          description: 'Failed to read image file'
        });
        resolve(result);
      };
      
      reader.readAsDataURL(file);
    });
  }, [analyzeImage]);

  const clearResult = useCallback(() => {
    setAnalysisResult(null);
  }, []);

  return {
    analyzeImage,
    analyzeImageFromFile,
    isAnalyzing,
    analysisResult,
    clearResult
  };
};
