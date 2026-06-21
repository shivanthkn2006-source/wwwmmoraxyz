/**
 * Zoe Diagnostics Panel
 * Visual interface for testing and fixing Zoe-related issues
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Volume2,
  Mic,
  Brain,
  Wifi,
  Database,
  Wrench,
  ChevronDown,
  ChevronUp,
  Eye,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useZoeDiagnostics, DiagnosticResult } from '@/hooks/useZoeDiagnostics';
import { cn } from '@/lib/utils';

const getStatusIcon = (status: DiagnosticResult['status']) => {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
};

const getTestIcon = (id: string) => {
  switch (id) {
    case 'speech_synthesis':
    case 'voice_output':
      return <Volume2 className="h-4 w-4" />;
    case 'speech_recognition':
      return <Mic className="h-4 w-4" />;
    case 'zoe_chat_function':
    case 'zoe_agent_function':
    case 'zoe_service_ai':
      return <Brain className="h-4 w-4" />;
    case 'network':
      return <Wifi className="h-4 w-4" />;
    case 'zoe_database':
      return <Database className="h-4 w-4" />;
    case 'zoe_perception':
      return <Eye className="h-4 w-4" />;
    case 'camera_api':
      return <Camera className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

export const ZoeDiagnosticsPanel: React.FC = () => {
  const { 
    runDiagnostics, 
    testZoeEyes,
    isRunning, 
    report, 
    autoFixEnabled, 
    setAutoFixEnabled 
  } = useZoeDiagnostics();
  
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [eyesTestRunning, setEyesTestRunning] = useState(false);
  const [eyesTestResult, setEyesTestResult] = useState<{
    cameraWorking: boolean;
    visionWorking: boolean;
    cameraDetails: string;
    visionDetails: string;
  } | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTestZoeEyes = async () => {
    setEyesTestRunning(true);
    try {
      const result = await testZoeEyes();
      setEyesTestResult(result);
    } finally {
      setEyesTestRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'degraded':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Zoe Diagnostics</CardTitle>
              <CardDescription>
                Test and fix Zoe chat, voice, vision, and AI systems
              </CardDescription>
            </div>
          </div>
          
          {report && (
            <Badge 
              variant="outline" 
              className={cn('px-3 py-1', getStatusColor(report.overallStatus))}
            >
              {report.score}% {report.overallStatus}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Vision Test */}
        <div className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-500" />
              <span className="font-medium">Test Zoe's Eyes</span>
            </div>
            <Button 
              size="sm"
              variant="outline"
              onClick={handleTestZoeEyes}
              disabled={eyesTestRunning}
              className="border-cyan-500/50 hover:bg-cyan-500/10"
            >
              {eyesTestRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Test Vision
                </>
              )}
            </Button>
          </div>
          
          {eyesTestResult && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={cn(
                "p-2 rounded-lg border",
                eyesTestResult.cameraWorking 
                  ? "bg-green-500/10 border-green-500/30" 
                  : "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  {eyesTestResult.cameraWorking ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">Camera</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {eyesTestResult.cameraDetails}
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-lg border",
                eyesTestResult.visionWorking 
                  ? "bg-green-500/10 border-green-500/30" 
                  : "bg-red-500/10 border-red-500/30"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  {eyesTestResult.visionWorking ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">Vision AI</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {eyesTestResult.visionDetails}
                </p>
              </div>
            </div>
          )}
          
          {!eyesTestResult && !eyesTestRunning && (
            <p className="text-xs text-muted-foreground">
              Click "Test Vision" to capture a frame and verify Zoe can see
            </p>
          )}
        </div>

        {/* Vision & Voice Scores */}
        {report && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium">Vision Score</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={report.visionScore} className="h-2 flex-1" />
                <span className={cn(
                  "text-sm font-bold",
                  report.visionScore >= 80 ? "text-green-500" :
                  report.visionScore >= 50 ? "text-amber-500" : "text-red-500"
                )}>
                  {report.visionScore}%
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Voice Score</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={report.voiceScore} className="h-2 flex-1" />
                <span className={cn(
                  "text-sm font-bold",
                  report.voiceScore >= 80 ? "text-green-500" :
                  report.voiceScore >= 50 ? "text-amber-500" : "text-red-500"
                )}>
                  {report.voiceScore}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-fix"
              checked={autoFixEnabled}
              onCheckedChange={setAutoFixEnabled}
            />
            <Label htmlFor="auto-fix" className="flex items-center gap-1.5 cursor-pointer">
              <Wrench className="h-3.5 w-3.5" />
              Auto-fix issues
            </Label>
          </div>
          
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRunning ? 'Running...' : 'Run Full Diagnostics'}
          </Button>
        </div>

        {/* Progress during scan */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Running tests...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Results */}
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {report.results.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {report.results.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {report.results.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Test Results</h4>
              
              {report.results.map((result) => (
                <Collapsible
                  key={result.id}
                  open={expandedResults.has(result.id)}
                  onOpenChange={() => toggleExpanded(result.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div 
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                        result.status === 'pass' && 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10',
                        result.status === 'warning' && 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10',
                        result.status === 'fail' && 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div className="flex items-center gap-2">
                          {getTestIcon(result.id)}
                          <span className="font-medium text-sm">{result.name}</span>
                          {result.category === 'vision' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-cyan-500/50 text-cyan-500">
                              VISION
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {result.message}
                        </span>
                        {expandedResults.has(result.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 py-2 mt-1 text-sm space-y-1 bg-muted/30 rounded-lg">
                      {result.details && (
                        <p className="text-muted-foreground">{result.details}</p>
                      )}
                      {result.fixAttempted && (
                        <p className="text-xs">
                          <span className="font-medium">Auto-fix attempt:</span>{' '}
                          {result.fixResult}
                        </p>
                      )}
                      {result.autoFixable && result.status !== 'pass' && !result.fixAttempted && (
                        <p className="text-xs text-primary">
                          This issue can be auto-fixed. Run diagnostics with auto-fix enabled.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Suggestions */}
            {report.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Suggestions</h4>
                <ul className="space-y-1">
                  {report.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground text-center">
              Last run: {report.timestamp.toLocaleString()}
            </p>
          </motion.div>
        )}

        {/* Initial state */}
        {!report && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Run Full Diagnostics" to test Zoe's systems</p>
            <p className="text-sm mt-1">This will test voice, vision, chat, and AI functions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ZoeDiagnosticsPanel;
