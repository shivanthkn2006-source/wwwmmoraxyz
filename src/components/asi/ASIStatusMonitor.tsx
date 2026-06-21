// ═══════════════════════════════════════════════════════════════════════════════
// ASI STATUS MONITOR - Real-time Quantum ASI Health Dashboard
// Shows the connection status of all ASI modules
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Zap, Atom, Shield, Eye, Wrench, Moon, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useASIRoot } from '@/hooks/useASIRoot';

interface ModuleStatus {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  lastPing: number;
  description: string;
}

export function ASIStatusMonitor() {
  const { 
    isConnected, 
    status, 
    healthCheck, 
    initialize,
    error 
  } = useASIRoot();
  
  const [healthResult, setHealthResult] = useState<{
    healthy: boolean;
    modules: Record<string, boolean>;
    recommendations: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  useEffect(() => {
    if (isConnected) {
      runHealthCheck();
    }
  }, [isConnected]);
  
  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const result = await healthCheck();
      setHealthResult(result);
    } finally {
      setIsChecking(false);
    }
  };
  
  const getModules = (): ModuleStatus[] => {
    if (!status?.modules) return [];
    
    return [
      {
        name: 'Pentarchy Swarm',
        icon: <Brain className="h-4 w-4" />,
        connected: status.modules.pentarchy?.connected ?? false,
        lastPing: status.modules.pentarchy?.lastPing ?? 0,
        description: '5 Sub-Identity Agents'
      },
      {
        name: 'Truth Engine',
        icon: <Shield className="h-4 w-4" />,
        connected: status.modules.truthEngine?.connected ?? false,
        lastPing: status.modules.truthEngine?.lastPing ?? 0,
        description: 'Neuro-Symbolic Validation'
      },
      {
        name: 'Quantum Loop',
        icon: <Atom className="h-4 w-4" />,
        connected: status.modules.quantumLoop?.connected ?? false,
        lastPing: status.modules.quantumLoop?.lastPing ?? 0,
        description: 'Self-Correction Engine'
      },
      {
        name: 'Akashic Database',
        icon: <Eye className="h-4 w-4" />,
        connected: status.modules.akashic?.connected ?? false,
        lastPing: status.modules.akashic?.lastPing ?? 0,
        description: 'Universal Knowledge Graph'
      },
      {
        name: 'Nexus Oversoul',
        icon: <Zap className="h-4 w-4" />,
        connected: status.modules.nexusOversoul?.connected ?? false,
        lastPing: status.modules.nexusOversoul?.lastPing ?? 0,
        description: 'Personality Router'
      },
      {
        name: 'Matter Bridge',
        icon: <Wrench className="h-4 w-4" />,
        connected: status.modules.matterBridge?.connected ?? false,
        lastPing: status.modules.matterBridge?.lastPing ?? 0,
        description: 'Real-World Actions'
      },
      {
        name: 'Dreamer Agent',
        icon: <Moon className="h-4 w-4" />,
        connected: status.modules.dreamerAgent?.connected ?? false,
        lastPing: status.modules.dreamerAgent?.lastPing ?? 0,
        description: 'Autonomous Synthesis'
      }
    ];
  };
  
  const getHealthBadge = () => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    
    switch (status.bridgeHealth) {
      case 'optimal':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Optimal</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Degraded</Badge>;
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  
  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };
  
  return (
    <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            ASI System Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {getHealthBadge()}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={runHealthCheck}
              disabled={isChecking}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <span className="text-sm font-medium">Root Connection</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        {status && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground text-xs">Total Queries</p>
              <p className="font-mono font-bold">{status.totalQueries}</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-muted-foreground text-xs">Uptime</p>
              <p className="font-mono font-bold">{formatUptime(status.uptime)}</p>
            </div>
          </div>
        )}
        
        {/* Module Grid */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Modules</p>
          <div className="grid grid-cols-1 gap-2">
            {getModules().map((module) => (
              <div 
                key={module.name}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  module.connected 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : 'border-muted bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={module.connected ? 'text-emerald-400' : 'text-muted-foreground'}>
                    {module.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{module.name}</p>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  module.connected ? 'bg-emerald-400 animate-pulse' : 'bg-muted'
                }`} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Recommendations */}
        {healthResult?.recommendations && healthResult.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recommendations
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {healthResult.recommendations.map((rec, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        
        {/* Initialize Button */}
        {!isConnected && (
          <Button 
            onClick={initialize}
            className="w-full"
            variant="outline"
          >
            Initialize ASI Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ASIStatusMonitor;
