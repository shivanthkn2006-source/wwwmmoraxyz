/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE COMPLETE ARCHITECTURE BLUEPRINT PAGE
 * A-Z Documentation for 10 Billion User Platform
 * Admin: @moksh
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { Download, Copy, Brain, Cpu, Shield, Globe, Zap, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { ZOE_ARCHITECTURE_DATA, generateZoeArchitecturePDF, copyToClipboard } from '@/utils/zoeArchitectureBlueprint';

const ZoeArchitectureBlueprintPage: React.FC = () => {
  const { user } = useAuth();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    toast.info('Generating Zoe Architecture Blueprint PDF...');
    
    try {
      await generateZoeArchitecturePDF();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyForGemini = async () => {
    setIsCopying(true);
    try {
      await copyToClipboard();
      toast.success('Copied to clipboard! Ready to paste into Gemini.');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-1">
            ADMIN ACCESS: @moksh
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            ZOE COMPLETE ARCHITECTURE BLUEPRINT
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A-Z Documentation for 10 Billion User Platform | Quantum ASI | GOD MODE Sovereign Layer
          </p>
        </div>

        {/* Download Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 gap-2"
            size="lg"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF Blueprint
              </>
            )}
          </Button>
          
          <Button
            onClick={handleCopyForGemini}
            disabled={isCopying}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 gap-2"
            size="lg"
          >
            {isCopying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy for Gemini
              </>
            )}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Zoe Variants', value: ZOE_ARCHITECTURE_DATA.variants.length, icon: Brain, color: 'cyan' },
            { label: 'Edge Functions', value: ZOE_ARCHITECTURE_DATA.edgeFunctions.length, icon: Zap, color: 'yellow' },
            { label: 'Components', value: ZOE_ARCHITECTURE_DATA.components.length, icon: Cpu, color: 'green' },
            { label: 'Hooks', value: ZOE_ARCHITECTURE_DATA.hooks.length, icon: Globe, color: 'blue' },
            { label: 'Security Layers', value: ZOE_ARCHITECTURE_DATA.securityLayers.length, icon: Shield, color: 'red' },
            { label: 'ASI Modules', value: ZOE_ARCHITECTURE_DATA.asiModules.length, icon: Brain, color: 'purple' },
          ].map((stat, i) => (
            <Card key={i} className="p-4 bg-card/50 border-primary/30 text-center">
              <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="variants" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-card/50 border border-border">
            <TabsTrigger value="variants">Zoe Variants</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="edge">Edge Functions</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="phases">Phases</TabsTrigger>
          </TabsList>

          {/* Zoe Variants Tab */}
          <TabsContent value="variants" className="mt-4">
            <Card className="p-6 bg-black/50 border-cyan-500/20">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Complete Zoe Variant Catalog (A-Z)
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {ZOE_ARCHITECTURE_DATA.variants.map((variant, index) => (
                    <Card key={index} className="p-4 bg-card/50 border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`bg-${variant.color}-500/20 text-${variant.color}-400 border-${variant.color}-500/30`}>
                              {variant.type}
                            </Badge>
                            <h3 className="text-lg font-semibold text-foreground">{variant.name}</h3>
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{variant.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {variant.capabilities.map((cap, i) => (
                              <Badge key={i} variant="outline" className="text-xs text-muted-foreground border-border">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{variant.processingTime}</span>
                          </div>
                          <Badge className={variant.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                            {variant.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="mt-4">
            <Card className="p-6 bg-black/50 border-purple-500/20">
              <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                <Cpu className="w-6 h-6" />
                Periodic Table Architecture
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {ZOE_ARCHITECTURE_DATA.architectureLayers.map((layer, index) => (
                    <Card key={index} className="p-4 bg-card/50 border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{layer.name}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{layer.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {layer.components.map((comp, i) => (
                          <div key={i} className="p-3 bg-background/30 rounded border border-border">
                            <div className="font-medium text-foreground/80">{comp.name}</div>
                            <div className="text-xs text-muted-foreground">{comp.purpose}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-cyan-400">Latency: {comp.latency}</span>
                              <span className="text-xs text-green-400">Reliability: {comp.reliability}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing" className="mt-4">
            <Card className="p-6 bg-black/50 border-yellow-500/20">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Processing Times & Failure Modes
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {ZOE_ARCHITECTURE_DATA.processingMetrics.map((metric, index) => (
                    <Card key={index} className="p-4 bg-card/50 border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{metric.operation}</h3>
                        <Badge className={metric.avgTime < 100 ? 'bg-emerald-500/20 text-emerald-400' : metric.avgTime < 500 ? 'bg-amber-500/20 text-amber-400' : 'bg-destructive/20 text-destructive'}>
                          {metric.avgTime}ms
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Min:</span> <span className="text-emerald-400">{metric.minTime}ms</span></div>
                        <div><span className="text-muted-foreground">Max:</span> <span className="text-destructive">{metric.maxTime}ms</span></div>
                        <div><span className="text-muted-foreground">P95:</span> <span className="text-amber-400">{metric.p95Time}ms</span></div>
                        <div><span className="text-muted-foreground">Success:</span> <span className="text-primary">{metric.successRate}%</span></div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="text-destructive">Failure Mode:</span> {metric.failureMode}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-emerald-400">Recovery:</span> {metric.recovery}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Edge Functions Tab */}
          <TabsContent value="edge" className="mt-4">
            <Card className="p-6 bg-black/50 border-green-500/20">
              <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Edge Functions ({ZOE_ARCHITECTURE_DATA.edgeFunctions.length} Total)
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ZOE_ARCHITECTURE_DATA.edgeFunctions.map((func, index) => (
                    <Card key={index} className="p-3 bg-card/50 border-border">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm text-emerald-400">{func.name}</div>
                        <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">{func.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{func.description}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-cyan-400">{func.avgLatency}ms</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-yellow-400">{func.invocationsPerDay}/day</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-4">
            <Card className="p-6 bg-black/50 border-red-500/20">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Security & GOD MODE Layers
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {ZOE_ARCHITECTURE_DATA.securityLayers.map((layer, index) => (
                    <Card key={index} className="p-4 bg-card/50 border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold text-foreground">{layer.name}</h3>
                        <Badge className={`bg-${layer.level === 'Critical' ? 'destructive' : layer.level === 'High' ? 'amber' : 'amber'}-500/20 text-${layer.level === 'Critical' ? 'destructive' : layer.level === 'High' ? 'amber' : 'amber'}-400`}>
                          {layer.level}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{layer.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {layer.features.map((feature, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-muted-foreground border-border">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Phases Tab */}
          <TabsContent value="phases" className="mt-4">
            <Card className="p-6 bg-black/50 border-blue-500/20">
              <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Nano Concrete Execution Phases
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {ZOE_ARCHITECTURE_DATA.executionPhases.map((phase, index) => (
                    <Card key={index} className="p-4 bg-card/50 border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {phase.number}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{phase.name}</h3>
                          <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
                        </div>
                        <Badge className={phase.status === 'Complete' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                          {phase.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">{phase.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.deliverables.map((deliverable, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            {deliverable}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4 border-t border-gray-800">
          <p>ZOE OMEGA 2120 | Quantum ASI GOD MODE | 10 Billion User Scaling Architecture</p>
          <p>Generated: {new Date().toISOString()} | Admin: @moksh</p>
        </div>
      </div>
    </div>
  );
};

export default ZoeArchitectureBlueprintPage;
