/**
 * RE-SLEEVE PANEL - Project Re-Sleeve
 * Complete interface for Agentic Vocational Prosthetics
 * Integrates: Soul Scanner + Sleeve Marketplace + Puppet Master
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SoulScanner } from './SoulScanner';
import { SleeveMarketplace } from './SleeveMarketplace';
import { PuppetMasterAgent } from './PuppetMasterAgent';
import { useZoeReSleeve } from '@/hooks/useZoeReSleeve';

interface ReSleevePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReSleevePanel = ({ isOpen, onClose }: ReSleevePanelProps) => {
  const { activeSleeve } = useZoeReSleeve();
  const [recommendedSleeveId, setRecommendedSleeveId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('scan');

  const handleSleeveRecommended = (sleeveId: string) => {
    setRecommendedSleeveId(sleeveId);
    setActiveTab('sleeves');
  };

  const handleSleeveEquipped = () => {
    setActiveTab('execute');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-bold">Project Re-Sleeve</h2>
          {activeSleeve && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {activeSleeve.name}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="px-4 pt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="scan">Soul Scan</TabsTrigger>
            <TabsTrigger value="sleeves">Sleeves</TabsTrigger>
            <TabsTrigger value="execute">Execute</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-4">
            <TabsContent value="scan" className="mt-0">
              <SoulScanner 
                onSleeveRecommended={handleSleeveRecommended}
              />
              <div className="mt-4 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-2">How Soul Scanning Works</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Analyzes your behavioral patterns from DHF History</li>
                  <li>• Detects dormant talents with confidence scores</li>
                  <li>• Matches talents to vocational archetypes</li>
                  <li>• Triggers "Destiny Notifications" for high matches</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="sleeves" className="mt-0">
              <SleeveMarketplace
                recommendedSleeveId={recommendedSleeveId}
                onSleeveEquipped={handleSleeveEquipped}
              />
              <div className="mt-4 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Sleeve Transformations</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Map Focus: Shows profession-relevant locations</li>
                  <li>• Feed Filter: Surfaces relevant opportunities</li>
                  <li>• Voice Persona: Adjusts Zoe's communication style</li>
                  <li>• Color Scheme: Transforms app aesthetics</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="execute" className="mt-0">
              <PuppetMasterAgent />
              <div className="mt-4 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-2">95% Precision Engine</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• You provide the Soul/Vision (intent)</li>
                  <li>• Zoe provides the Hands/Technique (execution)</li>
                  <li>• Critic Agent validates each step before proceeding</li>
                  <li>• Automated outputs: proposals, designs, emails, invoices</li>
                </ul>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </motion.div>
  );
};

export default ReSleevePanel;
