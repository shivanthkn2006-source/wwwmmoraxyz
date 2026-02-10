import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, X, CheckCircle } from 'lucide-react';

interface DemoStep {
  id: string;
  name: string;
  description: string;
  command: string;
  duration: number;
  feature: 'text' | 'map' | 'timeline' | 'cab' | 'food' | 'image';
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'greeting',
    name: 'Voice Greeting',
    description: 'Testing basic conversation with Zoe/Smith',
    command: 'Hey Zoe, introduce yourself',
    duration: 5000,
    feature: 'text'
  },
  {
    id: 'map-paris',
    name: 'Map - Paris',
    description: 'Testing globe navigation to Paris',
    command: 'Show me Paris on the map',
    duration: 6000,
    feature: 'map'
  },
  {
    id: 'map-tokyo',
    name: 'Map - Tokyo',
    description: 'Testing globe navigation to Tokyo',
    command: 'Where is Tokyo?',
    duration: 6000,
    feature: 'map'
  },
  {
    id: 'timeline',
    name: 'Cosmic Timeline',
    description: 'Testing timeline visualization',
    command: 'Show me the cosmic timeline',
    duration: 5000,
    feature: 'timeline'
  },
  {
    id: 'cab',
    name: 'Transport Request',
    description: 'Testing cab booking agent',
    command: 'Book me a cab',
    duration: 5000,
    feature: 'cab'
  },
  {
    id: 'food',
    name: 'Food Delivery',
    description: 'Testing food ordering agent',
    command: 'I am hungry, order food',
    duration: 5000,
    feature: 'food'
  },
  {
    id: 'image',
    name: 'Image Generation',
    description: 'Testing AI image generation',
    command: 'Generate an image of a cyberpunk city at night',
    duration: 8000,
    feature: 'image'
  }
];

interface DemoModeProps {
  isActive: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
}

export default function DemoMode({ isActive, onClose, onRunCommand }: DemoModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCurrentStep = useCallback(() => {
    if (currentStep >= DEMO_STEPS.length) {
      setIsRunning(false);
      return;
    }

    const step = DEMO_STEPS[currentStep];
    setIsRunning(true);
    onRunCommand(step.command);
    
    // Mark as completed after duration
    setTimeout(() => {
      setCompletedSteps(prev => [...prev, step.id]);
      setCurrentStep(prev => prev + 1);
    }, step.duration);
  }, [currentStep, onRunCommand]);

  useEffect(() => {
    if (isActive && !isPaused && currentStep < DEMO_STEPS.length) {
      const timer = setTimeout(runCurrentStep, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, isPaused, currentStep, runCurrentStep]);

  const handleSkip = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCompletedSteps(prev => [...prev, DEMO_STEPS[currentStep].id]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsPaused(false);
  };

  if (!isActive) return null;

  const progress = (completedSteps.length / DEMO_STEPS.length) * 100;
  const currentStepData = DEMO_STEPS[currentStep];
  const isComplete = currentStep >= DEMO_STEPS.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-4 right-4 z-[200] max-w-md mx-auto"
      >
        <div className="bg-black/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-4 shadow-2xl shadow-cyan-500/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isRunning && !isPaused ? 360 : 0 }}
                transition={{ duration: 2, repeat: isRunning && !isPaused ? Infinity : 0, ease: 'linear' }}
                className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-black">D</span>
              </motion.div>
              <span className="font-mono text-sm text-cyan-400 tracking-wider">DEMO MODE</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-pink-500"
            />
          </div>

          {/* Current Step */}
          {!isComplete ? (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-white/40">
                  STEP {currentStep + 1}/{DEMO_STEPS.length}
                </span>
                <span className="text-xs font-mono text-cyan-400">{currentStepData?.name}</span>
              </div>
              <p className="text-[11px] font-mono text-white/60 mb-2">
                {currentStepData?.description}
              </p>
              <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                <p className="text-xs font-mono text-white/80 italic">
                  "{currentStepData?.command}"
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-mono text-emerald-400">DEMO COMPLETE</p>
              <p className="text-xs text-white/50 mt-1">All features tested successfully</p>
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex gap-1 mb-3">
            {DEMO_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  completedSteps.includes(step.id)
                    ? 'bg-emerald-500'
                    : index === currentStep
                    ? 'bg-cyan-500 animate-pulse'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={isComplete}
              className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 font-mono text-xs flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
            <button
              onClick={handleSkip}
              disabled={isComplete}
              className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 font-mono text-xs flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <SkipForward className="w-3 h-3" />
            </button>
            {isComplete && (
              <button
                onClick={handleRestart}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono text-xs flex items-center justify-center gap-2 hover:bg-cyan-500/30 transition-colors"
              >
                RESTART
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
