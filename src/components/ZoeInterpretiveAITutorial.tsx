import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TutorialStep {
  title: string;
  description: string;
  example: string;
  mode: string;
  visual: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Interpretive AI",
    description: "Zoe's multi-agent system combines 6 specialized AI agents that work together to solve complex problems autonomously. Each agent has unique capabilities and they collaborate to deliver powerful results.",
    example: "Try: 'Optimize my daily workflow and suggest improvements'",
    mode: "autonomous",
    visual: "🧠"
  },
  {
    title: "Customer Service AI",
    description: "Service centers and businesses worldwide can use Zoe for 24/7 customer support. The system handles technical queries, service scheduling, and product troubleshooting with 94% autonomous resolution.",
    example: "Try: 'Create a service ticket for customer with broken device screen and schedule repair'",
    mode: "autonomous",
    visual: "🎧"
  },
  {
    title: "Visual Analysis & Search",
    description: "Upload images for instant analysis. Zoe detects faces, emotions, objects, text (OCR), and product conditions. Perfect for quality control, customer verification, or content moderation.",
    example: "Try: 'Analyze this product image and check for defects'",
    mode: "collaborative",
    visual: "👁️"
  },
  {
    title: "Knowledge Management",
    description: "Automatically scan, tag, and organize support libraries. Machine learning identifies most helpful articles, improving search relevance over time for customers and agents.",
    example: "Try: 'Scan our support docs and create a knowledge base for battery issues'",
    mode: "adaptive",
    visual: "📚"
  },
  {
    title: "Predictive Intelligence",
    description: "Zoe anticipates user needs before they ask. Analyzes patterns, predicts issues, and proactively suggests solutions. Reduces support tickets by 40% through preventive assistance.",
    example: "Try: 'Predict common customer issues this month and prepare solutions'",
    mode: "predictive",
    visual: "🔮"
  },
  {
    title: "Multi-Agent Collaboration",
    description: "Complex tasks are automatically decomposed and distributed across specialized agents. PLANNER creates strategy, RESEARCHER gathers data, EXECUTOR implements, and OPTIMIZER refines results.",
    example: "Try: 'Plan a product launch campaign with timeline and resource allocation'",
    mode: "collaborative",
    visual: "🤝"
  }
];

interface ZoeInterpretiveAITutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onTryExample: (example: string, mode: string) => void;
}

export const ZoeInterpretiveAITutorial = ({ 
  isOpen, 
  onClose, 
  onTryExample 
}: ZoeInterpretiveAITutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTryExample = () => {
    const step = tutorialSteps[currentStep];
    onTryExample(step.example.replace('Try: ', '').replace(/'/g, ''), step.mode);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Higher z-index to cover everything */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200]"
            onClick={onClose}
          />

          {/* Tutorial Card - Centered and above all other elements */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] sm:w-[85vw] max-w-xl z-[201] max-h-[85vh] overflow-y-auto"
          >
            <Card className="bg-background/95 backdrop-blur-xl border-2 border-purple-500/30 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 p-6 border-b border-white/10">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{tutorialSteps[currentStep].visual}</div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {tutorialSteps[currentStep].title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Step {currentStep + 1} of {tutorialSteps.length}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <div className="space-y-3">
                  <p className="text-base text-foreground leading-relaxed">
                    {tutorialSteps[currentStep].description}
                  </p>
                </div>

                {/* Example */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    Real-World Example
                  </div>
                  <p className="text-sm text-foreground font-mono bg-black/20 p-3 rounded border border-white/10">
                    {tutorialSteps[currentStep].example}
                  </p>
                  <Button
                    onClick={handleTryExample}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Try This Example
                  </Button>
                </div>

                {/* Progress Dots */}
                <div className="flex items-center justify-center gap-2">
                  {tutorialSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentStep
                          ? 'bg-purple-500 w-6'
                          : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="border-white/20"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <Button
                  onClick={currentStep === tutorialSteps.length - 1 ? onClose : handleNext}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>Done</>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};