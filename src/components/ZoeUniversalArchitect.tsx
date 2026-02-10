import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Wand2, Download, Search, DollarSign, FileText, ChevronDown, Paperclip, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { 
  createSpeechRecognition, 
  stopSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '@/utils/micPermissionManager';

interface ProductionPlan {
  themeTitle: string;
  narrative: string;
  visualDesign: string;
  audioDesign: string;
  environmentContext: string;
  sourcingQueries: string[];
  estimatedProductionIndex?: {
    tier1Core: string;
    tier2Premier: string;
    authorizeProcurement: string;
  };
}

interface ZoeUniversalArchitectProps {
  userInterests?: string[];
}

const ZoeUniversalArchitect = ({ userInterests = [] }: ZoeUniversalArchitectProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productionPlan, setProductionPlan] = useState<ProductionPlan | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isTextBoxExpanded, setIsTextBoxExpanded] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isParsingDocument, setIsParsingDocument] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported document formats
  const supportedFormats = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
    '.json', '.xml', '.md', '.html'
  ].join(',');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 20MB' });
      return;
    }

    setAttachedFile(file);
    toast.success('Document attached', { 
      description: file.name,
      icon: '📎'
    });
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseDocumentContent = async (file: File): Promise<string> => {
    setIsParsingDocument(true);
    try {
      // For text-based files, read directly
      const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.html'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (textExtensions.includes(fileExt)) {
        return await file.text();
      }

      // For binary documents (PDF, DOCX, etc.), convert to base64 and send to AI for analysis
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result); // Keep full data URL for vision API
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Use Zoe's perception to analyze document
      const { data, error } = await supabase.functions.invoke('zoe-perception', {
        body: {
          media_type: 'document',
          media_data: base64,
          file_name: file.name,
          context: 'Extract all text content from this document for creative production planning.'
        }
      });

      if (error) {
        console.error('Document parsing error:', error);
        throw new Error('Failed to parse document');
      }

      return data?.analysis?.text_extracted || data?.analysis?.summary || data?.zoe_response || 'Document content could not be extracted.';
    } finally {
      setIsParsingDocument(false);
    }
  };

  const handleTextSubmitWithAttachment = async () => {
    if (!textInput.trim() && !attachedFile) {
      toast.error('Please enter a prompt or attach a document');
      return;
    }

    setIsTextBoxExpanded(false);
    
    let finalPrompt = textInput;
    
    if (attachedFile) {
      toast.info('Processing document...', { icon: '📄' });
      try {
        const documentContent = await parseDocumentContent(attachedFile);
        finalPrompt = textInput.trim() 
          ? `${textInput}\n\n--- ATTACHED DOCUMENT CONTENT ---\n${documentContent}`
          : `Create a production plan based on this document:\n\n${documentContent}`;
      } catch (error) {
        toast.error('Failed to parse document', { 
          description: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }
    
    await processDanceProduction(finalPrompt);
    setTextInput('');
    removeAttachment();
  };

  // Initialize speech recognition using centralized manager
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const recognition = createSpeechRecognition({
        continuous: false,
        interimResults: false,
        keepAlive: false, // Single-shot mode
      });
      
      if (recognition) {
        const originalOnStart = recognition.onstart;
        recognition.onstart = (event: any) => {
          setIsListening(true);
          toast.success('Zoe is listening...', { 
            description: 'Describe your creative vision',
            icon: '🎭'
          });
          if (originalOnStart) originalOnStart.call(recognition, event);
        };

        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setIsListening(false);
          await processDanceProduction(text);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
            toast.error('Voice recognition failed', { description: 'Please try again' });
          }
          setIsListening(false);
        };

        // Override onend to prevent auto-restart
        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        stopSpeechRecognition(recognitionRef.current);
      }
    };
  }, []);

  const toggleVoiceInput = async () => {
    if (!recognitionRef.current && !isSpeechRecognitionSupported()) {
      toast.error('Voice input not supported', { 
        description: 'Your browser does not support voice recognition' 
      });
      return;
    }

    // Reinitialize if needed
    if (!recognitionRef.current) {
      const recognition = createSpeechRecognition({
        continuous: false,
        interimResults: false,
        keepAlive: false,
      });
      if (recognition) {
        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setIsListening(false);
          await processDanceProduction(text);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }

    if (isListening) {
      stopSpeechRecognition(recognitionRef.current);
      setIsListening(false);
    } else {
      try {
        setProductionPlan(null);
        setImageUrl(null);
        setTranscript('');
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        toast.error('Could not start voice input');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!productionPlan) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Add watermark to every page
    const addWatermark = () => {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      
      // Diagonal watermarks across the page
      for (let y = 20; y < pageHeight; y += 40) {
        for (let x = 0; x < pageWidth; x += 80) {
          doc.text('Visual Concept by Zoe', x, y, { angle: 45 });
        }
      }
    };

    let currentY = margin;

    // Helper to add new page with watermark
    const addPage = () => {
      doc.addPage();
      addWatermark();
      currentY = margin;
    };

    // Add watermark to first page
    addWatermark();

    // Title Section
    doc.setFontSize(24);
    doc.setTextColor(88, 28, 135); // Primary color
    doc.setFont('helvetica', 'bold');
    doc.text('ZOE ARCHITECT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('PRODUCTION PLAN', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Theme Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const themeTitleLines = doc.splitTextToSize(productionPlan.themeTitle, contentWidth);
    doc.text(themeTitleLines, margin, currentY);
    currentY += themeTitleLines.length * 7 + 10;

    // Narrative Arc
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    const narrativeLines = doc.splitTextToSize(productionPlan.narrative, contentWidth);
    doc.text(narrativeLines, margin, currentY);
    currentY += narrativeLines.length * 5 + 15;

    // Visual Design Section
    if (currentY > pageHeight - 50) addPage();
    
    doc.setFontSize(14);
    doc.setTextColor(88, 28, 135);
    doc.setFont('helvetica', 'bold');
    doc.text('VISUAL DESIGN', margin, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const visualLines = doc.splitTextToSize(productionPlan.visualDesign, contentWidth);
    visualLines.forEach((line: string) => {
      if (currentY > pageHeight - 20) addPage();
      doc.text(line, margin, currentY);
      currentY += 5;
    });
    currentY += 10;

    // Add Generated Image if available
    if (imageUrl) {
      if (currentY > pageHeight - 120) addPage();
      
      try {
        // Add image with proper sizing to fit page
        const imgWidth = contentWidth;
        const imgHeight = 100; // Fixed height in mm
        doc.addImage(imageUrl, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
      } catch (error) {
        console.error('Error adding image to PDF:', error);
      }
    }

    // Audio Design Section
    if (currentY > pageHeight - 50) addPage();
    
    doc.setFontSize(14);
    doc.setTextColor(88, 28, 135);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIO DESIGN', margin, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const audioLines = doc.splitTextToSize(productionPlan.audioDesign, contentWidth);
    audioLines.forEach((line: string) => {
      if (currentY > pageHeight - 20) addPage();
      doc.text(line, margin, currentY);
      currentY += 5;
    });
    currentY += 10;

    // Technical Specifications
    if (currentY > pageHeight - 50) addPage();
    
    doc.setFontSize(14);
    doc.setTextColor(88, 28, 135);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICAL SPECIFICATIONS', margin, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const techLines = doc.splitTextToSize(productionPlan.environmentContext, contentWidth);
    techLines.forEach((line: string) => {
      if (currentY > pageHeight - 20) addPage();
      doc.text(line, margin, currentY);
      currentY += 5;
    });
    currentY += 10;

    // Sourcing Queries
    if (productionPlan.sourcingQueries && productionPlan.sourcingQueries.length > 0) {
      if (currentY > pageHeight - 50) addPage();
      
      doc.setFontSize(14);
      doc.setTextColor(88, 28, 135);
      doc.setFont('helvetica', 'bold');
      doc.text('SOURCING & BUDGET VALIDATION', margin, currentY);
      currentY += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      productionPlan.sourcingQueries.forEach((query, idx) => {
        if (currentY > pageHeight - 20) addPage();
        const queryLines = doc.splitTextToSize(`${idx + 1}. ${query}`, contentWidth - 5);
        queryLines.forEach((line: string) => {
          doc.text(line, margin + 5, currentY);
          currentY += 5;
        });
        currentY += 3;
      });
      currentY += 10;
    }

    // Estimated Production Index
    if (productionPlan.estimatedProductionIndex) {
      if (currentY > pageHeight - 80) addPage();
      
      doc.setFontSize(14);
      doc.setTextColor(88, 28, 135);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTIMATED PRODUCTION INDEX (EPI)', margin, currentY);
      currentY += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('TIER 1 (CORE):', margin, currentY);
      currentY += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const tier1Lines = doc.splitTextToSize(productionPlan.estimatedProductionIndex.tier1Core, contentWidth);
      tier1Lines.forEach((line: string) => {
        if (currentY > pageHeight - 20) addPage();
        doc.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TIER 2 (PREMIER):', margin, currentY);
      currentY += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const tier2Lines = doc.splitTextToSize(productionPlan.estimatedProductionIndex.tier2Premier, contentWidth);
      tier2Lines.forEach((line: string) => {
        if (currentY > pageHeight - 20) addPage();
        doc.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(88, 28, 135);
      doc.setFont('helvetica', 'bold');
      const authLines = doc.splitTextToSize(productionPlan.estimatedProductionIndex.authorizeProcurement, contentWidth);
      authLines.forEach((line: string) => {
        if (currentY > pageHeight - 20) addPage();
        doc.text(line, margin, currentY);
        currentY += 5;
      });
    }

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Generated by Zoe Architect - ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save PDF
    doc.save(`zoe-architect-${productionPlan.themeTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);

    toast.success('PDF downloaded!', {
      description: '4K quality with image and watermarks',
      icon: '📄'
    });
  };

  const handleDownloadProductionPlan = () => {
    if (!productionPlan) return;

    const documentContent = `
═══════════════════════════════════════════════════════════════
                    ZOE ARCHITECT PRODUCTION PLAN
═══════════════════════════════════════════════════════════════

THEME TITLE:
${productionPlan.themeTitle}

NARRATIVE ARC:
${productionPlan.narrative}

═══════════════════════════════════════════════════════════════
                          VISUAL DESIGN
═══════════════════════════════════════════════════════════════

${productionPlan.visualDesign}

═══════════════════════════════════════════════════════════════
                          AUDIO DESIGN
═══════════════════════════════════════════════════════════════

${productionPlan.audioDesign}

═══════════════════════════════════════════════════════════════
                    TECHNICAL SPECIFICATIONS
═══════════════════════════════════════════════════════════════

${productionPlan.environmentContext}

═══════════════════════════════════════════════════════════════
                  SOURCING & BUDGET VALIDATION
═══════════════════════════════════════════════════════════════

${productionPlan.sourcingQueries.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

${productionPlan.estimatedProductionIndex ? `
═══════════════════════════════════════════════════════════════
              ESTIMATED PRODUCTION INDEX (EPI)
═══════════════════════════════════════════════════════════════

TIER 1 (CORE):
${productionPlan.estimatedProductionIndex.tier1Core}

TIER 2 (PREMIER):
${productionPlan.estimatedProductionIndex.tier2Premier}

${productionPlan.estimatedProductionIndex.authorizeProcurement}
` : ''}
═══════════════════════════════════════════════════════════════
                   14-SECOND VIDEO CREATOR PROMPTS
═══════════════════════════════════════════════════════════════

PRIMARY VISUAL PROMPT:
${productionPlan.visualDesign.split('\n').slice(0, 3).join(' ')}

AUDIO PROMPT:
${productionPlan.audioDesign.split('\n')[0]}

ENVIRONMENT SETTING:
${productionPlan.environmentContext.split('\n')[0]}

═══════════════════════════════════════════════════════════════
Generated by Zoe Architect - AI Creative Production Designer
Date: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════════════
    `.trim();

    const blob = new Blob([documentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoe-architect-${productionPlan.themeTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Production plan downloaded!', {
      description: 'Includes video creator prompts',
      icon: '📥'
    });
  };

  const handleTextSubmit = async () => {
    await handleTextSubmitWithAttachment();
  };

  const processDanceProduction = async (userInput: string) => {
    setIsProcessing(true);
    toast.info('Zoe is architecting...', {
      description: 'Creating your visionary production',
      icon: '✨'
    });

    try {
      const { data, error } = await supabase.functions.invoke('zoe-universal-architect', {
        body: { 
          userInput,
          userInterests 
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached', {
            description: 'Please wait a moment before creating more productions.',
          });
          return;
        }
        if (error.message?.includes('402')) {
          toast.error('Credits required', {
            description: 'Please add credits to continue using Zoe.',
          });
          return;
        }
        console.error('Zoe Architect error:', error);
        throw error;
      }

      // Validate the response data
      if (!data?.productionPlan) {
        throw new Error('No production plan received from Zoe');
      }

      const plan = data.productionPlan;
      
      // Validate required fields
      if (!plan.themeTitle || !plan.narrative || !plan.visualDesign || 
          !plan.audioDesign || !plan.environmentContext || !plan.sourcingQueries) {
        console.error('Invalid production plan structure:', plan);
        throw new Error('Invalid production plan structure received');
      }
      
      // Log EPI validation
      if (plan.estimatedProductionIndex) {
        console.log('EPI received:', plan.estimatedProductionIndex);
      }

      // Validate sourcingQueries is an array
      if (!Array.isArray(plan.sourcingQueries)) {
        console.error('sourcingQueries is not an array:', plan.sourcingQueries);
        plan.sourcingQueries = [];
      }

      setProductionPlan(plan);
      setImageUrl(data.imageUrl || null);
      
      // Auto-save to drafts
      const savedDrafts = localStorage.getItem('webdrop_drafts');
      const drafts = savedDrafts ? JSON.parse(savedDrafts) : [];
      
      const newDraft = {
        id: `zoe-${Date.now()}`,
        type: 'zoe-architect' as const,
        content: plan.themeTitle,
        timestamp: Date.now(),
        zoeData: {
          themeTitle: plan.themeTitle,
          narrative: plan.narrative,
          visualDesign: plan.visualDesign,
          audioDesign: plan.audioDesign,
          environmentContext: plan.environmentContext,
          sourcingQueries: plan.sourcingQueries || [],
          estimatedProductionIndex: plan.estimatedProductionIndex,
          imageUrl: data.imageUrl || undefined,
          userInput: userInput
        }
      };
      
      drafts.unshift(newDraft);
      localStorage.setItem('webdrop_drafts', JSON.stringify(drafts));
      
      if (data.error) {
        toast.warning('Partial Success', { description: data.error });
      } else {
        toast.success('Production complete!', {
          description: 'Auto-saved to drafts',
          icon: '🎨'
        });
      }
    } catch (error) {
      console.error('Zoe Architect production error:', error);
      toast.error('Failed to create production', {
        description: error instanceof Error ? error.message : 'Zoe encountered an error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3">
            Zoe Architect
          </h1>
          <p className="text-muted-foreground text-lg">
            Transform your vision into creative reality across all domains
          </p>
        </motion.div>
      </div>

      {/* Voice Input Section */}
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulsing glow effect */}
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-gpu-ring-scale-pulse" />
          )}
          
          {/* Main mic button */}
          <Button
            onClick={toggleVoiceInput}
            disabled={isProcessing}
            title="Start voice input"
            className={`
              relative w-32 h-32 rounded-full shadow-2xl
              bg-gradient-to-br from-primary/90 via-primary to-accent/90
              hover:from-primary hover:via-accent hover:to-primary
              border-2 border-primary/20
              backdrop-blur-xl
              transition-all duration-300
              ${isListening ? 'ring-4 ring-primary/50 ring-offset-4 ring-offset-background' : ''}
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            ) : isListening ? (
              <MicOff className="w-12 h-12 text-primary-foreground animate-pulse" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </Button>
        </motion.div>

        {/* Status text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={isProcessing ? 'processing' : isListening ? 'listening' : 'idle'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 text-lg font-medium text-foreground/80"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                Designing your production...
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 animate-bounce" />
                Listening to your vision...
              </span>
            ) : (
              'Tap to share your creative concept'
            )}
          </motion.p>
        </AnimatePresence>

        {transcript && !productionPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 px-6 py-3 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 max-w-2xl"
          >
            <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
          </motion.div>
        )}

        {/* Expandable Text Input Box */}
        <motion.div 
          className="mt-8 max-w-2xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            animate={{ 
              height: isTextBoxExpanded ? 'auto' : '60px',
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/40 via-background/60 to-primary/5 backdrop-blur-xl border border-primary/20 shadow-2xl"
          >
            {!isTextBoxExpanded ? (
              <button
                onClick={() => setIsTextBoxExpanded(true)}
                disabled={isProcessing}
                className="w-full h-full px-6 py-4 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="text-sm font-medium">Click to type or paste your creative vision...</span>
                <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </button>
            ) : (
              <div className="p-6 space-y-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={supportedFormats}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Describe your creative concept in detail or attach a document..."
                  disabled={isProcessing || isParsingDocument}
                  className="w-full min-h-[200px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 resize-none text-sm leading-relaxed"
                  autoFocus
                />
                
                {/* Attached File Preview */}
                {attachedFile && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20"
                  >
                    <File className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground flex-1 truncate">{attachedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(attachedFile.size / 1024).toFixed(1)}KB
                    </span>
                    <Button
                      onClick={removeAttachment}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
                
                <div className="flex items-center justify-between gap-3">
                  {/* Attach Button */}
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing || isParsingDocument}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach Document
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => {
                        setIsTextBoxExpanded(false);
                        setTextInput('');
                        removeAttachment();
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTextSubmit}
                      disabled={(!textInput.trim() && !attachedFile) || isProcessing || isParsingDocument}
                      className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
                    >
                      {isParsingDocument ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Production Plan Display */}
      <AnimatePresence>
        {productionPlan && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5 }}
            className="px-6 pb-12 max-w-7xl mx-auto"
          >
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Text Content */}
              <div className="space-y-6">
                {/* Theme Title */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background/80 to-accent/10 backdrop-blur-xl border border-primary/20 shadow-xl"
                >
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                    {productionPlan.themeTitle}
                  </h2>
                  <p className="text-muted-foreground italic">
                    {productionPlan.narrative}
                  </p>
                </motion.div>

                {/* Visual Design */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Visual Design
                  </h3>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                    {productionPlan.visualDesign}
                  </p>
                </motion.div>

                {/* Audio Design */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Audio Design
                  </h3>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                    {productionPlan.audioDesign}
                  </p>
                </motion.div>

                {/* Technical Specs & Sourcing */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Technical Specs</h4>
                    <p className="text-sm text-foreground/80">{productionPlan.environmentContext}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20">
                    <h4 className="text-sm font-semibold text-primary mb-3">Sourcing & Budget Validation</h4>
                    {productionPlan.sourcingQueries && productionPlan.sourcingQueries.length > 0 ? (
                      <ul className="space-y-2">
                        {productionPlan.sourcingQueries.map((query, idx) => (
                          <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-primary font-bold">{idx + 1}.</span>
                            <span>{query}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No sourcing queries generated</p>
                    )}
                  </div>
                  
                  {/* Estimated Production Index (EPI) */}
                  {productionPlan.estimatedProductionIndex && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-6 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm border-2 border-primary/30 shadow-lg"
                    >
                      <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Estimated Production Index (EPI)
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-background/80 backdrop-blur-sm border border-primary/20">
                          <h5 className="font-semibold text-primary mb-2 flex items-center gap-2">
                            <span className="text-xs bg-primary/20 px-2 py-1 rounded">Tier 1</span>
                            Core Production
                          </h5>
                          <p className="text-sm text-foreground/80">{productionPlan.estimatedProductionIndex.tier1Core}</p>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-background/80 backdrop-blur-sm border border-accent/20">
                          <h5 className="font-semibold text-accent mb-2 flex items-center gap-2">
                            <span className="text-xs bg-accent/20 px-2 py-1 rounded">Tier 2</span>
                            Premier Production
                          </h5>
                          <p className="text-sm text-foreground/80">{productionPlan.estimatedProductionIndex.tier2Premier}</p>
                        </div>
                        
                        <div className="p-4 mt-4 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 backdrop-blur-sm border border-primary/40">
                          <p className="text-center font-bold text-primary text-sm">
                            {productionPlan.estimatedProductionIndex.authorizeProcurement}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Generated Image */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-card/50 backdrop-blur-xl">
                    <img 
                      src={imageUrl} 
                      alt={productionPlan.themeTitle}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    {/* Watermark */}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 font-medium">
                      Generated by Zoe
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-muted/30 bg-muted/20 backdrop-blur-sm p-12 text-center">
                    <Sparkles className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Visual concept unavailable</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center justify-center gap-4"
            >
              {/* Download Text Button - Compact Translucent Design */}
              <Button
                onClick={handleDownloadProductionPlan}
                className="bg-background/20 backdrop-blur-xl border border-primary/30 hover:bg-background/30 hover:border-primary/50 text-foreground px-6 py-3 rounded-xl shadow-lg transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>

              {/* Download PDF Button - Compact Translucent Design */}
              <Button
                onClick={handleDownloadPDF}
                className="bg-background/20 backdrop-blur-xl border border-accent/30 hover:bg-background/30 hover:border-accent/50 text-foreground px-6 py-3 rounded-xl shadow-lg transition-all"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>

              {/* Create New Vision Button */}
              <Button
                onClick={toggleVoiceInput}
                disabled={isProcessing || isListening}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg"
              >
                <Wand2 className="w-5 h-5 mr-2" />
                Create New Vision
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZoeUniversalArchitect;
