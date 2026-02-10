import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Volume2, ChevronRight, ChevronLeft, Moon, Brain, Download } from 'lucide-react';
import { speakAsZoe } from '@/utils/zoeVoice';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

/**
 * ZOE DREAMS TUTORIAL - ANIMATED PENCIL CARTOON STYLE
 * 
 * Interactive tutorial with black & white pencil-drawn visuals
 * Comprehensive voice commands and AI analysis demonstrations
 */

interface TutorialStep {
  title: string;
  description: string;
  voiceCommands: string[];
  advancedCommands: string[];
  imagePrompt: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Zoe Dreams AI',
    description: 'Discover the hidden patterns in your dreams through advanced AI analysis. Zoe helps you understand your subconscious mind and emotional patterns.',
    voiceCommands: [
      'Hey Zoe, open dreams',
      'Hey Zoe, analyze my dream',
      'Hey Zoe, show dream journal'
    ],
    advancedCommands: [
      'Hey Zoe, identify recurring dream themes',
      'Hey Zoe, analyze emotional patterns',
      'Hey Zoe, predict future dream scenarios'
    ],
    imagePrompt: 'Black and white pencil sketch cartoon style: Person sleeping with thought bubbles showing dreams, moon and stars above, simple line art, hand-drawn aesthetic, peaceful night scene'
  },
  {
    title: 'Dream Recording & Journaling',
    description: 'Record your dreams through text or voice input. The more detail you provide, the deeper insights Zoe can reveal about your subconscious patterns.',
    voiceCommands: [
      'Hey Zoe, record my dream',
      'Hey Zoe, save dream entry',
      'Hey Zoe, show my dream history'
    ],
    advancedCommands: [
      'Hey Zoe, transcribe voice dream recording',
      'Hey Zoe, auto-detect dream emotions',
      'Hey Zoe, extract symbolic meanings'
    ],
    imagePrompt: 'Black and white pencil sketch: Hand writing in journal with dream symbols floating around (clouds, stairs, doors), cartoon style simple line art, journaling aesthetic'
  },
  {
    title: 'AI-Powered Dream Analysis',
    description: 'Zoe uses advanced neural networks to analyze dream symbols, identify emotional themes, and reveal psychological insights about your inner world.',
    voiceCommands: [
      'Hey Zoe, analyze this dream',
      'Hey Zoe, what does this mean',
      'Hey Zoe, explain dream symbols'
    ],
    advancedCommands: [
      'Hey Zoe, perform deep psychological analysis',
      'Hey Zoe, correlate with waking life events',
      'Hey Zoe, identify archetypal patterns'
    ],
    imagePrompt: 'Black and white pencil sketch: Brain with neural network connections analyzing dream symbols, AI analyzing patterns, cartoon style technical diagram, hand-drawn scientific illustration'
  },
  {
    title: 'Pattern Recognition & Insights',
    description: 'Track recurring themes, emotions, and symbols across multiple dreams. Discover how your subconscious processes daily experiences and emotions.',
    voiceCommands: [
      'Hey Zoe, show my dream patterns',
      'Hey Zoe, find recurring themes',
      'Hey Zoe, display emotion trends'
    ],
    advancedCommands: [
      'Hey Zoe, correlate dreams with sleep quality',
      'Hey Zoe, predict emotional triggers',
      'Hey Zoe, generate personalized insights'
    ],
    imagePrompt: 'Black and white pencil sketch: Graph showing dream patterns over time with connected dots and trend lines, cartoon style data visualization, simple line art analysis'
  },
  {
    title: 'Community & Growth',
    description: 'Connect with others exploring their dreams. Share anonymous insights, learn from collective patterns, and grow your self-understanding through community wisdom.',
    voiceCommands: [
      'Hey Zoe, share my insights',
      'Hey Zoe, browse community dreams',
      'Hey Zoe, find similar experiences'
    ],
    advancedCommands: [
      'Hey Zoe, analyze collective dream patterns',
      'Hey Zoe, suggest dream interpretation experts',
      'Hey Zoe, create personal growth action plan'
    ],
    imagePrompt: 'Black and white pencil sketch: Multiple people connected by thought bubbles sharing dreams, community circle, cartoon style simple line art, collaborative learning aesthetic'
  }
];

interface ZoeDreamsTutorialProps {
  onClose: () => void;
  onComplete: () => void;
}

export const ZoeDreamsTutorial: React.FC<ZoeDreamsTutorialProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<{ [key: number]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStepImage = async (stepIndex: number) => {
    if (generatedImages[stepIndex]) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: {
          prompt: tutorialSteps[stepIndex].imagePrompt,
          model: 'google/gemini-2.5-flash-image-preview',
        }
      });

      if (error) throw error;

      if (data?.images?.[0]?.image_url?.url) {
        setGeneratedImages(prev => ({
          ...prev,
          [stepIndex]: data.images[0].image_url.url
        }));
      }
    } catch (error) {
      console.error('Error generating tutorial image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateStepImage(currentStep);
    const step = tutorialSteps[currentStep];
    speakAsZoe(`${step.title}. ${step.description}`);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleVoiceCommand = (command: string) => {
    speakAsZoe(`You can say: ${command}`);
  };

  const downloadComprehensiveDocumentation = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;
    const lineHeight = 7;

    // Title Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 0, 180);
    doc.text('Zoe Dreams AI', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Advanced Dream Analysis & Behavioral Intelligence', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text('Ultra HD 12K Resolution Interface • Neural Network Analysis', pageWidth / 2, y, { align: 'center' });
    doc.text('Pattern Recognition • Emotional Intelligence • Community Insights', pageWidth / 2, y + 7, { align: 'center' });
    
    y += 25;
    doc.setLineWidth(0.5);
    doc.setDrawColor(120, 0, 180);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 15;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const introText = [
      'Unlock the secrets of your subconscious mind with Zoe Dreams AI, a revolutionary',
      'platform combining advanced artificial intelligence with dream psychology to provide',
      'unprecedented insights into your inner world. Supports ultra-high resolution displays up to 12K.'
    ];
    introText.forEach(line => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 6;
    });

    // Feature Overview Section
    doc.addPage();
    y = margin;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 0, 180);
    doc.text('Core Capabilities', margin, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const features = [
      '• Advanced Neural Network Analysis: Deep learning algorithms decode dream patterns',
      '• Emotional Intelligence Tracking: Monitor psychological states and emotional trends',
      '• Pattern Recognition Engine: Identify recurring themes across multiple dreams',
      '• Voice-Activated Recording: Hands-free dream journaling with Zoe AI',
      '• Symbolic Interpretation: AI-powered analysis of dream symbols and meanings',
      '• Behavioral Correlation: Connect dreams with waking life events and behaviors',
      '• Community Intelligence: Learn from collective dream experiences (anonymous)',
      '• Predictive Insights: Forecast emotional patterns and psychological trends',
      '• Ultra HD Interface: 12K resolution support for immersive dream visualization',
      '• Offline Accessibility: Full documentation available for offline reference'
    ];
    
    features.forEach(feature => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(feature, margin, y);
      y += lineHeight;
    });

    // Voice Commands & Features for each tutorial step
    tutorialSteps.forEach((step, index) => {
      doc.addPage();
      y = margin;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 0, 180);
      doc.text(`${index + 1}. ${step.title}`, margin, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const descLines = doc.splitTextToSize(step.description, pageWidth - 2 * margin);
      descLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      
      y += 5;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 0, 150);
      doc.text('Essential Voice Commands:', margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      step.voiceCommands.forEach(cmd => {
        doc.text(`  ○ ${cmd}`, margin + 5, y);
        y += 6;
      });
      
      y += 5;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 150, 180);
      doc.text('Advanced AI Capabilities:', margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      step.advancedCommands.forEach(cmd => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(`  ● ${cmd}`, margin + 5, y);
        y += 6;
      });
    });

    // AI Analysis Framework
    doc.addPage();
    y = margin;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 0, 180);
    doc.text('AI Analysis Framework', margin, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const aiFramework = [
      'Natural Language Processing: Advanced text analysis of dream narratives',
      'Sentiment Analysis: Emotional tone detection and classification',
      'Entity Recognition: Identification of people, places, and objects in dreams',
      'Thematic Clustering: Grouping similar dream experiences',
      'Temporal Pattern Analysis: Tracking dream evolution over time',
      'Cross-Reference Correlation: Linking dreams to life events and behaviors',
      'Archetypal Pattern Matching: Identifying universal psychological symbols',
      'Predictive Modeling: Forecasting future emotional states and dream themes',
      'Privacy-First Design: All analysis performed with encrypted user data',
      'Continuous Learning: AI improves with each dream entry you provide'
    ];
    
    aiFramework.forEach(item => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(`• ${item}`, margin, y);
      y += lineHeight;
    });

    // Privacy & Security
    doc.addPage();
    y = margin;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 0, 180);
    doc.text('Privacy & Data Security', margin, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const privacyNotes = [
      '✓ End-to-End Encryption: All dream entries encrypted at rest and in transit',
      '✓ Anonymous Sharing: Community features use anonymized data only',
      '✓ User Control: Full ownership and deletion rights for all personal data',
      '✓ GDPR Compliant: European data protection standards enforced globally',
      '✓ No Third-Party Sharing: Your dreams are never sold or shared externally',
      '✓ Local Processing: AI analysis performed on-device when possible',
      '✓ Secure Storage: Industry-standard encryption protocols (AES-256)',
      '✓ Transparent Practices: Clear privacy policy and data usage documentation'
    ];
    
    privacyNotes.forEach(note => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(note, margin, y);
      y += lineHeight;
    });

    // Download location info
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Document generated from Universe of Life platform', pageWidth / 2, y, { align: 'center' });
    doc.text('Location: Universal Timeline > Zoe Dreams AI > Help (?) Button > Download PDF', pageWidth / 2, y + 5, { align: 'center' });

    const filename = `Zoe-Dreams-AI-Documentation-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    speakAsZoe('Comprehensive 12K dream analysis documentation downloaded. Access this guide offline whenever you need.');
  };

  const step = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 xs:p-4 md:p-6"
      >
        <Card className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-2xl border border-purple-500/30 p-3 xs:p-4 md:p-8 rounded-2xl shadow-2xl">
          {/* Close Button - Always Visible */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 bg-red-500/20 hover:bg-red-500/40 rounded-full border border-red-500/30"
          >
            <X className="w-4 h-4 text-red-400" />
          </Button>

          {/* Download PDF button - Mobile friendly */}
          <Button
            onClick={downloadComprehensiveDocumentation}
            variant="default"
            size="sm"
            className="absolute top-2 right-12 h-8 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 rounded-full px-2 xs:px-3"
          >
            <Download className="w-3 h-3 xs:w-4 xs:h-4" />
            <span className="hidden xs:inline ml-1.5 text-xs">PDF</span>
          </Button>

          {/* Progress indicator */}
          <div className="flex gap-1.5 mb-4 mt-10 xs:mt-8">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-purple-400'
                    : index < currentStep
                    ? 'bg-purple-600'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative aspect-square bg-white/5 rounded-2xl overflow-hidden border border-purple-500/20"
            >
              {isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Moon className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
                    <p className="text-purple-400 text-sm">Creating dream visualization...</p>
                  </div>
                </div>
              ) : generatedImages[currentStep] ? (
                <img
                  src={generatedImages[currentStep]}
                  alt={step.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-16 h-16 text-purple-400 animate-pulse" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-purple-900/30 pointer-events-none" />
            </motion.div>

            <div className="flex flex-col">
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1"
              >
                <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                  <Moon className="w-6 h-6 text-purple-400" />
                  {step.title}
                </h2>
                
                <p className="text-white/80 mb-6 leading-relaxed">
                  {step.description}
                </p>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Voice Commands
                  </h3>
                  <div className="space-y-2">
                    {step.voiceCommands.map((cmd, index) => (
                      <Button
                        key={index}
                        onClick={() => handleVoiceCommand(cmd)}
                        variant="outline"
                        className="w-full justify-start text-left bg-white/5 hover:bg-purple-500/20 border-white/10 text-white text-sm"
                      >
                        <Volume2 className="w-3 h-3 mr-2 text-purple-400" />
                        {cmd}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Advanced AI Features
                  </h3>
                  <div className="space-y-2">
                    {step.advancedCommands.map((cmd, index) => (
                      <Button
                        key={index}
                        onClick={() => handleVoiceCommand(cmd)}
                        variant="outline"
                        className="w-full justify-start text-left bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-white text-sm"
                      >
                        <Brain className="w-3 h-3 mr-2 text-cyan-400" />
                        {cmd}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="flex-1 bg-white/5 hover:bg-white/10 border-white/20 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Begin Dream Journey' : 'Next'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};