/**
 * SLEEVE INJECTION CHAMBER - Project Re-Sleeve
 * Futuristic marketplace to equip vocational prosthetics
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, ChevronLeft, ChevronRight, Sparkles, Brain, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useZoeReSleeve, SkillSleeve } from '@/hooks/useZoeReSleeve';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SleeveMarketplaceProps {
  recommendedSleeveId?: string;
  onSleeveEquipped?: (sleeve: SkillSleeve) => void;
}

const SLEEVE_AVATARS: Record<string, string> = {
  'zoe-painter': '🎨',
  'zoe-coder': '💻',
  'zoe-entrepreneur': '🚀',
  'zoe-healer': '🧘',
  'zoe-connector': '🤝'
};

const SLEEVE_COLORS: Record<string, string> = {
  'zoe-painter': 'from-orange-500/20 to-pink-500/20',
  'zoe-coder': 'from-cyan-500/20 to-blue-500/20',
  'zoe-entrepreneur': 'from-amber-500/20 to-orange-500/20',
  'zoe-healer': 'from-green-500/20 to-emerald-500/20',
  'zoe-connector': 'from-purple-500/20 to-violet-500/20'
};

export const SleeveMarketplace = ({ recommendedSleeveId, onSleeveEquipped }: SleeveMarketplaceProps) => {
  const { availableSleeves, activeSleeve, equipSleeve, unequipSleeve } = useZoeReSleeve();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEquipping, setIsEquipping] = useState(false);

  const selectedSleeve = availableSleeves[selectedIndex];
  const isRecommended = selectedSleeve?.id === recommendedSleeveId;
  const isActive = activeSleeve?.id === selectedSleeve?.id;

  const handlePrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : availableSleeves.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev < availableSleeves.length - 1 ? prev + 1 : 0));
  };

  const handleEquip = async () => {
    if (!selectedSleeve) return;
    
    setIsEquipping(true);
    
    // Simulate sleeve injection
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const success = equipSleeve(selectedSleeve.id);
    
    if (success) {
      toast.success(`${selectedSleeve.name} Equipped`, {
        description: 'Your interface is transforming...'
      });
      onSleeveEquipped?.(selectedSleeve);
    }
    
    setIsEquipping(false);
  };

  const handleUnequip = () => {
    unequipSleeve();
    toast.info('Sleeve Unequipped', {
      description: 'Returning to base configuration...'
    });
  };

  return (
    <Card className="bg-background/60 backdrop-blur-xl border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Settings2 className="w-5 h-5 text-primary" />
          Sleeve Injection Chamber
          {activeSleeve && (
            <Badge variant="secondary" className="ml-auto">
              {activeSleeve.name} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Avatar Carousel */}
        <div className="relative h-48 rounded-lg overflow-hidden">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Sleeve Display */}
          <AnimatePresence mode="wait">
            {selectedSleeve && (
              <motion.div
                key={selectedSleeve.id}
                initial={{ opacity: 0, scale: 0.9, rotateY: -30 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateY: 30 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center",
                  "bg-gradient-to-br",
                  SLEEVE_COLORS[selectedSleeve.id] || 'from-primary/10 to-accent/10'
                )}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </motion.div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-600 text-xs font-medium"
                  >
                    <Check className="w-3 h-3" />
                    Active
                  </motion.div>
                )}

                {/* Avatar - CSS animation */}
                <div className={cn(
                  "text-6xl mb-2 animate-gpu-float",
                  isActive && "animate-gpu-wiggle"
                )}>
                  {SLEEVE_AVATARS[selectedSleeve.id] || '🧠'}
                </div>

                <h3 className="text-xl font-bold">{selectedSleeve.name}</h3>
                <p className="text-sm text-muted-foreground text-center px-4 mt-1">
                  {selectedSleeve.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carousel Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {availableSleeves.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === selectedIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Sleeve Stats */}
        {selectedSleeve && (
          <motion.div
            key={`stats-${selectedSleeve.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Capabilities */}
            <div className="flex flex-wrap gap-1">
              {selectedSleeve.capabilities.slice(0, 4).map((cap, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {cap}
                </Badge>
              ))}
              {selectedSleeve.capabilities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedSleeve.capabilities.length - 4} more
                </Badge>
              )}
            </div>

            {/* Precision Tasks */}
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Precision Tasks (95% Automation)
              </p>
              <div className="space-y-1">
                {selectedSleeve.precisionTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between text-sm">
                    <span>{task.name}</span>
                    <span className="text-xs text-muted-foreground">{task.automationLevel}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isActive ? (
            <Button onClick={handleUnequip} variant="outline" className="flex-1">
              Unequip Sleeve
            </Button>
          ) : (
            <Button 
              onClick={handleEquip} 
              disabled={isEquipping}
              className="flex-1"
            >
              {isEquipping ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Injecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Equip Sleeve
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SleeveMarketplace;
