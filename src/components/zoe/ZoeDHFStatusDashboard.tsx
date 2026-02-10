/**
 * ZOE DHF STATUS DASHBOARD
 * Real-time monitoring of the Gemini-Native Architecture
 * 
 * Displays:
 * - Parent Zoe (Universal Brain) status
 * - Sub-Zoe Swarm (Specialist Cells) status
 * - System health metrics
 * - Recent query activity
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Cpu, 
  Activity, 
  Zap, 
  Globe, 
  Heart, 
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useZoe } from '@/contexts/ZoeContext';
import { subZoeSwarm, type SubZoeDomain } from '@/core/zoe';

const DOMAIN_ICONS: Record<SubZoeDomain, React.ReactNode> = {
  temporal: <Activity className="w-3 h-3" />,
  emotional: <Heart className="w-3 h-3" />,
  creative: <Sparkles className="w-3 h-3" />,
  analytical: <Cpu className="w-3 h-3" />,
  spiritual: <Globe className="w-3 h-3" />,
  health: <Heart className="w-3 h-3" />,
  financial: <Zap className="w-3 h-3" />,
  social: <Globe className="w-3 h-3" />,
  technical: <Cpu className="w-3 h-3" />,
  guardian: <Shield className="w-3 h-3" />,
};

const DOMAIN_COLORS: Record<SubZoeDomain, string> = {
  temporal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  emotional: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  creative: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  analytical: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  spiritual: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  health: 'bg-green-500/20 text-green-300 border-green-500/30',
  financial: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  social: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  technical: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  guardian: 'bg-red-500/20 text-red-300 border-red-500/30',
};

interface ZoeDHFStatusDashboardProps {
  compact?: boolean;
}

export function ZoeDHFStatusDashboard({ compact = false }: ZoeDHFStatusDashboardProps) {
  const { isDHFCoreActive, dhfHealth, refreshDHFHealth } = useZoe();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swarmStats, setSwarmStats] = useState<{
    totalSubZoes: number;
    cachedResponses: number;
    domains: SubZoeDomain[];
  } | null>(null);

  useEffect(() => {
    setSwarmStats(subZoeSwarm.getSwarmStats());
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshDHFHealth();
    setSwarmStats(subZoeSwarm.getSwarmStats());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'degraded': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'offline': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <Brain className={`w-4 h-4 ${isDHFCoreActive ? 'text-purple-400' : 'text-muted-foreground'}`} />
        <span className="text-xs font-medium">
          DHF {isDHFCoreActive ? 'Active' : 'Offline'}
        </span>
        {isDHFCoreActive && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-500/20 text-purple-300 border-purple-500/30">
            {dhfHealth?.activeSubZoes || 0} Sub-Zoes
          </Badge>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-background/95 to-purple-950/20 backdrop-blur-xl border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Zoe DHF Core
              </span>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${isDHFCoreActive ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}
              >
                {isDHFCoreActive ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              {compact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Parent Zoe Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-gpu-pulse-opacity" />
                <span className="text-xs font-medium">Parent Zoe</span>
                <span className="text-[10px] text-muted-foreground">(Universal Brain)</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${getStatusBadge(dhfHealth?.parentZoe)}`}>
                {dhfHealth?.parentZoe || 'unknown'}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground pl-4">
              Gemini 2.5 Pro • Reward Model • Synthetic Data Engine
            </div>
          </div>

          {/* Sub-Zoe Swarm Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-medium">Sub-Zoe Swarm</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${getStatusBadge(dhfHealth?.subZoeSwarm)}`}>
                {dhfHealth?.activeSubZoes || 0}/{dhfHealth?.totalSubZoes || 10}
              </Badge>
            </div>

            {/* Domain Grid */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {swarmStats?.domains.map((domain) => (
                <motion.div
                  key={domain}
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[9px] border ${DOMAIN_COLORS[domain]}`}
                  title={domain.charAt(0).toUpperCase() + domain.slice(1)}
                >
                  {DOMAIN_ICONS[domain]}
                  <span className="hidden sm:inline capitalize">{domain.slice(0, 4)}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Gemini Connection */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs">Gemini Connection</span>
            </div>
            <Badge 
              variant="outline" 
              className={`text-[10px] ${dhfHealth?.geminiConnection === 'connected' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}
            >
              {dhfHealth?.geminiConnection || 'checking...'}
            </Badge>
          </div>

          {/* Health Check Timestamp */}
          {dhfHealth?.lastHealthCheck && (
            <div className="text-[10px] text-muted-foreground text-center pt-1">
              Last check: {new Date(dhfHealth.lastHealthCheck).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ZoeDHFStatusDashboard;
