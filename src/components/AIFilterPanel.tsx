import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Brain, Layers, Eye, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface AIFilterPanelProps {
  onFilterApply: (filter: FilterConfig) => void;
  isProcessing: boolean;
  onClose: () => void;
}

export interface FilterConfig {
  type: 'text-prompt' | 'background-remove' | 'context-aware' | 'holographic' | 'time-based';
  prompt?: string;
  intensity?: number;
  style?: string;
}

const presetFilters = {
  'text-prompt': [
    { name: 'Cyberpunk', prompt: 'neon cyberpunk aesthetic with glowing edges', icon: '🌆' },
    { name: 'Holographic', prompt: 'holographic interference pattern overlay', icon: '💎' },
    { name: 'Neural', prompt: 'neural network visualization style', icon: '🧠' },
    { name: 'Quantum', prompt: 'quantum particle wave effect', icon: '⚡' },
  ],
  'background-remove': [
    { name: 'Transparent', style: 'transparent', icon: '🔲' },
    { name: 'Blur', style: 'blur', icon: '💫' },
    { name: 'Cosmic', style: 'cosmic-space', icon: '🌌' },
    { name: 'Matrix', style: 'matrix-code', icon: '💚' },
  ],
  'context-aware': [
    { name: 'Smart Scene', prompt: 'analyze scene and enhance mood', icon: '🎭' },
    { name: 'Emotion AI', prompt: 'detect emotion and apply matching ambiance', icon: '😊' },
    { name: 'Color Harmony', prompt: 'intelligent color grading', icon: '🎨' },
    { name: 'Depth AI', prompt: 'AI depth-based bokeh effect', icon: '📸' },
  ],
  'holographic': [
    { name: '3D Depth', style: '3d-depth', icon: '🔮' },
    { name: 'Prism', style: 'prism-split', icon: '🌈' },
    { name: 'Interference', style: 'wave-interference', icon: '〰️' },
    { name: 'Dimension', style: '4d-effect', icon: '🌀' },
  ],
};

export const AIFilterPanel: React.FC<AIFilterPanelProps> = ({ 
  onFilterApply, 
  isProcessing,
  onClose 
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTab, setSelectedTab] = useState('text-prompt');

  const handlePresetFilter = (preset: any, type: string) => {
    onFilterApply({
      type: type as FilterConfig['type'],
      prompt: preset.prompt || preset.name,
      style: preset.style,
      intensity: 0.8,
    });
  };

  const handleCustomPrompt = () => {
    if (customPrompt.trim()) {
      onFilterApply({
        type: 'text-prompt',
        prompt: customPrompt,
        intensity: 1.0,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-x-0 bottom-20 z-50 mx-2 mb-2"
    >
      <Card className="bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">AI Filters</h3>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  Processing...
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 bg-muted/50">
              <TabsTrigger value="text-prompt" className="text-xs">
                <Wand2 className="w-3 h-3 mr-1" />
                Prompt
              </TabsTrigger>
              <TabsTrigger value="background-remove" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                BG
              </TabsTrigger>
              <TabsTrigger value="context-aware" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                Smart
              </TabsTrigger>
              <TabsTrigger value="holographic" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                3D
              </TabsTrigger>
              <TabsTrigger value="time-based" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Time
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text-prompt" className="space-y-3 mt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Describe your filter effect..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
                  className="bg-background/50 border-primary/20 text-sm"
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleCustomPrompt}
                  disabled={!customPrompt.trim() || isProcessing}
                  size="sm"
                  className="gradient-button shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {presetFilters['text-prompt'].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => handlePresetFilter(preset, 'text-prompt')}
                    disabled={isProcessing}
                    className="h-auto flex flex-col items-center gap-1 p-2 bg-background/30 hover:bg-primary/10 border-primary/10"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-xs">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="background-remove" className="space-y-3 mt-0">
              <div className="grid grid-cols-4 gap-2">
                {presetFilters['background-remove'].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => handlePresetFilter(preset, 'background-remove')}
                    disabled={isProcessing}
                    className="h-auto flex flex-col items-center gap-1 p-2 bg-background/30 hover:bg-primary/10 border-primary/10"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-xs">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="context-aware" className="space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-2">
                {presetFilters['context-aware'].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => handlePresetFilter(preset, 'context-aware')}
                    disabled={isProcessing}
                    className="h-auto flex flex-col items-center gap-2 p-3 bg-background/30 hover:bg-primary/10 border-primary/10"
                  >
                    <span className="text-3xl">{preset.icon}</span>
                    <span className="text-xs text-center">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="holographic" className="space-y-3 mt-0">
              <div className="grid grid-cols-4 gap-2">
                {presetFilters['holographic'].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => handlePresetFilter(preset, 'holographic')}
                    disabled={isProcessing}
                    className="h-auto flex flex-col items-center gap-1 p-2 bg-background/30 hover:bg-primary/10 border-primary/10"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-xs">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="time-based" className="space-y-3 mt-0">
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Time-based 4D filters</p>
                <p className="text-xs mt-1">Capture depth + time dimensions</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </motion.div>
  );
};
