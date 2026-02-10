import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Volume2, ChevronRight, ChevronLeft, Sparkles, Download } from 'lucide-react';
import { speakAsZoe } from '@/utils/zoeVoice';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

/**
 * HELIOSPHERE TUTORIAL - ANIMATED PENCIL CARTOON STYLE
 * 
 * Interactive tutorial with black & white pencil-drawn visuals
 * Comprehensive voice commands and feature demonstrations
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
    title: 'Welcome to 4K Heliosphere Explorer',
    description: 'Experience our solar system in stunning 4K holographic visualization. Navigate through space using voice commands or touch controls.',
    voiceCommands: [
      'Hey Zoe, open solar system',
      'Hey Zoe, show planets',
      'Hey Zoe, explore heliosphere'
    ],
    advancedCommands: [
      'Hey Zoe, simulate orbital mechanics',
      'Hey Zoe, calculate planetary distances',
      'Hey Zoe, show gravitational fields'
    ],
    imagePrompt: 'Black and white pencil sketch cartoon style: Solar system with sun and planets orbiting, simple line art, hand-drawn aesthetic, floating in space with stars'
  },
  {
    title: 'Interactive Planet Selection',
    description: 'Click any planet to learn detailed information. Each planet reveals scientific data, orbital characteristics, and exploration history.',
    voiceCommands: [
      'Hey Zoe, tell me about Earth',
      'Hey Zoe, show Mars details',
      'Hey Zoe, select Jupiter'
    ],
    advancedCommands: [
      'Hey Zoe, compare Earth and Mars atmospheres',
      'Hey Zoe, analyze Jupiter\'s moons',
      'Hey Zoe, show Saturn\'s ring composition'
    ],
    imagePrompt: 'Black and white pencil sketch: Hand pointing at planets with information bubbles, cartoon style simple line art, educational diagram aesthetic'
  },
  {
    title: 'Navigation Controls',
    description: 'Use mouse drag to rotate view, scroll to zoom, or use voice commands for precise camera movements and orbital tracking.',
    voiceCommands: [
      'Hey Zoe, zoom in',
      'Hey Zoe, zoom out',
      'Hey Zoe, reset view'
    ],
    advancedCommands: [
      'Hey Zoe, track Earth\'s orbit',
      'Hey Zoe, follow Mars trajectory',
      'Hey Zoe, show ecliptic plane'
    ],
    imagePrompt: 'Black and white pencil sketch: Arrows showing camera movement and rotation around planets, simple cartoon style line art, navigation symbols'
  },
  {
    title: 'Orbital Mechanics Visualization',
    description: 'Watch real-time planetary orbits, observe gravitational interactions, and understand celestial mechanics through dynamic 3D visualization.',
    voiceCommands: [
      'Hey Zoe, play orbital animation',
      'Hey Zoe, pause motion',
      'Hey Zoe, speed up time'
    ],
    advancedCommands: [
      'Hey Zoe, simulate planetary alignment',
      'Hey Zoe, show Lagrange points',
      'Hey Zoe, predict future positions'
    ],
    imagePrompt: 'Black and white pencil sketch: Planets moving in elliptical orbits with motion lines, cartoon style simple line art, dynamic movement visualization'
  },
  {
    title: 'Advanced Space Features',
    description: 'Explore asteroid belts, analyze planetary compositions, study moon systems, and discover space exploration milestones.',
    voiceCommands: [
      'Hey Zoe, show asteroid belt',
      'Hey Zoe, display planet data',
      'Hey Zoe, show moons'
    ],
    advancedCommands: [
      'Hey Zoe, analyze asteroid trajectories',
      'Hey Zoe, show habitable zones',
      'Hey Zoe, calculate travel times to Mars'
    ],
    imagePrompt: 'Black and white pencil sketch: Detailed solar system with asteroid belt and moons, technical diagram style cartoon, hand-drawn scientific illustration'
  }
];

interface HeliosphereTutorialProps {
  onClose: () => void;
  onComplete: () => void;
}

export const HeliosphereTutorial: React.FC<HeliosphereTutorialProps> = ({ onClose, onComplete }) => {
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

      // Extract image from response (base64 data URL)
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
    // Generate current step image
    generateStepImage(currentStep);
    
    // Speak tutorial content
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
    doc.setTextColor(0, 150, 200);
    doc.text('4K Heliosphere Explorer', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Comprehensive User Documentation', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text('Ultra HD 12K Resolution Support • Holographic 3D Visualization', pageWidth / 2, y, { align: 'center' });
    doc.text('Interactive Voice Control • Real-Time Orbital Mechanics', pageWidth / 2, y + 7, { align: 'center' });
    
    y += 25;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 150, 200);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 15;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const introText = [
      'Experience the solar system like never before with our cutting-edge 4K Heliosphere Explorer.',
      'This comprehensive guide covers all features, voice commands, and advanced functionalities',
      'designed for ultra-high resolution displays up to 12K resolution support.'
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
    doc.setTextColor(0, 150, 200);
    doc.text('Feature Overview', margin, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const features = [
      '• Ultra HD 4K-12K Resolution: Native support for high-resolution displays',
      '• Real-Time 3D Rendering: WebGL-powered solar system simulation',
      '• Interactive Planet Selection: Click any planet for detailed information',
      '• Dynamic Orbital Mechanics: Watch planets move in real elliptical orbits',
      '• Holographic UI Effects: Futuristic glow and bloom visual effects',
      '• Voice Control Integration: Full Zoe AI voice command support',
      '• Cross-Platform Controls: Mouse, touch, and virtual joystick support',
      '• Educational Content: Comprehensive planetary data and exploration history',
      '• Zoom & Navigation: Smooth camera controls for detailed exploration',
      '• Mobile Optimized: Responsive design for all device sizes'
    ];
    
    features.forEach(feature => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(feature, margin, y);
      y += lineHeight;
    });

    // Voice Commands Section
    tutorialSteps.forEach((step, index) => {
      doc.addPage();
      y = margin;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 150, 200);
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
      doc.setTextColor(0, 120, 180);
      doc.text('Basic Voice Commands:', margin, y);
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
      doc.setTextColor(120, 0, 180);
      doc.text('Advanced Features & Commands:', margin, y);
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

    // Technical Specifications
    doc.addPage();
    y = margin;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 200);
    doc.text('Technical Specifications', margin, y);
    
    y += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const techSpecs = [
      'Rendering Engine: WebGL 2.0 with Three.js',
      'Resolution Support: 4K (3840×2160) to 12K (11520×6480)',
      'Texture Quality: Up to 8K planet surface textures',
      'Frame Rate: Adaptive 30-120 FPS based on device capability',
      'Lighting: Physically-based rendering with dynamic shadows',
      'Platform: Web-based, works on desktop, mobile, and tablets',
      'Browser Support: Chrome, Firefox, Safari, Edge (latest versions)',
      'Minimum Requirements: Modern GPU with WebGL 2.0 support',
      'Recommended: High-resolution display (4K+) for optimal experience',
      'Accessibility: Full keyboard navigation and screen reader support'
    ];
    
    techSpecs.forEach(spec => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      doc.text(`• ${spec}`, margin, y);
      y += lineHeight;
    });

    // Download location info
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Document generated from Universe of Life platform', pageWidth / 2, y, { align: 'center' });
    doc.text('Location: Universal Timeline > Heliosphere Explorer > Help (?) Button > Download PDF', pageWidth / 2, y + 5, { align: 'center' });

    const filename = `Heliosphere-Explorer-Documentation-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    speakAsZoe('Comprehensive 12K documentation downloaded successfully. You can access this guide offline anytime.');
  };

  const step = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
      >
        <Card className="relative max-w-4xl w-full bg-white/10 backdrop-blur-2xl border-2 border-white/20 p-8 rounded-3xl shadow-2xl">
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 hover:bg-white/20 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Download PDF button */}
          <Button
            onClick={downloadComprehensiveDocumentation}
            variant="default"
            className="absolute top-4 right-16 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 rounded-full px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            12K PDF
          </Button>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-cyan-400 scale-105'
                    : index < currentStep
                    ? 'bg-cyan-600'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Visual */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10"
            >
              {isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-cyan-400 text-sm">Generating pencil sketch...</p>
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
                  <Sparkles className="w-16 h-16 text-cyan-400 animate-pulse" />
                </div>
              )}
              
              {/* Pencil sketch effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
            </motion.div>

            {/* Right: Content */}
            <div className="flex flex-col">
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1"
              >
                <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  {step.title}
                </h2>
                
                <p className="text-white/80 mb-6 leading-relaxed">
                  {step.description}
                </p>

                {/* Basic Voice Commands */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Voice Commands
                  </h3>
                  <div className="space-y-2">
                    {step.voiceCommands.map((cmd, index) => (
                      <Button
                        key={index}
                        onClick={() => handleVoiceCommand(cmd)}
                        variant="outline"
                        className="w-full justify-start text-left bg-white/5 hover:bg-cyan-500/20 border-white/10 text-white text-sm"
                      >
                        <Volume2 className="w-3 h-3 mr-2 text-cyan-400" />
                        {cmd}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Advanced Commands */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Advanced Features
                  </h3>
                  <div className="space-y-2">
                    {step.advancedCommands.map((cmd, index) => (
                      <Button
                        key={index}
                        onClick={() => handleVoiceCommand(cmd)}
                        variant="outline"
                        className="w-full justify-start text-left bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-white text-sm"
                      >
                        <Sparkles className="w-3 h-3 mr-2 text-purple-400" />
                        {cmd}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Navigation */}
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
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Start Exploring' : 'Next'}
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