// ═══════════════════════════════════════════════════════════════════════════════
// USE DOCUMENT X-RAY - Hook for document upload and analysis
// Phase 2: The Analysis Gap - Chat with your documents
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface DocumentAnalysis {
  extractedText: string;
  summary: string;
  keyPoints: string[];
  documentType: string;
  wordCount: number;
  language: string;
}

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  analysis: DocumentAnalysis;
  uploadedAt: Date;
}

interface UseDocumentXrayReturn {
  // State
  isUploading: boolean;
  isAnalyzing: boolean;
  uploadedDocuments: UploadedDocument[];
  activeDocument: UploadedDocument | null;
  
  // Actions
  uploadDocument: (file: File) => Promise<UploadedDocument | null>;
  clearActiveDocument: () => void;
  getDocumentContext: () => string;
  
  // Supported formats
  supportedFormats: string[];
}

const SUPPORTED_FORMATS = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useDocumentXray(): UseDocumentXrayReturn {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<UploadedDocument | null>(null);

  const uploadDocument = useCallback(async (file: File): Promise<UploadedDocument | null> => {
    // Validate file
    if (!SUPPORTED_FORMATS.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Unsupported file format', {
        description: 'Please upload a PDF, image, or text file.',
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB.',
      });
      return null;
    }

    setIsUploading(true);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('analysisType', 'full');
      if (user?.id) {
        formData.append('userId', user.id);
      }

      console.log(`[DocumentXray] Uploading: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoe-document-xray`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.analysis) {
        throw new Error(data.error || 'Analysis failed');
      }

      const uploadedDoc: UploadedDocument = {
        id: data.documentId || `doc-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        analysis: data.analysis,
        uploadedAt: new Date(),
      };

      setUploadedDocuments(prev => [...prev, uploadedDoc]);
      setActiveDocument(uploadedDoc);

      console.log(`[DocumentXray] ✓ Analyzed: ${data.analysis.wordCount} words, ${data.analysis.keyPoints.length} key points`);

      toast.success('Document analyzed', {
        description: `${data.analysis.wordCount} words extracted. Ask me anything about it!`,
      });

      return uploadedDoc;

    } catch (error) {
      console.error('[DocumentXray] Upload error:', error);
      toast.error('Document analysis failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      return null;

    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }, [user?.id]);

  const clearActiveDocument = useCallback(() => {
    setActiveDocument(null);
  }, []);

  /**
   * Get document context for injection into AI prompts
   * Returns a formatted string of the active document's content
   */
  const getDocumentContext = useCallback((): string => {
    if (!activeDocument) return '';

    const { analysis, fileName } = activeDocument;
    
    // Truncate text if too long for context window
    const maxTextLength = 15000;
    const truncatedText = analysis.extractedText.length > maxTextLength
      ? analysis.extractedText.substring(0, maxTextLength) + '\n\n[Document truncated...]'
      : analysis.extractedText;

    return `
═══ UPLOADED DOCUMENT: ${fileName} ═══
Type: ${analysis.documentType}
Words: ${analysis.wordCount}

SUMMARY:
${analysis.summary}

KEY POINTS:
${analysis.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

FULL TEXT:
${truncatedText}
═══════════════════════════════════════
`;
  }, [activeDocument]);

  return {
    isUploading,
    isAnalyzing,
    uploadedDocuments,
    activeDocument,
    uploadDocument,
    clearActiveDocument,
    getDocumentContext,
    supportedFormats: SUPPORTED_FORMATS,
  };
}

export default useDocumentXray;
