// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: ZOE MULTI-MODAL VISION
// Enables Zoe to see and analyze images, documents, screenshots, and camera input
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VisionInputType = 
  | 'image'
  | 'screenshot'
  | 'camera'
  | 'document'
  | 'diagram'
  | 'receipt'
  | 'handwriting';

export interface VisionAnalysis {
  id: string;
  inputType: VisionInputType;
  
  // Content analysis
  description: string;
  detailedAnalysis?: string;
  extractedText?: string;
  detectedObjects?: string[];
  
  // Structured data extraction
  structuredData?: Record<string, unknown>;
  
  // Metadata
  analyzedAt: Date;
  processingTimeMs: number;
  confidence: number;
  
  // Source
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface VisionRequest {
  imageData: string; // Base64 or URL
  inputType?: VisionInputType;
  analysisPrompt?: string;
  extractStructuredData?: boolean;
  includeOCR?: boolean;
}

interface UseMultiModalVisionReturn {
  // State
  currentAnalysis: VisionAnalysis | null;
  isAnalyzing: boolean;
  recentAnalyses: VisionAnalysis[];
  
  // Actions
  analyzeImage: (request: VisionRequest) => Promise<VisionAnalysis | null>;
  analyzeFromCamera: () => Promise<VisionAnalysis | null>;
  analyzeScreenshot: (screenshotData: string) => Promise<VisionAnalysis | null>;
  getVisionContext: () => string;
  
  // Utilities
  clearCurrentAnalysis: () => void;
  captureFromCamera: () => Promise<string | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISION PROMPTS BY TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const VISION_PROMPTS: Record<VisionInputType, string> = {
  image: `Analyze this image comprehensively. Describe what you see, identify key elements, 
          and note any interesting details. If there's text, include it.`,
  
  screenshot: `Analyze this screenshot. Identify the application or website shown, 
               describe the UI elements visible, extract any important text or data, 
               and note what the user appears to be working on.`,
  
  camera: `Describe what you see in this camera image. Identify objects, people (without identifying individuals),
           text, and the overall scene. Note anything that might be relevant for conversation.`,
  
  document: `Analyze this document. Extract the main content, identify the document type,
             summarize key information, and note any important dates, names, or figures.`,
  
  diagram: `Analyze this diagram or chart. Explain what it represents, describe the relationships shown,
            extract any data points or labels, and summarize the key insights.`,
  
  receipt: `Analyze this receipt. Extract: merchant name, date, items with prices, subtotal, tax, 
            and total. Format as structured data.`,
  
  handwriting: `Read and transcribe this handwritten content. Note any text that's unclear.
                Also describe any drawings or diagrams if present.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useMultiModalVision = (): UseMultiModalVisionReturn => {
  const { user } = useAuth();
  const [currentAnalysis, setCurrentAnalysis] = useState<VisionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<VisionAnalysis[]>([]);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // Detect input type from image content
  // ═══════════════════════════════════════════════════════════════════════════
  
  const detectInputType = useCallback((imageData: string): VisionInputType => {
    // Simple heuristics - could be enhanced with AI
    const isUrl = imageData.startsWith('http');
    const isBase64 = imageData.startsWith('data:image');
    
    if (!isUrl && !isBase64) return 'image';
    
    // Check for common patterns in URL
    if (isUrl) {
      if (/screenshot|screen|capture/i.test(imageData)) return 'screenshot';
      if (/document|doc|pdf|scan/i.test(imageData)) return 'document';
      if (/receipt|invoice|bill/i.test(imageData)) return 'receipt';
    }
    
    return 'image';
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Main analysis function
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeImage = useCallback(async (request: VisionRequest): Promise<VisionAnalysis | null> => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      const inputType = request.inputType || detectInputType(request.imageData);
      const basePrompt = VISION_PROMPTS[inputType];
      
      // Build analysis prompt
      let analysisPrompt = basePrompt;
      
      if (request.analysisPrompt) {
        analysisPrompt = `${basePrompt}\n\nAdditional focus: ${request.analysisPrompt}`;
      }
      
      if (request.includeOCR) {
        analysisPrompt += '\n\nIMPORTANT: Extract ALL visible text exactly as written.';
      }
      
      if (request.extractStructuredData) {
        analysisPrompt += '\n\nExtract structured data where applicable (dates, amounts, names, etc.)';
      }
      
      // Prepare image URL for API
      let imageUrl = request.imageData;
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        imageUrl = `data:image/jpeg;base64,${request.imageData}`;
      }
      
      // Call edge function for vision analysis
      const { data, error } = await supabase.functions.invoke('zoe-infinity-vision', {
        body: {
          imageUrl,
          prompt: analysisPrompt,
          inputType,
          extractStructuredData: request.extractStructuredData,
        },
      });
      
      if (error) {
        console.error('[MultiModalVision] Analysis failed:', error);
        throw error;
      }
      
      const processingTimeMs = Date.now() - startTime;
      
      const analysis: VisionAnalysis = {
        id: `vision-${Date.now()}`,
        inputType,
        description: data.description || 'Image analyzed',
        detailedAnalysis: data.detailedAnalysis,
        extractedText: data.extractedText,
        detectedObjects: data.detectedObjects,
        structuredData: data.structuredData,
        analyzedAt: new Date(),
        processingTimeMs,
        confidence: data.confidence || 0.8,
        imageUrl: request.imageData.substring(0, 100), // Store truncated reference
      };
      
      setCurrentAnalysis(analysis);
      setRecentAnalyses(prev => [analysis, ...prev.slice(0, 9)]);
      
      // Log to memory if user authenticated
      if (user?.id) {
        await supabase.from('zoe_infinity_memories').insert({
          user_id: user.id,
          memory_type: 'insight',
          key: `vision_${inputType}`,
          value: analysis.description.substring(0, 500),
          context: `Vision analysis (${inputType}): ${analysis.detailedAnalysis?.substring(0, 200) || ''}`,
          importance_score: 6,
        });
      }
      
      console.log(`[MultiModalVision] Analysis complete in ${processingTimeMs}ms`);
      
      return analysis;
      
    } catch (e) {
      console.error('[MultiModalVision] Error:', e);
      
      // Return fallback analysis
      const fallbackAnalysis: VisionAnalysis = {
        id: `vision-error-${Date.now()}`,
        inputType: request.inputType || 'image',
        description: 'I received the image but had trouble analyzing it. Could you describe what you\'re showing me?',
        analyzedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        confidence: 0,
      };
      
      setCurrentAnalysis(fallbackAnalysis);
      return fallbackAnalysis;
      
    } finally {
      setIsAnalyzing(false);
    }
  }, [user?.id, detectInputType]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Capture from camera
  // ═══════════════════════════════════════════════════════════════════════════
  
  const captureFromCamera = useCallback(async (): Promise<string | null> => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      videoRef.current = video;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });
      
      // Small delay to ensure frame is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      // Return base64 image
      return canvas.toDataURL('image/jpeg', 0.8);
      
    } catch (e) {
      console.error('[MultiModalVision] Camera capture failed:', e);
      
      // Clean up stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      return null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Analyze from camera
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeFromCamera = useCallback(async (): Promise<VisionAnalysis | null> => {
    const imageData = await captureFromCamera();
    
    if (!imageData) {
      console.error('[MultiModalVision] No camera image captured');
      return null;
    }
    
    return analyzeImage({
      imageData,
      inputType: 'camera',
    });
  }, [captureFromCamera, analyzeImage]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Analyze screenshot
  // ═══════════════════════════════════════════════════════════════════════════
  
  const analyzeScreenshot = useCallback(async (screenshotData: string): Promise<VisionAnalysis | null> => {
    return analyzeImage({
      imageData: screenshotData,
      inputType: 'screenshot',
      includeOCR: true,
    });
  }, [analyzeImage]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Get vision context for brain injection
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getVisionContext = useCallback((): string => {
    if (!currentAnalysis) return '';
    
    const parts: string[] = [];
    
    parts.push(`[VISION CONTEXT] Recent ${currentAnalysis.inputType} analysis:`);
    parts.push(`Description: ${currentAnalysis.description}`);
    
    if (currentAnalysis.extractedText) {
      parts.push(`Extracted text: "${currentAnalysis.extractedText.substring(0, 300)}"`);
    }
    
    if (currentAnalysis.detectedObjects && currentAnalysis.detectedObjects.length > 0) {
      parts.push(`Objects detected: ${currentAnalysis.detectedObjects.slice(0, 10).join(', ')}`);
    }
    
    if (currentAnalysis.structuredData) {
      parts.push(`Structured data: ${JSON.stringify(currentAnalysis.structuredData).substring(0, 200)}`);
    }
    
    return parts.join('\n');
  }, [currentAnalysis]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Clear current analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  const clearCurrentAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
  }, []);

  return {
    currentAnalysis,
    isAnalyzing,
    recentAnalyses,
    analyzeImage,
    analyzeFromCamera,
    analyzeScreenshot,
    getVisionContext,
    clearCurrentAnalysis,
    captureFromCamera,
  };
};

export default useMultiModalVision;
