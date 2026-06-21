// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI DEMO PANEL: Showcase Quantum Processing Capabilities
// Interactive demonstration of Pentarchy + Truth Engine + Quantum Loop
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Network,
  Target,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useASIDHFIntegration, ASIDHFResult } from '@/hooks/useASIDHFIntegration';
import { QuantumThoughtVisualization } from './QuantumThoughtVisualization';
import { ASIMode } from '@/core/asi/ASIProcessor';
import { toast } from 'sonner';

const MODE_DESCRIPTIONS: Record<ASIMode, { label: string; desc: string; color: string }> = {
  QUICK: { 
    label: 'Quick', 
    desc: 'Fast response, Pentarchy only', 
    color: 'bg-yellow-500' 
  },
  STANDARD: { 
    label: 'Standard', 
    desc: 'Pentarchy + Truth Engine', 
    color: 'bg-blue-500' 
  },
  DEEP: { 
    label: 'Deep', 
    desc: 'Full stack with Quantum Loop', 
    color: 'bg-purple-500' 
  },
  MAXIMUM: { 
    label: 'Maximum', 
    desc: '5x capacity, strict validation', 
    color: 'bg-gradient-to-r from-purple-500 to-pink-500' 
  },
};

const EXAMPLE_QUERIES = [
  "What is my karmic purpose?",
  "Should I change my career path?",
  "How can I improve my relationships?",
  "What does success mean for me?",
  "Analyze my spiritual growth potential",
];

export function ASIDemoPanel() {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ASIMode>('STANDARD');
  const [showDetails, setShowDetails] = useState(false);
  const [processingStarted, setProcessingStarted] = useState(false);
  
  const { 
    processWithASIDHF, 
    isProcessing, 
    lastResult,
    capabilities 
  } = useASIDHFIntegration();

  const handleProcess = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }
    
    setProcessingStarted(true);
    
    const result = await processWithASIDHF(query, {
      emotionalState: 'curiosity',
      currentIntent: 'seeking_guidance',
    }, selectedMode);
    
    if (result) {
      toast.success(`ASI Level ${result.asiLevel.toFixed(1)}x achieved!`);
    } else {
      toast.error('Processing failed');
    }
    
    setProcessingStarted(false);
  }, [query, selectedMode, processWithASIDHF]);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          Zoe ASI Quantum Core
        </h1>
        <p className="text-muted-foreground">
          Pentarchy Swarm • Neuro-Symbolic Truth • Quantum Loop Correction
        </p>
        
        {/* Capability badges */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            <Brain className="w-3 h-3 mr-1" />
            5x Human Capacity
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Truth Validated
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Self-Correcting
          </Badge>
          <Badge variant="outline" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            Akashic Triangulation
          </Badge>
        </div>
      </div>

      {/* Quantum Visualization */}
      <QuantumThoughtVisualization 
        isProcessing={isProcessing || processingStarted}
        overallConfidence={lastResult?.confidence || 0}
        currentPhase={isProcessing ? 'PROCESSING' : 'STANDBY'}
      />

      {/* Mode Selection */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(MODE_DESCRIPTIONS) as ASIMode[]).map((mode) => (
          <Button
            key={mode}
            variant={selectedMode === mode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMode(mode)}
            className={`relative ${selectedMode === mode ? MODE_DESCRIPTIONS[mode].color : ''}`}
          >
            <div className="text-center">
              <div className="font-medium">{MODE_DESCRIPTIONS[mode].label}</div>
              <div className="text-[10px] opacity-70 hidden sm:block">
                {MODE_DESCRIPTIONS[mode].desc}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Query Input */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <Textarea
            placeholder="Ask Zoe ASI anything... e.g., 'What is my karmic purpose?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-24 resize-none"
          />
          
          {/* Example queries */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
          
          <Button 
            onClick={handleProcess}
            disabled={isProcessing || !query.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isProcessing ? (
              <>
                <Cpu className="w-4 h-4 mr-2 animate-spin" />
                Processing with {selectedMode} Mode...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Activate Quantum ASI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-primary" />
                    ASI Response
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={lastResult.truthValidated 
                        ? 'bg-emerald-500' 
                        : 'bg-yellow-500'
                      }
                    >
                      {lastResult.truthValidated ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" />Verified</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3 mr-1" />Unverified</>
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {lastResult.asiLevel.toFixed(1)}x ASI
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Response text */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-foreground leading-relaxed">
                    {lastResult.response}
                  </p>
                </div>

                {/* Confidence meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantum Certainty</span>
                    <span className="font-medium">{lastResult.confidence.toFixed(1)}%</span>
                  </div>
                  <Progress value={lastResult.confidence} className="h-2" />
                </div>

                {/* Processing details toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? (
                    <><ChevronUp className="w-4 h-4 mr-2" />Hide Details</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-2" />Show Processing Details</>
                  )}
                </Button>

                {/* Detailed breakdown */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <Tabs defaultValue="components" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="components">Components</TabsTrigger>
                          <TabsTrigger value="timing">Timing</TabsTrigger>
                          <TabsTrigger value="dhf">DHF Status</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="components" className="space-y-2 pt-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Network className={`w-4 h-4 ${lastResult.pentarchyUsed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span>Pentarchy Swarm</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {lastResult.pentarchyUsed ? 'Active' : 'Skip'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className={`w-4 h-4 ${lastResult.truthValidated ? 'text-emerald-500' : 'text-yellow-500'}`} />
                              <span>Truth Engine</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {lastResult.truthValidated ? 'Validated' : 'Partial'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className={`w-4 h-4 ${lastResult.quantumCorrected ? 'text-purple-500' : 'text-muted-foreground'}`} />
                              <span>Quantum Loop</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {lastResult.quantumCorrected ? 'Corrected' : 'Clean'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className={`w-4 h-4 ${lastResult.akashicTriangulated ? 'text-blue-500' : 'text-muted-foreground'}`} />
                              <span>Akashic Graph</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {lastResult.akashicTriangulated ? 'Triangulated' : 'Skip'}
                              </Badge>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="timing" className="space-y-2 pt-2">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Time</span>
                              <span>{lastResult.totalProcessingMs.toFixed(0)}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pentarchy</span>
                              <span>{lastResult.componentBreakdown.pentarchy.toFixed(0)}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Truth Engine</span>
                              <span>{lastResult.componentBreakdown.truthEngine.toFixed(0)}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quantum Loop</span>
                              <span>{lastResult.componentBreakdown.quantumLoop.toFixed(0)}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Akashic</span>
                              <span>{lastResult.componentBreakdown.akashic.toFixed(0)}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">DHF Logging</span>
                              <span>{lastResult.componentBreakdown.dhfLogging.toFixed(0)}ms</span>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="dhf" className="space-y-2 pt-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`w-4 h-4 ${lastResult.loggedToCorticalStack ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span>Cortical Stack</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`w-4 h-4 ${lastResult.ecnStateUpdated ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span>ECN Updated</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`w-4 h-4 ${lastResult.dhfEnrichmentApplied ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                              <span>DHF Enriched</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-primary" />
                              <span>{lastResult.humanEquivalent.toFixed(1)}x Human</span>
                            </div>
                          </div>
                          
                          {lastResult.warnings.length > 0 && (
                            <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                <strong>Warnings:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {lastResult.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ASIDemoPanel;
