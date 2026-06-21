/**
 * SOUL SCANNER - Project Re-Sleeve
 * Deep scan analysis to detect dormant talents
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Scan, Sparkles, Eye, Target, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useZoeReSleeve, DormantTalent } from '@/hooks/useZoeReSleeve';
import { cn } from '@/lib/utils';

interface SoulScannerProps {
  onTalentDetected?: (talent: DormantTalent) => void;
  onSleeveRecommended?: (sleeveId: string) => void;
}

export const SoulScanner = ({ onTalentDetected, onSleeveRecommended }: SoulScannerProps) => {
  const { scanSoul, isScanning, soulScanResult } = useZoeReSleeve();
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState(0);

  const handleInitiateScan = async () => {
    setScanPhase('scanning');
    setScanProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setScanPhase('analyzing');
      
      const result = await scanSoul();
      
      clearInterval(progressInterval);
      setScanProgress(100);
      setScanPhase('complete');

      // Notify parent of detected talents
      if (result.talents.length > 0 && onTalentDetected) {
        onTalentDetected(result.talents[0]);
      }
      if (result.suggestedPath && onSleeveRecommended) {
        onSleeveRecommended(result.suggestedPath);
      }
    } catch (error) {
      console.error('[SoulScanner] Scan failed:', error);
      setScanPhase('idle');
      setScanProgress(0);
    }
  };

  return (
    <Card className="bg-background/60 backdrop-blur-xl border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Brain className="w-5 h-5 text-primary" />
          Soul Scanner
          <span className="ml-auto text-xs text-muted-foreground">DHF Connected</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanning Visualization */}
        <div className="relative h-40 rounded-lg bg-gradient-to-br from-primary/5 to-accent/10 overflow-hidden">
          <AnimatePresence mode="wait">
            {scanPhase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              >
                <Eye className="w-12 h-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Ready to scan your latent talents</p>
              </motion.div>
            )}

            {(scanPhase === 'scanning' || scanPhase === 'analyzing') && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Scanning rings - CSS animations */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-gpu-ring-expand" />
                  <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-gpu-ring-pulse" />
                  <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center animate-gpu-spin-3s">
                    <Scan className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium">
                  {scanPhase === 'scanning' ? 'Scanning behavioral patterns...' : 'Analyzing dormant talents...'}
                </p>
              </motion.div>
            )}

            {scanPhase === 'complete' && soulScanResult && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 p-4 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Talents Detected</span>
                </div>
                <div className="flex-1 overflow-auto space-y-2">
                  {soulScanResult.talents.slice(0, 2).map((talent, i) => (
                    <motion.div
                      key={talent.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        talent.confidence > 80 ? "bg-green-500/20" : "bg-yellow-500/20"
                      )}>
                        <Target className={cn(
                          "w-5 h-5",
                          talent.confidence > 80 ? "text-green-500" : "text-yellow-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{talent.name}</p>
                        <p className="text-xs text-muted-foreground">{talent.confidence}% confidence</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        {(scanPhase === 'scanning' || scanPhase === 'analyzing') && (
          <Progress value={scanProgress} className="h-1" />
        )}

        {/* Action Button */}
        <Button
          onClick={handleInitiateScan}
          disabled={isScanning}
          className="w-full"
          variant={scanPhase === 'complete' ? 'outline' : 'default'}
        >
          {scanPhase === 'idle' && 'Initiate Soul Scan'}
          {scanPhase === 'scanning' && 'Scanning...'}
          {scanPhase === 'analyzing' && 'Analyzing...'}
          {scanPhase === 'complete' && 'Scan Again'}
        </Button>

        {/* Destiny Notification */}
        {scanPhase === 'complete' && soulScanResult && soulScanResult.talents[0]?.confidence >= 85 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <p className="text-sm">
              <span className="font-medium">Destiny Detected:</span>{' '}
              <span className="text-muted-foreground">{soulScanResult.talents[0].description}</span>
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => onSleeveRecommended?.(soulScanResult.talents[0].matchingSleeves[0])}
            >
              Try {soulScanResult.talents[0].matchingSleeves[0].replace('zoe-', 'Zoe-')} Sleeve
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default SoulScanner;
