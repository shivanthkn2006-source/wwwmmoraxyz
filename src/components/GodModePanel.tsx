import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, RefreshCw, AlertTriangle, CheckCircle, XCircle, 
  Zap, TrendingUp, Database, Code, Sparkles, FileText,
  ChevronDown, ChevronUp, Play, Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlatformHealthMonitor, type HealthIssue } from '@/hooks/usePlatformHealthMonitor';
import { useZoeAgent } from '@/hooks/useZoeAgent';
import { useAuth } from '@/lib/auth';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportDocumentationAsPDF, exportDocumentationAsJSON } from '@/utils/comprehensiveDocumentationExport';
import { exportRootScanAsPDF } from '@/utils/rootScanExport';

const ExportDocumentationButtons: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={async () => {
          if (!user?.id) {
            toast.error('Please sign in first');
            return;
          }
          await exportRootScanAsPDF(user.id);
          toast.success('Root Scan PDF generated successfully');
        }}
      >
        <Shield className="w-4 h-4 mr-2" />
        Root Scan (PDF)
      </Button>
      <Button 
        className="w-full" 
        onClick={async () => {
          await exportDocumentationAsPDF(user?.id || '');
          toast.success('Documentation PDF generated successfully');
        }}
      >
        <FileText className="w-4 h-4 mr-2" />
        Export as PDF
      </Button>
      <Button 
        variant="outline"
        className="w-full" 
        onClick={async () => {
          await exportDocumentationAsJSON(user?.id || '');
          toast.success('Documentation JSON exported successfully');
        }}
      >
        <Code className="w-4 h-4 mr-2" />
        Export as JSON
      </Button>
    </div>
  );
};

/**
 * GOD MODE PANEL
 * Autonomous platform monitoring and self-healing system powered by Zoe AI
 */

export const GodModePanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { health, isScanning, autoScanEnabled, setAutoScanEnabled, scanPlatform } = usePlatformHealthMonitor();
  const { executeCommand } = useZoeAgent();
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeWithAI = async (issue: HealthIssue) => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze this platform issue and provide a detailed fix: 
        Category: ${issue.category}
        Severity: ${issue.severity}
        Title: ${issue.title}
        Description: ${issue.description}
        Location: ${issue.location}
        
        Provide:
        1. Root cause analysis
        2. Step-by-step fix instructions
        3. Prevention strategies`;
      
      await executeCommand(prompt);
      speakAsZoe(`I've analyzed the ${issue.title} issue. Check the analysis for detailed fix instructions.`);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    };
    return variants[severity] || 'default';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      database: <Database className="w-4 h-4" />,
      error: <XCircle className="w-4 h-4" />,
      performance: <TrendingUp className="w-4 h-4" />,
      ui: <Code className="w-4 h-4" />,
      architecture: <Shield className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
      warning: <AlertTriangle className="w-4 h-4" />,
    };
    return icons[category] || <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
          >
            <Card className="bg-gradient-to-br from-background to-accent/10 border-2 border-primary/30 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        God Mode
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Autonomous Platform Health & Self-Healing System
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon()}
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <p className={cn('text-2xl font-bold capitalize', getStatusColor())}>
                      {health.status}
                    </p>
                  </Card>

                  <Card className="p-4 bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Health Score</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{health.score}/100</p>
                      <Progress value={health.score} className="mt-2" />
                    </div>
                  </Card>

                  <Card className="p-4 bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-medium">Issues</span>
                    </div>
                    <p className="text-2xl font-bold">{health.issues.length}</p>
                  </Card>

                  <Card className="p-4 bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className={cn('w-5 h-5', isScanning && 'animate-spin')} />
                      <span className="text-sm font-medium">Auto-Scan</span>
                    </div>
                    <Button
                      variant={autoScanEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                      className="w-full"
                    >
                      {autoScanEnabled ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      {autoScanEnabled ? 'Active' : 'Paused'}
                    </Button>
                  </Card>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="h-[500px] p-6">
                <Tabs defaultValue="issues" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="issues">Issues ({health.issues.length})</TabsTrigger>
                    <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
                    <TabsTrigger value="docs">Documentation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="issues" className="space-y-4">
                    {health.issues.length === 0 ? (
                      <Card className="p-8 text-center bg-green-500/10 border-green-500/30">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">All Systems Operational</h3>
                        <p className="text-muted-foreground">No issues detected. Platform is running smoothly.</p>
                      </Card>
                    ) : (
                      health.issues.map((issue) => (
                        <Card key={issue.id} className="p-4 hover:bg-accent/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getCategoryIcon(issue.category)}
                                <h4 className="font-semibold">{issue.title}</h4>
                                <Badge variant={getSeverityBadge(issue.severity)}>
                                  {issue.severity}
                                </Badge>
                                {issue.autoFixable && (
                                  <Badge variant="outline" className="text-green-500 border-green-500">
                                    Auto-fixable
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                              <p className="text-xs text-muted-foreground">📍 {issue.location}</p>
                              
                              {expandedIssue === issue.id && issue.suggestedFix && (
                                <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-border">
                                  <p className="text-sm font-medium mb-1">💡 Suggested Fix:</p>
                                  <p className="text-sm">{issue.suggestedFix}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                              >
                                {expandedIssue === issue.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnalyzeWithAI(issue)}
                                disabled={isAnalyzing}
                              >
                                <Sparkles className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="suggestions" className="space-y-4">
                    {health.suggestions.map((suggestion, index) => (
                      <Card key={index} className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-primary mt-0.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      </Card>
                    ))}
                    {health.suggestions.length === 0 && (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No suggestions at this time</p>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="docs" className="space-y-4">
                    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-bold">Comprehensive Platform Documentation</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">
                        Export complete documentation of architecture, design principles, functionalities, technologies, AI capabilities, and more.
                      </p>
                      <ExportDocumentationButtons />
                    </Card>
                    
                    <Card className="p-4 bg-accent/30">
                      <h4 className="font-semibold mb-2">Documentation Includes:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Complete architecture overview</li>
                        <li>• All platform features and capabilities</li>
                        <li>• Technologies and frameworks used</li>
                        <li>• AI models and integrations</li>
                        <li>• Design principles and UI/UX guidelines</li>
                        <li>• Voice commands and shortcuts</li>
                        <li>• Security and authentication details</li>
                      </ul>
                    </Card>
                  </TabsContent>
                </Tabs>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t border-border/50 flex items-center justify-between bg-accent/20">
                <div className="text-xs text-muted-foreground">
                  Last scan: {new Date(health.lastScan).toLocaleString()}
                </div>
                <Button 
                  onClick={scanPlatform} 
                  disabled={isScanning}
                  className="gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', isScanning && 'animate-spin')} />
                  {isScanning ? 'Scanning...' : 'Scan Now'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
